import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "reactstrap";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import apiClient from "../utils/api";

/** Convert number to Indian words (rupees) */
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

export default function DeliveryChallanPrint({ type = "DELIVERY CHALLAN" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);
  
  const [quotation, setQuotation] = useState(null);
  const [branch, setBranch] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const params = new URLSearchParams(window.location.search);
    const source = params.get("source");

    if (source === "sale") {
      apiClient.get(`/transactions/${id}`)
        .then(async (res) => {
          const tx = res.data;
          let customerData = {};
          if (tx.contact_id) {
            try {
              const custRes = await apiClient.get(`/customers/${tx.contact_id}`);
              customerData = custRes.data || {};
            } catch (err) {}
          }
          
          setQuotation({
            is_sale: true,
            quotation_no: tx.invoice_no,
            quotation_date: tx.sales_date || tx.date,
            customer_name: tx.customer_name || customerData.customer_name,
            address: customerData.address || "",
            city: customerData.city || "",
            pincode: customerData.pincode || "",
            country: customerData.country || "",
            gst_no: tx.gst_no || customerData.gst_no,
            state: customerData.state || "Tamil Nadu",
            branch_id: tx.branch_id || tx.business_id || tx.location_id,
            gst_type: "exclusive",
            items: (tx.items || []).map(it => {
               const qty = Number(it.quantity) || 1;
               const unitPrice = Number(it.unit_price) || 0;
               const lineTotalIncTax = Number(it.total) || (qty * unitPrice);
               const baseTotal = qty * unitPrice;
               
               let itemTaxPercent = 0;
               if (baseTotal > 0 && lineTotalIncTax > baseTotal + 0.01) {
                 itemTaxPercent = ((lineTotalIncTax - baseTotal) / baseTotal) * 100;
               }

               return {
                 product_name: it.product_name,
                 hsncode: it.hsncode,
                 qty: qty,
                 primary_unit: it.unit || it.primary_unit,
                 rate: unitPrice,
                 tax_percent: Math.round(itemTaxPercent),
               };
            })
          });
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      apiClient.get(`/quotations/${id}`)
        .then(res => setQuotation(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  const [docNumber, setDocNumber] = useState("");

  useEffect(() => {
    if (quotation && !docNumber) {
      setDocNumber(quotation.quotation_no || "");
    }
  }, [quotation]);

  useEffect(() => {
    if (!quotation?.branch_id) return;
    apiClient.get(`/branches/${quotation.branch_id}`)
      .then(res => setBranch(res.data))
      .catch(console.error);
    apiClient.get("/locations", { params: { branch_id: quotation.branch_id, limit: 1 } })
      .then(res => {
        const list = res.data?.data || res.data;
        setLocation(Array.isArray(list) ? list[0] : list);
      })
      .catch(console.error);

    apiClient.get("/branches/peek-number", { params: { type: "delivery_challan", branch_id: quotation.branch_id } })
      .then(res => {
        if (res.data?.next_number) {
          setDocNumber(res.data.next_number);
        }
      })
      .catch(console.error);
  }, [quotation?.branch_id]);

  if (loading) return <div className="text-center p-5">Loading data...</div>;
  if (!quotation) return <div className="text-center p-5 text-danger">Quotation not found</div>;

  // Build Company details
  const companyName = location?.name || branch?.branch_name;
  const companyAddressRaw = [location?.landmark, location?.city, location?.state, location?.zip_code]
    .filter(Boolean).join(", ") || branch?.address || "";
  const companyPhone = location?.mobile || branch?.phone || "";
  const companyGst = location?.gst_no || branch?.gst_no || "";

  // Build Customer Details
  const customerName = quotation?.customer_name || "";
  const customerAddress = [quotation?.address, quotation?.city, quotation?.pincode, quotation?.country].filter(Boolean).join(", ");
  const customerGst = quotation?.gst_no || "";
  const customerState = quotation?.state || "Tamil Nadu";
  const stateCode = "33"; // Or map it dynamically based on state if available

  const isDeliveryChallan = true;

  // We will directly embed the details in the layout below to match the challan format.

  // Map Items
  const items = (quotation.items || []).map((it, i) => {
    const qty = Number(it.qty) || 0;
    const rate = Number(it.rate_2 || it.rate || 0);
    const total = qty * rate;
    const taxPercent = Number(it.tax_percent ?? quotation.tax_percent ?? quotation.gst_percent ?? 0);
    
    // For quotations, we need to check if gst is inclusive or exclusive
    const cgstRate = taxPercent / 2; 
    const sgstRate = cgstRate;
    
    let cgstAmt = 0;
    let sgstAmt = 0;
    let itemTotal = 0;

    // Default to exclusive calculation if not specified
    if (quotation.gst_type === 'inclusive') {
       const gstAmt = total > 0 ? (total * taxPercent) / (100 + taxPercent) : 0;
       cgstAmt = gstAmt / 2;
       sgstAmt = gstAmt / 2;
       itemTotal = total;
    } else {
       cgstAmt = (total * cgstRate) / 100;
       sgstAmt = (total * sgstRate) / 100;
       itemTotal = total + cgstAmt + sgstAmt;
    }

    return {
      sNo: i + 1,
      name: it.product_name || it.product_master_name || "",
      hsn: it.hsncode || "8501",
      qty: qty,
      unit: it.primary_unit || "",
      rate: rate,
      taxable: quotation.gst_type === 'inclusive' ? (total - cgstAmt - sgstAmt) : total,
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

  const terms = quotation.terms_and_conditions 
    ? quotation.terms_and_conditions.split('\n') 
    : ["1. 100% payment should be done before delivery", "2. All disputes are subjected to salem jurisdiction"];

  // Action Handlers
  const syncDocSeq = async () => {
    if (!quotation?.branch_id || !docNumber) return;
    try {
      await apiClient.post("/branches/sync-sequence", {
        branch_id: quotation.branch_id,
        type: "delivery_challan",
        document_no: docNumber
      });
    } catch (err) {
      console.error("Failed to sync sequence:", err);
    }
  };

  const handlePrint = async () => {
    await syncDocSeq();
    window.print();
  };

  const handlePdf = async () => {
    await syncDocSeq();
    const input = document.getElementById("printable-invoice");
    if (!input) return;
    const canvas = await html2canvas(input, { scale: 3, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
    pdf.save(`${type.replace(/\s+/g, '_').toLowerCase()}_${docNumber || id}.pdf`);
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

      <div className="no-print d-flex gap-2 mb-3 justify-content-between align-items-center w-100 max-w-4xl px-3" style={{maxWidth: "800px"}}>
        <Button color="secondary" onClick={() => navigate(-1)}>Back</Button>
        <div className="d-flex align-items-center gap-2">
          <span className="small fw-bold text-nowrap" style={{color: '#334155'}}>Challan No:</span>
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ width: "200px" }}
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
          />
        </div>
        <div className="d-flex gap-2">
          <Button color="primary" onClick={handlePrint}>Print Invoice</Button>
          <Button color="success" onClick={handlePdf}>Download PDF</Button>
        </div>
      </div>

      <div ref={printRef} className="printable-invoice" id="printable-invoice">
        <div style={{ border: "1px solid #000", display: "flex", flexDirection: "column", height: "100%" }}>
          
          <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
            <div style={{ width: "25%", padding: "10px", borderRight: "1px solid #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/logo1.jpeg" alt="Logo" className="img-fluid" style={{ maxHeight: '80px', mixBlendMode: 'multiply' }} />
            </div>
            <div style={{ width: "75%", padding: "10px", textAlign: "center" }}>
              <h3 style={{ margin: "0 0 5px 0", fontSize: "18px", fontWeight: "bold", textTransform: "uppercase" }}>{companyName}</h3>
              <p style={{ margin: "0 0 4px 0", fontSize: "11px", fontWeight: "bold" }}>{companyAddressRaw}</p>
              <p style={{ margin: "0 0 4px 0", fontSize: "12px", fontWeight: "bold" }}>{companyPhone}</p>
              <p style={{ margin: "0", fontSize: "12px", fontWeight: "bold" }}>GSTIN : {companyGst}</p>
            </div>
          </div>
          
          <div style={{ display: "flex", borderBottom: "1px solid #000", background: "#eef2f7" }}>
            <div style={{ width: "80%", textAlign: "center", padding: "8px", fontWeight: "bold", fontSize: "16px", alignSelf: "center" }}>
              {type}
            </div>
            <div style={{ width: "20%", borderLeft: "1px solid #000", fontSize: "10px", background: "#eef2f7" }}>
              <div style={{ borderBottom: "1px solid #000", padding: "2px 4px", display: "flex", alignItems: "center" }}>
                <input type="checkbox" checked readOnly style={{marginRight: "4px"}} /> Original for Recipient
              </div>
              <div style={{ borderBottom: "1px solid #000", padding: "2px 4px", display: "flex", alignItems: "center" }}>
                <input type="checkbox" readOnly style={{marginRight: "4px"}} /> Duplicate for Transporter
              </div>
              <div style={{ padding: "2px 4px", display: "flex", alignItems: "center" }}>
                <input type="checkbox" readOnly style={{marginRight: "4px"}} /> Triplicate for Supplier
              </div>
            </div>
          </div>

          <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
            
            <div style={{ width: "50%", borderRight: "1px solid #000", display: "flex", flexDirection: "column" }}>
              <div style={{ background: "#eef2f7", fontWeight: "bold", padding: "4px", borderBottom: "1px solid #000" }}>
                BUYER (DETAILS FOR RECEIVER)
              </div>
              <div style={{ padding: "4px", borderBottom: "1px solid #000", display: "grid", gridTemplateColumns: "80px 1fr", rowGap: "4px" }}>
                <div>Name</div><div>: {customerName}</div>
                <div>Address</div><div>: {customerAddress}</div>
                <div>Mobile</div><div>: {customerName ? "9003512849" : ""}</div>
                <div>GSTIN</div><div>: {customerGst}</div>
                <div>State</div><div>: {customerState}</div>
                <div>State Code</div><div>: {stateCode}</div>
              </div>

              <div style={{ background: "#eef2f7", fontWeight: "bold", padding: "4px", borderBottom: "1px solid #000" }}>
                CONSIGNEE (DETAILS FOR CONSIGNEE)
              </div>
              <div style={{ padding: "4px", display: "grid", gridTemplateColumns: "80px 1fr", rowGap: "4px", flexGrow: 1 }}>
                <div>Name</div><div>: {customerName}</div>
                <div>Address</div><div>: {customerAddress}</div>
                <div>Mobile</div><div>: {customerName ? "9003512849" : ""}</div>
                <div>GSTIN</div><div>: {customerGst}</div>
                <div>State</div><div>: {customerState}</div>
                <div>State Code</div><div>: {stateCode}</div>
              </div>
            </div>

            <div style={{ width: "50%", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "4px", borderBottom: "1px solid #000", display: "grid", gridTemplateColumns: "130px 1fr", rowGap: "4px" }}>
                <div>Challan No</div><div>: {docNumber}</div>
                <div>Challan Date</div><div>: {formatDate(quotation?.quotation_date)}</div>
                <div style={{ borderBottom: "1px solid #ddd", margin: "4px 0", gridColumn: "1 / -1" }}></div>
                <div>Place Of Supply</div><div>: {customerState}</div>
                <div>State</div>
                <div>: {customerState} <span style={{ marginLeft: "10px" }}>State Code : {stateCode}</span></div>
                <div style={{ borderBottom: "1px solid #ddd", margin: "4px 0", gridColumn: "1 / -1" }}></div>
                <div>Transportation Mode</div><div>: </div>
                <div>Transporter Name</div><div>: </div>
                <div>Vehicle No</div><div>: </div>
              </div>

              <div style={{ padding: "4px", display: "grid", gridTemplateColumns: "130px 1fr", rowGap: "4px", flexGrow: 1 }}>
                <div>Transporter ID</div><div>: </div>
                <div>LR Number</div><div>: </div>
                <div>LR Date</div><div>: </div>
              </div>
            </div>
            
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", borderBottom: "1px solid #000" }}>
            <thead style={{ background: "#eef2f7" }}>
              <tr>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }} rowSpan={2}>Sr.<br/>No.</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }} rowSpan={2}>Name of product</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }} rowSpan={2}>HSN/SAC</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }} rowSpan={2}>QTY</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }} rowSpan={2}>Rate</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px", background: "#eef2f7" }} rowSpan={2}>Taxable<br/>Value</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }} colSpan={2}>CGST</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }} colSpan={2}>SGST</th>
                <th style={{ borderBottom: "1px solid #000", padding: "4px" }} rowSpan={2}>Total</th>
              </tr>
              <tr>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }}>Rate</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }}>Amount</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }}>Rate</th>
                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: "4px" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #000" }}>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>{item.sNo}</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "left" }}>{item.name}</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>{item.hsn}</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>{item.qty} {item.unit}</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>{item.rate.toFixed(2)}</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px", background: "#eef2f7" }}>{item.taxable.toFixed(2)}</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>{item.cgstRate.toFixed(2)}%</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>{item.cgstAmt.toFixed(2)}</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>{item.sgstRate.toFixed(2)}%</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px" }}>{item.sgstAmt.toFixed(2)}</td>
                  <td style={{ padding: "4px", fontWeight: "bold" }}>{item.total.toFixed(2)}</td>
                </tr>
              ))}
              
              <tr style={{ height: "40px" }}>
                <td style={{ borderRight: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000", background: "#eef2f7" }}></td>
                <td style={{ borderRight: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000" }}></td>
                <td style={{ borderRight: "1px solid #000" }}></td>
                <td></td>
              </tr>

              <tr style={{ borderTop: "1px solid #000", background: "#eef2f7", fontWeight: "bold" }}>
                <td colSpan={3} style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}>Total Quantity</td>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}>{totals.qty}</td>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}>₹{totals.taxable.toFixed(2)}</td>
                <td colSpan={2} style={{ borderRight: "1px solid #000", padding: "4px" }}>₹{totals.cgst.toFixed(2)}</td>
                <td colSpan={2} style={{ borderRight: "1px solid #000", padding: "4px" }}>₹{totals.sgst.toFixed(2)}</td>
                <td style={{ padding: "4px" }}>₹{totals.grandTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
            
            <div style={{ width: "60%", borderRight: "1px solid #000", display: "flex", flexDirection: "column" }}>
              <div style={{ borderBottom: "1px solid #000", padding: "8px", textAlign: "center", fontWeight: "bold" }}>
                Total {type} Amount in words<br/>
                <span style={{ fontWeight: "normal" }}>{amountInWords}</span>
              </div>
              <div style={{ padding: "4px", flexGrow: 1 }}>
                <div style={{ fontWeight: "bold", textAlign: "left", marginBottom: "4px" }}>Terms And Conditions</div>
                <div style={{ fontSize: "11px", marginBottom: "4px" }}>Remark</div>
                <div style={{ fontSize: "11px", color: "#666" }}>Remarks</div>
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
              <div style={{ height: "50px" }}></div>
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
