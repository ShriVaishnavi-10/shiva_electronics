import ExcelJS from "exceljs";

const formatDDMMYY = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    const s = String(val).slice(0, 10);
    const p = s.split("-");
    if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
    return String(val);
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// Helper to style a range of cells (vital for merged cells in ExcelJS)
const styleRange = (sheet, startRow, startCol, endRow, endCol, style) => {
  for (let r = startRow; r <= endRow; r++) {
    const row = sheet.getRow(r);
    for (let c = startCol; c <= endCol; c++) {
      const cell = row.getCell(c);
      if (style.fill) cell.fill = style.fill;
      if (style.border) cell.border = style.border;
      if (style.font) cell.font = style.font;
      if (style.alignment) cell.alignment = style.alignment;
      if (style.numFmt) cell.numFmt = style.numFmt;
    }
  }
};

/**
 * Export Individual Sales Person Report to Excel (.xlsx)
 */
export const exportSingleSalesPersonExcel = async ({
  salesPerson = {},
  invoices = [],
  period = "",
  branchName = "SHIVA ELECTRONICS",
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Shiva Electronics ERP";
  workbook.lastModifiedBy = "Admin";
  workbook.created = new Date();

  const safeName = (salesPerson.name || "Executive").replace(/[/\\?%*:|"<>]/g, "");
  const sheet = workbook.addWorksheet(`${safeName}`.slice(0, 31), {
    views: [{ showGridLines: true }],
  });

  // Color Palette
  const COLOR_HEADER_BG = "FF1E293B"; // Dark Slate
  const COLOR_SUBHEADER_BG = "FF334155"; // Medium Slate
  const COLOR_LABEL_BG = "FFF1F5F9"; // Light Gray-Blue
  const COLOR_CARD_BG = "FFF8FAFC"; // Subtle Off-White
  const COLOR_CARD_GREEN_BG = "FFF0FDF4"; // Light Emerald
  const COLOR_CARD_RED_BG = "FFFEF2F2"; // Light Rose
  const COLOR_TOTAL_BG = "FFF1F5F9"; // Total Row Gray
  const BORDER_LIGHT = "FFE2E8F0";
  const BORDER_MED = "FFCBD5E1";
  const BORDER_DARK = "FF0F172A";

  // Define 11 Column Widths for Perfect Alignment
  sheet.columns = [
    { key: "sno", width: 7 },              // Col 1: S.No
    { key: "date", width: 14 },             // Col 2: Sales Date
    { key: "invoice_no", width: 18 },       // Col 3: Invoice No
    { key: "customer_name", width: 26 },    // Col 4: Customer Name
    { key: "customer_phone", width: 16 },   // Col 5: Customer Phone
    { key: "products", width: 36 },         // Col 6: Products Sold
    { key: "qty", width: 10 },              // Col 7: Qty
    { key: "amount", width: 18 },           // Col 8: Invoice Amount (₹)
    { key: "payment_status", width: 16 },   // Col 9: Payment Status
    { key: "commission", width: 18 },       // Col 10: Commission (₹)
    { key: "commission_status", width: 16 },// Col 11: Comm Status
  ];

  // ----------------------------------------------------
  // ROW 1: Main Title Banner (Merged A1:K1)
  // ----------------------------------------------------
  const titleRow = sheet.addRow([`${branchName} - SALES EXECUTIVE PERFORMANCE REPORT`]);
  sheet.mergeCells("A1:K1");
  titleRow.height = 32;
  styleRange(sheet, 1, 1, 1, 11, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_HEADER_BG } },
    font: { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      top: { style: "thin", color: { argb: COLOR_HEADER_BG } },
      bottom: { style: "thin", color: { argb: COLOR_HEADER_BG } },
      left: { style: "thin", color: { argb: COLOR_HEADER_BG } },
      right: { style: "thin", color: { argb: COLOR_HEADER_BG } },
    },
  });

  // ----------------------------------------------------
  // ROW 2: Subtitle Period & Timestamp (Merged A2:K2)
  // ----------------------------------------------------
  const subRow = sheet.addRow([`Report Period: ${period || "All Time"}    |    Generated: ${new Date().toLocaleString("en-IN")}`]);
  sheet.mergeCells("A2:K2");
  subRow.height = 22;
  styleRange(sheet, 2, 1, 2, 11, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_BG } },
    font: { name: "Calibri", size: 9.5, italic: true, color: { argb: "FF475569" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      bottom: { style: "thin", color: { argb: BORDER_MED } },
      left: { style: "thin", color: { argb: BORDER_MED } },
      right: { style: "thin", color: { argb: BORDER_MED } },
    },
  });

  // ROW 3: Spacer
  const r3 = sheet.addRow([]);
  r3.height = 10;

  // ----------------------------------------------------
  // ROW 4: Executive Details Header (Merged A4:K4)
  // ----------------------------------------------------
  const secRow = sheet.addRow(["EXECUTIVE PROFILE & TARGET DETAILS"]);
  sheet.mergeCells("A4:K4");
  secRow.height = 22;
  styleRange(sheet, 4, 1, 4, 11, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_LABEL_BG } },
    font: { name: "Calibri", size: 10, bold: true, color: { argb: "FF334155" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      top: { style: "thin", color: { argb: BORDER_MED } },
      bottom: { style: "thin", color: { argb: BORDER_MED } },
      left: { style: "thin", color: { argb: BORDER_MED } },
      right: { style: "thin", color: { argb: BORDER_MED } },
    },
  });

  // Calculated metrics
  const code = salesPerson.employee_code || `SP-${salesPerson.id || ""}`;
  const target = Number(salesPerson.target_amount || 0);
  const totalSales = Number(salesPerson.total_sales || 0);
  const commEarned = Number(salesPerson.commission_earned || 0);
  const commPaid = Number(salesPerson.commission_paid || 0);
  const balance = Number(salesPerson.commission_balance || 0);
  const targetPct = salesPerson.target_achieved_pct ?? (target > 0 ? Math.round((totalSales / target) * 100) : 0);
  const commStructure = salesPerson.commission_type === "fixed"
    ? `₹${salesPerson.commission_rate} per invoice`
    : `${salesPerson.commission_rate}% of sales`;

  // ----------------------------------------------------
  // ROW 5, 6, 7: Profile Key-Value Grid (Structured across 11 cols)
  // ----------------------------------------------------
  // Row 5: Name (A..D), Employee Code (E..G), Status (H..K)
  const pRow1 = sheet.addRow([
    "Executive Name", "", salesPerson.name || "—", "",
    "Employee Code", "", code,
    "Status", "", salesPerson.status || "Active", ""
  ]);
  pRow1.height = 22;
  sheet.mergeCells("A5:B5");
  sheet.mergeCells("C5:D5");
  sheet.mergeCells("E5:F5");
  sheet.mergeCells("H5:I5");
  sheet.mergeCells("J5:K5");

  // Row 6: Phone (A..D), Email (E..G), Commission Structure (H..K)
  const pRow2 = sheet.addRow([
    "Contact Phone", "", salesPerson.phone || "—", "",
    "Email Address", "", salesPerson.email || "—",
    "Commission Rate", "", commStructure, ""
  ]);
  pRow2.height = 22;
  sheet.mergeCells("A6:B6");
  sheet.mergeCells("C6:D6");
  sheet.mergeCells("E6:F6");
  sheet.mergeCells("H6:I6");
  sheet.mergeCells("J6:K6");

  // Row 7: Target Amount (A..D), Target Achieved % (E..G), Total Invoices (H..K)
  const pRow3 = sheet.addRow([
    "Monthly Target", "", target, "",
    "Target Achieved", "", `${targetPct}%`,
    "Total Invoices", "", `${invoices.length} Bills`, ""
  ]);
  pRow3.height = 22;
  sheet.mergeCells("A7:B7");
  sheet.mergeCells("C7:D7");
  sheet.mergeCells("E7:F7");
  sheet.mergeCells("H7:I7");
  sheet.mergeCells("J7:K7");

  // Style rows 5-7
  [5, 6, 7].forEach((r) => {
    styleRange(sheet, r, 1, r, 11, {
      border: {
        top: { style: "thin", color: { argb: BORDER_LIGHT } },
        bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
        left: { style: "thin", color: { argb: BORDER_LIGHT } },
        right: { style: "thin", color: { argb: BORDER_LIGHT } },
      },
      font: { name: "Calibri", size: 10, color: { argb: "FF0F172A" } },
      alignment: { vertical: "middle" },
    });

    // Style Label Columns (A..B, E..F, H..I)
    [1, 2, 5, 6, 8, 9].forEach((col) => {
      const c = sheet.getRow(r).getCell(col);
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_LABEL_BG } };
      c.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FF475569" } };
      c.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Style Value Columns
    const row = sheet.getRow(r);
    row.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(3).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
    row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(7).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
    row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(10).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
  });

  // Target amount currency format in C7
  sheet.getRow(7).getCell(3).numFmt = '"₹" #,##0.00';
  sheet.getRow(7).getCell(3).alignment = { horizontal: "left", vertical: "middle" };

  // Status color in J5
  sheet.getRow(5).getCell(10).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF15803D" } };

  // ROW 8: Spacer
  const r8 = sheet.addRow([]);
  r8.height = 10;

  // ----------------------------------------------------
  // ROW 9 & 10: 4 Key Performance Indicator (KPI) Metric Cards
  // A..C (Card 1), D..E (Card 2), F..H (Card 3), I..K (Card 4)
  // ----------------------------------------------------
  const kpiLabelRow = sheet.addRow([
    "TOTAL SALES (₹)", "", "",
    "COMMISSION EARNED", "",
    "COMMISSION PAID", "", "",
    "BALANCE DUE (₹)", "", ""
  ]);
  kpiLabelRow.height = 18;
  sheet.mergeCells("A9:C9");
  sheet.mergeCells("D9:E9");
  sheet.mergeCells("F9:H9");
  sheet.mergeCells("I9:K9");

  const kpiValRow = sheet.addRow([
    totalSales, "", "",
    commEarned, "",
    commPaid, "", "",
    balance, "", ""
  ]);
  kpiValRow.height = 26;
  sheet.mergeCells("A10:C10");
  sheet.mergeCells("D10:E10");
  sheet.mergeCells("F10:H10");
  sheet.mergeCells("I10:K10");

  // Style KPI Card 1 (Sales)
  styleRange(sheet, 9, 1, 9, 3, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_BG } },
    font: { name: "Calibri", size: 9, bold: true, color: { argb: "FF64748B" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: { top: { style: "thin", color: { argb: BORDER_MED } }, left: { style: "thin", color: { argb: BORDER_MED } }, right: { style: "thin", color: { argb: BORDER_MED } } },
  });
  styleRange(sheet, 10, 1, 10, 3, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_BG } },
    font: { name: "Calibri", size: 12.5, bold: true, color: { argb: "FF0F172A" } },
    numFmt: '"₹" #,##0.00',
    alignment: { horizontal: "center", vertical: "middle" },
    border: { bottom: { style: "thin", color: { argb: BORDER_MED } }, left: { style: "thin", color: { argb: BORDER_MED } }, right: { style: "thin", color: { argb: BORDER_MED } } },
  });

  // Style KPI Card 2 (Earned)
  styleRange(sheet, 9, 4, 9, 5, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_GREEN_BG } },
    font: { name: "Calibri", size: 9, bold: true, color: { argb: "FF15803D" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: { top: { style: "thin", color: { argb: "FF86EFAC" } }, left: { style: "thin", color: { argb: "FF86EFAC" } }, right: { style: "thin", color: { argb: "FF86EFAC" } } },
  });
  styleRange(sheet, 10, 4, 10, 5, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_GREEN_BG } },
    font: { name: "Calibri", size: 12.5, bold: true, color: { argb: "FF15803D" } },
    numFmt: '"₹" #,##0.00',
    alignment: { horizontal: "center", vertical: "middle" },
    border: { bottom: { style: "thin", color: { argb: "FF86EFAC" } }, left: { style: "thin", color: { argb: "FF86EFAC" } }, right: { style: "thin", color: { argb: "FF86EFAC" } } },
  });

  // Style KPI Card 3 (Paid)
  styleRange(sheet, 9, 6, 9, 8, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_BG } },
    font: { name: "Calibri", size: 9, bold: true, color: { argb: "FF64748B" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: { top: { style: "thin", color: { argb: BORDER_MED } }, left: { style: "thin", color: { argb: BORDER_MED } }, right: { style: "thin", color: { argb: BORDER_MED } } },
  });
  styleRange(sheet, 10, 6, 10, 8, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_BG } },
    font: { name: "Calibri", size: 12.5, bold: true, color: { argb: "FF0F172A" } },
    numFmt: '"₹" #,##0.00',
    alignment: { horizontal: "center", vertical: "middle" },
    border: { bottom: { style: "thin", color: { argb: BORDER_MED } }, left: { style: "thin", color: { argb: BORDER_MED } }, right: { style: "thin", color: { argb: BORDER_MED } } },
  });

  // Style KPI Card 4 (Balance)
  styleRange(sheet, 9, 9, 9, 11, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_RED_BG } },
    font: { name: "Calibri", size: 9, bold: true, color: { argb: "FFB91C1C" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: { top: { style: "thin", color: { argb: "FFFCA5A5" } }, left: { style: "thin", color: { argb: "FFFCA5A5" } }, right: { style: "thin", color: { argb: "FFFCA5A5" } } },
  });
  styleRange(sheet, 10, 9, 10, 11, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_RED_BG } },
    font: { name: "Calibri", size: 12.5, bold: true, color: { argb: "FFB91C1C" } },
    numFmt: '"₹" #,##0.00',
    alignment: { horizontal: "center", vertical: "middle" },
    border: { bottom: { style: "thin", color: { argb: "FFFCA5A5" } }, left: { style: "thin", color: { argb: "FFFCA5A5" } }, right: { style: "thin", color: { argb: "FFFCA5A5" } } },
  });

  // ROW 11: Spacer
  const r11 = sheet.addRow([]);
  r11.height = 12;

  // ----------------------------------------------------
  // ROW 12: Invoices Data Table Headers (11 columns)
  // ----------------------------------------------------
  const tableHeaders = [
    "S.No",
    "Sales Date",
    "Invoice No",
    "Customer Name",
    "Customer Phone",
    "Products / Items Sold",
    "Qty",
    "Invoice Amount (₹)",
    "Payment Status",
    "Commission (₹)",
    "Comm Status",
  ];

  const headerRow = sheet.addRow(tableHeaders);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_SUBHEADER_BG } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER_MED } },
      bottom: { style: "medium", color: { argb: BORDER_DARK } },
      left: { style: "thin", color: { argb: BORDER_MED } },
      right: { style: "thin", color: { argb: BORDER_MED } },
    };
  });

  // ----------------------------------------------------
  // Invoices Data Rows
  // ----------------------------------------------------
  let sumSales = 0;
  let sumQty = 0;
  let sumComm = 0;

  if (invoices.length === 0) {
    const emptyRow = sheet.addRow(["No invoices found for this sales executive in the selected period.", "", "", "", "", "", "", "", "", "", ""]);
    emptyRow.height = 24;
    sheet.mergeCells(`A${emptyRow.number}:K${emptyRow.number}`);
    styleRange(sheet, emptyRow.number, 1, emptyRow.number, 11, {
      font: { name: "Calibri", size: 10, italic: true, color: { argb: "FF64748B" } },
      alignment: { horizontal: "center", vertical: "middle" },
      border: {
        top: { style: "thin", color: { argb: BORDER_LIGHT } },
        bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
        left: { style: "thin", color: { argb: BORDER_LIGHT } },
        right: { style: "thin", color: { argb: BORDER_LIGHT } },
      },
    });
  } else {
    invoices.forEach((inv, idx) => {
      const saleAmt = Number(inv.final_amount || 0);
      const commAmt = Number(inv.commission_amount || 0);
      const qty = Number(inv.total_qty || 0);
      sumSales += saleAmt;
      sumQty += qty;
      sumComm += commAmt;

      const productsText = inv.products_summary || inv.product_name || (Array.isArray(inv.items) && inv.items.map(i => i.product_name).join(", ")) || "—";

      const row = sheet.addRow([
        idx + 1,
        formatDDMMYY(inv.sales_date),
        inv.invoice_no || "—",
        inv.customer_name || "Walk-in Customer",
        inv.customer_phone || "—",
        productsText,
        qty || 0,
        saleAmt,
        inv.payment_status || "—",
        commAmt,
        inv.commission_status || "Pending",
      ]);
      row.height = 22;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: "Calibri", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: BORDER_LIGHT } },
          bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
          left: { style: "thin", color: { argb: BORDER_LIGHT } },
          right: { style: "thin", color: { argb: BORDER_LIGHT } },
        };

        // Alignments
        if ([1, 2, 3, 5, 7, 9, 11].includes(colNumber)) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if ([8, 10].includes(colNumber)) {
          cell.alignment = { horizontal: "right", vertical: "middle" };
          cell.numFmt = '"₹" #,##0.00';
        } else {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }

        // Accents
        if (colNumber === 3) {
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF1D4ED8" } };
        }
        if (colNumber === 10) {
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF15803D" } };
        }
      });
    });
  }

  // ----------------------------------------------------
  // Totals Row (Cleanly Aligned: A..F Merged, G Qty, H Sales, I Blank, J Comm, K Blank)
  // ----------------------------------------------------
  const totalsRow = sheet.addRow([
    `TOTAL (${invoices.length} INVOICES)`,
    "",
    "",
    "",
    "",
    "",
    sumQty || 0,
    sumSales,
    "",
    sumComm,
    "",
  ]);
  const totRowNum = totalsRow.number;
  totalsRow.height = 26;
  sheet.mergeCells(`A${totRowNum}:F${totRowNum}`);

  styleRange(sheet, totRowNum, 1, totRowNum, 11, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_TOTAL_BG } },
    font: { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF0F172A" } },
    border: {
      top: { style: "medium", color: { argb: BORDER_MED } },
      bottom: { style: "double", color: { argb: BORDER_DARK } },
      left: { style: "thin", color: { argb: BORDER_LIGHT } },
      right: { style: "thin", color: { argb: BORDER_LIGHT } },
    },
    alignment: { vertical: "middle" },
  });

  totalsRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  totalsRow.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
  totalsRow.getCell(8).alignment = { horizontal: "right", vertical: "middle" };
  totalsRow.getCell(8).numFmt = '"₹" #,##0.00';
  totalsRow.getCell(10).alignment = { horizontal: "right", vertical: "middle" };
  totalsRow.getCell(10).font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF15803D" } };
  totalsRow.getCell(10).numFmt = '"₹" #,##0.00';

  // Footer notes
  sheet.addRow([]);
  const foot = sheet.addRow(["Shiva Electronics ERP • Confidential Sales Executive Report • Authorized Signature: _______________________"]);
  sheet.mergeCells(`A${foot.number}:K${foot.number}`);
  foot.getCell(1).font = { italic: true, size: 9, color: { argb: "FF64748B" } };
  foot.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const cleanCode = code.replace(/[^a-zA-Z0-9_-]/g, "");
  const cleanSafeName = safeName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanPeriod = String(period).replace(/[^a-zA-Z0-9_-]/g, "_");
  a.download = `Sales_Report_${cleanCode}_${cleanSafeName}_${cleanPeriod}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};

/**
 * Export All Sales Persons Team Report to Multi-sheet Excel (.xlsx)
 */
export const exportTeamSalesPersonsExcel = async ({
  salesPersons = [],
  transactions = [],
  kpis = {},
  period = "",
  branchName = "SHIVA ELECTRONICS",
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Shiva Electronics ERP";
  workbook.lastModifiedBy = "Admin";
  workbook.created = new Date();

  const COLOR_HEADER_BG = "FF1E293B"; // Dark Slate
  const COLOR_SUBHEADER_BG = "FF334155"; // Medium Slate
  const COLOR_CARD_BG = "FFF8FAFC"; // Subtle Off-White
  const COLOR_CARD_GREEN_BG = "FFF0FDF4"; // Light Emerald
  const COLOR_CARD_RED_BG = "FFFEF2F2"; // Light Rose
  const COLOR_TOTAL_BG = "FFF1F5F9"; // Total Row Gray
  const BORDER_LIGHT = "FFE2E8F0";
  const BORDER_MED = "FFCBD5E1";
  const BORDER_DARK = "FF0F172A";

  // ==========================================
  // SHEET 1: Sales Team Summary (13 Columns: A to M)
  // ==========================================
  const summarySheet = workbook.addWorksheet("Team Performance", {
    views: [{ showGridLines: true }],
  });

  summarySheet.columns = [
    { key: "sno", width: 7 },              // A: S.No
    { key: "code", width: 14 },             // B: Employee Code
    { key: "name", width: 26 },             // C: Sales Executive Name
    { key: "phone", width: 16 },            // D: Contact Phone
    { key: "target", width: 18 },           // E: Monthly Target (₹)
    { key: "sales", width: 20 },            // F: Total Sales (₹)
    { key: "achievement", width: 16 },      // G: Target Achieved %
    { key: "invoices", width: 14 },         // H: Bills Count
    { key: "comm_rate", width: 18 },        // I: Commission Structure
    { key: "earned", width: 18 },           // J: Commission Earned (₹)
    { key: "paid", width: 18 },             // K: Disbursed (₹)
    { key: "balance", width: 18 },          // L: Balance Due (₹)
    { key: "status", width: 16 },           // M: Payout Status
  ];

  // Title Banner
  const title1 = summarySheet.addRow([`${branchName} - SALES TEAM PERFORMANCE REPORT`]);
  summarySheet.mergeCells("A1:M1");
  title1.height = 32;
  styleRange(summarySheet, 1, 1, 1, 13, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_HEADER_BG } },
    font: { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      top: { style: "thin", color: { argb: COLOR_HEADER_BG } },
      bottom: { style: "thin", color: { argb: COLOR_HEADER_BG } },
      left: { style: "thin", color: { argb: COLOR_HEADER_BG } },
      right: { style: "thin", color: { argb: COLOR_HEADER_BG } },
    },
  });

  const sub1 = summarySheet.addRow([`Performance Period: ${period || "All Time"}    |    Generated: ${new Date().toLocaleString("en-IN")}`]);
  summarySheet.mergeCells("A2:M2");
  sub1.height = 22;
  styleRange(summarySheet, 2, 1, 2, 13, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_BG } },
    font: { name: "Calibri", size: 9.5, italic: true, color: { argb: "FF475569" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      bottom: { style: "thin", color: { argb: BORDER_MED } },
      left: { style: "thin", color: { argb: BORDER_MED } },
      right: { style: "thin", color: { argb: BORDER_MED } },
    },
  });

  const r3 = summarySheet.addRow([]);
  r3.height = 10;

  // ----------------------------------------------------
  // ROW 4 & 5: 4 KPI Summary Cards across 13 cols (A..C, D..F, G..I, J..M)
  // ----------------------------------------------------
  const teamKpiLabels = summarySheet.addRow([
    "TOTAL TEAM SALES (₹)", "", "",
    "TOTAL INVOICES", "", "",
    "TOTAL COMMISSION (₹)", "", "",
    "PENDING PAYOUTS (₹)", "", "", ""
  ]);
  teamKpiLabels.height = 18;
  summarySheet.mergeCells("A4:C4");
  summarySheet.mergeCells("D4:F4");
  summarySheet.mergeCells("G4:I4");
  summarySheet.mergeCells("J4:M4");

  const teamKpiValues = summarySheet.addRow([
    Number(kpis.totalTeamSales || 0), "", "",
    `${kpis.totalInvoices || 0} Bills`, "", "",
    Number(kpis.totalTeamCommission || 0), "", "",
    Number(kpis.totalTeamPending || 0), "", "", ""
  ]);
  teamKpiValues.height = 26;
  summarySheet.mergeCells("A5:C5");
  summarySheet.mergeCells("D5:F5");
  summarySheet.mergeCells("G5:I5");
  summarySheet.mergeCells("J5:M5");

  // Style KPI Card 1 (Total Sales)
  styleRange(summarySheet, 4, 1, 4, 3, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_BG } },
    font: { name: "Calibri", size: 9, bold: true, color: { argb: "FF64748B" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: { top: { style: "thin", color: { argb: BORDER_MED } }, left: { style: "thin", color: { argb: BORDER_MED } }, right: { style: "thin", color: { argb: BORDER_MED } } },
  });
  styleRange(summarySheet, 5, 1, 5, 3, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_BG } },
    font: { name: "Calibri", size: 12.5, bold: true, color: { argb: "FF0F172A" } },
    numFmt: '"₹" #,##0.00',
    alignment: { horizontal: "center", vertical: "middle" },
    border: { bottom: { style: "thin", color: { argb: BORDER_MED } }, left: { style: "thin", color: { argb: BORDER_MED } }, right: { style: "thin", color: { argb: BORDER_MED } } },
  });

  // Style KPI Card 2 (Invoices)
  styleRange(summarySheet, 4, 4, 4, 6, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_BG } },
    font: { name: "Calibri", size: 9, bold: true, color: { argb: "FF64748B" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: { top: { style: "thin", color: { argb: BORDER_MED } }, left: { style: "thin", color: { argb: BORDER_MED } }, right: { style: "thin", color: { argb: BORDER_MED } } },
  });
  styleRange(summarySheet, 5, 4, 5, 6, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_BG } },
    font: { name: "Calibri", size: 12.5, bold: true, color: { argb: "FF0F172A" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: { bottom: { style: "thin", color: { argb: BORDER_MED } }, left: { style: "thin", color: { argb: BORDER_MED } }, right: { style: "thin", color: { argb: BORDER_MED } } },
  });

  // Style KPI Card 3 (Commission)
  styleRange(summarySheet, 4, 7, 4, 9, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_GREEN_BG } },
    font: { name: "Calibri", size: 9, bold: true, color: { argb: "FF15803D" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: { top: { style: "thin", color: { argb: "FF86EFAC" } }, left: { style: "thin", color: { argb: "FF86EFAC" } }, right: { style: "thin", color: { argb: "FF86EFAC" } } },
  });
  styleRange(summarySheet, 5, 7, 5, 9, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_GREEN_BG } },
    font: { name: "Calibri", size: 12.5, bold: true, color: { argb: "FF15803D" } },
    numFmt: '"₹" #,##0.00',
    alignment: { horizontal: "center", vertical: "middle" },
    border: { bottom: { style: "thin", color: { argb: "FF86EFAC" } }, left: { style: "thin", color: { argb: "FF86EFAC" } }, right: { style: "thin", color: { argb: "FF86EFAC" } } },
  });

  // Style KPI Card 4 (Pending)
  styleRange(summarySheet, 4, 10, 4, 13, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_RED_BG } },
    font: { name: "Calibri", size: 9, bold: true, color: { argb: "FFB91C1C" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: { top: { style: "thin", color: { argb: "FFFCA5A5" } }, left: { style: "thin", color: { argb: "FFFCA5A5" } }, right: { style: "thin", color: { argb: "FFFCA5A5" } } },
  });
  styleRange(summarySheet, 5, 10, 5, 13, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_RED_BG } },
    font: { name: "Calibri", size: 12.5, bold: true, color: { argb: "FFB91C1C" } },
    numFmt: '"₹" #,##0.00',
    alignment: { horizontal: "center", vertical: "middle" },
    border: { bottom: { style: "thin", color: { argb: "FFFCA5A5" } }, left: { style: "thin", color: { argb: "FFFCA5A5" } }, right: { style: "thin", color: { argb: "FFFCA5A5" } } },
  });

  const r6 = summarySheet.addRow([]);
  r6.height = 12;

  // ----------------------------------------------------
  // ROW 7: Table Headers
  // ----------------------------------------------------
  const teamHeaders = [
    "S.No",
    "Employee Code",
    "Sales Executive Name",
    "Contact Phone",
    "Target (₹)",
    "Sales Done (₹)",
    "Target Achieved %",
    "Bills Count",
    "Commission Rate",
    "Earned (₹)",
    "Disbursed (₹)",
    "Balance Due (₹)",
    "Payout Status",
  ];
  const hRow = summarySheet.addRow(teamHeaders);
  hRow.height = 26;
  hRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_SUBHEADER_BG } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER_MED } },
      bottom: { style: "medium", color: { argb: BORDER_DARK } },
      left: { style: "thin", color: { argb: BORDER_MED } },
      right: { style: "thin", color: { argb: BORDER_MED } },
    };
  });

  let sumTarget = 0;
  let sumSales = 0;
  let sumInvoices = 0;
  let sumEarned = 0;
  let sumPaid = 0;
  let sumBalance = 0;

  salesPersons.forEach((sp, idx) => {
    const targetVal = Number(sp.target_amount || 0);
    const salesVal = Number(sp.total_sales || 0);
    const invCount = Number(sp.total_invoices || 0);
    const earnedVal = Number(sp.commission_earned || 0);
    const paidVal = Number(sp.commission_paid || 0);
    const balVal = Number(sp.commission_balance || 0);

    sumTarget += targetVal;
    sumSales += salesVal;
    sumInvoices += invCount;
    sumEarned += earnedVal;
    sumPaid += paidVal;
    sumBalance += balVal;

    const rateStr = sp.commission_type === "fixed" ? `₹${sp.commission_rate}/bill` : `${sp.commission_rate}%`;

    const r = summarySheet.addRow([
      idx + 1,
      sp.employee_code || `SP-${sp.id}`,
      sp.name,
      sp.phone || "—",
      targetVal,
      salesVal,
      `${sp.target_achieved_pct || 0}%`,
      invCount,
      rateStr,
      earnedVal,
      paidVal,
      balVal,
      sp.payout_status || "—",
    ]);
    r.height = 22;

    r.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: "Calibri", size: 10 };
      cell.border = {
        top: { style: "thin", color: { argb: BORDER_LIGHT } },
        bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
        left: { style: "thin", color: { argb: BORDER_LIGHT } },
        right: { style: "thin", color: { argb: BORDER_LIGHT } },
      };

      if ([1, 2, 4, 7, 8, 9, 13].includes(colNumber)) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if ([5, 6, 10, 11, 12].includes(colNumber)) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = '"₹" #,##0.00';
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }

      if (colNumber === 2) {
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF1D4ED8" } };
      }
      if (colNumber === 3) {
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
      }
      if (colNumber === 10) {
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF15803D" } };
      }
      if (colNumber === 12 && balVal > 0) {
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFB91C1C" } };
      }
    });
  });

  // Team Summary Totals Row (Merge A..D, E Target, F Sales, G %, H Bills, I blank, J Earned, K Paid, L Balance, M blank)
  const teamTotalsRow = summarySheet.addRow([
    `TOTAL (${salesPersons.length} EXECUTIVES)`,
    "",
    "",
    "",
    sumTarget,
    sumSales,
    sumTarget > 0 ? `${Math.round((sumSales / sumTarget) * 100)}%` : "—",
    sumInvoices,
    "",
    sumEarned,
    sumPaid,
    sumBalance,
    "",
  ]);
  const teamTotNum = teamTotalsRow.number;
  teamTotalsRow.height = 26;
  summarySheet.mergeCells(`A${teamTotNum}:D${teamTotNum}`);

  styleRange(summarySheet, teamTotNum, 1, teamTotNum, 13, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_TOTAL_BG } },
    font: { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF0F172A" } },
    border: {
      top: { style: "medium", color: { argb: BORDER_MED } },
      bottom: { style: "double", color: { argb: BORDER_DARK } },
      left: { style: "thin", color: { argb: BORDER_LIGHT } },
      right: { style: "thin", color: { argb: BORDER_LIGHT } },
    },
    alignment: { vertical: "middle" },
  });

  teamTotalsRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  teamTotalsRow.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
  teamTotalsRow.getCell(5).numFmt = '"₹" #,##0.00';
  teamTotalsRow.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
  teamTotalsRow.getCell(6).numFmt = '"₹" #,##0.00';
  teamTotalsRow.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
  teamTotalsRow.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
  teamTotalsRow.getCell(10).alignment = { horizontal: "right", vertical: "middle" };
  teamTotalsRow.getCell(10).font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF15803D" } };
  teamTotalsRow.getCell(10).numFmt = '"₹" #,##0.00';
  teamTotalsRow.getCell(11).alignment = { horizontal: "right", vertical: "middle" };
  teamTotalsRow.getCell(11).numFmt = '"₹" #,##0.00';
  teamTotalsRow.getCell(12).alignment = { horizontal: "right", vertical: "middle" };
  teamTotalsRow.getCell(12).font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FFB91C1C" } };
  teamTotalsRow.getCell(12).numFmt = '"₹" #,##0.00';

  // ==========================================
  // SHEET 2: Detailed Invoices List (12 Columns: A to L)
  // ==========================================
  const invoicesSheet = workbook.addWorksheet("Team Invoices", {
    views: [{ showGridLines: true }],
  });

  invoicesSheet.columns = [
    { key: "sno", width: 7 },              // A: S.No
    { key: "date", width: 14 },             // B: Sales Date
    { key: "invoice_no", width: 18 },       // C: Invoice No
    { key: "sp_code", width: 14 },          // D: SP Code
    { key: "sp_name", width: 22 },          // E: Sales Person Name
    { key: "customer_name", width: 24 },    // F: Customer Name
    { key: "customer_phone", width: 16 },   // G: Customer Contact
    { key: "products", width: 36 },         // H: Products / Items
    { key: "qty", width: 10 },              // I: Qty
    { key: "amount", width: 18 },           // J: Invoice Amount (₹)
    { key: "payment_status", width: 16 },   // K: Payment Status
    { key: "commission", width: 18 },       // L: Commission (₹)
  ];

  const tTitle = invoicesSheet.addRow([`${branchName} - ALL INVOICES CREDITED TO SALES TEAM`]);
  invoicesSheet.mergeCells("A1:L1");
  tTitle.height = 32;
  styleRange(invoicesSheet, 1, 1, 1, 12, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_HEADER_BG } },
    font: { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      top: { style: "thin", color: { argb: COLOR_HEADER_BG } },
      bottom: { style: "thin", color: { argb: COLOR_HEADER_BG } },
      left: { style: "thin", color: { argb: COLOR_HEADER_BG } },
      right: { style: "thin", color: { argb: COLOR_HEADER_BG } },
    },
  });

  const tSub = invoicesSheet.addRow([`Report Period: ${period || "All Time"}    |    Total Bills: ${transactions.length} Invoices`]);
  invoicesSheet.mergeCells("A2:L2");
  tSub.height = 22;
  styleRange(invoicesSheet, 2, 1, 2, 12, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_CARD_BG } },
    font: { name: "Calibri", size: 9.5, italic: true, color: { argb: "FF475569" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      bottom: { style: "thin", color: { argb: BORDER_MED } },
      left: { style: "thin", color: { argb: BORDER_MED } },
      right: { style: "thin", color: { argb: BORDER_MED } },
    },
  });

  const invSpacer = invoicesSheet.addRow([]);
  invSpacer.height = 10;

  const invHeaders = [
    "S.No",
    "Sales Date",
    "Invoice No",
    "SP Code",
    "Sales Person Name",
    "Customer Name",
    "Customer Contact",
    "Products / Items Sold",
    "Qty",
    "Invoice Amount (₹)",
    "Payment Status",
    "Commission (₹)",
  ];
  const invHRow = invoicesSheet.addRow(invHeaders);
  invHRow.height = 26;
  invHRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_SUBHEADER_BG } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER_MED } },
      bottom: { style: "medium", color: { argb: BORDER_DARK } },
      left: { style: "thin", color: { argb: BORDER_MED } },
      right: { style: "thin", color: { argb: BORDER_MED } },
    };
  });

  let allInvTotal = 0;
  let allInvQty = 0;
  let allCommTotal = 0;

  if (transactions.length === 0) {
    const emptyRow = invoicesSheet.addRow(["No invoices found for this sales team in the selected period.", "", "", "", "", "", "", "", "", "", "", ""]);
    emptyRow.height = 24;
    invoicesSheet.mergeCells(`A${emptyRow.number}:L${emptyRow.number}`);
    styleRange(invoicesSheet, emptyRow.number, 1, emptyRow.number, 12, {
      font: { name: "Calibri", size: 10, italic: true, color: { argb: "FF64748B" } },
      alignment: { horizontal: "center", vertical: "middle" },
      border: {
        top: { style: "thin", color: { argb: BORDER_LIGHT } },
        bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
        left: { style: "thin", color: { argb: BORDER_LIGHT } },
        right: { style: "thin", color: { argb: BORDER_LIGHT } },
      },
    });
  } else {
    transactions.forEach((tx, idx) => {
      const s = Number(tx.final_amount || 0);
      const c = Number(tx.commission_amount || 0);
      const q = Number(tx.total_qty || 0);
      allInvTotal += s;
      allCommTotal += c;
      allInvQty += q;

      const prods = tx.products_summary || tx.product_name || (Array.isArray(tx.items) && tx.items.map(i => i.product_name).join(", ")) || "—";

      const r = invoicesSheet.addRow([
        idx + 1,
        formatDDMMYY(tx.sales_date),
        tx.invoice_no || "—",
        tx.employee_code || `SP-${tx.sales_person_id || ""}`,
        tx.sales_person_name || "—",
        tx.customer_name || "Walk-in Customer",
        tx.customer_phone || "—",
        prods,
        q || 0,
        s,
        tx.payment_status || "—",
        c,
      ]);
      r.height = 22;

      r.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: "Calibri", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: BORDER_LIGHT } },
          bottom: { style: "thin", color: { argb: BORDER_LIGHT } },
          left: { style: "thin", color: { argb: BORDER_LIGHT } },
          right: { style: "thin", color: { argb: BORDER_LIGHT } },
        };

        if ([1, 2, 3, 4, 7, 9, 11].includes(colNumber)) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if ([10, 12].includes(colNumber)) {
          cell.alignment = { horizontal: "right", vertical: "middle" };
          cell.numFmt = '"₹" #,##0.00';
        } else {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }

        if (colNumber === 3) {
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF1D4ED8" } };
        }
        if (colNumber === 4) {
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
        }
        if (colNumber === 5) {
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
        }
        if (colNumber === 12) {
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF15803D" } };
        }
      });
    });
  }

  // Totals Row (Merge A..H, I Qty, J Amount, K blank, L Commission)
  const invTotRow = invoicesSheet.addRow([
    `TOTAL (${transactions.length} INVOICES)`,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    allInvQty || 0,
    allInvTotal,
    "",
    allCommTotal,
  ]);
  const invTotNum = invTotRow.number;
  invTotRow.height = 26;
  invoicesSheet.mergeCells(`A${invTotNum}:H${invTotNum}`);

  styleRange(invoicesSheet, invTotNum, 1, invTotNum, 12, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_TOTAL_BG } },
    font: { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF0F172A" } },
    border: {
      top: { style: "medium", color: { argb: BORDER_MED } },
      bottom: { style: "double", color: { argb: BORDER_DARK } },
      left: { style: "thin", color: { argb: BORDER_LIGHT } },
      right: { style: "thin", color: { argb: BORDER_LIGHT } },
    },
    alignment: { vertical: "middle" },
  });

  invTotRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  invTotRow.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
  invTotRow.getCell(10).alignment = { horizontal: "right", vertical: "middle" };
  invTotRow.getCell(10).numFmt = '"₹" #,##0.00';
  invTotRow.getCell(12).alignment = { horizontal: "right", vertical: "middle" };
  invTotRow.getCell(12).font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FF15803D" } };
  invTotRow.getCell(12).numFmt = '"₹" #,##0.00';

  // Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const cleanPeriod = String(period).replace(/[^a-zA-Z0-9_-]/g, "_");
  a.download = `Sales_Team_Report_${cleanPeriod}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};
