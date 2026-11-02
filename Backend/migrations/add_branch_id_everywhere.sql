USE anantham_nursary;
INSERT IGNORE INTO branches (branch_name, branch_code, status)
VALUES ('Main Branch', 'MAIN', 'Active');


SET @default_branch_id = (SELECT id FROM branches WHERE branch_code = 'MAIN' LIMIT 1);
SET @default_branch_id = COALESCE(@default_branch_id, (SELECT id FROM branches WHERE status = 'Active' ORDER BY id LIMIT 1));

DROP PROCEDURE IF EXISTS safe_add_column;
DELIMITER $$
CREATE PROCEDURE safe_add_column(IN tbl VARCHAR(64), IN col VARCHAR(64), IN defn VARCHAR(500))
BEGIN
  SET @db = DATABASE();
  SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = tbl AND COLUMN_NAME = col;
  IF @col_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', defn);
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS safe_add_index;
DELIMITER $$
CREATE PROCEDURE safe_add_index(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN defn VARCHAR(500))
BEGIN
  SET @db = DATABASE();
  SELECT COUNT(*) INTO @idx_exists FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = tbl AND INDEX_NAME = idx;
  IF @idx_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD INDEX `', idx, '` (', defn, ')');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS safe_add_fk;
DELIMITER $$
CREATE PROCEDURE safe_add_fk(IN tbl VARCHAR(64), IN fk_name VARCHAR(64), IN col VARCHAR(64), IN ref_tbl VARCHAR(64), IN ref_col VARCHAR(64))
BEGIN
  SET @db = DATABASE();
  SELECT COUNT(*) INTO @fk_exists FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = tbl AND CONSTRAINT_NAME = fk_name AND CONSTRAINT_TYPE = 'FOREIGN KEY';
  IF @fk_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD CONSTRAINT `', fk_name,
                      '` FOREIGN KEY (`', col, '`) REFERENCES `', ref_tbl, '`(`', ref_col, '`) ON DELETE RESTRICT');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;
DROP PROCEDURE IF EXISTS add_branch_to_table;
DELIMITER $$
CREATE PROCEDURE add_branch_to_table(IN tbl VARCHAR(64), IN idx_name VARCHAR(64), IN fk_name VARCHAR(64))
BEGIN
  SET @db = DATABASE();
  SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = tbl AND COLUMN_NAME = 'branch_id';
  IF @col_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `branch_id` INT NULL');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
  SET @sql = CONCAT('UPDATE `', tbl, '` SET branch_id = ', @default_branch_id, ' WHERE branch_id IS NULL');
  PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

  SET @sql = CONCAT('ALTER TABLE `', tbl, '` MODIFY COLUMN `branch_id` INT NOT NULL DEFAULT ', @default_branch_id);
  PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  CALL safe_add_fk(tbl, fk_name, 'branch_id', 'branches', 'id');
  CALL safe_add_index(tbl, idx_name, 'branch_id');
END$$
DELIMITER ;


CALL add_branch_to_table('customers',        'idx_cust_branch',  'fk_cust_branch');
CALL add_branch_to_table('vendors',          'idx_vend_branch',  'fk_vend_branch');
CALL add_branch_to_table('products',         'idx_prod_branch',  'fk_prod_branch');

CALL add_branch_to_table('transactions',     'idx_tx_branch',    'fk_tx_branch');
CALL add_branch_to_table('purchases',        'idx_purch_branch', 'fk_purch_branch');
CALL add_branch_to_table('quotations',       'idx_quot_branch',  'fk_quot_branch');
CALL add_branch_to_table('demo_quotations',  'idx_dq_branch',    'fk_dq_branch');

CALL add_branch_to_table('stock_in',         'idx_si_branch',    'fk_si_branch');
CALL add_branch_to_table('stocks',           'idx_stk_branch',   'fk_stk_branch');

CALL add_branch_to_table('tax_modules',      'idx_tm_branch',    'fk_tm_branch');
CALL add_branch_to_table('tax_groups',       'idx_tg_branch',    'fk_tg_branch');


DROP PROCEDURE IF EXISTS add_branch_to_table;
DROP PROCEDURE IF EXISTS safe_add_column;
DROP PROCEDURE IF EXISTS safe_add_index;
DROP PROCEDURE IF EXISTS safe_add_fk;
