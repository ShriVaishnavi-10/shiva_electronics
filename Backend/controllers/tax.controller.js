const db = require("../config/db");
const { getBranchId, branchWhere, branchIdForInsert } = require("../middleware/branchHelper");

exports.createTaxModule = (req, res) => {
  const { name, tax_rate } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  const taxRateNum = Number(tax_rate);
  if (taxRateNum === undefined || taxRateNum === null || isNaN(taxRateNum) || taxRateNum < 0) {
    return res.status(400).json({ message: "Tax Rate % is required and must be a number >= 0" });
  }

  db.query(
    "INSERT INTO tax_modules (name, tax_rate, branch_id) VALUES (?, ?, ?)",
    [name.trim(), taxRateNum, branchIdForInsert(req)],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: err.message || "Failed to create tax module" });
      }
      res.status(201).json({ message: "Tax module created", id: result.insertId });
    }
  );
};

exports.getTaxModules = (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  const searchQuery = search ? `%${search}%` : "%";

  const branchId = getBranchId(req);
  const bw = branchWhere(branchId, "");
  const countSql = `SELECT COUNT(*) AS total FROM tax_modules WHERE ${bw.clause} AND name LIKE ?`;
  const dataSql = `SELECT id, name, tax_rate, created_at, updated_at FROM tax_modules WHERE ${bw.clause} AND name LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?`;

  db.query(countSql, [...bw.params, searchQuery], (err, countResult) => {
    if (err) {
      return res.status(500).json({ message: err.message || "Failed to load tax modules" });
    }
    const total = countResult[0].total;
    db.query(dataSql, [...bw.params, searchQuery, limit, offset], (err2, rows) => {
      if (err2) {
        return res.status(500).json({ message: err2.message || "Failed to load tax modules" });
      }
      res.json({ total, page, limit, data: rows || [] });
    });
  });
};

exports.getTaxModuleById = (req, res) => {
  const id = req.params.id;
  db.query("SELECT id, name, tax_rate, created_at, updated_at FROM tax_modules WHERE id = ?", [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: err.message || "Failed to load tax module" });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Tax module not found" });
    }
    res.json(rows[0]);
  });
};

exports.updateTaxModule = (req, res) => {
  const id = req.params.id;
  const { name, tax_rate } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  const taxRateNum = Number(tax_rate);
  if (taxRateNum === undefined || taxRateNum === null || isNaN(taxRateNum) || taxRateNum < 0) {
    return res.status(400).json({ message: "Tax Rate % is required and must be a number >= 0" });
  }

  db.query(
    "UPDATE tax_modules SET name = ?, tax_rate = ? WHERE id = ?",
    [name.trim(), taxRateNum, id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: err.message || "Failed to update tax module" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Tax module not found" });
      }
      res.json({ message: "Tax module updated successfully" });
    }
  );
};

exports.deleteTaxModule = (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM tax_modules WHERE id = ?", [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: err.message || "Failed to delete tax module" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Tax module not found" });
    }
    res.json({ message: "Tax module deleted successfully" });
  });
};
