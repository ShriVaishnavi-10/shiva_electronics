-- Run this to add rate_1, rate_2, rate_3, rate_4 to existing quotation_items table
ALTER TABLE quotation_items
  ADD COLUMN rate_1 DECIMAL(12,2) NULL AFTER qty,
  ADD COLUMN rate_2 DECIMAL(12,2) NULL AFTER rate_1,
  ADD COLUMN rate_3 DECIMAL(12,2) NULL AFTER rate_2,
  ADD COLUMN rate_4 DECIMAL(12,2) NULL AFTER rate_3;
