const db = require("../config/db");
const { getBranchId, branchWhere, branchIdForInsert } = require("../middleware/branchHelper");
const { peekFormatted, bumpSerialAtLeast } = require("../services/invoiceNo.service");
const { ensurePurchaseChargesColumns } = require("../migrations/add_purchase_charges_columns");

ensurePurchaseChargesColumns().catch(() => {});

function generatePurchaseNo(branchId, callback) {
  if (branchId) {
    peekFormatted(branchId, "purchase", (err, data) => {
      if (err) return callback(err);
      callback(null, data.next_number, data.raw);
    });
  } else {
    const PREFIX = "SE-PUR-";
    db.query(
      `SELECT purchase_no 
         FROM purchases 
        WHERE purchase_no LIKE ? 
        ORDER BY id DESC 
        LIMIT 1`,
      [`${PREFIX}%`],
      (err, rows) => {
        if (err) return callback(err);

        let nextNum = 1;
        if (rows.length && rows[0].purchase_no) {
          const lastNo = rows[0].purchase_no;
          const numericPart = String(lastNo).replace(PREFIX, "");
          const parsed = parseInt(numericPart, 10);
          if (!Number.isNaN(parsed) && parsed > 0) {
            nextNum = parsed + 1;
          }
        }

        const purchaseNo = `${PREFIX}${String(nextNum).padStart(3, "0")}`;
        callback(null, purchaseNo, nextNum);
      },
    );
  }
}

function finalizePurchase(branchIdVal, purchaseNo, rawNum, purchaseId, res) {
  if (branchIdVal) {
    bumpSerialAtLeast(branchIdVal, "purchase", rawNum, () => {
      db.query(
        `UPDATE branch_sequences SET last_number = GREATEST(COALESCE(last_number, 0), ?) WHERE branch_id = ? AND sequence_type = 'purchase'`,
        [rawNum, branchIdVal],
        () => {
          res.json({
            message: "Purchase saved successfully",
            id: purchaseId,
            purchase_no: purchaseNo
          });
        }
      );
    });
  } else {
    res.json({
      message: "Purchase saved successfully",
      id: purchaseId,
      purchase_no: purchaseNo
    });
  }
}

exports.getNextPurchaseNo = (req, res) => {
  const branchId = req.query.branch_id || req.headers["x-active-branch"] || branchIdForInsert(req);
  generatePurchaseNo(branchId, (err, purchaseNo) => {
    if (err) return res.status(500).json(err);
    res.json({ purchase_no: purchaseNo });
  });
};
exports.createPurchase = (req, res) => {
  const { vendor_id, payment_type, purchase_date, items, grandTotal: bodyGrandTotal, status } = req.body;
  const currentStatus = status || 'Received';

  if (!vendor_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Vendor and at least one item required" });
  }

  const purchaseDateVal = purchase_date || null;
  const computedGrandTotal = (items || []).reduce(
    (sum, it) => sum + (Number(it.total != null ? it.total : 0) || 0),
    0,
  );
  const numericBodyGrandTotal = Number(bodyGrandTotal ?? 0);
  const grandTotal =
    Number.isFinite(numericBodyGrandTotal) && numericBodyGrandTotal > 0
      ? numericBodyGrandTotal
      : computedGrandTotal;

  db.getConnection((connErr, conn) => {
    if (connErr) return res.status(500).json({ message: connErr.message || "DB connection failed" });

    const rollback = (err) => {
      conn.rollback(() => {
        conn.release();
        res.status(500).json({ message: err.message || "Failed to create purchase" });
      });
    };

    conn.beginTransaction((txErr) => {
      if (txErr) {
        conn.release();
        return res.status(500).json({ message: txErr.message || "Failed to start transaction" });
      }

      const branchIdVal = branchIdForInsert(req);
      const customPurchaseNo = req.body.purchase_no ? String(req.body.purchase_no).trim() : null;

      const proceed = (purchaseNo, rawNum) => {
        const bankAccountIdVal = req.body.bank_account_id ? Number(req.body.bank_account_id) : null;
        const vehicleNoVal = req.body.vehicle_no ? String(req.body.vehicle_no).trim() : null;
        const transportChargesVal = Number(req.body.transport_charges) || 0;
        let additionalChargesStr = null;
        let addChargesNum = 0;
        if (req.body.additional_charges) {
          if (typeof req.body.additional_charges === "string") {
            additionalChargesStr = req.body.additional_charges;
            try {
              const p = JSON.parse(req.body.additional_charges);
              if (Array.isArray(p)) {
                addChargesNum = p.reduce((s, c) => s + (Number(c.amount) || 0), 0);
              }
            } catch (e) {}
          } else if (Array.isArray(req.body.additional_charges)) {
            additionalChargesStr = JSON.stringify(req.body.additional_charges);
            addChargesNum = req.body.additional_charges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
          }
        }

        let purchaseTotalAmt = 0;
        items.forEach((item) => {
          const { qty, price, total: itemTotal } = item;
          const qtyNum = qty != null && qty !== "" ? Number(qty) : 1;
          const priceNum = price != null && price !== "" ? Number(price) : 0;
          const totalNum = itemTotal != null && itemTotal !== "" ? Number(itemTotal) : qtyNum * priceNum;
          purchaseTotalAmt += totalNum;
        });

        const totalWithCharges = purchaseTotalAmt + transportChargesVal + addChargesNum;

        const isCredit = String(payment_type || "").toLowerCase() === "credit";
        const advanceVal = Number(req.body.paid_amount != null ? req.body.paid_amount : (req.body.advance_amount != null ? req.body.advance_amount : 0)) || 0;
        const paidAmountVal = isCredit ? advanceVal : totalWithCharges;
        const dueAmountVal = isCredit ? Math.max(0, totalWithCharges - paidAmountVal) : 0.00;
        const paymentStatusVal = isCredit
          ? (dueAmountVal <= 0.01 ? "paid" : (paidAmountVal > 0.01 ? "partial" : "due"))
          : "paid";
        const poNoVal = req.body.po_no ? String(req.body.po_no).trim() : null;
        const dueDateVal = req.body.due_date || null;

        const insertPurchaseSql =
          "INSERT INTO purchases (purchase_no, po_no, purchase_date, vendor_id, payment_type, paid_amount, due_amount, payment_status, due_date, branch_id, status, bank_account_id, vehicle_no, transport_charges, additional_charges) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        conn.query(
          insertPurchaseSql,
          [purchaseNo, poNoVal, purchaseDateVal, vendor_id, payment_type || null, paidAmountVal, dueAmountVal, paymentStatusVal, dueDateVal, branchIdVal, currentStatus, bankAccountIdVal, vehicleNoVal, transportChargesVal, additionalChargesStr],
          (insErr, result) => {
            if (insErr) return rollback(insErr);

            const purchaseId = result.insertId;

            // Adjust Bank Account balance: decrease for the actual paid amount!
            if (bankAccountIdVal && paidAmountVal > 0) {
              conn.query(
                "UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?",
                [paidAmountVal, bankAccountIdVal],
                (bankErr) => {
                  if (bankErr) console.error("Failed to adjust bank balance in createPurchase:", bankErr);
                }
              );
            }

            // If credit purchase with an advance payment, record it in vendor_payments linked to this purchase
            if (isCredit && paidAmountVal > 0) {
              conn.query(
                `INSERT INTO vendor_payments 
                  (vendor_id, purchase_id, bank_account_id, payment_date, amount, payment_method, paid_from, reference_no, notes, branch_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [vendor_id, purchaseId, bankAccountIdVal, purchaseDateVal, paidAmountVal, bankAccountIdVal ? "Bank Transfer" : "Cash", bankAccountIdVal ? "Bank" : "Cash", purchaseNo, "Advance payment on credit purchase", branchIdVal],
                (vpErr) => {
                  if (vpErr) console.error("Failed to record initial advance in vendor_payments:", vpErr);
                }
              );
            }

            const insertItemSql = `
              INSERT INTO purchase_items 
                (purchase_id, product_id, hsncode, qty, price, margin, margin_type, selling_rate, total, primary_unit, discount, tax_group_id) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            let completed = 0;
            const totalItems = items.length;

            items.forEach((item) => {
              const { product_id, hsncode, qty, price, margin, margin_type, selling_rate, total: itemTotal, primary_unit, discount, tax_group_id } = item;
              const qtyNum = qty != null && qty !== "" ? Number(qty) : 1;
              const priceNum = price != null && price !== "" ? Number(price) : null;
              const totalNum =
                itemTotal != null && itemTotal !== "" ? Number(itemTotal) : priceNum != null ? qtyNum * priceNum : null;
              const sellingPriceNum =
                selling_rate != null && selling_rate !== "" ? Number(selling_rate) : null;

              conn.query(
                insertItemSql,
                [
                  purchaseId,
                  product_id || null,
                  hsncode || null,
                  qtyNum,
                  priceNum,
                  margin != null && margin !== "" ? Number(margin) : null,
                  margin_type || "%",
                  selling_rate != null && selling_rate !== "" ? Number(selling_rate) : null,
                  totalNum,
                  primary_unit || null,
                  discount != null && discount !== "" ? Number(discount) : 0,
                  tax_group_id || null
                ],
                (itemErr) => {
                  if (itemErr) return rollback(itemErr);

                  if (product_id) {
                    if (currentStatus === 'Ordered') {
                      completed++;
                      if (completed === totalItems) {
                        conn.commit((commitErr) => {
                          if (commitErr) return rollback(commitErr);
                          conn.release();
                          finalizePurchase(branchIdVal, purchaseNo, rawNum, purchaseId, res);
                        });
                      }
                    } else {
                    const insertStockInSql = `
                      INSERT INTO stock_in (product_id, qty, purchase_price, total_purchase_price, selling_price, purchase_id, purchase_date, branch_id)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    const validatedSellingPrice =
                      sellingPriceNum != null ? sellingPriceNum : 0;

                    conn.query(
                      insertStockInSql,
                      [
                        product_id,
                        qtyNum,
                        priceNum,
                        grandTotal,
                        validatedSellingPrice,
                        purchaseId,
                        purchaseDateVal,
                        branchIdVal,
                      ],
                      (stockInErr) => {
                        if (stockInErr) return rollback(stockInErr);

                        conn.query(
                          "INSERT INTO stocks (product_id, quantity) VALUES (?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?",
                          [product_id, qtyNum, qtyNum],
                          (stockErr) => {
                            if (stockErr) return rollback(stockErr);
                            completed++;
                            if (completed === totalItems) {
                              conn.commit((commitErr) => {
                                if (commitErr) return rollback(commitErr);
                                conn.release();
                                finalizePurchase(branchIdVal, purchaseNo, rawNum, purchaseId, res);
                              });
                            }
                          }
                        );
                      }
                    );
                    }
                  } else {
                    completed++;
                    if (completed === totalItems) {
                      conn.commit((commitErr) => {
                        if (commitErr) return rollback(commitErr);
                        conn.release();
                        finalizePurchase(branchIdVal, purchaseNo, rawNum, purchaseId, res);
                      });
                    }
                  }
                }
              );
            });
          }
        );
      };

      if (customPurchaseNo) {
        const cleanDoc = customPurchaseNo.replace(/(\d{4}-\d{2})|(\d{2}-\d{2})/g, "");
        const digits = cleanDoc.replace(/\D/g, "");
        const rawNum = parseInt(digits || "0", 10) || 1;
        proceed(customPurchaseNo, rawNum);
      } else {
        generatePurchaseNo(branchIdVal, (genErr, purchaseNo, rawNum) => {
          if (genErr) return rollback(genErr);
          proceed(purchaseNo, rawNum);
        });
      }
    });
  });
};
exports.getPurchases = (req, res) => {
  const branchId = getBranchId(req);
  const bw = branchWhere(branchId, "p");
  const sql = `SELECT p.*, REPLACE(p.purchase_no, 'SSL', 'CTW') AS purchase_no, v.vendor_name, v.company_name 
    FROM purchases p 
    LEFT JOIN vendors v ON v.id = p.vendor_id 
    WHERE ${bw.clause}
    ORDER BY p.id DESC`;
  db.query(sql, bw.params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
};

exports.getPurchasesList = (req, res) => {
  // Silent auto-migration of any existing SSL prefixes in database
  db.query("UPDATE purchases SET purchase_no = REPLACE(purchase_no, 'SSL', 'CTW') WHERE purchase_no LIKE '%SSL%'", () => {});
  db.query("UPDATE branch_sequences SET prefix = REPLACE(prefix, 'SSL', 'CTW') WHERE prefix LIKE '%SSL%'", () => {});

  const { fromDate, toDate, vendor, product, search, billOrProduct, page = 1, limit = 25 } = req.query;
  const exportFlag = req.query.export;
  const forExport =
    exportFlag === "1" ||
    exportFlag === "true" ||
    String(req.query.forExport || "").toLowerCase() === "true";

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = forExport
    ? Math.min(50000, Math.max(1, parseInt(limit, 10) || 10000))
    : Math.min(1000, Math.max(1, parseInt(limit, 10) || 25));
  const offset = (pageNum - 1) * limitNum;

  const branchId2 = getBranchId(req);
  const bw2 = branchWhere(branchId2, "p");
  let where = [bw2.clause];
  let params = [...bw2.params];

  if (fromDate && fromDate.trim()) {
    where.push("p.purchase_date >= ?");
    params.push(fromDate.trim());
  }
  if (toDate && toDate.trim()) {
    where.push("p.purchase_date <= ?");
    params.push(toDate.trim());
  }
  const searchTrim = search != null ? String(search).trim() : "";
  if (searchTrim) {
    const s = `%${searchTrim}%`;
    where.push("(v.vendor_name LIKE ? OR v.company_name LIKE ? OR v.mobile LIKE ?)");
    params.push(s, s, s);
  } else if (vendor && vendor.trim()) {
    where.push("(v.vendor_name LIKE ? OR v.company_name LIKE ?)");
    const v = `%${vendor.trim()}%`;
    params.push(v, v);
  }
  if (product && product.trim()) {
    where.push("pr.product_name LIKE ?");
    params.push(`%${product.trim()}%`);
  }
  if (billOrProduct && String(billOrProduct).trim()) {
    const term = `%${String(billOrProduct).trim()}%`;
    where.push("(p.purchase_no LIKE ? OR pr.product_name LIKE ?)");
    params.push(term, term);
  }

  const whereClause = where.join(" AND ");
  const fromJoin = `
    FROM purchases p
    LEFT JOIN vendors v ON v.id = p.vendor_id
    JOIN purchase_items pi ON pi.purchase_id = p.id
    LEFT JOIN products pr ON pr.id = pi.product_id
  `;

  const countSql = `
    SELECT COUNT(DISTINCT p.id) AS total
    ${fromJoin}
    WHERE ${whereClause}
  `;

  const summarySql = `
    SELECT
      COALESCE(SUM(CAST(pi.qty AS DECIMAL(18, 4))), 0) AS grand_total_qty,
      COALESCE(SUM(COALESCE(pi.total, CAST(pi.qty AS DECIMAL(18, 4)) * COALESCE(pi.price, 0))), 0) AS grand_total_amount
    ${fromJoin}
    WHERE ${whereClause}
  `;

  const dataSql = `
    SELECT DISTINCT
      p.id AS purchase_id,
      REPLACE(p.purchase_no, 'SSL', 'CTW') AS purchase_no,
      p.po_no,
      p.purchase_date,
      p.payment_type,
      p.paid_amount,
      p.due_amount,
      p.payment_status,
      p.due_date,
      p.status,
      p.vehicle_no,
      p.transport_charges,
      p.additional_charges,
      p.vendor_id,
      v.vendor_name,
      v.company_name,
      v.mobile AS vendor_mobile,
      COALESCE((
        SELECT SUM(ret.total_qty)
        FROM purchase_returns ret
        WHERE ret.purchase_id = p.id
      ), 0) AS pr_qty
    ${fromJoin}
    WHERE ${whereClause}
    ORDER BY p.purchase_date DESC, p.id DESC
    LIMIT ? OFFSET ?
  `;

  db.query(countSql, params, (err, countResult) => {
    if (err) return res.status(500).json(err);
    const total = countResult[0]?.total || 0;

    db.query(summarySql, params, (sumErr, sumRows) => {
      if (sumErr) return res.status(500).json(sumErr);
      const summary = {
        grand_total_qty: Number(sumRows[0]?.grand_total_qty ?? 0),
        grand_total_amount: Number(sumRows[0]?.grand_total_amount ?? 0),
      };

      db.query(dataSql, [...params, limitNum, offset], (err2, rows) => {
        if (err2) return res.status(500).json(err2);
        if (!rows || rows.length === 0) {
          return res.json({
            data: [],
            total,
            page: pageNum,
            limit: limitNum,
            totalRecords: total,
            currentPage: pageNum,
            summary,
          });
        }

        const purchaseIds = rows.map((r) => r.purchase_id);
        const itemsSql = `
          SELECT
            pi.id AS line_id,
            pi.purchase_id,
            COALESCE(NULLIF(TRIM(pr.product_name), ''), '—') AS product_name,
            pi.hsncode,
            pi.qty,
            pi.price,
            pi.margin,
            pi.margin_type,
            pi.selling_rate,
            pi.total,
            pi.primary_unit,
            pi.discount,
            COALESCE(pi.total, CAST(pi.qty AS DECIMAL(18, 4)) * COALESCE(pi.price, 0)) AS line_total,
            COALESCE((
              SELECT SUM(pri.return_qty)
              FROM purchase_return_items pri
              JOIN purchase_returns ret ON ret.id = pri.purchase_return_id
              WHERE pri.purchase_item_id = pi.id
            ), 0) AS return_qty
          FROM purchase_items pi
          LEFT JOIN products pr ON pr.id = pi.product_id
          WHERE pi.purchase_id IN (?)
          ORDER BY pi.id ASC
        `;
        db.query(itemsSql, [purchaseIds], (errItems, itemRows) => {
          if (errItems) return res.status(500).json(errItems);

          const itemsByPurchase = {};
          (itemRows || []).forEach((item) => {
            if (!itemsByPurchase[item.purchase_id]) {
              itemsByPurchase[item.purchase_id] = [];
            }
            itemsByPurchase[item.purchase_id].push(item);
          });

          const finalRows = rows.map((r) => {
            const items = itemsByPurchase[r.purchase_id] || [];
            const itemsReturnQty = items.reduce((sum, i) => sum + Number(i.return_qty || 0), 0);
            const totalPrQty = Math.max(Number(r.pr_qty || 0), itemsReturnQty);
            const itemsTotal = items.reduce((sum, i) => sum + Number(i.total || 0), 0);
            const transportChg = Number(r.transport_charges) || 0;
            let addChg = 0;
            let parsedAddCharges = [];
            if (r.additional_charges) {
              try {
                parsedAddCharges = typeof r.additional_charges === "string" ? JSON.parse(r.additional_charges) : r.additional_charges;
                if (Array.isArray(parsedAddCharges)) {
                  addChg = parsedAddCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
                }
              } catch (e) {}
            }
            const overallTotal = itemsTotal + transportChg + addChg;
            const isCredit = String(r.payment_type || "").toLowerCase() === "credit";
            const storedPaid = r.paid_amount != null ? Number(r.paid_amount) : (isCredit ? 0 : overallTotal);
            const calculatedDue = r.due_amount != null ? Number(r.due_amount) : Math.max(0, overallTotal - storedPaid);
            const payStatus = r.payment_status || (calculatedDue <= 0.01 ? "paid" : (storedPaid > 0.01 ? "partial" : "due"));

            return {
              ...r,
              paid_amount: storedPaid,
              due_amount: calculatedDue,
              payment_status: payStatus,
              transport_charges: transportChg,
              additional_charges: parsedAddCharges,
              items: items.map((it) => ({
                ...it,
                pr_qty: Number(it.return_qty || 0),
              })),
              product_name: items.map((i) => i.product_name).join(", "),
              qty: items.reduce((sum, i) => sum + Number(i.qty || 0), 0),
              pr_qty: totalPrQty,
              price: items.length === 1 ? items[0].price : null,
              items_total: itemsTotal,
              total: overallTotal,
              line_total: overallTotal,
            };
          });

          res.json({
            data: finalRows,
            total,
            page: pageNum,
            limit: limitNum,
            totalRecords: total,
            currentPage: pageNum,
            summary,
          });
        });
      });
    });
  });
};

exports.getPurchaseById = (req, res) => {
  const id = req.params.id;
  db.query(
    `SELECT p.*, v.vendor_name, v.company_name, v.mobile, v.gst_no 
     FROM purchases p 
     LEFT JOIN vendors v ON v.id = p.vendor_id 
     WHERE p.id = ?`,
    [id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      if (!rows.length) return res.status(404).json({ message: "Purchase not found" });
      const purchase = rows[0];
      if (purchase && purchase.purchase_no) {
        purchase.purchase_no = purchase.purchase_no.replace(/SSL-/gi, "CTW-");
      }
      db.query(
        `SELECT pi.*, pr.product_name,
                COALESCE((
                  SELECT SUM(tm.tax_rate)
                  FROM tax_group_taxes tgt
                  JOIN tax_modules tm ON tm.id = tgt.tax_module_id
                  WHERE tgt.tax_group_id = pi.tax_group_id
                ), 0) AS tax_rate,
                COALESCE((
                  SELECT SUM(pri.return_qty)
                  FROM purchase_return_items pri
                  JOIN purchase_returns ret ON ret.id = pri.purchase_return_id
                  WHERE pri.purchase_item_id = pi.id
                ), 0) AS return_qty
         FROM purchase_items pi 
         LEFT JOIN products pr ON pr.id = pi.product_id 
         WHERE pi.purchase_id = ?`,
        [id],
        (err2, items) => {
          if (err2) return res.status(500).json(err2);
          if (purchase.additional_charges && typeof purchase.additional_charges === "string") {
            try {
              purchase.additional_charges = JSON.parse(purchase.additional_charges);
            } catch (e) {}
          }
          purchase.items = (items || []).map((it) => ({
            ...it,
            pr_qty: Number(it.return_qty || 0),
          }));
          purchase.pr_qty = purchase.items.reduce((sum, it) => sum + Number(it.pr_qty || 0), 0);
          res.json(purchase);
        }
      );
    }
  );
};

exports.updatePurchase = (req, res) => {
  const purchaseId = req.params.id;
  const { purchase_no, vendor_id, payment_type, purchase_date, items, grandTotal: bodyGrandTotal, status } = req.body;
  const newStatus = status || 'Received';

  if (!purchaseId) {
    return res.status(400).json({ message: "Purchase ID is required" });
  }
  if (!vendor_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Vendor and at least one item required" });
  }

  const purchaseDateVal = purchase_date || null;
  const computedGrandTotal = (items || []).reduce(
    (sum, it) => sum + (Number(it.total != null ? it.total : 0) || 0),
    0,
  );
  const numericBodyGrandTotal = Number(bodyGrandTotal ?? 0);
  const grandTotal =
    Number.isFinite(numericBodyGrandTotal) && numericBodyGrandTotal > 0
      ? numericBodyGrandTotal
      : computedGrandTotal;

  db.getConnection((connErr, conn) => {
    if (connErr) return res.status(500).json({ message: connErr.message || "DB connection failed" });

    const rollback = (err) => {
      conn.rollback(() => {
        conn.release();
        res.status(500).json({ message: err.message || "Failed to update purchase" });
      });
    };

    conn.beginTransaction((txErr) => {
      if (txErr) {
        conn.release();
        return res.status(500).json({ message: txErr.message || "Failed to start transaction" });
      }

      conn.query(
        "SELECT branch_id, status, payment_type, bank_account_id, transport_charges, additional_charges, (SELECT SUM(total) FROM purchase_items WHERE purchase_id = ?) as total_amount FROM purchases WHERE id = ?",
        [purchaseId, purchaseId],
        (brErr, brRows) => {
          if (brErr) return rollback(brErr);
          if (!brRows.length) {
            return conn.rollback(() => {
              conn.release();
              res.status(404).json({ message: "Purchase not found" });
            });
          }
          const purchaseBranchId =
            brRows[0].branch_id != null ? brRows[0].branch_id : branchIdForInsert(req);
          const oldStatus = brRows[0].status || 'Received';
          const oldBankAccountId = brRows[0].bank_account_id;
          let oldTotalAmount = Number(brRows[0].total_amount || 0) + Number(brRows[0].transport_charges || 0);
          if (brRows[0].additional_charges) {
            try {
              const p = typeof brRows[0].additional_charges === "string" ? JSON.parse(brRows[0].additional_charges) : brRows[0].additional_charges;
              if (Array.isArray(p)) {
                oldTotalAmount += p.reduce((s, c) => s + (Number(c.amount) || 0), 0);
              }
            } catch (e) {}
          }

          const commitAndSync = () => {
            conn.commit((commitErr) => {
              if (commitErr) return rollback(commitErr);
              conn.release();
              if (purchase_no && purchaseBranchId) {
                const cleanDoc = String(purchase_no).replace(/(\d{4}-\d{2})|(\d{2}-\d{2})/g, "");
                const digits = cleanDoc.replace(/\D/g, "");
                const num = parseInt(digits || "0", 10) || 1;
                bumpSerialAtLeast(purchaseBranchId, "purchase", num, () => {
                  db.query(
                    "UPDATE branch_sequences SET last_number = GREATEST(COALESCE(last_number, 0), ?) WHERE branch_id = ? AND sequence_type = 'purchase'",
                    [num, purchaseBranchId],
                    () => res.json({ message: "Purchase updated successfully", id: purchaseId })
                  );
                });
              } else {
                res.json({ message: "Purchase updated successfully", id: purchaseId });
              }
            });
          };

          conn.query(
            "SELECT product_id, qty FROM purchase_items WHERE purchase_id = ?",
            [purchaseId],
            (loadErr, oldItems) => {
              if (loadErr) return rollback(loadErr);

              const adjustPromises = [];

              if (oldStatus === 'Received') {
                oldItems
                  .filter((r) => r.product_id)
                  .forEach((r) => {
              const q = Number(r.qty) || 0;
              if (!q) return;
                  adjustPromises.push(
                    new Promise((resolve, reject) => {
                      conn.query(
                        "UPDATE stocks SET quantity = quantity - ? WHERE product_id = ?",
                        [q, r.product_id],
                        (e1) => (e1 ? reject(e1) : resolve())
                      );
                    })
                  );
                });
              }

          Promise.all(adjustPromises)
            .then(() => {
              // Revert old bank balance
              if (oldBankAccountId && Number(oldTotalAmount) > 0) {
                conn.query(
                  "UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?",
                  [Number(oldTotalAmount), oldBankAccountId]
                );
              }

              conn.query("DELETE FROM stock_in WHERE purchase_id = ?", [purchaseId], (delStockErr) => {
                if (delStockErr) return rollback(delStockErr);
                conn.query("DELETE FROM purchase_items WHERE purchase_id = ?", [purchaseId], (delItemsErr) => {
                  if (delItemsErr) return rollback(delItemsErr);

                  const bankAccountIdVal = req.body.bank_account_id ? Number(req.body.bank_account_id) : null;
                  const vehicleNoVal = req.body.vehicle_no ? String(req.body.vehicle_no).trim() : null;
                  const transportChargesVal = Number(req.body.transport_charges) || 0;
                  let additionalChargesStr = null;
                  let addChargesNum = 0;
                  if (req.body.additional_charges) {
                    if (typeof req.body.additional_charges === "string") {
                      additionalChargesStr = req.body.additional_charges;
                      try {
                        const p = JSON.parse(req.body.additional_charges);
                        if (Array.isArray(p)) {
                          addChargesNum = p.reduce((s, c) => s + (Number(c.amount) || 0), 0);
                        }
                      } catch (e) {}
                    } else if (Array.isArray(req.body.additional_charges)) {
                      additionalChargesStr = JSON.stringify(req.body.additional_charges);
                      addChargesNum = req.body.additional_charges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
                    }
                  }

                  let newTotalAmt = 0;
                  items.forEach((item) => {
                    const { qty, price, total: itemTotal } = item;
                    const qtyNum = qty != null && qty !== "" ? Number(qty) : 1;
                    const priceNum = price != null && price !== "" ? Number(price) : 0;
                    const totalNum = itemTotal != null && itemTotal !== "" ? Number(itemTotal) : qtyNum * priceNum;
                    newTotalAmt += totalNum;
                  });

                  const newTotalWithCharges = newTotalAmt + transportChargesVal + addChargesNum;

                  const isCredit = String(payment_type || "").toLowerCase() === "credit";
                  let paidAmountVal = Number(req.body.paid_amount != null ? req.body.paid_amount : (req.body.advance_amount != null ? req.body.advance_amount : 0)) || 0;
                  let dueAmountVal = isCredit ? Math.max(0, newTotalWithCharges - paidAmountVal) : 0.00;
                  let paymentStatusVal = isCredit
                    ? (dueAmountVal <= 0.01 ? "paid" : (paidAmountVal > 0.01 ? "partial" : "due"))
                    : "paid";
                  if (!isCredit) {
                    paidAmountVal = newTotalWithCharges;
                    dueAmountVal = 0.00;
                    paymentStatusVal = "paid";
                  }

                  const poNoVal = req.body.po_no != null ? (String(req.body.po_no).trim() || null) : null;
                  const dueDateVal = req.body.due_date || null;

                  const updateParams = [
                    vendor_id,
                    payment_type || null,
                    paidAmountVal,
                    dueAmountVal,
                    paymentStatusVal,
                    dueDateVal,
                    purchaseDateVal,
                    newStatus,
                    bankAccountIdVal,
                    vehicleNoVal,
                    transportChargesVal,
                    additionalChargesStr
                  ];
                  let updateSql = "UPDATE purchases SET vendor_id = ?, payment_type = ?, paid_amount = ?, due_amount = ?, payment_status = ?, due_date = ?, purchase_date = ?, status = ?, bank_account_id = ?, vehicle_no = ?, transport_charges = ?, additional_charges = ?";
                  if (purchase_no) {
                    updateSql += ", purchase_no = ?";
                    updateParams.push(String(purchase_no).trim());
                  }
                  if (req.body.po_no !== undefined) {
                    updateSql += ", po_no = ?";
                    updateParams.push(poNoVal);
                  }
                  updateSql += " WHERE id = ?";
                  updateParams.push(purchaseId);
                  conn.query(
                    updateSql,
                    updateParams,
                    (updErr) => {
                      if (updErr) return rollback(updErr);

                      // Subtract new bank balance for actual paid amount
                      if (bankAccountIdVal && paidAmountVal > 0) {
                        conn.query(
                          "UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?",
                          [paidAmountVal, bankAccountIdVal]
                        );
                      }

                      const insertItemSql = `
                        INSERT INTO purchase_items 
                          (purchase_id, product_id, hsncode, qty, price, margin, margin_type, selling_rate, total, primary_unit, discount, tax_group_id) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                      `;

                      let completed = 0;
                      const totalItems = items.length;

                      items.forEach((item) => {
                        const { product_id, hsncode, qty, price, margin, margin_type, selling_rate, total: itemTotal, primary_unit, discount, tax_group_id } = item;
                        const qtyNum = qty != null && qty !== "" ? Number(qty) : 1;
                        const priceNum = price != null && price !== "" ? Number(price) : null;
                        const totalNum =
                          itemTotal != null && itemTotal !== "" ? Number(itemTotal) : priceNum != null ? qtyNum * priceNum : null;
                        const sellingPriceNum =
                          selling_rate != null && selling_rate !== "" ? Number(selling_rate) : null;

                        conn.query(
                          insertItemSql,
                          [
                            purchaseId,
                            product_id || null,
                            hsncode || null,
                            qtyNum,
                            priceNum,
                            margin != null && margin !== "" ? Number(margin) : null,
                            margin_type || "%",
                            selling_rate != null && selling_rate !== "" ? Number(selling_rate) : null,
                            totalNum,
                            primary_unit || null,
                            discount != null && discount !== "" ? Number(discount) : 0,
                            tax_group_id || null
                          ],
                          (itemErr) => {
                            if (itemErr) return rollback(itemErr);

                            if (product_id) {
                              if (newStatus === 'Ordered') {
                                completed++;
                                if (completed === totalItems) {
                                  commitAndSync();
                                }
                              } else {
                              const insertStockInSql = `
                                INSERT INTO stock_in (product_id, qty, purchase_price, total_purchase_price, selling_price, purchase_id, purchase_date, branch_id)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                              `;
                              const validatedSellingPrice = sellingPriceNum != null ? sellingPriceNum : 0;
                              conn.query(
                                insertStockInSql,
                                [
                                  product_id,
                                  qtyNum,
                                  priceNum,
                                  grandTotal,
                                  validatedSellingPrice,
                                  purchaseId,
                                  purchaseDateVal,
                                  purchaseBranchId,
                                ],
                                (stockInErr) => {
                                  if (stockInErr) return rollback(stockInErr);

                                  conn.query(
                                    "INSERT INTO stocks (product_id, quantity) VALUES (?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?",
                                    [product_id, qtyNum, qtyNum],
                                    (stockErr) => {
                                      if (stockErr) return rollback(stockErr);
                                      completed++;
                                      if (completed === totalItems) {
                                        commitAndSync();
                                      }
                                    }
                                  );
                                }
                              );
                              }
                            } else {
                              completed++;
                              if (completed === totalItems) {
                                conn.commit((commitErr) => {
                                  if (commitErr) return rollback(commitErr);
                                  conn.release();
                                  res.json({ message: "Purchase updated successfully", id: purchaseId });
                                });
                              }
                            }
                          }
                        );
                      });
                    }
                  );
                });
              });
            })
            .catch((adjErr) => rollback(adjErr));
            }
          );
        }
      );
    });
  });
};

/* ================= DELETE PURCHASE (AND RELATED STOCK_IN) ================= */
exports.deletePurchase = (req, res) => {
  const purchaseId = req.params.id;
  if (!purchaseId) {
    return res.status(400).json({ message: "Purchase ID is required" });
  }

  db.getConnection((connErr, conn) => {
    if (connErr) return res.status(500).json({ message: connErr.message || "DB connection failed" });

    const rollback = (err) => {
      conn.rollback(() => {
        conn.release();
        res.status(500).json({ message: err.message || "Failed to delete purchase" });
      });
    };

    conn.beginTransaction((txErr) => {
      if (txErr) {
        conn.release();
        return res.status(500).json({ message: txErr.message || "Failed to start transaction" });
      }

      conn.query(
        "SELECT status, bank_account_id, transport_charges, additional_charges, (SELECT SUM(total) FROM purchase_items WHERE purchase_id = ?) as total_amount FROM purchases WHERE id = ?",
        [purchaseId, purchaseId],
        (statErr, statRows) => {
          if (statErr) return rollback(statErr);
          if (!statRows.length) return rollback(new Error("Purchase not found"));
          const currentStatus = statRows[0].status || 'Received';
          const bankAccountId = statRows[0].bank_account_id;
          let totalAmount = Number(statRows[0].total_amount || 0) + Number(statRows[0].transport_charges || 0);
          if (statRows[0].additional_charges) {
            try {
              const p = typeof statRows[0].additional_charges === "string" ? JSON.parse(statRows[0].additional_charges) : statRows[0].additional_charges;
              if (Array.isArray(p)) {
                totalAmount += p.reduce((s, c) => s + (Number(c.amount) || 0), 0);
              }
            } catch (e) {}
          }

          // Revert bank balance
          if (bankAccountId && Number(totalAmount) > 0) {
            conn.query(
              "UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?",
              [Number(totalAmount), bankAccountId]
            );
          }

          conn.query(
            "SELECT product_id, qty FROM purchase_items WHERE purchase_id = ?",
            [purchaseId],
            (loadErr, oldItems) => {
              if (loadErr) return rollback(loadErr);

              const adjustPromises = [];
              if (currentStatus === 'Received') {
                oldItems
                  .filter((r) => r.product_id)
                  .forEach((r) => {
              const q = Number(r.qty) || 0;
              if (!q) return;
                  adjustPromises.push(
                    new Promise((resolve, reject) => {
                      conn.query(
                        "UPDATE stocks SET quantity = quantity - ? WHERE product_id = ?",
                        [q, r.product_id],
                        (e1) => (e1 ? reject(e1) : resolve())
                      );
                    })
                  );
                });
              }

              Promise.all(adjustPromises)
                .then(() => {
                  // Remove related stock_in rows explicitly
                  conn.query("DELETE FROM stock_in WHERE purchase_id = ?", [purchaseId], (delStockErr) => {
                    if (delStockErr) return rollback(delStockErr);

                    // Delete purchase items explicitly just in case FK is missing
                    conn.query("DELETE FROM purchase_items WHERE purchase_id = ?", [purchaseId], (delItemsErr) => {
                      if (delItemsErr) return rollback(delItemsErr);

                      // Delete purchase
                      conn.query("DELETE FROM purchases WHERE id = ?", [purchaseId], (delPurErr, result) => {
                        if (delPurErr) return rollback(delPurErr);
                        if (result.affectedRows === 0) {
                          return rollback(new Error("Purchase not found"));
                        }
                        conn.commit((commitErr) => {
                          if (commitErr) return rollback(commitErr);
                          conn.release();
                          res.json({ message: "Purchase deleted successfully" });
                        });
                      });
                    });
                  });
                })
                .catch((adjErr) => rollback(adjErr));
            }
          );
        }
      );
    });
  });
};
exports.getLatestSellingRateByProduct = (req, res) => {
  const productId = req.params.productId;

  if (!productId) {
    return res.status(400).json({ message: "Product ID is required" });
  }

  const sql = `
    SELECT selling_rate
    FROM purchase_items
    WHERE product_id = ?
      AND selling_rate IS NOT NULL
    ORDER BY id DESC
    LIMIT 1
  `;

  db.query(sql, [productId], (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: err.message || "Failed to get latest selling rate" });
    }

    if (!rows.length) {
      return res.json({ selling_rate: null });
    }

    res.json({ selling_rate: rows[0].selling_rate });
  });
};

exports.recordPurchasePayment = async (req, res) => {
  const purchaseId = req.params.id;
  const {
    amount,
    payment_date,
    payment_method,
    bank_account_id,
    paid_from,
    reference_no,
    notes,
    cheque_no,
    cheque_date,
    collection_person
  } = req.body;

  const paymentAmount = Number(amount);
  if (!paymentAmount || paymentAmount <= 0) {
    return res.status(400).json({ message: "Valid payment amount is required" });
  }

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [purchases] = await conn.query(
      "SELECT id, vendor_id, purchase_no, po_no, paid_amount, due_amount, payment_status, branch_id FROM purchases WHERE id = ?",
      [purchaseId]
    );

    if (!purchases.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Purchase not found" });
    }

    const purchase = purchases[0];
    const branchId = branchIdForInsert(req) || purchase.branch_id;

    // Insert into vendor_payments
    const [vpResult] = await conn.query(
      `INSERT INTO vendor_payments 
        (vendor_id, purchase_id, bank_account_id, payment_date, amount, payment_method, paid_from, reference_no, notes, cheque_no, cheque_date, collection_person, branch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchase.vendor_id,
        purchaseId,
        bank_account_id || null,
        payment_date || new Date().toISOString().slice(0, 10),
        paymentAmount,
        payment_method || "Cash",
        paid_from || (payment_method === "Cash" ? "Cash" : "Bank"),
        reference_no || null,
        notes || null,
        cheque_no || null,
        cheque_date || null,
        collection_person || null,
        branchId
      ]
    );

    // Update purchase paid_amount, due_amount, payment_status
    const newPaidAmount = Number(purchase.paid_amount || 0) + paymentAmount;
    const newDueAmount = Math.max(0, Number(purchase.due_amount || 0) - paymentAmount);
    const newPaymentStatus = newDueAmount <= 0.01 ? "paid" : "partial";

    await conn.query(
      `UPDATE purchases 
       SET paid_amount = ?, due_amount = ?, payment_status = ? 
       WHERE id = ?`,
      [newPaidAmount, newDueAmount, newPaymentStatus, purchaseId]
    );

    // If bank account used, deduct current balance
    if (bank_account_id) {
      await conn.query(
        "UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?",
        [paymentAmount, bank_account_id]
      );
    }

    await conn.commit();
    res.json({
      message: "Payment recorded successfully",
      payment_id: vpResult.insertId,
      paid_amount: newPaidAmount,
      due_amount: newDueAmount,
      payment_status: newPaymentStatus
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message || "Failed to record payment" });
  } finally {
    conn.release();
  }
};

exports.getPurchasePayments = async (req, res) => {
  const purchaseId = req.params.id;
  try {
    const [rows] = await db.promise().query(
      `SELECT vp.*, ba.account_name AS bank_account_name
       FROM vendor_payments vp
       LEFT JOIN bank_accounts ba ON ba.id = vp.bank_account_id
       WHERE vp.purchase_id = ?
       ORDER BY vp.payment_date DESC, vp.id DESC`,
      [purchaseId]
    );
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load purchase payments" });
  }
};
