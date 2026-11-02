const db = require("../config/db");
const { getBranchId, branchWhere } = require("../middleware/branchHelper");

exports.getStockByProductId = (req, res) => {
  const productId = req.params.productId;
  db.query("SELECT quantity FROM stocks WHERE product_id = ?", [productId], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message || "Failed to get stock" });
    res.json({ quantity: rows.length ? rows[0].quantity : 0 });
  });
};

exports.updateStock = (req, res) => {
  const { product_id, quantity_change } = req.body; 

  if (!product_id || quantity_change === undefined) {
    return res.status(400).json({ message: "Product ID and quantity change required" });
  }

  db.query(
    "INSERT INTO stocks (product_id, quantity) VALUES (?, ?) ON DUPLICATE KEY UPDATE quantity = GREATEST(0, CAST(quantity AS DECIMAL(10,2)) + ?)",
    [product_id, quantity_change, quantity_change],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: err.message || "Failed to update stock" });
      }
      res.json({
        message: "Stock updated successfully",
        affectedRows: result.affectedRows
      });
    }
  );
};

exports.createStock = (req, res) => {
  const { product_id, quantity } = req.body;

  if (!product_id || quantity === undefined) {
    return res.status(400).json({ message: "Product ID and quantity required" });
  }

  db.query(
    "INSERT INTO stocks (product_id, quantity) VALUES (?, ?)",
    [product_id, quantity],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "Stock for this product already exists. Use update stock instead." });
        }
        return res.status(500).json({ message: err.message || "Failed to create stock entry" });
      }
      res.json({ message: "Stock entry created successfully", id: result.insertId });
    }
  );
};

exports.getStockInList = (req, res) => {
  const { fromDate, toDate, product, vendor, page = 1, limit = 25 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 25));
  const offset = (pageNum - 1) * limitNum;

  const branchId = getBranchId(req);
  let where = [];
  let params = [];
  if (branchId) {
    where.push("(pu.branch_id = ? OR (pu.branch_id IS NULL AND si.branch_id = ?))");
    params.push(branchId, branchId);
  } else {
    where.push("1=1");
  }

  if (fromDate && fromDate.trim()) {
    where.push("si.purchase_date >= ?");
    params.push(fromDate.trim());
  }
  if (toDate && toDate.trim()) {
    where.push("si.purchase_date <= ?");
    params.push(toDate.trim());
  }
  if (product && product.trim()) {
    where.push("p.product_name LIKE ?");
    params.push(`%${product.trim()}%`);
  }
  if (vendor && vendor.trim()) {
    where.push("v.vendor_name LIKE ? OR v.company_name LIKE ?");
    const v = `%${vendor.trim()}%`;
    params.push(v, v);
  }

  const whereClause = where.join(" AND ");

  const countSql = `
    SELECT
      COUNT(DISTINCT si.product_id) AS total,
      SUM(COALESCE(si.qty, 0)) AS grand_qty,
      SUM(COALESCE(si.qty, 0) * COALESCE(si.selling_price, 0)) AS grand_value
    FROM stock_in si
    LEFT JOIN products p ON p.id = si.product_id
    LEFT JOIN purchases pu ON pu.id = si.purchase_id
    LEFT JOIN vendors v ON v.id = pu.vendor_id
    WHERE ${whereClause}
  `;

  const dataSql = `
    SELECT
      si.product_id AS group_id,
      MAX(si.purchase_date) AS purchase_date,
      MAX(pu.purchase_no) AS purchase_no,
      MAX(COALESCE(v.vendor_name, v.company_name)) AS vendor_name,
      MAX(v.company_name) AS company_name,
      MAX(si.id) AS max_id
    FROM stock_in si
    LEFT JOIN products p ON p.id = si.product_id
    LEFT JOIN purchases pu ON pu.id = si.purchase_id
    LEFT JOIN vendors v ON v.id = pu.vendor_id
    WHERE ${whereClause}
    GROUP BY si.product_id
    ORDER BY max_id DESC
    LIMIT ? OFFSET ?
  `;

  db.query(countSql, params, (err, countResult) => {
    if (err) return res.status(500).json({ message: err.message || "Failed to get stock in count" });
    const total = countResult[0].total || 0;
    const grandQty = Number(countResult[0].grand_qty || 0);
    const grandValue = Number(countResult[0].grand_value || 0);

    db.query(dataSql, [...params, limitNum, offset], (err2, rows) => {
      if (err2) return res.status(500).json({ message: err2.message || "Failed to get stock in data" });
      if (!rows || rows.length === 0) {
        return res.json({
          data: [],
          total,
          page: pageNum,
          limit: limitNum,
          totalRecords: total,
          currentPage: pageNum,
          grandQty: 0,
          grandValue: 0
        });
      }

      const productIds = rows.map((r) => r.group_id);

      let itemsSql = "";
      let itemsParams = [];

      if (productIds.length > 0) {
        itemsSql = `
          SELECT
            si.product_id AS group_id,
            si.id AS stock_in_id,
            si.purchase_id,
            si.qty,
            si.purchase_price,
            si.selling_price,
            p.product_name,
            COALESCE(st.quantity, 0) AS current_qty
          FROM stock_in si
          LEFT JOIN products p ON p.id = si.product_id
          LEFT JOIN stocks st ON st.product_id = si.product_id
          WHERE si.product_id IN (?)
          ORDER BY si.id ASC
        `;
        itemsParams = [productIds];
      }

      db.query(itemsSql, itemsParams, (errItems, itemRows) => {
        if (errItems) {
          return res.status(500).json({ message: errItems.message || "Failed to load stock in items" });
        }

        const itemsByGroup = {};
        (itemRows || []).forEach((item) => {
          const gid = item.group_id;
          if (!itemsByGroup[gid]) {
            itemsByGroup[gid] = [];
          }
          itemsByGroup[gid].push(item);
        });

        const finalRows = rows.map((r) => {
          const items = itemsByGroup[r.group_id] || [];
          return {
            ...r,
            items: [], // clear items array to show flat structure in UI
            qty: items.reduce((sum, it) => sum + Number(it.qty || 0), 0),
            current_qty: items.length > 0 ? items[0].current_qty : 0,
            selling_price: items.length > 0 ? items[items.length - 1].selling_price : null,
            product_name: items.length > 0 ? items[0].product_name : "N/A",
          };
        });

        res.json({
          data: finalRows,
          total,
          page: pageNum,
          limit: limitNum,
          totalRecords: total,
          currentPage: pageNum,
          grandQty,
          grandValue
        });
      });
    });
  });
};

exports.getStockOutList = (req, res) => {
  const { fromDate, toDate, search, page = 1, limit = 25 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 25));
  const offset = (pageNum - 1) * limitNum;

  const branchId = getBranchId(req);

  const saleSql = `
    SELECT 
      t.id,
      t.sales_date AS date,
      CAST(c.customer_name AS CHAR) COLLATE utf8mb4_general_ci AS customer_name,
      CAST(c.contact_no AS CHAR) COLLATE utf8mb4_general_ci AS contact_number,
      CAST(c.gst_no AS CHAR) COLLATE utf8mb4_general_ci AS gst_no,
      CAST((
        SELECT GROUP_CONCAT(COALESCE(tsl.product_name, p.product_name, '') SEPARATOR ', ')
        FROM transaction_sell_lines tsl
        LEFT JOIN products p ON p.id = tsl.product_id
        WHERE tsl.transaction_id = t.id
      ) AS CHAR) COLLATE utf8mb4_general_ci AS product_name,
      CAST(
        COALESCE(
          CASE
            WHEN bl.landmark LIKE '%Attur%' AND (bl.city IS NULL OR bl.city NOT LIKE '%Attur%') THEN 'Attur'
            WHEN bl.city IS NOT NULL AND bl.city != '' AND (bl.name IS NULL OR bl.name = 'SRI SIVALINGA' OR bl.name = 'CLAVIS TECH WORKS' OR bl.name = 'AAA FATHIMA FURNITURES' OR bl.name = b.branch_name) THEN bl.city
            WHEN bl.name IS NOT NULL AND bl.name != '' AND bl.name != 'SRI SIVALINGA' AND bl.name != 'CLAVIS TECH WORKS' AND bl.name != 'AAA FATHIMA FURNITURES' THEN bl.name
            WHEN bl.city IS NOT NULL AND bl.city != '' THEN bl.city
            WHEN b.city IS NOT NULL AND b.city != '' THEN b.city
            ELSE COALESCE(bl.name, b.branch_name, '')
          END,
          ''
        ) AS CHAR
      ) COLLATE utf8mb4_general_ci AS location,
      CAST(t.payment_status AS CHAR) COLLATE utf8mb4_general_ci AS payment_status,
      CAST((SELECT tp.method FROM transaction_payments tp WHERE tp.transaction_id = t.id ORDER BY tp.id ASC LIMIT 1) AS CHAR) COLLATE utf8mb4_general_ci AS payment_method,
      t.final_amount AS total_amount,
      (SELECT COALESCE(SUM(tp.amount), 0) FROM transaction_payments tp WHERE tp.transaction_id = t.id) AS total_paid,
      CAST((SELECT COALESCE(SUM(tsl.quantity), 0) FROM transaction_sell_lines tsl WHERE tsl.transaction_id = t.id) AS CHAR) COLLATE utf8mb4_general_ci AS qty,
      CAST('Sale' AS CHAR) COLLATE utf8mb4_general_ci as type
    FROM transactions t
    LEFT JOIN customers c ON c.id = t.contact_id
    LEFT JOIN business_location bl ON (
      (t.business_id IS NOT NULL AND bl.id = t.business_id)
      OR (t.business_id IS NULL AND t.location_id IS NOT NULL AND bl.id = t.location_id)
      OR (t.business_id IS NULL AND t.location_id IS NULL AND bl.id = (
        SELECT MIN(bl2.id) FROM business_location bl2 WHERE bl2.branch_id = t.branch_id
      ))
    )
    LEFT JOIN branches b ON b.id = COALESCE(bl.branch_id, t.branch_id)
    WHERE t.type = 'sell' ${branchId ? "AND t.branch_id = ?" : ""}
  `;

  const serviceSql = `
    SELECT
      1 as id,
      '2000-01-01' as date,
      CAST('' AS CHAR) COLLATE utf8mb4_general_ci AS customer_name,
      CAST('' AS CHAR) COLLATE utf8mb4_general_ci AS contact_number,
      CAST('' AS CHAR) COLLATE utf8mb4_general_ci as gst_no,
      CAST('' AS CHAR) COLLATE utf8mb4_general_ci AS product_name,
      CAST('' AS CHAR) COLLATE utf8mb4_general_ci AS location,
      CAST('' AS CHAR) COLLATE utf8mb4_general_ci AS payment_status,
      CAST('' AS CHAR) COLLATE utf8mb4_general_ci as payment_method,
      0 as total_amount,
      0 as total_paid,
      CAST('0' AS CHAR) COLLATE utf8mb4_general_ci AS qty,
      CAST('Service' AS CHAR) COLLATE utf8mb4_general_ci as type
    FROM DUAL WHERE 1=0
  `;

  const dcSql = `
    SELECT
      q.id,
      q.quotation_date AS date,
      CAST(q.customer_name AS CHAR) COLLATE utf8mb4_general_ci AS customer_name,
      CAST(q.contact_no AS CHAR) COLLATE utf8mb4_general_ci AS contact_number,
      CAST('' AS CHAR) COLLATE utf8mb4_general_ci AS gst_no,
      CAST((
        SELECT GROUP_CONCAT(COALESCE(qi.product_name, p.product_name, '') SEPARATOR ', ')
        FROM demo_quotation_items qi
        LEFT JOIN products p ON p.id = qi.product_id
        WHERE qi.quotation_id = q.id
      ) AS CHAR) COLLATE utf8mb4_general_ci AS product_name,
      CAST(
        COALESCE(
          CASE
            WHEN bl.landmark LIKE '%Attur%' AND (bl.city IS NULL OR bl.city NOT LIKE '%Attur%') THEN 'Attur'
            WHEN bl.city IS NOT NULL AND bl.city != '' AND (bl.name IS NULL OR bl.name = 'SRI SIVALINGA' OR bl.name = 'CLAVIS TECH WORKS' OR bl.name = 'AAA FATHIMA FURNITURES' OR bl.name = b.branch_name) THEN bl.city
            WHEN bl.name IS NOT NULL AND bl.name != '' AND bl.name != 'SRI SIVALINGA' AND bl.name != 'CLAVIS TECH WORKS' AND bl.name != 'AAA FATHIMA FURNITURES' THEN bl.name
            WHEN bl.city IS NOT NULL AND bl.city != '' THEN bl.city
            WHEN b.city IS NOT NULL AND b.city != '' THEN b.city
            ELSE COALESCE(bl.name, b.branch_name, '')
          END,
          ''
        ) AS CHAR
      ) COLLATE utf8mb4_general_ci AS location,
      CAST('Paid' AS CHAR) COLLATE utf8mb4_general_ci AS payment_status,
      CAST('Cash' AS CHAR) COLLATE utf8mb4_general_ci AS payment_method,
      q.grand_total AS total_amount,
      q.grand_total AS total_paid,
      CAST((SELECT COALESCE(SUM(qi.qty), 0) FROM demo_quotation_items qi WHERE qi.quotation_id = q.id) AS CHAR) COLLATE utf8mb4_general_ci AS qty,
      CAST('Quotation(DC)' AS CHAR) COLLATE utf8mb4_general_ci as type
    FROM demo_quotations q
    LEFT JOIN business_location bl ON bl.id = (
      SELECT MIN(bl2.id) FROM business_location bl2 WHERE bl2.branch_id = q.branch_id
    )
    LEFT JOIN branches b ON b.id = q.branch_id
    WHERE q.is_dc = 1
  `;

  const prSql = `
    SELECT
      pr.id,
      pr.return_date AS date,
      CAST(COALESCE(v.company_name, v.vendor_name, 'Vendor') AS CHAR) COLLATE utf8mb4_general_ci AS customer_name,
      CAST(COALESCE(v.mobile, '') AS CHAR) COLLATE utf8mb4_general_ci AS contact_number,
      CAST(COALESCE(v.gst_no, '') AS CHAR) COLLATE utf8mb4_general_ci AS gst_no,
      CAST((
        SELECT GROUP_CONCAT(COALESCE(pri.product_name, '') SEPARATOR ', ')
        FROM purchase_return_items pri
        WHERE pri.purchase_return_id = pr.id
      ) AS CHAR) COLLATE utf8mb4_general_ci AS product_name,
      CAST(COALESCE(b.branch_name, '') AS CHAR) COLLATE utf8mb4_general_ci AS location,
      CAST(pr.refund_type AS CHAR) COLLATE utf8mb4_general_ci AS payment_status,
      CAST(COALESCE(pr.payment_mode, 'Bank Transfer') AS CHAR) COLLATE utf8mb4_general_ci AS payment_method,
      pr.grand_total AS total_amount,
      pr.grand_total AS total_paid,
      CAST(pr.total_qty AS CHAR) COLLATE utf8mb4_general_ci AS qty,
      CAST('Purchase Return' AS CHAR) COLLATE utf8mb4_general_ci as type
    FROM purchase_returns pr
    LEFT JOIN vendors v ON v.id = pr.vendor_id
    LEFT JOIN branches b ON b.id = pr.branch_id
    WHERE 1=1 ${branchId ? "AND pr.branch_id = ?" : ""}
  `;

  let params = [];
  if (branchId) params.push(branchId);
  if (branchId) params.push(branchId);

  let combinedSql = `SELECT * FROM (${saleSql} UNION ALL ${dcSql} UNION ALL ${prSql}) AS t WHERE 1=1`;

  if (fromDate) { combinedSql += " AND date >= ?"; params.push(fromDate); }
  if (toDate) { combinedSql += " AND date <= ?"; params.push(toDate); }
  if (search) {
    combinedSql += " AND (customer_name LIKE ? OR contact_number LIKE ? OR product_name LIKE ?)";
    const sv = `%${search}%`;
    params.push(sv, sv, sv);
  }

  const countSql = `SELECT COUNT(*) as total FROM (${combinedSql}) as c`;
  const dataSql = `${combinedSql} ORDER BY date DESC LIMIT ? OFFSET ?`;

  db.query(countSql, params, (err, countRows) => {
    if (err) {
      console.error("STOCK_OUT_COUNT_ERROR:", err);
      return res.status(500).json({ message: err.message });
    }
    const total = countRows[0]?.total || 0;

    db.query(dataSql, [...params, limitNum, offset], (err2, rows) => {
      if (err2) {
        console.error("STOCK_OUT_DATA_ERROR:", err2);
        return res.status(500).json({ message: err2.message });
      }
      res.json({
        data: rows || [],
        total,
        page: pageNum,
        limit: limitNum
      });
    });
  });
};

exports.getStockDetails = (req, res) => {
  const { fromDate, toDate, productSearch, search, page = 1, limit = 25, locationId, businessId } = req.query;
  const productTerm = (productSearch || search || "").trim();
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100000, Math.max(1, parseInt(limit, 10) || 25));
  const offset = (pageNum - 1) * limitNum;

  const locId = locationId || businessId;
  const branchId3 = getBranchId(req);

  const purWhere = ["1=1"];
  const purParams = [];
  if (locId && String(locId).trim() !== "" && String(locId) !== "all") {
    purWhere.push("pu.branch_id = (SELECT branch_id FROM business_location WHERE id = ? LIMIT 1)");
    purParams.push(locId);
  } else if (branchId3) {
    purWhere.push("pu.branch_id = ?");
    purParams.push(branchId3);
  }
  if (fromDate && fromDate.trim()) {
    purWhere.push("pu.purchase_date >= ?");
    purParams.push(fromDate.trim());
  }
  if (toDate && toDate.trim()) {
    purWhere.push("pu.purchase_date <= ?");
    purParams.push(toDate.trim());
  }
  if (productTerm) {
    purWhere.push("(p1.product_name LIKE ? OR pi.product_name LIKE ?)");
    purParams.push(`%${productTerm}%`, `%${productTerm}%`);
  }

  const salWhere = ["t.type = 'sell'"];
  const salParams = [];
  if (locId && String(locId).trim() !== "" && String(locId) !== "all") {
    salWhere.push("(t.business_id = ? OR t.location_id = ?)");
    salParams.push(locId, locId);
  } else if (branchId3) {
    salWhere.push("t.branch_id = ?");
    salParams.push(branchId3);
  }
  if (fromDate && fromDate.trim()) {
    salWhere.push("t.sales_date >= ?");
    salParams.push(fromDate.trim());
  }
  if (toDate && toDate.trim()) {
    salWhere.push("t.sales_date <= ?");
    salParams.push(toDate.trim());
  }
  if (productTerm) {
    salWhere.push("(p2.product_name LIKE ? OR tsl.product_name LIKE ?)");
    salParams.push(`%${productTerm}%`, `%${productTerm}%`);
  }

  const dcWhere = ["q.is_dc = 1"];
  const dcParams = [];
  if (locId && String(locId).trim() !== "" && String(locId) !== "all") {
    dcWhere.push("q.branch_id = (SELECT branch_id FROM business_location WHERE id = ? LIMIT 1)");
    dcParams.push(locId);
  } else if (branchId3) {
    dcWhere.push("q.branch_id = ?");
    dcParams.push(branchId3);
  }
  if (fromDate && fromDate.trim()) {
    dcWhere.push("q.quotation_date >= ?");
    dcParams.push(fromDate.trim());
  }
  if (toDate && toDate.trim()) {
    dcWhere.push("q.quotation_date <= ?");
    dcParams.push(toDate.trim());
  }
  if (productTerm) {
    dcWhere.push("(p3.product_name LIKE ? OR qi.product_name LIKE ?)");
    dcParams.push(`%${productTerm}%`, `%${productTerm}%`);
  }

  const hasTxnFilter = !!(
    (fromDate && fromDate.trim()) ||
    (toDate && toDate.trim()) ||
    (locId && String(locId).trim() !== "" && String(locId) !== "all")
  );

  const purWhereClause = purWhere.join(" AND ");
  const salWhereClause = salWhere.join(" AND ");
  const dcWhereClause = dcWhere.join(" AND ");

  const purSub = `
    SELECT
      COALESCE(pi.product_name, p1.product_name, '') AS product_name,
      MAX(pi.product_id) AS product_id,
      SUM(COALESCE(pi.qty, 0)) AS total_in_qty,
      SUM(COALESCE(pi.qty, 0) * COALESCE(pi.price, 0)) AS total_in_qty_amount
    FROM purchase_items pi
    INNER JOIN purchases pu ON pu.id = pi.purchase_id
    LEFT JOIN products p1 ON p1.id = pi.product_id
    WHERE ${purWhereClause}
    GROUP BY COALESCE(pi.product_name, p1.product_name, '')
  `;

  const salSub = `
    SELECT
      COALESCE(tsl.product_name, p2.product_name, '') AS product_name,
      MAX(tsl.product_id) AS product_id,
      SUM(COALESCE(tsl.quantity, 0)) AS total_out_qty,
      SUM(COALESCE(tsl.quantity, 0) * COALESCE(tsl.unit_price, 0)) AS total_out_qty_amount
    FROM transaction_sell_lines tsl
    INNER JOIN transactions t ON t.id = tsl.transaction_id
    LEFT JOIN products p2 ON p2.id = tsl.product_id
    WHERE ${salWhereClause}
    GROUP BY COALESCE(tsl.product_name, p2.product_name, '')
  `;

  const dcSub = `
    SELECT
      COALESCE(qi.product_name, p3.product_name, '') AS product_name,
      MAX(qi.product_id) AS product_id,
      SUM(COALESCE(qi.qty, 0)) AS total_dc_qty,
      SUM(COALESCE(qi.qty, 0) * COALESCE(qi.rate, 0)) AS total_dc_qty_amount
    FROM demo_quotation_items qi
    INNER JOIN demo_quotations q ON q.id = qi.quotation_id
    LEFT JOIN products p3 ON p3.id = qi.product_id
    WHERE ${dcWhereClause}
    GROUP BY COALESCE(qi.product_name, p3.product_name, '')
  `;

  let unionSql = "";
  let unionParams = [];

  if (hasTxnFilter) {
    unionSql = `
      (SELECT COALESCE(pi.product_name, p1.product_name, '') AS product_name, MAX(pi.product_id) AS product_id
       FROM purchase_items pi
       INNER JOIN purchases pu ON pu.id = pi.purchase_id
       LEFT JOIN products p1 ON p1.id = pi.product_id
       WHERE ${purWhereClause}
       GROUP BY COALESCE(pi.product_name, p1.product_name, ''))
      UNION
      (SELECT COALESCE(tsl.product_name, p2.product_name, '') AS product_name, MAX(tsl.product_id) AS product_id
       FROM transaction_sell_lines tsl
       INNER JOIN transactions t ON t.id = tsl.transaction_id
       LEFT JOIN products p2 ON p2.id = tsl.product_id
       WHERE ${salWhereClause}
       GROUP BY COALESCE(tsl.product_name, p2.product_name, ''))
      UNION
      (SELECT COALESCE(qi.product_name, p3.product_name, '') AS product_name, MAX(qi.product_id) AS product_id
       FROM demo_quotation_items qi
       INNER JOIN demo_quotations q ON q.id = qi.quotation_id
       LEFT JOIN products p3 ON p3.id = qi.product_id
       WHERE ${dcWhereClause}
       GROUP BY COALESCE(qi.product_name, p3.product_name, ''))
    `;
    unionParams = [...purParams, ...salParams, ...dcParams];
  } else {
    const p0Params = [];
    let p0Where = "1=1";
    if (productTerm) {
      p0Where += " AND p0.product_name LIKE ?";
      p0Params.push(`%${productTerm}%`);
    }
    unionSql = `
      (SELECT p0.product_name, p0.id AS product_id
       FROM products p0
       WHERE ${p0Where})
      UNION
      (SELECT COALESCE(pi.product_name, p1.product_name, '') AS product_name, MAX(pi.product_id) AS product_id
       FROM purchase_items pi
       INNER JOIN purchases pu ON pu.id = pi.purchase_id
       LEFT JOIN products p1 ON p1.id = pi.product_id
       WHERE ${purWhereClause}
       GROUP BY COALESCE(pi.product_name, p1.product_name, ''))
      UNION
      (SELECT COALESCE(tsl.product_name, p2.product_name, '') AS product_name, MAX(tsl.product_id) AS product_id
       FROM transaction_sell_lines tsl
       INNER JOIN transactions t ON t.id = tsl.transaction_id
       LEFT JOIN products p2 ON p2.id = tsl.product_id
       WHERE ${salWhereClause}
       GROUP BY COALESCE(tsl.product_name, p2.product_name, ''))
      UNION
      (SELECT COALESCE(qi.product_name, p3.product_name, '') AS product_name, MAX(qi.product_id) AS product_id
       FROM demo_quotation_items qi
       INNER JOIN demo_quotations q ON q.id = qi.quotation_id
       LEFT JOIN products p3 ON p3.id = qi.product_id
       WHERE ${dcWhereClause}
       GROUP BY COALESCE(qi.product_name, p3.product_name, ''))
    `;
    unionParams = [...p0Params, ...purParams, ...salParams, ...dcParams];
  }

  const filterClause = hasTxnFilter
    ? "WHERE (COALESCE(pur.total_in_qty, 0) != 0 OR COALESCE(sal.total_out_qty, 0) != 0 OR COALESCE(dc.total_dc_qty, 0) != 0)"
    : "";

  const countSql = `
    SELECT
      COUNT(DISTINCT TRIM(u.product_name)) AS total,
      COALESCE(SUM(pur.total_in_qty), 0) AS grand_in_qty,
      COALESCE(SUM(sal.total_out_qty), 0) + COALESCE(SUM(dc.total_dc_qty), 0) AS grand_out_qty,
      COALESCE(SUM(pur.total_in_qty_amount), 0) AS grand_in_amount,
      COALESCE(SUM(sal.total_out_qty_amount), 0) + COALESCE(SUM(dc.total_dc_qty_amount), 0) AS grand_out_amount
    FROM (
      SELECT DISTINCT TRIM(u.product_name) AS product_name
      FROM (${unionSql}) AS u
      WHERE u.product_name IS NOT NULL AND TRIM(u.product_name) != ''
    ) AS u
    LEFT JOIN (${purSub}) AS pur ON LOWER(TRIM(pur.product_name)) = LOWER(TRIM(u.product_name))
    LEFT JOIN (${salSub}) AS sal ON LOWER(TRIM(sal.product_name)) = LOWER(TRIM(u.product_name))
    LEFT JOIN (${dcSub}) AS dc ON LOWER(TRIM(dc.product_name)) = LOWER(TRIM(u.product_name))
    ${filterClause}
  `;

  const dataSql = `
    SELECT
      MAX(u.product_id) AS product_id,
      TRIM(u.product_name) AS product_name,
      COALESCE(MAX(pur.total_in_qty), 0) AS total_qty,
      (COALESCE(MAX(sal.total_out_qty), 0) + COALESCE(MAX(dc.total_dc_qty), 0)) AS total_out_qty,
      GREATEST(0, COALESCE(MAX(pur.total_in_qty), 0) - (COALESCE(MAX(sal.total_out_qty), 0) + COALESCE(MAX(dc.total_dc_qty), 0))) AS total_in_qty,
      COALESCE(MAX(pur.total_in_qty_amount), 0) AS total_in_qty_amount,
      (COALESCE(MAX(sal.total_out_qty_amount), 0) + COALESCE(MAX(dc.total_dc_qty_amount), 0)) AS total_out_qty_amount
    FROM (
      SELECT DISTINCT
        u.product_id,
        TRIM(u.product_name) AS product_name
      FROM (${unionSql}) AS u
      WHERE u.product_name IS NOT NULL AND TRIM(u.product_name) != ''
    ) AS u
    LEFT JOIN (${purSub}) AS pur ON LOWER(TRIM(pur.product_name)) = LOWER(TRIM(u.product_name))
    LEFT JOIN (${salSub}) AS sal ON LOWER(TRIM(sal.product_name)) = LOWER(TRIM(u.product_name))
    LEFT JOIN (${dcSub}) AS dc ON LOWER(TRIM(dc.product_name)) = LOWER(TRIM(u.product_name))
    ${filterClause}
    GROUP BY TRIM(u.product_name)
    ORDER BY TRIM(u.product_name) ASC
    LIMIT ? OFFSET ?
  `;

  const countParams = [...unionParams, ...purParams, ...salParams, ...dcParams];
  const dataParams = [...unionParams, ...purParams, ...salParams, ...dcParams, limitNum, offset];

  db.query(countSql, countParams, (err, countRows) => {
    if (err) return res.status(500).json({ message: err.message || "Failed to get stock details count" });
    const total = countRows[0]?.total ?? 0;
    const summary = {
      total_products: total,
      total_in_qty: Number(countRows[0]?.grand_in_qty) || 0,
      total_out_qty: Number(countRows[0]?.grand_out_qty) || 0,
      current_qty: Math.max(0, (Number(countRows[0]?.grand_in_qty) || 0) - (Number(countRows[0]?.grand_out_qty) || 0)),
      total_in_amount: Number(countRows[0]?.grand_in_amount) || 0,
      total_out_amount: Number(countRows[0]?.grand_out_amount) || 0,
    };

    db.query(dataSql, dataParams, (err2, rows) => {
      if (err2) return res.status(500).json({ message: err2.message || "Failed to get stock details" });
      const data = (rows || []).map((r) => ({
        product_id: r.product_id,
        product_name: r.product_name || "",
        total_qty: Number(r.total_qty) || 0,
        total_out_qty: Number(r.total_out_qty) || 0,
        total_in_qty: Number(r.total_in_qty) || 0,
        total_in_qty_amount: Number(r.total_in_qty_amount) || 0,
        total_out_qty_amount: Number(r.total_out_qty_amount) || 0
      }));
      res.json({ data, total, summary, page: pageNum, limit: limitNum });
    });
  });
};
