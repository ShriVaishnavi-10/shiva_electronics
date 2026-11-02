const db = require("../config/db");

const sqlReturns = `
CREATE TABLE IF NOT EXISTS purchase_returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_no VARCHAR(100) NOT NULL UNIQUE,
  purchase_id INT NULL,
  purchase_no VARCHAR(100) NULL,
  vendor_id INT NOT NULL,
  return_date DATE NOT NULL,
  refund_type ENUM('Bank / Cash Refund', 'Vendor Credit / Ledger') DEFAULT 'Bank / Cash Refund',
  bank_account_id INT NULL,
  payment_mode VARCHAR(50) DEFAULT 'Bank Transfer',
  total_qty DECIMAL(12, 3) DEFAULT 0,
  subtotal DECIMAL(12, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  grand_total DECIMAL(12, 2) DEFAULT 0,
  notes TEXT NULL,
  branch_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pr_vendor (vendor_id),
  INDEX idx_pr_purchase (purchase_id),
  INDEX idx_pr_branch (branch_id),
  INDEX idx_pr_date (return_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const sqlItems = `
CREATE TABLE IF NOT EXISTS purchase_return_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_return_id INT NOT NULL,
  purchase_item_id INT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(255) NULL,
  hsncode VARCHAR(50) NULL,
  return_qty DECIMAL(12, 3) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  tax_group_id INT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pri_return (purchase_return_id),
  INDEX idx_pri_product (product_id),
  FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

function ensurePurchaseReturnsTables() {
  return new Promise((resolve, reject) => {
    db.query(sqlReturns, (err1) => {
      if (err1) {
        console.error("Error creating purchase_returns table:", err1.message || err1);
        return reject(err1);
      }
      db.query(sqlItems, (err2) => {
        if (err2) {
          console.error("Error creating purchase_return_items table:", err2.message || err2);
          return reject(err2);
        }
        resolve();
      });
    });
  });
}

// Auto-run non-blocking when required
ensurePurchaseReturnsTables().catch((err) => {
  console.warn("Could not ensure purchase returns tables immediately:", err?.message || err);
});

module.exports = { ensurePurchaseReturnsTables };

if (require.main === module) {
  ensurePurchaseReturnsTables()
    .then(() => {
      console.log("purchase_returns and purchase_return_items tables ready");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

