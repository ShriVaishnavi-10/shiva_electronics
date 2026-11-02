const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.query('DESCRIBE products', (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('PRODUCTS TABLE:');
  console.table(rows);
  
  db.query('DESCRIBE transaction_sell_lines', (err2, rows2) => {
    if (err2) {
      console.error(err2);
      process.exit(1);
    }
    console.log('SELL LINES TABLE:');
    console.table(rows2);
    db.end();
  });
});
