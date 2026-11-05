const express = require("express");
const router = express.Router();
const crmLeadController = require("../controllers/crmLead.controller");
const { authenticate, branchFilter } = require("../middleware/auth.middleware");

// CRM Leads & Dashboard endpoints
router.get("/crm/dashboard/summary", authenticate, branchFilter, crmLeadController.getCrmDashboardSummary);
router.get("/crm/reports/sales-performance", authenticate, branchFilter, crmLeadController.getSalesPerformanceReport);
router.get("/crm/reports/sales-performance/:id/leads", authenticate, branchFilter, crmLeadController.getSalesPersonLeads);
router.get("/crm/reports/employee-performance", authenticate, branchFilter, crmLeadController.getEmployeePerformanceReport);
router.get("/crm/leads/reports/summary", authenticate, branchFilter, crmLeadController.getLeadReportsSummary);
router.get("/crm/leads/employees", authenticate, branchFilter, crmLeadController.getAssignableEmployees);
router.get("/crm/leads/completed", authenticate, branchFilter, crmLeadController.getCompletedLeads);
router.post("/crm/leads", authenticate, branchFilter, crmLeadController.createLead);
router.get("/crm/leads", authenticate, branchFilter, crmLeadController.getLeads);
router.get("/crm/leads/:id", authenticate, branchFilter, crmLeadController.getLeadById);
router.put("/crm/leads/:id", authenticate, branchFilter, crmLeadController.updateLead);
router.post("/crm/leads/:id/next-followup", authenticate, branchFilter, crmLeadController.scheduleNextFollowup);
router.patch("/crm/leads/:id/status", authenticate, branchFilter, crmLeadController.patchLeadStatus);
router.delete("/crm/leads/:id", authenticate, branchFilter, crmLeadController.deleteLead);

module.exports = router;
