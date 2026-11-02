const db = require("../config/db");
const { validationResult } = require("express-validator");
const { getBranchId, branchWhere, branchIdForInsert } = require("../middleware/branchHelper");

exports.createProduct = (req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json(errors.array());

  const {
    category_id,
    subcategory_id,
    brand_id,
    product_name,
    product_code,
    unit,
    primary_unit,
    secondary_unit,
    hsncode,
    min_order_quantity,
    image,
    images,
    price,
    status,
    is_insulation_subfield,
    discount_percent,
    barcode,
    product_type,
    specifications
  } = req.body;
  const imageVal = image || images || null;
  const brandIdVal = (brand_id != null && brand_id !== "") ? parseInt(brand_id, 10) : null;
  const primaryUnitVal = primary_unit || unit || null;
  const unitVal = primaryUnitVal;

  let specsVal = null;
  if (specifications != null) {
    specsVal = typeof specifications === "object" ? JSON.stringify(specifications) : specifications;
  }

  db.query(
    `INSERT INTO products
     (category_id,subcategory_id,brand_id,product_name,product_code,unit,primary_unit,hsncode,min_order_quantity,images,status,is_insulation_subfield,price,discount_percent,branch_id,barcode,product_type,specifications)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      category_id,
      subcategory_id || null,
      brandIdVal,
      product_name,
      product_code || null,
      unitVal,
      primaryUnitVal,
      hsncode || null,
      min_order_quantity || null,
      imageVal,
      status || 'Active',
      is_insulation_subfield ? 1 : 0,
      price != null ? price : null,
      discount_percent != null && discount_percent !== "" ? parseFloat(discount_percent) : 0.00,
      branchIdForInsert(req),
      barcode || null,
      product_type || null,
      specsVal
    ],
    (err,result)=>{
      if(err) return res.status(500).json({ message: err.message || "Failed to create product" });
      const insertId = result.insertId;
      
      const finalizeProduct = () => {
        res.json({ message:"Product created", id: insertId });
      };

      if (!barcode) {
        const generatedBarcode = `SE-${String(insertId).padStart(4, '0')}`;
        db.query("UPDATE products SET barcode = ? WHERE id = ?", [generatedBarcode, insertId], (updateErr) => {
           if (updateErr) console.error("Failed to update barcode", updateErr);
           finalizeProduct();
        });
      } else {
        finalizeProduct();
      }
    }
  );
};

exports.getProducts = (req,res)=>{
  const branchId = getBranchId(req);
  const bw = branchWhere(branchId, "p");
  db.query(
    `SELECT p.*, c.category_name, s.subcategory_name, b.brand_name
     FROM products p
     LEFT JOIN categories c ON c.id=p.category_id
     LEFT JOIN subcategories s ON s.id=p.subcategory_id
     LEFT JOIN brand b ON b.id=p.brand_id
     WHERE ${bw.clause}`,
    bw.params,
    (err,rows)=>{
      if(err) return res.status(500).json({ message: err.message || "Failed to load products" });
      const parsedRows = (rows || []).map((row) => {
        if (row.specifications && typeof row.specifications === "string") {
          try {
            row.specifications = JSON.parse(row.specifications);
          } catch (e) {}
        }
        return row;
      });
      res.json(parsedRows);
    }
  );
};

exports.updateProduct = (req,res)=>{
  const { id } = req.params;
  const updateData = { ...req.body };
  delete updateData.category_name;
  delete updateData.subcategory_name;
  delete updateData.brand_name;
  delete updateData.id;
  if (req.body.brand_id != null && req.body.brand_id !== "") {
    updateData.brand_id = parseInt(req.body.brand_id, 10);
  } else {
    updateData.brand_id = null;
  }
  if (req.body.image != null || req.body.images != null) {
    updateData.images = req.body.image || req.body.images;
  }
  delete updateData.image;
  delete updateData.qty;
  if (req.body.primary_unit != null || req.body.unit != null) {
    const primaryUnitVal = req.body.primary_unit || req.body.unit || null;
    updateData.primary_unit = primaryUnitVal;
    updateData.unit = primaryUnitVal;
  }
  if (updateData.specifications != null) {
    updateData.specifications = typeof updateData.specifications === "object"
      ? JSON.stringify(updateData.specifications)
      : updateData.specifications;
  }
  db.query(
    "UPDATE products SET ? WHERE id=?",
    [updateData, id],
    (err)=>{
      if(err) return res.status(500).json({ message: err.message || "Failed to update product" });
      res.json({ message:"Product updated" });
    }
  );
};

exports.deleteProduct = (req, res) => {
  const { id } = req.params;
  const productId = parseInt(id, 10);
  if (Number.isNaN(productId)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  const msgPurchase = "Cannot delete product. Used in Purchase records.";
  const msgSale = "Cannot delete product. Used in Sale records.";
  const msgQuotations = "Cannot delete product. Used in Quotations records.";

  const runDelete = () => {
    db.query("DELETE FROM products WHERE id=?", [productId], (err) => {
      if (err) return res.status(500).json({ message: err.message || "Failed to delete product" });
      res.json({ message: "Product deleted" });
    });
  };

  db.query(
    "SELECT 1 FROM purchase_items WHERE product_id = ? LIMIT 1",
    [productId],
    (err, purchaseRows) => {
      if (err) {
        console.error("Database error checking purchase_items for product delete:", err);
        return res.status(500).json({ message: err.message || "Failed to validate product delete" });
      }
      if (purchaseRows && purchaseRows.length > 0) {
        return res.status(400).json({ message: msgPurchase });
      }

      db.query(
        "SELECT 1 FROM transaction_sell_lines WHERE product_id = ? LIMIT 1",
        [productId],
        (err2, saleRows) => {
          if (err2) {
            console.error("Database error checking transaction_sell_lines for product delete:", err2);
            return res.status(500).json({ message: err2.message || "Failed to validate product delete" });
          }
          if (saleRows && saleRows.length > 0) {
            return res.status(400).json({ message: msgSale });
          }

          db.query(
            "SELECT 1 FROM quotation_items WHERE product_id = ? LIMIT 1",
            [productId],
            (err3, qRows) => {
              if (err3) {
                console.error("Database error checking quotation_items for product delete:", err3);
                return res.status(500).json({ message: err3.message || "Failed to validate product delete" });
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

exports.searchProducts = (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const searchTerm = q ? `%${q}%` : '%';
  const branchId = getBranchId(req);
  const bw = branchWhere(branchId, "p");

  db.query(
    `SELECT 
        p.id,
        p.product_name,
        p.product_code,
        p.barcode,
        p.unit,
        p.primary_unit,
        COALESCE(st.quantity, 0) AS qty,
        p.hsncode,
        p.price AS price,
        p.price AS selling_price,
        (SELECT pi.tax_group_id FROM purchase_items pi JOIN purchases pu ON pu.id = pi.purchase_id WHERE pi.product_id = p.id ORDER BY pu.purchase_date DESC, pu.id DESC LIMIT 1) AS tax_group_id,
        p.discount_percent,
        c.category_name,
        s.subcategory_name
     FROM products p
     LEFT JOIN stocks st ON st.product_id = p.id
     JOIN categories c ON c.id = p.category_id
     LEFT JOIN subcategories s ON s.id = p.subcategory_id
     WHERE ${bw.clause} AND (
        p.product_name LIKE ? OR
        p.product_code LIKE ? OR
        p.barcode LIKE ? OR
        c.category_name LIKE ? OR
        IFNULL(s.subcategory_name, '') LIKE ?)
     ORDER BY p.product_name ASC
     LIMIT 100`,
    [...bw.params, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
    (err, rows) => {
      if (err)
        return res
          .status(500)
          .json({ message: err.message || "Failed to search products" });

      res.json(rows || []);
    }
  );
};

exports.getProductById = (req, res) => {
  db.query(
    `SELECT p.*, c.category_name, s.subcategory_name, b.brand_name
     FROM products p
     JOIN categories c ON c.id=p.category_id
     LEFT JOIN subcategories s ON s.id=p.subcategory_id
     LEFT JOIN brand b ON b.id=p.brand_id
     WHERE p.id=?`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message || "Failed to load product" });
      const product = rows && rows[0] ? rows[0] : null;
      if (product && product.specifications && typeof product.specifications === "string") {
        try {
          product.specifications = JSON.parse(product.specifications);
        } catch (e) {}
      }
      res.json(product);
    }
  );
};

exports.getProductQuantity = (req, res) => {
  const productId = req.params.productId;
  db.query("SELECT quantity FROM stocks WHERE product_id = ?", [productId], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message || "Failed to get product quantity" });
    const quantity = rows.length ? (parseFloat(rows[0].quantity) || 0) : 0;
    res.json({ quantity: quantity });
  });
};

exports.getLowStockProducts = (req, res) => {
  const threshold = parseInt(req.query.threshold, 10) || 10;

  db.query(
    `SELECT p.id, p.product_name, COALESCE(s.quantity, 0) AS qty
     FROM products p
     LEFT JOIN stocks s ON s.product_id = p.id
     WHERE COALESCE(s.quantity, 0) <= ?
     ORDER BY qty ASC, p.product_name ASC`,
    [threshold],
    (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ message: err.message || "Failed to load low stock products" });
      }
      res.json(rows || []);
    }
  );
};

exports.downloadCsvTemplate = (req, res) => {
  const headers = [
    "category_name",
    "subcategory_name",
    "brand_name",
    "product_name",
    "product_code",
    "primary_unit",
    "hsncode",
    "price",
    "status",
  ];

  const sampleRows = [
    [
      "Indoor Plants",
      "Ferns",
      "GreenLife",
      "Boston Fern",
      "PRD-001",
      "pcs",
      "0602",
      "150",
      "Active",
    ],
    [
      "Outdoor Plants",
      "Flowering",
      "",
      "Rose Plant",
      "PRD-002",
      "pcs",
      "",
      "250",
      "Active",
    ],
  ];

  const csvContent = [
    headers.join(","),
    ...sampleRows.map((r) => r.map((v) => `"${v}"`).join(",")),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="product_bulk_upload_template.csv"',
  );
  res.send(csvContent);
};

/* ================= BULK UPLOAD PRODUCTS ================= */
exports.bulkUploadProducts = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No CSV file uploaded" });
  }

  const csvParser = require("csv-parser");
  const fs = require("fs");
  const filePath = req.file.path;
  const rows = [];

  fs.createReadStream(filePath)
    .pipe(csvParser({ mapHeaders: ({ header }) => header.trim() }))
    .on("data", (row) => rows.push(row))
    .on("end", () => {
      fs.unlink(filePath, () => {});

      if (!rows.length) {
        return res.status(400).json({ message: "CSV file is empty" });
      }

      db.query(
        "SELECT id, category_name FROM categories",
        (catErr, catRows) => {
          if (catErr)
            return res.status(500).json({ message: "Failed to load categories" });

          db.query(
            "SELECT id, category_id, subcategory_name FROM subcategories",
            (subErr, subRows) => {
              if (subErr)
                return res.status(500).json({ message: "Failed to load subcategories" });

              db.query(
                "SELECT id, brand_name FROM brand",
                (brErr, brRows) => {
                  if (brErr)
                    return res.status(500).json({ message: "Failed to load brands" });

                  const catMap = {};
                  (catRows || []).forEach((c) => {
                    catMap[c.category_name.toLowerCase().trim()] = c.id;
                  });

                  const subMap = {};
                  (subRows || []).forEach((s) => {
                    const key =
                      s.category_id +
                      "|" +
                      s.subcategory_name.toLowerCase().trim();
                    subMap[key] = s.id;
                  });

                  const brandMap = {};
                  (brRows || []).forEach((b) => {
                    brandMap[b.brand_name.toLowerCase().trim()] = b.id;
                  });

                  const successRows = [];
                  const errorRows = [];

                  rows.forEach((row, idx) => {
                    const rowNum = idx + 2;
                    const errors = [];

                    const categoryName = (row.category_name || "").trim();
                    const subcategoryName = (row.subcategory_name || "").trim();
                    const brandName = (row.brand_name || "").trim();
                    const productName = (row.product_name || "").trim();
                    const productCode = (row.product_code || "").trim() || null;
                    const primaryUnit = (row.primary_unit || "").trim();
                    const hsncode = (row.hsncode || "").trim();
                    const price = row.price ? parseFloat(row.price) : null;
                    const status = (row.status || "Active").trim();

                    if (!categoryName) errors.push("category_name is required");
                    if (!productName) errors.push("product_name is required");

                    const categoryId =
                      catMap[categoryName.toLowerCase()] || null;
                    if (categoryName && !categoryId)
                      errors.push(`Category "${categoryName}" not found`);

                    let subcategoryId = null;
                    if (subcategoryName && categoryId) {
                      subcategoryId =
                        subMap[
                          categoryId +
                            "|" +
                            subcategoryName.toLowerCase()
                        ] || null;
                      if (!subcategoryId)
                        errors.push(
                          `Subcategory "${subcategoryName}" not found under "${categoryName}"`,
                        );
                    }

                    let brandId = null;
                    if (brandName) {
                      brandId = brandMap[brandName.toLowerCase()] || null;
                      if (!brandId)
                        errors.push(`Brand "${brandName}" not found`);
                    }

                    if (errors.length) {
                      errorRows.push({ row: rowNum, errors, data: row });
                    } else {
                      successRows.push([
                        categoryId,
                        subcategoryId,
                        brandId,
                        productName,
                        productCode,
                        primaryUnit || null,
                        primaryUnit || null,
                        hsncode || null,
                        null,
                        null,
                        status || "Active",
                        price,
                        branchIdForInsert(req),
                      ]);
                    }
                  });

                  if (!successRows.length) {
                    return res.json({
                      message: "No valid rows to insert",
                      success_count: 0,
                      error_count: errorRows.length,
                      errors: errorRows,
                    });
                  }

                  const sql = `INSERT INTO products
                    (category_id, subcategory_id, brand_id, product_name, product_code, unit, primary_unit, hsncode, min_order_quantity, images, status, price, branch_id)
                    VALUES ?`;

                  db.query(sql, [successRows], (insertErr, result) => {
                    if (insertErr) {
                      return res.status(500).json({
                        message:
                          insertErr.message || "Failed to insert products",
                        success_count: 0,
                        error_count: rows.length,
                      });
                    }

                    res.json({
                      message: "Bulk upload completed",
                      success_count: result.affectedRows,
                      error_count: errorRows.length,
                      errors: errorRows,
                    });
                  });
                },
              );
            },
          );
        },
      );
    })
    .on("error", (err) => {
      fs.unlink(filePath, () => {});
      return res
        .status(500)
        .json({ message: "Failed to parse CSV: " + err.message });
    });
};

exports.uploadProductImages = (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }
  const baseUrl = req.protocol + "://" + req.get("host");
  const urls = req.files.map((f) => baseUrl + "/uploads/products/" + f.filename);
  res.json({ urls });
};
