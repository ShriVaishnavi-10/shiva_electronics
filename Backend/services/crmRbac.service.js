const db = require("../config/db");

function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Determine user role and resolve their sales identity aliases
 */
async function getRoleAndSalesIdentity(req) {
  const roleLower = String(req.user?.role_name || req.user?.role || "").toLowerCase().trim();
  const isAdmin =
    roleLower.includes("super admin") ||
    roleLower.includes("admin") ||
    roleLower.includes("manager") ||
    Number(req.user?.role_id) === 1 ||
    Number(req.user?.role_id) === 5 ||
    Number(req.user?.id) === 1;

  if (isAdmin) {
    return {
      isAdmin: true,
      names: [],
      primaryName: req.user?.full_name || req.user?.username || "Administrator",
      empId: req.user?.employee_id || null,
      userId: req.user?.id || 1
    };
  }

  // Non-Admin: Sales Person / Staff
  const names = new Set();
  if (req.user?.full_name) names.add(req.user.full_name.trim());
  if (req.user?.username) names.add(req.user.username.trim());
  if (req.user?.name) names.add(req.user.name.trim());

  let empId = req.user?.employee_id || null;
  const userId = req.user?.id || null;

  if (userId || empId) {
    try {
      const empRows = await queryAsync(
        "SELECT id, name, employee_code, sales_person_id, email, phone FROM hrms_employees WHERE (user_id = ? AND user_id IS NOT NULL) OR (id = ? AND id > 0) LIMIT 1",
        [userId || 0, empId || 0]
      );
      if (empRows && empRows.length > 0) {
        empId = empRows[0].id;
        if (empRows[0].name) names.add(empRows[0].name.trim());
        if (empRows[0].employee_code) names.add(empRows[0].employee_code.trim());

        if (empRows[0].sales_person_id) {
          const spRows = await queryAsync(
            "SELECT id, name, employee_code FROM sales_persons WHERE id = ? LIMIT 1",
            [empRows[0].sales_person_id]
          );
          if (spRows && spRows.length > 0) {
            if (spRows[0].name) names.add(spRows[0].name.trim());
            if (spRows[0].employee_code) names.add(spRows[0].employee_code.trim());
          }
        }
      }
    } catch (e) {
      console.warn("CRM RBAC: Employee resolution error:", e.message);
    }
  }

  // Check sales_persons table if email matches
  if (req.user?.email || req.user?.username) {
    try {
      const emailOrUser = req.user?.email || req.user?.username;
      const spRows = await queryAsync(
        "SELECT id, name, employee_code FROM sales_persons WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?) LIMIT 1",
        [emailOrUser, emailOrUser]
      );
      if (spRows && spRows.length > 0) {
        if (spRows[0].name) names.add(spRows[0].name.trim());
        if (spRows[0].employee_code) names.add(spRows[0].employee_code.trim());
      }
    } catch (e) {
      // ignore
    }
  }

  const identityList = Array.from(names).filter(Boolean);

  return {
    isAdmin: false,
    names: identityList,
    primaryName: identityList[0] || req.user?.full_name || req.user?.username || "Sales Representative",
    empId,
    userId
  };
}

/**
 * Check if a lead is assigned to or belongs to a salesperson
 */
function isLeadAssignedToUser(lead, salesIdentity) {
  if (!lead) return false;
  if (salesIdentity.isAdmin) return true;

  if (salesIdentity.userId && lead.created_by && Number(lead.created_by) === Number(salesIdentity.userId)) {
    return true;
  }

  const assigned = String(lead.assigned_to || "").toLowerCase().trim();
  if (!assigned || assigned === "unassigned") return false;

  return salesIdentity.names.some(n => {
    const cleanN = n.toLowerCase().trim();
    return assigned.includes(cleanN) || cleanN.includes(assigned);
  });
}

/**
 * Check if a follow-up is assigned to or belongs to a salesperson
 */
function isFollowupAssignedToUser(followup, salesIdentity) {
  if (!followup) return false;
  if (salesIdentity.isAdmin) return true;

  if (salesIdentity.userId && followup.user_id && Number(followup.user_id) === Number(salesIdentity.userId)) {
    return true;
  }
  if (salesIdentity.userId && followup.created_by && String(followup.created_by) === String(salesIdentity.userId)) {
    return true;
  }

  const assigned = String(followup.assigned_to || "").toLowerCase().trim();
  if (!assigned || assigned === "unassigned") return false;

  return salesIdentity.names.some(n => {
    const cleanN = n.toLowerCase().trim();
    return assigned.includes(cleanN) || cleanN.includes(assigned);
  });
}

/**
 * Send notification strictly and only to the assigned salesperson
 */
async function notifySalespersonOnAssignment({
  assignedToName,
  type = "CRM_LEAD_ASSIGNED",
  title,
  message,
  referenceId
}) {
  if (!assignedToName || assignedToName === "Unassigned") return;

  try {
    const cleanName = String(assignedToName).replace(/\s*\([^)]*\)/, "").trim();
    if (!cleanName) return;

    let empId = null;
    let userId = null;

    // 1. Check hrms_employees by name or employee_code
    const empRows = await queryAsync(
      `SELECT e.id AS employee_id, e.user_id, e.name 
       FROM hrms_employees e
       WHERE LOWER(TRIM(e.name)) = LOWER(?) 
          OR LOWER(TRIM(e.name)) LIKE LOWER(?)
          OR LOWER(TRIM(e.employee_code)) = LOWER(?)
       LIMIT 1`,
      [cleanName, `%${cleanName}%`, cleanName]
    );

    if (empRows && empRows.length > 0) {
      empId = empRows[0].employee_id;
      userId = empRows[0].user_id;
    }

    // 2. Check sales_persons table if not found
    if (!userId && !empId) {
      const spRows = await queryAsync(
        `SELECT sp.id, sp.name, sp.email, e.id as emp_id, e.user_id
         FROM sales_persons sp
         LEFT JOIN hrms_employees e ON (e.sales_person_id = sp.id OR LOWER(TRIM(e.name)) = LOWER(TRIM(sp.name)))
         WHERE LOWER(TRIM(sp.name)) = LOWER(?) 
            OR LOWER(TRIM(sp.name)) LIKE LOWER(?)
            OR LOWER(TRIM(sp.employee_code)) = LOWER(?)
         LIMIT 1`,
        [cleanName, `%${cleanName}%`, cleanName]
      );
      if (spRows && spRows.length > 0) {
        empId = spRows[0].emp_id || null;
        userId = spRows[0].user_id || null;
      }
    }

    // 3. Check users table by full_name or username
    if (!userId) {
      const uRows = await queryAsync(
        `SELECT id FROM users 
         WHERE LOWER(TRIM(full_name)) = LOWER(?) 
            OR LOWER(TRIM(username)) = LOWER(?) 
            OR LOWER(TRIM(full_name)) LIKE LOWER(?)
         LIMIT 1`,
        [cleanName, cleanName, `%${cleanName}%`]
      );
      if (uRows && uRows.length > 0) {
        userId = uRows[0].id;
      }
    }

    // If still missing user_id but have empId, try reverse lookup
    if (empId && !userId) {
      const revRows = await queryAsync("SELECT user_id FROM hrms_employees WHERE id = ? LIMIT 1", [empId]);
      if (revRows && revRows.length > 0) userId = revRows[0].user_id;
    }

    if (empId || userId) {
      await queryAsync(
        `INSERT INTO hrms_notifications (user_id, employee_id, type, title, message, reference_id, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
        [userId || null, empId || null, type, title, message, referenceId || null]
      );
      console.log(`[CRM NOTIF] Notification '${title}' dispatched to Salesperson (${cleanName}) -> userId: ${userId}, empId: ${empId}`);
    } else {
      console.warn(`[CRM NOTIF] Could not resolve user or employee ID for assigned salesperson: '${cleanName}'`);
    }
  } catch (err) {
    console.error("[CRM NOTIF] Error sending assignment notification:", err.message);
  }
}

module.exports = {
  getRoleAndSalesIdentity,
  isLeadAssignedToUser,
  isFollowupAssignedToUser,
  notifySalespersonOnAssignment,
  queryAsync
};

