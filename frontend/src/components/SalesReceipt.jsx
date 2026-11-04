import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "reactstrap";
import { FaPrint, FaDownload, FaArrowLeft, FaUniversity, FaFileInvoice, FaShieldAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import html2pdf from "html2pdf.js";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import apiClient from "../utils/api";
import { INDIAN_STATES } from "./BillToModal";

const fmt = (num) => {
  const n = Number(num);
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

function numberToWords(num) {
  const n = Math.round(Number(num));
  if (!Number.isFinite(n) || n === 0) return "";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const convert = (val) => {
    if (val < 20) return ones[val];
    if (val < 100)
      return `${tens[Math.floor(val / 10)]} ${ones[val % 10]}`.trim();
    if (val < 1000)
      return `${ones[Math.floor(val / 100)]} Hundred ${convert(val % 100)}`.trim();
    if (val < 100000)
      return `${convert(Math.floor(val / 1000))} Thousand ${convert(val % 1000)}`.trim();
    if (val < 10000000)
      return `${convert(Math.floor(val / 100000))} Lakh ${convert(val % 100000)}`.trim();
    return `${convert(Math.floor(val / 10000000))} Crore ${convert(val % 10000000)}`.trim();
  };
  return `${convert(n)} Rupees Only`;
}

export default function SalesReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
    } else {
      navigate("/index/salesList");
    }
  };

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setReceipt(null);
      setLoading(false);
      return;
    }
    apiClient
      .get(`/sales-receipt/${id}`)
      .then((res) => setReceipt(res.data || null))
      .catch(() => setReceipt(null))
      .finally(() => setLoading(false));
  }, [id]);

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isNonUser = storedUser.role_name?.toLowerCase().includes("non user") || storedUser.role_id === 6;
  const isNonGstReceipt = receipt?.is_gst === 0 || receipt?.transaction?.is_gst === 0 || isNonUser;

  const loc = receipt?.location || {};
  const biz = receipt?.business || {};
  const branch = receipt?.branch || {};
  const customer = receipt?.customer || {};
  const products = receipt?.products || [];

  const compName =
    loc.name ||
    biz.name ||
    biz.company_name ||
    branch.name ||
    "SHIVA ELECTRONICS";

  const companyGst =
    loc.gst_no ||
    loc.gst ||
    biz.gst_no ||
    biz.gst ||
    branch.gst_no ||
    receipt?.company_gst_no ||
    "33CAEPS0894N1Z5";

  const compAddress =
    loc.address || biz.address
      ? String(loc.address || biz.address)
        .split("\n")
        .filter(Boolean)
        .join(", ")
      : [
        loc.landmark || biz.landmark || "21-22, Main Bazaar Street",
        loc.city || biz.city || "Omalur",
        loc.state || biz.state || "Salem (Dt), Tamil Nadu",
        loc.zip_code || biz.zip_code || "636455",
      ]
        .filter((v) => v && String(v).trim())
        .join(", ");

  const compPhones = [
    loc.mobile || loc.phone || biz.phone || biz.mobile || branch.phone || "9715761234",
    loc.alternate_number || biz.alternate_number,
  ]
    .filter((v) => v && String(v).trim())
    .join(", ");

  const compEmail = loc.email || biz.email || branch.email || "";

  const formatCleanAddress = (rawAddr) => {
    if (!rawAddr) return "-";
    const parts = String(rawAddr)
      .split(/[\r\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return "-";

    const allTokens = [];
    parts.forEach((p) => {
      p.split(",").forEach((sub) => {
        const token = sub.trim();
        if (token) allTokens.push(token);
      });
    });

    const deduped = [];
    allTokens.forEach((t) => {
      if (!deduped.some((d) => d.toLowerCase() === t.toLowerCase())) {
        deduped.push(t);
      }
    });

    return deduped.join(", ") || "-";
  };

  const getStateCode = (stateName, gstin) => {
    if (gstin && typeof gstin === "string" && gstin.trim().length >= 2) {
      const prefix = gstin.trim().substring(0, 2);
      if (/^\d{2}$/.test(prefix)) return prefix;
    }
    if (!stateName) return "33";
    const cleanName = String(stateName).trim().toLowerCase();
    const found = INDIAN_STATES.find(
      (s) =>
        s.name.toLowerCase() === cleanName ||
        cleanName.includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(cleanName)
    );
    return found ? found.code : "33";
  };

  const shippedToName = customer.name ? customer.name.toUpperCase() : "-";

  const shippedToAddress = formatCleanAddress(
    receipt?.sale_address ||
      customer.delivery_address ||
      customer.address
  );

  const shippedToPhone =
    customer.phone ||
    customer.mobile ||
    customer.contact_no ||
    "-";

  const shippedToAlternate = customer.alternate_no
    ? `, ${customer.alternate_no}`
    : "";

  const shippedToGst = customer.gst_no || "-";

  const customerState =
    customer.state ||
    receipt?.customer_state ||
    receipt?.place_of_supply ||
    loc.state ||
    branch.state ||
    "Tamil Nadu";
  const customerStateCode =
    customer.state_code ||
    getStateCode(customerState, customer.gst_no);

  const customerPlaceOfSupply =
    receipt?.place_of_supply ||
    customer.state ||
    loc.state ||
    branch.state ||
    "Tamil Nadu";
  const customerPlaceOfSupplyCode =
    receipt?.place_of_supply_state_code ||
    getStateCode(customerPlaceOfSupply, customer.gst_no);

  const customerStateDisplay = `${customerState}${customerStateCode ? ` (${customerStateCode})` : ""}`;
  const customerPosDisplay = `${customerPlaceOfSupply}${customerPlaceOfSupplyCode ? ` (${customerPlaceOfSupplyCode})` : ""}`;

  const billTo = receipt?.bill_to || (
    (receipt?.bill_to_customer_name || receipt?.bill_to_company_name)
      ? {
          company_name: receipt.bill_to_company_name || "",
          customer_name: receipt.bill_to_customer_name || "",
          phone: receipt.bill_to_phone || "",
          address: receipt.bill_to_address || "",
          gstin: receipt.bill_to_gstin || "",
          state: receipt.bill_to_state || "",
          state_code: receipt.bill_to_state_code || "",
          place_of_supply: receipt.bill_to_place_of_supply || "",
          place_of_supply_state_code: receipt.bill_to_place_of_supply_state_code || "",
        }
      : null
  );

  const hasBillTo = Boolean(
    billTo && (billTo.company_name || billTo.customer_name || billTo.gstin || billTo.address)
  );

  const billToState = billTo?.state || customerState || "Tamil Nadu";
  const billToStateCode =
    billTo?.state_code || getStateCode(billToState, billTo?.gstin);
  const billedStateDisplay = `${billToState}${billToStateCode ? ` (${billToStateCode})` : ""}`;

  const billedToName =
    customer.name ||
    loc.name ||
    biz.name ||
    biz.company_name ||
    branch.name ||
    "CASH CUSTOMER";

  const billedToAddress = formatCleanAddress(
    receipt?.sale_address ||
      customer.delivery_address ||
      customer.address ||
      loc.landmark ||
      loc.address ||
      compAddress
  );

  const billedToPhone =
    customer.phone ||
    customer.mobile ||
    customer.contact_no ||
    loc.mobile ||
    loc.phone ||
    compPhones ||
    "-";

  const billedToGst =
    customer.gst_no ||
    loc.gst_no ||
    loc.gst ||
    companyGst ||
    "-";

  const sellerStateCode = "33";
  const buyerStateCode = customerStateCode || "33";
  const isInterstate = !isNonGstReceipt && buyerStateCode !== sellerStateCode && buyerStateCode !== "33";

  let calcTaxable = 0;
  let calcCgst = 0;
  let calcSgst = 0;
  let calcIgst = 0;
  let totalLineAmount = 0;
  let totalDiscountAmount = 0;
  let totalQuantity = 0;

  const processedProducts = products.map((p, idx) => {
    const qty = Number(p.qty || p.quantity) || 0;
    totalQuantity += qty;
    let gstRate = 0;
    if (p.gst_rate != null && !isNaN(Number(p.gst_rate))) {
      gstRate = Number(p.gst_rate);
    } else if (p.tax_rate != null && !isNaN(Number(p.tax_rate))) {
      gstRate = Number(p.tax_rate);
    } else if (
      receipt?.tax_group_rate_pct ||
      receipt?.tax_group_total_rate_pct
    ) {
      gstRate = Number(
        receipt.tax_group_rate_pct || receipt.tax_group_total_rate_pct,
      );
    } else if (p.tax && typeof p.tax === "string" && p.tax !== "0%") {
      const match = p.tax.match(/(\d+(\.\d+)?)%/);
      if (match) gstRate = parseFloat(match[1]);
    }

    const mrp = Number(p.mrp || p.rate || 0);
    const lineTotalSaved = Number(p.line_total ?? p.amount);
    const rate =
      qty > 0 && Number.isFinite(lineTotalSaved) && lineTotalSaved > 0
        ? lineTotalSaved / qty
        : Number(p.rate) || 0;

    let discPct = 0;
    if (mrp > 0 && rate > 0 && mrp > rate) {
      discPct = ((mrp - rate) / mrp) * 100;
    }
    if (p.discount_amount && Number(p.discount_amount) > 0) {
      if (p.discount_type === "percentage") {
        discPct = Number(p.discount_amount);
      } else if (mrp > 0) {
        discPct = (Number(p.discount_amount) / mrp) * 100;
      }
    }

    // In retail POS, item rate is inclusive of GST
    const grossTotal = Number((qty * rate).toFixed(2));
    const taxable = gstRate > 0 ? Number((grossTotal / (1 + gstRate / 100)).toFixed(2)) : grossTotal;
    const unitTaxableRate = qty > 0 ? Number((taxable / qty).toFixed(2)) : taxable;

    let cgstAmt = 0;
    let sgstAmt = 0;
    let igstAmt = 0;
    if (isInterstate) {
      igstAmt = gstRate > 0 ? Number((taxable * (gstRate / 100)).toFixed(2)) : 0;
    } else {
      const halfRate = gstRate / 2;
      cgstAmt = halfRate > 0 ? Number((taxable * (halfRate / 100)).toFixed(2)) : 0;
      sgstAmt = halfRate > 0 ? Number((taxable * (halfRate / 100)).toFixed(2)) : 0;
    }
    const rowTotal = Number((taxable + cgstAmt + sgstAmt + igstAmt).toFixed(2));

    const discountValue = mrp > rate ? (mrp - rate) * qty : 0;

    calcTaxable += taxable;
    calcCgst += cgstAmt;
    calcSgst += sgstAmt;
    calcIgst += igstAmt;
    totalLineAmount += rowTotal;
    totalDiscountAmount += discountValue;

    return {
      ...p,
      idx: idx + 1,
      qty,
      unit: p.primary_unit || p.unit || "NOS",
      hsncode: p.hsncode || "-",
      gstRate,
      taxable,
      unitTaxableRate,
      cgstAmt,
      sgstAmt,
      igstAmt,
      rate,
      mrp,
      discPct,
      rowTotal,
    };
  });

  const transportCharges = Number(receipt?.transport_charges) || 0;
  let parsedAdditionalCharges = [];
  if (receipt?.additional_charges) {
    try {
      const parsed = typeof receipt.additional_charges === "string" ? JSON.parse(receipt.additional_charges) : receipt.additional_charges;
      if (Array.isArray(parsed)) parsedAdditionalCharges = parsed;
    } catch (_) {}
  }
  const additionalChargesTotal = parsedAdditionalCharges.reduce(
    (sum, c) => sum + (Number(c.amount) || 0),
    0
  );
  const totalExtraCharges = transportCharges + additionalChargesTotal;

  const finalAmount = calcTaxable;
  const finalCgst = calcCgst;
  const finalSgst = calcSgst;
  const finalIgst = calcIgst;
  const grandTotal = Math.round(totalLineAmount + totalExtraCharges);
  const roundOff = Number(
    (grandTotal - (finalAmount + finalCgst + finalSgst + finalIgst + totalExtraCharges)).toFixed(2),
  );

  const allPayments = Array.isArray(receipt?.payments) ? receipt.payments : [];
  const validPayments = allPayments.filter(
    (p) =>
      Number(p.amount) > 0 &&
      String(p.method || "").trim().toLowerCase() !== "credit"
  );

  const totalPaid = Number(
    validPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2)
  );
  const finalOutstanding = Math.max(
    0,
    Number((grandTotal - totalPaid).toFixed(2))
  );

  let advancePayment = null;
  if (validPayments.length > 0) {
    const firstPay = validPayments[0];
    const isExplicitAdvance = String(firstPay.payment_for || "")
      .toLowerCase()
      .includes("advance");
    if (
      isExplicitAdvance ||
      Number(firstPay.amount) < grandTotal ||
      validPayments.length > 1
    ) {
      advancePayment = firstPay;
    }
  }

  const advancePaid = advancePayment ? Number(advancePayment.amount || 0) : 0;

  // Group GST by slab
  const gstBreakdownMap = {};
  processedProducts.forEach((p) => {
    const rateKey = p.gstRate || 0;
    if (!gstBreakdownMap[rateKey]) {
      gstBreakdownMap[rateKey] = {
        rate: rateKey,
        taxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
      };
    }
    gstBreakdownMap[rateKey].taxable += p.taxable;
    gstBreakdownMap[rateKey].cgst += p.cgstAmt;
    gstBreakdownMap[rateKey].sgst += p.sgstAmt;
    gstBreakdownMap[rateKey].igst += p.igstAmt;
  });

  const breakdownParts = Object.values(gstBreakdownMap)
    .filter((b) => b.rate > 0)
    .map((b) => {
      if (isInterstate) {
        return `GST ${b.rate}% on (${fmt(b.taxable)}) - IGST ${b.rate.toFixed(2)}%- ${fmt(b.igst)}`;
      }
      const half = (b.rate / 2).toFixed(2);
      return `GST ${b.rate}% on (${fmt(b.taxable)}) - SGST ${half}%- ${fmt(b.sgst)} - CGST ${half}%- ${fmt(b.cgst)}`;
    });
  const gstBreakdownText = breakdownParts.length > 0 ? breakdownParts.join(" | ") : "-";

  const invoiceNo = receipt?.invoice_no || `NON-SAL-${receipt?.id || id}`;
  const invoiceDate = receipt?.date ? formatDate(receipt.date) : formatDate(new Date().toISOString());
  const transportMode = receipt?.transport_mode || (receipt?.vehicle_no ? "By Road" : "By Road");
  const poNoAndDate = receipt?.po_no ? `${receipt.po_no} ${receipt.po_date ? `& ${formatDate(receipt.po_date)}` : ""}` : "-";
  const vehicleNumber = receipt?.vehicle_no || "-";
  const placeOfSupplyText = customerPosDisplay || `${customerState} [${customerStateCode || "33"}]`;
  const ewayBillNoText = receipt?.eway_invoice_no || receipt?.eway_bill_no || "-";

  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => {
    toast.dismiss();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDownload = async () => {
    const input = document.getElementById("printable-invoice");
    if (!input) {
      toast.error("Invoice element not found");
      return;
    }
    setDownloading(true);
    toast.info("Generating 1-page A4 PDF, please wait...", { autoClose: 2000 });

    const filename = `Invoice_${receipt?.invoice_no || id}.pdf`;

    try {
      const canvas = await html2canvas(input, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#FFFFFF",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Exactly 1 page: maps the entire canvas onto the 210mm x 297mm A4 sheet
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      pdf.save(filename);
      toast.success("1-page Invoice PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF. You can also click 'Print A4 Invoice' and select 'Save as PDF'.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading)
    return (
      <div className="text-center p-5 mt-5">
        <h4>Loading Invoice...</h4>
      </div>
    );
  if (!receipt)
    return (
      <div className="text-center p-5 mt-5">
        <h4>Invoice Not Found</h4>
        <Button color="primary" onClick={handleBack}>
          Go to Sales List
        </Button>
      </div>
    );

  return (
    <div className="receipt-page min-vh-100 py-3">
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            /* Completely hide all surrounding CRM navigation, sidebar, headers, footers & action buttons */
            header, nav, aside, footer, .app-header, .sidebar, .desktop-sidebar, .footer, .no-print, button, .navbar, .main-header, .main-sidebar, .toast-container {
              display: none !important;
            }
            html, body, #root, .layout, .body-wrapper, .content-area, .receipt-page {
              background: #FFFFFF !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm !important;
              height: 296mm !important;
              max-height: 296mm !important;
              overflow: hidden !important;
              display: block !important;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .printable-invoice {
              box-shadow: none !important;
              margin: 0 auto !important;
              width: 210mm !important;
              height: 296mm !important;
              max-height: 296mm !important;
              padding: 4mm 6mm !important;
              border: none !important;
              box-sizing: border-box !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              break-after: avoid !important;
              break-inside: avoid !important;
              display: block !important;
            }
          }

          .receipt-page {
            display: flex;
            flex-direction: column;
            align-items: center;
            background-color: #E2E8F0;
            font-family: Arial, Helvetica, sans-serif;
          }

          /* TRUE EXACT A4 SHEET DIMENSIONS (210mm x 297mm) */
          .printable-invoice {
            width: 210mm;
            height: 297mm;
            min-height: 297mm;
            max-height: 297mm;
            background: #FFFFFF;
            padding: 5mm 7mm;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
            position: relative;
            box-sizing: border-box;
            color: #000000;
            display: flex;
            flex-direction: column;
            margin: 15px auto;
            overflow: hidden;
          }

          /* Full Outer Frame Matching Screenshot Exactly */
          .invoice-frame {
            border: 1.5px solid #000000;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            position: relative;
            background: #FFFFFF;
          }

          /* Watermark Centered in Table Area */
          .invoice-watermark {
            position: absolute;
            top: 52%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 420px;
            height: 420px;
            border-radius: 50% !important;
            -webkit-clip-path: circle(50% at 50% 50%) !important;
            clip-path: circle(50% at 50% 50%) !important;
            overflow: hidden !important;
            opacity: 0.15;
            pointer-events: none;
            z-index: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .invoice-watermark img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50% !important;
          }

          /* Header Logo on Left */
          .header-left-logo {
            width: 78px;
            height: 78px;
            border-radius: 50%;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border: 1px solid #E2E8F0;
          }

          .header-left-logo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
          }

          /* Meta Table Grid */
          .meta-info-table {
            width: 100%;
            border-collapse: collapse;
          }

          .meta-info-table td {
            padding: 2px 4px;
            font-size: 9.5px;
            line-height: 1.3;
            vertical-align: top;
          }

          /* Main Goods Table */
          .goods-table {
            width: 100%;
            border-collapse: collapse;
            background: transparent;
            position: relative;
            z-index: 1;
          }

          .goods-table th {
            border-top: 1.5px solid #000000;
            border-bottom: 1.5px solid #000000;
            border-right: 1px solid #000000;
            background: #FFFFFF;
            font-size: 9px;
            font-weight: 700;
            padding: 3px 4px;
            text-align: center;
          }

          .goods-table th:last-child {
            border-right: none;
          }

          .goods-table td {
            border-right: 1px solid #000000;
            padding: 2.5px 4px;
            font-size: 8.8px;
            vertical-align: top;
            background: transparent;
          }

          .goods-table td:last-child {
            border-right: none;
          }
        `}
      </style>

      {/* Action Bar (Top Screen) */}
      <div className="no-print container mb-3 d-flex justify-content-between align-items-center" style={{ maxWidth: "210mm" }}>
        <Button color="secondary" outline size="sm" onClick={handleBack} className="fw-semibold">
          <FaArrowLeft className="me-1" /> Back
        </Button>
        <div className="d-flex gap-2">
          <Button color="primary" size="sm" onClick={handlePrint} className="fw-semibold shadow-sm">
            <FaPrint className="me-1" /> Print A4 Invoice
          </Button>
          <Button
            color="success"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="fw-semibold shadow-sm"
          >
            <FaDownload className="me-1" /> {downloading ? "Generating PDF..." : "Download A4 PDF"}
          </Button>
        </div>
      </div>

      {/* Standard A4 Sheet Container */}
      <div id="printable-invoice" className="printable-invoice">
        <div className="invoice-frame">
          {/* ============================================================== */}
          {/* 1. ROUNDED WATERMARK (Centered behind table vertical lines)    */}
          {/* ============================================================== */}
          <div className="invoice-watermark">
            <img src="/shiva_logo.png" alt="Shiva Electronics Watermark" />
          </div>

          {/* ============================================================== */}
          {/* 2. TOP HEADER: LOGO (Left) | DETAILS (Center) | QR (Right)     */}
          {/* ============================================================== */}
          <div
            className="d-flex align-items-center justify-content-between p-2"
            style={{ borderBottom: "1.5px solid #000000", minHeight: "92px", position: "relative", zIndex: 1 }}
          >
            {/* Left: Rounded Logo */}
            <div className="header-left-logo">
              <img src="/shiva_logo.png" alt="Shiva Electronics" />
            </div>

            {/* Center: Title & Company Info */}
            <div className="text-center flex-grow-1 px-3">
              <div className="fw-bold" style={{ fontSize: "11px", letterSpacing: "1px" }}>
                {isNonGstReceipt ? "BILL OF SUPPLY" : "TAX INVOICE"}
              </div>
              <h2
                className="mb-0 fw-bold"
                style={{
                  fontSize: "22px",
                  letterSpacing: "0.5px",
                  margin: "1px 0",
                  color: "#000000",
                  fontWeight: 900,
                }}
              >
                {compName.toUpperCase()}
              </h2>
              <div style={{ fontSize: "9.5px", color: "#222222", lineHeight: "1.25" }}>
                {compAddress}
              </div>
              <div
                className="d-flex align-items-center justify-content-center gap-3 mt-0.5"
                style={{ fontSize: "9.5px" }}
              >
                <span>📞 Mobile: <strong>{compPhones}</strong></span>
                <span>✉️ Email: <strong>{compEmail || "shivaelectronics@gmail.com"}</strong></span>
              </div>
            </div>

            {/* Right: Spacer to keep company details centered with left logo */}
            <div style={{ width: "78px" }}></div>
          </div>

          {/* ============================================================== */}
          {/* 3. METADATA 2-COLUMN SECTION                                   */}
          {/* ============================================================== */}
          <div
            className="d-flex"
            style={{ borderBottom: "1.5px solid #000000", fontSize: "9.5px", position: "relative", zIndex: 1 }}
          >
            {/* Left Column */}
            <div className="p-1.5" style={{ width: "50%", borderRight: "1px solid #000000" }}>
              <table className="meta-info-table">
                <tbody>
                  <tr>
                    <td style={{ width: "95px", fontWeight: "600" }}>Invoice No.</td>
                    <td style={{ width: "10px" }}>:</td>
                    <td className="fw-bold">{invoiceNo}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "600" }}>Invoice Date</td>
                    <td>:</td>
                    <td className="fw-bold">{invoiceDate}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "600" }}>GSTIN</td>
                    <td>:</td>
                    <td className="fw-bold">{companyGst}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "600" }}>State</td>
                    <td>:</td>
                    <td>{customerState}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "600" }}>State Code</td>
                    <td>:</td>
                    <td>{customerStateCode || "33"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right Column */}
            <div className="p-1.5" style={{ width: "50%" }}>
              <table className="meta-info-table">
                <tbody>
                  <tr>
                    <td style={{ width: "105px", fontWeight: "600" }}>Transport Mode</td>
                    <td style={{ width: "10px" }}>:</td>
                    <td>{transportMode}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "600" }}>PO No &amp; Date</td>
                    <td>:</td>
                    <td>{poNoAndDate}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "600" }}>Vehicle Number</td>
                    <td>:</td>
                    <td>{vehicleNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "600" }}>Place of Supply</td>
                    <td>:</td>
                    <td>{placeOfSupplyText}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "600" }}>Eway Bill No</td>
                    <td>:</td>
                    <td>{ewayBillNoText}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 4. RECEIVER & CONSIGNEE SECTION                                */}
          {/* ============================================================== */}
          <div style={{ borderBottom: "1.5px solid #000000", position: "relative", zIndex: 1 }}>
            {/* Header Titles */}
            <div
              className="d-flex"
              style={{
                borderBottom: "1px solid #000000",
                fontSize: "9.5px",
                fontWeight: "700",
                background: "#F8FAFC",
              }}
            >
              <div className="px-2 py-0.5 text-center" style={{ width: "50%", borderRight: "1px solid #000000" }}>
                Details of Receiver | Billed to:
              </div>
              <div className="px-2 py-0.5 text-center" style={{ width: "50%" }}>
                Details of Consignee | Shipped to:
              </div>
            </div>

            {/* Details Content */}
            <div className="d-flex" style={{ fontSize: "9.5px" }}>
              {/* Receiver (Billed to) */}
              <div className="p-2" style={{ width: "50%", borderRight: "1px solid #000000", lineHeight: "1.3" }}>
                <div className="fw-bold text-dark">
                  {hasBillTo
                    ? (billTo.company_name || billTo.customer_name).toUpperCase()
                    : billedToName.toUpperCase()}
                </div>
                <div>{hasBillTo ? formatCleanAddress(billTo.address) : billedToAddress}</div>
                <div>{customerState}</div>
                <div className="fw-bold mt-1">
                  GSTIN : {hasBillTo ? (billTo.gstin || "-") : billedToGst}
                </div>
              </div>

              {/* Consignee (Shipped to) */}
              <div className="p-2" style={{ width: "50%", lineHeight: "1.3" }}>
                <div className="fw-bold text-dark">{shippedToName.toUpperCase()}</div>
                <div>{shippedToAddress}</div>
                <div>{customerState}</div>
                <div className="fw-bold mt-1">
                  GSTIN : {shippedToGst}
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 5. GOODS TABLE WITH EXTENDED VERTICAL LINES                    */}
          {/* ============================================================== */}
          <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: "220px", position: "relative" }}>
            <table className="goods-table" style={{ height: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "32px" }}>No</th>
                  <th style={{ width: "65px" }}>HSN Code</th>
                  <th style={{ textAlign: "left", paddingLeft: "6px" }}>Item Description</th>
                  <th style={{ width: "48px" }}>Qty</th>
                  <th style={{ width: "68px", textAlign: "right", paddingRight: "6px" }}>Rate</th>
                  <th style={{ width: "45px", textAlign: "right", paddingRight: "6px" }}>Disc.%</th>
                  <th style={{ width: "45px", textAlign: "right", paddingRight: "6px" }}>GST %</th>
                  {isInterstate ? (
                    <th style={{ width: "65px", textAlign: "right", paddingRight: "6px" }}>IGST amt</th>
                  ) : (
                    <>
                      <th style={{ width: "58px", textAlign: "right", paddingRight: "6px" }}>SGST Amt</th>
                      <th style={{ width: "58px", textAlign: "right", paddingRight: "6px" }}>CGST amt</th>
                    </>
                  )}
                  <th style={{ width: "75px", textAlign: "right", paddingRight: "6px" }}>Amount (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {processedProducts.map((p) => (
                  <tr key={p.idx} style={{ height: "24px" }}>
                    <td style={{ textAlign: "center" }}>{p.idx}</td>
                    <td style={{ textAlign: "center", fontSize: "9px" }}>{p.hsncode}</td>
                    <td style={{ textAlign: "left", paddingLeft: "6px", fontWeight: "600" }}>
                      {p.product_name}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div className="fw-bold" style={{ lineHeight: "1.1" }}>{p.qty}</div>
                      <div style={{ fontSize: "8px", color: "#444", lineHeight: "1" }}>{p.unit || "NOS"}</div>
                    </td>
                    <td style={{ textAlign: "right", paddingRight: "6px" }}>
                      {fmt(p.unitTaxableRate || p.rate)}
                    </td>
                    <td style={{ textAlign: "right", paddingRight: "6px" }}>
                      {p.discPct ? p.discPct.toFixed(2) : "0.00"}
                    </td>
                    <td style={{ textAlign: "right", paddingRight: "6px" }}>
                      {p.gstRate ? p.gstRate.toFixed(2) : "0.00"}
                    </td>
                    {isInterstate ? (
                      <td style={{ textAlign: "right", paddingRight: "6px" }}>
                        {fmt(p.igstAmt)}
                      </td>
                    ) : (
                      <>
                        <td style={{ textAlign: "right", paddingRight: "6px" }}>
                          {fmt(p.sgstAmt)}
                        </td>
                        <td style={{ textAlign: "right", paddingRight: "6px" }}>
                          {fmt(p.cgstAmt)}
                        </td>
                      </>
                    )}
                    <td style={{ textAlign: "right", paddingRight: "6px", fontWeight: "700" }}>
                      {fmt(p.rowTotal)}
                    </td>
                  </tr>
                ))}

                {/* Empty Filler Row with Vertical Grid Lines down to Totals */}
                <tr style={{ height: "100%" }}>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  {isInterstate ? <td></td> : <><td/><td/></>}
                  <td></td>
                </tr>

                {/* Subtotal / GST Breakdown Row matching Photo */}
                <tr
                  style={{
                    borderTop: "1.5px solid #000000",
                    borderBottom: "1.5px solid #000000",
                    fontSize: "8.5px",
                    fontWeight: "700",
                    background: "#FFFFFF",
                    height: "22px",
                  }}
                >
                  <td colSpan={7} style={{ textAlign: "left", paddingLeft: "6px", verticalAlign: "middle" }}>
                    {gstBreakdownText}
                  </td>
                  {isInterstate ? (
                    <td style={{ textAlign: "right", paddingRight: "6px", verticalAlign: "middle" }}>
                      {fmt(calcIgst)}
                    </td>
                  ) : (
                    <>
                      <td style={{ textAlign: "right", paddingRight: "6px", verticalAlign: "middle" }}>
                        {fmt(calcSgst)}
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "6px", verticalAlign: "middle" }}>
                        {fmt(calcCgst)}
                      </td>
                    </>
                  )}
                  <td style={{ textAlign: "right", paddingRight: "6px", verticalAlign: "middle", fontWeight: "700" }}>
                    {fmt(totalLineAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ============================================================== */}
          {/* 6. FINANCIAL SUMMARY & TOTAL BAR                               */}
          {/* ============================================================== */}
          {/* Totals Breakdown on Right */}
          <div className="d-flex justify-content-end p-1 pe-2" style={{ borderBottom: "1.5px solid #000000", position: "relative", zIndex: 1 }}>
            <table style={{ width: "340px", borderCollapse: "collapse", fontSize: "9.5px" }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: "600", padding: "1.5px 0" }}>Total value before GST (SGST/CGST/IGST)</td>
                  <td style={{ textAlign: "right", fontWeight: "600", padding: "1.5px 0" }}>{fmt(finalAmount)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: "600", padding: "1.5px 0" }}>Total GST</td>
                  <td style={{ textAlign: "right", fontWeight: "600", padding: "1.5px 0" }}>{fmt(finalCgst + finalSgst + calcIgst)}</td>
                </tr>
                {transportCharges > 0 && (
                  <tr>
                    <td style={{ fontWeight: "600", padding: "1.5px 0" }}>Transportation Charges</td>
                    <td style={{ textAlign: "right", fontWeight: "600", padding: "1.5px 0" }}>{fmt(transportCharges)}</td>
                  </tr>
                )}
                {parsedAdditionalCharges.length > 0 ? (
                  parsedAdditionalCharges.map((chg, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: "600", padding: "1.5px 0" }}>{chg.name || "Additional Charge"}</td>
                      <td style={{ textAlign: "right", fontWeight: "600", padding: "1.5px 0" }}>{fmt(Number(chg.amount) || 0)}</td>
                    </tr>
                  ))
                ) : (
                  additionalChargesTotal > 0 && (
                    <tr>
                      <td style={{ fontWeight: "600", padding: "1.5px 0" }}>Additional Charges</td>
                      <td style={{ textAlign: "right", fontWeight: "600", padding: "1.5px 0" }}>{fmt(additionalChargesTotal)}</td>
                    </tr>
                  )
                )}
                {roundOff !== 0 && (
                  <tr>
                    <td style={{ fontWeight: "600", padding: "1.5px 0" }}>Round off</td>
                    <td style={{ textAlign: "right", fontWeight: "600", padding: "1.5px 0" }}>
                      {roundOff >= 0 ? fmt(roundOff) : `-${fmt(Math.abs(roundOff))}`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total Full-Width Bar */}
          <div
            className="d-flex align-items-center"
            style={{
              borderBottom: "1.5px solid #000000",
              fontSize: "10px",
              fontWeight: "700",
              height: "22px",
              background: "#FFFFFF",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ width: "32px", borderRight: "1px solid #000000", height: "100%" }}></div>
            <div style={{ width: "65px", borderRight: "1px solid #000000", height: "100%" }}></div>
            <div
              className="d-flex align-items-center justify-content-end px-2"
              style={{ flexGrow: 1, borderRight: "1px solid #000000", height: "100%" }}
            >
              Total
            </div>
            <div
              className="d-flex align-items-center justify-content-center"
              style={{ width: "48px", borderRight: "1px solid #000000", height: "100%" }}
            >
              {totalQuantity}
            </div>
            <div style={{ width: isInterstate ? "220px" : "274px", borderRight: "1px solid #000000", height: "100%" }}></div>
            <div
              className="d-flex align-items-center justify-content-end px-2"
              style={{ width: "75px", height: "100%", fontWeight: "800" }}
            >
              {fmt(grandTotal)}
            </div>
          </div>

          {/* Amount In Words & Reverse Charge Row */}
          <div
            className="d-flex align-items-center justify-content-between px-2"
            style={{
              borderBottom: "1.5px solid #000000",
              minHeight: "24px",
              fontSize: "9.5px",
              paddingTop: "2px",
              paddingBottom: "2px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div className="d-flex align-items-center gap-1">
              <span style={{ fontWeight: "600" }}>Rs.</span>
              <span style={{ fontWeight: "700" }}>{numberToWords(grandTotal) || "Zero"} Only</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontWeight: "600" }}>Amount of Tax Subject to Reverse charge</span>
              <span style={{ border: "1px solid #000000", padding: "1px 6px", fontSize: "9px" }}>0.00</span>
              <span style={{ border: "1px solid #000000", padding: "1px 6px", fontSize: "9px" }}>0.00</span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 7. FOOTER: TERMS & CONDITIONS (Left) | SIGNATURES (Right)      */}
          {/* ============================================================== */}
          <div className="d-flex" style={{ minHeight: "115px", fontSize: "9px", position: "relative", zIndex: 1 }}>
            {/* Left: Terms & Conditions */}
            <div
              className="p-2 d-flex flex-column justify-content-between"
              style={{ width: "55%", borderRight: "1px solid #000000" }}
            >
              <div>
                <div style={{ fontWeight: "700", textDecoration: "underline", marginBottom: "2px" }}>
                  Terms &amp; Conditions
                </div>
                <div style={{ fontWeight: "600", marginBottom: "2px" }}>E &amp; OE.</div>
                <div style={{ lineHeight: "1.4", color: "#111" }}>
                  <div>1.Goods once sold cannot be taken back.</div>
                  <div>2.Interest @24 % p.a. will be charged if the payment is not made with in the stipulated time.</div>
                  <div>3.subject to "SALEM" jurisdiction.</div>
                </div>
              </div>
              {finalOutstanding > 0 && (
                <div className="mt-1 fw-bold text-danger" style={{ fontSize: "8.5px" }}>
                  Advance Paid: ₹{fmt(advancePaid)} | Balance Due: ₹{fmt(finalOutstanding)}
                </div>
              )}
            </div>

            {/* Right: Receiver's Signature & Authorized Signatory */}
            <div className="d-flex flex-column" style={{ width: "45%" }}>
              {/* Receiver's Signature */}
              <div
                className="p-1 px-2"
                style={{
                  borderBottom: "1px solid #000000",
                  minHeight: "35px",
                  fontSize: "9px",
                  fontWeight: "600",
                }}
              >
                Receiver's Signature
              </div>

              {/* For SHIVA ELECTRONICS & Authorised Signatory */}
              <div
                className="p-1 px-2 d-flex flex-column justify-content-between text-center flex-grow-1"
                style={{ minHeight: "75px" }}
              >
                <div style={{ fontWeight: "700", fontSize: "9.5px", letterSpacing: "0.3px" }}>
                  For {compName.toUpperCase()}
                </div>

                <div style={{ minHeight: "35px" }}></div>

                <div style={{ fontWeight: "700", fontSize: "9.5px" }}>
                  Authorised Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
