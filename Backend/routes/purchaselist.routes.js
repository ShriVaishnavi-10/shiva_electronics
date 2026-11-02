const express = require("express");
const router = express.Router();
const controller = require("../controllers/purchaselist.controller");

router.get("/", controller.getPurchaseList);
router.get("/:id", controller.getPurchaseView);
router.delete("/:id", controller.deletePurchase);

module.exports = router;
