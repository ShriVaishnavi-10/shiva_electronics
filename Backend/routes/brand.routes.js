const express = require("express");
const router = express.Router();
const controller = require("../controllers/brand.controller");
const { brandValidation } = require("../validations/brand.validation");

router.post("/", brandValidation, controller.createBrand);
router.get("/", controller.getBrands);

module.exports = router;
