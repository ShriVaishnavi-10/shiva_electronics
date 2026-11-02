-- Add transport charges on quotation header (run once; ignore error if column already exists)
ALTER TABLE quotations
  ADD COLUMN transport_charges DECIMAL(12,2) NOT NULL DEFAULT 0;
