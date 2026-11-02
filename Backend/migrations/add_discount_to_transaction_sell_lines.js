const db = require("../config/db");

async function migrate() {
  console.log("=== Running migration: add discount_type and discount_amount to transaction_sell_lines ===");

  db.query("DESCRIBE transaction_sell_lines", (err, rows) => {
    if (err) {
      console.error("Error describing transaction_sell_lines:", err);
      process.exit(1);
    }

    const fields = rows.map((r) => r.Field);
    const alterStatements = [];

    if (!fields.includes("discount_type")) {
      alterStatements.push("ADD COLUMN discount_type VARCHAR(20) NOT NULL DEFAULT 'fixed'");
    }
    if (!fields.includes("discount_amount")) {
      alterStatements.push("ADD COLUMN discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00");
    }

    if (!alterStatements.length) {
      console.log("Columns already exist on transaction_sell_lines. Migration not needed.");
      process.exit(0);
    }

    const sql = `ALTER TABLE transaction_sell_lines ${alterStatements.join(", ")}`;
    console.log("Executing SQL:", sql);

    db.query(sql, (alterErr) => {
      if (alterErr) {
        console.error("Migration failed:", alterErr);
        process.exit(1);
      }
      console.log("✅ Successfully added discount_type and discount_amount to transaction_sell_lines!");
      process.exit(0);
    });
  });
}

migrate();
