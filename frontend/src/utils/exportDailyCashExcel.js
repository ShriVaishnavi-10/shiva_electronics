import ExcelJS from "exceljs";

export const exportDailyCashToExcel = async ({ filteredData, filters, totalOpening, totalSales, totalPurchases, totalExpenses, totalExpected, getExpected, formatDateToDDMMYYYY }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Clavis Tech Billing";
  workbook.lastModifiedBy = "Admin";
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet("Daily Cash Report", {
    views: [{ showGridLines: true }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  // Theme Colors (Production UI palette)
  const NAVY_DARK = "1E293B";       // Slate 800 - Header
  const BRAND_BLUE = "1E3A8A";      // Blue 900 - Title
  const SUCCESS_GREEN = "059669";   // Emerald 600 - Sales
  const SUCCESS_LIGHT = "D1FAE5";   // Emerald 100 - Sales Fill
  const DANGER_RED = "DC2626";      // Red 600 - Expenses
  const DANGER_LIGHT = "FEE2E2";    // Red 100 - Expenses Fill
  const INFO_BLUE = "2563EB";       // Blue 600 - Expected
  const INFO_LIGHT = "DBEAFE";      // Blue 100 - Expected Fill
  const CARD_BG = "F8FAFC";         // Slate 50 - Card Fill
  const BORDER_COLOR = "CBD5E1";    // Slate 300 - Border

  // 1. Company Banner (Rows 1-2)
  sheet.mergeCells("A1:J1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "CLAVIS TECH WORKS - DAILY CASH REPORT";
  titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_BLUE } };
  sheet.getRow(1).height = 30;

  sheet.mergeCells("A2:J2");
  const subCell = sheet.getCell("A2");
  subCell.value = `Period: ${filters.fromDate || 'All'} to ${filters.toDate || 'All'}  |  Exported on: ${new Date().toLocaleString('en-IN')}`;
  subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "E2E8F0" } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2D3748" } };
  sheet.getRow(2).height = 20;

  // Empty row
  sheet.addRow([]);

  // 2. Summary KPI Cards Block (Rows 4-5)
  sheet.mergeCells("B4:C4");
  sheet.getCell("B4").value = "TOTAL OPENING BAL";
  sheet.getCell("B4").font = { name: "Arial", size: 9, bold: true, color: { argb: "64748B" } };
  sheet.getCell("B4").alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells("B5:C5");
  sheet.getCell("B5").value = totalOpening;
  sheet.getCell("B5").numFmt = "₹#,##0.00";
  sheet.getCell("B5").font = { name: "Arial", size: 14, bold: true, color: { argb: "0F172A" } };
  sheet.getCell("B5").alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells("D4:E4");
  sheet.getCell("D4").value = "TOTAL CASH SALES";
  sheet.getCell("D4").font = { name: "Arial", size: 9, bold: true, color: { argb: "065F46" } };
  sheet.getCell("D4").alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells("D5:E5");
  sheet.getCell("D5").value = totalSales;
  sheet.getCell("D5").numFmt = "₹#,##0.00";
  sheet.getCell("D5").font = { name: "Arial", size: 14, bold: true, color: { argb: SUCCESS_GREEN } };
  sheet.getCell("D5").alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells("F4:G4");
  sheet.getCell("F4").value = "TOTAL CASH EXPENSES";
  sheet.getCell("F4").font = { name: "Arial", size: 9, bold: true, color: { argb: "991B1B" } };
  sheet.getCell("F4").alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells("F5:G5");
  sheet.getCell("F5").value = totalExpenses;
  sheet.getCell("F5").numFmt = "₹#,##0.00";
  sheet.getCell("F5").font = { name: "Arial", size: 14, bold: true, color: { argb: DANGER_RED } };
  sheet.getCell("F5").alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells("H4:I4");
  sheet.getCell("H4").value = "EXPECTED CASH IN HAND";
  sheet.getCell("H4").font = { name: "Arial", size: 9, bold: true, color: { argb: "1E40AF" } };
  sheet.getCell("H4").alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells("H5:I5");
  sheet.getCell("H5").value = totalExpected;
  sheet.getCell("H5").numFmt = "₹#,##0.00";
  sheet.getCell("H5").font = { name: "Arial", size: 14, bold: true, color: { argb: INFO_BLUE } };
  sheet.getCell("H5").alignment = { horizontal: "center", vertical: "middle" };

  // Style KPI Card Backgrounds & Borders
  const styleBox = (startCol, endCol, bgColor) => {
    for (let r = 4; r <= 5; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = sheet.getRow(r).getCell(c);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
        cell.border = {
          top: { style: "thin", color: { argb: BORDER_COLOR } },
          bottom: { style: "thin", color: { argb: BORDER_COLOR } },
          left: { style: c === startCol ? "medium" : "thin", color: { argb: BORDER_COLOR } },
          right: { style: c === endCol ? "medium" : "thin", color: { argb: BORDER_COLOR } }
        };
      }
    }
  };

  styleBox(2, 3, CARD_BG);
  styleBox(4, 5, SUCCESS_LIGHT);
  styleBox(6, 7, DANGER_LIGHT);
  styleBox(8, 9, INFO_LIGHT);

  sheet.getRow(4).height = 18;
  sheet.getRow(5).height = 24;

  // Empty row
  sheet.addRow([]);

  // 3. Table Headers (Row 7)
  const headers = [
    "S.No",
    "Date",
    "Opening Bal (₹)",
    "Cash Sales (₹)",
    "Purchases (₹)",
    "Expenses (₹)",
    "Expected Cash (₹)",
    "Actual Cash (₹)",
    "Difference (₹)",
    "Status"
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.height = 26;

  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
    cell.alignment = {
      horizontal: colNumber === 1 || colNumber === 2 || colNumber === 9 || colNumber === 10 ? "center" : "right",
      vertical: "middle"
    };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_DARK } };
    cell.border = {
      top: { style: "medium", color: { argb: NAVY_DARK } },
      bottom: { style: "medium", color: { argb: NAVY_DARK } },
      left: { style: "thin", color: { argb: "475569" } },
      right: { style: "thin", color: { argb: "475569" } }
    };
  });

  // 4. Data Rows
  filteredData.forEach((h, index) => {
    const expected = getExpected(h);
    const isOpen = h.status === "Open";
    const hasActual = Number(h.actual_cash || 0) > 0;
    const diff = Number(h.difference || 0);

    const rowValues = [
      index + 1,
      formatDateToDDMMYYYY(h.date),
      Number(h.opening_balance || 0),
      Number(h.cash_sales || 0),
      Number(h.cash_purchases || 0),
      Number(h.cash_expenses || 0),
      expected,
      isOpen && !hasActual ? "Pending" : Number(h.actual_cash || 0),
      isOpen && !hasActual ? "In Progress" : diff,
      h.status || "Open"
    ];

    const row = sheet.addRow(rowValues);
    row.height = 22;

    const isEven = index % 2 === 0;
    const rowBg = isEven ? "FFFFFF" : "F8FAFC";

    row.eachCell((cell, colNumber) => {
      // Default font and fill
      cell.font = { name: "Arial", size: 9.5, color: { argb: "1E293B" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      cell.border = {
        top: { style: "thin", color: { argb: "E2E8F0" } },
        bottom: { style: "thin", color: { argb: "E2E8F0" } },
        left: { style: "thin", color: { argb: "E2E8F0" } },
        right: { style: "thin", color: { argb: "E2E8F0" } }
      };

      // Alignment and Formatting by column
      if (colNumber === 1 || colNumber === 2) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber >= 3 && colNumber <= 7) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = "₹#,##0.00";
        if (colNumber === 4) {
          cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: SUCCESS_GREEN } };
        } else if (colNumber === 5 || colNumber === 6) {
          cell.font = { name: "Arial", size: 9.5, color: { argb: DANGER_RED } };
        } else if (colNumber === 7) {
          cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: INFO_BLUE } };
        }
      } else if (colNumber === 8) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if (typeof cell.value === "number") {
          cell.numFmt = "₹#,##0.00";
          cell.font = { name: "Arial", size: 9.5, bold: true };
        } else {
          cell.font = { name: "Arial", size: 9, italic: true, color: { argb: "94A3B8" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
      } else if (colNumber === 9) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        if (typeof cell.value === "number") {
          cell.numFmt = "₹#,##0.00";
          if (cell.value === 0) {
            cell.font = { name: "Arial", size: 9, bold: true, color: { argb: SUCCESS_GREEN } };
          } else if (cell.value > 0) {
            cell.font = { name: "Arial", size: 9, bold: true, color: { argb: INFO_BLUE } };
          } else {
            cell.font = { name: "Arial", size: 9, bold: true, color: { argb: DANGER_RED } };
          }
        } else {
          cell.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "D97706" } };
        }
      } else if (colNumber === 10) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        if (cell.value === "Closed") {
          cell.font = { name: "Arial", size: 9, bold: true, color: { argb: SUCCESS_GREEN } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DEF7EC" } };
        } else {
          cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "B45309" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF3C7" } };
        }
      }
    });
  });

  // 5. Totals Row
  const totalRowValues = [
    "TOTALS",
    `${filteredData.length} Days`,
    totalOpening,
    totalSales,
    totalPurchases,
    totalExpenses,
    totalExpected,
    "",
    "",
    ""
  ];

  const totalRow = sheet.addRow(totalRowValues);
  totalRow.height = 26;

  totalRow.eachCell((cell, colNumber) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "0F172A" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };
    cell.border = {
      top: { style: "medium", color: { argb: "475569" } },
      bottom: { style: "double", color: { argb: "0F172A" } },
      left: { style: "thin", color: { argb: "CBD5E1" } },
      right: { style: "thin", color: { argb: "CBD5E1" } }
    };

    if (colNumber === 1 || colNumber === 2) {
      cell.alignment = { horizontal: "center", vertical: "middle" };
    } else if (colNumber >= 3 && colNumber <= 7) {
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.numFmt = "₹#,##0.00";
      if (colNumber === 4) cell.font = { name: "Arial", size: 10, bold: true, color: { argb: SUCCESS_GREEN } };
      if (colNumber === 5 || colNumber === 6) cell.font = { name: "Arial", size: 10, bold: true, color: { argb: DANGER_RED } };
      if (colNumber === 7) cell.font = { name: "Arial", size: 10.5, bold: true, color: { argb: INFO_BLUE } };
    }
  });

  // Column Widths
  sheet.columns = [
    { width: 8 },   // S.No
    { width: 14 },  // Date
    { width: 18 },  // Opening Bal
    { width: 18 },  // Cash Sales
    { width: 16 },  // Purchases
    { width: 16 },  // Expenses
    { width: 20 },  // Expected Cash
    { width: 18 },  // Actual Cash
    { width: 16 },  // Difference
    { width: 14 }   // Status
  ];

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Daily_Cash_Report_${filters.fromDate || 'All'}_to_${filters.toDate || 'All'}.xlsx`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  document.body.removeChild(link);
};
