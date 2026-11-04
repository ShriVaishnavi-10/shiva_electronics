const db = require("../config/db");

async function ensureCrmLeadsTables() {
  const queryAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

  try {
    await queryAsync(`
      CREATE TABLE IF NOT EXISTS crm_leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_code VARCHAR(50) DEFAULT NULL,
        lead_title VARCHAR(255) NOT NULL,
        first_name VARCHAR(150) NOT NULL,
        last_name VARCHAR(150) DEFAULT NULL,
        company_name VARCHAR(200) DEFAULT NULL,
        designation VARCHAR(150) DEFAULT NULL,
        mobile_number VARCHAR(50) NOT NULL,
        email_address VARCHAR(150) DEFAULT NULL,
        whatsapp_number VARCHAR(50) DEFAULT NULL,
        website VARCHAR(255) DEFAULT NULL,
        lead_source VARCHAR(100) DEFAULT NULL,
        lead_status VARCHAR(50) NOT NULL DEFAULT 'New',
        priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
        expected_budget DECIMAL(15,2) DEFAULT 0.00,
        expected_closing_date DATE DEFAULT NULL,
        interested_product VARCHAR(255) DEFAULT NULL,
        assigned_to VARCHAR(150) DEFAULT NULL,
        followup_type VARCHAR(100) DEFAULT NULL,
        followup_date DATE DEFAULT NULL,
        followup_time VARCHAR(20) DEFAULT NULL,
        lead_notes TEXT DEFAULT NULL,
        branch_id INT DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_crm_leads_status (lead_status),
        KEY idx_crm_leads_priority (priority),
        KEY idx_crm_leads_branch (branch_id),
        KEY idx_crm_leads_created (created_at),
        KEY idx_crm_leads_followup (followup_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    console.log("crm_leads database table ensured successfully.");
  } catch (err) {
    console.error("Error creating crm_leads table:", err.message || err);
    throw err;
  }
}

module.exports = { ensureCrmLeadsTables };

