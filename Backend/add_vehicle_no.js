// Adds transactions.vehicle_no if it does not exist. Safe to run repeatedly.
const db = require("./config/db");

db.query(
  `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'vehicle_no'`,
  (err, rows) => {
    if (err) {
      console.error("Check failed:", err.message);
      return process.exit(1);
    }
    if (rows[0].c > 0) {
      console.log("vehicle_no already exists - nothing to do.");
      return process.exit(0);
    }
    db.query("ALTER TABLE transactions ADD COLUMN vehicle_no VARCHAR(100) NULL", (e2) => {
      if (e2) {
        console.error("Alter failed:", e2.message);
        return process.exit(1);
      }
      console.log("Added transactions.vehicle_no");
      process.exit(0);
    });
  },
);
