const db = require("../backend/config/db");

const branchId = 1; // dummy
const saleSql = `
    SELECT 
      t.id,
      t.sales_date AS date,
      CAST(c.customer_name AS CHAR) COLLATE utf8mb4_general_ci AS customer_name,
      CAST(c.contact_no AS CHAR) COLLATE utf8mb4_general_ci AS contact_number,
      CAST(c.gst_no AS CHAR) COLLATE utf8mb4_general_ci AS gst_no,
      CAST(COALESCE(bl.name, 'Multiple Items') AS CHAR) COLLATE utf8mb4_general_ci AS product_name,
      CAST(t.payment_status AS CHAR) COLLATE utf8mb4_general_ci AS payment_status,
      CAST((SELECT tp.method FROM transaction_payments tp WHERE tp.transaction_id = t.id ORDER BY tp.id ASC LIMIT 1) AS CHAR) COLLATE utf8mb4_general_ci AS payment_method,
      t.final_amount AS total_amount,
      (SELECT COALESCE(SUM(tp.amount), 0) FROM transaction_payments tp WHERE tp.transaction_id = t.id) AS total_paid,
      CAST((SELECT COUNT(*) FROM transaction_sell_lines tsl WHERE tsl.transaction_id = t.id) AS CHAR) COLLATE utf8mb4_general_ci AS qty,
      CAST('Sale' AS CHAR) COLLATE utf8mb4_general_ci as type
    FROM transactions t
    LEFT JOIN customers c ON c.id = t.contact_id
    LEFT JOIN business_location bl ON bl.id = t.business_id
    WHERE t.type = 'sell' ${branchId ? "AND t.branch_id = ?" : ""}
  `;

const serviceSql = `
    SELECT
      s.id,
      s.date_of_incoming as date,
      CAST(c.customer_name AS CHAR) COLLATE utf8mb4_general_ci AS customer_name,
      CAST(c.contact_no AS CHAR) COLLATE utf8mb4_general_ci AS contact_number,
      CAST('' AS CHAR) COLLATE utf8mb4_general_ci as gst_no,
      CAST(p.product_name AS CHAR) COLLATE utf8mb4_general_ci AS product_name,
      CAST(s.status AS CHAR) COLLATE utf8mb4_general_ci AS payment_status,
      CAST((SELECT aa.payment_method FROM advance_amount aa WHERE aa.product_id = s.id LIMIT 1) AS CHAR) COLLATE utf8mb4_general_ci as payment_method,
      0 as total_amount,
      0 as total_paid,
      CAST(s_unpivot.val AS CHAR) COLLATE utf8mb4_general_ci AS qty,
      CAST('Service' AS CHAR) COLLATE utf8mb4_general_ci as type
    FROM (
      SELECT id, customer_id, date_of_incoming, receipt_no, branch_id, 'COPPER' as mat_name, mat_copper as val FROM services
      UNION ALL SELECT id, customer_id, date_of_incoming, receipt_no, branch_id, 'INSULATION', mat_insulation FROM services
      UNION ALL SELECT id, customer_id, date_of_incoming, receipt_no, branch_id, 'VARNISH', mat_varnish FROM services
      UNION ALL SELECT id, customer_id, date_of_incoming, receipt_no, branch_id, 'SLEEVES', mat_sleeves FROM services
      UNION ALL SELECT id, customer_id, date_of_incoming, receipt_no, branch_id, 'F.G.WIRE', mat_fg_wire FROM services
      UNION ALL SELECT id, customer_id, date_of_incoming, receipt_no, branch_id, 'WEDGE', mat_wedge FROM services
      UNION ALL SELECT id, customer_id, date_of_incoming, receipt_no, branch_id, 'BEARING', mat_bearing FROM services
      UNION ALL SELECT id, customer_id, date_of_incoming, receipt_no, branch_id, 'BOLT NUTS', mat_bolt_nuts FROM services
      UNION ALL SELECT id, customer_id, date_of_incoming, receipt_no, branch_id, 'PAINT', mat_paint_material FROM services
    ) s_unpivot
    JOIN services s ON s.id = s_unpivot.id
    JOIN customers c ON c.id = s.customer_id
    JOIN products p ON TRIM(UPPER(p.product_name)) = s_unpivot.mat_name
    WHERE (s_unpivot.val IS NOT NULL AND s_unpivot.val != '' AND s_unpivot.val != '0')
    ${branchId ? "AND s.branch_id = ?" : ""}
  `;

let params = [1, 1];
let combinedSql = `SELECT * FROM (${saleSql} UNION ALL ${serviceSql}) AS t WHERE 1=1`;
const countSql = `SELECT COUNT(*) as total FROM (${combinedSql}) as c`;

db.query(countSql, params, (err, rows) => {
  if (err) {
    console.error("SQL ERROR:", err.message);
    process.exit(1);
  }
  console.log("SUCCESS:", rows[0].total);
  process.exit(0);
});
