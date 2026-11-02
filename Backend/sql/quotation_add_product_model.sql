-- Add product_model column to quotation_items to store model/brand/size text per line.

ALTER TABLE quotation_items
  ADD COLUMN product_model VARCHAR(255) NULL AFTER product_name;

