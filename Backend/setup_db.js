const db = require('./config/db');

db.query('SHOW TABLES LIKE "service_categories"', (err, results) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  if (results.length === 0) {
    db.query(`CREATE TABLE IF NOT EXISTS service_categories (
      id INT AUTO_INCREMENT PRIMARY KEY, 
      category_name VARCHAR(255) NOT NULL, 
      status ENUM('active', 'inactive') DEFAULT 'active', 
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error(err);
      else console.log('Table created');
      process.exit();
    });
  } else {
    console.log('Table exists');
    process.exit();
  }
});
