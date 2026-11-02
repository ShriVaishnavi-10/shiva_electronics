const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Absolute path: backend/uploads/logos
    const uploadPath = path.join(__dirname, "..", "uploads", "logos");

    // Ensure directory exists
    fs.mkdir(uploadPath, { recursive: true }, (err) => {
      if (err) return cb(err);
      cb(null, uploadPath);
    });
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "logo-" + uniqueSuffix + "." + file.originalname.split(".").pop()
    );
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  }
});

const { blockNonUserFromGst } = require("../middleware/auth.middleware");

router.get("/company", settingsController.getCompanySettings);
router.post("/company", blockNonUserFromGst, settingsController.saveCompanySettings);
router.post("/upload-logo", blockNonUserFromGst, upload.single("logo"), settingsController.uploadCompanyLogo);

module.exports = router;