CREATE TABLE IF NOT EXISTS daily_cash_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  opening_balance DECIMAL(12,2) DEFAULT 0.00,
  cash_sales DECIMAL(12,2) DEFAULT 0.00,
  cash_purchases DECIMAL(12,2) DEFAULT 0.00,
  cash_expenses DECIMAL(12,2) DEFAULT 0.00,
  service_cash_in DECIMAL(12,2) DEFAULT 0.00,
  closing_balance DECIMAL(12,2) DEFAULT 0.00,
  actual_cash DECIMAL(12,2) DEFAULT 0.00,
  difference DECIMAL(12,2) DEFAULT 0.00,
  notes TEXT,
  status ENUM('Open', 'Closed') DEFAULT 'Open',
  closed_at TIMESTAMP NULL,
  branch_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_date_branch (date, branch_id)
);
