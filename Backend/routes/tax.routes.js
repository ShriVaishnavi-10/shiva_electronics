const express = require("express");
const router = express.Router();
const controller = require("../controllers/tax.controller");

router.post("/", controller.createTaxModule);
router.get("/", controller.getTaxModules);
router.get("/:id", controller.getTaxModuleById);
router.put("/:id", controller.updateTaxModule);
router.delete("/:id", controller.deleteTaxModule);

module.exports = router;
