-- Run in your MySQL database if vendors table needs new columns.

-- Add vendor_id column (auto-generated format VND-0001, VND-0002, ...)
-- ALTER TABLE vendors ADD COLUMN vendor_id VARCHAR(20) NULL UNIQUE;

-- Add vendor_type column (Distributor, Wholesaler, Retailer)
-- ALTER TABLE vendors ADD COLUMN vendor_type VARCHAR(50) NULL;

-- Add status column (Active, Inactive)
-- ALTER TABLE vendors ADD COLUMN status VARCHAR(20) NULL DEFAULT 'Active';
