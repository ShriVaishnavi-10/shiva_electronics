const db = require("../config/db");
const { getBranchId, branchWhere, branchIdForInsert } = require("../middleware/branchHelper");

exports.createTaxGroup = (req, res) => {
  const { name, sub_taxes } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  const taxIds = Array.isArray(sub_taxes) ? sub_taxes.filter((id) => id != null && Number(id) > 0).map((id) => Number(id)) : [];
  if (taxIds.length === 0) {
    return res.status(400).json({ message: "Sub taxes is required (at least one tax must be selected)" });
  }

  db.query("INSERT INTO tax_groups (name, branch_id) VALUES (?, ?)", [name.trim(), branchIdForInsert(req)], (err, result) => {
    if (err) {
      return res.status(500).json({ message: err.message || "Failed to create tax group" });
    }
    const groupId = result.insertId;
    const placeholders = taxIds.map(() => "(?, ?)").join(", ");
    const values = taxIds.flatMap((tid) => [groupId, tid]);
    db.query(
      `INSERT INTO tax_group_taxes (tax_group_id, tax_module_id) VALUES ${placeholders}`,
      values,
      (err2) => {
        if (err2) {
          return res.status(500).json({ message: err2.message || "Failed to save sub taxes" });
        }
        res.status(201).json({ message: "Tax group created", id: groupId });
      }
    );
  });
};

exports.getTaxGroups = (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  const searchQuery = search ? `%${search}%` : "%";

  const branchId = getBranchId(req);
  const bw = branchWhere(branchId, "");
  const countSql = `SELECT COUNT(*) AS total FROM tax_groups WHERE ${bw.clause} AND name LIKE ?`;
  const dataSql = `SELECT id, name, created_at, updated_at FROM tax_groups WHERE ${bw.clause} AND name LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?`;

  db.query(countSql, [...bw.params, searchQuery], (err, countResult) => {
    if (err) {
      return res.status(500).json({ message: err.message || "Failed to load tax groups" });
    }
    const total = countResult[0].total;
    db.query(dataSql, [...bw.params, searchQuery, limit, offset], (err2, rows) => {
      if (err2) {
        return res.status(500).json({ message: err2.message || "Failed to load tax groups" });
      }
      const groups = rows || [];
      if (groups.length === 0) {
        return res.json({ total, page, limit, data: [] });
      }
      const ids = groups.map((g) => g.id);
      const placeholders = ids.map(() => "?").join(",");
      db.query(
        `SELECT tgt.tax_group_id, tgt.tax_module_id, tm.name AS tax_name, tm.tax_rate
         FROM tax_group_taxes tgt
         JOIN tax_modules tm ON tm.id = tgt.tax_module_id
         WHERE tgt.tax_group_id IN (${placeholders})
         ORDER BY tgt.tax_group_id, tm.name`,
        ids,
        (err3, subRows) => {
          if (err3) {
            return res.status(500).json({ message: err3.message || "Failed to load sub taxes" });
          }
          const subByGroup = {};
          (subRows || []).forEach((r) => {
            if (!subByGroup[r.tax_group_id]) subByGroup[r.tax_group_id] = [];
            subByGroup[r.tax_group_id].push({ id: r.tax_module_id, name: r.tax_name, tax_rate: r.tax_rate });
          });
          groups.forEach((g) => {
            g.sub_taxes = subByGroup[g.id] || [];
          });
          res.json({ total, page, limit, data: groups });
        }
      );
    });
  });
};

exports.getTaxGroupById = (req, res) => {
  const id = req.params.id;
  db.query("SELECT id, name, created_at, updated_at FROM tax_groups WHERE id = ?", [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: err.message || "Failed to load tax group" });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Tax group not found" });
    }
    const group = rows[0];
    db.query(
      `SELECT tgt.tax_module_id, tm.name AS tax_name, tm.tax_rate
       FROM tax_group_taxes tgt
       JOIN tax_modules tm ON tm.id = tgt.tax_module_id
       WHERE tgt.tax_group_id = ?
       ORDER BY tm.name`,
      [id],
      (err2, subRows) => {
        if (err2) {
          return res.status(500).json({ message: err2.message || "Failed to load sub taxes" });
        }
        group.sub_taxes = (subRows || []).map((r) => ({ id: r.tax_module_id, name: r.tax_name, tax_rate: r.tax_rate }));
        res.json(group);
      }
    );
  });
};

exports.updateTaxGroup = (req, res) => {
  const id = req.params.id;
  const { name, sub_taxes } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  const taxIds = Array.isArray(sub_taxes) ? sub_taxes.filter((tid) => tid != null && Number(tid) > 0).map((tid) => Number(tid)) : [];
  if (taxIds.length === 0) {
    return res.status(400).json({ message: "Sub taxes is required (at least one tax must be selected)" });
  }

  db.query("UPDATE tax_groups SET name = ? WHERE id = ?", [name.trim(), id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: err.message || "Failed to update tax group" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Tax group not found" });
    }
    db.query("DELETE FROM tax_group_taxes WHERE tax_group_id = ?", [id], (errDel) => {
      if (errDel) {
        return res.status(500).json({ message: errDel.message || "Failed to update sub taxes" });
      }
      const placeholders = taxIds.map(() => "(?, ?)").join(", ");
      const values = taxIds.flatMap((tid) => [id, tid]);
      db.query(
        `INSERT INTO tax_group_taxes (tax_group_id, tax_module_id) VALUES ${placeholders}`,
        values,
        (errIns) => {
          if (errIns) {
            return res.status(500).json({ message: errIns.message || "Failed to save sub taxes" });
          }
          res.json({ message: "Tax group updated successfully" });
        }
      );
    });
  });
};

exports.deleteTaxGroup = (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM tax_groups WHERE id = ?", [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: err.message || "Failed to delete tax group" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Tax group not found" });
    }
    res.json({ message: "Tax group deleted successfully" });
  });
};
