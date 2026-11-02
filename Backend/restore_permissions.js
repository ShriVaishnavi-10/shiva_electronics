const db = require("./config/db");

const permissionList = [
  // Dashboard
  { module_name: "dashboard", permission_key: "dashboard.view", description: "View dashboard" },

  // Products
  { module_name: "products", permission_key: "products.view", description: "View products" },
  { module_name: "products", permission_key: "products.create", description: "Create products" },
  { module_name: "products", permission_key: "products.edit", description: "Edit products" },
  { module_name: "products", permission_key: "products.delete", description: "Delete products" },

  // Category
  { module_name: "category", permission_key: "category.view", description: "View categories" },
  { module_name: "category", permission_key: "category.create", description: "Create categories" },
  { module_name: "category", permission_key: "category.edit", description: "Edit categories" },
  { module_name: "category", permission_key: "category.delete", description: "Delete categories" },

  // Sales
  { module_name: "sales", permission_key: "sales.view", description: "View sales" },
  { module_name: "sales", permission_key: "sales.create", description: "Create sales" },
  { module_name: "sales", permission_key: "sales.edit", description: "Edit sales" },
  { module_name: "sales", permission_key: "sales.delete", description: "Delete sales" },

  // Quotations
  { module_name: "quotations", permission_key: "quotations.view", description: "View quotations" },
  { module_name: "quotations", permission_key: "quotations.create", description: "Create quotations" },
  { module_name: "quotations", permission_key: "quotations.edit", description: "Edit quotations" },
  { module_name: "quotations", permission_key: "quotations.delete", description: "Delete quotations" },

  // Purchases
  { module_name: "purchases", permission_key: "purchases.view", description: "View purchases" },
  { module_name: "purchases", permission_key: "purchases.create", description: "Create purchases" },
  { module_name: "purchases", permission_key: "purchases.edit", description: "Edit purchases" },
  { module_name: "purchases", permission_key: "purchases.delete", description: "Delete purchases" },

  // Stocks
  { module_name: "stock", permission_key: "stock.view", description: "View stock" },
  { module_name: "stock", permission_key: "stock.create", description: "Create stock entries" },
  { module_name: "stock", permission_key: "stock.edit", description: "Edit stock" },

  // Customers
  { module_name: "customers", permission_key: "customers.view", description: "View customers" },
  { module_name: "customers", permission_key: "customers.create", description: "Create customers" },
  { module_name: "customers", permission_key: "customers.edit", description: "Edit customers" },
  { module_name: "customers", permission_key: "customers.delete", description: "Delete customers" },

  // Vendors
  { module_name: "vendors", permission_key: "vendors.view", description: "View vendors" },
  { module_name: "vendors", permission_key: "vendors.create", description: "Create vendors" },
  { module_name: "vendors", permission_key: "vendors.edit", description: "Edit vendors" },
  { module_name: "vendors", permission_key: "vendors.delete", description: "Delete vendors" },

  // Reports
  { module_name: "reports", permission_key: "reports.view", description: "View reports" },

  // Settings
  { module_name: "settings", permission_key: "settings.view", description: "View settings" },
  { module_name: "settings", permission_key: "settings.edit", description: "Edit settings" },

  // Branches
  { module_name: "branches", permission_key: "branches.view", description: "View branches" },
  { module_name: "branches", permission_key: "branches.create", description: "Create branches" },
  { module_name: "branches", permission_key: "branches.edit", description: "Edit branches" },

  // Users
  { module_name: "users", permission_key: "users.view", description: "View users" },
  { module_name: "users", permission_key: "users.create", description: "Create users" },
  { module_name: "users", permission_key: "users.edit", description: "Edit users" },
  { module_name: "users", permission_key: "users.delete", description: "Delete users" },

  // Services (Receipts)
  { module_name: "services", permission_key: "services.view", description: "View service receipts" },
  { module_name: "services", permission_key: "services.create", description: "Create service receipts" },
  { module_name: "services", permission_key: "services.edit", description: "Edit service receipts" },
  { module_name: "services", permission_key: "services.delete", description: "Delete service receipts" },
  { module_name: "services", permission_key: "services.report", description: "View service reports" },

  // Expenses
  { module_name: "expenses", permission_key: "expenses.view", description: "View expenses and categories" },
  { module_name: "expenses", permission_key: "expenses.create", description: "Add expenses and categories" },
  { module_name: "expenses", permission_key: "expenses.edit", description: "Edit expenses and categories" },
  { module_name: "expenses", permission_key: "expenses.delete", description: "Delete expenses and categories" },

  // Tax Modules
  { module_name: "tax_modules", permission_key: "tax_modules.view", description: "View tax modules" },
  { module_name: "tax_modules", permission_key: "tax_modules.create", description: "Create tax modules" },
  { module_name: "tax_modules", permission_key: "tax_modules.edit", description: "Edit tax modules" },
  { module_name: "tax_modules", permission_key: "tax_modules.delete", description: "Delete tax modules" },

  // Tax Groups
  { module_name: "tax_groups", permission_key: "tax_groups.view", description: "View tax groups" },
  { module_name: "tax_groups", permission_key: "tax_groups.create", description: "Create tax groups" },
  { module_name: "tax_groups", permission_key: "tax_groups.edit", description: "Edit tax groups" },
  { module_name: "tax_groups", permission_key: "tax_groups.delete", description: "Delete tax groups" },

  // Ledger
  { module_name: "ledger", permission_key: "ledger.view", description: "View ledger" },
  { module_name: "ledger", permission_key: "ledger.create", description: "Create ledger entries" },
  { module_name: "ledger", permission_key: "ledger.edit", description: "Edit ledger entries" },
  { module_name: "ledger", permission_key: "ledger.delete", description: "Delete ledger entries" },

  // Bank Accounts
  { module_name: "bank_accounts", permission_key: "bank_accounts.view", description: "View bank accounts" },
  { module_name: "bank_accounts", permission_key: "bank_accounts.create", description: "Create bank accounts" },
  { module_name: "bank_accounts", permission_key: "bank_accounts.edit", description: "Edit bank accounts" },
  { module_name: "bank_accounts", permission_key: "bank_accounts.delete", description: "Delete bank accounts" },

  // Day Closing
  { module_name: "day_closing", permission_key: "day_closing.view", description: "View day closing" },
  { module_name: "day_closing", permission_key: "day_closing.create", description: "Create day closing" },
  { module_name: "day_closing", permission_key: "day_closing.edit", description: "Edit day closing" },
  { module_name: "day_closing", permission_key: "day_closing.delete", description: "Delete day closing" },

  // Business Location
  { module_name: "business_location", permission_key: "business_location.view", description: "View business location" },
  { module_name: "business_location", permission_key: "business_location.create", description: "Create business location" },
  { module_name: "business_location", permission_key: "business_location.edit", description: "Edit business location" },
  { module_name: "business_location", permission_key: "business_location.delete", description: "Delete business location" }
];

async function run() {
  try {
    console.log("Restoring permissions table data...");
    
    // First clear permissions table safely
    await db.promise().query("DELETE FROM permissions");
    
    // Insert all permissions
    for (const p of permissionList) {
      await db.promise().query(
        "INSERT INTO permissions (module_name, permission_key, description) VALUES (?, ?, ?)",
        [p.module_name, p.permission_key, p.description]
      );
      console.log(`Inserted permission: ${p.permission_key}`);
    }

    console.log("Permissions seeded successfully.");

    // Retrieve all inserted permissions
    const [perms] = await db.promise().query("SELECT id FROM permissions");
    const permIds = perms.map(p => p.id);

    // Get Admin and super admin roles
    const [roles] = await db.promise().query("SELECT id, role_name FROM roles WHERE role_name IN ('Admin', 'super admin')");
    
    console.log(`Found roles to seed role_permissions:`, roles.map(r => r.role_name));

    // Clear old role mappings first to be safe
    await db.promise().query("DELETE FROM role_permissions");

    // Map each permission to the roles
    for (const role of roles) {
      for (const permId of permIds) {
        await db.promise().query(
          "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
          [role.id, permId]
        );
      }
      console.log(`Mapped all permissions to role: ${role.role_name} (ID: ${role.id})`);
    }

    console.log("Permissions restored and mapped successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error restoring permissions:", err);
    process.exit(1);
  }
}

run();
