const db = require("../config/db");
const { getBranchId, branchWhere, branchIdForInsert } = require("../middleware/branchHelper");
const ExcelJS = require("exceljs");

exports.createVendor = (req, res) => {
  const { 
    company_name, mobile, email, address, pincode, gst_no, vendor_type, status,
    bank_name, account_number, ifsc_code, bank_branch, upi_id, opening_balance
  } = req.body;

  if (!company_name || !mobile) {
    return res.status(400).json({ message: "Company name and contact no are required" });
  }

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return res.status(400).json({ message: "Invalid mobile number" });
  }
  const pincodeVal = pincode && String(pincode).trim() ? pincode : null;
  const gstVal = gst_no && String(gst_no).trim() ? gst_no : null;
  const vendorTypeVal = vendor_type && String(vendor_type).trim() ? vendor_type : null;
  const statusVal = status && (status === "Active" || status === "Inactive") ? status : "Active";
  const vendorNameVal = company_name;
  const sql = `INSERT INTO vendors 
    (vendor_name, company_name, mobile, email, address, pincode, gst_no, vendor_type, status, branch_id, 
     bank_name, account_number, ifsc_code, bank_branch, upi_id, opening_balance) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(
    sql,
    [
      vendorNameVal, 
      company_name, 
      mobile, 
      email || null, 
      address || null, 
      pincodeVal, 
      gstVal, 
      vendorTypeVal, 
      statusVal, 
      branchIdForInsert(req),
      bank_name || null,
      account_number || null,
      ifsc_code || null,
      bank_branch || null,
      upi_id || null,
      opening_balance || 0
    ],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "GST Number already exists" });
        }
        return res.status(500).json({ message: err.message || "Failed to add vendor" });
      }
      const vendorId = result ? result.insertId : null;
      res.json({
        message: "Vendor Added Successfully",
        id: vendorId,
        insertId: vendorId,
        data: {
          id: vendorId,
          vendor_name: vendorNameVal,
          company_name,
          mobile,
          email: email || null,
          address: address || null,
          pincode: pincodeVal,
          gst_no: gstVal,
          vendor_type: vendorTypeVal,
          status: statusVal,
          branch_id: branchIdForInsert(req),
        },
      });
    },
  );
};

exports.getVendors = (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : "";
  const { page, limit, all } = req.query;
  const isAll = all === "true" || limit === "all" || limit === "0" || limit === "-1" || limit === "unlimited";

  const branchId = getBranchId(req);
  const bw = branchWhere(branchId, "");
  const searchQuery = `%${search}%`;

  const countSql = `SELECT COUNT(*) as total FROM vendors 
    WHERE ${bw.clause} AND (company_name LIKE ? 
    OR mobile LIKE ? 
    OR gst_no LIKE ?
    OR vendor_name LIKE ?)`;

  let dataSql = `SELECT * FROM vendors 
    WHERE ${bw.clause} AND (company_name LIKE ? 
    OR mobile LIKE ? 
    OR gst_no LIKE ?
    OR vendor_name LIKE ?)
    ORDER BY id DESC`;

  const countParams = [...bw.params, searchQuery, searchQuery, searchQuery, searchQuery];
  let dataParams = [...countParams];

  db.query(
    countSql,
    countParams,
    (err, countResult) => {
      if (err) {
        return res.status(500).json({ message: err.message || "Failed to load vendors" });
      }

      const total = countResult[0]?.total || 0;

      if (!isAll && (limit !== undefined || page !== undefined)) {
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(10000, Math.max(1, parseInt(limit, 10) || 10));
        const offset = (pageNum - 1) * limitNum;
        dataSql += ` LIMIT ? OFFSET ?`;
        dataParams.push(limitNum, offset);
      }

      db.query(
        dataSql,
        dataParams,
        (err2, rows) => {
          if (err2) {
            return res.status(500).json({ message: err2.message || "Failed to load vendors" });
          }

          res.json({
            total,
            page: parseInt(page || 1, 10),
            limit: rows ? rows.length : 0,
            data: rows || []
          });
        }
      );
    }
  );
};

exports.getVendorById = (req, res) => {
  db.query("SELECT * FROM vendors WHERE id=?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows[0]);
  });
};

exports.updateVendor = (req, res) => {
  const { 
    company_name, mobile, email, address, pincode, gst_no, vendor_type, status,
    bank_name, account_number, ifsc_code, bank_branch, upi_id, opening_balance
  } = req.body;

  if (!company_name || !mobile) {
    return res.status(400).json({ message: "Company name and contact no are required" });
  }

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return res.status(400).json({ message: "Invalid mobile number" });
  }
  const vendorNameVal = company_name;
  const sql = `UPDATE vendors SET 
      vendor_name = ?, 
      company_name = ?, 
      mobile = ?, 
      email = ?, 
      address = ?, 
      pincode = ?, 
      gst_no = ?, 
      vendor_type = ?, 
      status = ?,
      bank_name = ?,
      account_number = ?,
      ifsc_code = ?,
      bank_branch = ?,
      upi_id = ?,
      opening_balance = ?
      WHERE id = ?`;

  const vendorTypeVal =
    vendor_type != null && String(vendor_type).trim() !== "" ? vendor_type : null;
  const statusVal = status && (status === "Active" || status === "Inactive") ? status : "Active";
  const pincodeVal = pincode && String(pincode).trim() ? pincode : null;
  const gstVal = gst_no && String(gst_no).trim() ? gst_no : null;

  db.query(
    sql,
    [
      vendorNameVal,
      company_name,
      mobile,
      email || null,
      address || null,
      pincodeVal,
      gstVal,
      vendorTypeVal,
      statusVal,
      bank_name || null,
      account_number || null,
      ifsc_code || null,
      bank_branch || null,
      upi_id || null,
      opening_balance || 0,
      req.params.id,
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Vendor Updated Successfully" });
    },
  );
};

exports.downloadVendorTemplate = async (_req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Vendors");

    sheet.columns = [
      { header: "company_name", key: "company_name", width: 28 },
      { header: "mobile", key: "mobile", width: 18 },
      { header: "email", key: "email", width: 28 },
      { header: "address", key: "address", width: 32 },
      { header: "pincode", key: "pincode", width: 14 },
      { header: "gst_no", key: "gst_no", width: 20 },
      { header: "vendor_type", key: "vendor_type", width: 18 },
      { header: "status", key: "status", width: 14 },
      { header: "bank_name", key: "bank_name", width: 20 },
      { header: "account_number", key: "account_number", width: 20 },
      { header: "ifsc_code", key: "ifsc_code", width: 15 },
      { header: "bank_branch", key: "bank_branch", width: 20 },
      { header: "upi_id", key: "upi_id", width: 20 },
      { header: "opening_balance", key: "opening_balance", width: 18 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    ["A1", "B1"].forEach((cellRef) => {
      const cell = sheet.getCell(cellRef);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFEB3B" },
      };
    });

    sheet.addRow({
      company_name: "Sample Vendor Pvt Ltd",
      mobile: "9876543210",
      email: "",
      address: "",
      pincode: "",
      gst_no: "",
      vendor_type: "",
      status: "Active",
      opening_balance: 0,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="vendor_bulk_template.xlsx"',
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to generate template" });
  }
};

exports.bulkUploadVendors = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an Excel file (.xlsx/.xls)" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return res.status(400).json({ message: "Excel sheet is empty" });
    }

    const headerRow = sheet.getRow(1);
    const headerMap = {};
    headerRow.eachCell((cell, colNumber) => {
      const key = String(cell.value || "").trim().toLowerCase();
      if (key) headerMap[key] = colNumber;
    });

    const getVal = (row, key) => {
      const col = headerMap[key];
      if (!col) return "";
      const value = row.getCell(col).value;
      if (value == null) return "";
      if (typeof value === "object" && value.text) return String(value.text).trim();
      return String(value).trim();
    };

    const errors = [];
    const values = [];
    const branchId = branchIdForInsert(req);

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const company_name = getVal(row, "company_name");
      const mobile = getVal(row, "mobile");
      const email = getVal(row, "email");
      const address = getVal(row, "address");
      const pincode = getVal(row, "pincode");
      const gst_no = getVal(row, "gst_no");
      const vendor_type = getVal(row, "vendor_type");
      const status = getVal(row, "status");
      const bank_name = getVal(row, "bank_name");
      const account_number = getVal(row, "account_number");
      const ifsc_code = getVal(row, "ifsc_code");
      const bank_branch = getVal(row, "bank_branch");
      const upi_id = getVal(row, "upi_id");
      const opening_balance = getVal(row, "opening_balance");

      if (
        !company_name &&
        !mobile &&
        !email &&
        !address &&
        !pincode &&
        !gst_no &&
        !vendor_type &&
        !status &&
        !bank_name &&
        !account_number &&
        !ifsc_code &&
        !bank_branch &&
        !upi_id &&
        !opening_balance
      ) {
        continue;
      }

      if (!company_name) {
        errors.push({ row: r, message: "company_name is required" });
        continue;
      }
      if (!mobile) {
        errors.push({ row: r, message: "mobile is required" });
        continue;
      }
      if (!/^[6-9]\d{9}$/.test(mobile)) {
        errors.push({ row: r, message: "mobile must be valid 10-digit number" });
        continue;
      }

      const statusVal = status === "Inactive" ? "Inactive" : "Active";
      values.push([
        company_name,
        company_name,
        mobile,
        email || null,
        address || null,
        pincode || null,
        gst_no || null,
        vendor_type || null,
        statusVal,
        branchId,
        bank_name || null,
        account_number || null,
        ifsc_code || null,
        bank_branch || null,
        upi_id || null,
        opening_balance || 0
      ]);
    }

    if (values.length === 0) {
      return res.status(400).json({
        message: "No valid rows found",
        success_count: 0,
        error_count: errors.length,
        errors,
      });
    }

    db.query(
      `INSERT INTO vendors
      (vendor_name, company_name, mobile, email, address, pincode, gst_no, vendor_type, status, branch_id,
       bank_name, account_number, ifsc_code, bank_branch, upi_id, opening_balance)
      VALUES ?`,
      [values],
      (err) => {
        if (err) {
          return res.status(500).json({ message: err.message || "Bulk upload failed" });
        }
        return res.json({
          message: "Vendor bulk upload completed",
          success_count: values.length,
          error_count: errors.length,
          errors,
        });
      },
    );
  } catch (err) {
    return res.status(500).json({ message: err.message || "Bulk upload failed" });
  }
};

exports.deleteVendor = (req, res) => {
  db.query("DELETE FROM vendors WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Vendor Deleted Successfully" });
  });
};
