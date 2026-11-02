const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sriram'
});

const executeQuery = (query) => {
  return new Promise((resolve, reject) => {
    db.query(query, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const runMigration = async () => {
  console.log("Starting service module tables clean and recreate...");
  try {
    // Disable foreign key checks
    await executeQuery("SET FOREIGN_KEY_CHECKS = 0;");
    console.log("Foreign key checks disabled.");

    // Drop old tables
    const tablesToDrop = [
      'service_job_cards',
      'service_motor_specs',
      'service_materials',
      'service_inspections',
      'person_details',
      'checklist',
      'motor_details',
      'material_used',
      'services'
    ];

    for (const table of tablesToDrop) {
      await executeQuery(`DROP TABLE IF EXISTS \`${table}\`;`);
      console.log(`Dropped table: ${table}`);
    }

    // 1. Create services table
    console.log("Creating services table...");
    await executeQuery(`
      CREATE TABLE services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NULL,
        receipt_no VARCHAR(50) NULL UNIQUE,
        product_name VARCHAR(255) NULL,
        notes TEXT NULL,
        status VARCHAR(50) NULL DEFAULT 'Pending',
        branch_id INT NULL DEFAULT 1,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        total_amount DECIMAL(15,2) NULL DEFAULT 0.00,
        taxable_amount DECIMAL(15,2) NULL DEFAULT 0.00,
        gst_percent DECIMAL(5,2) NULL DEFAULT 0.00,
        gst_amount DECIMAL(15,2) NULL DEFAULT 0.00,
        extra_scrap_details TEXT NULL,
        extra_sample_coil VARCHAR(100) NULL,
        extra_total_weight VARCHAR(100) NULL,
        vehicle_no VARCHAR(255) NULL,
        date_of_incoming DATE NULL,
        delivery_date DATE NULL,
        extra_scrap_rate VARCHAR(100) NULL,
        extra_scrap_value VARCHAR(100) NULL,
        dynamic_person_details LONGTEXT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // Re-link payments and advance_amount to services
    console.log("Checking if payments and advance_amount need constraints updated...");
    try {
      await executeQuery("ALTER TABLE payments DROP FOREIGN KEY IF EXISTS payments_ibfk_1;");
    } catch (e) {}
    try {
      await executeQuery("ALTER TABLE payments ADD CONSTRAINT payments_ibfk_1 FOREIGN KEY (product_id) REFERENCES services(id) ON DELETE CASCADE;");
    } catch (e) {
      console.log("Failed to add payments FK (may already exist or mismatch):", e.message);
    }

    try {
      await executeQuery("ALTER TABLE advance_amount DROP FOREIGN KEY IF EXISTS advance_amount_ibfk_1;");
    } catch (e) {}
    try {
      await executeQuery("ALTER TABLE advance_amount ADD CONSTRAINT advance_amount_ibfk_1 FOREIGN KEY (product_id) REFERENCES services(id) ON DELETE CASCADE;");
    } catch (e) {
      console.log("Failed to add advance_amount FK (may already exist or mismatch):", e.message);
    }

    // 2. Create checklist table
    console.log("Creating checklist table...");
    await executeQuery(`
      CREATE TABLE checklist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_id INT NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        item_value VARCHAR(255) NULL,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        UNIQUE KEY unique_service_checklist_item (service_id, item_name)
      ) ENGINE=InnoDB;
    `);

    // 3. Create motor_details table
    console.log("Creating motor_details table...");
    await executeQuery(`
      CREATE TABLE motor_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_id INT NOT NULL,
        spec_name VARCHAR(255) NOT NULL,
        spec_value VARCHAR(255) NULL,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        UNIQUE KEY unique_service_motor_spec (service_id, spec_name)
      ) ENGINE=InnoDB;
    `);

    // 4. Create person_details table
    console.log("Creating person_details table...");
    await executeQuery(`
      CREATE TABLE person_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_id INT NOT NULL,
        stage_name VARCHAR(50) NOT NULL,
        step_number INT NOT NULL,
        inspection_date DATE NULL,
        inspector_name VARCHAR(100) NULL,
        notes TEXT NULL,
        type VARCHAR(20) NULL,
        hours INT NULL DEFAULT 0,
        minutes INT NULL DEFAULT 0,
        amount DECIMAL(10,2) NULL DEFAULT 0.00,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        UNIQUE KEY unique_service_stage_step (service_id, stage_name, step_number)
      ) ENGINE=InnoDB;
    `);

    // 5. Create material_used table
    console.log("Creating material_used table...");
    await executeQuery(`
      CREATE TABLE material_used (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_id INT NOT NULL,
        category VARCHAR(50) NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        value TEXT NULL,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Re-enable foreign key checks
    await executeQuery("SET FOREIGN_KEY_CHECKS = 1;");
    console.log("Foreign key checks re-enabled.");
    console.log("Migration executed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    await executeQuery("SET FOREIGN_KEY_CHECKS = 1;");
    process.exit(1);
  }
};

runMigration();
