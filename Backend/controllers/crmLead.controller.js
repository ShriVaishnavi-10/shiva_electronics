const db = require("../config/db");
const {
  getRoleAndSalesIdentity,
  isLeadAssignedToUser,
  notifySalespersonOnAssignment,
  queryAsync
} = require("../services/crmRbac.service");

// Helper for branch isolation
function getBranchId(req) {
  const branch = req.headers["x-active-branch"] || req.user?.branch_id;
  if (!branch) return null;
  const num = parseInt(branch, 10);
  return isNaN(num) ? null : num;
}

function branchWhere(branchId, col = "branch_id") {
  if (!branchId) return { clause: "1=1", params: [] };
  const colRef = col ? `${col}` : "branch_id";
  return { clause: `(${colRef} = ? OR ${colRef} IS NULL)`, params: [branchId] };
}

function branchIdForInsert(req) {
  const b = getBranchId(req);
  return b !== null ? b : (req.user?.branch_ids && req.user.branch_ids[0]) || 2;
}

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
      address,
      city,
      state,
      pincode,
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

    const salesIdentity = await getRoleAndSalesIdentity(req);
    const branchId = branchIdForInsert(req);
    const createdBy = salesIdentity.userId;

    // Determine assigned_to:
    // If user is Salesperson and didn't specify or selected someone else, default to their own name
    let effectiveAssignedTo = assigned_to || null;
    if (!salesIdentity.isAdmin) {
      // Salespersons assign leads to themselves
      effectiveAssignedTo = salesIdentity.primaryName;
    }

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
        address,
        city,
        state,
        pincode,
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      address ? address.trim() : null,
      city ? city.trim() : null,
      state ? state.trim() : null,
      pincode ? pincode.trim() : null,
      lead_source || "Showroom Walk-in",
      lead_status || "New",
      priority || "Medium",
      expected_budget ? parseFloat(expected_budget) || 0 : 0,
      expected_closing_date || null,
      interested_product ? interested_product.trim() : null,
      effectiveAssignedTo,
      followup_type || null,
      followup_date || null,
      followup_time || null,
      lead_notes || null,
      branchId,
      createdBy
    ];

    const result = await queryAsync(insertSql, params);

    // If followup_date is provided on lead creation, automatically record in crm_followups
    if (followup_date) {
      try {
        const flwCountRes = await queryAsync("SELECT MAX(id) AS maxId FROM crm_followups");
        const nextFlwNum = (flwCountRes[0]?.maxId || 0) + 1001;
        const flwCode = `FLW-${nextFlwNum}`;
        const leadFullName = [first_name.trim(), last_name ? last_name.trim() : ""].filter(Boolean).join(" ");

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
            user_id,
            branch_id
          ) VALUES (?, ?, 'Lead', ?, ?, ?, ?, ?, ?, ?, 15, ?, 'Pending', ?, ?, ?, ?, ?)`,
          [
            flwCode,
            `Follow-up: ${lead_title.trim()}`,
            result.insertId,
            leadFullName,
            company_name ? company_name.trim() : null,
            mobile_number.trim(),
            followup_type || "Phone Call",
            followup_date,
            followup_time || "10:30",
            priority || "Medium",
            lead_notes ? lead_notes.trim() : null,
            effectiveAssignedTo,
            salesIdentity.primaryName,
            salesIdentity.userId,
            branchId
          ]
        );
      } catch (flwErr) {
        console.error("Error creating synced followup for new lead:", flwErr);
      }
    }

    // If Admin assigned the lead to a Salesperson, notify only that assigned salesperson
    if (salesIdentity.isAdmin && effectiveAssignedTo && effectiveAssignedTo !== "Unassigned") {
      notifySalespersonOnAssignment({
        assignedToName: effectiveAssignedTo,
        type: "CRM_LEAD_ASSIGNED",
        title: `New Work Assigned: Lead ${leadCode}`,
        message: `Admin assigned lead "${lead_title}" (${first_name} ${last_name || ""}, ${mobile_number}) to you. Priority: ${priority || "Medium"}.`,
        referenceId: result.insertId
      }).catch(e => console.error("Lead assignment notification error:", e));
    }

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

// 2. Get All Leads with role-based restriction, search, date-range, and pagination
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
      all,
      assigned_to
    } = req.query;

    const salesIdentity = await getRoleAndSalesIdentity(req);
    const branchId = getBranchId(req);
    const bw = branchWhere(branchId, "");
    let where = [bw.clause];
    let params = [...bw.params];

    // ROLE-BASED ACCESS CONTROL:
    // Salespersons can ONLY see leads assigned to them or created by them!
    if (!salesIdentity.isAdmin) {
      const nameConditions = [];
      const nameParams = [];
      salesIdentity.names.forEach(n => {
        nameConditions.push("LOWER(assigned_to) LIKE LOWER(?)");
        nameParams.push(`%${n}%`);
      });
      if (salesIdentity.userId) {
        nameConditions.push("created_by = ?");
        nameParams.push(salesIdentity.userId);
      }
      if (nameConditions.length > 0) {
        where.push(`(${nameConditions.join(" OR ")})`);
        params.push(...nameParams);
      } else {
        where.push("1=0");
      }
    } else {
      // Admin: full access across all leads; optional filter by assigned_to
      if (assigned_to) {
        const trimmedAssigned = String(assigned_to).trim();
        if (trimmedAssigned.toLowerCase() === "me") {
          const nameConditions = [];
          salesIdentity.names.forEach(n => {
            nameConditions.push("LOWER(assigned_to) LIKE LOWER(?)");
            params.push(`%${n}%`);
          });
          if (nameConditions.length > 0) {
            where.push(`(${nameConditions.join(" OR ")})`);
          }
        } else if (trimmedAssigned.toLowerCase() === "unassigned") {
          where.push("(assigned_to IS NULL OR assigned_to = '' OR assigned_to = 'Unassigned')");
        } else if (trimmedAssigned.toLowerCase() !== "all") {
          where.push("LOWER(assigned_to) LIKE LOWER(?)");
          params.push(`%${trimmedAssigned}%`);
        }
      }
    }

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
        mobile_number LIKE ? OR 
        city LIKE ? OR
        address LIKE ? OR
        interested_product LIKE ? OR
        lead_code LIKE ?
      )`);
      params.push(q, q, q, q, q, q, q, q);
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

    // Calculate My Allocated Count
    let myAllocatedCount = total;
    if (salesIdentity.isAdmin && salesIdentity.names.length > 0) {
      try {
        const myNameConditions = salesIdentity.names.map(() => "LOWER(assigned_to) LIKE LOWER(?)").join(" OR ");
        const myNameParams = salesIdentity.names.map(n => `%${n}%`);
        const myCountRes = await queryAsync(
          `SELECT COUNT(*) AS total FROM crm_leads WHERE (${myNameConditions})`,
          myNameParams
        );
        myAllocatedCount = myCountRes[0]?.total || 0;
      } catch (cErr) {
        myAllocatedCount = 0;
      }
    }

    res.json({
      success: true,
      data: rows || [],
      total,
      myAllocatedCount,
      page: parseInt(page, 10) || 1,
      limit: rows ? rows.length : 0,
      userRole: salesIdentity.isAdmin ? "admin" : "salesperson"
    });
  } catch (err) {
    console.error("Error in getLeads:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch leads"
    });
  }
};

// 3. Get Lead By ID (Strict access control)
exports.getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await queryAsync("SELECT * FROM crm_leads WHERE id = ?", [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const lead = rows[0];
    const salesIdentity = await getRoleAndSalesIdentity(req);

    // Ensure Salesperson can only view their own assigned lead
    if (!isLeadAssignedToUser(lead, salesIdentity)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view leads assigned to you."
      });
    }

    res.json({ success: true, data: lead });
  } catch (err) {
    console.error("Error in getLeadById:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch lead" });
  }
};

// 4. Update Lead (Assignment & modification access control)
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
      address,
      city,
      state,
      pincode,
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

    const existingRows = await queryAsync("SELECT * FROM crm_leads WHERE id = ?", [id]);
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    const existing = existingRows[0];

    const salesIdentity = await getRoleAndSalesIdentity(req);

    // Access check: Salesperson can only update leads assigned to them
    if (!isLeadAssignedToUser(existing, salesIdentity)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update leads assigned to you."
      });
    }

    // Role restriction: Salespersons cannot reassign leads away to other salespersons
    let effectiveAssignedTo = assigned_to;
    if (!salesIdentity.isAdmin) {
      // Preserve existing assignment for salesperson
      effectiveAssignedTo = existing.assigned_to;
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
        address = ?,
        city = ?,
        state = ?,
        pincode = ?,
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
      address ? address.trim() : null,
      city ? city.trim() : null,
      state ? state.trim() : null,
      pincode ? pincode.trim() : null,
      lead_source || "Showroom Walk-in",
      lead_status || "New",
      priority || "Medium",
      expected_budget ? parseFloat(expected_budget) || 0 : 0,
      expected_closing_date || null,
      interested_product ? interested_product.trim() : null,
      effectiveAssignedTo || null,
      followup_type || null,
      followup_date || null,
      followup_time || null,
      lead_notes || null,
      id
    ];

    await queryAsync(updateSql, params);

    // If followup_date is provided or updated on lead, synchronize with crm_followups
    if (followup_date) {
      try {
        const leadFullName = [first_name.trim(), last_name ? last_name.trim() : ""].filter(Boolean).join(" ");
        const pendingFlw = await queryAsync(
          "SELECT id FROM crm_followups WHERE related_to = 'Lead' AND entity_id = ? AND followup_status = 'Pending' ORDER BY id DESC LIMIT 1",
          [id]
        );

        if (pendingFlw && pendingFlw.length > 0) {
          await queryAsync(
            `UPDATE crm_followups SET
              followup_title = ?,
              entity_name = ?,
              company_name = ?,
              mobile_number = ?,
              followup_type = ?,
              followup_date = ?,
              followup_time = ?,
              priority = ?,
              assigned_to = ?,
              discussion_summary = COALESCE(?, discussion_summary)
             WHERE id = ?`,
            [
              `Follow-up: ${lead_title.trim()}`,
              leadFullName,
              company_name ? company_name.trim() : null,
              mobile_number.trim(),
              followup_type || "Phone Call",
              followup_date,
              followup_time || "10:30",
              priority || "Medium",
              effectiveAssignedTo || null,
              lead_notes ? lead_notes.trim() : null,
              pendingFlw[0].id
            ]
          );
        } else {
          const flwCountRes = await queryAsync("SELECT MAX(id) AS maxId FROM crm_followups");
          const nextFlwNum = (flwCountRes[0]?.maxId || 0) + 1001;
          const flwCode = `FLW-${nextFlwNum}`;

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
              user_id,
              branch_id
            ) VALUES (?, ?, 'Lead', ?, ?, ?, ?, ?, ?, ?, 15, ?, 'Pending', ?, ?, ?, ?, ?)`,
            [
              flwCode,
              `Follow-up: ${lead_title.trim()}`,
              id,
              leadFullName,
              company_name ? company_name.trim() : null,
              mobile_number.trim(),
              followup_type || "Phone Call",
              followup_date,
              followup_time || "10:30",
              priority || "Medium",
              lead_notes ? lead_notes.trim() : null,
              effectiveAssignedTo || null,
              salesIdentity.primaryName,
              salesIdentity.userId,
              existing.branch_id || branchIdForInsert(req)
            ]
          );
        }
      } catch (flwErr) {
        console.error("Error synchronizing followup on lead update:", flwErr);
      }
    }

    // If Admin assigned or changed the lead assignment, notify only that assigned salesperson
    if (salesIdentity.isAdmin && effectiveAssignedTo && effectiveAssignedTo !== "Unassigned") {
      const assignmentChanged = String(existing.assigned_to || "").trim().toLowerCase() !== String(effectiveAssignedTo).trim().toLowerCase();
      if (assignmentChanged) {
        notifySalespersonOnAssignment({
          assignedToName: effectiveAssignedTo,
          type: "CRM_LEAD_ASSIGNED",
          title: `New Work Assigned: Lead ${lead_title}`,
          message: `Admin assigned lead "${lead_title}" (${first_name} ${last_name || ""}, ${mobile_number}) to you. Priority: ${priority || 'Medium'}.`,
          referenceId: Number(id)
        }).catch(e => console.error("Lead assignment notification error:", e));
      }
    }

    res.json({
      success: true,
      message: "Lead updated successfully"
    });
  } catch (err) {
    console.error("Error in updateLead:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to update lead" });
  }
};

// 5. Delete Lead (Only Admin allowed)
exports.deleteLead = async (req, res) => {
  try {
    const salesIdentity = await getRoleAndSalesIdentity(req);
    if (!salesIdentity.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only CRM Administrators can delete leads."
      });
    }

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

// 6. Get Assignable Sales Persons (For Admin assignment dropdown)
exports.getAssignableEmployees = async (req, res) => {
  try {
    const branchId = getBranchId(req);

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

    if ((!salesPersons || salesPersons.length === 0) && branchId) {
      salesPersons = await queryAsync(`
        SELECT id, name, employee_code, phone, email, branch_id
        FROM sales_persons
        WHERE (status = 'Active' OR status IS NULL)
        ORDER BY name ASC
      `).catch(() => []);
    }

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

// 8. Patch Lead Status (Status update access control)
exports.patchLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const statusVal = req.body.lead_status || req.body.status;
    if (!statusVal) {
      return res.status(400).json({ success: false, message: "lead_status or status is required." });
    }

    const existingRows = await queryAsync("SELECT * FROM crm_leads WHERE id = ?", [id]);
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    const lead = existingRows[0];
    const salesIdentity = await getRoleAndSalesIdentity(req);

    if (!isLeadAssignedToUser(lead, salesIdentity)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update leads assigned to you."
      });
    }

    await queryAsync("UPDATE crm_leads SET lead_status = ? WHERE id = ?", [statusVal, id]);
    res.json({ success: true, message: `Lead marked as ${statusVal}` });
  } catch (err) {
    console.error("Error in patchLeadStatus:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to update lead status" });
  }
};

// 9. Get Lead Reports Summary & Analytics (Restricted to assigned for sales staff)
exports.getLeadReportsSummary = async (req, res) => {
  try {
    const { startDate, endDate, dateField = "created_at", assigned_to } = req.query;
    const salesIdentity = await getRoleAndSalesIdentity(req);
    const branchId = getBranchId(req);
    const bw = branchWhere(branchId, "");
    let where = [bw.clause];
    let params = [...bw.params];

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
      where.push(`DATE(${dateField}) >= ?`);
      params.push(startDate);
    }
    if (endDate) {
      where.push(`DATE(${dateField}) <= ?`);
      params.push(endDate);
    }

    const whereClause = where.join(" AND ");

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

    const leadRows = await queryAsync("SELECT * FROM crm_leads WHERE id = ?", [id]);
    if (!leadRows || leadRows.length === 0) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    const lead = leadRows[0];

    const salesIdentity = await getRoleAndSalesIdentity(req);
    if (!isLeadAssignedToUser(lead, salesIdentity)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only schedule follow-ups for leads assigned to you."
      });
    }

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

    const countResult = await queryAsync("SELECT MAX(id) AS maxId FROM crm_followups");
    const nextNum = (countResult[0]?.maxId || 0) + 1001;
    const followupCode = `FLW-${nextNum}`;

    const leadFullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
    const followupTitle = `Follow-up: ${lead.lead_title || leadFullName || "Lead Follow-up"}`;

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
      ) VALUES (?, ?, 'Lead', ?, ?, ?, ?, ?, ?, ?, 15, ?, 'Pending', ?, ?, ?, ?, ?)`,
      [
        followupCode,
        followupTitle,
        lead.id,
        leadFullName,
        lead.company_name || null,
        lead.mobile_number,
        followup_type,
        next_followup_date,
        (scheduled_time && String(scheduled_time).trim()) ? String(scheduled_time).trim() : null,
        priority,
        remarksTrimmed || null,
        lead.assigned_to || salesIdentity.primaryName,
        salesIdentity.primaryName,
        salesIdentity.userId,
        branchId
      ]
    );

    // If Admin scheduled follow-up for assigned salesperson, notify them
    if (salesIdentity.isAdmin && lead.assigned_to && lead.assigned_to !== "Unassigned") {
      notifySalespersonOnAssignment({
        assignedToName: lead.assigned_to,
        type: "CRM_FOLLOWUP_ASSIGNED",
        title: `Follow-up Scheduled: ${lead.lead_title || leadFullName}`,
        message: `Admin scheduled next follow-up for ${next_followup_date} at ${scheduled_time || "10:30"} with customer ${leadFullName} (${lead.mobile_number}).`,
        referenceId: insertResult.insertId
      }).catch(e => console.error("Follow-up notification error:", e));
    }

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

// Helper for building detailed Employee Performance & Activity report
async function buildEmployeePerformanceReport({ branchId, leadWhereClause, leadParams, followupWhereClause, followupParams }) {
  let spSql = "SELECT id, name, employee_code, phone, email, branch_id FROM sales_persons WHERE (status = 'Active' OR status IS NULL)";
  let spParams = [];
  if (branchId) {
    spSql += " AND (branch_id = ? OR branch_id IS NULL)";
    spParams.push(branchId);
  }
  spSql += " ORDER BY name ASC";
  let salesPersons = await queryAsync(spSql, spParams).catch(() => []);
  if ((!salesPersons || salesPersons.length === 0) && branchId) {
    salesPersons = await queryAsync("SELECT id, name, employee_code, phone, email, branch_id FROM sales_persons WHERE (status = 'Active' OR status IS NULL) ORDER BY name ASC").catch(() => []);
  }

  const leadAggSql = `
    SELECT 
      COALESCE(NULLIF(TRIM(assigned_to), ''), 'Unassigned') AS rep_name,
      COUNT(*) AS total_leads,
      SUM(CASE WHEN lead_status IN ('Closed Won', 'Completed', 'Won') THEN 1 ELSE 0 END) AS won_leads,
      SUM(CASE WHEN lead_status NOT IN ('Closed Won', 'Completed', 'Won', 'Lost', 'Cancelled') THEN 1 ELSE 0 END) AS active_leads,
      SUM(CASE WHEN lead_status IN ('Lost', 'Cancelled') THEN 1 ELSE 0 END) AS lost_leads,
      COALESCE(SUM(expected_budget), 0) AS total_pipeline_value,
      COALESCE(SUM(CASE WHEN lead_status IN ('Closed Won', 'Completed', 'Won') THEN expected_budget ELSE 0 END), 0) AS won_value
    FROM crm_leads
    WHERE ${leadWhereClause}
    GROUP BY rep_name
  `;
  const leadAggRows = await queryAsync(leadAggSql, leadParams).catch(() => []);

  const flwAggSql = `
    SELECT 
      COALESCE(NULLIF(TRIM(assigned_to), ''), 'Unassigned') AS rep_name,
      COUNT(*) AS total_activities,
      SUM(CASE WHEN followup_status = 'Completed' THEN 1 ELSE 0 END) AS completed_activities,
      SUM(CASE WHEN followup_status = 'Pending' THEN 1 ELSE 0 END) AS pending_activities,
      SUM(CASE WHEN followup_status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_activities,
      SUM(CASE WHEN LOWER(followup_type) LIKE '%call%' THEN 1 ELSE 0 END) AS calls_count,
      SUM(CASE WHEN LOWER(followup_type) LIKE '%demo%' OR LOWER(followup_type) LIKE '%visit%' THEN 1 ELSE 0 END) AS visits_count,
      SUM(CASE WHEN LOWER(followup_type) LIKE '%whatsapp%' THEN 1 ELSE 0 END) AS whatsapp_count,
      SUM(CASE WHEN LOWER(followup_type) LIKE '%meeting%' THEN 1 ELSE 0 END) AS meetings_count
    FROM crm_followups
    WHERE ${followupWhereClause}
    GROUP BY rep_name
  `;
  const flwAggRows = await queryAsync(flwAggSql, followupParams).catch(() => []);

  const leadMap = {};
  leadAggRows.forEach(r => { leadMap[(r.rep_name || "").toLowerCase()] = r; });
  const flwMap = {};
  flwAggRows.forEach(r => { flwMap[(r.rep_name || "").toLowerCase()] = r; });

  const employeesReport = salesPersons.map(sp => {
    const spNameKey = (sp.name || "").toLowerCase();
    const l = leadMap[spNameKey] || {};
    const f = flwMap[spNameKey] || {};

    const total_leads = parseInt(l.total_leads, 10) || 0;
    const won_leads = parseInt(l.won_leads, 10) || 0;
    const active_leads = parseInt(l.active_leads, 10) || 0;
    const lost_leads = parseInt(l.lost_leads, 10) || 0;
    const total_pipeline_value = parseFloat(l.total_pipeline_value) || 0;
    const won_value = parseFloat(l.won_value) || 0;
    const conversion_rate = total_leads > 0 ? ((won_leads / total_leads) * 100).toFixed(1) : "0.0";

    const total_activities = parseInt(f.total_activities, 10) || 0;
    const completed_activities = parseInt(f.completed_activities, 10) || 0;
    const pending_activities = parseInt(f.pending_activities, 10) || 0;
    const cancelled_activities = parseInt(f.cancelled_activities, 10) || 0;
    const activity_completion_rate = total_activities > 0 ? ((completed_activities / total_activities) * 100).toFixed(1) : "0.0";

    return {
      id: sp.id,
      name: sp.name,
      employee_code: sp.employee_code || `SP-${sp.id}`,
      phone: sp.phone || "—",
      email: sp.email || "—",
      total_leads,
      won_leads,
      active_leads,
      lost_leads,
      completion_rate: conversion_rate,
      total_pipeline_value,
      won_value,
      total_activities,
      completed_activities,
      pending_activities,
      cancelled_activities,
      activity_completion_rate,
      calls_count: parseInt(f.calls_count, 10) || 0,
      visits_count: parseInt(f.visits_count, 10) || 0,
      whatsapp_count: parseInt(f.whatsapp_count, 10) || 0,
      meetings_count: parseInt(f.meetings_count, 10) || 0
    };
  });

  // Include unassigned if any leads or activities exist
  const unassignedLead = leadMap["unassigned"];
  const unassignedFlw = flwMap["unassigned"];
  if (unassignedLead || unassignedFlw) {
    const uTotalLeads = parseInt(unassignedLead?.total_leads, 10) || 0;
    const uWonLeads = parseInt(unassignedLead?.won_leads, 10) || 0;
    const uActiveLeads = parseInt(unassignedLead?.active_leads, 10) || 0;
    const uLostLeads = parseInt(unassignedLead?.lost_leads, 10) || 0;
    const uPipelineVal = parseFloat(unassignedLead?.total_pipeline_value) || 0;
    const uWonVal = parseFloat(unassignedLead?.won_value) || 0;
    const uTotalFlw = parseInt(unassignedFlw?.total_activities, 10) || 0;
    const uCompletedFlw = parseInt(unassignedFlw?.completed_activities, 10) || 0;
    const uPendingFlw = parseInt(unassignedFlw?.pending_activities, 10) || 0;

    if (uTotalLeads > 0 || uTotalFlw > 0) {
      employeesReport.push({
        id: 0,
        name: "Unassigned",
        employee_code: "N/A",
        phone: "—",
        email: "—",
        total_leads: uTotalLeads,
        won_leads: uWonLeads,
        active_leads: uActiveLeads,
        lost_leads: uLostLeads,
        completion_rate: uTotalLeads > 0 ? ((uWonLeads / uTotalLeads) * 100).toFixed(1) : "0.0",
        total_pipeline_value: uPipelineVal,
        won_value: uWonVal,
        total_activities: uTotalFlw,
        completed_activities: uCompletedFlw,
        pending_activities: uPendingFlw,
        cancelled_activities: 0,
        activity_completion_rate: uTotalFlw > 0 ? ((uCompletedFlw / uTotalFlw) * 100).toFixed(1) : "0.0",
        calls_count: parseInt(unassignedFlw?.calls_count, 10) || 0,
        visits_count: parseInt(unassignedFlw?.visits_count, 10) || 0,
        whatsapp_count: parseInt(unassignedFlw?.whatsapp_count, 10) || 0,
        meetings_count: parseInt(unassignedFlw?.meetings_count, 10) || 0
      });
    }
  }

  return employeesReport;
}

// 11. CRM Dashboard Dynamic Summary Aggregations
exports.getCrmDashboardSummary = async (req, res) => {
  try {
    const { basis = "all", startDate = "", endDate = "" } = req.query;
    const salesIdentity = await getRoleAndSalesIdentity(req);
    const branchId = getBranchId(req);
    const bw = branchWhere(branchId, "");
    let leadWhere = [bw.clause];
    let leadParams = [...bw.params];

    if (!salesIdentity.isAdmin) {
      const nameConditions = salesIdentity.names.map(() => "LOWER(assigned_to) LIKE LOWER(?)").join(" OR ");
      const nameParams = salesIdentity.names.map(n => `%${n}%`);
      if (nameConditions) {
        leadWhere.push(`(${nameConditions})`);
        leadParams.push(...nameParams);
      } else {
        leadWhere.push("1=0");
      }
    }

    // Apply basis date filter to leads if requested
    if (basis === "today") {
      leadWhere.push("DATE(created_at) = CURDATE()");
    } else if (basis === "this_week") {
      leadWhere.push("YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)");
    } else if (basis === "this_month") {
      leadWhere.push("DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')");
    } else if (basis === "custom" || (startDate && endDate)) {
      if (startDate) {
        leadWhere.push("DATE(created_at) >= ?");
        leadParams.push(startDate);
      }
      if (endDate) {
        leadWhere.push("DATE(created_at) <= ?");
        leadParams.push(endDate);
      }
    }

    const leadWhereClause = leadWhere.join(" AND ");

    // 1. KPI Aggregations from crm_leads
    const kpiSql = `
      SELECT 
        COUNT(*) AS total_leads,
        SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS leads_this_week,
        SUM(CASE WHEN created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN 1 ELSE 0 END) AS leads_this_month,
        COALESCE(SUM(CASE WHEN lead_status NOT IN ('Closed Won', 'Completed', 'Won', 'Lost', 'Cancelled') THEN expected_budget ELSE 0 END), 0) AS active_pipeline_value,
        SUM(CASE WHEN lead_status NOT IN ('Closed Won', 'Completed', 'Won', 'Lost', 'Cancelled') THEN 1 ELSE 0 END) AS active_opportunities_count,
        COALESCE(SUM(CASE WHEN lead_status IN ('Closed Won', 'Completed', 'Won') THEN expected_budget ELSE 0 END), 0) AS won_value,
        SUM(CASE WHEN lead_status IN ('Closed Won', 'Completed', 'Won') THEN 1 ELSE 0 END) AS won_count
      FROM crm_leads
      WHERE ${leadWhereClause}
    `;
    const kpiRows = await queryAsync(kpiSql, leadParams);
    const kpi = kpiRows[0] || {};

    const totalLeads = parseInt(kpi.total_leads, 10) || 0;
    const wonCount = parseInt(kpi.won_count, 10) || 0;
    const conversionRate = totalLeads > 0 ? ((wonCount / totalLeads) * 100).toFixed(1) : "0.0";

    // 2. Follow-up stats from crm_followups
    let followupWhere = ["1=1"];
    let followupParams = [];
    if (branchId) {
      followupWhere.push("(branch_id = ? OR branch_id IS NULL)");
      followupParams.push(branchId);
    }
    if (!salesIdentity.isAdmin) {
      const nameConditions = salesIdentity.names.map(() => "LOWER(assigned_to) LIKE LOWER(?)").join(" OR ");
      const nameParams = salesIdentity.names.map(n => `%${n}%`);
      if (nameConditions) {
        followupWhere.push(`(${nameConditions})`);
        followupParams.push(...nameParams);
      } else {
        followupWhere.push("1=0");
      }
    }

    // Apply basis date filter to follow-ups
    if (basis === "today") {
      followupWhere.push("(DATE(followup_date) = CURDATE() OR DATE(created_at) = CURDATE())");
    } else if (basis === "this_week") {
      followupWhere.push("(YEARWEEK(followup_date, 1) = YEARWEEK(CURDATE(), 1) OR YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1))");
    } else if (basis === "this_month") {
      followupWhere.push("(DATE_FORMAT(followup_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m') OR DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m'))");
    } else if (basis === "custom" || (startDate && endDate)) {
      if (startDate) {
        followupWhere.push("DATE(followup_date) >= ?");
        followupParams.push(startDate);
      }
      if (endDate) {
        followupWhere.push("DATE(followup_date) <= ?");
        followupParams.push(endDate);
      }
    }

    const followupWhereClause = followupWhere.join(" AND ");

    const followupKpiSql = `
      SELECT 
        COUNT(*) AS total_followups,
        SUM(CASE WHEN DATE(followup_date) = CURDATE() AND followup_status != 'Completed' THEN 1 ELSE 0 END) AS today_due,
        SUM(CASE WHEN DATE(followup_date) = CURDATE() AND priority IN ('High', 'Urgent') AND followup_status != 'Completed' THEN 1 ELSE 0 END) AS high_priority_due,
        SUM(CASE WHEN followup_status = 'Pending' THEN 1 ELSE 0 END) AS pending_total
      FROM crm_followups
      WHERE ${followupWhereClause}
    `;
    const followupKpiRows = await queryAsync(followupKpiSql, followupParams);
    const fKpi = followupKpiRows[0] || {};

    // 3. Pipeline Stages Breakdown
    const stageSql = `
      SELECT 
        lead_status, 
        COUNT(*) AS count,
        COALESCE(SUM(expected_budget), 0) AS total_value
      FROM crm_leads
      WHERE ${leadWhereClause}
      GROUP BY lead_status
    `;
    const stageRows = await queryAsync(stageSql, leadParams);
    const stageMap = {};
    stageRows.forEach(r => {
      const key = String(r.lead_status || "").trim().toLowerCase();
      stageMap[key] = {
        count: parseInt(r.count, 10) || 0,
        total_value: parseFloat(r.total_value) || 0
      };
    });

    const standardStages = [
      { name: "New Leads", keys: ["new", "new lead", "new leads"], color: "#3b82f6", badgeBg: "#dbeafe", estCycle: 2 },
      { name: "Contacted", keys: ["contacted", "in progress", "contact"], color: "#6366f1", badgeBg: "#e0e7ff", estCycle: 4 },
      { name: "Proposal Sent", keys: ["proposal sent", "proposal", "quoted"], color: "#8b5cf6", badgeBg: "#ede9fe", estCycle: 6 },
      { name: "In Negotiation", keys: ["in negotiation", "negotiation", "negotiating"], color: "#f59e0b", badgeBg: "#fef3c7", estCycle: 8 },
      { name: "Closed Won", keys: ["closed won", "won", "completed"], color: "#10b981", badgeBg: "#d1fae5", estCycle: 10 }
    ];

    const pipelineStages = standardStages.map((st, idx) => {
      let count = 0;
      let total_value = 0;
      st.keys.forEach(k => {
        if (stageMap[k]) {
          count += stageMap[k].count;
          total_value += stageMap[k].total_value;
        }
      });
      return {
        stageNumber: idx + 1,
        name: st.name,
        count,
        total_value,
        color: st.color,
        badgeBg: st.badgeBg,
        estCycle: st.estCycle
      };
    });

    // 4. Lead Acquisition Sources Breakdown
    const sourceSql = `
      SELECT 
        COALESCE(NULLIF(TRIM(lead_source), ''), 'Direct / Walk-in') AS source_name,
        COUNT(*) AS count,
        COALESCE(SUM(expected_budget), 0) AS total_value
      FROM crm_leads
      WHERE ${leadWhereClause}
      GROUP BY source_name
      ORDER BY count DESC
      LIMIT 6
    `;
    const sourceRows = await queryAsync(sourceSql, leadParams);
    const leadSources = sourceRows.map(r => ({
      source: r.source_name,
      count: parseInt(r.count, 10) || 0,
      value: parseFloat(r.total_value) || 0,
      share: totalLeads > 0 ? Math.round(((parseInt(r.count, 10) || 0) / totalLeads) * 100) : 0
    }));

    // 5. Recent Leads (latest 6)
    const recentLeadsSql = `
      SELECT 
        id, lead_code, lead_title, first_name, last_name, company_name, 
        mobile_number, email_address, lead_source, lead_status, priority, 
        expected_budget, interested_product, assigned_to, created_at
      FROM crm_leads
      WHERE ${leadWhereClause}
      ORDER BY id DESC
      LIMIT 6
    `;
    const recentLeads = await queryAsync(recentLeadsSql, leadParams);

    // 6. Today's and Upcoming Scheduled Follow-ups
    const followupsSql = `
      SELECT 
        id, followup_code, followup_title, related_to, entity_name, company_name,
        mobile_number, followup_type, DATE_FORMAT(followup_date, '%Y-%m-%d') as followup_date, followup_time, priority,
        followup_status, discussion_summary, assigned_to
      FROM crm_followups
      WHERE ${followupWhereClause}
      ORDER BY 
        CASE 
          WHEN DATE(followup_date) = CURDATE() THEN 1
          WHEN DATE(followup_date) > CURDATE() THEN 2
          ELSE 3
        END ASC,
        followup_date ASC,
        followup_time ASC
      LIMIT 6
    `;
    const scheduledFollowups = await queryAsync(followupsSql, followupParams);

    // 7. Sales Representatives Performance (for Admins)
    let repPerformance = [];
    let employeePerformance = [];
    if (salesIdentity.isAdmin) {
      const repSql = `
        SELECT 
          COALESCE(NULLIF(TRIM(assigned_to), ''), 'Unassigned') AS rep_name,
          COUNT(*) AS total_leads,
          SUM(CASE WHEN lead_status IN ('Closed Won', 'Completed', 'Won') THEN 1 ELSE 0 END) AS won_leads,
          COALESCE(SUM(expected_budget), 0) AS total_value,
          COALESCE(SUM(CASE WHEN lead_status IN ('Closed Won', 'Completed', 'Won') THEN expected_budget ELSE 0 END), 0) AS won_value
        FROM crm_leads
        WHERE ${leadWhereClause}
        GROUP BY rep_name
        ORDER BY total_leads DESC
        LIMIT 10
      `;
      repPerformance = await queryAsync(repSql, leadParams);

      // Detailed employee performance report including all staff and follow-up activities
      employeePerformance = await buildEmployeePerformanceReport({
        branchId,
        leadWhereClause,
        leadParams,
        followupWhereClause,
        followupParams
      });
    }

    res.json({
      success: true,
      basis,
      data: {
        kpi: {
          total_leads: totalLeads,
          leads_this_week: parseInt(kpi.leads_this_week, 10) || 0,
          leads_this_month: parseInt(kpi.leads_this_month, 10) || 0,
          active_pipeline_value: parseFloat(kpi.active_pipeline_value) || 0,
          active_opportunities_count: parseInt(kpi.active_opportunities_count, 10) || 0,
          won_value: parseFloat(kpi.won_value) || 0,
          won_count: wonCount,
          conversion_rate: conversionRate,
          today_due_followups: parseInt(fKpi.today_due, 10) || 0,
          high_priority_due_followups: parseInt(fKpi.high_priority_due, 10) || 0,
          pending_total_followups: parseInt(fKpi.pending_total, 10) || 0,
          total_followups: parseInt(fKpi.total_followups, 10) || 0
        },
        pipelineStages,
        leadSources,
        recentLeads,
        scheduledFollowups,
        repPerformance,
        employeePerformance
      }
    });
  } catch (err) {
    console.error("Error in getCrmDashboardSummary:", err);
    res.status(500).json({ success: false, message: "Failed to fetch CRM dashboard summary" });
  }
};

// 12. Employee Performance & Activity Report for Admin (Report Basis Supported)
exports.getEmployeePerformanceReport = async (req, res) => {
  try {
    const salesIdentity = await getRoleAndSalesIdentity(req);
    if (!salesIdentity.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only CRM Administrators can access employee performance reports."
      });
    }

    const {
      basis = "all", // "all", "today", "this_week", "this_month", "custom"
      startDate = "",
      endDate = "",
      employeeId = "",
      employeeName = ""
    } = req.query;

    const branchId = getBranchId(req);
    const bw = branchWhere(branchId, "");

    // Build date filters for leads (created_at)
    const leadDateConditions = [];
    const leadDateParams = [];
    if (basis === "today") {
      leadDateConditions.push("DATE(created_at) = CURDATE()");
    } else if (basis === "this_week") {
      leadDateConditions.push("YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)");
    } else if (basis === "this_month") {
      leadDateConditions.push("DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')");
    } else if (basis === "custom" || (startDate && endDate)) {
      if (startDate) {
        leadDateConditions.push("DATE(created_at) >= ?");
        leadDateParams.push(startDate);
      }
      if (endDate) {
        leadDateConditions.push("DATE(created_at) <= ?");
        leadDateParams.push(endDate);
      }
    }

    // Build date filters for follow-ups (followup_date or created_at)
    const flwDateConditions = [];
    const flwDateParams = [];
    if (basis === "today") {
      flwDateConditions.push("(DATE(followup_date) = CURDATE() OR DATE(created_at) = CURDATE())");
    } else if (basis === "this_week") {
      flwDateConditions.push("(YEARWEEK(followup_date, 1) = YEARWEEK(CURDATE(), 1) OR YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1))");
    } else if (basis === "this_month") {
      flwDateConditions.push("(DATE_FORMAT(followup_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m') OR DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m'))");
    } else if (basis === "custom" || (startDate && endDate)) {
      if (startDate) {
        flwDateConditions.push("DATE(followup_date) >= ?");
        flwDateParams.push(startDate);
      }
      if (endDate) {
        flwDateConditions.push("DATE(followup_date) <= ?");
        flwDateParams.push(endDate);
      }
    }

    // Where clauses
    let leadWhere = [bw.clause, ...leadDateConditions];
    let leadParams = [...bw.params, ...leadDateParams];
    const leadWhereClause = leadWhere.join(" AND ");

    let flwWhere = ["1=1", ...flwDateConditions];
    let flwParams = [...flwDateParams];
    if (branchId) {
      flwWhere.push("(branch_id = ? OR branch_id IS NULL)");
      flwParams.push(branchId);
    }
    const followupWhereClause = flwWhere.join(" AND ");

    const employeesReport = await buildEmployeePerformanceReport({
      branchId,
      leadWhereClause,
      leadParams,
      followupWhereClause,
      followupParams: flwParams
    });

    // Overall team summary
    const summary = {
      total_employees: employeesReport.filter(e => e.id !== 0).length,
      total_leads: employeesReport.reduce((acc, r) => acc + r.total_leads, 0),
      total_completed_leads: employeesReport.reduce((acc, r) => acc + r.won_leads, 0),
      total_active_leads: employeesReport.reduce((acc, r) => acc + r.active_leads, 0),
      total_won_value: employeesReport.reduce((acc, r) => acc + r.won_value, 0),
      total_pipeline_value: employeesReport.reduce((acc, r) => acc + r.total_pipeline_value, 0),
      total_activities: employeesReport.reduce((acc, r) => acc + r.total_activities, 0),
      completed_activities: employeesReport.reduce((acc, r) => acc + r.completed_activities, 0),
      pending_activities: employeesReport.reduce((acc, r) => acc + r.pending_activities, 0)
    };
    summary.overall_completion_rate = summary.total_leads > 0 
      ? ((summary.total_completed_leads / summary.total_leads) * 100).toFixed(1) 
      : "0.0";
    summary.overall_activity_rate = summary.total_activities > 0 
      ? ((summary.completed_activities / summary.total_activities) * 100).toFixed(1) 
      : "0.0";

    // If drill-down detail is requested for a specific employee
    let drilldown = null;
    let targetRepName = employeeName;
    if (!targetRepName && employeeId) {
      const matchedSp = employeesReport.find(s => String(s.id) === String(employeeId));
      if (matchedSp) targetRepName = matchedSp.name;
    }

    if (targetRepName) {
      const repLeadRows = await queryAsync(
        `SELECT id, lead_code, lead_title, first_name, last_name, company_name, mobile_number, lead_status, priority, expected_budget, interested_product, DATE_FORMAT(created_at, '%Y-%m-%d') as created_at
         FROM crm_leads
         WHERE LOWER(assigned_to) LIKE LOWER(?) ${leadDateConditions.length ? "AND " + leadDateConditions.join(" AND ") : ""}
         ORDER BY id DESC LIMIT 50`,
        [`%${targetRepName}%`, ...leadDateParams]
      ).catch(() => []);

      const repFlwRows = await queryAsync(
        `SELECT id, followup_code, followup_title, related_to, entity_name, company_name, mobile_number, followup_type, DATE_FORMAT(followup_date, '%Y-%m-%d') as followup_date, followup_time, followup_status, priority, discussion_summary
         FROM crm_followups
         WHERE LOWER(assigned_to) LIKE LOWER(?) ${flwDateConditions.length ? "AND " + flwDateConditions.join(" AND ") : ""}
         ORDER BY followup_date DESC, id DESC LIMIT 50`,
        [`%${targetRepName}%`, ...flwDateParams]
      ).catch(() => []);

      drilldown = {
        employee_name: targetRepName,
        leads: repLeadRows,
        activities: repFlwRows
      };
    }

    res.json({
      success: true,
      basis,
      summary,
      employees: employeesReport,
      drilldown
    });
  } catch (err) {
    console.error("Error in getEmployeePerformanceReport:", err);
    res.status(500).json({ success: false, message: "Failed to generate employee performance report" });
  }
};

// 13. Dedicated Sales Person Performance Report (Admin Only)
exports.getSalesPerformanceReport = async (req, res) => {
  try {
    const salesIdentity = await getRoleAndSalesIdentity(req);
    if (!salesIdentity.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only CRM Administrators can access the Sales Person Performance Report."
      });
    }

    const {
      basis = "all", // "all", "today", "this_week", "this_month", "custom"
      startDate = "",
      endDate = "",
      search = ""
    } = req.query;

    const branchId = getBranchId(req);

    // Date filters for leads
    const leadDateConditions = [];
    const leadDateParams = [];
    if (basis === "today") {
      leadDateConditions.push("DATE(created_at) = CURDATE()");
    } else if (basis === "this_week") {
      leadDateConditions.push("YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)");
    } else if (basis === "this_month") {
      leadDateConditions.push("DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')");
    } else if (basis === "custom" || (startDate && endDate)) {
      if (startDate) {
        leadDateConditions.push("DATE(created_at) >= ?");
        leadDateParams.push(startDate);
      }
      if (endDate) {
        leadDateConditions.push("DATE(created_at) <= ?");
        leadDateParams.push(endDate);
      }
    }

    // Date filters for follow-ups
    const flwDateConditions = [];
    const flwDateParams = [];
    if (basis === "today") {
      flwDateConditions.push("(DATE(followup_date) = CURDATE() OR DATE(created_at) = CURDATE())");
    } else if (basis === "this_week") {
      flwDateConditions.push("(YEARWEEK(followup_date, 1) = YEARWEEK(CURDATE(), 1) OR YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1))");
    } else if (basis === "this_month") {
      flwDateConditions.push("(DATE_FORMAT(followup_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m') OR DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m'))");
    } else if (basis === "custom" || (startDate && endDate)) {
      if (startDate) {
        flwDateConditions.push("DATE(followup_date) >= ?");
        flwDateParams.push(startDate);
      }
      if (endDate) {
        flwDateConditions.push("DATE(followup_date) <= ?");
        flwDateParams.push(endDate);
      }
    }

    // Query active sales persons
    let spSql = `SELECT * FROM sales_persons WHERE status = 'Active'`;
    let spParams = [];
    if (branchId) {
      spSql += ` AND (branch_id = ? OR branch_id IS NULL)`;
      spParams.push(branchId);
    }
    spSql += ` ORDER BY id ASC`;
    const salesPersons = await queryAsync(spSql, spParams);

    const employees = await queryAsync(`SELECT id, user_id, sales_person_id, phone, email, name FROM hrms_employees`).catch(() => []);
    const users = await queryAsync(`SELECT id, username, full_name, email, phone FROM users`).catch(() => []);

    const reports = [];
    for (const sp of salesPersons) {
      let uId = null;
      const emp = employees.find(e => 
        (e.sales_person_id && e.sales_person_id === sp.id) ||
        (sp.phone && e.phone === sp.phone) ||
        (sp.email && e.email === sp.email)
      );
      if (emp && emp.user_id) {
        uId = emp.user_id;
      } else {
        const u = users.find(x => 
          (sp.email && x.email && sp.email.toLowerCase() === x.email.toLowerCase()) ||
          (sp.phone && x.phone && sp.phone === x.phone) ||
          (x.full_name && sp.name && x.full_name.toLowerCase() === sp.name.toLowerCase()) ||
          (x.username && sp.name && sp.name.toLowerCase().includes(x.username.toLowerCase()))
        );
        if (u) uId = u.id;
      }

      // 1. Total Leads Created by this salesperson
      let createdWhere = ["1=1"];
      let createdParams = [];
      if (uId) {
        createdWhere.push("(created_by = ? OR LOWER(created_by) = LOWER(?))");
        createdParams.push(uId, sp.name);
      } else {
        createdWhere.push("LOWER(created_by) = LOWER(?)");
        createdParams.push(sp.name);
      }
      if (leadDateConditions.length) {
        createdWhere.push(...leadDateConditions);
        createdParams.push(...leadDateParams);
      }
      const cRows = await queryAsync(
        `SELECT COUNT(*) as cnt FROM crm_leads WHERE ${createdWhere.join(" AND ")}`,
        createdParams
      );
      const totalCreated = parseInt(cRows[0]?.cnt, 10) || 0;

      // 2. Leads Assigned to this salesperson
      let assignedWhere = ["LOWER(assigned_to) LIKE LOWER(?)"];
      let assignedParams = [`%${sp.name}%`];
      if (leadDateConditions.length) {
        assignedWhere.push(...leadDateConditions);
        assignedParams.push(...leadDateParams);
      }
      const aRows = await queryAsync(
        `SELECT 
          COUNT(*) as total_assigned,
          SUM(CASE WHEN lead_status IN ('Closed Won', 'Completed', 'Won') THEN 1 ELSE 0 END) as won_leads,
          SUM(CASE WHEN lead_status NOT IN ('Closed Won', 'Completed', 'Won', 'Lost', 'Cancelled') THEN 1 ELSE 0 END) as active_leads,
          SUM(CASE WHEN lead_status IN ('Lost', 'Cancelled') THEN 1 ELSE 0 END) as lost_leads,
          COALESCE(SUM(expected_budget), 0) as total_pipeline_value,
          COALESCE(SUM(CASE WHEN lead_status IN ('Closed Won', 'Completed', 'Won') THEN expected_budget ELSE 0 END), 0) as won_value
         FROM crm_leads WHERE ${assignedWhere.join(" AND ")}`,
        assignedParams
      );
      const a = aRows[0] || {};
      const totalAssigned = parseInt(a.total_assigned, 10) || 0;
      const wonLeads = parseInt(a.won_leads, 10) || 0;
      const activeLeads = parseInt(a.active_leads, 10) || 0;
      const lostLeads = parseInt(a.lost_leads, 10) || 0;
      const totalPipelineValue = parseFloat(a.total_pipeline_value) || 0;
      const wonValue = parseFloat(a.won_value) || 0;
      const conversionRate = totalAssigned > 0 ? ((wonLeads / totalAssigned) * 100).toFixed(1) : "0.0";

      // 3. Follow-up Activities
      let flwWhere = ["LOWER(assigned_to) LIKE LOWER(?)"];
      let flwParams = [`%${sp.name}%`];
      if (flwDateConditions.length) {
        flwWhere.push(...flwDateConditions);
        flwParams.push(...flwDateParams);
      }
      const fRows = await queryAsync(
        `SELECT 
          COUNT(*) as total_followups,
          SUM(CASE WHEN followup_status = 'Completed' THEN 1 ELSE 0 END) as completed_followups,
          SUM(CASE WHEN followup_status = 'Pending' THEN 1 ELSE 0 END) as pending_followups
         FROM crm_followups WHERE ${flwWhere.join(" AND ")}`,
        flwParams
      );
      const f = fRows[0] || {};
      const totalFollowups = parseInt(f.total_followups, 10) || 0;
      const completedFollowups = parseInt(f.completed_followups, 10) || 0;
      const pendingFollowups = parseInt(f.pending_followups, 10) || 0;

      reports.push({
        id: sp.id,
        sales_person_id: sp.id,
        user_id: uId,
        sales_code: sp.employee_code || `SP-${String(sp.id).padStart(3, "0")}`,
        name: sp.name,
        phone: sp.phone || "N/A",
        email: sp.email || "N/A",
        commission_type: sp.commission_type || "percentage",
        commission_rate: parseFloat(sp.commission_rate) || 0,
        target_amount: parseFloat(sp.target_amount) || 0,
        total_leads_created: totalCreated,
        total_leads_assigned: totalAssigned,
        won_leads: wonLeads,
        active_leads: activeLeads,
        lost_leads: lostLeads,
        conversion_rate: conversionRate,
        total_pipeline_value: totalPipelineValue,
        won_value: wonValue,
        total_followups: totalFollowups,
        completed_followups: completedFollowups,
        pending_followups: pendingFollowups
      });
    }

    // Apply search filter if provided
    let filteredReports = reports;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filteredReports = reports.filter(r => 
        r.name.toLowerCase().includes(q) ||
        r.sales_code.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    }

    // Summary calculations
    const summary = {
      total_sales_persons: filteredReports.length,
      total_leads_created: filteredReports.reduce((s, r) => s + r.total_leads_created, 0),
      total_leads_assigned: filteredReports.reduce((s, r) => s + r.total_leads_assigned, 0),
      total_won_leads: filteredReports.reduce((s, r) => s + r.won_leads, 0),
      total_active_leads: filteredReports.reduce((s, r) => s + r.active_leads, 0),
      total_won_value: filteredReports.reduce((s, r) => s + r.won_value, 0),
      total_pipeline_value: filteredReports.reduce((s, r) => s + r.total_pipeline_value, 0),
      total_followups: filteredReports.reduce((s, r) => s + r.total_followups, 0),
      completed_followups: filteredReports.reduce((s, r) => s + r.completed_followups, 0),
      pending_followups: filteredReports.reduce((s, r) => s + r.pending_followups, 0)
    };
    summary.overall_conversion_rate = summary.total_leads_assigned > 0
      ? ((summary.total_won_leads / summary.total_leads_assigned) * 100).toFixed(1)
      : "0.0";

    res.json({
      success: true,
      basis,
      summary,
      salesPersons: filteredReports
    });
  } catch (err) {
    console.error("Error in getSalesPerformanceReport:", err);
    res.status(500).json({ success: false, message: "Failed to generate sales performance report" });
  }
};

// 14. Detailed Leads View for a Specific Sales Person (Admin Only)
exports.getSalesPersonLeads = async (req, res) => {
  try {
    const salesIdentity = await getRoleAndSalesIdentity(req);
    if (!salesIdentity.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only CRM Administrators can access sales person lead details."
      });
    }

    const { id } = req.params; // Sales person ID
    const {
      filterType = "all", // "all", "assigned", "created", "won"
      status = "All",
      search = "",
      basis = "all",
      startDate = "",
      endDate = ""
    } = req.query;

    // Retrieve sales person record
    const spRows = await queryAsync(`SELECT * FROM sales_persons WHERE id = ?`, [id]);
    if (!spRows.length) {
      return res.status(404).json({ success: false, message: "Sales Person not found" });
    }
    const sp = spRows[0];

    // Find mapped user_id
    const empRows = await queryAsync(`SELECT user_id FROM hrms_employees WHERE sales_person_id = ? OR phone = ? OR email = ? LIMIT 1`, [sp.id, sp.phone, sp.email]).catch(() => []);
    let uId = empRows[0]?.user_id || null;
    if (!uId) {
      const uRows = await queryAsync(`SELECT id FROM users WHERE email = ? OR phone = ? OR full_name = ? LIMIT 1`, [sp.email, sp.phone, sp.name]).catch(() => []);
      uId = uRows[0]?.id || null;
    }

    // Build lead query conditions
    let relationshipConditions = [];
    let relationshipParams = [];
    if (filterType === "created") {
      if (uId) {
        relationshipConditions.push("(l.created_by = ? OR LOWER(l.created_by) = LOWER(?))");
        relationshipParams.push(uId, sp.name);
      } else {
        relationshipConditions.push("LOWER(l.created_by) = LOWER(?)");
        relationshipParams.push(sp.name);
      }
    } else if (filterType === "assigned") {
      relationshipConditions.push("LOWER(l.assigned_to) LIKE LOWER(?)");
      relationshipParams.push(`%${sp.name}%`);
    } else if (filterType === "won") {
      relationshipConditions.push("LOWER(l.assigned_to) LIKE LOWER(?) AND l.lead_status IN ('Closed Won', 'Completed', 'Won')");
      relationshipParams.push(`%${sp.name}%`);
    } else {
      // "all" - both assigned and created
      if (uId) {
        relationshipConditions.push("(LOWER(l.assigned_to) LIKE LOWER(?) OR l.created_by = ? OR LOWER(l.created_by) = LOWER(?))");
        relationshipParams.push(`%${sp.name}%`, uId, sp.name);
      } else {
        relationshipConditions.push("(LOWER(l.assigned_to) LIKE LOWER(?) OR LOWER(l.created_by) = LOWER(?))");
        relationshipParams.push(`%${sp.name}%`, sp.name);
      }
    }

    const where = [...relationshipConditions];
    const params = [...relationshipParams];

    if (status && status !== "All") {
      where.push("l.lead_status = ?");
      params.push(status);
    }

    if (search && search.trim()) {
      where.push("(l.lead_title LIKE ? OR l.lead_code LIKE ? OR l.first_name LIKE ? OR l.last_name LIKE ? OR l.mobile_number LIKE ? OR l.interested_product LIKE ? OR l.city LIKE ?)");
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term, term, term);
    }

    if (basis === "today") {
      where.push("DATE(l.created_at) = CURDATE()");
    } else if (basis === "this_week") {
      where.push("YEARWEEK(l.created_at, 1) = YEARWEEK(CURDATE(), 1)");
    } else if (basis === "this_month") {
      where.push("DATE_FORMAT(l.created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')");
    } else if (basis === "custom" || (startDate && endDate)) {
      if (startDate) {
        where.push("DATE(l.created_at) >= ?");
        params.push(startDate);
      }
      if (endDate) {
        where.push("DATE(l.created_at) <= ?");
        params.push(endDate);
      }
    }

    const whereClause = where.join(" AND ");
    const leadSql = `
      SELECT 
        l.id,
        l.lead_code,
        l.lead_title,
        l.first_name,
        l.last_name,
        CONCAT_WS(' ', l.first_name, l.last_name) AS customer_name,
        l.company_name,
        l.designation,
        l.mobile_number,
        l.email_address,
        l.whatsapp_number,
        l.address,
        l.city,
        l.state,
        l.pincode,
        l.lead_source,
        l.lead_status,
        l.priority,
        l.expected_budget,
        l.expected_closing_date,
        l.interested_product,
        l.assigned_to,
        l.followup_type,
        l.followup_date,
        l.followup_time,
        l.lead_notes,
        l.created_by,
        DATE_FORMAT(l.created_at, '%Y-%m-%d %H:%i') AS assigned_date,
        DATE_FORMAT(l.created_at, '%Y-%m-%d') AS created_date,
        u.full_name AS creator_name
      FROM crm_leads l
      LEFT JOIN users u ON l.created_by = u.id
      WHERE ${whereClause}
      ORDER BY l.id DESC
    `;
    const leads = await queryAsync(leadSql, params);

    // Fetch follow-ups for each lead
    const leadIds = leads.map(l => l.id);
    let followupsMap = {};
    if (leadIds.length) {
      const flwRows = await queryAsync(
        `SELECT 
          id, followup_code, followup_title, related_to, entity_id, entity_name,
          mobile_number, followup_type, DATE_FORMAT(followup_date, '%Y-%m-%d') AS followup_date,
          followup_time, priority, followup_status, discussion_summary, customer_response,
          assigned_to
         FROM crm_followups
         WHERE entity_id IN (${leadIds.join(",")}) OR entity_name IN (${leads.map(() => "?").join(",")})
         ORDER BY followup_date DESC, id DESC`,
        leads.map(l => l.customer_name || l.first_name)
      ).catch(() => []);

      flwRows.forEach(f => {
        const key = f.entity_id || f.entity_name;
        if (!followupsMap[key]) followupsMap[key] = [];
        followupsMap[key].push(f);
      });
    }

    const enrichedLeads = leads.map(l => {
      const leadFollowups = followupsMap[l.id] || followupsMap[l.customer_name] || [];
      const isAssigned = String(l.assigned_to || "").toLowerCase().includes(sp.name.toLowerCase());
      const isCreated = (uId && l.created_by === uId) || String(l.created_by || "").toLowerCase() === sp.name.toLowerCase();

      return {
        ...l,
        relationship: isAssigned && isCreated ? "both" : isCreated ? "created" : "assigned",
        followups: leadFollowups,
        followups_count: leadFollowups.length,
        latest_followup: leadFollowups[0] || null
      };
    });

    res.json({
      success: true,
      salesPerson: {
        id: sp.id,
        sales_code: sp.employee_code || `SP-${String(sp.id).padStart(3, "0")}`,
        name: sp.name,
        phone: sp.phone || "N/A",
        email: sp.email || "N/A",
        target_amount: parseFloat(sp.target_amount) || 0,
        commission_rate: parseFloat(sp.commission_rate) || 0,
        user_id: uId
      },
      total_leads: enrichedLeads.length,
      leads: enrichedLeads
    });
  } catch (err) {
    console.error("Error in getSalesPersonLeads:", err);
    res.status(500).json({ success: false, message: "Failed to fetch sales person leads" });
  }
};
