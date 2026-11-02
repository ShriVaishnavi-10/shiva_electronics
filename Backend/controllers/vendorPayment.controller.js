const db = require("../config/db");
const { getBranchId, branchWhere, branchIdForInsert } = require("../middleware/branchHelper");

exports.createVendorPayment = async (req, res) => {
  const {
    vendor_id,
    purchase_id,
    payment_date,
    amount,
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
  if (!vendor_id || !payment_date || !paymentAmount || paymentAmount <= 0 || !payment_method) {
    return res.status(400).json({ message: "Vendor, date, valid amount and method are required" });
  }
  const branchId = branchIdForInsert(req);
  const conn = await db.promise().getConnection();

  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO vendor_payments 
        (vendor_id, purchase_id, bank_account_id, payment_date, amount, payment_method, paid_from, reference_no, notes, cheque_no, cheque_date, collection_person, branch_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vendor_id,
        purchase_id || null,
        bank_account_id || null,
        payment_date,
        paymentAmount,
        payment_method,
        paid_from || null,
        reference_no || null,
        notes || null,
        cheque_no || null,
        cheque_date || null,
        collection_person || null,
        branchId
      ]
    );

    // If linked to a purchase, update purchase paid_amount, due_amount & payment_status
    if (purchase_id) {
      await conn.query(
        `UPDATE purchases 
         SET paid_amount = paid_amount + ?, 
             due_amount = GREATEST(0, due_amount - ?), 
             payment_status = CASE WHEN due_amount - ? <= 0.01 THEN 'paid' ELSE 'partial' END 
         WHERE id = ?`,
        [paymentAmount, paymentAmount, paymentAmount, purchase_id]
      );
    }

    if (bank_account_id) {
      await conn.query(
        "UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?",
        [paymentAmount, bank_account_id]
      );
    }
    await conn.commit();
    res.json({ message: "Payment recorded successfully", id: result.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

exports.getVendorPayments = async (req, res) => {
  const { vendor_id, purchase_id } = req.query;
  const branchId = getBranchId(req);
  const bw = branchWhere(branchId, "");
  let sql = "SELECT * FROM vendor_payments WHERE 1=1";
  const params = [];
  if (vendor_id) {
    sql += " AND vendor_id = ?";
    params.push(vendor_id);
  }
  if (purchase_id) {
    sql += " AND purchase_id = ?";
    params.push(purchase_id);
  }

  if (branchId) {
    sql += ` AND ${bw.clause}`;
    params.push(...bw.params);
  }
  sql += " ORDER BY payment_date DESC, id DESC";
  try {
    const [rows] = await db.promise().query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
