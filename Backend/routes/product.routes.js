const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const controller = require("../controllers/product.controller");
const { productValidation } = require("../validations/product.validation");

const productImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "..", "uploads", "products");
    fs.mkdir(uploadPath, { recursive: true }, (err) => {
      if (err) return cb(err);
      cb(null, uploadPath);
    });
  },
  filename: (req, file, cb) => {
    const ext = (file.originalname.split(".").pop() || "jpg").toLowerCase();
    cb(null, "img-" + Date.now() + "-" + Math.round(Math.random() * 1e9) + "." + ext);
  }
});

const uploadProductImages = multer({
  storage: productImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
  }
});

const csvUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "..", "uploads", "csv");
    fs.mkdir(uploadPath, { recursive: true }, (err) => {
      if (err) return cb(err);
      cb(null, uploadPath);
    });
  },
  filename: (req, file, cb) => {
    cb(null, "bulk-" + Date.now() + ".csv");
  }
});
const uploadCsv = multer({
  storage: csvUploadStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv"))
      cb(null, true);
    else cb(new Error("Only .csv files are allowed"), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post("/upload-images", uploadProductImages.array("images", 10), controller.uploadProductImages);
router.get("/csv-template", controller.downloadCsvTemplate);
router.post("/bulk-upload", uploadCsv.single("file"), controller.bulkUploadProducts);
router.post("/", productValidation, controller.createProduct);
router.get("/", controller.getProducts);

router.get("/search", controller.searchProducts);   // ✅ MUST be before :id
router.get("/quantity/:productId", controller.getProductQuantity);
router.get("/low-stock", controller.getLowStockProducts);
router.get("/:id", controller.getProductById);

router.put("/:id", controller.updateProduct);
router.delete("/:id", controller.deleteProduct);

module.exports = router;
