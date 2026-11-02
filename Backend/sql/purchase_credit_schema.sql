-- Purchase Credit, PO Number, Cheque, and Collection Person Migration
ALTER TABLE purchases 
  ADD COLUMN po_no VARCHAR(100) NULL AFTER purchase_no,
  ADD COLUMN paid_amount DECIMAL(12,2) DEFAULT 0.00 AFTER payment_type,
  ADD COLUMN due_amount DECIMAL(12,2) DEFAULT 0.00 AFTER paid_amount,
  ADD COLUMN payment_status VARCHAR(20) DEFAULT 'paid' AFTER due_amount,
  ADD COLUMN due_date DATE NULL AFTER payment_status;

ALTER TABLE vendor_payments 
  ADD COLUMN purchase_id INT NULL AFTER vendor_id,
  ADD COLUMN cheque_no VARCHAR(50) NULL AFTER reference_no,
  ADD COLUMN cheque_date DATE NULL AFTER cheque_no,
  ADD COLUMN collection_person VARCHAR(150) NULL AFTER cheque_date;

