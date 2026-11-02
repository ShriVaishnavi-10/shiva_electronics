const express = require("express");
const router = express.Router();
const controller = require("../controllers/unit.controller");

router.post("/", controller.createUnit);
router.get("/", controller.getUnits);

module.exports = router;

