const db = require("../config/db");
const { getBranchId, branchWhere, branchIdForInsert } = require("../middleware/branchHelper");
const { ensurePurchaseReturnsTables } = require("../migrations/create_purchase_returns_tables");

// Generate unique return number like PR-001 or PR-2026-0001
function generateReturnNo(branchId, callback) {
  const PREFIX = "PR-";
  db.query(
    `SELECT return_no FROM purchase_returns WHERE return_no LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${PREFIX}%`],
    (err, rows) => {
      if (err) return callback(err);

      let nextNum = 1;
      if (rows.length && rows[0].return_no) {
        const lastNo = rows[0].return_no;
        const numericPart = String(lastNo).replace(PREFIX, "");
        const parsed = parseInt(numericPart, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          nextNum = parsed + 1;
        }
      }

      const returnNo = `${PREFIX}${String(nextNum).padStart(4, "0")}`;
      callback(null, returnNo, nextNum);
    }
  );
}

// 1. Get Next Return Number
exports.getNextReturnNo = async (req, res) => {
  const branchId = getBranchId(req);
  try {
    await ensurePurchaseReturnsTables();
  } catch (e) {}
  generateReturnNo(branchId, (err, returnNo) => {
    if (err) return res.status(500).json({ message: err.message || "Failed to generate return no" });
    res.json({ return_no: returnNo });
  });
};

// 2. Get Purchase details & its items with remaining returnable quantity
exports.getPurchaseForReturn = async (req, res) => {
  const purchaseId = req.params.purchaseId;
  if (!purchaseId) {
    return res.status(400).json({ message: "Purchase ID is required" });
  }

  try {
    await ensurePurchaseReturnsTables();
  } catch (e) {}

  const purchaseSql = `
    SELECT 
      p.id,
      REPLACE(p.purchase_no, 'SSL', 'CTW') AS purchase_no,
      p.purchase_date,
      p.vendor_id,
      p.payment_type,
      p.bank_account_id,
      p.status,
      v.vendor_name,
      v.company_name,
      v.mobile AS vendor_mobile,
      v.gst_no AS vendor_gst
    FROM purchases p
    LEFT JOIN vendors v ON v.id = p.vendor_id
    WHERE p.id = ?
  `;

  db.query(purchaseSql, [purchaseId], (err, pRows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!pRows.length) return res.status(404).json({ message: "Purchase not found" });

    const purchase = pRows[0];

    const itemsSql = `
      SELECT 
        pi.id AS purchase_item_id,
        pi.purchase_id,
        pi.product_id,
        COALESCE(pr.product_name, '—') AS product_name,
        pi.hsncode,
        CAST(pi.qty AS DECIMAL(12,3)) AS purchased_qty,
        CAST(COALESCE(pi.price, 0) AS DECIMAL(12,2)) AS unit_price,
        pi.primary_unit,
        pi.tax_group_id,
        COALESCE((
          SELECT SUM(pri.return_qty)
          FROM purchase_return_items pri
          JOIN purchase_returns ret ON ret.id = pri.purchase_return_id
          WHERE pri.purchase_item_id = pi.id
        ), 0) AS already_returned_qty
      FROM purchase_items pi
      LEFT JOIN products pr ON pr.id = pi.product_id
      WHERE pi.purchase_id = ?
      ORDER BY pi.id ASC
    `;

    db.query(itemsSql, [purchaseId], (errItems, itemRows) => {
      if (errItems) return res.status(500).json({ message: errItems.message });

      const items = (itemRows || []).map((row) => {
        const pQty = Number(row.purchased_qty) || 0;
        const retQty = Number(row.already_returned_qty) || 0;
        const availQty = Math.max(0, pQty - retQty);
        return {
          ...row,
          purchased_qty: pQty,
          already_returned_qty: retQty,
          available_return_qty: availQty,
          return_qty: 0,
        };
      });

      res.json({
        purchase,
        items,
      });
    });
  });
};

// 3. Create Purchase Return (Deducts stock & returns amount to bank)
exports.createPurchaseReturn = async (req, res) => {
  try {
    await ensurePurchaseReturnsTables();
  } catch (e) {}
  const {
    purchase_id,
    purchase_no,
    vendor_id,
    return_date,
    refund_type,
    bank_account_id,
    payment_mode,
    items,
    notes,
  } = req.body;

  if (!vendor_id || !return_date) {
    return res.status(400).json({ message: "Vendor and return date are required" });
  }

  const validItems = (items || []).filter((it) => Number(it.return_qty) > 0);
  if (validItems.length === 0) {
    return res.status(400).json({ message: "Please specify return quantity for at least one item" });
  }

  const branchIdVal = branchIdForInsert(req);
  const refundTypeVal = refund_type === "Vendor Credit / Ledger" ? "Vendor Credit / Ledger" : "Bank / Cash Refund";
  const isCash = String(payment_mode || "").toLowerCase() === "cash";
  const bankAccountIdVal = refundTypeVal === "Bank / Cash Refund" && !isCash && bank_account_id ? Number(bank_account_id) : null;
  const paymentModeVal = payment_mode || (refundTypeVal === "Bank / Cash Refund" ? (isCash ? "Cash" : "Bank Transfer") : "Ledger Credit");

  db.getConnection((connErr, conn) => {
    if (connErr) return res.status(500).json({ message: connErr.message || "DB Connection error" });

    const rollback = (err) => {
      conn.rollback(() => {
        conn.release();
        res.status(500).json({ message: err.message || "Failed to create purchase return" });
      });
    };

    conn.beginTransaction((txErr) => {
      if (txErr) {
        conn.release();
        return res.status(500).json({ message: txErr.message || "Failed to start transaction" });
      }

      generateReturnNo(branchIdVal, (genErr, returnNo) => {
        if (genErr) return rollback(genErr);

        let totalQty = 0;
        let subtotal = 0;
        validItems.forEach((it) => {
          const q = Number(it.return_qty) || 0;
          const p = Number(it.unit_price) || 0;
          totalQty += q;
          subtotal += q * p;
        });

        const grandTotal = subtotal; // can expand with taxes if required

        const insertReturnSql = `
          INSERT INTO purchase_returns 
            (return_no, purchase_id, purchase_no, vendor_id, return_date, refund_type, bank_account_id, payment_mode, total_qty, subtotal, tax_amount, grand_total, notes, branch_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        conn.query(
          insertReturnSql,
          [
            returnNo,
            purchase_id || null,
            purchase_no || null,
            vendor_id,
            return_date,
            refundTypeVal,
            bankAccountIdVal,
            paymentModeVal,
            totalQty,
            subtotal,
            0,
            grandTotal,
            notes || null,
            branchIdVal,
          ],
          (retErr, retResult) => {
            if (retErr) return rollback(retErr);

            const returnId = retResult.insertId;

            // 1. If Bank / Cash refund, increase bank account balance!
            if (refundTypeVal === "Bank / Cash Refund" && bankAccountIdVal && grandTotal > 0) {
              conn.query(
                "UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?",
                [grandTotal, bankAccountIdVal],
                (bankErr) => {
                  if (bankErr) {
                    console.error("Failed to update bank balance for return:", bankErr);
                  }
                }
              );
            }

            // 2. Insert return items and deduct stock!
            const insertItemSql = `
              INSERT INTO purchase_return_items 
                (purchase_return_id, purchase_item_id, product_id, product_name, hsncode, return_qty, unit_price, tax_group_id, total_amount)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            let itemsCompleted = 0;
            const totalItemsCount = validItems.length;

            validItems.forEach((item) => {
              const q = Number(item.return_qty) || 0;
              const p = Number(item.unit_price) || 0;
              const lineTotal = Number(item.total_amount) || q * p;

              conn.query(
                insertItemSql,
                [
                  returnId,
                  item.purchase_item_id || null,
                  item.product_id,
                  item.product_name || null,
                  item.hsncode || null,
                  q,
                  p,
                  item.tax_group_id || null,
                  lineTotal,
                ],
                (itemErr) => {
                  if (itemErr) return rollback(itemErr);

                  // Deduct from stocks table
                  if (item.product_id && q > 0) {
                    conn.query(
                      "UPDATE stocks SET quantity = GREATEST(0, CAST(quantity AS DECIMAL(12,3)) - ?) WHERE product_id = ?",
                      [q, item.product_id],
                      (stockErr) => {
                        if (stockErr) return rollback(stockErr);

                        itemsCompleted++;
                        if (itemsCompleted === totalItemsCount) {
                          conn.commit((commitErr) => {
                            if (commitErr) return rollback(commitErr);
                            conn.release();
                            res.json({
                              message: "Purchase return created successfully",
                              id: returnId,
                              return_no: returnNo,
                              refund_amount: grandTotal,
                            });
                          });
                        }
                      }
                    );
                  } else {
                    itemsCompleted++;
                    if (itemsCompleted === totalItemsCount) {
                      conn.commit((commitErr) => {
                        if (commitErr) return rollback(commitErr);
                        conn.release();
                        res.json({
                          message: "Purchase return created successfully",
                          id: returnId,
                          return_no: returnNo,
                          refund_amount: grandTotal,
                        });
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
  });
};

// 4. Get Purchase Returns List
exports.getPurchaseReturnsList = async (req, res) => {
  try {
    await ensurePurchaseReturnsTables();
  } catch (e) {}
  const { fromDate, toDate, vendor, search, page = 1, limit = 25 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 25));
  const offset = (pageNum - 1) * limitNum;

  const branchId = getBranchId(req);
  const bw = branchWhere(branchId, "pr");
  let where = [bw.clause];
  let params = [...bw.params];

  if (fromDate && fromDate.trim()) {
    where.push("pr.return_date >= ?");
    params.push(fromDate.trim());
  }
  if (toDate && toDate.trim()) {
    where.push("pr.return_date <= ?");
    params.push(toDate.trim());
  }
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    where.push("(pr.return_no LIKE ? OR pr.purchase_no LIKE ? OR v.vendor_name LIKE ? OR v.company_name LIKE ?)");
    params.push(s, s, s, s);
  } else if (vendor && vendor.trim()) {
    where.push("(v.vendor_name LIKE ? OR v.company_name LIKE ?)");
    const v = `%${vendor.trim()}%`;
    params.push(v, v);
  }

  const whereClause = where.join(" AND ");

  const countSql = `
    SELECT 
      COUNT(pr.id) AS total,
      COALESCE(SUM(pr.total_qty), 0) AS grand_qty,
      COALESCE(SUM(pr.grand_total), 0) AS grand_amount
    FROM purchase_returns pr
    LEFT JOIN vendors v ON v.id = pr.vendor_id
    WHERE ${whereClause}
  `;

  const dataSql = `
    SELECT 
      pr.*,
      REPLACE(pr.purchase_no, 'SSL', 'CTW') AS purchase_no,
      COALESCE(v.company_name, v.vendor_name, '—') AS vendor_display_name,
      v.vendor_name,
      v.company_name,
      v.mobile AS vendor_mobile,
      ba.account_name AS bank_account_name,
      ba.account_number AS bank_account_no,
      (
        SELECT GROUP_CONCAT(CONCAT(pri.product_name, ' (x', pri.return_qty, ')') SEPARATOR ', ')
        FROM purchase_return_items pri
        WHERE pri.purchase_return_id = pr.id
      ) AS items_summary
    FROM purchase_returns pr
    LEFT JOIN vendors v ON v.id = pr.vendor_id
    LEFT JOIN bank_accounts ba ON ba.id = pr.bank_account_id
    WHERE ${whereClause}
    ORDER BY pr.return_date DESC, pr.id DESC
    LIMIT ? OFFSET ?
  `;

  db.query(countSql, params, (countErr, countRows) => {
    if (countErr) return res.status(500).json({ message: countErr.message });

    const total = countRows[0]?.total || 0;
    const summary = {
      grand_qty: Number(countRows[0]?.grand_qty || 0),
      grand_amount: Number(countRows[0]?.grand_amount || 0),
    };

    db.query(dataSql, [...params, limitNum, offset], (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });

      res.json({
        data: rows || [],
        total,
        page: pageNum,
        limit: limitNum,
        summary,
      });
    });
  });
};

// 5. Get Purchase Return by ID
exports.getPurchaseReturnById = async (req, res) => {
  const returnId = req.params.id;
  try {
    await ensurePurchaseReturnsTables();
  } catch (e) {}

  const returnSql = `
    SELECT 
      pr.*,
      v.vendor_name,
      v.company_name,
      v.mobile AS vendor_mobile,
      v.address AS vendor_address,
      v.gst_no AS vendor_gst,
      ba.account_name AS bank_account_name,
      ba.account_number AS bank_account_no,
      ba.bank_name,
      b.branch_name
    FROM purchase_returns pr
    LEFT JOIN vendors v ON v.id = pr.vendor_id
    LEFT JOIN bank_accounts ba ON ba.id = pr.bank_account_id
    LEFT JOIN branches b ON b.id = pr.branch_id
    WHERE pr.id = ?
  `;

  db.query(returnSql, [returnId], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows.length) return res.status(404).json({ message: "Purchase return not found" });

    const returnData = rows[0];

    const itemsSql = `
      SELECT 
        pri.*,
        p.barcode,
        p.primary_unit
      FROM purchase_return_items pri
      LEFT JOIN products p ON p.id = pri.product_id
      WHERE pri.purchase_return_id = ?
      ORDER BY pri.id ASC
    `;

    db.query(itemsSql, [returnId], (itemErr, itemRows) => {
      if (itemErr) return res.status(500).json({ message: itemErr.message });

      res.json({
        ...returnData,
        items: itemRows || [],
      });
    });
  });
};

// 6. Delete / Cancel Purchase Return (Restores stock and reverses bank balance)
exports.deletePurchaseReturn = (req, res) => {
  const returnId = req.params.id;
  if (!returnId) {
    return res.status(400).json({ message: "Return ID is required" });
  }

  db.getConnection((connErr, conn) => {
    if (connErr) return res.status(500).json({ message: connErr.message });

    const rollback = (err) => {
      conn.rollback(() => {
        conn.release();
        res.status(500).json({ message: err.message || "Failed to delete purchase return" });
      });
    };

    conn.beginTransaction((txErr) => {
      if (txErr) {
        conn.release();
        return res.status(500).json({ message: txErr.message });
      }

      conn.query(
        "SELECT grand_total, refund_type, bank_account_id FROM purchase_returns WHERE id = ?",
        [returnId],
        (findErr, retRows) => {
          if (findErr) return rollback(findErr);
          if (!retRows.length) {
            return rollback(new Error("Purchase return not found"));
          }

          const { grand_total, refund_type, bank_account_id } = retRows[0];

          // Revert bank balance
          if (refund_type === "Bank / Cash Refund" && bank_account_id && Number(grand_total) > 0) {
            conn.query(
              "UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?",
              [Number(grand_total), bank_account_id]
            );
          }

          // Fetch items to restore stock
          conn.query(
            "SELECT product_id, return_qty FROM purchase_return_items WHERE purchase_return_id = ?",
            [returnId],
            (loadErr, items) => {
              if (loadErr) return rollback(loadErr);

              const restorePromises = (items || [])
                .filter((it) => it.product_id && Number(it.return_qty) > 0)
                .map((it) => {
                  return new Promise((resolve, reject) => {
                    conn.query(
                      "UPDATE stocks SET quantity = CAST(quantity AS DECIMAL(12,3)) + ? WHERE product_id = ?",
                      [Number(it.return_qty), it.product_id],
                      (stkErr) => (stkErr ? reject(stkErr) : resolve())
                    );
                  });
                });

              Promise.all(restorePromises)
                .then(() => {
                  conn.query("DELETE FROM purchase_returns WHERE id = ?", [returnId], (delErr) => {
                    if (delErr) return rollback(delErr);

                    conn.commit((commitErr) => {
                      if (commitErr) return rollback(commitErr);
                      conn.release();
                      res.json({ message: "Purchase return cancelled and stock/balance restored successfully" });
                    });
                  });
                })
                .catch((pErr) => rollback(pErr));
            }
          );
        }
      );
    });
  });
};
