import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "reactstrap";
import { FaPrint, FaDownload, FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import apiClient from "../utils/api";
import { SERVER_ORIGIN } from "../config/urls";
import { INDIAN_STATES } from "./BillToModal";
// import signImg from "../assets/sign.png";
const signImg = null;

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
  return `${dd}-${mm}-${yyyy}`;
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
  const totals = receipt?.totals || {};

  const compName =
    loc.name ||
    biz.name ||
    biz.company_name ||
    branch.name ||
    "CLAVIS TECH WORKS";
  const companyGst =
    loc.gst_no ||
    loc.gst ||
    biz.gst_no ||
    biz.gst ||
    branch.gst_no ||
    receipt?.company_gst_no ||
    "";

  const compAddress =
    loc.address || biz.address
      ? String(loc.address || biz.address)
        .split("\n")
        .filter(Boolean)
        .join(", ")
      : [
        loc.landmark || biz.landmark,
        loc.city || biz.city,
        loc.state || biz.state,
        loc.zip_code || biz.zip_code,
        branch.address,
      ]
        .filter((v) => v && String(v).trim())
        .join(", ");

  const compPhones = [
    loc.mobile || loc.phone || biz.phone || biz.mobile || branch.phone,
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
  const billToPlaceOfSupply =
    billTo?.place_of_supply || billTo?.state || customerPlaceOfSupply || "Tamil Nadu";
  const billToPlaceOfSupplyCode =
    billTo?.place_of_supply_state_code ||
    getStateCode(billToPlaceOfSupply, billTo?.gstin);

  const billedStateDisplay = `${billToState}${billToStateCode ? ` (${billToStateCode})` : ""}`;
  const billedPosDisplay = `${billToPlaceOfSupply}${billToPlaceOfSupplyCode ? ` (${billToPlaceOfSupplyCode})` : ""}`;

  const billedToName =
    customer.name ||
    loc.name ||
    biz.name ||
    biz.company_name ||
    branch.name ||
    "CLAVIS TECH WORKS";

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

  const rawQrImage = loc.images || biz.images || receipt?.business_images || "";
  let qrImageUrl = "";
  if (rawQrImage) {
    const firstImg = String(rawQrImage).split(",")[0].trim();
    if (firstImg) {
      if (
        firstImg.startsWith("http://") ||
        firstImg.startsWith("https://") ||
        firstImg.startsWith("data:")
      ) {
        qrImageUrl = firstImg;
      } else {
        qrImageUrl = `${SERVER_ORIGIN}${firstImg.startsWith("/") ? "" : "/"}${firstImg}`;
      }
    }
  }

  // Calculate totals breakdown for Amount, CGST, SGST, Round off, Total
  let calcTaxable = 0;
  let calcCgst = 0;
  let calcSgst = 0;
  let totalLineAmount = 0;
  let totalDiscountAmount = 0;

  const processedProducts = products.map((p, idx) => {
    const qty = Number(p.qty) || 0;
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
    // Prefer the saved line total so older rows (saved with the pre-discount unit price) still show the discount
    const lineTotalSaved = Number(p.line_total ?? p.amount);
    const rate =
      qty > 0 && Number.isFinite(lineTotalSaved) && lineTotalSaved > 0
        ? lineTotalSaved / qty
        : Number(p.rate) || 0;
    const bRate = gstRate > 0 ? mrp / (1 + gstRate / 100) : mrp;

    const isFixedDisc = p.discount_type === "fixed";
    let discPct = 0;
    if (mrp > 0 && rate > 0 && mrp > rate) {
      discPct = ((mrp - rate) / mrp) * 100;
    }
    const finalDisc = Number(p.discount_amount || p.discount) > 0
      ? Number(p.discount_amount || p.discount)
      : (isFixedDisc ? (mrp - rate) : discPct);
    const discStr = finalDisc > 0
      ? (isFixedDisc ? `₹${fmt(finalDisc)}` : `${finalDisc.toFixed(2)}%`)
      : "-";

    // Row amount in table: Qty * discounted rate (inclusive of tax)
    const rowTotal = Number((qty * rate).toFixed(2));

    // Tax breakdown extracted from rowTotal
    const taxable = gstRate > 0 ? rowTotal / (1 + gstRate / 100) : rowTotal;
    const gstAmt = rowTotal - taxable;
    const cgstAmt = gstAmt / 2;
    const sgstAmt = gstAmt / 2;

    const discountValue = mrp > rate ? (mrp - rate) * qty : 0;

    calcTaxable += taxable;
    calcCgst += cgstAmt;
    calcSgst += sgstAmt;
    totalLineAmount += rowTotal;
    totalDiscountAmount += discountValue;

    return {
      ...p,
      idx: idx + 1,
      qty,
      gstRate,
      taxable,
      gstAmt,
      cgstAmt,
      sgstAmt,
      rate,
      mrp,
      bRate,
      discStr,
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
  const grandTotal = Math.round(totalLineAmount + totalExtraCharges);
  const roundOff = Number(
    (grandTotal - (finalAmount + finalCgst + finalSgst + totalExtraCharges)).toFixed(2),
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
  let subsequentPayments = [];

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
      subsequentPayments = validPayments.slice(1);
    } else {
      advancePayment = null;
      subsequentPayments = validPayments;
    }
  }

  const advancePaid = advancePayment ? Number(advancePayment.amount || 0) : 0;
  const balanceAfterAdvance = advancePayment
    ? Math.max(0, Number((grandTotal - advancePaid).toFixed(2)))
    : null;

  const grandTotalVal = Number(grandTotal || 0).toFixed(2);
  const rawBaseUpi =
    loc.upi_base_url ||
    receipt?.upi_base_url ||
    "";

  let upiPaymentUrl = "";
  if (rawBaseUpi) {
    const cleanUrl = rawBaseUpi
      .replace(/[?&]am=[^&]*/g, "")
      .replace(/[?&]cu=[^&]*/g, "")
      .replace(/[?&]tn=[^&]*/g, "");
    const sep = cleanUrl.includes("?") ? "&" : "?";
    upiPaymentUrl = `${cleanUrl}${sep}am=${grandTotalVal}&cu=INR&tn=${encodeURIComponent(
      `Invoice ${receipt?.invoice_no || id}`
    )}`;
  }

  const handlePrint = () => {
    toast.dismiss();
    window.print();
  };

  const handleDownload = async () => {
    const input = document.getElementById("printable-invoice");
    if (!input) return;
    const canvas = await html2canvas(input, { scale: 3, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
    pdf.save(`Invoice_${receipt?.invoice_no || id}.pdf`);
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
    <div className="receipt-page bg-light min-vh-100 py-4">
      <style>
        {`
          @media print {
            @page { size: A4 portrait; margin: 0 !important; }
            html, body, #root, .layout, .body-wrapper, .content-area, .bg-light, .receipt-page {
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: white !important;
              position: static !important;
              display: block !important;
            }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
            .app-header, .sidebar, .desktop-sidebar, .footer, .no-print {
              display: none !important;
            }
            .printable-invoice {
              width: 210mm !important;
              height: 296mm !important;
              margin: 0 auto !important;
              padding: 10mm !important;
              overflow: hidden !important;
              background-color: white !important;
              box-sizing: border-box !important;
              font-family: 'Arial', sans-serif !important;
              border: none !important;
              position: relative !important;
              box-shadow: none !important;
            }
          }
          .receipt-page {
            display: flex;
            flex-direction: column;
            align-items: center;
            background-color: #f1f5f9;
            min-height: 100vh;
          }
          .printable-invoice {
            font-family: 'Arial', sans-serif;
            color: black;
            font-size: 12px;
            line-height: 1.2;
            width: 210mm;
            height: 297mm;
            padding: 10mm;
            background: white;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            margin: 20px auto;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
          }
          .d-flex { display: flex !important; }
          .flex-column { flex-direction: column !important; }
          .align-items-center { align-items: center !important; }
          .justify-content-center { justify-content: center !important; }
          .justify-content-between { justify-content: space-between !important; }
          .flex-grow-1 { flex-grow: 1 !important; }
          .w-50 { width: 50% !important; }
          .w-25 { width: 25% !important; }
          .border-black { border: 1px solid black !important; }
          .border-bottom-black { border-bottom: 1px solid black !important; }
          .border-top-black { border-top: 1px solid black !important; }
          .border-end-black { border-right: 1px solid black !important; }
          .border-start-black { border-left: 1px solid black !important; }
          .table-invoice { width: 100%; border-collapse: collapse; }
          .table-invoice th, .table-invoice td { border: 1px solid black; padding: 4px 2px; text-align: center; font-size: 11px; }
          .table-invoice th { font-weight: normal; }
          .table-invoice thead th {
            background: #0B535E;
            color: #fff;
            font-weight: 600;
            font-size: 10.5px;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            border-color: #0B535E;
          }
          .table-invoice tbody tr:nth-child(even) td { background: #f8fafc; }
          .table-invoice tbody tr td { font-variant-numeric: tabular-nums; }
          .invoice-title {
            display: inline-block;
            align-self: center;
            padding: 3px 18px;
            border: 1.5px solid #0B535E;
            border-radius: 4px;
            color: #0B535E;
            font-weight: 700;
            font-size: 12px;
            letter-spacing: 0.18em;
          }
          .invoice-meta-bar { flex-wrap: wrap; gap: 4px 16px; background: #eef6f7 !important; }
          .invoice-meta-bar strong { color: #0B535E; }
          .party-heading {
            color: #0B535E;
            font-weight: 700;
            font-size: 10px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 2px;
            margin-bottom: 4px !important;
          }
          .grand-total-row { background: #0B535E !important; color: #fff !important; }
          .text-xxs { font-size: 9px; }
          .fw-bold { font-weight: bold; }
          .mb-1 { margin-bottom: 0.25rem; }
          .mt-1 { margin-top: 0.25rem; }
          .mt-3 { margin-top: 1rem; }
          .p-1 { padding: 0.25rem; }
          .p-2 { padding: 0.5rem; }
          .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
          .text-center { text-align: center; }
          .text-end { text-align: right; }
          .text-start { text-align: left; }
          .text-decoration-underline { text-decoration: underline; }
          .text-muted { color: #6c757d; }
          .img-fluid { max-width: 100%; height: auto; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .mt-auto { margin-top: auto; }
          @media print {
            .no-print { display: none !important; }
          }
        `}
      </style>

      <div className="no-print container mb-4 d-flex justify-content-between align-items-center">
        <Button color="secondary" outline onClick={handleBack}>
          <FaArrowLeft className="me-1" /> Back
        </Button>
        <div className="d-flex gap-2">
          <Button color="primary" onClick={handlePrint}>
            <FaPrint className="me-1" /> Print
          </Button>
          <Button color="success" onClick={handleDownload}>
            <FaDownload className="me-1" /> Download PDF
          </Button>
        </div>
      </div>

      <div id="printable-invoice" className="printable-invoice">
        {/* CANCELLED WATERMARK */}
        {String(receipt?.status || "").toLowerCase() === "cancelled" && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-30deg)",
              fontSize: "72px",
              fontWeight: "900",
              color: "rgba(220, 38, 38, 0.22)",
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              border: "8px dashed rgba(220, 38, 38, 0.32)",
              padding: "16px 44px",
              borderRadius: "16px",
              zIndex: 99,
              pointerEvents: "none",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            CANCELLED
          </div>
        )}

        <div className="border-black d-flex flex-column h-100 position-relative">
          {/* CANCELLED TOP BANNER */}
          {String(receipt?.status || "").toLowerCase() === "cancelled" && (
            <div
              className="w-100 text-center py-1 fw-bold border-bottom-black"
              style={{
                backgroundColor: "#FEE2E2",
                color: "#DC2626",
                fontSize: "12px",
                letterSpacing: "2px",
              }}
            >
              *** INVOICE CANCELLED ***
              {validPayments.some(
                (p) =>
                  Number(p.amount) < 0 ||
                  String(p.payment_for || "").toLowerCase().includes("refund")
              ) && <span className="ms-2">(ADVANCE REFUNDED)</span>}
            </div>
          )}

          {/* Top Header */}
          <div className="d-flex border-bottom-black">
            <div
              style={{ width: "150px" }}
              className="border-end-black d-flex align-items-center justify-content-center p-2"
            >
              <img
                src="/logo.png"
                alt="Logo"
                className="img-fluid"
                style={{ maxHeight: "100px", mixBlendMode: "multiply" }}
              />
            </div>
            <div className="flex-grow-1 text-center p-2 d-flex flex-column justify-content-center">
              <div className="invoice-title mb-1">
                {isNonGstReceipt ? "BILL / ESTIMATE" : "TAX INVOICE"}
              </div>
              <h3
                className="mb-1"
                style={{ fontSize: "22px", letterSpacing: "1px", fontWeight: 800, color: "#0B535E" }}
              >
                {compName.toUpperCase()}
              </h3>
              {compAddress && (
                <div style={{ fontSize: "12px" }}>{compAddress}</div>
              )}
              {!isNonGstReceipt && companyGst && (
                <div
                  className="fw-bold mt-1 mb-1"
                  style={{ fontSize: "12px", letterSpacing: "0.5px" }}
                >
                  GSTIN : {companyGst}
                </div>
              )}
              {compPhones && (
                <div style={{ fontSize: "11px", fontStyle: "italic" }}>
                  Phone : {compPhones}
                  {compEmail ? ` | Email : ${compEmail}` : ""}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Details Bar */}
          <div
            className="d-flex border-bottom-black align-items-center justify-content-between px-2 py-1 invoice-meta-bar"
            style={{ fontSize: "11px" }}
          >
            <div>
              <strong>Invoice No : </strong>
              <span>{receipt.invoice_no || "-"}</span>
            </div>
            <div>
              <strong>Dated : </strong>
              <span>{formatDate(receipt.date)}</span>
            </div>
            <div>
              <strong>Place of Supply : </strong>
              <span>
                {hasBillTo && billTo?.place_of_supply
                  ? `${billTo.place_of_supply}${billTo.place_of_supply_state_code ? ` (${billTo.place_of_supply_state_code})` : ""}`
                  : (receipt.place_of_supply || loc.state || branch.state || "Tamil Nadu")}
              </span>
            </div>
            {receipt.vehicle_no ? (
              <div>
                <strong>Vehicle No : </strong>
                <span>{receipt.vehicle_no}</span>
              </div>
            ) : null}
            {receipt.eway_invoice_no ? (
              <div>
                <strong>E-Way Invoice No : </strong>
                <span>{receipt.eway_invoice_no}</span>
              </div>
            ) : null}
            {receipt.eway_bill_no ? (
              <div>
                <strong>E-Way Bill No : </strong>
                <span>{receipt.eway_bill_no}</span>
              </div>
            ) : null}
          </div>

          {/* Billed To & Shipped To */}
          <div className="d-flex border-bottom-black">
            {/* Left side: Billed To */}
            <div
              className="w-50 border-end-black p-2 d-flex flex-column justify-content-between"
              style={{ fontSize: "11px", lineHeight: "1.4" }}
            >
              <div>
                <div className="party-heading">Billed To</div>
                {hasBillTo ? (
                  <>
                    {billTo.company_name && (
                      <div className="fw-bold" style={{ fontSize: "12px" }}>
                        {billTo.company_name.toUpperCase()}
                      </div>
                    )}
                    {billTo.customer_name && (
                      <div
                        className={billTo.company_name ? "fw-semibold" : "fw-bold"}
                        style={{ fontSize: billTo.company_name ? "11px" : "12px" }}
                      >
                        {billTo.company_name
                          ? `Attn / Name: ${billTo.customer_name}`
                          : billTo.customer_name.toUpperCase()}
                      </div>
                    )}
                    <div style={{ marginTop: "2px" }}>
                      {formatCleanAddress(billTo.address)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="fw-bold" style={{ fontSize: "12px" }}>
                      {billedToName.toUpperCase()}
                    </div>
                    <div style={{ marginTop: "2px" }}>
                      {billedToAddress}
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2">
                <div className="d-flex">
                  <span style={{ width: "95px", display: "inline-block" }}>Mobile</span>
                  <span>: &nbsp;{hasBillTo ? (billTo.phone || "-") : billedToPhone}</span>
                </div>
                {!isNonGstReceipt && (
                  <div className="d-flex">
                    <span style={{ width: "95px", display: "inline-block" }}>GSTIN</span>
                    <span>: &nbsp;{hasBillTo ? (billTo.gstin || "-") : billedToGst}</span>
                  </div>
                )}
                <div className="d-flex">
                  <span style={{ width: "95px", display: "inline-block" }}>State</span>
                  <span>: &nbsp;{hasBillTo ? billedStateDisplay : customerStateDisplay}</span>
                </div>
                <div className="d-flex">
                  <span style={{ width: "95px", display: "inline-block" }}>Place of Supply</span>
                  <span>: &nbsp;{hasBillTo ? billedPosDisplay : customerPosDisplay}</span>
                </div>
              </div>
            </div>

            {/* Right side: Shipped To (Sales customer address fetch to shipped to) */}
            <div
              className="w-50 p-2 d-flex flex-column justify-content-between"
              style={{ fontSize: "11px", lineHeight: "1.4" }}
            >
              <div>
                <div className="party-heading">Shipped To</div>
                <div className="fw-bold" style={{ fontSize: "12px" }}>
                  {shippedToName.toUpperCase()}
                </div>
                <div style={{ marginTop: "2px" }}>
                  {shippedToAddress}
                </div>
              </div>

              <div className="pt-2">
                <div className="d-flex">
                  <span style={{ width: "95px", display: "inline-block" }}>Mobile</span>
                  <span>
                    : &nbsp;{shippedToPhone}{shippedToAlternate}
                  </span>
                </div>
                {!isNonGstReceipt && (
                  <div className="d-flex">
                    <span style={{ width: "95px", display: "inline-block" }}>GSTIN</span>
                    <span>: &nbsp;{shippedToGst}</span>
                  </div>
                )}
                <div className="d-flex">
                  <span style={{ width: "95px", display: "inline-block" }}>State</span>
                  <span>: &nbsp;{customerStateDisplay}</span>
                </div>
                <div className="d-flex">
                  <span style={{ width: "95px", display: "inline-block" }}>Place of Supply</span>
                  <span>: &nbsp;{customerPosDisplay}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-grow-1 border-bottom-black d-flex flex-column">
            <table
              className="table-invoice"
              style={{
                border: "none",
                borderBottom: "none",
                width: "100%",
                flexGrow: 1,
              }}
            >
              <thead>
                <tr style={{ height: "30px" }}>
                  <th
                    style={{
                      width: "42px",
                      borderLeft: "none",
                      borderTop: "none",
                    }}
                  >
                    S.No
                  </th>
                  <th style={{ borderTop: "none", textAlign: "left", paddingLeft: "8px" }}>
                    Description
                  </th>
                  <th style={{ width: "55px", borderTop: "none" }}>
                    Qty
                  </th>
                  <th style={{ width: "85px", borderTop: "none", textAlign: "right", paddingRight: "8px" }}>
                    Rate
                  </th>
                  <th style={{ width: "75px", borderTop: "none" }}>
                    Discount
                  </th>
                  {!isNonGstReceipt && (
                    <th style={{ width: "65px", borderTop: "none" }}>
                      Tax
                    </th>
                  )}
                  <th
                    style={{
                      width: "95px",
                      borderRight: "none",
                      borderTop: "none",
                      textAlign: "right",
                      paddingRight: "8px",
                    }}
                  >
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody style={{ verticalAlign: "top" }}>
                {processedProducts.map((p) => (
                  <tr key={p.idx} style={{ height: "22px" }}>
                    <td style={{ borderLeft: "none", borderBottom: "none" }}>
                      {p.idx}.
                    </td>
                    <td
                      className="text-start px-2"
                      style={{ borderBottom: "none" }}
                    >
                      {p.product_name}
                    </td>
                    <td style={{ borderBottom: "none" }}>{p.qty}</td>
                    <td
                      className="text-end px-2"
                      style={{ borderBottom: "none" }}
                    >
                      {fmt(p.mrp || p.rate)}
                    </td>
                    <td style={{ borderBottom: "none" }}>
                      {p.discStr}
                    </td>
                    {!isNonGstReceipt && (
                      <td style={{ borderBottom: "none" }}>
                        {p.gstRate > 0 ? `${p.gstRate}%` : "-"}
                      </td>
                    )}
                    <td
                      className="text-end px-2"
                      style={{ borderRight: "none", borderBottom: "none" }}
                    >
                      {fmt(p.rowTotal)}
                    </td>
                  </tr>
                ))}
                {/* Empty filler row to stretch table */}
                <tr style={{ height: "auto" }}>
                  <td style={{ borderLeft: "none", borderBottom: "none" }}></td>
                  <td style={{ borderBottom: "none" }}></td>
                  <td style={{ borderBottom: "none" }}></td>
                  <td style={{ borderBottom: "none" }}></td>
                  <td style={{ borderBottom: "none" }}></td>
                  {!isNonGstReceipt && <td style={{ borderBottom: "none" }}></td>}
                  <td
                    style={{ borderRight: "none", borderBottom: "none" }}
                  ></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown & Bank Details Section */}
          <div className="d-flex border-bottom-black">
            <div className="flex-grow-1 p-2 d-flex flex-column justify-content-between border-end-black">
              {loc.bank_name ||
                biz.bank_name ||
                loc.account_number ||
                biz.account_number ? (
                <div>
                  <div
                    className="fw-bold text-decoration-underline mb-1"
                    style={{ fontSize: "11px" }}
                  >
                    Bank Details :
                  </div>
                  <div
                    className="d-flex flex-column"
                    style={{ fontSize: "11px", lineHeight: "1.4" }}
                  >
                    {loc.account_holder || biz.account_holder ? (
                      <div>
                        <span
                          style={{ width: "85px", display: "inline-block" }}
                        >
                          A/c Holder
                        </span>
                        : &nbsp;
                        <strong>
                          {(
                            loc.account_holder || biz.account_holder
                          ).toUpperCase()}
                        </strong>
                      </div>
                    ) : null}
                    {loc.bank_name || biz.bank_name ? (
                      <div>
                        <span
                          style={{ width: "85px", display: "inline-block" }}
                        >
                          Bank Name
                        </span>
                        : &nbsp;
                        <strong>
                          {(loc.bank_name || biz.bank_name).toUpperCase()}
                        </strong>
                      </div>
                    ) : null}
                    {loc.branch || biz.branch ? (
                      <div>
                        <span
                          style={{ width: "85px", display: "inline-block" }}
                        >
                          Branch
                        </span>
                        : &nbsp;
                        <strong>
                          {(loc.branch || biz.branch).toUpperCase()}
                        </strong>
                      </div>
                    ) : null}
                    {loc.account_number || biz.account_number ? (
                      <div>
                        <span
                          style={{ width: "85px", display: "inline-block" }}
                        >
                          A/c No.
                        </span>
                        : &nbsp;
                        <strong>
                          {loc.account_number || biz.account_number}
                        </strong>
                      </div>
                    ) : null}
                    {loc.ifsc || biz.ifsc || biz.ifsc_code ? (
                      <div>
                        <span
                          style={{ width: "85px", display: "inline-block" }}
                        >
                          IFSC Code
                        </span>
                        : &nbsp;
                        <strong>
                          {(
                            loc.ifsc ||
                            biz.ifsc_code ||
                            biz.ifsc
                          ).toUpperCase()}
                        </strong>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div />
              )}
            </div>
            <div
              style={{ width: "230px" }}
              className="d-flex flex-column border-start-black"
            >
              <div
                className="d-flex justify-content-between px-2 py-1 border-bottom-black"
                style={{ fontSize: "11px" }}
              >
                <span>AMOUNT -</span>
                <span className="fw-bold">{fmt(finalAmount)}</span>
              </div>
              {!isNonGstReceipt && (
                <>
                  <div
                    className="d-flex justify-content-between px-2 py-1 border-bottom-black"
                    style={{ fontSize: "11px" }}
                  >
                    <span>CGST -</span>
                    <span className="fw-bold">{fmt(finalCgst)}</span>
                  </div>
                  <div
                    className="d-flex justify-content-between px-2 py-1 border-bottom-black"
                    style={{ fontSize: "11px" }}
                  >
                    <span>SGST -</span>
                    <span className="fw-bold">{fmt(finalSgst)}</span>
                  </div>
                </>
              )}
              {transportCharges > 0 && (
                <div
                  className="d-flex justify-content-between px-2 py-1 border-bottom-black"
                  style={{ fontSize: "11px" }}
                >
                  <span>TRANSPORT CHARGES -</span>
                  <span className="fw-bold">+ ₹{fmt(transportCharges)}</span>
                </div>
              )}
              {parsedAdditionalCharges.map((chg, i) => (
                <div
                  key={i}
                  className="d-flex justify-content-between px-2 py-1 border-bottom-black"
                  style={{ fontSize: "11px" }}
                >
                  <span>{String(chg.name || "ADDITIONAL CHARGE").toUpperCase()} -</span>
                  <span className="fw-bold">+ ₹{fmt(chg.amount)}</span>
                </div>
              ))}
              <div
                className="d-flex justify-content-between px-2 py-1 border-bottom-black"
                style={{ fontSize: "11px" }}
              >
                <span>ROUND OFF -</span>
                <span className="fw-bold">
                  {roundOff >= 0 ? `+${fmt(roundOff)}` : fmt(roundOff)}
                </span>
              </div>
              {totalDiscountAmount > 0 && (
                <div
                  className="d-flex justify-content-between px-2 py-1 border-bottom-black text-danger"
                  style={{ fontSize: "11px" }}
                >
                  <span>DISCOUNT -</span>
                  <span className="fw-bold">- ₹{fmt(totalDiscountAmount)}</span>
                </div>
              )}
              <div
                className="d-flex justify-content-between px-2 py-1 fw-bold grand-total-row"
                style={{ fontSize: "13px" }}
              >
                <span>GRAND TOTAL -</span>
                <span>₹{fmt(grandTotal)}</span>
              </div>
              {advancePayment && (
                <>
                  <div
                    className="d-flex justify-content-between px-2 py-1 border-bottom-black"
                    style={{ fontSize: "10px" }}
                  >
                    <span>ADVANCE ({advancePayment.method || "Cash"}) -</span>
                    <span className="fw-bold">₹{fmt(advancePaid)}</span>
                  </div>
                  <div
                    className="d-flex justify-content-between px-2 py-1 border-bottom-black text-muted"
                    style={{ fontSize: "10px" }}
                  >
                    <span>BAL. AFTER ADV -</span>
                    <span className="fw-bold">₹{fmt(balanceAfterAdvance)}</span>
                  </div>
                </>
              )}
              {subsequentPayments.length > 0 &&
                subsequentPayments.map((p, pIdx) => (
                  <div
                    key={p.id || pIdx}
                    className="d-flex justify-content-between px-2 py-1 border-bottom-black"
                    style={{ fontSize: "10px" }}
                  >
                    <span>
                      {subsequentPayments.length > 1 || advancePayment
                        ? `BAL. PAID ${pIdx + 1}`
                        : "PAID"}{" "}
                      ({p.method || "Cash"}) -
                    </span>
                    <span className="fw-bold">₹{fmt(p.amount)}</span>
                  </div>
                ))}
              <div
                className="d-flex justify-content-between px-2 py-1 border-bottom-black fw-bold"
                style={{ fontSize: "11px", color: "#16a34a" }}
              >
                <span>TOTAL PAID -</span>
                <span>₹{fmt(totalPaid)}</span>
              </div>
              <div
                className="d-flex justify-content-between px-2 py-1 fw-bold"
                style={{
                  fontSize: "12px",
                  backgroundColor: finalOutstanding > 0 ? "#fef2f2" : "#f0fdf4",
                  color: finalOutstanding > 0 ? "#dc2626" : "#16a34a",
                }}
              >
                <span>{finalOutstanding > 0 ? "OUTSTANDING -" : "BALANCE -"}</span>
                <span>{finalOutstanding > 0 ? `₹${fmt(finalOutstanding)}` : "₹0.00 (PAID)"}</span>
              </div>
            </div>
          </div>

          {/* Amount in Words Line Below */}
          <div className="p-2 border-bottom-black" style={{ fontSize: "11px" }}>
            <span className="fw-bold">Amount Chargeable (in words): </span>
            <span className="fst-italic text-capitalize fw-bold">
              {numberToWords(grandTotal) || "-"}
            </span>
          </div>

          {/* Bottom Footer Row */}
          <div
            className="d-flex"
            style={{ minHeight: "115px", fontSize: "11px" }}
          >
            <div className="p-2 d-flex flex-column border-end-black flex-grow-1" style={{ fontSize: "10px", lineHeight: "1.35" }}>
              <div
                className="text-decoration-underline mb-1"
                style={{ fontSize: "10.5px", fontWeight: "bold" }}
              >
                Terms & Conditions :
              </div>
              <div>
                1. Please inspect all furniture items at the time of delivery. Later complaints of damage, scratches or shortage will not be entertained.
              </div>
              <div style={{ marginTop: "3px" }}>
                2. Furniture once sold will not be taken back or exchanged. Colour, shade and grain variation in wood / fabric is natural.
              </div>
              <div style={{ marginTop: "3px" }}>
                3. Warranty, if any, covers manufacturing defects only and does not apply to wear and tear, misuse or improper handling.
              </div>
            </div>
            <div
              className="p-2 d-flex flex-column justify-content-between text-center"
              style={{ width: "240px" }}
            >
              <div className="text-start" style={{ fontSize: "10px" }}>Receiver's Signature :</div>
              <div className="mt-1" style={{ fontSize: "10.5px" }}>for {compName}</div>
              <div className="mt-auto d-flex flex-column align-items-center">
                {signImg && (
                  <img
                    src={signImg}
                    alt="Authorised Signatory"
                    style={{
                      maxHeight: "44px",
                      maxWidth: "135px",
                      objectFit: "contain",
                      marginBottom: "2px",
                      mixBlendMode: "multiply",
                    }}
                  />
                )}
                <div className="border-top-black d-inline-block px-4 pt-1" style={{ fontSize: "10.5px" }}>
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
