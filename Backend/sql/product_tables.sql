-- Run this in your MySQL database (e.g. demo_mkplywoods) if products table needs modifications.

-- Add thickness column to products table (legacy)
-- ALTER TABLE products ADD COLUMN thickness VARCHAR(50) NULL;

-- Add unit and parameter columns (run if columns do not exist)
-- ALTER TABLE products ADD COLUMN unit VARCHAR(50) NULL, ADD COLUMN parameter VARCHAR(100) NULL;

-- Add qty column to products table for quantity tracking
-- ALTER TABLE products ADD COLUMN qty INT DEFAULT 0 NULL;

-- Add min_order_quantity column (run if column does not exist)
-- ALTER TABLE products ADD COLUMN min_order_quantity INT NULL;

-- Add price column for product list (run if column does not exist)
-- ALTER TABLE products ADD COLUMN price DECIMAL(12,2) NULL;

-- Add margin (%) and selling_price (price + margin based)
-- ALTER TABLE products ADD COLUMN margin DECIMAL(8,2) NULL, ADD COLUMN selling_price DECIMAL(12,2) NULL;

-- Add image column for image URL(s) (run if column does not exist)
-- ALTER TABLE products ADD COLUMN image TEXT NULL;

-- Add brand_id as foreign key in one step (products and brand must be InnoDB).
-- If brand.id is INT UNSIGNED, use INT UNSIGNED instead of INT for brand_id.
ALTER TABLE products
  ADD COLUMN brand_id INT NULL,
  ADD CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brand(id) ON DELETE SET NULL;

-- Dynamic category-specific fields and product code
-- ALTER TABLE products ADD COLUMN product_code VARCHAR(100) NULL AFTER product_name;
-- ALTER TABLE products ADD COLUMN product_type VARCHAR(50) NULL, ADD COLUMN specifications JSON NULL;
