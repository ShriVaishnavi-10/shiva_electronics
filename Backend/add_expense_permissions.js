const db = require("./config/db");

const permissions = [
  { module_name: "expenses", permission_key: "expenses.view", description: "View expenses and categories" },
  { module_name: "expenses", permission_key: "expenses.create", description: "Add expenses and categories" },
  { module_name: "expenses", permission_key: "expenses.edit", description: "Edit expenses and categories" },
  { module_name: "expenses", permission_key: "expenses.delete", description: "Delete expenses and categories" },
];

const migrate = async () => {
  for (const p of permissions) {
    try {
      const [rows] = await db.promise().query("SELECT id FROM permissions WHERE permission_key = ?", [p.permission_key]);
      if (rows.length === 0) {
        await db.promise().query("INSERT INTO permissions (module_name, permission_key, description) VALUES (?, ?, ?)", [p.module_name, p.permission_key, p.description]);
        console.log(`Added permission: ${p.permission_key}`);
      } else {
        console.log(`Permission already exists: ${p.permission_key}`);
      }
    } catch (err) {
      console.error(`Error adding permission ${p.permission_key}:`, err.message);
    }
  }

  // Also map to Admin, super admin, and non user roles
  try {
    const [roles] = await db.promise().query("SELECT id, role_name FROM roles WHERE role_name IN ('Admin', 'super admin', 'non user') OR id = 6");
    const [expPerms] = await db.promise().query("SELECT id FROM permissions WHERE module_name = 'expenses'");
    for (const r of roles) {
      for (const p of expPerms) {
        await db.promise().query("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [r.id, p.id]);
      }
      console.log(`Mapped expense permissions to role: ${r.role_name}`);
    }
  } catch (err) {
    console.error("Error mapping expense permissions to roles:", err.message);
  }

  process.exit();
};

migrate();
