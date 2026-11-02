const { body } = require("express-validator");

exports.customerValidation = [
  body("customer_name")
    .trim()
    .notEmpty()
    .withMessage("Customer name is required"),

  body("contact_no")
    .trim()
    .notEmpty()
    .withMessage("Contact number is required")
    .isLength({ min: 10, max: 10 })
    .withMessage("Contact number must be 10 digits")
    .isNumeric()
    .withMessage("Contact number must be numeric"),

  body("gst_no")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 15 })
    .withMessage("GST number must be at most 15 characters")
    .isAlphanumeric()
    .withMessage("GST number must be alphanumeric"),

  body("pincode")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage("Pincode must be 6 digits")
    .isNumeric()
    .withMessage("Pincode must be numeric"),
  body("address")
    .optional({ checkFalsy: true })
    .trim(),
  body("city")
    .optional({ checkFalsy: true })
    .trim(),
  body("state")
    .optional({ checkFalsy: true })
    .trim(),
  body("country")
    .optional({ checkFalsy: true })
    .trim(),
];