const db = require("../config/db");
const { getBranchId, branchWhere, branchIdForInsert } = require("../middleware/branchHelper");

exports.getBankAccounts = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const bw = branchWhere(branchId, "");
    
    let sql = "SELECT * FROM bank_accounts WHERE 1=1";
    const params = [];

    if (req.isNonUser || req.query.is_gst === "0") {
      sql += " AND is_gst = 0";
    } else if (req.query.is_gst === "1") {
      sql += " AND is_gst = 1";
    } else if (req.user && !String(req.user.role_name || "").toLowerCase().includes("super admin")) {
      sql += " AND is_gst = 1";
    }
    
    if (branchId) {
      sql += ` AND ${bw.clause}`;
      params.push(...bw.params);
    }
    
    sql += " ORDER BY account_name ASC";
    
    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createBankAccount = async (req, res) => {
  const { account_name, account_number, bank_name, branch_name, account_type, opening_balance } = req.body;
  if (!account_name) return res.status(400).json({ message: "Account name is required" });
  
  try {
    const branch_id = branchIdForInsert(req);
    const balance = opening_balance || 0;
    const isNonGst = Boolean(req.isNonUser || req.body.is_gst === 0 || req.body.is_gst === false || req.body.is_gst === "0");
    const isGstVal = isNonGst ? 0 : 1;
    
    const [result] = await db.promise().query(
      "INSERT INTO bank_accounts (account_name, account_number, bank_name, branch_name, account_type, opening_balance, current_balance, branch_id, is_gst) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [account_name, account_number || null, bank_name || null, branch_name || null, account_type || 'Current', balance, balance, branch_id, isGstVal]
    );
    res.json({ message: "Bank account created", id: result.insertId, is_gst: isGstVal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateBankAccount = async (req, res) => {
  const { id } = req.params;
  const { account_name, account_number, bank_name, branch_name, account_type, status } = req.body;
  
  try {
    await db.promise().query(
      "UPDATE bank_accounts SET account_name = ?, account_number = ?, bank_name = ?, branch_name = ?, account_type = ?, status = ? WHERE id = ?",
      [account_name, account_number, bank_name, branch_name, account_type, status, id]
    );
    res.json({ message: "Bank account updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteBankAccount = async (req, res) => {
  const { id } = req.params;
  try {
    const [payments] = await db.promise().query("SELECT id FROM vendor_payments WHERE bank_account_id = ? LIMIT 1", [id]);
    if (payments.length > 0) {
      return res.status(400).json({ message: "Cannot delete account with existing transactions" });
    }
    const [salePays] = await db.promise().query("SELECT id FROM transaction_payments WHERE bank_account_id = ? LIMIT 1", [id]);
    if (salePays.length > 0) {
      return res.status(400).json({ message: "Cannot delete account with existing sale payments" });
    }
    const [expPays] = await db.promise().query("SELECT id FROM expenses WHERE payment_account_id = ? LIMIT 1", [id]);
    if (expPays.length > 0) {
      return res.status(400).json({ message: "Cannot delete account with existing expenses" });
    }
    
    await db.promise().query("DELETE FROM bank_accounts WHERE id = ?", [id]);
    res.json({ message: "Bank account deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBankAccountTransactions = async (req, res) => {
  const { id } = req.params;
  const { fromDate, toDate, type, party, search } = req.query || {};

  try {
    const [accRows] = await db.promise().query(
      "SELECT id, account_name, account_number, bank_name, branch_name, account_type, opening_balance, current_balance, status, branch_id FROM bank_accounts WHERE id = ?",
      [id]
    );
    if (accRows.length === 0) {
      return res.status(404).json({ message: "Bank account not found" });
    }
    const account = accRows[0];

    // Fetch company settings for PDF header
    let company = null;
    try {
      const [compRows] = await db.promise().query("SELECT * FROM company_settings LIMIT 1");
      company = compRows[0] || null;
    } catch {}

    // 1. Calculate Prior Balance before fromDate (Opening Balance Progression)
    let openingBalanceAtStart = Number(account.opening_balance) || 0;

    if (fromDate) {
      // Prior Sale & Advance Payments (< fromDate)
      const [priorSales] = await db.promise().query(
        `SELECT SUM(IF(amount >= 0, amount, 0)) AS credits, SUM(IF(amount < 0, ABS(amount), 0)) AS debits
         FROM transaction_payments tp
         JOIN transactions t ON t.id = tp.transaction_id
         WHERE tp.bank_account_id = ? AND DATE(COALESCE(tp.created_at, t.sales_date)) < ?`,
        [id, fromDate]
      );
      const priorSaleCredits = Number(priorSales[0]?.credits || 0);
      const priorSaleDebits = Number(priorSales[0]?.debits || 0);

      // Prior Expenses (< fromDate)
      const [priorExpenses] = await db.promise().query(
        `SELECT 
          SUM(IF(is_refund = 1, amount, 0)) AS credits,
          SUM(IF(is_refund = 0 OR is_refund IS NULL, amount, 0)) AS debits
         FROM expenses
         WHERE payment_account_id = ? AND expense_date < ?`,
        [id, fromDate]
      );
      const priorExpCredits = Number(priorExpenses[0]?.credits || 0);
      const priorExpDebits = Number(priorExpenses[0]?.debits || 0);

      // Prior Vendor Payments (< fromDate)
      const [priorVendorPays] = await db.promise().query(
        `SELECT SUM(amount) AS debits FROM vendor_payments WHERE bank_account_id = ? AND payment_date < ?`,
        [id, fromDate]
      );
      const priorVpDebits = Number(priorVendorPays[0]?.debits || 0);

      // Prior Transfers (< fromDate)
      let priorTransferCredits = 0;
      let priorTransferDebits = 0;
      try {
        const [priorTransfersIn] = await db.promise().query(
          `SELECT SUM(amount) AS credits FROM bank_transfers WHERE to_account_id = ? AND transfer_date < ?`,
          [id, fromDate]
        );
        priorTransferCredits = Number(priorTransfersIn[0]?.credits || 0);

        const [priorTransfersOut] = await db.promise().query(
          `SELECT SUM(amount) AS debits FROM bank_transfers WHERE from_account_id = ? AND transfer_date < ?`,
          [id, fromDate]
        );
        priorTransferDebits = Number(priorTransfersOut[0]?.debits || 0);
      } catch {}

      // Prior Purchase Returns (< fromDate)
      let priorPrCredits = 0;
      try {
        const [priorPR] = await db.promise().query(
          `SELECT SUM(grand_total) AS credits FROM purchase_returns WHERE bank_account_id = ? AND refund_type = 'Bank / Cash Refund' AND return_date < ?`,
          [id, fromDate]
        );
        priorPrCredits = Number(priorPR[0]?.credits || 0);
      } catch {}

      const totalPriorCredits = priorSaleCredits + priorExpCredits + priorTransferCredits + priorPrCredits;
      const totalPriorDebits = priorSaleDebits + priorExpDebits + priorVpDebits + priorTransferDebits;

      openingBalanceAtStart += (totalPriorCredits - totalPriorDebits);
    }

    const allTransactions = [];

    // 2. Sales & Advance Payments (Inflow / Credit, or Debit if refund)
    const salesPaySql = `
      SELECT 
        tp.id AS payment_id,
        t.id AS transaction_id,
        DATE(COALESCE(tp.created_at, t.sales_date)) AS date,
        tp.created_at AS datetime,
        CONCAT('TXN-SAL-', tp.id) AS transaction_no,
        t.invoice_no,
        c.customer_name AS party_name,
        c.contact_no AS party_contact,
        tp.method AS payment_mode,
        COALESCE(tp.payment_ref_no, t.invoice_no) AS reference_no,
        CASE 
          WHEN tp.amount < 0 THEN 'Sale Refund'
          WHEN LOWER(COALESCE(tp.payment_for, '')) LIKE '%advance%' THEN 'Sale Advance'
          WHEN LOWER(COALESCE(tp.payment_for, '')) LIKE '%balance%' OR (
            SELECT COUNT(*) FROM transaction_payments tp_prev 
            WHERE tp_prev.transaction_id = tp.transaction_id AND tp_prev.id < tp.id
          ) > 0 THEN 'Sale Balance Payment'
          ELSE 'Sale Payment'
        END AS transaction_type,
        CASE 
          WHEN tp.amount < 0 THEN CONCAT('Sale Refund - Invoice #', COALESCE(t.invoice_no, t.id))
          WHEN LOWER(COALESCE(tp.payment_for, '')) LIKE '%advance%' THEN CONCAT('Sale Advance - Invoice #', COALESCE(t.invoice_no, t.id))
          WHEN LOWER(COALESCE(tp.payment_for, '')) LIKE '%balance%' OR (
            SELECT COUNT(*) FROM transaction_payments tp_prev 
            WHERE tp_prev.transaction_id = tp.transaction_id AND tp_prev.id < tp.id
          ) > 0 THEN CONCAT('Sale Balance Payment - Invoice #', COALESCE(t.invoice_no, t.id))
          ELSE CONCAT('Sale Payment - Invoice #', COALESCE(t.invoice_no, t.id))
        END AS description,
        IF(tp.amount < 0, ABS(tp.amount), 0) AS debit,
        IF(tp.amount >= 0, tp.amount, 0) AS credit,
        NULL AS created_by_name,
        b.branch_name AS branch_name,
        CONCAT(
          COALESCE(c.customer_name, 'Customer'),
          IF(tp.method IS NOT NULL, CONCAT(' | Mode: ', tp.method), ''),
          IF(tp.payment_ref_no IS NOT NULL AND tp.payment_ref_no != '', CONCAT(' | Ref: ', tp.payment_ref_no), ''),
          IF(tp.card_type IS NOT NULL AND tp.card_type != '', CONCAT(' | Card: ', tp.card_type), '')
        ) AS notes,
        'sale' AS source_type,
        t.id AS source_id
      FROM transaction_payments tp
      JOIN transactions t ON t.id = tp.transaction_id
      LEFT JOIN customers c ON c.id = t.contact_id
      LEFT JOIN branches b ON b.id = t.branch_id
      WHERE tp.bank_account_id = ?
      ${fromDate ? "AND DATE(COALESCE(tp.created_at, t.sales_date)) >= ?" : ""}
      ${toDate ? "AND DATE(COALESCE(tp.created_at, t.sales_date)) <= ?" : ""}
    `;
    const salesPayParams = [id, ...(fromDate ? [fromDate] : []), ...(toDate ? [toDate] : [])];
    const [salesPays] = await db.promise().query(salesPaySql, salesPayParams);
    allTransactions.push(...salesPays);

    // 3. Expenses (Outflow / Debit, or Credit if refund)
    try {
      const expenseSql = `
        SELECT 
          e.id AS expense_id,
          e.id AS source_id,
          e.expense_date AS date,
          e.created_at AS datetime,
          CONCAT('TXN-EXP-', e.id) AS transaction_no,
          e.reference_no AS invoice_no,
          COALESCE(ec.name, 'Expense') AS party_name,
          NULL AS party_contact,
          COALESCE(e.payment_mode, 'Bank') AS payment_mode,
          e.reference_no AS reference_no,
          IF(e.is_refund = 1, 'Expense Refund', 'Expense') AS transaction_type,
          CONCAT('Expense: ', COALESCE(ec.name, 'General'), IF(sc.name IS NOT NULL, CONCAT(' (', sc.name, ')'), ''), IF(e.notes IS NOT NULL AND e.notes != '', CONCAT(' - ', e.notes), '')) AS description,
          IF(e.is_refund = 1, 0, e.amount) AS debit,
          IF(e.is_refund = 1, e.amount, 0) AS credit,
          u.full_name AS created_by_name,
          bl.name AS branch_name,
          e.notes AS notes,
          'expense' AS source_type
        FROM expenses e
        JOIN expense_categories ec ON ec.id = e.category_id
        LEFT JOIN expense_categories sc ON sc.id = e.sub_category_id
        LEFT JOIN users u ON u.id = e.created_by
        LEFT JOIN business_location bl ON bl.id = e.branch_id
        WHERE e.payment_account_id = ?
        ${fromDate ? "AND e.expense_date >= ?" : ""}
        ${toDate ? "AND e.expense_date <= ?" : ""}
      `;
      const expenseParams = [id, ...(fromDate ? [fromDate] : []), ...(toDate ? [toDate] : [])];
      const [expenses] = await db.promise().query(expenseSql, expenseParams);
      allTransactions.push(...expenses);
    } catch (expErr) {
      console.error("Expense query error:", expErr.message);
    }

    // 4. Vendor Payments (Outflow / Debit)
    try {
      const vendorPaySql = `
        SELECT 
          vp.id AS vendor_payment_id,
          vp.id AS source_id,
          vp.payment_date AS date,
          vp.created_at AS datetime,
          CONCAT('TXN-VND-', vp.id) AS transaction_no,
          vp.reference_no AS invoice_no,
          COALESCE(v.company_name, v.vendor_name, 'Vendor') AS party_name,
          NULL AS party_contact,
          COALESCE(vp.payment_method, 'Bank') AS payment_mode,
          vp.reference_no AS reference_no,
          'Vendor Payment' AS transaction_type,
          CONCAT('Vendor Payment to ', COALESCE(v.company_name, v.vendor_name, 'Vendor'), IF(vp.notes IS NOT NULL AND vp.notes != '', CONCAT(' - ', vp.notes), '')) AS description,
          vp.amount AS debit,
          0 AS credit,
          NULL AS created_by_name,
          b.branch_name AS branch_name,
          vp.notes AS notes,
          'vendor_payment' AS source_type
        FROM vendor_payments vp
        LEFT JOIN vendors v ON v.id = vp.vendor_id
        LEFT JOIN branches b ON b.id = vp.branch_id
        WHERE vp.bank_account_id = ?
        ${fromDate ? "AND vp.payment_date >= ?" : ""}
        ${toDate ? "AND vp.payment_date <= ?" : ""}
      `;
      const vendorPayParams = [id, ...(fromDate ? [fromDate] : []), ...(toDate ? [toDate] : [])];
      const [vendorPays] = await db.promise().query(vendorPaySql, vendorPayParams);
      allTransactions.push(...vendorPays);
    } catch (vpErr) {
      console.error("Vendor payment query error:", vpErr.message);
    }

    // 5. Bank Transfers (Inter-Account)
    try {
      const transferSql = `
        SELECT 
          bt.id AS transfer_id,
          bt.id AS source_id,
          bt.transfer_date AS date,
          bt.created_at AS datetime,
          COALESCE(bt.transfer_no, CONCAT('TXN-TRF-', bt.id)) AS transaction_no,
          bt.transfer_no AS invoice_no,
          IF(bt.from_account_id = ?, CONCAT('To: ', ta.account_name), CONCAT('From: ', fa.account_name)) AS party_name,
          NULL AS party_contact,
          'Bank Transfer' AS payment_mode,
          bt.reference_no AS reference_no,
          IF(bt.from_account_id = ?, 'Transfer Out', 'Transfer In') AS transaction_type,
          IF(bt.from_account_id = ?,
             CONCAT('Bank Transfer to ', ta.account_name, IF(ta.bank_name IS NOT NULL, CONCAT(' (', ta.bank_name, ')'), '')),
             CONCAT('Bank Transfer from ', fa.account_name, IF(fa.bank_name IS NOT NULL, CONCAT(' (', fa.bank_name, ')'), ''))
          ) AS description,
          IF(bt.from_account_id = ?, bt.amount, 0) AS debit,
          IF(bt.to_account_id = ?, bt.amount, 0) AS credit,
          u.full_name AS created_by_name,
          b.branch_name AS branch_name,
          bt.notes AS notes,
          'bank_transfer' AS source_type
        FROM bank_transfers bt
        LEFT JOIN bank_accounts fa ON fa.id = bt.from_account_id
        LEFT JOIN bank_accounts ta ON ta.id = bt.to_account_id
        LEFT JOIN users u ON u.id = bt.created_by
        LEFT JOIN branches b ON b.id = bt.branch_id
        WHERE (bt.from_account_id = ? OR bt.to_account_id = ?)
        ${fromDate ? "AND bt.transfer_date >= ?" : ""}
        ${toDate ? "AND bt.transfer_date <= ?" : ""}
      `;
      const transferParams = [id, id, id, id, id, id, id, ...(fromDate ? [fromDate] : []), ...(toDate ? [toDate] : [])];
      const [transfers] = await db.promise().query(transferSql, transferParams);
      allTransactions.push(...transfers);
    } catch (trfErr) {
      console.error("Bank transfer query error:", trfErr.message);
    }

    // 6. Purchase Returns (Inflow / Credit)
    try {
      const returnSql = `
        SELECT 
          pr.id AS return_id,
          pr.id AS source_id,
          pr.return_date AS date,
          pr.created_at AS datetime,
          pr.return_no AS transaction_no,
          COALESCE(pr.purchase_no, pr.return_no) AS invoice_no,
          COALESCE(v.company_name, v.vendor_name, 'Vendor') AS party_name,
          v.mobile AS party_contact,
          COALESCE(pr.payment_mode, 'Bank Transfer') AS payment_mode,
          pr.return_no AS reference_no,
          'Purchase Return' AS transaction_type,
          CONCAT('Purchase Return Refund from ', COALESCE(v.company_name, v.vendor_name, 'Vendor'), IF(pr.purchase_no IS NOT NULL, CONCAT(' (Bill #', pr.purchase_no, ')'), ''), IF(pr.notes IS NOT NULL AND pr.notes != '', CONCAT(' - ', pr.notes), '')) AS description,
          0 AS debit,
          pr.grand_total AS credit,
          NULL AS created_by_name,
          b.branch_name AS branch_name,
          pr.notes AS notes,
          'purchase_return' AS source_type
        FROM purchase_returns pr
        LEFT JOIN vendors v ON v.id = pr.vendor_id
        LEFT JOIN branches b ON b.id = pr.branch_id
        WHERE pr.bank_account_id = ? AND pr.refund_type = 'Bank / Cash Refund'
        ${fromDate ? "AND pr.return_date >= ?" : ""}
        ${toDate ? "AND pr.return_date <= ?" : ""}
      `;
      const returnParams = [id, ...(fromDate ? [fromDate] : []), ...(toDate ? [toDate] : [])];
      const [returns] = await db.promise().query(returnSql, returnParams);
      allTransactions.push(...returns);
    } catch (retErr) {
      console.error("Purchase return transaction query error:", retErr.message);
    }

    // Sort chronologically
    allTransactions.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const timeA = a.datetime ? new Date(a.datetime).getTime() : 0;
      const timeB = b.datetime ? new Date(b.datetime).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return (Number(a.payment_id || a.source_id) || 0) - (Number(b.payment_id || b.source_id) || 0);
    });

    // Calculate Running Balance
    let runningBalance = openingBalanceAtStart;
    const ledger = allTransactions.map((t) => {
      const debit = Number(Number(t.debit || 0).toFixed(2));
      const credit = Number(Number(t.credit || 0).toFixed(2));
      runningBalance += (credit - debit);
      return {
        ...t,
        debit,
        credit,
        running_balance: Number(runningBalance.toFixed(2)),
      };
    });

    const totalCredits = Number(ledger.reduce((sum, r) => sum + r.credit, 0).toFixed(2));
    const totalDebits = Number(ledger.reduce((sum, r) => sum + r.debit, 0).toFixed(2));
    const closingBalance = Number((openingBalanceAtStart + totalCredits - totalDebits).toFixed(2));

    res.json({
      account,
      company,
      statement_period: {
        from_date: fromDate || null,
        to_date: toDate || null,
      },
      opening_balance: Number(openingBalanceAtStart.toFixed(2)),
      total_credits: totalCredits,
      total_debits: totalDebits,
      closing_balance: closingBalance,
      current_balance: Number(account.current_balance) || 0,
      transaction_count: ledger.length,
      transactions: ledger,
    });
  } catch (err) {
    console.error("Bank statement error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.createBankTransfer = async (req, res) => {
  const { from_account_id, to_account_id, amount, transfer_date, reference_no, notes } = req.body;

  if (!from_account_id || !to_account_id) {
    return res.status(400).json({ message: "From Account and To Account are required" });
  }
  if (String(from_account_id) === String(to_account_id)) {
    return res.status(400).json({ message: "Source and Destination accounts cannot be the same" });
  }
  const transferAmt = Number(amount);
  if (!transferAmt || transferAmt <= 0) {
    return res.status(400).json({ message: "Transfer amount must be greater than zero" });
  }
  if (!transfer_date) {
    return res.status(400).json({ message: "Transfer date is required" });
  }

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    // Check from_account balance
    const [fromRows] = await conn.query("SELECT id, account_name, current_balance FROM bank_accounts WHERE id = ? FOR UPDATE", [from_account_id]);
    if (fromRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Source bank account not found" });
    }
    const fromBalance = Number(fromRows[0].current_balance) || 0;
    if (transferAmt > fromBalance) {
      await conn.rollback();
      return res.status(400).json({
        message: `Insufficient balance in ${fromRows[0].account_name} (Available: ₹${fromBalance.toFixed(2)}, Requested: ₹${transferAmt.toFixed(2)})`
      });
    }

    const [toRows] = await conn.query("SELECT id, account_name FROM bank_accounts WHERE id = ? FOR UPDATE", [to_account_id]);
    if (toRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Destination bank account not found" });
    }

    // Generate transfer_no
    const [lastRow] = await conn.query("SELECT id FROM bank_transfers ORDER BY id DESC LIMIT 1");
    const nextId = (lastRow[0]?.id || 0) + 1;
    const transferNo = `TRF-${new Date().getFullYear()}-${String(nextId).padStart(4, '0')}`;

    const branchId = branchIdForInsert(req);
    const createdBy = req.user?.id || null;

    // Deduct from source account
    await conn.query("UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?", [transferAmt, from_account_id]);

    // Credit to destination account
    await conn.query("UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?", [transferAmt, to_account_id]);

    // Insert transfer record
    const [insertResult] = await conn.query(
      `INSERT INTO bank_transfers (transfer_no, from_account_id, to_account_id, amount, transfer_date, reference_no, notes, created_by, branch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [transferNo, from_account_id, to_account_id, transferAmt, transfer_date, reference_no || null, notes || null, createdBy, branchId]
    );

    await conn.commit();
    res.json({
      success: true,
      message: "Transfer completed successfully",
      transfer_id: insertResult.insertId,
      transfer_no: transferNo,
    });
  } catch (err) {
    await conn.rollback();
    console.error("Create bank transfer error:", err);
    res.status(500).json({ message: err.message || "Failed to process bank transfer" });
  } finally {
    conn.release();
  }
};

exports.deleteBankTransfer = async (req, res) => {
  const { id } = req.params;
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query("SELECT * FROM bank_transfers WHERE id = ? FOR UPDATE", [id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Bank transfer record not found" });
    }
    const trf = rows[0];
    const amount = Number(trf.amount) || 0;

    // Revert balances
    await conn.query("UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?", [amount, trf.from_account_id]);
    await conn.query("UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?", [amount, trf.to_account_id]);

    await conn.query("DELETE FROM bank_transfers WHERE id = ?", [id]);

    await conn.commit();
    res.json({ success: true, message: "Bank transfer deleted and balances restored" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};
