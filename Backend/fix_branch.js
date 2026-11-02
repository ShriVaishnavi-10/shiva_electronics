const db = require('./config/db');
db.promise().query("UPDATE products SET branch_id = 2 WHERE product_name = 'SCRAP'")
  .then(() => db.promise().query("UPDATE stocks SET branch_id = 2 WHERE product_id IN (SELECT id FROM products WHERE product_name = 'SCRAP')"))
  .then(() => console.log('Updated branch_id to 2'))
  .catch(console.error)
  .finally(() => process.exit());
