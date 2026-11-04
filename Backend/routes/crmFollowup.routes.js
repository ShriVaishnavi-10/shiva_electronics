const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/crmFollowup.controller");
const { authenticate, branchFilter } = require("../middleware/auth.middleware");

router.use(authenticate);
router.use(branchFilter);

// CRUD
router.get("/reports/summary", ctrl.getFollowupReportsSummary);
router.get("/", ctrl.getFollowups);
router.post("/", ctrl.createFollowup);
router.get("/:id", ctrl.getFollowupById);
router.put("/:id", ctrl.updateFollowup);
router.post("/:id/next-followup", ctrl.scheduleNextFollowup);
router.patch("/:id/status", ctrl.patchStatus);
router.delete("/:id", ctrl.deleteFollowup);

module.exports = router;

