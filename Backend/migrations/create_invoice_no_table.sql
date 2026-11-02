-- Per-branch document counters. Numbers are driven by Branch → Invoice Number Settings
-- (branch_sequences prefix + start_number) and continued in this table.
--
-- bill_type (match branch_sequences.sequence_type):
--   sale        — sales invoice
--   quotation   — quotations
--   purchase    — purchase bills
--   receipt     — receipts
--
-- serial_no = last issued numeric suffix for that branch + bill_type.
-- First issued number = max(serial_no + 1, start_number from branch settings).

CREATE TABLE IF NOT EXISTS invoice_no (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  bill_type VARCHAR(50) NOT NULL,
  serial_no INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_invoice_no_branch_bill (branch_id, bill_type),
  CONSTRAINT fk_invoice_no_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed from existing branch_sequences so counters stay in sync.
INSERT IGNORE INTO invoice_no (branch_id, bill_type, serial_no)
SELECT branch_id, sequence_type, COALESCE(last_number, 0)
FROM branch_sequences;
