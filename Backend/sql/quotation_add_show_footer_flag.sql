-- Add a flag to indicate whether to show price totals/footer on quotations
ALTER TABLE quotations
  ADD COLUMN show_price_totals TINYINT(1) NULL DEFAULT 0 AFTER notes;

