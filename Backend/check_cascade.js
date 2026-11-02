const db = require("./config/db");
const dbPromise = db.promise();

async function checkCascade() {
    try {
        const tables = ['service_motor_specs', 'service_materials', 'service_person_details'];
        for (const table of tables) {
            console.log(`Checking table: ${table}`);
            const [rows] = await dbPromise.query(`SHOW CREATE TABLE ${table}`);
            console.log(rows[0]['Create Table']);
            console.log('---');
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkCascade();
