const express = require("express");
const router = express.Router();
const controller = require("../controllers/category.controller");
const { categoryValidation } = require("../validations/category.validation");

router.get("/", controller.getCategories);
router.post("/", categoryValidation, controller.createCategory);
router.put("/:id", controller.updateCategory);
router.delete("/:id", controller.deleteCategory);

module.exports = router;
