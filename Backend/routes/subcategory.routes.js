const express = require("express");
const router = express.Router();
const controller = require("../controllers/subcategory.controller");
const { subCategoryValidation } = require("../validations/subcategory.validation");

router.get("/", controller.getAllSubCategories);
router.post("/", subCategoryValidation, controller.createSubCategory);
router.put("/:id", controller.updateSubCategory);
router.delete("/:id", controller.deleteSubCategory);
router.get("/:categoryId", controller.getSubCategories);

module.exports = router;
