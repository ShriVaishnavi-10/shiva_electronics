const db = require("../backend/config/db");

async function check() {
  try {
    const [b] = await db.promise().query("SELECT * FROM branches");
    console.log("=== BRANCHES ===");
    console.log(b);

    const [seq] = await db.promise().query("SELECT * FROM branch_sequences");
    console.log("=== BRANCH SEQUENCES ===");
    console.log(seq);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
