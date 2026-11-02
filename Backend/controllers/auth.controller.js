const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../middleware/auth.middleware");

exports.login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  const mainQuery = `SELECT u.*, r.role_name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.username = ?`;
  const fallbackQuery = `SELECT * FROM users WHERE username = ?`;

  const runLogin = (rows) => loginHandler(rows, password, res);

  db.query(mainQuery, [username], (err, rows) => {
    if (err) {
      console.warn("Login main query failed, trying fallback:", err.message);
      db.query(fallbackQuery, [username], (err2, rows2) => {
        if (err2) return res.status(500).json({ message: err2.message || "Database error" });
        return runLogin(rows2);
      });
      return;
    }
    return runLogin(rows);
  });

  async function loginHandler(rows, password, res) {
    try {
      if (!rows.length) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const user = rows[0];

      let valid = false;
      if (user.password && user.password.startsWith("$2")) {
        valid = await bcrypt.compare(password, user.password);
      } else {
        valid = password === user.password;
      }

      if (!valid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      if (user.status === "Inactive") {
        return res.status(403).json({ message: "Account is inactive" });
      }

      db.query(
        `SELECT ub.branch_id, b.branch_name, b.branch_code
         FROM user_branches ub
         JOIN branches b ON b.id = ub.branch_id
         WHERE ub.user_id = ?
         ORDER BY b.branch_name`,
        [user.id],
        (brErr, brRows) => {
          const userBranches = brRows || [];
          const branchIds = userBranches.map((b) => b.branch_id);

          db.query(
            `SELECT p.permission_key
             FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role_id = ?`,
            [user.role_id],
            (permErr, permRows) => {
              if (permErr)    console.error("Permission load error:", permErr);

              const permissions = (permRows || []).map((r) => r.permission_key);

              const tokenPayload = {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role_id: user.role_id,
                role_name: user.role_name || "Staff",
                branch_ids: branchIds,
              };

              const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "12h" });

              res.json({
                message: "Login successful",
                token,
                user: {
                  id: user.id,
                  username: user.username,
                  full_name: user.full_name,
                  role_id: user.role_id,
                  role_name: user.role_name || "Staff",
                  branch_ids: branchIds,
                  branches: userBranches,
                  permissions,
                },
              });
            },
          );
        },
      );
    } catch (e) {
      console.error("Login handler error:", e);
      return res.status(500).json({ message: "Login failed" });
    }
  }
};

exports.me = (req, res) => {
  res.json({ user: req.user });
};
exports.getBranches = (req, res) => {
  db.query(
    "SELECT id, branch_name, branch_code FROM branches WHERE status = 'Active' ORDER BY branch_name",
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message || "Failed to load branches" });
      res.json(rows || []);
    },
  );
};
