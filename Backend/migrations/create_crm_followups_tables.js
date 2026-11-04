const db = require("../config/db");

async function ensureCrmFollowupsTables() {
  const queryAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

  try {
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS crm_followups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        followup_code VARCHAR(50) DEFAULT NULL,
        followup_title VARCHAR(255) NOT NULL,
        related_to VARCHAR(50) DEFAULT 'Lead',
        entity_id INT DEFAULT NULL,
        entity_name VARCHAR(255) DEFAULT NULL,
        company_name VARCHAR(255) DEFAULT NULL,
        mobile_number VARCHAR(50) DEFAULT NULL,
        followup_type VARCHAR(50) NOT NULL DEFAULT 'Call',
        followup_date DATE DEFAULT NULL,
        followup_time VARCHAR(20) DEFAULT NULL,
        duration INT DEFAULT 15,
        priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
        followup_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
        discussion_summary TEXT DEFAULT NULL,
        customer_requirement TEXT DEFAULT NULL,
        customer_response VARCHAR(50) DEFAULT 'Interested',
        next_action TEXT DEFAULT NULL,
        attachment_name VARCHAR(255) DEFAULT NULL,
        assigned_to VARCHAR(255) DEFAULT NULL,
        created_by VARCHAR(255) DEFAULT NULL,
        reminder_enabled TINYINT(1) DEFAULT 1,
        reminder_before VARCHAR(50) DEFAULT '15 minutes',
        next_followup_date DATE DEFAULT NULL,
        next_followup_time VARCHAR(20) DEFAULT NULL,
        branch_id INT DEFAULT NULL,
        user_id INT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_crm_flw_status (followup_status),
        KEY idx_crm_flw_type (followup_type),
        KEY idx_crm_flw_priority (priority),
        KEY idx_crm_flw_date (followup_date),
        KEY idx_crm_flw_branch (branch_id),
        KEY idx_crm_flw_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    console.log("crm_followups database table ensured successfully.");
  } catch (err) {
    console.error("Error creating crm_followups table:", err.message || err);
    throw err;
  }
}

module.exports = { ensureCrmFollowupsTables };

