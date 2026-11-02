const db = require("c:\\Users\\RAJU\\OneDrive\\Desktop\\CTW PROJECTS\\sri_ram2\\backend\\config\\db");
db.query("SELECT * FROM motor_spec_items", (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log(rows);
  }
  process.exit();
});
