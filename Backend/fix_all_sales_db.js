const db = require('./config/db');

console.log("Fixing transaction_sell_lines and transactions for GST Inclusive Model...");

const taxGroupQuery = `
  SELECT tgt.tax_group_id, COALESCE(SUM(tm.tax_rate), 0) AS total_rate
  FROM tax_group_taxes tgt
  INNER JOIN tax_modules tm ON tm.id = tgt.tax_module_id
  GROUP BY tgt.tax_group_id
`;

db.query(taxGroupQuery, (taxErr, taxRows) => {
  if (taxErr) {
    console.error("Tax group query error:", taxErr);
    process.exit(1);
  }
  const taxRateMap = {};
  (taxRows || []).forEach((r) => {
    taxRateMap[r.tax_group_id] = Number(r.total_rate) || 0;
  });

  // Step 1: Update unit_price_inc_tax in transaction_sell_lines to (quantity * unit_price)
  const updateLinesSql = `
    UPDATE transaction_sell_lines
    SET unit_price_inc_tax = ROUND(COALESCE(quantity, 0) * COALESCE(unit_price, 0), 2)
  `;

  db.query(updateLinesSql, (lineUpdErr, lineUpdRes) => {
    if (lineUpdErr) {
      console.error("Line update error:", lineUpdErr);
      process.exit(1);
    }
    console.log(`Updated unit_price_inc_tax for sell lines.`);

    // Step 2: Recalculate transactions table totals
    const txQuery = `
      SELECT t.id, t.tax_group_id
      FROM transactions t
      WHERE t.type = 'sell'
    `;

    db.query(txQuery, (txErr, transactions) => {
      if (txErr) {
        console.error("Transactions fetch error:", txErr);
        process.exit(1);
      }

      if (!transactions || transactions.length === 0) {
        console.log("No transactions to update.");
        process.exit(0);
      }

      let completed = 0;
      transactions.forEach((tx) => {
        const linesSql = `
          SELECT tsl.id, tsl.quantity, tsl.unit_price, tsl.unit_price_inc_tax, tsl.tax_group_id
          FROM transaction_sell_lines tsl
          WHERE tsl.transaction_id = ?
        `;

        db.query(linesSql, [tx.id], (linesErr, lines) => {
          let calcTaxableSum = 0;
          let calcTaxSum = 0;
          let calcTotalSum = 0;

          (lines || []).forEach((line) => {
            const qty = Number(line.quantity) || 1;
            const unitPrice = Number(line.unit_price) || 0;
            const rowTotal = Number(line.unit_price_inc_tax) || (qty * unitPrice);
            const grpId = line.tax_group_id != null ? line.tax_group_id : tx.tax_group_id;
            const gstRate = grpId && taxRateMap[grpId] ? taxRateMap[grpId] : 0;
            const taxable = gstRate > 0 ? rowTotal / (1 + gstRate / 100) : rowTotal;
            const taxAmt = rowTotal - taxable;

            calcTaxableSum += taxable;
            calcTaxSum += taxAmt;
            calcTotalSum += rowTotal;
          });

          const taxAmount = Number(calcTaxSum.toFixed(2));
          const totalBeforeTax = Number(calcTaxableSum.toFixed(2));
          const finalAmount = Math.round(calcTotalSum);

          const updateTxSql = `
            UPDATE transactions
            SET tax_amount = ?, total_before_tax = ?, final_amount = ?
            WHERE id = ?
          `;

          db.query(updateTxSql, [taxAmount, totalBeforeTax, finalAmount, tx.id], () => {
            completed++;
            if (completed === transactions.length) {
              console.log(`Successfully recalculated ${transactions.length} sales transactions in database.`);
              process.exit(0);
            }
          });
        });
      });
    });
  });
});
