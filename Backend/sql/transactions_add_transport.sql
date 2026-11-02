-- Add Transport Details columns to transactions table
-- Run this once on your database.

ALTER TABLE transactions ADD COLUMN vehicle_no VARCHAR(100) NULL AFTER final_amount;
ALTER TABLE transactions ADD COLUMN transport_type VARCHAR(100) NULL AFTER vehicle_no;
