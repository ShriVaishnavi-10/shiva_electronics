const db = require("../backend/config/db");

async function run() {
  try {
    const [p] = await db.promise().query("SELECT id, purchase_no, purchase_date FROM purchases");
    console.log("=== EXISTING PURCHASES ===");
    console.log(p);

    const [inv] = await db.promise().query("SELECT * FROM invoice_no WHERE bill_type = 'purchase'");
    console.log("=== INVOICE NO COUNTERS ===");
    console.log(inv);

    // Update prefix in branch_sequences to 'SREE-'
    await db.promise().query(
      "UPDATE branch_sequences SET prefix = 'SREE-' WHERE branch_id = 2 AND sequence_type = 'purchase'"
    );
    console.log("Prefix updated successfully to 'SREE-' for purchase sequence");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
