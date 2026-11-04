const db = require("../config/db");
const bcrypt = require("bcryptjs");

// -------------------------------------------------------------
// 1. List All Sales Persons
// -------------------------------------------------------------
exports.listSalesPersons = (req, res) => {
  const { status, branch_id } = req.query;
  let sql = `
    SELECT sp.*, b.branch_name,
      COALESCE(
        (SELECT u.username FROM users u 
         LEFT JOIN hrms_employees emp ON emp.user_id = u.id 
         WHERE emp.sales_person_id = sp.id 
            OR (sp.email IS NOT NULL AND sp.email != '' AND u.email = sp.email)
            OR u.username = sp.employee_code 
         LIMIT 1),
        sp.email,
        sp.employee_code
      ) AS login_username
    FROM sales_persons sp
    LEFT JOIN branches b ON sp.branch_id = b.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += " AND sp.status = ?";
    params.push(status);
  }

  const effectiveBranch = branch_id || req.branchId;
  if (effectiveBranch) {
    sql += " AND (sp.branch_id = ? OR sp.branch_id IS NULL)";
    params.push(effectiveBranch);
  }

  sql += " ORDER BY sp.id DESC";

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("listSalesPersons error:", err);
      return res.status(500).json({ success: false, message: "Failed to fetch sales persons" });
    }
    res.json({ success: true, data: rows || [] });
  });
};

// -------------------------------------------------------------
// 2. Get Single Sales Person by ID
// -------------------------------------------------------------
exports.getSalesPersonById = (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT sp.*, b.branch_name,
      COALESCE(
        (SELECT u.username FROM users u 
         LEFT JOIN hrms_employees emp ON emp.user_id = u.id 
         WHERE emp.sales_person_id = sp.id 
            OR (sp.email IS NOT NULL AND sp.email != '' AND u.email = sp.email)
            OR u.username = sp.employee_code 
         LIMIT 1),
        sp.email,
        sp.employee_code
      ) AS login_username
    FROM sales_persons sp
    LEFT JOIN branches b ON sp.branch_id = b.id
    WHERE sp.id = ?
  `;

  db.query(sql, [id], (err, rows) => {
    if (err) {
      console.error("getSalesPersonById error:", err);
      return res.status(500).json({ success: false, message: "Database query failed" });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "Sales person not found" });
    }
    res.json({ success: true, data: rows[0] });
  });
};

// -------------------------------------------------------------
// 3. Create New Sales Person
// -------------------------------------------------------------
exports.createSalesPerson = (req, res) => {
  const {
    name,
    phone,
    email,
    employee_code,
    commission_type = "percentage",
    commission_rate = 0,
    target_amount = 0,
    branch_id,
    status = "Active",
    notes,
    username,
    login_username,
    password,
    login_password,
    create_login = true,
  } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, message: "Sales person name is required" });
  }

  const generateCodeAndInsert = (codeToUse) => {
    const insertSql = `
      INSERT INTO sales_persons 
      (employee_code, name, phone, email, commission_type, commission_rate, target_amount, branch_id, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const effectiveBranch = branch_id ? Number(branch_id) : 2;
    const params = [
      codeToUse,
      String(name).trim(),
      phone ? String(phone).trim() : null,
      email ? String(email).trim() : null,
      commission_type === "fixed" ? "fixed" : "percentage",
      Number(commission_rate) || 0,
      Number(target_amount) || 0,
      effectiveBranch,
      status === "Inactive" ? "Inactive" : "Active",
      notes ? String(notes).trim() : null,
    ];

    db.query(insertSql, params, async (err, result) => {
      if (err) {
        console.error("createSalesPerson error:", err);
        return res.status(500).json({ success: false, message: err.message || "Failed to create sales person" });
      }

      const salesPersonId = result.insertId;
      const effectiveUsername = (login_username || username || email || phone || codeToUse || "").trim();
      const rawPassword = (login_password || password || "123456").trim();

      // Automatically create / link User and HRMS Employee for Personal HRMS Portal access
      if (create_login && effectiveUsername && rawPassword) {
        try {
          const hashedPassword = await bcrypt.hash(rawPassword, 10);

          // 1. Insert or update in users table with role 'Sales Person' (role_id 7)
          db.query(
            `INSERT INTO users (username, password, full_name, email, phone, role_id, branch_id, status)
             VALUES (?, ?, ?, ?, ?, 7, ?, ?)
             ON DUPLICATE KEY UPDATE 
               password = VALUES(password), 
               full_name = VALUES(full_name), 
               email = VALUES(email), 
               phone = VALUES(phone), 
               role_id = 7, 
               status = VALUES(status)`,
            [
              effectiveUsername,
              hashedPassword,
              String(name).trim(),
              email ? String(email).trim() : null,
              phone ? String(phone).trim() : null,
              effectiveBranch,
              status === "Inactive" ? "Inactive" : "Active",
            ],
            (uErr, uRes) => {
              const userId = uRes?.insertId;

              // 2. Insert or update in hrms_employees table
              db.query(
                `SELECT id FROM hrms_employees 
                 WHERE sales_person_id = ? 
                    OR (email = ? AND email IS NOT NULL AND email != '') 
                    OR (phone = ? AND phone IS NOT NULL AND phone != '') 
                 LIMIT 1`,
                [salesPersonId, email || "__none__", phone || "__none__"],
                (empErr, empRows) => {
                  if (empRows && empRows.length > 0) {
                    db.query(
                      `UPDATE hrms_employees 
                       SET name = ?, email = ?, phone = ?, sales_person_id = ?, password = ?, user_id = COALESCE(?, user_id), status = ?
                       WHERE id = ?`,
                      [
                        String(name).trim(),
                        email ? String(email).trim() : null,
                        phone ? String(phone).trim() : null,
                        salesPersonId,
                        hashedPassword,
                        userId || null,
                        status === "Inactive" ? "Inactive" : "Active",
                        empRows[0].id,
                      ]
                    );
                  } else {
                    db.query(
                      `INSERT INTO hrms_employees 
                       (employee_code, name, email, phone, department, designation, branch_id, salary, joining_date, employment_type, status, sales_person_id, user_id, password, pin)
                       VALUES (?, ?, ?, ?, 'Sales & Billing', 'Sales Executive', ?, 0, CURDATE(), 'Full-Time', ?, ?, ?, ?, '123456')`,
                      [
                        codeToUse,
                        String(name).trim(),
                        email ? String(email).trim() : null,
                        phone ? String(phone).trim() : null,
                        effectiveBranch,
                        status === "Inactive" ? "Inactive" : "Active",
                        salesPersonId,
                        userId || null,
                        hashedPassword,
                      ]
                    );
                  }
                }
              );
            }
          );
        } catch (hErr) {
          console.error("Seller password hash error:", hErr);
        }
      }

      res.status(201).json({
        success: true,
        message: "Sales person created successfully with Personal HRMS portal login",
        id: salesPersonId,
        employee_code: codeToUse,
      });
    });
  };

  if (employee_code && String(employee_code).trim()) {
    generateCodeAndInsert(String(employee_code).trim());
  } else {
    // Auto-generate sequential code like SP-001 by checking highest existing code
    db.query("SELECT employee_code FROM sales_persons WHERE employee_code LIKE 'SP-%'", (err, rows) => {
      let maxNum = 0;
      if (rows && rows.length > 0) {
        rows.forEach((r) => {
          const m = String(r.employee_code || "").match(/^SP-(\d+)$/i);
          if (m) {
            const n = parseInt(m[1], 10);
            if (n > maxNum) maxNum = n;
          }
        });
      }
      const nextNum = maxNum + 1;
      const autoCode = `SP-${String(nextNum).padStart(3, "0")}`;
      generateCodeAndInsert(autoCode);
    });
  }
};

// -------------------------------------------------------------
// 4. Update Sales Person
// -------------------------------------------------------------
exports.updateSalesPerson = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    phone,
    email,
    employee_code,
    commission_type = "percentage",
    commission_rate = 0,
    target_amount = 0,
    branch_id,
    status = "Active",
    notes,
    username,
    login_username,
    password,
    login_password,
  } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, message: "Sales person name is required" });
  }

  const effectiveBranch = branch_id ? Number(branch_id) : 2;
  const updateSql = `
    UPDATE sales_persons 
    SET employee_code = ?, name = ?, phone = ?, email = ?,
        commission_type = ?, commission_rate = ?, target_amount = ?,
        branch_id = ?, status = ?, notes = ?
    WHERE id = ?
  `;
  const params = [
    employee_code ? String(employee_code).trim() : null,
    String(name).trim(),
    phone ? String(phone).trim() : null,
    email ? String(email).trim() : null,
    commission_type === "fixed" ? "fixed" : "percentage",
    Number(commission_rate) || 0,
    Number(target_amount) || 0,
    effectiveBranch,
    status === "Inactive" ? "Inactive" : "Active",
    notes ? String(notes).trim() : null,
    id,
  ];

  db.query(updateSql, params, async (err, result) => {
    if (err) {
      console.error("updateSalesPerson error:", err);
      return res.status(500).json({ success: false, message: "Failed to update sales person" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Sales person not found" });
    }

    const rawPass = (login_password || password || "").trim();
    let newHash = null;
    if (rawPass) {
      try {
        newHash = await bcrypt.hash(rawPass, 10);
      } catch (e) {
        console.error("Password hash error on seller update:", e);
      }
    }

    // Synchronize corresponding users and hrms_employees records
    const syncData = {
      name: String(name).trim(),
      email: email ? String(email).trim() : null,
      phone: phone ? String(phone).trim() : null,
      status: status === "Inactive" ? "Inactive" : "Active",
    };
    const effectiveUsername = (login_username || username || "").trim();

    if (newHash) {
      // Update password in hrms_employees
      db.query(
        `UPDATE hrms_employees 
         SET name = ?, email = ?, phone = ?, status = ?, password = ? 
         WHERE sales_person_id = ? OR (email = ? AND email IS NOT NULL AND email != '')`,
        [syncData.name, syncData.email, syncData.phone, syncData.status, newHash, id, syncData.email || "__none__"]
      );

      // Update password and info in users
      db.query(
        `UPDATE users u
         LEFT JOIN hrms_employees e ON e.user_id = u.id
         SET u.password = ?, u.full_name = ?, u.email = ?, u.phone = ?, u.status = ?
             ${effectiveUsername ? ", u.username = ?" : ""}
         WHERE e.sales_person_id = ? OR (u.email = ? AND u.email IS NOT NULL AND u.email != '')`,
        effectiveUsername
          ? [newHash, syncData.name, syncData.email, syncData.phone, syncData.status, effectiveUsername, id, syncData.email || "__none__"]
          : [newHash, syncData.name, syncData.email, syncData.phone, syncData.status, id, syncData.email || "__none__"]
      );
    } else {
      // Update general details without changing password
      db.query(
        `UPDATE hrms_employees 
         SET name = ?, email = ?, phone = ?, status = ? 
         WHERE sales_person_id = ? OR (email = ? AND email IS NOT NULL AND email != '')`,
        [syncData.name, syncData.email, syncData.phone, syncData.status, id, syncData.email || "__none__"]
      );

      if (effectiveUsername) {
        db.query(
          `UPDATE users u
           LEFT JOIN hrms_employees e ON e.user_id = u.id
           SET u.username = ?, u.full_name = ?, u.email = ?, u.phone = ?, u.status = ?
           WHERE e.sales_person_id = ? OR (u.email = ? AND u.email IS NOT NULL AND u.email != '')`,
          [effectiveUsername, syncData.name, syncData.email, syncData.phone, syncData.status, id, syncData.email || "__none__"]
        );
      }
    }

    res.json({ success: true, message: "Sales person updated successfully" });
  });
};

// -------------------------------------------------------------
// 5. Delete Sales Person
// -------------------------------------------------------------
exports.deleteSalesPerson = (req, res) => {
  const { id } = req.params;

  // Check if linked to transactions
  db.query("SELECT COUNT(*) AS count FROM transactions WHERE sales_person_id = ?", [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database check failed" });
    }

    const txCount = rows?.[0]?.count || 0;
    if (txCount > 0) {
      // Soft-delete to preserve invoice audit integrity
      db.query("UPDATE sales_persons SET status = 'Inactive' WHERE id = ?", [id], (uErr) => {
        if (uErr) return res.status(500).json({ success: false, message: "Failed to update status" });
        return res.json({
          success: true,
          message: `Sales person has ${txCount} linked invoice(s). Status set to Inactive to preserve sales history.`,
        });
      });
    } else {
      // Hard delete if no transactions
      db.query("DELETE FROM sales_persons WHERE id = ?", [id], (dErr) => {
        if (dErr) return res.status(500).json({ success: false, message: "Failed to delete sales person" });
        res.json({ success: true, message: "Sales person deleted successfully" });
      });
    }
  });
};

// -------------------------------------------------------------
// 6. Monthly Performance & Commission Report
// -------------------------------------------------------------
exports.getMonthlyReport = (req, res) => {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = req.query.month || currentMonthStr; // e.g. '2026-10'
  const salesPersonId = req.query.sales_person_id ? Number(req.query.sales_person_id) : null;
  const branchId = req.query.branch_id || req.branchId || null;

  // Date range for the month (supports custom from_date / fromDate and to_date / toDate)
  let startDate = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  let endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  const customFrom = req.query.from_date || req.query.fromDate;
  const customTo = req.query.to_date || req.query.toDate;
  if (customFrom && customTo) {
    startDate = customFrom;
    endDate = customTo;
  }

  let spFilter = "";
  const queryParams = [startDate, endDate];
  if (salesPersonId) {
    spFilter += " AND sp.id = ?";
    queryParams.push(salesPersonId);
  }
  if (branchId && !salesPersonId) {
    spFilter += " AND (sp.branch_id = ? OR sp.branch_id IS NULL OR tx_agg.total_invoices > 0)";
    queryParams.push(branchId);
  }

  // 1. Fetch Sales Persons and aggregate performance from transactions
  const summarySql = `
    SELECT 
      sp.id,
      sp.name,
      sp.employee_code,
      sp.phone,
      sp.email,
      sp.commission_type,
      sp.commission_rate,
      sp.target_amount,
      sp.status,
      b.branch_name,
      COALESCE(tx_agg.total_invoices, 0) AS total_invoices,
      COALESCE(tx_agg.total_sales, 0.00) AS total_sales,
      COALESCE(tx_agg.total_taxable, 0.00) AS total_taxable,
      COALESCE(tx_agg.total_commission_calculated, 0.00) AS commission_earned,
      COALESCE(payout_agg.total_paid, 0.00) AS commission_paid
    FROM sales_persons sp
    LEFT JOIN branches b ON sp.branch_id = b.id
    LEFT JOIN (
      SELECT 
        sales_person_id,
        COUNT(id) AS total_invoices,
        SUM(final_amount) AS total_sales,
        SUM(total_before_tax) AS total_taxable,
        SUM(COALESCE(commission_amount, 0.00)) AS total_commission_calculated
      FROM transactions
      WHERE DATE(COALESCE(sales_date, created_at)) >= ? AND DATE(COALESCE(sales_date, created_at)) <= ?
        AND type = 'sell'
        AND status != 'Cancelled'
        AND sales_person_id IS NOT NULL
      GROUP BY sales_person_id
    ) tx_agg ON sp.id = tx_agg.sales_person_id
    LEFT JOIN (
      SELECT 
        sales_person_id,
        SUM(amount_paid) AS total_paid
      FROM sales_person_payouts
      WHERE month = ? OR (payout_date >= ? AND payout_date <= ?)
      GROUP BY sales_person_id
    ) payout_agg ON sp.id = payout_agg.sales_person_id
    WHERE (sp.status = 'Active' OR tx_agg.total_invoices > 0)
    ${spFilter}
    ORDER BY total_sales DESC, sp.name ASC
  `;

  const finalParams = [startDate, endDate, month, startDate, endDate, ...queryParams.slice(2)];

  db.query(summarySql, finalParams, (err, summaryRows) => {
    if (err) {
      console.error("getMonthlyReport summary error:", err);
      return res.status(500).json({ success: false, message: "Failed to generate monthly report" });
    }

    // Compute progress & balance
    const enriched = (summaryRows || []).map((row) => {
      const sales = Number(row.total_sales) || 0;
      const target = Number(row.target_amount) || 0;
      const earned = Number(row.commission_earned) || 0;
      const paid = Number(row.commission_paid) || 0;
      const balance = Math.max(0, earned - paid);
      const targetPct = target > 0 ? Math.min(200, Math.round((sales / target) * 100)) : 0;

      return {
        ...row,
        target_achieved_pct: targetPct,
        commission_balance: balance,
        payout_status: earned === 0 ? "N/A" : (balance <= 0 ? "Paid" : (paid > 0 ? "Partially Paid" : "Pending")),
      };
    });

    // 2. Also fetch detailed invoice lines for the date range
    let detailsSql = `
      SELECT 
        t.id,
        t.invoice_no,
        t.sales_date,
        t.final_amount,
        t.total_before_tax,
        t.payment_status,
        t.commission_amount,
        t.commission_status,
        COALESCE(t.bill_to_customer_name, c.customer_name, 'Walk-in Customer') AS customer_name,
        COALESCE(t.bill_to_phone, c.contact_no) AS customer_phone,
        sp.id AS sales_person_id,
        sp.name AS sales_person_name,
        sp.employee_code,
        sp.commission_type,
        sp.commission_rate
      FROM transactions t
      JOIN sales_persons sp ON t.sales_person_id = sp.id
      LEFT JOIN customers c ON t.contact_id = c.id
      WHERE DATE(COALESCE(t.sales_date, t.created_at)) >= ? AND DATE(COALESCE(t.sales_date, t.created_at)) <= ?
        AND t.type = 'sell'
        AND t.status != 'Cancelled'
    `;
    const detailsParams = [startDate, endDate];
    if (salesPersonId) {
      detailsSql += " AND sp.id = ?";
      detailsParams.push(salesPersonId);
    }
    if (branchId && !salesPersonId) {
      detailsSql += " AND (t.branch_id = ? OR t.branch_id IS NULL)";
      detailsParams.push(branchId);
    }
    detailsSql += " ORDER BY COALESCE(t.sales_date, t.created_at) DESC, t.id DESC";

    db.query(detailsSql, detailsParams, (detErr, detailRows) => {
      if (detErr) {
        console.error("getMonthlyReport details error:", detErr);
        return res.status(500).json({ success: false, message: "Failed to fetch sales transactions" });
      }

      const invoiceRows = detailRows || [];
      const txIds = invoiceRows.map((r) => r.id);

      const completeWithPayouts = (processedInvoices) => {
        // 3. Fetch payout history for this period
        let payoutsSql = `
          SELECT 
            p.*,
            sp.name AS sales_person_name,
            sp.employee_code
          FROM sales_person_payouts p
          JOIN sales_persons sp ON p.sales_person_id = sp.id
          WHERE p.month = ? OR (p.payout_date >= ? AND p.payout_date <= ?)
        `;
        const payoutParams = [month, startDate, endDate];
        if (salesPersonId) {
          payoutsSql += " AND p.sales_person_id = ?";
          payoutParams.push(salesPersonId);
        }
        payoutsSql += " ORDER BY p.payout_date DESC, p.id DESC";

        db.query(payoutsSql, payoutParams, (pErr, payoutRows) => {
          const totalTeamSales = enriched.reduce((acc, r) => acc + Number(r.total_sales || 0), 0);
          const totalTeamCommission = enriched.reduce((acc, r) => acc + Number(r.commission_earned || 0), 0);
          const totalTeamPaid = enriched.reduce((acc, r) => acc + Number(r.commission_paid || 0), 0);
          const totalInvoices = enriched.reduce((acc, r) => acc + Number(r.total_invoices || 0), 0);

          res.json({
            success: true,
            month,
            startDate,
            endDate,
            kpis: {
              totalTeamSales,
              totalTeamCommission,
              totalTeamPaid,
              totalTeamPending: Math.max(0, totalTeamCommission - totalTeamPaid),
              totalInvoices,
              totalSalesPersons: enriched.length,
            },
            salesPersons: enriched,
            transactions: processedInvoices || [],
            payouts: payoutRows || [],
          });
        });
      };

      if (txIds.length > 0) {
        const itemsSql = `
          SELECT 
            tsl.transaction_id,
            COALESCE(tsl.product_name, p.product_name, '') AS product_name,
            tsl.quantity,
            tsl.unit_price,
            COALESCE(tsl.unit_price_inc_tax, tsl.quantity * tsl.unit_price, 0) AS line_total
          FROM transaction_sell_lines tsl
          LEFT JOIN products p ON p.id = tsl.product_id
          WHERE tsl.transaction_id IN (?)
          ORDER BY tsl.id ASC
        `;
        db.query(itemsSql, [txIds], (itemsErr, itemRows) => {
          if (itemsErr) {
            console.error("Error loading line items:", itemsErr);
            return res.status(500).json({ success: false, message: "Failed to fetch transaction items" });
          }
          const itemsByTx = {};
          (itemRows || []).forEach((it) => {
            if (!itemsByTx[it.transaction_id]) itemsByTx[it.transaction_id] = [];
            itemsByTx[it.transaction_id].push(it);
          });

          const enrichedInvoices = invoiceRows.map((inv) => {
            const items = itemsByTx[inv.id] || [];
            const productNames = items.map((i) => i.product_name).filter(Boolean);
            const totalQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
            return {
              ...inv,
              items,
              product_name: productNames.join(", "),
              products_summary: productNames.join(", "),
              total_qty: totalQty || 0,
            };
          });

          completeWithPayouts(enrichedInvoices);
        });
      } else {
        completeWithPayouts([]);
      }
    });
  });
};

// -------------------------------------------------------------
// 7. Record Commission Payout
// -------------------------------------------------------------
exports.recordPayout = (req, res) => {
  const {
    sales_person_id,
    month,
    amount_paid,
    amount,
    payout_date,
    payment_method,
    payment_mode,
    reference_no,
    notes,
  } = req.body;

  const resolvedAmount = amount_paid != null ? amount_paid : amount;
  const resolvedPaymentMethod = payment_method || payment_mode || "Cash";

  if (!sales_person_id || !resolvedAmount || Number(resolvedAmount) <= 0) {
    return res.status(400).json({ success: false, message: "Valid sales person and payout amount are required" });
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const effectiveMonth = month || req.body.payout_month || currentMonth;
  const effectiveDate = payout_date || now.toISOString().slice(0, 10);

  // Fetch sales person current month total sales and commission
  const startDate = `${effectiveMonth}-01`;
  const [y, m] = effectiveMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${effectiveMonth}-${String(lastDay).padStart(2, "0")}`;

  db.query(
    `SELECT 
       SUM(final_amount) AS total_sales,
       SUM(commission_amount) AS total_commission
     FROM transactions 
     WHERE sales_person_id = ? AND sales_date >= ? AND sales_date <= ? AND status != 'Cancelled'`,
    [sales_person_id, startDate, endDate],
    (sumErr, sumRows) => {
      const totalSales = sumRows?.[0]?.total_sales || 0;
      const commissionEarned = sumRows?.[0]?.total_commission || 0;

      const insertSql = `
        INSERT INTO sales_person_payouts
        (sales_person_id, month, total_sales, commission_earned, amount_paid, payout_date, payment_method, reference_no, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        sales_person_id,
        effectiveMonth,
        totalSales,
        commissionEarned,
        Number(resolvedAmount),
        effectiveDate,
        resolvedPaymentMethod,
        reference_no ? String(reference_no).trim() : null,
        notes ? String(notes).trim() : null,
      ];

      db.query(insertSql, params, (err, result) => {
        if (err) {
          console.error("recordPayout error:", err);
          return res.status(500).json({ success: false, message: "Failed to record payout" });
        }

        // Mark transactions as Paid if fully covered
        db.query(
          `UPDATE transactions 
           SET commission_status = 'Paid'
           WHERE sales_person_id = ? AND sales_date >= ? AND sales_date <= ? AND status != 'Cancelled'`,
          [sales_person_id, startDate, endDate]
        );

        res.status(201).json({
          success: true,
          message: "Commission payout recorded successfully",
          id: result.insertId,
        });
      });
    }
  );
};
