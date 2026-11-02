const express = require("express");
const router = express.Router();
const controller = require("../controllers/demoQuotation.controller");

router.get("/demo-quotations", controller.listDemoQuotations);
router.get("/reports/sales", controller.listDemoQuotations);
router.get("/demo-quotations/:id", controller.getDemoQuotationById);
router.post("/demo-quotations", controller.createDemoQuotation);
router.put("/demo-quotations/:id", controller.updateDemoQuotation);
router.delete("/demo-quotations/:id", controller.deleteDemoQuotation);
router.post("/demo-quotations/:id/convert-dc", controller.convertDemoQuotationToDc);

module.exports = router;
