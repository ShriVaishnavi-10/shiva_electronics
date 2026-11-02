-- Add secondary_unit to transaction_sell_lines (sales line items)
ALTER TABLE transaction_sell_lines ADD COLUMN secondary_unit VARCHAR(50) NULL AFTER unit;
