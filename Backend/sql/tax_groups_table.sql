-- Tax Groups: combination of multiple taxes (references tax_modules)
CREATE TABLE IF NOT EXISTS tax_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Junction: which tax modules belong to a tax group
CREATE TABLE IF NOT EXISTS tax_group_taxes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tax_group_id INT NOT NULL,
  tax_module_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_group_tax (tax_group_id, tax_module_id),
  FOREIGN KEY (tax_group_id) REFERENCES tax_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (tax_module_id) REFERENCES tax_modules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
