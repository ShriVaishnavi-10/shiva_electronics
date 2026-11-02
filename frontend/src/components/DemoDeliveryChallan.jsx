import React, { useMemo, useRef } from "react";
import { Button, Table } from "reactstrap";
import html2pdf from "html2pdf.js";

export default function DemoDeliveryChallan({ companyInfo, challanData }) {
  const printRef = useRef(null);

  const totals = useMemo(() => {
    return {
      taxable: Number(challanData?.subtotal || 0).toFixed(2),
      cgst: Number(challanData?.cgst_amount || 0).toFixed(2),
      sgst: Number(challanData?.sgst_amount || 0).toFixed(2),
      grand: Number(challanData?.grand_total || 0).toFixed(2)
    };
  }, [challanData]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.outerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Delivery Challan</title>
          <style>
            body { margin: 0; padding: 16px; font-family: Arial, sans-serif; background: #f2f5ff; }
            .dc-paper {
              width: 6.5in;
              min-height: 9.5in;
              margin: 0 auto;
              border: 1px solid #d6def7;
              border-radius: 10px;
              overflow: hidden;
              background: #fff;
              box-shadow: 0 8px 20px rgba(44, 62, 118, 0.15);
            }
            .dc-head {
              background: linear-gradient(135deg, #3953c6, #5e80ff);
              color: #fff;
              padding: 12px 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .dc-body { padding: 12px 16px; color: #1b2540; font-size: 12px; }
            .dc-card { background: #f8faff; border: 1px solid #e5ebff; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px; }
            .dc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
            th, td { border: 1px solid #dfe6ff; padding: 6px; text-align: center; }
            th { background: #eaf0ff; color: #24346b; }
            td:nth-child(2), th:nth-child(2) { text-align: left; }
            .dc-total { text-align: right; }
            .dc-footer { display: flex; justify-content: space-between; margin-top: 10px; }
            @page { size: 6.5in 9.5in; margin: 6mm; }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handlePdf = () => {
    if (!printRef.current) return;
    const options = {
      margin: [0.2, 0.2, 0.2, 0.2],
      filename: `delivery-challan-${challanData?.quotation_no || challanData?.id || "demo"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: [6.5, 9.5], orientation: "portrait" }
    };
    html2pdf().set(options).from(printRef.current).save();
  };

  const handleWhatsApp = () => {
    const text = [
      `Delivery Challan`,
      `Quotation No: ${challanData?.quotation_no || "-"}`,
      `Customer: ${challanData?.customer_name || "-"}`,
      `Contact: ${challanData?.contact_no || "-"}`,
      `Grand Total: Rs ${totals.grand}`
    ].join("\n");
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div>
      <div className="d-flex gap-2 mb-2">
        <Button color="primary" size="sm" onClick={handlePrint}>Print</Button>
        <Button color="success" size="sm" onClick={handlePdf}>Download PDF</Button>
        <Button color="success" outline size="sm" onClick={handleWhatsApp}>Share WhatsApp</Button>
      </div>

      <div ref={printRef} className="dc-paper">
        <div className="dc-head">
          <div>
            <div className="fw-bold fs-6">{companyInfo?.company_name || "Company"}</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>{companyInfo?.branch || ""}</div>
          </div>
          <div className="text-end">
            <div className="fw-bold">DELIVERY CHALLAN</div>
            <div style={{ fontSize: 11 }}>DC from Quotation</div>
          </div>
        </div>

        <div className="dc-body">
          <div className="dc-grid">
            <div className="dc-card">
              <div><strong>Quotation No:</strong> {challanData?.quotation_no || "-"}</div>
              <div><strong>Date:</strong> {challanData?.quotation_date ? String(challanData.quotation_date).slice(0, 10) : "-"}</div>
            </div>
            <div className="dc-card">
              <div><strong>Customer:</strong> {challanData?.customer_name || "-"}</div>
              <div><strong>Contact:</strong> {challanData?.contact_no || "-"}</div>
            </div>
          </div>

          <div className="dc-card">
            <div><strong>Company Address:</strong> {companyInfo?.address || "-"}</div>
            <div>
              {(companyInfo?.city || "")}
              {companyInfo?.state ? `, ${companyInfo.state}` : ""}
              {companyInfo?.country ? `, ${companyInfo.country}` : ""}
            </div>
          </div>

          <Table bordered size="sm" className="mb-2">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Product</th>
                <th>Thickness</th>
                <th>Sqft</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {(challanData?.items || []).map((it, i) => (
                <tr key={it.id || i}>
                  <td>{i + 1}</td>
                  <td>{it.product_name || "-"}</td>
                  <td>{it.thickness || "-"}</td>
                  <td>{Number(it.sqft || 0).toFixed(2)}</td>
                  <td>{Number(it.qty || 0).toFixed(2)}</td>
                  <td>Rs {Number(it.rate || 0).toFixed(2)}</td>
                  <td>Rs {Number(it.total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="dc-total">
            <div>Taxable Amount: <strong>Rs {totals.taxable}</strong></div>
            <div>CGST: <strong>Rs {totals.cgst}</strong></div>
            <div>SGST: <strong>Rs {totals.sgst}</strong></div>
            <div className="fw-bold">Grand Total: Rs {totals.grand}</div>
          </div>

          <div className="dc-footer">
            <div style={{ maxWidth: "58%" }}>
              <strong>Terms & Conditions:</strong>
              <div>{challanData?.terms_and_conditions || "-"}</div>
            </div>
            <div className="text-end">
              <div style={{ marginTop: 20 }}>Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
