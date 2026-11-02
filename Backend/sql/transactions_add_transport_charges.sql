-- Add transport charges on sale header (run once on existing DBs)
ALTER TABLE transactions
  ADD COLUMN transport_charges DECIMAL(12,2) NOT NULL DEFAULT 0;
