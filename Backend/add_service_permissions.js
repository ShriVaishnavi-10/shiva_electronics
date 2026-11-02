const db = require("./config/db");

const permissions = [
  { module_name: "services", permission_key: "services.view", description: "View service receipts" },
  { module_name: "services", permission_key: "services.create", description: "Create service receipts" },
  { module_name: "services", permission_key: "services.edit", description: "Edit service receipts" },
  { module_name: "services", permission_key: "services.delete", description: "Delete service receipts" },
  { module_name: "services", permission_key: "services.report", description: "View service reports" },
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
  process.exit();
};

migrate();
