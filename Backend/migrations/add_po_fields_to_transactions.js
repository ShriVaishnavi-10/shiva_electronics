const db = require("../config/db");

async function ensurePoFieldsColumns() {
  const queryAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  };

  const columnsToAdd = [
    { name: "po_no", type: "VARCHAR(100) NULL" },
    { name: "po_date", type: "DATE NULL" },
    { name: "transport_mode", type: "VARCHAR(100) DEFAULT 'By Road'" },
  ];

  try {
    for (const col of columnsToAdd) {
      const existing = await queryAsync(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = ?`,
        [col.name]
      );

      if (existing.length === 0) {
        await queryAsync(`ALTER TABLE transactions ADD COLUMN \`${col.name}\` ${col.type}`);
        console.log(`Added column ${col.name} to transactions table`);
      }
    }
  } catch (err) {
    console.error("Error ensuring po fields columns:", err.message);
  }
}

// Auto-run non-blocking when required
ensurePoFieldsColumns().catch(() => {});

module.exports = { ensurePoFieldsColumns };

if (require.main === module) {
  ensurePoFieldsColumns()
    .then(() => {
      console.log("PO fields migration completed successfully!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

