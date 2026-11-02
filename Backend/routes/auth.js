const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.post("/auth/login", authController.login);
router.get("/auth/me", authenticate, authController.me);
router.get("/auth/branches", authController.getBranches);

module.exports = router;
