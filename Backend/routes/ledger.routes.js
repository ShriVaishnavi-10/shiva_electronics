const express = require("express");
const router = express.Router();
const ledgerController = require("../controllers/ledger.controller");

router.get("/ledger", ledgerController.getLedger);
router.get("/ledger/balance/:id", ledgerController.getCustomerBalance);

module.exports = router;
