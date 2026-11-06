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
  const isSalesPerson =
    Number(req.user?.role_id) === 7 ||
    roleLower.includes("sales") ||
    roleLower.includes("seller") ||
    req.user?.is_sales_person === true ||
    req.user?.is_staff === true ||
    Boolean(req.user?.sales_person_id);

  const isAdmin =
    !isSalesPerson && (
      roleLower.includes("super admin") ||
      roleLower.includes("admin") ||
      roleLower.includes("manager") ||
      Number(req.user?.role_id) === 1 ||
      Number(req.user?.role_id) === 5 ||
      (Number(req.user?.id) === 1 && !req.user?.employee_id)
    );

  if (isAdmin) {
    return {
      isAdmin: true,
      names: [],
      primaryName: req.user?.full_name || req.user?.name || req.user?.username || "Administrator",
      empId: req.user?.employee_id || null,
      userId: req.user?.id || 1
    };
  }

  // Non-Admin: Sales Person / Staff
  const names = new Set();
  let empId = req.user?.employee_id || null;
  const userId = req.user?.id || null;
  let resolvedHumanName = null;

  // 1. Resolve from hrms_employees by user_id, employee_id, email, or employee_code
  try {
    const empRows = await queryAsync(
      `SELECT id, name, employee_code, sales_person_id, email, phone 
       FROM hrms_employees 
       WHERE (user_id = ? AND user_id IS NOT NULL AND user_id > 0)
          OR (id = ? AND id > 0)
          OR (LOWER(email) = LOWER(?) AND email IS NOT NULL AND email != '')
          OR (LOWER(employee_code) = LOWER(?) AND employee_code IS NOT NULL AND employee_code != '')
       LIMIT 1`,
      [userId || 0, empId || userId || 0, req.user?.email || req.user?.username || "", req.user?.employee_code || ""]
    );

    if (empRows && empRows.length > 0) {
      const emp = empRows[0];
      empId = emp.id;
      if (emp.name) {
        resolvedHumanName = emp.name.trim();
        names.add(emp.name.trim());
      }
      if (emp.employee_code) names.add(emp.employee_code.trim());

      if (emp.sales_person_id) {
        const spRows = await queryAsync(
          "SELECT id, name, employee_code FROM sales_persons WHERE id = ? LIMIT 1",
          [emp.sales_person_id]
        );
        if (spRows && spRows.length > 0) {
          if (spRows[0].name) {
            if (!resolvedHumanName) resolvedHumanName = spRows[0].name.trim();
            names.add(spRows[0].name.trim());
          }
          if (spRows[0].employee_code) names.add(spRows[0].employee_code.trim());
        }
      }
    }
  } catch (e) {
    console.warn("CRM RBAC: Employee resolution error:", e.message);
  }

  // 2. Check sales_persons table directly
  if (!resolvedHumanName && (req.user?.sales_person_id || req.user?.email || req.user?.username)) {
    try {
      const spId = req.user?.sales_person_id || 0;
      const emailOrUser = req.user?.email || req.user?.username || "";
      const spRows = await queryAsync(
        "SELECT id, name, employee_code FROM sales_persons WHERE id = ? OR LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?) LIMIT 1",
        [spId, emailOrUser, emailOrUser]
      );
      if (spRows && spRows.length > 0) {
        if (spRows[0].name) {
          if (!resolvedHumanName) resolvedHumanName = spRows[0].name.trim();
          names.add(spRows[0].name.trim());
        }
        if (spRows[0].employee_code) names.add(spRows[0].employee_code.trim());
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Include user name properties as aliases
  if (req.user?.full_name) names.add(req.user.full_name.trim());
  if (req.user?.name) names.add(req.user.name.trim());
  if (req.user?.displayName) names.add(req.user.displayName.trim());
  if (req.user?.username) names.add(req.user.username.trim());

  const identityList = Array.from(names).filter(Boolean);
  const primaryName = resolvedHumanName || req.user?.full_name || req.user?.name || req.user?.displayName || req.user?.username || "Sales Representative";

  return {
    isAdmin: false,
    names: identityList,
    primaryName,
    empId,
    userId
  };
}

/**
 * Check if a lead is strictly assigned to this salesperson
 */
function isLeadAssignedToUser(lead, salesIdentity) {
  if (!lead) return false;
  if (salesIdentity.isAdmin) return true;

  const assigned = String(lead.assigned_to || "").toLowerCase().trim();
  if (!assigned || assigned === "unassigned") return false;

  return salesIdentity.names.some(n => {
    const cleanN = String(n).toLowerCase().trim();
    if (!cleanN) return false;
    return assigned.includes(cleanN) || cleanN.includes(assigned);
  });
}

/**
 * Check if a follow-up is strictly assigned to this salesperson
 */
function isFollowupAssignedToUser(followup, salesIdentity) {
  if (!followup) return false;
  if (salesIdentity.isAdmin) return true;

  const assigned = String(followup.assigned_to || "").toLowerCase().trim();
  if (!assigned || assigned === "unassigned") return false;

  return salesIdentity.names.some(n => {
    const cleanN = String(n).toLowerCase().trim();
    if (!cleanN) return false;
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

    if (empId || userId || cleanName) {
      await queryAsync(
        `INSERT INTO hrms_notifications (user_id, employee_id, assigned_to_name, type, title, message, reference_id, reference_type, remind_at, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'followup', NOW(), 0, NOW())`,
        [userId || null, empId || null, cleanName, type, title, message, referenceId || null]
      );
      console.log(`[CRM NOTIF] Notification '${title}' dispatched to Salesperson (${cleanName}) -> userId: ${userId}, empId: ${empId}`);
    } else {
      console.warn(`[CRM NOTIF] Could not resolve user or employee ID for assigned salesperson: '${cleanName}'`);
    }
  } catch (err) {
    console.error("[CRM NOTIF] Error sending assignment notification:", err.message);
  }
}

/**
 * Normalize date and time inputs into SQL YYYY-MM-DD and HH:MM:SS
 */
function normalizeDateTime(dateVal, timeVal) {
  let dStr = "";
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, "0");
    const d = String(dateVal.getDate()).padStart(2, "0");
    dStr = `${y}-${m}-${d}`;
  } else if (typeof dateVal === "string") {
    dStr = dateVal.slice(0, 10);
  } else {
    dStr = new Date().toISOString().slice(0, 10);
  }

  let tStr = "10:00:00";
  if (timeVal && typeof timeVal === "string") {
    const cleanTime = timeVal.trim();
    const match12 = cleanTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const mins = match12[2];
      const secs = match12[3] || "00";
      const meridian = match12[4].toUpperCase();
      if (meridian === "PM" && hours < 12) hours += 12;
      if (meridian === "AM" && hours === 12) hours = 0;
      tStr = `${String(hours).padStart(2, "0")}:${mins}:${secs}`;
    } else {
      const match24 = cleanTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (match24) {
        tStr = `${String(match24[1]).padStart(2, "0")}:${match24[2]}:${match24[3] || "00"}`;
      }
    }
  }

  return { dStr, tStr };
}

/**
 * Parse reminder string into minutes before
 */
function parseReminderMinutes(reminderBefore) {
  if (!reminderBefore) return 15;
  const s = String(reminderBefore).toLowerCase().trim();
  if (/\b(1\s*day|24\s*hours?)\b/.test(s) || s.includes("1 day") || s.includes("day")) return 1440;
  if (/\b(2\s*hours?|120\s*min)/.test(s)) return 120;
  if (/\b(1\s*hour|60\s*min)/.test(s)) return 60;
  if (/\b(30\s*min)/.test(s)) return 30;
  if (/\b(15\s*min)/.test(s)) return 15;
  if (/\b(10\s*min)/.test(s)) return 10;
  if (/\b(5\s*min)/.test(s)) return 5;
  if (/\b(0\s*min|at time)/.test(s)) return 0;
  const match = s.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  return 15;
}

/**
 * Schedule a Follow-up Reminder Notification in hrms_notifications
 * Crucially sets remind_at to (followup_datetime - reminder_before_minutes)
 */
async function scheduleFollowupReminderNotification({
  assignedToName,
  followupId,
  followupTitle,
  customerName,
  mobileNumber,
  followupType,
  priority,
  targetDate,
  targetTime,
  reminderBefore,
  isUpdate = false
}) {
  if (!assignedToName || assignedToName === "Unassigned") return;

  try {
    const cleanName = String(assignedToName).replace(/\s*\([^)]*\)/, "").trim();
    if (!cleanName) return;

    let empId = null;
    let userId = null;

    // 1. Check hrms_employees by name or code
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

    if (!userId && !empId) {
      const spRows = await queryAsync(
        `SELECT sp.id, sp.name, e.id as emp_id, e.user_id
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

    // 2. Prepare normalized target date and time
    const { dStr, tStr } = normalizeDateTime(targetDate, targetTime);
    const minutesBefore = parseReminderMinutes(reminderBefore);

    // 3. Compute remind_at timestamp in MySQL
    const calcRows = await queryAsync(
      "SELECT DATE_SUB(CONCAT(?, ' ', ?), INTERVAL ? MINUTE) AS remind_at",
      [dStr, tStr, minutesBefore]
    );
    const remindAt = calcRows[0]?.remind_at || null;

    // If update, remove old unread reminder notifications for this follow-up
    if (isUpdate && followupId) {
      await queryAsync(
        "DELETE FROM hrms_notifications WHERE reference_id = ? AND type = 'CRM_FOLLOWUP_REMINDER' AND is_read = 0",
        [followupId]
      );
    }

    // 4. Insert scheduled reminder notification
    const reminderTitle = `⏰ Reminder: Follow-up with ${customerName || "Customer"}`;
    const reminderMessage = `Scheduled follow-up (${followupType || "Call"}) "${followupTitle || "Follow-up"}" is due at ${tStr.slice(0, 5)} on ${dStr}. Priority: ${priority || "Medium"}.${mobileNumber ? ` Phone: ${mobileNumber}` : ""}`;

    await queryAsync(
      `INSERT INTO hrms_notifications 
        (user_id, employee_id, assigned_to_name, type, title, message, reference_id, reference_type, remind_at, is_read, created_at)
       VALUES (?, ?, ?, 'CRM_FOLLOWUP_REMINDER', ?, ?, ?, 'followup', ?, 0, NOW())`,
      [userId || null, empId || null, cleanName, reminderTitle, reminderMessage, followupId, remindAt]
    );

    console.log(`[CRM NOTIF] Reminder scheduled for '${cleanName}' at ${remindAt} (Follow-up #${followupId})`);
  } catch (err) {
    console.error("[CRM NOTIF] Error scheduling followup reminder:", err.message);
  }
}

module.exports = {
  getRoleAndSalesIdentity,
  isLeadAssignedToUser,
  isFollowupAssignedToUser,
  notifySalespersonOnAssignment,
  scheduleFollowupReminderNotification,
  parseReminderMinutes,
  queryAsync
};

