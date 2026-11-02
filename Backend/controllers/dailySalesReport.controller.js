const db = require("../config/db");
const { getBranchId, branchWhere } = require("../middleware/branchHelper");

/**
 * Controller for the complete Daily Sales Report
 * Handles sales, individual payment breakdown, payment mode collections,
 * daily expenses, and opening/closing cash flow reconciliation.
 */
exports.getDailySalesReport = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const bw = branchWhere(branchId, "t");

    const todayStr = new Date().toISOString().slice(0, 10);
    const fromDate = req.query.fromDate || req.query.date || todayStr;
    const toDate = req.query.toDate || req.query.date || todayStr;
    const {
      customerId,
      paymentMode,
      paymentStatus,
      bankAccountId,
      billType,
      search,
    } = req.query;

    const isGstScope = (req.isNonUser || req.query.is_gst === "0") ? 0 : 1;

    // -------------------------------------------------------------
    // 1. Fetch Sales on the Selected Date Range
    // -------------------------------------------------------------
    const salesWhereParts = [
      "t.type = 'sell'",
      "t.is_gst = ?",
      bw.clause,
      "t.sales_date >= ?",
      "t.sales_date <= ?",
    ];
    const salesParams = [isGstScope, ...bw.params, fromDate, toDate];

    if (customerId && customerId !== "all") {
      salesWhereParts.push("t.contact_id = ?");
      salesParams.push(customerId);
    }

    if (billType === "tax") {
      salesWhereParts.push("(t.tax_amount > 0 OR t.tax_group_id IS NOT NULL)");
    } else if (billType === "non-tax") {
      salesWhereParts.push("(IFNULL(t.tax_amount, 0) <= 0 AND t.tax_group_id IS NULL)");
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      const cleanQ = `%${search.trim().replace(/[-\s]/g, "")}%`;
      salesWhereParts.push(
        `(` +
          `LOWER(t.invoice_no) LIKE LOWER(?) ` +
          `OR REPLACE(REPLACE(LOWER(t.invoice_no), '-', ''), ' ', '') LIKE LOWER(?) ` +
          `OR CAST(t.id AS CHAR) = ? ` +
          `OR c.customer_name LIKE ? ` +
          `OR c.contact_no LIKE ? ` +
          `OR IFNULL(c.gst_no, '') LIKE ? ` +
          `OR EXISTS (` +
            `SELECT 1 FROM transaction_sell_lines tsl_s ` +
            `LEFT JOIN products p_s ON p_s.id = tsl_s.product_id ` +
            `WHERE tsl_s.transaction_id = t.id AND (` +
              `tsl_s.product_name LIKE ? OR p_s.product_name LIKE ?` +
            `)` +
          `)` +
        `)`
      );
      salesParams.push(q, cleanQ, search.trim(), q, q, q, q, q);
    }

    const salesSql = `
      SELECT
        t.id,
        t.invoice_no,
        t.sales_date,
        t.created_at,
        t.final_amount,
        t.total_before_tax,
        t.tax_amount,
        t.discount_amount,
        t.discount_type,
        t.status,
        t.payment_status AS raw_payment_status,
        c.id AS customer_id,
        c.customer_name,
        c.contact_no,
        c.gst_no,
        c.city AS customer_city,
        COALESCE(bl.name, b.branch_name, 'Main') AS location_name,
        (
          SELECT COUNT(*)
          FROM transaction_sell_lines tsl
          WHERE tsl.transaction_id = t.id
        ) AS total_items,
        (
          SELECT COALESCE(SUM(tsl.quantity), 0)
          FROM transaction_sell_lines tsl
          WHERE tsl.transaction_id = t.id
        ) AS total_quantity
      FROM transactions t
      LEFT JOIN customers c ON c.id = t.contact_id
      LEFT JOIN business_location bl ON bl.id = t.business_id
      LEFT JOIN branches b ON b.id = t.branch_id
      WHERE ${salesWhereParts.join(" AND ")}
      ORDER BY t.sales_date DESC, t.id DESC
    `;

    const [rawSales] = await db.promise().query(salesSql, salesParams);
    const saleIds = rawSales.map((s) => s.id);

    // Fetch all payments for these sales to calculate accurate advance, paid, and outstanding
    let salePaymentsMap = {};
    if (saleIds.length > 0) {
      const [payments] = await db.promise().query(
        `
        SELECT
          tp.id,
          tp.transaction_id,
          tp.amount,
          tp.method,
          tp.payment_for,
          tp.payment_ref_no,
          tp.card_number,
          tp.bank_account_id,
          tp.created_at,
          ba.account_name AS bank_account_name,
          ba.bank_name
        FROM transaction_payments tp
        LEFT JOIN bank_accounts ba ON ba.id = tp.bank_account_id
        WHERE tp.transaction_id IN (?)
        ORDER BY tp.id ASC
      `,
        [saleIds]
      );

      payments.forEach((p) => {
        if (!salePaymentsMap[p.transaction_id]) {
          salePaymentsMap[p.transaction_id] = [];
        }
        salePaymentsMap[p.transaction_id].push(p);
      });
    }

    // Build enriched sales array
    let totalSalesCount = 0;
    let totalSaleAmount = 0;
    let totalDiscountAmount = 0;
    let totalSalesPaid = 0;
    let totalOutstandingAmount = 0;

    const enrichedSales = rawSales
      .map((s) => {
        const payments = salePaymentsMap[s.id] || [];
        const nonCreditPayments = payments.filter(
          (p) => String(p.method || "").toLowerCase() !== "credit"
        );

        const totalPaid = nonCreditPayments.reduce(
          (sum, p) => sum + (Number(p.amount) || 0),
          0
        );
        const finalAmt = Number(s.final_amount) || 0;
        const discountAmt = Number(s.discount_amount) || 0;
        const outstanding = Math.max(0, finalAmt - totalPaid);

        // Advance is the first payment made at time of sale creation
        const firstPayment = nonCreditPayments[0] || null;
        const advancePaid = firstPayment ? Number(firstPayment.amount) || 0 : 0;
        const advanceMethod = firstPayment ? firstPayment.method : null;

        // Balance payments are subsequent payments
        const subsequentPayments = nonCreditPayments.slice(1);
        const balancePaid = subsequentPayments.reduce(
          (sum, p) => sum + (Number(p.amount) || 0),
          0
        );

        let derivedStatus = "due";
        if (totalPaid >= finalAmt && finalAmt > 0) {
          derivedStatus = "paid";
        } else if (totalPaid > 0) {
          derivedStatus = "partial";
        }

        // Format created time
        let timeStr = "";
        if (s.created_at) {
          const d = new Date(s.created_at);
          timeStr = !isNaN(d.getTime())
            ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
            : "";
        }

        return {
          id: s.id,
          invoice_no: s.invoice_no || `SE-${s.id}`,
          date: s.sales_date,
          time: timeStr,
          created_at: s.created_at,
          customer_id: s.customer_id,
          customer_name: s.customer_name || "Walk-in Customer",
          contact_no: s.contact_no || "-",
          gst_no: s.gst_no || "-",
          location: s.location_name,
          total_items: s.total_items,
          total_quantity: Number(s.total_quantity || 0),
          total_amount: finalAmt,
          discount_amount: discountAmt,
          discount_type: s.discount_type,
          advance_paid: advancePaid,
          advance_method: advanceMethod,
          balance_paid: balancePaid,
          total_paid: totalPaid,
          outstanding,
          payment_status: derivedStatus,
          payments: nonCreditPayments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            method: p.method,
            payment_for: p.payment_for,
            ref_no: p.payment_ref_no || p.card_number || "-",
            bank_account_name: p.bank_account_name,
            created_at: p.created_at,
          })),
        };
      })
      .filter((s) => {
        // Optional client filter on payment status
        if (paymentStatus && paymentStatus !== "all" && s.payment_status !== paymentStatus) {
          return false;
        }
        // Optional client filter on payment mode
        if (paymentMode && paymentMode !== "all") {
          const hasMode = s.payments.some(
            (p) => String(p.method).toLowerCase() === String(paymentMode).toLowerCase()
          );
          if (!hasMode) return false;
        }
        // Optional client filter on bank account
        if (bankAccountId && bankAccountId !== "all") {
          const hasBank = s.payments.some(
            (p) => String(p.bank_account_id) === String(bankAccountId)
          );
          if (!hasBank) return false;
        }
        return true;
      });

    enrichedSales.forEach((s) => {
      totalSalesCount += 1;
      totalSaleAmount += s.total_amount;
      totalDiscountAmount += s.discount_amount;
      totalSalesPaid += s.total_paid;
      totalOutstandingAmount += s.outstanding;
    });

    // -------------------------------------------------------------
    // 2. Fetch Payment Transactions Recorded on Date Range
    // (Actual money collected on this day, including both advances & balance payments)
    // -------------------------------------------------------------
    const payWhereParts = [
      "DATE(tp.created_at) >= ?",
      "DATE(tp.created_at) <= ?",
      "LOWER(TRIM(tp.method)) != 'credit'",
      "t.is_gst = ?",
    ];
    const payParams = [fromDate, toDate, isGstScope];

    if (branchId) {
      payWhereParts.push("COALESCE(t.branch_id, 1) = ?");
      payParams.push(branchId);
    }

    if (paymentMode && paymentMode !== "all") {
      payWhereParts.push("LOWER(tp.method) = LOWER(?)");
      payParams.push(paymentMode);
    }

    if (bankAccountId && bankAccountId !== "all") {
      payWhereParts.push("tp.bank_account_id = ?");
      payParams.push(bankAccountId);
    }

    if (customerId && customerId !== "all") {
      payWhereParts.push("t.contact_id = ?");
      payParams.push(customerId);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      const cleanQ = `%${search.trim().replace(/[-\s]/g, "")}%`;
      payWhereParts.push(
        `(` +
          `LOWER(t.invoice_no) LIKE LOWER(?) ` +
          `OR REPLACE(REPLACE(LOWER(t.invoice_no), '-', ''), ' ', '') LIKE LOWER(?) ` +
          `OR c.customer_name LIKE ? ` +
          `OR c.contact_no LIKE ? ` +
          `OR tp.payment_ref_no LIKE ? ` +
          `OR tp.card_number LIKE ? ` +
          `OR CAST(tp.id AS CHAR) = ?` +
        `)`
      );
      payParams.push(q, cleanQ, q, q, q, q, search.trim());
    }

    const paymentsSql = `
      SELECT
        tp.id,
        tp.transaction_id,
        tp.amount,
        tp.method,
        tp.payment_for,
        tp.payment_ref_no,
        tp.card_number,
        tp.created_at,
        tp.bank_account_id,
        t.invoice_no,
        t.sales_date,
        t.final_amount AS sale_total_amount,
        c.customer_name,
        c.contact_no,
        ba.account_name AS bank_account_name,
        ba.bank_name
      FROM transaction_payments tp
      JOIN transactions t ON t.id = tp.transaction_id
      LEFT JOIN customers c ON c.id = t.contact_id
      LEFT JOIN bank_accounts ba ON ba.id = tp.bank_account_id
      WHERE ${payWhereParts.join(" AND ")}
      ORDER BY tp.created_at DESC, tp.id DESC
    `;

    const [dailyPaymentRows] = await db.promise().query(paymentsSql, payParams);

    // Grouping by payment modes
    let cashCollection = 0;
    let bankCollection = 0;
    let upiCollection = 0;
    let chequeCollection = 0;
    let otherCollection = 0;
    let totalAdvanceReceived = 0;
    let totalBalanceReceived = 0;

    const formattedPayments = dailyPaymentRows.map((p) => {
      const amt = Number(p.amount) || 0;
      const m = String(p.method || "").toLowerCase().trim();

      // Categorize payment mode
      if (m === "cash") {
        cashCollection += amt;
      } else if (
        m.includes("upi") ||
        m.includes("gpay") ||
        m.includes("phonepe") ||
        m.includes("paytm")
      ) {
        upiCollection += amt;
      } else if (
        m.includes("bank") ||
        m.includes("neft") ||
        m.includes("rtgs") ||
        m.includes("transfer")
      ) {
        bankCollection += amt;
      } else if (m === "cheque" || m === "check") {
        chequeCollection += amt;
      } else {
        otherCollection += amt;
      }

      // Categorize payment type
      const pFor = String(p.payment_for || "").toLowerCase();
      let pType = "Payment";
      if (pFor.includes("advance")) {
        pType = "Advance Payment";
        totalAdvanceReceived += amt;
      } else if (pFor.includes("balance") || pFor.includes("partial")) {
        pType = "Balance Payment";
        totalBalanceReceived += amt;
      } else {
        // Check if single full payment or fallback
        pType = "Full / Settlement Payment";
      }

      const pDate = new Date(p.created_at);
      const timeStr = !isNaN(pDate.getTime())
        ? pDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
        : "";
      const dateStr = !isNaN(pDate.getTime())
        ? pDate.toISOString().slice(0, 10)
        : p.sales_date;

      return {
        id: p.id,
        transaction_id: p.transaction_id,
        invoice_no: p.invoice_no || `SE-${p.transaction_id}`,
        payment_date: dateStr,
        payment_time: timeStr,
        created_at: p.created_at,
        customer_name: p.customer_name || "Walk-in Customer",
        contact_no: p.contact_no || "-",
        payment_type: pType,
        payment_mode: p.method,
        amount: amt,
        reference_no: p.payment_ref_no || p.card_number || "-",
        bank_account_name: p.bank_account_name || (m === "cash" ? "Cash Account" : "-"),
        bank_name: p.bank_name || "",
        is_cash: m === "cash",
      };
    });

    const totalCollectedToday =
      cashCollection + bankCollection + upiCollection + chequeCollection + otherCollection;

    // -------------------------------------------------------------
    // 3. Fetch Daily Expenses for Date Range
    // -------------------------------------------------------------
    const expWhereParts = [
      "e.expense_date >= ?",
      "e.expense_date <= ?",
    ];
    const expParams = [fromDate, toDate];
    if (isGstScope === 0) {
      expWhereParts.push("e.is_gst = 0");
    }
    if (branchId) {
      expWhereParts.push("COALESCE(e.branch_id, 1) = ?");
      expParams.push(branchId);
    }

    const expSql = `
      SELECT
        e.id,
        e.reference_no,
        e.expense_date,
        e.amount,
        e.payment_mode,
        e.notes,
        c.name AS category_name,
        ba.account_name AS bank_account_name
      FROM expenses e
      LEFT JOIN expense_categories c ON c.id = e.category_id
      LEFT JOIN bank_accounts ba ON ba.id = e.payment_account_id
      WHERE ${expWhereParts.join(" AND ")}
      ORDER BY e.expense_date DESC, e.id DESC
    `;

    const [expenseRows] = await db.promise().query(expSql, expParams);

    let cashExpenses = 0;
    let bankExpenses = 0;

    const formattedExpenses = expenseRows.map((e) => {
      const amt = Number(e.amount) || 0;
      const isCash = String(e.payment_mode || "").toLowerCase() === "cash";
      if (isCash) {
        cashExpenses += amt;
      } else {
        bankExpenses += amt;
      }
      return {
        id: e.id,
        reference_no: e.reference_no,
        date: e.expense_date,
        amount: amt,
        payment_mode: e.payment_mode || "Cash",
        category_name: e.category_name || "General Expense",
        notes: e.notes || "-",
        bank_account_name: e.bank_account_name || (isCash ? "Cash in Hand" : "-"),
        is_cash: isCash,
      };
    });

    const totalExpenses = cashExpenses + bankExpenses;

    // -------------------------------------------------------------
    // 4. Daily Financial Reconciliation (Cash Flow & Balances)
    // -------------------------------------------------------------
    // Look up opening cash balance from daily_cash_logs
    let openingCashBalance = 0;
    let dayLogStatus = "Open";

    const [logRows] = await db.promise().query(
      "SELECT opening_balance, status, closing_balance FROM daily_cash_logs WHERE date = ? AND branch_id = ? AND is_gst = ? LIMIT 1",
      [fromDate, branchId || 1, isGstScope]
    );

    if (logRows.length > 0) {
      openingCashBalance = Number(logRows[0].opening_balance) || 0;
      dayLogStatus = logRows[0].status || "Open";
    } else {
      // Fallback: previous day's closing balance
      const [prevLogs] = await db.promise().query(
        "SELECT closing_balance FROM daily_cash_logs WHERE date < ? AND branch_id = ? AND is_gst = ? ORDER BY date DESC LIMIT 1",
        [fromDate, branchId || 1, isGstScope]
      );
      if (prevLogs.length > 0) {
        openingCashBalance = Number(prevLogs[0].closing_balance) || 0;
      }
    }

    const netCashFlow = cashCollection - cashExpenses;
    const closingCashBalance = openingCashBalance + netCashFlow;

    // -------------------------------------------------------------
    // 5. Send Complete Report Payload
    // -------------------------------------------------------------
    res.json({
      success: true,
      report_date: fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`,
      from_date: fromDate,
      to_date: toDate,
      filters_applied: {
        customerId: customerId || "all",
        paymentMode: paymentMode || "all",
        paymentStatus: paymentStatus || "all",
        bankAccountId: bankAccountId || "all",
        billType: billType || "all",
        search: search || "",
      },
      summary: {
        total_sales_count: totalSalesCount,
        total_sale_amount: Number(totalSaleAmount.toFixed(2)),
        total_discount: Number(totalDiscountAmount.toFixed(2)),
        total_sales_paid: Number(totalSalesPaid.toFixed(2)),
        total_outstanding: Number(totalOutstandingAmount.toFixed(2)),
        total_collected_today: Number(totalCollectedToday.toFixed(2)),
        total_advance_received: Number(totalAdvanceReceived.toFixed(2)),
        total_balance_received: Number(totalBalanceReceived.toFixed(2)),
        cancelled_amount: 0,
      },
      mode_summary: {
        cash_total: Number(cashCollection.toFixed(2)),
        bank_total: Number(bankCollection.toFixed(2)),
        upi_total: Number(upiCollection.toFixed(2)),
        cheque_total: Number(chequeCollection.toFixed(2)),
        other_total: Number(otherCollection.toFixed(2)),
        grand_total: Number(totalCollectedToday.toFixed(2)),
      },
      financial_summary: {
        opening_cash_balance: Number(openingCashBalance.toFixed(2)),
        cash_sales: Number(cashCollection.toFixed(2)),
        bank_collections: Number((bankCollection + upiCollection).toFixed(2)),
        upi_collections: Number(upiCollection.toFixed(2)),
        cash_expenses: Number(cashExpenses.toFixed(2)),
        bank_expenses: Number(bankExpenses.toFixed(2)),
        total_expenses: Number(totalExpenses.toFixed(2)),
        total_collection: Number(totalCollectedToday.toFixed(2)),
        net_cash_flow: Number(netCashFlow.toFixed(2)),
        closing_cash_balance: Number(closingCashBalance.toFixed(2)),
        day_status: dayLogStatus,
      },
      sales: enrichedSales,
      payments: formattedPayments,
      expenses: formattedExpenses,
    });
  } catch (err) {
    console.error("Daily Sales Report Error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to generate daily sales report",
    });
  }
};
