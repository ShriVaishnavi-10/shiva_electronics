const db = require("../config/db");

exports.getPurchaseList = async (req, res) => {
  const {
    fromDate,
    toDate,
    vendor,
    product,
    limit = 25,
    page = 1
  } = req.query;

  const offset = (page - 1) * limit;

  let where = "WHERE 1=1";
  let params = [];

  if (fromDate && toDate) {
    where += " AND DATE(p.purchase_date) BETWEEN ? AND ?";
    params.push(fromDate, toDate);
  }

  if (vendor) {
    where += " AND (v.vendors_name LIKE ? OR v.company_name LIKE ?)";
    params.push(`%${vendor}%`, `%${vendor}%`);
  }

  if (product) {
    where += " AND pr.product_name LIKE ?";
    params.push(`%${product}%`);
  }

  const sql = `
    SELECT
      p.id AS purchase_id,
      REPLACE(p.purchase_no, 'SSL', 'CTW') AS purchase_no,
      p.purchase_date,
      v.vendors_name,
      v.company_name,
      pr.product_name,
      pi.qty,
      pi.sqft_rate AS purchase_price,
      pi.selling_rate,
      p.created_at
    FROM purchase p
    JOIN purchase_items pi ON pi.purchase_id = p.id
    JOIN products pr ON pr.id = pi.product_id
    JOIN vendors v ON v.id = p.vendor_id
    ${where}
    ORDER BY p.id DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await db.query(sql, [...params, Number(limit), Number(offset)]);

  const [[count]] = await db.query(
    `SELECT COUNT(*) total FROM purchase p
     JOIN purchase_items pi ON pi.purchase_id = p.id
     JOIN products pr ON pr.id = pi.product_id
     JOIN vendors v ON v.id = p.vendor_id
     ${where}`, params
  );

  res.json({
    data: rows,
    total: count.total
  });
};

exports.getPurchaseView = async (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      REPLACE(p.purchase_no, 'SSL', 'CTW') AS purchase_no,
      p.purchase_date,
      p.payment_type,
      v.*,
      pr.product_name,
      pr.thickness,
      c.category_name,
      sc.subcategory_name,
      pi.*
    FROM purchase p
    JOIN vendors v ON v.id = p.vendor_id
    JOIN purchase_items pi ON pi.purchase_id = p.id
    JOIN products pr ON pr.id = pi.product_id
    JOIN categories c ON c.id = pr.category_id
    JOIN subcategories sc ON sc.id = pr.subcategory_id
    WHERE p.id = ?
  `;

  const [rows] = await db.query(sql, [id]);
  res.json(rows);
};
