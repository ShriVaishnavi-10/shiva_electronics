const db = require("../config/db");
const { getBranchId, branchIdForInsert, branchWhere } = require("../middleware/branchHelper");

exports.getDayStatus = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const bW = branchWhere(branchId);
    const isGstScope = (req.isNonUser || req.query.is_gst === "0") ? 0 : 1;
    
    const [rows] = await db.promise().query(
      `SELECT * FROM daily_cash_logs WHERE date = ? AND is_gst = ? AND ${bW.clause}`,
      [date, isGstScope, ...bW.params]
    );
    
    if (rows.length === 0) {
      const [last] = await db.promise().query(
        `SELECT closing_balance FROM daily_cash_logs WHERE is_gst = ? AND ${bW.clause} AND date < ? ORDER BY date DESC LIMIT 1`,
        [isGstScope, ...bW.params, date]
      );
      return res.json({ status: 'Not Started', lastClosing: last[0]?.closing_balance || 0 });
    }
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.startDay = async (req, res) => {
  const { opening_balance, date: bodyDate } = req.body;
  const branchId = branchIdForInsert(req);
  const date = bodyDate || new Date().toISOString().slice(0, 10);
  const isGstScope = (req.isNonUser || req.body.is_gst === 0) ? 0 : 1;

  try {
    const [exists] = await db.promise().query(
      "SELECT id FROM daily_cash_logs WHERE date = ? AND branch_id = ? AND is_gst = ?",
      [date, branchId, isGstScope]
    );
    if (exists.length > 0) {
      return res.status(400).json({ message: "Registry already started for this date" });
    }

    const opening = Number(opening_balance || 0);

    await db.promise().query(
      "INSERT INTO daily_cash_logs (date, opening_balance, cash_sales, cash_purchases, cash_expenses, closing_balance, actual_cash, difference, status, branch_id, is_gst) VALUES (?, ?, 0, 0, 0, ?, 0, 0, 'Open', ?, ?)",
      [date, opening, opening, branchId, isGstScope]
    );
    res.json({ message: "Day started successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDaySummary = async (req, res) => {
  const branchId = getBranchId(req);
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const bW_t = branchWhere(branchId, 't');
  const bW_p = branchWhere(branchId, 'p');
  const bW = branchWhere(branchId);
  const isGstScope = (req.isNonUser || req.query.is_gst === "0") ? 0 : 1;

  try {
    const [sales] = await db.promise().query(
      `SELECT SUM(tp.amount) as total FROM transaction_payments tp JOIN transactions t ON t.id = tp.transaction_id WHERE LOWER(tp.method) = 'cash' AND t.is_gst = ? AND (DATE(tp.created_at) = ? OR (tp.created_at IS NULL AND DATE(t.sales_date) = ?)) AND ${bW_t.clause}`,
      [isGstScope, date, date, ...bW_t.params]
    );
    const [vpTotal] = await db.promise().query(
      `SELECT SUM(amount) as total FROM vendor_payments WHERE LOWER(payment_method) = 'cash' AND DATE(payment_date) = ? AND ${bW.clause}`,
      [date, ...bW.params]
    );
    const [pTotal] = await db.promise().query(
      `SELECT SUM(pi.total) as total FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id WHERE LOWER(p.payment_type) = 'cash' AND DATE(p.purchase_date) = ? AND ${bW_p.clause} AND p.status = 'Received'`,
      [date, ...bW_p.params]
    );
    const cash_purchases_total = Number(vpTotal[0]?.total || 0) + Number(pTotal[0]?.total || 0);
    const isNonGstOnly = Boolean(req.isNonUser || req.query.is_gst === "0");
    const expWhere = isNonGstOnly ? `AND is_gst = 0` : ``;

    const [expenses] = await db.promise().query(
      `SELECT 
        SUM(amount) as total,
        SUM(CASE WHEN is_gst = 1 THEN amount ELSE 0 END) as total_gst,
        SUM(CASE WHEN is_gst = 0 THEN amount ELSE 0 END) as total_non_gst
       FROM expenses 
       WHERE LOWER(payment_mode) = 'cash' AND DATE(expense_date) = ? ${expWhere} AND ${bW.clause}`,
      [date, ...bW.params]
    );
    res.json({
      cash_sales: Number(sales[0]?.total || 0),
      cash_purchases: cash_purchases_total,
      cash_expenses: Number(expenses[0]?.total || 0),
      cash_expenses_gst: Number(expenses[0]?.total_gst || 0),
      cash_expenses_non_gst: Number(expenses[0]?.total_non_gst || 0),
      service_cash: 0
    });
  } catch (err) {
    console.error("getDaySummary Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.closeDay = async (req, res) => {
  const { cash_sales, cash_purchases, cash_expenses, service_cash, actual_cash, notes, date: bodyDate } = req.body;
  const branchId = getBranchId(req);
  const date = bodyDate || new Date().toISOString().slice(0, 10);
  const bW = branchWhere(branchId);
  const isGstScope = (req.isNonUser || req.body.is_gst === 0) ? 0 : 1;

  try {
    const [current] = await db.promise().query(
      `SELECT opening_balance FROM daily_cash_logs WHERE date = ? AND is_gst = ? AND ${bW.clause}`,
      [date, isGstScope, ...bW.params]
    );

    if (current.length === 0) return res.status(400).json({ message: "Day not started" });

    const opening = Number(current[0].opening_balance);
    const service_cash_in = 0;
    const closing = opening + Number(cash_sales) - Number(cash_purchases) - Number(cash_expenses);
    const diff = Number(actual_cash) - closing;

    await db.promise().query(
      `UPDATE daily_cash_logs SET 
        cash_sales = ?, cash_purchases = ?, cash_expenses = ?, service_cash_in = ?, 
        closing_balance = ?, actual_cash = ?, difference = ?, notes = ?, 
        status = 'Closed', closed_at = NOW() 
      WHERE date = ? AND is_gst = ? AND ${bW.clause}`,
      [cash_sales, cash_purchases, cash_expenses, service_cash_in, closing, actual_cash, diff, notes, date, isGstScope, ...bW.params]
    );

    res.json({ message: "Day closed successfully", closing_balance: closing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const { fromDate, toDate } = req.query;
    const isGstScope = (req.isNonUser || req.query.is_gst === "0") ? 0 : 1;

    let conditions = ["is_gst = ?"];
    let params = [isGstScope];

    if (branchId) {
      conditions.push("branch_id = ?");
      params.push(branchId);
    }

    if (fromDate) {
      conditions.push("date >= ?");
      params.push(fromDate);
    }
    if (toDate) {
      conditions.push("date <= ?");
      params.push(toDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    let sql = `SELECT * FROM daily_cash_logs ${whereClause} ORDER BY date DESC`;
    
    if (!fromDate && !toDate) {
      sql += " LIMIT 30";
    }

    const [rows] = await db.promise().query(sql, params);

    // Compute live values for each date
    for (let row of rows) {
      const dateStr = typeof row.date === 'string' ? row.date.slice(0, 10) : new Date(row.date).toISOString().slice(0, 10);
      const rowBranchId = row.branch_id || branchId;
      const bW_t_row = branchWhere(rowBranchId, 't');
      const bW_p_row = branchWhere(rowBranchId, 'p');
      const bW_row = branchWhere(rowBranchId);

      const [sales] = await db.promise().query(
        `SELECT SUM(tp.amount) as total FROM transaction_payments tp JOIN transactions t ON t.id = tp.transaction_id WHERE LOWER(tp.method) = 'cash' AND t.is_gst = ? AND (DATE(tp.created_at) = ? OR (tp.created_at IS NULL AND DATE(t.sales_date) = ?)) AND ${bW_t_row.clause}`,
        [isGstScope, dateStr, dateStr, ...bW_t_row.params]
      );
      const [vpTotal] = await db.promise().query(
        `SELECT SUM(amount) as total FROM vendor_payments WHERE LOWER(payment_method) = 'cash' AND DATE(payment_date) = ? AND ${bW_row.clause}`,
        [dateStr, ...bW_row.params]
      );
      const [pTotal] = await db.promise().query(
        `SELECT SUM(pi.total) as total FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id WHERE LOWER(p.payment_type) = 'cash' AND DATE(p.purchase_date) = ? AND ${bW_p_row.clause} AND p.status = 'Received'`,
        [dateStr, ...bW_p_row.params]
      );
      const isNonGstOnly = Boolean(req.isNonUser || req.query.is_gst === "0");
      const expWhere = isNonGstOnly ? `AND is_gst = 0` : ``;

      const [expenses] = await db.promise().query(
        `SELECT SUM(amount) as total FROM expenses WHERE LOWER(payment_mode) = 'cash' AND DATE(expense_date) = ? ${expWhere} AND ${bW_row.clause}`,
        [dateStr, ...bW_row.params]
      );

      const liveSales = Number(sales[0]?.total || 0);
      const livePurchases = isGstScope === 0 ? 0 : (Number(vpTotal[0]?.total || 0) + Number(pTotal[0]?.total || 0));
      const liveExpenses = Number(expenses[0]?.total || 0);
      const opening = Number(row.opening_balance || 0);
      const expectedClosing = opening + liveSales - livePurchases - liveExpenses;

      // If day is Open or if stored values are 0, update with calculated live numbers
      if (row.status === 'Open' || (Number(row.cash_sales) === 0 && liveSales > 0)) {
        row.cash_sales = liveSales.toFixed(2);
        row.cash_purchases = livePurchases.toFixed(2);
        row.cash_expenses = liveExpenses.toFixed(2);
        row.closing_balance = expectedClosing.toFixed(2);

        if (Number(row.actual_cash) > 0) {
          row.difference = (Number(row.actual_cash) - expectedClosing).toFixed(2);
        } else {
          row.difference = "0.00";
        }

        // Also sync to DB for Open day so records remain accurate
        if (row.status === 'Open') {
          await db.promise().query(
            "UPDATE daily_cash_logs SET cash_sales = ?, cash_purchases = ?, cash_expenses = ?, closing_balance = ? WHERE id = ?",
            [row.cash_sales, row.cash_purchases, row.cash_expenses, row.closing_balance, row.id]
          );
        }
      } else {
        // If closed, ensure closing_balance is valid
        if (Number(row.closing_balance) === 0 && (liveSales > 0 || liveExpenses > 0)) {
          row.closing_balance = expectedClosing.toFixed(2);
        }
      }
    }

    res.json(rows);
  } catch (err) {
    console.error("getHistory error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.updateDay = async (req, res) => {
  const { opening_balance, actual_cash, notes, status, date } = req.body;
  const branchId = branchIdForInsert(req);
  const bW_t = branchWhere(branchId, 't');
  const bW_p = branchWhere(branchId, 'p');
  const bW = branchWhere(branchId);
  const isGstScope = (req.isNonUser || req.body.is_gst === 0) ? 0 : 1;

  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }

  try {
    const [sales] = await db.promise().query(
      `SELECT SUM(tp.amount) as total FROM transaction_payments tp JOIN transactions t ON t.id = tp.transaction_id WHERE LOWER(tp.method) = 'cash' AND t.is_gst = ? AND (DATE(tp.created_at) = ? OR (tp.created_at IS NULL AND DATE(t.sales_date) = ?)) AND ${bW_t.clause}`,
      [isGstScope, date, date, ...bW_t.params]
    );
    const [vpTotal] = await db.promise().query(
      `SELECT SUM(amount) as total FROM vendor_payments WHERE LOWER(payment_method) = 'cash' AND DATE(payment_date) = ? AND ${bW.clause}`,
      [date, ...bW.params]
    );
    const [pTotal] = await db.promise().query(
      `SELECT SUM(pi.total) as total FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id WHERE LOWER(p.payment_type) = 'cash' AND DATE(p.purchase_date) = ? AND ${bW_p.clause} AND p.status = 'Received'`,
      [date, ...bW_p.params]
    );
    const cash_purchases = isGstScope === 0 ? 0 : (Number(vpTotal[0]?.total || 0) + Number(pTotal[0]?.total || 0));
    const isNonGstOnly = Boolean(req.isNonUser || req.body.is_gst === 0 || req.body.is_gst === "0");
    const expWhere = isNonGstOnly ? `AND is_gst = 0` : ``;

    const [expenses] = await db.promise().query(
      `SELECT SUM(amount) as total FROM expenses WHERE LOWER(payment_mode) = 'cash' AND DATE(expense_date) = ? ${expWhere} AND ${bW.clause}`,
      [date, ...bW.params]
    );
    const cash_sales = Number(sales[0]?.total || 0);
    const cash_expenses = Number(expenses[0]?.total || 0);
    const service_cash_in = 0;

    const opening = Number(opening_balance !== undefined ? opening_balance : 0);
    const closing = opening + cash_sales - cash_purchases - cash_expenses;
    const actual = actual_cash !== undefined && actual_cash !== "" ? Number(actual_cash) : 0;
    const diff = actual - closing;

    const [existing] = await db.promise().query(
      "SELECT id FROM daily_cash_logs WHERE date = ? AND branch_id = ? AND is_gst = ?",
      [date, branchId, isGstScope]
    );

    if (existing.length === 0) {
      await db.promise().query(
        `INSERT INTO daily_cash_logs 
          (date, opening_balance, cash_sales, cash_purchases, cash_expenses, service_cash_in, closing_balance, actual_cash, difference, notes, status, branch_id, is_gst) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [date, opening, cash_sales, cash_purchases, cash_expenses, service_cash_in, closing, actual, diff, notes || "", status || 'Closed', branchId, isGstScope]
      );
    } else {
      const updateStatus = status || 'Closed';
      await db.promise().query(
        `UPDATE daily_cash_logs SET 
          opening_balance = ?, cash_sales = ?, cash_purchases = ?, cash_expenses = ?, service_cash_in = ?, 
          closing_balance = ?, actual_cash = ?, difference = ?, notes = ?, status = ?
        WHERE date = ? AND branch_id = ? AND is_gst = ?`,
        [opening, cash_sales, cash_purchases, cash_expenses, service_cash_in, closing, actual, diff, notes || "", updateStatus, date, branchId, isGstScope]
      );
    }

    res.json({ message: "Registry updated successfully" });
  } catch (err) {
    console.error("updateDay Error:", err);
    res.status(500).json({ message: err.message });
  }
};

