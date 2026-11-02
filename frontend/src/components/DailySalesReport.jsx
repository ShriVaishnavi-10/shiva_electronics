import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  Button,
  FormGroup,
  Label,
  Input,
  Table,
  Badge,
  Spinner,
  Nav,
  NavItem,
  NavLink,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import {
  FaCalendarAlt,
  FaFilePdf,
  FaFileExcel,
  FaPrint,
  FaSync,
  FaSearch,
  FaTimes,
  FaRupeeSign,
  FaMoneyBillWave,
  FaUniversity,
  FaMobileAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaClock,
  FaEye,
  FaReceipt,
  FaFileInvoice,
  FaHistory,
  FaArrowUp,
  FaArrowDown,
  FaCreditCard,
  FaTag,
} from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";
import api, { getActiveBranchId } from "../utils/api";

export default function DailySalesReport() {
  const navigate = useNavigate();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filter States
  const [datePreset, setDatePreset] = useState("today");
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [customerId, setCustomerId] = useState("all");
  const [paymentMode, setPaymentMode] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [bankAccountId, setBankAccountId] = useState("all");
  const [billType, setBillType] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Metadata dropdowns
  const [customers, setCustomers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  // Data State
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("sales");

  // Modals
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);
  const [selectedInvoicePayments, setSelectedInvoicePayments] = useState([]);

  // Print & PDF ref
  const reportRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load dropdown lists (customers & bank accounts)
  useEffect(() => {
    api
      .get("/customers", { params: { all: "true" } })
      .then((res) => {
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        setCustomers(list);
      })
      .catch(() => {});

    api
      .get("/bank-accounts")
      .then((res) => {
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        setBankAccounts(list);
      })
      .catch(() => {});
  }, []);

  // Fetch Report Data
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/daily-sales", {
        params: {
          fromDate,
          toDate,
          customerId: customerId !== "all" ? customerId : undefined,
          paymentMode: paymentMode !== "all" ? paymentMode : undefined,
          paymentStatus: paymentStatus !== "all" ? paymentStatus : undefined,
          bankAccountId: bankAccountId !== "all" ? bankAccountId : undefined,
          billType: billType !== "all" ? billType : undefined,
          search: debouncedSearch && debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
        },
      });
      if (res.data?.success) {
        setReportData(res.data);
      } else {
        toast.error(res.data?.message || "Failed to load report data");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to generate daily sales report");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, customerId, paymentMode, paymentStatus, bankAccountId, billType, debouncedSearch]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Date Preset Switcher
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    if (preset === "today") {
      const s = today.toISOString().slice(0, 10);
      setFromDate(s);
      setToDate(s);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(today.getDate() - 1);
      const s = y.toISOString().slice(0, 10);
      setFromDate(s);
      setToDate(s);
    } else if (preset === "this_week") {
      const startOfWeek = new Date();
      startOfWeek.setDate(today.getDate() - today.getDay());
      setFromDate(startOfWeek.toISOString().slice(0, 10));
      setToDate(today.toISOString().slice(0, 10));
    } else if (preset === "this_month") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(startOfMonth.toISOString().slice(0, 10));
      setToDate(today.toISOString().slice(0, 10));
    }
  };

  // Helper date formatters
  const formatDisplayDate = (dStr) => {
    if (!dStr) return "-";
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Quick Currency Formatter
  const formatRupee = (num) => {
    const val = Number(num) || 0;
    return `₹${val.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Open Sale Detail Modal
  const handleViewSale = (sale) => {
    setSelectedSale(sale);
    setSaleModalOpen(true);
  };

  // Open Payments History Modal
  const handleViewPayments = (sale) => {
    setSelectedSale(sale);
    setSelectedInvoicePayments(sale.payments || []);
    setPaymentsModalOpen(true);
  };

  // ==========================================
  // EXPORT 1: Multi-Sheet Excel Workbook (xlsx)
  // ==========================================
  const handleExportExcel = () => {
    if (!reportData) return;

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Daily Sales
      const salesRows = (reportData.sales || []).map((s, idx) => ({
        "S.No": idx + 1,
        "Invoice No": s.invoice_no,
        "Date": formatDisplayDate(s.date),
        "Time": s.time || "-",
        "Customer Name": s.customer_name,
        "Contact No": s.contact_no,
        "Location": s.location,
        "Total Amount (₹)": s.total_amount,
        "Discount (₹)": s.discount_amount,
        "Advance Paid (₹)": s.advance_paid,
        "Balance Paid (₹)": s.balance_paid,
        "Total Paid (₹)": s.total_paid,
        "Outstanding (₹)": s.outstanding,
        "Payment Status": String(s.payment_status).toUpperCase(),
      }));
      const wsSales = XLSX.utils.json_to_sheet(salesRows);
      XLSX.utils.book_append_sheet(wb, wsSales, "Daily Sales");

      // Sheet 2: Payments
      const paymentRows = (reportData.payments || []).map((p, idx) => ({
        "S.No": idx + 1,
        "Payment Date": formatDisplayDate(p.payment_date),
        "Time": p.payment_time || "-",
        "Invoice No": p.invoice_no,
        "Customer Name": p.customer_name,
        "Contact No": p.contact_no,
        "Payment Type": p.payment_type,
        "Payment Mode": p.payment_mode,
        "Bank Account": p.bank_account_name,
        "Reference No": p.reference_no,
        "Amount (₹)": p.amount,
      }));
      const wsPayments = XLSX.utils.json_to_sheet(paymentRows);
      XLSX.utils.book_append_sheet(wb, wsPayments, "Payments");

      // Sheet 3: Daily Summary
      const summary = reportData.summary || {};
      const mode = reportData.mode_summary || {};
      const fin = reportData.financial_summary || {};

      const summaryRows = [
        { "Category": "Report Date Range", "Metric": "Report Period", "Amount (₹)": reportData.report_date },
        { "Category": "Sales Overview", "Metric": "Total Sales Invoices", "Amount (₹)": summary.total_sales_count },
        { "Category": "Sales Overview", "Metric": "Total Sale Amount", "Amount (₹)": summary.total_sale_amount },
        { "Category": "Sales Overview", "Metric": "Total Discount Given", "Amount (₹)": summary.total_discount },
        { "Category": "Sales Overview", "Metric": "Total Paid Amount", "Amount (₹)": summary.total_sales_paid },
        { "Category": "Sales Overview", "Metric": "Total Outstanding Balance", "Amount (₹)": summary.total_outstanding },
        { "Category": "Collections Today", "Metric": "Advance Payments Received", "Amount (₹)": summary.total_advance_received },
        { "Category": "Collections Today", "Metric": "Balance Payments Received", "Amount (₹)": summary.total_balance_received },
        { "Category": "Collections Today", "Metric": "Total Collections Today", "Amount (₹)": summary.total_collected_today },
        { "Category": "Mode Collections", "Metric": "Cash Collection", "Amount (₹)": mode.cash_total },
        { "Category": "Mode Collections", "Metric": "Bank Transfers", "Amount (₹)": mode.bank_total },
        { "Category": "Mode Collections", "Metric": "UPI Collections (GPay/PhonePe)", "Amount (₹)": mode.upi_total },
        { "Category": "Mode Collections", "Metric": "Cheque Collections", "Amount (₹)": mode.cheque_total },
        { "Category": "Mode Collections", "Metric": "Other Collections", "Amount (₹)": mode.other_total },
        { "Category": "Cash Flow Reconciliation", "Metric": "Opening Cash Balance", "Amount (₹)": fin.opening_cash_balance },
        { "Category": "Cash Flow Reconciliation", "Metric": "Cash Collections (+)", "Amount (₹)": fin.cash_sales },
        { "Category": "Cash Flow Reconciliation", "Metric": "Cash Expenses (-)", "Amount (₹)": fin.cash_expenses },
        { "Category": "Cash Flow Reconciliation", "Metric": "Net Cash Flow", "Amount (₹)": fin.net_cash_flow },
        { "Category": "Cash Flow Reconciliation", "Metric": "Closing Cash Balance", "Amount (₹)": fin.closing_cash_balance },
        { "Category": "Expenses", "Metric": "Total Daily Expenses", "Amount (₹)": fin.total_expenses },
        { "Category": "Expenses", "Metric": "Bank / Digital Expenses", "Amount (₹)": fin.bank_expenses },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Daily Summary");

      const fname = `Daily_Sales_Report_${fromDate}_to_${toDate}.xlsx`;
      XLSX.writeFile(wb, fname);
      toast.success("Excel report exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export Excel report");
    }
  };

  // ==========================================
  // EXPORT 2: Professional PDF Export (html2pdf)
  // ==========================================
  const handleExportPDF = () => {
    if (!reportRef.current) return;
    try {
      const element = reportRef.current;
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `Daily_Sales_Report_${fromDate}_to_${toDate}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      };

      toast.info("Generating PDF...");
      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          toast.success("PDF exported successfully!");
        })
        .catch((err) => {
          console.error(err);
          toast.error("Failed to generate PDF");
        });
    } catch (err) {
      console.error(err);
      toast.error("Error generating PDF");
    }
  };

  // ==========================================
  // EXPORT 3: Direct Print
  // ==========================================
  const handlePrint = () => {
    window.print();
  };

  const summary = reportData?.summary || {};
  const modeSummary = reportData?.mode_summary || {};
  const financialSummary = reportData?.financial_summary || {};
  const salesList = reportData?.sales || [];
  const paymentsList = reportData?.payments || [];
  const expensesList = reportData?.expenses || [];

  return (
    <Container fluid className="px-3 py-3" style={{ backgroundColor: "#F8FAFC", minHeight: "100vh" }}>
      {/* -------------------- Top Header -------------------- */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
            <span
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFD700",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}
            >
              <FaCalendarAlt size={18} />
            </span>
            Daily Sales Report
          </h4>
          <small className="text-muted">
            Track daily sales, advance payments, balance receipts, mode-wise collections, and cash reconciliation.
          </small>
        </div>

        {/* Action Buttons */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          <Button
            size="sm"
            color="primary"
            outline
            onClick={fetchReport}
            className="d-flex align-items-center gap-1 shadow-sm"
          >
            <FaSync size={12} className={loading ? "fa-spin" : ""} /> Refresh
          </Button>
          <Button
            size="sm"
            color="secondary"
            outline
            onClick={handlePrint}
            className="d-flex align-items-center gap-1 shadow-sm"
          >
            <FaPrint size={12} /> Print
          </Button>
          <Button
            size="sm"
            color="danger"
            outline
            onClick={handleExportPDF}
            className="d-flex align-items-center gap-1 shadow-sm"
          >
            <FaFilePdf size={12} /> PDF
          </Button>
          <Button
            size="sm"
            color="success"
            onClick={handleExportExcel}
            className="d-flex align-items-center gap-1 shadow-sm fw-semibold"
            style={{ backgroundColor: "#15803D", borderColor: "#15803D" }}
          >
            <FaFileExcel size={13} /> Export Excel
          </Button>
        </div>
      </div>

      {/* -------------------- Filters Card -------------------- */}
      <Card className="border-0 shadow-sm mb-3" style={{ borderRadius: "12px" }}>
        <CardBody className="p-3">
          {/* Quick Date Presets */}
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3 pb-2 border-bottom">
            <span className="small fw-bold text-muted text-uppercase me-1">Quick Presets:</span>
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "this_week", label: "This Week" },
              { id: "this_month", label: "This Month" },
              { id: "custom", label: "Custom" },
            ].map((p) => (
              <Button
                key={p.id}
                size="sm"
                color={datePreset === p.id ? "primary" : "light"}
                className={`py-1 px-3 fw-semibold ${
                  datePreset === p.id ? "shadow-sm" : "text-dark"
                }`}
                style={{
                  borderRadius: "20px",
                  fontSize: "0.82rem",
                  backgroundColor: datePreset === p.id ? "#0A0D16" : "#F1F5F9",
                  borderColor: datePreset === p.id ? "#D49A00" : "#E2E8F0",
                  color: datePreset === p.id ? "#FFD700" : "#1E293B",
                  fontWeight: datePreset === p.id ? "700" : "500",
                }}
                onClick={() => handlePresetChange(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Filter Inputs Grid */}
          <Row className="g-2 align-items-end">
            <Col xs={6} md={2}>
              <Label className="small fw-bold text-muted mb-1">From Date</Label>
              <Input
                type="date"
                bsSize="sm"
                value={fromDate}
                onChange={(e) => {
                  setDatePreset("custom");
                  setFromDate(e.target.value);
                }}
                className="fw-semibold"
              />
            </Col>

            <Col xs={6} md={2}>
              <Label className="small fw-bold text-muted mb-1">To Date</Label>
              <Input
                type="date"
                bsSize="sm"
                value={toDate}
                onChange={(e) => {
                  setDatePreset("custom");
                  setToDate(e.target.value);
                }}
                className="fw-semibold"
              />
            </Col>

            <Col xs={6} md={2}>
              <Label className="small fw-bold text-muted mb-1">Customer</Label>
              <Input
                type="select"
                bsSize="sm"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="fw-semibold"
              >
                <option value="all">All Customers</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customer_name || c.name} {c.contact_no ? `(${c.contact_no})` : ""}
                  </option>
                ))}
              </Input>
            </Col>

            <Col xs={6} md={2}>
              <Label className="small fw-bold text-muted mb-1">Payment Mode</Label>
              <Input
                type="select"
                bsSize="sm"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="fw-semibold"
              >
                <option value="all">All Modes</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Card">Card</option>
              </Input>
            </Col>

            <Col xs={6} md={2}>
              <Label className="small fw-bold text-muted mb-1">Payment Status</Label>
              <Input
                type="select"
                bsSize="sm"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="fw-semibold"
              >
                <option value="all">All Status</option>
                <option value="paid">PAID (Full)</option>
                <option value="partial">PARTIAL (Advance / Due)</option>
                <option value="due">DUE (Unpaid)</option>
              </Input>
            </Col>

            <Col xs={6} md={2}>
              <Label className="small fw-bold text-muted mb-1">Bank Account</Label>
              <Input
                type="select"
                bsSize="sm"
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="fw-semibold"
              >
                <option value="all">All Accounts</option>
                {bankAccounts.map((ba) => (
                  <option key={ba.id} value={ba.id}>
                    {ba.account_name} ({ba.bank_name})
                  </option>
                ))}
              </Input>
            </Col>

            {/* Global Search Bar */}
            <Col md={6} className="mt-2">
              <div className="position-relative">
                <Input
                  bsSize="sm"
                  placeholder="Search Invoice No, Customer Name, Ref No, Phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pe-4 fw-semibold"
                  style={{ borderRadius: "8px" }}
                />
                {search && (
                  <button
                    type="button"
                    className="btn btn-sm text-muted position-absolute top-50 end-0 translate-middle-y border-0 bg-transparent p-1 me-1"
                    onClick={() => setSearch("")}
                    title="Clear Search"
                  >
                    <FaTimes size={11} />
                  </button>
                )}
              </div>
            </Col>

            <Col md={3} className="mt-2">
              <Input
                type="select"
                bsSize="sm"
                value={billType}
                onChange={(e) => setBillType(e.target.value)}
                className="fw-semibold"
              >
                <option value="all">All Invoices (Tax & Non-Tax)</option>
                <option value="tax">Tax / GST Invoices Only</option>
                <option value="non-tax">Non-Tax Invoices Only</option>
              </Input>
            </Col>

            <Col md={3} className="mt-2 text-end">
              <Button
                size="sm"
                color="secondary"
                outline
                onClick={() => {
                  setDatePreset("today");
                  setFromDate(todayStr);
                  setToDate(todayStr);
                  setCustomerId("all");
                  setPaymentMode("all");
                  setPaymentStatus("all");
                  setBankAccountId("all");
                  setBillType("all");
                  setSearch("");
                }}
                className="w-100 fw-semibold"
              >
                Reset All Filters
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* -------------------- Report Printable Container -------------------- */}
      <div ref={reportRef} id="daily-sales-report-printable">
        {/* Print Only Header */}
        <div className="d-none d-print-block text-center pb-3 mb-3 border-bottom">
          <h2 className="fw-bold mb-0">CLAVIS TECH WORKS</h2>
          <h5 className="text-muted mb-1">Daily Sales & Collections Report</h5>
          <div className="small text-secondary">
            Period: <strong>{formatDisplayDate(fromDate)}</strong> to{" "}
            <strong>{formatDisplayDate(toDate)}</strong> | Generated: {new Date().toLocaleString()}
          </div>
        </div>

        {/* -------------------- Top Summary Cards -------------------- */}
        <Row className="g-3 mb-3">
          {/* Total Sales */}
          <Col xs={12} sm={6} md={4} lg={2}>
            <Card
              className="border-0 shadow-sm h-100"
              style={{
                borderRadius: "12px",
                background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
                borderLeft: "4px solid #3B82F6",
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small text-muted fw-bold text-uppercase">Total Sales</span>
                  <Badge color="primary" pill style={{ fontSize: "0.75rem" }}>
                    {summary.total_sales_count || 0} Bills
                  </Badge>
                </div>
                <h4 className="fw-bold text-dark mb-0">{formatRupee(summary.total_sale_amount)}</h4>
                <div className="small text-muted mt-1">
                  Discount: <span className="text-danger fw-semibold">{formatRupee(summary.total_discount)}</span>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Collections Today */}
          <Col xs={12} sm={6} md={4} lg={2}>
            <Card
              className="border-0 shadow-sm h-100"
              style={{
                borderRadius: "12px",
                background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
                borderLeft: "4px solid #16A34A",
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small text-muted fw-bold text-uppercase">Collected Today</span>
                  <FaMoneyBillWave className="text-success" size={16} />
                </div>
                <h4 className="fw-bold text-success mb-0">{formatRupee(summary.total_collected_today)}</h4>
                <div className="small text-muted mt-1">
                  Total Paid: <span className="fw-semibold">{formatRupee(summary.total_sales_paid)}</span>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Advance Received */}
          <Col xs={12} sm={6} md={4} lg={2}>
            <Card
              className="border-0 shadow-sm h-100"
              style={{
                borderRadius: "12px",
                background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
                borderLeft: "4px solid #D49A00",
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small text-muted fw-bold text-uppercase">Advance Recd</span>
                  <FaTag style={{ color: "#D49A00" }} size={14} />
                </div>
                <h4 className="fw-bold mb-0" style={{ color: "#92400E" }}>
                  {formatRupee(summary.total_advance_received)}
                </h4>
                <div className="small text-muted mt-1">Initial Deposits</div>
              </CardBody>
            </Card>
          </Col>

          {/* Balance Payments Received */}
          <Col xs={12} sm={6} md={4} lg={2}>
            <Card
              className="border-0 shadow-sm h-100"
              style={{
                borderRadius: "12px",
                background: "linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)",
                borderLeft: "4px solid #9333EA",
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small text-muted fw-bold text-uppercase">Balance Recd</span>
                  <FaArrowUp className="text-purple" style={{ color: "#9333EA" }} size={14} />
                </div>
                <h4 className="fw-bold mb-0" style={{ color: "#7E22CE" }}>
                  {formatRupee(summary.total_balance_received)}
                </h4>
                <div className="small text-muted mt-1">Subsequent Pay</div>
              </CardBody>
            </Card>
          </Col>

          {/* Outstanding */}
          <Col xs={12} sm={6} md={4} lg={2}>
            <Card
              className="border-0 shadow-sm h-100"
              style={{
                borderRadius: "12px",
                background: "linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)",
                borderLeft: "4px solid #E11D48",
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small text-muted fw-bold text-uppercase">Outstanding</span>
                  <FaExclamationCircle className="text-danger" size={15} />
                </div>
                <h4 className="fw-bold text-danger mb-0">{formatRupee(summary.total_outstanding)}</h4>
                <div className="small text-muted mt-1">Unpaid Balance</div>
              </CardBody>
            </Card>
          </Col>

          {/* Total Expenses */}
          <Col xs={12} sm={6} md={4} lg={2}>
            <Card
              className="border-0 shadow-sm h-100"
              style={{
                borderRadius: "12px",
                background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
                borderLeft: "4px solid #F59E0B",
              }}
            >
              <CardBody className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small text-muted fw-bold text-uppercase">Expenses</span>
                  <FaArrowDown className="text-warning" size={14} />
                </div>
                <h4 className="fw-bold mb-0" style={{ color: "#B45309" }}>
                  {formatRupee(financialSummary.total_expenses)}
                </h4>
                <div className="small text-muted mt-1">
                  Cash: <span className="fw-semibold">{formatRupee(financialSummary.cash_expenses)}</span>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* -------------------- Payment Mode Summary Bar -------------------- */}
        <Card className="border-0 shadow-sm mb-3" style={{ borderRadius: "12px" }}>
          <CardBody className="p-3">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-2">
                <span className="fw-bold text-dark small text-uppercase">Payment Mode Summary:</span>
                <span className="badge bg-light text-dark border">
                  Total: <strong>{formatRupee(modeSummary.grand_total)}</strong>
                </span>
              </div>

              <div className="d-flex flex-wrap align-items-center gap-2">
                {/* Cash */}
                <div
                  className="px-3 py-1 d-flex align-items-center gap-2"
                  style={{
                    backgroundColor: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    borderRadius: "8px",
                  }}
                >
                  <FaMoneyBillWave className="text-success" size={14} />
                  <span className="small text-muted">Cash:</span>
                  <strong className="text-success">{formatRupee(modeSummary.cash_total)}</strong>
                </div>

                {/* UPI */}
                <div
                  className="px-3 py-1 d-flex align-items-center gap-2"
                  style={{
                    backgroundColor: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    borderRadius: "8px",
                  }}
                >
                  <FaMobileAlt className="text-primary" size={14} />
                  <span className="small text-muted">UPI / GPay:</span>
                  <strong className="text-primary">{formatRupee(modeSummary.upi_total)}</strong>
                </div>

                {/* Bank Transfer */}
                <div
                  className="px-3 py-1 d-flex align-items-center gap-2"
                  style={{
                    backgroundColor: "#F5F3FF",
                    border: "1px solid #DDD6FE",
                    borderRadius: "8px",
                  }}
                >
                  <FaUniversity style={{ color: "#7C3AED" }} size={14} />
                  <span className="small text-muted">Bank Transfer:</span>
                  <strong style={{ color: "#7C3AED" }}>{formatRupee(modeSummary.bank_total)}</strong>
                </div>

                {/* Cheque */}
                <div
                  className="px-3 py-1 d-flex align-items-center gap-2"
                  style={{
                    backgroundColor: "#FFFBEB",
                    border: "1px solid #FDE68A",
                    borderRadius: "8px",
                  }}
                >
                  <FaCreditCard style={{ color: "#D97706" }} size={14} />
                  <span className="small text-muted">Cheque:</span>
                  <strong style={{ color: "#D97706" }}>{formatRupee(modeSummary.cheque_total)}</strong>
                </div>

                {/* Others */}
                {modeSummary.other_total > 0 && (
                  <div
                    className="px-3 py-1 d-flex align-items-center gap-2"
                    style={{
                      backgroundColor: "#F1F5F9",
                      border: "1px solid #CBD5E1",
                      borderRadius: "8px",
                    }}
                  >
                    <span className="small text-muted">Others:</span>
                    <strong className="text-secondary">{formatRupee(modeSummary.other_total)}</strong>
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* -------------------- Interactive Tabs -------------------- */}
        <Nav
          tabs
          className="mb-3 border-bottom-0 gap-1 d-print-none"
          style={{ cursor: "pointer" }}
        >
          <NavItem>
            <NavLink
              className={`px-3 py-2 fw-semibold rounded-top ${
                activeTab === "sales"
                  ? "bg-white text-teal border-bottom-0 shadow-sm"
                  : "bg-light text-muted border-0"
              }`}
              style={{
                color: activeTab === "sales" ? "#D49A00" : "#64748B",
                borderTop: activeTab === "sales" ? "3px solid #D49A00" : "3px solid transparent",
                fontWeight: activeTab === "sales" ? "700" : "500",
              }}
              onClick={() => setActiveTab("sales")}
            >
              Daily Sales ({salesList.length})
            </NavLink>
          </NavItem>

          <NavItem>
            <NavLink
              className={`px-3 py-2 fw-semibold rounded-top ${
                activeTab === "payments"
                  ? "bg-white border-bottom-0 shadow-sm"
                  : "bg-light text-muted border-0"
              }`}
              style={{
                color: activeTab === "payments" ? "#D49A00" : "#64748B",
                borderTop: activeTab === "payments" ? "3px solid #D49A00" : "3px solid transparent",
                fontWeight: activeTab === "payments" ? "700" : "500",
              }}
              onClick={() => setActiveTab("payments")}
            >
              Payment Transactions ({paymentsList.length})
            </NavLink>
          </NavItem>

          <NavItem>
            <NavLink
              className={`px-3 py-2 fw-semibold rounded-top ${
                activeTab === "financial"
                  ? "bg-white border-bottom-0 shadow-sm"
                  : "bg-light text-muted border-0"
              }`}
              style={{
                color: activeTab === "financial" ? "#D49A00" : "#64748B",
                borderTop: activeTab === "financial" ? "3px solid #D49A00" : "3px solid transparent",
                fontWeight: activeTab === "financial" ? "700" : "500",
              }}
              onClick={() => setActiveTab("financial")}
            >
              Daily Financial Summary
            </NavLink>
          </NavItem>

          <NavItem>
            <NavLink
              className={`px-3 py-2 fw-semibold rounded-top ${
                activeTab === "expenses"
                  ? "bg-white border-bottom-0 shadow-sm"
                  : "bg-light text-muted border-0"
              }`}
              style={{
                color: activeTab === "expenses" ? "#D49A00" : "#64748B",
                borderTop: activeTab === "expenses" ? "3px solid #D49A00" : "3px solid transparent",
                fontWeight: activeTab === "expenses" ? "700" : "500",
              }}
              onClick={() => setActiveTab("expenses")}
            >
              Expenses ({expensesList.length})
            </NavLink>
          </NavItem>
        </Nav>

        {/* -------------------- TAB 1: DAILY SALES -------------------- */}
        {(activeTab === "sales" || window.matchMedia("print").matches) && (
          <Card className="border-0 shadow-sm mb-3" style={{ borderRadius: "12px" }}>
            <CardHeader className="bg-white py-3 border-0 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="fw-bold mb-0 text-dark">Daily Sales Invoices</h6>
                <small className="text-muted">
                  Sales created during the selected period with advance, paid, and outstanding details.
                </small>
              </div>
              <Badge color="info" pill>
                {salesList.length} Invoices
              </Badge>
            </CardHeader>
            <CardBody className="p-0">
              <div className="table-responsive">
                <Table hover size="sm" className="align-middle mb-0 text-nowrap">
                  <thead className="table-light">
                    <tr style={{ fontSize: "0.82rem" }}>
                      <th className="px-3">#</th>
                      <th>Invoice No</th>
                      <th>Time / Date</th>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th className="text-end">Total Amount</th>
                      <th className="text-end">Discount</th>
                      <th className="text-end">Advance</th>
                      <th className="text-end">Balance Paid</th>
                      <th className="text-end">Total Paid</th>
                      <th className="text-end">Outstanding</th>
                      <th className="text-center">Status</th>
                      <th className="text-center d-print-none">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="13" className="text-center py-5 text-muted">
                          <Spinner size="sm" color="primary" className="me-2" />
                          Loading Daily Sales Data...
                        </td>
                      </tr>
                    ) : salesList.length === 0 ? (
                      <tr>
                        <td colSpan="13" className="text-center py-5 text-muted">
                          {search ? (
                            <div>
                              <div className="fw-bold text-dark">No sales match "{search}"</div>
                              <small>Try clearing or modifying the search criteria.</small>
                            </div>
                          ) : (
                            <div>
                              <div className="fw-bold text-dark">No sales recorded for this date.</div>
                              <small>Select a different date or clear filters.</small>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      salesList.map((s, idx) => {
                        const isPaid = s.payment_status === "paid" || s.outstanding <= 0.001;
                        const isPartial = !isPaid && (s.payment_status === "partial" || s.total_paid > 0);
                        const statusBadge = isPaid
                          ? "bg-success"
                          : isPartial
                          ? "bg-warning text-dark"
                          : "bg-danger";

                        return (
                          <tr key={s.id || idx} style={{ fontSize: "0.85rem" }}>
                            <td className="px-3 text-muted">{idx + 1}</td>
                            <td>
                              <span
                                className="fw-bold"
                                style={{ color: "#0D9488", cursor: "pointer" }}
                                onClick={() => handleViewSale(s)}
                                title="Click to view details"
                              >
                                {s.invoice_no}
                              </span>
                            </td>
                            <td>
                              <div>{formatDisplayDate(s.date)}</div>
                              <small className="text-muted">{s.time || "-"}</small>
                            </td>
                            <td>
                              <div className="fw-semibold text-dark">{s.customer_name}</div>
                              {s.gst_no && s.gst_no !== "-" && (
                                <small className="text-muted d-block">GST: {s.gst_no}</small>
                              )}
                            </td>
                            <td>{s.contact_no}</td>
                            <td className="text-end fw-bold text-dark">{formatRupee(s.total_amount)}</td>
                            <td className="text-end text-muted">
                              {s.discount_amount > 0 ? formatRupee(s.discount_amount) : "-"}
                            </td>
                            <td className="text-end text-teal" style={{ color: "#0D9488" }}>
                              {s.advance_paid > 0 ? (
                                <div>
                                  <span className="fw-semibold">{formatRupee(s.advance_paid)}</span>
                                  {s.advance_method && (
                                    <small className="d-block text-muted" style={{ fontSize: "0.72rem" }}>
                                      ({s.advance_method})
                                    </small>
                                  )}
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="text-end" style={{ color: "#7E22CE" }}>
                              {s.balance_paid > 0 ? (
                                <span className="fw-semibold">{formatRupee(s.balance_paid)}</span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="text-end text-success fw-bold">{formatRupee(s.total_paid)}</td>
                            <td className="text-end">
                              <span className={s.outstanding > 0.001 ? "text-danger fw-bold" : "text-muted"}>
                                {formatRupee(s.outstanding)}
                              </span>
                            </td>
                            <td className="text-center">
                              <Badge className={`${statusBadge} px-2 py-1`} pill>
                                {String(s.payment_status).toUpperCase()}
                              </Badge>
                            </td>
                            <td className="text-center text-nowrap d-print-none">
                              <Button
                                size="sm"
                                color="info"
                                outline
                                className="py-0 px-2 me-1"
                                onClick={() => handleViewSale(s)}
                                title="View Sale Details"
                              >
                                <FaEye size={11} />
                              </Button>
                              <Button
                                size="sm"
                                color="primary"
                                outline
                                className="py-0 px-2 me-1"
                                onClick={() => handleViewPayments(s)}
                                title="View Payment History"
                              >
                                <FaHistory size={11} />
                              </Button>
                              <Button
                                size="sm"
                                color="secondary"
                                outline
                                className="py-0 px-2 me-1"
                                onClick={() => navigate(`/index/salesReceipt/${s.id}`)}
                                title="Tax Invoice Print"
                              >
                                <FaFileInvoice size={11} />
                              </Button>
                              <Button
                                size="sm"
                                color="dark"
                                outline
                                className="py-0 px-2"
                                onClick={() => navigate(`/index/thermalReceipt/${s.id}`)}
                                title="Thermal Receipt"
                              >
                                <FaReceipt size={11} />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {salesList.length > 0 && (
                    <tfoot className="table-light fw-bold">
                      <tr style={{ fontSize: "0.85rem" }}>
                        <td colSpan="5" className="px-3 text-uppercase">
                          Total ({salesList.length} Bills)
                        </td>
                        <td className="text-end text-dark">{formatRupee(summary.total_sale_amount)}</td>
                        <td className="text-end text-muted">{formatRupee(summary.total_discount)}</td>
                        <td className="text-end" style={{ color: "#0D9488" }}>
                          {formatRupee(summary.total_advance_received)}
                        </td>
                        <td className="text-end" style={{ color: "#7E22CE" }}>
                          {formatRupee(summary.total_balance_received)}
                        </td>
                        <td className="text-end text-success">{formatRupee(summary.total_sales_paid)}</td>
                        <td className="text-end text-danger">{formatRupee(summary.total_outstanding)}</td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  )}
                </Table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* -------------------- TAB 2: PAYMENT TRANSACTIONS -------------------- */}
        {(activeTab === "payments" || window.matchMedia("print").matches) && (
          <Card className="border-0 shadow-sm mb-3" style={{ borderRadius: "12px" }}>
            <CardHeader className="bg-white py-3 border-0 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="fw-bold mb-0 text-dark">Daily Payment Transactions</h6>
                <small className="text-muted">
                  Every individual payment transaction recorded on this date (Advances, Balance Payments, Full Settlements).
                </small>
              </div>
              <Badge color="success" pill>
                {paymentsList.length} Payments
              </Badge>
            </CardHeader>
            <CardBody className="p-0">
              <div className="table-responsive">
                <Table hover size="sm" className="align-middle mb-0 text-nowrap">
                  <thead className="table-light">
                    <tr style={{ fontSize: "0.82rem" }}>
                      <th className="px-3">#</th>
                      <th>Date & Time</th>
                      <th>Invoice No</th>
                      <th>Customer</th>
                      <th>Payment Type</th>
                      <th>Mode</th>
                      <th>Cash / Bank</th>
                      <th>Bank Account</th>
                      <th>Reference No</th>
                      <th className="text-end px-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="10" className="text-center py-5 text-muted">
                          <Spinner size="sm" color="primary" className="me-2" />
                          Loading Payment Transactions...
                        </td>
                      </tr>
                    ) : paymentsList.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-5 text-muted">
                          No payment transactions recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      paymentsList.map((p, idx) => {
                        const isAdvance = p.payment_type.includes("Advance");
                        const isBalance = p.payment_type.includes("Balance");
                        const typeBadge = isAdvance
                          ? "bg-info text-white"
                          : isBalance
                          ? "bg-purple text-white"
                          : "bg-success text-white";

                        const modeColor =
                          p.payment_mode === "Cash"
                            ? "bg-success"
                            : p.payment_mode === "UPI"
                            ? "bg-primary"
                            : "bg-secondary";

                        return (
                          <tr key={p.id || idx} style={{ fontSize: "0.85rem" }}>
                            <td className="px-3 text-muted">{idx + 1}</td>
                            <td>
                              <div>{formatDisplayDate(p.payment_date)}</div>
                              <small className="text-muted">{p.payment_time}</small>
                            </td>
                            <td>
                              <span
                                className="fw-bold"
                                style={{ color: "#0D9488", cursor: "pointer" }}
                                onClick={() => navigate(`/index/salesReceipt/${p.transaction_id}`)}
                              >
                                {p.invoice_no}
                              </span>
                            </td>
                            <td>
                              <div className="fw-semibold text-dark">{p.customer_name}</div>
                              <small className="text-muted">{p.contact_no}</small>
                            </td>
                            <td>
                              <span
                                className="badge px-2 py-1"
                                style={{
                                  backgroundColor: isAdvance
                                    ? "#0D9488"
                                    : isBalance
                                    ? "#9333EA"
                                    : "#16A34A",
                                  fontSize: "0.75rem",
                                }}
                              >
                                {p.payment_type}
                              </span>
                            </td>
                            <td>
                              <Badge className={`${modeColor} px-2 py-1`} pill>
                                {p.payment_mode}
                              </Badge>
                            </td>
                            <td>
                              <Badge color={p.is_cash ? "light" : "primary"} className="border text-dark">
                                {p.is_cash ? "Cash" : "Bank / Digital"}
                              </Badge>
                            </td>
                            <td>
                              <div className="fw-semibold text-dark">{p.bank_account_name}</div>
                              {p.bank_name && <small className="text-muted">{p.bank_name}</small>}
                            </td>
                            <td>
                              <span className="text-muted font-monospace">{p.reference_no}</span>
                            </td>
                            <td className="text-end px-3 fw-bold text-success" style={{ fontSize: "0.9rem" }}>
                              {formatRupee(p.amount)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {paymentsList.length > 0 && (
                    <tfoot className="table-light fw-bold">
                      <tr style={{ fontSize: "0.85rem" }}>
                        <td colSpan="9" className="px-3 text-uppercase">
                          Total Payments Collected ({paymentsList.length} Transactions)
                        </td>
                        <td className="text-end px-3 text-success">
                          {formatRupee(summary.total_collected_today)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </Table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* -------------------- TAB 3: DAILY FINANCIAL RECONCILIATION -------------------- */}
        {(activeTab === "financial" || window.matchMedia("print").matches) && (
          <Row className="g-3 mb-3">
            <Col md={7}>
              <Card className="border-0 shadow-sm h-100" style={{ borderRadius: "12px" }}>
                <CardHeader className="bg-white py-3 border-0">
                  <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <FaUniversity className="text-primary" /> Daily Cash Flow & Balance Reconciliation
                  </h6>
                  <small className="text-muted">
                    Reconciliation of opening cash balance, daily cash receipts, cash expenses, and closing balance.
                  </small>
                </CardHeader>
                <CardBody className="p-3">
                  <Table bordered hover size="sm" className="align-middle mb-0">
                    <tbody>
                      <tr className="table-light">
                        <td className="fw-bold text-dark py-2">
                          <FaClock className="me-2 text-secondary" /> Opening Cash Balance
                        </td>
                        <td className="text-end fw-bold fs-6 py-2">
                          {formatRupee(financialSummary.opening_cash_balance)}
                        </td>
                      </tr>

                      <tr>
                        <td className="text-success py-2">
                          <FaArrowUp className="me-2 text-success" /> (+) Cash Sales / Cash Received
                        </td>
                        <td className="text-end fw-bold text-success py-2">
                          {formatRupee(financialSummary.cash_sales)}
                        </td>
                      </tr>

                      <tr>
                        <td className="text-danger py-2">
                          <FaArrowDown className="me-2 text-danger" /> (-) Cash Expenses Paid
                        </td>
                        <td className="text-end fw-bold text-danger py-2">
                          {formatRupee(financialSummary.cash_expenses)}
                        </td>
                      </tr>

                      <tr style={{ backgroundColor: "#F8FAFC" }}>
                        <td className="fw-bold py-2">(=) Net Cash Flow for Period</td>
                        <td
                          className={`text-end fw-bold py-2 ${
                            financialSummary.net_cash_flow >= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {formatRupee(financialSummary.net_cash_flow)}
                        </td>
                      </tr>

                      <tr
                        style={{
                          backgroundColor: "#FEF3C7",
                          borderTop: "2px solid #D49A00",
                        }}
                      >
                        <td className="fw-bold fs-6 py-2" style={{ color: "#92400E" }}>
                          <FaCheckCircle className="me-2" style={{ color: "#D49A00" }} /> Closing Cash Balance
                        </td>
                        <td className="text-end fw-bold fs-5 py-2" style={{ color: "#92400E" }}>
                          {formatRupee(financialSummary.closing_cash_balance)}
                        </td>
                      </tr>
                    </tbody>
                  </Table>

                  <div className="mt-3 p-2 bg-light rounded text-muted small d-flex justify-content-between align-items-center">
                    <span>
                      Day Registry Status:{" "}
                      <strong className="text-dark">{financialSummary.day_status || "Open"}</strong>
                    </span>
                    <span>
                      Total Net Inflow (Cash + Bank - Expenses):{" "}
                      <strong className="text-primary">
                        {formatRupee(
                          (financialSummary.total_collection || 0) -
                            (financialSummary.total_expenses || 0)
                        )}
                      </strong>
                    </span>
                  </div>
                </CardBody>
              </Card>
            </Col>

            <Col md={5}>
              <Card className="border-0 shadow-sm h-100" style={{ borderRadius: "12px" }}>
                <CardHeader className="bg-white py-3 border-0">
                  <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                    <FaUniversity style={{ color: "#D49A00" }} /> Digital & Bank Collections
                  </h6>
                  <small className="text-muted">
                    Total funds deposited directly to active bank accounts.
                  </small>
                </CardHeader>
                <CardBody className="p-3">
                  <Table hover size="sm" className="align-middle mb-3">
                    <tbody>
                      <tr>
                        <td className="text-muted">UPI / Mobile App Collections:</td>
                        <td className="text-end fw-bold text-primary">
                          {formatRupee(financialSummary.upi_collections)}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Direct Bank Transfers:</td>
                        <td className="text-end fw-bold" style={{ color: "#7C3AED" }}>
                          {formatRupee(modeSummary.bank_total)}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Cheque Collections:</td>
                        <td className="text-end fw-bold text-warning">
                          {formatRupee(modeSummary.cheque_total)}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Bank Expenses / Debits:</td>
                        <td className="text-end fw-bold text-danger">
                          {formatRupee(financialSummary.bank_expenses)}
                        </td>
                      </tr>
                      <tr className="table-light fw-bold border-top">
                        <td>Total Digital Collections:</td>
                        <td className="text-end text-success">
                          {formatRupee(financialSummary.bank_collections)}
                        </td>
                      </tr>
                    </tbody>
                  </Table>

                  <div
                    className="p-3 text-center"
                    style={{
                      borderRadius: "10px",
                      backgroundColor: "#F0FDF4",
                      border: "1px dashed #86EFAC",
                    }}
                  >
                    <div className="small text-muted mb-1 text-uppercase fw-semibold">
                      Total Business Collections (All Modes)
                    </div>
                    <h3 className="fw-bold text-success mb-0">
                      {formatRupee(financialSummary.total_collection)}
                    </h3>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        )}

        {/* -------------------- TAB 4: EXPENSES -------------------- */}
        {(activeTab === "expenses" || window.matchMedia("print").matches) && (
          <Card className="border-0 shadow-sm mb-3" style={{ borderRadius: "12px" }}>
            <CardHeader className="bg-white py-3 border-0 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="fw-bold mb-0 text-dark">Daily Expenses</h6>
                <small className="text-muted">
                  Expenses recorded on this date categorized by payment mode and category.
                </small>
              </div>
              <Badge color="warning" pill className="text-dark">
                {expensesList.length} Expenses | Total: {formatRupee(financialSummary.total_expenses)}
              </Badge>
            </CardHeader>
            <CardBody className="p-0">
              <div className="table-responsive">
                <Table hover size="sm" className="align-middle mb-0 text-nowrap">
                  <thead className="table-light">
                    <tr style={{ fontSize: "0.82rem" }}>
                      <th className="px-3">#</th>
                      <th>Ref No</th>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Notes / Description</th>
                      <th>Payment Mode</th>
                      <th>Bank / Cash Account</th>
                      <th className="text-end px-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="text-center py-5 text-muted">
                          <Spinner size="sm" color="primary" className="me-2" />
                          Loading Expenses...
                        </td>
                      </tr>
                    ) : expensesList.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-5 text-muted">
                          No expenses recorded for this date.
                        </td>
                      </tr>
                    ) : (
                      expensesList.map((e, idx) => (
                        <tr key={e.id || idx} style={{ fontSize: "0.85rem" }}>
                          <td className="px-3 text-muted">{idx + 1}</td>
                          <td className="fw-semibold text-primary">{e.reference_no}</td>
                          <td>{formatDisplayDate(e.date)}</td>
                          <td>
                            <Badge color="light" className="text-dark border">
                              {e.category_name}
                            </Badge>
                          </td>
                          <td>{e.notes}</td>
                          <td>
                            <Badge color={e.is_cash ? "success" : "primary"} pill>
                              {e.payment_mode}
                            </Badge>
                          </td>
                          <td>{e.bank_account_name}</td>
                          <td className="text-end px-3 fw-bold text-danger">
                            {formatRupee(e.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {expensesList.length > 0 && (
                    <tfoot className="table-light fw-bold">
                      <tr style={{ fontSize: "0.85rem" }}>
                        <td colSpan="7" className="px-3 text-uppercase">
                          Total Expenses
                        </td>
                        <td className="text-end px-3 text-danger">
                          {formatRupee(financialSummary.total_expenses)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </Table>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* -------------------- MODAL 1: VIEW SALE DETAILS -------------------- */}
      <Modal isOpen={saleModalOpen} toggle={() => setSaleModalOpen(false)} size="lg">
        <ModalHeader toggle={() => setSaleModalOpen(false)} className="bg-light">
          <span className="fw-bold">Sale Details - {selectedSale?.invoice_no}</span>
        </ModalHeader>
        <ModalBody>
          {selectedSale && (
            <div>
              <Row className="g-3 mb-3">
                <Col md={4}>
                  <div className="small text-muted">Invoice No</div>
                  <div className="fw-bold text-dark fs-6">{selectedSale.invoice_no}</div>
                </Col>
                <Col md={4}>
                  <div className="small text-muted">Date & Time</div>
                  <div className="fw-bold text-dark">
                    {formatDisplayDate(selectedSale.date)} {selectedSale.time}
                  </div>
                </Col>
                <Col md={4}>
                  <div className="small text-muted">Payment Status</div>
                  <Badge color={selectedSale.payment_status === "paid" ? "success" : "danger"} pill>
                    {String(selectedSale.payment_status).toUpperCase()}
                  </Badge>
                </Col>
                <Col md={4}>
                  <div className="small text-muted">Customer Name</div>
                  <div className="fw-bold text-dark">{selectedSale.customer_name}</div>
                </Col>
                <Col md={4}>
                  <div className="small text-muted">Contact Number</div>
                  <div className="fw-semibold">{selectedSale.contact_no}</div>
                </Col>
                <Col md={4}>
                  <div className="small text-muted">Customer GST</div>
                  <div className="fw-semibold">{selectedSale.gst_no}</div>
                </Col>
              </Row>

              <div className="p-3 bg-light rounded mb-3">
                <Row className="text-center">
                  <Col xs={4}>
                    <div className="small text-muted">Total Sale Amount</div>
                    <div className="fw-bold fs-5 text-dark">{formatRupee(selectedSale.total_amount)}</div>
                  </Col>
                  <Col xs={4}>
                    <div className="small text-muted">Total Paid</div>
                    <div className="fw-bold fs-5 text-success">{formatRupee(selectedSale.total_paid)}</div>
                  </Col>
                  <Col xs={4}>
                    <div className="small text-muted">Remaining Outstanding</div>
                    <div className="fw-bold fs-5 text-danger">{formatRupee(selectedSale.outstanding)}</div>
                  </Col>
                </Row>
              </div>

              {/* Payments on this invoice */}
              <h6 className="fw-bold text-dark mb-2">Payment History ({selectedSale.payments?.length || 0})</h6>
              <Table size="sm" bordered responsive className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Payment For</th>
                    <th>Mode</th>
                    <th>Bank Account</th>
                    <th>Ref No</th>
                    <th className="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedSale.payments || []).map((p, idx) => (
                    <tr key={p.id || idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <Badge color={idx === 0 ? "info" : "secondary"}>
                          {p.payment_for || (idx === 0 ? "Advance Payment" : "Balance Payment")}
                        </Badge>
                      </td>
                      <td>{p.method}</td>
                      <td>{p.bank_account_name || "-"}</td>
                      <td>{p.ref_no}</td>
                      <td className="text-end fw-bold text-success">{formatRupee(p.amount)}</td>
                    </tr>
                  ))}
                  {(!selectedSale.payments || selectedSale.payments.length === 0) && (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-3">
                        No payments recorded on this sale.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {selectedSale && (
            <>
              <Button
                color="secondary"
                outline
                size="sm"
                onClick={() => navigate(`/index/salesReceipt/${selectedSale.id}`)}
              >
                <FaFileInvoice className="me-1" /> Tax Invoice
              </Button>
              <Button
                color="dark"
                outline
                size="sm"
                onClick={() => navigate(`/index/thermalReceipt/${selectedSale.id}`)}
              >
                <FaReceipt className="me-1" /> Thermal Print
              </Button>
            </>
          )}
          <Button color="secondary" size="sm" onClick={() => setSaleModalOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* -------------------- MODAL 2: PAYMENT HISTORY -------------------- */}
      <Modal isOpen={paymentsModalOpen} toggle={() => setPaymentsModalOpen(false)}>
        <ModalHeader toggle={() => setPaymentsModalOpen(false)} className="bg-light">
          <span className="fw-bold">Payments for Invoice #{selectedSale?.invoice_no}</span>
        </ModalHeader>
        <ModalBody>
          <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
            <div>
              <div className="small text-muted">Customer</div>
              <strong className="text-dark">{selectedSale?.customer_name}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">Total Invoice Amount</div>
              <strong className="text-dark">{formatRupee(selectedSale?.total_amount)}</strong>
            </div>
          </div>

          <Table size="sm" bordered hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Type</th>
                <th>Mode</th>
                <th>Bank Account</th>
                <th className="text-end">Amount</th>
              </tr>
            </thead>
            <tbody>
              {selectedInvoicePayments.map((p, i) => (
                <tr key={p.id || i}>
                  <td>
                    <Badge color={i === 0 ? "info" : "primary"}>
                      {p.payment_for || (i === 0 ? "Advance" : "Balance")}
                    </Badge>
                  </td>
                  <td>{p.method}</td>
                  <td>{p.bank_account_name || "-"}</td>
                  <td className="text-end fw-bold text-success">{formatRupee(p.amount)}</td>
                </tr>
              ))}
              {selectedInvoicePayments.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center text-muted py-3">
                    No payment history.
                  </td>
                </tr>
              )}
            </tbody>
            {selectedInvoicePayments.length > 0 && (
              <tfoot className="table-light fw-bold">
                <tr>
                  <td colSpan="3">Total Paid</td>
                  <td className="text-end text-success">
                    {formatRupee(
                      selectedInvoicePayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
                    )}
                  </td>
                </tr>
                <tr>
                  <td colSpan="3" className="text-danger">
                    Remaining Balance
                  </td>
                  <td className="text-end text-danger">{formatRupee(selectedSale?.outstanding)}</td>
                </tr>
              </tfoot>
            )}
          </Table>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" size="sm" onClick={() => setPaymentsModalOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
}
