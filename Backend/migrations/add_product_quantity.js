const db = require("../config/db");

async function ensureProductQuantityColumn() {
  const queryAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  };

  try {
    const existing = await queryAsync(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'quantity'`
    );

    if (existing.length === 0) {
      await queryAsync(`ALTER TABLE products ADD COLUMN \`quantity\` DECIMAL(12,3) NULL DEFAULT 0.000 AFTER \`min_order_quantity\``);
      console.log("Added quantity column to products table.");
    }
  } catch (err) {
    console.error("ensureProductQuantityColumn error:", err);
  }
}

if (require.main === module) {
  ensureProductQuantityColumn()
    .then(() => {
      console.log("Product quantity migration completed successfully!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

module.exports = { ensureProductQuantityColumn };

