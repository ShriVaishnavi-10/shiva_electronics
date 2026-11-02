-- Run this to remove old columns from quotation_items (HSN Code, Base Price, Margin %, Rate, Discount, Total)
-- Run quotation_add_rate_columns.sql first if rate_1..rate_4 don't exist
-- DROP COLUMN IF EXISTS requires MySQL 8.0.23+; for older MySQL, remove "IF EXISTS" and run each ALTER separately

ALTER TABLE quotation_items DROP COLUMN IF EXISTS hsncode;
ALTER TABLE quotation_items DROP COLUMN IF EXISTS base_price;
ALTER TABLE quotation_items DROP COLUMN IF EXISTS margin_percent;
ALTER TABLE quotation_items DROP COLUMN IF EXISTS rate;
ALTER TABLE quotation_items DROP COLUMN IF EXISTS discount;
ALTER TABLE quotation_items DROP COLUMN IF EXISTS total;
ALTER TABLE quotation_items DROP COLUMN IF EXISTS thickness;
ALTER TABLE quotation_items DROP COLUMN IF EXISTS sqft;
