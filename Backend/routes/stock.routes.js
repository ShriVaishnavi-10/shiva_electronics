const express = require("express");
const router = express.Router();
const {
  getStockByProductId,
  updateStock,
  createStock,
  getStockInList,
  getStockOutList,
  getStockDetails
} = require("../controllers/stock.controller");

router.get("/stocks/details", getStockDetails);
router.get("/stocks/:productId", getStockByProductId);
router.post("/stocks", createStock);
router.put("/stocks", updateStock); // Use PUT for idempotent updates

// Existing stock in/out list endpoints used by UI
router.get("/stocks/in/list", getStockInList);
router.get("/stocks/out/list", getStockOutList);

// Aliases matching new API spec
router.get("/stockin-list", getStockInList);
router.get("/stockout-list", getStockOutList);

module.exports = router;
