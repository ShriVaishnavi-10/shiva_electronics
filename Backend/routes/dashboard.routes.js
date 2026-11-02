const express = require("express");
const router = express.Router();

const {
  getSummary,
  getMonthlySales,
  getTopProducts,
  getProfitLoss,
  getRecent,
} = require("../controllers/dashboard.controller");

// All routes here are mounted under /api/dashboard in server.js

router.get("/summary", getSummary);
router.get("/monthly-sales", getMonthlySales);
router.get("/top-products", getTopProducts);
router.get("/profit-loss", getProfitLoss);
router.get("/recent", getRecent);

module.exports = router;

