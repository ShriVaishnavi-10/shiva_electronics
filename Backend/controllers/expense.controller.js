const db = require("../config/db");
const { getBranchId, branchWhere, branchIdForInsert } = require("../middleware/branchHelper");

exports.getCategories = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const bw = branchWhere(branchId, "");
    
    const [rows] = await db.promise().query(
      `SELECT * FROM expense_categories WHERE ${bw.clause} ORDER BY id DESC`,
      bw.params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCategory = async (req, res) => {
  const { name, code, parent_id } = req.body;
  try {
    const branch_id = branchIdForInsert(req);
    const [result] = await db.promise().query(
      "INSERT INTO expense_categories (name, code, parent_id, branch_id) VALUES (?, ?, ?, ?)",
      [name, code, parent_id || null, branch_id]
    );
    res.json({ message: "Category created", id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, code, parent_id } = req.body;
  try {
    await db.promise().query(
      "UPDATE expense_categories SET name = ?, code = ?, parent_id = ? WHERE id = ?",
      [name, code, parent_id || null, id]
    );
    res.json({ message: "Category updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const [expenses] = await db.promise().query("SELECT id FROM expenses WHERE category_id = ? LIMIT 1", [id]);
    if (expenses.length > 0) {
      return res.status(400).json({ message: "Category is in use and cannot be deleted" });
    }
    await db.promise().query("DELETE FROM expense_categories WHERE id = ?", [id]);
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const bw = branchWhere(branchId, "e");
    
    let gstClause = "";
    const queryParams = [...bw.params];

    if (req.isNonUser || req.query.is_gst === "0" || req.query.is_gst === 0) {
      gstClause = " AND e.is_gst = 0";
    } else {
      gstClause = " AND e.is_gst = 1";
    }

    const query = `
      SELECT 
        e.*, 
        c.name as category_name, 
        sc.name as sub_category_name,
        COALESCE(bl.name, b.branch_name, (SELECT name FROM business_location ORDER BY id ASC LIMIT 1), 'SHIVA ELECTRONICS') as company_name,
        COALESCE(bl.name, b.branch_name, (SELECT name FROM business_location ORDER BY id ASC LIMIT 1), 'Head Office / Main Branch') as location_name,
        COALESCE(bl.landmark, b.address, (SELECT landmark FROM business_location ORDER BY id ASC LIMIT 1), '') as company_address,
        COALESCE(bl.city, b.city, (SELECT city FROM business_location ORDER BY id ASC LIMIT 1), '') as company_city,
        COALESCE(bl.state, b.state, (SELECT state FROM business_location ORDER BY id ASC LIMIT 1), '') as company_state,
        COALESCE(bl.zip_code, b.pincode, (SELECT zip_code FROM business_location ORDER BY id ASC LIMIT 1), '') as company_zip,
        COALESCE(bl.mobile, b.phone, (SELECT mobile FROM business_location ORDER BY id ASC LIMIT 1), '') as company_phone,
        COALESCE(bl.alternate_number, (SELECT alternate_number FROM business_location ORDER BY id ASC LIMIT 1), '') as company_alternate_phone,
        COALESCE(bl.email, b.email, (SELECT email FROM business_location ORDER BY id ASC LIMIT 1), '') as company_email,
        COALESCE(bl.gst_no, b.gst_no, (SELECT gst_no FROM business_location ORDER BY id ASC LIMIT 1), '') as company_gst_no,
        bl.images as company_logo,
        tm.name as tax_name,
        u.full_name as added_by_name,
        ba.account_name as payment_account_name,
        ba.bank_name as payment_bank_name
      FROM expenses e 
      JOIN expense_categories c ON e.category_id = c.id 
      LEFT JOIN expense_categories sc ON e.sub_category_id = sc.id
      LEFT JOIN business_location bl ON (bl.branch_id = e.branch_id OR bl.id = e.branch_id)
      LEFT JOIN branches b ON (b.id = e.branch_id)
      LEFT JOIN tax_modules tm ON e.tax_id = tm.id
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN bank_accounts ba ON e.payment_account_id = ba.id
      WHERE ${bw.clause}${gstClause} 
      ORDER BY e.expense_date DESC, e.id DESC
    `;
    const [rows] = await db.promise().query(query, queryParams);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createExpense = async (req, res) => {
  const {
    branch_id,
    category_id,
    sub_category_id,
    reference_no,
    expense_date,
    expense_for_type,
    expense_for_id,
    tax_id,
    total_amount,
    notes,
    is_refund,
    payment_mode,
    payment_account_id,
    is_gst
  } = req.body;

  try {
    const final_branch_id = branch_id || branchIdForInsert(req);
    
    let final_reference_no = reference_no;
    if (!final_reference_no) {
      const [lastRow] = await db.promise().query("SELECT id FROM expenses ORDER BY id DESC LIMIT 1");
      const nextId = (lastRow[0]?.id || 0) + 1;
      final_reference_no = `EXP-${new Date().getFullYear()}-${String(nextId).padStart(4, '0')}`;
    }

    const document_path = req.file ? `uploads/expenses/${req.file.filename}` : null;
    const isRefundVal = is_refund === 'true' || is_refund === true || is_refund === 1 || is_refund === '1';
    const isGstVal = is_gst !== undefined
      ? (Number(is_gst) === 1 || is_gst === true || is_gst === '1' ? 1 : 0)
      : (req.isNonUser ? 0 : 1);

    const isCashMode = String(payment_mode || 'Cash').trim().toLowerCase() === 'cash';

    let final_payment_account_id = null;
    if (!isCashMode) {
      final_payment_account_id = (payment_account_id && payment_account_id !== "null" && payment_account_id !== "")
        ? Number(payment_account_id)
        : null;

      if (!final_payment_account_id) {
        const [defaultBank] = await db.promise().query(
          "SELECT id FROM bank_accounts WHERE status = 'Active' ORDER BY id ASC LIMIT 1"
        );
        if (defaultBank.length > 0) {
          final_payment_account_id = defaultBank[0].id;
        }
      }
    }

    const [result] = await db.promise().query(
      `INSERT INTO expenses 
      (branch_id, category_id, sub_category_id, reference_no, expense_date, expense_for_type, 
       expense_for_id, tax_id, amount, notes, is_refund, payment_mode, payment_account_id, document_path, is_gst, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        final_branch_id,
        category_id,
        sub_category_id || null,
        final_reference_no,
        expense_date,
        expense_for_type || 'None',
        expense_for_id || null,
        tax_id || null,
        total_amount,
        notes,
        isRefundVal,
        payment_mode || 'Cash',
        final_payment_account_id,
        document_path,
        isGstVal,
        req.user?.id || null
      ]
    );

    const expenseId = result.insertId;

    // Adjust Bank Account balance ONLY for non-cash payment modes
    if (!isCashMode && final_payment_account_id && Number(total_amount) > 0) {
      if (isRefundVal) {
        await db.promise().query("UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?", [Number(total_amount), final_payment_account_id]);
      } else {
        await db.promise().query("UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?", [Number(total_amount), final_payment_account_id]);
      }
    }

    res.json({ message: "Expense recorded successfully", id: expenseId, reference_no: final_reference_no });
  } catch (err) {
    console.error("Create Expense Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteExpense = async (req, res) => {
  const { id } = req.params;
  try {
    const [oldRows] = await db.promise().query("SELECT amount, payment_account_id, is_refund, payment_mode FROM expenses WHERE id = ?", [id]);
    if (oldRows.length > 0) {
      const exp = oldRows[0];
      const isCash = String(exp.payment_mode || 'Cash').trim().toLowerCase() === 'cash';
      const isRefundVal = exp.is_refund === 1 || exp.is_refund === true || exp.is_refund === 'true';
      if (!isCash && exp.payment_account_id && Number(exp.amount) > 0) {
        if (isRefundVal) {
          // Revert refund: decrease balance
          await db.promise().query("UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?", [Number(exp.amount), exp.payment_account_id]);
        } else {
          // Revert normal expense: increase balance
          await db.promise().query("UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?", [Number(exp.amount), exp.payment_account_id]);
        }
      }
    }

    await db.promise().query("DELETE FROM expenses WHERE id = ?", [id]);
    res.json({ message: "Expense deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getExpenseById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        e.*, 
        c.name as category_name, 
        sc.name as sub_category_name,
        COALESCE(bl.name, b.branch_name, (SELECT name FROM business_location ORDER BY id ASC LIMIT 1), 'SHIVA ELECTRONICS') as company_name,
        COALESCE(bl.name, b.branch_name, (SELECT name FROM business_location ORDER BY id ASC LIMIT 1), 'Head Office / Main Branch') as location_name,
        COALESCE(bl.landmark, b.address, (SELECT landmark FROM business_location ORDER BY id ASC LIMIT 1), '') as company_address,
        COALESCE(bl.city, b.city, (SELECT city FROM business_location ORDER BY id ASC LIMIT 1), '') as company_city,
        COALESCE(bl.state, b.state, (SELECT state FROM business_location ORDER BY id ASC LIMIT 1), '') as company_state,
        COALESCE(bl.zip_code, b.pincode, (SELECT zip_code FROM business_location ORDER BY id ASC LIMIT 1), '') as company_zip,
        COALESCE(bl.mobile, b.phone, (SELECT mobile FROM business_location ORDER BY id ASC LIMIT 1), '') as company_phone,
        COALESCE(bl.alternate_number, (SELECT alternate_number FROM business_location ORDER BY id ASC LIMIT 1), '') as company_alternate_phone,
        COALESCE(bl.email, b.email, (SELECT email FROM business_location ORDER BY id ASC LIMIT 1), '') as company_email,
        COALESCE(bl.gst_no, b.gst_no, (SELECT gst_no FROM business_location ORDER BY id ASC LIMIT 1), '') as company_gst_no,
        bl.images as company_logo,
        tm.name as tax_name,
        u.full_name as added_by_name,
        ba.account_name as payment_account_name,
        ba.bank_name as payment_bank_name
      FROM expenses e 
      JOIN expense_categories c ON e.category_id = c.id 
      LEFT JOIN expense_categories sc ON e.sub_category_id = sc.id
      LEFT JOIN business_location bl ON (bl.branch_id = e.branch_id OR bl.id = e.branch_id)
      LEFT JOIN branches b ON (b.id = e.branch_id)
      LEFT JOIN tax_modules tm ON e.tax_id = tm.id
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN bank_accounts ba ON e.payment_account_id = ba.id
      WHERE e.id = ?
    `;
    const [rows] = await db.promise().query(query, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateExpense = async (req, res) => {
  const { id } = req.params;
  const {
    branch_id,
    category_id,
    expense_date,
    total_amount,
    notes,
    payment_mode,
    payment_account_id,
    is_refund,
    is_gst
  } = req.body;

  try {
    const isRefundVal = is_refund === 'true' || is_refund === true || is_refund === 1 || is_refund === '1';
    const newIsCash = String(payment_mode || 'Cash').trim().toLowerCase() === 'cash';

    let final_payment_account_id = null;
    if (!newIsCash) {
      final_payment_account_id = (payment_account_id && payment_account_id !== "null" && payment_account_id !== "")
        ? Number(payment_account_id)
        : null;

      if (!final_payment_account_id) {
        const [defaultBank] = await db.promise().query(
          "SELECT id FROM bank_accounts WHERE status = 'Active' ORDER BY id ASC LIMIT 1"
        );
        if (defaultBank.length > 0) {
          final_payment_account_id = defaultBank[0].id;
        }
      }
    }

    // Get old expense to revert balance if it was a non-cash expense
    const [oldRows] = await db.promise().query("SELECT amount, payment_account_id, is_refund, payment_mode FROM expenses WHERE id = ?", [id]);
    if (oldRows.length > 0) {
      const exp = oldRows[0];
      const oldIsCash = String(exp.payment_mode || 'Cash').trim().toLowerCase() === 'cash';
      const oldIsRefundVal = exp.is_refund === 1 || exp.is_refund === true || exp.is_refund === 'true';
      if (!oldIsCash && exp.payment_account_id && Number(exp.amount) > 0) {
        if (oldIsRefundVal) {
          await db.promise().query("UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?", [Number(exp.amount), exp.payment_account_id]);
        } else {
          await db.promise().query("UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?", [Number(exp.amount), exp.payment_account_id]);
        }
      }
    }

    let query = `
      UPDATE expenses SET 
        branch_id = ?, 
        category_id = ?, 
        expense_date = ?, 
        amount = ?, 
        notes = ?, 
        payment_mode = ?,
        payment_account_id = ?,
        is_refund = ?
    `;
    const params = [branch_id, category_id, expense_date, total_amount, notes, payment_mode || 'Cash', final_payment_account_id, isRefundVal];

    if (is_gst !== undefined) {
      query += ", is_gst = ?";
      params.push(Number(is_gst) === 1 || is_gst === true || is_gst === '1' ? 1 : 0);
    }

    if (req.file) {
      query += ", document_path = ?";
      params.push(`uploads/expenses/${req.file.filename}`);
    }

    query += " WHERE id = ?";
    params.push(id);

    await db.promise().query(query, params);

    // Apply new bank balance ONLY for non-cash payment modes
    if (!newIsCash && final_payment_account_id && Number(total_amount) > 0) {
      if (isRefundVal) {
        await db.promise().query("UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?", [Number(total_amount), final_payment_account_id]);
      } else {
        await db.promise().query("UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?", [Number(total_amount), final_payment_account_id]);
      }
    }

    res.json({ message: "Expense updated successfully" });
  } catch (err) {
    console.error("Update Expense Error:", err);
    res.status(500).json({ message: err.message });
  }
};
