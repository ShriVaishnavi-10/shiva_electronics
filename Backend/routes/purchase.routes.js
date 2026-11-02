const express = require("express");
const router = express.Router();
const {
  createPurchase,
  getPurchases,
  getPurchaseById,
  getNextPurchaseNo,
  getPurchasesList,
  getLatestSellingRateByProduct,
  updatePurchase,
  deletePurchase,
  recordPurchasePayment,
  getPurchasePayments
} = require("../controllers/purchase.controller");

// Existing endpoints
router.post("/purchases", createPurchase);
router.get("/purchases/next-id", getNextPurchaseNo);
router.get("/purchases/list", getPurchasesList);
router.get("/purchases", getPurchases);
router.get("/purchases/:id/payments", getPurchasePayments);
router.post("/purchases/:id/payments", recordPurchasePayment);
router.get("/purchases/:id", getPurchaseById);
router.get("/purchases/latest-rate/:productId", getLatestSellingRateByProduct);

// New explicit purchase APIs as per spec
router.post("/purchase/create", createPurchase);
router.put("/purchase/update/:id", updatePurchase);
router.delete("/purchase/delete/:id", deletePurchase);
router.get("/purchase/list", getPurchasesList);
router.get("/purchase/:id/payments", getPurchasePayments);
router.post("/purchase/:id/payments", recordPurchasePayment);

module.exports = router;
