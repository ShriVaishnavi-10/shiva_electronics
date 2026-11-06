const db = require("../config/db");

async function ensureHrmsNotificationsTables() {
  const queryAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

  try {
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS hrms_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        employee_id INT DEFAULT NULL,
        assigned_to_name VARCHAR(255) DEFAULT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        reference_id INT DEFAULT NULL,
        reference_type VARCHAR(50) DEFAULT 'followup',
        remind_at DATETIME DEFAULT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_notif_user (user_id),
        KEY idx_notif_emp (employee_id),
        KEY idx_notif_read (is_read),
        KEY idx_notif_remind (remind_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    console.log("hrms_notifications table created/ensured successfully.");
  } catch (err) {
    console.error("Error creating hrms_notifications table:", err.message || err);
  }
}

module.exports = { ensureHrmsNotificationsTables };

if (require.main === module) {
  ensureHrmsNotificationsTables().then(() => process.exit(0)).catch(() => process.exit(1));
}

