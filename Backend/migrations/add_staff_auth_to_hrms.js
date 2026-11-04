const db = require("../config/db");
const bcrypt = require("bcryptjs");

async function addStaffAuth() {
  try {
    const [cols] = await db.promise().query("DESCRIBE hrms_employees");
    const colNames = cols.map((c) => c.Field);

    if (!colNames.includes("password")) {
      await db
        .promise()
        .query(
          "ALTER TABLE hrms_employees ADD COLUMN password VARCHAR(255) DEFAULT NULL AFTER user_id"
        );
      console.log("Added password column to hrms_employees");
    }

    if (!colNames.includes("pin")) {
      await db
        .promise()
        .query(
          "ALTER TABLE hrms_employees ADD COLUMN pin VARCHAR(20) DEFAULT '123456' AFTER password"
        );
      console.log("Added pin column to hrms_employees");
    }

    const defaultHashed = await bcrypt.hash("123456", 10);

    // Set default pin and passwords
    await db
      .promise()
      .query(
        "UPDATE hrms_employees SET pin = '123456' WHERE pin IS NULL OR pin = ''"
      );
    await db
      .promise()
      .query(
        "UPDATE hrms_employees SET password = ? WHERE password IS NULL OR password = ''",
        [defaultHashed]
      );

    // Link sales_person_id by phone number or employee code
    await db
      .promise()
      .query(
        "UPDATE hrms_employees e JOIN sales_persons sp ON sp.phone = e.phone SET e.sales_person_id = sp.id WHERE e.sales_person_id IS NULL"
      );

    const [emp] = await db
      .promise()
      .query(
        "SELECT id, name, employee_code, phone, sales_person_id, pin FROM hrms_employees"
      );
    console.log("Staff Auth Migration Complete. Employees ready:", emp);
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

addStaffAuth();

