-- Quotations: uses customers (id, customer_name, contact_no, alternate_no, pincode, address, city, country, created_at)
-- and products (id, category_id, subcategory_id, product_name, thickness, length, width, sqft, status, created_at, hsncode)

-- Quotation header
CREATE TABLE IF NOT EXISTS quotations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_no VARCHAR(50) NULL,
  quotation_date DATE NULL,
  valid_till DATE NULL,
  reference VARCHAR(100) NULL,
  customer_id INT NOT NULL,
  terms TEXT NULL,
  notes TEXT NULL,
  show_price_totals TINYINT(1) NULL DEFAULT 0,
  transport_charges DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Quotation line items (linked to products)
-- Uses: product_id, product_name, qty, rate_1, rate_2, rate_3, rate_4
CREATE TABLE IF NOT EXISTS quotation_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  product_id INT NULL,
  product_name VARCHAR(255) NULL,
  qty DECIMAL(10,2) DEFAULT 0.00 NULL,
  rate_1 DECIMAL(12,2) NULL,
  rate_2 DECIMAL(12,2) NULL,
  rate_3 DECIMAL(12,2) NULL,
  rate_4 DECIMAL(12,2) NULL,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- For existing tables: run quotation_add_rate_columns.sql to add rate_1..rate_4
-- For existing tables: run quotation_remove_old_columns.sql to drop old columns (optional)

-- Optional FULLTEXT on products (if not already added):
-- ALTER TABLE products ADD FULLTEXT(id, category_id, subcategory_id, product_name, thickness, length, width, sqft, status, created_at, hsncode);
-- Optional FULLTEXT on customers:
-- ALTER TABLE customers ADD FULLTEXT(id, customer_name, contact_no, alternate_no, pincode, address, city, country, created_at);
