const db = require("../config/db");

async function runMigration() {
  console.log("Starting Non-GST migration...");

  const queryAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  };

  try {
    // 1. Check and add is_gst column to tables
    const tables = [
      { name: "transactions", defaultVal: 1 },
      { name: "customers", defaultVal: 1 },
      { name: "bank_accounts", defaultVal: 1 },
      { name: "daily_cash_logs", defaultVal: 1 },
    ];

    for (const t of tables) {
      const cols = await queryAsync(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'is_gst'`,
        [t.name]
      );

      if (cols.length === 0) {
        console.log(`Adding is_gst column to ${t.name}...`);
        await queryAsync(
          `ALTER TABLE ${t.name} ADD COLUMN is_gst TINYINT(1) NOT NULL DEFAULT ${t.defaultVal}`
        );
        console.log(`Added is_gst to ${t.name}`);
      } else {
        console.log(`Column is_gst already exists on ${t.name}`);
      }

      // Add index if not present
      try {
        await queryAsync(`ALTER TABLE ${t.name} ADD INDEX idx_${t.name}_is_gst (is_gst)`);
        console.log(`Added index idx_${t.name}_is_gst on ${t.name}`);
      } catch (idxErr) {
        // Ignore if index already exists
      }
    }

    // 2. Ensure role 'non user' exists (role_id 6)
    const roleRows = await queryAsync(
      `SELECT id, role_name FROM roles WHERE LOWER(TRIM(role_name)) = 'non user' OR id = 6`
    );

    let nonUserRoleId = 6;
    if (roleRows.length === 0) {
      const roleResult = await queryAsync(
        `INSERT INTO roles (id, role_name, description) VALUES (6, 'non user', 'Non-GST admin access')`
      );
      nonUserRoleId = roleResult.insertId || 6;
      console.log(`Created role 'non user' with ID ${nonUserRoleId}`);
    } else {
      nonUserRoleId = roleRows[0].id;
      console.log(`Found role 'non user' with ID ${nonUserRoleId}`);
    }

    // 3. Populate permissions for 'non user' role
    const nonUserPermissions = [
      "dashboard.view",
      "sales.view",
      "sales.create",
      "sales.edit",
      "sales.delete",
      "customers.view",
      "customers.create",
      "customers.edit",
      "customers.delete",
      "bank_accounts.view",
      "bank_accounts.create",
      "bank_accounts.edit",
      "bank_accounts.delete",
      "day_closing.view",
      "day_closing.create",
      "day_closing.edit",
      "day_closing.delete",
      "ledger.view",
      "reports.view",
      "products.view",
      "category.view",
      "stock.view",
    ];

    const permRows = await queryAsync(
      `SELECT id, permission_key FROM permissions WHERE permission_key IN (?)`,
      [nonUserPermissions]
    );

    console.log(`Found ${permRows.length} matching permissions for non user role.`);

    for (const p of permRows) {
      const exists = await queryAsync(
        `SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?`,
        [nonUserRoleId, p.id]
      );
      if (exists.length === 0) {
        await queryAsync(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [nonUserRoleId, p.id]
        );
      }
    }

    console.log("Role permissions for 'non user' successfully synchronized.");
    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

runMigration();
