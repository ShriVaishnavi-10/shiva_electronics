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

// 1. Create Lead
exports.createLead = async (req, res) => {
  try {
    const {
      lead_title,
      first_name,
      last_name,
      company_name,
      designation,
      mobile_number,
      email_address,
      whatsapp_number,
      website,
      lead_source,
      lead_status,
      priority,
      expected_budget,
      expected_closing_date,
      interested_product,
      assigned_to,
      followup_type,
      followup_date,
      followup_time,
      lead_notes
    } = req.body;

    if (!lead_title || !first_name || !mobile_number) {
      return res.status(400).json({
        success: false,
        message: "Lead Title, First Name, and Mobile Number are required."
      });
    }

    const branchId = branchIdForInsert(req);
    const createdBy = req.user?.id || req.user?.user_id || null;

    // Generate Lead Code (e.g., LD-1001)
    const countResult = await queryAsync("SELECT MAX(id) AS maxId FROM crm_leads");
    const nextNum = (countResult[0]?.maxId || 0) + 1001;
    const leadCode = `LD-${nextNum}`;

    const insertSql = `
      INSERT INTO crm_leads (
        lead_code,
        lead_title,
        first_name,
        last_name,
        company_name,
        designation,
        mobile_number,
        email_address,
        whatsapp_number,
        website,
        lead_source,
        lead_status,
        priority,
        expected_budget,
        expected_closing_date,
        interested_product,
        assigned_to,
        followup_type,
        followup_date,
        followup_time,
        lead_notes,
        branch_id,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      leadCode,
      lead_title.trim(),
      first_name.trim(),
      last_name ? last_name.trim() : null,
      company_name ? company_name.trim() : null,
      designation ? designation.trim() : null,
      mobile_number.trim(),
      email_address ? email_address.trim() : null,
      whatsapp_number ? whatsapp_number.trim() : null,
      website ? website.trim() : null,
      lead_source || "Showroom Walk-in",
      lead_status || "New",
      priority || "Medium",
      expected_budget ? parseFloat(expected_budget) || 0 : 0,
      expected_closing_date || null,
      interested_product ? interested_product.trim() : null,
      assigned_to || null,
      followup_type || null,
      followup_date || null,
      followup_time || null,
      lead_notes || null,
      branchId,
      createdBy
    ];

    const result = await queryAsync(insertSql, params);

    res.status(201).json({
      success: true,
      message: "Lead created successfully",
      id: result.insertId,
      lead_code: leadCode
    });
  } catch (err) {
    console.error("Error in createLead:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create lead"
    });
  }
};

// 2. Get All Leads with search, date-range, and pagination
exports.getLeads = async (req, res) => {
  try {
    const {
      search,
      status,
      priority,
      startDate,
      endDate,
      dateField = "created_at",
      page = 1,
      limit = 10,
      all
    } = req.query;

    const branchId = getBranchId(req);
    const bw = branchWhere(branchId, "");
    let where = [bw.clause];
    let params = [...bw.params];

    // Status filter
    if (status && status !== "All") {
      if (status === "Completed" || status === "Closed Won") {
        where.push("(lead_status = 'Closed Won' OR lead_status = 'Completed' OR lead_status = 'Won')");
      } else {
        where.push("lead_status = ?");
        params.push(status);
      }
    }

    // Priority filter
    if (priority && priority !== "All") {
      where.push("priority = ?");
      params.push(priority);
    }

    // Search query
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where.push(`(
        lead_title LIKE ? OR 
        first_name LIKE ? OR 
        last_name LIKE ? OR 
        company_name LIKE ? OR 
        mobile_number LIKE ? OR 
        interested_product LIKE ? OR
        lead_code LIKE ?
      )`);
      params.push(q, q, q, q, q, q, q);
    }

    // Date-wise filtering
    const validDateFields = ["created_at", "followup_date", "expected_closing_date"];
    const colName = validDateFields.includes(dateField) ? dateField : "created_at";

    if (startDate) {
      where.push(`DATE(${colName}) >= ?`);
      params.push(startDate);
    }
    if (endDate) {
      where.push(`DATE(${colName}) <= ?`);
      params.push(endDate);
    }

    const whereClause = where.join(" AND ");

    // Count query
    const countSql = `SELECT COUNT(*) AS total FROM crm_leads WHERE ${whereClause}`;
    const countResult = await queryAsync(countSql, params);
    const total = countResult[0]?.total || 0;

    // Data query
    let dataSql = `SELECT * FROM crm_leads WHERE ${whereClause} ORDER BY id DESC`;
    let dataParams = [...params];

    const isAll = all === "true" || limit === "all" || limit === "-1";
    if (!isAll) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 10));
      const offset = (pageNum - 1) * limitNum;
      dataSql += ` LIMIT ? OFFSET ?`;
      dataParams.push(limitNum, offset);
    }

    const rows = await queryAsync(dataSql, dataParams);

    res.json({
      success: true,
      data: rows || [],
      total,
      page: parseInt(page, 10) || 1,
      limit: rows ? rows.length : 0
    });
  } catch (err) {
    console.error("Error in getLeads:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch leads"
    });
  }
};

// 3. Get Lead By ID
exports.getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await queryAsync("SELECT * FROM crm_leads WHERE id = ?", [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Error in getLeadById:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch lead" });
  }
};

// 4. Update Lead
exports.updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      lead_title,
      first_name,
      last_name,
      company_name,
      designation,
      mobile_number,
      email_address,
      whatsapp_number,
      website,
      lead_source,
      lead_status,
      priority,
      expected_budget,
      expected_closing_date,
      interested_product,
      assigned_to,
      followup_type,
      followup_date,
      followup_time,
      lead_notes
    } = req.body;

    if (!lead_title || !first_name || !mobile_number) {
      return res.status(400).json({
        success: false,
        message: "Lead Title, First Name, and Mobile Number are required."
      });
    }

    const existing = await queryAsync("SELECT id FROM crm_leads WHERE id = ?", [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const updateSql = `
      UPDATE crm_leads SET
        lead_title = ?,
        first_name = ?,
        last_name = ?,
        company_name = ?,
        designation = ?,
        mobile_number = ?,
        email_address = ?,
        whatsapp_number = ?,
        website = ?,
        lead_source = ?,
        lead_status = ?,
        priority = ?,
        expected_budget = ?,
        expected_closing_date = ?,
        interested_product = ?,
        assigned_to = ?,
        followup_type = ?,
        followup_date = ?,
        followup_time = ?,
        lead_notes = ?
      WHERE id = ?
    `;

    const params = [
      lead_title.trim(),
      first_name.trim(),
      last_name ? last_name.trim() : null,
      company_name ? company_name.trim() : null,
      designation ? designation.trim() : null,
      mobile_number.trim(),
      email_address ? email_address.trim() : null,
      whatsapp_number ? whatsapp_number.trim() : null,
      website ? website.trim() : null,
      lead_source || "Showroom Walk-in",
      lead_status || "New",
      priority || "Medium",
      expected_budget ? parseFloat(expected_budget) || 0 : 0,
      expected_closing_date || null,
      interested_product ? interested_product.trim() : null,
      assigned_to || null,
      followup_type || null,
      followup_date || null,
      followup_time || null,
      lead_notes || null,
      id
    ];

    await queryAsync(updateSql, params);

    res.json({
      success: true,
      message: "Lead updated successfully"
    });
  } catch (err) {
    console.error("Error in updateLead:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to update lead" });
  }
};

// 5. Delete Lead
exports.deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    await queryAsync("DELETE FROM crm_leads WHERE id = ?", [id]);
    res.json({
      success: true,
      message: "Lead deleted successfully"
    });
  } catch (err) {
    console.error("Error in deleteLead:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to delete lead" });
  }
};


// 6. Get Assignable Sales Persons (Only Sales Persons)
exports.getAssignableEmployees = async (req, res) => {
  try {
    const branchId = getBranchId(req);

    // Fetch ONLY sales persons from sales_persons table
    let spSql = `
      SELECT id, name, employee_code, phone, email, branch_id
      FROM sales_persons
      WHERE (status = 'Active' OR status IS NULL)
    `;
    const spParams = [];
    if (branchId) {
      spSql += " AND (branch_id = ? OR branch_id IS NULL)";
      spParams.push(branchId);
    }
    spSql += " ORDER BY name ASC";

    let salesPersons = await queryAsync(spSql, spParams).catch(() => []);

    // If none found with branch filter, fallback to all active sales persons
    if ((!salesPersons || salesPersons.length === 0) && branchId) {
      salesPersons = await queryAsync(`
        SELECT id, name, employee_code, phone, email, branch_id
        FROM sales_persons
        WHERE (status = 'Active' OR status IS NULL)
        ORDER BY name ASC
      `).catch(() => []);
    }

    // Only sales persons names
    const list = [];
    const seen = new Set();

    (salesPersons || []).forEach((sp) => {
      const name = (sp.name || "").trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({
          id: sp.id,
          name: name,
          code: sp.employee_code || null,
          type: "sales_person"
        });
      }
    });

    res.json({
      success: true,
      data: list
    });
  } catch (err) {
    console.error("Error in getAssignableEmployees:", err);
    res.status(500).json({ success: false, message: "Failed to fetch sales persons", error: err.message });
  }
};


// 7. Get Completed Leads
exports.getCompletedLeads = async (req, res) => {
  req.query.status = "Completed";
  return exports.getLeads(req, res);
};

// 8. Patch Lead Status (e.g. Mark Completed / Won / Lost)
exports.patchLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const statusVal = req.body.lead_status || req.body.status;
    if (!statusVal) {
      return res.status(400).json({ success: false, message: "lead_status or status is required." });
    }
    await queryAsync("UPDATE crm_leads SET lead_status = ? WHERE id = ?", [statusVal, id]);
    res.json({ success: true, message: `Lead marked as ${statusVal}` });
  } catch (err) {
    console.error("Error in patchLeadStatus:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to update lead status" });
  }
};


// 9. Get Lead Reports Summary & Analytics
exports.getLeadReportsSummary = async (req, res) => {
  try {
    const { startDate, endDate, dateField = "created_at", assigned_to } = req.query;
    const branchId = getBranchId(req);
    const bw = branchWhere(branchId, "");
    let where = [bw.clause];
    let params = [...bw.params];

    if (startDate) {
      where.push(`DATE(${dateField}) >= ?`);
      params.push(startDate);
    }
    if (endDate) {
      where.push(`DATE(${dateField}) <= ?`);
      params.push(endDate);
    }
    if (assigned_to && assigned_to !== "All") {
      where.push("assigned_to = ?");
      params.push(assigned_to);
    }

    const whereClause = where.join(" AND ");

    // Overall KPI Summary
    const summarySql = `
      SELECT 
        COUNT(*) AS total_leads,
        SUM(CASE WHEN lead_status IN ('Closed Won', 'Completed', 'Won') THEN 1 ELSE 0 END) AS won_leads,
        SUM(CASE WHEN lead_status = 'Lost' THEN 1 ELSE 0 END) AS lost_leads,
        COALESCE(SUM(expected_budget), 0) AS total_pipeline_value,
        COALESCE(SUM(CASE WHEN lead_status IN ('Closed Won', 'Completed', 'Won') THEN expected_budget ELSE 0 END), 0) AS total_won_value
      FROM crm_leads
      WHERE ${whereClause}
    `;
    const summaryRows = await queryAsync(summarySql, params);
    const summary = summaryRows[0] || {};

    // By Status
    const statusSql = `
      SELECT 
        lead_status, 
        COUNT(*) AS count,
        COALESCE(SUM(expected_budget), 0) AS total_value
      FROM crm_leads
      WHERE ${whereClause}
      GROUP BY lead_status
      ORDER BY count DESC
    `;
    const statusBreakdown = await queryAsync(statusSql, params);

    // By Source
    const sourceSql = `
      SELECT 
        COALESCE(lead_source, 'Direct') AS lead_source, 
        COUNT(*) AS count,
        COALESCE(SUM(expected_budget), 0) AS total_value
      FROM crm_leads
      WHERE ${whereClause}
      GROUP BY lead_source
      ORDER BY count DESC
    `;
    const sourceBreakdown = await queryAsync(sourceSql, params);

    // By Sales Rep
    const repSql = `
      SELECT 
        COALESCE(assigned_to, 'Unassigned') AS rep_name,
        COUNT(*) AS total_leads,
        SUM(CASE WHEN lead_status IN ('Closed Won', 'Completed', 'Won') THEN 1 ELSE 0 END) AS won_leads,
        COALESCE(SUM(expected_budget), 0) AS total_value,
        COALESCE(SUM(CASE WHEN lead_status IN ('Closed Won', 'Completed', 'Won') THEN expected_budget ELSE 0 END), 0) AS won_value
      FROM crm_leads
      WHERE ${whereClause}
      GROUP BY assigned_to
      ORDER BY total_leads DESC
    `;
    const repBreakdown = await queryAsync(repSql, params);

    res.json({
      success: true,
      data: {
        summary: {
          total_leads: parseInt(summary.total_leads, 10) || 0,
          won_leads: parseInt(summary.won_leads, 10) || 0,
          lost_leads: parseInt(summary.lost_leads, 10) || 0,
          total_pipeline_value: parseFloat(summary.total_pipeline_value) || 0,
          total_won_value: parseFloat(summary.total_won_value) || 0,
          conversion_rate: summary.total_leads > 0 
            ? ((summary.won_leads / summary.total_leads) * 100).toFixed(1) 
            : 0
        },
        statusBreakdown,
        sourceBreakdown,
        repBreakdown
      }
    });
  } catch (err) {
    console.error("Error in getLeadReportsSummary:", err);
    res.status(500).json({ success: false, message: "Failed to generate lead reports summary" });
  }
};


// 10. Schedule Next Follow-up for a Specific Lead
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

    // 1. Fetch Lead
    const leadRows = await queryAsync("SELECT * FROM crm_leads WHERE id = ?", [id]);
    if (!leadRows || leadRows.length === 0) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    const lead = leadRows[0];

    // 2. Update Lead with new Next Follow-up details
    const branchId = lead.branch_id || branchIdForInsert(req);
    const remarksTrimmed = (discussion_remarks || "").trim();
    const updatedNotes = remarksTrimmed
      ? (lead.lead_notes ? `${lead.lead_notes}\n[Follow-up ${next_followup_date}]: ${remarksTrimmed}` : remarksTrimmed)
      : lead.lead_notes;

    await queryAsync(
      `UPDATE crm_leads 
       SET followup_type = ?, followup_date = ?, followup_time = ?, priority = ?, lead_notes = ?, updated_at = NOW()
       WHERE id = ?`,
      [followup_type, next_followup_date, scheduled_time || null, priority, updatedNotes, id]
    );

    // 3. Create entry in crm_followups
    const countResult = await queryAsync("SELECT MAX(id) AS maxId FROM crm_followups");
    const nextNum = (countResult[0]?.maxId || 0) + 1001;
    const followupCode = `FLW-${nextNum}`;

    const leadFullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
    const followupTitle = `Follow-up: ${lead.lead_title || leadFullName || "Lead Follow-up"}`;

    await queryAsync(
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
        branch_id
      ) VALUES (?, ?, 'Lead', ?, ?, ?, ?, ?, ?, ?, 15, ?, 'Pending', ?, ?, ?, ?)`,
      [
        followupCode,
        followupTitle,
        lead.id,
        leadFullName,
        lead.company_name || null,
        lead.mobile_number,
        followup_type,
        next_followup_date,
        scheduled_time || "10:30",
        priority,
        remarksTrimmed || null,
        lead.assigned_to || null,
        req.user?.full_name || req.user?.username || "Admin",
        branchId
      ]
    );

    res.json({
      success: true,
      message: "Next follow-up scheduled successfully",
      data: {
        lead_id: id,
        followup_code: followupCode,
        next_followup_date,
        scheduled_time
      }
    });
  } catch (err) {
    console.error("Error in scheduleNextFollowup:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to schedule follow-up" });
  }
};
