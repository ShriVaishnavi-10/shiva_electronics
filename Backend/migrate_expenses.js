const db = require("./config/db");

const createTables = async () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS expense_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50),
      parent_id INT NULL,
      branch_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES expense_categories(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      branch_id INT NOT NULL,
      category_id INT NOT NULL,
      amount DECIMAL(15, 2) NOT NULL,
      expense_date DATE NOT NULL,
      payment_mode ENUM('Cash', 'UPI', 'Bank', 'Cheque') DEFAULT 'Cash',
      notes TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES expense_categories(id)
    )`
  ];

  for (const query of queries) {
    try {
      await db.promise().query(query);
      console.log("Executed query successfully");
    } catch (err) {
      console.error("Error executing query:", err.message);
    }
  }
  process.exit();
};

createTables();
