const db = require("../config/db");

async function ensureCustomerStateColumn() {
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
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'state'`
    );

    if (existing.length === 0) {
      await queryAsync(`ALTER TABLE customers ADD COLUMN \`state\` VARCHAR(100) DEFAULT 'Tamil Nadu' AFTER \`city\``);
    }
  } catch (err) {
    // Silent catch during startup
  }
}

if (require.main === module) {
  ensureCustomerStateColumn()
    .then(() => {
      console.log("Customer state migration completed successfully!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

module.exports = { ensureCustomerStateColumn };
