import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  Row,
  Col,
  Input,
  Button,
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Label,
  Nav,
  NavItem,
  NavLink,
  Badge,
  Card,
  CardBody,
  Spinner,
} from "reactstrap";
import {
  FaPlus,
  FaFileCsv,
  FaSearch,
  FaEdit,
  FaTrash,
  FaUndo,
  FaEye,
  FaPrint,
  FaExchangeAlt,
  FaReceipt,
  FaCheckCircle,
  FaMoneyBillWave,
  FaFileInvoice,
  FaMoneyCheckAlt,
} from "react-icons/fa";
import ReactPaginate from "react-paginate";
import { toast } from "react-toastify";
import { apiUrl } from "../config/urls";

const API = apiUrl("purchases");
const LIST_API = `${API}/list`;
const DELETE_PURCHASE = (purchaseId) => apiUrl(`purchase/delete/${purchaseId}`);
const ENTRY_OPTIONS = [25, 50, 100, 500, 1000];

/** Display: DD-MM-YYYY */
function formatPurchaseDate(value) {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  let d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, mo, da] = s.split("-").map(Number);
    d = new Date(y, mo - 1, da, 0, 0, 0, 0);
  } else {
    d = new Date(s);
  }
  if (Number.isNaN(d.getTime())) return s;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

const cleanDocNo = (num) => (num ? String(num).replace(/SSL-/gi, "SE-").replace(/CTW-/gi, "SE-").replace(/\b(SSL|CTW)\b/g, "SE") : "");

export default function PurchaseList() {
  const navigate = useNavigate();
  const location = useLocation();

  // Active Tab: 'purchases' | 'returns'
  const [activeTab, setActiveTab] = useState("purchases");

  // Purchases State
  const [data, setData] = useState([]);
  const [vendor, setVendor] = useState("");
  const [product, setProduct] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [limit, setLimit] = useState(25);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // View Purchase Modal
  const [viewData, setViewData] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);
  const [paymentHistoryError, setPaymentHistoryError] = useState("");
  const viewRequestId = useRef(0);

  // Delete Purchase Modal
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Bank Accounts
  const [bankAccounts, setBankAccounts] = useState([]);

  // ================= Purchase Payment / Credit Modal State =================
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "Cash",
    bank_account_id: "",
    cheque_no: "",
    cheque_date: new Date().toISOString().slice(0, 10),
    collection_person: "",
    reference_no: "",
    notes: "",
  });
  const [savingPayment, setSavingPayment] = useState(false);

  // ================= Purchase Returns State =================
  const [returnsData, setReturnsData] = useState([]);
  const [returnsTotal, setReturnsTotal] = useState(0);
  const [returnsSummary, setReturnsSummary] = useState({ grand_qty: 0, grand_amount: 0 });
  const [returnsPage, setReturnsPage] = useState(1);
  const [returnsLimit, setReturnsLimit] = useState(25);
  const [returnsLoading, setReturnsLoading] = useState(false);

  // Create Return Modal State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [loadingReturnDetails, setLoadingReturnDetails] = useState(false);
  const [returnPurchase, setReturnPurchase] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [refundType, setRefundType] = useState("Bank / Cash Refund");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  const [returnNotes, setReturnNotes] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // View Return Modal State
  const [viewReturnOpen, setViewReturnOpen] = useState(false);
  const [viewReturnData, setViewReturnData] = useState(null);

  // Cancel/Delete Return Modal State
  const [deleteReturnModal, setDeleteReturnModal] = useState(false);
  const [deleteReturnTarget, setDeleteReturnTarget] = useState(null);

  // Check URL query param for tab
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tab") === "returns") {
      setActiveTab("returns");
    }
  }, [location.search]);

  // Load Bank Accounts
  useEffect(() => {
    axios
      .get(apiUrl("bank-accounts"))
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setBankAccounts(list);
        if (list.length > 0 && !selectedBankAccountId) {
          setSelectedBankAccountId(String(list[0].id));
        }
      })
      .catch(() => {});
  }, []);

  // ---------------- Purchases Query ----------------
  const runListQuery = async (pageNum, limitNum) => {
    setLoading(true);
    try {
      const res = await axios.get(LIST_API, {
        params: {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          vendor: vendor || undefined,
          product: product || undefined,
          page: pageNum,
          limit: limitNum,
        },
      });
      setData(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error("Failed to load purchase list");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Returns Query ----------------
  const runReturnsQuery = async (pageNum, limitNum) => {
    setReturnsLoading(true);
    try {
      const res = await axios.get(apiUrl("purchase-returns/list"), {
        params: {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          vendor: vendor || undefined,
          page: pageNum,
          limit: limitNum,
        },
      });
      setReturnsData(res.data.data || []);
      setReturnsTotal(res.data.total || 0);
      setReturnsSummary(res.data.summary || { grand_qty: 0, grand_amount: 0 });
    } catch (err) {
      toast.error("Failed to load purchase returns");
      setReturnsData([]);
      setReturnsTotal(0);
    } finally {
      setReturnsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "purchases") {
      runListQuery(page, limit);
    } else {
      runReturnsQuery(returnsPage, returnsLimit);
    }
  }, [activeTab, page, limit, returnsPage, returnsLimit]);

  const handleSearch = () => {
    if (activeTab === "purchases") {
      if (page !== 1) setPage(1);
      else runListQuery(1, limit);
    } else {
      if (returnsPage !== 1) setReturnsPage(1);
      else runReturnsQuery(1, returnsLimit);
    }
  };

  // ---------------- View Purchase ----------------
  const viewPurchase = async (id) => {
    const requestId = ++viewRequestId.current;
    setPaymentHistory([]);
    setPaymentHistoryError("");
    setLoadingPaymentHistory(true);
    try {
      const res = await axios.get(`${API}/${id}`);
      if (requestId !== viewRequestId.current) return;
      setViewData(res.data);
      setViewOpen(true);

      try {
        const paymentsRes = await axios.get(apiUrl(`purchases/${id}/payments`));
        if (requestId === viewRequestId.current) {
          setPaymentHistory(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
        }
      } catch {
        if (requestId === viewRequestId.current) {
          setPaymentHistoryError("Failed to load payment history");
          toast.error("Failed to load purchase payment history");
        }
      }
    } catch {
      if (requestId === viewRequestId.current) {
        toast.error("Failed to load purchase details");
      }
    } finally {
      if (requestId === viewRequestId.current) {
        setLoadingPaymentHistory(false);
      }
    }
  };

  const closeViewPurchase = () => {
    viewRequestId.current += 1;
    setViewOpen(false);
    setLoadingPaymentHistory(false);
  };

  // ---------------- Delete Purchase ----------------
  const openDeleteConfirm = (row) => {
    if (!row?.purchase_id) return;
    const no = row.purchase_no ? cleanDocNo(row.purchase_no) : `#${row.purchase_id}`;
    const vendorPart = row.vendor_name ? ` · ${row.vendor_name}` : "";
    setDeleteTarget({ id: row.purchase_id, label: `${no}${vendorPart}` });
    setDeleteModal(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteModal(false);
    setDeleteTarget(null);
  };

  const confirmDeletePurchase = async () => {
    if (!deleteTarget?.id) return;
    try {
      await axios.delete(DELETE_PURCHASE(deleteTarget.id));
      toast.success("Purchase deleted successfully");
      closeDeleteConfirm();
      runListQuery(page, limit);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete purchase");
    }
  };

  // ================= Open Pay Modal =================
  const openPayModal = (purchase) => {
    setPayTarget(purchase);
    const due = Math.max(
      0,
      Number(
        purchase.due_amount != null
          ? purchase.due_amount
          : Number(purchase.total || 0) - Number(purchase.paid_amount || 0)
      )
    );
    setPayForm({
      amount: due > 0 ? String(due) : "",
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: "Cash",
      bank_account_id: bankAccounts.length > 0 ? String(bankAccounts[0].id) : "",
      cheque_no: "",
      cheque_date: new Date().toISOString().slice(0, 10),
      collection_person: "",
      reference_no: "",
      notes: "",
    });
    setPayModalOpen(true);
  };

  const handlePaySubmit = async () => {
    if (!payTarget) return;
    const amt = Number(payForm.amount);
    if (!amt || amt <= 0) {
      return toast.error("Please enter a valid payment amount");
    }
    setSavingPayment(true);
    try {
      await axios.post(apiUrl(`purchases/${payTarget.purchase_id}/payments`), {
        vendor_id: payTarget.vendor_id,
        amount: amt,
        payment_date: payForm.payment_date,
        payment_method: payForm.payment_method,
        bank_account_id: payForm.payment_method !== "Cash" ? payForm.bank_account_id : null,
        cheque_no: payForm.payment_method === "Cheque" ? payForm.cheque_no : null,
        cheque_date: payForm.payment_method === "Cheque" ? payForm.cheque_date : null,
        collection_person: payForm.collection_person ? payForm.collection_person.trim() : null,
        reference_no: payForm.reference_no ? payForm.reference_no.trim() : null,
        notes: payForm.notes ? payForm.notes.trim() : null,
      });
      toast.success("Payment recorded successfully");
      setPayModalOpen(false);
      runListQuery(page, limit);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  };

  // ================= Open Return Modal =================
  const openReturnModal = async (purchaseId) => {
    setLoadingReturnDetails(true);
    setReturnModalOpen(true);
    setReturnNotes("");
    setReturnDate(new Date().toISOString().split("T")[0]);

    try {
      const res = await axios.get(apiUrl(`purchase-returns/purchase/${purchaseId}`));
      const { purchase, items } = res.data;
      setReturnPurchase(purchase);
      setReturnItems(
        (items || []).map((it) => ({
          ...it,
          return_qty: "",
        }))
      );
      const isOriginalCash = String(purchase.payment_type || "").toLowerCase() === "cash";
      if (isOriginalCash) {
        setPaymentMode("Cash");
        setSelectedBankAccountId("");
      } else {
        setPaymentMode("Bank Transfer");
        if (purchase.bank_account_id) {
          setSelectedBankAccountId(String(purchase.bank_account_id));
        } else if (bankAccounts.length > 0) {
          setSelectedBankAccountId(String(bankAccounts[0].id));
        } else {
          setSelectedBankAccountId("");
        }
      }
      setRefundType("Bank / Cash Refund");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load purchase items for return");
      setReturnModalOpen(false);
    } finally {
      setLoadingReturnDetails(false);
    }
  };

  const handleReturnQtyChange = (idx, val, maxAvail) => {
    const updated = [...returnItems];
    let qtyNum = val === "" ? "" : Number(val);
    if (qtyNum !== "" && (Number.isNaN(qtyNum) || qtyNum < 0)) {
      qtyNum = 0;
    }
    if (qtyNum !== "" && qtyNum > maxAvail) {
      toast.warning(`Cannot return more than available quantity (${maxAvail})`);
      qtyNum = maxAvail;
    }
    updated[idx].return_qty = qtyNum;
    setReturnItems(updated);
  };

  // Submit Purchase Return
  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    const validItems = returnItems.filter((it) => Number(it.return_qty) > 0);
    if (validItems.length === 0) {
      toast.error("Please enter a return quantity greater than 0 for at least one item.");
      return;
    }

    const isCashMode = paymentMode === "Cash";
    if (refundType === "Bank / Cash Refund" && !isCashMode && !selectedBankAccountId) {
      toast.error("Please select a bank account to receive the refund.");
      return;
    }

    setSubmittingReturn(true);
    try {
      const payload = {
        purchase_id: returnPurchase.id,
        purchase_no: returnPurchase.purchase_no,
        vendor_id: returnPurchase.vendor_id,
        return_date: returnDate,
        refund_type: refundType,
        bank_account_id: refundType === "Bank / Cash Refund" && !isCashMode && selectedBankAccountId ? Number(selectedBankAccountId) : null,
        payment_mode: paymentMode,
        items: validItems.map((it) => ({
          purchase_item_id: it.purchase_item_id,
          product_id: it.product_id,
          product_name: it.product_name,
          hsncode: it.hsncode,
          return_qty: Number(it.return_qty),
          unit_price: Number(it.unit_price),
          tax_group_id: it.tax_group_id,
          total_amount: Number(it.return_qty) * Number(it.unit_price),
        })),
        notes: returnNotes,
      };

      const res = await axios.post(apiUrl("purchase-returns"), payload);
      toast.success(res.data.message || "Purchase return created successfully!");
      setReturnModalOpen(false);

      // Refresh lists
      runListQuery(page, limit);
      runReturnsQuery(1, returnsLimit);
      setActiveTab("returns");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to process purchase return");
    } finally {
      setSubmittingReturn(false);
    }
  };

  // View Return Details
  const viewReturn = async (id) => {
    try {
      const res = await axios.get(apiUrl(`purchase-returns/${id}`));
      setViewReturnData(res.data);
      setViewReturnOpen(true);
    } catch (err) {
      toast.error("Failed to load return details");
    }
  };

  // Delete/Cancel Return
  const openDeleteReturnConfirm = (row) => {
    setDeleteReturnTarget(row);
    setDeleteReturnModal(true);
  };

  const confirmDeleteReturn = async () => {
    if (!deleteReturnTarget?.id) return;
    try {
      await axios.delete(apiUrl(`purchase-returns/${deleteReturnTarget.id}`));
      toast.success("Purchase return cancelled! Stock and bank balance restored.");
      setDeleteReturnModal(false);
      setDeleteReturnTarget(null);
      runReturnsQuery(returnsPage, returnsLimit);
      runListQuery(page, limit);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel purchase return");
    }
  };

  // CSV Export for Purchases
  const downloadCSV = () => {
    const headers = [
      "Purchase No",
      "Date",
      "Vendor",
      "Company",
      "Vehicle No",
      "Product",
      "Qty",
      "PR Qty",
      "MRP",
      "Total",
      "Payment Type",
    ];
    const rows = data.map((r) => {
      const items = Array.isArray(r.items) ? r.items : [];
      let pNames, qtys, prQtys, prices, totals;
      if (items.length > 0) {
        pNames = items.map((it) => it.product_name ?? "—").join("\n");
        qtys = items.map((it) => (Number(it.qty) || 0).toFixed(2)).join("\n");
        prQtys = items
          .map((it) => (Number(it.pr_qty != null ? it.pr_qty : it.return_qty || 0)).toFixed(2))
          .join("\n");
        prices = items.map((it) => it.price ?? "").join("\n");
        totals =
          items.map((it) => (it.line_total != null ? it.line_total : it.total)).join("\n") +
          (items.length > 1
            ? `\nTotal: ${Number(r.line_total != null ? r.line_total : r.total).toFixed(2)}`
            : "");
      } else {
        pNames = r.product_name || "";
        qtys = (Number(r.qty) || 0).toFixed(2);
        prQtys = (Number(r.pr_qty || 0)).toFixed(2);
        prices = r.price ?? "";
        totals = r.total ?? "";
      }

      return [
        cleanDocNo(r.purchase_no) || "",
        formatPurchaseDate(r.purchase_date),
        r.vendor_name || "",
        r.company_name || "",
        r.vehicle_no || "",
        pNames,
        qtys,
        prQtys,
        prices,
        totals,
        r.payment_type || "",
      ];
    });
    const escape = (val) => {
      const s = String(val ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n"))
        return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    let csv = headers.map(escape).join(",") + "\n";
    rows.forEach((r) => (csv += r.map(escape).join(",") + "\n"));

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `purchase_list_${fromDate || "all"}_${toDate || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("CSV downloaded");
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const returnsTotalPages = Math.ceil(returnsTotal / returnsLimit) || 1;

  // Compute live return modal totals
  const totalReturnQtyCalc = returnItems.reduce((sum, it) => sum + (Number(it.return_qty) || 0), 0);
  const totalRefundAmountCalc = returnItems.reduce(
    (sum, it) => sum + (Number(it.return_qty) || 0) * (Number(it.unit_price) || 0),
    0
  );

  return (
    <>
      {/* Top Header & Navigation Tabs */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <Nav tabs className="border-bottom-0">
          <NavItem>
            <NavLink
              className={`fw-bold cursor-pointer ${activeTab === "purchases" ? "active border-primary text-primary" : "text-muted"}`}
              style={{ cursor: "pointer", fontSize: "15px" }}
              onClick={() => setActiveTab("purchases")}
            >
              Purchases List
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={`fw-bold cursor-pointer ${activeTab === "returns" ? "active border-primary text-primary" : "text-muted"}`}
              style={{ cursor: "pointer", fontSize: "15px" }}
              onClick={() => setActiveTab("returns")}
            >
              <FaUndo className="me-1 text-warning" /> Purchase Returns (Debit Notes)
              {returnsTotal > 0 && (
                <Badge color="warning" pill className="ms-2 text-dark">
                  {returnsTotal}
                </Badge>
              )}
            </NavLink>
          </NavItem>
        </Nav>

        {activeTab === "purchases" && (
          <Button color="primary" onClick={() => navigate("/index/purchaseForm")}>
            <FaPlus className="me-1" /> Create Purchase
          </Button>
        )}
      </div>

      {/* FILTERS */}
      <Row className="mb-3 g-2">
        <Col xs={6} md={2}>
          <Label className="small text-muted fw-bold">From Date</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </Col>
        <Col xs={6} md={2}>
          <Label className="small text-muted fw-bold">To Date</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </Col>
        <Col xs={6} md={activeTab === "purchases" ? 2 : 3}>
          <Label className="small text-muted fw-bold">Vendor / Company</Label>
          <Input
            placeholder="Search vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          />
        </Col>
        {activeTab === "purchases" && (
          <Col xs={6} md={2}>
            <Label className="small text-muted fw-bold">Product</Label>
            <Input
              placeholder="Product name"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            />
          </Col>
        )}
        <Col xs={6} md={2} className="d-flex align-items-end">
          <Button color="primary" onClick={handleSearch} className="w-100">
            <FaSearch className="me-1" /> Search
          </Button>
        </Col>
        {activeTab === "purchases" && (
          <Col xs={6} md={2} className="d-flex align-items-end">
            <Button color="success" onClick={downloadCSV} className="w-100">
              <FaFileCsv className="me-1" /> CSV
            </Button>
          </Col>
        )}
      </Row>

      {/* ================= TAB 1: PURCHASES LIST ================= */}
      {activeTab === "purchases" && (
        <>
          <div className="table-responsive">
            <Table bordered hover striped size="sm" className="text-center align-middle text-nowrap">
              <thead className="table-dark">
                <tr>
                  <th>S.No</th>
                  <th>Purchase No</th>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th>Products</th>
                  <th>Qty</th>
                  <th>PR Qty</th>
                  <th>Price</th>
                  <th>Total Amount</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th style={{ minWidth: "180px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="14" className="py-4">
                      <Spinner size="sm" color="primary" /> Loading purchases...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="14" className="py-4 text-muted">
                      No purchase records found
                    </td>
                  </tr>
                ) : (
                  data.map((r, i) => {
                    const items = Array.isArray(r.items) ? r.items : [];
                    return (
                      <tr key={r.purchase_id || i}>
                        <td>{(page - 1) * limit + i + 1}</td>
                        <td className="fw-bold text-primary">
                          <span>{cleanDocNo(r.purchase_no) || "—"}</span>
                          {r.po_no && (
                            <small className="badge bg-light text-secondary border ms-1">PO: {r.po_no}</small>
                          )}
                        </td>
                        <td>{formatPurchaseDate(r.purchase_date)}</td>
                        <td className="text-start">
                          <span className="fw-semibold">{r.company_name || r.vendor_name || "—"}</span>
                          {r.company_name && r.vendor_name && r.company_name !== r.vendor_name && (
                            <small className="text-muted ms-1">{r.vendor_name}</small>
                          )}
                        </td>
                        <td className="text-start">
                          {items.length > 0 ? (
                            <span>
                              {items.map((it, idx) => (
                                <React.Fragment key={idx}>
                                  {idx > 0 && <span className="mx-1 text-muted">,</span>}
                                  {it.product_name ?? "—"}
                                </React.Fragment>
                              ))}
                            </span>
                          ) : (
                            r.product_name || "—"
                          )}
                        </td>
                        <td>
                          {items.length > 0 ? (
                            <span>
                              {items.map((it, idx) => (
                                <React.Fragment key={idx}>
                                  {idx > 0 && <span className="mx-1 text-muted">,</span>}
                                  {Number(it.qty || 0).toFixed(2)}
                                </React.Fragment>
                              ))}
                              {items.length > 1 && (
                                <span className="fw-bold ms-1">
                                  {Number(r.qty || 0).toFixed(2)}
                                </span>
                              )}
                            </span>
                          ) : (
                            Number(r.qty || 0).toFixed(2)
                          )}
                        </td>
                        <td>
                          {items.length > 0 ? (
                            <span>
                              {items.map((it, idx) => {
                                const retQ = Number(it.pr_qty != null ? it.pr_qty : it.return_qty || 0);
                                return (
                                  <React.Fragment key={idx}>
                                    {idx > 0 && <span className="mx-1 text-muted">,</span>}
                                    <span className={retQ > 0 ? "text-danger fw-bold" : "text-muted"}>
                                    {retQ.toFixed(2)}
                                    </span>
                                  </React.Fragment>
                                );
                              })}
                              {items.length > 1 && (
                                <span className={`fw-bold ms-1 ${Number(r.pr_qty || 0) > 0 ? "text-danger" : "text-muted"}`}>
                                  {Number(r.pr_qty || 0).toFixed(2)}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className={Number(r.pr_qty || 0) > 0 ? "text-danger fw-bold" : "text-muted"}>
                              {Number(r.pr_qty || 0).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td>
                          {items.length > 0 ? (
                            <span>
                              {items.map((it, idx) => (
                                <React.Fragment key={idx}>
                                  {idx > 0 && <span className="mx-1 text-muted">,</span>}
                                  {it.price != null && it.price !== ""
                                    ? Number(it.price).toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    : "-"}
                                </React.Fragment>
                              ))}
                            </span>
                          ) : (
                            r.price != null && r.price !== ""
                              ? Number(r.price).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : "-"
                          )}
                        </td>
                        <td className="fw-bold">
                          {items.length > 0 ? (
                            <span>
                              {items.map((it, idx) => (
                                <React.Fragment key={idx}>
                                  {idx > 0 && <span className="mx-1 text-muted">,</span>}
                                  ₹{Number(it.line_total != null ? it.line_total : it.total).toFixed(2)}
                                </React.Fragment>
                              ))}
                              {items.length > 1 && (
                                <span className="text-primary ms-1">
                                  Total: ₹{Math.round(Number(r.line_total != null ? r.line_total : r.total))}
                                </span>
                              )}
                            </span>
                          ) : (
                            r.line_total != null
                              ? `₹${Math.round(Number(r.line_total))}`
                              : `₹${Math.round(Number(r.total || 0))}`
                          )}
                        </td>
                        <td className="text-success fw-bold">
                          ₹{Number(r.paid_amount || 0).toFixed(2)}
                        </td>
                        <td className={Number(r.due_amount || 0) > 0.01 ? "text-danger fw-bold" : "text-muted"}>
                          ₹{Number(r.due_amount || 0).toFixed(2)}
                        </td>
                        <td>
                          {(() => {
                            const isPaid = (r.payment_status || "").toLowerCase() === "paid" || Number(r.due_amount || 0) <= 0.01;
                            const isPartial = !isPaid && ((r.payment_status || "").toLowerCase() === "partial" || Number(r.paid_amount || 0) > 0.01);
                            if (isPaid) return <Badge color="success">PAID</Badge>;
                            if (isPartial) return <Badge color="warning" className="text-dark">PARTIAL</Badge>;
                            return <Badge color="danger">DUE</Badge>;
                          })()}
                        </td>
                        <td>
                          {r.status === "Ordered" ? (
                            <Badge color="warning" className="text-dark">Ordered (PO)</Badge>
                          ) : (
                            <Badge color="success">Received</Badge>
                          )}
                        </td>
                        <td>
                          <div className="d-flex justify-content-center gap-1">
                            {/* PO Invoice Print */}
                            <Button
                              size="sm"
                              color="dark"
                              outline
                              title="PO Invoice / Print"
                              onClick={() => navigate(`/purchase-order/${r.purchase_id}`)}
                            >
                              <FaFileInvoice />
                            </Button>
                            {/* View Purchase */}
                            <Button
                              size="sm"
                              color="info"
                              outline
                              title="View Purchase"
                              onClick={() => viewPurchase(r.purchase_id)}
                            >
                              <FaEye />
                            </Button>
                            {/* Pay Due Button (if due > 0 or payment_status !== 'paid') */}
                            {Number(r.due_amount || 0) > 0.01 && (
                              <Button
                                size="sm"
                                color="success"
                                outline
                                title="Pay Due / Add Payment"
                                onClick={() => openPayModal(r)}
                              >
                                <FaMoneyBillWave />
                              </Button>
                            )}
                            {/* Edit Purchase */}
                            <Button
                              size="sm"
                              color="primary"
                              outline
                              title="Edit Purchase"
                              onClick={() =>
                                navigate("/index/purchaseForm", {
                                  state: { purchaseId: r.purchase_id },
                                })
                              }
                            >
                              <FaEdit />
                            </Button>
                            {/* Return Button */}
                            <Button
                              size="sm"
                              color="warning"
                              outline
                              title="Purchase Return / Debit Note"
                              onClick={() => openReturnModal(r.purchase_id)}
                            >
                              <FaUndo className="me-1" /> Return
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <Row className="mt-3 align-items-center">
              <Col xs={12} className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="small text-muted">
                  Page {page} of {totalPages} ({total} purchases)
                </div>
                <ReactPaginate
                  previousLabel={"← Prev"}
                  nextLabel={"Next →"}
                  pageCount={totalPages}
                  forcePage={Math.min(page - 1, Math.max(0, totalPages - 1))}
                  onPageChange={({ selected }) => setPage(selected + 1)}
                  pageRangeDisplayed={3}
                  marginPagesDisplayed={1}
                  containerClassName={"pagination mb-0 flex-wrap"}
                  pageClassName={"page-item"}
                  pageLinkClassName={"page-link"}
                  previousClassName={"page-item"}
                  previousLinkClassName={"page-link"}
                  nextClassName={"page-item"}
                  nextLinkClassName={"page-link"}
                  activeClassName={"active"}
                  breakClassName={"page-item"}
                  breakLinkClassName={"page-link"}
                  disabledClassName={"disabled"}
                />
              </Col>
            </Row>
          )}
        </>
      )}

      {/* ================= TAB 2: PURCHASE RETURNS LIST ================= */}
      {activeTab === "returns" && (
        <>
          {/* Summary Cards */}
          <Row className="mb-3 g-3">
            <Col md={4}>
              <Card className="border-0 shadow-sm bg-primary text-white">
                <CardBody className="py-2 px-3">
                  <div className="small text-white-50">Total Return Records</div>
                  <h4 className="mb-0 fw-bold">{returnsTotal}</h4>
                </CardBody>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 shadow-sm bg-warning text-dark">
                <CardBody className="py-2 px-3">
                  <div className="small text-dark text-opacity-75">Total Returned Qty</div>
                  <h4 className="mb-0 fw-bold">{Number(returnsSummary.grand_qty || 0).toFixed(2)}</h4>
                </CardBody>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 shadow-sm bg-success text-white">
                <CardBody className="py-2 px-3">
                  <div className="small text-white-50">Total Refunded Amount</div>
                  <h4 className="mb-0 fw-bold">
                    ₹{Number(returnsSummary.grand_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </h4>
                </CardBody>
              </Card>
            </Col>
          </Row>

          <div className="table-responsive">
            <Table bordered hover striped size="sm" className="text-center align-middle text-nowrap">
              <thead className="table-dark">
                <tr>
                  <th>S.No</th>
                  <th>Return No</th>
                  <th>Date</th>
                  <th>Original Purchase</th>
                  <th>Vendor</th>
                  <th>Items Returned</th>
                  <th>Return Qty</th>
                  <th>Refund Amount</th>
                  <th>Refund Mode</th>
                  <th>Bank Account</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {returnsLoading ? (
                  <tr>
                    <td colSpan="11" className="py-4">
                      <Spinner size="sm" color="primary" /> Loading returns...
                    </td>
                  </tr>
                ) : returnsData.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="py-4 text-muted">
                      No purchase return records found
                    </td>
                  </tr>
                ) : (
                  returnsData.map((ret, i) => (
                    <tr key={ret.id || i}>
                      <td>{(returnsPage - 1) * returnsLimit + i + 1}</td>
                      <td className="fw-bold text-danger">{ret.return_no}</td>
                      <td>{formatPurchaseDate(ret.return_date)}</td>
                      <td className="text-primary fw-bold">{cleanDocNo(ret.purchase_no) || "—"}</td>
                      <td>{ret.vendor_display_name || "—"}</td>
                      <td className="text-start small" style={{ maxWidth: "250px" }}>
                        {ret.items_summary || "—"}
                      </td>
                      <td className="fw-bold">{Number(ret.total_qty || 0).toFixed(2)}</td>
                      <td className="fw-bold text-success">
                        ₹{Number(ret.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        {ret.refund_type === "Bank / Cash Refund" ? (
                          <Badge color={ret.payment_mode === "Cash" ? "warning" : "success"}>
                            {ret.payment_mode === "Cash" ? "Cash Refund" : (ret.payment_mode || "Bank Refund")}
                          </Badge>
                        ) : (
                          <Badge color="info">Vendor Credit</Badge>
                        )}
                      </td>
                      <td className="small">
                        {ret.payment_mode === "Cash" ? (
                          <span className="text-muted">Direct Cash</span>
                        ) : ret.bank_account_name ? (
                          <span>
                            <strong>{ret.bank_account_name}</strong>
                            {ret.bank_account_no && (
                              <span className="text-muted small ms-1">A/C: {ret.bank_account_no}</span>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <div className="d-flex justify-content-center gap-1">
                          <Button
                            size="sm"
                            color="info"
                            outline
                            title="View Debit Note"
                            onClick={() => viewReturn(ret.id)}
                          >
                            <FaEye />
                          </Button>
                          <Button
                            size="sm"
                            color="danger"
                            outline
                            title="Cancel Return (Restore Stock & Balance)"
                            onClick={() => openDeleteReturnConfirm(ret)}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {/* Returns Pagination */}
          {returnsTotal > 0 && (
            <Row className="mt-3 align-items-center">
              <Col xs={12} className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="small text-muted">
                  Page {returnsPage} of {returnsTotalPages} ({returnsTotal} returns)
                </div>
                <ReactPaginate
                  previousLabel={"← Prev"}
                  nextLabel={"Next →"}
                  pageCount={returnsTotalPages}
                  forcePage={Math.min(returnsPage - 1, Math.max(0, returnsTotalPages - 1))}
                  onPageChange={({ selected }) => setReturnsPage(selected + 1)}
                  pageRangeDisplayed={3}
                  marginPagesDisplayed={1}
                  containerClassName={"pagination mb-0 flex-wrap"}
                  pageClassName={"page-item"}
                  pageLinkClassName={"page-link"}
                  previousClassName={"page-item"}
                  previousLinkClassName={"page-link"}
                  nextClassName={"page-item"}
                  nextLinkClassName={"page-link"}
                  activeClassName={"active"}
                  breakClassName={"page-item"}
                  breakLinkClassName={"page-link"}
                  disabledClassName={"disabled"}
                />
              </Col>
            </Row>
          )}
        </>
      )}

      {/* ================= MODAL: CREATE PURCHASE RETURN ================= */}
      <Modal isOpen={returnModalOpen} toggle={() => setReturnModalOpen(false)} size="xl">
        <ModalHeader toggle={() => setReturnModalOpen(false)} className="bg-light">
          <FaUndo className="me-2 text-warning" />
          Create Purchase Return (Debit Note)
        </ModalHeader>
        <ModalBody>
          {loadingReturnDetails ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
              <p className="mt-2 text-muted">Loading purchase details...</p>
            </div>
          ) : returnPurchase ? (
            <form onSubmit={handleSubmitReturn}>
              {/* Purchase Details Bar */}
              <Card className="mb-3 border bg-light">
                <CardBody className="py-2 px-3">
                  <Row className="small">
                    <Col md={3}>
                      <strong>Purchase No:</strong>{" "}
                      <span className="text-primary fw-bold">{cleanDocNo(returnPurchase.purchase_no)}</span>
                    </Col>
                    <Col md={3}>
                      <strong>Purchase Date:</strong> {formatPurchaseDate(returnPurchase.purchase_date)}
                    </Col>
                    <Col md={3}>
                      <strong>Vendor:</strong> {returnPurchase.company_name || returnPurchase.vendor_name}
                    </Col>
                    <Col md={3}>
                      <strong>Vendor Contact:</strong> {returnPurchase.vendor_mobile || "—"}
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {/* Items Return Table */}
              <h6 className="fw-bold text-dark mb-2">Select Items to Return:</h6>
              <div className="table-responsive mb-3">
                <Table bordered hover size="sm" className="align-middle text-center">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th className="text-start">Product Name</th>
                      <th>Purchased Qty</th>
                      <th>Already Returned</th>
                      <th>Available to Return</th>
                      <th>Unit Price (₹)</th>
                      <th style={{ width: "160px" }}>Return Qty</th>
                      <th>Item Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnItems.map((item, idx) => {
                      const avail = item.available_return_qty || 0;
                      const returnQtyNum = Number(item.return_qty) || 0;
                      const lineTotal = returnQtyNum * Number(item.unit_price || 0);

                      return (
                        <tr key={idx} className={returnQtyNum > 0 ? "table-warning" : ""}>
                          <td>{idx + 1}</td>
                          <td className="text-start fw-bold">{item.product_name}</td>
                          <td>{Number(item.purchased_qty).toFixed(2)}</td>
                          <td>
                            <span className={item.already_returned_qty > 0 ? "text-danger fw-bold" : "text-muted"}>
                              {Number(item.already_returned_qty).toFixed(2)}
                            </span>
                          </td>
                          <td className="fw-bold text-success">{avail.toFixed(2)}</td>
                          <td>₹{Number(item.unit_price).toFixed(2)}</td>
                          <td>
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              max={avail}
                              placeholder="0"
                              disabled={avail <= 0}
                              value={item.return_qty}
                              onChange={(e) => handleReturnQtyChange(idx, e.target.value, avail)}
                              className="text-center fw-bold"
                            />
                          </td>
                          <td className="fw-bold text-end">₹{lineTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="table-light fw-bold">
                    <tr>
                      <td colSpan="6" className="text-end">
                        Total Return Summary:
                      </td>
                      <td className="text-center text-primary">{totalReturnQtyCalc.toFixed(2)}</td>
                      <td className="text-end text-success fs-6">
                        ₹{totalRefundAmountCalc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </Table>
              </div>

              {/* Refund Options & Bank Account */}
              <Card className="border mb-3">
                <CardBody className="py-3">
                  <h6 className="fw-bold text-primary mb-3">Refund & Payment Settings</h6>
                  <Row className="g-3">
                    <Col md={3}>
                      <Label className="small fw-bold">Return Date *</Label>
                      <Input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        required
                      />
                    </Col>
                    <Col md={3}>
                      <Label className="small fw-bold">Refund Method *</Label>
                      <Input
                        type="select"
                        value={refundType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRefundType(val);
                          if (val === "Vendor Credit / Ledger") {
                            setSelectedBankAccountId("");
                          }
                        }}
                      >
                        <option value="Bank / Cash Refund">Bank / Cash Refund</option>
                        <option value="Vendor Credit / Ledger">Vendor Credit / Ledger Adjustment</option>
                      </Input>
                    </Col>

                    {refundType === "Bank / Cash Refund" && (
                      <>
                        <Col md={3}>
                          <Label className="small fw-bold">Payment Mode *</Label>
                          <Input
                            type="select"
                            value={paymentMode}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPaymentMode(val);
                              if (val === "Cash") {
                                setSelectedBankAccountId("");
                              } else if (!selectedBankAccountId && bankAccounts.length > 0) {
                                setSelectedBankAccountId(String(bankAccounts[0].id));
                              }
                            }}
                          >
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                            <option value="UPI">UPI / GPay / PhonePe</option>
                            <option value="Cheque">Cheque</option>
                          </Input>
                        </Col>

                        {paymentMode !== "Cash" && (
                          <Col md={3}>
                            <Label className="small fw-bold">Credit to Bank Account *</Label>
                            <Input
                              type="select"
                              value={selectedBankAccountId}
                              onChange={(e) => setSelectedBankAccountId(e.target.value)}
                              required
                            >
                              <option value="">-- Select Bank Account --</option>
                              {bankAccounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.account_name} ({acc.bank_name || "Bank"}) - Bal: ₹
                                  {Number(acc.current_balance || 0).toLocaleString("en-IN")}
                                </option>
                              ))}
                            </Input>
                          </Col>
                        )}
                      </>
                    )}

                    <Col md={12}>
                      <Label className="small fw-bold">Reason / Notes</Label>
                      <Input
                        type="textarea"
                        rows="2"
                        placeholder="Reason for return (defective, damaged, excess goods, etc.)"
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                      />
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {/* Info Alert */}
              <div className="alert alert-info py-2 px-3 small d-flex align-items-center mb-0">
                <FaCheckCircle className="me-2 text-info fs-5 flex-shrink-0" />
                <div>
                  <strong>Stock & Account Sync:</strong> Submitting this return will immediately reduce
                  stock quantities from inventory.
                  {refundType === "Bank / Cash Refund" && paymentMode !== "Cash" && (
                    <> ₹{totalRefundAmountCalc.toFixed(2)} will be credited directly to the selected bank account balance.</>
                  )}
                  {refundType === "Bank / Cash Refund" && paymentMode === "Cash" && (
                    <> ₹{totalRefundAmountCalc.toFixed(2)} is settled as direct cash (no bank account required).</>
                  )}
                  {refundType === "Vendor Credit / Ledger" && (
                    <> ₹{totalRefundAmountCalc.toFixed(2)} will be credited to the vendor's ledger account.</>
                  )}
                </div>
              </div>

              <ModalFooter className="px-0 pb-0 pt-3">
                <Button color="secondary" outline onClick={() => setReturnModalOpen(false)}>
                  Cancel
                </Button>
                <Button color="success" type="submit" disabled={submittingReturn || totalReturnQtyCalc <= 0}>
                  {submittingReturn ? (
                    <>
                      <Spinner size="sm" /> Processing Return...
                    </>
                  ) : (
                    <>
                      <FaUndo className="me-1" /> Confirm & Process Return
                    </>
                  )}
                </Button>
              </ModalFooter>
            </form>
          ) : null}
        </ModalBody>
      </Modal>

      {/* ================= MODAL: VIEW RETURN / DEBIT NOTE ================= */}
      <Modal isOpen={viewReturnOpen} size="lg" toggle={() => setViewReturnOpen(false)}>
        <ModalHeader toggle={() => setViewReturnOpen(false)} className="bg-light">
          <FaReceipt className="me-2 text-primary" /> Purchase Return / Debit Note Details
        </ModalHeader>
        <ModalBody>
          {viewReturnData && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                <div>
                  <h5 className="mb-0 fw-bold text-danger">DEBIT NOTE #{viewReturnData.return_no}</h5>
                  <div className="text-muted small">
                    Against Purchase Bill: <strong>{cleanDocNo(viewReturnData.purchase_no) || "—"}</strong>
                  </div>
                </div>
                <div className="text-end">
                  <div className="fw-bold">Date: {formatPurchaseDate(viewReturnData.return_date)}</div>
                  <Badge color={viewReturnData.refund_type === "Bank / Cash Refund" ? (viewReturnData.payment_mode === "Cash" ? "warning" : "success") : "info"}>
                    {viewReturnData.refund_type === "Bank / Cash Refund" && viewReturnData.payment_mode === "Cash"
                      ? "Cash Refund"
                      : viewReturnData.refund_type}
                  </Badge>
                </div>
              </div>

              <Row className="mb-3 small">
                <Col md={6}>
                  <strong>Vendor:</strong> {viewReturnData.company_name || viewReturnData.vendor_name}
                  {viewReturnData.vendor_mobile && <div>Mobile: {viewReturnData.vendor_mobile}</div>}
                  {viewReturnData.vendor_gst && <div>GSTIN: {viewReturnData.vendor_gst}</div>}
                </Col>
                <Col md={6} className="text-md-end">
                  {viewReturnData.payment_mode === "Cash" ? (
                    <div>
                      <strong>Refund Mode:</strong> Cash
                    </div>
                  ) : viewReturnData.bank_account_name ? (
                    <div>
                      <strong>Credited Bank:</strong> {viewReturnData.bank_account_name}
                      {viewReturnData.bank_account_no && (
                        <div className="text-muted">A/C: {viewReturnData.bank_account_no}</div>
                      )}
                      <div>Mode: {viewReturnData.payment_mode}</div>
                    </div>
                  ) : null}
                </Col>
              </Row>

              <Table size="sm" bordered className="text-center align-middle">
                <thead className="bg-light">
                  <tr>
                    <th>#</th>
                    <th className="text-start">Product</th>
                    <th>HSN</th>
                    <th>Return Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewReturnData.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td className="text-start fw-bold">{item.product_name}</td>
                      <td>{item.hsncode || "—"}</td>
                      <td className="fw-bold">{Number(item.return_qty).toFixed(2)}</td>
                      <td>₹{Number(item.unit_price).toFixed(2)}</td>
                      <td className="fw-bold">₹{Number(item.total_amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="fw-bold bg-light">
                  <tr>
                    <td colSpan="5" className="text-end">
                      Grand Total Refund:
                    </td>
                    <td className="text-success fs-6">
                      ₹{Number(viewReturnData.grand_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </Table>

              {viewReturnData.notes && (
                <div className="mt-2 small text-muted">
                  <strong>Notes / Reason:</strong> {viewReturnData.notes}
                </div>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline size="sm" onClick={() => setViewReturnOpen(false)}>
            Close
          </Button>
          <Button color="primary" size="sm" onClick={() => window.print()}>
            <FaPrint className="me-1" /> Print
          </Button>
        </ModalFooter>
      </Modal>

      {/* ================= MODAL: DELETE RETURN CONFIRM ================= */}
      <Modal isOpen={deleteReturnModal} toggle={() => setDeleteReturnModal(false)} size="md">
        <ModalHeader toggle={() => setDeleteReturnModal(false)} className="bg-danger text-white">
          Cancel Purchase Return
        </ModalHeader>
        <ModalBody>
          {deleteReturnTarget && (
            <div>
              <p className="mb-2">
                Are you sure you want to cancel return <strong>{deleteReturnTarget.return_no}</strong>?
              </p>
              <div className="alert alert-warning py-2 px-3 small mb-0">
                <strong>Attention:</strong> Cancelling this return will automatically:
                <ul className="mb-0 ps-3">
                  <li>Restore returned quantities back to inventory stock.</li>
                  {deleteReturnTarget.refund_type === "Bank / Cash Refund" && deleteReturnTarget.payment_mode !== "Cash" && deleteReturnTarget.bank_account_name && (
                    <li>
                      Reverse ₹{Number(deleteReturnTarget.grand_total).toFixed(2)} from bank account{" "}
                      <strong>{deleteReturnTarget.bank_account_name}</strong>.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline size="sm" onClick={() => setDeleteReturnModal(false)}>
            Close
          </Button>
          <Button color="danger" size="sm" onClick={confirmDeleteReturn}>
            Confirm Cancel Return
          </Button>
        </ModalFooter>
      </Modal>

      {/* ================= MODAL: DELETE PURCHASE CONFIRM ================= */}
      <Modal isOpen={deleteModal} toggle={closeDeleteConfirm} size="md">
        <ModalHeader toggle={closeDeleteConfirm}>Confirm Delete Purchase</ModalHeader>
        <ModalBody>
          {deleteTarget ? (
            <p className="mb-0">
              Are you sure you want to delete this purchase?
              <br />
              <span className="text-muted small">{deleteTarget.label}</span>
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline size="sm" onClick={closeDeleteConfirm}>
            Cancel
          </Button>
          <Button color="danger" size="sm" onClick={confirmDeletePurchase}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      {/* ================= MODAL: VIEW PURCHASE ================= */}
      <Modal isOpen={viewOpen} size="xl" toggle={closeViewPurchase}>
        <ModalHeader toggle={closeViewPurchase}>Purchase Details</ModalHeader>
        <ModalBody>
          {viewData && (
            <>
              <Row className="mb-3 small g-2">
                <Col md={6}>
                  <strong>Purchase No:</strong> {cleanDocNo(viewData.purchase_no)}
                </Col>
                <Col md={6}>
                  <strong>PO Number:</strong> {viewData.po_no || "—"}
                </Col>
                <Col md={6}>
                  <strong>Date:</strong> {formatPurchaseDate(viewData.purchase_date) || "—"}
                </Col>
                <Col md={6}>
                  <strong>Vendor:</strong> {viewData.company_name || viewData.vendor_name || "—"}
                  {viewData.company_name && viewData.vendor_name && viewData.company_name !== viewData.vendor_name && (
                    <div>{viewData.vendor_name}</div>
                  )}
                  {viewData.mobile && <div>Mobile: {viewData.mobile}</div>}
                  {viewData.gst_no && <div>GSTIN: {viewData.gst_no}</div>}
                </Col>
                <Col md={6}>
                  <strong>Payment Type:</strong> {viewData.payment_type || "—"}
                </Col>
                <Col md={6}>
                  <strong>Payment Status:</strong>{" "}
                  <Badge color={viewData.payment_status === "paid" ? "success" : viewData.payment_status === "partial" ? "warning" : "danger"}>
                    {(viewData.payment_status || "due").toUpperCase()}
                  </Badge>
                </Col>
                <Col md={6}>
                  <strong>Paid Amount:</strong> <span className="text-success fw-bold">₹{Number(viewData.paid_amount || 0).toFixed(2)}</span>
                </Col>
                <Col md={6}>
                  <strong>Due Amount:</strong> <span className={Number(viewData.due_amount || 0) > 0.01 ? "text-danger fw-bold" : "text-muted"}>₹{Number(viewData.due_amount || 0).toFixed(2)}</span>
                </Col>
                {viewData.vehicle_no && (
                  <Col md={6}>
                    <strong>Vehicle No:</strong> {viewData.vehicle_no}
                  </Col>
                )}
              </Row>
              <Table size="sm" bordered>
                <thead className="bg-light">
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>PR Qty</th>
                    <th>MRP</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewData.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.product_name}</td>
                      <td>{Number(item.qty).toFixed(2)}</td>
                      <td className={Number(item.pr_qty || 0) > 0 ? "text-danger fw-bold" : "text-muted"}>
                        {Number(item.pr_qty || 0).toFixed(2)}
                      </td>
                      <td>
                        {item.price != null && item.price !== ""
                          ? Number(item.price).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : "-"}
                      </td>
                      <td>₹{item.total ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="fw-bold bg-light">
                  {((Number(viewData.transport_charges) || 0) > 0 || (Array.isArray(viewData.additional_charges) && viewData.additional_charges.length > 0)) && (
                    <tr>
                      <td colSpan="4" className="text-end">
                        Items Subtotal
                      </td>
                      <td>
                        ₹
                        {(viewData.items || [])
                          .reduce((sum, item) => sum + Number(item.total || 0), 0)
                          .toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {Number(viewData.transport_charges || 0) > 0 && (
                    <tr>
                      <td colSpan="4" className="text-end text-muted">
                        Transport Charges
                      </td>
                      <td>
                        +₹{Number(viewData.transport_charges).toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {Array.isArray(viewData.additional_charges) &&
                    viewData.additional_charges.map((chg, ci) => (
                      <tr key={ci}>
                        <td colSpan="4" className="text-end text-muted">
                          {chg.name || "Extra Charge"}
                        </td>
                        <td>+₹{Number(chg.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  <tr className="table-primary">
                    <td colSpan="4" className="text-end">
                      Grand Total
                    </td>
                    <td>
                      ₹
                      {Math.round(
                        (viewData.items || []).reduce((sum, item) => sum + Number(item.total || 0), 0) +
                        Number(viewData.transport_charges || 0) +
                        (Array.isArray(viewData.additional_charges)
                          ? viewData.additional_charges.reduce((s, c) => s + (Number(c.amount) || 0), 0)
                          : 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </Table>

              <h6 className="fw-bold mt-4 mb-2">Payment History & Collection Details</h6>
              {loadingPaymentHistory ? (
                <div className="py-3 text-center text-muted">
                  <Spinner size="sm" color="primary" className="me-2" />
                  Loading payment history...
                </div>
              ) : paymentHistoryError ? (
                <div className="alert alert-danger py-2 mb-0">{paymentHistoryError}</div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-muted small border rounded p-3">No payments recorded for this purchase.</div>
              ) : (
                <div className="table-responsive">
                  <Table size="sm" bordered hover className="mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Collected By</th>
                        <th>Cheque / Reference</th>
                        <th>Bank Account</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id}>
                          <td>{formatPurchaseDate(payment.payment_date) || "—"}</td>
                          <td className="text-success fw-bold">₹{Number(payment.amount || 0).toFixed(2)}</td>
                          <td>{payment.payment_method || payment.paid_from || "—"}</td>
                          <td>{payment.collection_person || "—"}</td>
                          <td>
                            {payment.cheque_no ? `Cheque: ${payment.cheque_no}` : ""}
                            {payment.cheque_no && payment.reference_no ? " · " : ""}
                            {payment.reference_no || (!payment.cheque_no ? "—" : "")}
                            {payment.cheque_date && (
                              <div className="small text-muted">Date: {formatPurchaseDate(payment.cheque_date)}</div>
                            )}
                          </td>
                          <td>{payment.bank_account_name || "—"}</td>
                          <td>{payment.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </>
          )}
        </ModalBody>
      </Modal>

      {/* ================= RECORD PAYMENT MODAL (PURCHASE CREDIT) ================= */}
      <Modal isOpen={payModalOpen} toggle={() => setPayModalOpen(false)} centered size="lg">
        <ModalHeader toggle={() => setPayModalOpen(false)}>
          <FaMoneyBillWave className="me-2 text-success" /> Record Vendor Payment (Purchase Credit)
        </ModalHeader>
        <ModalBody>
          {payTarget && (
            <>
              {/* Summary Banner */}
              <div className="bg-light p-3 rounded mb-3 border">
                <Row className="g-2 text-dark small">
                  <Col md={3}>
                    <div className="text-muted">Vendor:</div>
                    <div className="fw-bold">{payTarget.company_name || payTarget.vendor_name || "—"}</div>
                  </Col>
                  <Col md={3}>
                    <div className="text-muted">Purchase No:</div>
                    <div className="fw-bold">{cleanDocNo(payTarget.purchase_no)}</div>
                    {payTarget.po_no && <div className="text-muted small">PO: {payTarget.po_no}</div>}
                  </Col>
                  <Col md={3}>
                    <div className="text-muted">Total Bill:</div>
                    <div className="fw-bold">₹{Math.round(Number(payTarget.total || 0))}</div>
                  </Col>
                  <Col md={3}>
                    <div className="text-muted">Current Due:</div>
                    <div className="fw-bold text-danger fs-6">₹{Number(payTarget.due_amount || 0).toFixed(2)}</div>
                  </Col>
                </Row>
              </div>

              {/* Payment Fields */}
              <Row className="g-3">
                <Col md={6}>
                  <Label className="fw-bold">Payment Amount (₹) *</Label>
                  <Input
                    type="number"
                    min="1"
                    max={Number(payTarget.due_amount || 0) > 0 ? Number(payTarget.due_amount) : undefined}
                    step="0.01"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  />
                </Col>

                <Col md={6}>
                  <Label className="fw-bold">Payment Date *</Label>
                  <Input
                    type="date"
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                  />
                </Col>

                <Col md={6}>
                  <Label className="fw-bold">Payment Method *</Label>
                  <Input
                    type="select"
                    value={payForm.payment_method}
                    onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Other">Other</option>
                  </Input>
                </Col>

                {payForm.payment_method !== "Cash" && (
                  <Col md={6}>
                    <Label className="fw-bold">Bank Account *</Label>
                    <Input
                      type="select"
                      value={payForm.bank_account_id}
                      onChange={(e) => setPayForm({ ...payForm, bank_account_id: e.target.value })}
                    >
                      <option value="">-- Select Bank Account --</option>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.account_name} ({b.bank_name || "Bank"}) - ₹{parseFloat(b.current_balance || 0).toFixed(2)}
                        </option>
                      ))}
                    </Input>
                  </Col>
                )}

                {/* CHEQUE FIELDS */}
                {payForm.payment_method === "Cheque" && (
                  <>
                    <Col md={6}>
                      <Label className="fw-bold">Cheque Number *</Label>
                      <Input
                        value={payForm.cheque_no}
                        onChange={(e) => setPayForm({ ...payForm, cheque_no: e.target.value })}
                      />
                    </Col>
                    <Col md={6}>
                      <Label className="fw-bold">Cheque Date *</Label>
                      <Input
                        type="date"
                        value={payForm.cheque_date}
                        onChange={(e) => setPayForm({ ...payForm, cheque_date: e.target.value })}
                      />
                    </Col>
                  </>
                )}

                {/* COLLECTION PERSON */}
                <Col md={6}>
                  <Label className="fw-bold">Collection Person / Agent</Label>
                  <Input
                    value={payForm.collection_person}
                    onChange={(e) => setPayForm({ ...payForm, collection_person: e.target.value })}
                  />
                  <small className="text-muted">Vendor representative who collected the payment / cheque</small>
                </Col>

                <Col md={6}>
                  <Label className="fw-bold">Reference No / Notes</Label>
                  <Input
                    value={payForm.notes}
                    onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  />
                </Col>
              </Row>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setPayModalOpen(false)}>
            Cancel
          </Button>
          <Button color="success" onClick={handlePaySubmit} disabled={savingPayment}>
            {savingPayment ? <Spinner size="sm" /> : <FaCheckCircle className="me-1" />} Record Payment
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
