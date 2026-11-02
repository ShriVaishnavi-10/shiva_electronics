const db = require("../config/db");

const toNumber = (val, fallback = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

const computeSummary = (items, gstType, gstPercent) => {
  const normalizedItems = (items || []).map((item) => {
    const qty = toNumber(item.qty, 0);
    const sqft = toNumber(item.sqft, 0);
    const rate = toNumber(item.rate, 0);
    const lineTotal = qty * sqft * rate;
    return {
      ...item,
      qty,
      sqft,
      rate,
      total: Number(lineTotal.toFixed(2))
    };
  });

  const rawSubtotal = normalizedItems.reduce((sum, item) => sum + toNumber(item.total, 0), 0);
  const subtotal = Number(rawSubtotal.toFixed(2));

  let taxableAmount = subtotal;
  let gstTotal = 0;
  let grandTotal = subtotal;

  if (gstType === "inclusive") {
    gstTotal = subtotal > 0 ? (subtotal * gstPercent) / (100 + gstPercent) : 0;
    taxableAmount = subtotal - gstTotal;
    grandTotal = subtotal;
  } else {
    gstTotal = subtotal * (gstPercent / 100);
    taxableAmount = subtotal;
    grandTotal = subtotal + gstTotal;
  }

  gstTotal = Number(gstTotal.toFixed(2));
  taxableAmount = Number(taxableAmount.toFixed(2));
  grandTotal = Number(grandTotal.toFixed(2));

  const cgstAmount = Number((gstTotal / 2).toFixed(2));
  const sgstAmount = Number((gstTotal / 2).toFixed(2));

  return {
    normalizedItems,
    subtotal: taxableAmount,
    cgstAmount,
    sgstAmount,
    gstTotal,
    grandTotal
  };
};

exports.listDemoQuotations = (req, res) => {
  const { search = "", fromDate = "", toDate = "", isDc, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const where = ["1=1"];
  const params = [];

  if (String(search).trim()) {
    const s = `%${String(search).trim()}%`;
    where.push("(q.quotation_no LIKE ? OR q.customer_name LIKE ? OR q.contact_no LIKE ?)");
    params.push(s, s, s);
  }
  if (String(fromDate).trim()) {
    where.push("q.quotation_date >= ?");
    params.push(String(fromDate).trim());
  }
  if (String(toDate).trim()) {
    where.push("q.quotation_date <= ?");
    params.push(String(toDate).trim());
  }
  if (isDc !== undefined && isDc !== null && String(isDc).trim() !== "") {
    where.push("q.is_dc = ?");
    params.push(Number(isDc) === 1 ? 1 : 0);
  }

  const whereClause = where.join(" AND ");

  const countSql = `SELECT COUNT(*) AS total FROM demo_quotations q WHERE ${whereClause}`;
  const dataSql = `
    SELECT q.*
    FROM demo_quotations q
    WHERE ${whereClause}
    ORDER BY q.id DESC
    LIMIT ? OFFSET ?
  `;

  db.query(countSql, params, (err, countRows) => {
    if (err) return res.status(500).json({ message: err.message || "Failed to load quotations count" });
    const total = countRows[0]?.total || 0;

    db.query(dataSql, [...params, limitNum, offset], (err2, rows) => {
      if (err2) return res.status(500).json({ message: err2.message || "Failed to load quotations" });
      res.json({ data: rows || [], total, page: pageNum, limit: limitNum });
    });
  });
};

exports.getDemoQuotationById = (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM demo_quotations WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message || "Failed to load quotation" });
    if (!rows.length) return res.status(404).json({ message: "Quotation not found" });

    const quotation = rows[0];
    db.query(
      "SELECT * FROM demo_quotation_items WHERE quotation_id = ? ORDER BY id ASC",
      [id],
      (err2, items) => {
        if (err2) return res.status(500).json({ message: err2.message || "Failed to load quotation items" });
        quotation.items = items || [];
        res.json(quotation);
      }
    );
  });
};

exports.createDemoQuotation = (req, res) => {
  const {
    quotation_no,
    quotation_date,
    valid_till_date,
    reference,
    customer_id,
    customer_name,
    contact_no,
    alternate_no,
    address,
    city,
    state,
    country,
    pincode,
    gst_type,
    gst_percent,
    terms_and_conditions,
    notes,
    items
  } = req.body;

  if (!customer_name || !String(customer_name).trim()) {
    return res.status(400).json({ message: "Customer name is required" });
  }
  if (!contact_no || !String(contact_no).trim()) {
    return res.status(400).json({ message: "Contact no is required" });
  }
  if (!quotation_date) {
    return res.status(400).json({ message: "Quotation date is required" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "At least one bill row is required" });
  }

  const safeGstType = gst_type === "inclusive" ? "inclusive" : "exclusive";
  const safeGstPercent = toNumber(gst_percent, 18);

  const summary = computeSummary(items, safeGstType, safeGstPercent);
  const validItems = summary.normalizedItems.filter((item) => String(item.product_name || "").trim());
  if (!validItems.length) {
    return res.status(400).json({ message: "At least one product name is required in bill table" });
  }

  db.beginTransaction((txErr) => {
    if (txErr) return res.status(500).json({ message: txErr.message || "Failed to start transaction" });

    const insertHeaderSql = `
      INSERT INTO demo_quotations (
        quotation_no, quotation_date, valid_till_date, reference,
        customer_id, customer_name, contact_no, alternate_no,
        address, city, state, country, pincode,
        gst_type, gst_percent, subtotal, cgst_amount, sgst_amount, gst_total, grand_total,
        terms_and_conditions, notes, is_dc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `;

    const headerValues = [
      quotation_no || null,
      quotation_date || null,
      valid_till_date || null,
      reference || null,
      customer_id || null,
      String(customer_name).trim(),
      String(contact_no).trim(),
      alternate_no || null,
      address || null,
      city || null,
      state || null,
      country || null,
      pincode || null,
      safeGstType,
      safeGstPercent,
      summary.subtotal,
      summary.cgstAmount,
      summary.sgstAmount,
      summary.gstTotal,
      summary.grandTotal,
      terms_and_conditions || null,
      notes || null
    ];

    db.query(insertHeaderSql, headerValues, (err, result) => {
      if (err) {
        return db.rollback(() =>
          res.status(500).json({ message: err.message || "Failed to create quotation" })
        );
      }

      const quotationId = result.insertId;
      const insertItemSql = `
        INSERT INTO demo_quotation_items
          (quotation_id, product_id, product_name, thickness, width, height, sqft, qty, rate, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      let i = 0;
      const insertNext = () => {
        if (i >= validItems.length) {
          return db.commit((commitErr) => {
            if (commitErr) {
              return db.rollback(() =>
                res.status(500).json({ message: commitErr.message || "Failed to commit quotation" })
              );
            }
            res.json({ message: "Demo quotation saved successfully", id: quotationId, is_dc: 0 });
          });
        }

        const item = validItems[i];
        const itemValues = [
          quotationId,
          item.product_id || null,
          String(item.product_name || "").trim(),
          item.thickness || null,
          item.width != null && item.width !== "" ? toNumber(item.width, 0) : null,
          item.height != null && item.height !== "" ? toNumber(item.height, 0) : null,
          item.sqft,
          item.qty,
          item.rate,
          item.total
        ];

        db.query(insertItemSql, itemValues, (itemErr) => {
          if (itemErr) {
            return db.rollback(() =>
              res.status(500).json({ message: itemErr.message || "Failed to insert quotation item" })
            );
          }
          i += 1;
          insertNext();
        });
      };

      insertNext();
    });
  });
};

exports.updateDemoQuotation = (req, res) => {
  const id = req.params.id;
  const {
    quotation_no,
    quotation_date,
    valid_till_date,
    reference,
    customer_id,
    customer_name,
    contact_no,
    alternate_no,
    address,
    city,
    state,
    country,
    pincode,
    gst_type,
    gst_percent,
    terms_and_conditions,
    notes,
    items
  } = req.body;

  if (!customer_name || !String(customer_name).trim()) {
    return res.status(400).json({ message: "Customer name is required" });
  }
  if (!contact_no || !String(contact_no).trim()) {
    return res.status(400).json({ message: "Contact no is required" });
  }
  if (!quotation_date) {
    return res.status(400).json({ message: "Quotation date is required" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "At least one bill row is required" });
  }

  const safeGstType = gst_type === "inclusive" ? "inclusive" : "exclusive";
  const safeGstPercent = toNumber(gst_percent, 18);
  const summary = computeSummary(items, safeGstType, safeGstPercent);
  const validItems = summary.normalizedItems.filter((item) => String(item.product_name || "").trim());
  if (!validItems.length) {
    return res.status(400).json({ message: "At least one product name is required in bill table" });
  }

  db.beginTransaction((txErr) => {
    if (txErr) return res.status(500).json({ message: txErr.message || "Failed to start transaction" });

    const updateHeaderSql = `
      UPDATE demo_quotations SET
        quotation_no = ?, quotation_date = ?, valid_till_date = ?, reference = ?,
        customer_id = ?, customer_name = ?, contact_no = ?, alternate_no = ?,
        address = ?, city = ?, state = ?, country = ?, pincode = ?,
        gst_type = ?, gst_percent = ?, subtotal = ?, cgst_amount = ?, sgst_amount = ?, gst_total = ?, grand_total = ?,
        terms_and_conditions = ?, notes = ?
      WHERE id = ?
    `;

    const headerValues = [
      quotation_no || null,
      quotation_date || null,
      valid_till_date || null,
      reference || null,
      customer_id || null,
      String(customer_name).trim(),
      String(contact_no).trim(),
      alternate_no || null,
      address || null,
      city || null,
      state || null,
      country || null,
      pincode || null,
      safeGstType,
      safeGstPercent,
      summary.subtotal,
      summary.cgstAmount,
      summary.sgstAmount,
      summary.gstTotal,
      summary.grandTotal,
      terms_and_conditions || null,
      notes || null,
      id
    ];

    db.query(updateHeaderSql, headerValues, (err) => {
      if (err) {
        return db.rollback(() =>
          res.status(500).json({ message: err.message || "Failed to update quotation" })
        );
      }

      db.query("DELETE FROM demo_quotation_items WHERE quotation_id = ?", [id], (delErr) => {
        if (delErr) {
          return db.rollback(() =>
            res.status(500).json({ message: delErr.message || "Failed to update quotation items" })
          );
        }

        const insertItemSql = `
          INSERT INTO demo_quotation_items
            (quotation_id, product_id, product_name, thickness, width, height, sqft, qty, rate, total)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        let i = 0;
        const insertNext = () => {
          if (i >= validItems.length) {
            return db.commit((commitErr) => {
              if (commitErr) {
                return db.rollback(() =>
                  res.status(500).json({ message: commitErr.message || "Failed to commit quotation update" })
                );
              }
              res.json({ message: "Demo quotation updated successfully" });
            });
          }

          const item = validItems[i];
          const itemValues = [
            id,
            item.product_id || null,
            String(item.product_name || "").trim(),
            item.thickness || null,
            item.width != null && item.width !== "" ? toNumber(item.width, 0) : null,
            item.height != null && item.height !== "" ? toNumber(item.height, 0) : null,
            item.sqft,
            item.qty,
            item.rate,
            item.total
          ];

          db.query(insertItemSql, itemValues, (itemErr) => {
            if (itemErr) {
              return db.rollback(() =>
                res.status(500).json({ message: itemErr.message || "Failed to insert updated items" })
              );
            }
            i += 1;
            insertNext();
          });
        };

        insertNext();
      });
    });
  });
};

exports.deleteDemoQuotation = (req, res) => {
  const id = req.params.id;

  db.beginTransaction((txErr) => {
    if (txErr) return res.status(500).json({ message: txErr.message || "Failed to start delete transaction" });

    db.query("DELETE FROM demo_quotation_items WHERE quotation_id = ?", [id], (err) => {
      if (err) {
        return db.rollback(() =>
          res.status(500).json({ message: err.message || "Failed to delete quotation items" })
        );
      }

      db.query("DELETE FROM demo_quotations WHERE id = ?", [id], (err2) => {
        if (err2) {
          return db.rollback(() =>
            res.status(500).json({ message: err2.message || "Failed to delete quotation" })
          );
        }

        db.commit((commitErr) => {
          if (commitErr) {
            return db.rollback(() =>
              res.status(500).json({ message: commitErr.message || "Failed to finalize delete" })
            );
          }
          res.json({ message: "Demo quotation deleted successfully" });
        });
      });
    });
  });
};

exports.convertDemoQuotationToDc = (req, res) => {
  const id = req.params.id;

  db.beginTransaction((txErr) => {
    if (txErr) return res.status(500).json({ message: txErr.message || "Failed to start transaction" });

    db.query("SELECT id, is_dc FROM demo_quotations WHERE id = ?", [id], (err, rows) => {
      if (err) {
        return db.rollback(() =>
          res.status(500).json({ message: err.message || "Failed to check quotation" })
        );
      }
      if (!rows.length) {
        return db.rollback(() =>
          res.status(404).json({ message: "Quotation not found" })
        );
      }
      if (rows[0].is_dc === 1) {
        return db.rollback(() =>
          res.status(400).json({ message: "Quotation already converted to DC" })
        );
      }

      db.query(
        "SELECT product_id, product_name, qty FROM demo_quotation_items WHERE quotation_id = ?",
        [id],
        (itemsErr, items) => {
          if (itemsErr) {
            return db.rollback(() =>
              res.status(500).json({ message: itemsErr.message || "Failed to load quotation items" })
            );
          }

          const stockItems = (items || []).filter((item) => item.product_id && toNumber(item.qty, 0) > 0);

          let idx = 0;
          const validateAndUpdateStock = () => {
            if (idx >= stockItems.length) {
              return db.query(
                "UPDATE demo_quotations SET is_dc = 1 WHERE id = ?",
                [id],
                (markErr) => {
                  if (markErr) {
                    return db.rollback(() =>
                      res.status(500).json({ message: markErr.message || "Failed to mark as DC" })
                    );
                  }

                  db.commit((commitErr) => {
                    if (commitErr) {
                      return db.rollback(() =>
                        res.status(500).json({ message: commitErr.message || "Failed to commit conversion" })
                      );
                    }
                    res.json({ message: "Converted to DC successfully", is_dc: 1 });
                  });
                }
              );
            }

            const item = stockItems[idx];
            const requiredQty = toNumber(item.qty, 0);

            db.query("SELECT quantity AS qty FROM stocks WHERE product_id = ? FOR UPDATE", [item.product_id], (prodErr, prodRows) => {
              if (prodErr) {
                return db.rollback(() =>
                  res.status(500).json({ message: prodErr.message || "Failed to validate stock" })
                );
              }

              const availableQty = prodRows.length ? toNumber(prodRows[0].qty, 0) : 0;
              if (availableQty < requiredQty) {
                return db.rollback(() =>
                  res.status(400).json({
                    message: `Insufficient qty for ${item.product_name || `Product ${item.product_id}`}. Available: ${availableQty}, Required: ${requiredQty}`
                  })
                );
              }

              db.query(
                "UPDATE stocks SET quantity = quantity - ? WHERE product_id = ?",
                [requiredQty, item.product_id],
                (updErr) => {
                  if (updErr) {
                    return db.rollback(() =>
                      res.status(500).json({ message: updErr.message || "Failed to update stock" })
                    );
                  }
                  idx += 1;
                  validateAndUpdateStock();
                }
              );
            });
          };

          validateAndUpdateStock();
        }
      );
    });
  });
};
