const express = require("express");
const router = express.Router();
const hrmsCtrl = require("../controllers/hrms.controller");
const { authenticate, authorize, branchFilter } = require("../middleware/auth.middleware");

// Staff Portal Authentication (Public)
router.post("/auth/login", hrmsCtrl.staffLogin);

router.use(authenticate, branchFilter);

// Staff Self-Service Punch & Portal Data
router.post("/my/punch", hrmsCtrl.staffQuickPunch);
router.get("/my/punch-status", hrmsCtrl.getMyPunchStatus);
router.get("/my/summary", hrmsCtrl.getStaffPortalData);
router.get("/my/summary/:id", hrmsCtrl.getStaffPortalData);

// 1. Dashboard
router.get("/dashboard", authorize("hrms.view"), hrmsCtrl.getDashboardSummary);
router.get("/dashboard-summary", authorize("hrms.view"), hrmsCtrl.getDashboardSummary);

// 2. Employees
router.get("/employees", hrmsCtrl.listEmployees);
router.get("/employees/:id", hrmsCtrl.getEmployeeById);
router.post("/employees", authorize("hrms.employees.create"), hrmsCtrl.createEmployee);
router.put("/employees/:id", authorize("hrms.employees.edit"), hrmsCtrl.updateEmployee);
router.delete("/employees/:id", authorize("hrms.employees.delete"), hrmsCtrl.deleteEmployee);

// 3. Departments & Designations
router.get("/departments", authorize("hrms.view"), hrmsCtrl.listDepartments);
router.post("/departments", authorize("hrms.settings.edit"), hrmsCtrl.createDepartment);
router.delete("/departments/:id", authorize("hrms.settings.edit"), hrmsCtrl.deleteDepartment);
router.get("/designations", authorize("hrms.view"), hrmsCtrl.listDesignations);
router.post("/designations", authorize("hrms.settings.edit"), hrmsCtrl.createDesignation);
router.delete("/designations/:id", authorize("hrms.settings.edit"), hrmsCtrl.deleteDesignation);

// 4. Attendance
router.get("/attendance", hrmsCtrl.listAttendance);
router.post("/attendance", authorize("hrms.attendance.manage"), hrmsCtrl.recordAttendance);
router.get("/attendance/calendar", authorize("hrms.view"), hrmsCtrl.getAttendanceCalendar);

// 5. Leaves & Notifications
router.get("/leaves", hrmsCtrl.listLeaves);
router.post("/leaves", hrmsCtrl.createLeave);
router.put("/leaves/:id/status", hrmsCtrl.updateLeaveStatus);
router.get("/notifications", hrmsCtrl.listNotifications);
router.put("/notifications/read-all", (req, res) => { req.params.id = 'all'; hrmsCtrl.markNotificationRead(req, res); });
router.put("/notifications/:id/read", hrmsCtrl.markNotificationRead);

// 6. Payroll
router.get("/payroll", authorize("hrms.payroll.view"), hrmsCtrl.listPayroll);
router.post("/payroll/generate", authorize("hrms.payroll.edit"), hrmsCtrl.generateMonthlyPayroll);
router.put("/payroll/:id/status", authorize("hrms.payroll.edit"), hrmsCtrl.updatePayrollStatus);

// 7 & 8. Sales Performance & Incentives (Billing System Integration)
router.get("/performance", authorize("hrms.view"), hrmsCtrl.getSalesPerformance);
router.post("/performance/targets", authorize("hrms.settings.edit"), hrmsCtrl.setSalesTarget);
router.get("/performance/incentive-rules", authorize("hrms.view"), hrmsCtrl.listIncentiveRules);

// 9. Claims & Advances
router.get("/expenses", authorize("hrms.view"), hrmsCtrl.listExpenses);
router.post("/expenses", authorize("hrms.view"), hrmsCtrl.createExpense);
router.put("/expenses/:id/status", authorize("hrms.settings.edit"), hrmsCtrl.updateExpenseStatus);
router.get("/advances", authorize("hrms.view"), hrmsCtrl.listAdvances);
router.post("/advances", authorize("hrms.view"), hrmsCtrl.createAdvance);

// 10. Recruitment
router.get("/recruitment/jobs", authorize("hrms.view"), hrmsCtrl.listJobOpenings);
router.post("/recruitment/jobs", authorize("hrms.settings.edit"), hrmsCtrl.createJobOpening);
router.get("/recruitment/candidates", authorize("hrms.view"), hrmsCtrl.listCandidates);
router.post("/recruitment/candidates", authorize("hrms.settings.edit"), hrmsCtrl.createCandidate);
router.put("/recruitment/candidates/:id/status", authorize("hrms.settings.edit"), hrmsCtrl.updateCandidateStatus);

// 11. Reports
router.get("/reports", authorize("hrms.reports.view"), hrmsCtrl.getHrmsReport);

module.exports = router;
