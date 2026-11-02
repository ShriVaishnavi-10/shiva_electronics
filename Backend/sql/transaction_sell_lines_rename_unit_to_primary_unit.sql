-- Rename unit column to primary_unit in transaction_sell_lines
ALTER TABLE transaction_sell_lines CHANGE COLUMN unit primary_unit VARCHAR(20) NULL DEFAULT 'pcs';
