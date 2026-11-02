-- Add unit column to transaction_sell_lines for sales form
ALTER TABLE transaction_sell_lines ADD COLUMN unit VARCHAR(20) NULL DEFAULT 'pcs' AFTER quantity;
