const db = require("c:\\Users\\RAJU\\OneDrive\\Desktop\\CTW PROJECTS\\sri_ram2\\backend\\config\\db");
db.query("DESCRIBE service_job_cards", (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log(rows);
  }
  process.exit();
});
