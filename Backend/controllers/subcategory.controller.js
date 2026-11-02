const db = require("../config/db");
const { validationResult } = require("express-validator");

exports.createSubCategory = (req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json(errors.array());

  const { category_id, subcategory_name, status } = req.body;

  db.query(
    "INSERT INTO subcategories (category_id,subcategory_name,status) VALUES (?,?,?)",
    [category_id, subcategory_name, status || 'Active'],
    (err,result)=>{
      if(err) return res.status(500).json({ message: err.message || "Failed to create subcategory" });
      res.json({ message:"SubCategory created", id: result.insertId });
    }
  );
};

exports.getAllSubCategories = (req, res) => {
  db.query(
    `SELECT s.*, c.category_name FROM subcategories s
     LEFT JOIN categories c ON c.id = s.category_id
     ORDER BY s.id DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message || "Failed to load subcategories" });
      res.json(Array.isArray(rows) ? rows : []);
    }
  );
};

exports.getSubCategories = (req,res)=>{
  const { categoryId } = req.params;
  db.query(
    "SELECT * FROM subcategories WHERE category_id=? ORDER BY id DESC",
    [categoryId],
    (err,rows)=>{
      if(err) return res.status(500).json({ message: err.message || "Failed to load subcategories" });
      res.json(Array.isArray(rows) ? rows : []);
    }
  );
};

exports.updateSubCategory = (req, res) => {
  const { id } = req.params;
  const { category_id, subcategory_name, status } = req.body;
  if (!subcategory_name || !String(subcategory_name).trim())
    return res.status(400).json({ message: "subcategory_name is required" });
  if (!category_id)
    return res.status(400).json({ message: "category_id is required" });
  db.query(
    "UPDATE subcategories SET category_id=?, subcategory_name=?, status=? WHERE id=?",
    [category_id, String(subcategory_name).trim(), status || "Active", id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message || "Failed to update subcategory" });
      if (!result.affectedRows) return res.status(404).json({ message: "Subcategory not found" });
      res.json({ message: "Subcategory updated" });
    }
  );
};

exports.deleteSubCategory = (req, res) => {
  const { id } = req.params;

  // Check if any product references this subcategory
  db.query("SELECT 1 FROM products WHERE subcategory_id = ? LIMIT 1", [id], (err1, prodRows) => {
    if (err1) return res.status(500).json({ message: err1.message || "Failed to validate subcategory delete" });
    if (prodRows && prodRows.length > 0)
      return res.status(400).json({ message: "Cannot delete subcategory. It is used in Products." });

    // Safe to delete
    db.query("DELETE FROM subcategories WHERE id=?", [id], (err2, result) => {
      if (err2) return res.status(500).json({ message: err2.message || "Failed to delete subcategory" });
      if (!result.affectedRows) return res.status(404).json({ message: "Subcategory not found" });
      res.json({ message: "Subcategory deleted" });
    });
  });
};
