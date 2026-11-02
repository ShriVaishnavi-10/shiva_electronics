-- Add primary_unit and secondary_unit columns to products table.
-- Run this migration on your MySQL database before using the new fields.

ALTER TABLE products
  ADD COLUMN primary_unit VARCHAR(50) NULL AFTER unit,
  ADD COLUMN secondary_unit VARCHAR(50) NULL AFTER primary_unit;

