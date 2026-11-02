const db = require("./config/db");

db.query("ALTER TABLE transactions DROP COLUMN vehicle_no", (err, result) => {
  if (err) console.error("Error dropping vehicle_no:", err.message);
  else console.log("Dropped vehicle_no");

  db.query("ALTER TABLE transactions DROP COLUMN transport_type", (err, result) => {
    if (err) console.error("Error dropping transport_type:", err.message);
    else console.log("Dropped transport_type");

    db.query("ALTER TABLE transactions DROP COLUMN transport_charges", (err, result) => {
      if (err) console.error("Error dropping transport_charges:", err.message);
      else console.log("Dropped transport_charges");

      console.log("Done.");
      process.exit();
    });
  });
});
