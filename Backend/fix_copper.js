const db = require("./config/db");

async function fix() {
  db.query("UPDATE products SET qty = 1.4 WHERE id = 1", (err) => {
    if (err) throw err;
    console.log("Fixed products.qty to 1.4 for copper");
    process.exit(0);
  });
}

fix();
