const jwt = require("jsonwebtoken");
const db = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "anantham_nursery_secret_2026";

function isUserAdmin(user) {
  if (!user) return false;
  const roleName = String(user.role_name || "").toLowerCase().trim();
  const roleId = Number(user.role_id);
  const userId = Number(user.id);
  return roleName.includes("admin") || roleId === 1 || roleId === 5 || userId === 1;
}

function isNonUser(user) {
  if (!user) return false;
  if (isUserAdmin(user)) return false;
  const roleName = String(user.role_name || "").toLowerCase().trim();
  const roleId = Number(user.role_id);
  return (
    roleName === "non user" ||
    roleName === "non_user" ||
    roleName === "nonuser" ||
    roleId === 6
  );
}

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.isNonUser = isNonUser(decoded);
    req.isGst = req.isNonUser ? 0 : 1;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const blockNonUserFromGst = (req, res, next) => {
  if (req.user && isUserAdmin(req.user)) {
    return next();
  }
  if (req.user && isNonUser(req.user)) {
    return res.status(403).json({
      message: "Access denied: GST module is not available for Non-GST role",
    });
  }
  next();
};

const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (isUserAdmin(req.user)) return next();
    if (!requiredPermissions.length) return next();

    db.query(
      `SELECT p.permission_key
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = ?`,
      [req.user.role_id],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "Permission check failed" });

        const userPerms = new Set((rows || []).map((r) => r.permission_key));
        const hasAll = requiredPermissions.every((p) => userPerms.has(p));

        if (!hasAll) return res.status(403).json({ message: "Insufficient permissions" });
        next();
      },
    );
  };
};

const branchFilter = (req, res, next) => {
  if (!req.user) return next();

  if (isUserAdmin(req.user)) {
    const qb = req.query.branch_id || req.headers["x-active-branch"];
    req.branchId = qb ? parseInt(qb, 10) : null;
    req.branchIds = null; 
    return next();
  }

  const userBranchIds = req.user.branch_ids || [];

  if (!userBranchIds.length) {
    req.branchId = null;
    req.branchIds = [];
    return next();
  }

  const requested = req.query.branch_id || req.headers["x-active-branch"];
  if (requested) {
    const rid = parseInt(requested, 10);
    if (userBranchIds.includes(rid)) {
      req.branchId = rid;
    } else {
      req.branchId = userBranchIds[0];
    }
  } else {
    req.branchId = null;
  }

  req.branchIds = userBranchIds;
  next();
};

module.exports = {
  authenticate,
  authorize,
  branchFilter,
  blockNonUserFromGst,
  isNonUser,
  isUserAdmin,
  JWT_SECRET,
};
