import React, { useEffect, useState } from "react";
import {
  Container,
  Card,
  CardBody,
  Button,
  Table,
  Input,
  Badge,
  Row,
  Col,
  ButtonGroup,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter
} from "reactstrap";
import { 
  FaTrash, FaSearch, FaPlus, FaFileCsv, 
  FaFilePdf, FaEdit, FaWallet, FaReceipt, FaMoneyCheckAlt,
  FaPrint, FaPaperclip, FaExternalLinkAlt, FaTimes, FaCheckCircle
} from "react-icons/fa";
import { toast } from "react-toastify";
import { getExpenses, deleteExpense } from "../../api/expenseApi";
import { useNavigate, useLocation } from "react-router-dom";
import { serverAssetUrl } from "../../config/urls";
import apiClient from "../../utils/api";
import html2pdf from "html2pdf.js";

function numberToWords(num) {
  const n = Math.round(Number(num));
  if (!Number.isFinite(n) || n === 0) return "Zero";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];
  const convert = (val) => {
    if (val < 20) return ones[val];
    if (val < 100) return `${tens[Math.floor(val / 10)]} ${ones[val % 10]}`.trim();
    if (val < 1000) return `${ones[Math.floor(val / 100)]} Hundred ${convert(val % 100)}`.trim();
    if (val < 100000) return `${convert(Math.floor(val / 1000))} Thousand ${convert(val % 1000)}`.trim();
    if (val < 10000000) return `${convert(Math.floor(val / 100000))} Lakh ${convert(val % 100000)}`.trim();
    return `${convert(Math.floor(val / 10000000))} Crore ${convert(val % 10000000)}`.trim();
  };
  return convert(n);
}

export default function ExpenseList() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isNonUser = storedUser.role_name?.toLowerCase().includes("non user") || storedUser.role_id === 6;

  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const urlGst = queryParams.get("is_gst");
  const initialGstTab = isNonUser ? "0" : (urlGst === "0" ? "0" : "1");

  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState(25);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [gstTab, setGstTab] = useState(initialGstTab);
  const [loading, setLoading] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptImageBase64, setReceiptImageBase64] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    apiClient.get("/locations")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setLocations(list);
      })
      .catch((err) => {
        console.error("Failed to load locations in ExpenseList:", err);
      });
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const q = p.get("is_gst");
    if (!isNonUser && q !== null && (q === "0" || q === "1") && q !== gstTab) {
      setGstTab(q);
    }
  }, [location.search, isNonUser]);

  useEffect(() => {
    if (selectedExpense?.document_path && /\.(jpg|jpeg|png|webp|gif)$/i.test(selectedExpense.document_path)) {
      const imgUrl = serverAssetUrl(selectedExpense.document_path);
      fetch(imgUrl)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setReceiptImageBase64(reader.result);
          };
          reader.readAsDataURL(blob);
        })
        .catch(err => {
          console.error("Failed to load receipt image as base64:", err);
          setReceiptImageBase64(null);
        });
    } else {
      setReceiptImageBase64(null);
    }
  }, [selectedExpense]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const activeGst = isNonUser ? 0 : (gstTab === "0" ? 0 : 1);
      const res = await getExpenses({ is_gst: activeGst });
      setExpenses(res.data || []);
    } catch (err) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [gstTab, isNonUser]);

  const handleTabChange = (tabVal) => {
    setGstTab(tabVal);
    navigate(`?is_gst=${tabVal}`, { replace: true });
  };

  const formatExpenseDate = (date) => {
    if (!date) return "-";
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return "-";
    return parsedDate.toLocaleDateString("en-GB");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;
    try {
      await deleteExpense(id);
      toast.success("Expense deleted successfully");
      loadExpenses();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const handleOpenReceipt = (expense) => {
    setSelectedExpense(expense);
    setReceiptModalOpen(true);
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = (e.category_name || "").toLowerCase().includes(search.toLowerCase()) || 
      (e.reference_no && e.reference_no.toLowerCase().includes(search.toLowerCase())) ||
      formatExpenseDate(e.expense_date).includes(search) ||
      (e.notes && e.notes.toLowerCase().includes(search.toLowerCase())) ||
      String(e.amount).includes(search);
      
    let matchesDate = true;
    if (startDate || endDate) {
      const expDate = new Date(e.expense_date);
      if (startDate && expDate < new Date(startDate)) matchesDate = false;
      if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        if (expDate > endD) matchesDate = false;
      }
    }
    return matchesSearch && matchesDate;
  });

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const exportToCSV = () => {
    const isCurrentGst = !isNonUser && gstTab === "1";
    const headers = ["Date", "Reference No", "Type", "Category", "Amount", "Payment Mode", "Paid From", "Notes"];
    const rows = filteredExpenses.map(e => [
      formatExpenseDate(e.expense_date),
      e.reference_no || "",
      Number(e.is_gst) === 1 ? "GST" : "Non-GST",
      e.category_name || "",
      e.amount,
      e.payment_mode || "Cash",
      e.payment_account_name ? `${e.payment_account_name} (${e.payment_bank_name || 'Bank'})` : "-",
      e.notes || ""
    ]);

    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${isNonUser || !isCurrentGst ? "non_gst_expenses" : "gst_expenses"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const isCurrentGst = !isNonUser && gstTab === "1";
    const element = document.getElementById('expense-table-container');
    const opt = {
      margin: 0.5,
      filename: `${isNonUser || !isCurrentGst ? "non_gst_expenses" : "gst_expenses"}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handlePrintVoucher = () => {
    const printContent = document.getElementById("printable-expense-voucher");
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${companyName} - Expense Voucher ${selectedExpense?.reference_no || ""}</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; background: #fff; color: #0f172a; }
            .voucher-box { border: 2px solid #334155; padding: 24px; border-radius: 8px; max-width: 760px; margin: 0 auto; }
            img { max-width: 100%; height: auto; object-fit: contain; }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
              .voucher-box { border: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="voucher-box">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadVoucherPdf = async () => {
    const element = document.getElementById("printable-expense-voucher");
    if (!element) return;
    setIsGeneratingPdf(true);
    try {
      const opt = {
        margin: [0.3, 0.3, 0.3, 0.3],
        filename: `Voucher_${selectedExpense?.reference_no || 'Expense'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          allowTaint: true,
          logging: false 
        },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(element).save();
      toast.success("PDF downloaded successfully");
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const matchedLocation = (selectedExpense && locations.length > 0)
    ? (locations.find((l) => 
        String(l.id) === String(selectedExpense.branch_id) || 
        String(l.branch_id) === String(selectedExpense.branch_id)
      ) || locations[0])
    : (locations[0] || {});

  const companyName = 
    selectedExpense?.company_name || 
    matchedLocation?.name || 
    selectedExpense?.location_name || 
    "SHIVA ELECTRONICS";

  const companyAddress = 
    selectedExpense?.company_address || 
    matchedLocation?.landmark || 
    matchedLocation?.address || 
    "";

  const companyCity = 
    selectedExpense?.company_city || 
    matchedLocation?.city || 
    "";

  const companyState = 
    selectedExpense?.company_state || 
    matchedLocation?.state || 
    "";

  const companyZip = 
    selectedExpense?.company_zip || 
    matchedLocation?.zip_code || 
    matchedLocation?.pincode || 
    "";

  const companyPhone = 
    selectedExpense?.company_phone || 
    matchedLocation?.mobile || 
    matchedLocation?.phone || 
    "";

  const companyAltPhone = 
    selectedExpense?.company_alternate_phone || 
    matchedLocation?.alternate_number || 
    "";

  const companyEmail = 
    selectedExpense?.company_email || 
    matchedLocation?.email || 
    "";

  const companyGst = 
    selectedExpense?.company_gst_no || 
    matchedLocation?.gst_no || 
    "";

  const addressParts = [
    companyAddress,
    companyCity,
    companyState ? `${companyState}${companyZip ? ` - ${companyZip}` : ""}` : companyZip
  ].filter((v) => v && String(v).trim());
  const formattedCompanyAddress = addressParts.join(", ");

  return (
    <Container fluid className="p-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h3 className="fw-bold text-dark mb-0">
              {isNonUser || gstTab === "0" ? "Non-GST Expense List" : "GST Expense List"}
            </h3>
            {isNonUser ? (
              <Badge color="info" className="rounded-pill px-3 py-1">
                Non-GST
              </Badge>
            ) : (
              <Badge color={gstTab === "1" ? "success" : "info"} className="rounded-pill px-3 py-1">
                {gstTab === "1" ? "GST Panel" : "Non-GST"}
              </Badge>
            )}
          </div>
          <p className="text-muted small mb-0 mt-1">
            {isNonUser || gstTab === "0" 
              ? "Manage and track non-GST operational and business expenses" 
              : "Manage and track GST operational and business expenses"}
          </p>
        </div>
        <Button 
          color={isNonUser || gstTab === "0" ? "info" : "primary"} 
          className="rounded-pill px-4 shadow-sm d-flex align-items-center gap-2 fw-bold text-white"
          onClick={() => navigate(`/index/expenses/add${!isNonUser && gstTab === "0" ? "?is_gst=0" : "?is_gst=1"}`)}
        >
          <FaPlus size={12} /> {isNonUser || gstTab === "0" ? "Add Non-GST Expense" : "Add GST Expense"}
        </Button>
      </div>

      {/* Summary Cards */}
      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card className="border-0 shadow-sm rounded-4 h-100 bg-white">
            <CardBody className="p-3 d-flex align-items-center gap-3">
              <div 
                className="rounded-circle p-3 d-flex align-items-center justify-content-center" 
                style={{ backgroundColor: isNonUser || gstTab === "0" ? "#F1F5F9" : "#EFF6FF", width: 52, height: 52 }}
              >
                <FaWallet className={isNonUser || gstTab === "0" ? "text-secondary" : "text-primary"} size={22} />
              </div>
              <div>
                <div className="text-muted small fw-semibold text-uppercase">
                  {isNonUser || gstTab === "0" ? "Total Non-GST Expenses" : "Total GST Expenses"}
                </div>
                <div className={`fs-5 fw-bold ${isNonUser || gstTab === "0" ? "text-dark" : "text-primary"}`}>
                  ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="border-0 shadow-sm rounded-4 h-100 bg-white">
            <CardBody className="p-3 d-flex align-items-center gap-3">
              <div className="rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "#F8FAFC", width: 52, height: 52 }}>
                <FaReceipt className="text-secondary" size={22} />
              </div>
              <div>
                <div className="text-muted small fw-semibold text-uppercase">
                  {isNonUser || gstTab === "0" ? "Non-GST Records Count" : "GST Records Count"}
                </div>
                <div className="fs-5 fw-bold text-dark">
                  {filteredExpenses.length} Records
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card className="border shadow-sm rounded-4 overflow-hidden bg-white">
        <CardBody className="p-4">
          {/* Admin GST/Non-GST Tabs */}
          {!isNonUser && (
            <div className="mb-4 pb-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
              <ButtonGroup className="rounded-pill p-1 bg-light border">
                <Button 
                  color={gstTab === "1" ? "success" : "link"} 
                  className={`rounded-pill px-4 fw-semibold text-decoration-none ${gstTab === "1" ? "shadow-sm text-white" : "text-muted"}`}
                  size="sm"
                  onClick={() => handleTabChange("1")}
                >
                  GST Expenses
                </Button>
                <Button 
                  color={gstTab === "0" ? "secondary" : "link"} 
                  className={`rounded-pill px-4 fw-semibold text-decoration-none ${gstTab === "0" ? "shadow-sm text-white" : "text-muted"}`}
                  size="sm"
                  onClick={() => handleTabChange("0")}
                >
                  Non-GST Expenses
                </Button>
              </ButtonGroup>

              <span className="small text-muted fw-semibold">
                Showing {filteredExpenses.length} {gstTab === "1" ? "GST" : "Non-GST"} entries
              </span>
            </div>
          )}

          {/* Controls Bar */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Input 
                type="select" 
                bsSize="sm" 
                className="w-auto border rounded-2 shadow-none fw-bold"
                value={entries}
                onChange={e => setEntries(Number(e.target.value))}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Input>
              <span className="small text-muted fw-bold text-uppercase me-3">entries</span>
              
              <Input
                type="date"
                bsSize="sm"
                className="border rounded-2 shadow-none"
                style={{ width: "135px" }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="small text-muted fw-bold">TO</span>
              <Input
                type="date"
                bsSize="sm"
                className="border rounded-2 shadow-none"
                style={{ width: "135px" }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="d-flex gap-2 flex-wrap align-items-center">
              <Button onClick={exportToCSV} size="sm" outline color="secondary" className="border d-flex align-items-center gap-2 px-3 fw-bold text-dark bg-white">
                <FaFileCsv /> CSV
              </Button>
              <Button onClick={exportToPDF} size="sm" outline color="secondary" className="border d-flex align-items-center gap-2 px-3 fw-bold text-dark bg-white">
                <FaFilePdf /> PDF
              </Button>
              
              <div className="position-relative w-100" style={{ maxWidth: '240px' }}>
                <Input 
                  placeholder="Search..." 
                  className="border bg-white py-2 ps-3 shadow-none rounded-3" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div id="expense-table-container" style={{ overflowX: 'auto' }}>
            <Table hover responsive className="mb-0 align-middle">
              <thead className="bg-light">
                <tr className="text-muted small text-uppercase fw-bold">
                  <th className="py-3 px-3">S.No</th>
                  <th className="py-3">Date & Ref</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Category</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Payment Mode</th>
                  <th className="py-3">Paid From</th>
                  <th className="py-3 text-center">Attachment</th>
                  <th className="py-3">Note</th>
                  <th className="py-3 text-center">Receipt & Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="10" className="text-center py-5 text-muted">Loading expenses...</td></tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr><td colSpan="10" className="text-center py-5 text-muted">No expense records found</td></tr>
                ) : (
                  filteredExpenses.slice(0, entries).map((exp, index) => (
                    <tr key={exp.id} className="border-bottom border-light">
                      <td className="py-3 px-3 small text-dark fw-bold">
                        {index + 1}
                      </td>
                      <td className="py-3">
                        <div className="small fw-bold text-dark">{formatExpenseDate(exp.expense_date)}</div>
                        <button 
                          className="btn btn-link p-0 text-primary text-decoration-none fw-semibold" 
                          style={{ fontSize: "12px" }}
                          onClick={() => handleOpenReceipt(exp)}
                          title="Click to view voucher receipt"
                        >
                          {exp.reference_no || `EXP-${exp.id}`}
                        </button>
                      </td>
                      <td className="py-3">
                        {Number(exp.is_gst) === 1 ? (
                          <Badge color="success" className="px-2 py-1 fw-bold text-uppercase" style={{ fontSize: "11px" }}>
                            GST
                          </Badge>
                        ) : (
                          <Badge color="info" className="px-2 py-1 fw-bold text-uppercase" style={{ fontSize: "11px" }}>
                            Non-GST
                          </Badge>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="small fw-bold text-dark text-uppercase">{exp.category_name}</div>
                        {exp.sub_category_name && (
                          <div className="text-muted" style={{ fontSize: "11px" }}>{exp.sub_category_name}</div>
                        )}
                      </td>
                      <td className="py-3 fw-bold text-primary">
                        ₹{parseFloat(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        {exp.is_refund ? <Badge color="warning" className="ms-2" style={{ fontSize: "10px" }}>Refund</Badge> : null}
                      </td>
                      <td className="py-3 small fw-semibold text-dark">
                        <Badge color="light" className="text-dark border">{exp.payment_mode || "Cash"}</Badge>
                      </td>
                      <td className="py-3 small fw-semibold text-muted">
                        {exp.payment_account_name ? `${exp.payment_account_name}${exp.payment_bank_name ? ` (${exp.payment_bank_name})` : ""}` : "-"}
                      </td>
                      <td className="py-3 text-center">
                        {exp.document_path ? (
                          <a 
                            href={serverAssetUrl(exp.document_path)} 
                            target="_blank" 
                            rel="noreferrer"
                            className="badge bg-light text-primary border text-decoration-none p-1 px-2 d-inline-flex align-items-center gap-1"
                            title="View Attached Document"
                          >
                            <FaPaperclip size={11} /> Bill
                          </a>
                        ) : (
                          <span className="text-muted small">-</span>
                        )}
                      </td>
                      <td className="py-3 small text-muted" style={{ maxWidth: '200px' }}>
                        {exp.notes || "-"}
                      </td>
                      <td className="py-3 text-center">
                        <div className="d-flex gap-2 justify-content-center align-items-center">
                          <Button 
                            color="light" 
                            size="sm" 
                            className="border px-2 py-1 text-success d-flex align-items-center gap-1 rounded-2 shadow-sm"
                            title="View / Print Receipt Voucher" 
                            onClick={() => handleOpenReceipt(exp)}
                          >
                            <FaReceipt size={13} />
                            <span className="small fw-semibold">Receipt</span>
                          </Button>
                          <Button 
                            color="link" 
                            className="p-0 text-primary" 
                            title="Edit" 
                            onClick={() => navigate(`/index/expenses/edit/${exp.id}`)}
                          >
                            <FaEdit size={15} />
                          </Button>
                          <Button 
                            color="link" 
                            className="p-0 text-danger" 
                            title="Delete" 
                            onClick={() => handleDelete(exp.id)}
                          >
                            <FaTrash size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>

      {/* EXPENSE RECEIPT / PAYMENT VOUCHER MODAL */}
      <Modal 
        isOpen={receiptModalOpen} 
        toggle={() => setReceiptModalOpen(!receiptModalOpen)} 
        size="lg" 
        centered
      >
        <ModalHeader toggle={() => setReceiptModalOpen(false)} className="bg-light border-bottom">
          <div className="d-flex align-items-center gap-2">
            <FaReceipt className="text-primary" />
            <span className="fw-bold">Expense Receipt Voucher</span>
            {selectedExpense && (
              <Badge color={Number(selectedExpense.is_gst) === 1 ? "success" : "info"} className="ms-2">
                {Number(selectedExpense.is_gst) === 1 ? "GST Expense" : "Non-GST Expense"}
              </Badge>
            )}
          </div>
        </ModalHeader>
        <ModalBody className="p-4" style={{ backgroundColor: "#fafbfc" }}>
          {selectedExpense && (
            <div 
              id="printable-expense-voucher" 
              className="bg-white p-4 rounded-3 border shadow-sm"
              style={{ color: "#1e293b" }}
            >
              {/* Header */}
              <div className="text-center pb-3 border-bottom mb-3">
                <h4 className="fw-bold text-dark mb-1 tracking-wide text-uppercase" style={{ letterSpacing: "1px" }}>
                  {companyName}
                </h4>
                {formattedCompanyAddress ? (
                  <div className="text-muted small fw-medium mb-1">
                    {formattedCompanyAddress}
                  </div>
                ) : (
                  <div className="text-muted small fw-semibold mb-1">
                    {selectedExpense.location_name || "Head Office / Main Branch"}
                  </div>
                )}
                <div className="text-muted small d-flex flex-wrap justify-content-center gap-3">
                  {companyPhone && (
                    <span><strong>Phone:</strong> {companyPhone}{companyAltPhone ? `, ${companyAltPhone}` : ""}</span>
                  )}
                  {companyEmail && (
                    <span><strong>Email:</strong> {companyEmail}</span>
                  )}
                  {companyGst && (
                    <span><strong>GSTIN:</strong> {companyGst}</span>
                  )}
                </div>
                <div className="badge bg-dark text-white px-3 py-1 text-uppercase fw-bold mt-2" style={{ letterSpacing: "1.5px", fontSize: "12px" }}>
                  {Number(selectedExpense.is_gst) === 1 ? "Payment Voucher (GST)" : "Payment Voucher (Non-GST)"}
                </div>
              </div>

              {/* Meta Grid */}
              <Row className="g-3 mb-3 pb-3 border-bottom">
                <Col xs={6}>
                  <div className="small text-muted text-uppercase fw-bold">Voucher No</div>
                  <div className="fw-bold text-primary fs-6">{selectedExpense.reference_no || `EXP-${selectedExpense.id}`}</div>
                </Col>
                <Col xs={6} className="text-end">
                  <div className="small text-muted text-uppercase fw-bold">Expense Date</div>
                  <div className="fw-bold text-dark fs-6">{formatExpenseDate(selectedExpense.expense_date)}</div>
                </Col>
                <Col xs={6}>
                  <div className="small text-muted text-uppercase fw-bold">Payment Mode</div>
                  <div className="fw-bold text-dark">
                    <span className="badge bg-light text-dark border px-2 py-1">{selectedExpense.payment_mode || "Cash"}</span>
                  </div>
                </Col>
                <Col xs={6} className="text-end">
                  <div className="small text-muted text-uppercase fw-bold">Paid From Account</div>
                  <div className="fw-semibold text-dark">
                    {selectedExpense.payment_account_name ? `${selectedExpense.payment_account_name} (${selectedExpense.payment_bank_name || 'Bank'})` : "Cash in Hand"}
                  </div>
                </Col>
              </Row>

              {/* Particulars Table */}
              <div className="table-responsive mb-3">
                <table className="table table-bordered align-middle mb-0">
                  <thead className="table-light text-uppercase small fw-bold text-muted">
                    <tr>
                      <th style={{ width: "65%" }}>Particulars / Category</th>
                      <th className="text-end" style={{ width: "35%" }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="fw-bold text-dark text-uppercase">{selectedExpense.category_name}</div>
                        {selectedExpense.sub_category_name && (
                          <div className="text-muted small">Subcategory: {selectedExpense.sub_category_name}</div>
                        )}
                        {selectedExpense.notes && (
                          <div className="text-muted small mt-1">
                            <em>Note: {selectedExpense.notes}</em>
                          </div>
                        )}
                      </td>
                      <td className="text-end fw-bold fs-5 text-primary align-top">
                        ₹{parseFloat(selectedExpense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        {selectedExpense.is_refund ? <div className="badge bg-warning text-dark small mt-1">Refund</div> : null}
                      </td>
                    </tr>
                    <tr className="table-light">
                      <td className="fw-bold text-uppercase text-end">Grand Total</td>
                      <td className="text-end fw-bold fs-5 text-dark">
                        ₹{parseFloat(selectedExpense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Amount in words */}
              <div className="p-3 bg-light rounded-2 border mb-3">
                <span className="small text-muted text-uppercase fw-bold d-block">Amount in Words:</span>
                <span className="fw-bold text-dark">
                  INR {numberToWords(selectedExpense.amount)} Only
                </span>
              </div>

              {/* Attached bill / receipt display */}
              {selectedExpense.document_path && (
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="small text-muted text-uppercase fw-bold d-flex align-items-center gap-1">
                      <FaPaperclip /> Attached Receipt / Bill
                    </span>
                    <a 
                      href={serverAssetUrl(selectedExpense.document_path)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 no-print"
                    >
                      <FaExternalLinkAlt size={12} /> Open Full Bill
                    </a>
                  </div>
                  {/\.(jpg|jpeg|png|webp|gif)$/i.test(selectedExpense.document_path) && (
                    <div className="text-center mt-2 p-2 bg-white rounded border">
                      <img 
                        src={receiptImageBase64 || serverAssetUrl(selectedExpense.document_path)} 
                        alt="Attached Expense Receipt" 
                        crossOrigin="anonymous"
                        style={{ 
                          maxHeight: "320px", 
                          maxWidth: "100%", 
                          objectFit: "contain",
                          borderRadius: "4px" 
                        }} 
                      />
                    </div>
                  )}
                  {!/\.(jpg|jpeg|png|webp|gif)$/i.test(selectedExpense.document_path) && (
                    <div className="p-2 text-center text-muted small">
                      Attached Document: <span className="fw-semibold">{selectedExpense.document_path.split('/').pop()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Signatures */}
              <Row className="mt-5 pt-4 text-center">
                <Col xs={4}>
                  <div className="border-top pt-2 small text-muted fw-bold">
                    {selectedExpense.added_by_name || "Prepared By"}
                  </div>
                  <div className="text-muted" style={{ fontSize: "11px" }}>Prepared By</div>
                </Col>
                <Col xs={4}>
                  <div className="border-top pt-2 small text-muted fw-bold">
                    Receiver's Signature
                  </div>
                  <div className="text-muted" style={{ fontSize: "11px" }}>Paid To / Signature</div>
                </Col>
                <Col xs={4}>
                  <div className="border-top pt-2 small text-muted fw-bold">
                    Manager / Admin
                  </div>
                  <div className="text-muted" style={{ fontSize: "11px" }}>Authorized Signatory</div>
                </Col>
              </Row>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="bg-light border-top d-flex justify-content-between">
          <Button color="secondary" outline onClick={() => setReceiptModalOpen(false)}>
            Close
          </Button>
          <div className="d-flex gap-2">
            <Button color="dark" outline onClick={handleDownloadVoucherPdf} className="d-flex align-items-center gap-2">
              <FaFilePdf /> Download PDF
            </Button>
            <Button color="primary" onClick={handlePrintVoucher} className="d-flex align-items-center gap-2 fw-bold">
              <FaPrint /> Print Receipt Voucher
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    </Container>
  );
}
