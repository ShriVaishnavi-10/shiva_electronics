-- Master tables for product units used as Primary / Secondary units.
-- Run this in your MySQL database before using the units API.

-- Primary units (e.g. pcs, sheets, kg)
CREATE TABLE IF NOT EXISTS primary_units (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  unit_name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Secondary units (e.g. sqft, meter, box)
CREATE TABLE IF NOT EXISTS secondary_units (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  unit_name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

