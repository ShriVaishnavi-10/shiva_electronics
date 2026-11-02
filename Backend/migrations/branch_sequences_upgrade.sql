
USE anantham_nursary;

ALTER TABLE branch_sequences 
  MODIFY COLUMN sequence_type VARCHAR(30) NOT NULL;

DROP PROCEDURE IF EXISTS safe_add_column;
DELIMITER $$
CREATE PROCEDURE safe_add_column(IN tbl VARCHAR(64), IN col VARCHAR(64), IN defn VARCHAR(500))
BEGIN
  SET @db = DATABASE();
  SELECT COUNT(*) INTO @exists FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = tbl AND COLUMN_NAME = col;
  IF @exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', defn);
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL safe_add_column('branch_sequences', 'start_number', 'INT DEFAULT 1 AFTER prefix');

DROP PROCEDURE IF EXISTS safe_add_column;
