-- Add tax_group_id column to transactions to link a sale with a tax group
ALTER TABLE transactions
  ADD COLUMN tax_group_id INT NULL AFTER discount_amount;

