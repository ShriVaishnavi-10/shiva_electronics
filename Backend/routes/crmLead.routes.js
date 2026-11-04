const express = require("express");
const router = express.Router();
const crmLeadController = require("../controllers/crmLead.controller");

// CRM Leads endpoints
router.get("/crm/leads/reports/summary", crmLeadController.getLeadReportsSummary);
router.get("/crm/leads/employees", crmLeadController.getAssignableEmployees);
router.get("/crm/leads/completed", crmLeadController.getCompletedLeads);
router.post("/crm/leads", crmLeadController.createLead);
router.get("/crm/leads", crmLeadController.getLeads);
router.get("/crm/leads/:id", crmLeadController.getLeadById);
router.put("/crm/leads/:id", crmLeadController.updateLead);
router.post("/crm/leads/:id/next-followup", crmLeadController.scheduleNextFollowup);
router.patch("/crm/leads/:id/status", crmLeadController.patchLeadStatus);
router.delete("/crm/leads/:id", crmLeadController.deleteLead);

module.exports = router;
