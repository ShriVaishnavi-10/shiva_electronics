const db = require("../config/db");

const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

/**
 * 1. Get all active notifications for the logged-in user
 * Crucially respects remind_at: only returns notifications where remind_at IS NULL or remind_at <= NOW()
 */
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    const employeeId = req.user?.employee_id;
    const roleLower = String(req.user?.role_name || req.user?.role || "").toLowerCase();
    const isAdmin = roleLower.includes("admin") || roleLower.includes("super admin") || userId === 1;

    // Collect all possible names/aliases for this user
    const names = [];
    if (req.user?.full_name) names.push(req.user.full_name);
    if (req.user?.name) names.push(req.user.name);
    if (req.user?.username) names.push(req.user.username);

    if (userId) {
      const uRows = await queryAsync("SELECT username, full_name FROM users WHERE id = ?", [userId]).catch(() => []);
      if (uRows.length) {
        if (uRows[0].username) names.push(uRows[0].username);
        if (uRows[0].full_name) names.push(uRows[0].full_name);
      }
    }

    if (employeeId || userId) {
      const eRows = await queryAsync(
        "SELECT name, employee_code FROM hrms_employees WHERE id = ? OR user_id = ?",
        [employeeId || 0, userId || 0]
      ).catch(() => []);
      eRows.forEach((r) => {
        if (r.name) names.push(r.name);
        if (r.employee_code) names.push(r.employee_code);
      });
    }

    const uniqueNames = [...new Set(names.map((n) => String(n).trim()).filter(Boolean))];

    let whereClause = "";
    let params = [];

    if (isAdmin) {
      // Admin sees notifications targeted to admin user ID, general system notifications, or assigned directly
      const nameConditions = uniqueNames.map(() => "LOWER(assigned_to_name) LIKE LOWER(?)").join(" OR ");
      const nameParams = uniqueNames.map((n) => `%${n}%`);
      whereClause = `(user_id = ? OR user_id IS NULL ${nameConditions ? `OR ${nameConditions}` : ""})`;
      params = [userId || 1, ...nameParams];
    } else {
      // Sales person / Staff: strictly sees notifications targeted to their user_id, employee_id, or name
      const conditions = [];
      if (userId) {
        conditions.push("user_id = ?");
        params.push(userId);
      }
      if (employeeId) {
        conditions.push("employee_id = ?");
        params.push(employeeId);
      }
      uniqueNames.forEach((n) => {
        conditions.push("LOWER(assigned_to_name) LIKE LOWER(?)");
        params.push(`%${n}%`);
      });

      if (conditions.length === 0) {
        return res.json({ success: true, data: [], unreadCount: 0 });
      }
      whereClause = `(${conditions.join(" OR ")})`;
    }

    // Query active notifications where reminder timestamp has arrived (remind_at IS NULL OR remind_at <= NOW())
    const listSql = `
      SELECT id, user_id, employee_id, assigned_to_name, type, title, message, reference_id, reference_type,
             DATE_FORMAT(remind_at, '%Y-%m-%d %H:%i:%s') AS remind_at,
             is_read, created_at,
             CASE WHEN remind_at IS NOT NULL AND remind_at <= NOW() THEN 1 ELSE 0 END AS is_reminder_due
      FROM hrms_notifications
      WHERE ${whereClause}
        AND (remind_at IS NULL OR remind_at <= NOW())
      ORDER BY is_read ASC, COALESCE(remind_at, created_at) DESC, id DESC
      LIMIT 60
    `;

    const rows = await queryAsync(listSql, params);

    const countSql = `
      SELECT COUNT(*) AS unread
      FROM hrms_notifications
      WHERE ${whereClause}
        AND is_read = 0
        AND (remind_at IS NULL OR remind_at <= NOW())
    `;
    const countRows = await queryAsync(countSql, params);
    const unreadCount = countRows[0]?.unread || 0;

    res.json({
      success: true,
      data: rows,
      unreadCount
    });
  } catch (err) {
    console.error("Error in getUserNotifications:", err);
    res.status(500).json({ success: false, message: "Failed to load notifications" });
  }
};

/**
 * 2. Mark a notification as read
 */
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await queryAsync("UPDATE hrms_notifications SET is_read = 1 WHERE id = ?", [id]);
    res.json({ success: true, message: "Notification marked as read" });
  } catch (err) {
    console.error("Error marking notification read:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Mark all notifications for this user as read
 */
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const employeeId = req.user?.employee_id;
    const names = [];
    if (req.user?.full_name) names.push(req.user.full_name);
    if (req.user?.name) names.push(req.user.name);
    if (req.user?.username) names.push(req.user.username);

    const conditions = [];
    const params = [];

    if (userId) {
      conditions.push("user_id = ?");
      params.push(userId);
    }
    if (employeeId) {
      conditions.push("employee_id = ?");
      params.push(employeeId);
    }
    names.forEach((n) => {
      conditions.push("LOWER(assigned_to_name) LIKE LOWER(?)");
      params.push(`%${n.trim()}%`);
    });

    if (conditions.length > 0) {
      await queryAsync(
        `UPDATE hrms_notifications SET is_read = 1 WHERE (${conditions.join(" OR ")}) AND is_read = 0`,
        params
      );
    } else {
      await queryAsync("UPDATE hrms_notifications SET is_read = 1 WHERE is_read = 0");
    }

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("Error marking all read:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Delete notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await queryAsync("DELETE FROM hrms_notifications WHERE id = ?", [id]);
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
