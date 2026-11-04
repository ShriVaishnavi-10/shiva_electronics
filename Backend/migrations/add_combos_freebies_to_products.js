const db = require("../config/db");

async function ensureProductCombosAndFreebiesColumns() {
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
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME IN ('combos', 'freebies')`
    );
    const existingCols = existing.map((r) => r.COLUMN_NAME.toLowerCase());

    if (!existingCols.includes("combos")) {
      await queryAsync(`ALTER TABLE products ADD COLUMN \`combos\` JSON NULL AFTER \`specifications\``);
      console.log("Added combos column to products table.");
    }

    if (!existingCols.includes("freebies")) {
      await queryAsync(`ALTER TABLE products ADD COLUMN \`freebies\` JSON NULL AFTER \`combos\``);
      console.log("Added freebies column to products table.");
    }
  } catch (err) {
    console.error("ensureProductCombosAndFreebiesColumns error:", err);
  }
}

if (require.main === module) {
  ensureProductCombosAndFreebiesColumns()
    .then(() => {
      console.log("Product combos and freebies migration completed successfully!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

module.exports = { ensureProductCombosAndFreebiesColumns };

