-- Run in mk_plywoods database
-- New demo quotations module with is_dc default 0

CREATE TABLE IF NOT EXISTS demo_quotations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_no VARCHAR(50) NULL,
  quotation_date DATE NOT NULL,
  valid_till_date DATE NULL,
  reference VARCHAR(100) NULL,

  customer_id INT NULL,
  customer_name VARCHAR(150) NOT NULL,
  contact_no VARCHAR(20) NOT NULL,
  alternate_no VARCHAR(20) NULL,
  address TEXT NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  country VARCHAR(100) NULL,
  pincode VARCHAR(20) NULL,

  gst_type ENUM('exclusive','inclusive') NOT NULL DEFAULT 'exclusive',
  gst_percent DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gst_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  grand_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,

  terms_and_conditions TEXT NULL,
  notes TEXT NULL,
  is_dc TINYINT(1) NOT NULL DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS demo_quotation_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  product_id INT NULL,
  product_name VARCHAR(255) NOT NULL,
  thickness VARCHAR(50) NULL,
  width DECIMAL(10,2) NULL,
  height DECIMAL(10,2) NULL,
  sqft DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  qty DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES demo_quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
