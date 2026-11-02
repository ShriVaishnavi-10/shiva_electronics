-- ============================================================
-- FULL DATABASE MIGRATION - anantham_nursary
-- Safe migration: No data loss, no duplicate columns
-- Run order: Execute this file top-to-bottom
-- ============================================================

USE anantham_nursary;

-- ============================================================
-- HELPER: Stored procedure to safely add columns
-- Checks INFORMATION_SCHEMA before ALTER TABLE
-- ============================================================

DROP PROCEDURE IF EXISTS safe_add_column;
DELIMITER $$
CREATE PROCEDURE safe_add_column(
  IN tbl  VARCHAR(64),
  IN col  VARCHAR(64),
  IN defn VARCHAR(500)
)
BEGIN
  SET @db = DATABASE();
  SELECT COUNT(*) INTO @exists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME   = tbl
      AND COLUMN_NAME  = col;
  IF @exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', defn);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DROP PROCEDURE IF EXISTS safe_add_index;
DELIMITER $$
CREATE PROCEDURE safe_add_index(
  IN tbl VARCHAR(64),
  IN idx VARCHAR(64),
  IN defn VARCHAR(500)
)
BEGIN
  SET @db = DATABASE();
  SELECT COUNT(*) INTO @exists
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME   = tbl
      AND INDEX_NAME   = idx;
  IF @exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD INDEX `', idx, '` (', defn, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DROP PROCEDURE IF EXISTS safe_add_foreign_key;
DELIMITER $$
CREATE PROCEDURE safe_add_foreign_key(
  IN tbl      VARCHAR(64),
  IN fk_name  VARCHAR(64),
  IN col_name VARCHAR(64),
  IN ref_tbl  VARCHAR(64),
  IN ref_col  VARCHAR(64),
  IN on_del   VARCHAR(30)
)
BEGIN
  SET @db = DATABASE();
  SELECT COUNT(*) INTO @exists
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA    = @db
      AND TABLE_NAME      = tbl
      AND CONSTRAINT_NAME = fk_name
      AND CONSTRAINT_TYPE = 'FOREIGN KEY';
  IF @exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD CONSTRAINT `', fk_name,
                      '` FOREIGN KEY (`', col_name, '`) REFERENCES `', ref_tbl,
                      '`(`', ref_col, '`) ON DELETE ', on_del);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

-- ============================================================
-- PHASE 1: FOUNDATION TABLES (no foreign key deps)
-- ============================================================

-- 1A. categories (base table - should exist already)
CREATE TABLE IF NOT EXISTS categories (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(150) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1B. brand
CREATE TABLE IF NOT EXISTS brand (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  brand_name VARCHAR(150) NOT NULL,
  status     VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1C. primary_units
CREATE TABLE IF NOT EXISTS primary_units (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  unit_name  VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1D. secondary_units
CREATE TABLE IF NOT EXISTS secondary_units (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  unit_name  VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1E. tax_modules
CREATE TABLE IF NOT EXISTS tax_modules (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  tax_rate   DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1F. tax_groups
CREATE TABLE IF NOT EXISTS tax_groups (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1G. tax_group_taxes (junction)
CREATE TABLE IF NOT EXISTS tax_group_taxes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tax_group_id  INT NOT NULL,
  tax_module_id INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_group_tax (tax_group_id, tax_module_id),
  FOREIGN KEY (tax_group_id)  REFERENCES tax_groups(id)  ON DELETE CASCADE,
  FOREIGN KEY (tax_module_id) REFERENCES tax_modules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1H. branches
CREATE TABLE IF NOT EXISTS branches (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  branch_name VARCHAR(150) NOT NULL,
  branch_code VARCHAR(20)  NOT NULL UNIQUE,
  address     TEXT,
  city        VARCHAR(100),
  state       VARCHAR(100),
  pincode     VARCHAR(10),
  phone       VARCHAR(20),
  email       VARCHAR(150),
  gst_no      VARCHAR(20),
  status      ENUM('Active','Inactive') DEFAULT 'Active',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1I. roles
CREATE TABLE IF NOT EXISTS roles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  role_name   VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1J. permissions
CREATE TABLE IF NOT EXISTS permissions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  module_name     VARCHAR(50) NOT NULL,
  permission_key  VARCHAR(80) NOT NULL UNIQUE,
  description     VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1K. role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  role_id       INT NOT NULL,
  permission_id INT NOT NULL,
  UNIQUE KEY uq_role_perm (role_id, permission_id),
  FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PHASE 2: TABLES WITH FK DEPS ON PHASE 1
-- ============================================================

-- 2A. subcategories
CREATE TABLE IF NOT EXISTS subcategories (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  category_id      INT NOT NULL,
  subcategory_name VARCHAR(150) NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2B. customers
CREATE TABLE IF NOT EXISTS customers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(150) NOT NULL,
  contact_no    VARCHAR(20),
  alternate_no  VARCHAR(20),
  gst_no        VARCHAR(15),
  pincode       VARCHAR(10),
  address       TEXT,
  address2      TEXT,
  city          VARCHAR(100),
  country       VARCHAR(100),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2C. vendors
CREATE TABLE IF NOT EXISTS vendors (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id    VARCHAR(20) UNIQUE,
  vendor_name  VARCHAR(150),
  company_name VARCHAR(200),
  mobile       VARCHAR(20),
  email        VARCHAR(150),
  address      TEXT,
  pincode      VARCHAR(10),
  gst_no       VARCHAR(20),
  vendor_type  VARCHAR(50),
  status       VARCHAR(20) DEFAULT 'Active',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2D. products
CREATE TABLE IF NOT EXISTS products (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  category_id        INT NOT NULL,
  subcategory_id     INT,
  brand_id           INT,
  product_name       VARCHAR(255) NOT NULL,
  thickness          VARCHAR(50),
  length             VARCHAR(50),
  width              VARCHAR(50),
  sqft               VARCHAR(50),
  unit               VARCHAR(50),
  primary_unit       VARCHAR(50),
  secondary_unit     VARCHAR(50),
  parameter          VARCHAR(100),
  hsncode            VARCHAR(50),
  qty                INT DEFAULT 0,
  min_order_quantity INT,
  price              DECIMAL(12,2),
  margin             DECIMAL(8,2),
  selling_price      DECIMAL(12,2),
  images             TEXT,
  status             VARCHAR(20) DEFAULT 'Active',
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id)    REFERENCES categories(id)    ON DELETE CASCADE,
  FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2E. users
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(100) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  full_name  VARCHAR(150),
  email      VARCHAR(150),
  phone      VARCHAR(20),
  role       VARCHAR(50),
  role_id    INT,
  branch_id  INT,
  status     ENUM('Active','Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id)   REFERENCES roles(id)    ON DELETE SET NULL,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2F. company_settings
CREATE TABLE IF NOT EXISTS company_settings (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255),
  gst_no       VARCHAR(50),
  address      TEXT,
  city         VARCHAR(100),
  state        VARCHAR(100),
  country      VARCHAR(100),
  branch       VARCHAR(100),
  company_logo VARCHAR(255),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status       TINYINT DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2G. business_location
CREATE TABLE IF NOT EXISTS business_location (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  location_id      VARCHAR(50) UNIQUE,
  name             VARCHAR(255) NOT NULL,
  landmark         VARCHAR(255),
  state            VARCHAR(100),
  city             VARCHAR(100),
  zip_code         VARCHAR(20),
  mobile           VARCHAR(20),
  alternate_number VARCHAR(20),
  email            VARCHAR(255),
  images           VARCHAR(1000),
  gst_no           VARCHAR(50),
  account_holder   VARCHAR(150),
  bank_name        VARCHAR(150),
  account_number   VARCHAR(50),
  branch           VARCHAR(150),
  ifsc_code        VARCHAR(20),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2H. invoice_settings (per branch)
CREATE TABLE IF NOT EXISTS invoice_settings (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  branch_id    INT,
  company_name VARCHAR(200),
  address      TEXT,
  city         VARCHAR(100),
  state        VARCHAR(100),
  pincode      VARCHAR(10),
  phone        VARCHAR(20),
  email        VARCHAR(150),
  gst_no       VARCHAR(20),
  pan_no       VARCHAR(20),
  logo_url     VARCHAR(500),
  terms        TEXT,
  bank_name    VARCHAR(150),
  account_no   VARCHAR(50),
  ifsc_code    VARCHAR(20),
  upi_id       VARCHAR(100),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2I. branch_sequences
CREATE TABLE IF NOT EXISTS branch_sequences (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  branch_id     INT NOT NULL,
  sequence_type ENUM('sale','quotation','purchase') NOT NULL,
  prefix VARCHAR(100) DEFAULT '',
  last_number   INT DEFAULT 0,
  UNIQUE KEY uq_branch_seq (branch_id, sequence_type),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PHASE 3: TABLES WITH FK DEPS ON PHASE 2
-- ============================================================

-- 3A. purchases
CREATE TABLE IF NOT EXISTS purchases (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  purchase_no VARCHAR(100) UNIQUE,
  purchase_date DATE,
  vendor_id     INT NOT NULL,
  payment_type  VARCHAR(50) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3B. purchase_items
CREATE TABLE IF NOT EXISTS purchase_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id  INT NOT NULL,
  product_id   INT,
  product_name VARCHAR(255),
  thickness    VARCHAR(50),
  width        DECIMAL(10,2),
  length       DECIMAL(10,2),
  sqft         DECIMAL(10,2),
  qty          INT DEFAULT 1,
  sqft_rate    DECIMAL(10,2),
  price        DECIMAL(12,2),
  margin       DECIMAL(8,2),
  hsncode      VARCHAR(50),
  selling_rate DECIMAL(10,2),
  total        DECIMAL(12,2),
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3C. stocks
CREATE TABLE IF NOT EXISTS stocks (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL UNIQUE,
  quantity   DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3D. stock_in
CREATE TABLE IF NOT EXISTS stock_in (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  product_id           INT,
  purchase_id          INT,
  purchase_date        DATE,
  qty                  INT,
  purchase_price       DECIMAL(10,2),
  total_purchase_price DECIMAL(12,2),
  selling_price        DECIMAL(10,2),
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id)  REFERENCES products(id)   ON DELETE SET NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3E. quotations
CREATE TABLE IF NOT EXISTS quotations (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  quotation_no     VARCHAR(50),
  quotation_date   DATE,
  valid_till_date  DATE,
  valid_till       DATE,
  reference        VARCHAR(100),
  customer_id      INT NOT NULL,
  terms_and_conditions TEXT,
  terms            TEXT,
  notes            TEXT,
  show_price_totals TINYINT(1) DEFAULT 0,
  transport_charges DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3F. quotation_items
CREATE TABLE IF NOT EXISTS quotation_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id  INT NOT NULL,
  product_id    INT,
  product_name  VARCHAR(255),
  product_model VARCHAR(255),
  hsncode       VARCHAR(50),
  qty           INT DEFAULT 1,
  rate_1        DECIMAL(12,2),
  rate_2        DECIMAL(12,2),
  rate_3        DECIMAL(12,2),
  rate_4        DECIMAL(12,2),
  discount      DECIMAL(12,2),
  total         DECIMAL(12,2),
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)   REFERENCES products(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3G. transactions (sales)
CREATE TABLE IF NOT EXISTS transactions (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  business_id        INT,
  location_id        INT,
  type               VARCHAR(20) NOT NULL DEFAULT 'sell',
  status             VARCHAR(50) DEFAULT 'Final',
  contact_id         INT,
  payment_status     VARCHAR(50) DEFAULT 'paid',
  invoice_no         VARCHAR(100),
  sales_date         DATE,
  total_before_tax   DECIMAL(12,2) DEFAULT 0,
  tax_amount         DECIMAL(12,2) DEFAULT 0,
  discount_type      VARCHAR(20) DEFAULT 'fixed',
  discount_amount    DECIMAL(12,2) DEFAULT 0,
  tax_group_id       INT,
  final_amount       DECIMAL(12,2) DEFAULT 0,
  vehicle_no         VARCHAR(100),
  transport_type     VARCHAR(100),
  transport_charges  DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3H. transaction_sell_lines
CREATE TABLE IF NOT EXISTS transaction_sell_lines (
  id                          INT AUTO_INCREMENT PRIMARY KEY,
  product_id                  INT,
  transaction_id              INT NOT NULL,
  quantity                    DECIMAL(12,3) NOT NULL DEFAULT 1,
  primary_unit                VARCHAR(20) DEFAULT 'pcs',
  secondary_unit              VARCHAR(50),
  unit_price_before_discount  DECIMAL(12,2),
  unit_price                  DECIMAL(12,2),
  unit_price_inc_tax          DECIMAL(12,2),
  created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3I. transaction_payments
CREATE TABLE IF NOT EXISTS transaction_payments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id  INT NOT NULL,
  business_id     INT,
  amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
  method          VARCHAR(50),
  card_type       VARCHAR(50),
  card_number     VARCHAR(50),
  payment_for     VARCHAR(100),
  payment_ref_no  VARCHAR(100) UNIQUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3J. demo_quotations
CREATE TABLE IF NOT EXISTS demo_quotations (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  quotation_no         VARCHAR(50),
  quotation_date       DATE NOT NULL,
  valid_till_date      DATE,
  reference            VARCHAR(100),
  customer_id          INT,
  customer_name        VARCHAR(150) NOT NULL,
  contact_no           VARCHAR(20) NOT NULL,
  alternate_no         VARCHAR(20),
  address              TEXT,
  city                 VARCHAR(100),
  state                VARCHAR(100),
  country              VARCHAR(100),
  pincode              VARCHAR(20),
  gst_type             ENUM('exclusive','inclusive') NOT NULL DEFAULT 'exclusive',
  gst_percent          DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  subtotal             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  cgst_amount          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sgst_amount          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gst_total            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  grand_total          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  terms_and_conditions TEXT,
  notes                TEXT,
  is_dc                TINYINT(1) NOT NULL DEFAULT 0,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3K. demo_quotation_items
CREATE TABLE IF NOT EXISTS demo_quotation_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id  INT NOT NULL,
  product_id    INT,
  product_name  VARCHAR(255) NOT NULL,
  thickness     VARCHAR(50),
  width         DECIMAL(10,2),
  height        DECIMAL(10,2),
  sqft          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  qty           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  rate          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES demo_quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)   REFERENCES products(id)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- PHASE 4: SAFELY ADD MISSING COLUMNS TO EXISTING TABLES
-- (Only adds if column doesn't already exist)
-- ============================================================

-- ---- customers ----
CALL safe_add_column('customers', 'alternate_no',  'VARCHAR(20) NULL');
CALL safe_add_column('customers', 'gst_no',        'VARCHAR(15) NULL');
CALL safe_add_column('customers', 'address2',       'TEXT NULL');
CALL safe_add_column('customers', 'city',           'VARCHAR(100) NULL');
CALL safe_add_column('customers', 'country',        'VARCHAR(100) NULL');
CALL safe_add_column('customers', 'pincode',        'VARCHAR(10) NULL');

-- ---- vendors ----
CALL safe_add_column('vendors', 'vendor_id',    'VARCHAR(20) NULL UNIQUE');
CALL safe_add_column('vendors', 'company_name', 'VARCHAR(200) NULL');
CALL safe_add_column('vendors', 'email',        'VARCHAR(150) NULL');
CALL safe_add_column('vendors', 'gst_no',       'VARCHAR(20) NULL');
CALL safe_add_column('vendors', 'vendor_type',  'VARCHAR(50) NULL');
CALL safe_add_column('vendors', 'status',       "VARCHAR(20) NULL DEFAULT 'Active'");

-- ---- products ----
CALL safe_add_column('products', 'thickness',          'VARCHAR(50) NULL');
CALL safe_add_column('products', 'length',             'VARCHAR(50) NULL');
CALL safe_add_column('products', 'width',              'VARCHAR(50) NULL');
CALL safe_add_column('products', 'sqft',               'VARCHAR(50) NULL');
CALL safe_add_column('products', 'unit',               'VARCHAR(50) NULL');
CALL safe_add_column('products', 'primary_unit',       'VARCHAR(50) NULL');
CALL safe_add_column('products', 'secondary_unit',     'VARCHAR(50) NULL');
CALL safe_add_column('products', 'parameter',          'VARCHAR(100) NULL');
CALL safe_add_column('products', 'hsncode',            'VARCHAR(50) NULL');
CALL safe_add_column('products', 'qty',                'INT DEFAULT 0 NULL');
CALL safe_add_column('products', 'min_order_quantity', 'INT NULL');
CALL safe_add_column('products', 'price',              'DECIMAL(12,2) NULL');
CALL safe_add_column('products', 'margin',             'DECIMAL(8,2) NULL');
CALL safe_add_column('products', 'selling_price',      'DECIMAL(12,2) NULL');
CALL safe_add_column('products', 'images',             'TEXT NULL');
CALL safe_add_column('products', 'brand_id',           'INT NULL');
CALL safe_add_column('products', 'status',             "VARCHAR(20) DEFAULT 'Active'");

-- ---- users (add new branch/role columns) ----
CALL safe_add_column('users', 'full_name',  'VARCHAR(150) NULL');
CALL safe_add_column('users', 'email',      'VARCHAR(150) NULL');
CALL safe_add_column('users', 'phone',      'VARCHAR(20) NULL');
CALL safe_add_column('users', 'role',       'VARCHAR(50) NULL');
CALL safe_add_column('users', 'role_id',    'INT NULL');
CALL safe_add_column('users', 'branch_id',  'INT NULL');
CALL safe_add_column('users', 'status',     "ENUM('Active','Inactive') DEFAULT 'Active'");
CALL safe_add_column('users', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- ---- purchases ----
CALL safe_add_column('purchases', 'purchase_no',   'VARCHAR(20) NULL');
CALL safe_add_column('purchases', 'purchase_date', 'DATE NULL');

-- ---- purchase_items ----
CALL safe_add_column('purchase_items', 'product_name',  'VARCHAR(255) NULL');
CALL safe_add_column('purchase_items', 'qty',           'INT DEFAULT 1 NULL');
CALL safe_add_column('purchase_items', 'price',         'DECIMAL(12,2) NULL');
CALL safe_add_column('purchase_items', 'margin',        'DECIMAL(8,2) NULL');
CALL safe_add_column('purchase_items', 'hsncode',       'VARCHAR(50) NULL');
CALL safe_add_column('purchase_items', 'selling_rate',  'DECIMAL(10,2) NULL');

-- ---- stock_in ----
CALL safe_add_column('stock_in', 'purchase_price',       'DECIMAL(10,2) NULL');
CALL safe_add_column('stock_in', 'total_purchase_price', 'DECIMAL(12,2) NULL');

-- ---- quotations ----
CALL safe_add_column('quotations', 'quotation_no',       'VARCHAR(50) NULL');
CALL safe_add_column('quotations', 'valid_till_date',    'DATE NULL');
CALL safe_add_column('quotations', 'valid_till',         'DATE NULL');
CALL safe_add_column('quotations', 'reference',          'VARCHAR(100) NULL');
CALL safe_add_column('quotations', 'terms_and_conditions', 'TEXT NULL');
CALL safe_add_column('quotations', 'terms',              'TEXT NULL');
CALL safe_add_column('quotations', 'notes',              'TEXT NULL');
CALL safe_add_column('quotations', 'show_price_totals',  'TINYINT(1) DEFAULT 0');

-- ---- quotation_items ----
CALL safe_add_column('quotation_items', 'product_name',  'VARCHAR(255) NULL');
CALL safe_add_column('quotation_items', 'product_model', 'VARCHAR(255) NULL');
CALL safe_add_column('quotation_items', 'hsncode',       'VARCHAR(50) NULL');
CALL safe_add_column('quotation_items', 'rate_1',        'DECIMAL(12,2) NULL');
CALL safe_add_column('quotation_items', 'rate_2',        'DECIMAL(12,2) NULL');
CALL safe_add_column('quotation_items', 'rate_3',        'DECIMAL(12,2) NULL');
CALL safe_add_column('quotation_items', 'rate_4',        'DECIMAL(12,2) NULL');
CALL safe_add_column('quotation_items', 'discount',      'DECIMAL(12,2) NULL');
CALL safe_add_column('quotation_items', 'total',         'DECIMAL(12,2) NULL');

-- ---- transactions ----
CALL safe_add_column('transactions', 'tax_group_id',    'INT NULL');
CALL safe_add_column('transactions', 'vehicle_no',      'VARCHAR(100) NULL');
CALL safe_add_column('transactions', 'transport_type',  'VARCHAR(100) NULL');
CALL safe_add_column('transactions', 'transport_charges', 'DECIMAL(12,2) NOT NULL DEFAULT 0');

-- ---- transaction_sell_lines ----
CALL safe_add_column('transaction_sell_lines', 'primary_unit',   "VARCHAR(20) NULL DEFAULT 'pcs'");
CALL safe_add_column('transaction_sell_lines', 'secondary_unit', 'VARCHAR(50) NULL');

-- ---- business_location ----
CALL safe_add_column('business_location', 'images',           'VARCHAR(1000) NULL');
CALL safe_add_column('business_location', 'gst_no',           'VARCHAR(50) NULL');
CALL safe_add_column('business_location', 'account_holder',   'VARCHAR(150) NULL');
CALL safe_add_column('business_location', 'bank_name',        'VARCHAR(150) NULL');
CALL safe_add_column('business_location', 'account_number',   'VARCHAR(50) NULL');
CALL safe_add_column('business_location', 'branch',           'VARCHAR(150) NULL');
CALL safe_add_column('business_location', 'ifsc_code',        'VARCHAR(20) NULL');

-- ---- company_settings ----
CALL safe_add_column('company_settings', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');


-- ============================================================
-- PHASE 5: ADD FOREIGN KEYS SAFELY
-- ============================================================

CALL safe_add_foreign_key('products',               'fk_products_brand',      'brand_id',       'brand',         'id', 'SET NULL');
CALL safe_add_foreign_key('products',               'fk_products_subcat',     'subcategory_id', 'subcategories', 'id', 'SET NULL');
CALL safe_add_foreign_key('users',                  'fk_users_role',          'role_id',        'roles',         'id', 'SET NULL');
CALL safe_add_foreign_key('users',                  'fk_users_branch',        'branch_id',      'branches',      'id', 'SET NULL');
CALL safe_add_foreign_key('transaction_sell_lines',  'fk_tsl_transaction',    'transaction_id', 'transactions',  'id', 'CASCADE');
CALL safe_add_foreign_key('transaction_sell_lines',  'fk_tsl_product',        'product_id',     'products',      'id', 'SET NULL');
CALL safe_add_foreign_key('transaction_payments',    'fk_tp_transaction',     'transaction_id', 'transactions',  'id', 'CASCADE');


-- ============================================================
-- PHASE 6: ADD INDEXES FOR PERFORMANCE
-- ============================================================

CALL safe_add_index('transaction_sell_lines', 'idx_tsl_transaction_id', 'transaction_id');
CALL safe_add_index('transaction_sell_lines', 'idx_tsl_product_id',     'product_id');
CALL safe_add_index('transaction_payments',   'idx_tp_transaction_id',  'transaction_id');
CALL safe_add_index('purchase_items',         'idx_pi_purchase_id',     'purchase_id');
CALL safe_add_index('purchase_items',         'idx_pi_product_id',      'product_id');
CALL safe_add_index('quotation_items',        'idx_qi_quotation_id',    'quotation_id');
CALL safe_add_index('stock_in',              'idx_si_product_id',       'product_id');
CALL safe_add_index('stock_in',              'idx_si_purchase_id',      'purchase_id');
CALL safe_add_index('products',              'idx_prod_category',       'category_id');
CALL safe_add_index('products',              'idx_prod_subcategory',    'subcategory_id');
CALL safe_add_index('transactions',          'idx_tx_contact_id',       'contact_id');
CALL safe_add_index('transactions',          'idx_tx_sales_date',       'sales_date');
CALL safe_add_index('purchases',             'idx_pu_vendor_id',        'vendor_id');


-- ============================================================
-- PHASE 7: SEED DATA (IGNORE if already exists)
-- ============================================================

-- Default roles

INSERT IGNORE INTO roles (role_name, description) VALUES
  ('Admin',          'Full system access'),
  ('Branch Manager', 'Manage assigned branch'),
  ('Staff',          'Limited operational access');

-- Default permissions
INSERT IGNORE INTO permissions (module_name, permission_key, description) VALUES
  ('dashboard',  'dashboard.view',      'View dashboard'),
  ('products',   'products.view',       'View products'),
  ('products',   'products.create',     'Create products'),
  ('products',   'products.edit',       'Edit products'),
  ('products',   'products.delete',     'Delete products'),
  ('sales',      'sales.view',          'View sales'),
  ('sales',      'sales.create',        'Create sales'),
  ('sales',      'sales.edit',          'Edit sales'),
  ('sales',      'sales.delete',        'Delete sales'),
  ('quotations', 'quotations.view',     'View quotations'),
  ('quotations', 'quotations.create',   'Create quotations'),
  ('quotations', 'quotations.edit',     'Edit quotations'),
  ('quotations', 'quotations.delete',   'Delete quotations'),
  ('purchases',  'purchases.view',      'View purchases'),
  ('purchases',  'purchases.create',    'Create purchases'),
  ('purchases',  'purchases.edit',      'Edit purchases'),
  ('purchases',  'purchases.delete',    'Delete purchases'),
  ('stock',      'stock.view',          'View stock'),
  ('stock',      'stock.create',        'Create stock entries'),
  ('stock',      'stock.edit',          'Edit stock'),
  ('customers',  'customers.view',      'View customers'),
  ('customers',  'customers.create',    'Create customers'),
  ('customers',  'customers.edit',      'Edit customers'),
  ('customers',  'customers.delete',    'Delete customers'),
  ('vendors',    'vendors.view',        'View vendors'),
  ('vendors',    'vendors.create',      'Create vendors'),
  ('reports',    'reports.view',        'View reports'),
  ('settings',   'settings.view',       'View settings'),
  ('settings',   'settings.edit',       'Edit settings'),
  ('branches',   'branches.view',       'View branches'),
  ('branches',   'branches.create',     'Create branches'),
  ('branches',   'branches.edit',       'Edit branches'),
  ('users',      'users.view',          'View users'),
  ('users',      'users.create',        'Create users'),
  ('users',      'users.edit',          'Edit users'),
  ('users',      'users.delete',        'Delete users');

-- Give Admin ALL permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.role_name = 'Admin';

-- Default branch
INSERT IGNORE INTO branches (branch_name, branch_code, address, status)
VALUES ('Main Branch', 'MAIN', 'Head Office', 'Active');

-- Default admin user (password: admin123, bcrypt hash)
INSERT IGNORE INTO users (username, password, full_name, role_id, branch_id, status)
SELECT 'admin',
       '$2b$10$fouYMqG1LA5oM.iUL3nPNuJxSG08ZMh1Ob4DltRJGFYEQe5yqEvAy',
       'Administrator',
       r.id, b.id, 'Active'
FROM roles r, branches b
WHERE r.role_name = 'Admin' AND b.branch_code = 'MAIN'
LIMIT 1;

-- Default sequences for Main Branch
INSERT IGNORE INTO branch_sequences (branch_id, sequence_type, prefix, last_number)
SELECT b.id, 'sale', 'MAIN', 0 FROM branches b WHERE b.branch_code = 'MAIN';
INSERT IGNORE INTO branch_sequences (branch_id, sequence_type, prefix, last_number)
SELECT b.id, 'quotation', 'MAIN', 0 FROM branches b WHERE b.branch_code = 'MAIN';
INSERT IGNORE INTO branch_sequences (branch_id, sequence_type, prefix, last_number)
SELECT b.id, 'purchase', 'MAIN', 0 FROM branches b WHERE b.branch_code = 'MAIN';


-- ============================================================
-- PHASE 8: CLEANUP HELPER PROCEDURES
-- ============================================================

DROP PROCEDURE IF EXISTS safe_add_column;
DROP PROCEDURE IF EXISTS safe_add_index;
DROP PROCEDURE IF EXISTS safe_add_foreign_key;


-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Summary of tables (31 total):
--   categories, subcategories, brand, products,
--   customers, vendors,
--   purchases, purchase_items,
--   stocks, stock_in,
--   quotations, quotation_items,
--   demo_quotations, demo_quotation_items,
--   transactions, transaction_sell_lines, transaction_payments,
--   tax_modules, tax_groups, tax_group_taxes,
--   primary_units, secondary_units,
--   company_settings, business_location,
--   branches, roles, permissions, role_permissions,
--   users, invoice_settings, branch_sequences
-- ============================================================
