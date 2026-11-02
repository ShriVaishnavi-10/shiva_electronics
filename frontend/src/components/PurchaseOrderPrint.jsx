import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "reactstrap";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import apiClient from "../utils/api";
import fallbackLogo from "../assets/index/logo.png";

function numberToWords(num) {
  const n = Math.round(Number(num));
  if (!Number.isFinite(n) || n === 0) return "";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy",
    "Eighty", "Ninety",
  ];
  const convert = (val) => {
    if (val < 20) return ones[val];
    if (val < 100) return `${tens[Math.floor(val / 10)]} ${ones[val % 10]}`.trim();
    if (val < 1000) return `${ones[Math.floor(val / 100)]} Hundred ${convert(val % 100)}`.trim();
    if (val < 100000) return `${convert(Math.floor(val / 1000))} Thousand ${convert(val % 1000)}`.trim();
    if (val < 10000000) return `${convert(Math.floor(val / 100000))} Lakh ${convert(val % 100000)}`.trim();
    return `${convert(Math.floor(val / 10000000))} Crore ${convert(val % 10000000)}`.trim();
  };
  return `${convert(n)} Rupees Only`;
}

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

export default function PurchaseOrderPrint({ type = "Purchase Order" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);
  
  const [purchase, setPurchase] = useState(null);
  const [branch, setBranch] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient.get(`/purchases/${id}`)
      .then(res => setPurchase(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!purchase?.branch_id) return;
    apiClient.get(`/branches/${purchase.branch_id}`)
      .then(res => setBranch(res.data))
      .catch(console.error);
    apiClient.get("/locations", { params: { branch_id: purchase.branch_id, limit: 1 } })
      .then(res => {
        const list = res.data?.data || res.data;
        setLocation(Array.isArray(list) ? list[0] : list);
      })
      .catch(console.error);
  }, [purchase?.branch_id]);

  if (loading) return <div className="text-center p-5">Loading data...</div>;
  if (!purchase) return <div className="text-center p-5 text-danger">Purchase Order not found</div>;

  const companyName =
    location?.name || branch?.branch_name;
  const companyAddressRaw = [location?.landmark, location?.city, location?.state, location?.zip_code]
    .filter(Boolean).join(", ") || branch?.address || "";
  const companyPhone = location?.mobile || branch?.phone || "";
  const companyGst = location?.gst_no || branch?.gst_no || "";

  const vendorName = purchase?.company_name || purchase?.vendor_name || "";
  const vendorAddress = purchase?.address || "";
  const vendorGst = purchase?.gst_no || "";
  const vendorMobile = purchase?.mobile || "";
  const items = (purchase.items || []).map((it, i) => {
    const qty = Number(it.qty) || 0;
    const rate = Number(it.price || 0);
    const discountPercent = Number(it.discount || 0);
    const discountAmount = (qty * rate) * (discountPercent / 100);
    const taxable = (qty * rate) - discountAmount;

    let taxPercent = Number(it.tax_rate) || 0;
    if (taxPercent === 0) {
      const grandTotal = Number(it.total) || taxable;
      if (grandTotal > taxable) {
        const taxAmount = grandTotal - taxable;
        taxPercent = Math.round((taxAmount / taxable) * 100);
      }
    }

    const taxAmount = taxable * (taxPercent / 100);
    const cgstRate = taxPercent / 2;
    const sgstRate = cgstRate;
    const cgstAmt = taxAmount / 2;
    const sgstAmt = taxAmount / 2;
    const itemTotal = taxable + taxAmount;

    return {
      sNo: i + 1,
      name: it.product_name || "",
      hsn: it.hsncode || "8413",
      qty: qty,
      unit: it.primary_unit || "Nos",
      rate: rate,
      taxable: taxable,
      gstRate: taxPercent,
      cgstRate: cgstRate,
      cgstAmt: cgstAmt,
      sgstRate: sgstRate,
      sgstAmt: sgstAmt,
      total: itemTotal
    };
  });

  const totals = items.reduce((acc, it) => {
    acc.qty += it.qty;
    acc.taxable += it.taxable;
    acc.cgst += it.cgstAmt;
    acc.sgst += it.sgstAmt;
    acc.grandTotal += it.total;
    return acc;
  }, { qty: 0, taxable: 0, cgst: 0, sgst: 0, grandTotal: 0 });

  const amountInWords = numberToWords(totals.grandTotal);
  
  const bank = {
    accountName: location?.account_holder || "Account Holder",
    accNumber: location?.account_number || "A/C Number",
    ifsc: location?.ifsc_code || "IFSC Code",
    bankName: location?.bank_name || "Bank Name",
    branch: location?.branch || "Branch"
  };

  const roundedAmountWithTax = Math.round(totals.grandTotal);
  const roundOffValue = roundedAmountWithTax - totals.grandTotal;

  const taxSummary = {
    totalBeforeTax: totals.taxable,
    addCgst: totals.cgst,
    addSgst: totals.sgst,
    taxAmountGst: totals.cgst + totals.sgst,
    amountWithTax: roundedAmountWithTax,
    roundOffValue: roundOffValue
  };

  const terms = ["1. This is an electronically generated purchase order", "2. All disputes are subject to SALEM jurisdiction"];

  const handlePrint = () => {
    window.print();
  };

  const handlePdf = async () => {
    const input = document.getElementById("printable-invoice");
    if (!input) return;
    const canvas = await html2canvas(input, { scale: 3, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
    pdf.save(`purchase_order_${purchase?.purchase_no || id}.pdf`);
  };

  return (
    <div className="receipt-page bg-light min-vh-100 py-4">
      <style>
        {`
          @media print {
            @page { size: A4 portrait; margin: 0 !important; }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              height: 100% !important;
              overflow: hidden !important;
            }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; background-color: white !important; }
            body * { visibility: hidden; }
            .printable-invoice, .printable-invoice * { visibility: visible !important; }
            .receipt-page { padding: 0 !important; background-color: white !important; }
            .no-print { display: none !important; }
            .printable-invoice {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 10mm !important;
              background-color: white !important;
              z-index: 9999 !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              font-family: 'Calibri', 'Arial', sans-serif !important;
              border: none !important;
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
            font-family: 'Calibri', 'Arial', sans-serif;
            color: black;
            font-size: 11px;
            line-height: 1.2;
            width: 210mm;
            min-height: 297mm;
            padding: 10mm;
            background: white;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            margin: 20px auto;
            box-sizing: border-box;
          }
        `}
      </style>

      <div className="no-print d-flex gap-2 mb-3 justify-content-between w-100 max-w-4xl px-3" style={{maxWidth: "800px"}}>
        <Button color="secondary" onClick={() => navigate(-1)}>Back</Button>
        <div className="d-flex gap-2">
          <Button color="primary" onClick={handlePrint}>Print PO</Button>
          <Button color="success" onClick={handlePdf}>Download PDF</Button>
        </div>
      </div>

      <div ref={printRef} className="printable-invoice" id="printable-invoice">
        <div style={{ border: "1px solid #000", display: "flex", flexDirection: "column", height: "100%" }}>
          
          <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
            <div style={{ width: "25%", padding: "10px", borderRight: "0px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/logo1.jpeg" alt="Logo" className="img-fluid" style={{ maxHeight: '80px', mixBlendMode: 'multiply' }} />
            </div>
            <div style={{ width: "75%", padding: "10px", textAlign: "center", display: "flex", alignItems: "center" }}>
              <h3 style={{ margin: "0 0 5px 0", fontSize: "22px", fontWeight: "bold", width: "100%", textAlign: "center" }}>{type}</h3>
            </div>
          </div>
          
          <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
            <div style={{ width: "50%", padding: "10px", borderRight: "0px" }}>
              <h3 style={{ margin: "0 0 5px 0", fontSize: "14px", fontWeight: "bold", textTransform: "uppercase" }}>{companyName}</h3>
              <p style={{ margin: "0 0 4px 0", fontSize: "12px" }}>{companyAddressRaw}</p>
              <p style={{ margin: "0 0 4px 0", fontSize: "12px" }}>{location?.email || "shree13ram@gmail.com"}</p>
              <p style={{ margin: "0 0 4px 0", fontSize: "12px", fontWeight: "bold" }}>{companyPhone}</p>
              <p style={{ margin: "0", fontSize: "12px", fontWeight: "bold" }}>GSTIN : {companyGst}</p>
            </div>
            <div style={{ width: "50%", padding: "10px", display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "flex-end" }}>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", rowGap: "4px", fontSize: "12px" }}>
                <div style={{fontWeight: "bold"}}>Dated as</div><div>: {formatDate(purchase?.purchase_date)}</div>
                <div style={{fontWeight: "bold"}}>P.O. No</div><div>: {purchase?.po_no || purchase?.purchase_no || ""}</div>
                {purchase?.po_no && purchase?.purchase_no && purchase.po_no !== purchase.purchase_no && (
                  <>
                    <div style={{fontWeight: "bold"}}>Pur. Ref</div><div>: {purchase?.purchase_no}</div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
            
            <div style={{ width: "50%", borderRight: "1px solid #000", display: "flex", flexDirection: "column" }}>
              <div style={{ fontWeight: "bold", padding: "4px", fontSize: "13px" }}>
                Vendor details
              </div>
              <div style={{ padding: "4px", display: "grid", gridTemplateColumns: "100px 1fr", rowGap: "4px", fontSize: "12px" }}>
                <div>Vendor Name</div><div>: {vendorName}</div>
                <div>GSTIN</div><div>: {vendorGst}</div>
                <div>Address</div><div>: {vendorAddress}</div>
              </div>
            </div>

            <div style={{ width: "50%", display: "flex", flexDirection: "column" }}>
              <div style={{ fontWeight: "bold", padding: "4px", fontSize: "13px" }}>
                Ship To
              </div>
              <div style={{ padding: "4px", display: "grid", gridTemplateColumns: "80px 1fr", rowGap: "4px", fontSize: "12px" }}>
                <div>Name</div><div style={{textTransform: "uppercase"}}>: {companyName}</div>
                <div>GSTIN</div><div>: {companyGst}</div>
                <div>Address</div><div>: {companyAddressRaw}</div>
                <div>Mobile</div><div>: {companyPhone}</div>
              </div>
            </div>
            
          </div>

          <div style={{ flexGrow: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", borderBottom: "1px solid #000" }}>
              <thead style={{ background: "#eef2f7" }}>
              <tr>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }}>Sr.<br/>No.</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }}>Description</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }}>HSN/SAC</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }}>QTY</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }}>Unit</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }}>Unit Price</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }}>GST %</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }}>CGST</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }}>SGST</th>
                <th style={{ borderBottom: "1px solid #000", padding: "4px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #000" }}>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>{item.sNo}</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "left" }}>{item.name}</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>{item.hsn}</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>{item.qty}</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>{item.unit}</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>{item.rate.toFixed(2)}</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>{item.gstRate}%</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>
                    <div>{item.cgstAmt.toFixed(2)}</div>
                    <div style={{ fontSize: "10px", color: "#444" }}>({item.cgstRate.toFixed(2)}%)</div>
                  </td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>
                    <div>{item.sgstAmt.toFixed(2)}</div>
                    <div style={{ fontSize: "10px", color: "#444" }}>({item.sgstRate.toFixed(2)}%)</div>
                  </td>
                  <td style={{ padding: "4px", fontWeight: "bold" }}>{item.total.toFixed(2)}</td>
                </tr>
              ))}
              
              <tr style={{ height: "40px" }}>
                <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000" }}></td>
                <td style={{ borderBottom: "1px solid #000" }}></td>
              </tr>

              <tr style={{ borderTop: "1px solid #000", background: "#eef2f7", fontWeight: "bold", display: "none" }}></tr>
            </tbody>
          </table>
          </div>
          <div style={{ display: "flex", borderBottom: "1px solid #000", borderTop: "1px solid #000" }}>
            
            <div style={{ width: "60%", borderRight: "1px solid #000", display: "flex", flexDirection: "column" }}>
              <div style={{ borderBottom: "1px solid #000", padding: "8px", fontWeight: "bold" }}>
                Total Purchase Order Amount in words :<br/>
                <span style={{ fontWeight: "normal", display: "block", marginTop: "4px" }}>{amountInWords}</span>
              </div>
              <div style={{ padding: "8px", flexGrow: 1 }}>
                <div style={{ fontWeight: "bold", textAlign: "left", marginBottom: "4px" }}>Terms And Conditions</div>
                {terms.map((t, idx) => (
                  <div key={idx} style={{ fontSize: "11px", marginBottom: "2px" }}>{t}</div>
                ))}
              </div>
            </div>
            
            <div style={{ width: "40%", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", borderBottom: "1px solid #000" }}>
                <div style={{ padding: "4px", borderRight: "1px solid #000" }}>Total Taxable Amount :</div>
                <div style={{ padding: "4px", textAlign: "right", fontWeight: "bold" }}>₹{taxSummary.totalBeforeTax.toFixed(2)}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", borderBottom: "1px solid #000" }}>
                <div style={{ padding: "4px", borderRight: "1px solid #000" }}>Total GST :</div>
                <div style={{ padding: "4px", textAlign: "right", fontWeight: "bold" }}>₹{taxSummary.taxAmountGst.toFixed(2)}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", borderBottom: "1px solid #000" }}>
                <div style={{ padding: "4px", borderRight: "1px solid #000" }}>Round Off Value :</div>
                <div style={{ padding: "4px", textAlign: "right" }}>{taxSummary.roundOffValue.toFixed(2)}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", background: "#eef2f7", fontWeight: "bold", flexGrow: 1 }}>
                <div style={{ padding: "4px", borderRight: "1px solid #000" }}>Total Amount After Tax :</div>
                <div style={{ padding: "4px", textAlign: "right" }}>₹{taxSummary.amountWithTax.toFixed(2)}</div>
              </div>
            </div>
            
          </div>

          <div style={{ display: "flex" }}>
            <div style={{ width: "60%", borderRight: "1px solid #000", padding: "4px" }}></div>
            <div style={{ width: "40%", padding: "4px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ fontSize: "11px" }}>Certified that the particular given above are true and correct</div>
              <div style={{ fontWeight: "bold", marginTop: "4px" }}>For, {companyName}</div>
              <div style={{ height: "40px" }}></div>
              <div style={{ borderTop: "1px solid #000", width: "80%", margin: "0 auto 4px auto" }}></div>
              <div style={{ fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                <span style={{flex:1, textAlign:"center"}}>Authorized Signatory</span>
                <span>(E & OE)</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
