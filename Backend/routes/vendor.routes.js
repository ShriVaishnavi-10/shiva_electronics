const express = require("express");
const multer = require("multer");
const {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  downloadVendorTemplate,
  bulkUploadVendors,
} = require("../controllers/vendor.controller");
const { createVendorPayment, getVendorPayments } = require("../controllers/vendorPayment.controller");

const router = express.Router();
const bulkUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const lower = (file.originalname || "").toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return cb(null, true);
    return cb(new Error("Only .xlsx or .xls files are allowed"));
  },
});

router.get("/vendors/template", downloadVendorTemplate);
router.post("/vendors/bulk-upload", bulkUpload.single("file"), bulkUploadVendors);
router.post("/vendors", createVendor);
router.get("/vendors", getVendors);
router.get("/vendors/:id", getVendorById);
router.put("/vendors/:id", updateVendor);
router.delete("/vendors/:id", deleteVendor);

router.post("/vendor-payments", createVendorPayment);
router.get("/vendor-payments", getVendorPayments);

module.exports = router;
