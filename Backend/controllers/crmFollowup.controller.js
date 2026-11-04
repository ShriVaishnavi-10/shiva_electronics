const db = require("../config/db");
const { getBranchId, branchWhere, branchIdForInsert } = require("../middleware/branchHelper");

// Helper to run query as promise
const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

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

    const branchId = branchIdForInsert(req);
    const userId = req.user?.id || req.user?.user_id || null;

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
      assigned_to || null,
      created_by || "Administrator",
      reminder_enabled === false ? 0 : 1,
      reminder_before || "15 minutes",
      next_followup_date || null,
      next_followup_time || null,
      branchId,
      userId
    ];

    const result = await queryAsync(insertSql, params);

    res.status(201).json({
      success: true,
      message: "Follow-up created successfully",
      data: {
        id: result.insertId,
        followup_code: followupCode,
        followup_title
      }
    });
  } catch (err) {
    console.error("Error in createFollowup:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to create follow-up" });
  }
};

// 2. Get Follow-ups (with filtering and pagination)
exports.getFollowups = async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      type = "",
      priority = "",
      fromDate = "",
      toDate = "",
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    let whereConditions = ["1=1"];
    let params = [];

    // Branch filter
    const branchId = getBranchId(req);
    if (branchId) {
      whereConditions.push("(branch_id = ? OR branch_id IS NULL)");
      params.push(branchId);
    }

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

    // Date range filter
    if (fromDate) {
      whereConditions.push("followup_date >= ?");
      params.push(fromDate);
    }
    if (toDate) {
      whereConditions.push("followup_date <= ?");
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

    // Fetch paginated data
    const listSql = `
      SELECT * FROM crm_followups 
      WHERE ${whereClause} 
      ORDER BY id DESC 
      LIMIT ? OFFSET ?
    `;
    const listParams = [...params, limitNum, offset];
    const rows = await queryAsync(listSql, listParams);

    res.json({
      success: true,
      data: rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    });
  } catch (err) {
    console.error("Error in getFollowups:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch follow-ups" });
  }
};

// 3. Get Follow-up by ID
exports.getFollowupById = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await queryAsync("SELECT * FROM crm_followups WHERE id = ?", [id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Follow-up not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Error in getFollowupById:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch follow-up" });
  }
};

// 4. Update Follow-up
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
      followup_title,
      related_to || "Lead",
      entity_id || null,
      entity_name || null,
      company_name || null,
      mobile_number || null,
      followup_type || "Call",
      followup_date || null,
      followup_time || null,
      duration ? parseInt(duration, 10) : 15,
      priority || "Medium",
      followup_status || "Pending",
      discussion_summary || null,
      customer_requirement || null,
      customer_response || "Interested",
      next_action || null,
      attachment_name || null,
      assigned_to || null,
      reminder_enabled === false ? 0 : 1,
      reminder_before || "15 minutes",
      next_followup_date || null,
      next_followup_time || null,
      id
    ];

    await queryAsync(updateSql, params);

    res.json({
      success: true,
      message: "Follow-up updated successfully"
    });
  } catch (err) {
    console.error("Error in updateFollowup:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to update follow-up" });
  }
};

// 5. Quick Toggle / Patch Status
exports.patchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required." });
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

// 6. Delete Follow-up
exports.deleteFollowup = async (req, res) => {
  try {
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



// 7. Get Follow-up Reports Summary & Analytics
exports.getFollowupReportsSummary = async (req, res) => {
  try {
    const { startDate, endDate, assigned_to } = req.query;
    const branchId = getBranchId(req);
    let where = ["1=1"];
    let params = [];

    if (branchId) {
      where.push("(branch_id = ? OR branch_id IS NULL)");
      params.push(branchId);
    }
    if (startDate) {
      where.push("followup_date >= ?");
      params.push(startDate);
    }
    if (endDate) {
      where.push("followup_date <= ?");
      params.push(endDate);
    }
    if (assigned_to && assigned_to !== "All") {
      where.push("assigned_to = ?");
      params.push(assigned_to);
    }

    const whereClause = where.join(" AND ");

    // Summary
    const summarySql = `
      SELECT 
        COUNT(*) AS total_followups,
        SUM(CASE WHEN followup_status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN followup_status = 'Pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN followup_status = 'Rescheduled' THEN 1 ELSE 0 END) AS rescheduled_count,
        SUM(CASE WHEN followup_status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_count,
        COALESCE(SUM(duration), 0) AS total_duration_minutes
      FROM crm_followups
      WHERE ${whereClause}
    `;
    const summaryRows = await queryAsync(summarySql, params);
    const summary = summaryRows[0] || {};

    // By Activity Type
    const typeSql = `
      SELECT 
        followup_type,
        COUNT(*) AS count,
        SUM(CASE WHEN followup_status = 'Completed' THEN 1 ELSE 0 END) AS completed_count
      FROM crm_followups
      WHERE ${whereClause}
      GROUP BY followup_type
      ORDER BY count DESC
    `;
    const typeBreakdown = await queryAsync(typeSql, params);

    // By Customer Response
    const responseSql = `
      SELECT 
        COALESCE(customer_response, 'Interested') AS response,
        COUNT(*) AS count
      FROM crm_followups
      WHERE ${whereClause}
      GROUP BY customer_response
      ORDER BY count DESC
    `;
    const responseBreakdown = await queryAsync(responseSql, params);

    // By Staff
    const staffSql = `
      SELECT 
        COALESCE(assigned_to, 'Unassigned') AS staff_name,
        COUNT(*) AS total_assigned,
        SUM(CASE WHEN followup_status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN followup_status = 'Pending' THEN 1 ELSE 0 END) AS pending_count
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
          total_duration_minutes: parseInt(summary.total_duration_minutes, 10) || 0,
          completion_rate: summary.total_followups > 0 
            ? ((summary.completed_count / summary.total_followups) * 100).toFixed(1)
            : 0
        },
        typeBreakdown,
        responseBreakdown,
        staffBreakdown
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

    // 1. Fetch existing follow-up
    const existingRows = await queryAsync("SELECT * FROM crm_followups WHERE id = ?", [id]);
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({ success: false, message: "Follow-up not found" });
    }
    const current = existingRows[0];

    // 2. Update existing follow-up with next follow-up date and time
    await queryAsync(
      `UPDATE crm_followups 
       SET next_followup_date = ?, next_followup_time = ?, updated_at = NOW()
       WHERE id = ?`,
      [next_followup_date, scheduled_time || null, id]
    );

    // 3. If related to a lead, update the lead's next follow-up details
    if (current.related_to === "Lead" && current.entity_id) {
      const remarksTrimmed = (discussion_remarks || "").trim();
      const leadRows = await queryAsync("SELECT lead_notes FROM crm_leads WHERE id = ?", [current.entity_id]).catch(() => []);
      const leadNotes = leadRows && leadRows[0] ? leadRows[0].lead_notes : null;
      const updatedNotes = remarksTrimmed
        ? (leadNotes ? `${leadNotes}\n[Follow-up ${next_followup_date}]: ${remarksTrimmed}` : remarksTrimmed)
        : leadNotes;

      await queryAsync(
        `UPDATE crm_leads 
         SET followup_type = ?, followup_date = ?, followup_time = ?, priority = ?, lead_notes = COALESCE(?, lead_notes), updated_at = NOW()
         WHERE id = ?`,
        [followup_type, next_followup_date, scheduled_time || null, priority, updatedNotes, current.entity_id]
      ).catch((err) => console.warn("Could not sync next follow-up to lead:", err.message));
    }

    // 4. Generate new follow-up code
    const countResult = await queryAsync("SELECT MAX(id) AS maxId FROM crm_followups");
    const nextNum = (countResult[0]?.maxId || 0) + 1001;
    const newFollowupCode = `FLW-${nextNum}`;

    const branchId = current.branch_id || branchIdForInsert(req);
    const userId = req.user?.id || req.user?.user_id || null;

    const newTitle = current.followup_title
      ? (current.followup_title.startsWith("Follow-up:") ? current.followup_title : `Follow-up: ${current.followup_title}`)
      : `Follow-up: ${current.entity_name || "Client"}`;

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
        assigned_to,
        created_by,
        reminder_enabled,
        branch_id,
        user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 15, ?, 'Pending', ?, ?, ?, 1, ?, ?)
    `;

    const insertParams = [
      newFollowupCode,
      newTitle,
      current.related_to || "Lead",
      current.entity_id || null,
      current.entity_name || null,
      current.company_name || null,
      current.mobile_number || null,
      followup_type,
      next_followup_date,
      scheduled_time || "10:30",
      priority,
      discussion_remarks ? String(discussion_remarks).trim() : null,
      current.assigned_to || null,
      req.user?.full_name || req.user?.username || current.created_by || "Admin",
      branchId,
      userId
    ];

    const result = await queryAsync(insertSql, insertParams);

    res.json({
      success: true,
      message: "Next follow-up scheduled successfully",
      data: {
        id: result.insertId,
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
