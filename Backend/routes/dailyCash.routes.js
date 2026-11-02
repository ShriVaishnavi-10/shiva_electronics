const express = require("express");
const {
  getDayStatus,
  startDay,
  getDaySummary,
  closeDay,
  getHistory,
  updateDay
} = require("../controllers/dailyCash.controller");

const router = express.Router();

router.get("/daily-cash/status", getDayStatus);
router.post("/daily-cash/start", startDay);
router.get("/daily-cash/summary", getDaySummary);
router.post("/daily-cash/close", closeDay);
router.get("/daily-cash/history", getHistory);
router.post("/daily-cash/update", updateDay);

module.exports = router;
