const db = require("../config/db");

async function ensurePurchaseChargesColumns() {
  const queryAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  };

  const columnsToAdd = [
    { name: "vehicle_no", type: "VARCHAR(100) NULL" },
    { name: "transport_charges", type: "DECIMAL(12, 2) DEFAULT 0" },
    { name: "additional_charges", type: "LONGTEXT NULL" },
  ];

  try {
    for (const col of columnsToAdd) {
      const existing = await queryAsync(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchases' AND COLUMN_NAME = ?`,
        [col.name]
      );

      if (existing.length === 0) {
        await queryAsync(`ALTER TABLE purchases ADD COLUMN \`${col.name}\` ${col.type}`);
      }
    }
  } catch (err) {
    console.error("Error ensuring purchase charges columns:", err.message);
  }
}

// Auto-run non-blocking when required
ensurePurchaseChargesColumns().catch(() => {});

module.exports = { ensurePurchaseChargesColumns };

if (require.main === module) {
  ensurePurchaseChargesColumns()
    .then(() => {
      console.log("Purchase charges migration completed successfully!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

