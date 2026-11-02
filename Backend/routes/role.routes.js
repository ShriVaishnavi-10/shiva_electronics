const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/role.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.get("/", authenticate, ctrl.getAllRoles);
router.post("/", authenticate, authorize("users.create"), ctrl.createRole);
router.put("/:id", authenticate, authorize("users.edit"), ctrl.updateRole);
router.delete("/:id", authenticate, authorize("users.edit"), ctrl.deleteRole);

router.get("/permissions", authenticate, ctrl.getAllPermissions);
router.get("/:roleId/permissions", authenticate, ctrl.getRolePermissions);
router.put("/:roleId/permissions", authenticate, authorize("users.edit"), ctrl.updateRolePermissions);

module.exports = router;
