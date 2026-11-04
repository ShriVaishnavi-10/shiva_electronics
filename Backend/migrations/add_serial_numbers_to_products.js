const db = require("../config/db");

const ensureProductSerialNumbersTable = () => {
  return new Promise((resolve) => {
    // 1. Add serial_units column to products table if not exists
    const addColSql = `
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS serial_units LONGTEXT NULL;
    `;

    db.query(addColSql, (err) => {
      if (err) {
        // Fallback for older MySQL versions without IF NOT EXISTS in ADD COLUMN
        db.query("SHOW COLUMNS FROM products LIKE 'serial_units'", (showErr, cols) => {
          if (!showErr && (!cols || cols.length === 0)) {
            db.query("ALTER TABLE products ADD COLUMN serial_units LONGTEXT NULL", () => {});
          }
        });
      }

      // 2. Create product_serial_numbers table for individual unit tracking
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS product_serial_numbers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          unit_index INT DEFAULT 1,
          imei_1 VARCHAR(50) NULL,
          imei_2 VARCHAR(50) NULL,
          serial_number VARCHAR(100) NULL,
          status VARCHAR(20) DEFAULT 'AVAILABLE',
          sale_transaction_id INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_psn_product_id (product_id),
          INDEX idx_psn_imei_1 (imei_1),
          INDEX idx_psn_imei_2 (imei_2),
          INDEX idx_psn_serial (serial_number),
          INDEX idx_psn_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `;

      db.query(createTableSql, (tableErr) => {
        if (tableErr) {
          console.error("Migration error creating product_serial_numbers table:", tableErr.message || tableErr);
        } else {
          console.log("product_serial_numbers table verified/created successfully.");
        }
        resolve();
      });
    });
  });
};

module.exports = { ensureProductSerialNumbersTable };

