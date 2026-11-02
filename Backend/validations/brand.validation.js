const { body } = require("express-validator");

exports.brandValidation = [
  body("brand_name")
    .notEmpty()
    .withMessage("Brand name required")
];
