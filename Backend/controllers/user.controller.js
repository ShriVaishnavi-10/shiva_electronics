const db = require("../config/db");
const bcrypt = require("bcryptjs");

const loadUserBranches = (userId, callback) => {
  db.query(
    `SELECT ub.branch_id, b.branch_name, b.branch_code
     FROM user_branches ub
     JOIN branches b ON b.id = ub.branch_id
     WHERE ub.user_id = ?
     ORDER BY b.branch_name`,
    [userId],
    (err, rows) => callback(err, rows || []),
  );
};

const syncUserBranches = (userId, branchIds, callback) => {
  db.query("DELETE FROM user_branches WHERE user_id = ?", [userId], (delErr) => {
    if (delErr) return callback(delErr);
    if (!branchIds || !branchIds.length) return callback(null);

    const values = branchIds.map((bid) => [userId, parseInt(bid, 10)]);
    db.query(
      "INSERT IGNORE INTO user_branches (user_id, branch_id) VALUES ?",
      [values],
      (insErr) => callback(insErr),
    );
  });
};

exports.getAll = (req, res) => {
  db.query(
    `SELECT u.id, u.username, u.full_name, u.email, u.phone, u.status,
            u.role_id, r.role_name,
            u.branch_id, u.created_at
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     ORDER BY u.full_name`,
    (err, users) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!users || !users.length) return res.json([]);

      const userIds = users.map((u) => u.id);
      db.query(
        `SELECT ub.user_id, ub.branch_id, b.branch_name, b.branch_code
         FROM user_branches ub
         JOIN branches b ON b.id = ub.branch_id
         WHERE ub.user_id IN (?)
         ORDER BY b.branch_name`,
        [userIds],
        (brErr, brRows) => {
          const branchMap = {};
          (brRows || []).forEach((row) => {
            if (!branchMap[row.user_id]) branchMap[row.user_id] = [];
            branchMap[row.user_id].push({
              id: row.branch_id,
              branch_name: row.branch_name,
              branch_code: row.branch_code,
            });
          });

          const result = users.map((u) => ({
            ...u,
            branches: branchMap[u.id] || [],
            branch_names: (branchMap[u.id] || [])
              .map((b) => b.branch_name)
              .join(", "),
          }));

          res.json(result);
        },
      );
    },
  );
};

exports.getById = (req, res) => {
  db.query(
    `SELECT u.id, u.username, u.full_name, u.email, u.phone, u.status,
            u.role_id, r.role_name, u.branch_id
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!rows.length) return res.json(null);

      const user = rows[0];
      loadUserBranches(user.id, (brErr, branches) => {
        user.branches = branches || [];
        user.branch_ids = branches.map((b) => b.branch_id);
        res.json(user);
      });
    },
  );
};

exports.create = async (req, res) => {
  const { username, password, full_name, email, phone, role_id, branch_ids, branch_id, status } = req.body;

  if (!username?.trim()) return res.status(400).json({ message: "Username is required" });
  if (!password?.trim()) return res.status(400).json({ message: "Password is required" });

  try {
    const hash = await bcrypt.hash(password, 10);

    const primaryBranch = Array.isArray(branch_ids) && branch_ids.length
      ? parseInt(branch_ids[0], 10)
      : branch_id || null;

    db.query(
      `INSERT INTO users (username, password, full_name, email, phone, role_id, branch_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [username.trim(), hash, full_name || null, email || null, phone || null, role_id || null, primaryBranch, status || "Active"],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Username already exists" });
          return res.status(500).json({ message: err.message });
        }

        const userId = result.insertId;
        const ids = Array.isArray(branch_ids) ? branch_ids : (branch_id ? [branch_id] : []);

        syncUserBranches(userId, ids, (syncErr) => {
          if (syncErr) console.error("Branch sync error:", syncErr.message);
          res.json({ message: "User created", id: userId });
        });
      },
    );
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { username, password, full_name, email, phone, role_id, branch_ids, branch_id, status } = req.body;

  const primaryBranch = Array.isArray(branch_ids) && branch_ids.length
    ? parseInt(branch_ids[0], 10)
    : branch_id || null;

  const fields = {
    username,
    full_name,
    email,
    phone,
    role_id: role_id || null,
    branch_id: primaryBranch,
    status,
  };

  if (password?.trim()) {
    fields.password = await bcrypt.hash(password, 10);
  }

  db.query("UPDATE users SET ? WHERE id = ?", [fields, id], (err) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Username already exists" });
      return res.status(500).json({ message: err.message });
    }

    const ids = Array.isArray(branch_ids) ? branch_ids : (branch_id ? [branch_id] : []);
    syncUserBranches(parseInt(id, 10), ids, (syncErr) => {
      if (syncErr) console.error("Branch sync error:", syncErr.message);
      res.json({ message: "User updated" });
    });
  });
};

exports.remove = (req, res) => {
  db.query("DELETE FROM users WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "User deleted" });
  });
};
