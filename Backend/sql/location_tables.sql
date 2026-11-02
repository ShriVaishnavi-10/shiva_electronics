-- Business Location table
CREATE TABLE IF NOT EXISTS business_location (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location_id VARCHAR(50) NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  branch_id INT NOT NULL,
  landmark VARCHAR(255) NULL,
  state VARCHAR(100) NULL,
  city VARCHAR(100) NULL,
  zip_code VARCHAR(20) NULL,
  mobile VARCHAR(20) NULL,
  alternate_number VARCHAR(20) NULL,
  email VARCHAR(255) NULL,
  images VARCHAR(1000) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- If table already exists, add branch_id column safely (run once):
-- ALTER TABLE business_location ADD COLUMN IF NOT EXISTS branch_id INT NOT NULL;

-- If table already exists, add images column:
-- ALTER TABLE business_location ADD COLUMN images VARCHAR(1000) NULL AFTER email;
