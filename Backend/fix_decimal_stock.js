const db = require("./config/db");
const dbPromise = db.promise();

async function fixStockColumns() {
  try {
    console.log("Checking and updating products.qty column...");
    await dbPromise.query("ALTER TABLE products MODIFY COLUMN qty DECIMAL(12,3) DEFAULT 0.000");
    console.log("Updated products.qty to DECIMAL(12,3)");

    console.log("Checking and updating stocks.quantity column...");
    // Check if stocks table exists first
    const [tables] = await dbPromise.query("SHOW TABLES LIKE 'stocks'");
    if (tables.length > 0) {
      await dbPromise.query("ALTER TABLE stocks MODIFY COLUMN quantity DECIMAL(12,3) DEFAULT 0.000");
      console.log("Updated stocks.quantity to DECIMAL(12,3)");
    } else {
      console.log("Stocks table not found, skipping.");
    }

    console.log("All updates completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

fixStockColumns();
