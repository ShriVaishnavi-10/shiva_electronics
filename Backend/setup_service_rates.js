const mysql = require('mysql2/promise');
const config = { host: 'localhost', user: 'root', password: 'bird', database: 'sriram' };

async function setup() {
  const connection = await mysql.createConnection(config);
  try {
    console.log('Creating service_rates table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS service_rates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rate_name VARCHAR(50) UNIQUE,
        hourly_rate DECIMAL(10,2) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Inserting default rates...');
    await connection.execute('INSERT IGNORE INTO service_rates (rate_name, hourly_rate) VALUES (?, ?)', ['Indoor', 850.00]);
    await connection.execute('INSERT IGNORE INTO service_rates (rate_name, hourly_rate) VALUES (?, ?)', ['Outdoor', 1350.00]);
    
    console.log('Done!');
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}
setup();
