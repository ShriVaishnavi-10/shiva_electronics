-- Add GST + Bank Details fields to business_location table
-- Run this once on your database.

ALTER TABLE business_location
  ADD COLUMN gst_no VARCHAR(50) NULL AFTER email,
  ADD COLUMN account_holder VARCHAR(150) NULL AFTER gst_no,
  ADD COLUMN bank_name VARCHAR(150) NULL AFTER account_holder,
  ADD COLUMN account_number VARCHAR(50) NULL AFTER bank_name,
  ADD COLUMN branch VARCHAR(150) NULL AFTER account_number,
  ADD COLUMN ifsc_code VARCHAR(20) NULL AFTER branch;

