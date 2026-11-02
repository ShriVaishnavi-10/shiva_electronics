const db = require('./backend/config/db');
db.query("SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND DATA_TYPE = 'json'", (err, res) => {
  if (err) throw err;
  if (!res.length) {
    console.log('No JSON columns found in any table.');
    process.exit(0);
  }
  let count = res.length;
  res.forEach(r => {
    db.query('ALTER TABLE ' + r.TABLE_NAME + ' DROP COLUMN ' + r.COLUMN_NAME, (e) => {
      console.log(e ? 'Error dropping ' + r.COLUMN_NAME : 'Dropped ' + r.COLUMN_NAME + ' from ' + r.TABLE_NAME);
      count--;
      if(count === 0) process.exit(0);
    });
  });
});
