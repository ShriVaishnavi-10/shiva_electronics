const db = require("../config/db");

function getUnitTable(typeParam) {
  return typeParam === "secondary" ? "secondary_units" : "primary_units";
}


exports.createUnit = (req, res) => {
  const rawName = req.body.unit_name;
  if (!rawName || !String(rawName).trim()) {
    return res.status(400).json({ message: "Unit name required" });
  }
  const unitName = String(rawName).trim();
  const type = req.query.type === "secondary" ? "secondary" : "primary";
  const tableName = getUnitTable(type);

  db.query(
    `INSERT INTO ${tableName} (unit_name) VALUES (?)`,
    [unitName],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "Unit already exists" });
        }
        return res
          .status(500)
          .json({ message: err.message || "Failed to create unit" });
      }

      res.json({
        message: "Unit created",
        id: result.insertId,
        unit_name: unitName,
        type,
      });
    }
  );
};

exports.getUnits = (req, res) => {
  const type = req.query.type === "secondary" ? "secondary" : "primary";
  const tableName = getUnitTable(type);

  db.query(
    `SELECT id, unit_name FROM ${tableName} ORDER BY unit_name ASC`,
    (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ message: err.message || "Failed to load units" });
      }
      res.json(Array.isArray(rows) ? rows : []);
    }
  );
};

