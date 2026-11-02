import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Table } from "reactstrap";
import { FaPrint, FaDownload, FaArrowLeft } from "react-icons/fa";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import apiClient from "../utils/api";
import { SERVER_ORIGIN } from "../config/urls";
import fallbackLogo from "../assets/index/logo.png";

const fmt = (num) => {
  const n = Number(num);
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  if (isNaN(num) || num === null) return "Zero ";
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  let n_str = Math.round(num).toString();
  if (n_str.length > 9) return 'Amount too large';
  let n = ('000000000' + n_str).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return ''; 
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees Only' : (str === '' ? 'Zero Rupees Only' : 'Rupees Only');
  return str;
}

const API_BASE = apiClient?.defaults?.baseURL?.replace(/\/api\/?$/, "") || SERVER_ORIGIN;

function resolveLogoUrl(logoPath) {
  if (!logoPath) return null;
  const s = String(logoPath).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `${API_BASE}${s}`;
  return `${API_BASE}/${s.replace(/^\.?\//, "")}`;
}

function buildLogoCandidates(location, branch) {
  const paths = [
    location?.images,
    location?.logo,
    branch?.logo,
    branch?.branch_logo,
  ].filter((p) => p != null && String(p).trim() !== "");

  const urls = [];
  for (const p of paths) {
    const u = resolveLogoUrl(p);
    if (u && !urls.includes(u)) urls.push(u);
  }
  return urls;
}

export default function QuotationReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();

  const [quotation, setQuotation] = useState(null);
  const [branch, setBranch] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoCandidateIdx, setLogoCandidateIdx] = useState(0);

  /* ── 1. Fetch quotation by ID ── */
  useEffect(() => {
    if (!id) { setQuotation(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);

    apiClient
      .get(`/quotations/${id}`)
      .then((res) => {
        if (!cancelled) setQuotation(res.data || null);
      })
      .catch(() => {
        if (!cancelled) setQuotation(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const branchId = quotation?.branch_id;
    if (!branchId) { setBranch(null); return; }
    let cancelled = false;

    apiClient
      .get(`/branches/${branchId}`)
      .then((res) => {
        if (!cancelled) setBranch(res.data || null);
      })
      .catch(() => {
        if (!cancelled) setBranch(null);
      });

    return () => { cancelled = true; };
  }, [quotation?.branch_id]);


  useEffect(() => {
    const branchId = quotation?.branch_id;
    if (!branchId) { setLocation(null); return; }
    let cancelled = false;

    apiClient
      .get("/locations", { params: { branch_id: branchId, limit: 1 } })
      .then((res) => {
        const list = res.data?.data || res.data;
        const loc = Array.isArray(list) ? list[0] : list;
        if (!cancelled) setLocation(loc || null);
      })
      .catch(() => {
        if (!cancelled) setLocation(null);
      });

    return () => { cancelled = true; };
  }, [quotation?.branch_id]);


  const companyName =
    location?.name || branch?.branch_name;

  const companyAddressRaw = [
    location?.landmark,
    location?.city,
    location?.state,
    location?.zip_code,
  ].filter(Boolean).join(", ") || branch?.address || "588, New. 3/204-B, Puthur Itteri Road,, Nethimedu, Salem, Tamil Nadu, 636002";
  const companyAddress = companyAddressRaw
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/\bTamil Nadu\b/gi, "Tamil\u00a0Nadu")
    .trim();

  const companyPhone = location?.mobile || branch?.phone || "8825935314, 7418070307";
  const companyAlternateNo = location?.alternate_number || "";
  const companyGst = location?.gst_no || branch?.gst_no || "33ADOPR7372R1ZH";


  const accountHolder = location?.account_holder || companyName;
  const bankName = location?.bank_name || "STATE BANK OF INDIA";
  const accountNumber = location?.account_number || "33069564306";
  const bankBranch = location?.branch || "NETHIMEDU";
  const ifsc = location?.ifsc_code || "SBIN0012781";

  const logoCandidates = useMemo(
    () => buildLogoCandidates(location, branch),
    [location, branch],
  );

  useEffect(() => {
    setLogoCandidateIdx(0);
  }, [logoCandidates.join("|")]);

  const logoSrc = logoCandidates[logoCandidateIdx] ?? fallbackLogo;

  const items = quotation?.items || [];
  const transportCharges = Number(quotation?.transport_charges) || 0;
  const gstPercent = Number(quotation?.gst_percent) || 0;
  const isInclusive = quotation?.gst_type === "inclusive";

  let totalTaxableAmount = 0;
  let totalCgstAmount = 0;
  let totalSgstAmount = 0;

  const processedItems = items.map((item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate_2) || Number(item.price) || 0;
    const baseAmount = qty * rate;

    let taxableValue = baseAmount;
    let cgstRate = gstPercent / 2;
    let sgstRate = gstPercent / 2;
    let cgstAmount = 0;
    let sgstAmount = 0;

    if (gstPercent > 0) {
      if (isInclusive) {
        taxableValue = baseAmount / (1 + gstPercent / 100);
        cgstAmount = (taxableValue * cgstRate) / 100;
        sgstAmount = (taxableValue * sgstRate) / 100;
      } else {
        taxableValue = baseAmount;
        cgstAmount = (taxableValue * cgstRate) / 100;
        sgstAmount = (taxableValue * sgstRate) / 100;
      }
    }

    const rowTotal = taxableValue + cgstAmount + sgstAmount;

    totalTaxableAmount += taxableValue;
    totalCgstAmount += cgstAmount;
    totalSgstAmount += sgstAmount;

    return {
      ...item,
      qty,
      rate,
      taxableValue,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      rowTotal,
    };
  });

  const totalGstAmount = totalCgstAmount + totalSgstAmount;
  const grandTotal = totalTaxableAmount + totalGstAmount + transportCharges;
  const roundedGrandTotal = Math.round(grandTotal);


  const customerName = quotation?.customer_name || "";
  const customerPhone = quotation?.contact_no || "";
  const customerAlternate = quotation?.alternate_no || "";
  const customerAddress = [
    quotation?.address,
    quotation?.city,
    quotation?.pincode,
    quotation?.country,
  ].filter(Boolean).join(", ");
  const customerGst = quotation?.gst_no || "";


  const handlePrint = () => { window.print(); };

  const handleDownload = async () => {
    const input = document.getElementById("printable-invoice");
    if (!input) return;
    const canvas = await html2canvas(input, { scale: 3, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
    const fileId = quotation?.quotation_no || id || "quotation";
    pdf.save(`Quotation_${fileId}.pdf`);
  };


  if (loading) return <div className="text-center p-5 mt-5"><h4>Loading Quotation...</h4></div>;
  if (!quotation) return <div className="text-center p-5 mt-5"><h4>Quotation Not Found</h4><Button color="primary" onClick={() => navigate(-1)}>Go Back</Button></div>;

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
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; background-color: white !important; }
            .app-header, .sidebar, .desktop-sidebar, .footer, .no-print {
              display: none !important;
            }
            .printable-invoice {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 auto !important;
              padding: 10mm !important;
              background-color: white !important;
              box-sizing: border-box !important;
              font-family: 'Calibri', 'Arial', sans-serif !important;
              border: none !important;
              position: static !important;
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
          /* Flex Utilities */
          .d-flex { display: flex !important; }
          .flex-column { flex-direction: column !important; }
          .align-items-center { align-items: center !important; }
          .justify-content-between { justify-content: space-between !important; }
          .justify-content-center { justify-content: center !important; }
          .flex-grow-1 { flex-grow: 1 !important; }
          .w-50 { width: 50% !important; }
          .w-100 { width: 100% !important; }
          
          .border-black { border: 1px solid black !important; }
          .border-bottom-black { border-bottom: 1px solid black !important; }
          .border-end-black { border-right: 1px solid black !important; }
          .bg-header-blue { background-color: #dbeafe !important; }
          .table-invoice { width: 100%; border-collapse: collapse; }
          .table-invoice th, .table-invoice td { border: 1px solid black; padding: 4px; text-align: center; }
          .table-invoice th { background-color: #dbeafe; font-weight: bold; font-size: 10px; }
          .label-fixed { display: inline-block; width: 115px; font-weight: bold; }
          .label-sm { width: 60px; }
          .text-xxs { font-size: 9px; }
          .flex-1 { flex: 1; }
          .flex-1-2 { flex: 1.2; }
          .flex-1-5 { flex: 1.5; }
          .img-fluid { max-width: 100%; height: auto; }
        `}
      </style>

      <div className="no-print container mb-4 d-flex justify-content-between align-items-center" style={{ maxWidth: '210mm' }}>
        <Button color="secondary" outline onClick={() => navigate(-1)}>
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

      <div id="printable-invoice" className="printable-invoice p-4" ref={printRef}>
        <div className="border-black d-flex flex-column h-100">
          
          <div className="d-flex border-bottom-black p-2 align-items-center justify-content-between">
            <div style={{ width: '150px' }}>
              <img 
                src="/logo1.jpeg" 
                alt="Logo" 
                className="img-fluid" 
                style={{ maxHeight: '80px', mixBlendMode: 'multiply' }} 
                onError={(e) => {
                  if (logoSrc && e.target.src !== logoSrc) {
                    e.target.src = logoSrc;
                  } else {
                    e.target.style.display = 'none';
                  }
                }}
              />
            </div>
            <div className="text-end pe-3">
              <h1 className="fw-bold m-0" style={{ fontSize: '32px', color: '#1e293b' }}>Quotation</h1>
            </div>
          </div>

          <div className="d-flex border-bottom-black" style={{ fontSize: '11px' }}>
            <div className="flex-1-5 border-end border-dark p-2 d-flex flex-column">
              <h4 className="fw-bold mb-1" style={{ fontSize: '13px' }}>{companyName}</h4>
              <p className="mb-1" style={{ fontSize: '11px', whiteSpace: 'pre-wrap' }}>{companyAddress}</p>
              <p className="mb-1">Mobile: <strong>{companyPhone}</strong> {companyAlternateNo ? `, ${companyAlternateNo}` : ""}</p>
              <p className="mb-1">Email: {location?.email || branch?.email || "shree13ram@gmail.com"}</p>
              <p className="mb-0">GSTIN: <strong>{companyGst}</strong></p>
            </div>
            
            <div className="flex-1 p-2 d-flex flex-column">
              <div className="d-flex mb-2">
                <span className="label-fixed">Quotation No</span>
                <span className="fw-bold">: {quotation.quotation_no || ''}</span>
              </div>
              <div className="d-flex mb-2">
                <span className="label-fixed">Date</span>
                <span>: {formatDate(quotation.quotation_date)}</span>
              </div>
              {quotation.valid_till_date && (
                <div className="d-flex mb-2">
                  <span className="label-fixed">Quotation Validity</span>
                  <span>: {formatDate(quotation.valid_till_date)}</span>
                </div>
              )}
              {quotation.reference && (
                <div className="d-flex">
                  <span className="label-fixed">Reference</span>
                  <span>: {quotation.reference}</span>
                </div>
              )}
            </div>
          </div>

          <div className="d-flex border-bottom-black" style={{ fontSize: '10px' }}>
            <div className="w-50 border-end border-dark d-flex flex-column">
              <div className="bg-header-blue text-center py-1 fw-bold border-bottom-black">Quotation For:</div>
              <div className="p-2 d-flex flex-column" style={{ minHeight: '90px' }}>
                <div className="d-flex mb-1"><span className="label-sm fw-bold">Name</span><span>: {customerName.toUpperCase()}</span></div>
                <div className="d-flex mb-1"><span className="label-sm fw-bold">Address</span><div className="d-flex align-items-start"><span>:</span><span className="ms-1" style={{ whiteSpace: 'pre-wrap' }}>{customerAddress}</span></div></div>
                <div className="d-flex mb-1"><span className="label-sm fw-bold">GSTIN</span><span>: {customerGst || ''}</span></div>
                <div className="d-flex"><span className="label-sm fw-bold">Mobile</span><span>: {customerPhone}{customerAlternate ? `, ${customerAlternate}` : ''}</span></div>
              </div>
            </div>
            <div className="w-50 d-flex flex-column">
              <div className="bg-header-blue text-center py-1 fw-bold border-bottom-black">Ship To:</div>
              <div className="p-2 d-flex flex-column" style={{ minHeight: '90px' }}>
                <div className="d-flex mb-1"><span className="label-sm fw-bold">Name</span><span>: {customerName.toUpperCase()}</span></div>
                <div className="d-flex mb-1"><span className="label-sm fw-bold">Address</span><div className="d-flex align-items-start"><span>:</span><span className="ms-1" style={{ whiteSpace: 'pre-wrap' }}>{customerAddress}</span></div></div>
                <div className="d-flex mb-1"><span className="label-sm fw-bold">GSTIN</span><span>: {customerGst || ''}</span></div>
                <div className="d-flex"><span className="label-sm fw-bold">Mobile</span><span>: {customerPhone}{customerAlternate ? `, ${customerAlternate}` : ''}</span></div>
              </div>
            </div>
          </div>

          <div className="flex-grow-1">
            <table className="table-invoice">
              <thead>
                <tr>
                  <th rowSpan="2" style={{ width: '30px' }}>Sr. No.</th>
                  <th rowSpan="2" style={{ minWidth: '180px' }}>Name of product</th>
                  <th rowSpan="2" style={{ width: '65px' }}>HSN/SAC</th>
                  <th rowSpan="2" style={{ width: '45px' }}>QTY</th>
                  <th rowSpan="2" style={{ width: '45px' }}>Unit</th>
                  <th rowSpan="2" style={{ width: '75px' }}>Rate</th>
                  <th rowSpan="2" style={{ width: '90px' }}>Taxable Value</th>
                  <th colSpan="2">CGST</th>
                  <th colSpan="2">SGST</th>
                  <th rowSpan="2" style={{ width: '90px' }}>Total</th>
                </tr>
                <tr>
                  <th style={{ width: '45px' }}>Rate</th>
                  <th style={{ width: '60px' }}>Amount</th>
                  <th style={{ width: '45px' }}>Rate</th>
                  <th style={{ width: '60px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {processedItems.map((p, idx) => (
                  <tr key={idx} style={{ height: '24px' }}>
                    <td>{idx + 1}</td>
                    <td className="text-start px-2 fw-bold" style={{ fontSize: '10px' }}>
                      {p.product_name || p.product_master_name || ''}
                    </td>
                    <td>{p.hsncode || ''}</td>
                    <td>{p.qty.toFixed(2)}</td>
                    <td>{p.primary_unit || p.secondary_unit || 'Nos'}</td>
                    <td>{fmt(p.rate)}</td>
                    <td className="fw-bold">{fmt(p.taxableValue)}</td>
                    <td>{p.cgstRate > 0 ? `${p.cgstRate.toFixed(2)}%` : '-'}</td>
                    <td>{p.cgstAmount > 0 ? fmt(p.cgstAmount) : '-'}</td>
                    <td>{p.sgstRate > 0 ? `${p.sgstRate.toFixed(2)}%` : '-'}</td>
                    <td>{p.sgstAmount > 0 ? fmt(p.sgstAmount) : '-'}</td>
                    <td className="fw-bold">{fmt(p.rowTotal)}</td>
                  </tr>
                ))}
                {[...Array(Math.max(0, 10 - processedItems.length))].map((_, i) => (
                  <tr key={`empty-${i}`} style={{ height: '24px' }}>
                    <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-bold" style={{ backgroundColor: '#f8fafc', height: '25px' }}>
                  <td colSpan={3} className="text-end px-3">Total Quantity</td>
                  <td>{processedItems.reduce((sum, p) => sum + p.qty, 0).toFixed(2)}</td>
                  <td colSpan={2}></td>
                  <td>₹{fmt(totalTaxableAmount)}</td>
                  <td></td>
                  <td>₹{fmt(totalCgstAmount)}</td>
                  <td></td>
                  <td>₹{fmt(totalSgstAmount)}</td>
                  <td>₹{fmt(totalTaxableAmount + totalGstAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="d-flex border-top border-dark bg-white">
            <div className="flex-1-5 border-end border-dark d-flex flex-column p-2" style={{ fontSize: '10px' }}>
              <div className="fw-bold text-decoration-underline mb-1">Amount In Words</div>
              <div className="fw-bold mb-3">
                {numberToWords(roundedGrandTotal)}
              </div>
              <div className="fw-bold text-decoration-underline mb-1">Terms & Conditions :</div>
              {quotation.terms_and_conditions ? (
                <div style={{ whiteSpace: "pre-line" }}>{quotation.terms_and_conditions}</div>
              ) : (
                <>
                  <div>1. 100% payment should be done after our Proforma invoice submission before delivery</div>
                  <div>2. All disputes are subjected to salem jurisdiction</div>
                </>
              )}
              {quotation.notes && (
                <div className="mt-2">
                  <div className="fw-bold text-decoration-underline mb-1">Notes :</div>
                  <div style={{ whiteSpace: "pre-line" }}>{quotation.notes}</div>
                </div>
              )}
            </div>
            
            <div className="flex-1 d-flex flex-column" style={{ fontSize: '10px' }}>
              <div className="d-flex border-bottom border-dark">
                <div className="flex-grow-1 p-1 text-end">Taxable Amount</div>
                <div className="border-start border-dark p-1 text-end fw-bold" style={{ width: '120px' }}>: ₹{fmt(totalTaxableAmount)}</div>
              </div>
              <div className="d-flex border-bottom border-dark">
                <div className="flex-grow-1 p-1 text-end">Add : CGST</div>
                <div className="border-start border-dark p-1 text-end" style={{ width: '120px' }}>: ₹{fmt(totalCgstAmount)}</div>
              </div>
              <div className="d-flex border-bottom border-dark">
                <div className="flex-grow-1 p-1 text-end">Add : SGST</div>
                <div className="border-start border-dark p-1 text-end" style={{ width: '120px' }}>: ₹{fmt(totalSgstAmount)}</div>
              </div>
              <div className="d-flex border-bottom border-dark bg-light">
                <div className="flex-grow-1 p-1 text-end fw-bold">Tax Amount : GST</div>
                <div className="border-start border-dark p-1 text-end fw-bold" style={{ width: '120px' }}>: ₹{fmt(totalGstAmount)}</div>
              </div>
              <div className="d-flex bg-header-blue">
                <div className="flex-grow-1 p-1 text-end fw-bold fs-6">Total Amount</div>
                <div className="border-start border-dark p-1 text-end fw-bold fs-6" style={{ width: '120px' }}>: ₹{fmt(roundedGrandTotal)}</div>
              </div>
            </div>
          </div>

          <div className="text-center fw-bold py-1 border-top border-bottom border-dark bg-light" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>BANK DETAILS</div>
          <table className="table-invoice border-bottom-black" style={{ fontSize: '10px', width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#fffbeb' }}>
                <th style={{ width: '35%', fontSize: '10px', borderTop: 'none', borderLeft: 'none' }}>Account Holder Name</th>
                <th style={{ width: '20%', fontSize: '10px', borderTop: 'none' }}>Account No</th>
                <th style={{ width: '15%', fontSize: '10px', borderTop: 'none' }}>IFSC code</th>
                <th style={{ width: '15%', fontSize: '10px', borderTop: 'none' }}>Bank Name</th>
                <th style={{ width: '15%', fontSize: '10px', borderTop: 'none', borderRight: 'none' }}>Bank Branch Name</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ height: '24px' }}>
                <td className="fw-bold" style={{ borderLeft: 'none' }}>{accountHolder}</td>
                <td>{accountNumber}</td>
                <td>{ifsc}</td>
                <td>{bankName}</td>
                <td style={{ borderRight: 'none' }}>{bankBranch}</td>
              </tr>
            </tbody>
          </table>

          <div className="d-flex justify-content-end p-2 bg-white" style={{ minHeight: '100px' }}>
            <div style={{ textAlign: "center", minWidth: '280px' }} className="border border-dark p-2">
              <div className="fw-bold" style={{ fontSize: '10px' }}>For, {companyName}</div>
              <div style={{ height: "55px" }} className="d-flex align-items-center justify-content-center">
              </div>
              <div className="fw-bold border-top border-dark pt-1" style={{ fontSize: '10px' }}>Authorized Signature</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
