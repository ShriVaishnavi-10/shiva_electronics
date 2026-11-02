const db = require("./config/db");

async function check() {
  try {
    const [inv] = await db.promise().query("SELECT * FROM invoice_no");
    console.log("invoice_no rows:", inv);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
