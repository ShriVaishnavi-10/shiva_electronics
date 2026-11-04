SET @product_quantity_sql = IF(
  (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'quantity'
  ) = 0,
  'ALTER TABLE products ADD COLUMN quantity DECIMAL(12,3) NULL DEFAULT 0.000',
  'SELECT ''products.quantity already exists'' AS message'
);

PREPARE product_quantity_stmt FROM @product_quantity_sql;
EXECUTE product_quantity_stmt;
DEALLOCATE PREPARE product_quantity_stmt;
