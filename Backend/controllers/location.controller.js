const db = require("../config/db");

exports.createLocation = (req, res) => {
  const {
    location_id,
    name,
    branch_id,
    landmark,
    state,
    city,
    zip_code,
    mobile,
    alternate_number,
    email,
    images,
    gst_no,
    account_holder,
    bank_name,
    account_number,
    branch,
    ifsc_code
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  if (!branch_id) {
    return res.status(400).json({ message: "Branch is required" });
  }

  const doInsert = (generatedLocationId) => {
    const sql = `INSERT INTO business_location 
      (location_id, name, branch_id, landmark, state, city, zip_code, mobile, alternate_number, email, images,
       gst_no, account_holder, bank_name, account_number, branch, ifsc_code) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(
      sql,
      [
        generatedLocationId,
        name.trim(),
        Number(branch_id),
        landmark && String(landmark).trim() ? landmark.trim() : null,
        state && String(state).trim() ? state.trim() : null,
        city && String(city).trim() ? city.trim() : null,
        zip_code && String(zip_code).trim() ? zip_code.trim() : null,
        mobile && String(mobile).trim() ? mobile.trim() : null,
        alternate_number && String(alternate_number).trim() ? alternate_number.trim() : null,
        email && String(email).trim() ? email.trim() : null,
        images && String(images).trim() ? images.trim() : null,
        gst_no && String(gst_no).trim() ? gst_no.trim() : null,
        account_holder && String(account_holder).trim() ? account_holder.trim() : null,
        bank_name && String(bank_name).trim() ? bank_name.trim() : null,
        account_number && String(account_number).trim() ? account_number.trim() : null,
        branch && String(branch).trim() ? branch.trim() : null,
        ifsc_code && String(ifsc_code).trim() ? ifsc_code.trim() : null
      ],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "Location ID already exists" });
          }
          return res.status(500).json({ message: err.message || "Failed to add location" });
        }
        res.json({ message: "Location added successfully", id: result.insertId, location_id: generatedLocationId });
      }
    );
  };

  const suppliedId = location_id && String(location_id).trim();
  if (suppliedId) {
    return doInsert(suppliedId);
  }

  db.query(
    `SELECT location_id FROM business_location 
     WHERE location_id LIKE 'LOC-%' 
     ORDER BY CAST(SUBSTRING(location_id, 5) AS UNSIGNED) DESC 
     LIMIT 1`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: err.message || "Failed to generate location ID" });
      }
      let nextNum = 1;
      if (rows && rows.length > 0 && rows[0].location_id) {
        const numPart = parseInt(String(rows[0].location_id).replace(/^LOC-/, ""), 10);
        if (!isNaN(numPart)) nextNum = numPart + 1;
      }
      const generatedLocationId = "LOC-" + String(nextNum).padStart(4, "0");
      doInsert(generatedLocationId);
    }
  );
};

exports.getLocations = (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : "";
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  const searchQuery = `%${search}%`;

  const countSql = `SELECT COUNT(*) AS total FROM business_location 
    WHERE name LIKE ? OR location_id LIKE ? OR city LIKE ? OR state LIKE ? OR mobile LIKE ? OR email LIKE ?`;
  const dataSql = `SELECT * FROM business_location 
    WHERE name LIKE ? OR location_id LIKE ? OR city LIKE ? OR state LIKE ? OR mobile LIKE ? OR email LIKE ?
    ORDER BY id DESC
    LIMIT ? OFFSET ?`;

  db.query(
    countSql,
    [searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery],
    (err, countResult) => {
      if (err) {
        return res.status(500).json({ message: err.message || "Failed to load locations" });
      }
      const total = countResult[0].total;
      db.query(
        dataSql,
        [searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, limit, offset],
        (err2, rows) => {
          if (err2) {
            return res.status(500).json({ message: err2.message || "Failed to load locations" });
          }
          res.json({ total, page, limit, data: rows || [] });
        }
      );
    }
  );
};

exports.getLocationById = (req, res) => {
  db.query("SELECT * FROM business_location WHERE id = ?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message || "Failed to load location" });
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Location not found" });
    res.json(rows[0]);
  });
};

exports.updateLocation = (req, res) => {
  const {
    location_id,
    name,
    branch_id,
    landmark,
    state,
    city,
    zip_code,
    mobile,
    alternate_number,
    email,
    images,
    gst_no,
    account_holder,
    bank_name,
    account_number,
    branch,
    ifsc_code
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  if (!branch_id) {
    return res.status(400).json({ message: "Branch is required" });
  }

  const sql = `UPDATE business_location SET 
    location_id = ?, name = ?, branch_id = ?, landmark = ?, state = ?, city = ?, zip_code = ?,
    mobile = ?, alternate_number = ?, email = ?, images = ?,
    gst_no = ?, account_holder = ?, bank_name = ?, account_number = ?, branch = ?, ifsc_code = ?
    WHERE id = ?`;

  db.query(
    sql,
    [
      location_id && String(location_id).trim() ? location_id.trim() : null,
      name.trim(),
      Number(branch_id),
      landmark && String(landmark).trim() ? landmark.trim() : null,
      state && String(state).trim() ? state.trim() : null,
      city && String(city).trim() ? city.trim() : null,
      zip_code && String(zip_code).trim() ? zip_code.trim() : null,
      mobile && String(mobile).trim() ? mobile.trim() : null,
      alternate_number && String(alternate_number).trim() ? alternate_number.trim() : null,
      email && String(email).trim() ? email.trim() : null,
      images && String(images).trim() ? images.trim() : null,
      gst_no && String(gst_no).trim() ? gst_no.trim() : null,
      account_holder && String(account_holder).trim() ? account_holder.trim() : null,
      bank_name && String(bank_name).trim() ? bank_name.trim() : null,
      account_number && String(account_number).trim() ? account_number.trim() : null,
      branch && String(branch).trim() ? branch.trim() : null,
      ifsc_code && String(ifsc_code).trim() ? ifsc_code.trim() : null,
      req.params.id
    ],
    (err) => {
      if (err) return res.status(500).json({ message: err.message || "Failed to update location" });
      res.json({ message: "Location updated successfully" });
    }
  );
};

exports.uploadLocationImages = (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }
  const baseUrl = req.protocol + "://" + req.get("host");
  const urls = req.files.map((f) => baseUrl + "/uploads/locations/" + f.filename);
  res.json({ urls });
};

exports.deleteLocation = (req, res) => {
  db.query("DELETE FROM business_location WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: err.message || "Failed to delete location" });
    res.json({ message: "Location deleted successfully" });
  });
};
