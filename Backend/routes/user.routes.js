const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/user.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.get("/", authenticate, authorize("users.view"), ctrl.getAll);
router.get("/:id", authenticate, authorize("users.view"), ctrl.getById);
router.post("/", authenticate, authorize("users.create"), ctrl.create);
router.put("/:id", authenticate, authorize("users.edit"), ctrl.update);
router.delete("/:id", authenticate, authorize("users.delete"), ctrl.remove);

module.exports = router;
