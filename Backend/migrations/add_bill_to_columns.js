const db = require("../config/db");

async function ensureBillToColumns() {
  const queryAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  };

  const columnsToAdd = [
    { name: "bill_to_company_name", type: "VARCHAR(255) NULL" },
    { name: "bill_to_customer_name", type: "VARCHAR(255) NULL" },
    { name: "bill_to_phone", type: "VARCHAR(50) NULL" },
    { name: "bill_to_address", type: "TEXT NULL" },
    { name: "bill_to_gstin", type: "VARCHAR(50) NULL" },
    { name: "bill_to_state", type: "VARCHAR(100) NULL" },
    { name: "bill_to_state_code", type: "VARCHAR(20) NULL" },
    { name: "bill_to_place_of_supply", type: "VARCHAR(100) NULL" },
    { name: "bill_to_place_of_supply_state_code", type: "VARCHAR(20) NULL" },
    { name: "vehicle_no", type: "VARCHAR(100) NULL" },
  ];

  try {
    for (const col of columnsToAdd) {
      const existing = await queryAsync(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = ?`,
        [col.name]
      );

      if (existing.length === 0) {
        await queryAsync(`ALTER TABLE transactions ADD COLUMN \`${col.name}\` ${col.type}`);
      }
    }
  } catch (err) {
    // Silent catch during startup
  }
}

if (require.main === module) {
  ensureBillToColumns()
    .then(() => {
      console.log("Bill To migration completed successfully!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

module.exports = { ensureBillToColumns };
