const { body } = require("express-validator");

exports.productValidation = [
  body("category_id")
    .notEmpty().withMessage("Category is required")
    .isInt().withMessage("Category must be number"),

  body("product_name")
    .notEmpty().withMessage("Product name is required"),
];
