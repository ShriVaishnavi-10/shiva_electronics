const db = require("./config/db");

async function check() {
  try {
    const [rows] = await db.promise().query("SELECT id, receipt_no, dynamic_person_details FROM services ORDER BY id DESC LIMIT 5");
    console.log("Last 5 receipts person details:");
    rows.forEach(r => {
      console.log(`ID: ${r.id}, Receipt: ${r.receipt_no}`);
      console.log(`Details: ${r.dynamic_person_details ? r.dynamic_person_details.substring(0, 100) + '...' : 'NULL'}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
