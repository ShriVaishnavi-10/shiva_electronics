const { body } = require("express-validator");

exports.categoryValidation = [
  body("category_name").notEmpty().withMessage("Category name required")
];
