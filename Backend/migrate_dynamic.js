const db = require('./config/db');

async function migrate() {
  try {
    const [rows] = await db.promise().query('SHOW COLUMNS FROM services LIKE "dynamic_materials"');
    if (rows.length === 0) {
      await db.promise().query('ALTER TABLE services ADD COLUMN dynamic_materials LONGTEXT');
      console.log('Column dynamic_materials added to services table');
    } else {
      console.log('Column dynamic_materials already exists');
    }
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
