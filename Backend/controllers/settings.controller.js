const db = require("../config/db");

exports.getCompanySettings = (req, res) => {
  db.query("SELECT * FROM company_settings WHERE status = 1 ORDER BY id DESC LIMIT 1", (err, rows) => {
    if (err) return res.status(500).json({ message: err.message || "Failed to get company settings" });
    res.json(rows.length ? rows[0] : null);
  });
};

exports.saveCompanySettings = (req, res) => {
  const {
    company_name,
    gst_no,
    address,
    city,
    state,
    country,
    branch,
    company_logo
  } = req.body;

  console.log("Received settings data:", req.body);

  if (!company_name?.trim()) {
    console.log("Company name validation failed");
    return res.status(400).json({ message: "Company name is required" });
  }
  db.query("SELECT id FROM company_settings WHERE status = 1 LIMIT 1", (err, rows) => {
    if (err) {
      console.error("Database error checking existing settings:", err);
      return res.status(500).json({ message: err.message || "Database error" });
    }
    console.log("Existing settings check result:", rows);

    if (rows.length > 0) {
      const updateSql = `
        UPDATE company_settings SET
          company_name = ?, gst_no = ?, address = ?, city = ?, state = ?,
          country = ?, branch = ?, company_logo = ?
        WHERE id = ?
      `;

      db.query(
        updateSql,
        [
          company_name.trim(),
          gst_no?.trim() || null,
          address?.trim() || null,
          city?.trim() || null,
          state?.trim() || null,
          country?.trim() || "India",
          branch?.trim() || null,
          company_logo || null,
          rows[0].id
        ],
        (err, result) => {
          if (err) {
            console.error("Error updating settings:", err);
            return res.status(500).json({ message: err.message || "Failed to update settings" });
          }
          console.log("Settings updated successfully:", result);
          res.json({ message: "Company settings updated successfully", id: rows[0].id });
        }
      );
    } else {
      const insertSql = `
        INSERT INTO company_settings
        (company_name, gst_no, address, city, state, country, branch, company_logo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertSql,
        [
          company_name.trim(),
          gst_no?.trim() || null,
          address?.trim() || null,
          city?.trim() || null,
          state?.trim() || null,
          country?.trim() || "India",
          branch?.trim() || null,
          company_logo || null
        ],
        (err, result) => {
          if (err) {
            console.error("Error saving new settings:", err);
            return res.status(500).json({ message: err.message || "Failed to save settings" });
          }
          console.log("New settings saved successfully:", result);
          res.json({ message: "Company settings saved successfully", id: result.insertId });
        }
      );
    }
  });
};

exports.uploadCompanyLogo = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const logoUrl = `/uploads/logos/${req.file.filename}`;
  res.json({ logoUrl });
};