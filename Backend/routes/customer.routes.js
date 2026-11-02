const express = require("express");
const router = express.Router();
const multer = require("multer");
const customerController = require("../controllers/customer.controller");
const { customerValidation } = require("../validations/customer.validation");

const bulkUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const lower = (file.originalname || "").toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return cb(null, true);
    return cb(new Error("Only .xlsx or .xls files are allowed"));
  },
});

router.get("/customers/template", customerController.downloadCustomerTemplate);
router.post(
  "/customers/bulk-upload",
  bulkUpload.single("file"),
  customerController.bulkUploadCustomers,
);
router.post("/customers", customerValidation, customerController.createCustomer);
router.get("/customers", customerController.getCustomers);
router.get("/customers/:id", customerController.getCustomerById);
router.put("/customers/:id", customerValidation, customerController.updateCustomer);
router.delete("/customers/:id", customerController.deleteCustomer);

module.exports = router;
