const db = require("../config/db");
const { validationResult } = require("express-validator");
const { getBranchId, branchWhere, branchIdForInsert } = require("../middleware/branchHelper");
const ExcelJS = require("exceljs");

exports.createCustomer = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation errors in createCustomer:", errors.array());
    return res.status(400).json({ message: "Validation failed", errors: errors.array() });
  }

  const {
    customer_name,
    contact_no,
    name,
    phone,
    alternate_no,
    gst_no,
    pincode,
    address,
    address2,
    city,
    state,
    country,
    opening_balance
  } = req.body;

  const final_name = customer_name || name;
  const final_phone = contact_no || phone;

  if (!final_name || !final_phone) {
    return res.status(400).json({ message: "Name and Phone are required" });
  }

  const isNonGst = Boolean(req.isNonUser || req.body.is_gst === 0 || req.body.is_gst === false || req.body.is_gst === "0");
  const isGstVal = isNonGst ? 0 : 1;

  console.log("Attempting to create customer with data:", req.body);

  db.query(
    `INSERT INTO customers
     (customer_name, contact_no, alternate_no, gst_no, pincode, address, address2, city, state, country, branch_id, opening_balance, is_gst)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      final_name,
      final_phone,
      alternate_no || null,
      isNonGst ? null : (gst_no || null),
      pincode || null,
      address || null,
      address2 || null,
      city || null,
      state || "Tamil Nadu",
      country || "India",
      branchIdForInsert(req),
      opening_balance || 0,
      isGstVal
    ],
    (err, result) => {
      if (err) {
        console.error("Database error creating customer:", err);
        return res.status(500).json({ message: err.message || "Failed to create customer" });
      }
      console.log("Customer created successfully:", result);
      res.json({ message: "Customer created successfully", id: result.insertId, is_gst: isGstVal });
    }
  );
};


exports.getCustomers = (req, res) => {
  const { search, page, limit, all } = req.query;

  const branchId = getBranchId(req);
  const bw = branchWhere(branchId, "");
  let where = [bw.clause];
  let params = [...bw.params];

  if (req.isNonUser || req.query.is_gst === "0") {
    where.push("is_gst = 0");
  } else if (req.query.is_gst === "1") {
    where.push("is_gst = 1");
  } else if (req.user && !String(req.user.role_name || "").toLowerCase().includes("super admin")) {
    where.push("is_gst = 1");
  }

  if (search && search.trim()) {
    where.push("(customer_name LIKE ? OR contact_no LIKE ? OR city LIKE ? OR gst_no LIKE ?)");
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereClause = where.join(" AND ");

  const countSql = `SELECT COUNT(*) AS total FROM customers WHERE ${whereClause}`;

  console.log("Attempting to get customers. Count SQL:", countSql, "Params:", params);

  db.query(countSql, params, (err, countResult) => {
    if (err) {
      console.error("Database error getting customer count:", err);
      return res.status(500).json({ message: err.message || "Failed to get customer count" });
    }
    const total = countResult[0]?.total || 0;

    const isAll = all === "true" || limit === "all" || limit === "0" || limit === "-1" || limit === "unlimited";
    let dataSql = `SELECT * FROM customers WHERE ${whereClause} ORDER BY id DESC`;
    let dataParams = [...params];

    if (!isAll && (limit !== undefined || page !== undefined)) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(10000, Math.max(1, parseInt(limit, 10) || 10));
      const offset = (pageNum - 1) * limitNum;
      dataSql += ` LIMIT ? OFFSET ?`;
      dataParams.push(limitNum, offset);
    }

    db.query(dataSql, dataParams, (err2, rows) => {
      if (err2) {
        console.error("Database error getting customer data:", err2);
        return res.status(500).json({ message: err2.message || "Failed to get customer data" });
      }
      console.log("Customers data fetched successfully.");
      res.json({ data: rows || [], total, page: parseInt(page || 1, 10), limit: rows ? rows.length : 0 });
    });
  });
};


exports.getCustomerById = (req, res) => {
  const { id } = req.params;
  console.log("Attempting to get customer by ID:", id);
  db.query("SELECT * FROM customers WHERE id = ?", [id], (err, rows) => {
    if (err) {
      console.error("Database error getting customer by ID:", err);
      return res.status(500).json({ message: err.message || "Failed to get customer" });
    }
    console.log("Customer data by ID fetched successfully.", rows[0]);
    res.json(rows.length ? rows[0] : null);
  });
};

exports.updateCustomer = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation errors in updateCustomer:", errors.array());
    return res.status(400).json({ message: "Validation failed", errors: errors.array() });
  }

  const { id } = req.params;
  const {
    customer_name,
    contact_no,
    alternate_no,
    gst_no,
    pincode,
    address,
    address2,
    city,
    state,
    country,
    opening_balance
  } = req.body;

  console.log("Attempting to update customer ID:", id, "with data:", req.body);

  const isNonGst = Boolean(req.isNonUser || req.body.is_gst === 0 || req.body.is_gst === false || req.body.is_gst === "0");

  db.query(
    `UPDATE customers SET
     customer_name = ?, contact_no = ?, alternate_no = ?, gst_no = ?, pincode = ?,
     address = ?, address2 = ?, city = ?, state = ?, country = ?, opening_balance = ?
     WHERE id = ?`,
    [
      customer_name,
      contact_no,
      alternate_no || null,
      isNonGst ? null : (gst_no || null),
      pincode || null,
      address || null,
      address2 || null,
      city || null,
      state || "Tamil Nadu",
      country || "India",
      opening_balance || 0,
      id,
    ],
    (err, result) => {
      if (err) {
        console.error("Database error updating customer:", err);
        return res.status(500).json({ message: err.message || "Failed to update customer" });
      }
      console.log("Customer updated successfully:", result);
      res.json({ message: "Customer updated successfully" });
    }
  );
};

exports.deleteCustomer = (req, res) => {
  const { id } = req.params;
  const customerId = parseInt(id, 10);
  if (Number.isNaN(customerId)) {
    return res.status(400).json({ message: "Invalid customer id" });
  }

  const msgPurchase = "Cannot delete. Customer linked with Purchase records.";
  const msgSale = "Cannot delete. Customer linked with Sale records.";
  const msgQuotations = "Cannot delete. Customer linked with Quotations records.";

  const isMissingColumnError = (err) =>
    err &&
    (err.code === "ER_BAD_FIELD_ERROR" ||
      (typeof err.message === "string" && err.message.includes("Unknown column")));

  const runDelete = () => {
    db.query("DELETE FROM customers WHERE id = ?", [customerId], (err, result) => {
      if (err) {
        console.error("Database error deleting customer:", err);
        return res.status(500).json({ message: err.message || "Failed to delete customer" });
      }
      console.log("Customer deleted successfully:", result);
      res.json({ message: "Customer deleted successfully" });
    });
  };

  db.query(
    "SELECT 1 FROM purchases WHERE customer_id = ? LIMIT 1",
    [customerId],
    (err, purchaseRows) => {
      if (err) {
        if (isMissingColumnError(err)) {
        } else {
          console.error("Database error checking purchases for customer delete:", err);
          return res.status(500).json({ message: err.message || "Failed to validate customer delete" });
        }
      } else if (purchaseRows && purchaseRows.length > 0) {
        return res.status(400).json({ message: msgPurchase });
      }

      db.query(
        "SELECT 1 FROM transactions WHERE contact_id = ? AND type = 'sell' LIMIT 1",
        [customerId],
        (err2, saleRows) => {
          if (err2) {
            console.error("Database error checking transactions for customer delete:", err2);
            return res.status(500).json({ message: err2.message || "Failed to validate customer delete" });
          }
          if (saleRows && saleRows.length > 0) {
            return res.status(400).json({ message: msgSale });
          }


          db.query(
            "SELECT 1 FROM quotations WHERE customer_id = ? LIMIT 1",
            [customerId],
            (err3, qRows) => {
              if (err3) {
                console.error("Database error checking quotations for customer delete:", err3);
                return res.status(500).json({ message: err3.message || "Failed to validate customer delete" });
              }
              if (qRows && qRows.length > 0) {
                return res.status(400).json({ message: msgQuotations });
              }

              runDelete();
            },
          );
        },
      );
    },
  );
};


exports.downloadCustomerTemplate = async (_req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Customers");

    const headers = [
      { header: "customer_name", key: "customer_name", width: 28 },
      { header: "contact_no", key: "contact_no", width: 18 },
      { header: "alternate_no", key: "alternate_no", width: 18 },
      { header: "gst_no", key: "gst_no", width: 20 },
      { header: "pincode", key: "pincode", width: 14 },
      { header: "address", key: "address", width: 32 },
      { header: "address2", key: "address2", width: 32 },
      { header: "city", key: "city", width: 20 },
      { header: "country", key: "country", width: 20 },
      { header: "opening_balance", key: "opening_balance", width: 18 },
    ];
    sheet.columns = headers;

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
      customer_name: "Sample Customer",
      contact_no: "9876543210",
      alternate_no: "",
      gst_no: "",
      pincode: "",
      address: "",
      address2: "",
      city: "",
      country: "",
      opening_balance: 0,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="customer_bulk_template.xlsx"',
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to generate template" });
  }
};


exports.bulkUploadCustomers = async (req, res) => {
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

    const branchId = branchIdForInsert(req);
    const errors = [];
    const validRows = [];


    const headerRow = sheet.getRow(1);
    const headerMap = {};
    headerRow.eachCell((cell, colNumber) => {
      const key = String(cell.value || "").trim().toLowerCase();
      if (key) headerMap[key] = colNumber;
    });

    const getVal = (row, key) => {
      const col = headerMap[key];
      if (!col) return "";
      const v = row.getCell(col).value;
      if (v == null) return "";
      if (typeof v === "object" && v.text) return String(v.text).trim();
      return String(v).trim();
    };

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const customer_name = getVal(row, "customer_name");
      const contact_no = getVal(row, "contact_no");
      const alternate_no = getVal(row, "alternate_no");
      const gst_no = getVal(row, "gst_no");
      const pincode = getVal(row, "pincode");
      const address = getVal(row, "address");
      const address2 = getVal(row, "address2");
      const city = getVal(row, "city");
      const country = getVal(row, "country");
      const opening_balance = getVal(row, "opening_balance");

      if (
        !customer_name &&
        !contact_no &&
        !alternate_no &&
        !gst_no &&
        !pincode &&
        !address &&
        !address2 &&
        !city &&
        !country &&
        !opening_balance
      ) {
        continue;
      }

      if (!customer_name) {
        errors.push({ row: r, message: "customer_name is required" });
        continue;
      }
      if (!contact_no) {
        errors.push({ row: r, message: "contact_no is required" });
        continue;
      }
      if (!/^\d{10}$/.test(contact_no)) {
        errors.push({ row: r, message: "contact_no must be 10 digits" });
        continue;
      }

      validRows.push([
        customer_name,
        contact_no,
        alternate_no || null,
        gst_no || null,
        pincode || null,
        address || null,
        address2 || null,
        city || null,
        country || null,
        branchId,
        opening_balance || 0,
      ]);
    }

    if (validRows.length === 0) {
      return res.status(400).json({
        message: "No valid rows found",
        success_count: 0,
        error_count: errors.length,
        errors,
      });
    }

    db.query(
      `INSERT INTO customers
      (customer_name, contact_no, alternate_no, gst_no, pincode, address, address2, city, country, branch_id, opening_balance)
      VALUES ?`,
      [validRows],
      (err) => {
        if (err) {
          return res.status(500).json({ message: err.message || "Bulk upload failed" });
        }
        return res.json({
          message: "Bulk upload completed",
          success_count: validRows.length,
          error_count: errors.length,
          errors,
        });
      },
    );
  } catch (err) {
    return res.status(500).json({ message: err.message || "Bulk upload failed" });
  }
};