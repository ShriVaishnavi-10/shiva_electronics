-- Main transactions table (sales)
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NULL,
  location_id INT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'sell',
  status VARCHAR(50) NULL DEFAULT 'Final',
  contact_id INT NULL,
  payment_status VARCHAR(50) NULL DEFAULT 'paid',
  invoice_no VARCHAR(100) NULL,
  sales_date DATE NULL,
  total_before_tax DECIMAL(12,2) NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NULL DEFAULT 0,
  discount_type VARCHAR(20) NULL DEFAULT 'fixed',
  discount_amount DECIMAL(12,2) NULL DEFAULT 0,
  tax_group_id INT NULL,
  final_amount DECIMAL(12,2) NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transaction Sell Lines (line items per sale/transaction)
-- No foreign keys in CREATE to avoid errno 150 if parent tables missing or types differ
CREATE TABLE IF NOT EXISTS transaction_sell_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NULL,
  transaction_id INT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
  unit VARCHAR(20) NULL DEFAULT 'pcs',
  unit_price_before_discount DECIMAL(12,2) NULL,
  unit_price DECIMAL(12,2) NULL,
  unit_price_inc_tax DECIMAL(12,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- For existing tables: ALTER TABLE transaction_sell_lines ADD COLUMN unit VARCHAR(20) NULL DEFAULT 'pcs' AFTER quantity;

-- Transaction Payments (payment records per transaction)
-- payment_ref_no is UNIQUE as required
CREATE TABLE IF NOT EXISTS transaction_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  business_id INT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  method VARCHAR(50) NULL,
  card_type VARCHAR(50) NULL,
  card_number VARCHAR(50) NULL,
  payment_for VARCHAR(100) NULL,
  payment_ref_no VARCHAR(100) NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional: add indexes for lookups (run once; skip if already exist)
-- CREATE INDEX idx_transaction_sell_lines_transaction_id ON transaction_sell_lines(transaction_id);
-- CREATE INDEX idx_transaction_sell_lines_product_id ON transaction_sell_lines(product_id);
-- CREATE INDEX idx_transaction_payments_transaction_id ON transaction_payments(transaction_id);
-- CREATE INDEX idx_transaction_payments_business_id ON transaction_payments(business_id);

-- Optional: add foreign keys ONLY after parent tables exist and column types match (e.g. transactions.id INT, products.id INT, business_location.id INT)
-- ALTER TABLE transaction_sell_lines
--   ADD CONSTRAINT fk_tsl_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
--   ADD CONSTRAINT fk_tsl_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;
-- ALTER TABLE transaction_payments
--   ADD CONSTRAINT fk_tp_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
--   ADD CONSTRAINT fk_tp_business FOREIGN KEY (business_id) REFERENCES business_location(id) ON DELETE SET NULL;
