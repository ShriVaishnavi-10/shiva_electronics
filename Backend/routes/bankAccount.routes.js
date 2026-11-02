const express = require("express");
const {
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getBankAccountTransactions,
  createBankTransfer,
  deleteBankTransfer,
} = require("../controllers/bankAccount.controller");

const router = express.Router();

router.get("/bank-accounts", getBankAccounts);
router.post("/bank-accounts", createBankAccount);
router.get("/bank-accounts/:id/transactions", getBankAccountTransactions);
router.post("/bank-accounts/transfers", createBankTransfer);
router.delete("/bank-accounts/transfers/:id", deleteBankTransfer);
router.put("/bank-accounts/:id", updateBankAccount);
router.delete("/bank-accounts/:id", deleteBankAccount);

module.exports = router;
