const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  createLocation,
  getLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
  uploadLocationImages
} = require("../controllers/location.controller");

const locationImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "..", "uploads", "locations");
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

const uploadLocationImagesMiddleware = multer({
  storage: locationImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
  }
});

router.post("/locations/upload-images", uploadLocationImagesMiddleware.array("images", 10), uploadLocationImages);
router.post("/locations", createLocation);
router.get("/locations", getLocations);
router.get("/locations/:id", getLocationById);
router.put("/locations/:id", updateLocation);
router.delete("/locations/:id", deleteLocation);

module.exports = router;
