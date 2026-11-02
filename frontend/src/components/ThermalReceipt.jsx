import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "reactstrap";
import { FaPrint, FaArrowLeft, FaCheck } from "react-icons/fa";
import { toast } from "react-toastify";
import apiClient from "../utils/api";

const fmt = (num) => {
  const n = Number(num);
  if (Number.isNaN(n)) return "0.00";
  return n.toFixed(2);
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

export default function ThermalReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const autoPrint = searchParams.get("autoPrint") === "true" || location.state?.autoPrint;
  const returnTo = location.state?.returnTo || searchParams.get("returnTo") || "/index/salesList";

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paperSize, setPaperSize] = useState(() => {
    return localStorage.getItem("thermal_printer_size") || "80mm";
  });

  const handleSizeChange = (size) => {
    setPaperSize(size);
    localStorage.setItem("thermal_printer_size", size);
  };

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

  // Automatically trigger browser print dialog when autoPrint is requested
  useEffect(() => {
    if (!loading && receipt && autoPrint) {
      toast.dismiss();
      const timer = setTimeout(() => {
        toast.dismiss();
        window.print();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [loading, receipt, autoPrint]);

  // Automatically return after printing completes or is closed
  useEffect(() => {
    if (!autoPrint) return;

    const handleAfterPrint = () => {
      navigate(returnTo, { replace: true });
    };

    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [autoPrint, returnTo, navigate]);

  const handlePrint = () => {
    toast.dismiss();
    window.print();
  };

  const loc = receipt?.location || {};
  const biz = receipt?.business || {};
  const branch = receipt?.branch || {};
  const customer = receipt?.customer || {};
  const products = receipt?.products || [];
  const totals = receipt?.totals || {};

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

  const formattedAddress = (customer.address || "").replace(/\n/g, ", ");

  const compName = loc.name || biz.name || branch.name || "CLAVIS TECH WORKS";
  const addressStr =
    [loc.landmark, loc.city, loc.state, loc.zip_code]
      .filter((v) => v && String(v).trim())
      .join(", ");
  const phoneStr = "8870639863";

  let grossSubtotal = 0;
  let calcAmount = 0;
  let calcTax = 0;
  let unroundedTotal = 0;

  products.forEach((p) => {
    const qty = Number(p.qty) || 0;
    const rate = Number(p.rate) || 0;
    const mrp = Number(p.mrp) || rate;

    let gstRate = 0;
    if (p.gst_rate != null && !isNaN(Number(p.gst_rate))) {
      gstRate = Number(p.gst_rate);
    } else if (p.tax_rate != null && !isNaN(Number(p.tax_rate))) {
      gstRate = Number(p.tax_rate);
    } else if (receipt?.tax_group_rate_pct || receipt?.tax_group_total_rate_pct) {
      gstRate = Number(receipt.tax_group_rate_pct || receipt.tax_group_total_rate_pct);
    } else if (p.tax && typeof p.tax === "string" && p.tax !== "0%") {
      const match = p.tax.match(/(\d+(\.\d+)?)%/);
      if (match) gstRate = parseFloat(match[1]);
    }

    const lineAmtIncTax = Number(p.line_total) || Number(p.amount) || (rate * qty);
    const taxable = gstRate > 0 ? (lineAmtIncTax / (1 + (gstRate / 100))) : lineAmtIncTax;
    const gstAmt = lineAmtIncTax - taxable;

    const lineGross = (mrp > 0 ? mrp : rate) * qty;
    grossSubtotal += lineGross;

    calcAmount += taxable;
    calcTax += gstAmt;
    unroundedTotal += lineAmtIncTax;
  });

  const lineDiscountTotal = products.reduce((sum, p) => {
    const qty = Number(p.qty) || 0;
    const rate = Number(p.rate) || 0;
    const mrp = Number(p.mrp) || rate;
    return sum + (mrp > rate ? (mrp - rate) * qty : 0);
  }, 0);

  const headerDiscount = Number(totals.discount) || 0;
  const discountAmt = Math.max(headerDiscount, lineDiscountTotal);

  const travelCharges = Number(totals.travel_charges || receipt.transport_charges) || 0;
  let parsedThermalAdditional = [];
  if (receipt?.additional_charges) {
    try {
      const p = typeof receipt.additional_charges === "string" ? JSON.parse(receipt.additional_charges) : receipt.additional_charges;
      if (Array.isArray(p)) parsedThermalAdditional = p;
    } catch (_) {}
  }
  const thermalAdditionalTotal = parsedThermalAdditional.reduce(
    (s, c) => s + (Number(c.amount) || 0),
    0
  );
  const totalThermalExtra = travelCharges + thermalAdditionalTotal;
  const subtotalBeforeDiscount =
    grossSubtotal > unroundedTotal ? grossSubtotal : unroundedTotal + discountAmt;

  const roundedGrandTotal =
    totals.grand_total != null && Number(totals.grand_total) > 0
      ? Math.round(Number(totals.grand_total))
      : Math.round(unroundedTotal + totalThermalExtra);
  const roundOff = Number(
    (roundedGrandTotal - (unroundedTotal + totalThermalExtra)).toFixed(2)
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
    Number((roundedGrandTotal - totalPaid).toFixed(2))
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
      Number(firstPay.amount) < roundedGrandTotal ||
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
    ? Math.max(0, Number((roundedGrandTotal - advancePaid).toFixed(2)))
    : null;

  if (loading)
    return (
      <div className="text-center p-5 mt-5">
        <h4>Loading Receipt...</h4>
      </div>
    );
  if (!receipt)
    return (
      <div className="text-center p-5 mt-5">
        <h4>Sale Not Found</h4>
        <Button color="primary" onClick={() => navigate(returnTo, { replace: true })}>
          Go Back
        </Button>
      </div>
    );

  const is58mm = paperSize === "58mm";

  return (
    <div className="bg-light min-vh-100 py-4">
      <style>
        {`
          @media print {
            @page {
              margin: 0;
              size: ${is58mm ? "58mm auto" : "80mm auto"};
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: white !important;
              height: auto !important;
              min-height: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #root, .layout, .body-wrapper, .content-area, .bg-light {
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: white !important;
              position: static !important;
              display: block !important;
            }
            .app-header, .sidebar, .desktop-sidebar, .footer, .no-print, header, nav, button,
            .Toastify, .Toastify__toast-container, .Toastify__toast, .Toastify__toast-body, .toast, div[role="alert"] {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              height: 0 !important;
              width: 0 !important;
              overflow: hidden !important;
              pointer-events: none !important;
            }
            .thermal-receipt {
              width: 100% !important;
              max-width: ${is58mm ? "56mm" : "78mm"} !important;
              margin: 0 auto !important;
              padding: ${is58mm ? "1.5mm 1mm" : "3mm 2mm"} !important;
              background-color: white !important;
              border: none !important;
              box-shadow: none !important;
              position: static !important;
              page-break-inside: auto !important;
            }
            tr {
              page-break-inside: avoid !important;
            }
          }
          .thermal-receipt {
            font-family: Arial, Helvetica, sans-serif;
            color: black !important;
            font-weight: bold !important;
            font-size: ${is58mm ? "9.5px" : "11px"};
            line-height: 1.25;
            width: ${is58mm ? "58mm" : "80mm"};
            max-width: 100%;
            padding: ${is58mm ? "3mm 2mm" : "5mm"};
            background: white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            margin: 20px auto;
            box-sizing: border-box;
            border-radius: 4px;
            position: relative;
            overflow: hidden;
          }
          .thermal-receipt hr {
            border-top: 1px dashed black;
            opacity: 1;
            margin: 4px 0;
          }
          .thermal-receipt table {
            width: 100%;
            border-collapse: collapse;
          }
          .thermal-receipt th, .thermal-receipt td {
            padding: 2px 1px;
            vertical-align: top;
          }
          .thermal-receipt .text-center { text-align: center; }
          .thermal-receipt .text-right { text-align: right; }
          .thermal-receipt .text-left { text-align: left; }
          .thermal-receipt .font-bold { font-weight: bold; }
        `}
      </style>

      <div className="no-print mb-3 d-flex justify-content-center align-items-center gap-2 flex-wrap">
        <Button
          color="secondary"
          outline
          onClick={() => navigate(returnTo, { replace: true })}
          className="fw-semibold"
        >
          <FaArrowLeft className="me-1" /> {autoPrint ? "Done / Back to Sales" : "Back"}
        </Button>
        <div className="btn-group shadow-sm" role="group">
          <Button
            color={paperSize === "80mm" ? "primary" : "outline-primary"}
            size="sm"
            onClick={() => handleSizeChange("80mm")}
            className="fw-semibold"
          >
            {paperSize === "80mm" && <FaCheck className="me-1 small" />}
            80mm (Standard)
          </Button>
          <Button
            color={paperSize === "58mm" ? "primary" : "outline-primary"}
            size="sm"
            onClick={() => handleSizeChange("58mm")}
            className="fw-semibold"
          >
            {paperSize === "58mm" && <FaCheck className="me-1 small" />}
            58mm (Compact)
          </Button>
        </div>
        <Button
          color="success"
          onClick={handlePrint}
          className="fw-semibold shadow-sm"
        >
          <FaPrint className="me-1" /> Print Thermal Receipt
        </Button>
      </div>

      <div className="thermal-receipt mx-auto">
        {/* CANCELLED WATERMARK */}
        {String(receipt?.status || "").toLowerCase() === "cancelled" && (
          <div
            style={{
              position: "absolute",
              top: "45%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-30deg)",
              fontSize: is58mm ? "32px" : "44px",
              fontWeight: "900",
              color: "rgba(220, 38, 38, 0.28)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              border: "4px dashed rgba(220, 38, 38, 0.38)",
              padding: "6px 16px",
              borderRadius: "8px",
              zIndex: 99,
              pointerEvents: "none",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            CANCELLED
          </div>
        )}

        {/* TOP CANCELLED BANNER */}
        {String(receipt?.status || "").toLowerCase() === "cancelled" && (
          <div
            className="text-center font-bold mb-2 py-1"
            style={{
              backgroundColor: "#FEE2E2",
              color: "#DC2626",
              border: "1px dashed #EF4444",
              fontSize: is58mm ? "10px" : "12px",
              letterSpacing: "1px",
            }}
          >
            *** INVOICE CANCELLED ***
          </div>
        )}

        <div className="text-center">
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              maxHeight: is58mm ? "36px" : "45px",
              marginBottom: "4px",
              mixBlendMode: "multiply",
            }}
          />
        </div>
        <div
          className="text-center font-bold"
          style={{ fontSize: is58mm ? "17px" : "22px", marginBottom: "2px", lineHeight: 1.2 }}
        >
          {compName.toUpperCase()}
        </div>
        <div
          className="text-center"
          style={{ fontSize: is58mm ? "8.5px" : "10px", marginBottom: "2px", lineHeight: 1.2 }}
        >
          {addressStr}
        </div>
        <div className="text-center" style={{ fontSize: is58mm ? "11px" : "13px" }}>
          Phone: {phoneStr}
        </div>

        <hr />

        <div
          className="text-center font-bold"
          style={{ fontSize: is58mm ? "10.5px" : "12px", margin: "3px 0" }}
        >
          ESTIMATE / BILL
        </div>

        <hr />

        <table style={{ fontSize: is58mm ? "8.5px" : "10px", width: "100%" }}>
          <tbody>
            <tr>
              <td className="text-left font-bold" style={{ width: "38%" }}>
                Bill No:
              </td>
              <td className="text-right">{receipt.invoice_no}</td>
            </tr>
            <tr>
              <td className="text-left font-bold">Date:</td>
              <td className="text-right">{formatDate(receipt.date)}</td>
            </tr>
            {hasBillTo ? (
              <>
                <tr>
                  <td className="text-left font-bold">Billed To:</td>
                  <td className="text-right">
                    {billTo.company_name ? billTo.company_name : (billTo.customer_name || "Walk-in")}
                  </td>
                </tr>
                {billTo.company_name && billTo.customer_name && (
                  <tr>
                    <td className="text-left font-bold">Attn:</td>
                    <td className="text-right">{billTo.customer_name}</td>
                  </tr>
                )}
                {billTo.phone && (
                  <tr>
                    <td className="text-left font-bold">Phone:</td>
                    <td className="text-right">{billTo.phone}</td>
                  </tr>
                )}
                {billTo.gstin && (
                  <tr>
                    <td className="text-left font-bold">GSTIN:</td>
                    <td className="text-right">{billTo.gstin}</td>
                  </tr>
                )}
                {billTo.address && (
                  <tr>
                    <td className="text-left font-bold">Address:</td>
                    <td className="text-right">{billTo.address.replace(/\n/g, ", ")}</td>
                  </tr>
                )}
                {(billTo.state || billTo.state_code) && (
                  <tr>
                    <td className="text-left font-bold">State:</td>
                    <td className="text-right">{billTo.state}{billTo.state_code ? ` (${billTo.state_code})` : ""}</td>
                  </tr>
                )}
                {(billTo.place_of_supply || billTo.place_of_supply_state_code) && (
                  <tr>
                    <td className="text-left font-bold">POS:</td>
                    <td className="text-right">{billTo.place_of_supply}{billTo.place_of_supply_state_code ? ` (${billTo.place_of_supply_state_code})` : ""}</td>
                  </tr>
                )}
              </>
            ) : (
              <>
                <tr>
                  <td className="text-left font-bold">Customer:</td>
                  <td className="text-right">{customer.name || "Walk-in"}</td>
                </tr>
                {customer.phone && (
                  <tr>
                    <td className="text-left font-bold">Phone:</td>
                    <td className="text-right">{customer.phone}</td>
                  </tr>
                )}
                <tr>
                  <td className="text-left font-bold">Address:</td>
                  <td className="text-right">{formattedAddress}</td>
                </tr>
              </>
            )}
            {receipt.vehicle_no && (
              <tr>
                <td className="text-left font-bold">Vehicle No:</td>
                <td className="text-right">{receipt.vehicle_no}</td>
              </tr>
            )}
            {receipt.eway_invoice_no && (
              <tr>
                <td className="text-left font-bold">E-Way Invoice No:</td>
                <td className="text-right">{receipt.eway_invoice_no}</td>
              </tr>
            )}
          </tbody>
        </table>

        <hr />

        <table style={{ fontSize: is58mm ? "8.5px" : "10px", width: "100%" }}>
          <thead>
            <tr className="font-bold">
              <th className="text-left" style={{ width: is58mm ? "30%" : "28%" }}>
                Product Name
              </th>
              <th className="text-right" style={{ width: "10%" }}>
                Qty
              </th>
              <th className="text-right" style={{ width: "20%" }}>
                MRP
              </th>
              <th className="text-right" style={{ width: "20%" }}>
                Rate
              </th>
              <th className="text-right" style={{ width: is58mm ? "20%" : "22%" }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const qty = Number(p.qty) || 0;
              const lineAmtIncTax =
                Number(p.line_total) || Number(p.amount) || 0;

              // For non-gst bill, we just show the line amount as rate*qty directly.
              const rate = Number(p.rate) || 0;
              const mrp = Number(p.mrp) || rate;

              return (
                <tr key={idx} style={{ verticalAlign: "top" }}>
                  <td className="text-left" style={{ paddingRight: "2px" }}>
                    {p.product_name}
                  </td>
                  <td className="text-right">{qty}</td>
                  <td className="text-right" style={{ whiteSpace: "nowrap" }}>
                    {fmt(mrp)}
                  </td>
                  <td className="text-right" style={{ whiteSpace: "nowrap" }}>
                    {fmt(rate)}
                  </td>
                  <td
                    className="text-right font-bold"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {fmt(lineAmtIncTax)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <hr />

        <table
          style={{ fontSize: "11px", width: "100%", marginBottom: "6px" }}
        >
          <tbody>
            {discountAmt > 0 && (
              <>
                <tr>
                  <td className="text-left font-bold">Subtotal:</td>
                  <td className="text-right">₹{fmt(subtotalBeforeDiscount)}</td>
                </tr>
                <tr>
                  <td className="text-left font-bold text-danger">Discount:</td>
                  <td className="text-right font-bold text-danger">
                    - ₹{fmt(discountAmt)}
                  </td>
                </tr>
              </>
            )}
            {travelCharges > 0 && (
              <tr>
                <td className="text-left font-bold">Transport:</td>
                <td className="text-right">₹{fmt(travelCharges)}</td>
              </tr>
            )}
            {parsedThermalAdditional.map((chg, i) => (
              <tr key={i}>
                <td className="text-left font-bold">{chg.name || "Addl Charge"}:</td>
                <td className="text-right">+ ₹{fmt(chg.amount)}</td>
              </tr>
            ))}
            {roundOff !== 0 && (
              <tr>
                <td className="text-left font-bold">Round Off:</td>
                <td className="text-right">
                  {roundOff >= 0 ? `+${fmt(roundOff)}` : fmt(roundOff)}
                </td>
              </tr>
            )}
            <tr style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000" }}>
              <td className="text-left font-bold" style={{ fontSize: is58mm ? "13px" : "15px", padding: "3px 0" }}>
                GRAND TOTAL:
              </td>
              <td className="text-right font-bold" style={{ fontSize: is58mm ? "13px" : "15px", padding: "3px 0" }}>
                ₹{fmt(roundedGrandTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        <hr />

        <div
          className="text-center font-bold"
          style={{ fontSize: is58mm ? "9.5px" : "11px", margin: "3px 0 2px 0" }}
        >
          PAYMENT DETAILS
        </div>

        <hr />

        <table
          style={{ fontSize: is58mm ? "8.5px" : "10px", width: "100%", marginBottom: "4px" }}
        >
          <tbody>
            {advancePayment && (
              <>
                <tr>
                  <td className="text-left font-bold">Advance Paid:</td>
                  <td className="text-right font-bold">
                    ₹{fmt(advancePaid)}
                  </td>
                </tr>
                <tr>
                  <td className="text-left font-bold">Advance Mode:</td>
                  <td className="text-right">
                    {advancePayment.method || "Cash"}
                  </td>
                </tr>
                <tr>
                  <td className="text-left font-bold text-muted">
                    Balance After Advance:
                  </td>
                  <td className="text-right font-bold text-muted">
                    ₹{fmt(balanceAfterAdvance)}
                  </td>
                </tr>
              </>
            )}

            {subsequentPayments.length > 0 && (
              <>
                {advancePayment && (
                  <tr>
                    <td
                      colSpan="2"
                      style={{
                        paddingTop: "3px",
                        borderBottom: "1px dashed #000",
                        fontSize: is58mm ? "8px" : "9px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                    >
                      Subsequent / Balance Payments:
                    </td>
                  </tr>
                )}
                {subsequentPayments.map((p, pIdx) => (
                  <tr key={p.id || pIdx}>
                    <td className="text-left font-bold">
                      {subsequentPayments.length > 1 || advancePayment
                        ? `Balance Paid ${pIdx + 1}:`
                        : "Paid Amount:"}
                      <span
                        style={{
                          fontSize: is58mm ? "8px" : "9px",
                          fontWeight: "normal",
                          color: "#555",
                        }}
                      >
                        {" "}
                        ({p.method || "Cash"}
                        {p.created_at ? `, ${formatDate(p.created_at)}` : ""})
                      </span>
                    </td>
                    <td className="text-right font-bold">
                      ₹{fmt(p.amount)}
                    </td>
                  </tr>
                ))}
              </>
            )}

            {validPayments.length === 0 && (
              <tr>
                <td className="text-left font-bold text-danger">
                  Payment Status:
                </td>
                <td className="text-right font-bold text-danger">
                  UNPAID / CREDIT
                </td>
              </tr>
            )}

            <tr style={{ borderTop: "1px solid #000" }}>
              <td
                className="text-left font-bold"
                style={{ fontSize: is58mm ? "9.5px" : "11px", paddingTop: "3px" }}
              >
                Total Paid:
              </td>
              <td
                className="text-right font-bold"
                style={{ fontSize: is58mm ? "9.5px" : "11px", paddingTop: "3px", color: "#16A34A" }}
              >
                ₹{fmt(totalPaid)}
              </td>
            </tr>
            <tr>
              <td
                className="text-left font-bold"
                style={{
                  fontSize: is58mm ? "11.5px" : "13px",
                  paddingTop: "2px",
                  color: finalOutstanding > 0 ? "#DC2626" : "#16A34A",
                }}
              >
                {finalOutstanding > 0 ? "OUTSTANDING:" : "BALANCE:"}
              </td>
              <td
                className="text-right font-bold"
                style={{
                  fontSize: is58mm ? "11.5px" : "13px",
                  paddingTop: "2px",
                  color: finalOutstanding > 0 ? "#DC2626" : "#16A34A",
                }}
              >
                {finalOutstanding > 0
                  ? `₹${fmt(finalOutstanding)}`
                  : "₹0.00 (PAID)"}
              </td>
            </tr>
          </tbody>
        </table>

        <hr />

        <div
          className="text-center font-bold"
          style={{ fontSize: "10px", margin: "10px 0" }}
        >
          Thank You! Visit Again.
        </div>
      </div>
    </div>
  );
}
