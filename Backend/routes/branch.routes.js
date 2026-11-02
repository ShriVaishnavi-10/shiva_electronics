const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/branch.controller");
const { authenticate, authorize, branchFilter, blockNonUserFromGst } = require("../middleware/auth.middleware");

router.get("/", authenticate, ctrl.getAll);
router.get("/next-number", authenticate, branchFilter, ctrl.getNextNumber);
router.get("/peek-number", authenticate, branchFilter, ctrl.peekNextNumber);
router.get("/:id", authenticate, ctrl.getById);
router.post("/sync-sequence", authenticate, ctrl.syncSequenceEndpoint);
router.post("/", authenticate, blockNonUserFromGst, authorize("branches.create"), ctrl.create);
router.put("/:id", authenticate, blockNonUserFromGst, authorize("branches.edit"), ctrl.update);
router.delete("/:id", authenticate, blockNonUserFromGst, authorize("branches.edit"), ctrl.remove);

module.exports = router;
