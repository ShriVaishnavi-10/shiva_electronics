const db = require("./config/db");

const updateTable = async () => {
  const queries = [
    `ALTER TABLE expenses 
      ADD COLUMN reference_no VARCHAR(100) AFTER id,
      ADD COLUMN sub_category_id INT NULL AFTER category_id,
      ADD COLUMN expense_for_type ENUM('None', 'User', 'Contact') DEFAULT 'None' AFTER sub_category_id,
      ADD COLUMN expense_for_id INT NULL AFTER expense_for_type,
      ADD COLUMN tax_id INT NULL AFTER expense_for_id,
      ADD COLUMN document_path VARCHAR(255) NULL AFTER tax_id,
      ADD COLUMN is_refund BOOLEAN DEFAULT FALSE AFTER notes,
      ADD COLUMN payment_account_id INT NULL AFTER is_refund`,
    `ALTER TABLE expenses MODIFY COLUMN payment_mode VARCHAR(50)`
  ];

  for (const query of queries) {
    try {
      await db.promise().query(query);
      console.log("Updated table successfully");
    } catch (err) {
      console.error("Error updating table:", err.message);
    }
  }
  process.exit();
};

updateTable();
