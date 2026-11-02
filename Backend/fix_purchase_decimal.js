const db = require("./config/db");
const dbPromise = db.promise();

async function fixPurchaseColumns() {
  try {
    console.log("Checking and updating purchase_items.qty column...");
    await dbPromise.query("ALTER TABLE purchase_items MODIFY COLUMN qty DECIMAL(12,3) DEFAULT 1.000");
    console.log("Updated purchase_items.qty to DECIMAL(12,3)");

    console.log("Checking and updating stock_in.qty column...");
    await dbPromise.query("ALTER TABLE stock_in MODIFY COLUMN qty DECIMAL(12,3) DEFAULT 0.000");
    console.log("Updated stock_in.qty to DECIMAL(12,3)");

    console.log("All updates completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

fixPurchaseColumns();
