import ExcelJS from "exceljs";

/**
 * Formats date into DD/MM/YY or DD/MM/YYYY matching the user image
 */
const formatStatementDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

/**
 * Export bank account statement to Excel matching the exact user UI design
 */
export const exportBankStatementToExcel = async ({
  transactions = [],
  account = {},
  statementData = {},
  fromDate = "",
  toDate = "",
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Clavis Tech Billing";
  workbook.lastModifiedBy = "Admin";
  workbook.created = new Date();
  workbook.modified = new Date();

  const safeSheetName = (account.account_name || "Bank Statement").slice(0, 31).replace(/[:\\/?*[\]]/g, "_");
  const sheet = workbook.addWorksheet(safeSheetName, {
    views: [{ showGridLines: true }],
  });

  // Theme Colors matching user image
  const NAVY_HEADER_BG = "FF0F2942";    // Dark navy blue
  const TOTALS_BG = "FFF1F5F9";         // Light gray for totals row
  const BORDER_LIGHT = "FFE2E8F0";      // Subtle cell border
  const BORDER_TOTALS = "FFCBD5E1";     // Totals row border

  // 1. Column Definitions
  sheet.columns = [
    { key: "s_no", width: 8 },
    { key: "date", width: 14 },
    { key: "transaction_no", width: 18 },
    { key: "type", width: 24 },
    { key: "description", width: 38 },
    { key: "party", width: 22 },
    { key: "payment_mode", width: 16 },
    { key: "reference_no", width: 24 },
    { key: "debit", width: 14 },
    { key: "credit", width: 14 },
    { key: "running_balance", width: 20 },
  ];

  // 2. Header Row (Row 1)
  const headerValues = [
    "S.No",
    "Date",
    "Transaction No",
    "Type",
    "Description",
    "Party / Beneficiary",
    "Payment Mode",
    "Reference No",
    "Debit (₹)",
    "Credit (₹)",
    "Running Balance (₹)",
  ];

  const headerRow = sheet.addRow(headerValues);
  headerRow.height = 28;

  headerRow.eachCell((cell, colNumber) => {
    cell.font = {
      name: "Calibri",
      size: 10.5,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NAVY_HEADER_BG },
    };
    cell.alignment = {
      horizontal: colNumber === 1 || colNumber === 2 || colNumber === 7 || colNumber >= 9 ? "center" : "left",
      vertical: "middle",
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF2B4968" } },
      bottom: { style: "thin", color: { argb: "FF2B4968" } },
      left: { style: "thin", color: { argb: "FF2B4968" } },
      right: { style: "thin", color: { argb: "FF2B4968" } },
    };
  });

  // Track Totals
  let sumDebit = 0;
  let sumCredit = 0;

  // 3. Data Rows
  transactions.forEach((tx, idx) => {
    const debitVal = Number(tx.debit) || 0;
    const creditVal = Number(tx.credit) || 0;
    const runningBalVal = Number(tx.running_balance) || 0;

    sumDebit += debitVal;
    sumCredit += creditVal;

    const rowValues = [
      idx + 1,
      formatStatementDate(tx.date),
      tx.transaction_no || "—",
      tx.transaction_type || "—",
      tx.description || "—",
      tx.party_name || "—",
      tx.payment_mode || "—",
      tx.reference_no || "—",
      debitVal % 1 === 0 ? debitVal : Number(debitVal.toFixed(2)),
      creditVal % 1 === 0 ? creditVal : Number(creditVal.toFixed(2)),
      runningBalVal % 1 === 0 ? runningBalVal : Number(runningBalVal.toFixed(2)),
    ];

    const row = sheet.addRow(rowValues);
    row.height = 22;

    const typeStr = String(tx.transaction_type || "").toLowerCase();
    const modeStr = String(tx.payment_mode || "").toLowerCase();
    const isOutflow = debitVal > 0 || typeStr.includes("refund") || typeStr.includes("expense");

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: "Calibri", size: 10, color: { argb: "FF000000" } };
      cell.border = {
        top: { style: "thin", color: { argb: BORDER_LIGHT } },
        bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
        left: { style: "thin", color: { argb: BORDER_LIGHT } },
        right: { style: "thin", color: { argb: BORDER_LIGHT } },
      };

      if (colNumber === 1) {
        // S.No
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber === 2) {
        // Date
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber === 3) {
        // Transaction No
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else if (colNumber === 4) {
        // Type badge styling
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.font = { name: "Calibri", size: 10, bold: true };
        if (isOutflow) {
          // Soft light red fill with red text
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
          cell.font.color = { argb: "FFC62828" };
        } else {
          // Soft light green fill with green text
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F8F0" } };
          cell.font.color = { argb: "FF15803D" };
        }
      } else if (colNumber === 5) {
        // Description
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else if (colNumber === 6) {
        // Party / Beneficiary
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else if (colNumber === 7) {
        // Payment Mode badge styling
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { name: "Calibri", size: 10, bold: true };
        if (modeStr.includes("upi")) {
          // Soft purple fill with purple text
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E8FF" } };
          cell.font.color = { argb: "FF7E22CE" };
        } else if (modeStr.includes("cash")) {
          // Soft blue fill with blue text
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0EDFD" } };
          cell.font.color = { argb: "FF1D4ED8" };
        } else {
          // Soft indigo fill
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
          cell.font.color = { argb: "FF4338CA" };
        }
      } else if (colNumber === 8) {
        // Reference No
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else if (colNumber === 9) {
        // Debit (₹)
        cell.alignment = { horizontal: "center", vertical: "middle" };
        if (debitVal > 0) {
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFC62828" } };
        }
      } else if (colNumber === 10) {
        // Credit (₹)
        cell.alignment = { horizontal: "center", vertical: "middle" };
        if (creditVal > 0) {
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF2E7D32" } };
        }
      } else if (colNumber === 11) {
        // Running Balance (₹)
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF000000" } };
      }
    });
  });

  // 4. Totals Row
  const finalClosingBal = transactions.length > 0
    ? Number(transactions[transactions.length - 1].running_balance) || 0
    : Number(statementData.closing_balance) || 0;

  const totalsRowValues = [
    "TOTAL — Statement Period Totals",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    sumDebit % 1 === 0 ? sumDebit : Number(sumDebit.toFixed(2)),
    sumCredit % 1 === 0 ? sumCredit : Number(sumCredit.toFixed(2)),
    finalClosingBal % 1 === 0 ? finalClosingBal : Number(finalClosingBal.toFixed(2)),
  ];

  const totalsRow = sheet.addRow(totalsRowValues);
  totalsRow.height = 24;

  totalsRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF000000" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTALS_BG } };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER_TOTALS } },
      bottom: { style: "thin", color: { argb: BORDER_TOTALS } },
      left: { style: "thin", color: { argb: BORDER_LIGHT } },
      right: { style: "thin", color: { argb: BORDER_LIGHT } },
    };

    if (colNumber === 1) {
      cell.alignment = { horizontal: "left", vertical: "middle" };
    } else if (colNumber >= 9) {
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
  });

  // 5. Blank Row
  sheet.addRow([]);

  // 6. Transaction Ledger — Summary
  const summaryTitleRow = sheet.addRow([]);
  summaryTitleRow.height = 24;
  const titleCell = summaryTitleRow.getCell(1);
  titleCell.value = "Transaction Ledger — Summary";
  titleCell.font = { name: "Calibri", size: 13, bold: true, color: { argb: "FF0F172A" } };
  titleCell.alignment = { horizontal: "left", vertical: "middle" };

  // Subtitle: Generated on ... | Opening balance: ₹...
  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  const openingBal = Number(statementData.opening_balance || 0);
  const formattedOpening = openingBal.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const summarySubtitleRow = sheet.addRow([]);
  summarySubtitleRow.height = 20;
  const subCell = summarySubtitleRow.getCell(1);
  subCell.value = `Generated on ${dateStr} | Opening balance: ₹${formattedOpening}`;
  subCell.font = { name: "Calibri", size: 9.5, color: { argb: "FF64748B" } };
  subCell.alignment = { horizontal: "left", vertical: "middle" };

  // 7. Summary KPI 2x2 Grid (Rows 9 & 10 from image)
  // Row 1: Total Transactions (Col A:B) | Total Debit (Col C:D)
  const kpiRow1 = sheet.addRow([]);
  kpiRow1.height = 24;

  const cellA1 = kpiRow1.getCell(1); // Total Transactions label
  cellA1.value = "Total Transactions";
  cellA1.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF475569" } };
  cellA1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  cellA1.alignment = { horizontal: "left", vertical: "middle" };
  cellA1.border = {
    top: { style: "thin", color: { argb: BORDER_TOTALS } },
    bottom: { style: "thin", color: { argb: BORDER_TOTALS } },
    left: { style: "thin", color: { argb: BORDER_TOTALS } },
    right: { style: "thin", color: { argb: BORDER_TOTALS } },
  };

  const cellB1 = kpiRow1.getCell(2); // Total Transactions value
  cellB1.value = transactions.length;
  cellB1.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
  cellB1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  cellB1.alignment = { horizontal: "center", vertical: "middle" };
  cellB1.border = {
    top: { style: "thin", color: { argb: BORDER_TOTALS } },
    bottom: { style: "thin", color: { argb: BORDER_TOTALS } },
    left: { style: "thin", color: { argb: BORDER_TOTALS } },
    right: { style: "thin", color: { argb: BORDER_TOTALS } },
  };

  const cellC1 = kpiRow1.getCell(3); // Total Debit label
  cellC1.value = "Total Debit";
  cellC1.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF991B1B" } };
  cellC1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
  cellC1.alignment = { horizontal: "left", vertical: "middle" };
  cellC1.border = {
    top: { style: "thin", color: { argb: "FFFCA5A5" } },
    bottom: { style: "thin", color: { argb: "FFFCA5A5" } },
    left: { style: "thin", color: { argb: "FFFCA5A5" } },
    right: { style: "thin", color: { argb: "FFFCA5A5" } },
  };

  const cellD1 = kpiRow1.getCell(4); // Total Debit value
  const displayTotalDebit = sumDebit % 1 === 0 ? sumDebit : Number(sumDebit.toFixed(2));
  cellD1.value = displayTotalDebit;
  cellD1.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF991B1B" } };
  cellD1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
  cellD1.alignment = { horizontal: "center", vertical: "middle" };
  cellD1.border = {
    top: { style: "thin", color: { argb: "FFFCA5A5" } },
    bottom: { style: "thin", color: { argb: "FFFCA5A5" } },
    left: { style: "thin", color: { argb: "FFFCA5A5" } },
    right: { style: "thin", color: { argb: "FFFCA5A5" } },
  };

  // Row 2: Total Credit (Col A:B) | Closing Balance (Col C:D)
  const kpiRow2 = sheet.addRow([]);
  kpiRow2.height = 24;

  const cellA2 = kpiRow2.getCell(1); // Total Credit label
  cellA2.value = "Total Credit";
  cellA2.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF166534" } };
  cellA2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
  cellA2.alignment = { horizontal: "left", vertical: "middle" };
  cellA2.border = {
    top: { style: "thin", color: { argb: "FF86EFAC" } },
    bottom: { style: "thin", color: { argb: "FF86EFAC" } },
    left: { style: "thin", color: { argb: "FF86EFAC" } },
    right: { style: "thin", color: { argb: "FF86EFAC" } },
  };

  const cellB2 = kpiRow2.getCell(2); // Total Credit value
  const displayTotalCredit = sumCredit % 1 === 0 ? sumCredit : Number(sumCredit.toFixed(2));
  cellB2.value = displayTotalCredit;
  cellB2.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF166534" } };
  cellB2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
  cellB2.alignment = { horizontal: "center", vertical: "middle" };
  cellB2.border = {
    top: { style: "thin", color: { argb: "FF86EFAC" } },
    bottom: { style: "thin", color: { argb: "FF86EFAC" } },
    left: { style: "thin", color: { argb: "FF86EFAC" } },
    right: { style: "thin", color: { argb: "FF86EFAC" } },
  };

  const cellC2 = kpiRow2.getCell(3); // Closing Balance label
  cellC2.value = "Closing Balance";
  cellC2.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
  cellC2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  cellC2.alignment = { horizontal: "left", vertical: "middle" };
  cellC2.border = {
    top: { style: "thin", color: { argb: BORDER_TOTALS } },
    bottom: { style: "thin", color: { argb: BORDER_TOTALS } },
    left: { style: "thin", color: { argb: BORDER_TOTALS } },
    right: { style: "thin", color: { argb: BORDER_TOTALS } },
  };

  const cellD2 = kpiRow2.getCell(4); // Closing Balance value
  const displayClosingBal = finalClosingBal % 1 === 0 ? finalClosingBal : Number(finalClosingBal.toFixed(2));
  cellD2.value = displayClosingBal;
  cellD2.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0F172A" } };
  cellD2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  cellD2.alignment = { horizontal: "center", vertical: "middle" };
  cellD2.border = {
    top: { style: "thin", color: { argb: BORDER_TOTALS } },
    bottom: { style: "thin", color: { argb: BORDER_TOTALS } },
    left: { style: "thin", color: { argb: BORDER_TOTALS } },
    right: { style: "thin", color: { argb: BORDER_TOTALS } },
  };

  // 8. Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  const safeName = (account.account_name || "Account").replace(/[^a-zA-Z0-9]/g, "_");
  link.download = `${safeName}_Statement_${fromDate || "all"}_to_${toDate || "now"}.xlsx`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  document.body.removeChild(link);
};
