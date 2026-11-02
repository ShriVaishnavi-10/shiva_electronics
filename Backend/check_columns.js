const db = require("./config/db");

db.query(
  `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
   FROM information_schema.columns 
   WHERE table_schema = ? 
     AND (column_name LIKE '%_no%' OR column_name LIKE '%_number%' OR column_name LIKE '%code%' OR column_name LIKE '%prefix%')`,
  [process.env.DB_NAME || 'sriram'],
  (err, result) => {
    if (err) {
      console.error(err);
    } else {
      console.table(result);
    }
    process.exit();
  }
);
