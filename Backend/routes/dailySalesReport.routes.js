const express = require("express");
const { getDailySalesReport } = require("../controllers/dailySalesReport.controller");

const router = express.Router();

router.get("/reports/daily-sales", getDailySalesReport);

module.exports = router;
