const db = require("c:\\Users\\RAJU\\OneDrive\\Desktop\\CTW PROJECTS\\sri_ram2\\backend\\config\\db");
db.query("ALTER TABLE service_job_cards ADD COLUMN `round` VARCHAR(50) DEFAULT NULL", (err, result) => {
  if (err) {
    console.error("Alter table error:", err.message);
  } else {
    console.log("Alter table successful!");
  }
  process.exit();
});
