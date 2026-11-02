CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NULL,
  bank_name VARCHAR(100) NULL,
  branch_name VARCHAR(100) NULL,
  account_type ENUM('Savings', 'Current', 'Cash', 'Other') DEFAULT 'Current',
  opening_balance DECIMAL(12,2) DEFAULT 0.00,
  current_balance DECIMAL(12,2) DEFAULT 0.00,
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  branch_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update vendor_payments to link to bank_accounts
ALTER TABLE vendor_payments ADD COLUMN bank_account_id INT NULL AFTER vendor_id;
ALTER TABLE vendor_payments ADD CONSTRAINT fk_vendor_payment_bank FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL;
