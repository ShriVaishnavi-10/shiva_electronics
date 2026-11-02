const db = require("./config/db");
const dbPromise = db.promise();

async function migrate() {
    try {
        console.log("Starting relational migration...");

        // 1. Create Tables
        console.log("Creating service_motor_specs table...");
        await dbPromise.query(`
            CREATE TABLE IF NOT EXISTS service_motor_specs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_id INT NOT NULL,
                spec_name VARCHAR(255) NOT NULL,
                spec_value TEXT,
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
            )
        `);

        console.log("Creating service_materials table...");
        await dbPromise.query(`
            CREATE TABLE IF NOT EXISTS service_materials (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_id INT NOT NULL,
                category VARCHAR(50) NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                value TEXT,
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
            )
        `);

        console.log("Creating service_person_details table...");
        await dbPromise.query(`
            CREATE TABLE IF NOT EXISTS service_person_details (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_id INT NOT NULL,
                task_name VARCHAR(100) NOT NULL,
                col_no INT NOT NULL,
                field_name VARCHAR(50) NOT NULL,
                value TEXT,
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
            )
        `);

        // 2. Fetch all services
        const [services] = await dbPromise.query("SELECT id, dynamic_motor_specs, dynamic_materials, dynamic_person_details FROM services");
        console.log(`Found ${services.length} services to migrate.`);

        for (const s of services) {
            console.log(`Migrating Service ID: ${s.id}...`);

            // Migrate Motor Specs
            if (s.dynamic_motor_specs) {
                try {
                    const specs = JSON.parse(s.dynamic_motor_specs);
                    for (const [k, v] of Object.entries(specs)) {
                        if (v !== null && v !== undefined) {
                            await dbPromise.query("INSERT INTO service_motor_specs (service_id, spec_name, spec_value) VALUES (?, ?, ?)", [s.id, k, String(v)]);
                        }
                    }
                } catch (e) { console.error(`Error parsing motor specs for ID ${s.id}:`, e); }
            }

            // Migrate Materials
            if (s.dynamic_materials) {
                try {
                    const mats = JSON.parse(s.dynamic_materials);
                    const categories = ['materials', 'insulationSubs', 'extras'];
                    for (const cat of categories) {
                        if (mats[cat]) {
                            for (const [k, v] of Object.entries(mats[cat])) {
                                if (v) {
                                    await dbPromise.query("INSERT INTO service_materials (service_id, category, item_name, value) VALUES (?, ?, ?, ?)", [s.id, cat, k, String(v)]);
                                }
                            }
                        }
                    }
                } catch (e) { console.error(`Error parsing materials for ID ${s.id}:`, e); }
            }

            // Migrate Person Details
            if (s.dynamic_person_details) {
                try {
                    const person = JSON.parse(s.dynamic_person_details);
                    for (const [task, cols] of Object.entries(person)) {
                        if (cols && typeof cols === 'object') {
                            for (const [col, fields] of Object.entries(cols)) {
                                if (fields && typeof fields === 'object') {
                                    for (const [field, val] of Object.entries(fields)) {
                                        if (val) {
                                            await dbPromise.query("INSERT INTO service_person_details (service_id, task_name, col_no, field_name, value) VALUES (?, ?, ?, ?, ?)", [s.id, task, parseInt(col), field, String(val)]);
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (e) { console.error(`Error parsing person details for ID ${s.id}:`, e); }
            }
        }

        console.log("Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
