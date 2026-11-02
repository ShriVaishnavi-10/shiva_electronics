const db = require("./backend/config/db");

async function check() {
  try {
    const [pcols] = await db.promise().query("SHOW COLUMNS FROM payments");
    console.log("=== payments COLUMNS ===");
    console.log(pcols);

    const [acols] = await db.promise().query("SHOW COLUMNS FROM advance_amount");
    console.log("=== advance_amount COLUMNS ===");
    console.log(acols);

    const [prows] = await db.promise().query("SELECT * FROM payments ORDER BY id DESC LIMIT 5");
    console.log("=== payments LATEST ROWS ===");
    console.log(prows);

    const [arows] = await db.promise().query("SELECT * FROM advance_amount ORDER BY id DESC LIMIT 5");
    console.log("=== advance_amount LATEST ROWS ===");
    console.log(arows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
