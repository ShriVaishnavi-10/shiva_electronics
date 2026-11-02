const db = require("../config/db");

async function ensureSalesPersonTables() {
  const queryAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

  try {
    // 1. Create sales_persons table
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS sales_persons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_code VARCHAR(50) DEFAULT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(25) DEFAULT NULL,
        email VARCHAR(100) DEFAULT NULL,
        commission_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
        commission_rate DECIMAL(8,2) NOT NULL DEFAULT 0.00,
        target_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        branch_id INT DEFAULT NULL,
        status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_sales_persons_status (status),
        KEY idx_sales_persons_branch (branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 2. Create sales_person_payouts table
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS sales_person_payouts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sales_person_id INT NOT NULL,
        month VARCHAR(7) NOT NULL,
        total_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        commission_earned DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        payout_date DATE NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'Cash',
        reference_no VARCHAR(100) DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_payouts_sp_month (sales_person_id, month)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 3. Ensure sales_person_id in transactions
    const txCols = await queryAsync("SHOW COLUMNS FROM transactions LIKE 'sales_person_id'");
    if (txCols.length === 0) {
      await queryAsync("ALTER TABLE transactions ADD COLUMN sales_person_id INT DEFAULT NULL AFTER contact_id");
      await queryAsync("ALTER TABLE transactions ADD INDEX idx_tx_sales_person (sales_person_id)");
      console.log("Added column sales_person_id to transactions table");
    }

    // 4. Ensure commission_amount in transactions
    const commCols = await queryAsync("SHOW COLUMNS FROM transactions LIKE 'commission_amount'");
    if (commCols.length === 0) {
      await queryAsync("ALTER TABLE transactions ADD COLUMN commission_amount DECIMAL(12,2) DEFAULT 0.00 AFTER final_amount");
      console.log("Added column commission_amount to transactions table");
    }

    // 5. Ensure commission_status in transactions
    const statusCols = await queryAsync("SHOW COLUMNS FROM transactions LIKE 'commission_status'");
    if (statusCols.length === 0) {
      await queryAsync("ALTER TABLE transactions ADD COLUMN commission_status VARCHAR(30) DEFAULT 'Pending' AFTER commission_amount");
      console.log("Added column commission_status to transactions table");
    }

    console.log("Sales person tables and columns ensured successfully");
  } catch (err) {
    console.error("ensureSalesPersonTables error:", err.message || err);
  }
}

module.exports = { ensureSalesPersonTables };

if (require.main === module) {
  ensureSalesPersonTables().then(() => process.exit(0));
}

