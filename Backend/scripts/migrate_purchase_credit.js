const db = require('../config/db');

async function migrate() {
  console.log("Starting migration for Purchase Credit, PO No, Cheque, and Collection Person...");
  const [colsPurchases] = await db.promise().query("SHOW COLUMNS FROM purchases");
  const pCols = colsPurchases.map((c) => c.Field);
  console.log("Current purchases cols:", pCols);

  if (!pCols.includes("po_no")) {
    await db.promise().query("ALTER TABLE purchases ADD COLUMN po_no VARCHAR(100) NULL AFTER purchase_no");
    console.log("Added po_no to purchases");
  }
  if (!pCols.includes("paid_amount")) {
    await db.promise().query("ALTER TABLE purchases ADD COLUMN paid_amount DECIMAL(12,2) DEFAULT 0.00 AFTER payment_type");
    console.log("Added paid_amount to purchases");
  }
  if (!pCols.includes("due_amount")) {
    await db.promise().query("ALTER TABLE purchases ADD COLUMN due_amount DECIMAL(12,2) DEFAULT 0.00 AFTER paid_amount");
    console.log("Added due_amount to purchases");
  }
  if (!pCols.includes("payment_status")) {
    await db.promise().query("ALTER TABLE purchases ADD COLUMN payment_status VARCHAR(20) DEFAULT 'paid' AFTER due_amount");
    console.log("Added payment_status to purchases");
  }
  if (!pCols.includes("due_date")) {
    await db.promise().query("ALTER TABLE purchases ADD COLUMN due_date DATE NULL AFTER payment_status");
    console.log("Added due_date to purchases");
  }

  const [colsVp] = await db.promise().query("SHOW COLUMNS FROM vendor_payments");
  const vpCols = colsVp.map((c) => c.Field);
  console.log("Current vendor_payments cols:", vpCols);

  if (!vpCols.includes("purchase_id")) {
    await db.promise().query("ALTER TABLE vendor_payments ADD COLUMN purchase_id INT NULL AFTER vendor_id");
    console.log("Added purchase_id to vendor_payments");
  }
  if (!vpCols.includes("cheque_no")) {
    await db.promise().query("ALTER TABLE vendor_payments ADD COLUMN cheque_no VARCHAR(50) NULL AFTER reference_no");
    console.log("Added cheque_no to vendor_payments");
  }
  if (!vpCols.includes("cheque_date")) {
    await db.promise().query("ALTER TABLE vendor_payments ADD COLUMN cheque_date DATE NULL AFTER cheque_no");
    console.log("Added cheque_date to vendor_payments");
  }
  if (!vpCols.includes("collection_person")) {
    await db.promise().query("ALTER TABLE vendor_payments ADD COLUMN collection_person VARCHAR(150) NULL AFTER cheque_date");
    console.log("Added collection_person to vendor_payments");
  }

  // Backfill existing purchases
  await db.promise().query(`
    UPDATE purchases p
    LEFT JOIN (
      SELECT purchase_id, SUM(total) as item_total
      FROM purchase_items
      GROUP BY purchase_id
    ) it ON it.purchase_id = p.id
    SET 
      p.paid_amount = CASE 
        WHEN LOWER(COALESCE(p.payment_type, '')) = 'credit' THEN 0.00
        ELSE (COALESCE(it.item_total, 0) + COALESCE(p.transport_charges, 0))
      END,
      p.due_amount = CASE 
        WHEN LOWER(COALESCE(p.payment_type, '')) = 'credit' THEN (COALESCE(it.item_total, 0) + COALESCE(p.transport_charges, 0))
        ELSE 0.00
      END,
      p.payment_status = CASE 
        WHEN LOWER(COALESCE(p.payment_type, '')) = 'credit' THEN 'due'
        ELSE 'paid'
      END
    WHERE p.paid_amount IS NULL OR (p.paid_amount = 0.00 AND LOWER(COALESCE(p.payment_type, '')) != 'credit')
  `);
  console.log("Updated existing purchases paid/due status");

  console.log("Migration completed successfully!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

