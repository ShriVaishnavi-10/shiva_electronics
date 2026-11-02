const express = require("express");
const router = express.Router();
const controller = require("../controllers/expense.controller");
const { authenticate, authorize, branchFilter } = require("../middleware/auth.middleware");
const multer = require("multer");
const path = require("path");

// Configure multer for expense documents
const storage = multer.diskStorage({
  destination: "uploads/expenses/",
  filename: (req, file, cb) => {
    cb(null, `EXP_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

router.use(authenticate);
router.use(branchFilter);

// Categories
router.get("/categories", authorize("expenses.view"), controller.getCategories);
router.post("/categories", authorize("expenses.create"), controller.createCategory);
router.put("/categories/:id", authorize("expenses.edit"), controller.updateCategory);
router.delete("/categories/:id", authorize("expenses.delete"), controller.deleteCategory);

// Expenses
router.get("/", authorize("expenses.view"), controller.getExpenses);
router.get("/:id", authorize("expenses.view"), controller.getExpenseById);
router.post("/", authorize("expenses.create"), upload.single("document"), controller.createExpense);
router.put("/:id", authorize("expenses.edit"), upload.single("document"), controller.updateExpense);
router.delete("/:id", authorize("expenses.delete"), controller.deleteExpense);

module.exports = router;
