const db = require("c:\\Users\\RAJU\\OneDrive\\Desktop\\CTW PROJECTS\\sri_ram2\\backend\\config\\db");

db.query("SELECT id, motor_details FROM receipts WHERE motor_details IS NOT NULL", (err, rows) => {
  if (err) {
    console.error(err);
    process.exit();
  }
  
  let updatedCount = 0;
  let processed = 0;
  
  if (rows.length === 0) {
    console.log("No receipts found with motor_details.");
    process.exit();
  }
  
  rows.forEach((row) => {
    try {
      let details = typeof row.motor_details === 'string' ? JSON.parse(row.motor_details) : row.motor_details;
      if (details && details.hasOwnProperty('null')) {
        // rename key 'null' to 'pulley' since they selected pulley
        details['pulley'] = details['null'];
        delete details['null'];
        
        db.query(
          "UPDATE receipts SET motor_details = ? WHERE id = ?",
          [JSON.stringify(details), row.id],
          (updateErr) => {
            if (updateErr) console.error("Update error for ID", row.id, updateErr);
            processed++;
            updatedCount++;
            if (processed === rows.length) {
              console.log(`Cleaned up JSON. Updated receipts count: ${updatedCount}`);
              process.exit();
            }
          }
        );
      } else {
        processed++;
        if (processed === rows.length) {
          console.log(`Cleaned up JSON. Updated receipts count: ${updatedCount}`);
          process.exit();
        }
      }
    } catch (e) {
      console.error("Parse error for ID", row.id, e);
      processed++;
      if (processed === rows.length) {
        console.log(`Cleaned up JSON. Updated receipts count: ${updatedCount}`);
        process.exit();
      }
    }
  });
});
