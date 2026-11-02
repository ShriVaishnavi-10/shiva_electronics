import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Table,
  Badge,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Spinner,
  Progress,
  Nav,
  NavItem,
  NavLink,
} from "reactstrap";
import {
  FaChartLine,
  FaCalendarAlt,
  FaRupeeSign,
  FaFileInvoiceDollar,
  FaUserTie,
  FaMoneyCheckAlt,
  FaBullseye,
  FaCheckCircle,
  FaClock,
  FaDownload,
  FaSearch,
  FaListAlt,
  FaHistory,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
  FaPrint,
  FaFilter,
  FaTimes,
  FaPhoneAlt,
  FaEnvelope,
  FaPercent,
  FaSyncAlt,
  FaFileInvoice,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import api, { getActiveBranchId } from "../utils/api";
import { exportSingleSalesPersonExcel, exportTeamSalesPersonsExcel } from "../utils/exportSalesPersonExcel";

function escapeCsv(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function triggerDownload(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  toast.success(`Downloaded: ${filename}`);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatReportDate(val) {
  if (!val) return "—";
  const s = String(val).slice(0, 10);
  const p = s.split("-");
  if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
  return s;
}

function downloadExecutivePdf(salesPerson, invoices = [], period = "") {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const formatMoney = (val) =>
    Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.final_amount || 0), 0);
  const totalCommission = invoices.reduce(
    (sum, inv) => sum + Number(inv.commission_amount || 0),
    0
  );
  const totalQty = invoices.reduce((sum, inv) => sum + (Number(inv.total_qty) || 0), 0);

  // 1. Header Banner
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, 297, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SHIVA ELECTRONICS", 14, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text("Sales Performance & Commission Report", 14, 17);

  const genDateStr = `Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
  doc.setFontSize(9);
  doc.text(genDateStr, 283, 14, { align: "right" });

  // 2. Executive Profile Box
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(14, 26, 269, 24, 2, 2, "FD");

  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);

  // Col 1
  doc.text("Executive Name:", 18, 33);
  doc.setFont("helvetica", "normal");
  doc.text(salesPerson.name || "—", 52, 33);

  doc.setFont("helvetica", "bold");
  doc.text("Employee Code:", 18, 39);
  doc.setFont("helvetica", "normal");
  doc.text(salesPerson.employee_code || `SP-${salesPerson.id}`, 52, 39);

  doc.setFont("helvetica", "bold");
  doc.text("Contact:", 18, 45);
  doc.setFont("helvetica", "normal");
  doc.text(salesPerson.phone || "—", 52, 45);

  // Col 2
  doc.setFont("helvetica", "bold");
  doc.text("Period / Range:", 105, 33);
  doc.setFont("helvetica", "normal");
  doc.text(period || "—", 137, 33);

  doc.setFont("helvetica", "bold");
  doc.text("Target Amount:", 105, 39);
  doc.setFont("helvetica", "normal");
  doc.text(`Rs. ${formatMoney(salesPerson.target_amount)}`, 137, 39);

  doc.setFont("helvetica", "bold");
  doc.text("Commission Structure:", 105, 45);
  doc.setFont("helvetica", "normal");
  const commStr = salesPerson.commission_type === "fixed" ? `Rs. ${salesPerson.commission_rate} per bill` : `${salesPerson.commission_rate}% of sales`;
  doc.text(commStr, 150, 45);

  // Col 3 (KPI summaries)
  doc.setFont("helvetica", "bold");
  doc.text("Total Sales Done:", 205, 33);
  doc.setTextColor(180, 83, 9); // Amber 700
  doc.text(`Rs. ${formatMoney(totalSales)}`, 245, 33);

  doc.setTextColor(15, 23, 42);
  doc.text("Bills Count:", 205, 39);
  doc.setFont("helvetica", "normal");
  doc.text(`${invoices.length} Invoices (${totalQty} Qty)`, 245, 39);

  doc.setFont("helvetica", "bold");
  doc.text("Commission Earned:", 205, 45);
  doc.setTextColor(21, 128, 61); // Green 700
  doc.text(`Rs. ${formatMoney(salesPerson.commission_earned || totalCommission)}`, 245, 45);

  // 3. Table Rows
  const tableHead = [
    [
      "#",
      "Sales Date",
      "Invoice No",
      "Customer Name",
      "Contact",
      "Products / Items Sold",
      "Qty",
      "Invoice Amount (Rs.)",
      "Payment",
      "Commission (Rs.)",
      "Status",
    ],
  ];

  const tableBody = invoices.map((inv, idx) => {
    const products =
      inv.products_summary ||
      inv.product_name ||
      (Array.isArray(inv.items) && inv.items.map((it) => it.product_name).join(", ")) ||
      "—";
    return [
      idx + 1,
      formatReportDate(inv.sales_date),
      inv.invoice_no || "—",
      inv.customer_name || "Walk-in Customer",
      inv.customer_phone || "—",
      products,
      Number(inv.total_qty || 0) || "—",
      `Rs. ${formatMoney(inv.final_amount)}`,
      inv.payment_status || "—",
      `Rs. ${formatMoney(inv.commission_amount)}`,
      inv.commission_status || "Pending",
    ];
  });

  if (tableBody.length === 0) {
    tableBody.push([
      {
        content: "No sales recorded for this period.",
        colSpan: 11,
        styles: { halign: "center", fontStyle: "italic", textColor: [100, 116, 139] },
      },
    ]);
  }

  const tableFoot = [
    [
      { content: `TOTAL (${invoices.length} Bills)`, colSpan: 6, styles: { halign: "right", fontStyle: "bold" } },
      { content: String(totalQty || ""), styles: { halign: "center", fontStyle: "bold" } },
      { content: `Rs. ${formatMoney(totalSales)}`, styles: { halign: "right", fontStyle: "bold" } },
      "",
      { content: `Rs. ${formatMoney(totalCommission)}`, styles: { halign: "right", fontStyle: "bold", textColor: [21, 128, 61] } },
      "",
    ],
  ];

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    foot: tableFoot,
    startY: 54,
    theme: "grid",
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
      textColor: [30, 41, 59],
      valign: "middle",
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "left",
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "center", cellWidth: 20 },
      2: { fontStyle: "bold", cellWidth: 24 },
      3: { cellWidth: 32 },
      4: { cellWidth: 24 },
      5: { cellWidth: 60 },
      6: { halign: "center", cellWidth: 14 },
      7: { halign: "right", fontStyle: "bold", cellWidth: 28 },
      8: { halign: "center", cellWidth: 18 },
      9: { halign: "right", cellWidth: 24 },
      10: { halign: "center", cellWidth: 15 },
    },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Shiva Electronics ERP • Confidential Sales Performance Report", 14, 204);
      doc.text(`Page ${data.pageNumber}`, 283, 204, { align: "right" });
    },
  });

  const safeName = (salesPerson.name || "Sales_Person").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeCode = (salesPerson.employee_code || `SP-${salesPerson.id}`).replace(/[^a-zA-Z0-9_-]/g, "_");
  const safePeriod = String(period || "Report").replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`Sales_Report_${safeCode}_${safeName}_${safePeriod}.pdf`);
}

function downloadTeamPdf(salesPersons = [], kpis = {}, period = "") {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const formatMoney = (val) =>
    Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  // 1. Header Banner
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 297, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SHIVA ELECTRONICS", 14, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text("Sales Team Monthly Performance & Commission Summary", 14, 17);

  const genDateStr = `Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
  doc.setFontSize(9);
  doc.text(genDateStr, 283, 14, { align: "right" });

  // 2. Summary KPI Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 26, 269, 16, 2, 2, "FD");

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);

  doc.setFont("helvetica", "bold");
  doc.text("Period:", 20, 36);
  doc.setFont("helvetica", "normal");
  doc.text(String(period || "—"), 35, 36);

  doc.setFont("helvetica", "bold");
  doc.text("Total Team Sales:", 80, 36);
  doc.setTextColor(180, 83, 9);
  doc.text(`Rs. ${formatMoney(kpis?.totalTeamSales)}`, 115, 36);

  doc.setTextColor(15, 23, 42);
  doc.text("Total Invoices:", 160, 36);
  doc.setFont("helvetica", "normal");
  doc.text(`${kpis?.totalInvoices || 0} Bills`, 188, 36);

  doc.setFont("helvetica", "bold");
  doc.text("Commission Earned:", 215, 36);
  doc.setTextColor(21, 128, 61);
  doc.text(`Rs. ${formatMoney(kpis?.totalTeamCommission)}`, 252, 36);

  // 3. Table Rows
  const tableHead = [
    [
      "#",
      "Code",
      "Sales Person",
      "Phone",
      "Target (Rs.)",
      "Sales Done (Rs.)",
      "Target %",
      "Invoices",
      "Commission (Rs.)",
      "Paid (Rs.)",
      "Balance (Rs.)",
      "Status",
    ],
  ];

  const tableBody = (salesPersons || []).map((sp, idx) => [
    idx + 1,
    sp.employee_code || `SP-${sp.id}`,
    sp.name,
    sp.phone || "—",
    `Rs. ${formatMoney(sp.target_amount)}`,
    `Rs. ${formatMoney(sp.total_sales)}`,
    `${sp.target_achieved_pct || 0}%`,
    sp.total_invoices || 0,
    `Rs. ${formatMoney(sp.commission_earned)}`,
    `Rs. ${formatMoney(sp.commission_paid)}`,
    `Rs. ${formatMoney(sp.commission_balance)}`,
    sp.payout_status || "—",
  ]);

  if (tableBody.length === 0) {
    tableBody.push([
      {
        content: "No sales records found for this period.",
        colSpan: 12,
        styles: { halign: "center", fontStyle: "italic", textColor: [100, 116, 139] },
      },
    ]);
  }

  const tableFoot = [
    [
      { content: "TEAM TOTAL", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
      "",
      { content: `Rs. ${formatMoney(kpis?.totalTeamSales)}`, styles: { halign: "right", fontStyle: "bold" } },
      "",
      { content: String(kpis?.totalInvoices || 0), styles: { halign: "center", fontStyle: "bold" } },
      { content: `Rs. ${formatMoney(kpis?.totalTeamCommission)}`, styles: { halign: "right", fontStyle: "bold", textColor: [21, 128, 61] } },
      { content: `Rs. ${formatMoney(kpis?.totalTeamPaid)}`, styles: { halign: "right", fontStyle: "bold" } },
      { content: `Rs. ${formatMoney(kpis?.totalTeamPending)}`, styles: { halign: "right", fontStyle: "bold", textColor: [185, 28, 28] } },
      "",
    ],
  ];

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    foot: tableFoot,
    startY: 46,
    theme: "grid",
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
      textColor: [30, 41, 59],
      valign: "middle",
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "left",
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { fontStyle: "bold", cellWidth: 20 },
      2: { fontStyle: "bold", cellWidth: 35 },
      3: { cellWidth: 26 },
      4: { halign: "right", cellWidth: 24 },
      5: { halign: "right", fontStyle: "bold", cellWidth: 28 },
      6: { halign: "center", fontStyle: "bold", cellWidth: 18 },
      7: { halign: "center", cellWidth: 16 },
      8: { halign: "right", fontStyle: "bold", textColor: [21, 128, 61], cellWidth: 26 },
      9: { halign: "right", cellWidth: 22 },
      10: { halign: "right", fontStyle: "bold", textColor: [185, 28, 28], cellWidth: 24 },
      11: { halign: "center", cellWidth: 20 },
    },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Shiva Electronics ERP • Monthly Management Report", 14, 204);
      doc.text(`Page ${data.pageNumber}`, 283, 204, { align: "right" });
    },
  });

  const safePeriod = String(period || "Report").replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`Shiva_Electronics_Sales_Team_Report_${safePeriod}.pdf`);
}

function buildSingleExecutiveCsv(sp, invoices, month) {
  const lines = [];
  lines.push(["SHIVA ELECTRONICS - SALES EXECUTIVE PERFORMANCE REPORT"].map(escapeCsv).join(","));
  lines.push([`Report Period: ${month || "All Time"}    |    Generated On: ${new Date().toLocaleString("en-IN")}`].map(escapeCsv).join(","));
  lines.push([]);

  // 1. Executive Summary Table (11 columns matching invoices table)
  lines.push(["--- EXECUTIVE PERFORMANCE SUMMARY ---"].map(escapeCsv).join(","));
  const execHeaders = [
    "Executive Name",
    "Employee Code",
    "Contact Phone",
    "Status",
    "Commission Rate",
    "Monthly Target (₹)",
    "Total Sales (₹)",
    "Target Achieved %",
    "Commission Earned (₹)",
    "Commission Paid (₹)",
    "Balance Due (₹)",
  ];
  lines.push(execHeaders.map(escapeCsv).join(","));

  const commStructure = sp.commission_type === "fixed"
    ? `₹${sp.commission_rate}/bill`
    : `${sp.commission_rate}% of sales`;

  lines.push([
    sp.name || "—",
    sp.employee_code || `SP-${sp.id}`,
    sp.phone || "—",
    sp.status || "Active",
    commStructure,
    Number(sp.target_amount || 0).toFixed(2),
    Number(sp.total_sales || 0).toFixed(2),
    `${sp.target_achieved_pct || 0}%`,
    Number(sp.commission_earned || 0).toFixed(2),
    Number(sp.commission_paid || 0).toFixed(2),
    Number(sp.commission_balance || 0).toFixed(2),
  ].map(escapeCsv).join(","));
  lines.push([]);

  // 2. Invoices Breakdown Table (11 columns)
  lines.push([`--- ITEMIZED INVOICES LIST (${invoices.length} BILLS) ---`].map(escapeCsv).join(","));
  const headers = [
    "S.No",
    "Sales Date",
    "Invoice No",
    "Customer Name",
    "Customer Contact",
    "Products Sold",
    "Qty",
    "Invoice Amount (₹)",
    "Payment Status",
    "Commission Earned (₹)",
    "Commission Status",
  ];
  lines.push(headers.map(escapeCsv).join(","));

  let sumSales = 0;
  let sumComm = 0;
  let sumQty = 0;

  (invoices || []).forEach((inv, idx) => {
    const saleAmt = Number(inv.final_amount || 0);
    const commAmt = Number(inv.commission_amount || 0);
    const qty = Number(inv.total_qty || 0);
    const prodDesc = inv.products_summary || inv.product_name || (Array.isArray(inv.items) && inv.items.map(i => i.product_name).join(", ")) || "—";
    sumSales += saleAmt;
    sumComm += commAmt;
    sumQty += qty;

    lines.push([
      idx + 1,
      formatReportDate(inv.sales_date),
      inv.invoice_no || "—",
      inv.customer_name || "Walk-in Customer",
      inv.customer_phone || "—",
      prodDesc,
      qty || 0,
      saleAmt.toFixed(2),
      inv.payment_status || "—",
      commAmt.toFixed(2),
      inv.commission_status || "Pending",
    ].map(escapeCsv).join(","));
  });

  lines.push([]);
  lines.push([
    "TOTAL",
    "",
    `${invoices.length} Bills`,
    "",
    "",
    "",
    sumQty || 0,
    sumSales.toFixed(2),
    "",
    sumComm.toFixed(2),
    "",
  ].map(escapeCsv).join(","));

  return "\uFEFF" + lines.join("\r\n");
}

function buildTeamSummaryCsv(salesPersons, month) {
  const lines = [];
  lines.push(["SHIVA ELECTRONICS - ALL SALES EXECUTIVES MONTHLY REPORT"].map(escapeCsv).join(","));
  lines.push([`Performance Period: ${month || "All Time"}    |    Generated On: ${new Date().toLocaleString("en-IN")}`].map(escapeCsv).join(","));
  lines.push([]);

  const headers = [
    "S.No",
    "Employee Code",
    "Executive Name",
    "Phone Number",
    "Monthly Target (₹)",
    "Total Sales (₹)",
    "Target Achieved %",
    "Invoices Count",
    "Commission Structure",
    "Commission Earned (₹)",
    "Commission Paid (₹)",
    "Pending Balance (₹)",
    "Payout Status",
  ];
  lines.push(headers.map(escapeCsv).join(","));

  let sumTarget = 0;
  let sumSales = 0;
  let sumEarned = 0;
  let sumPaid = 0;
  let sumBalance = 0;
  let sumInvoices = 0;

  salesPersons.forEach((sp, idx) => {
    const target = Number(sp.target_amount || 0);
    const sales = Number(sp.total_sales || 0);
    const earned = Number(sp.commission_earned || 0);
    const paid = Number(sp.commission_paid || 0);
    const balance = Number(sp.commission_balance || 0);
    const invCount = Number(sp.total_invoices || 0);

    sumTarget += target;
    sumSales += sales;
    sumEarned += earned;
    sumPaid += paid;
    sumBalance += balance;
    sumInvoices += invCount;

    lines.push([
      idx + 1,
      sp.employee_code || `SP-${sp.id}`,
      sp.name,
      sp.phone || "—",
      target.toFixed(2),
      sales.toFixed(2),
      `${sp.target_achieved_pct || 0}%`,
      invCount,
      sp.commission_type === "fixed" ? `₹${sp.commission_rate}/bill` : `${sp.commission_rate}%`,
      earned.toFixed(2),
      paid.toFixed(2),
      balance.toFixed(2),
      sp.payout_status || "—",
    ].map(escapeCsv).join(","));
  });

  lines.push([]);
  lines.push([
    "TOTAL",
    "",
    `${salesPersons.length} Executives`,
    "",
    sumTarget.toFixed(2),
    sumSales.toFixed(2),
    sumTarget > 0 ? `${Math.round((sumSales / sumTarget) * 100)}%` : "—",
    sumInvoices,
    "",
    sumEarned.toFixed(2),
    sumPaid.toFixed(2),
    sumBalance.toFixed(2),
    "",
  ].map(escapeCsv).join(","));

  return "\uFEFF" + lines.join("\r\n");
}

function printExecutiveReport(sp, invoices, month) {
  const printWin = window.open("", "_blank");
  if (!printWin) {
    toast.error("Please allow popups to print/export PDF report");
    return;
  }

  const invoiceRowsHtml = (invoices || [])
    .map(
      (inv, idx) => `
    <tr>
      <td style="text-align:center;">${idx + 1}</td>
      <td>${formatReportDate(inv.sales_date)}</td>
      <td style="font-family:monospace; font-weight:bold;">${inv.invoice_no || "—"}</td>
      <td>${inv.customer_name || "Walk-in Customer"}</td>
      <td>${inv.customer_phone || "—"}</td>
      <td style="text-align:right; font-weight:bold;">₹${Number(inv.final_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      <td style="text-align:center;">${inv.payment_status || "—"}</td>
      <td style="text-align:right; font-weight:bold; color:#15803d;">₹${Number(inv.commission_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      <td style="text-align:center;">${inv.commission_status || "Pending"}</td>
    </tr>
  `
    )
    .join("");

  const totalSales = (invoices || []).reduce((acc, i) => acc + Number(i.final_amount || 0), 0);
  const totalComm = (invoices || []).reduce((acc, i) => acc + Number(i.commission_amount || 0), 0);

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sales Report - ${sp.name} (${month})</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
          .brand-title { font-size: 24px; font-weight: 800; color: #b45309; letter-spacing: 0.5px; }
          .report-title { font-size: 15px; color: #64748b; font-weight: 600; margin-top: 4px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .kpi-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .kpi-value { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          .info-table td { padding: 6px 10px; border: 1px solid #e2e8f0; }
          .table-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; color: #0f172a; }
          .data-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
          .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 8px 10px; }
          .data-table th { background: #f1f5f9; text-align: left; font-weight: 700; }
          .footer { margin-top: 32px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; text-align: right;">
          <button onclick="window.print()" style="padding: 8px 18px; background: #0f172a; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
            🖨️ Print / Save as PDF
          </button>
        </div>

        <div class="header">
          <div>
            <div class="brand-title">SHIVA ELECTRONICS</div>
            <div class="report-title">Sales Executive Performance & Invoices Report</div>
          </div>
          <div style="text-align: right; font-size: 12.5px; color: #475569;">
            <div><b>Report Month:</b> ${month}</div>
            <div><b>Printed:</b> ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>

        <table class="info-table">
          <tr>
            <td style="background:#f8fafc; width: 18%;"><b>Executive Name:</b></td>
            <td style="font-weight: 700; width: 32%;">${sp.name}</td>
            <td style="background:#f8fafc; width: 18%;"><b>Employee Code:</b></td>
            <td style="font-family: monospace; font-weight: 700; width: 32%;">${sp.employee_code || `SP-${sp.id}`}</td>
          </tr>
          <tr>
            <td style="background:#f8fafc;"><b>Contact Number:</b></td>
            <td>${sp.phone || "—"}</td>
            <td style="background:#f8fafc;"><b>Email Address:</b></td>
            <td>${sp.email || "—"}</td>
          </tr>
          <tr>
            <td style="background:#f8fafc;"><b>Monthly Target:</b></td>
            <td style="font-weight: 700;">₹${Number(sp.target_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            <td style="background:#f8fafc;"><b>Commission Structure:</b></td>
            <td>${sp.commission_type === "fixed" ? `₹${sp.commission_rate} per bill` : `${sp.commission_rate}% of sale`}</td>
          </tr>
        </table>

        <div class="kpi-grid">
          <div class="kpi-card" style="border-left: 4px solid #f59e0b;">
            <div class="kpi-label">Total Sales Done</div>
            <div class="kpi-value">₹${Number(totalSales).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card" style="border-left: 4px solid #3b82f6;">
            <div class="kpi-label">Bills Count</div>
            <div class="kpi-value">${invoices.length} Invoices</div>
          </div>
          <div class="kpi-card" style="border-left: 4px solid #10b981;">
            <div class="kpi-label">Commission Earned</div>
            <div class="kpi-value" style="color: #15803d;">₹${Number(sp.commission_earned || totalComm).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card" style="border-left: 4px solid #ef4444;">
            <div class="kpi-label">Pending Balance</div>
            <div class="kpi-value" style="color: #b91c1c;">₹${Number(sp.commission_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div class="table-title">Itemized Invoices Credited (${invoices.length} Bills)</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Date</th>
              <th>Invoice No</th>
              <th>Customer Name</th>
              <th>Contact</th>
              <th style="text-align: right;">Amount (₹)</th>
              <th style="text-align: center;">Payment</th>
              <th style="text-align: right;">Commission (₹)</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceRowsHtml || `<tr><td colspan="9" style="text-align:center; padding: 20px; color:#64748b;">No invoices recorded for this period.</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="background:#f1f5f9; font-weight: bold;">
              <td colspan="5" style="text-align: right;">TOTAL:</td>
              <td style="text-align: right;">₹${Number(totalSales).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              <td></td>
              <td style="text-align: right; color:#15803d;">₹${Number(totalComm).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <div>Shiva Electronics ERP • Confidential Sales Performance Report</div>
          <div>Authorized Signatory: _________________________</div>
        </div>
      </body>
    </html>
  `);
  printWin.document.close();
}

function printTeamReport(salesPersons, kpis, month) {
  const printWin = window.open("", "_blank");
  if (!printWin) {
    toast.error("Please allow popups to print/export PDF report");
    return;
  }

  const rowsHtml = (salesPersons || [])
    .map(
      (sp, idx) => `
    <tr>
      <td style="text-align:center;">${idx + 1}</td>
      <td style="font-family:monospace; font-weight:bold;">${sp.employee_code || `SP-${sp.id}`}</td>
      <td style="font-weight:600;">${sp.name}</td>
      <td>${sp.phone || "—"}</td>
      <td style="text-align:right;">₹${Number(sp.target_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      <td style="text-align:right; font-weight:bold;">₹${Number(sp.total_sales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      <td style="text-align:center; font-weight:bold;">${sp.target_achieved_pct || 0}%</td>
      <td style="text-align:center;">${sp.total_invoices || 0}</td>
      <td style="text-align:right; color:#15803d; font-weight:bold;">₹${Number(sp.commission_earned || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      <td style="text-align:right; color:#2563eb;">₹${Number(sp.commission_paid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      <td style="text-align:right; color:#b91c1c; font-weight:bold;">₹${Number(sp.commission_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      <td style="text-align:center;">${sp.payout_status || "—"}</td>
    </tr>
  `
    )
    .join("");

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sales Team Monthly Report - ${month}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
          .brand-title { font-size: 24px; font-weight: 800; color: #b45309; letter-spacing: 0.5px; }
          .report-title { font-size: 15px; color: #64748b; font-weight: 600; margin-top: 4px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .kpi-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .kpi-value { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 8px 10px; }
          .data-table th { background: #f1f5f9; text-align: left; font-weight: 700; }
          .footer { margin-top: 32px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; text-align: right;">
          <button onclick="window.print()" style="padding: 8px 18px; background: #0f172a; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
            🖨️ Print / Save as PDF
          </button>
        </div>

        <div class="header">
          <div>
            <div class="brand-title">SHIVA ELECTRONICS</div>
            <div class="report-title">Sales Team Monthly Performance & Commission Summary</div>
          </div>
          <div style="text-align: right; font-size: 12.5px; color: #475569;">
            <div><b>Report Month:</b> ${month}</div>
            <div><b>Printed:</b> ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card" style="border-left: 4px solid #f59e0b;">
            <div class="kpi-label">Total Team Sales</div>
            <div class="kpi-value">₹${Number(kpis?.totalTeamSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card" style="border-left: 4px solid #3b82f6;">
            <div class="kpi-label">Total Invoices</div>
            <div class="kpi-value">${kpis?.totalInvoices || 0} Bills</div>
          </div>
          <div class="kpi-card" style="border-left: 4px solid #10b981;">
            <div class="kpi-label">Commission Earned</div>
            <div class="kpi-value" style="color:#15803d;">₹${Number(kpis?.totalTeamCommission || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="kpi-card" style="border-left: 4px solid #ef4444;">
            <div class="kpi-label">Pending Payouts</div>
            <div class="kpi-value" style="color:#b91c1c;">₹${Number(kpis?.totalTeamPending || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th>Code</th>
              <th>Sales Person</th>
              <th>Phone</th>
              <th style="text-align: right;">Target (₹)</th>
              <th style="text-align: right;">Sales Done (₹)</th>
              <th style="text-align: center;">Target %</th>
              <th style="text-align: center;">Invoices</th>
              <th style="text-align: right;">Commission (₹)</th>
              <th style="text-align: right;">Paid (₹)</th>
              <th style="text-align: right;">Balance (₹)</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="12" style="text-align:center; padding: 20px; color:#64748b;">No sales records found.</td></tr>`}
          </tbody>
        </table>

        <div class="footer">
          <div>Shiva Electronics ERP • Monthly Management Report</div>
          <div>Authorized Signatory: _________________________</div>
        </div>
      </body>
    </html>
  `);
  printWin.document.close();
}

const SalesPersonReport = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("performance");
  const [filterMode, setFilterMode] = useState("month"); // 'month' | 'range'
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedSalesPerson, setSelectedSalesPerson] = useState("");
  const [salesPersonsList, setSalesPersonsList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoicesSearch, setInvoicesSearch] = useState("");
  const [modalSearch, setModalSearch] = useState("");

  // Sync URL query params with state (?sales_person_id=...&month=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const spParam = params.get("sales_person_id");
    setSelectedSalesPerson(spParam || "");
    setActiveTab(spParam ? "invoices" : "performance");
    const monthParam = params.get("month");
    if (monthParam) {
      setSelectedMonth(monthParam);
    }
    const fromParam = params.get("from_date") || params.get("fromDate");
    const toParam = params.get("to_date") || params.get("toDate");
    if (fromParam && toParam) {
      setFilterMode("range");
      setFromDate(fromParam);
      setToDate(toParam);
    }
  }, [location.search]);

  // Report Data
  const [reportData, setReportData] = useState({
    kpis: {
      totalTeamSales: 0,
      totalTeamCommission: 0,
      totalTeamPaid: 0,
      totalTeamPending: 0,
      totalInvoices: 0,
      totalSalesPersons: 0,
    },
    salesPersons: [],
    transactions: [],
    payouts: [],
  });

  // Modal: Record Payout
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    sales_person_id: "",
    sales_person_name: "",
    month: currentMonthStr,
    amount_paid: 0,
    balance: 0,
    payout_date: new Date().toISOString().slice(0, 10),
    payment_method: "Cash",
    reference_no: "",
    notes: "",
  });
  const [savingPayout, setSavingPayout] = useState(false);

  // Modal: View Invoices for specific sales person
  const [invoicesModalOpen, setInvoicesModalOpen] = useState(false);
  const [selectedPersonForInvoices, setSelectedPersonForInvoices] = useState(null);
  const [modalInvoices, setModalInvoices] = useState([]);
  const [loadingModalInvoices, setLoadingModalInvoices] = useState(false);

  // Load Sales Persons for Filter Dropdown
  useEffect(() => {
    const fetchSalesPersons = async () => {
      try {
        const res = await api.get("/sales-persons");
        setSalesPersonsList(res.data?.data || []);
      } catch (err) {
        console.error("Failed to load sales persons:", err);
      }
    };
    const fetchBranches = async () => {
      try {
        const res = await api.get("/branches");
        setBranches(res.data?.data || res.data || []);
      } catch (err) {
        console.error("Failed to load branches:", err);
      }
    };
    fetchSalesPersons();
    fetchBranches();
  }, []);

  // Handle Month Change directly and sync URL
  const handleMonthChange = (newMonth) => {
    if (!newMonth) return;
    setSelectedMonth(newMonth);
    setFilterMode("month");
    setFromDate("");
    setToDate("");
    const params = new URLSearchParams(location.search);
    params.set("month", newMonth);
    params.delete("from_date");
    params.delete("to_date");
    params.delete("fromDate");
    params.delete("toDate");
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  // Step Month by offset (-1 for prev, +1 for next)
  const stepMonth = (offset) => {
    const baseMonth = selectedMonth || currentMonthStr;
    const [y, m] = baseMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    const pad = (n) => String(n).padStart(2, "0");
    const nextMonthStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    handleMonthChange(nextMonthStr);
  };

  // Quick Preset Date Ranges
  const handlePreset = (preset) => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const params = new URLSearchParams(location.search);

    if (preset === "this_month") {
      const mStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
      setFilterMode("month");
      setSelectedMonth(mStr);
      setFromDate("");
      setToDate("");
      params.set("month", mStr);
      params.delete("from_date");
      params.delete("to_date");
      params.delete("fromDate");
      params.delete("toDate");
    } else if (preset === "last_month") {
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const mStr = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`;
      setFilterMode("month");
      setSelectedMonth(mStr);
      setFromDate("");
      setToDate("");
      params.set("month", mStr);
      params.delete("from_date");
      params.delete("to_date");
      params.delete("fromDate");
      params.delete("toDate");
    } else if (preset === "today") {
      setFilterMode("range");
      setFromDate(todayStr);
      setToDate(todayStr);
      params.delete("month");
      params.set("from_date", todayStr);
      params.set("to_date", todayStr);
    } else if (preset === "last_30") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const fromStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      setFilterMode("range");
      setFromDate(fromStr);
      setToDate(todayStr);
      params.delete("month");
      params.set("from_date", fromStr);
      params.set("to_date", todayStr);
    }
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  // Preset status helpers for active highlighting
  const todayObj = new Date();
  const padNum = (n) => String(n).padStart(2, "0");
  const thisMonthVal = `${todayObj.getFullYear()}-${padNum(todayObj.getMonth() + 1)}`;
  const prevMonthObj = new Date(todayObj.getFullYear(), todayObj.getMonth() - 1, 1);
  const lastMonthVal = `${prevMonthObj.getFullYear()}-${padNum(prevMonthObj.getMonth() + 1)}`;
  const todayVal = `${todayObj.getFullYear()}-${padNum(todayObj.getMonth() + 1)}-${padNum(todayObj.getDate())}`;

  const isThisMonthActive = filterMode === "month" && selectedMonth === thisMonthVal;
  const isLastMonthActive = filterMode === "month" && selectedMonth === lastMonthVal;
  const isTodayActive = filterMode === "range" && fromDate === todayVal && toDate === todayVal;
  const isLast30Active = filterMode === "range" && toDate === todayVal && fromDate !== todayVal && fromDate !== "";

  const effectivePeriod = filterMode === "month"
    ? selectedMonth
    : `${fromDate || "Start"} to ${toDate || "Present"}`;

  // Fetch Report
  const fetchReport = async () => {
    setLoading(true);
    try {
      const activeBranch = getActiveBranchId();
      const params = {};
      if (filterMode === "range" && (fromDate || toDate)) {
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;
      } else {
        params.month = selectedMonth;
      }
      if (selectedSalesPerson) params.sales_person_id = selectedSalesPerson;
      if (activeBranch) params.branch_id = activeBranch;

      const res = await api.get("/sales-persons/reports/monthly", { params });
      if (res.data?.success) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch report:", err);
      toast.error("Failed to load performance report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedSalesPerson, filterMode, fromDate, toDate]);

  // Open Payout Modal
  const openPayoutModal = (sp) => {
    setPayoutForm({
      sales_person_id: sp.id,
      sales_person_name: sp.name,
      month: filterMode === "month" ? selectedMonth : currentMonthStr,
      amount_paid: sp.commission_balance || sp.commission_earned || 0,
      balance: sp.commission_balance || 0,
      payout_date: new Date().toISOString().slice(0, 10),
      payment_method: "Cash",
      reference_no: "",
      notes: `Commission payout for ${effectivePeriod}`,
    });
    setPayoutModalOpen(true);
  };

  // Submit Payout
  const handleSavePayout = async (e) => {
    e.preventDefault();
    if (!payoutForm.amount_paid || Number(payoutForm.amount_paid) <= 0) {
      toast.warn("Please enter a valid payout amount");
      return;
    }

    setSavingPayout(true);
    try {
      const res = await api.post("/sales-persons/payouts", payoutForm);
      toast.success(res.data?.message || "Commission payout recorded successfully");
      setPayoutModalOpen(false);
      fetchReport();
    } catch (err) {
      console.error("Payout error:", err);
      toast.error(err.response?.data?.message || "Failed to record payout");
    } finally {
      setSavingPayout(false);
    }
  };

  // Fetch all invoices for a specific executive
  const getExecutiveInvoices = async (spId) => {
    const local = (reportData.transactions || []).filter(
      (t) => Number(t.sales_person_id) === Number(spId)
    );
    if (local.length > 0 && local[0].items && local[0].items.length > 0) return local;

    try {
      const activeBranch = getActiveBranchId();
      const params = { sales_person_id: spId };
      if (filterMode === "range" && (fromDate || toDate)) {
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;
      } else {
        params.month = selectedMonth;
      }
      if (activeBranch) params.branch_id = activeBranch;
      let res = await api.get("/sales-persons/reports/monthly", { params });
      let txs = res.data?.transactions || [];

      // Fallback: If 0 results returned and branch_id was specified, retry without branch_id
      if (txs.length === 0 && params.branch_id) {
        const fallbackParams = { ...params };
        delete fallbackParams.branch_id;
        const fallbackRes = await api.get("/sales-persons/reports/monthly", { params: fallbackParams });
        txs = fallbackRes.data?.transactions || [];
      }

      return txs.length > 0 ? txs : local;
    } catch (err) {
      console.error("Failed to fetch executive invoices:", err);
      return local;
    }
  };

  // Open modal with accurate executive invoices
  const openInvoicesModal = async (sp) => {
    setSelectedPersonForInvoices(sp);
    setInvoicesModalOpen(true);
    setLoadingModalInvoices(true);
    setModalSearch("");
    try {
      const invoices = await getExecutiveInvoices(sp.id);
      setModalInvoices(invoices);
    } catch (err) {
      console.error("Error opening invoices modal:", err);
      setModalInvoices([]);
    } finally {
      setLoadingModalInvoices(false);
    }
  };

  // Download per-executive Excel (.xlsx) report
  const handleDownloadSingleExcel = async (sp) => {
    if (!sp) return;
    toast.info(`Preparing Excel report for ${sp.name}...`);
    const invoices = await getExecutiveInvoices(sp.id);
    await exportSingleSalesPersonExcel({
      salesPerson: sp,
      invoices,
      period: effectivePeriod,
    });
    toast.success(`Downloaded Excel report for ${sp.name}`);
  };

  // Download team summary Excel (.xlsx) report
  const handleDownloadTeamExcel = async () => {
    if (!reportData.salesPersons || reportData.salesPersons.length === 0) {
      toast.info("No sales data available for this period");
      return;
    }
    toast.info("Preparing Team Excel report...");
    await exportTeamSalesPersonsExcel({
      salesPersons: reportData.salesPersons,
      transactions: reportData.transactions,
      kpis: reportData.kpis,
      period: effectivePeriod,
    });
    toast.success("Downloaded Team Excel report");
  };

  // Download per-executive CSV report (with itemized bills)
  const handleDownloadSingleCsv = async (sp) => {
    if (!sp) return;
    toast.info(`Generating sales CSV for ${sp.name}...`);
    const invoices = await getExecutiveInvoices(sp.id);
    const csv = buildSingleExecutiveCsv(sp, invoices, effectivePeriod);
    const code = sp.employee_code || `SP-${sp.id}`;
    const safeName = (sp.name || "Executive").replace(/[^a-zA-Z0-9_-]/g, "_");
    triggerDownload(csv, `Shiva_Electronics_Sales_Report_${code}_${safeName}_${effectivePeriod}.csv`);
  };

  // Print per-executive PDF / Print report
  const handlePrintSingle = async (sp) => {
    if (!sp) return;
    const invoices = await getExecutiveInvoices(sp.id);
    printExecutiveReport(sp, invoices, effectivePeriod);
  };

  const handleDownloadSinglePdf = async (sp) => {
    if (!sp) return;
    try {
      toast.info(`Preparing PDF report for ${sp.name}...`);
      const invoices = await getExecutiveInvoices(sp.id);
      await downloadExecutivePdf(sp, invoices, effectivePeriod);
      toast.success(`Downloaded PDF report for ${sp.name}`);
    } catch (err) {
      console.error("Failed to generate sales person PDF:", err);
      toast.error("Failed to generate PDF report");
    }
  };

  // Download full team PDF report
  const handleDownloadTeamPdf = async () => {
    if (!reportData.salesPersons || reportData.salesPersons.length === 0) {
      toast.info("No sales data available for this period");
      return;
    }
    try {
      toast.info("Preparing Team PDF report...");
      await downloadTeamPdf(reportData.salesPersons, reportData.kpis, effectivePeriod);
      toast.success("Downloaded Team PDF report");
    } catch (err) {
      console.error("Failed to generate team PDF report:", err);
      toast.error("Failed to generate Team PDF report");
    }
  };

  // Download full team summary CSV
  const handleDownloadTeamCsv = () => {
    if (!reportData.salesPersons || reportData.salesPersons.length === 0) {
      toast.info("No sales data available for this period");
      return;
    }
    const csv = buildTeamSummaryCsv(reportData.salesPersons, effectivePeriod);
    triggerDownload(csv, `Shiva_Electronics_Sales_Team_Report_${effectivePeriod}.csv`);
  };

  // Print full team monthly report
  const handlePrintTeam = () => {
    if (!reportData.salesPersons || reportData.salesPersons.length === 0) {
      toast.info("No sales data available for this period");
      return;
    }
    printTeamReport(reportData.salesPersons, reportData.kpis, effectivePeriod);
  };

  // Download all transactions in month as CSV
  const handleDownloadAllTransactionsCsv = () => {
    if (!reportData.transactions || reportData.transactions.length === 0) {
      toast.info("No invoices found to export");
      return;
    }
    const lines = [];
    lines.push(["SHIVA ELECTRONICS - SALES INVOICES REPORT"].map(escapeCsv).join(","));
    lines.push([`Period / Date Range: ${effectivePeriod}    |    Generated On: ${new Date().toLocaleString("en-IN")}`].map(escapeCsv).join(","));
    lines.push([]);
    const headers = [
      "S.No",
      "Sales Date",
      "Invoice No",
      "Sales Person",
      "Employee Code",
      "Customer Name",
      "Customer Phone",
      "Products Sold",
      "Qty",
      "Invoice Amount (₹)",
      "Payment Status",
      "Commission Earned (₹)",
    ];
    lines.push(headers.map(escapeCsv).join(","));

    let sumSales = 0;
    let sumComm = 0;
    let sumQty = 0;
    reportData.transactions.forEach((tx, idx) => {
      const s = Number(tx.final_amount || 0);
      const c = Number(tx.commission_amount || 0);
      const q = Number(tx.total_qty || 0);
      const prods = tx.products_summary || tx.product_name || (Array.isArray(tx.items) && tx.items.map(i => i.product_name).join(", ")) || "—";
      sumSales += s;
      sumComm += c;
      sumQty += q;
      lines.push([
        idx + 1,
        formatReportDate(tx.sales_date),
        tx.invoice_no || "—",
        tx.sales_person_name || "—",
        tx.employee_code || "—",
        tx.customer_name || "Walk-in Customer",
        tx.customer_phone || "—",
        prods,
        q || "—",
        s.toFixed(2),
        tx.payment_status || "—",
        c.toFixed(2),
      ].map(escapeCsv).join(","));
    });
    lines.push([]);
    lines.push([
      "TOTAL",
      "",
      `${reportData.transactions.length} Bills`,
      "",
      "",
      "",
      "",
      "",
      sumQty || 0,
      sumSales.toFixed(2),
      "",
      sumComm.toFixed(2),
    ].map(escapeCsv).join(","));
    triggerDownload("\uFEFF" + lines.join("\r\n"), `Shiva_Electronics_Invoices_${effectivePeriod}.csv`);
  };

  // Active executive if single is selected
  const activeExecutive = selectedSalesPerson
    ? reportData.salesPersons.find((s) => String(s.id) === String(selectedSalesPerson)) ||
      salesPersonsList.find((s) => String(s.id) === String(selectedSalesPerson))
    : null;
  const filteredTransactions = (reportData.transactions || []).filter((tx) => {
    if (!invoicesSearch.trim()) return true;
    const query = invoicesSearch.toLowerCase().trim();
    return (
      tx.invoice_no?.toLowerCase().includes(query) ||
      tx.sales_person_name?.toLowerCase().includes(query) ||
      tx.employee_code?.toLowerCase().includes(query) ||
      tx.customer_name?.toLowerCase().includes(query) ||
      tx.product_name?.toLowerCase().includes(query) ||
      tx.products_summary?.toLowerCase().includes(query)
    );
  });
  const visibleSalesTotal = filteredTransactions.reduce(
    (sum, tx) => sum + Number(tx.final_amount || 0),
    0
  );
  const visibleCommissionTotal = filteredTransactions.reduce(
    (sum, tx) => sum + Number(tx.commission_amount || 0),
    0
  );

  return (
    <Container fluid className="py-3">
      {/* Header & Title */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
            <FaChartLine className="text-warning" /> Sales Person Performance & Commission Report
          </h4>
          <p className="text-muted small mb-0">
            View detailed sales performance, products billed, and download per-executive reports in Excel, CSV, or Print format.
          </p>
        </div>

        {/* Action Buttons: Excel, CSV, Print, PDF */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Button
            color="success"
            size="sm"
            className="d-flex align-items-center gap-1 shadow-sm fw-semibold"
            onClick={() => {
              if (activeExecutive) {
                handleDownloadSingleExcel(activeExecutive);
              } else {
                handleDownloadTeamExcel();
              }
            }}
            title={activeExecutive ? `Download Excel (.xlsx) Report for ${activeExecutive.name}` : "Download Team Excel (.xlsx) Report"}
          >
            <FaFileExcel size={13} /> {activeExecutive ? "Export Excel (.xlsx)" : "Export Team Excel (.xlsx)"}
          </Button>

          <Button
            color="info"
            size="sm"
            className="d-flex align-items-center gap-1 shadow-sm fw-semibold text-white"
            onClick={() => {
              if (activeExecutive) {
                handleDownloadSingleCsv(activeExecutive);
              } else {
                handleDownloadTeamCsv();
              }
            }}
            title={activeExecutive ? `Download CSV for ${activeExecutive.name}` : "Download Team CSV Report"}
          >
            <FaFileCsv size={13} /> {activeExecutive ? "Export CSV" : "Export Team CSV"}
          </Button>

          <Button
            color="dark"
            size="sm"
            className="d-flex align-items-center gap-1 shadow-sm fw-semibold"
            onClick={() => {
              if (activeExecutive) {
                handlePrintSingle(activeExecutive);
              } else {
                handlePrintTeam();
              }
            }}
            title={activeExecutive ? `Print Report for ${activeExecutive.name}` : "Print Team Report"}
          >
            <FaPrint size={13} /> {activeExecutive ? "Print Report" : "Print Team Report"}
          </Button>

          <Button
            color="danger"
            size="sm"
            className="d-flex align-items-center gap-1 shadow-sm fw-semibold"
            onClick={() => {
              if (activeExecutive) {
                handleDownloadSinglePdf(activeExecutive);
              } else {
                handleDownloadTeamPdf();
              }
            }}
            title={activeExecutive ? `Download PDF Report for ${activeExecutive.name}` : "Download Team PDF Report"}
          >
            <FaFilePdf size={13} /> {activeExecutive ? "Export PDF" : "Export Team PDF"}
          </Button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <Card className="border-0 shadow-sm mb-3">
        <CardBody className="p-3">
          <Row className="g-3 align-items-center">
            {/* Sales Executive Selector */}
            <Col lg={3} md={4} sm={6} xs={12}>
              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted fw-bold text-nowrap">Executive:</span>
                <Input
                  type="select"
                  bsSize="sm"
                  value={selectedSalesPerson}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedSalesPerson(val);
                    setActiveTab(val ? "invoices" : "performance");
                    const params = new URLSearchParams(location.search);
                    if (val) params.set("sales_person_id", val);
                    else params.delete("sales_person_id");
                    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
                  }}
                  className="shadow-sm fw-semibold"
                >
                  <option value="">All Sales Executives</option>
                  {salesPersonsList.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} ({sp.employee_code || `SP-${String(sp.id).padStart(3, "0")}`})
                    </option>
                  ))}
                </Input>
              </div>
            </Col>

            {/* Filter Mode Toggle: Period Type on a single line */}
            <Col xs="auto">
              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted fw-bold text-nowrap">Period Type:</span>
                <div className="btn-group text-nowrap" role="group">
                  <button
                    type="button"
                    className={`btn btn-sm text-nowrap px-3 py-1 ${filterMode === "month" ? "btn-primary fw-semibold" : "btn-outline-secondary"}`}
                    style={{ whiteSpace: "nowrap" }}
                    onClick={() => {
                      setFilterMode("month");
                      setFromDate("");
                      setToDate("");
                      const params = new URLSearchParams(location.search);
                      params.set("month", selectedMonth || currentMonthStr);
                      params.delete("from_date");
                      params.delete("to_date");
                      params.delete("fromDate");
                      params.delete("toDate");
                      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
                    }}
                  >
                    By Month
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm text-nowrap px-3 py-1 ${filterMode === "range" ? "btn-primary fw-semibold" : "btn-outline-secondary"}`}
                    style={{ whiteSpace: "nowrap" }}
                    onClick={() => {
                      setFilterMode("range");
                      const pad = (n) => String(n).padStart(2, "0");
                      const tStr = `${todayObj.getFullYear()}-${pad(todayObj.getMonth() + 1)}-${pad(todayObj.getDate())}`;
                      const fVal = fromDate || tStr;
                      const tVal = toDate || tStr;
                      setFromDate(fVal);
                      setToDate(tVal);
                      const params = new URLSearchParams(location.search);
                      params.delete("month");
                      params.set("from_date", fVal);
                      params.set("to_date", tVal);
                      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
                    }}
                  >
                    Custom Range
                  </button>
                </div>
              </div>
            </Col>

            {/* Date Pickers */}
            {filterMode === "month" ? (
              <Col xs="auto">
                <div className="d-flex align-items-center gap-2">
                  <span className="small text-muted fw-bold text-nowrap">Select Month:</span>
                  <div
                    className="input-group input-group-sm shadow-sm"
                    style={{ width: "205px" }}
                    onClick={() => {
                      try {
                        monthInputRef.current?.showPicker?.();
                      } catch (_) {}
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        stepMonth(-1);
                      }}
                      title="Previous Month"
                    >
                      ‹
                    </button>
                    <input
                      ref={monthInputRef}
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          monthInputRef.current?.showPicker?.();
                        } catch (_) {}
                      }}
                      className="form-control form-control-sm text-center fw-bold text-dark border-start-0 border-end-0 bg-white"
                      style={{ cursor: "pointer", fontSize: "13px" }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        stepMonth(1);
                      }}
                      title="Next Month"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </Col>
            ) : (
              <Col xs="auto">
                <div className="d-flex align-items-center gap-2">
                  <span className="small text-muted fw-bold text-nowrap">From:</span>
                  <Input
                    type="date"
                    bsSize="sm"
                    value={fromDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFromDate(val);
                      const params = new URLSearchParams(location.search);
                      params.set("from_date", val);
                      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
                    }}
                    style={{ width: "135px" }}
                  />
                  <span className="small text-muted fw-bold text-nowrap">To:</span>
                  <Input
                    type="date"
                    bsSize="sm"
                    value={toDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setToDate(val);
                      const params = new URLSearchParams(location.search);
                      params.set("to_date", val);
                      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
                    }}
                    style={{ width: "135px" }}
                  />
                </div>
              </Col>
            )}

            {/* Quick Preset Buttons */}
            <Col xs="auto" className="ms-auto">
              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted fw-bold text-nowrap">Quick Presets:</span>
                <div className="btn-group btn-group-sm text-nowrap" role="group">
                  <button
                    type="button"
                    className={`btn btn-sm ${isThisMonthActive ? "btn-primary fw-bold" : "btn-outline-secondary text-dark"}`}
                    style={{ fontSize: "11.5px", whiteSpace: "nowrap" }}
                    onClick={() => handlePreset("this_month")}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${isLastMonthActive ? "btn-primary fw-bold" : "btn-outline-secondary text-dark"}`}
                    style={{ fontSize: "11.5px", whiteSpace: "nowrap" }}
                    onClick={() => handlePreset("last_month")}
                  >
                    Last Month
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${isTodayActive ? "btn-primary fw-bold" : "btn-outline-secondary text-dark"}`}
                    style={{ fontSize: "11.5px", whiteSpace: "nowrap" }}
                    onClick={() => handlePreset("today")}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${isLast30Active ? "btn-primary fw-bold" : "btn-outline-secondary text-dark"}`}
                    style={{ fontSize: "11.5px", whiteSpace: "nowrap" }}
                    onClick={() => handlePreset("last_30")}
                  >
                    Last 30 Days
                  </button>
                </div>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Single Executive Highlight Card (when filtered) */}
      {activeExecutive && (
        <Card className="border-0 shadow-sm mb-4" style={{ borderLeft: "5px solid #FFD700" }}>
          <CardBody className="p-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-warning fw-bold bg-dark shadow-sm"
                  style={{ width: 48, height: 48, fontSize: "1.2rem" }}
                >
                  <FaUserTie />
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <h5 className="fw-bold mb-0 text-dark">{activeExecutive.name}</h5>
                    <span className="badge bg-dark text-warning font-monospace px-2 py-1">
                      {activeExecutive.employee_code || `SP-${activeExecutive.id}`}
                    </span>
                    <Badge color={activeExecutive.status === "Active" ? "success" : "secondary"}>
                      {activeExecutive.status || "Active"}
                    </Badge>
                  </div>
                  <div className="text-muted small mt-1 d-flex flex-wrap gap-3">
                    {activeExecutive.phone && <span>📞 {activeExecutive.phone}</span>}
                    {activeExecutive.email && <span>✉️ {activeExecutive.email}</span>}
                    <span>
                      🎯 Target: <b>₹{Number(activeExecutive.target_amount || 0).toLocaleString()}</b>
                    </span>
                    <span>
                      💼 Commission:{" "}
                      <b>
                        {activeExecutive.commission_type === "fixed"
                          ? `₹${Number(activeExecutive.commission_rate || 0)} / bill`
                          : `${Number(activeExecutive.commission_rate || 0)}% of sale`}
                      </b>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons on executive banner */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {Number(activeExecutive.commission_balance || 0) > 0 && (
                  <Button
                    color="primary"
                    size="sm"
                    className="fw-semibold d-flex align-items-center gap-1 shadow-sm"
                    onClick={() => openPayoutModal(activeExecutive)}
                  >
                    <FaMoneyCheckAlt /> Pay Commission
                  </Button>
                )}
                <Button
                  color="light"
                  size="sm"
                  className="border text-secondary fw-semibold"
                  onClick={() => {
                    setSelectedSalesPerson("");
                    navigate(`/index/sales-person-report?month=${selectedMonth}`, { replace: true });
                  }}
                  title="Clear filter and view all executives"
                >
                  ✕ View All
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        {/* Card 1: Total Sales */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 shadow-sm"
            style={{
              borderRadius: "10px",
              border: "1px solid #FDE68A",
              borderTop: "4px solid #F59E0B",
              background: "#FFFFFF",
            }}
          >
            <CardBody className="p-3 d-flex flex-column justify-content-between">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <div className="text-muted fw-bold" style={{ fontSize: "0.74rem", letterSpacing: "0.5px" }}>
                  {activeExecutive ? "TOTAL SALES" : "TOTAL TEAM SALES"}
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: "38px", height: "38px", background: "#FEF3C7", color: "#D97706" }}
                >
                  <FaFileInvoiceDollar size={18} />
                </div>
              </div>
              <div>
                <div className="fs-4 fw-bold text-dark mb-1" style={{ letterSpacing: "-0.5px" }}>
                  ₹{Number(reportData.kpis.totalTeamSales || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="small text-muted d-flex align-items-center gap-1" style={{ fontSize: "0.78rem" }}>
                  <span className="badge bg-light text-dark border px-1">
                    {reportData.kpis.totalInvoices || 0}
                  </span>
                  <span>invoices billed in period</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 2: Commission Earned */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 shadow-sm"
            style={{
              borderRadius: "10px",
              border: "1px solid #BFDBFE",
              borderTop: "4px solid #3B82F6",
              background: "#FFFFFF",
            }}
          >
            <CardBody className="p-3 d-flex flex-column justify-content-between">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <div className="text-muted fw-bold" style={{ fontSize: "0.74rem", letterSpacing: "0.5px" }}>
                  {activeExecutive ? "COMMISSION EARNED" : "TEAM COMMISSION"}
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: "38px", height: "38px", background: "#DBEAFE", color: "#2563EB" }}
                >
                  <FaRupeeSign size={18} />
                </div>
              </div>
              <div>
                <div className="fs-4 fw-bold text-primary mb-1" style={{ letterSpacing: "-0.5px" }}>
                  ₹{Number(reportData.kpis.totalTeamCommission || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="small text-muted" style={{ fontSize: "0.78rem" }}>
                  Calculated based on performance rate
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 3: Commission Paid */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 shadow-sm"
            style={{
              borderRadius: "10px",
              border: "1px solid #BBF7D0",
              borderTop: "4px solid #10B981",
              background: "#FFFFFF",
            }}
          >
            <CardBody className="p-3 d-flex flex-column justify-content-between">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <div className="text-muted fw-bold" style={{ fontSize: "0.74rem", letterSpacing: "0.5px" }}>
                  {activeExecutive ? "COMMISSION PAID" : "COMMISSION PAID"}
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: "38px", height: "38px", background: "#DCFCE7", color: "#16A34A" }}
                >
                  <FaCheckCircle size={18} />
                </div>
              </div>
              <div>
                <div className="fs-4 fw-bold text-success mb-1" style={{ letterSpacing: "-0.5px" }}>
                  ₹{Number(reportData.kpis.totalTeamPaid || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="small text-success fw-semibold" style={{ fontSize: "0.78rem" }}>
                  Disbursed via recorded payouts
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Card 4: Pending Payout */}
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="h-100 shadow-sm"
            style={{
              borderRadius: "10px",
              border: "1px solid #FECACA",
              borderTop: "4px solid #EF4444",
              background: "#FFFFFF",
            }}
          >
            <CardBody className="p-3 d-flex flex-column justify-content-between">
              <div className="d-flex align-items-start justify-content-between mb-2">
                <div className="text-muted fw-bold" style={{ fontSize: "0.74rem", letterSpacing: "0.5px" }}>
                  {activeExecutive ? "PENDING COMMISSION" : "PENDING PAYOUT"}
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: "38px", height: "38px", background: "#FEE2E2", color: "#DC2626" }}
                >
                  <FaClock size={18} />
                </div>
              </div>
              <div>
                <div className="fs-4 fw-bold text-danger mb-1" style={{ letterSpacing: "-0.5px" }}>
                  ₹{Number(reportData.kpis.totalTeamPending || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="small text-danger fw-semibold" style={{ fontSize: "0.78rem" }}>
                  Outstanding balance to be settled
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Nav tabs className="mb-3 border-bottom">
        <NavItem>
          <NavLink
            className={`cursor-pointer fw-semibold ${activeTab === "performance" ? "active border-bottom-0 text-dark" : "text-muted"}`}
            onClick={() => setActiveTab("performance")}
            style={{ cursor: "pointer" }}
          >
            <FaBullseye className="me-2 text-warning" /> Performance & Commission Breakdown
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={`cursor-pointer fw-semibold ${activeTab === "invoices" ? "active border-bottom-0 text-dark" : "text-muted"}`}
            onClick={() => setActiveTab("invoices")}
            style={{ cursor: "pointer" }}
          >
            <FaListAlt className="me-2 text-primary" /> {activeExecutive ? "Sales Transactions" : "Month Invoices List"} ({reportData.transactions?.length || 0})
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={`cursor-pointer fw-semibold ${activeTab === "payouts" ? "active border-bottom-0 text-dark" : "text-muted"}`}
            onClick={() => setActiveTab("payouts")}
            style={{ cursor: "pointer" }}
          >
            <FaHistory className="me-2 text-success" /> Payout History ({reportData.payouts?.length || 0})
          </NavLink>
        </NavItem>
      </Nav>

      {/* TAB 1: Performance & Commission */}
      {activeTab === "performance" && (
        <Card className="border-0 shadow-sm">
          <CardBody className="p-0">
            <div className="table-responsive">
              <Table hover size="sm" align="middle" className="mb-0" style={{ fontSize: "13px" }}>
                <thead className="table-light text-nowrap">
                  <tr>
                    <th style={{ width: 75, padding: "10px 8px" }}>Code</th>
                    <th style={{ minWidth: 130, padding: "10px 8px" }}>Executive</th>
                    <th className="text-end" style={{ width: 105, padding: "10px 8px" }}>Target (₹)</th>
                    <th className="text-end" style={{ width: 120, padding: "10px 8px" }}>Sales (₹)</th>
                    <th style={{ width: 155, padding: "10px 8px" }}>Achievement</th>
                    <th className="text-center" style={{ width: 65, padding: "10px 8px" }}>Bills</th>
                    <th className="text-center" style={{ width: 80, padding: "10px 8px" }}>Rate</th>
                    <th className="text-end" style={{ width: 100, padding: "10px 8px" }}>Earned (₹)</th>
                    <th className="text-end" style={{ width: 95, padding: "10px 8px" }}>Paid (₹)</th>
                    <th className="text-end" style={{ width: 100, padding: "10px 8px" }}>Balance (₹)</th>
                    <th className="text-center" style={{ width: 80, padding: "10px 8px" }}>Status</th>
                    <th className="text-center" style={{ width: 160, padding: "10px 8px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="text-center py-5">
                        <Spinner color="warning" size="sm" className="me-2" />
                        Generating monthly performance data...
                      </td>
                    </tr>
                  ) : reportData.salesPersons.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-5 text-muted">
                        No sales activity found for month <b>{selectedMonth}</b>.
                      </td>
                    </tr>
                  ) : (
                    reportData.salesPersons.map((sp) => {
                      const targetPct = sp.target_achieved_pct || 0;
                      const progressColor =
                        targetPct >= 100 ? "success" : targetPct >= 70 ? "warning" : "danger";

                      return (
                        <tr key={sp.id} className="text-nowrap">
                          <td style={{ padding: "8px" }}>
                            <span className="badge bg-dark text-warning font-monospace px-2 py-1" style={{ fontSize: "11px" }}>
                              {sp.employee_code || `SP-${sp.id}`}
                            </span>
                          </td>
                          <td style={{ padding: "8px", whiteSpace: "normal", minWidth: 130 }}>
                            <div className="fw-bold text-dark" style={{ lineHeight: 1.3 }}>{sp.name}</div>
                            {sp.phone && <small className="text-muted" style={{ fontSize: "11px" }}>{sp.phone}</small>}
                          </td>
                          <td className="text-end" style={{ padding: "8px" }}>
                            <span className="fw-semibold text-secondary">
                              ₹{Number(sp.target_amount || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="text-end" style={{ padding: "8px" }}>
                            <span className="fw-bold text-dark">
                              ₹{Number(sp.total_sales || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <div className="d-flex align-items-center justify-content-between mb-1" style={{ fontSize: "11.5px" }}>
                              <span className="fw-bold">{targetPct}%</span>
                              <span className="text-muted" style={{ fontSize: "10.5px" }}>
                                {Number(sp.target_amount || 0) > 0
                                  ? targetPct >= 100
                                    ? "✓ Hit!"
                                    : `₹${Math.max(
                                        0,
                                        Number(sp.target_amount) - Number(sp.total_sales)
                                      ).toLocaleString()} left`
                                  : "No target"}
                              </span>
                            </div>
                            <Progress value={Math.min(100, targetPct)} color={progressColor} style={{ height: 5 }} />
                          </td>
                          <td className="text-center" style={{ padding: "8px" }}>
                            <span className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: "11.5px" }}>
                              {sp.total_invoices}
                            </span>
                          </td>
                          <td className="text-center" style={{ padding: "8px" }}>
                            <span className="text-muted" style={{ fontSize: "12px" }}>
                              {sp.commission_type === "fixed"
                                ? `₹${Number(sp.commission_rate || 0)}/bill`
                                : `${Number(sp.commission_rate || 0)}%`}
                            </span>
                          </td>
                          <td className="text-end" style={{ padding: "8px" }}>
                            <span className="fw-bold text-primary">
                              ₹{Number(sp.commission_earned || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td className="text-end" style={{ padding: "8px" }}>
                            <span className="text-success fw-semibold">
                              ₹{Number(sp.commission_paid || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td className="text-end" style={{ padding: "8px" }}>
                            <span
                              className={`fw-bold ${
                                Number(sp.commission_balance || 0) > 0
                                  ? "text-danger"
                                  : "text-muted"
                              }`}
                            >
                              ₹{Number(sp.commission_balance || 0).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td className="text-center" style={{ padding: "8px" }}>
                            <Badge
                              color={
                                sp.payout_status === "Paid"
                                  ? "success"
                                  : sp.payout_status === "Partially Paid"
                                  ? "warning"
                                  : sp.payout_status === "Pending"
                                  ? "danger"
                                  : "secondary"
                              }
                              className="px-2 py-1"
                              style={{ fontSize: "10.5px" }}
                            >
                              {sp.payout_status}
                            </Badge>
                          </td>
                          <td className="text-center" style={{ padding: "6px 4px" }}>
                            <div className="d-inline-flex align-items-center gap-1">
                              <Button
                                size="sm"
                                color="light"
                                className="border py-0 px-1"
                                onClick={() => openInvoicesModal(sp)}
                                style={{ fontSize: "11px", lineHeight: "22px" }}
                                title="View invoices billed"
                              >
                                <FaListAlt className="text-primary" />
                              </Button>
                              <Button
                                size="sm"
                                color="light"
                                className="border py-0 px-1"
                                onClick={() => handleDownloadSingleExcel(sp)}
                                style={{ fontSize: "11px", lineHeight: "22px" }}
                                title="Download Excel report"
                              >
                                <FaFileExcel className="text-success" />
                              </Button>
                              <Button
                                size="sm"
                                color="light"
                                className="border py-0 px-1"
                                onClick={() => handleDownloadSingleCsv(sp)}
                                style={{ fontSize: "11px", lineHeight: "22px" }}
                                title="Download CSV report"
                              >
                                <FaFileCsv className="text-info" />
                              </Button>
                              <Button
                                size="sm"
                                color="light"
                                className="border py-0 px-1"
                                onClick={() => handlePrintSingle(sp)}
                                style={{ fontSize: "11px", lineHeight: "22px" }}
                                title="Print Report"
                              >
                                <FaPrint className="text-dark" />
                              </Button>
                              <Button
                                size="sm"
                                color="light"
                                className="border py-0 px-1"
                                onClick={() => handleDownloadSinglePdf(sp)}
                                style={{ fontSize: "11px", lineHeight: "22px" }}
                                title="Download PDF Report"
                              >
                                <FaFilePdf className="text-danger" />
                              </Button>
                              {Number(sp.commission_balance || 0) > 0 && (
                                <Button
                                  size="sm"
                                  color="warning"
                                  className="text-dark fw-bold py-0 px-1"
                                  onClick={() => openPayoutModal(sp)}
                                  style={{ fontSize: "10px", lineHeight: "22px" }}
                                  title="Pay Commission"
                                >
                                  ₹
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* TAB 2: Period Invoices List */}
      {activeTab === "invoices" && (
        <Card className="border-0 shadow-sm">
          {activeExecutive && (
            <div className="p-3 border-bottom bg-white">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div>
                  <h6 className="fw-bold mb-1 text-dark">{activeExecutive.name} — Sales Report</h6>
                  <div className="small text-muted">
                    {activeExecutive.employee_code || `SP-${activeExecutive.id}`} · {effectivePeriod}
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <Badge color="light" className="border text-dark px-2 py-1">
                    {reportData.transactions?.length || 0} bills
                  </Badge>
                  <Badge color="light" className="border text-success px-2 py-1">
                    Sales: ₹{Number(reportData.kpis.totalTeamSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Badge>
                  <Badge color="light" className="border text-primary px-2 py-1">
                    Commission: ₹{Number(reportData.kpis.totalTeamCommission || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <div className="px-3 py-2 bg-light border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <span className="small text-muted text-nowrap">
                Showing <b>{filteredTransactions.length}</b> of <b>{reportData.transactions?.length || 0}</b>{" "}
                {activeExecutive ? "sales" : "invoices"} in <b>{effectivePeriod}</b>
              </span>
              <Input
                type="text"
                bsSize="sm"
                placeholder="Filter by invoice, customer, product..."
                value={invoicesSearch}
                onChange={(e) => setInvoicesSearch(e.target.value)}
                className="bg-white shadow-sm"
                style={{ width: "min(100%, 250px)" }}
              />
            </div>
            {(reportData.transactions?.length > 0 || activeExecutive) && (
              <div className="d-flex flex-wrap gap-1" data-html2canvas-ignore="true">
                {activeExecutive ? (
                  <>
                    <Button color="success" size="sm" className="d-flex align-items-center gap-1 fw-semibold py-0 px-2" style={{ fontSize: "12px" }} onClick={() => handleDownloadSingleExcel(activeExecutive)}>
                      <FaFileExcel size={11} /> Excel
                    </Button>
                    <Button color="info" size="sm" className="d-flex align-items-center gap-1 fw-semibold text-white py-0 px-2" style={{ fontSize: "12px" }} onClick={() => handleDownloadSingleCsv(activeExecutive)}>
                      <FaFileCsv size={11} /> CSV
                    </Button>
                    <Button color="dark" size="sm" className="d-flex align-items-center gap-1 fw-semibold py-0 px-2" style={{ fontSize: "12px" }} onClick={() => handlePrintSingle(activeExecutive)}>
                      <FaPrint size={11} /> Print
                    </Button>
                    <Button color="danger" size="sm" className="d-flex align-items-center gap-1 fw-semibold py-0 px-2" style={{ fontSize: "12px" }} onClick={() => handleDownloadSinglePdf(activeExecutive)}>
                      <FaFilePdf size={11} /> PDF
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      color="success"
                      size="sm"
                      className="d-flex align-items-center gap-1 shadow-sm fw-semibold py-0 px-2"
                      style={{ fontSize: "12px" }}
                      onClick={handleDownloadTeamExcel}
                    >
                      <FaFileExcel size={11} /> Invoices Excel
                    </Button>
                    <Button
                      color="info"
                      size="sm"
                      className="d-flex align-items-center gap-1 shadow-sm fw-semibold text-white py-0 px-2"
                      style={{ fontSize: "12px" }}
                      onClick={handleDownloadAllTransactionsCsv}
                    >
                      <FaFileCsv size={11} /> Invoices CSV
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          <CardBody className="p-0">
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0 align-middle" style={{ fontSize: "13px" }}>
                <thead className="table-light">
                  <tr className="text-nowrap">
                    <th style={{ width: 42, padding: "10px 8px" }}>#</th>
                    <th style={{ width: 100, padding: "10px 8px" }}>Date</th>
                    <th style={{ width: 130, padding: "10px 8px" }}>Invoice No</th>
                    {!activeExecutive && <th style={{ minWidth: 155, padding: "10px 8px" }}>Sales Person</th>}
                    <th style={{ minWidth: 170, padding: "10px 8px" }}>Customer</th>
                    <th style={{ minWidth: 200, padding: "10px 8px" }}>Products / Items Sold</th>
                    <th className="text-center" style={{ width: 55, padding: "10px 8px" }}>Qty</th>
                    <th className="text-end" style={{ width: 120, padding: "10px 8px" }}>Bill Amount</th>
                    <th className="text-end" style={{ width: 110, padding: "10px 8px" }}>Commission</th>
                    <th className="text-center" style={{ width: 100, padding: "10px 8px" }}>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={activeExecutive ? 9 : 10} className="text-center py-5">
                        <Spinner color="warning" size="sm" className="me-2" />
                        Loading sales...
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={activeExecutive ? 9 : 10} className="text-center py-5 text-muted">
                        {invoicesSearch
                          ? `No sales match "${invoicesSearch}".`
                          : `No transactions linked to a sales person in ${effectivePeriod}.`}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx, idx) => {
                      const prods = tx.products_summary || tx.product_name || (Array.isArray(tx.items) && tx.items.map(i => i.product_name).join(", ")) || "—";
                      return (
                        <tr key={tx.id} className="text-nowrap">
                          <td className="small text-muted" style={{ padding: "8px" }}>{idx + 1}</td>
                          <td className="small" style={{ padding: "8px" }}>{tx.sales_date || "—"}</td>
                          <td style={{ padding: "8px" }}>
                            <span className="fw-bold font-monospace text-primary" style={{ fontSize: "12px" }}>
                              {tx.invoice_no || "—"}
                            </span>
                          </td>
                          {!activeExecutive && <td style={{ padding: "8px", whiteSpace: "normal" }}>
                            <span className="fw-semibold text-dark">{tx.sales_person_name}</span>{" "}
                            <small className="text-muted">({tx.employee_code})</small>
                          </td>}
                          <td style={{ padding: "8px", whiteSpace: "normal" }}>
                            <div>{tx.customer_name || "Walk-in Customer"}</div>
                            {tx.customer_phone && <small className="text-muted" style={{ fontSize: "11px" }}>{tx.customer_phone}</small>}
                          </td>
                          <td className="small" style={{ padding: "8px", maxWidth: 220, whiteSpace: "normal" }}>
                            <div className="text-truncate" title={prods} style={{ maxWidth: 220 }}>
                              {prods}
                            </div>
                          </td>
                          <td className="text-center fw-semibold" style={{ padding: "8px" }}>
                            {tx.total_qty || "—"}
                          </td>
                          <td className="text-end fw-bold" style={{ padding: "8px" }}>
                            ₹{Number(tx.final_amount || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="text-end text-success fw-bold" style={{ padding: "8px" }}>
                            ₹{Number(tx.commission_amount || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="text-center" style={{ padding: "8px" }}>
                            <Badge
                              color={
                                tx.payment_status?.toLowerCase() === "paid" ? "success" : "warning"
                              }
                              className="px-2 py-1"
                              style={{ fontSize: "11px" }}
                            >
                              {tx.payment_status || "—"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {!loading && filteredTransactions.length > 0 && (
                  <tfoot className="table-light fw-bold text-nowrap">
                    <tr>
                      <td colSpan={activeExecutive ? 5 : 6} className="text-end" style={{ padding: "10px 8px" }}>
                        TOTAL ({filteredTransactions.length} bills)
                      </td>
                      <td className="text-center" style={{ padding: "10px 8px" }}>
                        {filteredTransactions.reduce((sum, tx) => sum + Number(tx.total_qty || 0), 0) || "—"}
                      </td>
                      <td className="text-end" style={{ padding: "10px 8px" }}>
                        ₹{visibleSalesTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-end text-success" style={{ padding: "10px 8px" }}>
                        ₹{visibleCommissionTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </Table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* TAB 3: Payout History */}
      {activeTab === "payouts" && (
        <Card className="border-0 shadow-sm">
          <CardBody className="p-0">
            <div className="table-responsive">
              <Table hover size="sm" align="middle" className="mb-0" style={{ fontSize: "13px" }}>
                <thead className="table-light text-nowrap">
                  <tr>
                    <th style={{ width: 110, padding: "10px 8px" }}>Payout Date</th>
                    <th style={{ minWidth: 160, padding: "10px 8px" }}>Sales Executive</th>
                    <th className="text-center" style={{ width: 100, padding: "10px 8px" }}>Month For</th>
                    <th className="text-end" style={{ width: 120, padding: "10px 8px" }}>Amount Paid</th>
                    <th className="text-center" style={{ width: 120, padding: "10px 8px" }}>Payment Method</th>
                    <th style={{ width: 140, padding: "10px 8px" }}>Reference / Cheque</th>
                    <th style={{ minWidth: 160, padding: "10px 8px" }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.payouts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted">
                        No commission payouts recorded yet for {selectedMonth}.
                      </td>
                    </tr>
                  ) : (
                    reportData.payouts.map((p) => (
                      <tr key={p.id} className="text-nowrap">
                        <td className="small" style={{ padding: "8px" }}>{p.payout_date}</td>
                        <td style={{ padding: "8px", whiteSpace: "normal" }}>
                          <span className="fw-bold text-dark">{p.sales_person_name}</span>{" "}
                          <small className="text-muted">({p.employee_code})</small>
                        </td>
                        <td className="text-center" style={{ padding: "8px" }}>
                          <Badge color="light" className="text-dark border px-2 py-1">
                            {p.month}
                          </Badge>
                        </td>
                        <td className="text-end fw-bold text-success" style={{ padding: "8px" }}>
                          ₹{Number(p.amount_paid || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="text-center" style={{ padding: "8px" }}>
                          <span className="badge bg-secondary">{p.payment_method}</span>
                        </td>
                        <td className="small text-muted" style={{ padding: "8px" }}>{p.reference_no || "—"}</td>
                        <td className="small text-muted" style={{ padding: "8px", whiteSpace: "normal" }}>{p.notes || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Modal: Record Commission Payout */}
      <Modal
        isOpen={payoutModalOpen}
        toggle={() => !savingPayout && setPayoutModalOpen(false)}
        centered
        size="md"
      >
        <ModalHeader toggle={() => !savingPayout && setPayoutModalOpen(false)}>
          Record Commission Payout
        </ModalHeader>
        <Form onSubmit={handleSavePayout}>
          <ModalBody className="p-4">
            <div className="bg-light p-3 rounded mb-3 border">
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted small">Sales Executive:</span>
                <span className="fw-bold text-dark">{payoutForm.sales_person_name}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted small">Performance Month:</span>
                <span className="fw-bold text-primary">{payoutForm.month}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted small">Outstanding Balance:</span>
                <span className="fw-bold text-danger fs-6">
                  ₹{Number(payoutForm.balance || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <Row className="g-3">
              <Col xs={12} sm={6}>
                <FormGroup className="mb-0">
                  <Label className="small fw-bold text-muted">PAYOUT AMOUNT (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    max={payoutForm.balance || undefined}
                    value={payoutForm.amount_paid}
                    onChange={(e) =>
                      setPayoutForm({ ...payoutForm, amount_paid: e.target.value })
                    }
                    required
                  />
                </FormGroup>
              </Col>

              <Col xs={12} sm={6}>
                <FormGroup className="mb-0">
                  <Label className="small fw-bold text-muted">PAYOUT DATE</Label>
                  <Input
                    type="date"
                    value={payoutForm.payout_date}
                    onChange={(e) =>
                      setPayoutForm({ ...payoutForm, payout_date: e.target.value })
                    }
                    required
                  />
                </FormGroup>
              </Col>

              <Col xs={12} sm={6}>
                <FormGroup className="mb-0">
                  <Label className="small fw-bold text-muted">PAYMENT METHOD</Label>
                  <Input
                    type="select"
                    value={payoutForm.payment_method}
                    onChange={(e) =>
                      setPayoutForm({ ...payoutForm, payment_method: e.target.value })
                    }
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Cheque">Cheque</option>
                  </Input>
                </FormGroup>
              </Col>

              <Col xs={12} sm={6}>
                <FormGroup className="mb-0">
                  <Label className="small fw-bold text-muted">REFERENCE / TXN ID</Label>
                  <Input
                    type="text"
                    placeholder="e.g. UTR123456"
                    value={payoutForm.reference_no}
                    onChange={(e) =>
                      setPayoutForm({ ...payoutForm, reference_no: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>

              <Col xs={12}>
                <FormGroup className="mb-0">
                  <Label className="small fw-bold text-muted">PAYOUT REMARKS</Label>
                  <Input
                    type="textarea"
                    rows={2}
                    placeholder="e.g. October monthly commission settlement"
                    value={payoutForm.notes}
                    onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                  />
                </FormGroup>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter className="bg-light">
            <Button
              color="secondary"
              onClick={() => setPayoutModalOpen(false)}
              disabled={savingPayout}
            >
              Cancel
            </Button>
            <Button color="success" type="submit" disabled={savingPayout}>
              {savingPayout ? <Spinner size="sm" className="me-2" /> : null}
              Confirm & Disburse Payout
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* Modal: View Sales Person's Invoices */}
      <Modal
        isOpen={invoicesModalOpen}
        toggle={() => setInvoicesModalOpen(false)}
        centered
        size="xl"
      >
        <ModalHeader toggle={() => setInvoicesModalOpen(false)} className="bg-light border-bottom">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="fw-bold">Invoices Billed By:</span>
            <span className="text-primary fw-bold">{selectedPersonForInvoices?.name}</span>
            <span className="badge bg-dark text-warning font-monospace">
              {selectedPersonForInvoices?.employee_code || `SP-${selectedPersonForInvoices?.id}`}
            </span>
            <span className="badge bg-secondary">{effectivePeriod}</span>
          </div>
        </ModalHeader>
        <ModalBody className="p-0">
          {/* Action & Filter Bar */}
          <div className="p-3 bg-white border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Input
                type="text"
                bsSize="sm"
                placeholder="Search bill no, customer, product..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                style={{ minWidth: 260 }}
              />
              <span className="badge bg-light text-dark border px-2 py-1">
                {modalInvoices.length} Bills Total
              </span>
              <span className="badge bg-light text-success border px-2 py-1 fw-bold">
                Sales: ₹{modalInvoices.reduce((sum, inv) => sum + Number(inv.final_amount || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span className="badge bg-light text-primary border px-2 py-1 fw-bold">
                Comm: ₹{modalInvoices.reduce((sum, inv) => sum + Number(inv.commission_amount || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Direct Export Buttons for this specific sales person */}
            <div className="d-flex align-items-center gap-2">
              <Button
                color="success"
                size="sm"
                className="d-flex align-items-center gap-1 shadow-sm fw-semibold"
                onClick={() => handleDownloadSingleExcel(selectedPersonForInvoices)}
                title="Download this sales person's report in Excel"
              >
                <FaFileExcel size={12} /> Export Excel
              </Button>
              <Button
                color="info"
                size="sm"
                className="d-flex align-items-center gap-1 shadow-sm fw-semibold text-white"
                onClick={() => handleDownloadSingleCsv(selectedPersonForInvoices)}
                title="Download this sales person's report in CSV"
              >
                <FaFileCsv size={12} /> Export CSV
              </Button>
              <Button
                color="dark"
                size="sm"
                className="d-flex align-items-center gap-1 shadow-sm fw-semibold"
                onClick={() => handlePrintSingle(selectedPersonForInvoices)}
                title="Print this sales person's report"
              >
                <FaPrint size={12} /> Print
              </Button>
            </div>
          </div>

          <div className="table-responsive" style={{ maxHeight: "60vh" }}>
            <Table hover size="sm" align="middle" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 45 }}>#</th>
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>Products / Items Sold</th>
                  <th className="text-center">Qty</th>
                  <th className="text-end">Invoice Amount</th>
                  <th className="text-end">Commission</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {loadingModalInvoices ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4 text-muted">
                      <Spinner size="sm" color="warning" className="me-2" />
                      Loading invoices...
                    </td>
                  </tr>
                ) : (() => {
                  const filtered = (modalInvoices || []).filter((inv) => {
                    if (!modalSearch.trim()) return true;
                    const q = modalSearch.toLowerCase().trim();
                    return (
                      inv.invoice_no?.toLowerCase().includes(q) ||
                      inv.customer_name?.toLowerCase().includes(q) ||
                      inv.customer_phone?.toLowerCase().includes(q) ||
                      inv.product_name?.toLowerCase().includes(q) ||
                      inv.products_summary?.toLowerCase().includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={9} className="text-center py-4 text-muted">
                          {modalSearch
                            ? `No bills match "${modalSearch}".`
                            : `No invoices recorded for this sales executive in ${effectivePeriod}.`}
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((tx, idx) => {
                    const prods = tx.products_summary || tx.product_name || (Array.isArray(tx.items) && tx.items.map(i => i.product_name).join(", ")) || "—";
                    return (
                      <tr key={tx.id}>
                        <td className="small text-muted">{idx + 1}</td>
                        <td className="small text-nowrap">{tx.sales_date}</td>
                        <td className="fw-bold font-monospace text-primary">{tx.invoice_no}</td>
                        <td>
                          <div>{tx.customer_name}</div>
                          {tx.customer_phone && <small className="text-muted">{tx.customer_phone}</small>}
                        </td>
                        <td className="small" style={{ maxWidth: 280 }}>
                          <div className="text-truncate" title={prods}>
                            {prods}
                          </div>
                        </td>
                        <td className="text-center fw-semibold">{tx.total_qty || "—"}</td>
                        <td className="text-end fw-bold">
                          ₹{Number(tx.final_amount || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="text-end fw-bold text-success">
                          ₹{Number(tx.commission_amount || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td>
                          <Badge
                            color={
                              tx.payment_status?.toLowerCase() === "paid" ? "success" : "warning"
                            }
                          >
                            {tx.payment_status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </Table>
          </div>
        </ModalBody>
        <ModalFooter className="bg-light d-flex justify-content-between">
          <small className="text-muted">
            All records credited under {selectedPersonForInvoices?.name}
          </small>
          <Button color="secondary" onClick={() => setInvoicesModalOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
};

export default SalesPersonReport;
