-- Run this in your MySQL database (e.g. demo_mkplywoods) if purchases don't exist.

-- Purchases header (add purchase_no and purchase_date if table already exists:
-- ALTER TABLE purchases ADD COLUMN purchase_no VARCHAR(100) NULL UNIQUE;
-- ALTER TABLE purchases ADD COLUMN purchase_date DATE NULL;
CREATE TABLE IF NOT EXISTS purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_no VARCHAR(100) NULL UNIQUE,
  purchase_date DATE NULL,
  vendor_id INT NOT NULL,
  payment_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Purchase line items (add qty if table already exists: ALTER TABLE purchase_items ADD COLUMN qty INT DEFAULT 1 NULL; OR ALTER TABLE purchase_items MODIFY COLUMN product_id INT NULL;)
CREATE TABLE IF NOT EXISTS purchase_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT NOT NULL,
  product_id INT NULL,
  thickness VARCHAR(50) NULL,
  width DECIMAL(10,2) NULL,
  length DECIMAL(10,2) NULL,
  sqft DECIMAL(10,2) NULL,
  qty DECIMAL(12,3) DEFAULT 1.000 NULL,
  sqft_rate DECIMAL(10,2) NULL,
  selling_rate DECIMAL(10,2) NULL,
  total DECIMAL(12,2) NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Optional: add HSN code to products if your table doesn't have it
-- ALTER TABLE products ADD COLUMN hsn_code VARCHAR(50) NULL;

-- Add price, margin, and hsncode columns to purchase_items (run if columns do not exist)
-- ALTER TABLE purchase_items ADD COLUMN price DECIMAL(12,2) NULL;
-- ALTER TABLE purchase_items ADD COLUMN margin DECIMAL(8,2) NULL;
-- ALTER TABLE purchase_items ADD COLUMN hsncode VARCHAR(50) NULL;
