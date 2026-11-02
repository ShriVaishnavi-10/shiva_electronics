const { body } = require("express-validator");

exports.subCategoryValidation = [
  body("category_id").notEmpty().withMessage("Category required"),
  body("subcategory_name").notEmpty().withMessage("Subcategory required")
];
