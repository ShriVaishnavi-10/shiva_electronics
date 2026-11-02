const db = require('./backend/config/db');

db.query(`
  ALTER TABLE purchase_items 
  ADD COLUMN tax_group_id INT NULL DEFAULT NULL
`, (err, results) => {
  if (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist.');
    } else {
      console.error('Error altering purchase_items:', err);
    }
  } else {
    console.log('Added tax_group_id column to purchase_items successfully!');
  }
  
  db.query('DESCRIBE purchase_items', (err2, cols) => {
    if (err2) {
      console.error(err2);
    } else {
      console.table(cols);
    }
    process.exit(0);
  });
});
