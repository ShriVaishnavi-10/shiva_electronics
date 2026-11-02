const express = require("express");
const router = express.Router();
const {
  listSalesPersons,
  getSalesPersonById,
  createSalesPerson,
  updateSalesPerson,
  deleteSalesPerson,
  getMonthlyReport,
  recordPayout,
} = require("../controllers/salesPerson.controller");
const { authenticate, branchFilter } = require("../middleware/auth.middleware");

// Public/authenticated access
router.use(authenticate);
router.use(branchFilter);

// Reports & Payouts (must be declared before :id route)
router.get("/sales-persons/reports/monthly", getMonthlyReport);
router.post("/sales-persons/payouts", recordPayout);

// CRUD
router.get("/sales-persons", listSalesPersons);
router.get("/sales-persons/:id", getSalesPersonById);
router.post("/sales-persons", createSalesPerson);
router.put("/sales-persons/:id", updateSalesPerson);
router.delete("/sales-persons/:id", deleteSalesPerson);

module.exports = router;

