const db = require("../config/db");
const { getBranchId, branchWhere } = require("../middleware/branchHelper");

exports.getLedger = async (req, res) => {
  const { contact_id, type, fromDate, toDate } = req.query;

  if (!contact_id || !type) {
    return res.status(400).json({ message: "contact_id and type are required" });
  }

  const branchId = getBranchId(req);
  const bw = branchWhere(branchId, "t");
  
  let ledgerEntries = [];

  try {
    let openingBalanceAmount = 0;
    let contactName = '';

    const isGstScope = (req.isNonUser || req.query.is_gst === "0") ? 0 : 1;

    if (type === "customer") {
      const [customerData] = await db.promise().query("SELECT opening_balance, customer_name FROM customers WHERE id = ?", [contact_id]);
      if (customerData.length) {
         openingBalanceAmount = Number(customerData[0].opening_balance) || 0;
         contactName = customerData[0].customer_name;
      }
      
      const salesSql = `
        SELECT 
          t.id, 
          t.sales_date as date, 
          t.invoice_no as ref_no, 
          'Sale' as entry_type,
          (SELECT GROUP_CONCAT(COALESCE(tsl.product_name, p.product_name) SEPARATOR ', ') FROM transaction_sell_lines tsl LEFT JOIN products p ON p.id = tsl.product_id WHERE tsl.transaction_id = t.id) as description,
          t.final_amount as debit,
          0 as credit,
          c.customer_name as contact_name,
          t.payment_status,
          t.status
        FROM transactions t
        LEFT JOIN customers c ON t.contact_id = c.id
        WHERE t.contact_id = ? AND t.type = 'sell' AND t.status = 'Final' AND t.is_gst = ?
        ${fromDate ? "AND t.sales_date >= ?" : ""}
        ${toDate ? "AND t.sales_date <= ?" : ""}
        ${branchId ? "AND " + bw.clause : ""}
      `;
      const salesParams = [contact_id, isGstScope];
      if (fromDate) salesParams.push(fromDate);
      if (toDate) salesParams.push(toDate);
      if (branchId) salesParams.push(...bw.params);

      const [sales] = await db.promise().query(salesSql, salesParams);

      const paymentsSql = `
        SELECT
          tp.id,
          tp.transaction_id,
          DATE(COALESCE(tp.created_at, t.sales_date)) as date,
          tp.created_at,
          t.invoice_no as ref_no,
          tp.method,
          tp.amount,
          ba.account_name as bank_account_name,
          tp.payment_ref_no,
          tp.payment_for,
          CONCAT('Payment via ', tp.method,
            IF(ba.account_name IS NOT NULL, CONCAT(' (', ba.account_name, ')'), ''),
            IF(tp.payment_ref_no IS NOT NULL AND tp.payment_ref_no != '', CONCAT(' - Ref: ', tp.payment_ref_no), ''),
            IF(tp.payment_for IS NOT NULL AND tp.payment_for != '', CONCAT(' - ', tp.payment_for), '')
          ) as description,
          c.customer_name as contact_name,
          'Paid' as status
        FROM transaction_payments tp
        JOIN transactions t ON t.id = tp.transaction_id
        LEFT JOIN customers c ON t.contact_id = c.id
        LEFT JOIN bank_accounts ba ON ba.id = tp.bank_account_id
        WHERE t.contact_id = ? AND t.type = 'sell' AND t.status = 'Final' AND t.is_gst = ?
          AND LOWER(TRIM(COALESCE(tp.method, ''))) != 'credit'
        ORDER BY tp.id ASC
      `;
      const [cPayments] = await db.promise().query(paymentsSql, [contact_id, isGstScope]);

      const paymentsByTx = {};
      for (const p of cPayments) {
        if (!paymentsByTx[p.transaction_id]) {
          paymentsByTx[p.transaction_id] = [];
        }
        paymentsByTx[p.transaction_id].push(p);
      }

      const matchedTxIds = new Set();
      for (const sale of sales) {
        matchedTxIds.add(sale.id);
        const txPayments = paymentsByTx[sale.id] || [];
        const totalPaid = txPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        sale.credit = totalPaid;
        sale.payments = txPayments;

        // ONLY display credit values sale. Do not display paid sale bills (fully settled or payment_status = 'paid')
        const billedAmount = Number(sale.debit) || 0;
        const isPaid = (billedAmount - totalPaid <= 0.01) || String(sale.payment_status || "").toLowerCase() === "paid";
        if (!isPaid) {
          ledgerEntries.push(sale);
        }
      }

      // If any payment was made for a transaction not in `sales` (e.g. sale date out of range):
      for (const p of cPayments) {
        if (!matchedTxIds.has(p.transaction_id)) {
          if (fromDate && p.date < fromDate) continue;
          if (toDate && p.date > toDate) continue;
          ledgerEntries.push({
            id: p.id,
            date: p.date,
            ref_no: p.ref_no,
            entry_type: 'Customer Payment',
            description: p.description,
            debit: 0,
            credit: Number(p.amount) || 0,
            contact_name: p.contact_name,
            status: 'Paid',
            payments: [p]
          });
        }
      }

    } else if (type === "vendor") {

      const [vendorData] = await db.promise().query("SELECT opening_balance, company_name FROM vendors WHERE id = ?", [contact_id]);
      if (vendorData.length) {
         openingBalanceAmount = Number(vendorData[0].opening_balance) || 0;
         contactName = vendorData[0].company_name;
      }

      const purchaseSql = `
        SELECT 
          p.id,
          p.purchase_date as date,
          p.purchase_no as ref_no,
          'Purchase' as entry_type,
          0 as debit,
          COALESCE((SELECT SUM(total) FROM purchase_items WHERE purchase_id = p.id), 0) as credit,
          v.company_name as contact_name,
          p.payment_type,
          p.payment_status,
          p.bank_account_id,
          ba.account_name as bank_account_name,
          (SELECT GROUP_CONCAT(COALESCE(pr.product_name, pi.product_name, 'Unknown Item') SEPARATOR ', ') 
           FROM purchase_items pi 
           LEFT JOIN products pr ON pi.product_id = pr.id 
           WHERE pi.purchase_id = p.id) as description,
          p.status
        FROM purchases p
        LEFT JOIN vendors v ON p.vendor_id = v.id
        LEFT JOIN bank_accounts ba ON ba.id = p.bank_account_id
        WHERE p.vendor_id = ?
        ${fromDate ? "AND p.purchase_date >= ?" : ""}
        ${toDate ? "AND p.purchase_date <= ?" : ""}
      `;
      const [purchases] = await db.promise().query(purchaseSql, [contact_id, ...(fromDate ? [fromDate] : []), ...(toDate ? [toDate] : [])]);

      const paymentsSql = `
        SELECT 
          vp.id,
          vp.purchase_id,
          vp.payment_date as date,
          vp.reference_no as ref_no,
          'Vendor Payment' as entry_type,
          vp.amount as debit,
          0 as credit,
          v.company_name as contact_name,
          vp.payment_method,
          vp.paid_from,
          vp.notes,
          vp.cheque_no,
          vp.cheque_date,
          vp.collection_person,
          ba.account_name as bank_account_name,
          CONCAT('Paid via ', COALESCE(vp.payment_method, vp.paid_from, 'Cash'),
            IF(vp.cheque_no IS NOT NULL AND vp.cheque_no != '', CONCAT(' (Chq #', vp.cheque_no, IF(vp.cheque_date IS NOT NULL, CONCAT(' Dt: ', DATE_FORMAT(vp.cheque_date, '%d-%m-%Y')), ''), ')'), ''),
            IF(vp.collection_person IS NOT NULL AND vp.collection_person != '', CONCAT(' [Collected by: ', vp.collection_person, ']'), ''),
            IF(ba.account_name IS NOT NULL, CONCAT(' [', ba.account_name, ']'), ''),
            IF(vp.notes IS NOT NULL AND vp.notes != '', CONCAT(' - ', vp.notes), '')
          ) as description,
          'Paid' as status
        FROM vendor_payments vp
        LEFT JOIN vendors v ON vp.vendor_id = v.id
        LEFT JOIN bank_accounts ba ON ba.id = vp.bank_account_id
        WHERE vp.vendor_id = ?
        ${fromDate ? "AND vp.payment_date >= ?" : ""}
        ${toDate ? "AND vp.payment_date <= ?" : ""}
      `;
      const [vPayments] = await db.promise().query(paymentsSql, [contact_id, ...(fromDate ? [fromDate] : []), ...(toDate ? [toDate] : [])]);

      const vPaymentsByRef = {};
      const unallocatedVps = [];
      for (const vp of vPayments) {
        const ref = (vp.ref_no || "").trim().toLowerCase();
        if (ref) {
          if (!vPaymentsByRef[ref]) vPaymentsByRef[ref] = [];
          vPaymentsByRef[ref].push(vp);
        } else {
          unallocatedVps.push(vp);
        }
      }

      const matchedVpIds = new Set();
      for (const purchase of purchases) {
        const pRef = (purchase.ref_no || "").trim().toLowerCase();
        const pType = (purchase.payment_type || "").trim();
        const isCreditPurchase = !pType || pType.toLowerCase() === "credit";
        const purchaseTotal = Number(purchase.credit) || 0;
        purchase.credit = purchaseTotal;
        const matchingPays = [];

        // 1. Initial payment recorded upon purchase creation if not credit
        if (!isCreditPurchase && purchaseTotal > 0) {
          matchingPays.push({
            id: `init_${purchase.id}`,
            date: purchase.date,
            method: pType,
            amount: purchaseTotal,
            paid_from: purchase.bank_account_name || pType,
            bank_account_name: purchase.bank_account_name,
            payment_ref_no: purchase.ref_no,
            payment_for: "Paid at Purchase",
            description: `Payment via ${pType}${purchase.bank_account_name ? ` (${purchase.bank_account_name})` : ""}`
          });
        }

        // 2. Matching vendor_payments made against this purchase reference or purchase_id
        const matchingVps = vPayments.filter(vp => {
          if (vp.purchase_id && Number(vp.purchase_id) === Number(purchase.id)) return true;
          const vpRef = (vp.ref_no || "").trim().toLowerCase();
          const vpNotes = (vp.notes || "").toLowerCase();
          return (pRef && vpRef === pRef) || (pRef && vpNotes.includes(pRef));
        });

        for (const vp of matchingVps) {
          matchedVpIds.add(vp.id);
          matchingPays.push({
            id: vp.id,
            date: vp.date,
            method: vp.payment_method || vp.paid_from || "Vendor Payment",
            amount: Number(vp.debit) || 0,
            paid_from: vp.paid_from,
            bank_account_name: vp.bank_account_name,
            payment_ref_no: vp.ref_no,
            payment_for: vp.notes,
            cheque_no: vp.cheque_no,
            cheque_date: vp.cheque_date,
            collection_person: vp.collection_person,
            description: vp.description
          });
        }

        purchase.matchingPays = matchingPays;
      }

      // 3. Auto-allocate remaining unallocated payments to purchases that have balance due
      for (const vp of vPayments) {
        if (matchedVpIds.has(vp.id)) continue;
        let remainingVpAmount = Number(vp.debit) || 0;

        for (const purchase of purchases) {
          if (remainingVpAmount <= 0) break;
          const purchaseTotal = Number(purchase.credit) || 0;
          const currentPaid = purchase.matchingPays.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          const remainingDue = purchaseTotal - currentPaid;

          if (remainingDue > 0) {
            const allocatedAmount = Math.min(remainingVpAmount, remainingDue);
            matchedVpIds.add(vp.id);
            purchase.matchingPays.push({
              id: vp.id,
              date: vp.date,
              method: vp.payment_method || vp.paid_from || "Vendor Payment",
              amount: allocatedAmount,
              paid_from: vp.paid_from,
              bank_account_name: vp.bank_account_name,
              payment_ref_no: vp.ref_no || purchase.ref_no,
              payment_for: vp.notes,
              cheque_no: vp.cheque_no,
              cheque_date: vp.cheque_date,
              collection_person: vp.collection_person,
              description: vp.description
            });
            remainingVpAmount -= allocatedAmount;
          }
        }
      }

      // Finalize each purchase row
      for (const purchase of purchases) {
        const totalPaid = purchase.matchingPays.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        purchase.debit = totalPaid;
        purchase.payments = purchase.matchingPays;
        delete purchase.matchingPays;

        // ONLY display credit values purchase. Do not display paid purchase bills (fully settled or payment_status = 'paid')
        const purchaseTotal = Number(purchase.credit) || 0;
        const isPaid = (purchaseTotal - totalPaid <= 0.01) || String(purchase.payment_status || "").toLowerCase() === "paid";
        if (!isPaid) {
          ledgerEntries.push(purchase);
        }
      }

      // Standalone vendor payments not linked to any purchase
      for (const vp of vPayments) {
        if (!matchedVpIds.has(vp.id)) {
          ledgerEntries.push({
            ...vp,
            payments: [{
              id: vp.id,
              date: vp.date,
              method: vp.payment_method || vp.paid_from || "Vendor Payment",
              amount: Number(vp.debit) || 0,
              paid_from: vp.paid_from,
              bank_account_name: vp.bank_account_name,
              payment_ref_no: vp.ref_no,
              payment_for: vp.notes,
              cheque_no: vp.cheque_no,
              cheque_date: vp.cheque_date,
              collection_person: vp.collection_person,
              description: vp.description
            }]
          });
        }
      }
    }

    ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (openingBalanceAmount !== 0) {
      ledgerEntries.unshift({
        id: 'ob',
        date: '',
        ref_no: 'OB',
        entry_type: 'Opening Balance',
        description: 'Opening Balance',
        debit: type === "customer" ? openingBalanceAmount : 0,
        credit: type === "vendor" ? openingBalanceAmount : 0,
        contact_name: contactName,
        status: 'Final'
      });
    }

    let balance = 0;
    ledgerEntries = ledgerEntries.map(entry => {
      balance += (Number(entry.debit) || 0) - (Number(entry.credit) || 0);
      return { ...entry, balance };
    });

    res.json(ledgerEntries);

  } catch (error) {
    console.error("Ledger Error:", error);
    res.status(500).json({ message: "Failed to fetch ledger", error: error.message });
  }
};

exports.getCustomerBalance = async (req, res) => {
  const { id } = req.params;
  const { exclude_service_id } = req.query;
  
  try {
    const [customerData] = await db.promise().query("SELECT opening_balance FROM customers WHERE id = ?", [id]);
    const openingBalance = customerData.length ? (Number(customerData[0].opening_balance) || 0) : 0;

    const [sales] = await db.promise().query(
      "SELECT SUM(final_amount) as total FROM transactions WHERE contact_id = ? AND type = 'sell' AND status = 'Final'",
      [id]
    );
    
    const [payments] = await db.promise().query(
      "SELECT SUM(tp.amount) as total FROM transaction_payments tp JOIN transactions t ON t.id = tp.transaction_id WHERE t.contact_id = ? AND t.type = 'sell'",
      [id]
    );

    const debit = openingBalance + (Number(sales[0].total) || 0);
    const credit = (Number(payments[0].total) || 0);
    
    res.json({ balance: debit - credit });

  } catch (error) {
    res.status(500).json({ message: "Error fetching balance", error: error.message });
  }
};
