const db = require("../config/db");

async function ensureHrmsTables() {
  const queryAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

  try {
    // 1. Departments table
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS hrms_departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 2. Employees table
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS hrms_employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        employee_code VARCHAR(50) UNIQUE DEFAULT NULL,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(100) DEFAULT NULL,
        phone VARCHAR(25) DEFAULT NULL,
        department VARCHAR(100) DEFAULT 'Sales',
        designation VARCHAR(100) DEFAULT 'Executive',
        branch_id INT DEFAULT 2,
        salary DECIMAL(12,2) DEFAULT 0.00,
        joining_date DATE DEFAULT NULL,
        employment_type ENUM('Full-Time', 'Part-Time', 'Contract', 'Trainee') DEFAULT 'Full-Time',
        status ENUM('Active', 'On Leave', 'Resigned', 'Terminated') DEFAULT 'Active',
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_hrms_employee_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY uq_hrms_employee_user (user_id),
        KEY idx_hrms_emp_status (status),
        KEY idx_hrms_emp_dept (department),
        KEY idx_hrms_emp_branch (branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    const employeeColumns = await queryAsync(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrms_employees'`,
    );
    if (!employeeColumns.some((column) => column.COLUMN_NAME === "user_id")) {
      await queryAsync("ALTER TABLE hrms_employees ADD COLUMN user_id INT DEFAULT NULL");
    }

    const employeeIndexes = await queryAsync(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrms_employees'`,
    );
    if (!employeeIndexes.some((index) => index.INDEX_NAME === "uq_hrms_employee_user")) {
      await queryAsync("ALTER TABLE hrms_employees ADD UNIQUE KEY uq_hrms_employee_user (user_id)");
    }

    const employeeForeignKeys = await queryAsync(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrms_employees'
         AND CONSTRAINT_NAME = 'fk_hrms_employee_user'`,
    );
    if (!employeeForeignKeys.length) {
      await queryAsync(
        `ALTER TABLE hrms_employees
         ADD CONSTRAINT fk_hrms_employee_user
         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`,
      );
    }

    // 3. Attendance table
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS hrms_attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        attendance_date DATE NOT NULL,
        check_in TIME DEFAULT NULL,
        check_out TIME DEFAULT NULL,
        status ENUM('Present', 'Late', 'Half Day', 'On Leave', 'Absent') DEFAULT 'Present',
        notes VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_emp_date (employee_id, attendance_date),
        KEY idx_hrms_att_date (attendance_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 4. Leaves table
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS hrms_leaves (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        leave_type ENUM('Casual', 'Sick', 'Earned', 'Emergency', 'Maternity', 'Unpaid') DEFAULT 'Casual',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_days DECIMAL(4,1) DEFAULT 1.0,
        reason TEXT DEFAULT NULL,
        status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
        approved_by VARCHAR(100) DEFAULT NULL,
        rejection_reason VARCHAR(1000) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_hrms_leave_status (status),
        KEY idx_hrms_leave_employee_dates (employee_id, start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    const leaveColumns = await queryAsync(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrms_leaves'`,
    );
    if (!leaveColumns.some((column) => column.COLUMN_NAME === "rejection_reason")) {
      await queryAsync(
        "ALTER TABLE hrms_leaves ADD COLUMN rejection_reason VARCHAR(1000) DEFAULT NULL",
      );
    }

    // Populate initial departments if empty
    const depts = await queryAsync("SELECT COUNT(*) AS count FROM hrms_departments");
    if (depts[0].count === 0) {
      await queryAsync(`
        INSERT INTO hrms_departments (name, description) VALUES
        ('Sales & Billing', 'Storefront sales executives and billing terminals'),
        ('Technical & Service', 'Mobile, laptop, and electronic repairs & installation'),
        ('Inventory & Stores', 'Stock keeping, receiving, warehousing, and dispatch'),
        ('Accounts & Billing', 'Finance, ledger, invoices, tax, and GST compliance'),
        ('Executive Management', 'Store management, administration, and team leadership')
      `);
    }

    const hrmsPermissions = [
      ["hrms", "hrms.view", "View HRMS dashboard and employee information"],
      ["hrms", "hrms.employees.create", "Create HRMS employee records"],
      ["hrms", "hrms.employees.edit", "Edit HRMS employee records"],
      ["hrms", "hrms.employees.delete", "Delete HRMS employee records"],
      ["hrms", "hrms.attendance.manage", "Record and update employee attendance"],
      ["hrms", "hrms.leave.create", "Submit employee leave requests"],
      ["hrms", "hrms.leave.approve", "Approve or reject employee leave requests"],
      ["hrms", "hrms.payroll.view", "View HRMS payroll information"],
      ["hrms", "hrms.payroll.edit", "Manage HRMS payroll"],
      ["hrms", "hrms.reports.view", "View HRMS reports"],
      ["hrms", "hrms.settings.edit", "Manage HRMS settings"],
    ];
    await queryAsync(
      "INSERT IGNORE INTO permissions (module_name, permission_key, description) VALUES ?",
      [hrmsPermissions],
    );

    const { ensureHrmsExtendedTables } = require("./create_hrms_extended_tables");
    await ensureHrmsExtendedTables();

    console.log("HRMS tables ensured and ready");
  } catch (err) {
    console.error("ensureHrmsTables error:", err.message || err);
    throw err;
  }
}

module.exports = { ensureHrmsTables };

if (require.main === module) {
  ensureHrmsTables().then(() => process.exit(0));
}
