const express = require("express");
const router = express.Router();
const {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  getDashboardOverview,
  getNextQuotationNo
} = require("../controllers/quotationsController");

router.post("/quotations", createQuotation);
router.get("/quotations", getQuotations);
router.get("/quotations/next-number", getNextQuotationNo);
router.get("/quotations/:id", getQuotationById);
router.put("/quotations/:id", updateQuotation);
router.delete("/quotations/:id", deleteQuotation);
router.get("/dashboard/overview", getDashboardOverview);

module.exports = router;
