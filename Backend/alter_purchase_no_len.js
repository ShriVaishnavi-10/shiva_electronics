const db = require('./config/db');

async function run() {
  try {
    console.log("Altering purchases table purchase_no column to VARCHAR(100)...");
    await db.promise().query("ALTER TABLE purchases MODIFY COLUMN purchase_no VARCHAR(100) NULL");
    console.log("purchases table altered successfully.");

    console.log("Altering branch_sequences table prefix column to VARCHAR(100)...");
    await db.promise().query("ALTER TABLE branch_sequences MODIFY COLUMN prefix VARCHAR(100) NULL");
    console.log("branch_sequences table altered successfully.");

    console.log("All migrations ran successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
