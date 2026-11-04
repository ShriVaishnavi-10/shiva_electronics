const db = require("../config/db");
const path = require("path");
const jsQR = require("jsqr");
const { Jimp } = require("jimp");
const {
  getBranchId,
  branchWhere,
  branchIdForInsert,
} = require("../middleware/branchHelper");
const { syncSequenceAfterSave } = require("./branch.controller");
const { peekFormatted, generateNextNonGstInvoiceNo } = require("../services/invoiceNo.service");
const { ensureSalesChargesColumns } = require("../migrations/add_sales_charges_columns");
ensureSalesChargesColumns().catch(() => {});

const qrCache = new Map();

async function decodeQrFromImage(imagePathOrUrl) {
  if (!imagePathOrUrl) return null;
  if (qrCache.has(imagePathOrUrl)) return qrCache.get(imagePathOrUrl);

  try {
    let filename = imagePathOrUrl;
    if (filename.includes("/")) {
      filename = filename.split("/").pop();
    }
    const localPath = path.join(__dirname, "..", "uploads", "locations", filename);
    const img = await Jimp.read(localPath);
    const code = jsQR(new Uint8ClampedArray(img.bitmap.data), img.bitmap.width, img.bitmap.height);
    if (code && code.data) {
      qrCache.set(imagePathOrUrl, code.data);
      return code.data;
    }
  } catch (e) {
    // Ignore decode error
  }
  return null;
}

function parseTransportCharges(v) {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

exports.getNextInvoiceNo = (req, res) => {
  const qb = req.query.branch_id || req.headers["x-active-branch"];
  if (!qb) {
    return res.status(400).json({
      message:
        "Active branch is required. Select a branch and set Invoice Number Settings (sale) before generating numbers.",
    });
  }
  const bid = parseInt(qb, 10);
  if (Number.isNaN(bid)) {
    return res.status(400).json({ message: "Invalid branch id" });
  }
  return peekFormatted(bid, "sale", (err, data) => {
    if (err)
      return res
        .status(400)
        .json({ message: err.message || "Failed to get next invoice" });
    return res.json({ invoice_no: data.next_number, ...data });
  });
};

exports.checkInvoiceNoExists = (req, res) => {
  const invoice_no = String(req.query.invoice_no || "").trim();
  const branchQ = req.query.branch_id;
  const excludeQ = req.query.exclude_id;
  if (!invoice_no) return res.json({ exists: false });

  const branch_id =
    branchQ !== undefined && branchQ !== "" ? parseInt(branchQ, 10) : null;
  const exclude_id =
    excludeQ !== undefined && excludeQ !== "" ? parseInt(excludeQ, 10) : null;

  let sql = `SELECT id FROM transactions WHERE type = 'sell' AND invoice_no = ?`;
  const params = [invoice_no];
  if (branch_id != null && !Number.isNaN(branch_id)) {
    sql += ` AND branch_id = ?`;
    params.push(branch_id);
  }
  if (exclude_id != null && !Number.isNaN(exclude_id)) {
    sql += ` AND id <> ?`;
    params.push(exclude_id);
  }
  if (req.isNonUser || req.query.is_gst === "0" || req.query.is_gst === 0) {
    sql += ` AND is_gst = 0`;
  } else if (req.query.is_gst === "1" || req.query.is_gst === 1) {
    sql += ` AND is_gst = 1`;
  }
  sql += ` LIMIT 1`;

  db.query(sql, params, (err, rows) => {
    if (err)
      return res.status(500).json({ message: err.message || "Check failed" });
    res.json({ exists: !!(rows && rows.length) });
  });
};

function isCashOrBankMethod(method) {
  if (!method) return false;
  const m = String(method).trim().toLowerCase();
  if (m === "credit") return false;
  return true;
}

function determinePaymentStatus(paymentsList, grandTotal = 0) {
  if (!paymentsList || !Array.isArray(paymentsList) || paymentsList.length === 0) {
    return "due";
  }
  const totalPaid = paymentsList.reduce((sum, p) => {
    return isCashOrBankMethod(p.method) ? sum + (Number(p.amount) || 0) : sum;
  }, 0);
  const total = Number(grandTotal) || 0;
  if (totalPaid >= total && total > 0) {
    return "paid";
  }
  if (totalPaid > 0) {
    return "partial";
  }
  return "due";
}
exports.determinePaymentStatus = determinePaymentStatus;

exports.createTransaction = (req, res) => {
  const {
    business_id,
    location_id,
    branch_id,
    contact_id,
    address,
    invoice_no,
    sales_date,
    status,
    items,
    payments,
    tax_group_id,
  } = req.body;

  const isNonGstSale = Boolean(
    req.isNonUser ||
    req.body.is_gst === 0 ||
    req.body.is_gst === false ||
    req.body.is_gst === "0"
  );

  if (!contact_id)
    return res.status(400).json({ message: "Customer is required" });
  if (!isNonGstSale && !invoice_no)
    return res.status(400).json({ message: "Invoice No is required" });
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ message: "At least one product is required" });
  }
  const paymentsList = Array.isArray(payments) ? payments : [];
  const stockRequiredMap = {};
  (items || []).forEach((it) => {
    const productId = it.product_id;
    const qty = Number(it.qty) || 1;
    if (!productId) return;
    if (!stockRequiredMap[productId]) stockRequiredMap[productId] = 0;
    stockRequiredMap[productId] += qty;
  });
  const stockProductIds = Object.keys(stockRequiredMap);

  const validateAndCreate = () => {
    const locId = business_id ?? location_id ?? null;
    const totalDiscount =
      req.body.discount_amount != null && req.body.discount_amount !== ""
        ? Number(req.body.discount_amount) || 0
        : items.reduce((sum, it) => {
            const qty = Number(it.qty) || 1;
            const rate = Number(it.price) || 0;
            const mrp = Number(it.base_price) || rate;
            const discVal = mrp > rate ? (mrp - rate) * qty : 0;
            return sum + discVal;
          }, 0);
    const discountTypeVal = req.body.discount_type === "percentage" ? "percentage" : "fixed";
    const itemsTotal = items.reduce((sum, it) => {
      const qty = Number(it.qty) || 1;
      const rate = Number(it.price) || 0;
      const rowTotal = Number(it.total) > 0 ? Number(it.total) : rate * qty;
      return sum + rowTotal;
    }, 0);
    const grandTotal =
      req.body.final_amount != null && req.body.final_amount !== "" && !isNaN(Number(req.body.final_amount))
        ? Number(Number(req.body.final_amount).toFixed(2))
        : Math.round(itemsTotal);
    const paymentStatus = determinePaymentStatus(paymentsList, grandTotal);
    const taxGroupId =
      tax_group_id != null && tax_group_id !== ""
        ? Number(tax_group_id) || null
        : null;

    db.query(
      `SELECT tgt.tax_group_id, COALESCE(SUM(tm.tax_rate), 0) AS total_rate
       FROM tax_group_taxes tgt
       INNER JOIN tax_modules tm ON tm.id = tgt.tax_module_id
       GROUP BY tgt.tax_group_id`,
      (taxErr, taxRows) => {
        const taxRateMap = {};
        (taxRows || []).forEach((r) => {
          taxRateMap[r.tax_group_id] = Number(r.total_rate) || 0;
        });

        let calcTaxableSum = 0;
        let calcTaxSum = 0;

        items.forEach((it) => {
          const qty = Number(it.qty) || 1;
          const calcQty = (it.product_name || "").toUpperCase() === "SCRAP" ? 1 : qty;
          const rate = Number(it.price) || 0;
          const rowTotal = Number(it.total) || Math.max(0, rate * calcQty);
          const grpId = it.tax_group_id != null && it.tax_group_id !== ""
            ? Number(it.tax_group_id)
            : taxGroupId;
          const gstRate = grpId && taxRateMap[grpId] ? taxRateMap[grpId] : 0;
          const taxable = gstRate > 0 ? rowTotal / (1 + gstRate / 100) : rowTotal;
          const gstAmt = rowTotal - taxable;

          calcTaxableSum += taxable;
          calcTaxSum += gstAmt;
        });

        const isGstVal = isNonGstSale ? 0 : 1;
        const computedTaxAmount = isNonGstSale ? 0 : Number(calcTaxSum.toFixed(2));
        const totalBeforeTax = isNonGstSale ? grandTotal : Number(calcTaxableSum.toFixed(2));
        const finalTaxGroupId = isNonGstSale ? null : taxGroupId;

        let branchIdVal = branchIdForInsert(req);
        if (branch_id != null && branch_id !== "") {
          const parsed = parseInt(branch_id, 10);
          if (!Number.isNaN(parsed)) branchIdVal = parsed;
        }
        if (!branchIdVal) branchIdVal = 2;

        const billToData = req.body.bill_to || {};
        const billToCompanyName = billToData.company_name ?? req.body.bill_to_company_name ?? null;
        const billToCustomerName = billToData.customer_name ?? req.body.bill_to_customer_name ?? null;
        const billToPhone = billToData.phone ?? req.body.bill_to_phone ?? null;
        const billToAddress = billToData.address ?? req.body.bill_to_address ?? null;
        const billToGstin = billToData.gstin ?? req.body.bill_to_gstin ?? null;
        const billToState = billToData.state ?? req.body.bill_to_state ?? null;
        const billToStateCode = billToData.state_code ?? req.body.bill_to_state_code ?? null;
        const billToPlaceOfSupply = billToData.place_of_supply ?? req.body.bill_to_place_of_supply ?? null;
        const billToPlaceOfSupplyStateCode = billToData.place_of_supply_state_code ?? req.body.bill_to_place_of_supply_state_code ?? null;

        const transportChargesVal = parseTransportCharges(req.body.transport_charges);
        let additionalChargesVal = null;
        if (req.body.additional_charges) {
          additionalChargesVal = typeof req.body.additional_charges === "string"
            ? req.body.additional_charges
            : JSON.stringify(req.body.additional_charges);
        }

        const salesPersonIdVal = req.body.sales_person_id ? Number(req.body.sales_person_id) : null;
        const commissionAmountVal = req.body.commission_amount != null ? Number(req.body.commission_amount) : 0.00;

        const insertTransaction = `INSERT INTO transactions (
        business_id, location_id, type, status, contact_id, sales_person_id, address, payment_status,
        invoice_no, sales_date, total_before_tax, tax_amount, discount_type, discount_amount, tax_group_id, final_amount, commission_amount, commission_status, branch_id, is_gst,
        bill_to_company_name, bill_to_customer_name, bill_to_phone, bill_to_address, bill_to_gstin, bill_to_state, bill_to_state_code, bill_to_place_of_supply, bill_to_place_of_supply_state_code, vehicle_no, eway_invoice_no, transport_charges, additional_charges,
        po_no, po_date, transport_mode
      ) VALUES (?, ?, 'sell', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const proceedWithInvoiceNo = (finalInvoiceNo) => {
          let dupSql = `SELECT id FROM transactions WHERE type = 'sell' AND invoice_no = ? AND is_gst = ?`;
          const dupParams = [finalInvoiceNo, isGstVal];
          if (branchIdVal != null && branchIdVal !== "") {
            dupSql += ` AND branch_id = ?`;
            dupParams.push(branchIdVal);
          }
          dupSql += ` LIMIT 1`;

          db.query(dupSql, dupParams, (dupErr, dupRows) => {
            if (dupErr)
              return res
                .status(500)
                .json({
                  message: dupErr.message || "Failed to validate invoice number",
                });
            if (dupRows && dupRows.length) {
              return res.status(409).json({
                message:
                  "Invoice number already exists for this branch. Use the next available number.",
              });
            }

            const resolveLocationAndInsert = (cb) => {
              if (locId) {
                return cb(locId);
              }
              if (branchIdVal) {
                db.query(
                  "SELECT id FROM business_location WHERE branch_id = ? ORDER BY id ASC LIMIT 1",
                  [branchIdVal],
                  (bErr, bRows) => {
                    const finalLocId = (bRows && bRows.length > 0) ? bRows[0].id : null;
                    cb(finalLocId);
                  }
                );
              } else {
                cb(null);
              }
            };

            resolveLocationAndInsert((finalLocId) => {
              db.query(
                insertTransaction,
                [
                  finalLocId,
                  finalLocId,
                  status || "Final",
                  contact_id,
                  salesPersonIdVal,
                  address ? String(address).trim() : null,
                  paymentStatus,
                  finalInvoiceNo || null,
                  sales_date || null,
                  totalBeforeTax,
                  computedTaxAmount,
                  discountTypeVal,
                  totalDiscount,
                  finalTaxGroupId,
                  grandTotal,
                  commissionAmountVal,
                  "Pending",
                  branchIdVal,
                  isGstVal,
                  billToCompanyName ? String(billToCompanyName).trim() : null,
                  billToCustomerName ? String(billToCustomerName).trim() : null,
                  billToPhone ? String(billToPhone).trim() : null,
                  billToAddress ? String(billToAddress).trim() : null,
                  billToGstin ? String(billToGstin).trim().toUpperCase() : null,
                  billToState ? String(billToState).trim() : null,
                  billToStateCode ? String(billToStateCode).trim() : null,
                  billToPlaceOfSupply ? String(billToPlaceOfSupply).trim() : null,
                  billToPlaceOfSupplyStateCode ? String(billToPlaceOfSupplyStateCode).trim() : null,
                  req.body.vehicle_no ? String(req.body.vehicle_no).trim().slice(0, 100) : null,
                  req.body.eway_invoice_no ? String(req.body.eway_invoice_no).trim().slice(0, 100) : null,
                  transportChargesVal,
                  additionalChargesVal,
                  req.body.po_no ? String(req.body.po_no).trim().slice(0, 100) : null,
                  req.body.po_date || null,
                  req.body.transport_mode ? String(req.body.transport_mode).trim().slice(0, 100) : "By Road",
                ],
                (err, result) => {
                  if (err)
                    return res
                      .status(500)
                      .json({ message: err.message || "Failed to save transaction" });

                  const transactionId = result.insertId;

                  if (!items.length) {
                    if (!stockProductIds.length) {
                      insertPayments(transactionId, paymentsList, locId, res, {
                        branchId: branchIdVal,
                        invoiceNo: finalInvoiceNo,
                        sequenceType: isNonGstSale ? "non_gst_sale" : "sale",
                      });
                      return;
                    }
                  }

          const insertLineSql = `INSERT INTO transaction_sell_lines (
            product_id, product_name, hsncode, transaction_id, quantity, primary_unit, secondary_unit, unit_price_before_discount, unit_price, unit_price_inc_tax, tax_group_id, discount_type, discount_amount
          ) VALUES ?`;

          const lineValues = items.map((item) => {
            const productId = item.product_id || null;
            const productName = item.product_name || "";
            const hsncode = item.hsncode || null;
            const qty = Number(item.qty) || 1;
            const primaryUnit = item.primary_unit ?? item.unit ?? "pcs";
            const secondaryUnit = item.secondary_unit || null;
            const rate = Number(item.price) || 0;
            const mrp = Number(item.base_price) || rate;
            const lineTotalBeforeDiscount = mrp * qty;
            const lineTotal = Number(item.total) || Math.max(0, rate * qty);
            const itemTaxGroupId =
              item.tax_group_id != null && item.tax_group_id !== ""
                ? Number(item.tax_group_id)
                : null;
            const discType = item.discount_type || "percentage";
            const discAmt = Number(item.discount || item.discount_amount || 0) || 0;
            return [
              productId,
              productName,
              hsncode,
              transactionId,
              qty,
              primaryUnit,
              secondaryUnit,
              lineTotalBeforeDiscount,
              rate,
              lineTotal,
              itemTaxGroupId,
              discType,
              discAmt,
            ];
          });

          db.query(insertLineSql, [lineValues], (errLine) => {
            if (errLine) {
              return res.status(500).json({
                message: errLine.message || "Failed to save line items",
              });
            }
            if (!stockProductIds.length) {
              insertPayments(transactionId, paymentsList, locId, res, {
                branchId: branchIdVal,
                invoiceNo: invoice_no,
              });
              return;
            }

            const updateStocksSql =
              "UPDATE stocks SET quantity = quantity - ? WHERE product_id = ? AND quantity >= ?";
            let updatedCount = 0;
            const totalUpdates = stockProductIds.length;
            stockProductIds.forEach((pid) => {
              const neededQty = stockRequiredMap[pid] || 0;
              if (neededQty <= 0) {
                updatedCount++;
                if (updatedCount === totalUpdates) {
                  insertPayments(
                    transactionId,
                    paymentsList,
                    locId,
                    res,
                    { branchId: branchIdVal, invoiceNo: invoice_no }
                  );
                }
                return;
              }
              db.query(
                updateStocksSql,
                [neededQty, pid, neededQty],
                (errUpd, resultUpd) => {
                  if (errUpd) {
                    return res
                      .status(500)
                      .json({
                        message:
                          errUpd.message ||
                          "Failed to update product stock",
                      });
                  }
                  if (!resultUpd.affectedRows) {
                    const dbProd = dbProductsMap[pid];
                    const prodName = dbProd?.product_name || "Product";
                    const availableQty = dbProd && dbProd.qty != null ? Number(dbProd.qty) || 0 : 0;
                    return res
                      .status(400)
                      .json({
                        message: `Insufficient stock for "${prodName}". Available quantity: ${availableQty}`,
                      });
                  }

                  updatedCount++;
                  if (updatedCount === totalUpdates) {
                    insertPayments(
                      transactionId,
                      paymentsList,
                      locId,
                      res,
                      {
                        branchId: branchIdVal,
                        invoiceNo: finalInvoiceNo,
                        sequenceType: isNonGstSale ? "non_gst_sale" : "sale",
                      }
                    );
                  }
                }
              );
            });
          });
        }
      );
      });
    });
  };

        if (isNonGstSale) {
          generateNextNonGstInvoiceNo(branchIdVal, (allocErr, allocData) => {
            if (allocErr) {
              return res
                .status(500)
                .json({ message: allocErr.message || "Failed to generate Non-GST invoice number" });
            }
            proceedWithInvoiceNo(allocData.invoice_no);
          });
        } else {
          const invCheck = String(invoice_no || "").trim();
          proceedWithInvoiceNo(invCheck);
        }
      }
    );
  };

  if (!stockProductIds.length) {
    return validateAndCreate();
  }

  const stockCheckSql = `
    SELECT p.id, p.product_name, COALESCE(s.quantity, 0) AS qty
    FROM products p
    LEFT JOIN stocks s ON s.product_id = p.id
    WHERE p.id IN (?)
  `;

  db.query(stockCheckSql, [stockProductIds], (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: err.message || "Failed to validate product stock" });
    }
    const dbProductsMap = {};
    (rows || []).forEach((row) => {
      dbProductsMap[row.id] = row;
    });

    const insufficientItems = [];
    for (const pid of stockProductIds) {
      const requiredQty = stockRequiredMap[pid] || 0;
      const dbProd = dbProductsMap[pid];
      const availableQty =
        dbProd && dbProd.qty != null ? Number(dbProd.qty) || 0 : 0;
      if (requiredQty > 0 && availableQty < requiredQty) {
        const prodName = dbProd?.product_name || "Product";
        insufficientItems.push({ name: prodName, available: availableQty });
      }
    }

    if (insufficientItems.length > 0) {
      if (insufficientItems.length === 1) {
        const item = insufficientItems[0];
        return res.status(400).json({
          message: `Insufficient stock for "${item.name}". Available quantity: ${item.available}`,
        });
      } else {
        const details = insufficientItems
          .map((it) => `"${it.name}" (Available: ${it.available})`)
          .join(", ");
        return res.status(400).json({
          message: `Insufficient stock for: ${details}`,
        });
      }
    }

    return validateAndCreate();
  });
};

function insertPayments(transactionId, payments, businessId, res, syncMeta) {
  const respondOk = () => {
    const branchId = syncMeta && syncMeta.branchId;
    const inv = syncMeta && syncMeta.invoiceNo;
    const seqType = (syncMeta && syncMeta.sequenceType) || "sale";
    if (branchId && inv) {
      syncSequenceAfterSave(branchId, seqType, inv, () =>
        res.json({
          message: "Transaction saved successfully",
          id: transactionId,
          invoice_no: inv,
        }),
      );
    } else {
      res.json({
        message: "Transaction saved successfully",
        id: transactionId,
        invoice_no: inv,
      });
    }
  };

  if (!payments || payments.length === 0) {
    return respondOk();
  }

  db.query(
    "SELECT id FROM bank_accounts WHERE status = 'Active' ORDER BY id ASC LIMIT 1",
    (errAcc, accRows) => {
      const defaultBankId = (!errAcc && accRows && accRows.length > 0) ? accRows[0].id : null;

      const insertPayment = `INSERT INTO transaction_payments (
        transaction_id, business_id, amount, method, card_type, card_number, payment_for, payment_ref_no, bank_account_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      let done = 0;
      const total = payments.length;

      payments.forEach((p, idx) => {
        const amount = Number(p.amount) || 0;
        const method = p.method || null;
        const isCredit = String(method || '').trim().toLowerCase() === "credit";
        const isElectronic = isCashOrBankMethod(method) &&
          String(method).trim().toLowerCase() !== "cash" &&
          !isCredit;
        const cardType = p.card_type || null;
        const cardNumber = p.card_number || null;
        const paymentFor = p.payment_for || (idx === 0 && total === 1 ? "Advance Payment" : "Payment");
        const paymentRefNo =
          (p.payment_ref_no && String(p.payment_ref_no).trim()) ||
          `TXN-${Date.now()}-${idx}`;
        const bankAccountId = isCredit
          ? null
          : (p.bank_account_id && Number(p.bank_account_id) > 0
              ? Number(p.bank_account_id)
              : (isElectronic ? defaultBankId : null));

        db.query(
          insertPayment,
          [
            transactionId,
            businessId || null,
            amount,
            method,
            cardType,
            cardNumber,
            paymentFor,
            paymentRefNo,
            bankAccountId,
          ],
          (err) => {
            if (err)
              return res
                .status(500)
                .json({ message: err.message || "Failed to save payment" });

            if (bankAccountId && amount > 0) {
              db.query(
                "UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?",
                [amount, bankAccountId],
                (bankErr) => {
                  if (bankErr)
                    console.error(
                      "Failed to adjust bank balance in insertPayments:",
                      bankErr,
                    );
                },
              );
            }

            done++;
            if (done === total) {
              respondOk();
            }
          },
        );
      });
    }
  );
}

exports.listTransactions = (req, res) => {
  db.query("UPDATE transactions SET invoice_no = REPLACE(invoice_no, 'SSL', 'CTW') WHERE invoice_no LIKE '%SSL%'", () => {});
  const { fromDate, toDate, search, location_id, business_location_id, locationId, businessId, sales_person_id, salesPersonId, page = 1, limit = 25 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 25));
  const offset = (pageNum - 1) * limitNum;

  const branchId = getBranchId(req);
  const bw = branchWhere(branchId, "t");
  const whereParts = ["t.type = 'sell'", bw.clause];
  const params = [...bw.params];

  if (req.isNonUser || req.query.is_gst === "0") {
    whereParts.push("t.is_gst = 0");
  } else if (req.query.is_gst === "1") {
    whereParts.push("t.is_gst = 1");
  } else if (req.user && !String(req.user.role_name || "").toLowerCase().includes("super admin")) {
    whereParts.push("t.is_gst = 1");
  }

  const locFilter = location_id || business_location_id || locationId || businessId;
  if (locFilter && String(locFilter).trim() !== "" && String(locFilter).trim().toLowerCase() !== "all") {
    whereParts.push("(t.business_id = ? OR t.location_id = ? OR bl.id = ?)");
    params.push(locFilter, locFilter, locFilter);
  }

  const spFilter = sales_person_id || salesPersonId;
  if (spFilter && String(spFilter).trim() !== "" && String(spFilter).toLowerCase() !== "all") {
    whereParts.push("t.sales_person_id = ?");
    params.push(spFilter);
  }

  if (fromDate) {
    whereParts.push("t.sales_date >= ?");
    params.push(fromDate);
  }
  if (toDate) {
    whereParts.push("t.sales_date <= ?");
    params.push(toDate);
  }
  if (search && search.trim()) {
    const rawSearch = search.trim();
    const q = `%${rawSearch}%`;
    const cleanSearch = rawSearch.replace(/[-\s]/g, "");
    const cleanQ = `%${cleanSearch}%`;
    const strippedDigits = cleanSearch.replace(/^0+/, "");
    const digitsQ = strippedDigits ? `%${strippedDigits}%` : cleanQ;

    whereParts.push(
      `(` +
        `LOWER(t.invoice_no) LIKE LOWER(?) ` +
        `OR REPLACE(REPLACE(LOWER(t.invoice_no), '-', ''), ' ', '') LIKE LOWER(?) ` +
        `OR REPLACE(REPLACE(LOWER(t.invoice_no), '-', ''), ' ', '') LIKE LOWER(?) ` +
        `OR CAST(t.id AS CHAR) = ? ` +
        `OR c.customer_name LIKE ? ` +
        `OR c.contact_no LIKE ? ` +
        `OR IFNULL(c.gst_no, '') LIKE ? ` +
        `OR IFNULL(bl.name, '') LIKE ? ` +
        `OR IFNULL(bl.location_id, '') LIKE ? ` +
        `OR IFNULL(sp.name, '') LIKE ? ` +
        `OR IFNULL(sp.employee_code, '') LIKE ? ` +
        `OR EXISTS (` +
          `SELECT 1 FROM transaction_sell_lines tsl_s ` +
          `LEFT JOIN products p_s ON p_s.id = tsl_s.product_id ` +
          `WHERE tsl_s.transaction_id = t.id AND (` +
            `tsl_s.product_name LIKE ? OR p_s.product_name LIKE ?` +
          `)` +
        `)` +
      `)`
    );
    params.push(q, cleanQ, digitsQ, rawSearch, q, q, q, q, q, q, q, q, q);
  }

  const whereClause = whereParts.join(" AND ");

  const countSql = `
    SELECT COUNT(*) AS total
    FROM transactions t
    LEFT JOIN customers c ON c.id = t.contact_id
    LEFT JOIN sales_persons sp ON sp.id = t.sales_person_id
    LEFT JOIN business_location bl ON (
      (t.business_id IS NOT NULL AND bl.id = t.business_id)
      OR (t.business_id IS NULL AND t.location_id IS NOT NULL AND bl.id = t.location_id)
      OR (t.business_id IS NULL AND t.location_id IS NULL AND bl.id = (
        SELECT MIN(bl2.id) FROM business_location bl2 WHERE bl2.branch_id = t.branch_id
      ))
    )
    WHERE ${whereClause}
  `;

  const dataSql = `
    SELECT
      t.id,
      REPLACE(t.invoice_no, 'SSL', 'CTW') AS invoice_no,
      t.sales_date AS date,
      t.status,
      t.is_gst,
      t.vehicle_no,
      t.eway_invoice_no,
      t.po_no,
      t.po_date,
      t.transport_mode,
      t.transport_charges,
      t.additional_charges,
      c.customer_name,
      c.contact_no AS contact_number,
      c.gst_no,
      COALESCE(
        CASE
          WHEN bl.landmark LIKE '%Attur%' AND (bl.city IS NULL OR bl.city NOT LIKE '%Attur%') THEN 'Attur'
          WHEN bl.city IS NOT NULL AND bl.city != '' AND (bl.name IS NULL OR bl.name = 'SRI SIVALINGA' OR bl.name = 'CLAVIS TECH WORKS' OR bl.name = 'AAA FATHIMA FURNITURES' OR bl.name = b.branch_name) THEN bl.city
          WHEN bl.name IS NOT NULL AND bl.name != '' AND bl.name != 'SRI SIVALINGA' AND bl.name != 'CLAVIS TECH WORKS' AND bl.name != 'AAA FATHIMA FURNITURES' THEN bl.name
          WHEN bl.city IS NOT NULL AND bl.city != '' THEN bl.city
          WHEN b.city IS NOT NULL AND b.city != '' THEN b.city
          ELSE COALESCE(bl.name, b.branch_name, bl.location_id)
        END,
        ''
      ) AS location,
      -- accurate payment status
      CASE
        WHEN t.status = 'Cancelled' THEN COALESCE(NULLIF(t.payment_status, ''), 'cancelled')
        WHEN (
          SELECT COALESCE(SUM(tp.amount), 0)
          FROM transaction_payments tp
          WHERE tp.transaction_id = t.id
            AND LOWER(TRIM(COALESCE(tp.method, ''))) != 'credit'
        ) >= t.final_amount AND t.final_amount > 0 THEN 'paid'
        WHEN (
          SELECT COALESCE(SUM(tp.amount), 0)
          FROM transaction_payments tp
          WHERE tp.transaction_id = t.id
            AND LOWER(TRIM(COALESCE(tp.method, ''))) != 'credit'
        ) > 0 THEN 'partial'
        ELSE 'due'
      END AS payment_status,
      -- first payment method (if any)
      (
        SELECT tp.method
        FROM transaction_payments tp
        WHERE tp.transaction_id = t.id
        ORDER BY tp.id ASC
        LIMIT 1
      ) AS payment_method,
      t.final_amount AS total_amount,
      -- total paid
      (
        SELECT COALESCE(SUM(tp.amount), 0)
        FROM transaction_payments tp
        WHERE tp.transaction_id = t.id
          AND LOWER(TRIM(COALESCE(tp.method, ''))) != 'credit'
      ) AS total_paid,
      -- advance amount (first payment)
      (
        SELECT COALESCE(tp.amount, 0)
        FROM transaction_payments tp
        WHERE tp.transaction_id = t.id
          AND LOWER(TRIM(COALESCE(tp.method, ''))) != 'credit'
        ORDER BY tp.id ASC
        LIMIT 1
      ) AS advance_amount,
      -- remaining amount
      GREATEST(0, t.final_amount - (
        SELECT COALESCE(SUM(tp.amount), 0)
        FROM transaction_payments tp
        WHERE tp.transaction_id = t.id
          AND LOWER(TRIM(COALESCE(tp.method, ''))) != 'credit'
      )) AS remaining_amount,
      -- total items (number of line rows)
      (
        SELECT COUNT(*)
        FROM transaction_sell_lines tsl
        WHERE tsl.transaction_id = t.id
      ) AS total_items,
      -- total qty (sum of actual quantities across all line items)
      (
        SELECT COALESCE(SUM(tsl.quantity), 0)
        FROM transaction_sell_lines tsl
        WHERE tsl.transaction_id = t.id
      ) AS total_qty,
      t.sales_person_id,
      t.commission_amount,
      t.commission_status,
      sp.name AS sales_person_name,
      sp.employee_code AS sales_person_code
    FROM transactions t
    LEFT JOIN customers c ON c.id = t.contact_id
    LEFT JOIN sales_persons sp ON sp.id = t.sales_person_id
    LEFT JOIN business_location bl ON (
      (t.business_id IS NOT NULL AND bl.id = t.business_id)
      OR (t.business_id IS NULL AND t.location_id IS NOT NULL AND bl.id = t.location_id)
      OR (t.business_id IS NULL AND t.location_id IS NULL AND bl.id = (
        SELECT MIN(bl2.id) FROM business_location bl2 WHERE bl2.branch_id = t.branch_id
      ))
    )
    LEFT JOIN branches b ON b.id = COALESCE(bl.branch_id, t.branch_id)
    WHERE ${whereClause}
    ORDER BY t.sales_date DESC, t.id DESC
    LIMIT ? OFFSET ?
  `;

  db.query(countSql, params, (err, countRows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: err.message || "Failed to load transactions" });
    }
    const total = countRows[0]?.total ?? 0;

    db.query(dataSql, [...params, limitNum, offset], (err2, rows) => {
      if (err2) {
        return res
          .status(500)
          .json({ message: err2.message || "Failed to load transactions" });
      }
      if (!rows || rows.length === 0) {
        return res.json({ total, page: pageNum, limit: limitNum, data: [] });
      }

      const transactionIds = rows.map((r) => r.id);
      const itemsSql = `
        SELECT
          tsl.id AS line_id,
          tsl.transaction_id,
          COALESCE(tsl.product_name, p.product_name, '') AS product_name,
          tsl.quantity,
          tsl.unit_price,
          COALESCE(
            tsl.unit_price_inc_tax,
            COALESCE(tsl.quantity, 0) * COALESCE(tsl.unit_price, 0),
            0
          ) AS line_total
        FROM transaction_sell_lines tsl
        LEFT JOIN products p ON p.id = tsl.product_id
        WHERE tsl.transaction_id IN (?)
        ORDER BY tsl.id ASC
      `;

      db.query(itemsSql, [transactionIds], (errItems, itemRows) => {
        if (errItems) {
          return res
            .status(500)
            .json({
              message:
                errItems.message || "Failed to load transaction sell lines",
            });
        }

        const itemsByTx = {};
        (itemRows || []).forEach((item) => {
          if (!itemsByTx[item.transaction_id]) {
            itemsByTx[item.transaction_id] = [];
          }
          itemsByTx[item.transaction_id].push(item);
        });

        const finalRows = rows.map((tx) => {
          const items = itemsByTx[tx.id] || [];
          return {
            ...tx,
            items,
          };
        });

        res.json({ total, page: pageNum, limit: limitNum, data: finalRows });
      });
    });
  });
};

exports.salesReportLines = (req, res) => {
  const { fromDate, toDate, search, limit, billType, locationId, businessId, sales_person_id, salesPersonId } = req.query;
  const limitNum = Math.min(50000, Math.max(1, parseInt(limit, 10) || 25000));

  const rawBid = getBranchId(req);
  const branchId =
    rawBid != null &&
    rawBid !== "" &&
    !Number.isNaN(Number(rawBid)) &&
    Number(rawBid) > 0
      ? Number(rawBid)
      : null;
  const whereParts = ["t.type = 'sell'"];
  const params = [];
  if (branchId) {
    whereParts.push("COALESCE(t.branch_id, 1) = ?");
    params.push(branchId);
  }

  const locId = locationId || businessId;
  if (locId && String(locId).trim() !== "" && String(locId) !== "all") {
    whereParts.push("(t.business_id = ? OR t.location_id = ?)");
    params.push(locId, locId);
  }

  const spFilter = sales_person_id || salesPersonId;
  if (spFilter && String(spFilter).trim() !== "" && String(spFilter).toLowerCase() !== "all") {
    whereParts.push("t.sales_person_id = ?");
    params.push(spFilter);
  }

  if (fromDate) {
    whereParts.push("t.sales_date >= ?");
    params.push(fromDate);
  }
  if (toDate) {
    whereParts.push("t.sales_date <= ?");
    params.push(toDate);
  }

  if (req.isNonUser || req.query.is_gst === "0") {
    whereParts.push("t.is_gst = 0");
  } else if (req.query.is_gst === "1") {
    whereParts.push("t.is_gst = 1");
  }

  if (billType === "tax") {
    whereParts.push("(t.tax_amount > 0 OR t.tax_group_id IS NOT NULL OR tsl.tax_group_id IS NOT NULL)");
  } else if (billType === "non-tax") {
    whereParts.push("(IFNULL(t.tax_amount, 0) <= 0 AND t.tax_group_id IS NULL AND tsl.tax_group_id IS NULL)");
  }

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    whereParts.push(
      "(c.customer_name LIKE ? OR c.contact_no LIKE ? OR IFNULL(t.address, '') LIKE ? OR IFNULL(bl.name, '') LIKE ? OR IFNULL(bl.city, '') LIKE ? OR IFNULL(bl.location_id, '') LIKE ? OR IFNULL(t.invoice_no, '') LIKE ? OR IFNULL(p.product_name, '') LIKE ? OR IFNULL(tsl.product_name, '') LIKE ? OR IFNULL(sp.name, '') LIKE ? OR IFNULL(sp.employee_code, '') LIKE ?)",
    );
    params.push(q, q, q, q, q, q, q, q, q, q, q);
  }

  const whereClause = whereParts.join(" AND ");

  const dataSql = `
    SELECT DISTINCT
      t.id AS transaction_id,
      t.invoice_no,
      t.sales_date,
      t.address AS sale_address,
      c.customer_name,
      t.sales_person_id,
      sp.name AS sales_person_name,
      sp.employee_code AS sales_person_code,
      t.commission_amount,
      COALESCE(
        CASE
          WHEN bl.landmark LIKE '%Attur%' AND (bl.city IS NULL OR bl.city NOT LIKE '%Attur%') THEN 'Attur'
          WHEN bl.city IS NOT NULL AND bl.city != '' AND (bl.name IS NULL OR bl.name = 'SRI SIVALINGA' OR bl.name = 'CLAVIS TECH WORKS' OR bl.name = 'AAA FATHIMA FURNITURES' OR bl.name = b.branch_name) THEN bl.city
          WHEN bl.name IS NOT NULL AND bl.name != '' AND bl.name != 'SRI SIVALINGA' AND bl.name != 'CLAVIS TECH WORKS' AND bl.name != 'AAA FATHIMA FURNITURES' THEN bl.name
          WHEN bl.city IS NOT NULL AND bl.city != '' THEN bl.city
          WHEN b.city IS NOT NULL AND b.city != '' THEN b.city
          ELSE COALESCE(bl.name, b.branch_name, '')
        END,
        ''
      ) AS location,
      TRIM(CONCAT_WS(' | ',
        NULLIF(TRIM(c.contact_no), ''),
        NULLIF(TRIM(COALESCE(t.address, c.address)), ''),
        NULLIF(TRIM(c.city), ''),
        NULLIF(TRIM(c.pincode), ''),
        NULLIF(TRIM(c.country), '')
      )) AS customer_details,
      t.final_amount AS sale_total
    FROM transaction_sell_lines tsl
    INNER JOIN transactions t ON t.id = tsl.transaction_id
    LEFT JOIN customers c ON c.id = t.contact_id
    LEFT JOIN sales_persons sp ON sp.id = t.sales_person_id
    LEFT JOIN business_location bl ON bl.id = COALESCE(t.business_id, t.location_id, (SELECT MIN(bl2.id) FROM business_location bl2 WHERE bl2.branch_id = t.branch_id))
    LEFT JOIN branches b ON b.id = t.branch_id
    LEFT JOIN products p ON p.id = tsl.product_id
    WHERE ${whereClause}
    ORDER BY t.sales_date DESC, t.id DESC
    LIMIT ?
  `;

  db.query(dataSql, [...params, limitNum], (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: err.message || "Failed to load sales report lines" });
    }
    const transactions = rows || [];
    if (transactions.length === 0) {
      return res.json({
        data: [],
        summary: {
          total_quantity: 0,
          total_line_amount: 0,
          grand_total_sales: 0,
          sale_count: 0,
        },
      });
    }

    const transactionIds = transactions.map((t) => t.transaction_id);
    const itemsSql = `
      SELECT
        tsl.id AS line_id,
        tsl.transaction_id,
        COALESCE(tsl.product_name, p.product_name, '') AS product_name,
        tsl.quantity,
        tsl.unit_price,
        COALESCE(
          tsl.unit_price_inc_tax,
          COALESCE(tsl.quantity, 0) * COALESCE(tsl.unit_price, 0),
          0
        ) AS line_total
      FROM transaction_sell_lines tsl
      LEFT JOIN products p ON p.id = tsl.product_id
      WHERE tsl.transaction_id IN (?)
      ORDER BY tsl.id ASC
    `;

    db.query(itemsSql, [transactionIds], (errItems, itemRows) => {
      if (errItems) {
        return res
          .status(500)
          .json({ message: errItems.message || "Failed to load sales items" });
      }

      const itemsByTx = {};
      (itemRows || []).forEach((item) => {
        if (!itemsByTx[item.transaction_id]) {
          itemsByTx[item.transaction_id] = [];
        }
        itemsByTx[item.transaction_id].push(item);
      });

      const finalRows = transactions.map((tx) => {
        const items = itemsByTx[tx.transaction_id] || [];
        return {
          ...tx,
          items,
          product_name: items.map((i) => i.product_name).join(", "),
          quantity: items.reduce((sum, i) => sum + Number(i.quantity || 0), 0),
          unit_price: items.length === 1 ? items[0].unit_price : null,
          line_total: items.reduce(
            (sum, i) => sum + Number(i.line_total || 0),
            0,
          ),
        };
      });

      let totalQuantity = 0;
      let totalLineAmount = 0;
      const saleTotalsByTx = new Map();
      finalRows.forEach((r) => {
        totalQuantity += Number(r.quantity) || 0;
        totalLineAmount += Number(r.line_total) || 0;
        const tid = r.transaction_id;
        if (!saleTotalsByTx.has(tid)) {
          saleTotalsByTx.set(tid, Number(r.sale_total) || 0);
        }
      });
      let grandTotalSales = 0;
      saleTotalsByTx.forEach((v) => {
        grandTotalSales += v;
      });

      res.json({
        data: finalRows,
        summary: {
          total_quantity: totalQuantity,
          total_line_amount: totalLineAmount,
          grand_total_sales: grandTotalSales,
          sale_count: saleTotalsByTx.size,
        },
      });
    });
  });
};

function buildGstReportFilter(req) {
  const { fromDate, toDate, search, locationId, businessId } = req.query;
  const branchId = getBranchId(req);
  const bw = branchWhere(branchId, "t");
  const whereParts = [
    "t.type = 'sell'",
    "(t.tax_group_id IS NOT NULL OR tsl.tax_group_id IS NOT NULL OR IFNULL(t.tax_amount, 0) > 0)",
    bw.clause,
  ];
  const params = [...bw.params];

  const locId = locationId || businessId;
  if (locId && String(locId).trim() !== "" && String(locId) !== "all") {
    whereParts.push("(t.business_id = ? OR t.location_id = ?)");
    params.push(locId, locId);
  }

  if (fromDate) {
    whereParts.push("t.sales_date >= ?");
    params.push(fromDate);
  }
  if (toDate) {
    whereParts.push("t.sales_date <= ?");
    params.push(toDate);
  }
  if (search && String(search).trim()) {
    const q = `%${String(search).trim()}%`;
    whereParts.push(
      "(c.customer_name LIKE ? OR c.contact_no LIKE ? OR IFNULL(c.alternate_no, '') LIKE ? OR IFNULL(t.address, '') LIKE ? OR IFNULL(bl.name, '') LIKE ? OR IFNULL(bl.city, '') LIKE ? OR IFNULL(t.invoice_no, '') LIKE ? OR IFNULL(COALESCE(tsl.product_name, p.product_name), '') LIKE ?)",
    );
    params.push(q, q, q, q, q, q, q, q);
  }

  return { whereClause: whereParts.join(" AND "), params };
}

const GST_REPORT_MAX_EXPORT = 100000;
const GST_REPORT_MAX_PAGE_SIZE = 100;

exports.gstReport = (req, res) => {
  const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(
    GST_REPORT_MAX_PAGE_SIZE,
    Math.max(1, parseInt(req.query.pageSize, 10) || 25),
  );
  const offset = (pageNum - 1) * pageSize;

  const { whereClause, params } = buildGstReportFilter(req);

  const baseFrom = `
    FROM transaction_sell_lines tsl
    INNER JOIN transactions t ON t.id = tsl.transaction_id
    LEFT JOIN customers c ON c.id = t.contact_id
    LEFT JOIN business_location bl ON bl.id = COALESCE(t.business_id, t.location_id, (SELECT MIN(bl2.id) FROM business_location bl2 WHERE bl2.branch_id = t.branch_id))
    LEFT JOIN branches b ON b.id = t.branch_id
    LEFT JOIN products p ON p.id = tsl.product_id
    WHERE ${whereClause}
  `;

  const aggSql = `
    SELECT
      COUNT(*) AS line_count,
      COALESCE(SUM(tsl.quantity), 0) AS grand_quantity,
      COALESCE(SUM(tsl.unit_price_inc_tax), 0) AS grand_total_amount
    ${baseFrom}
  `;

  const dataSql = `
    SELECT
      tsl.id AS line_id,
      t.id AS transaction_id,
      t.sales_date,
      t.invoice_no,
      t.address AS sale_address,
      c.customer_name,
      COALESCE(
        CASE
          WHEN bl.landmark LIKE '%Attur%' AND (bl.city IS NULL OR bl.city NOT LIKE '%Attur%') THEN 'Attur'
          WHEN bl.city IS NOT NULL AND bl.city != '' AND (bl.name IS NULL OR bl.name = 'SRI SIVALINGA' OR bl.name = 'CLAVIS TECH WORKS' OR bl.name = 'AAA FATHIMA FURNITURES' OR bl.name = b.branch_name) THEN bl.city
          WHEN bl.name IS NOT NULL AND bl.name != '' AND bl.name != 'SRI SIVALINGA' AND bl.name != 'CLAVIS TECH WORKS' AND bl.name != 'AAA FATHIMA FURNITURES' THEN bl.name
          WHEN bl.city IS NOT NULL AND bl.city != '' THEN bl.city
          WHEN b.city IS NOT NULL AND b.city != '' THEN b.city
          ELSE COALESCE(bl.name, b.branch_name, '')
        END,
        ''
      ) AS location,
      TRIM(IFNULL(NULLIF(TRIM(c.contact_no), ''), IFNULL(TRIM(c.alternate_no), ''))) AS contact_no,
      COALESCE(c.gst_no, '') AS customer_gstin,
      COALESCE(tsl.hsncode, p.hsncode, '') AS hsn_code,
      COALESCE(tsl.product_name, p.product_name, '') AS product_name,
      COALESCE(tsl.primary_unit, '') AS unit,
      tsl.quantity AS quantity,
      COALESCE(tsl.unit_price, 0) AS unit_price,
      COALESCE(tsl.unit_price_inc_tax, tsl.quantity * tsl.unit_price) AS total_price,
      COALESCE(
        (SELECT SUM(tm.tax_rate) FROM tax_group_taxes tgt INNER JOIN tax_modules tm ON tm.id = tgt.tax_module_id WHERE tgt.tax_group_id = tsl.tax_group_id),
        (SELECT SUM(tm.tax_rate) FROM tax_group_taxes tgt INNER JOIN tax_modules tm ON tm.id = tgt.tax_module_id WHERE tgt.tax_group_id = t.tax_group_id),
        0
      ) AS line_tax_rate
    ${baseFrom}
    ORDER BY t.sales_date DESC, t.id DESC, tsl.id ASC
    LIMIT ? OFFSET ?
  `;

  db.query(aggSql, params, (errAgg, aggRows) => {
    if (errAgg) {
      return res
        .status(500)
        .json({
          message: errAgg.message || "Failed to load GST report summary",
        });
    }
    const agg = aggRows && aggRows[0] ? aggRows[0] : {};
    const totalLines = Number(agg.line_count) || 0;
    const totalPages = totalLines === 0 ? 0 : Math.ceil(totalLines / pageSize);

    db.query(dataSql, [...params, pageSize, offset], (errData, rows) => {
      if (errData) {
        return res
          .status(500)
          .json({ message: errData.message || "Failed to load GST report" });
      }

      let totalTaxableSum = 0;
      let totalTaxSum = 0;

      const processedRows = (rows || []).map((r) => {
        const qty = Number(r.quantity) || 0;
        const unitPrice = Number(r.unit_price) || 0;
        const totalPrice = Number(r.total_price) || (qty * unitPrice);
        const gstRate = Number(r.line_tax_rate) || 0;
        const taxableValue = gstRate > 0 ? totalPrice / (1 + gstRate / 100) : totalPrice;
        const taxAmount = totalPrice - taxableValue;

        totalTaxableSum += taxableValue;
        totalTaxSum += taxAmount;

        return {
          ...r,
          quantity: qty,
          unit_price: unitPrice,
          line_tax_rate: gstRate,
          taxable_value: Number(taxableValue.toFixed(2)),
          tax_amount: Number(taxAmount.toFixed(2)),
          total_price: Number(totalPrice.toFixed(2)),
        };
      });

      const summary = {
        grand_quantity: Number(agg.grand_quantity) || 0,
        grand_total_amount: Number(agg.grand_total_amount) || 0,
        grand_taxable_value: Number(totalTaxableSum.toFixed(2)),
        grand_tax_amount: Number(totalTaxSum.toFixed(2)),
        line_count: totalLines,
      };

      res.json({
        data: processedRows,
        summary,
        page: pageNum,
        pageSize,
        totalLines,
        totalPages,
      });
    });
  });
};

exports.gstReportExport = (req, res) => {
  const { whereClause, params } = buildGstReportFilter(req);
  const limit = Math.min(
    GST_REPORT_MAX_EXPORT,
    Math.max(1, parseInt(req.query.limit, 10) || GST_REPORT_MAX_EXPORT),
  );

  const baseFrom = `
    FROM transaction_sell_lines tsl
    INNER JOIN transactions t ON t.id = tsl.transaction_id
    LEFT JOIN customers c ON c.id = t.contact_id
    LEFT JOIN business_location bl ON bl.id = COALESCE(t.business_id, t.location_id, (SELECT MIN(bl2.id) FROM business_location bl2 WHERE bl2.branch_id = t.branch_id))
    LEFT JOIN branches b ON b.id = t.branch_id
    LEFT JOIN products p ON p.id = tsl.product_id
    WHERE ${whereClause}
  `;

  const dataSql = `
    SELECT
      tsl.id AS line_id,
      t.id AS transaction_id,
      t.sales_date,
      t.invoice_no,
      t.address AS sale_address,
      c.customer_name,
      COALESCE(
        CASE
          WHEN bl.landmark LIKE '%Attur%' AND (bl.city IS NULL OR bl.city NOT LIKE '%Attur%') THEN 'Attur'
          WHEN bl.city IS NOT NULL AND bl.city != '' AND (bl.name IS NULL OR bl.name = 'SRI SIVALINGA' OR bl.name = 'CLAVIS TECH WORKS' OR bl.name = 'AAA FATHIMA FURNITURES' OR bl.name = b.branch_name) THEN bl.city
          WHEN bl.name IS NOT NULL AND bl.name != '' AND bl.name != 'SRI SIVALINGA' AND bl.name != 'CLAVIS TECH WORKS' AND bl.name != 'AAA FATHIMA FURNITURES' THEN bl.name
          WHEN bl.city IS NOT NULL AND bl.city != '' THEN bl.city
          WHEN b.city IS NOT NULL AND b.city != '' THEN b.city
          ELSE COALESCE(bl.name, b.branch_name, '')
        END,
        ''
      ) AS location,
      TRIM(IFNULL(NULLIF(TRIM(c.contact_no), ''), IFNULL(TRIM(c.alternate_no), ''))) AS contact_no,
      COALESCE(c.gst_no, '') AS customer_gstin,
      COALESCE(tsl.hsncode, p.hsncode, '') AS hsn_code,
      COALESCE(tsl.product_name, p.product_name, '') AS product_name,
      COALESCE(tsl.primary_unit, '') AS unit,
      tsl.quantity AS quantity,
      COALESCE(tsl.unit_price, 0) AS unit_price,
      COALESCE(tsl.unit_price_inc_tax, tsl.quantity * tsl.unit_price) AS total_price,
      COALESCE(
        (SELECT SUM(tm.tax_rate) FROM tax_group_taxes tgt INNER JOIN tax_modules tm ON tm.id = tgt.tax_module_id WHERE tgt.tax_group_id = tsl.tax_group_id),
        (SELECT SUM(tm.tax_rate) FROM tax_group_taxes tgt INNER JOIN tax_modules tm ON tm.id = tgt.tax_module_id WHERE tgt.tax_group_id = t.tax_group_id),
        0
      ) AS line_tax_rate
    ${baseFrom}
    ORDER BY t.sales_date DESC, t.id DESC, tsl.id ASC
    LIMIT ?
  `;

  const aggSql = `
    SELECT
      COUNT(*) AS line_count,
      COALESCE(SUM(tsl.quantity), 0) AS grand_quantity,
      COALESCE(SUM(tsl.unit_price_inc_tax), 0) AS grand_total_amount
    FROM transaction_sell_lines tsl
    INNER JOIN transactions t ON t.id = tsl.transaction_id
    LEFT JOIN customers c ON c.id = t.contact_id
    LEFT JOIN products p ON p.id = tsl.product_id
    WHERE ${whereClause}
  `;

  db.query(aggSql, params, (errAgg, aggRows) => {
    if (errAgg) {
      return res
        .status(500)
        .json({
          message: errAgg.message || "Failed to load GST export summary",
        });
    }
    const agg = aggRows && aggRows[0] ? aggRows[0] : {};
    const lineCount = Number(agg.line_count) || 0;

    db.query(dataSql, [...params, limit], (errData, rows) => {
      if (errData) {
        return res
          .status(500)
          .json({ message: errData.message || "Failed to load GST export" });
      }

      let totalTaxableSum = 0;
      let totalTaxSum = 0;

      const processedRows = (rows || []).map((r) => {
        const qty = Number(r.quantity) || 0;
        const unitPrice = Number(r.unit_price) || 0;
        const totalPrice = Number(r.total_price) || (qty * unitPrice);
        const gstRate = Number(r.line_tax_rate) || 0;
        const taxableValue = gstRate > 0 ? totalPrice / (1 + gstRate / 100) : totalPrice;
        const taxAmount = totalPrice - taxableValue;

        totalTaxableSum += taxableValue;
        totalTaxSum += taxAmount;

        return {
          ...r,
          quantity: qty,
          unit_price: unitPrice,
          line_tax_rate: gstRate,
          taxable_value: Number(taxableValue.toFixed(2)),
          tax_amount: Number(taxAmount.toFixed(2)),
          total_price: Number(totalPrice.toFixed(2)),
        };
      });

      const summary = {
        grand_quantity: Number(agg.grand_quantity) || 0,
        grand_total_amount: Number(agg.grand_total_amount) || 0,
        grand_taxable_value: Number(totalTaxableSum.toFixed(2)),
        grand_tax_amount: Number(totalTaxSum.toFixed(2)),
        line_count: lineCount,
      };

      res.json({
        data: processedRows,
        summary,
        totalLines: lineCount,
        truncated: lineCount > limit,
      });
    });
  });
};

exports.getTransactionById = (req, res) => {
  const { id } = req.params;

  const headerSql = `
    SELECT
      t.id,
      t.sales_date,
      t.sales_date AS date,
      t.invoice_no,
      t.status,
      t.payment_status,
      t.total_before_tax,
      t.discount_amount,
      t.tax_amount,
      t.tax_group_id,
      t.final_amount AS total_amount,
      t.contact_id,
      t.business_id,
      t.location_id,
      t.address,
      t.vehicle_no,
      t.eway_invoice_no,
      t.po_no,
      t.po_date,
      t.transport_mode,
      t.transport_charges,
      t.additional_charges,
      t.bill_to_company_name,
      t.bill_to_customer_name,
      t.bill_to_phone,
      t.bill_to_address,
      t.bill_to_gstin,
      t.bill_to_state,
      t.bill_to_state_code,
      t.bill_to_place_of_supply,
      t.bill_to_place_of_supply_state_code,
      c.customer_name,
      c.contact_no AS contact_number,
      c.gst_no,
      c.address AS customer_address,
      c.address2 AS customer_address2,
      c.city AS customer_city,
      c.pincode AS customer_pincode,
      c.country AS customer_country,
      COALESCE(
        CASE
          WHEN bl.landmark LIKE '%Attur%' AND (bl.city IS NULL OR bl.city NOT LIKE '%Attur%') THEN 'Attur'
          WHEN bl.city IS NOT NULL AND bl.city != '' AND (bl.name IS NULL OR bl.name = 'SRI SIVALINGA' OR bl.name = 'CLAVIS TECH WORKS' OR bl.name = 'AAA FATHIMA FURNITURES' OR bl.name = b.branch_name) THEN bl.city
          WHEN bl.name IS NOT NULL AND bl.name != '' AND bl.name != 'SRI SIVALINGA' AND bl.name != 'CLAVIS TECH WORKS' AND bl.name != 'AAA FATHIMA FURNITURES' THEN bl.name
          WHEN bl.city IS NOT NULL AND bl.city != '' THEN bl.city
          WHEN b.city IS NOT NULL AND b.city != '' THEN b.city
          ELSE COALESCE(bl.name, b.branch_name, bl.location_id)
        END,
        ''
      ) AS location,
      (
        SELECT COALESCE(SUM(tp.amount), 0)
        FROM transaction_payments tp
        WHERE tp.transaction_id = t.id
          AND LOWER(TRIM(COALESCE(tp.method, ''))) != 'credit'
      ) AS total_paid,
      (
        SELECT COALESCE(tp.amount, 0)
        FROM transaction_payments tp
        WHERE tp.transaction_id = t.id
          AND LOWER(TRIM(COALESCE(tp.method, ''))) != 'credit'
        ORDER BY tp.id ASC
        LIMIT 1
      ) AS advance_amount,
      GREATEST(0, t.final_amount - (
        SELECT COALESCE(SUM(tp.amount), 0)
        FROM transaction_payments tp
        WHERE tp.transaction_id = t.id
          AND LOWER(TRIM(COALESCE(tp.method, ''))) != 'credit'
      )) AS remaining_amount,
      (
        SELECT COUNT(*)
        FROM transaction_sell_lines tsl2
        WHERE tsl2.transaction_id = t.id
      ) AS total_items,
      (
        SELECT COALESCE(SUM(tsl3.quantity), 0)
        FROM transaction_sell_lines tsl3
        WHERE tsl3.transaction_id = t.id
      ) AS total_qty,
      (
        SELECT tp.method
        FROM transaction_payments tp
        WHERE tp.transaction_id = t.id
        ORDER BY tp.id ASC
        LIMIT 1
      ) AS payment_method,
      t.sales_person_id,
      t.commission_amount,
      t.commission_status,
      sp.name AS sales_person_name,
      sp.employee_code AS sales_person_code
    FROM transactions t
    LEFT JOIN customers c ON c.id = t.contact_id
    LEFT JOIN sales_persons sp ON sp.id = t.sales_person_id
    LEFT JOIN business_location bl ON (
      (t.business_id IS NOT NULL AND bl.id = t.business_id)
      OR (t.business_id IS NULL AND t.location_id IS NOT NULL AND bl.id = t.location_id)
      OR (t.business_id IS NULL AND t.location_id IS NULL AND bl.id = (
        SELECT MIN(bl2.id) FROM business_location bl2 WHERE bl2.branch_id = t.branch_id
      ))
    )
    LEFT JOIN branches b ON b.id = COALESCE(bl.branch_id, t.branch_id)
    WHERE t.id = ?
    LIMIT 1
  `;

  const linesSql = `
    SELECT
      tsl.product_id,
      COALESCE(tsl.product_name, p.product_name, '') AS product_name,
      COALESCE(tsl.hsncode, p.hsncode, '') AS hsncode,
      p.price AS product_price,
      tsl.quantity,
      tsl.primary_unit,
      tsl.secondary_unit,
      tsl.unit_price,
      tsl.unit_price_before_discount,
      tsl.unit_price_inc_tax AS total,
      tsl.tax_group_id,
      tsl.discount_type,
      tsl.discount_amount
    FROM transaction_sell_lines tsl
    LEFT JOIN products p ON p.id = tsl.product_id
    WHERE tsl.transaction_id = ?
    ORDER BY tsl.id ASC
  `;

  const paymentsSql = `
    SELECT
      tp.id,
      tp.amount,
      tp.method,
      tp.card_type,
      tp.card_number,
      tp.payment_for,
      tp.payment_ref_no,
      tp.business_id,
      tp.bank_account_id,
      ba.account_name AS bank_account_name,
      ba.bank_name,
      tp.created_at
    FROM transaction_payments tp
    LEFT JOIN bank_accounts ba ON ba.id = tp.bank_account_id
    WHERE tp.transaction_id = ?
    ORDER BY tp.id ASC
  `;

  db.query(headerSql, [id], (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: err.message || "Failed to load transaction" });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    const header = rows[0];

    db.query(linesSql, [id], (err2, lineRows) => {
      if (err2) {
        return res
          .status(500)
          .json({
            message: err2.message || "Failed to load transaction items",
          });
      }
      db.query(paymentsSql, [id], (err3, payRows) => {
        if (err3) {
          return res
            .status(500)
            .json({
              message: err3.message || "Failed to load transaction payments",
            });
        }
        const hasBillTo = Boolean(
          header.bill_to_company_name ||
          header.bill_to_customer_name ||
          header.bill_to_phone ||
          header.bill_to_address ||
          header.bill_to_gstin ||
          header.bill_to_state ||
          header.bill_to_state_code ||
          header.bill_to_place_of_supply ||
          header.bill_to_place_of_supply_state_code
        );
        const billToObj = hasBillTo
          ? {
              company_name: header.bill_to_company_name || "",
              customer_name: header.bill_to_customer_name || "",
              phone: header.bill_to_phone || "",
              address: header.bill_to_address || "",
              gstin: header.bill_to_gstin || "",
              state: header.bill_to_state || "",
              state_code: header.bill_to_state_code || "",
              place_of_supply: header.bill_to_place_of_supply || "",
              place_of_supply_state_code: header.bill_to_place_of_supply_state_code || "",
            }
          : null;

        res.json({
          ...header,
          bill_to: billToObj,
          items: lineRows || [],
          payments: payRows || [],
        });
      });
    });
  });
};

exports.getSalesReceiptById = (req, res) => {
  const { id } = req.params;

  const headerSql = `
    SELECT
      t.id AS sale_id,
      t.invoice_no,
      t.sales_date AS date,
      t.status,
      t.is_gst,
      t.total_before_tax,
      t.tax_amount,
      t.discount_amount,
      t.final_amount,
      t.tax_group_id,
      t.payment_status,
      t.business_id,
      t.branch_id AS transaction_branch_id,
      c.customer_name,
      c.contact_no AS customer_phone,
      c.alternate_no AS customer_alternate_no,
      c.gst_no AS customer_gst_no,
      COALESCE(t.address, c.address) AS customer_address,
      t.address AS sale_address,
      t.vehicle_no,
      t.eway_invoice_no,
      t.po_no,
      t.po_date,
      t.transport_mode,
      t.transport_charges,
      t.additional_charges,
      t.bill_to_company_name,
      t.bill_to_customer_name,
      t.bill_to_phone,
      t.bill_to_address,
      t.bill_to_gstin,
      t.bill_to_state,
      t.bill_to_state_code,
      t.bill_to_place_of_supply,
      t.bill_to_place_of_supply_state_code,
      c.city AS customer_city,
      c.state AS customer_state,
      c.pincode AS customer_pincode,
      c.country AS customer_country,
      bl.name AS business_name,
      bl.location_id AS business_code,
      bl.landmark AS business_landmark,
      bl.city AS business_city,
      bl.state AS business_state,
      bl.zip_code AS business_zip,
      bl.mobile AS business_phone,
      COALESCE(
        NULLIF(TRIM(bl.alternate_number), ''),
        (
          SELECT TRIM(blx.alternate_number)
          FROM business_location blx
          WHERE blx.branch_id = COALESCE(t.branch_id, bl.branch_id)
            AND NULLIF(TRIM(blx.alternate_number), '') IS NOT NULL
          ORDER BY blx.id DESC
          LIMIT 1
        )
      ) AS business_alternate_number,
      bl.gst_no AS business_gst_no,
      COALESCE(bl.images, (SELECT images FROM business_location WHERE NULLIF(TRIM(images), '') IS NOT NULL ORDER BY id DESC LIMIT 1)) AS business_images,
      COALESCE(bl.account_holder, (SELECT account_holder FROM business_location WHERE NULLIF(TRIM(account_holder), '') IS NOT NULL ORDER BY id DESC LIMIT 1)) AS account_holder,
      COALESCE(bl.bank_name, (SELECT bank_name FROM business_location WHERE NULLIF(TRIM(bank_name), '') IS NOT NULL ORDER BY id DESC LIMIT 1)) AS bank_name,
      COALESCE(bl.account_number, (SELECT account_number FROM business_location WHERE NULLIF(TRIM(account_number), '') IS NOT NULL ORDER BY id DESC LIMIT 1)) AS account_number,
      COALESCE(bl.branch, (SELECT branch FROM business_location WHERE NULLIF(TRIM(branch), '') IS NOT NULL ORDER BY id DESC LIMIT 1)) AS branch,
      COALESCE(bl.ifsc_code, (SELECT ifsc_code FROM business_location WHERE NULLIF(TRIM(ifsc_code), '') IS NOT NULL ORDER BY id DESC LIMIT 1)) AS ifsc_code,
      br.branch_name AS branch_table_name,
      br.branch_code AS branch_table_code,
      br.address AS branch_table_address,
      br.city AS branch_table_city,
      br.pincode AS branch_table_pincode,
      br.phone AS branch_table_phone,
      br.gst_no AS branch_table_gst_no,
      (
        SELECT gst_no FROM company_settings WHERE status = 1 ORDER BY id DESC LIMIT 1
      ) AS company_settings_gst_no,
      (
        SELECT COALESCE(SUM(tm.tax_rate), 0)
        FROM tax_group_taxes tgt
        INNER JOIN tax_modules tm ON tm.id = tgt.tax_module_id
        WHERE tgt.tax_group_id = t.tax_group_id
      ) AS tax_group_total_rate_pct
    FROM transactions t
    LEFT JOIN customers c ON c.id = t.contact_id
    LEFT JOIN business_location bl ON (
      (COALESCE(t.business_id, t.location_id) IS NOT NULL AND bl.id = COALESCE(t.business_id, t.location_id))
      OR (COALESCE(t.business_id, t.location_id) IS NULL AND bl.id = (
        SELECT MIN(bl2.id) FROM business_location bl2 WHERE bl2.branch_id = COALESCE(t.branch_id, 1)
      ))
    )
    LEFT JOIN branches br ON br.id = COALESCE(t.branch_id, bl.branch_id)
    WHERE t.id = ?
    LIMIT 1
  `;

  const linesSql = `
    SELECT
      tsl.product_id,
      p.id AS product_master_id,
      COALESCE(tsl.product_name, p.product_name, '') AS product_name,
      COALESCE(tsl.hsncode, p.hsncode, '') AS hsncode,
      tsl.quantity,
      tsl.primary_unit,
      tsl.unit_price_before_discount,
      tsl.unit_price,
      tsl.unit_price_inc_tax AS line_total,
      tsl.tax_group_id,
      tsl.discount_type,
      tsl.discount_amount,
      COALESCE(
        (
          SELECT SUM(tm.tax_rate)
          FROM tax_group_taxes tgt
          INNER JOIN tax_modules tm ON tm.id = tgt.tax_module_id
          WHERE tgt.tax_group_id = tsl.tax_group_id
        ),
        (
          SELECT SUM(tm.tax_rate)
          FROM tax_group_taxes tgt
          INNER JOIN tax_modules tm ON tm.id = tgt.tax_module_id
          WHERE tgt.tax_group_id = (SELECT tax_group_id FROM transactions WHERE id = tsl.transaction_id)
        ),
        0
      ) AS line_tax_rate
    FROM transaction_sell_lines tsl
    LEFT JOIN products p ON p.id = tsl.product_id
    WHERE tsl.transaction_id = ?
    ORDER BY tsl.id ASC
  `;

  const paymentsSql = `
    SELECT id, amount, method, card_type, payment_for, payment_ref_no, bank_account_id, created_at
    FROM transaction_payments
    WHERE transaction_id = ?
    ORDER BY id ASC
  `;

  db.query(headerSql, [id], (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ message: err.message || "Failed to load sales receipt" });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Sale not found" });
    }
    const h = rows[0];
    if (req.isNonUser && Number(h.is_gst) === 1) {
      return res.status(403).json({ message: "Access denied: Non-GST role cannot access GST transactions." });
    }

    db.query(linesSql, [id], (err2, lineRows) => {
      if (err2) {
        return res
          .status(500)
          .json({ message: err2.message || "Failed to load receipt items" });
      }

      db.query(paymentsSql, [id], (err3, payRows) => {
        if (err3) {
          return res
            .status(500)
            .json({
              message: err3.message || "Failed to load receipt payments",
            });
        }

        const products =
          Array.isArray(lineRows) && lineRows.length
            ? lineRows.map((r) => {
                const qty = Number(r.quantity) || 0;
                const unitPrice = Number(r.unit_price) || 0;
                const lineTotal =
                  r.line_total != null
                    ? Number(r.line_total) || 0
                    : unitPrice * qty;
                const lineTaxRate = Number(r.line_tax_rate) || 0;
                const taxAmt = lineTaxRate > 0 ? (lineTotal - (lineTotal / (1 + lineTaxRate / 100))) : 0;
                let taxLabel = lineTaxRate > 0 ? `${lineTaxRate}%` : "0%";
                return {
                  product_id: r.product_id,
                  product_code:
                    r.product_master_id != null
                      ? String(r.product_master_id)
                      : "",
                  product_name: r.product_name || "",
                  hsn_sac: r.hsncode || "",
                  qty,
                  unit: r.primary_unit || "",
                  rate: unitPrice,
                  mrp:
                    r.unit_price_before_discount != null
                      ? Number(r.unit_price_before_discount) / (qty || 1)
                      : unitPrice,
                  tax_group_id: r.tax_group_id || null,
                  discount_type: r.discount_type || "fixed",
                  discount_amount: Number(r.discount_amount) || 0,
                  gst_rate: lineTaxRate,
                  tax_rate: lineTaxRate,
                  tax_amount: taxAmt,
                  tax: taxLabel,
                  amount: lineTotal,
                  line_total: lineTotal,
                };
              })
            : [];

        const customerAddressParts = [
          h.customer_address,
          h.customer_city,
          h.customer_pincode,
          h.customer_country,
        ]
          .filter(Boolean)
          .map(String);

        const businessAddressParts = [
          h.business_landmark,
          h.business_city,
          h.business_state,
          h.business_zip,
        ]
          .filter(Boolean)
          .map(String);

        const branchAddressParts = [
          h.branch_table_address,
          h.branch_table_city,
          h.branch_table_pincode,
        ]
          .filter(Boolean)
          .map(String);

        const effectiveBranchId =
          h.transaction_branch_id != null
            ? h.transaction_branch_id
            : h.business_branch_id != null
              ? h.business_branch_id
              : null;

        const effectiveGstNo =
          h.business_gst_no ||
          h.branch_table_gst_no ||
          h.company_settings_gst_no ||
          "";

        const payments = (payRows || []).map((p) => ({
          id: p.id,
          amount: Number(p.amount) || 0,
          method: p.method || "",
          card_type: p.card_type || "",
          payment_for: p.payment_for || "",
          payment_ref_no: p.payment_ref_no || "",
          bank_account_id: p.bank_account_id || "",
          created_at: p.created_at ? new Date(p.created_at).toISOString() : null,
        }));

        const hasBillTo = Boolean(
          h.bill_to_company_name ||
          h.bill_to_customer_name ||
          h.bill_to_phone ||
          h.bill_to_address ||
          h.bill_to_gstin ||
          h.bill_to_state ||
          h.bill_to_state_code ||
          h.bill_to_place_of_supply ||
          h.bill_to_place_of_supply_state_code
        );

        const billToObj = hasBillTo
          ? {
              company_name: h.bill_to_company_name || "",
              customer_name: h.bill_to_customer_name || "",
              phone: h.bill_to_phone || "",
              address: h.bill_to_address || "",
              gstin: h.bill_to_gstin || "",
              state: h.bill_to_state || "",
              state_code: h.bill_to_state_code || "",
              place_of_supply: h.bill_to_place_of_supply || "",
              place_of_supply_state_code: h.bill_to_place_of_supply_state_code || "",
            }
          : null;

        const payload = {
          sale_id: h.sale_id,
          invoice_no: h.invoice_no || "",
          date: h.date || null,
          payment_status: h.payment_status || "",
          vehicle_no: h.vehicle_no || "",
          eway_invoice_no: h.eway_invoice_no || "",
          po_no: h.po_no || "",
          po_date: h.po_date || null,
          transport_mode: h.transport_mode || "By Road",
          transport_type: h.transport_type || "",
          transport_charges: Number(h.transport_charges) || 0,
          additional_charges: h.additional_charges || null,
          tax_group_id: h.tax_group_id != null ? h.tax_group_id : null,
          tax_group_rate_pct:
            h.tax_group_total_rate_pct != null
              ? Number(h.tax_group_total_rate_pct) || 0
              : 0,
          /** Human-readable location id (e.g. LOC-0001) — same as business_location.location_id */
          location_id: h.business_code || null,
          business_location_id: h.business_id || null,
          branch_id: effectiveBranchId,
          company_gst_no: effectiveGstNo,
          sale_address: h.sale_address || "",
          bill_to: billToObj,
          place_of_supply: billToObj?.place_of_supply || null,
          place_of_supply_state_code: billToObj?.place_of_supply_state_code || null,
          customer: {
            name: h.customer_name || "",
            address: h.sale_address && String(h.sale_address).trim() ? h.sale_address.trim() : customerAddressParts.join("\n"),
            delivery_address: h.sale_address ? String(h.sale_address).trim() : "",
            phone: h.customer_phone || "",
            alternate_no: h.customer_alternate_no
              ? String(h.customer_alternate_no).trim()
              : "",
            gst_no: h.customer_gst_no || "",
            state: h.customer_state || "",
          },
          branch: {
            id: effectiveBranchId,
            name: h.branch_table_name || "",
            code: h.branch_table_code || "",
            address: branchAddressParts.join("\n"),
            phone: h.branch_table_phone || "",
            gst_no: h.branch_table_gst_no || effectiveGstNo,
          },
          location: {
            id: h.business_id || null,
            location_id: h.business_code || "",
            branch_id:
              h.business_branch_id != null ? h.business_branch_id : null,
            name: h.business_name || "",
            address: businessAddressParts.join("\n"),
            landmark: h.business_landmark || "",
            city: h.business_city || "",
            state: h.business_state || "",
            zip_code: h.business_zip || "",
            mobile: h.business_phone || "",
            alternate_number: h.business_alternate_number || "",
            gst: effectiveGstNo,
            gst_no: effectiveGstNo,
            images: h.business_images || null,
            bank_name: h.bank_name || "",
            account_number: h.account_number || "",
            account_holder: h.account_holder || "",
            branch: h.branch || "",
            ifsc: h.ifsc_code || "",
          },
          business: {
            id: h.business_id || null,
            business_id: h.business_id || null,
            company_name: h.business_name || "",
            code: h.business_code || "",
            logo: null,
            address: businessAddressParts.join("\n"),
            phone: h.business_phone || "",
            alternate_number: h.business_alternate_number || "",
            gst: effectiveGstNo,
            gst_no: effectiveGstNo,
            bank_name: h.bank_name || "",
            account_number: h.account_number || "",
            account_holder: h.account_holder || "",
            branch: h.branch || "",
            ifsc: h.ifsc_code || "",
          },
          products,
          payments,
          totals: {
            subtotal:
              h.total_before_tax != null ? Number(h.total_before_tax) || 0 : 0,
            tax_total: h.tax_amount != null ? Number(h.tax_amount) || 0 : 0,
            discount:
              (h.discount_amount != null && Number(h.discount_amount) > 0)
                ? Number(h.discount_amount)
                : products.reduce((sum, p) => sum + (p.mrp > p.rate ? (p.mrp - p.rate) * p.qty : 0), 0),
            labour_charges: 0,
            travel_charges: 0,
            grand_total:
              h.final_amount != null ? Number(h.final_amount) || 0 : 0,
          },
          status: h.status || "Final",
          is_gst: h.is_gst != null ? Number(h.is_gst) : 1,
        };

        decodeQrFromImage(h.business_images).then((decoded) => {
          const upiBaseUrl = decoded || "upi://pay?pa=rajkumarmanickam01@oksbi&pn=Raj%20Kumar&aid=uGICAgICNsoTFKg";
          payload.location.upi_base_url = upiBaseUrl;
          payload.business.upi_base_url = upiBaseUrl;
          payload.upi_base_url = upiBaseUrl;
          res.json(payload);
        }).catch(() => {
          res.json(payload);
        });
      });
    });
  });
};

function syncPaymentsOnUpdate(transactionId, paymentsList, businessId, grandTotal, res, syncMeta) {
  const branchId = syncMeta && syncMeta.branchId;
  const inv = syncMeta && syncMeta.invoiceNo;

  const finish = (finalStatus) => {
    db.query(
      "UPDATE transactions SET payment_status = ? WHERE id = ?",
      [finalStatus, transactionId],
      () => {
        if (branchId && inv) {
          syncSequenceAfterSave(branchId, "sale", inv, () =>
            res.json({ message: "Transaction updated successfully", id: transactionId, payment_status: finalStatus })
          );
        } else {
          res.json({ message: "Transaction updated successfully", id: transactionId, payment_status: finalStatus });
        }
      }
    );
  };

  db.query(
    "SELECT id FROM bank_accounts WHERE status = 'Active' ORDER BY id ASC LIMIT 1",
    (errAcc, accRows) => {
      const defaultBankId = (!errAcc && accRows && accRows.length > 0) ? accRows[0].id : null;

      db.query(
        "SELECT id, amount, bank_account_id, method, payment_ref_no, payment_for FROM transaction_payments WHERE transaction_id = ?",
        [transactionId],
        (errOld, oldPayments = []) => {
          if (errOld) {
            return res.status(500).json({ message: errOld.message || "Failed to query payments" });
          }

          const incoming = Array.isArray(paymentsList) ? paymentsList : [];
          const oldMap = {};
          (oldPayments || []).forEach((p) => { oldMap[p.id] = p; });

          // Identify deleted payments: in oldPayments but not in incoming
          const toDelete = (oldPayments || []).filter((oldP) => !incoming.some((inc) => String(inc.id) === String(oldP.id)));

          // Identify updated payments: existing payments in both oldPayments and incoming
          const toUpdate = incoming.filter((inc) => inc.id && oldMap[inc.id] && Number(inc.id) <= 1000000000000);

          // Identify new payments: in incoming but not in oldPayments
          const toInsert = incoming.filter((inc) => !inc.id || !oldMap[inc.id] || Number(inc.id) > 1000000000000);

          // 1. Revert bank balances for deleted payments
          toDelete.forEach((dp) => {
            if (dp.bank_account_id && Number(dp.amount) > 0) {
              db.query(
                "UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?",
                [dp.amount, dp.bank_account_id]
              );
            }
          });

          // 2. Adjust bank balances and update records for updated payments
          toUpdate.forEach((up) => {
            const oldP = oldMap[up.id];
            const oldAmt = Number(oldP.amount) || 0;
            const newAmt = Number(up.amount) || 0;
            const oldBankId = oldP.bank_account_id ? Number(oldP.bank_account_id) : null;
            const isCredit = String(up.method || '').trim().toLowerCase() === "credit";
            const isElectronic = isCashOrBankMethod(up.method) &&
              String(up.method).trim().toLowerCase() !== "cash" &&
              !isCredit;
            const newBankId = isCredit
              ? null
              : (up.bank_account_id && Number(up.bank_account_id) > 0
                  ? Number(up.bank_account_id)
                  : (isElectronic ? defaultBankId : null));

            if (oldBankId !== newBankId || oldAmt !== newAmt) {
              if (oldBankId && oldAmt > 0) {
                db.query(
                  "UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?",
                  [oldAmt, oldBankId]
                );
              }
              if (newBankId && newAmt > 0) {
                db.query(
                  "UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?",
                  [newAmt, newBankId]
                );
              }
            }

            db.query(
              "UPDATE transaction_payments SET amount = ?, method = ?, card_type = ?, card_number = ?, payment_for = ?, payment_ref_no = ?, bank_account_id = ? WHERE id = ?",
              [
                newAmt,
                up.method || null,
                up.card_type || null,
                up.card_number || null,
                up.payment_for || oldP.payment_for,
                up.payment_ref_no || oldP.payment_ref_no,
                newBankId,
                up.id,
              ]
            );
          });

          const deleteIds = toDelete.map((dp) => dp.id);
          const afterDelete = () => {
            if (toInsert.length === 0) {
              // Recalculate status from remaining payments
              db.query(
                "SELECT amount, method FROM transaction_payments WHERE transaction_id = ?",
                [transactionId],
                (errAll, allRows = []) => {
                  const currentStatus = determinePaymentStatus(allRows, grandTotal);
                  finish(currentStatus);
                }
              );
              return;
            }

            let insertedCount = 0;
            toInsert.forEach((p, idx) => {
              const amount = Number(p.amount) || 0;
              const method = p.method || null;
              const isCredit = String(method || '').trim().toLowerCase() === "credit";
              const isElectronic = isCashOrBankMethod(method) &&
                String(method).trim().toLowerCase() !== "cash" &&
                !isCredit;
              const cardType = p.card_type || null;
              const cardNumber = p.card_number || null;
              const paymentFor = p.payment_for || ((oldPayments || []).length === 0 && idx === 0 ? "Advance Payment" : "Payment");
              const paymentRefNo = (p.payment_ref_no && String(p.payment_ref_no).trim()) || `TXN-${Date.now()}-${idx}`;
              const bankAccountId = isCredit
                ? null
                : (p.bank_account_id && Number(p.bank_account_id) > 0
                    ? Number(p.bank_account_id)
                    : (isElectronic ? defaultBankId : null));

              const insertSql = `INSERT INTO transaction_payments (
                transaction_id, business_id, amount, method, card_type, card_number, payment_for, payment_ref_no, bank_account_id
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

              db.query(
                insertSql,
                [transactionId, businessId || null, amount, method, cardType, cardNumber, paymentFor, paymentRefNo, bankAccountId],
                (errIns) => {
                  if (!errIns && bankAccountId && amount > 0) {
                    db.query(
                      "UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?",
                      [amount, bankAccountId]
                    );
                  }
                  insertedCount++;
                  if (insertedCount === toInsert.length) {
                    db.query(
                      "SELECT amount, method FROM transaction_payments WHERE transaction_id = ?",
                      [transactionId],
                      (errAll, allRows = []) => {
                        const currentStatus = determinePaymentStatus(allRows, grandTotal);
                        finish(currentStatus);
                      }
                    );
                  }
                }
              );
            });
          };

          if (deleteIds.length > 0) {
            db.query("DELETE FROM transaction_payments WHERE id IN (?)", [deleteIds], () => {
              afterDelete();
            });
          } else {
            afterDelete();
          }
        }
      );
    }
  );
}

exports.updateTransaction = (req, res) => {
  const { id } = req.params;
  const {
    business_id,
    location_id,
    contact_id,
    address,
    invoice_no,
    sales_date,
    status,
    items,
    payments,
    tax_group_id,
  } = req.body;

  if (!id)
    return res.status(400).json({ message: "Transaction ID is required" });
  if (!contact_id)
    return res.status(400).json({ message: "Customer is required" });
  if (!invoice_no)
    return res.status(400).json({ message: "Invoice No is required" });
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ message: "At least one product is required" });
  }
  const paymentsList = Array.isArray(payments) ? payments : [];

  const stockRequiredMap = {};
  (items || []).forEach((it) => {
    const productId = it.product_id;
    const qty = Number(it.qty) || 1;
    if (!productId) return;
    if (!stockRequiredMap[productId]) stockRequiredMap[productId] = 0;
    stockRequiredMap[productId] += qty;
  });

  db.query(
    "SELECT product_id, quantity FROM transaction_sell_lines WHERE transaction_id = ?",
    [id],
    (errOldLines, oldLines) => {
      if (errOldLines)
        return res
          .status(500)
          .json({
            message:
              errOldLines.message || "Failed to get old transaction lines",
          });

      const oldStockMap = {};
      (oldLines || []).forEach((row) => {
        if (!row.product_id) return;
        if (!oldStockMap[row.product_id]) oldStockMap[row.product_id] = 0;
        oldStockMap[row.product_id] += Number(row.quantity);
      });

      const stockProductIds = Object.keys(stockRequiredMap);
      Object.keys(oldStockMap).forEach((pid) => {
        if (!stockProductIds.includes(pid)) stockProductIds.push(pid);
      });

      const stockDiffMap = {};
      stockProductIds.forEach((pid) => {
        const oldQty = oldStockMap[pid] || 0;
        const newQty = stockRequiredMap[pid] || 0;
        stockDiffMap[pid] = newQty - oldQty;
      });

      const performUpdate = () => {
        const locId = business_id ?? location_id ?? null;
        const totalDiscount =
          req.body.discount_amount != null && req.body.discount_amount !== ""
            ? Number(req.body.discount_amount) || 0
            : items.reduce((sum, it) => {
                const qty = Number(it.qty) || 1;
                const rate = Number(it.price) || 0;
                const mrp = Number(it.base_price) || rate;
                const discVal = mrp > rate ? (mrp - rate) * qty : 0;
                return sum + discVal;
              }, 0);
        const discountTypeVal = req.body.discount_type === "percentage" ? "percentage" : "fixed";
        const itemsTotal = items.reduce((sum, it) => {
          const qty = Number(it.qty) || 1;
          const rate = Number(it.price) || 0;
          const rowTotal = Number(it.total) > 0 ? Number(it.total) : rate * qty;
          return sum + rowTotal;
        }, 0);
        const grandTotal =
          req.body.final_amount != null && req.body.final_amount !== "" && !isNaN(Number(req.body.final_amount))
            ? Number(Number(req.body.final_amount).toFixed(2))
            : Math.round(itemsTotal);
        const paymentStatus = determinePaymentStatus(paymentsList);
        const taxGroupId =
          tax_group_id != null && tax_group_id !== ""
            ? Number(tax_group_id) || null
            : null;

        db.query(
          `SELECT tgt.tax_group_id, COALESCE(SUM(tm.tax_rate), 0) AS total_rate
           FROM tax_group_taxes tgt
           INNER JOIN tax_modules tm ON tm.id = tgt.tax_module_id
           GROUP BY tgt.tax_group_id`,
          (taxErr, taxRows) => {
            const taxRateMap = {};
            (taxRows || []).forEach((r) => {
              taxRateMap[r.tax_group_id] = Number(r.total_rate) || 0;
            });

            let calcTaxableSum = 0;
            let calcTaxSum = 0;

            items.forEach((it) => {
              const qty = Number(it.qty) || 1;
              const rate = Number(it.price) || 0;
              const rowTotal = Number(it.total) || Math.max(0, rate * qty);
              const grpId = it.tax_group_id != null && it.tax_group_id !== ""
                ? Number(it.tax_group_id)
                : taxGroupId;
              const gstRate = grpId && taxRateMap[grpId] ? taxRateMap[grpId] : 0;
              const taxable = gstRate > 0 ? rowTotal / (1 + gstRate / 100) : rowTotal;
              const gstAmt = rowTotal - taxable;

              calcTaxableSum += taxable;
              calcTaxSum += gstAmt;
            });

            const isNonGstSale = Boolean(req.isNonUser || req.body.is_gst === 0 || req.body.is_gst === false || req.body.is_gst === "0");
            const computedTaxAmount = isNonGstSale ? 0 : Number(calcTaxSum.toFixed(2));
            const totalBeforeTax = isNonGstSale ? grandTotal : Number(calcTaxableSum.toFixed(2));
            const finalTaxGroupId = isNonGstSale ? null : taxGroupId;

            const billToData = req.body.bill_to || {};
            const billToCompanyName = billToData.company_name ?? req.body.bill_to_company_name ?? null;
            const billToCustomerName = billToData.customer_name ?? req.body.bill_to_customer_name ?? null;
            const billToPhone = billToData.phone ?? req.body.bill_to_phone ?? null;
            const billToAddress = billToData.address ?? req.body.bill_to_address ?? null;
            const billToGstin = billToData.gstin ?? req.body.bill_to_gstin ?? null;
            const billToState = billToData.state ?? req.body.bill_to_state ?? null;
            const billToStateCode = billToData.state_code ?? req.body.bill_to_state_code ?? null;
            const billToPlaceOfSupply = billToData.place_of_supply ?? req.body.bill_to_place_of_supply ?? null;
            const billToPlaceOfSupplyStateCode = billToData.place_of_supply_state_code ?? req.body.bill_to_place_of_supply_state_code ?? null;

            const transportChargesVal = parseTransportCharges(req.body.transport_charges);
            let additionalChargesVal = null;
            if (req.body.additional_charges) {
              additionalChargesVal = typeof req.body.additional_charges === "string"
                ? req.body.additional_charges
                : JSON.stringify(req.body.additional_charges);
            }

            const salesPersonIdVal = req.body.sales_person_id !== undefined ? (req.body.sales_person_id ? Number(req.body.sales_person_id) : null) : null;
            const commissionAmountVal = req.body.commission_amount !== undefined ? (req.body.commission_amount != null ? Number(req.body.commission_amount) : 0.00) : null;

            const updateTransactionSql = `UPDATE transactions SET
            business_id = ?, location_id = ?, status = ?, contact_id = ?, sales_person_id = COALESCE(?, sales_person_id), address = ?, payment_status = ?,
            sales_date = ?, total_before_tax = ?, tax_amount = ?, discount_type = ?, discount_amount = ?, tax_group_id = ?, final_amount = ?, commission_amount = COALESCE(?, commission_amount),
            bill_to_company_name = ?, bill_to_customer_name = ?, bill_to_phone = ?, bill_to_address = ?, bill_to_gstin = ?, bill_to_state = ?, bill_to_state_code = ?, bill_to_place_of_supply = ?, bill_to_place_of_supply_state_code = ?, vehicle_no = ?, eway_invoice_no = ?, transport_charges = ?, additional_charges = ?,
            po_no = ?, po_date = ?, transport_mode = ?
            WHERE id = ?`;

        db.query(
          "DELETE FROM transaction_sell_lines WHERE transaction_id = ?",
          [id],
          (errLinesDelete) => {
            if (errLinesDelete)
              return res
                .status(500)
                .json({
                  message:
                    errLinesDelete.message ||
                    "Failed to delete line items",
                });
            db.query(
              updateTransactionSql,
              [
                locId,
                locId,
                status || "Final",
                contact_id,
                salesPersonIdVal,
                address ? String(address).trim() : null,
                paymentStatus,
                sales_date || null,
                totalBeforeTax,
                computedTaxAmount,
                discountTypeVal,
                totalDiscount,
                taxGroupId,
                grandTotal,
                commissionAmountVal,
                billToCompanyName ? String(billToCompanyName).trim() : null,
                billToCustomerName ? String(billToCustomerName).trim() : null,
                billToPhone ? String(billToPhone).trim() : null,
                billToAddress ? String(billToAddress).trim() : null,
                billToGstin ? String(billToGstin).trim().toUpperCase() : null,
                billToState ? String(billToState).trim() : null,
                billToStateCode ? String(billToStateCode).trim() : null,
                billToPlaceOfSupply ? String(billToPlaceOfSupply).trim() : null,
                billToPlaceOfSupplyStateCode ? String(billToPlaceOfSupplyStateCode).trim() : null,
                req.body.vehicle_no ? String(req.body.vehicle_no).trim().slice(0, 100) : null,
                req.body.eway_invoice_no ? String(req.body.eway_invoice_no).trim().slice(0, 100) : null,
                transportChargesVal,
                additionalChargesVal,
                req.body.po_no ? String(req.body.po_no).trim().slice(0, 100) : null,
                req.body.po_date || null,
                req.body.transport_mode ? String(req.body.transport_mode).trim().slice(0, 100) : "By Road",
                id,
              ],
              (errUpdateTx, resultUpdateTx) => {
                if (errUpdateTx)
                  return res
                    .status(500)
                    .json({
                      message:
                        errUpdateTx.message ||
                        "Failed to update transaction",
                    });
                if (resultUpdateTx.affectedRows === 0)
                  return res
                    .status(404)
                    .json({ message: "Transaction not found" });

                if (!items.length) {
                  const branchIdVal = getBranchId(req);
                  syncPaymentsOnUpdate(id, paymentsList, locId, grandTotal, res, {
                    branchId: branchIdVal,
                    invoiceNo: invoice_no,
                  });
                  return;
                }

                const insertLineSql = `INSERT INTO transaction_sell_lines (
                  product_id, product_name, hsncode, transaction_id, quantity, primary_unit, secondary_unit, unit_price_before_discount, unit_price, unit_price_inc_tax, tax_group_id, discount_type, discount_amount
                ) VALUES ?`;

                const lineValues = items.map((item) => {
                  const productId = item.product_id || null;
                  const productName = item.product_name || "";
                  const hsncode = item.hsncode || null;
                  const qty = Number(item.qty) || 1;
                  const primaryUnit =
                    item.primary_unit ?? item.unit ?? "pcs";
                  const secondaryUnit = item.secondary_unit || null;
                  const rate = Number(item.price) || 0;
                  const mrp = Number(item.base_price) || rate;
                  const lineTotalBeforeDiscount = mrp * qty;
                  const lineTotal =
                    Number(item.total) || Math.max(0, rate * qty);
                  const itemTaxGroupId =
                    item.tax_group_id != null && item.tax_group_id !== ""
                      ? Number(item.tax_group_id)
                      : null;
                  const discType = item.discount_type || "percentage";
                  const discAmt = Number(item.discount || item.discount_amount || 0) || 0;
                  return [
                    productId,
                    productName,
                    hsncode,
                    id,
                    qty,
                    primaryUnit,
                    secondaryUnit,
                    lineTotalBeforeDiscount,
                    rate,
                    lineTotal,
                    itemTaxGroupId,
                    discType,
                    discAmt,
                  ];
                });

                db.query(insertLineSql, [lineValues], (errLine) => {
                  if (errLine) {
                    return res.status(500).json({
                      message: errLine.message || "Failed to save line items",
                    });
                  }
                  const branchIdVal = getBranchId(req);
                  syncPaymentsOnUpdate(id, paymentsList, locId, grandTotal, res, {
                    branchId: branchIdVal,
                    invoiceNo: invoice_no,
                  });
                });
              }
            );
          }
        );
      });
    };

      if (stockProductIds.length === 0) {
        return performUpdate();
      }

      db.query(
        `SELECT p.id, p.product_name, COALESCE(s.quantity, 0) AS qty
         FROM products p
         LEFT JOIN stocks s ON s.product_id = p.id
         WHERE p.id IN (?)`,
        [stockProductIds],
        (errStockCheck, rowsStockCheck) => {
          if (errStockCheck)
            return res
              .status(500)
              .json({
                message:
                  errStockCheck.message || "Failed to validate product stock",
              });

          const dbProductsMap = {};
          (rowsStockCheck || []).forEach((row) => {
            dbProductsMap[row.id] = row;
          });

          const insufficientItems = [];
          for (const pid of stockProductIds) {
            const diff = stockDiffMap[pid] || 0;
            const dbProd = dbProductsMap[pid];
            const availableQty =
              dbProd && dbProd.qty != null ? Number(dbProd.qty) : 0;

            if (diff > 0 && availableQty < diff) {
              const prodName = dbProd?.product_name || "Product";
              insufficientItems.push({ name: prodName, available: availableQty });
            }
          }

          if (insufficientItems.length > 0) {
            if (insufficientItems.length === 1) {
              const item = insufficientItems[0];
              return res.status(400).json({
                message: `Insufficient stock for "${item.name}". Available quantity: ${item.available}`,
              });
            } else {
              const details = insufficientItems
                .map((it) => `"${it.name}" (Available: ${it.available})`)
                .join(", ");
              return res.status(400).json({
                message: `Insufficient stock for: ${details}`,
              });
            }
          }

          let stocksUpdated = 0;
          const totalStocksToUpdate = stockProductIds.length;
          const branchIdVal = getBranchId(req);

          stockProductIds.forEach((pid) => {
            const diff = stockDiffMap[pid] || 0;
            if (diff === 0) {
              stocksUpdated++;
              if (stocksUpdated === totalStocksToUpdate) performUpdate();
              return;
            }

            db.query(
              "UPDATE stocks SET quantity = quantity - ? WHERE product_id = ?",
              [diff, pid],
              (errUpdStock) => {
                if (errUpdStock)
                  console.error(
                    "Stock update error on stocks:",
                    errUpdStock,
                  );
                stocksUpdated++;
                if (stocksUpdated === totalStocksToUpdate) performUpdate();
              },
            );
          });
        },
      );
    },
  );
};

exports.deleteTransaction = (req, res) => {
  const { id } = req.params;

  if (!id)
    return res.status(400).json({ message: "Transaction ID is required" });
  db.query(
    "SELECT amount, bank_account_id FROM transaction_payments WHERE transaction_id = ?",
    [id],
    (errGetPay, oldPayments) => {
      if (!errGetPay && oldPayments && oldPayments.length > 0) {
        oldPayments.forEach((op) => {
          if (op.bank_account_id && Number(op.amount) > 0) {
            db.query(
              "UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?",
              [op.amount, op.bank_account_id],
            );
          }
        });
      }
      db.query(
        "DELETE FROM transaction_payments WHERE transaction_id = ?",
        [id],
        (errPay) => {
          if (errPay) {
            return res
              .status(500)
              .json({ message: errPay.message || "Failed to delete payments" });
          }
          db.query(
            "DELETE FROM transaction_sell_lines WHERE transaction_id = ?",
            [id],
            (errLines) => {
              if (errLines) {
                return res
                  .status(500)
                  .json({
                    message: errLines.message || "Failed to delete line items",
                  });
              }
              db.query(
                "DELETE FROM transactions WHERE id = ?",
                [id],
                (errTx, result) => {
                  if (errTx) {
                    return res
                      .status(500)
                      .json({
                        message:
                          errTx.message || "Failed to delete transaction",
                      });
                  }
                  if (result.affectedRows === 0) {
                    return res
                      .status(404)
                      .json({ message: "Transaction not found" });
                  }
                  res.json({ message: "Transaction deleted successfully" });
                },
              );
            },
          );
        },
      );
    },
  );
};

exports.addTransactionPayment = (req, res) => {
  const { id } = req.params;
  const {
    amount,
    method,
    bank_account_id,
    payment_ref_no,
    payment_for,
    payment_date,
    card_type,
    card_number,
  } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Transaction ID is required" });
  }

  const payAmount = Number(amount);
  if (!payAmount || isNaN(payAmount) || payAmount <= 0) {
    return res.status(400).json({ message: "A valid positive payment amount is required" });
  }

  if (!method) {
    return res.status(400).json({ message: "Payment method is required" });
  }

  const isCredit = method.trim().toLowerCase() === "credit";
  const isElectronic = isCashOrBankMethod(method) && method.trim().toLowerCase() !== "cash" && !isCredit;
  const bankAccId = bank_account_id ? Number(bank_account_id) : null;

  db.query(
    "SELECT id FROM bank_accounts WHERE status = 'Active' ORDER BY id ASC LIMIT 1",
    (errAcc, accRows) => {
      const defaultBankId = (!errAcc && accRows && accRows.length > 0) ? accRows[0].id : null;
      const finalBankAccId = isCredit
        ? null
        : (bankAccId || (isElectronic ? defaultBankId : null));

      if (isElectronic && !finalBankAccId) {
        return res.status(400).json({ message: "Please create and select a bank account for electronic/bank payment" });
      }

      const txSql = `
        SELECT 
          t.id, 
          t.invoice_no, 
          t.final_amount AS total_amount, 
          t.business_id, 
          t.branch_id, 
          t.payment_status,
          COALESCE((
            SELECT SUM(tp.amount) 
            FROM transaction_payments tp 
            WHERE tp.transaction_id = t.id 
              AND LOWER(TRIM(COALESCE(tp.method, ''))) != 'credit'
          ), 0) AS total_paid
        FROM transactions t
        WHERE t.id = ?
        LIMIT 1
      `;

      db.query(txSql, [id], (errTx, rowsTx) => {
        if (errTx) {
          return res.status(500).json({ message: errTx.message || "Failed to fetch transaction" });
        }
        if (!rowsTx || rowsTx.length === 0) {
          return res.status(404).json({ message: "Transaction not found" });
        }

        const tx = rowsTx[0];
        const totalAmount = Number(tx.total_amount) || 0;
        const currentPaid = Number(tx.total_paid) || 0;
        const remainingAmount = Math.max(0, Number((totalAmount - currentPaid).toFixed(2)));

        // Duplicate prevention check: check if identical payment was recorded within last 5 seconds
        db.query(
          `SELECT id, amount, method, TIMESTAMPDIFF(SECOND, updated_at, NOW()) AS diff_sec 
           FROM transaction_payments 
           WHERE transaction_id = ? 
           ORDER BY id DESC LIMIT 1`,
          [id],
          (errDup, dupRows) => {
            if (
              !errDup &&
              dupRows &&
              dupRows.length > 0 &&
              Number(dupRows[0].amount) === payAmount &&
              dupRows[0].method === method &&
              dupRows[0].diff_sec !== null &&
              Math.abs(dupRows[0].diff_sec) <= 5
            ) {
              return res.json({
                success: true,
                message: "Payment recorded successfully",
                payment_id: dupRows[0].id,
                total_amount: totalAmount,
                total_paid: currentPaid,
                remaining_amount: remainingAmount,
                payment_status: tx.payment_status,
              });
            }

            if (remainingAmount <= 0) {
              return res.status(400).json({ message: "This invoice is already fully paid" });
            }

            if (payAmount > remainingAmount + 0.01) {
              return res.status(400).json({
                message: `Payment amount (₹${payAmount.toFixed(2)}) cannot exceed remaining balance (₹${remainingAmount.toFixed(2)})`,
              });
            }

            const now = new Date();
            let formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
            if (payment_date) {
              const timePart = now.toTimeString().split(' ')[0];
              const datePart = String(payment_date).slice(0, 10);
              formattedDate = `${datePart} ${timePart}`;
            }
            const refNo = (payment_ref_no && String(payment_ref_no).trim()) || `TXN-${Date.now()}`;
            const desc = (payment_for && String(payment_for).trim()) || `Sale Balance Payment - Invoice #${tx.invoice_no || tx.id}`;

            const insertSql = `
              INSERT INTO transaction_payments (
                transaction_id, business_id, amount, method, card_type, card_number, payment_for, payment_ref_no, bank_account_id, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
              insertSql,
              [
                id,
                tx.business_id || null,
                payAmount,
                method,
                card_type || null,
                card_number || null,
                desc,
                refNo,
                finalBankAccId,
                formattedDate,
              ],
              (errPay, payResult) => {
                if (errPay) {
                  return res.status(500).json({ message: errPay.message || "Failed to record payment" });
                }

                if (finalBankAccId && payAmount > 0) {
                  db.query(
                    "UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?",
                    [payAmount, finalBankAccId],
                    (bankErr) => {
                      if (bankErr) {
                        console.error("Failed to update bank balance:", bankErr);
                      }
                    }
                  );
                }

        const newTotalPaid = Number((currentPaid + payAmount).toFixed(2));
        const newStatus = newTotalPaid >= totalAmount ? "paid" : "partial";
        const newRemaining = Math.max(0, Number((totalAmount - newTotalPaid).toFixed(2)));

        db.query(
          "UPDATE transactions SET payment_status = ?, updated_at = NOW() WHERE id = ?",
          [newStatus, id],
          (errUpd) => {
            if (errUpd) {
              console.error("Failed to update transaction payment_status:", errUpd);
            }

              return res.json({
                success: true,
                message: "Payment recorded successfully",
                payment_id: payResult.insertId,
                total_amount: totalAmount,
                total_paid: newTotalPaid,
                remaining_amount: newRemaining,
                payment_status: newStatus,
              });
                  }
                );
              }
            );
          }
        );
      });
    }
  );
};

exports.cancelTransaction = (req, res) => {
  const { id } = req.params;
  const {
    refund_advance,
    refund_amount,
    refund_method,
    bank_account_id,
    notes,
  } = req.body || {};

  if (!id) {
    return res.status(400).json({ message: "Transaction ID is required" });
  }

  // 1. Fetch transaction
  db.query(
    "SELECT id, invoice_no, final_amount, status, branch_id, business_id FROM transactions WHERE id = ? LIMIT 1",
    [id],
    (errTx, txRows) => {
      if (errTx) {
        return res.status(500).json({ message: errTx.message || "Failed to fetch transaction" });
      }
      if (!txRows || txRows.length === 0) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const tx = txRows[0];
      if (String(tx.status).toLowerCase() === "cancelled") {
        return res.status(400).json({ message: "This transaction is already cancelled" });
      }

      // 2. Fetch line items to restore inventory stock
      db.query(
        "SELECT product_id, quantity FROM transaction_sell_lines WHERE transaction_id = ?",
        [id],
        (errLines, lineRows) => {
          if (!errLines && lineRows && lineRows.length > 0) {
            lineRows.forEach((item) => {
              const qty = Number(item.quantity) || 0;
              if (item.product_id && qty > 0) {
                db.query(
                  "UPDATE stocks SET quantity = quantity + ? WHERE product_id = ?",
                  [qty, item.product_id],
                  (stockErr) => {
                    if (stockErr) console.error("Failed to restore stock on cancel:", stockErr);
                  }
                );
              }
            });
          }

          // 3. Fetch current payments to calculate advance / total paid
          db.query(
            "SELECT COALESCE(SUM(amount), 0) AS total_paid FROM transaction_payments WHERE transaction_id = ? AND LOWER(TRIM(COALESCE(method, ''))) != 'credit'",
            [id],
            (errPay, payRows) => {
              const currentPaid = Number(payRows?.[0]?.total_paid || 0);
              const shouldRefund = Boolean(refund_advance) && currentPaid > 0;
              const refundAmt = shouldRefund
                ? Math.min(currentPaid, Number(refund_amount) || currentPaid)
                : 0;

              const finalizeCancellation = () => {
                const newPaymentStatus = shouldRefund && refundAmt >= currentPaid ? "Refunded" : "Cancelled";
                db.query(
                  "UPDATE transactions SET status = 'Cancelled', payment_status = ?, updated_at = NOW() WHERE id = ?",
                  [newPaymentStatus, id],
                  (errUpdate) => {
                    if (errUpdate) {
                      return res.status(500).json({ message: errUpdate.message || "Failed to cancel transaction" });
                    }
                    return res.json({
                      success: true,
                      message: shouldRefund
                        ? `Sale cancelled and advance refund of ₹${refundAmt.toFixed(2)} recorded.`
                        : "Sale cancelled successfully and stock restored.",
                      status: "Cancelled",
                      refunded: shouldRefund,
                      refund_amount: refundAmt,
                    });
                  }
                );
              };

              if (shouldRefund && refundAmt > 0) {
                const now = new Date();
                const formattedDate = now.toISOString().slice(0, 19).replace("T", " ");
                const refNo = `REF-${Date.now()}`;
                const refundMethod = String(refund_method || "Cash").trim();
                const refundDesc = `Advance Refund (Cancelled Sale) - Invoice #${tx.invoice_no || tx.id}${notes ? " - " + notes : ""}`;
                const finalBankAccId = refundMethod.toLowerCase() !== "cash" && bank_account_id ? Number(bank_account_id) : null;

                db.query(
                  `INSERT INTO transaction_payments (
                    transaction_id, business_id, amount, method, payment_for, payment_ref_no, bank_account_id, created_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    id,
                    tx.business_id || null,
                    -Math.abs(refundAmt),
                    refundMethod,
                    refundDesc,
                    refNo,
                    finalBankAccId,
                    formattedDate,
                  ],
                  (errRef) => {
                    if (errRef) {
                      console.error("Failed to record refund payment:", errRef);
                    }
                    if (finalBankAccId && refundAmt > 0) {
                      db.query(
                        "UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?",
                        [refundAmt, finalBankAccId],
                        (bankErr) => {
                          if (bankErr) console.error("Failed to decrement bank balance on refund:", bankErr);
                        }
                      );
                    }
                    finalizeCancellation();
                  }
                );
              } else {
                finalizeCancellation();
              }
            }
          );
        }
      );
    }
  );
};
