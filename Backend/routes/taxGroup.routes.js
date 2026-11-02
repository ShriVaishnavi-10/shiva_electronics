const express = require("express");
const router = express.Router();
const controller = require("../controllers/taxGroup.controller");

router.post("/", controller.createTaxGroup);
router.get("/", controller.getTaxGroups);
router.get("/:id", controller.getTaxGroupById);
router.put("/:id", controller.updateTaxGroup);
router.delete("/:id", controller.deleteTaxGroup);

module.exports = router;
