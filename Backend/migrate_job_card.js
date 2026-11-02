const db = require("c:\\Users\\RAJU\\OneDrive\\Desktop\\CTW PROJECTS\\sri_ram2\\backend\\config\\db");
db.query("UPDATE job_card_items SET item_key = label WHERE item_key IS NULL", (err, result) => {
  if (err) {
    console.error("Migration failed:", err);
  } else {
    console.log("Migration successful, updated rows:", result.affectedRows);
  }
  process.exit();
});
