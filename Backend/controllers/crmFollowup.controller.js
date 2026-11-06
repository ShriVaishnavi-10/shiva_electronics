const db = require("../config/db");
const {
  getRoleAndSalesIdentity,
  isFollowupAssignedToUser,
  notifySalespersonOnAssignment,
  scheduleFollowupReminderNotification,
  queryAsync
} = require("../services/crmRbac.service");

// Helper for active branch filtering
function getBranchId(req) {
  const branch = req.headers["x-active-branch"] || req.user?.branch_id;
  if (!branch) return null;
  const num = parseInt(branch, 10);
  return isNaN(num) ? null : num;
}

function branchIdForInsert(req) {
  const b = getBranchId(req);
  return b !== null ? b : (req.user?.branch_ids && req.user.branch_ids[0]) || 2;
}

// 1. Create Follow-up
exports.createFollowup = async (req, res) => {
  try {
    const {
      followup_title,
      related_to,
      entity_id,
      entity_name,
      company_name,
      mobile_number,
      followup_type,
      followup_date,
      followup_time,
      duration,
      priority,
      followup_status,
      discussion_summary,
      customer_requirement,
      customer_response,
      next_action,
      attachment_name,
      assigned_to,
      created_by,
      reminder_enabled,
      reminder_before,
      next_followup_date,
      next_followup_time
    } = req.body;

    if (!followup_title) {
      return res.status(400).json({
        success: false,
        message: "Follow-up Title is required."
      });
    }

    const salesIdentity = await getRoleAndSalesIdentity(req);
    const branchId = branchIdForInsert(req);
    const userId = salesIdentity.userId;

    // Assignment logic:
    // If user is Salesperson, default assignment to themselves
    let effectiveAssignedTo = assigned_to || null;
    if (!salesIdentity.isAdmin) {
      effectiveAssignedTo = salesIdentity.primaryName;
    }

    // Generate Follow-up Code (e.g., FLW-1001)
    const countResult = await queryAsync("SELECT MAX(id) AS maxId FROM crm_followups");
    const nextNum = (countResult[0]?.maxId || 0) + 1001;
    const followupCode = `FLW-${nextNum}`;

    const insertSql = `
      INSERT INTO crm_followups (
        followup_code,
        followup_title,
        related_to,
        entity_id,
        entity_name,
        company_name,
        mobile_number,
        followup_type,
        followup_date,
        followup_time,
        duration,
        priority,
        followup_status,
        discussion_summary,
        customer_requirement,
        customer_response,
        next_action,
        attachment_name,
        assigned_to,
        created_by,
        reminder_enabled,
        reminder_before,
        next_followup_date,
        next_followup_time,
        branch_id,
        user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      followupCode,
      followup_title.trim(),
      related_to || "Lead",
      entity_id || null,
      entity_name ? String(entity_name).trim() : null,
      company_name ? String(company_name).trim() : null,
      mobile_number ? String(mobile_number).trim() : null,
      followup_type || "Call",
      followup_date || new Date().toISOString().slice(0, 10),
      followup_time || null,
      duration ? parseInt(duration, 10) : 15,
      priority || "Medium",
      followup_status || "Pending",
      discussion_summary ? String(discussion_summary).trim() : null,
      customer_requirement ? String(customer_requirement).trim() : null,
      customer_response || "Interested",
      next_action ? String(next_action).trim() : null,
      attachment_name || null,
      effectiveAssignedTo,
      created_by || salesIdentity.primaryName,
      reminder_enabled === false ? 0 : 1,
      reminder_before || "15 minutes",
      next_followup_date || null,
      next_followup_time || null,
      branchId,
      userId
    ];

    const result = await queryAsync(insertSql, params);

    // If Admin assigned to a Salesperson, notify that specific salesperson immediately
    if (salesIdentity.isAdmin && effectiveAssignedTo && effectiveAssignedTo !== "Unassigned") {
      notifySalespersonOnAssignment({
        assignedToName: effectiveAssignedTo,
        type: "CRM_FOLLOWUP_ASSIGNED",
        title: `Work Assigned: Follow-up ${followup_title}`,
        message: `Admin assigned follow-up (${followup_type || "Call"}) for ${entity_name || company_name || "Customer"} (${mobile_number || ""}) to you. Priority: ${priority || "Medium"}.`,
        referenceId: result.insertId
      }).catch(e => console.error("Follow-up assignment notification error:", e));
    }

    // Schedule reminder notification if reminder is enabled
    const isReminderOn = reminder_enabled === true || reminder_enabled === 1 || reminder_enabled === "true" || reminder_enabled === "1";
    if (isReminderOn && effectiveAssignedTo && effectiveAssignedTo !== "Unassigned") {
      scheduleFollowupReminderNotification({
        assignedToName: effectiveAssignedTo,
        followupId: result.insertId,
        followupTitle: followup_title.trim(),
        customerName: entity_name || company_name || "Customer",
        mobileNumber: mobile_number,
        followupType: followup_type,
        priority: priority,
        targetDate: followup_date,
        targetTime: followup_time,
        reminderBefore: reminder_before
      }).catch(e => console.error("Follow-up reminder error:", e));

      // Also schedule reminder for next follow-up if date is specified
      if (next_followup_date && next_followup_date !== "0000-00-00") {
        scheduleFollowupReminderNotification({
          assignedToName: effectiveAssignedTo,
          followupId: result.insertId,
          followupTitle: `Next Follow-up: ${followup_title.trim()}`,
          customerName: entity_name || company_name || "Customer",
          mobileNumber: mobile_number,
          followupType: followup_type,
          priority: priority,
          targetDate: next_followup_date,
          targetTime: next_followup_time,
          reminderBefore: reminder_before
        }).catch(e => console.error("Next follow-up reminder error:", e));
      }
    }

    res.status(201).json({
      success: true,
      message: "Follow-up created successfully",
      data: {
        id: result.insertId,
        followup_code: followupCode
      }
    });
  } catch (err) {
    console.error("Error in createFollowup:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create follow-up"
    });
  }
};

// 2. Get All Follow-ups with role-based restriction, search, date-range, and pagination
exports.getFollowups = async (req, res) => {
  try {
    const {
      search = "",
      status = "All",
      type = "All",
      priority = "All",
      fromDate = "",
      toDate = "",
      dateFilter = "All",
      selectedDate = "",
      month = "",
      page = 1,
      limit = 10,
      assigned_to = "",
      all = false,
      sort = "date_asc"
    } = req.query;

    const isAll = all === true || all === "true" || all === "1";
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = isAll ? 1000 : Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const salesIdentity = await getRoleAndSalesIdentity(req);
    let whereConditions = ["1=1"];
    let params = [];

    // ROLE-BASED ACCESS CONTROL:
    // Salespersons can ONLY see follow-ups assigned to them!
    if (!salesIdentity.isAdmin) {
      const nameConditions = [];
      const nameParams = [];
      salesIdentity.names.forEach(n => {
        if (n && String(n).trim()) {
          nameConditions.push("LOWER(assigned_to) LIKE LOWER(?)");
          nameParams.push(`%${String(n).trim()}%`);
        }
      });
      if (nameConditions.length > 0) {
        whereConditions.push(`(${nameConditions.join(" OR ")})`);
        params.push(...nameParams);
      } else {
        whereConditions.push("1=0");
      }
    } else {
      // Admin: full access with optional filter
      if (assigned_to) {
        const trimmedAssigned = String(assigned_to).trim();
        if (trimmedAssigned.toLowerCase() === "me") {
          const nameConditions = [];
          salesIdentity.names.forEach(n => {
            nameConditions.push("LOWER(assigned_to) LIKE LOWER(?)");
            params.push(`%${n}%`);
          });
          if (nameConditions.length > 0) {
            whereConditions.push(`(${nameConditions.join(" OR ")})`);
          }
        } else if (trimmedAssigned.toLowerCase() === "unassigned") {
          whereConditions.push("(assigned_to IS NULL OR assigned_to = '' OR assigned_to = 'Unassigned')");
        } else if (trimmedAssigned.toLowerCase() !== "all") {
          whereConditions.push("LOWER(assigned_to) LIKE LOWER(?)");
          params.push(`%${trimmedAssigned}%`);
        }
      }
    }

    // Branch filter
    const branchId = getBranchId(req);
    if (branchId) {
      whereConditions.push("(branch_id = ? OR branch_id IS NULL)");
      params.push(branchId);
    }

    // Base where clause copy for date metrics before date-specific filters
    const baseWhereClause = whereConditions.join(" AND ");
    const baseParams = [...params];

    // Status filter
    if (status && status !== "All") {
      whereConditions.push("followup_status = ?");
      params.push(status);
    }

    // Type filter
    if (type && type !== "All") {
      whereConditions.push("followup_type = ?");
      params.push(type);
    }

    // Priority filter
    if (priority && priority !== "All") {
      whereConditions.push("priority = ?");
      params.push(priority);
    }

    // Quick Date Filter Tabs
    if (dateFilter && dateFilter !== "All") {
      const df = String(dateFilter).toLowerCase();
      if (df === "today") {
        whereConditions.push("DATE(followup_date) = CURDATE()");
      } else if (df === "tomorrow") {
        whereConditions.push("DATE(followup_date) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)");
      } else if (df === "this_week") {
        whereConditions.push("YEARWEEK(followup_date, 1) = YEARWEEK(CURDATE(), 1)");
      } else if (df === "upcoming") {
        whereConditions.push("DATE(followup_date) >= CURDATE()");
      } else if (df === "overdue") {
        whereConditions.push("DATE(followup_date) < CURDATE() AND followup_status = 'Pending'");
      }
    }

    // Specific selected single date (e.g., clicked from calendar)
    if (selectedDate && selectedDate.trim()) {
      whereConditions.push("DATE(followup_date) = ?");
      params.push(selectedDate.trim());
    }

    // Month filter for calendar month view (e.g., "2026-11")
    if (month && month.trim()) {
      whereConditions.push("DATE_FORMAT(followup_date, '%Y-%m') = ?");
      params.push(month.trim());
    }

    // Custom Date range filter
    if (fromDate) {
      whereConditions.push("DATE(followup_date) >= ?");
      params.push(fromDate);
    }
    if (toDate) {
      whereConditions.push("DATE(followup_date) <= ?");
      params.push(toDate);
    }

    // Search query
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereConditions.push(`(
        followup_code LIKE ? OR
        followup_title LIKE ? OR
        entity_name LIKE ? OR
        company_name LIKE ? OR
        mobile_number LIKE ? OR
        assigned_to LIKE ?
      )`);
      params.push(q, q, q, q, q, q);
    }

    const whereClause = whereConditions.join(" AND ");

    // Count total matching
    const countSql = `SELECT COUNT(*) AS total FROM crm_followups WHERE ${whereClause}`;
    const countResult = await queryAsync(countSql, params);
    const total = countResult[0]?.total || 0;

    // Sorting order
    let orderClause = "ORDER BY CASE WHEN followup_date >= CURDATE() THEN 0 ELSE 1 END, followup_date ASC, followup_time ASC, id DESC";
    if (sort === "date_desc" || sort === "desc") {
      orderClause = "ORDER BY followup_date DESC, followup_time DESC, id DESC";
    } else if (sort === "id_desc") {
      orderClause = "ORDER BY id DESC";
    }

    // Fetch paginated data with strict DATE_FORMAT
    const listSql = `
      SELECT 
        id,
        followup_code,
        followup_title,
        related_to,
        entity_id,
        entity_name,
        company_name,
        mobile_number,
        followup_type,
        DATE_FORMAT(followup_date, '%Y-%m-%d') AS followup_date,
        followup_time,
        duration,
        priority,
        followup_status,
        discussion_summary,
        customer_requirement,
        customer_response,
        next_action,
        attachment_name,
        assigned_to,
        created_by,
        reminder_enabled,
        reminder_before,
        DATE_FORMAT(next_followup_date, '%Y-%m-%d') AS next_followup_date,
        next_followup_time,
        branch_id,
        user_id,
        created_at,
        updated_at
      FROM crm_followups 
      WHERE ${whereClause} 
      ${orderClause} 
      LIMIT ? OFFSET ?
    `;
    const listParams = [...params, limitNum, offset];
    const rows = await queryAsync(listSql, listParams);

    // Calculate live date-wise metrics for pills (Today, Tomorrow, This Week, Upcoming, Overdue)
    let dateMetrics = {
      total: total,
      today: 0,
      tomorrow: 0,
      thisWeek: 0,
      upcoming: 0,
      overdue: 0
    };
    try {
      const metricsSql = `
        SELECT
          COUNT(*) AS total_count,
          SUM(CASE WHEN DATE(followup_date) = CURDATE() THEN 1 ELSE 0 END) AS today_count,
          SUM(CASE WHEN DATE(followup_date) = DATE_ADD(CURDATE(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) AS tomorrow_count,
          SUM(CASE WHEN YEARWEEK(followup_date, 1) = YEARWEEK(CURDATE(), 1) THEN 1 ELSE 0 END) AS this_week_count,
          SUM(CASE WHEN DATE(followup_date) >= CURDATE() THEN 1 ELSE 0 END) AS upcoming_count,
          SUM(CASE WHEN DATE(followup_date) < CURDATE() AND followup_status = 'Pending' THEN 1 ELSE 0 END) AS overdue_count
        FROM crm_followups
        WHERE ${baseWhereClause}
      `;
      const mRows = await queryAsync(metricsSql, baseParams);
      if (mRows && mRows.length > 0) {
        dateMetrics = {
          total: parseInt(mRows[0].total_count, 10) || 0,
          today: parseInt(mRows[0].today_count, 10) || 0,
          tomorrow: parseInt(mRows[0].tomorrow_count, 10) || 0,
          thisWeek: parseInt(mRows[0].this_week_count, 10) || 0,
          upcoming: parseInt(mRows[0].upcoming_count, 10) || 0,
          overdue: parseInt(mRows[0].overdue_count, 10) || 0
        };
      }
    } catch (mErr) {
      console.warn("Date metrics calculation error:", mErr.message);
    }

    // Calculate My Allocated Count
    let myAllocatedCount = total;
    if (salesIdentity.isAdmin && salesIdentity.names.length > 0) {
      try {
        const myNameConditions = salesIdentity.names.map(() => "LOWER(assigned_to) LIKE LOWER(?)").join(" OR ");
        const myNameParams = salesIdentity.names.map(n => `%${n}%`);
        const myCountRes = await queryAsync(
          `SELECT COUNT(*) AS total FROM crm_followups WHERE (${myNameConditions})`,
          myNameParams
        );
        myAllocatedCount = myCountRes[0]?.total || 0;
      } catch (cErr) {
        myAllocatedCount = 0;
      }
    }

    res.json({
      success: true,
      data: rows,
      total,
      dateMetrics,
      myAllocatedCount,
      page: pageNum,
      limit: limitNum,
      userRole: salesIdentity.isAdmin ? "admin" : "salesperson"
    });
  } catch (err) {
    console.error("Error in getFollowups:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch follow-ups"
    });
  }
};

// 3. Get Follow-up by ID (Strict access control)
exports.getFollowupById = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await queryAsync("SELECT * FROM crm_followups WHERE id = ?", [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Follow-up not found" });
    }

    const followup = rows[0];
    const salesIdentity = await getRoleAndSalesIdentity(req);

    if (!isFollowupAssignedToUser(followup, salesIdentity)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view follow-ups assigned to you."
      });
    }

    res.json({ success: true, data: followup });
  } catch (err) {
    console.error("Error in getFollowupById:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch follow-up" });
  }
};

// 4. Update Follow-up (Assignment & modification access control)
exports.updateFollowup = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      followup_title,
      related_to,
      entity_id,
      entity_name,
      company_name,
      mobile_number,
      followup_type,
      followup_date,
      followup_time,
      duration,
      priority,
      followup_status,
      discussion_summary,
      customer_requirement,
      customer_response,
      next_action,
      attachment_name,
      assigned_to,
      reminder_enabled,
      reminder_before,
      next_followup_date,
      next_followup_time
    } = req.body;

    const existingRows = await queryAsync("SELECT * FROM crm_followups WHERE id = ?", [id]);
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: "Follow-up not found" });
    }
    const existing = existingRows[0];

    const salesIdentity = await getRoleAndSalesIdentity(req);
    if (!isFollowupAssignedToUser(existing, salesIdentity)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update follow-ups assigned to you."
      });
    }

    let effectiveAssignedTo = assigned_to;
    if (!salesIdentity.isAdmin) {
      effectiveAssignedTo = existing.assigned_to;
    }

    const updateSql = `
      UPDATE crm_followups SET
        followup_title = ?,
        related_to = ?,
        entity_id = ?,
        entity_name = ?,
        company_name = ?,
        mobile_number = ?,
        followup_type = ?,
        followup_date = ?,
        followup_time = ?,
        duration = ?,
        priority = ?,
        followup_status = ?,
        discussion_summary = ?,
        customer_requirement = ?,
        customer_response = ?,
        next_action = ?,
        attachment_name = ?,
        assigned_to = ?,
        reminder_enabled = ?,
        reminder_before = ?,
        next_followup_date = ?,
        next_followup_time = ?
      WHERE id = ?
    `;

    const params = [
      followup_title ? followup_title.trim() : existing.followup_title,
      related_to || existing.related_to,
      entity_id || existing.entity_id,
      entity_name || existing.entity_name,
      company_name || existing.company_name,
      mobile_number || existing.mobile_number,
      followup_type || existing.followup_type,
      followup_date || existing.followup_date,
      followup_time || existing.followup_time,
      duration !== undefined ? duration : existing.duration,
      priority || existing.priority,
      followup_status || existing.followup_status,
      discussion_summary || existing.discussion_summary,
      customer_requirement || existing.customer_requirement,
      customer_response || existing.customer_response,
      next_action || existing.next_action,
      attachment_name || existing.attachment_name,
      effectiveAssignedTo,
      reminder_enabled !== undefined ? (reminder_enabled ? 1 : 0) : existing.reminder_enabled,
      reminder_before || existing.reminder_before,
      next_followup_date || existing.next_followup_date,
      next_followup_time || existing.next_followup_time,
      id
    ];

    await queryAsync(updateSql, params);

    // If Admin assigned to a new salesperson, notify them
    if (salesIdentity.isAdmin && effectiveAssignedTo && effectiveAssignedTo !== "Unassigned") {
      const assignmentChanged = String(existing.assigned_to || "").trim().toLowerCase() !== String(effectiveAssignedTo).trim().toLowerCase();
      if (assignmentChanged) {
        notifySalespersonOnAssignment({
          assignedToName: effectiveAssignedTo,
          type: "CRM_FOLLOWUP_ASSIGNED",
          title: `Work Assigned: Follow-up ${followup_title || existing.followup_title}`,
          message: `Admin assigned follow-up for ${entity_name || existing.entity_name || "Customer"} (${mobile_number || existing.mobile_number || ""}) to you.`,
          referenceId: Number(id)
        }).catch(e => console.error("Follow-up assignment notification error:", e));
      }
    }

    // Reschedule reminder notification if enabled
    const isReminderOn = reminder_enabled !== undefined
      ? (reminder_enabled === true || reminder_enabled === 1 || reminder_enabled === "true" || reminder_enabled === "1")
      : Boolean(existing.reminder_enabled);

    if (isReminderOn && effectiveAssignedTo && effectiveAssignedTo !== "Unassigned") {
      scheduleFollowupReminderNotification({
        assignedToName: effectiveAssignedTo,
        followupId: Number(id),
        followupTitle: followup_title ? followup_title.trim() : existing.followup_title,
        customerName: entity_name || existing.entity_name || company_name || existing.company_name || "Customer",
        mobileNumber: mobile_number || existing.mobile_number,
        followupType: followup_type || existing.followup_type,
        priority: priority || existing.priority,
        targetDate: followup_date || existing.followup_date,
        targetTime: followup_time || existing.followup_time,
        reminderBefore: reminder_before || existing.reminder_before,
        isUpdate: true
      }).catch(e => console.error("Follow-up reminder update error:", e));
    } else {
      queryAsync(
        "DELETE FROM hrms_notifications WHERE reference_id = ? AND type = 'CRM_FOLLOWUP_REMINDER' AND is_read = 0",
        [Number(id)]
      ).catch(e => console.error("Error clearing reminder on disable:", e));
    }

    res.json({
      success: true,
      message: "Follow-up updated successfully"
    });
  } catch (err) {
    console.error("Error in updateFollowup:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to update follow-up" });
  }
};

// 5. Quick Toggle / Patch Status (Access control)
exports.patchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required." });
    }

    const existingRows = await queryAsync("SELECT * FROM crm_followups WHERE id = ?", [id]);
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: "Follow-up not found" });
    }
    const followup = existingRows[0];
    const salesIdentity = await getRoleAndSalesIdentity(req);

    if (!isFollowupAssignedToUser(followup, salesIdentity)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update follow-ups assigned to you."
      });
    }

    await queryAsync("UPDATE crm_followups SET followup_status = ? WHERE id = ?", [status, id]);

    res.json({
      success: true,
      message: `Follow-up status updated to ${status}`
    });
  } catch (err) {
    console.error("Error in patchStatus:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to update status" });
  }
};

// 6. Delete Follow-up (Only Admin allowed)
exports.deleteFollowup = async (req, res) => {
  try {
    const salesIdentity = await getRoleAndSalesIdentity(req);
    if (!salesIdentity.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only CRM Administrators can delete follow-ups."
      });
    }

    const { id } = req.params;
    await queryAsync("DELETE FROM crm_followups WHERE id = ?", [id]);
    res.json({
      success: true,
      message: "Follow-up deleted successfully"
    });
  } catch (err) {
    console.error("Error in deleteFollowup:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to delete follow-up" });
  }
};

// 7. Get Follow-up Reports Summary & Analytics (Restricted to assigned for sales staff)
exports.getFollowupReportsSummary = async (req, res) => {
  try {
    const { startDate, endDate, assigned_to } = req.query;
    const salesIdentity = await getRoleAndSalesIdentity(req);
    const branchId = getBranchId(req);
    let where = ["1=1"];
    let params = [];

    if (branchId) {
      where.push("(branch_id = ? OR branch_id IS NULL)");
      params.push(branchId);
    }

    if (!salesIdentity.isAdmin) {
      const nameConditions = salesIdentity.names.map(() => "LOWER(assigned_to) LIKE LOWER(?)").join(" OR ");
      const nameParams = salesIdentity.names.map(n => `%${n}%`);
      if (nameConditions) {
        where.push(`(${nameConditions})`);
        params.push(...nameParams);
      } else {
        where.push("1=0");
      }
    } else if (assigned_to && assigned_to !== "All") {
      where.push("assigned_to = ?");
      params.push(assigned_to);
    }

    if (startDate) {
      where.push("followup_date >= ?");
      params.push(startDate);
    }
    if (endDate) {
      where.push("followup_date <= ?");
      params.push(endDate);
    }

    const whereClause = where.join(" AND ");

    const summarySql = `
      SELECT 
        COUNT(*) AS total_followups,
        SUM(CASE WHEN followup_status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN followup_status = 'Pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN followup_status = 'Rescheduled' THEN 1 ELSE 0 END) AS rescheduled_count,
        SUM(CASE WHEN followup_status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_count
      FROM crm_followups
      WHERE ${whereClause}
    `;
    const summaryRows = await queryAsync(summarySql, params);
    const summary = summaryRows[0] || {};

    const typeSql = `
      SELECT 
        COALESCE(followup_type, 'Other') AS followup_type, 
        COUNT(*) AS count,
        SUM(CASE WHEN followup_status = 'Completed' THEN 1 ELSE 0 END) AS completed_count
      FROM crm_followups
      WHERE ${whereClause}
      GROUP BY followup_type
      ORDER BY count DESC
    `;
    const typeBreakdown = await queryAsync(typeSql, params);

    const prioritySql = `
      SELECT priority, COUNT(*) AS count
      FROM crm_followups
      WHERE ${whereClause}
      GROUP BY priority
      ORDER BY count DESC
    `;
    const priorityBreakdown = await queryAsync(prioritySql, params);

    const responseSql = `
      SELECT 
        COALESCE(NULLIF(TRIM(customer_response), ''), 'No Feedback / Pending') AS response,
        COUNT(*) AS count
      FROM crm_followups
      WHERE ${whereClause}
      GROUP BY response
      ORDER BY count DESC
    `;
    const responseBreakdown = await queryAsync(responseSql, params);

    const staffSql = `
      SELECT 
        COALESCE(assigned_to, 'Unassigned') AS staff_name,
        COALESCE(assigned_to, 'Unassigned') AS rep_name,
        COUNT(*) AS total_assigned,
        COUNT(*) AS total,
        SUM(CASE WHEN followup_status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN followup_status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN followup_status = 'Pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN followup_status = 'Pending' THEN 1 ELSE 0 END) AS pending
      FROM crm_followups
      WHERE ${whereClause}
      GROUP BY assigned_to
      ORDER BY total_assigned DESC
    `;
    const staffBreakdown = await queryAsync(staffSql, params);

    res.json({
      success: true,
      data: {
        summary: {
          total_followups: parseInt(summary.total_followups, 10) || 0,
          completed_count: parseInt(summary.completed_count, 10) || 0,
          pending_count: parseInt(summary.pending_count, 10) || 0,
          rescheduled_count: parseInt(summary.rescheduled_count, 10) || 0,
          cancelled_count: parseInt(summary.cancelled_count, 10) || 0,
          completion_rate: summary.total_followups > 0
            ? ((summary.completed_count / summary.total_followups) * 100).toFixed(1)
            : 0
        },
        typeBreakdown,
        priorityBreakdown,
        responseBreakdown,
        staffBreakdown,
        repBreakdown: staffBreakdown
      }
    });
  } catch (err) {
    console.error("Error in getFollowupReportsSummary:", err);
    res.status(500).json({ success: false, message: "Failed to generate follow-up reports summary" });
  }
};

// 8. Schedule Next Follow-up from Existing Follow-up
exports.scheduleNextFollowup = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      followup_type = "Phone Call",
      priority = "Medium",
      next_followup_date,
      scheduled_time = "10:30",
      discussion_remarks = ""
    } = req.body;

    if (!next_followup_date) {
      return res.status(400).json({
        success: false,
        message: "Next follow-up date is required."
      });
    }

    const prevRows = await queryAsync("SELECT * FROM crm_followups WHERE id = ?", [id]);
    if (!prevRows || prevRows.length === 0) {
      return res.status(404).json({ success: false, message: "Follow-up record not found" });
    }
    const prev = prevRows[0];

    const salesIdentity = await getRoleAndSalesIdentity(req);
    if (!isFollowupAssignedToUser(prev, salesIdentity)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only schedule follow-ups for records assigned to you."
      });
    }

    const remarksTrimmed = (discussion_remarks || "").trim();
    const updatedDiscussion = remarksTrimmed
      ? (prev.discussion_summary ? `${prev.discussion_summary}\n[Next Scheduled ${next_followup_date}]: ${remarksTrimmed}` : remarksTrimmed)
      : prev.discussion_summary;

    await queryAsync(
      `UPDATE crm_followups 
       SET next_followup_date = ?, next_followup_time = ?, followup_status = 'Completed', discussion_summary = ?, updated_at = NOW()
       WHERE id = ?`,
      [next_followup_date, scheduled_time || null, updatedDiscussion, id]
    );

    const countResult = await queryAsync("SELECT MAX(id) AS maxId FROM crm_followups");
    const nextNum = (countResult[0]?.maxId || 0) + 1001;
    const newFollowupCode = `FLW-${nextNum}`;

    const newTitle = prev.followup_title.startsWith("Follow-up:")
      ? prev.followup_title
      : `Follow-up: ${prev.followup_title}`;

    const effectiveAssignedTo = prev.assigned_to || salesIdentity.primaryName;

    const insertResult = await queryAsync(
      `INSERT INTO crm_followups (
        followup_code,
        followup_title,
        related_to,
        entity_id,
        entity_name,
        company_name,
        mobile_number,
        followup_type,
        followup_date,
        followup_time,
        duration,
        priority,
        followup_status,
        discussion_summary,
        assigned_to,
        created_by,
        user_id,
        branch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?)`,
      [
        newFollowupCode,
        newTitle,
        prev.related_to || "Lead",
        prev.entity_id || null,
        prev.entity_name || null,
        prev.company_name || null,
        prev.mobile_number || null,
        followup_type,
        next_followup_date,
        (scheduled_time && String(scheduled_time).trim()) ? String(scheduled_time).trim() : null,
        prev.duration || 15,
        priority || prev.priority || "Medium",
        remarksTrimmed || null,
        effectiveAssignedTo,
        salesIdentity.primaryName,
        salesIdentity.userId,
        prev.branch_id || branchIdForInsert(req)
      ]
    );

    // If Admin scheduled for a salesperson, notify only that salesperson
    if (salesIdentity.isAdmin && effectiveAssignedTo && effectiveAssignedTo !== "Unassigned") {
      notifySalespersonOnAssignment({
        assignedToName: effectiveAssignedTo,
        type: "CRM_FOLLOWUP_ASSIGNED",
        title: `Next Follow-up Scheduled: ${newTitle}`,
        message: `Admin scheduled follow-up on ${next_followup_date} at ${scheduled_time || "10:30"} with ${prev.entity_name || prev.company_name || "Customer"} (${prev.mobile_number || ""}).`,
        referenceId: insertResult.insertId
      }).catch(e => console.error("Follow-up notification error:", e));
    }

    // Schedule reminder for the next scheduled follow-up
    const isPrevReminderOn = prev.reminder_enabled === 1 || prev.reminder_enabled === true;
    if (isPrevReminderOn && effectiveAssignedTo && effectiveAssignedTo !== "Unassigned") {
      scheduleFollowupReminderNotification({
        assignedToName: effectiveAssignedTo,
        followupId: insertResult.insertId,
        followupTitle: newTitle,
        customerName: prev.entity_name || prev.company_name || "Customer",
        mobileNumber: prev.mobile_number,
        followupType: followup_type,
        priority: priority || prev.priority || "Medium",
        targetDate: next_followup_date,
        targetTime: scheduled_time || "10:30",
        reminderBefore: prev.reminder_before || "15 minutes"
      }).catch(e => console.error("Next follow-up reminder error:", e));
    }

    res.json({
      success: true,
      message: "Next follow-up scheduled successfully",
      data: {
        id: insertResult.insertId,
        followup_code: newFollowupCode,
        next_followup_date,
        scheduled_time
      }
    });
  } catch (err) {
    console.error("Error in scheduleNextFollowup (followup):", err);
    res.status(500).json({ success: false, message: err.message || "Failed to schedule next follow-up" });
  }
};
