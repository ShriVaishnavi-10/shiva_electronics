const express = require("express");
const router = express.Router();
const {
  createTransaction,
  getNextInvoiceNo,
  checkInvoiceNoExists,
  listTransactions,
  salesReportLines,
  gstReport,
  gstReportExport,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getSalesReceiptById,
  addTransactionPayment,
  cancelTransaction
} = require("../controllers/transaction.controller");

const { blockNonUserFromGst } = require("../middleware/auth.middleware");

router.post("/transactions", createTransaction);
router.get("/transactions/next-invoice", getNextInvoiceNo);
router.get("/transactions/check-invoice-no", checkInvoiceNoExists);
router.get("/transactions/list", listTransactions);
router.get("/transactions/sales-report-lines", salesReportLines);
router.get("/transactions/gst-report", blockNonUserFromGst, gstReport);
router.get("/transactions/gst-report-export", blockNonUserFromGst, gstReportExport);
router.get("/transactions/:id", getTransactionById);
router.get("/sales-receipt/:id", getSalesReceiptById);
router.put("/transactions/:id", updateTransaction);
router.delete("/transactions/:id", deleteTransaction);
router.post("/transactions/:id/pay", addTransactionPayment);
router.post("/transactions/:id/cancel", cancelTransaction);

module.exports = router;
