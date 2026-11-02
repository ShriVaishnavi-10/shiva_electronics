const db = require("../config/db");
const { getBranchId, branchWhere } = require("../middleware/branchHelper");

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function buildDateRange(conditionColumn, fromDate, toDate, where = [], params = []) {
  if (fromDate) { where.push(`${conditionColumn} >= ?`); params.push(fromDate); }
  if (toDate) { where.push(`${conditionColumn} <= ?`); params.push(toDate); }
  return { where, params };
}

exports.getSummary = async (req, res) => {
  try {
    const fromDate = req.query.fromDate || null;
    const toDate = req.query.toDate || null;
    const branchId = getBranchId(req);
    const isGstScope = (req.isNonUser || req.query.is_gst === "0") ? 0 : 1;

    const bwQ = branchWhere(branchId, "q");
    const bwT = branchWhere(branchId, "t");
    const bwP = branchWhere(branchId, "p");

    let whereQ = [bwQ.clause]; let paramsQ = [...bwQ.params];
    ({ where: whereQ, params: paramsQ } = buildDateRange("q.quotation_date", fromDate, toDate, whereQ, paramsQ));
    const qRows = isGstScope === 0 ? [{ total_quotations: 0, revenue: 0 }] : await runQuery(
      `SELECT COUNT(DISTINCT q.id) AS total_quotations,
              COALESCE(SUM(COALESCE(qi.total, COALESCE(qi.rate_1, 0) * COALESCE(qi.qty, 1))), 0) AS revenue
       FROM quotations q LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
       WHERE ${whereQ.join(" AND ")}`, paramsQ);

    let whereS = ["t.type = 'sell'", "t.is_gst = ?", bwT.clause]; let paramsS = [isGstScope, ...bwT.params];
    ({ where: whereS, params: paramsS } = buildDateRange("t.sales_date", fromDate, toDate, whereS, paramsS));
    const sRows = await runQuery(
      `SELECT COUNT(*) AS total_sales, COALESCE(SUM(t.final_amount), 0) AS total_revenue
       FROM transactions t WHERE ${whereS.join(" AND ")}`, paramsS);

    let whereP2 = [bwP.clause]; let paramsP2 = [...bwP.params];
    ({ where: whereP2, params: paramsP2 } = buildDateRange("p.purchase_date", fromDate, toDate, whereP2, paramsP2));
    const pRows = isGstScope === 0 ? [{ total_purchases: 0, total_purchase_value: 0 }] : await runQuery(
      `SELECT COUNT(DISTINCT p.id) AS total_purchases,
              COALESCE(SUM(COALESCE(pi.qty, 0) * COALESCE(pi.price, 0)), 0) AS total_purchase_value
       FROM purchases p LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
       WHERE ${whereP2.join(" AND ")}`, paramsP2);

    const bwStk = branchWhere(branchId, "");
    const bwCust = branchWhere(branchId, "");
    const bwProd = branchWhere(branchId, "");

    const custWhere = bwCust.clause ? `${bwCust.clause} AND is_gst = ?` : "is_gst = ?";
    const [stockRows, customerRows, productRows] = await Promise.all([
      runQuery(`SELECT COALESCE(SUM(quantity), 0) AS total_stock_qty FROM stocks WHERE ${bwStk.clause}`, bwStk.params),
      runQuery(`SELECT COUNT(*) AS total_customers FROM customers WHERE ${custWhere}`, [...bwCust.params, isGstScope]),
      runQuery(`SELECT COUNT(*) AS total_products FROM products WHERE ${bwProd.clause}`, bwProd.params),
    ]);

    // Extra Non-GST Metrics for dedicated Non-GST Dashboard
    let nonGstMetrics = {};
    if (isGstScope === 0) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const [todaySalesRows] = await runQuery(
        `SELECT COUNT(*) as count, COALESCE(SUM(t.final_amount), 0) as total FROM transactions t WHERE t.type = 'sell' AND t.is_gst = 0 AND t.sales_date = ? AND ${bwT.clause}`,
        [todayStr, ...bwT.params]
      );
      const [todayCollectionRows] = await runQuery(
        `SELECT COALESCE(SUM(tp.amount), 0) as total FROM transaction_payments tp JOIN transactions t ON t.id = tp.transaction_id WHERE t.is_gst = 0 AND DATE(tp.created_at) = ? AND LOWER(TRIM(tp.method)) != 'credit' AND ${bwT.clause}`,
        [todayStr, ...bwT.params]
      );
      const bwB = branchWhere(branchId, "b");
      const [bankBalanceRows] = await runQuery(
        `SELECT COALESCE(SUM(b.current_balance), 0) as total FROM bank_accounts b WHERE b.is_gst = 0 AND b.status = 'Active' AND ${bwB.clause}`,
        bwB.params
      );
      const bwD = branchWhere(branchId, "d");
      const [cashLogRows] = await runQuery(
        `SELECT d.closing_balance, d.actual_cash, d.status FROM daily_cash_logs d WHERE d.is_gst = 0 AND ${bwD.clause} ORDER BY d.date DESC LIMIT 1`,
        bwD.params
      );
      const [outstandingRows] = await runQuery(
        `SELECT COALESCE(SUM(GREATEST(0, t.final_amount - (
           SELECT COALESCE(SUM(tp.amount), 0) FROM transaction_payments tp WHERE tp.transaction_id = t.id AND LOWER(TRIM(tp.method)) != 'credit'
         ))), 0) as total_outstanding
         FROM transactions t WHERE t.type = 'sell' AND t.is_gst = 0 AND t.status != 'Cancelled' AND ${bwT.clause}`,
        bwT.params
      );

      nonGstMetrics = {
        todaySalesCount: Number(todaySalesRows?.count || 0),
        todaySalesAmount: Number(todaySalesRows?.total || 0),
        todayCollection: Number(todayCollectionRows?.total || 0),
        bankBalance: Number(bankBalanceRows?.total || 0),
        cashBalance: Number(cashLogRows?.closing_balance || 0),
        customerOutstanding: Number(outstandingRows?.total_outstanding || 0),
      };
    }

    res.json({
      is_gst: isGstScope,
      totalQuotations: Number(qRows[0]?.total_quotations || 0),
      totalSales: Number(sRows[0]?.total_sales || 0),
      totalPurchases: Number(pRows[0]?.total_purchases || 0),
      totalRevenue: Number(sRows[0]?.total_revenue || 0),
      quotationRevenue: Number(qRows[0]?.revenue || 0),
      totalPurchaseValue: Number(pRows[0]?.total_purchase_value || 0),
      totalStockQuantity: Number(stockRows[0]?.total_stock_qty || 0),
      totalCustomers: Number(customerRows[0]?.total_customers || 0),
      totalProducts: Number(productRows[0]?.total_products || 0),
      ...nonGstMetrics,
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ message: err.message || "Failed to load dashboard summary" });
  }
};

exports.getMonthlySales = async (req, res) => {
  try {
    const fromDate = req.query.fromDate || null;
    const toDate = req.query.toDate || null;
    const branchId = getBranchId(req);
    const isGstScope = (req.isNonUser || req.query.is_gst === "0") ? 0 : 1;

    const bwT = branchWhere(branchId, "t");
    let whereS = ["t.type = 'sell'", "t.is_gst = ?", bwT.clause]; let paramsS = [isGstScope, ...bwT.params];
    ({ where: whereS, params: paramsS } = buildDateRange("t.sales_date", fromDate, toDate, whereS, paramsS));

    const rows = await runQuery(
      `SELECT ym, SUM(total) as total FROM (
         SELECT DATE_FORMAT(t.sales_date, '%Y-%m') AS ym, COALESCE(SUM(t.final_amount), 0) AS total
         FROM transactions t WHERE ${whereS.join(" AND ")}
         GROUP BY ym
       ) as t2
       GROUP BY ym ORDER BY ym ASC`, [...paramsS]);

    res.json({ labels: rows.map((r) => r.ym), values: rows.map((r) => Number(r.total || 0)) });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load monthly sales" });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const isGstScope = (req.isNonUser || req.query.is_gst === "0") ? 0 : 1;
    const bw = branchWhere(branchId, "t");
    let where = ["t.type = 'sell'", "t.is_gst = ?", "COALESCE(t.status, '') != 'Cancelled'", bw.clause];
    let params = [isGstScope, ...bw.params];
    ({ where, params } = buildDateRange("t.sales_date", req.query.fromDate, req.query.toDate, where, params));

    const rows = await runQuery(
      `SELECT
         MAX(COALESCE(p.id, tsl.product_id)) AS product_id,
         COALESCE(
           NULLIF(NULLIF(TRIM(tsl.product_name), ''), 'null'),
           NULLIF(NULLIF(TRIM(p.product_name), ''), 'null'),
           CASE WHEN COALESCE(p.id, tsl.product_id) IS NOT NULL THEN CONCAT('Product #', COALESCE(p.id, tsl.product_id)) ELSE NULL END,
           'Other Product'
         ) AS product_name,
         COALESCE(SUM(tsl.quantity), 0) AS total_qty
       FROM transaction_sell_lines tsl
       INNER JOIN transactions t ON t.id = tsl.transaction_id
       LEFT JOIN products p ON p.id = tsl.product_id
       WHERE ${where.join(" AND ")}
       GROUP BY product_name
       HAVING total_qty > 0 AND product_name IS NOT NULL AND product_name != '' AND LOWER(product_name) != 'null'
       ORDER BY total_qty DESC
       LIMIT 10`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error("Dashboard top-products error:", err);
    res.status(500).json({ message: err.message || "Failed to load top products" });
  }
};

exports.getProfitLoss = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const isGstScope = (req.isNonUser || req.query.is_gst === "0") ? 0 : 1;
    const bw = branchWhere(branchId, "t");
    let where = ["t.type = 'sell'", "t.is_gst = ?", "COALESCE(t.status, '') != 'Cancelled'", bw.clause];
    let params = [isGstScope, ...bw.params];
    ({ where, params } = buildDateRange("t.sales_date", req.query.fromDate, req.query.toDate, where, params));

    // Revenue = line total (unit_price_inc_tax already holds the line total) with GST removed.
    // Cost = quantity x weighted-average purchase price from stock_in.
    const rows = await runQuery(
      `SELECT pl.* FROM (
         SELECT
           x.product_id,
           x.product_name,
           COALESCE(SUM(x.qty), 0) AS qty_sold,
           COALESCE(SUM(x.net_revenue), 0) AS revenue,
           COALESCE(SUM(x.qty * COALESCE(x.avg_cost, 0)), 0) AS cost,
           COALESCE(SUM(x.net_revenue) / NULLIF(SUM(x.qty), 0), 0) AS sale_price,
           COALESCE(SUM(x.qty * COALESCE(x.avg_cost, 0)) / NULLIF(SUM(x.qty), 0), 0) AS purchase_price,
           MAX(CASE WHEN x.avg_cost IS NOT NULL THEN 1 ELSE 0 END) AS cost_known
         FROM (
           SELECT
             COALESCE(p.id, tsl.product_id) AS product_id,
             COALESCE(
               NULLIF(NULLIF(TRIM(tsl.product_name), ''), 'null'),
               NULLIF(NULLIF(TRIM(p.product_name), ''), 'null'),
               CASE WHEN COALESCE(p.id, tsl.product_id) IS NOT NULL THEN CONCAT('Product #', COALESCE(p.id, tsl.product_id)) ELSE NULL END,
               'Other Product'
             ) AS product_name,
             tsl.quantity AS qty,
             COALESCE(tsl.unit_price_inc_tax, tsl.unit_price * tsl.quantity, 0) /
               (1 + (CASE WHEN t.is_gst = 1 THEN COALESCE(
                  (SELECT SUM(tm.tax_rate) FROM tax_group_taxes tgt
                     INNER JOIN tax_modules tm ON tm.id = tgt.tax_module_id
                     WHERE tgt.tax_group_id = COALESCE(tsl.tax_group_id, t.tax_group_id)), 0)
                ELSE 0 END) / 100) AS net_revenue,
             sc.avg_cost
           FROM transaction_sell_lines tsl
           INNER JOIN transactions t ON t.id = tsl.transaction_id
           LEFT JOIN products p ON p.id = tsl.product_id
           LEFT JOIN (
             SELECT product_id,
                    SUM(COALESCE(total_purchase_price, qty * purchase_price)) / NULLIF(SUM(qty), 0) AS avg_cost
             FROM stock_in
             WHERE purchase_price IS NOT NULL AND qty > 0
             GROUP BY product_id
           ) sc ON sc.product_id = tsl.product_id
           WHERE ${where.join(" AND ")}
         ) x
         GROUP BY x.product_name, x.product_id
         HAVING SUM(x.qty) > 0 AND x.product_name IS NOT NULL AND LOWER(x.product_name) != 'null'
       ) pl
       ORDER BY (pl.revenue - pl.cost) DESC
       LIMIT 50`,
      params,
    );

    res.json(rows.map((r) => {
      const revenue = Number(r.revenue || 0);
      const cost = Number(r.cost || 0);
      const profit = revenue - cost;
      return {
        product_id: r.product_id,
        product_name: r.product_name,
        qty_sold: Number(r.qty_sold || 0),
        purchase_price: Number(r.purchase_price || 0),
        sale_price: Number(r.sale_price || 0),
        revenue: Number(revenue.toFixed(2)),
        cost: Number(cost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        margin_pct: revenue > 0 ? Number(((profit / revenue) * 100).toFixed(2)) : 0,
        cost_known: Number(r.cost_known) === 1,
      };
    }));
  } catch (err) {
    console.error("Dashboard profit-loss error:", err);
    res.status(500).json({ message: err.message || "Failed to load profit/loss data" });
  }
};

exports.getRecent = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const isGstScope = (req.isNonUser || req.query.is_gst === "0") ? 0 : 1;

    let recentQuotations = [];
    if (isGstScope !== 0) {
      const bwQ = branchWhere(branchId, "q");
      let whereQ = [bwQ.clause]; let paramsQ = [...bwQ.params];
      ({ where: whereQ, params: paramsQ } = buildDateRange("q.quotation_date", req.query.fromDate, req.query.toDate, whereQ, paramsQ));
      recentQuotations = await runQuery(
        `SELECT q.id, q.quotation_no, q.quotation_date, MAX(c.customer_name) AS customer_name,
                COALESCE(SUM(COALESCE(qi.total, COALESCE(qi.rate_1, 0) * COALESCE(qi.qty, 1))), 0) AS total
         FROM quotations q LEFT JOIN customers c ON c.id = q.customer_id
         LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
         WHERE ${whereQ.join(" AND ")} GROUP BY q.id, q.quotation_no, q.quotation_date ORDER BY q.quotation_date DESC, q.id DESC LIMIT 10`, paramsQ);
    }

    const bwT = branchWhere(branchId, "t");
    let whereS = ["t.type = 'sell'", "t.is_gst = ?", bwT.clause]; let paramsS = [isGstScope, ...bwT.params];
    ({ where: whereS, params: paramsS } = buildDateRange("t.sales_date", req.query.fromDate, req.query.toDate, whereS, paramsS));
    const recentSales = await runQuery(
      `SELECT t.id, t.invoice_no, t.sales_date, c.customer_name, t.final_amount AS total
       FROM transactions t LEFT JOIN customers c ON c.id = t.contact_id
       WHERE ${whereS.join(" AND ")} ORDER BY t.sales_date DESC, t.id DESC LIMIT 10`, paramsS);

    res.json({ recentQuotations, recentSales, recentServices: [] });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load recent documents" });
  }
};
