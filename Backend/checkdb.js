const db = require('./config/db');
db.query("SELECT id, invoice_no, tax_group_id, tax_amount, total_before_tax, final_amount FROM transactions WHERE type='sell' ORDER BY id DESC LIMIT 5", (err, rows) => {
  if (err) console.error(err);
  console.log(rows);
  process.exit(0);
});
