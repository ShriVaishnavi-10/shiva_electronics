-- Company Settings table - Run this in your MySQL database
CREATE TABLE IF NOT EXISTS company_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255),
    gst_no VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    branch VARCHAR(100),
    company_logo VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TINYINT DEFAULT 1
);

-- Optional: Add updated_at column and FULLTEXT index later
-- ALTER TABLE company_settings ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
-- ALTER TABLE company_settings ADD FULLTEXT(`id`, `company_logo`, `company_name`, `gst_no`, `address`, `city`, `state`, `branch`, `country`, `created_at`, `updated_at`);