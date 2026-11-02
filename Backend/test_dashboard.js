const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sriram'
  });
  
  const [s] = await db.query('SELECT id, receipt_no, total_amount, taxable_amount FROM services');
  const [aa] = await db.query('SELECT * FROM advance_amount');
  const [p] = await db.query('SELECT * FROM payments');
  
  console.log('Services:', s);
  console.log('Advance:', aa);
  console.log('Payments:', p);
  process.exit();
}

run();
