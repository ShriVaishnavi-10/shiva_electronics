const db = require("../config/db");

async function ensureHrmsExtendedTables() {
  const queryAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

  try {
    // 1. Extend hrms_employees with comprehensive personal, statutory, and billing linkage columns
    const employeeCols = await queryAsync(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrms_employees'`
    );
    const existingCols = new Set(employeeCols.map((c) => c.COLUMN_NAME));

    const colsToAdd = [
      { name: "dob", def: "DATE DEFAULT NULL" },
      { name: "gender", def: "VARCHAR(20) DEFAULT NULL" },
      { name: "pan_number", def: "VARCHAR(25) DEFAULT NULL" },
      { name: "aadhaar_number", def: "VARCHAR(25) DEFAULT NULL" },
      { name: "emergency_contact_name", def: "VARCHAR(150) DEFAULT NULL" },
      { name: "emergency_contact_phone", def: "VARCHAR(25) DEFAULT NULL" },
      { name: "address", def: "TEXT DEFAULT NULL" },
      { name: "bank_name", def: "VARCHAR(100) DEFAULT NULL" },
      { name: "account_number", def: "VARCHAR(50) DEFAULT NULL" },
      { name: "ifsc_code", def: "VARCHAR(25) DEFAULT NULL" },
      { name: "reporting_manager_id", def: "INT DEFAULT NULL" },
      { name: "resignation_date", def: "DATE DEFAULT NULL" },
      { name: "relieving_date", def: "DATE DEFAULT NULL" },
      { name: "notice_period_days", def: "INT DEFAULT 30" },
      { name: "sales_person_id", def: "INT DEFAULT NULL" },
      { name: "profile_image", def: "VARCHAR(255) DEFAULT NULL" }
    ];

    for (const col of colsToAdd) {
      if (!existingCols.has(col.name)) {
        await queryAsync(`ALTER TABLE hrms_employees ADD COLUMN ${col.name} ${col.def}`);
      }
    }

    // 2. Designations table
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS hrms_designations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_id INT NOT NULL,
        title VARCHAR(100) NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_designation_dept (department_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 3. Employee Documents table
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS hrms_employee_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        document_name VARCHAR(150) NOT NULL,
        file_url VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_emp_docs (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 4. Payroll & Payslips table
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS hrms_payroll (
        id INT AUTO_INCREMENT PRIMARY KEY,
        month VARCHAR(7) NOT NULL,
        employee_id INT NOT NULL,
        total_working_days DECIMAL(4,1) DEFAULT 30.0,
        present_days DECIMAL(4,1) DEFAULT 0.0,
        paid_leaves DECIMAL(4,1) DEFAULT 0.0,
        unpaid_leaves DECIMAL(4,1) DEFAULT 0.0,
        overtime_hours DECIMAL(5,1) DEFAULT 0.0,
        basic_salary DECIMAL(12,2) DEFAULT 0.00,
        hra DECIMAL(12,2) DEFAULT 0.00,
        conveyance DECIMAL(12,2) DEFAULT 0.00,
        special_allowance DECIMAL(12,2) DEFAULT 0.00,
        overtime_pay DECIMAL(12,2) DEFAULT 0.00,
        sales_incentives DECIMAL(12,2) DEFAULT 0.00,
        bonus DECIMAL(12,2) DEFAULT 0.00,
        gross_salary DECIMAL(12,2) DEFAULT 0.00,
        pf_deduction DECIMAL(12,2) DEFAULT 0.00,
        esi_deduction DECIMAL(12,2) DEFAULT 0.00,
        pt_deduction DECIMAL(12,2) DEFAULT 0.00,
        advance_deduction DECIMAL(12,2) DEFAULT 0.00,
        tds_deduction DECIMAL(12,2) DEFAULT 0.00,
        total_deductions DECIMAL(12,2) DEFAULT 0.00,
        net_salary DECIMAL(12,2) DEFAULT 0.00,
        payment_status ENUM('Draft', 'Approved', 'Paid') DEFAULT 'Draft',
        payment_date DATE DEFAULT NULL,
        payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
        payment_reference VARCHAR(100) DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_emp_month (employee_id, month),
        INDEX idx_payroll_month (month),
        INDEX idx_payroll_status (payment_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 5. Salary Advances table
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS hrms_salary_advances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        advance_amount DECIMAL(12,2) NOT NULL,
        repayment_months INT NOT NULL DEFAULT 1,
        monthly_deduction DECIMAL(12,2) NOT NULL,
        remaining_amount DECIMAL(12,2) NOT NULL,
        reason TEXT DEFAULT NULL,
        status ENUM('Pending', 'Approved', 'Rejected', 'Fully Repaid') DEFAULT 'Pending',
        approved_by VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_adv_emp (employee_id),
        INDEX idx_adv_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 6. Sales Targets & Performance (Billing Integration)
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS hrms_sales_targets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        month VARCHAR(7) NOT NULL,
        target_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        target_invoices INT DEFAULT 0,
        notes VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_target_emp_month (employee_id, month)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 7. Incentive Rules
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS hrms_incentive_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rule_name VARCHAR(150) NOT NULL,
        min_sales_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        fixed_bonus DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 8. Employee Expenses & Reimbursements
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS hrms_expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        expense_date DATE NOT NULL,
        category ENUM('Travel', 'Food', 'Client Meeting', 'Store Supplies', 'Courier', 'Other') DEFAULT 'Other',
        amount DECIMAL(10,2) NOT NULL,
        description TEXT DEFAULT NULL,
        receipt_url VARCHAR(255) DEFAULT NULL,
        status ENUM('Pending', 'Approved', 'Rejected', 'Reimbursed') DEFAULT 'Pending',
        approved_by VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_exp_emp (employee_id),
        INDEX idx_exp_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 9. Recruitment - Job Openings & Candidates
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS hrms_job_openings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        department VARCHAR(100) NOT NULL,
        openings_count INT DEFAULT 1,
        experience_required VARCHAR(50) DEFAULT '0-2 Years',
        salary_range VARCHAR(100) DEFAULT NULL,
        status ENUM('Open', 'In Review', 'Closed') DEFAULT 'Open',
        description TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryAsync(`
      CREATE TABLE IF NOT EXISTS hrms_candidates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_opening_id INT DEFAULT NULL,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(100) DEFAULT NULL,
        phone VARCHAR(25) DEFAULT NULL,
        experience_years DECIMAL(4,1) DEFAULT 0.0,
        current_company VARCHAR(150) DEFAULT NULL,
        resume_url VARCHAR(255) DEFAULT NULL,
        status ENUM('Applied', 'Screening', 'Interviewing', 'Offered', 'Hired', 'Rejected') DEFAULT 'Applied',
        interview_date DATETIME DEFAULT NULL,
        interview_feedback TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cand_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // Populate initial designations if empty
    const desigs = await queryAsync("SELECT COUNT(*) AS count FROM hrms_designations");
    if (desigs[0].count === 0) {
      await queryAsync(`
        INSERT INTO hrms_designations (department_id, title, description) VALUES
        (1, 'Store Manager', 'Overall showroom operations and store revenue target'),
        (1, 'Senior Sales Executive', 'Mobiles and high-value appliances sales specialist'),
        (1, 'Cashier & Billing Officer', 'Counter billing, POS receipting and cash drawer handling'),
        (2, 'Hardware Service Technician', 'Mobile display, laptop motherboard & chip-level repair'),
        (2, 'Appliance Installation Tech', 'AC and washing machine on-site installation'),
        (3, 'Storekeeper & Inward Officer', 'Goods inward receiving, barcode verification, serial scanning'),
        (4, 'Accountant', 'GST filing, daily cash tally, ledger and banking audits')
      `);
    }

    // Populate initial incentive rule if empty
    const rules = await queryAsync("SELECT COUNT(*) AS count FROM hrms_incentive_rules");
    if (rules[0].count === 0) {
      await queryAsync(`
        INSERT INTO hrms_incentive_rules (rule_name, min_sales_amount, commission_percent, fixed_bonus, status) VALUES
        ('Standard Showroom Commission', 100000.00, 1.50, 500.00, 'Active'),
        ('High-Performance Bonus Club', 500000.00, 2.50, 5000.00, 'Active')
      `);
    }

    console.log("HRMS Extended tables and default records verified successfully.");
  } catch (err) {
    console.error("ensureHrmsExtendedTables error:", err.message || err);
    throw err;
  }
}

module.exports = { ensureHrmsExtendedTables };

if (require.main === module) {
  ensureHrmsExtendedTables().then(() => process.exit(0));
}

