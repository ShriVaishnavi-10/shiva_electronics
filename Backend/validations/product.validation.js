const { body } = require("express-validator");

const quantityValidation = body("quantity")
  .optional({ values: "null" })
  .isFloat({ min: 0 })
  .isDecimal({ decimal_digits: "0,3" })
  .withMessage("Quantity must be a non-negative number with up to 3 decimal places");

exports.productValidation = [
  body("category_id")
    .notEmpty().withMessage("Category is required")
    .isInt().withMessage("Category must be number"),

  body("product_name")
    .notEmpty().withMessage("Product name is required"),
  quantityValidation,
];

exports.productQuantityValidation = [quantityValidation];
