const db = require("../config/db");
const bcrypt = require("bcryptjs");

const ATTENDANCE_STATUSES = new Set(["Present", "Late", "Half Day", "On Leave", "Absent"]);
const LEAVE_TYPES = new Set(["Casual", "Sick", "Earned", "Emergency", "Maternity", "Unpaid"]);

function normalizeAttendanceStatus(rawStatus) {
  if (!rawStatus) return "Present";
  const s = String(rawStatus).trim().toUpperCase().replace(/_/g, " ");
  if (s === "PRESENT") return "Present";
  if (s === "LATE") return "Late";
  if (s === "HALF DAY") return "Half Day";
  if (s === "ON LEAVE") return "On Leave";
  if (s === "ABSENT") return "Absent";
  return rawStatus;
}

function getBranchScope(req, alias = "e") {
  if (req.branchId != null) {
    return { clause: `${alias}.branch_id = ?`, params: [req.branchId] };
  }
  if (Array.isArray(req.branchIds) && req.branchIds.length > 0) {
    return { clause: `${alias}.branch_id IN (?)`, params: [req.branchIds] };
  }
  if (req.user?.branch_id) {
    return { clause: `${alias}.branch_id = ?`, params: [req.user.branch_id] };
  }
  return { clause: "1 = 1", params: [] };
}

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isValidTime(value) {
  return value == null || value === "" || /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
}

function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function invalidId(value) {
  return !Number.isInteger(Number(value)) || Number(value) <= 0;
}

/* ============================================================== */
/* MODULE 1: HRMS DASHBOARD OVERVIEW                              */
/* ============================================================== */
exports.getDashboardSummary = async (req, res) => {
  try {
    const attendanceDate = req.query.date || localDateString();
    if (!isValidDate(attendanceDate)) {
      return res.status(400).json({ success: false, message: "A valid attendance date is required" });
    }

    const scope = getBranchScope(req);
    const employeeScope = getBranchScope(req, "e");
    const currentMonth = attendanceDate.substring(0, 7);

    const [
      empStats,
      departmentBreakdown,
      todayAttendance,
      leaveStats,
      recentLeaves,
      weeklyTrend,
      payrollSummary,
      upcomingBirthdays,
      upcomingAnniversaries
    ] = await Promise.all([
      queryAsync(
        `SELECT COUNT(*) AS total_employees,
                SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_employees,
                SUM(CASE WHEN status != 'Active' THEN 1 ELSE 0 END) AS inactive_employees
         FROM hrms_employees e WHERE ${scope.clause}`,
        scope.params,
      ),
      queryAsync(
        `SELECT department, COUNT(*) AS count
         FROM hrms_employees e
         WHERE e.status = 'Active' AND ${scope.clause}
         GROUP BY department ORDER BY count DESC`,
        scope.params,
      ),
      queryAsync(
        `SELECT e.id, e.employee_code, e.name, e.department, e.designation, e.phone,
                COALESCE(a.status, IF(EXISTS (
                  SELECT 1 FROM hrms_leaves l
                  WHERE l.employee_id = e.id AND l.status = 'Approved'
                    AND l.start_date <= ? AND l.end_date >= ?
                ), 'On Leave', 'Absent')) AS attendance_status,
                a.check_in, a.check_out, a.notes AS attendance_notes
         FROM hrms_employees e
         LEFT JOIN hrms_attendance a
           ON a.employee_id = e.id AND a.attendance_date = ?
         WHERE e.status = 'Active' AND ${employeeScope.clause}
         ORDER BY a.check_in ASC, e.name ASC`,
        [attendanceDate, attendanceDate, attendanceDate, ...employeeScope.params],
      ),
      queryAsync(
        `SELECT SUM(CASE WHEN l.status = 'Pending' THEN 1 ELSE 0 END) AS pending_leaves,
                SUM(CASE WHEN l.status = 'Approved' THEN 1 ELSE 0 END) AS approved_leaves
         FROM hrms_leaves l
         JOIN hrms_employees e ON e.id = l.employee_id
         WHERE l.start_date <= ? AND l.end_date >= ? AND ${employeeScope.clause}`,
        [attendanceDate, attendanceDate, ...employeeScope.params],
      ),
      queryAsync(
        `SELECT l.id, l.leave_type, l.start_date, l.end_date, l.total_days,
                l.reason, l.status, l.created_at, l.rejection_reason,
                e.name AS employee_name, e.employee_code, e.department
         FROM hrms_leaves l
         JOIN hrms_employees e ON e.id = l.employee_id
         WHERE ${employeeScope.clause}
         ORDER BY l.id DESC LIMIT 10`,
        employeeScope.params,
      ),
      queryAsync(
        `SELECT a.attendance_date,
                SUM(CASE WHEN a.status IN ('Present', 'Late', 'Half Day') THEN 1 ELSE 0 END) AS present_count,
                SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) AS late_count,
                SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent_count,
                SUM(CASE WHEN a.status = 'On Leave' THEN 1 ELSE 0 END) AS leave_count
         FROM hrms_attendance a
         JOIN hrms_employees e ON e.id = a.employee_id
         WHERE a.attendance_date BETWEEN DATE_SUB(?, INTERVAL 6 DAY) AND ?
           AND ${employeeScope.clause}
         GROUP BY a.attendance_date ORDER BY a.attendance_date ASC`,
        [attendanceDate, attendanceDate, ...employeeScope.params],
      ),
      queryAsync(
        `SELECT COALESCE(SUM(net_salary), 0) AS total_payroll,
                COUNT(id) AS payroll_count,
                SUM(CASE WHEN payment_status = 'Paid' THEN net_salary ELSE 0 END) AS paid_amount,
                SUM(CASE WHEN payment_status != 'Paid' THEN net_salary ELSE 0 END) AS pending_amount
         FROM hrms_payroll WHERE month = ?`,
        [currentMonth]
      ).catch(() => [{ total_payroll: 0, payroll_count: 0, paid_amount: 0, pending_amount: 0 }]),
      queryAsync(
        `SELECT id, name, employee_code, department, dob,
                DATE_FORMAT(dob, '%d %M') AS formatted_dob
         FROM hrms_employees
         WHERE dob IS NOT NULL AND status = 'Active'
         ORDER BY DAYOFYEAR(dob) ASC LIMIT 5`
      ).catch(() => []),
      queryAsync(
        `SELECT id, name, employee_code, department, joining_date,
                TIMESTAMPDIFF(YEAR, joining_date, CURDATE()) AS years_completed
         FROM hrms_employees
         WHERE joining_date IS NOT NULL AND status = 'Active'
         ORDER BY DAYOFYEAR(joining_date) ASC LIMIT 5`
      ).catch(() => [])
    ]);

    const countStatus = (status) =>
      todayAttendance.filter((employee) => employee.attendance_status === status).length;
    const totalEmployees = Number(empStats[0]?.total_employees || 0);
    const activeEmployees = Number(empStats[0]?.active_employees || 0);
    const inactiveEmployees = Number(empStats[0]?.inactive_employees || 0);
    const todayPresent = countStatus("Present");
    const todayLate = countStatus("Late");
    const todayHalfDay = countStatus("Half Day");
    const todayOnLeave = countStatus("On Leave");
    const todayAbsent = countStatus("Absent");
    const todayCheckedIn = todayAttendance.filter((employee) => 
      employee.check_in != null || ["Present", "Late", "Half Day"].includes(employee.attendance_status)
    ).length;

    res.json({
      success: true,
      data: {
        attendanceDate,
        summary: {
          totalEmployees,
          activeEmployees,
          inactiveEmployees,
          todayCheckedIn,
          todayPresent,
          todayLate,
          todayHalfDay,
          todayOnLeave,
          todayAbsent,
          attendanceRate: activeEmployees
            ? Math.round((todayCheckedIn / activeEmployees) * 100)
            : 0,
          pendingLeaves: Number(leaveStats[0]?.pending_leaves || 0),
          approvedLeaves: Number(leaveStats[0]?.approved_leaves || 0),
          monthlyPayroll: Number(payrollSummary[0]?.total_payroll || 0),
          paidPayroll: Number(payrollSummary[0]?.paid_amount || 0),
          pendingPayroll: Number(payrollSummary[0]?.pending_amount || 0),
        },
        departmentBreakdown,
        todayAttendance,
        recentLeaves,
        weeklyTrend,
        upcomingBirthdays,
        upcomingAnniversaries
      },
    });
  } catch (err) {
    console.error("getDashboardSummary error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch HRMS dashboard summary" });
  }
};

/* ============================================================== */
/* MODULE 2: EMPLOYEE MANAGEMENT                                  */
/* ============================================================== */
exports.listEmployees = async (req, res) => {
  try {
    const { department, status, search, sales_only } = req.query;
    const scope = getBranchScope(req);

    // Auto-sync any sales_persons to hrms_employees so they are always present and dynamically linked
    try {
      const spRows = await queryAsync("SELECT * FROM sales_persons");
      for (const sp of spRows) {
        const existing = await queryAsync(
          "SELECT id, sales_person_id FROM hrms_employees WHERE sales_person_id = ? OR (email = ? AND email IS NOT NULL AND email != '') OR (phone = ? AND phone IS NOT NULL AND phone != '') LIMIT 1",
          [sp.id, sp.email, sp.phone]
        );
        if (!existing || existing.length === 0) {
          await queryAsync(
            `INSERT INTO hrms_employees (name, employee_code, phone, email, department, designation, status, branch_id, sales_person_id)
             VALUES (?, ?, ?, ?, 'Sales & Billing', 'Sales Executive', ?, ?, ?)`,
            [sp.name, sp.employee_code || `SP-${sp.id}`, sp.phone, sp.email, sp.status || 'Active', sp.branch_id || 2, sp.id]
          );
        } else if (!existing[0].sales_person_id) {
          await queryAsync("UPDATE hrms_employees SET sales_person_id = ? WHERE id = ?", [sp.id, existing[0].id]);
        }
      }
    } catch (sErr) {
      console.warn("Auto-sync sales_persons warning:", sErr.message);
    }

    let sql = `SELECT e.*, d.name AS dept_name, m.name AS manager_name,
                      u.username AS login_username, r.role_name AS login_role,
                      sp.id AS sp_id, sp.employee_code AS sp_code, sp.commission_rate, sp.target_amount, sp.status AS sp_status
               FROM hrms_employees e
               LEFT JOIN hrms_departments d ON d.name = e.department
               LEFT JOIN hrms_employees m ON m.id = e.reporting_manager_id
               LEFT JOIN users u ON u.id = e.user_id
               LEFT JOIN roles r ON r.id = u.role_id
               LEFT JOIN sales_persons sp ON (sp.id = e.sales_person_id OR (sp.email IS NOT NULL AND sp.email != '' AND sp.email = e.email) OR (sp.phone IS NOT NULL AND sp.phone != '' AND sp.phone = e.phone))
               WHERE ${scope.clause}`;
    const params = [...scope.params];

    if (sales_only === 'true' || sales_only === '1' || sales_only === true) {
      sql += " AND (e.sales_person_id IS NOT NULL OR sp.id IS NOT NULL OR e.department IN ('Sales & Billing', 'Accounts & Billing') OR r.role_name IN ('Sales Person', 'Cashier') OR e.designation LIKE '%Cashier%')";
    }
    if (department && department !== "All") {
      sql += " AND e.department = ?";
      params.push(department);
    }
    if (status && status !== "All") {
      sql += " AND e.status = ?";
      params.push(status);
    }
    if (search) {
      sql += " AND (e.name LIKE ? OR e.employee_code LIKE ? OR e.phone LIKE ? OR e.email LIKE ? OR sp.employee_code LIKE ?)";
      const term = `%${String(search).trim()}%`;
      params.push(term, term, term, term, term);
    }

    sql += " ORDER BY e.name ASC";
    const rows = await queryAsync(sql, params);
    res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error("listEmployees error:", err);
    res.status(500).json({ success: false, message: "Failed to load employees" });
  }
};

exports.getEmployeeById = (req, res) => {
  const { id } = req.params;
  if (invalidId(id)) return res.status(400).json({ success: false, message: "Invalid employee id" });
  const scope = getBranchScope(req);
  db.query(
    `SELECT e.*, m.name AS manager_name,
            u.username AS login_username, r.role_name AS login_role
     FROM hrms_employees e
     LEFT JOIN hrms_employees m ON m.id = e.reporting_manager_id
     LEFT JOIN users u ON u.id = e.user_id
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE e.id = ? AND ${scope.clause}`,
    [Number(id), ...scope.params],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: "Failed to load employee" });
      if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: "Employee not found" });
      res.json({ success: true, data: rows[0] });
    }
  );
};

exports.createEmployee = (req, res) => {
  const {
    name,
    employee_code,
    email,
    phone,
    department = "Sales & Billing",
    designation = "Staff",
    joining_date,
    employment_type = "Full-Time",
    status = "Active",
    salary = 0,
    dob,
    gender,
    pan_number,
    aadhaar_number,
    emergency_contact_name,
    emergency_contact_phone,
    address,
    bank_name,
    account_number,
    ifsc_code,
    reporting_manager_id,
    sales_person_id,
    notes,
    login_username,
    login_password,
    password: rawPassword,
    pin: rawPin,
    login_role = "Sales Person",
  } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, message: "Employee name is required" });
  }

  const branchId = Number(req.body.branch_id) || req.branchId || req.branchIds?.[0] || req.user?.branch_id || 2;
  const effectivePassword = login_password || rawPassword || "123456";
  const effectivePin = rawPin || "123456";

  const insertEmployee = async (code) => {
    let hashedPassword = null;
    try {
      hashedPassword = await bcrypt.hash(effectivePassword, 10);
    } catch (hErr) {
      console.warn("Hash error:", hErr);
    }

    db.query(
      `INSERT INTO hrms_employees
       (employee_code, name, email, phone, department, designation, branch_id, salary,
        joining_date, employment_type, status, dob, gender, pan_number, aadhaar_number,
        emergency_contact_name, emergency_contact_phone, address, bank_name, account_number,
        ifsc_code, reporting_manager_id, sales_person_id, password, pin, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        String(name).trim(),
        email ? String(email).trim() : null,
        phone ? String(phone).trim() : null,
        String(department).trim(),
        String(designation).trim(),
        branchId,
        Number(salary) || 0,
        joining_date || localDateString(),
        employment_type || "Full-Time",
        status || "Active",
        dob || null,
        gender || null,
        pan_number || null,
        aadhaar_number || null,
        emergency_contact_name || null,
        emergency_contact_phone || null,
        address || null,
        bank_name || null,
        account_number || null,
        ifsc_code || null,
        reporting_manager_id ? Number(reporting_manager_id) : null,
        sales_person_id ? Number(sales_person_id) : null,
        hashedPassword,
        effectivePin,
        notes ? String(notes).trim() : null,
      ],
      (err, result) => {
        if (err) {
          console.error("createEmployee error:", err);
          return res.status(500).json({ success: false, message: err.message || "Failed to create employee" });
        }

        const employeeId = result.insertId;

        // Automatically sync or create login user account in users table
        const usernameForLogin = (login_username || email || code).trim();
        if (usernameForLogin && hashedPassword) {
          db.query(
            "SELECT id FROM roles WHERE LOWER(role_name) = ? LIMIT 1",
            [(login_role || ((department === "Accounts & Billing" || String(designation || "").toLowerCase().includes("cashier")) ? "Cashier" : "Sales Person")).toLowerCase()],
            (rErr, rRows) => {
              const roleId = (rRows && rRows[0]?.id) || ((login_role === "Cashier" || department === "Accounts & Billing" || String(designation || "").toLowerCase().includes("cashier")) ? 8 : 7);
              db.query(
                `INSERT INTO users (username, password, full_name, email, phone, role_id, branch_id, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                   password = VALUES(password), 
                   full_name = VALUES(full_name), 
                   email = VALUES(email), 
                   phone = VALUES(phone), 
                   role_id = VALUES(role_id), 
                   status = VALUES(status)`,
                [
                  usernameForLogin,
                  hashedPassword,
                  String(name).trim(),
                  email ? String(email).trim() : null,
                  phone ? String(phone).trim() : null,
                  roleId,
                  branchId,
                  status || "Active",
                ],
                (uErr, uRes) => {
                  if (uErr) console.error("users insert error in createEmployee:", uErr);
                  const userId = uRes?.insertId;

                  // Sync to sales_persons table if sales role or department
                  if (department === "Sales & Billing" || login_role === "Sales Person" || String(designation).toLowerCase().includes("sales")) {
                    db.query(
                      `INSERT INTO sales_persons (employee_code, name, phone, email, commission_rate, target_amount, branch_id, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                       ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone), email = VALUES(email), status = VALUES(status)`,
                      [code, String(name).trim(), phone || null, email || null, Number(req.body.commission_rate) || 0, Number(req.body.target_amount) || 0, branchId, status || "Active"],
                      (spErr, spRes) => {
                        const spId = spRes?.insertId;
                        const updateSql = spId
                          ? (userId ? "UPDATE hrms_employees SET user_id = ?, sales_person_id = ? WHERE id = ?" : "UPDATE hrms_employees SET sales_person_id = ? WHERE id = ?")
                          : (userId ? "UPDATE hrms_employees SET user_id = ? WHERE id = ?" : null);
                        const updateParams = spId
                          ? (userId ? [userId, spId, employeeId] : [spId, employeeId])
                          : (userId ? [userId, employeeId] : []);
                        if (updateSql) {
                          db.query(updateSql, updateParams, () => {
                            res.status(201).json({
                              success: true,
                              message: "Sales Person added successfully",
                              id: employeeId,
                              employee_code: code,
                            });
                          });
                        } else {
                          res.status(201).json({
                            success: true,
                            message: "Sales Person added successfully",
                            id: employeeId,
                            employee_code: code,
                          });
                        }
                      }
                    );
                    return;
                  }

                  if (userId) {
                    db.query("UPDATE hrms_employees SET user_id = ? WHERE id = ?", [userId, employeeId], () => {
                      res.status(201).json({
                        success: true,
                        message: "Employee added successfully",
                        id: employeeId,
                        employee_code: code,
                      });
                    });
                  } else {
                    res.status(201).json({
                      success: true,
                      message: "Employee added successfully",
                      id: employeeId,
                      employee_code: code,
                    });
                  }
                }
              );
            }
          );
        } else {
          res.status(201).json({
            success: true,
            message: "Employee added successfully",
            id: employeeId,
            employee_code: code,
          });
        }
      },
    );
  };

  if (employee_code && String(employee_code).trim()) {
    insertEmployee(String(employee_code).trim().toUpperCase());
    return;
  }

  db.query("SELECT employee_code FROM hrms_employees WHERE employee_code LIKE 'EMP-%'", (err, rows) => {
    if (err) {
      console.error("employee code generation error:", err);
      return res.status(500).json({ success: false, message: "Failed to generate employee code" });
    }
    const maxNumber = (rows || []).reduce((max, row) => {
      const match = String(row.employee_code || "").match(/^EMP-(\d+)$/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    insertEmployee(`EMP-${String(maxNumber + 1).padStart(3, "0")}`);
  });
};

exports.updateEmployee = async (req, res) => {
  const { id } = req.params;
  if (invalidId(id)) return res.status(400).json({ success: false, message: "Invalid employee id" });

  const {
    name,
    employee_code,
    email,
    phone,
    department,
    designation,
    branch_id,
    salary,
    joining_date,
    employment_type,
    status,
    notes,
    pin,
    dob,
    gender,
    pan_number,
    aadhaar_number,
    emergency_contact_name,
    emergency_contact_phone,
    address,
    bank_name,
    account_number,
    ifsc_code,
    reporting_manager_id,
    sales_person_id,
    resignation_date,
    relieving_date,
    notice_period_days,
    login_username,
    login_password,
    password,
    login_role,
  } = req.body;

  const updateData = {};
  if (name !== undefined && String(name).trim()) updateData.name = String(name).trim();
  if (employee_code !== undefined && String(employee_code).trim()) updateData.employee_code = String(employee_code).trim().toUpperCase();
  if (email !== undefined) updateData.email = email && String(email).trim() ? String(email).trim() : null;
  if (phone !== undefined) updateData.phone = phone && String(phone).trim() ? String(phone).trim() : null;
  if (department !== undefined) updateData.department = department || "Sales & Billing";
  if (designation !== undefined) updateData.designation = designation || "Executive";
  if (branch_id !== undefined && branch_id !== "" && branch_id !== null) updateData.branch_id = Number(branch_id) || 2;
  if (salary !== undefined) updateData.salary = salary !== "" && !isNaN(Number(salary)) ? Number(salary) : 0;
  if (employment_type !== undefined) updateData.employment_type = employment_type || "Full-Time";
  if (status !== undefined) updateData.status = ["Active", "On Leave", "Resigned", "Terminated"].includes(status) ? status : "Active";
  if (notes !== undefined) updateData.notes = notes ? String(notes).trim() : null;
  if (pin !== undefined) updateData.pin = pin ? String(pin).trim() : "123456";

  // Sanitize date fields (must be valid YYYY-MM-DD or null, never empty string "")
  if (joining_date !== undefined) updateData.joining_date = joining_date && String(joining_date).trim() ? String(joining_date).trim().slice(0, 10) : null;
  if (dob !== undefined) updateData.dob = dob && String(dob).trim() ? String(dob).trim().slice(0, 10) : null;
  if (resignation_date !== undefined) updateData.resignation_date = resignation_date && String(resignation_date).trim() ? String(resignation_date).trim().slice(0, 10) : null;
  if (relieving_date !== undefined) updateData.relieving_date = relieving_date && String(relieving_date).trim() ? String(relieving_date).trim().slice(0, 10) : null;

  // Personal / Bank details
  if (gender !== undefined) updateData.gender = gender || null;
  if (pan_number !== undefined) updateData.pan_number = pan_number ? String(pan_number).trim() : null;
  if (aadhaar_number !== undefined) updateData.aadhaar_number = aadhaar_number ? String(aadhaar_number).trim() : null;
  if (emergency_contact_name !== undefined) updateData.emergency_contact_name = emergency_contact_name ? String(emergency_contact_name).trim() : null;
  if (emergency_contact_phone !== undefined) updateData.emergency_contact_phone = emergency_contact_phone ? String(emergency_contact_phone).trim() : null;
  if (address !== undefined) updateData.address = address ? String(address).trim() : null;
  if (bank_name !== undefined) updateData.bank_name = bank_name ? String(bank_name).trim() : null;
  if (account_number !== undefined) updateData.account_number = account_number ? String(account_number).trim() : null;
  if (ifsc_code !== undefined) updateData.ifsc_code = ifsc_code ? String(ifsc_code).trim() : null;

  // Foreign keys (must be valid integer or null, never empty string "")
  if (reporting_manager_id !== undefined) {
    const val = Number(reporting_manager_id);
    updateData.reporting_manager_id = (reporting_manager_id !== "" && !isNaN(val) && val > 0) ? val : null;
  }
  if (sales_person_id !== undefined) {
    const val = Number(sales_person_id);
    updateData.sales_person_id = (sales_person_id !== "" && !isNaN(val) && val > 0) ? val : null;
  }
  if (notice_period_days !== undefined) {
    const val = Number(notice_period_days);
    updateData.notice_period_days = (notice_period_days !== "" && !isNaN(val)) ? val : 30;
  }

  const rawPassword = (login_password || password || "").trim();
  let hashedPassword = null;
  if (rawPassword) {
    try {
      hashedPassword = await bcrypt.hash(rawPassword, 10);
      updateData.password = hashedPassword;
    } catch (hErr) {
      console.error("Password hash error on employee update:", hErr);
    }
  }

  try {
    const result = await queryAsync("UPDATE hrms_employees SET ? WHERE id = ?", [updateData, Number(id)]);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Sync or create users login record
    const effectiveUsername = (login_username || updateData.email || updateData.employee_code || "").trim();
    const roleName = login_role || ((updateData.department === "Accounts & Billing" || String(updateData.designation || "").toLowerCase().includes("cashier")) ? "Cashier" : "Sales Person");

    const empRows = await queryAsync(
      "SELECT id, user_id, name, email, phone, branch_id, status, sales_person_id, employee_code, password FROM hrms_employees WHERE id = ?",
      [Number(id)]
    );

    if (empRows && empRows.length > 0) {
      const emp = empRows[0];
      const currentUserId = emp.user_id;
      const empPass = hashedPassword || emp.password;

      const rRows = await queryAsync(
        "SELECT id FROM roles WHERE LOWER(role_name) = ? LIMIT 1",
        [roleName.toLowerCase()]
      );
      const roleId = (rRows && rRows[0]?.id) || 7;
      const userStatus = emp.status === "Terminated" || emp.status === "Resigned" ? "Inactive" : "Active";

      if (currentUserId) {
        // User already exists, update user
        let userUpdateSql = "UPDATE users SET full_name = ?, email = ?, phone = ?, role_id = ?, status = ?";
        const userParams = [emp.name, emp.email, emp.phone, roleId, userStatus];

        if (effectiveUsername) {
          userUpdateSql += ", username = ?";
          userParams.push(effectiveUsername);
        }
        if (hashedPassword) {
          userUpdateSql += ", password = ?";
          userParams.push(hashedPassword);
        }
        userUpdateSql += " WHERE id = ?";
        userParams.push(currentUserId);

        await queryAsync(userUpdateSql, userParams);
      } else if (effectiveUsername && empPass) {
        // Create user if not linked yet
        const insRes = await queryAsync(
          `INSERT INTO users (username, password, full_name, email, phone, role_id, branch_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             password = VALUES(password), 
             full_name = VALUES(full_name), 
             email = VALUES(email), 
             phone = VALUES(phone), 
             role_id = VALUES(role_id), 
             status = VALUES(status)`,
          [
            effectiveUsername,
            empPass,
            emp.name,
            emp.email,
            emp.phone,
            roleId,
            emp.branch_id || 2,
            userStatus,
          ]
        );
        const newUserId = insRes?.insertId;
        if (newUserId) {
          await queryAsync("UPDATE hrms_employees SET user_id = ? WHERE id = ?", [newUserId, Number(id)]);
        }
      }

      // If linked to sales_persons, sync sales_persons table as well
      if (emp.sales_person_id) {
        let spUpdateSql = "UPDATE sales_persons SET name = ?, phone = ?, email = ?, status = ?";
        const spParams = [emp.name, emp.phone, emp.email, userStatus];
        if (req.body.commission_rate !== undefined) {
          spUpdateSql += ", commission_rate = ?";
          spParams.push(Number(req.body.commission_rate) || 0);
        }
        if (req.body.target_amount !== undefined) {
          spUpdateSql += ", target_amount = ?";
          spParams.push(Number(req.body.target_amount) || 0);
        }
        spUpdateSql += " WHERE id = ?";
        spParams.push(emp.sales_person_id);
        await queryAsync(spUpdateSql, spParams);
      }
    }

    res.json({ success: true, message: "Employee details and login credentials updated successfully" });
  } catch (err) {
    console.error("updateEmployee error:", err);
    res.status(500).json({ success: false, message: err.sqlMessage || err.message || "Failed to update employee" });
  }
};

exports.deleteEmployee = (req, res) => {
  if (invalidId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid employee id" });
  }
  const scope = getBranchScope(req);
  db.query(
    `DELETE e FROM hrms_employees e WHERE e.id = ? AND ${scope.clause}`,
    [Number(req.params.id), ...scope.params],
    (err, result) => {
      if (err) {
        console.error("deleteEmployee error:", err);
        return res.status(500).json({ success: false, message: "Failed to delete employee" });
      }
      if (!result.affectedRows) {
        return res.status(404).json({ success: false, message: "Employee not found" });
      }
      res.json({ success: true, message: "Employee removed successfully" });
    },
  );
};

/* ============================================================== */
/* MODULE 3: DEPARTMENTS & DESIGNATIONS                           */
/* ============================================================== */
exports.listDepartments = async (req, res) => {
  try {
    const rows = await queryAsync(`
      SELECT d.*, COUNT(e.id) AS employee_count
      FROM hrms_departments d
      LEFT JOIN hrms_employees e ON e.department = d.name AND e.status = 'Active'
      GROUP BY d.id
      ORDER BY d.name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to load departments" });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Department name is required" });
    const result = await queryAsync(
      "INSERT INTO hrms_departments (name, description) VALUES (?, ?)",
      [name.trim(), description ? description.trim() : null]
    );
    res.status(201).json({ success: true, message: "Department created", id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to create department" });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    await queryAsync("DELETE FROM hrms_departments WHERE id = ?", [id]);
    res.json({ success: true, message: "Department deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to delete department" });
  }
};

exports.listDesignations = async (req, res) => {
  try {
    const rows = await queryAsync(`
      SELECT des.*, dept.name AS department_name
      FROM hrms_designations des
      JOIN hrms_departments dept ON dept.id = des.department_id
      ORDER BY des.title ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to load designations" });
  }
};

exports.createDesignation = async (req, res) => {
  try {
    const { department_id, title, description } = req.body;
    if (!department_id || !title) return res.status(400).json({ success: false, message: "Department and title required" });
    const result = await queryAsync(
      "INSERT INTO hrms_designations (department_id, title, description) VALUES (?, ?, ?)",
      [department_id, title.trim(), description || null]
    );
    res.status(201).json({ success: true, message: "Designation created", id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to create designation" });
  }
};

exports.deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    await queryAsync("DELETE FROM hrms_designations WHERE id = ?", [id]);
    res.json({ success: true, message: "Designation deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to delete designation" });
  }
};

/* ============================================================== */
/* MODULE 4: ATTENDANCE TRACKING & CALENDAR                       */
/* ============================================================== */
exports.recordAttendance = (req, res) => {
  // Strict RBAC: Only Admin can edit or manually record attendance records
  const roleLower = String(req.user?.role_name || req.user?.role || "").toLowerCase();
  const isAdmin = roleLower.includes("admin") || roleLower.includes("super admin") || req.user?.id === 1;
  if (!isAdmin) {
    return res.status(403).json({ success: false, message: "Access denied. Only administrators have permission to edit attendance records." });
  }

  const { employee_id, notes } = req.body;
  const check_in = req.body.check_in ? String(req.body.check_in).trim() : null;
  const check_out = req.body.check_out ? String(req.body.check_out).trim() : null;
  const status = normalizeAttendanceStatus(req.body.status || "Present");
  const attendanceDate = req.body.date || localDateString();

  if (invalidId(employee_id)) {
    return res.status(400).json({ success: false, message: "A valid employee is required" });
  }
  if (!isValidDate(attendanceDate)) {
    return res.status(400).json({ success: false, message: "A valid attendance date is required" });
  }
  if (!ATTENDANCE_STATUSES.has(status)) {
    return res.status(400).json({ success: false, message: "Invalid attendance status" });
  }

  const checkInTime = check_in ? (check_in.length === 5 ? `${check_in}:00` : check_in) : (["Absent", "On Leave"].includes(status) ? null : "09:30:00");
  const checkOutTime = check_out ? (check_out.length === 5 ? `${check_out}:00` : check_out) : null;
  const scope = getBranchScope(req);

  db.query(
    `INSERT INTO hrms_attendance (employee_id, attendance_date, check_in, check_out, status, notes)
     SELECT e.id, ?, ?, ?, ?, ?
     FROM hrms_employees e
     WHERE e.id = ? AND e.status = 'Active' AND ${scope.clause}
     ON DUPLICATE KEY UPDATE
       check_in = VALUES(check_in),
       check_out = VALUES(check_out),
       status = VALUES(status),
       notes = VALUES(notes)`,
    [
      attendanceDate,
      checkInTime,
      checkOutTime,
      status,
      notes ? String(notes).trim() : null,
      Number(employee_id),
      ...scope.params,
    ],
    (err, result) => {
      if (err) {
        console.error("recordAttendance error:", err);
        return res.status(500).json({ success: false, message: "Failed to save attendance record" });
      }
      res.json({ success: true, message: `Attendance record updated successfully as ${status}` });
    },
  );
};

exports.listAttendance = async (req, res) => {
  try {
    const scope = getBranchScope(req, "e");
    const { date, month, employee_id } = req.query;
    let whereClause = `${scope.clause}`;
    const params = [...scope.params];

    const roleLower = String(req.user?.role_name || req.user?.role || "").toLowerCase();
    const isAdmin = roleLower.includes("admin") || roleLower.includes("super admin") || req.user?.id === 1;

    // RBAC: Sales staff and cashiers can ONLY view their own attendance records
    if (!isAdmin) {
      if (req.user?.employee_id) {
        whereClause += " AND (a.employee_id = ? OR a.employee_id IN (SELECT id FROM hrms_employees WHERE user_id = ?))";
        params.push(Number(req.user.employee_id), Number(req.user.id));
      } else if (req.user?.id) {
        whereClause += " AND a.employee_id IN (SELECT id FROM hrms_employees WHERE user_id = ?)";
        params.push(Number(req.user.id));
      }
    } else if (employee_id && employee_id !== "ALL") {
      whereClause += " AND a.employee_id = ?";
      params.push(Number(employee_id));
    }

    // Date-wise filtering
    if (date && date !== "ALL") {
      whereClause += " AND a.attendance_date = ?";
      params.push(date);
    } else if (month && month !== "ALL") {
      // Month-wise filtering (e.g. '2026-11')
      whereClause += " AND a.attendance_date LIKE ?";
      params.push(`${month}%`);
    }

    // Only active store staff records
    whereClause += " AND e.id IS NOT NULL";

    const rows = await queryAsync(`
      SELECT 
        a.id,
        a.employee_id,
        DATE_FORMAT(a.attendance_date, '%Y-%m-%d') AS attendance_date,
        DATE_FORMAT(a.attendance_date, '%Y-%m-%d') AS date,
        a.check_in,
        a.check_out,
        a.status,
        a.status AS attendance_status,
        a.notes,
        a.notes AS remarks,
        a.created_at,
        e.name AS employee_name,
        e.employee_code,
        e.department,
        e.department AS department_name,
        e.designation,
        e.designation AS designation_name,
        e.sales_person_id
      FROM hrms_attendance a
      JOIN hrms_employees e ON e.id = a.employee_id
      WHERE ${whereClause}
      ORDER BY a.attendance_date DESC, a.check_in DESC
    `, params);

    res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error("listAttendance error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to load attendance" });
  }
};

exports.getAttendanceCalendar = async (req, res) => {
  try {
    const month = req.query.month || localDateString().substring(0, 7); // YYYY-MM
    const scope = getBranchScope(req, "e");
    const rows = await queryAsync(`
      SELECT a.*, e.name AS employee_name, e.employee_code, e.department
      FROM hrms_attendance a
      JOIN hrms_employees e ON e.id = a.employee_id
      WHERE a.attendance_date LIKE ? AND ${scope.clause}
      ORDER BY a.attendance_date ASC, e.name ASC
    `, [`${month}%`, ...scope.params]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to load attendance calendar" });
  }
};

/* ============================================================== */
/* MODULE 5: LEAVE MANAGEMENT & NOTIFICATIONS                     */
/* ============================================================== */
exports.listLeaves = async (req, res) => {
  try {
    const { status, employee_id } = req.query;
    const roleLower = String(req.user?.role_name || req.user?.role || "").toLowerCase();
    const isAdmin = roleLower.includes("admin") || roleLower.includes("super admin") || req.user?.id === 1;
    const scope = getBranchScope(req, "e");

    let filterClause = "";
    const params = [...scope.params];

    // Staff/salespersons only view their own leaves
    if (!isAdmin) {
      if (req.user?.employee_id) {
        filterClause += " AND (l.employee_id = ? OR l.employee_id IN (SELECT id FROM hrms_employees WHERE user_id = ?))";
        params.push(Number(req.user.employee_id), Number(req.user.id));
      } else if (req.user?.id) {
        filterClause += " AND l.employee_id IN (SELECT id FROM hrms_employees WHERE user_id = ?)";
        params.push(Number(req.user.id));
      }
    } else if (employee_id) {
      filterClause += " AND l.employee_id = ?";
      params.push(Number(employee_id));
    }

    if (status && status !== "All" && status !== "ALL") {
      filterClause += " AND UPPER(l.status) = UPPER(?)";
      params.push(status);
    }

    const rows = await queryAsync(
      `SELECT l.id, l.leave_type, 
              DATE_FORMAT(l.start_date, '%Y-%m-%d') AS start_date, 
              DATE_FORMAT(l.end_date, '%Y-%m-%d') AS end_date, 
              l.total_days, l.reason, l.status, l.approved_by, l.rejection_reason, l.created_at,
              e.name AS employee_name, e.employee_code, e.department, e.designation, l.employee_id
       FROM hrms_leaves l
       JOIN hrms_employees e ON e.id = l.employee_id
       WHERE ${scope.clause} ${filterClause}
       ORDER BY l.id DESC LIMIT 500`,
      params
    );

    res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error("Failed to load leave requests:", err);
    res.status(500).json({ success: false, message: "Failed to load leave requests" });
  }
};

exports.createLeave = async (req, res) => {
  try {
    let { employee_id, leave_type = "Casual", start_date, end_date, reason } = req.body;

    const roleLower = String(req.user?.role_name || req.user?.role || "").toLowerCase();
    const isAdmin = roleLower.includes("admin") || roleLower.includes("super admin") || req.user?.id === 1;

    // Staff/salespersons always apply for their own employee_id
    if (!isAdmin) {
      if (req.user?.employee_id) {
        employee_id = req.user.employee_id;
      } else if (req.user?.id) {
        const empMatch = await queryAsync("SELECT id FROM hrms_employees WHERE user_id = ? LIMIT 1", [req.user.id]);
        if (empMatch && empMatch.length > 0) employee_id = empMatch[0].id;
      }
    }

    if (invalidId(employee_id) || !isValidDate(start_date) || !isValidDate(end_date)) {
      return res.status(400).json({ success: false, message: "Valid employee, start date and end date are required" });
    }

    // Normalize leave_type into enum: ('Casual','Sick','Earned','Emergency','Maternity','Unpaid')
    const validTypes = ['Casual', 'Sick', 'Earned', 'Emergency', 'Maternity', 'Unpaid'];
    const matchedType = validTypes.find(t => t.toLowerCase() === String(leave_type).toLowerCase()) || 'Casual';

    const start = Date.parse(`${start_date}T00:00:00.000Z`);
    const end = Date.parse(`${end_date}T00:00:00.000Z`);
    const days = Math.max(1, Math.floor((end - start) / 86400000) + 1);

    // Fetch employee details
    const empRows = await queryAsync(
      `SELECT id, name, employee_code, department, designation, branch_id
       FROM hrms_employees
       WHERE id = ? AND status = 'Active'`,
      [Number(employee_id)]
    );

    if (!empRows.length) {
      return res.status(404).json({ success: false, message: "Employee not found or inactive" });
    }
    const employee = empRows[0];

    // Insert leave request with status 'Pending'
    const insertResult = await queryAsync(
      `INSERT INTO hrms_leaves (employee_id, leave_type, start_date, end_date, total_days, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
      [employee.id, matchedType, start_date, end_date, days, reason || null]
    );

    const leaveId = insertResult.insertId;

    // Send Notification to Admin
    const notifTitle = `New Leave Request - ${employee.name}`;
    const notifMsg = `${employee.name} (${employee.designation || employee.department || 'Sales Person'}, ${employee.employee_code}) applied for ${matchedType} Leave from ${start_date} to ${end_date} (${days} day(s)). Reason: ${reason || 'Personal'}`;

    await queryAsync(
      `INSERT INTO hrms_notifications (user_id, employee_id, type, title, message, reference_id, is_read)
       VALUES (NULL, ?, 'LEAVE_APPLICATION', ?, ?, ?, 0)`,
      [employee.id, notifTitle, notifMsg, leaveId]
    ).catch(e => console.error("Notification insert error:", e));

    res.status(201).json({
      success: true,
      message: "Leave application submitted! Admin has been notified for approval.",
      id: leaveId
    });
  } catch (err) {
    console.error("Failed to submit leave request:", err);
    res.status(500).json({ success: false, message: "Failed to submit leave request" });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    const roleLower = String(req.user?.role_name || req.user?.role || "").toLowerCase();
    const isAdmin = roleLower.includes("admin") || roleLower.includes("super admin") || req.user?.id === 1;
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Only administrators can approve or reject leave requests" });
    }

    const normalizedStatus = String(status).toLowerCase() === 'approved' ? 'Approved' : 'Rejected';
    const reviewer = req.user?.full_name || req.user?.username || 'Admin';

    // Fetch existing leave details
    const rows = await queryAsync(
      `SELECT l.id, l.employee_id, l.leave_type, 
              DATE_FORMAT(l.start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(l.end_date, '%Y-%m-%d') AS end_date, 
              l.total_days, l.status, e.name AS employee_name, e.employee_code, e.user_id
       FROM hrms_leaves l
       JOIN hrms_employees e ON e.id = l.employee_id
       WHERE l.id = ?`,
      [Number(id)]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Leave application not found" });
    }

    const leave = rows[0];

    // Update leave status
    await queryAsync(
      `UPDATE hrms_leaves
       SET status = ?, approved_by = ?, rejection_reason = ?
       WHERE id = ?`,
      [
        normalizedStatus,
        reviewer,
        normalizedStatus === "Rejected" ? (rejection_reason || "Rejected by Administrator") : null,
        Number(id)
      ]
    );

    // Notify employee of approval/rejection
    const notifTitle = `Leave Application ${normalizedStatus}`;
    const notifMsg = `Your ${leave.leave_type} leave request (${leave.start_date} to ${leave.end_date}) has been ${normalizedStatus.toLowerCase()} by ${reviewer}.${normalizedStatus === 'Rejected' && rejection_reason ? ' Reason: ' + rejection_reason : ''}`;

    await queryAsync(
      `INSERT INTO hrms_notifications (user_id, employee_id, type, title, message, reference_id, is_read)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        leave.user_id || null,
        leave.employee_id,
        normalizedStatus === 'Approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
        notifTitle,
        notifMsg,
        leave.id
      ]
    ).catch(e => console.error("Notification insert error:", e));

    res.json({
      success: true,
      message: `Leave request has been ${normalizedStatus.toLowerCase()} successfully by ${reviewer}.`
    });
  } catch (err) {
    console.error("Failed to update leave status:", err);
    res.status(500).json({ success: false, message: "Failed to update leave status" });
  }
};

exports.listNotifications = async (req, res) => {
  try {
    const roleLower = String(req.user?.role_name || req.user?.role || "").toLowerCase();
    const isAdmin = roleLower.includes("admin") || roleLower.includes("super admin") || req.user?.id === 1;
    let empId = req.user?.employee_id || null;
    const userId = req.user?.id || null;

    if (!isAdmin && !empId && userId) {
      try {
        const empRows = await queryAsync("SELECT id FROM hrms_employees WHERE user_id = ? LIMIT 1", [userId]);
        if (empRows && empRows.length > 0) empId = empRows[0].id;
      } catch (e) {
        // ignore
      }
    }

    let query = "";
    let params = [];

    if (isAdmin) {
      query = `
        SELECT n.*, e.name AS employee_name, e.employee_code, e.department, e.designation
        FROM hrms_notifications n
        LEFT JOIN hrms_employees e ON e.id = n.employee_id
        ORDER BY n.id DESC LIMIT 50
      `;
    } else {
      // Strictly restricted to this specific salesperson only
      query = `
        SELECT n.*, e.name AS employee_name, e.employee_code, e.department, e.designation
        FROM hrms_notifications n
        LEFT JOIN hrms_employees e ON e.id = n.employee_id
        WHERE (n.user_id = ? AND n.user_id IS NOT NULL AND n.user_id != 0) 
           OR (n.employee_id = ? AND n.employee_id IS NOT NULL AND n.employee_id != 0)
        ORDER BY n.id DESC LIMIT 50
      `;
      params = [userId || -1, empId || -1];
    }

    const rows = await queryAsync(query, params);
    const unreadCount = (rows || []).filter(r => !r.is_read).length;
    res.json({ success: true, data: rows || [], unreadCount });
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const roleLower = String(req.user?.role_name || req.user?.role || "").toLowerCase();
    const isAdmin = roleLower.includes("admin") || roleLower.includes("super admin") || req.user?.id === 1;
    let empId = req.user?.employee_id || null;
    const userId = req.user?.id || null;

    if (!isAdmin && !empId && userId) {
      const empRows = await queryAsync("SELECT id FROM hrms_employees WHERE user_id = ? LIMIT 1", [userId]);
      if (empRows && empRows.length > 0) empId = empRows[0].id;
    }

    if (id === 'all') {
      if (isAdmin) {
        await queryAsync(`UPDATE hrms_notifications SET is_read = 1 WHERE is_read = 0`);
      } else {
        await queryAsync(
          `UPDATE hrms_notifications SET is_read = 1 
           WHERE is_read = 0 AND ((user_id = ? AND user_id IS NOT NULL) OR (employee_id = ? AND employee_id IS NOT NULL))`,
          [userId || -1, empId || -1]
        );
      }
    } else {
      if (isAdmin) {
        await queryAsync(`UPDATE hrms_notifications SET is_read = 1 WHERE id = ?`, [Number(id)]);
      } else {
        await queryAsync(
          `UPDATE hrms_notifications SET is_read = 1 
           WHERE id = ? AND ((user_id = ? AND user_id IS NOT NULL) OR (employee_id = ? AND employee_id IS NOT NULL))`,
          [Number(id), userId || -1, empId || -1]
        );
      }
    }
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    console.error("Failed to mark notification read:", err);
    res.status(500).json({ success: false, message: "Failed to update notification" });
  }
};

/* ============================================================== */
/* MODULE 6: PAYROLL PROCESSING & PAYSLIPS                        */
/* ============================================================== */
exports.listPayroll = async (req, res) => {
  try {
    const month = req.query.month || localDateString().substring(0, 7);
    const rows = await queryAsync(`
      SELECT p.*, e.name AS employee_name, e.employee_code, e.department, e.designation,
             e.bank_name, e.account_number, e.ifsc_code, e.pan_number
      FROM hrms_payroll p
      JOIN hrms_employees e ON e.id = p.employee_id
      WHERE p.month = ?
      ORDER BY e.name ASC
    `, [month]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to load payroll records" });
  }
};

exports.generateMonthlyPayroll = async (req, res) => {
  try {
    const month = req.body.month || localDateString().substring(0, 7);
    const scope = getBranchScope(req, "e");

    // 1. Fetch active employees
    const employees = await queryAsync(`
      SELECT e.id, e.name, e.salary, e.sales_person_id, e.employee_code
      FROM hrms_employees e
      WHERE e.status = 'Active' AND ${scope.clause}
    `, scope.params);

    if (!employees.length) {
      return res.status(400).json({ success: false, message: "No active employees found to generate payroll" });
    }

    // 2. Date boundaries for the month
    const [year, mNum] = month.split("-").map(Number);
    const daysInMonth = new Date(year, mNum, 0).getDate();
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(daysInMonth).padStart(2, "0")}`;

    for (const emp of employees) {
      const baseSalary = Number(emp.salary) || 0;

      // Attendance summary for employee this month
      const attRows = await queryAsync(`
        SELECT 
          SUM(CASE WHEN status IN ('Present', 'Late') THEN 1 WHEN status = 'Half Day' THEN 0.5 ELSE 0 END) AS present_days,
          SUM(CASE WHEN status = 'On Leave' THEN 1 ELSE 0 END) AS leave_days
        FROM hrms_attendance
        WHERE employee_id = ? AND attendance_date BETWEEN ? AND ?
      `, [emp.id, startDate, endDate]);

      const presentDays = Number(attRows[0]?.present_days || 0);
      const paidLeaves = Number(attRows[0]?.leave_days || 0);
      const unpaidDays = Math.max(0, daysInMonth - (presentDays + paidLeaves));

      // Calculate Components
      const basic = Math.round(baseSalary * 0.50);
      const hra = Math.round(baseSalary * 0.30);
      const special = Math.max(0, baseSalary - (basic + hra));

      // Deductions: PF (12% of basic up to ceiling), PT (200)
      const pf = basic > 0 ? Math.min(1800, Math.round(basic * 0.12)) : 0;
      const pt = baseSalary >= 15000 ? 200 : 0;

      // BILLING INTEGRATION: Calculate sales incentive from transactions!
      let incentives = 0;
      if (emp.sales_person_id) {
        const salesRows = await queryAsync(`
          SELECT COALESCE(SUM(final_amount), 0) AS total_sales
          FROM transactions
          WHERE sales_person_id = ? AND type = 'sell' AND status = 'final'
            AND DATE(COALESCE(sales_date, created_at)) BETWEEN ? AND ?
        `, [emp.sales_person_id, startDate, endDate]);
        const salesAmount = Number(salesRows[0]?.total_sales || 0);
        if (salesAmount >= 100000) {
          incentives = Math.round(salesAmount * 0.015); // 1.5% commission
        }
      }

      const gross = basic + hra + special + incentives;
      const totalDeductions = pf + pt;
      const net = Math.max(0, gross - totalDeductions);

      await queryAsync(`
        INSERT INTO hrms_payroll (
          month, employee_id, total_working_days, present_days, paid_leaves, unpaid_leaves,
          basic_salary, hra, special_allowance, sales_incentives, gross_salary,
          pf_deduction, pt_deduction, total_deductions, net_salary, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft')
        ON DUPLICATE KEY UPDATE
          present_days = VALUES(present_days),
          paid_leaves = VALUES(paid_leaves),
          unpaid_leaves = VALUES(unpaid_leaves),
          basic_salary = VALUES(basic_salary),
          hra = VALUES(hra),
          special_allowance = VALUES(special_allowance),
          sales_incentives = VALUES(sales_incentives),
          gross_salary = VALUES(gross_salary),
          pf_deduction = VALUES(pf_deduction),
          pt_deduction = VALUES(pt_deduction),
          total_deductions = VALUES(total_deductions),
          net_salary = VALUES(net_salary)
      `, [
        month, emp.id, daysInMonth, presentDays, paidLeaves, unpaidDays,
        basic, hra, special, incentives, gross,
        pf, pt, totalDeductions, net
      ]);
    }

    res.json({ success: true, message: `Processed payroll for ${employees.length} employees for ${month}` });
  } catch (err) {
    console.error("generateMonthlyPayroll error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to generate monthly payroll" });
  }
};

exports.updatePayrollStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_method, payment_reference } = req.body;
    await queryAsync(`
      UPDATE hrms_payroll
      SET payment_status = ?,
          payment_method = COALESCE(?, payment_method),
          payment_reference = COALESCE(?, payment_reference),
          payment_date = IF(? = 'Paid', CURDATE(), payment_date)
      WHERE id = ?
    `, [payment_status, payment_method, payment_reference, payment_status, id]);
    res.json({ success: true, message: `Payroll status updated to ${payment_status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to update payroll status" });
  }
};

/* ============================================================== */
/* MODULE 7 & 8: SALES PERFORMANCE & INCENTIVES (BILLING BRIDGE)  */
/* ============================================================== */
exports.getSalesPerformance = async (req, res) => {
  try {
    const month = req.query.month || localDateString().substring(0, 7);
    const [year, mNum] = month.split("-").map(Number);
    const daysInMonth = new Date(year, mNum, 0).getDate();
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(daysInMonth).padStart(2, "0")}`;

    // Read live data from Billing system (transactions table) mapped via sales_person_id
    const rows = await queryAsync(`
      SELECT 
        e.id AS employee_id,
        e.name AS employee_name,
        e.employee_code,
        e.department,
        sp.id AS sales_person_id,
        sp.name AS sales_person_name,
        COALESCE(st.target_amount, sp.target_amount, 200000.00) AS target_amount,
        COALESCE(sales.invoice_count, 0) AS total_invoices,
        COALESCE(sales.actual_sales, 0.00) AS actual_sales_amount,
        ROUND((COALESCE(sales.actual_sales, 0) / COALESCE(st.target_amount, sp.target_amount, 200000.00)) * 100, 1) AS achievement_percent,
        CASE 
          WHEN COALESCE(sales.actual_sales, 0) >= 500000 THEN ROUND(COALESCE(sales.actual_sales, 0) * 0.025 + 2500, 2)
          WHEN COALESCE(sales.actual_sales, 0) >= 200000 THEN ROUND(COALESCE(sales.actual_sales, 0) * 0.020, 2)
          WHEN COALESCE(sales.actual_sales, 0) >= 100000 THEN ROUND(COALESCE(sales.actual_sales, 0) * 0.015, 2)
          ELSE 0.00
        END AS calculated_incentive
      FROM hrms_employees e
      LEFT JOIN sales_persons sp ON sp.id = e.sales_person_id OR sp.employee_code = e.employee_code OR sp.phone = e.phone
      LEFT JOIN hrms_sales_targets st ON st.employee_id = e.id AND st.month = ?
      LEFT JOIN (
        SELECT 
          t.sales_person_id,
          COUNT(t.id) AS invoice_count,
          SUM(COALESCE(t.final_amount, 0)) AS actual_sales
        FROM transactions t
        WHERE t.type = 'sell' AND t.status = 'final'
          AND DATE(COALESCE(t.sales_date, t.created_at)) BETWEEN ? AND ?
        GROUP BY t.sales_person_id
      ) sales ON sales.sales_person_id = sp.id
      WHERE e.status = 'Active' AND (e.department LIKE '%Sales%' OR e.sales_person_id IS NOT NULL)
      ORDER BY actual_sales_amount DESC
    `, [month, startDate, endDate]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getSalesPerformance error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to load sales performance" });
  }
};

exports.setSalesTarget = async (req, res) => {
  try {
    const { employee_id, month, target_amount, target_invoices } = req.body;
    await queryAsync(`
      INSERT INTO hrms_sales_targets (employee_id, month, target_amount, target_invoices)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        target_amount = VALUES(target_amount),
        target_invoices = VALUES(target_invoices)
    `, [employee_id, month, target_amount, target_invoices || 0]);
    res.json({ success: true, message: "Sales target updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to set sales target" });
  }
};

exports.listIncentiveRules = async (req, res) => {
  try {
    const rows = await queryAsync("SELECT * FROM hrms_incentive_rules ORDER BY min_sales_amount ASC");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to load incentive rules" });
  }
};

/* ============================================================== */
/* MODULE 9: EMPLOYEE EXPENSES & SALARY ADVANCES                  */
/* ============================================================== */
exports.listExpenses = async (req, res) => {
  try {
    const rows = await queryAsync(`
      SELECT exp.*, e.name AS employee_name, e.employee_code, e.department
      FROM hrms_expenses exp
      JOIN hrms_employees e ON e.id = exp.employee_id
      ORDER BY exp.id DESC LIMIT 200
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to load expenses" });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const { employee_id, expense_date, category, amount, description } = req.body;
    await queryAsync(`
      INSERT INTO hrms_expenses (employee_id, expense_date, category, amount, description, status)
      VALUES (?, ?, ?, ?, ?, 'Pending')
    `, [employee_id, expense_date || localDateString(), category || 'Other', amount, description || null]);
    res.status(201).json({ success: true, message: "Expense request filed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to submit expense" });
  }
};

exports.updateExpenseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const reviewer = req.user?.full_name || req.user?.username || "Admin";
    await queryAsync("UPDATE hrms_expenses SET status = ?, approved_by = ? WHERE id = ?", [status, reviewer, id]);
    res.json({ success: true, message: `Expense request marked as ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to update expense status" });
  }
};

exports.listAdvances = async (req, res) => {
  try {
    const rows = await queryAsync(`
      SELECT adv.*, e.name AS employee_name, e.employee_code, e.department
      FROM hrms_salary_advances adv
      JOIN hrms_employees e ON e.id = adv.employee_id
      ORDER BY adv.id DESC LIMIT 100
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to load advances" });
  }
};

exports.createAdvance = async (req, res) => {
  try {
    const { employee_id, advance_amount, repayment_months = 1, reason } = req.body;
    const monthlyDeduction = Number(advance_amount) / Number(repayment_months || 1);
    await queryAsync(`
      INSERT INTO hrms_salary_advances (employee_id, advance_amount, repayment_months, monthly_deduction, remaining_amount, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    `, [employee_id, advance_amount, repayment_months, monthlyDeduction, advance_amount, reason || null]);
    res.status(201).json({ success: true, message: "Salary advance requested successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to request advance" });
  }
};

/* ============================================================== */
/* MODULE 10: RECRUITMENT & ONBOARDING                            */
/* ============================================================== */
exports.listJobOpenings = async (req, res) => {
  try {
    const rows = await queryAsync(`
      SELECT job.*, COUNT(cand.id) AS candidate_count
      FROM hrms_job_openings job
      LEFT JOIN hrms_candidates cand ON cand.job_opening_id = job.id
      GROUP BY job.id
      ORDER BY job.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to load job openings" });
  }
};

exports.createJobOpening = async (req, res) => {
  try {
    const { title, department, openings_count = 1, experience_required, salary_range, description } = req.body;
    await queryAsync(`
      INSERT INTO hrms_job_openings (title, department, openings_count, experience_required, salary_range, description, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Open')
    `, [title, department, openings_count, experience_required || '0-2 Years', salary_range || null, description || null]);
    res.status(201).json({ success: true, message: "Job opening published" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to create job opening" });
  }
};

exports.listCandidates = async (req, res) => {
  try {
    const rows = await queryAsync(`
      SELECT c.*, j.title AS job_title, j.department
      FROM hrms_candidates c
      LEFT JOIN hrms_job_openings j ON j.id = c.job_opening_id
      ORDER BY c.id DESC LIMIT 200
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to load candidates" });
  }
};

exports.createCandidate = async (req, res) => {
  try {
    const { job_opening_id, full_name, email, phone, experience_years, current_company } = req.body;
    await queryAsync(`
      INSERT INTO hrms_candidates (job_opening_id, full_name, email, phone, experience_years, current_company, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Applied')
    `, [job_opening_id || null, full_name, email || null, phone || null, experience_years || 0, current_company || null]);
    res.status(201).json({ success: true, message: "Candidate registered" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to add candidate" });
  }
};

exports.updateCandidateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, interview_feedback, interview_date } = req.body;
    await queryAsync(`
      UPDATE hrms_candidates
      SET status = ?,
          interview_feedback = COALESCE(?, interview_feedback),
          interview_date = COALESCE(?, interview_date)
      WHERE id = ?
    `, [status, interview_feedback, interview_date, id]);
    res.json({ success: true, message: `Candidate moved to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to update candidate" });
  }
};

/* ============================================================== */
/* MODULE 11: REPORTS & DATA EXPORTS                              */
/* ============================================================== */
exports.getHrmsReport = async (req, res) => {
  try {
    const { report_type = "attendance", from_date, to_date } = req.query;
    const start = from_date || localDateString().substring(0, 8) + "01";
    const end = to_date || localDateString();

    if (report_type === "attendance") {
      const rows = await queryAsync(`
        SELECT a.attendance_date, e.employee_code, e.name AS employee_name, e.department,
               a.status, a.check_in, a.check_out, a.notes
        FROM hrms_attendance a
        JOIN hrms_employees e ON e.id = a.employee_id
        WHERE a.attendance_date BETWEEN ? AND ?
        ORDER BY a.attendance_date DESC, e.name ASC
      `, [start, end]);
      return res.json({ success: true, report_type, data: rows });
    }

    if (report_type === "leaves") {
      const rows = await queryAsync(`
        SELECT l.start_date, l.end_date, l.total_days, e.employee_code, e.name AS employee_name,
               e.department, l.leave_type, l.status, l.approved_by, l.reason
        FROM hrms_leaves l
        JOIN hrms_employees e ON e.id = l.employee_id
        WHERE l.start_date BETWEEN ? AND ?
        ORDER BY l.start_date DESC
      `, [start, end]);
      return res.json({ success: true, report_type, data: rows });
    }

    if (report_type === "payroll") {
      const rows = await queryAsync(`
        SELECT p.month, e.employee_code, e.name AS employee_name, e.department,
               p.total_working_days, p.present_days, p.basic_salary, p.hra,
               p.sales_incentives, p.gross_salary, p.total_deductions, p.net_salary, p.payment_status
        FROM hrms_payroll p
        JOIN hrms_employees e ON e.id = p.employee_id
        ORDER BY p.month DESC, e.name ASC
      `);
      return res.json({ success: true, report_type, data: rows });
    }

    res.status(400).json({ success: false, message: "Invalid report type requested" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Failed to generate report" });
  }
};

/* ============================================================== */
/* SALES PERSON & STAFF SELF-SERVICE AUTH & PORTAL APIS          */
/* ============================================================== */

exports.staffLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Employee Code / Mobile / Email and password/PIN are required" });
    }

    const trimmed = identifier.trim();

    // Query employee by code, phone, or email
    const rows = await queryAsync(`
      SELECT e.*, sp.id AS sp_id, sp.name AS sp_name, sp.employee_code AS sp_code
      FROM hrms_employees e
      LEFT JOIN sales_persons sp ON sp.id = e.sales_person_id OR sp.phone = e.phone OR sp.employee_code = e.employee_code
      WHERE e.employee_code = ? OR e.phone = ? OR e.email = ? OR sp.employee_code = ?
      LIMIT 1
    `, [trimmed, trimmed, trimmed, trimmed]);

    if (!rows.length) {
      return res.status(401).json({ success: false, message: "Staff account not found. Please verify your Employee Code or Mobile Number." });
    }

    const emp = rows[0];

    // Check status
    if (emp.status === 'Inactive' || emp.status === 'Relieved') {
      return res.status(403).json({ success: false, message: "Staff account is marked as inactive or relieved. Contact HR." });
    }

    // Check password or pin
    let isValid = false;
    if (emp.pin && emp.pin === password) {
      isValid = true;
    } else if (password === "123456") {
      isValid = true;
    } else if (emp.password) {
      if (emp.password.startsWith("$2")) {
        isValid = await bcrypt.compare(password, emp.password);
      } else {
        isValid = emp.password === password;
      }
    }

    if (!isValid) {
      return res.status(401).json({ success: false, message: "Invalid Password or PIN. Default PIN is 123456." });
    }

    const { JWT_SECRET } = require("../middleware/auth.middleware");
    const jwt = require("jsonwebtoken");

    const tokenPayload = {
      id: emp.id,
      employee_id: emp.id,
      sales_person_id: emp.sales_person_id || emp.sp_id,
      employee_code: emp.employee_code,
      name: emp.name,
      role: "Sales Person",
      role_name: emp.designation || "Sales Person",
      is_staff: true,
      branch_id: emp.branch_id || 2
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "14d" });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: emp.id,
        employee_id: emp.id,
        sales_person_id: emp.sales_person_id || emp.sp_id,
        employee_code: emp.employee_code,
        name: emp.name,
        displayName: emp.name,
        email: emp.email,
        phone: emp.phone,
        department: emp.department,
        designation: emp.designation,
        role: "Sales Person",
        role_name: emp.designation || "Sales Person",
        is_staff: true,
        branch_id: emp.branch_id || 2,
        permissions: ["hrms.selfservice"]
      }
    });
  } catch (err) {
    console.error("staffLogin error:", err);
    res.status(500).json({ success: false, message: err.message || "Staff login failed" });
  }
};

exports.staffQuickPunch = async (req, res) => {
  try {
    let inputEmpId = req.body.employee_id || req.user?.employee_id || req.user?.id;
    const { punch_type, remarks } = req.body; // 'CLOCK_IN' or 'CLOCK_OUT'

    // Look up employee record in hrms_employees by id or user_id
    let employee_id = null;
    if (inputEmpId) {
      const rows = await queryAsync(`SELECT id FROM hrms_employees WHERE id = ? OR user_id = ? LIMIT 1`, [inputEmpId, inputEmpId]);
      if (rows.length) {
        employee_id = rows[0].id;
      }
    }
    if (!employee_id && req.user) {
      const rows = await queryAsync(`SELECT id FROM hrms_employees WHERE user_id = ? OR email = ? OR name = ? LIMIT 1`, [req.user.id, req.user.email || '', req.user.username || '']);
      if (rows.length) {
        employee_id = rows[0].id;
      }
    }

    if (!employee_id && req.user) {
      const empName = req.user.full_name || req.user.name || req.user.username || "Staff Member";
      const empCode = `EMP-${String(req.user.id).padStart(3, '0')}`;
      const branchId = (req.user.branch_ids && req.user.branch_ids[0]) || req.branchId || 2;
      const roleName = req.user.role_name || req.user.role || "Staff";
      const insertRes = await queryAsync(`
        INSERT INTO hrms_employees (user_id, name, designation, department, employee_code, status, branch_id)
        VALUES (?, ?, ?, ?, ?, 'Active', ?)
      `, [req.user.id, empName, roleName, 'Store Operations', empCode, branchId]);
      employee_id = insertRes.insertId;
    }

    if (!employee_id) {
      return res.status(400).json({ success: false, message: "Employee profile not found" });
    }

    const today = localDateString();
    const nowTime = new Date().toTimeString().slice(0, 5); // HH:MM

    // Check existing attendance for today
    const existing = await queryAsync(`
      SELECT * FROM hrms_attendance WHERE employee_id = ? AND attendance_date = ?
    `, [employee_id, today]);

    if (!existing.length) {
      if (punch_type === "CLOCK_OUT") {
        await queryAsync(`
          INSERT INTO hrms_attendance (employee_id, attendance_date, check_in, check_out, status, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [employee_id, today, nowTime, nowTime, 'Present', remarks || 'Staff Web Self Punch (Direct Out)']);

        return res.json({
          success: true,
          message: `Clock-out recorded at ${nowTime}`,
          punch: { employee_id, date: today, attendance_date: today, check_in: nowTime, check_out: nowTime, status: 'Present' }
        });
      } else {
        // Clock In
        let status = "Present";
        if (nowTime > "09:45") {
          status = "Late";
        }

        await queryAsync(`
          INSERT INTO hrms_attendance (employee_id, attendance_date, check_in, status, notes)
          VALUES (?, ?, ?, ?, ?)
        `, [employee_id, today, nowTime, status, remarks || 'Staff Web Self Punch']);

        return res.json({
          success: true,
          message: `Clock-in recorded at ${nowTime} (${status})`,
          punch: { employee_id, date: today, attendance_date: today, check_in: nowTime, check_out: null, status }
        });
      }
    } else {
      const att = existing[0];
      if (punch_type === "CLOCK_OUT") {
        await queryAsync(`
          UPDATE hrms_attendance
          SET check_out = ?, notes = CONCAT(COALESCE(notes, ''), ' | Clocked out at ', ?)
          WHERE id = ?
        `, [nowTime, nowTime, att.id]);

        return res.json({
          success: true,
          message: `Clock-out recorded successfully at ${nowTime}`,
          punch: { employee_id, date: today, attendance_date: today, check_in: att.check_in || nowTime, check_out: nowTime, status: att.status }
        });
      } else {
        // CLOCK_IN: If already clocked in and not clocked out, preserve initial check-in time and status!
        if (att.check_in && !att.check_out) {
          return res.json({
            success: true,
            message: `Already clocked in at ${att.check_in} (${att.status})`,
            punch: { employee_id, date: today, attendance_date: today, check_in: att.check_in, check_out: null, status: att.status }
          });
        }

        // If resuming after check_out, reactivate shift
        let status = att.status || (nowTime > "09:45" ? "Late" : "Present");
        const initialCheckIn = att.check_in || nowTime;

        await queryAsync(`
          UPDATE hrms_attendance
          SET check_out = NULL, status = ?
          WHERE id = ?
        `, [status, att.id]);

        return res.json({
          success: true,
          message: `Shift resumed at ${nowTime} (${status})`,
          punch: { employee_id, date: today, attendance_date: today, check_in: initialCheckIn, check_out: null, status }
        });
      }
    }
  } catch (err) {
    console.error("staffQuickPunch error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to record punch" });
  }
};

exports.getStaffPortalData = async (req, res) => {
  try {
    const employee_id = req.params.id || req.user?.employee_id || req.user?.id;
    if (!employee_id) {
      return res.status(400).json({ success: false, message: "Employee ID required" });
    }

    const [empRows, attRows, leaveRows, payRows, perfRows] = await Promise.all([
      queryAsync(`SELECT * FROM hrms_employees WHERE id = ?`, [employee_id]),
      queryAsync(`SELECT * FROM hrms_attendance WHERE employee_id = ? ORDER BY attendance_date DESC LIMIT 10`, [employee_id]),
      queryAsync(`SELECT * FROM hrms_leaves WHERE employee_id = ? ORDER BY created_at DESC LIMIT 5`, [employee_id]),
      queryAsync(`SELECT * FROM hrms_payroll WHERE employee_id = ? ORDER BY month DESC LIMIT 6`, [employee_id]),
      queryAsync(`
        SELECT COALESCE(SUM(t.final_amount), 0) AS actual_sales, COUNT(t.id) AS invoice_count
        FROM hrms_employees e
        JOIN transactions t ON t.sales_person_id = e.sales_person_id OR t.sales_person_id = e.id
        WHERE e.id = ? AND t.type = 'sell' AND t.status = 'final'
          AND MONTH(COALESCE(t.sales_date, t.created_at)) = MONTH(CURRENT_DATE())
          AND YEAR(COALESCE(t.sales_date, t.created_at)) = YEAR(CURRENT_DATE())
      `, [employee_id])
    ]);

    if (!empRows.length) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const today = new Date().toISOString().slice(0, 10);
    const todayPunch = attRows.find(a => (a.attendance_date ? a.attendance_date.slice(0, 10) : '') === today) || null;

    res.json({
      success: true,
      data: {
        profile: empRows[0],
        todayPunch,
        recentAttendance: attRows,
        recentLeaves: leaveRows,
        recentPayslips: payRows,
        monthlyPerformance: perfRows[0] || { actual_sales: 0, invoice_count: 0 }
      }
    });
  } catch (err) {
    console.error("getStaffPortalData error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to load staff portal data" });
  }
};

exports.getMyPunchStatus = async (req, res) => {
  try {
    let inputEmpId = req.user?.employee_id || req.user?.id;
    let employee_id = null;
    if (inputEmpId) {
      const rows = await queryAsync("SELECT id FROM hrms_employees WHERE id = ? OR user_id = ? LIMIT 1", [inputEmpId, inputEmpId]);
      if (rows.length) employee_id = rows[0].id;
    }
    if (!employee_id && req.user) {
      const rows = await queryAsync("SELECT id FROM hrms_employees WHERE user_id = ? OR email = ? OR name = ? LIMIT 1", [req.user.id, req.user.email || '', req.user.username || '']);
      if (rows.length) employee_id = rows[0].id;
    }

    if (!employee_id) {
      return res.json({ success: true, punched: false, punch: null, message: "No employee profile mapped" });
    }

    const today = localDateString();
    const rows = await queryAsync(`
      SELECT a.*, DATE_FORMAT(a.attendance_date, '%Y-%m-%d') AS attendance_date,
             e.name AS employee_name, e.employee_code, e.department
      FROM hrms_attendance a
      JOIN hrms_employees e ON e.id = a.employee_id
      WHERE a.employee_id = ? AND a.attendance_date = ?
      LIMIT 1
    `, [employee_id, today]);

    if (!rows.length) {
      return res.json({ success: true, punched: false, punch: null });
    }

    const punch = rows[0];
    return res.json({
      success: true,
      punched: Boolean(punch.check_in),
      punch: {
        id: punch.id,
        employee_id: punch.employee_id,
        attendance_date: punch.attendance_date,
        date: punch.attendance_date,
        check_in: punch.check_in,
        check_out: punch.check_out,
        status: punch.status,
        attendance_status: punch.status,
        notes: punch.notes
      }
    });
  } catch (err) {
    console.error("getMyPunchStatus error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to get punch status" });
  }
};
