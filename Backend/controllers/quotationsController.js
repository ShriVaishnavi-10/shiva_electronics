const db = require("../config/db");
const { getBranchId, branchWhere, branchIdForInsert } = require("../middleware/branchHelper");
const { syncSequenceAfterSave } = require("./branch.controller");

function parseTransportCharges(v) {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function resolveDateBasedQuotationNo(quotation_date, cb) {
  const qDate = quotation_date || new Date().toISOString().slice(0, 10);
  const d = new Date(qDate);
  if (Number.isNaN(d.getTime())) {
    return cb(new Error("Invalid quotation date"));
  }
  const year = d.getFullYear();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const prefix = `QTN${year}${day}${month}`;
  const likePrefix = `${prefix}%`;
  db.query(
    `SELECT quotation_no FROM quotations WHERE quotation_no LIKE ? ORDER BY id DESC LIMIT 1`,
    [likePrefix],
    (err, rows) => {
      if (err) return cb(err);
      let nextNum = 1;
      if (rows.length && rows[0].quotation_no) {
        const lastNo = rows[0].quotation_no;
        const match = lastNo.match(new RegExp(`^${prefix}(\\d+)$`));
        if (match) {
          const lastNum = parseInt(match[1], 10);
          if (!isNaN(lastNum)) nextNum = lastNum + 1;
        }
      }
      const qno = prefix + String(nextNum).padStart(4, "0");
      cb(null, qno);
    },
  );
}

function resolveBranchQuotationNo(branchId, cb) {
  db.query(
    "SELECT prefix, last_number, start_number FROM branch_sequences WHERE branch_id = ? AND sequence_type = 'quotation'",
    [branchId],
    (err, rows) => {
      if (err) return cb(err);
      if (!rows || !rows.length) return cb(new Error("NO_BRANCH_SEQ"));
      const { prefix, last_number, start_number } = rows[0];
      const next = Math.max((last_number || 0) + 1, start_number || 1);
      const qno = `${prefix}${String(next).padStart(4, "0")}`;
      cb(null, qno);
    },
  );
}
exports.createQuotation = (req, res) => {
  const {
    quotation_no,
    quotation_date,
    valid_till,
    reference,
    customer_id,
    terms,
    notes,
    show_price_totals,
    transport_charges,
    tax_group_id,
    gst_percent,
    gst_type,
    items,
    branch_id: bodyBranchId,
  } = req.body;

  if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Customer and at least one item required" });
  }

  let branchIdForQuotation = branchIdForInsert(req);
  if (bodyBranchId != null && bodyBranchId !== "") {
    const parsed = parseInt(bodyBranchId, 10);
    if (!Number.isNaN(parsed)) branchIdForQuotation = parsed;
  }

  const insertQuotation = `
    INSERT INTO quotations (
      quotation_no,
      quotation_date,
      valid_till_date,
      reference,
      customer_id,
      terms_and_conditions,
      notes,
      show_price_totals,
      transport_charges,
      tax_group_id,
      gst_percent,
      gst_type,
      branch_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const runInsert = (finalQNo) => {
    db.query(
      insertQuotation,
      [
        finalQNo,
        quotation_date || null,
        valid_till || null,
        reference || null,
        customer_id,
        terms || null,
        notes || null,
        show_price_totals ? 1 : 0,
        parseTransportCharges(transport_charges),
        tax_group_id || null,
        gst_percent != null && gst_percent !== "" ? Number(gst_percent) : 0,
        gst_type || "exclusive",
        branchIdForQuotation,
      ],
      (err, result) => {
        if (err) {
          console.error("Error inserting quotation:", err);
          return res.status(500).json({ message: err.message || "Failed to create quotation" });
        }
        const quotationId = result.insertId;
        const insertItem = `
        INSERT INTO quotation_items
          (quotation_id, product_id, product_name, hsncode, qty, rate_1, rate_2, rate_3, rate_4, discount, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
        let done = 0;
        const totalItems = items.length;

        const finish = () => {
          syncSequenceAfterSave(branchIdForQuotation, "quotation", finalQNo, () =>
            res.json({
              message: "Quotation saved successfully",
              id: quotationId,
              quotation_no: finalQNo,
            }),
          );
        };
        items.forEach((item) => {
          const {
            product_id,
            product_name,
            hsncode,
            qty,
            rate_1,
            rate_2,
            rate_3,
            rate_4,
            discount,
            total,
          } = item;

          db.query(
            insertItem,
            [
              quotationId,
              product_id || null,
              product_name || null,
              hsncode || null,
              qty != null && qty !== "" ? Number(qty) : 1,
              rate_1 != null && rate_1 !== "" ? Number(rate_1) : 0,
              rate_2 != null && rate_2 !== "" ? Number(rate_2) : 0,
              rate_3 != null && rate_3 !== "" ? Number(rate_3) : null,
              rate_4 != null && rate_4 !== "" ? Number(rate_4) : null,
              discount != null && discount !== "" ? Number(discount) : null,
              total != null && total !== "" ? Number(total) : 0,
            ],
            (errItem) => {
              if (errItem) {
                console.error("Error inserting quotation item:", errItem);
                return res.status(500).json({ message: errItem.message || "Failed to create quotation item" });
              }
              done++;
              if (done === totalItems) finish();
            },
          );
        });
      },
    );
  };

  if (quotation_no && String(quotation_no).trim()) {
    runInsert(String(quotation_no).trim());
  } else if (branchIdForQuotation) {
    resolveBranchQuotationNo(branchIdForQuotation, (err, qno) => {
      if (!err && qno) return runInsert(qno);
      resolveDateBasedQuotationNo(quotation_date, (e2, q2) => {
        if (e2 || !q2) {
          return res.status(500).json({ message: "Failed to generate quotation number" });
        }
        runInsert(q2);
      });
    });
  } else {
    resolveDateBasedQuotationNo(quotation_date, (err, qno) => {
      if (err || !qno) {
        return res.status(500).json({ message: err.message || "Failed to generate quotation number" });
      }
      runInsert(qno);
    });
  }
};

exports.getNextQuotationNo = (req, res) => {
  const { date } = req.query;
  const qDate = date || new Date().toISOString().slice(0, 10);
  const d = new Date(qDate);
  if (Number.isNaN(d.getTime())) {
    return res.status(400).json({ message: "Invalid date" });
  }

  const year = d.getFullYear();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const prefix = `QTN${year}${day}${month}`;
  const likePrefix = `${prefix}%`;

  db.query(
    `SELECT quotation_no FROM quotations WHERE quotation_no LIKE ? ORDER BY id DESC LIMIT 1`,
    [likePrefix],
    (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ message: err.message || "Failed to get next quotation number" });
      }
      let nextNum = 1;
      if (rows.length && rows[0].quotation_no) {
        const lastNo = rows[0].quotation_no;
        const match = lastNo.match(new RegExp(`^${prefix}(\\d+)$`));
        if (match) {
          const lastNum = parseInt(match[1], 10);
          if (!isNaN(lastNum)) nextNum = lastNum + 1;
        }
      }
      const quotation_no = prefix + String(nextNum).padStart(4, "0");
      res.json({ quotation_no });
    }
  );
};

exports.getQuotations = (req, res) => {
  const {
    fromDate,
    toDate,
    search,
    page = 1,
    limit = 25,
  } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 25));
  const offset = (pageNum - 1) * limitNum;

  const branchId = getBranchId(req);
  const bw = branchWhere(branchId, "q");
  const where = [bw.clause];
  const params = [...bw.params];

  if (fromDate && fromDate.trim()) {
    where.push("q.quotation_date >= ?");
    params.push(fromDate.trim());
  }
  if (toDate && toDate.trim()) {
    where.push("q.quotation_date <= ?");
    params.push(toDate.trim());
  }
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    where.push(
      "(q.quotation_no LIKE ? OR c.customer_name LIKE ? OR c.contact_no LIKE ?)"
    );
    params.push(s, s, s);
  }

  const whereClause = where.join(" AND ");

  const countSql = `
    SELECT COUNT(*) AS total
    FROM quotations q
    LEFT JOIN customers c ON c.id = q.customer_id
    WHERE ${whereClause}
  `;

  const dataSql = `
    SELECT
      q.*,
      c.customer_name,
      c.contact_no,
      c.address,
      c.city
    FROM quotations q
    LEFT JOIN customers c ON c.id = q.customer_id
    WHERE ${whereClause}
    ORDER BY q.id DESC
    LIMIT ? OFFSET ?
  `;

  db.query(countSql, params, (err, countRows) => {
    if (err) return res.status(500).json(err);
    const total = countRows[0]?.total || 0;

    db.query(dataSql, [...params, limitNum, offset], (err2, rows) => {
      if (err2) return res.status(500).json(err2);
      if (!rows || rows.length === 0) {
        return res.json({
          data: [],
          total,
          page: pageNum,
          limit: limitNum,
        });
      }

      const quotationIds = rows.map((r) => r.id);
      const itemsSql = `
        SELECT
          qi.id,
          qi.quotation_id,
          COALESCE(qi.product_name, p.product_name, '—') AS product_name,
          qi.qty,
          qi.rate_1,
          COALESCE(qi.total, COALESCE(qi.rate_1, 0) * COALESCE(qi.qty, 1)) AS line_total
        FROM quotation_items qi
        LEFT JOIN products p ON p.id = qi.product_id
        WHERE qi.quotation_id IN (?)
        ORDER BY qi.id ASC
      `;

      db.query(itemsSql, [quotationIds], (errItems, itemRows) => {
        if (errItems) return res.status(500).json(errItems);

        const itemsByQuotation = {};
        (itemRows || []).forEach((item) => {
          if (!itemsByQuotation[item.quotation_id]) {
            itemsByQuotation[item.quotation_id] = [];
          }
          itemsByQuotation[item.quotation_id].push(item);
        });

        const finalRows = rows.map((r) => {
          const items = itemsByQuotation[r.id] || [];
          return {
            ...r,
            items,
            products_summary: items.map((i) => i.product_name).join(", "),
            grand_total: items.reduce((sum, i) => sum + Number(i.line_total || 0), 0) + Number(r.transport_charges || 0),
          };
        });

        res.json({
          data: finalRows,
          total,
          page: pageNum,
          limit: limitNum,
        });
      });
    });
  });
};

exports.getDashboardOverview = (req, res) => {
  const overview = {
    totalQuotations: 0,
    todayRevenue: 0,
    totalCustomers: 0,
    totalProducts: 0,
    recentQuotations: [],
    monthlyRevenue: new Array(12).fill(0),
    topDcProducts: []
  };

  db.query("SELECT COUNT(*) AS total FROM quotations", (err1, rows1) => {
    if (err1) return res.status(500).json({ message: err1.message || "Failed to load total quotations" });
    overview.totalQuotations = rows1[0]?.total || 0;
    db.query("SHOW COLUMNS FROM quotations LIKE 'quotation_date'", (colErr, colRows) => {
      if (colErr) return res.status(500).json({ message: colErr.message || "Failed to read quotations schema" });
      const hasQuotationDate = Array.isArray(colRows) && colRows.length > 0;
      const quotationDateExpr = hasQuotationDate ? "DATE(q.quotation_date)" : "DATE(q.created_at)";
      const recentDateSelect = hasQuotationDate ? "q.quotation_date" : "DATE(q.created_at) AS quotation_date";
      const todayRevenueSql = `
        SELECT IFNULL(SUM(COALESCE(qi.total, COALESCE(qi.rate_1, 0) * COALESCE(qi.qty, 1))), 0) AS today_revenue
        FROM quotations q
        JOIN quotation_items qi ON qi.quotation_id = q.id
        WHERE ${quotationDateExpr} = CURDATE()
      `;
      db.query(todayRevenueSql, (err2, rows2) => {
        if (err2) return res.status(500).json({ message: err2.message || "Failed to load today's revenue" });
        overview.todayRevenue = rows2[0]?.today_revenue || 0;
        db.query("SELECT COUNT(*) AS total FROM customers", (err3, rows3) => {
          if (err3) return res.status(500).json({ message: err3.message || "Failed to load customers count" });
          overview.totalCustomers = rows3[0]?.total || 0;
          db.query("SELECT COUNT(*) AS total FROM products", (err4, rows4) => {
            if (err4) return res.status(500).json({ message: err4.message || "Failed to load products count" });
            overview.totalProducts = rows4[0]?.total || 0;
            const recentSql = `
              SELECT
                q.id,
                q.quotation_no,
                ${recentDateSelect},
                c.customer_name,
                IFNULL(SUM(COALESCE(qi.total, COALESCE(qi.rate_1, 0) * COALESCE(qi.qty, 1))), 0) AS total
              FROM quotations q
              LEFT JOIN customers c ON c.id = q.customer_id
              LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
              GROUP BY q.id
              ORDER BY q.id DESC
              LIMIT 5
            `;
            db.query(recentSql, (err5, rows5) => {
              if (err5) return res.status(500).json({ message: err5.message || "Failed to load recent quotations" });

              overview.recentQuotations = (rows5 || []).map((row) => ({
                id: row.id,
                quotation_no: row.quotation_no,
                customer_name: row.customer_name,
                total: row.total,
                quotation_date: row.quotation_date
              }));
              const monthlyRevenueSql = `
                SELECT
                  MONTH(quotation_date) AS month_no,
                  IFNULL(SUM(grand_total), 0) AS revenue
                FROM demo_quotations
                WHERE is_dc = 1
                  AND YEAR(quotation_date) = YEAR(CURDATE())
                GROUP BY MONTH(quotation_date)
              `;

              db.query(monthlyRevenueSql, (err6, rows6) => {
                if (err6) {
                  return res.status(500).json({ message: err6.message || "Failed to load monthly revenue" });
                }

                const monthly = new Array(12).fill(0);
                (rows6 || []).forEach((r) => {
                  const monthIndex = Number(r.month_no) - 1;
                  if (monthIndex >= 0 && monthIndex < 12) {
                    monthly[monthIndex] = Number(r.revenue || 0);
                  }
                });
                overview.monthlyRevenue = monthly;
                const topDcProductsSql = `
                  SELECT
                    COALESCE(NULLIF(TRIM(dqi.product_name), ''), p.product_name, CONCAT('Product #', dqi.product_id)) AS product_name,
                    IFNULL(SUM(dqi.qty), 0) AS total_qty
                  FROM demo_quotations dq
                  JOIN demo_quotation_items dqi ON dqi.quotation_id = dq.id
                  LEFT JOIN products p ON p.id = dqi.product_id
                  WHERE dq.is_dc = 1
                  GROUP BY COALESCE(NULLIF(TRIM(dqi.product_name), ''), p.product_name, CONCAT('Product #', dqi.product_id))
                  ORDER BY total_qty DESC
                  LIMIT 6
                `;

                db.query(topDcProductsSql, (err7, rows7) => {
                  if (err7) {
                    return res.status(500).json({ message: err7.message || "Failed to load top product distribution" });
                  }

                  overview.topDcProducts = (rows7 || []).map((row) => ({
                    product_name: row.product_name || "Unknown Product",
                    total_qty: Number(row.total_qty || 0)
                  }));

                  res.json(overview);
                });
              });
            });
          });
        });
      });
    });
  });
};

exports.getQuotationById = (req, res) => {
  const id = req.params.id;
  db.query(
    `SELECT q.*, c.customer_name, c.contact_no, c.alternate_no, c.pincode, c.address, c.city, c.country, c.gst_no
     FROM quotations q
     LEFT JOIN customers c ON c.id = q.customer_id
     WHERE q.id = ?`,
    [id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      if (!rows.length) return res.status(404).json({ message: "Quotation not found" });
      const quotation = rows[0];
      db.query(
        `SELECT 
           qi.*,
           p.product_name AS product_master_name,
           p.primary_unit,
           p.secondary_unit,
           p.price AS product_price,
           p.margin AS product_margin,
           p.selling_price AS product_selling_price
         FROM quotation_items qi
         LEFT JOIN products p ON p.id = qi.product_id
         WHERE qi.quotation_id = ?`,
        [id],
        (err2, items) => {
          if (err2) return res.status(500).json(err2);
          quotation.items = items;
          res.json(quotation);
        }
      );
    }
  );
};

exports.updateQuotation = (req, res) => {
  const id = req.params.id;
  const {
    quotation_no,
    quotation_date,
    valid_till,
    reference,
    customer_id,
    terms,
    notes,
    show_price_totals,
    transport_charges,
    tax_group_id,
    gst_percent,
    gst_type,
    items
  } = req.body;

  if (!customer_id) {
    return res.status(400).json({ message: "Customer required" });
  }

  db.query("SELECT quotation_no FROM quotations WHERE id = ?", [id], (errFetch, existingRows) => {
    if (errFetch) return res.status(500).json(errFetch);

    const existingQNo = existingRows[0]?.quotation_no || `QTN${Date.now()}`;
    const finalQNo = quotation_no && String(quotation_no).trim()
      ? String(quotation_no).trim()
      : existingQNo;

    const updateSql = `
      UPDATE quotations SET
        quotation_no = ?, quotation_date = ?, valid_till_date = ?, reference = ?,
        customer_id = ?, terms_and_conditions = ?, notes = ?, show_price_totals = ?,
        transport_charges = ?, tax_group_id = ?, gst_percent = ?, gst_type = ?
      WHERE id = ?
    `;

    db.query(
      updateSql,
      [
        finalQNo,
        quotation_date || null,
        valid_till || null,
        reference || null,
        customer_id,
        terms || null,
        notes || null,
        show_price_totals ? 1 : 0,
        parseTransportCharges(transport_charges),
        tax_group_id || null,
        gst_percent != null && gst_percent !== "" ? Number(gst_percent) : 0,
        gst_type || "exclusive",
        id
      ],
      (err) => {
        if (err) return res.status(500).json(err);

        db.query("DELETE FROM quotation_items WHERE quotation_id = ?", [id], (errDel) => {
          if (errDel) return res.status(500).json(errDel);

          if (!items || !Array.isArray(items) || items.length === 0) {
            return res.json({ message: "Quotation updated successfully" });
          }

          const insertItem = `
            INSERT INTO quotation_items
              (quotation_id, product_id, product_name, hsncode, qty, rate_1, rate_2, rate_3, rate_4, discount, total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          let done = 0;
          items.forEach((item) => {
            const {
              product_id,
              product_name,
              hsncode,
              qty,
              rate_1,
              rate_2,
              rate_3,
              rate_4,
              discount,
              total
            } = item;

            db.query(
              insertItem,
              [
                id,
                product_id || null,
                product_name || null,
                hsncode || null,
                qty != null && qty !== "" ? Number(qty) : 1,
                rate_1 != null && rate_1 !== "" ? Number(rate_1) : 0,
                rate_2 != null && rate_2 !== "" ? Number(rate_2) : 0,
                rate_3 != null && rate_3 !== "" ? Number(rate_3) : null,
                rate_4 != null && rate_4 !== "" ? Number(rate_4) : null,
                discount != null && discount !== "" ? Number(discount) : null,
                total != null && total !== "" ? Number(total) : 0
              ],
              (errItem) => {
                if (errItem) return res.status(500).json(errItem);
                done++;
                if (done === items.length) {
                  res.json({ message: "Quotation updated successfully" });
                }
              }
            );
          });
        });
      }
    );
  });
};

exports.deleteQuotation = (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM quotation_items WHERE quotation_id = ?", [id], (errDel) => {
    if (errDel) return res.status(500).json(errDel);
    db.query("DELETE FROM quotations WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Quotation deleted successfully" });
    });
  });
};
