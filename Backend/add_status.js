const db = require('./config/db'); 
db.promise().query("ALTER TABLE purchases ADD COLUMN status VARCHAR(50) DEFAULT 'Received'")
  .then(() => { console.log('Column added'); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
