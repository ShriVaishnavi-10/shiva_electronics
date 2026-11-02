import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  Card,
  CardHeader,
  CardBody,
} from "reactstrap";
import {
  FaPlus,
  FaFileExcel,
  FaSearch,
  FaEye,
  FaEdit,
  FaTrash,
  FaFileInvoice,
  FaPrint,
  FaFileContract,
  FaTruck,
  FaReceipt,
  FaMoneyBillWave,
  FaTimes,
  FaBan,
  FaChartLine,
  FaUserTie,
} from "react-icons/fa";
import { toast } from "react-toastify";

import { apiUrl } from "../config/urls";
import { exportSalesToExcel } from "../utils/exportSalesExcel";

const API = apiUrl("transactions");
const LIST_API = `${API}/list`;
const ENTRY_OPTIONS = [25, 50, 100, 500, 1000];

export default function SalesList() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isNonUser = storedUser.role_name?.toLowerCase().includes("non user") || storedUser.role_id === 6;

  const [data, setData] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [salesPersonId, setSalesPersonId] = useState("");
  const [limit, setLimit] = useState(25);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewData, setViewData] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [payModal, setPayModal] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [payForm, setPayForm] = useState({
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    method: "Cash",
    bank_account_id: "",
    payment_ref_no: "",
    payment_for: "",
  });
  const [payLoading, setPayLoading] = useState(false);

  // Cancellation State
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelForm, setCancelForm] = useState({
    refund_advance: true,
    refund_amount: "",
    refund_method: "Cash",
    bank_account_id: "",
    notes: "",
  });
  const [cancelLoading, setCancelLoading] = useState(false);

  const openCancelModal = (r) => {
    setCancelTarget(r);
    const paid = Number(r.total_paid) || 0;
    setCancelForm({
      refund_advance: paid > 0,
      refund_amount: paid > 0 ? String(paid.toFixed(2)) : "0",
      refund_method: "Cash",
      bank_account_id: bankAccounts.length > 0 ? String(bankAccounts[0].id) : "",
      notes: "",
    });
    setCancelModal(true);
  };

  const closeCancelModal = () => {
    setCancelModal(false);
    setCancelTarget(null);
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelTarget?.id) return;

    const shouldRefund = Boolean(cancelForm.refund_advance);
    const refundAmtNum = Number(cancelForm.refund_amount) || 0;
    const maxPaid = Number(cancelTarget.total_paid) || 0;

    if (shouldRefund && refundAmtNum <= 0) {
      return toast.error("Please enter a valid refund amount");
    }
    if (shouldRefund && refundAmtNum > maxPaid + 0.01) {
      return toast.error(`Refund amount cannot exceed total paid amount (₹${maxPaid.toFixed(2)})`);
    }

    const isElectronic = shouldRefund && cancelForm.refund_method !== "Cash";
    let finalBankId = cancelForm.bank_account_id ? Number(cancelForm.bank_account_id) : null;
    if (isElectronic && !finalBankId && bankAccounts.length > 0) {
      finalBankId = Number(bankAccounts[0].id);
    }
    if (isElectronic && !finalBankId) {
      return toast.error("Please select a bank account to deduct the refund from");
    }

    setCancelLoading(true);
    try {
      const res = await axios.post(`${API}/${cancelTarget.id}/cancel`, {
        refund_advance: shouldRefund,
        refund_amount: refundAmtNum,
        refund_method: cancelForm.refund_method,
        bank_account_id: isElectronic ? finalBankId : null,
        notes: cancelForm.notes,
      });

      toast.success(res.data?.message || "Sale cancelled successfully!");
      closeCancelModal();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel sale");
    } finally {
      setCancelLoading(false);
    }
  };

  useEffect(() => {
    axios
      .get(apiUrl("bank-accounts"), { params: isNonUser ? { is_gst: 0 } : {} })
      .then((res) => setBankAccounts(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, [isNonUser]);

  useEffect(() => {
    axios
      .get(apiUrl("locations"), { params: { limit: 100 } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setLocations(list);
      })
      .catch((err) => {
        console.error("Failed to load business locations", err);
      });

    axios
      .get(apiUrl("sales-persons"))
      .then((res) => {
        const list = Array.isArray(res.data?.data) ? res.data.data : (res.data || []);
        setSalesPersons(list);
      })
      .catch((err) => {
        console.error("Failed to load sales persons", err);
      });
  }, []);

  const getLocationDisplayName = (loc) => {
    if (!loc) return "";
    let cityOrName = loc.name || loc.city || "";
    if (
      loc.landmark &&
      loc.landmark.toLowerCase().includes("attur") &&
      !cityOrName.toLowerCase().includes("attur")
    ) {
      cityOrName = "Attur";
    }
    const idStr = loc.location_id ? ` (${loc.location_id})` : "";
    return `${cityOrName}${idStr}`;
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  };

  const isSaleEditable = (saleDate) => {
    if (!saleDate) return false;
    const sale = new Date(saleDate);
    if (Number.isNaN(sale.getTime())) return false;
    const today = new Date();
    const diffTime = today - sale;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const fetchData = useCallback(
    async (overrides = {}) => {
      setLoading(true);
      try {
        const activePage = overrides.page !== undefined ? overrides.page : page;
        const activeLimit = overrides.limit !== undefined ? overrides.limit : limit;
        const activeSearch =
          overrides.search !== undefined ? overrides.search : search;
        const activeFrom =
          overrides.fromDate !== undefined ? overrides.fromDate : fromDate;
        const activeTo =
          overrides.toDate !== undefined ? overrides.toDate : toDate;

        const activeLocation =
          overrides.location_id !== undefined ? overrides.location_id : locationId;
        const activeSalesPerson =
          overrides.sales_person_id !== undefined ? overrides.sales_person_id : salesPersonId;

        const res = await axios.get(LIST_API, {
          params: {
            fromDate: activeFrom || undefined,
            toDate: activeTo || undefined,
            location_id: activeLocation || undefined,
            sales_person_id: activeSalesPerson || undefined,
            search:
              activeSearch && activeSearch.trim()
                ? activeSearch.trim()
                : undefined,
            page: activePage,
            limit: activeLimit,
            ...(isNonUser ? { is_gst: 0 } : {}),
          },
        });
        setData(Array.isArray(res.data?.data) ? res.data.data : []);
        setTotal(res.data?.total ?? 0);
      } catch (err) {
        setData([]);
        setTotal(0);
        if (err.response?.status !== 404) {
          toast.error(
            err.response?.data?.message || "Failed to load sales list",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [fromDate, toDate, search, locationId, salesPersonId, page, limit],
  );

  const isMountedRef = useRef(false);

  // Debounced auto-search when typing or updating date / location / sales person filters
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      fetchData({ page: 1 });
      return;
    }

    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        fetchData({ page: 1 });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, fromDate, toDate, locationId, salesPersonId]);

  // Refetch when page or limit changes
  useEffect(() => {
    if (isMountedRef.current) {
      fetchData();
    }
  }, [page, limit]);

  const handleSearch = () => {
    if (page !== 1) {
      setPage(1);
    } else {
      fetchData({ page: 1 });
    }
  };

  const handleClearSearch = () => {
    setSearch("");
    if (page !== 1) {
      setPage(1);
    } else {
      fetchData({ page: 1, search: "" });
    }
  };

  const viewSale = async (id) => {
    try {
      const res = await axios.get(`${API}/${id}`);
      setViewData(res.data);
      setViewOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load sale details");
    }
  };

  const editSale = (id) => {
    if (!id) return;
    navigate(`/index/salesForm/${id}`);
  };

  const openDeleteConfirm = (row) => {
    if (!row?.id) return;
    setDeleteTarget({
      id: row.id,
      label: row.customer_name
        ? `${row.customer_name} (${formatDate(row.date)})`
        : `Sale #${row.id}`,
    });
    setDeleteModal(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteModal(false);
    setDeleteTarget(null);
  };

  const confirmDeleteSale = async () => {
    if (!deleteTarget?.id) return;
    try {
      await axios.delete(`${API}/${deleteTarget.id}`);
      toast.success("Sale deleted successfully");
      closeDeleteConfirm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete sale");
    }
  };

  const openPayModal = (row) => {
    if (!row) return;
    const totalAmount = Number(row.total_amount) || 0;
    const totalPaid = Number(row.total_paid) || 0;
    const remaining =
      row.remaining_amount != null
        ? Number(row.remaining_amount)
        : Math.max(0, totalAmount - totalPaid);

    setPayTarget({
      ...row,
      total_amount: totalAmount,
      total_paid: totalPaid,
      remaining_amount: remaining,
    });
    setPayForm({
      amount: remaining > 0 ? remaining.toFixed(2) : "",
      payment_date: new Date().toISOString().slice(0, 10),
      method: "Cash",
      bank_account_id: bankAccounts.length > 0 ? String(bankAccounts[0].id) : "",
      payment_ref_no: "",
      payment_for: `Sale Balance Payment - Invoice #${row.invoice_no || row.id}`,
    });
    setPayModal(true);
  };

  const closePayModal = () => {
    setPayModal(false);
    setPayTarget(null);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payTarget?.id) return;

    const amountNum = Number(payForm.amount);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      return toast.error("Please enter a valid positive payment amount");
    }

    const remaining = Number(payTarget.remaining_amount) || 0;
    if (amountNum > remaining + 0.01) {
      return toast.error(
        `Payment amount (₹${amountNum.toFixed(2)}) cannot exceed remaining balance (₹${remaining.toFixed(2)})`
      );
    }

    const isCredit = payForm.method === "Credit";
    const isElectronic = payForm.method !== "Cash" && !isCredit;
    let finalBankId = payForm.bank_account_id ? Number(payForm.bank_account_id) : null;
    if (isElectronic && !finalBankId && bankAccounts.length > 0) {
      finalBankId = Number(bankAccounts[0].id);
    }
    if (isElectronic && !finalBankId) {
      return toast.error("Please select a bank account for electronic/bank payment");
    }

    setPayLoading(true);
    try {
      await axios.post(`${API}/${payTarget.id}/pay`, {
        amount: amountNum,
        method: payForm.method,
        bank_account_id: isCredit ? null : finalBankId,
        payment_date: payForm.payment_date,
        payment_ref_no: payForm.payment_ref_no,
        payment_for: payForm.payment_for || `Sale Balance Payment - Invoice #${payTarget.invoice_no || payTarget.id}`,
      });

      toast.success(`Payment of ₹${amountNum.toFixed(2)} recorded successfully!`);
      closePayModal();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setPayLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!data || data.length === 0) {
      toast.info("No data available to export");
      return;
    }
    setExportLoading(true);
    try {
      let exportData = data;
      if (total > data.length) {
        try {
          const res = await axios.get(LIST_API, {
            params: {
              fromDate: fromDate || undefined,
              toDate: toDate || undefined,
              location_id: locationId || undefined,
              sales_person_id: salesPersonId || undefined,
              search: search && search.trim() ? search.trim() : undefined,
              page: 1,
              limit: Math.max(total, 1000),
              ...(isNonUser ? { is_gst: 0 } : {}),
            },
          });
          if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
            exportData = res.data.data;
          }
        } catch (fetchErr) {
          console.warn("Could not fetch full dataset, exporting current page:", fetchErr);
        }
      }

      await exportSalesToExcel({
        data: exportData,
        fromDate,
        toDate,
        isNonUser,
      });
      toast.success("Excel downloaded successfully");
    } catch (err) {
      console.error("Failed to export Excel:", err);
      toast.error("Failed to download Excel");
    } finally {
      setExportLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const startEntry = total === 0 ? 0 : (page - 1) * limit + 1;
  const endEntry = Math.min(page * limit, total);

  return (
    <>
      <Card className="shadow-sm border-0 rounded">
        <CardHeader className="bg-white border-bottom d-flex justify-content-between align-items-center py-3 flex-wrap gap-2">
          <h5 className="mb-0 fw-semibold">{isNonUser ? "Non-GST Sale List" : "Sale List"}</h5>
          <div className="d-flex align-items-center gap-2">
            <Button
              color="warning"
              size="sm"
              className="fw-bold d-flex align-items-center gap-1 shadow-sm text-dark"
              onClick={() =>
                navigate(
                  salesPersonId
                    ? `/index/sales-person-report?sales_person_id=${salesPersonId}`
                    : "/index/sales-person-report"
                )
              }
              title="View Sales Person Report & Commission"
            >
              <FaChartLine /> Sales Person Report
            </Button>
            <Button
              color="primary"
              size="sm"
              onClick={() => navigate("/index/salesForm")}
            >
              <FaPlus className="me-1" /> {isNonUser ? "Add Non-GST Sale" : "Add Sale"}
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-3">
          <Row className="mb-3 g-2 align-items-end">
            <Col md={2} sm={6} xs={12}>
              <Label className="small text-muted mb-1">Business Location</Label>
              <Input
                type="select"
                value={locationId}
                onChange={(e) => {
                  setLocationId(e.target.value);
                  setPage(1);
                }}
                bsSize="sm"
              >
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {getLocationDisplayName(loc)}
                  </option>
                ))}
              </Input>
            </Col>
            <Col md={2} sm={6} xs={12}>
              <Label className="small text-muted mb-1">Sales Executive</Label>
              <Input
                type="select"
                value={salesPersonId}
                onChange={(e) => {
                  setSalesPersonId(e.target.value);
                  setPage(1);
                }}
                bsSize="sm"
              >
                <option value="">All Sales Executives</option>
                {salesPersons.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name} ({sp.employee_code || `SP-${sp.id}`})
                  </option>
                ))}
              </Input>
            </Col>
            <Col md={2} sm={6} xs={6}>
              <Label className="small text-muted mb-1">From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                bsSize="sm"
              />
            </Col>
            <Col md={2} sm={6} xs={6}>
              <Label className="small text-muted mb-1">To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                bsSize="sm"
              />
            </Col>
            <Col md={2} sm={6} xs={12}>
              <Label className="small text-muted mb-1">
                Search Invoice / Customer
              </Label>
              <div className="position-relative">
                <Input
                  placeholder="Invoice No, Customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  bsSize="sm"
                  className={search ? "pe-4" : ""}
                />
                {search && (
                  <button
                    type="button"
                    className="btn btn-sm text-muted position-absolute top-50 end-0 translate-middle-y border-0 bg-transparent p-1 me-1"
                    onClick={handleClearSearch}
                    title="Clear Search"
                  >
                    <FaTimes size={11} />
                  </button>
                )}
              </div>
            </Col>
            <Col md={2} sm={6} xs={12}>
              <div className="d-flex gap-1">
                <Button
                  color="primary"
                  size="sm"
                  onClick={handleSearch}
                  className="flex-fill"
                >
                  <FaSearch className="me-1" /> Search
                </Button>
                <Button
                  color="success"
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={exportLoading}
                  className="flex-fill"
                >
                  <FaFileExcel className="me-1" /> {exportLoading ? "..." : "Excel"}
                </Button>
              </div>
            </Col>
          </Row>

          <Row className="mb-2 align-items-center">
            <Col md={6} className="d-flex align-items-center gap-2">
              <Label className="mb-0 small text-muted">Show</Label>
              <Input
                type="select"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                bsSize="sm"
                style={{ width: "auto" }}
              >
                {ENTRY_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Input>
              <span className="small text-muted">entries</span>
            </Col>
            <Col md={6} className="text-end small text-muted">
Showing {startEntry} to {endEntry} of {total} entries
            </Col>
          </Row>

          <div className="table-responsive">
            <Table bordered hover size="sm" className="align-middle mb-0 text-nowrap">
              <thead className="table-light">
                <tr className="text-nowrap">
                  <th>S.No</th>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>Contact Number</th>
                  <th>Product Name</th>
                  <th>Sales Executive</th>
                  <th>Payment Status</th>
                  <th>Payment Method</th>
                  <th>Total Amount</th>
                  <th>Advance / Paid</th>
                  <th>Remaining</th>
                  <th>Total Qty</th>
                  <th className="text-center text-nowrap">Tax Invoice</th>
                  <th className="text-center text-nowrap">Thermal Print</th>
                  <th className="text-center text-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="16" className="text-center text-muted py-4">
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="16" className="text-center text-muted py-5">
                      {search ? (
                        <div>
                          <div className="fw-bold text-dark fs-6 mb-1">
                            No records found matching "{search}"
                          </div>
                          <small className="text-muted">
                            Check the invoice number, customer name, or try clearing search filters
                          </small>
                          <div className="mt-2">
                            <Button
                              size="sm"
                              color="primary"
                              outline
                              onClick={handleClearSearch}
                            >
                              Clear Search
                            </Button>
                          </div>
                        </div>
                      ) : (
                        "No sales found"
                      )}
                    </td>
                  </tr>
                ) : (
                  data.map((r, i) => {
                    const isCancelled = String(r.status || "").toLowerCase() === "cancelled";
                    const totalAmount = Number(r.total_amount) || 0;
                    const totalPaid = Number(r.total_paid) || 0;
                    const remainingAmount = r.remaining_amount != null
                      ? Number(r.remaining_amount)
                      : Math.max(0, totalAmount - totalPaid);
                    const isFullyPaid = !isCancelled && (r.payment_status === "paid" || remainingAmount <= 0.001);
                    const isPartial = !isCancelled && !isFullyPaid && (r.payment_status === "partial" || totalPaid > 0);
                    const statusText = isCancelled ? "CANCELLED" : isFullyPaid ? "PAID" : isPartial ? "PARTIAL" : "DUE";
                    const statusBadgeClass = isCancelled
                      ? "bg-danger text-white"
                      : isFullyPaid
                      ? "bg-success text-white"
                      : isPartial
                      ? "bg-warning text-dark"
                      : "bg-danger text-white";
                    const items = Array.isArray(r.items) ? r.items : [];

                    return (
                      <tr key={r.id || i} className={isCancelled ? "table-light opacity-75" : ""}>
                        <td>{startEntry + i}</td>
                        <td
                          className="fw-bold text-nowrap"
                          style={{ color: isCancelled ? "#DC2626" : "#0F766E", fontSize: "0.85rem" }}
                        >
                          {r.invoice_no || (isNonUser ? String(r.id).padStart(2, "0") : `SE-${r.id}`)}
                          {isCancelled && (
                            <span className="ms-1 text-danger small fw-normal">(Cancelled)</span>
                          )}
                        </td>
                        <td>{formatDate(r.date)}</td>
                        <td>{r.customer_name ?? "-"}</td>
                        <td>{r.contact_number ?? "-"}</td>
                        <td
                          className="text-nowrap"
                          style={{ maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis" }}
                          title={items.map((it) => it.product_name).filter(Boolean).join(", ")}
                        >
                          {items.length > 0 ? (
                            <span>
                              {items.map((it) => it.product_name).filter(Boolean).join(", ")}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="small text-nowrap">
                          {r.sales_person_name ? (
                            <span className="badge bg-light text-dark border px-2 py-1">
                              <FaUserTie className="text-warning me-1" size={10} />
                              {r.sales_person_name}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${statusBadgeClass} px-2 py-1 fw-bold`}>
                            {statusText}
                          </span>
                        </td>
                        <td>{r.payment_method ?? "-"}</td>
                        <td className="fw-semibold">
                          ₹{totalAmount.toFixed(2)}
                        </td>
                        <td className={isCancelled ? "text-muted fw-semibold" : "text-success fw-semibold"}>
                          ₹{totalPaid.toFixed(2)}
                        </td>
                        <td className={isCancelled ? "text-muted" : remainingAmount > 0.001 ? "text-danger fw-bold" : "text-muted"}>
                          ₹{remainingAmount.toFixed(2)}
                        </td>
                        <td>{r.total_qty != null ? Number(r.total_qty).toFixed(2) : "-"}</td>
                        <td className="text-center text-nowrap align-middle">
                          <Button
                            size="sm"
                            color="secondary"
                            outline
                            onClick={() =>
                              navigate(`/index/salesReceipt/${r.id}`)
                            }
                            title="Tax Invoice"
                            className="py-1 px-2"
                          >
                            <FaFileInvoice />
                          </Button>
                        </td>
                        <td className="text-center text-nowrap align-middle">
                          <Button
                            size="sm"
                            color="dark"
                            outline
                            onClick={() =>
                              navigate(`/index/thermalReceipt/${r.id}`)
                            }
                            title="Thermal Print"
                            className="py-1 px-2"
                          >
                            <FaReceipt />
                          </Button>
                        </td>
                        <td className="text-center text-nowrap align-middle">
                          {isCancelled ? (
                            <>
                              <Button
                                size="sm"
                                color="info"
                                outline
                                onClick={() => viewSale(r.id)}
                                title="View Details"
                                className="me-1 py-1 px-2"
                              >
                                <FaEye />
                              </Button>
                              <span
                                className="badge bg-secondary py-1 px-2 me-1"
                                style={{ fontSize: "0.72rem" }}
                                title="This sale has been cancelled"
                              >
                                <FaBan className="me-1" /> Cancelled
                              </span>
                              <Button
                                size="sm"
                                color="danger"
                                outline
                                onClick={() => openDeleteConfirm(r)}
                                title="Delete"
                                className="py-1 px-2"
                              >
                                <FaTrash />
                              </Button>
                            </>
                          ) : (
                            <>
                                {remainingAmount > 0.001 && (
                                  <Button
                                    size="sm"
                                    onClick={() => openPayModal(r)}
                                    title="Pay Remaining Amount"
                                    className="me-1 py-1 px-2 fw-bold d-inline-flex align-items-center gap-1 shadow-sm"
                                    style={{
                                      background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                                      color: "#08090D",
                                      fontWeight: "800",
                                      border: "none",
                                    }}
                                  >
                                    <FaMoneyBillWave size={12} /> Pay
                                  </Button>
                                )}
                              <Button
                                size="sm"
                                color="info"
                                outline
                                onClick={() => viewSale(r.id)}
                                title="View"
                                className="me-1 py-1 px-2"
                              >
                                <FaEye />
                              </Button>
                              {isSaleEditable(r.date) ? (
                                <Button
                                  size="sm"
                                  color="primary"
                                  outline
                                  onClick={() => editSale(r.id)}
                                  title="Edit"
                                  className="me-1 py-1 px-2"
                                >
                                  <FaEdit />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  color="secondary"
                                  outline
                                  disabled
                                  title="Cannot edit sales older than 30 days"
                                  className="me-1 py-1 px-2"
                                >
                                  <FaEdit />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                color="warning"
                                outline
                                onClick={() => openCancelModal(r)}
                                title="Cancel Sale & Refund"
                                className="me-1 py-1 px-2"
                              >
                                <FaBan />
                              </Button>
                              <Button
                                size="sm"
                                color="danger"
                                outline
                                onClick={() => openDeleteConfirm(r)}
                                title="Delete"
                                className="py-1 px-2"
                              >
                                <FaTrash />
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Row className="mt-3 align-items-center">
              <Col className="d-flex justify-content-between flex-wrap gap-2">
                <div className="small text-muted">
                  Page {page} of {totalPages}
                </div>
                <div className="d-flex gap-1">
                  <Button
                    size="sm"
                    color="secondary"
                    outline
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p;
                    if (totalPages <= 5) p = i + 1;
                    else if (page <= 3) p = i + 1;
                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                    else p = page - 2 + i;
                    return (
                      <Button
                        key={p}
                        size="sm"
                        color={page === p ? "primary" : "secondary"}
                        outline={page !== p}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    );
                  })}
                  <Button
                    size="sm"
                    color="secondary"
                    outline
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </Col>
            </Row>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={deleteModal} toggle={closeDeleteConfirm} size="md">
        <ModalHeader toggle={closeDeleteConfirm}>Confirm delete</ModalHeader>
        <ModalBody>
          {deleteTarget ? (
            <p className="mb-0">
              Are you sure you want to delete this sale?
              <br />
              <span className="text-muted small">{deleteTarget.label}</span>
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline size="sm" onClick={closeDeleteConfirm}>
            Cancel
          </Button>
          <Button color="danger" size="sm" onClick={confirmDeleteSale}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={viewOpen} size="lg" toggle={() => setViewOpen(false)}>
        <ModalHeader toggle={() => setViewOpen(false)}>
          Sale Details
        </ModalHeader>
        <ModalBody>
          {viewData && (
            <>
              <div className="d-flex justify-content-end mb-2">
                <Button
                  color="primary"
                  size="sm"
                  onClick={() => window.print()}
                >
                  <FaPrint className="me-1" /> Print Receipt
                </Button>
              </div>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Invoice No:</strong> {viewData.invoice_no ?? "-"}
                </Col>
                <Col md={6}>
                  <strong>Date:</strong> {formatDate(viewData.date)}
                </Col>
                <Col md={6}>
                  <strong>Customer Name:</strong>{" "}
                  {viewData.customer_name ?? "-"}
                </Col>
                <Col md={6}>
                  <strong>Contact Number:</strong>{" "}
                  {viewData.contact_number ?? "-"}
                </Col>
                <Col md={6}>
                  <strong>Gst No:</strong> {viewData.gst_no ?? "-"}
                </Col>
                <Col md={6}>
                  <strong>Location:</strong> {viewData.location ?? "-"}
                </Col>
                <Col md={6}>
                  <strong>Payment Status:</strong>{" "}
                  {viewData.payment_status ?? "-"}
                </Col>
                <Col md={6}>
                  <strong>Payment Method:</strong>{" "}
                  {viewData.payment_method ?? "-"}
                </Col>
                <Col md={6}>
                  <strong>Total Amount:</strong> ₹
                  {viewData.total_amount != null
                    ? Number(viewData.total_amount).toFixed(2)
                    : "-"}
                </Col>
                <Col md={6}>
                  <strong>Total Paid:</strong> ₹
                  {viewData.total_paid != null
                    ? Number(viewData.total_paid).toFixed(2)
                    : "-"}
                </Col>
                <Col md={6}>
                  <strong>Total Qty:</strong> {viewData.total_qty != null ? Number(viewData.total_qty).toFixed(2) : "-"}
                </Col>
                {viewData.sales_person_name && (
                  <Col md={6}>
                    <strong>Sales Executive:</strong> {viewData.sales_person_name} {viewData.sales_person_code ? `(${viewData.sales_person_code})` : ""}
                    {viewData.commission_amount != null && (
                      <span className="ms-2 badge bg-warning text-dark">
                        Comm: ₹{Number(viewData.commission_amount).toFixed(2)}
                      </span>
                    )}
                  </Col>
                )}
                {viewData.vehicle_no && (
                  <Col md={6}>
                    <strong>Vehicle No:</strong> {viewData.vehicle_no}
                  </Col>
                )}
                {viewData.eway_invoice_no && (
                  <Col md={6}>
                    <strong>E-Way Invoice No:</strong> {viewData.eway_invoice_no}
                  </Col>
                )}
                {Number(viewData.transport_charges) > 0 && (
                  <Col md={6}>
                    <strong>Transport Charges:</strong> ₹{Number(viewData.transport_charges).toFixed(2)}
                  </Col>
                )}
                {(() => {
                  if (!viewData.additional_charges) return null;
                  try {
                    const parsed = typeof viewData.additional_charges === "string" ? JSON.parse(viewData.additional_charges) : viewData.additional_charges;
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      return (
                        <Col md={12} className="mt-1">
                          <strong>Additional Charges:</strong>{" "}
                          {parsed.map((c, i) => (
                            <span key={i} className="badge bg-light text-dark border me-1">
                              {c.name}: ₹{Number(c.amount || 0).toFixed(2)}
                            </span>
                          ))}
                        </Col>
                      );
                    }
                  } catch (_) {}
                  return null;
                })()}
              </Row>
              {(viewData.items || []).length > 0 && (
                <Table bordered size="sm" className="align-middle mb-0 text-nowrap">
                  <thead className="bg-light">
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewData.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.product_name ?? "-"}</td>
                        <td>{item.quantity != null ? Number(item.quantity).toFixed(2) : "-"}</td>
                        <td>
                          ₹
                          {item.unit_price != null
                            ? Number(item.unit_price).toFixed(2)
                            : "-"}
                        </td>
                        <td>
                          ₹
                          {item.total != null
                            ? Number(item.total).toFixed(2)
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          )}
        </ModalBody>
      </Modal>

      {/* PAY REMAINING AMOUNT MODAL */}
      <Modal isOpen={payModal} toggle={closePayModal} centered size="lg">
        <ModalHeader
          toggle={closePayModal}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={closePayModal}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                color: "#08090D",
              }}
            >
              <FaMoneyBillWave size={18} />
            </div>
            <div>
              <h5 className="fw-bold mb-0" style={{ color: "#FFD700" }}>
                Pay Outstanding Amount
              </h5>
              <span className="small" style={{ color: "#E2E8F0", opacity: 0.9 }}>
                Invoice #{payTarget?.invoice_no || payTarget?.id} • {payTarget?.customer_name ?? "Customer"}
              </span>
            </div>
          </div>
        </ModalHeader>
        <ModalBody className="pt-3">
          {payTarget && (
            <form onSubmit={handlePaySubmit}>
              {/* Summary Cards */}
              <Row className="g-2 mb-3">
                <Col md={4}>
                  <Card className="border-0 bg-light shadow-none p-2 text-center rounded">
                    <span className="small text-muted fw-semibold">Total Sale Amount</span>
                    <h5 className="fw-bold mb-0 text-dark">
                      ₹{Number(payTarget.total_amount || 0).toFixed(2)}
                    </h5>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-0 bg-light shadow-none p-2 text-center rounded">
                    <span className="small text-muted fw-semibold">Advance / Paid So Far</span>
                    <h5 className="fw-bold mb-0 text-success">
                      ₹{Number(payTarget.total_paid || 0).toFixed(2)}
                    </h5>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card
                    className="border-0 p-2 text-center rounded"
                    style={{ backgroundColor: "#FFF1F2" }}
                  >
                    <span className="small text-danger fw-semibold">Remaining Outstanding</span>
                    <h5 className="fw-bold mb-0 text-danger">
                      ₹{Number(payTarget.remaining_amount || 0).toFixed(2)}
                    </h5>
                  </Card>
                </Col>
              </Row>

              <Row className="g-3">
                <Col md={6}>
                  <Label className="fw-bold small text-muted text-uppercase mb-1">
                    Payment Amount (₹) *
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    max={Number(payTarget.remaining_amount || 0) + 0.01}
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="fw-bold fs-5 px-3 py-2"
                    style={{
                      borderColor: "#D49A00",
                      color: "#92400E",
                      backgroundColor: "#FFFBEB",
                      borderRadius: "8px",
                    }}
                  />
                  <div className="small text-muted mt-1 d-flex justify-content-between">
                    <span>
                      Balance after payment: ₹
                      {Math.max(
                        0,
                        (Number(payTarget.remaining_amount || 0) - (Number(payForm.amount) || 0))
                      ).toFixed(2)}
                    </span>
                    <Button
                      color="link"
                      size="sm"
                      className="p-0 text-decoration-none fw-semibold"
                      style={{ color: "#D49A00" }}
                      onClick={() =>
                        setPayForm({
                          ...payForm,
                          amount: Number(payTarget.remaining_amount || 0).toFixed(2),
                        })
                      }
                    >
                      Pay Full
                    </Button>
                  </div>
                </Col>

                <Col md={6}>
                  <Label className="fw-bold small text-muted text-uppercase mb-1">
                    Payment Date *
                  </Label>
                  <Input
                    type="date"
                    required
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                    className="px-3 py-2"
                    style={{ borderRadius: "8px" }}
                  />
                </Col>

                <Col md={6}>
                  <Label className="fw-bold small text-muted text-uppercase mb-1">
                    Payment Method *
                  </Label>
                  <Input
                    type="select"
                    required
                    value={payForm.method}
                    onChange={(e) => {
                      const m = e.target.value;
                      const isCredit = m === "Credit";
                      setPayForm({
                        ...payForm,
                        method: m,
                        bank_account_id: isCredit
                          ? ""
                          : (payForm.bank_account_id || (bankAccounts[0]?.id ? String(bankAccounts[0].id) : "")),
                      });
                    }}
                    className="px-3 py-2"
                    style={{ borderRadius: "8px" }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="GPay">GPay</option>
                    <option value="PhonePe">PhonePe</option>
                    <option value="Paytm">Paytm</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                  </Input>
                </Col>

                {payForm.method !== "Credit" && (
                  <Col md={6}>
                    <Label className="fw-bold small text-muted text-uppercase mb-1">
                      Deposit Bank Account {payForm.method !== "Cash" ? "*" : ""}
                    </Label>
                    <Input
                      type="select"
                      required={payForm.method !== "Cash"}
                      value={payForm.bank_account_id}
                      onChange={(e) => setPayForm({ ...payForm, bank_account_id: e.target.value })}
                      className="px-3 py-2"
                      style={{ borderRadius: "8px" }}
                    >
                      {payForm.method === "Cash" && (
                        <option value="">Cash in Hand (No Bank Deposit)</option>
                      )}
                      {payForm.method !== "Cash" && (
                        <option value="">-- Select Bank Account --</option>
                      )}
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.account_name} {b.bank_name ? `(${b.bank_name})` : ""} - Current Balance: ₹
                          {parseFloat(b.current_balance || 0).toFixed(2)}
                        </option>
                      ))}
                    </Input>
                  </Col>
                )}

                <Col md={6}>
                  <Label className="fw-bold small text-muted text-uppercase mb-1">
                    Transaction / Reference No
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. UTR / Cheque / Ref #"
                    value={payForm.payment_ref_no}
                    onChange={(e) => setPayForm({ ...payForm, payment_ref_no: e.target.value })}
                    className="px-3 py-2"
                    style={{ borderRadius: "8px" }}
                  />
                </Col>

                <Col md={6}>
                  <Label className="fw-bold small text-muted text-uppercase mb-1">
                    Description / Notes
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. Balance settlement"
                    value={payForm.payment_for}
                    onChange={(e) => setPayForm({ ...payForm, payment_for: e.target.value })}
                    className="px-3 py-2"
                    style={{ borderRadius: "8px" }}
                  />
                </Col>
              </Row>

              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                <Button color="secondary" outline onClick={closePayModal} disabled={payLoading}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={payLoading || !payForm.amount || Number(payForm.amount) <= 0}
                  className="px-4 fw-bold shadow-sm"
                  style={{
                    background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                    color: "#08090D",
                    fontWeight: "800",
                    border: "none",
                  }}
                >
                  {payLoading ? "Processing..." : `Record Payment (₹${(Number(payForm.amount) || 0).toFixed(2)})`}
                </Button>
              </div>
            </form>
          )}
        </ModalBody>
      </Modal>

      {/* CANCEL SALE MODAL WITH ADVANCE REFUND OPTION */}
      <Modal isOpen={cancelModal} toggle={closeCancelModal} centered size="md">
        <ModalHeader
          toggle={closeCancelModal}
          className="border-bottom text-danger fw-bold"
          style={{ backgroundColor: "#FEF2F2" }}
        >
          <div className="d-flex align-items-center gap-2">
            <FaBan className="text-danger" />
            <span>Cancel Sale - {cancelTarget?.invoice_no || `SE-${cancelTarget?.id}`}</span>
          </div>
        </ModalHeader>
        <ModalBody className="p-4">
          {cancelTarget && (
            <form onSubmit={handleCancelSubmit}>
              <div
                className="p-3 mb-3 rounded-3"
                style={{ backgroundColor: "#FFF7ED", border: "1px solid #FFEDD5" }}
              >
                <div className="fw-bold text-dark mb-1" style={{ fontSize: "0.92rem" }}>
                  ⚠️ Warning: Cancelling this sale cannot be undone
                </div>
                <small className="text-muted">
                  All sold items and quantities will be returned back into inventory stock.
                </small>
              </div>

              <div className="bg-light p-3 rounded-3 mb-3 border">
                <Row className="g-2 small">
                  <Col xs={6}>
                    <span className="text-muted">Customer:</span>{" "}
                    <strong>{cancelTarget.customer_name || "Walk-in Customer"}</strong>
                  </Col>
                  <Col xs={6}>
                    <span className="text-muted">Date:</span>{" "}
                    <strong>{formatDate(cancelTarget.date)}</strong>
                  </Col>
                  <Col xs={6}>
                    <span className="text-muted">Total Amount:</span>{" "}
                    <strong className="text-dark">₹{Number(cancelTarget.total_amount || 0).toFixed(2)}</strong>
                  </Col>
                  <Col xs={6}>
                    <span className="text-muted">Advance / Total Paid:</span>{" "}
                    <strong className="text-success">₹{Number(cancelTarget.total_paid || 0).toFixed(2)}</strong>
                  </Col>
                </Row>
              </div>

              {Number(cancelTarget.total_paid || 0) > 0 && (
                <div
                  className="p-3 rounded-3 mb-3"
                  style={{
                    backgroundColor: "#F0FDF4",
                    border: "1.5px solid #BBF7D0",
                  }}
                >
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="refundAdvanceCheck"
                      checked={cancelForm.refund_advance}
                      onChange={(e) =>
                        setCancelForm({
                          ...cancelForm,
                          refund_advance: e.target.checked,
                          refund_amount: e.target.checked
                            ? String(Number(cancelTarget.total_paid || 0).toFixed(2))
                            : "0",
                        })
                      }
                      style={{ cursor: "pointer" }}
                    />
                    <label
                      className="form-check-label fw-bold text-success"
                      htmlFor="refundAdvanceCheck"
                      style={{ cursor: "pointer" }}
                    >
                      Refund Advance / Paid Amount
                    </label>
                  </div>

                  {cancelForm.refund_advance && (
                    <Row className="g-2 mt-1">
                      <Col md={6}>
                        <Label className="fw-bold small text-muted mb-1">
                          Refund Amount (₹) *
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={Number(cancelTarget.total_paid || 0)}
                          required
                          value={cancelForm.refund_amount}
                          onChange={(e) =>
                            setCancelForm({ ...cancelForm, refund_amount: e.target.value })
                          }
                          onWheel={(e) => e.currentTarget.blur()}
                          bsSize="sm"
                          className="fw-bold text-danger"
                        />
                      </Col>
                      <Col md={6}>
                        <Label className="fw-bold small text-muted mb-1">
                          Refund Method *
                        </Label>
                        <Input
                          type="select"
                          required
                          value={cancelForm.refund_method}
                          onChange={(e) =>
                            setCancelForm({ ...cancelForm, refund_method: e.target.value })
                          }
                          bsSize="sm"
                        >
                          <option value="Cash">Cash</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="UPI">UPI / GPay / PhonePe</option>
                          <option value="Cheque">Cheque</option>
                        </Input>
                      </Col>

                      {cancelForm.refund_method !== "Cash" && (
                        <Col md={12}>
                          <Label className="fw-bold small text-muted mb-1">
                            Deduct from Bank Account *
                          </Label>
                          <Input
                            type="select"
                            required
                            value={cancelForm.bank_account_id}
                            onChange={(e) =>
                              setCancelForm({ ...cancelForm, bank_account_id: e.target.value })
                            }
                            bsSize="sm"
                          >
                            <option value="">-- Select Bank Account --</option>
                            {bankAccounts.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.account_name} {b.bank_name ? `(${b.bank_name})` : ""} - Balance: ₹
                                {parseFloat(b.current_balance || 0).toFixed(2)}
                              </option>
                            ))}
                          </Input>
                        </Col>
                      )}
                    </Row>
                  )}
                </div>
              )}

              <div className="mb-3">
                <Label className="fw-semibold small text-muted mb-1">
                  Reason for Cancellation
                </Label>
                <Input
                  type="textarea"
                  rows="2"
                  placeholder="e.g. Customer cancelled order / returned items"
                  value={cancelForm.notes}
                  onChange={(e) => setCancelForm({ ...cancelForm, notes: e.target.value })}
                  bsSize="sm"
                />
              </div>

              <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                <Button color="secondary" outline onClick={closeCancelModal} disabled={cancelLoading}>
                  Keep Sale
                </Button>
                <Button
                  type="submit"
                  color="danger"
                  className="fw-bold px-3"
                  disabled={cancelLoading}
                >
                  {cancelLoading
                    ? "Cancelling..."
                    : cancelForm.refund_advance && Number(cancelForm.refund_amount) > 0
                    ? `Cancel Sale & Refund ₹${Number(cancelForm.refund_amount).toFixed(2)}`
                    : "Confirm Cancel Sale"}
                </Button>
              </div>
            </form>
          )}
        </ModalBody>
      </Modal>
    </>
  );
}
