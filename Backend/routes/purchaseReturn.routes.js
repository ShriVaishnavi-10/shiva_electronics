const express = require("express");
const router = express.Router();
const {
  getNextReturnNo,
  getPurchaseForReturn,
  createPurchaseReturn,
  getPurchaseReturnsList,
  getPurchaseReturnById,
  deletePurchaseReturn,
} = require("../controllers/purchaseReturn.controller");

router.get("/purchase-returns/next-id", getNextReturnNo);
router.get("/purchase-returns/purchase/:purchaseId", getPurchaseForReturn);
router.get("/purchase-returns/list", getPurchaseReturnsList);
router.get("/purchase-returns/:id", getPurchaseReturnById);
router.post("/purchase-returns", createPurchaseReturn);
router.delete("/purchase-returns/:id", deletePurchaseReturn);

module.exports = router;
