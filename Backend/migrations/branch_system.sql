
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
) ENGINE=InnoDB;

-- 2. ROLES
CREATE TABLE IF NOT EXISTS roles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  role_name   VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. PERMISSIONS
CREATE TABLE IF NOT EXISTS permissions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  module_name     VARCHAR(50) NOT NULL,
  permission_key  VARCHAR(80) NOT NULL UNIQUE,
  description     VARCHAR(255)
) ENGINE=InnoDB;

-- 4. ROLE ↔ PERMISSION mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  role_id       INT NOT NULL,
  permission_id INT NOT NULL,
  UNIQUE KEY uq_role_perm (role_id, permission_id),
  FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. ALTER USERS TABLE (add branch, role, auth fields)
--    If users table doesn't exist yet, create it; otherwise ALTER.
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  full_name   VARCHAR(150),
  email       VARCHAR(150),
  phone       VARCHAR(20),
  role_id     INT,
  branch_id   INT,
  status      ENUM('Active','Inactive') DEFAULT 'Active',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id)   REFERENCES roles(id)    ON DELETE SET NULL,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Add columns if they don't exist (safe for existing users table)
-- Run these one at a time if your MySQL version doesn't support IF NOT EXISTS on ALTER
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id   INT AFTER phone;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id INT AFTER role_id;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150) AFTER password;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS email     VARCHAR(150) AFTER full_name;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS phone     VARCHAR(20) AFTER email;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS status    ENUM('Active','Inactive') DEFAULT 'Active' AFTER branch_id;

-- 6. INVOICE SETTINGS (per branch)
CREATE TABLE IF NOT EXISTS invoice_settings (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  branch_id     INT,
  company_name  VARCHAR(200),
  address       TEXT,
  city          VARCHAR(100),
  state         VARCHAR(100),
  pincode       VARCHAR(10),
  phone         VARCHAR(20),
  email         VARCHAR(150),
  gst_no        VARCHAR(20),
  pan_no        VARCHAR(20),
  logo_url      VARCHAR(500),
  terms         TEXT,
  bank_name     VARCHAR(150),
  account_no    VARCHAR(50),
  ifsc_code     VARCHAR(20),
  upi_id        VARCHAR(100),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. BRANCH INVOICE SEQUENCES (auto-increment per branch per type)
CREATE TABLE IF NOT EXISTS branch_sequences (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  branch_id     INT NOT NULL,
  sequence_type ENUM('sale','quotation','purchase') NOT NULL,
  prefix        VARCHAR(100) DEFAULT '',
  last_number   INT DEFAULT 0,
  UNIQUE KEY uq_branch_seq (branch_id, sequence_type),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA
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

-- Default admin user (password: admin123)
-- bcrypt hash of 'admin123'
INSERT IGNORE INTO users (username, password, full_name, role_id, branch_id, status)
SELECT 'admin', '$2b$10$fouYMqG1LA5oM.iUL3nPNuJxSG08ZMh1Ob4DltRJGFYEQe5yqEvAy', 'Administrator',
  r.id, b.id, 'Active'
FROM roles r, branches b
WHERE r.role_name = 'Admin' AND b.branch_code = 'MAIN'
LIMIT 1;
