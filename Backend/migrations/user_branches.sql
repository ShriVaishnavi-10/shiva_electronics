-- ============================================================
-- MULTI-BRANCH USER SUPPORT
-- Many-to-many: users ↔ branches
-- Run AFTER full_migration.sql
-- ============================================================

USE anantham_nursary;

CREATE TABLE IF NOT EXISTS user_branches (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  user_id   INT NOT NULL,
  branch_id INT NOT NULL,
  UNIQUE KEY uq_user_branch (user_id, branch_id),
  FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migrate existing single branch_id data into user_branches
INSERT IGNORE INTO user_branches (user_id, branch_id)
SELECT id, branch_id FROM users WHERE branch_id IS NOT NULL;
