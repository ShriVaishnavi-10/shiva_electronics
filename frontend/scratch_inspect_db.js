const db = require('./backend/config/db');

db.query(`
  ALTER TABLE products 
  ADD COLUMN discount_percent DECIMAL(5,2) DEFAULT 0.00 NULL
`, (err, results) => {
  if (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('discount_percent column already exists.');
    } else {
      console.error('Error altering products:', err);
    }
  } else {
    console.log('Added discount_percent column successfully!');
  }
  
  db.query('DESCRIBE products', (err2, cols) => {
    if (err2) {
      console.error(err2);
    } else {
      console.table(cols);
    }
    process.exit(0);
  });
});
