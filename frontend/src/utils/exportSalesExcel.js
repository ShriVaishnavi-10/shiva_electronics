import ExcelJS from "exceljs";

/**
 * Formats a date string/ISO into DD/MM/YY (e.g., 12/09/26) matching the template
 */
const formatDDMMYY = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

/**
 * Export sales list to Excel matching the exact visual UI template from the user
 */
export const exportSalesToExcel = async ({
  data = [],
  fromDate = "",
  toDate = "",
  isNonUser = false,
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Clavis Tech Billing";
  workbook.lastModifiedBy = "Admin";
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet(isNonUser ? "Non-GST Sales" : "Sales List", {
    views: [{ showGridLines: true }],
  });

  // Colors based on user image template
  const HEADER_BG = "FF1A3E2F";       // Dark forest pine green
  const HEADER_TEXT = "FFFFFFFF";     // Pure white
  const TOTALS_BG = "FFF1F5F9";       // Light slate gray for totals row
  const BORDER_COLOR = "FFCBD5E1";    // Subtle grid border
  const BORDER_LIGHT = "FFE2E8F0";    // Light cell border

  // 1. Define Columns matching the user image
  sheet.columns = [
    { key: "date", width: 14 },
    { key: "customer_name", width: 24 },
    { key: "contact_number", width: 18 },
    { key: "product_name", width: 26 },
    { key: "location", width: 20 },
    { key: "payment_status", width: 16 },
    { key: "payment_method", width: 16 },
    { key: "total_qty", width: 12 },
    { key: "total_amount", width: 16 },
    { key: "total_paid", width: 16 },
    { key: "balance_credit", width: 18 },
  ];

  // 2. Add Header Row (Row 1)
  const headerValues = [
    "Date",
    "Customer Name",
    "Contact Number",
    "Product Name",
    "Location",
    "Payment Status",
    "Payment Method",
    "Total Qty",
    "Total Amount",
    "Total Paid",
    "Balance / Credit",
  ];

  const headerRow = sheet.addRow(headerValues);
  headerRow.height = 28;

  headerRow.eachCell((cell, colNumber) => {
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: HEADER_TEXT },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_BG },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF2E5644" } },
      bottom: { style: "thin", color: { argb: "FF2E5644" } },
      left: { style: "thin", color: { argb: "FF2E5644" } },
      right: { style: "thin", color: { argb: "FF2E5644" } },
    };
  });

  // Track totals for the Totals row and Summary Details
  let sumQty = 0;
  let sumAmount = 0;
  let sumPaid = 0;
  let sumDue = 0;
  let sumCash = 0;
  let sumBank = 0;

  // 3. Add Data Rows
  data.forEach((r) => {
    const isCancelled = String(r.status || "").toLowerCase() === "cancelled";
    const totalAmount = Number(r.total_amount) || 0;
    const totalPaid = Number(r.total_paid) || 0;
    const remainingAmount = r.remaining_amount != null
      ? Number(r.remaining_amount)
      : Math.max(0, totalAmount - totalPaid);

    const isFullyPaid = !isCancelled && (r.payment_status === "paid" || remainingAmount <= 0.001);
    const isPartial = !isCancelled && !isFullyPaid && (r.payment_status === "partial" || totalPaid > 0);

    let statusDisplay = isCancelled
      ? "Cancelled"
      : isFullyPaid
      ? "Paid"
      : isPartial
      ? "Partial"
      : "Due";

    // Products formatting
    const items = Array.isArray(r.items) ? r.items : [];
    const pNames = items.length > 0
      ? items.map((it) => it.product_name ?? "—").filter(Boolean).join(", ")
      : "—";

    const qty = Number(r.total_qty) || (items.length > 0 ? items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 1);
    const displayQty = qty % 1 === 0 ? qty : Number(qty.toFixed(2));
    const displayAmount = totalAmount % 1 === 0 ? totalAmount : Number(totalAmount.toFixed(2));
    const displayPaid = totalPaid % 1 === 0 ? totalPaid : Number(totalPaid.toFixed(2));

    // Balance display in template: "900.00 due" if positive, "0" if 0
    let balanceDisplay = remainingAmount > 0.001 ? `${remainingAmount.toFixed(2)} due` : "0";

    // Payment method string
    const rawMethod = r.payment_method ? String(r.payment_method).trim() : "Cash";
    const methodDisplay = rawMethod ? rawMethod.charAt(0).toUpperCase() + rawMethod.slice(1).toLowerCase() : "Cash";

    if (!isCancelled) {
      sumQty += qty;
      sumAmount += totalAmount;
      sumPaid += totalPaid;
      sumDue += remainingAmount;

      if (methodDisplay.toLowerCase().includes("cash")) {
        sumCash += totalPaid;
      } else {
        sumBank += totalPaid;
      }
    }

    const rowData = [
      formatDDMMYY(r.date),
      r.customer_name || "—",
      r.contact_number || "—",
      pNames,
      r.location || "—",
      statusDisplay,
      methodDisplay,
      displayQty,
      displayAmount,
      displayPaid,
      balanceDisplay,
    ];

    const row = sheet.addRow(rowData);
    row.height = 22;

    // Apply specific cell styling to match the image UI
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: "Calibri", size: 10.5, color: { argb: "FF000000" } };
      cell.border = {
        top: { style: "thin", color: { argb: BORDER_LIGHT } },
        bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
        left: { style: "thin", color: { argb: BORDER_LIGHT } },
        right: { style: "thin", color: { argb: BORDER_LIGHT } },
      };

      // Column specific alignment & styling
      if (colNumber === 1) {
        // Date
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber === 2) {
        // Customer Name
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else if (colNumber === 3) {
        // Contact Number
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber === 4) {
        // Product Name
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber === 5) {
        // Location
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber === 6) {
        // Payment Status badge styling
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { name: "Calibri", size: 10.5, bold: true };

        if (statusDisplay === "Partial") {
          // Peach background with warm brown text
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE8CD" } };
          cell.font.color = { argb: "FFA0522D" };
        } else if (statusDisplay === "Paid") {
          // Soft green background with forest green text
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD5EED8" } };
          cell.font.color = { argb: "FF15803D" };
        } else if (statusDisplay === "Due") {
          // Soft red background with red text
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
          cell.font.color = { argb: "FFDC2626" };
        } else {
          // Cancelled
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
          cell.font.color = { argb: "FF6B7280" };
        }
      } else if (colNumber === 7) {
        // Payment Method badge styling (Soft blue background with blue text)
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0EDFD" } };
        cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF1E62D0" } };
      } else if (colNumber === 8) {
        // Total Qty
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber === 9) {
        // Total Amount
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber === 10) {
        // Total Paid
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber === 11) {
        // Balance / Credit
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { name: "Calibri", size: 10.5, bold: true };
        if (remainingAmount > 0.001) {
          // Red text for due balance
          cell.font.color = { argb: "FFC0392B" };
        } else {
          // Green text for zero balance
          cell.font.color = { argb: "FF15803D" };
        }
      }
    });
  });

  // 4. Totals Row
  const totalBalanceDisplay = sumDue > 0.001 ? `${sumDue.toFixed(2)} due` : "0";
  const totalsRowValues = [
    "Totals",
    "",
    "",
    "",
    "",
    "",
    "",
    sumQty % 1 === 0 ? sumQty : Number(sumQty.toFixed(2)),
    sumAmount % 1 === 0 ? sumAmount : Number(sumAmount.toFixed(2)),
    sumPaid % 1 === 0 ? sumPaid : Number(sumPaid.toFixed(2)),
    totalBalanceDisplay,
  ];

  const totalsRow = sheet.addRow(totalsRowValues);
  totalsRow.height = 24;

  totalsRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTALS_BG } };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER_COLOR } },
      bottom: { style: "thin", color: { argb: BORDER_COLOR } },
      left: { style: "thin", color: { argb: BORDER_LIGHT } },
      right: { style: "thin", color: { argb: BORDER_LIGHT } },
    };

    if (colNumber === 1) {
      cell.alignment = { horizontal: "left", vertical: "middle" };
    } else if (colNumber >= 8 && colNumber <= 10) {
      cell.alignment = { horizontal: "center", vertical: "middle" };
    } else if (colNumber === 11) {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      if (sumDue > 0.001) {
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFC0392B" } };
      } else {
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF15803D" } };
      }
    }
  });

  // 5. Blank Rows as seen in the image
  for (let i = 0; i < 5; i++) {
    sheet.addRow([]);
  }

  // 6. "SUMMERY DETAILS" Section (Matching user image UI)
  // Placement: Column C and Column D
  // Row A: Header "SUMMERY DETAILS"
  // Row B: "CASH" (green font) | Total Cash (white text, green solid fill)
  // Row C: "CREDIT" (red font) | Total Due (white text, red solid fill)

  // Ensure cash matches total paid if all was cash or default
  const finalCashValue = sumBank > 0 ? (sumCash % 1 === 0 ? sumCash : Number(sumCash.toFixed(2))) : (sumPaid % 1 === 0 ? sumPaid : Number(sumPaid.toFixed(2)));
  const finalCreditValue = sumDue % 1 === 0 ? sumDue : Number(sumDue.toFixed(2));

  // Summary Title Row
  const summaryTitleRow = sheet.addRow([]);
  summaryTitleRow.height = 22;
  const titleCell = summaryTitleRow.getCell(3); // Column C
  titleCell.value = "SUMMERY DETAILS";
  titleCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // CASH Row
  const cashRow = sheet.addRow([]);
  cashRow.height = 24;

  const cashLabelCell = cashRow.getCell(3); // Column C
  cashLabelCell.value = "CASH";
  cashLabelCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF16A34A" } }; // Green text
  cashLabelCell.alignment = { horizontal: "center", vertical: "middle" };
  cashLabelCell.border = {
    top: { style: "thin", color: { argb: BORDER_LIGHT } },
    bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
    left: { style: "thin", color: { argb: BORDER_LIGHT } },
    right: { style: "thin", color: { argb: BORDER_LIGHT } },
  };

  const cashValCell = cashRow.getCell(4); // Column D
  cashValCell.value = finalCashValue;
  cashValCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } }; // White text
  cashValCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4CAF50" } }; // Solid green background
  cashValCell.alignment = { horizontal: "center", vertical: "middle" };
  cashValCell.border = {
    top: { style: "thin", color: { argb: BORDER_LIGHT } },
    bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
    left: { style: "thin", color: { argb: BORDER_LIGHT } },
    right: { style: "thin", color: { argb: BORDER_LIGHT } },
  };

  // If there's any bank payment, include BANK row
  if (sumBank > 0) {
    const bankRow = sheet.addRow([]);
    bankRow.height = 24;

    const bankLabelCell = bankRow.getCell(3);
    bankLabelCell.value = "BANK";
    bankLabelCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF2563EB" } };
    bankLabelCell.alignment = { horizontal: "center", vertical: "middle" };
    bankLabelCell.border = {
      top: { style: "thin", color: { argb: BORDER_LIGHT } },
      bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
      left: { style: "thin", color: { argb: BORDER_LIGHT } },
      right: { style: "thin", color: { argb: BORDER_LIGHT } },
    };

    const bankValCell = bankRow.getCell(4);
    bankValCell.value = sumBank % 1 === 0 ? sumBank : Number(sumBank.toFixed(2));
    bankValCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    bankValCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    bankValCell.alignment = { horizontal: "center", vertical: "middle" };
    bankValCell.border = {
      top: { style: "thin", color: { argb: BORDER_LIGHT } },
      bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
      left: { style: "thin", color: { argb: BORDER_LIGHT } },
      right: { style: "thin", color: { argb: BORDER_LIGHT } },
    };
  }

  // CREDIT Row
  const creditRow = sheet.addRow([]);
  creditRow.height = 24;

  const creditLabelCell = creditRow.getCell(3); // Column C
  creditLabelCell.value = "CREDIT";
  creditLabelCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFDC2626" } }; // Red text
  creditLabelCell.alignment = { horizontal: "center", vertical: "middle" };
  creditLabelCell.border = {
    top: { style: "thin", color: { argb: BORDER_LIGHT } },
    bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
    left: { style: "thin", color: { argb: BORDER_LIGHT } },
    right: { style: "thin", color: { argb: BORDER_LIGHT } },
  };

  const creditValCell = creditRow.getCell(4); // Column D
  creditValCell.value = finalCreditValue;
  creditValCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } }; // White text
  creditValCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } }; // Solid red background
  creditValCell.alignment = { horizontal: "center", vertical: "middle" };
  creditValCell.border = {
    top: { style: "thin", color: { argb: BORDER_LIGHT } },
    bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
    left: { style: "thin", color: { argb: BORDER_LIGHT } },
    right: { style: "thin", color: { argb: BORDER_LIGHT } },
  };

  // 7. Write to buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  const filePrefix = isNonUser ? "non_gst_sales_list" : "sales_list";
  link.download = `${filePrefix}_${fromDate || "all"}_${toDate || "all"}.xlsx`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  document.body.removeChild(link);
};
