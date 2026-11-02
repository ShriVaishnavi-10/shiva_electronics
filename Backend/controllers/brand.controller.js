const db = require("../config/db");
const { validationResult } = require("express-validator");

exports.createBrand = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(errors.array());

  const { brand_name, status } = req.body;

  db.query(
    "INSERT INTO brand (brand_name, status) VALUES (?, ?)",
    [brand_name, status || 'Active'],
    (err, result) => {
      if (err)
        return res
          .status(500)
          .json({ message: err.message || "Failed to create brand" });

      res.json({ message: "Brand created", id: result.insertId });
    }
  );
};

exports.getBrands = (req, res) => {
  db.query("SELECT * FROM brand", (err, rows) => {
    if (err)
      return res
        .status(500)
        .json({ message: err.message || "Failed to load brands" });

    res.json(Array.isArray(rows) ? rows : []);
  });
};
