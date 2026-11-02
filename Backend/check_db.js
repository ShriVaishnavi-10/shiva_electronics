const db = require("./config/db");

async function check() {
  try {
    const [rows] = await db.promise().query("SHOW COLUMNS FROM services LIKE 'dynamic_person_details'");
    if (rows.length === 0) {
      console.log("Adding column dynamic_person_details...");
      await db.promise().query("ALTER TABLE services ADD COLUMN dynamic_person_details LONGTEXT");
      console.log("Column added.");
    } else {
      console.log("Column dynamic_person_details already exists.");
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
