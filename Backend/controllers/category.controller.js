const db = require("../config/db");
const { validationResult } = require("express-validator");

exports.createCategory = (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json(errors.array());

  const { category_name, status } = req.body;

  db.query(
    "INSERT INTO categories (category_name,status) VALUES (?,?)",
    [category_name, status || 'Active'],
    (err, result) => {
      if(err) return res.status(500).json({ message: err.message || "Failed to create category" });
      res.json({ message: "Category created", id: result.insertId });
    }
  );
};

exports.getCategories = (req, res) => {
  db.query("SELECT * FROM categories ORDER BY id DESC", (err, rows) => {
    if(err) return res.status(500).json({ message: err.message || "Failed to load categories" });
    res.json(Array.isArray(rows) ? rows : []);
  });
};

exports.updateCategory = (req, res) => {
  const { id } = req.params;
  const { category_name, status } = req.body;
  if (!category_name || !String(category_name).trim())
    return res.status(400).json({ message: "category_name is required" });
  db.query(
    "UPDATE categories SET category_name=?, status=? WHERE id=?",
    [String(category_name).trim(), status || "Active", id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message || "Failed to update category" });
      if (!result.affectedRows) return res.status(404).json({ message: "Category not found" });
      res.json({ message: "Category updated" });
    }
  );
};

exports.deleteCategory = (req, res) => {
  const { id } = req.params;

    db.query("SELECT 1 FROM products WHERE category_id = ? LIMIT 1", [id], (err1, prodRows) => {
    if (err1) return res.status(500).json({ message: err1.message || "Failed to validate category delete" });
    if (prodRows && prodRows.length > 0)
      return res.status(400).json({ message: "Cannot delete category. It is used in Products." });

    db.query("SELECT 1 FROM subcategories WHERE category_id = ? LIMIT 1", [id], (err2, subRows) => {
      if (err2) return res.status(500).json({ message: err2.message || "Failed to validate category delete" });
      if (subRows && subRows.length > 0)
        return res.status(400).json({ message: "Cannot delete category. It has Subcategories linked to it." });

      db.query("DELETE FROM categories WHERE id=?", [id], (err3, result) => {
        if (err3) return res.status(500).json({ message: err3.message || "Failed to delete category" });
        if (!result.affectedRows) return res.status(404).json({ message: "Category not found" });
        res.json({ message: "Category deleted" });
      });
    });
  });
};
