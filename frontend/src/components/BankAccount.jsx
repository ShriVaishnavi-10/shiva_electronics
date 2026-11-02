import React, { useState, useEffect, useRef } from "react";
import {
  Container, Row, Col, Card, CardBody, Table, Button, Modal,
  ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Spinner, Badge, Nav, NavItem, NavLink
} from "reactstrap";
import axios from "axios";
import { apiUrl } from "../config/urls";
import { toast } from "react-toastify";
import {
  FaPlus, FaEdit, FaTrash, FaUniversity, FaCreditCard, FaWallet,
  FaHistory, FaExchangeAlt, FaFilePdf, FaFileExcel, FaSearch,
  FaFilter, FaExternalLinkAlt, FaEye, FaArrowDown, FaArrowUp, FaCalendarAlt
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js";
import { exportBankStatementToExcel } from "../utils/exportBankStatementExcel";

const BankAccount = () => {
  const navigate = useNavigate();
  const pdfPrintRef = useRef(null);

  // Tab State: 'accounts' | 'statement'
  const [activeTab, setActiveTab] = useState("accounts");

  // Accounts State
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    account_name: "",
    account_number: "",
    bank_name: "",
    branch_name: "",
    account_type: "Current",
    opening_balance: 0,
    status: "Active"
  });
  const [saving, setSaving] = useState(false);

  // Fund Transfer State
  const [transferModal, setTransferModal] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferForm, setTransferForm] = useState({
    from_account_id: "",
    to_account_id: "",
    amount: "",
    transfer_date: new Date().toISOString().split("T")[0],
    reference_no: "",
    notes: ""
  });

  // Statement State
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [statementData, setStatementData] = useState({
    account: null,
    company: null,
    opening_balance: 0,
    total_credits: 0,
    total_debits: 0,
    closing_balance: 0,
    current_balance: 0,
    transaction_count: 0,
    transactions: []
  });
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Filters State
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [flowFilter, setFlowFilter] = useState("All"); // 'All' | 'credit' | 'debit'
  const [statementSearch, setStatementSearch] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("All");

  // Transaction Detail Modal
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [detailModal, setDetailModal] = useState(false);

  // 1. Fetch Accounts
  const fetchAccounts = async (preserveSelected = true) => {
    setLoading(true);
    try {
      const res = await axios.get(apiUrl("bank-accounts"));
      const list = Array.isArray(res.data) ? res.data : [];
      setAccounts(list);
      if (list.length > 0 && (!selectedAccountId || !preserveSelected)) {
        setSelectedAccountId(String(list[0].id));
      }
    } catch (err) {
      toast.error("Failed to load bank accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts(false);
  }, []);

  // 2. Fetch Statement for Selected Account & Date Range
  const fetchStatement = async (accId = selectedAccountId, from = fromDate, to = toDate) => {
    if (!accId) return;
    setLoadingStatement(true);
    try {
      const params = {};
      if (from) params.fromDate = from;
      if (to) params.toDate = to;

      const res = await axios.get(`${apiUrl("bank-accounts")}/${accId}/transactions`, { params });
      setStatementData(res.data || {
        account: null,
        company: null,
        opening_balance: 0,
        total_credits: 0,
        total_debits: 0,
        closing_balance: 0,
        current_balance: 0,
        transaction_count: 0,
        transactions: []
      });
    } catch (err) {
      toast.error("Failed to load bank statement");
    } finally {
      setLoadingStatement(false);
    }
  };

  useEffect(() => {
    if (selectedAccountId) {
      fetchStatement(selectedAccountId, fromDate, toDate);
    }
  }, [selectedAccountId, fromDate, toDate]);

  // Account Form Handlers
  const toggleModal = () => {
    setModal(!modal);
    if (!modal) {
      setEditMode(false);
      setFormData({
        account_name: "",
        account_number: "",
        bank_name: "",
        branch_name: "",
        account_type: "Current",
        opening_balance: 0,
        status: "Active"
      });
    }
  };

  const handleEdit = (account) => {
    setFormData(account);
    setEditMode(true);
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editMode) {
        await axios.put(`${apiUrl("bank-accounts")}/${formData.id}`, formData);
        toast.success("Account updated successfully");
      } else {
        await axios.post(apiUrl("bank-accounts"), formData);
        toast.success("Account created successfully");
      }
      fetchAccounts();
      toggleModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save account");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this account?")) return;
    try {
      await axios.delete(`${apiUrl("bank-accounts")}/${id}`);
      toast.success("Account deleted");
      fetchAccounts(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete account");
    }
  };

  // Fund Transfer Handlers
  const openTransferModal = (defaultFromId = "") => {
    setTransferForm({
      from_account_id: defaultFromId || selectedAccountId || (accounts[0] ? String(accounts[0].id) : ""),
      to_account_id: "",
      amount: "",
      transfer_date: new Date().toISOString().split("T")[0],
      reference_no: "",
      notes: ""
    });
    setTransferModal(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferForm.from_account_id || !transferForm.to_account_id) {
      return toast.error("Please select both source and destination accounts");
    }
    if (String(transferForm.from_account_id) === String(transferForm.to_account_id)) {
      return toast.error("Source and Destination accounts cannot be the same");
    }
    const amt = Number(transferForm.amount);
    if (!amt || amt <= 0) {
      return toast.error("Please enter a valid transfer amount greater than zero");
    }

    setTransferLoading(true);
    try {
      const res = await axios.post(`${apiUrl("bank-accounts")}/transfers`, transferForm);
      toast.success(res.data?.message || "Transfer completed successfully");
      setTransferModal(false);
      fetchAccounts(true);
      fetchStatement(selectedAccountId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Transfer failed");
    } finally {
      setTransferLoading(false);
    }
  };

  // Jump directly to statement tab for an account
  const viewAccountStatement = (accId) => {
    setSelectedAccountId(String(accId));
    setActiveTab("statement");
  };

  // Filtered Accounts
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch =
      acc.account_name?.toLowerCase().includes(accountSearch.toLowerCase()) ||
      acc.bank_name?.toLowerCase().includes(accountSearch.toLowerCase()) ||
      acc.account_number?.toLowerCase().includes(accountSearch.toLowerCase());
    const matchesType = accountTypeFilter === "All" || acc.account_type === accountTypeFilter;
    return matchesSearch && matchesType;
  });

  const totalBankBalance = accounts.reduce((sum, a) => sum + Number(a.current_balance || 0), 0);

  // Filtered Statement Transactions
  const rawTransactions = statementData.transactions || [];
  const filteredTransactions = rawTransactions.filter(tx => {
    // Flow Filter (Credit vs Debit)
    if (flowFilter === "credit" && tx.credit <= 0) return false;
    if (flowFilter === "debit" && tx.debit <= 0) return false;

    // Type Filter
    if (typeFilter !== "All") {
      const tType = String(tx.transaction_type || "").toLowerCase();
      const target = typeFilter.toLowerCase();
      if (!tType.includes(target)) return false;
    }

    // Text Search
    if (statementSearch.trim()) {
      const q = statementSearch.toLowerCase();
      const matchNo = tx.transaction_no?.toLowerCase().includes(q);
      const matchRef = tx.reference_no?.toLowerCase().includes(q);
      const matchDesc = tx.description?.toLowerCase().includes(q);
      const matchParty = tx.party_name?.toLowerCase().includes(q);
      const matchNotes = tx.notes?.toLowerCase().includes(q);
      if (!matchNo && !matchRef && !matchDesc && !matchParty && !matchNotes) {
        return false;
      }
    }

    return true;
  });

  // Quick Date Presets
  const setDatePreset = (preset) => {
    const now = new Date();
    if (preset === "today") {
      const todayStr = now.toISOString().split("T")[0];
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "this_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      setFromDate(firstDay);
      setToDate(lastDay);
    } else if (preset === "last_30") {
      const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const todayStr = now.toISOString().split("T")[0];
      setFromDate(past30);
      setToDate(todayStr);
    } else if (preset === "all") {
      setFromDate("");
      setToDate("");
    }
  };

  // Open Details Modal
  const handleOpenDetail = (txn) => {
    setSelectedTxn(txn);
    setDetailModal(true);
  };

  // Source navigation
  const openSourceTransaction = (txn) => {
    if (!txn) return;
    if (txn.source_type === "sale" && txn.source_id) {
      navigate(`/index/salesReceipt/${txn.source_id}`);
    } else if (txn.source_type === "expense" && txn.source_id) {
      navigate(`/index/expenses/edit/${txn.source_id}`);
    }
  };

  // ==================== EXCEL EXPORT ====================
  const handleExportExcel = async () => {
    if (!filteredTransactions.length && !statementData.account) {
      return toast.warn("No transactions to export");
    }

    setExportingExcel(true);
    try {
      await exportBankStatementToExcel({
        transactions: filteredTransactions,
        account: statementData.account || {},
        statementData,
        fromDate,
        toDate,
      });
      toast.success("Excel statement exported successfully");
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("Failed to export Excel statement");
    } finally {
      setExportingExcel(false);
    }
  };

  // ==================== PDF EXPORT ====================
  const handleExportPdf = () => {
    if (!pdfPrintRef.current) return;
    setExportingPdf(true);

    const account = statementData.account || {};
    const safeName = (account.account_name || "Account").replace(/[^a-zA-Z0-9]/g, "_");

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${safeName}_Bank_Statement.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] }
    };

    html2pdf()
      .from(pdfPrintRef.current)
      .set(opt)
      .save()
      .then(() => {
        setExportingPdf(false);
        toast.success("PDF statement exported successfully");
      })
      .catch((err) => {
        console.error("PDF export error:", err);
        setExportingPdf(false);
        toast.error("Failed to generate PDF");
      });
  };

  const selectedAccountObj = accounts.find(a => String(a.id) === String(selectedAccountId)) || statementData.account;

  return (
    <Container fluid className="p-4" style={{ backgroundColor: "#F8FAFC", minHeight: "100vh" }}>
      {/* HEADER SECTION */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: "#0F172A", letterSpacing: "-0.5px" }}>
            Bank Accounts & Statements
          </h2>
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted fw-semibold">
              Total Liquidity:
            </span>
            <span className="fs-4 fw-bold" style={{ color: "#0D9488" }}>
              ₹{totalBankBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <Badge color="light" className="text-dark border px-2 py-1">
              {accounts.length} Accounts
            </Badge>
          </div>
        </div>

        <div className="d-flex gap-2">
          <Button
            color="warning"
            className="fw-bold px-3 shadow-sm d-flex align-items-center gap-2 text-dark"
            onClick={() => openTransferModal()}
          >
            <FaExchangeAlt /> Transfer Funds
          </Button>

          <Button
            color="primary"
            className="fw-bold px-3 shadow-sm d-flex align-items-center gap-2"
            onClick={toggleModal}
          >
            <FaPlus /> Add Bank Account
          </Button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <Nav tabs className="mb-4 border-bottom" style={{ borderBottomWidth: "2px" }}>
        <NavItem>
          <NavLink
            className={`fw-bold px-4 py-2 ${activeTab === "accounts" ? "active text-primary border-primary border-bottom-0" : "text-muted"}`}
            style={{ cursor: "pointer", fontSize: "1.05rem" }}
            onClick={() => setActiveTab("accounts")}
          >
            <FaUniversity className="me-2" /> Bank Accounts ({accounts.length})
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={`fw-bold px-4 py-2 ${activeTab === "statement" ? "active text-primary border-primary border-bottom-0" : "text-muted"}`}
            style={{ cursor: "pointer", fontSize: "1.05rem" }}
            onClick={() => setActiveTab("statement")}
          >
            <FaHistory className="me-2" /> Bank Statement
            {selectedAccountObj ? ` (${selectedAccountObj.account_name})` : ""}
          </NavLink>
        </NavItem>
      </Nav>

      {/* ========================================================= */}
      {/* TAB 1: BANK ACCOUNTS MANAGEMENT */}
      {/* ========================================================= */}
      {activeTab === "accounts" && (
        <>
          <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "12px" }}>
            <CardBody className="p-3">
              <Row className="align-items-center g-3">
                <Col md={7}>
                  <div className="position-relative">
                    <Input
                      type="text"
                      placeholder="Search accounts by name, bank name or account number..."
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      className="ps-5 py-2 border-0 bg-light"
                      style={{ borderRadius: "8px" }}
                    />
                    <FaSearch
                      className="position-absolute text-muted"
                      style={{ left: "15px", top: "50%", transform: "translateY(-50%)" }}
                    />
                  </div>
                </Col>
                <Col md={3}>
                  <Input
                    type="select"
                    value={accountTypeFilter}
                    onChange={(e) => setAccountTypeFilter(e.target.value)}
                    className="py-2 border-0 bg-light"
                    style={{ borderRadius: "8px" }}
                  >
                    <option value="All">All Account Types</option>
                    <option value="Current">Current Account</option>
                    <option value="Savings">Savings Account</option>
                    <option value="Overdraft">Overdraft Account</option>
                  </Input>
                </Col>
                <Col md={2} className="text-end">
                  <span className="text-muted small fw-semibold">
                    Showing {filteredAccounts.length} of {accounts.length}
                  </span>
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* ACCOUNTS TABLE */}
          <Card className="border-0 shadow-sm" style={{ borderRadius: "12px" }}>
            <CardBody className="p-0">
              <div className="table-responsive">
                <Table hover className="align-middle mb-0 text-center">
                  <thead style={{ backgroundColor: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                    <tr>
                      <th className="py-3 px-4 text-start">Account Details</th>
                      <th className="py-3">Bank & Branch</th>
                      <th className="py-3">Account Number</th>
                      <th className="py-3">Type</th>
                      <th className="py-3 text-end">Current Balance</th>
                      <th className="py-3">Status</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="text-center py-5">
                          <Spinner color="primary" />
                        </td>
                      </tr>
                    ) : filteredAccounts.length > 0 ? (
                      filteredAccounts.map((acc) => (
                        <tr key={acc.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td className="py-3 px-4 text-start">
                            <div className="fw-bold text-dark fs-6">{acc.account_name}</div>
                            <div className="small text-muted">ID #{acc.id}</div>
                          </td>
                          <td className="py-3">
                            <div className="fw-semibold text-dark">{acc.bank_name || "-"}</div>
                            <div className="small text-muted">{acc.branch_name || "-"}</div>
                          </td>
                          <td className="py-3 fw-semibold text-muted font-monospace">
                            {acc.account_number || "-"}
                          </td>
                          <td className="py-3">
                            <Badge color={acc.account_type === "Savings" ? "info" : "primary"} pill className="px-2 py-1">
                              {acc.account_type}
                            </Badge>
                          </td>
                          <td className="py-3 text-end fw-bold fs-6" style={{ color: Number(acc.current_balance) >= 0 ? "#0D9488" : "#DC2626" }}>
                            ₹{Number(acc.current_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3">
                            <Badge color={acc.status === "Active" ? "success" : "secondary"} pill>
                              {acc.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="d-flex justify-content-center align-items-center gap-2">
                              <Button
                                color="success"
                                size="sm"
                                outline
                                className="fw-bold d-flex align-items-center gap-1"
                                onClick={() => viewAccountStatement(acc.id)}
                                title="View Statement"
                              >
                                <FaHistory /> Statement
                              </Button>
                              <Button
                                color="light"
                                size="sm"
                                className="text-primary border"
                                onClick={() => handleEdit(acc)}
                                title="Edit"
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                color="light"
                                size="sm"
                                className="text-danger border"
                                onClick={() => handleDelete(acc.id)}
                                title="Delete"
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center text-muted py-5 fw-semibold">
                          No bank accounts found matching criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {/* ========================================================= */}
      {/* TAB 2: BANK STATEMENT VIEW (FULL-FEATURED) */}
      {/* ========================================================= */}
      {activeTab === "statement" && (
        <>
          {/* FILTER CONTROL CARD */}
          <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "12px" }}>
            <CardBody className="p-4">
              <Row className="g-3 align-items-end">
                {/* Account Selector */}
                <Col lg={3} md={6}>
                  <Label className="fw-bold small text-muted text-uppercase">
                    Bank Account *
                  </Label>
                  <Input
                    type="select"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="fw-bold py-2 border-2"
                    style={{ borderColor: "#0D9488", color: "#0F172A" }}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_name} ({a.bank_name || "Bank"}) - ₹{Number(a.current_balance || 0).toFixed(2)}
                      </option>
                    ))}
                  </Input>
                </Col>

                {/* Date From */}
                <Col lg={2} md={3}>
                  <Label className="fw-bold small text-muted text-uppercase">
                    From Date
                  </Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="py-2"
                  />
                </Col>

                {/* Date To */}
                <Col lg={2} md={3}>
                  <Label className="fw-bold small text-muted text-uppercase">
                    To Date
                  </Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="py-2"
                  />
                </Col>

                {/* Transaction Type */}
                <Col lg={2} md={4}>
                  <Label className="fw-bold small text-muted text-uppercase">
                    Type
                  </Label>
                  <Input
                    type="select"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="py-2"
                  >
                    <option value="All">All Types</option>
                    <option value="Sale Advance">Sale Advance</option>
                    <option value="Sale Balance Payment">Sale Balance Payment</option>
                    <option value="Sale Payment">Sale Payment</option>
                    <option value="Expense">Expense</option>
                    <option value="Vendor Payment">Vendor Payment</option>
                    <option value="Transfer">Bank Transfer</option>
                  </Input>
                </Col>

                {/* Flow Filter */}
                <Col lg={2} md={4}>
                  <Label className="fw-bold small text-muted text-uppercase">
                    Flow
                  </Label>
                  <Input
                    type="select"
                    value={flowFilter}
                    onChange={(e) => setFlowFilter(e.target.value)}
                    className="py-2"
                  >
                    <option value="All">All (Debit & Credit)</option>
                    <option value="credit">Credit Only (+ Inflow)</option>
                    <option value="debit">Debit Only (- Outflow)</option>
                  </Input>
                </Col>

                {/* Reset / Actions */}
                <Col lg={1} md={4} className="text-end">
                  <Button
                    color="light"
                    className="w-100 border text-muted py-2 fw-semibold"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                      setTypeFilter("All");
                      setFlowFilter("All");
                      setStatementSearch("");
                    }}
                    title="Reset Filters"
                  >
                    Reset
                  </Button>
                </Col>
              </Row>

              {/* QUICK PRESETS & TEXT SEARCH ROW */}
              <Row className="mt-3 g-2 align-items-center">
                <Col md={6}>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <span className="small text-muted fw-bold text-uppercase">Quick:</span>
                    <Button size="sm" color="light" className="border py-1 px-2 small" onClick={() => setDatePreset("today")}>
                      Today
                    </Button>
                    <Button size="sm" color="light" className="border py-1 px-2 small" onClick={() => setDatePreset("this_month")}>
                      This Month
                    </Button>
                    <Button size="sm" color="light" className="border py-1 px-2 small" onClick={() => setDatePreset("last_30")}>
                      Last 30 Days
                    </Button>
                    <Button size="sm" color="light" className="border py-1 px-2 small" onClick={() => setDatePreset("all")}>
                      All Time
                    </Button>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="position-relative">
                    <Input
                      type="text"
                      placeholder="Search by Txn No, Ref No, Customer, Vendor, Notes..."
                      value={statementSearch}
                      onChange={(e) => setStatementSearch(e.target.value)}
                      className="ps-5 py-2 border-0 bg-light"
                      style={{ borderRadius: "8px" }}
                    />
                    <FaSearch
                      className="position-absolute text-muted"
                      style={{ left: "15px", top: "50%", transform: "translateY(-50%)" }}
                    />
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* FINANCIAL SUMMARY METRICS BAR */}
          <Row className="mb-4 g-3">
            {/* Opening Balance */}
            <Col lg={2} md={4} sm={6}>
              <div className="p-3 bg-white border rounded-3 shadow-sm h-100">
                <div className="text-muted small fw-bold text-uppercase mb-1">
                  Opening Balance
                </div>
                <div className="fs-5 fw-bold text-dark">
                  ₹{Number(statementData.opening_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-muted x-small mt-1">
                  As of {fromDate ? new Date(fromDate).toLocaleDateString("en-GB") : "Account Start"}
                </div>
              </div>
            </Col>

            {/* Total Inflow / Credits */}
            <Col lg={3} md={4} sm={6}>
              <div className="p-3 bg-white border rounded-3 shadow-sm h-100">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted small fw-bold text-uppercase">Total Inflow (Credits)</span>
                  <FaArrowDown className="text-success" />
                </div>
                <div className="fs-5 fw-bold text-success">
                  +₹{Number(statementData.total_credits || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-muted x-small mt-1">
                  Sales, Advances & Inward Transfers
                </div>
              </div>
            </Col>

            {/* Total Outflow / Debits */}
            <Col lg={3} md={4} sm={6}>
              <div className="p-3 bg-white border rounded-3 shadow-sm h-100">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted small fw-bold text-uppercase">Total Outflow (Debits)</span>
                  <FaArrowUp className="text-danger" />
                </div>
                <div className="fs-5 fw-bold text-danger">
                  -₹{Number(statementData.total_debits || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-muted x-small mt-1">
                  Expenses, Vendors & Outward Transfers
                </div>
              </div>
            </Col>

            {/* Closing Balance */}
            <Col lg={2} md={4} sm={6}>
              <div className="p-3 bg-white border rounded-3 shadow-sm h-100" style={{ borderLeft: "4px solid #2563EB" }}>
                <div className="text-muted small fw-bold text-uppercase mb-1">
                  Closing Balance
                </div>
                <div className="fs-5 fw-bold" style={{ color: "#2563EB" }}>
                  ₹{Number(statementData.closing_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-muted x-small mt-1">
                  Period Net: ₹{(statementData.total_credits - statementData.total_debits).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </Col>

            {/* Total Transactions & Actions */}
            <Col lg={2} md={8} sm={12}>
              <div className="p-3 bg-white border rounded-3 shadow-sm h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">Transactions</div>
                  <div className="fs-5 fw-bold text-dark">{filteredTransactions.length} entries</div>
                </div>
                <div className="d-flex gap-2 mt-2">
                  <Button
                    color="danger"
                    size="sm"
                    className="fw-bold flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                    onClick={handleExportPdf}
                    disabled={exportingPdf || loadingStatement}
                  >
                    <FaFilePdf /> PDF
                  </Button>
                  <Button
                    color="success"
                    size="sm"
                    className="fw-bold flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                    onClick={handleExportExcel}
                    disabled={exportingExcel || loadingStatement}
                  >
                    <FaFileExcel /> {exportingExcel ? "Exporting..." : "Excel"}
                  </Button>
                </div>
              </div>
            </Col>
          </Row>

          {/* STATEMENT TABLE CARD */}
          <Card className="border-0 shadow-sm" style={{ borderRadius: "12px" }}>
            <CardBody className="p-0">
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead style={{ backgroundColor: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                    <tr>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3">Transaction No</th>
                      <th className="py-3">Type</th>
                      <th className="py-3" style={{ minWidth: "220px" }}>Description & Party</th>
                      <th className="py-3">Reference No</th>
                      <th className="py-3 text-end text-danger">Debit (Outflow)</th>
                      <th className="py-3 text-end text-success">Credit (Inflow)</th>
                      <th className="py-3 text-end">Running Balance</th>
                      <th className="py-3 text-center px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingStatement ? (
                      <tr>
                        <td colSpan="9" className="text-center py-5">
                          <Spinner color="primary" />
                          <div className="mt-2 text-muted fw-semibold">Loading statement transactions...</div>
                        </td>
                      </tr>
                    ) : filteredTransactions.length > 0 ? (
                      filteredTransactions.map((tx, idx) => {
                        const isCredit = tx.credit > 0;
                        return (
                          <tr
                            key={idx}
                            style={{ borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}
                            onClick={() => handleOpenDetail(tx)}
                          >
                            <td className="py-3 px-3">
                              <div className="fw-bold text-dark">
                                {tx.date ? new Date(tx.date).toLocaleDateString("en-GB") : "-"}
                              </div>
                              <div className="text-muted x-small">
                                {tx.datetime ? new Date(tx.datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}
                              </div>
                            </td>
                            <td className="py-3 fw-semibold font-monospace small text-primary">
                              {tx.transaction_no || "-"}
                            </td>
                            <td className="py-3">
                              <Badge
                                color={
                                  tx.transaction_type === "Sale Advance"
                                    ? "info"
                                    : tx.transaction_type === "Sale Balance Payment"
                                    ? "success"
                                    : tx.transaction_type === "Sale Payment"
                                    ? "success"
                                    : tx.transaction_type === "Expense"
                                    ? "danger"
                                    : tx.transaction_type === "Vendor Payment"
                                    ? "warning"
                                    : "primary"
                                }
                                pill
                                className="px-2 py-1"
                              >
                                {tx.transaction_type}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: "260px" }}>
                                {tx.description}
                              </div>
                              {tx.party_name && (
                                <div className="text-muted small">Party: {tx.party_name}</div>
                              )}
                            </td>
                            <td className="py-3 small text-muted font-monospace">
                              {tx.reference_no || "-"}
                            </td>
                            <td className="py-3 text-end fw-bold text-danger">
                              {!isCredit ? `-₹${Number(tx.debit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                            </td>
                            <td className="py-3 text-end fw-bold text-success">
                              {isCredit ? `+₹${Number(tx.credit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                            </td>
                            <td className="py-3 text-end fw-bold text-dark fs-6">
                              ₹{Number(tx.running_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 text-center px-3" onClick={(e) => e.stopPropagation()}>
                              <Button
                                color="light"
                                size="sm"
                                className="border text-primary"
                                onClick={() => handleOpenDetail(tx)}
                                title="View Details"
                              >
                                <FaEye />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="9" className="text-center text-muted py-5 fw-semibold">
                          No transactions found for the selected bank account and filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ADD / EDIT BANK ACCOUNT */}
      {/* ========================================================= */}
      <Modal isOpen={modal} toggle={toggleModal} size="lg" centered>
        <Form onSubmit={handleSubmit}>
          <ModalHeader toggle={toggleModal} className="bg-light border-0">
            <span className="fw-bold">{editMode ? "Update Bank Account" : "Add New Bank Account"}</span>
          </ModalHeader>
          <ModalBody className="p-4">
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label className="fw-bold">Account Name *</Label>
                  <Input
                    required
                    type="text"
                    placeholder="e.g. SBI Main Account"
                    value={formData.account_name}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label className="fw-bold">Account Number</Label>
                  <Input
                    type="text"
                    placeholder="XXXX-XXXX-XXXX"
                    value={formData.account_number || ""}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label className="fw-bold">Bank Name</Label>
                  <Input
                    type="text"
                    placeholder="e.g. State Bank of India"
                    value={formData.bank_name || ""}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label className="fw-bold">Branch Name</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Tirunelveli Main"
                    value={formData.branch_name || ""}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label className="fw-bold">Account Type</Label>
                  <Input
                    type="select"
                    value={formData.account_type || "Current"}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  >
                    <option value="Current">Current</option>
                    <option value="Savings">Savings</option>
                    <option value="Overdraft">Overdraft</option>
                  </Input>
                </FormGroup>
              </Col>
              {!editMode && (
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-bold">Opening Balance (₹)</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.opening_balance}
                      onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                    />
                  </FormGroup>
                </Col>
              )}
              {editMode && (
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-bold">Status</Label>
                    <Input
                      type="select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </Input>
                  </FormGroup>
                </Col>
              )}
            </Row>
          </ModalBody>
          <ModalFooter className="border-0 bg-light">
            <Button color="secondary" outline onClick={toggleModal} disabled={saving}>
              Cancel
            </Button>
            <Button color="primary" type="submit" disabled={saving} className="px-4">
              {saving ? <Spinner size="sm" /> : editMode ? "Update Account" : "Create Account"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: FUND TRANSFER BETWEEN ACCOUNTS */}
      {/* ========================================================= */}
      <Modal isOpen={transferModal} toggle={() => setTransferModal(false)} centered size="md">
        <Form onSubmit={handleTransferSubmit}>
          <ModalHeader toggle={() => setTransferModal(false)} className="bg-light border-0">
            <div className="d-flex align-items-center gap-2">
              <FaExchangeAlt className="text-warning" />
              <span className="fw-bold">Transfer Funds Between Accounts</span>
            </div>
          </ModalHeader>
          <ModalBody className="p-4">
            <div className="d-flex flex-column gap-3">
              <div>
                <Label className="fw-bold small text-muted text-uppercase">From Account (Source) *</Label>
                <Input
                  required
                  type="select"
                  value={transferForm.from_account_id}
                  onChange={(e) => setTransferForm({ ...transferForm, from_account_id: e.target.value })}
                  className="py-2"
                >
                  <option value="">Select Source Account</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.account_name} - Available: ₹{Number(a.current_balance || 0).toFixed(2)}
                    </option>
                  ))}
                </Input>
              </div>

              <div>
                <Label className="fw-bold small text-muted text-uppercase">To Account (Destination) *</Label>
                <Input
                  required
                  type="select"
                  value={transferForm.to_account_id}
                  onChange={(e) => setTransferForm({ ...transferForm, to_account_id: e.target.value })}
                  className="py-2"
                >
                  <option value="">Select Destination Account</option>
                  {accounts
                    .filter(a => String(a.id) !== String(transferForm.from_account_id))
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.account_name} - Current: ₹{Number(a.current_balance || 0).toFixed(2)}
                      </option>
                    ))}
                </Input>
              </div>

              <Row>
                <Col md={6}>
                  <Label className="fw-bold small text-muted text-uppercase">Amount (₹) *</Label>
                  <Input
                    required
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    className="py-2 fw-bold text-primary"
                    style={{ fontSize: "1.1rem" }}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fw-bold small text-muted text-uppercase">Transfer Date *</Label>
                  <Input
                    required
                    type="date"
                    value={transferForm.transfer_date}
                    onChange={(e) => setTransferForm({ ...transferForm, transfer_date: e.target.value })}
                    className="py-2"
                  />
                </Col>
              </Row>

              <div>
                <Label className="fw-bold small text-muted text-uppercase">Reference / Transaction No</Label>
                <Input
                  type="text"
                  placeholder="e.g. IMPS-123456, CHQ-0012"
                  value={transferForm.reference_no}
                  onChange={(e) => setTransferForm({ ...transferForm, reference_no: e.target.value })}
                />
              </div>

              <div>
                <Label className="fw-bold small text-muted text-uppercase">Notes / Reason</Label>
                <Input
                  type="textarea"
                  rows="2"
                  placeholder="Purpose of transfer..."
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="border-0 bg-light">
            <Button color="secondary" outline onClick={() => setTransferModal(false)} disabled={transferLoading}>
              Cancel
            </Button>
            <Button color="warning" type="submit" disabled={transferLoading} className="px-4 fw-bold text-dark">
              {transferLoading ? <Spinner size="sm" /> : "Confirm Transfer"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: TRANSACTION DETAILS MODAL */}
      {/* ========================================================= */}
      <Modal isOpen={detailModal} toggle={() => setDetailModal(false)} centered size="lg">
        <ModalHeader toggle={() => setDetailModal(false)} className="bg-light border-0">
          <div className="d-flex align-items-center gap-2">
            <FaEye className="text-primary" />
            <span className="fw-bold">Transaction Details</span>
          </div>
        </ModalHeader>
        <ModalBody className="p-4">
          {selectedTxn && (
            <div className="d-flex flex-column gap-3">
              {/* Top Banner */}
              <div className="p-3 rounded-3 border d-flex justify-content-between align-items-center" style={{ backgroundColor: "#F8FAFC" }}>
                <div>
                  <div className="text-muted small text-uppercase fw-bold">Transaction Number</div>
                  <div className="fs-5 fw-bold text-primary font-monospace">{selectedTxn.transaction_no}</div>
                </div>
                <div className="text-end">
                  <Badge
                    color={selectedTxn.credit > 0 ? "success" : "danger"}
                    pill
                    className="px-3 py-2 fs-6"
                  >
                    {selectedTxn.credit > 0
                      ? `+₹${Number(selectedTxn.credit).toLocaleString("en-IN", { minimumFractionDigits: 2 })} (Credit)`
                      : `-₹${Number(selectedTxn.debit).toLocaleString("en-IN", { minimumFractionDigits: 2 })} (Debit)`}
                  </Badge>
                </div>
              </div>

              {/* 14 Field Grid */}
              <Row className="g-3">
                <Col md={6}>
                  <div className="p-2 border rounded bg-white">
                    <span className="text-muted small fw-bold">Date & Time: </span>
                    <span className="fw-semibold text-dark">
                      {selectedTxn.date ? new Date(selectedTxn.date).toLocaleDateString("en-GB") : "-"}
                      {selectedTxn.datetime ? ` ${new Date(selectedTxn.datetime).toLocaleTimeString("en-GB")}` : ""}
                    </span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="p-2 border rounded bg-white">
                    <span className="text-muted small fw-bold">Transaction Type: </span>
                    <Badge color="info" pill>{selectedTxn.transaction_type}</Badge>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="p-2 border rounded bg-white">
                    <span className="text-muted small fw-bold">Sale / Invoice No: </span>
                    <span className="fw-semibold text-dark">{selectedTxn.invoice_no || "-"}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="p-2 border rounded bg-white">
                    <span className="text-muted small fw-bold">Customer / Vendor: </span>
                    <span className="fw-semibold text-dark">{selectedTxn.party_name || "-"}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="p-2 border rounded bg-white">
                    <span className="text-muted small fw-bold">Payment Mode: </span>
                    <span className="fw-semibold text-dark">{selectedTxn.payment_mode || "-"}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="p-2 border rounded bg-white">
                    <span className="text-muted small fw-bold">Reference / Cheque ID: </span>
                    <span className="fw-semibold font-monospace text-dark">{selectedTxn.reference_no || "-"}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="p-2 border rounded bg-white">
                    <span className="text-muted small fw-bold">Running Balance: </span>
                    <span className="fw-bold text-dark">
                      ₹{Number(selectedTxn.running_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="p-2 border rounded bg-white">
                    <span className="text-muted small fw-bold">Branch: </span>
                    <span className="fw-semibold text-dark">{selectedTxn.branch_name || "Main Branch"}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="p-2 border rounded bg-white">
                    <span className="text-muted small fw-bold">Created By: </span>
                    <span className="fw-semibold text-dark">{selectedTxn.created_by_name || "System"}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="p-2 border rounded bg-white">
                    <span className="text-muted small fw-bold">Source Link: </span>
                    <span className="badge bg-light text-dark border text-uppercase">{selectedTxn.source_type || "-"}</span>
                  </div>
                </Col>
                <Col md={12}>
                  <div className="p-2 border rounded bg-white">
                    <div className="text-muted small fw-bold mb-1">Description:</div>
                    <div className="fw-semibold text-dark">{selectedTxn.description || "-"}</div>
                  </div>
                </Col>
                {selectedTxn.notes && (
                  <Col md={12}>
                    <div className="p-2 border rounded bg-white">
                      <div className="text-muted small fw-bold mb-1">Notes:</div>
                      <div className="text-dark small">{selectedTxn.notes}</div>
                    </div>
                  </Col>
                )}
              </Row>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="border-0 bg-light d-flex justify-content-between">
          <div>
            {selectedTxn?.source_id && (selectedTxn.source_type === "sale" || selectedTxn.source_type === "expense") && (
              <Button
                color="primary"
                outline
                className="d-flex align-items-center gap-2 fw-semibold"
                onClick={() => {
                  setDetailModal(false);
                  openSourceTransaction(selectedTxn);
                }}
              >
                <FaExternalLinkAlt /> Open Source {selectedTxn.source_type === "sale" ? "Sale Receipt" : "Expense"}
              </Button>
            )}
          </div>
          <Button color="secondary" onClick={() => setDetailModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* ========================================================= */}
      {/* HIDDEN PRINT TEMPLATE FOR PROFESSIONAL PDF EXPORT */}
      {/* ========================================================= */}
      <div style={{ display: "none" }}>
        <div ref={pdfPrintRef} style={{ padding: "20px", color: "#000", fontFamily: "Arial, sans-serif", fontSize: "11px" }}>
          {/* Header */}
          <div style={{ borderBottom: "2px solid #000", paddingBottom: "12px", marginBottom: "15px" }}>
            <table style={{ width: "100%" }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "top" }}>
                    <h2 style={{ margin: "0 0 4px 0", fontSize: "20px", color: "#000", fontWeight: "bold" }}>
                      {statementData.company?.company_name || "CLAVIS TECH WORKS"}
                    </h2>
                    <div style={{ fontSize: "10px", color: "#444" }}>
                      {statementData.company?.address || ""}<br />
                      {statementData.company?.city} {statementData.company?.state} - {statementData.company?.country}<br />
                      GSTIN: <strong>{statementData.company?.gst_no || "33AGYPF2675G2Z3"}</strong>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", verticalAlign: "top" }}>
                    <div style={{ display: "inline-block", padding: "6px 14px", backgroundColor: "#f0f0f0", border: "1px solid #ccc", fontWeight: "bold", fontSize: "14px" }}>
                      BANK ACCOUNT STATEMENT
                    </div>
                    <div style={{ fontSize: "10px", marginTop: "6px", color: "#555" }}>
                      Generated: {new Date().toLocaleString("en-GB")}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Account Details & Statement Period */}
          <table style={{ width: "100%", marginBottom: "15px", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ width: "50%", padding: "8px", border: "1px solid #ccc", backgroundColor: "#fafafa" }}>
                  <strong>Account Name:</strong> {statementData.account?.account_name}<br />
                  <strong>Bank Name:</strong> {statementData.account?.bank_name || "N/A"}<br />
                  <strong>Account Number:</strong> {statementData.account?.account_number || "N/A"}<br />
                  <strong>Branch / Type:</strong> {statementData.account?.branch_name || "Main"} | {statementData.account?.account_type || "Current"}
                </td>
                <td style={{ width: "50%", padding: "8px", border: "1px solid #ccc", backgroundColor: "#fafafa", verticalAlign: "top" }}>
                  <strong>Statement Period:</strong> {fromDate ? new Date(fromDate).toLocaleDateString("en-GB") : "Account Start"} to {toDate ? new Date(toDate).toLocaleDateString("en-GB") : "Present"}<br />
                  <strong>Currency:</strong> INR (₹)<br />
                  <strong>Status:</strong> {statementData.account?.status || "Active"}<br />
                  <strong>Total Records:</strong> {filteredTransactions.length} transactions
                </td>
              </tr>
            </tbody>
          </table>

          {/* Summary Box */}
          <table style={{ width: "100%", marginBottom: "15px", borderCollapse: "collapse", textAlign: "center" }}>
            <thead>
              <tr style={{ backgroundColor: "#eaeaea" }}>
                <th style={{ border: "1px solid #ccc", padding: "6px", fontSize: "10px" }}>OPENING BALANCE</th>
                <th style={{ border: "1px solid #ccc", padding: "6px", fontSize: "10px", color: "#006600" }}>TOTAL CREDITS (INFLOW)</th>
                <th style={{ border: "1px solid #ccc", padding: "6px", fontSize: "10px", color: "#cc0000" }}>TOTAL DEBITS (OUTFLOW)</th>
                <th style={{ border: "1px solid #ccc", padding: "6px", fontSize: "10px" }}>CLOSING BALANCE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold", fontSize: "12px" }}>
                  ₹{Number(statementData.opening_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold", fontSize: "12px", color: "#006600" }}>
                  +₹{Number(statementData.total_credits || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold", fontSize: "12px", color: "#cc0000" }}>
                  -₹{Number(statementData.total_debits || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold", fontSize: "12px", color: "#000099" }}>
                  ₹{Number(statementData.closing_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Transactions Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f2f2f2" }}>
                <th style={{ border: "1px solid #bbb", padding: "6px 4px", textAlign: "left", width: "11%" }}>Date</th>
                <th style={{ border: "1px solid #bbb", padding: "6px 4px", textAlign: "left", width: "14%" }}>Txn No</th>
                <th style={{ border: "1px solid #bbb", padding: "6px 4px", textAlign: "left", width: "12%" }}>Type</th>
                <th style={{ border: "1px solid #bbb", padding: "6px 4px", textAlign: "left", width: "27%" }}>Description</th>
                <th style={{ border: "1px solid #bbb", padding: "6px 4px", textAlign: "left", width: "12%" }}>Ref No</th>
                <th style={{ border: "1px solid #bbb", padding: "6px 4px", textAlign: "right", width: "12%" }}>Debit (₹)</th>
                <th style={{ border: "1px solid #bbb", padding: "6px 4px", textAlign: "right", width: "12%" }}>Credit (₹)</th>
                <th style={{ border: "1px solid #bbb", padding: "6px 4px", textAlign: "right", width: "12%" }}>Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx, idx) => (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fbfbfb" }}>
                    <td style={{ border: "1px solid #ddd", padding: "5px 4px" }}>
                      {tx.date ? new Date(tx.date).toLocaleDateString("en-GB") : "-"}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "5px 4px", fontFamily: "monospace" }}>
                      {tx.transaction_no || "-"}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "5px 4px" }}>
                      {tx.transaction_type}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "5px 4px" }}>
                      {tx.description}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "5px 4px", fontFamily: "monospace" }}>
                      {tx.reference_no || "-"}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "5px 4px", textAlign: "right", color: tx.debit > 0 ? "#cc0000" : "#666" }}>
                      {tx.debit > 0 ? tx.debit.toFixed(2) : "-"}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "5px 4px", textAlign: "right", color: tx.credit > 0 ? "#006600" : "#666" }}>
                      {tx.credit > 0 ? tx.credit.toFixed(2) : "-"}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "5px 4px", textAlign: "right", fontWeight: "bold" }}>
                      {Number(tx.running_balance).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ border: "1px solid #ddd", padding: "15px", textAlign: "center", color: "#666" }}>
                    No transactions recorded during this period.
                  </td>
                </tr>
              )}
              {/* Table Footer Totals */}
              <tr style={{ backgroundColor: "#eee", fontWeight: "bold" }}>
                <td colSpan="5" style={{ border: "1px solid #bbb", padding: "6px 4px", textAlign: "right" }}>
                  TOTALS:
                </td>
                <td style={{ border: "1px solid #bbb", padding: "6px 4px", textAlign: "right", color: "#cc0000" }}>
                  {statementData.total_debits.toFixed(2)}
                </td>
                <td style={{ border: "1px solid #bbb", padding: "6px 4px", textAlign: "right", color: "#006600" }}>
                  {statementData.total_credits.toFixed(2)}
                </td>
                <td style={{ border: "1px solid #bbb", padding: "6px 4px", textAlign: "right", color: "#000099" }}>
                  {statementData.closing_balance.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Sign-off Footer */}
          <div style={{ marginTop: "40px", paddingTop: "15px", display: "flex", justifyContent: "space-between" }}>
            <div style={{ width: "40%", textAlign: "center", borderTop: "1px dashed #666", paddingTop: "5px", fontSize: "10px" }}>
              Prepared By
            </div>
            <div style={{ width: "40%", textAlign: "center", borderTop: "1px dashed #666", paddingTop: "5px", fontSize: "10px" }}>
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          .x-small { font-size: 0.75rem; }
          .font-monospace { font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        `}
      </style>
    </Container>
  );
};

export default BankAccount;
