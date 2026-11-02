import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'sriram'
};

async function fixStock() {
  const connection = await mysql.createConnection(config);
  try {
    console.log('Fixing negative stock...');
    const [res1] = await connection.execute('UPDATE products SET qty = 0 WHERE qty < 0');
    console.log(`Products updated: ${res1.affectedRows}`);
    const [res2] = await connection.execute('UPDATE stocks SET quantity = 0 WHERE quantity < 0');
    console.log(`Stocks updated: ${res2.affectedRows}`);
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

fixStock();
