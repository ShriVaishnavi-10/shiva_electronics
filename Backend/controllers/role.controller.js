const db = require("../config/db");

exports.getAllRoles = (req, res) => {
  db.query("SELECT * FROM roles ORDER BY role_name", (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows || []);
  });
};

exports.createRole = (req, res) => {
  const { role_name, description } = req.body;
  if (!role_name?.trim()) return res.status(400).json({ message: "Role name is required" });

  db.query(
    "INSERT INTO roles (role_name, description) VALUES (?, ?)",
    [role_name.trim(), description || null],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Role already exists" });
        return res.status(500).json({ message: err.message });
      }
      res.json({ message: "Role created", id: result.insertId });
    },
  );
};

exports.updateRole = (req, res) => {
  const { role_name, description } = req.body;
  db.query(
    "UPDATE roles SET role_name = ?, description = ? WHERE id = ?",
    [role_name, description || null, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: "Role updated" });
    },
  );
};

exports.deleteRole = (req, res) => {
  db.query("DELETE FROM roles WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Role deleted" });
  });
};

exports.getAllPermissions = (req, res) => {
  db.query(
    "SELECT * FROM permissions ORDER BY module_name, permission_key",
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows || []);
    },
  );
};

exports.getRolePermissions = (req, res) => {
  db.query(
    `SELECT p.* FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ?
     ORDER BY p.module_name`,
    [req.params.roleId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows || []);
    },
  );
};

exports.updateRolePermissions = (req, res) => {
  const roleId = req.params.roleId;
  const { permission_ids } = req.body;

  if (!Array.isArray(permission_ids)) {
    return res.status(400).json({ message: "permission_ids must be an array" });
  }

  db.query("DELETE FROM role_permissions WHERE role_id = ?", [roleId], (delErr) => {
    if (delErr) return res.status(500).json({ message: delErr.message });

    if (!permission_ids.length) {
      return res.json({ message: "Permissions updated" });
    }

    const values = permission_ids.map((pid) => [roleId, pid]);
    db.query(
      "INSERT INTO role_permissions (role_id, permission_id) VALUES ?",
      [values],
      (insErr) => {
        if (insErr) return res.status(500).json({ message: insErr.message });
        res.json({ message: "Permissions updated" });
      },
    );
  });
};
