import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Table,
  Button,
  Input,
  FormGroup,
  Label,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import axios from "axios";
import Select from "react-select";
import { apiUrl } from "../config/urls";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Ledger = () => {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState("");
  const [contactType, setContactType] = useState("customer");
  const [ledgerData, setLedgerData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
  });

  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "Cash",
    bank_account_id: "",
    paid_from: "Cash",
    reference_no: "",
    cheque_no: "",
    cheque_date: new Date().toISOString().slice(0, 10),
    collection_person: "",
    notes: "",
  });
  const [bankAccounts, setBankAccounts] = useState([]);
  const [savingPayment, setSavingPayment] = useState(false);

  const [detailModal, setDetailModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const toggleDetailModal = (entry = null) => {
    setSelectedEntry(entry);
    setDetailModal(!detailModal);
  };

  const togglePaymentModal = () => {
    if (!selectedContact) {
      toast.warning("Please select a vendor first");
      return;
    }
    setPaymentModal(!paymentModal);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setSavingPayment(true);
    try {
      await axios.post(apiUrl("vendor-payments"), {
        vendor_id: selectedContact,
        ...paymentForm,
      });
      toast.success("Payment recorded successfully");
      setPaymentModal(false);
      setPaymentForm({
        amount: "",
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: "Cash",
        bank_account_id: "",
        paid_from: "Cash",
        reference_no: "",
        cheque_no: "",
        cheque_date: new Date().toISOString().slice(0, 10),
        collection_person: "",
        notes: "",
      });
      fetchLedger();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const endpoint = contactType === "customer" ? "customers" : "vendors";
      const res = await axios.get(apiUrl(endpoint), { params: { all: "true" } });
      const data = res.data.data || res.data;
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load contacts");
    }
  };

  useEffect(() => {
    fetchContacts();
    setLedgerData([]);
    setSelectedContact("");
    
    axios.get(apiUrl("bank-accounts")).then(res => setBankAccounts(res.data)).catch(() => {});
  }, [contactType]);

  const fetchLedger = async () => {
    if (!selectedContact) {
      toast.warning("Please select a contact");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(apiUrl("ledger"), {
        params: {
          contact_id: selectedContact,
          type: contactType,
          ...filters,
        },
      });
      const filtered = (res.data || []).filter(entry => {
        // Only display credit values sale and purchase; do not display paid bills
        if (contactType === "customer" && entry.entry_type === "Sale") {
          const debit = Number(entry.debit) || 0;
          const credit = Number(entry.credit) || 0;
          if (debit - credit <= 0.01 || String(entry.status || "").toLowerCase() === "paid") {
            return false;
          }
        }
        if (contactType === "vendor" && entry.entry_type === "Purchase") {
          const debit = Number(entry.debit) || 0;
          const credit = Number(entry.credit) || 0;
          if (credit - debit <= 0.01 || String(entry.status || "").toLowerCase() === "paid") {
            return false;
          }
        }
        return true;
      });
      const processed = filtered.map(entry => {
        const debit = Math.round(Number(entry.debit || 0));
        const credit = Math.round(Number(entry.credit || 0));
        return {
          ...entry,
          debit,
          credit
        };
      });
      let runningBalance = 0;
      const finalData = processed.map(entry => {
        runningBalance += entry.debit - entry.credit;
        return {
          ...entry,
          balance: runningBalance
        };
      });
      setLedgerData(finalData);
    } catch (err) {
      toast.error("Failed to fetch ledger data");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <Container fluid className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <h2 className="text-primary fw-bold">Ledger Sections</h2>
        <div className="d-flex gap-2">
          {contactType === "vendor" && selectedContact && (
            <Button color="primary" onClick={togglePaymentModal}>
              Pay Vendor
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-sm mb-4 no-print border-0">
        <CardBody className="bg-light rounded">
          <Row className="align-items-end">
            <Col md={3}>
              <FormGroup>
                <Label className="fw-bold">Contact Type</Label>
                <Input
                  type="select"
                  value={contactType}
                  onChange={(e) => setContactType(e.target.value)}
                >
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                </Input>
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup>
                <Label className="fw-bold">
                  Select {contactType === "customer" ? "Customer" : "Vendor"}
                </Label>
                <Select
                  options={contacts.map((c) => ({
                    value: c.id,
                    label:
                      `${c.customer_name || c.vendor_name || c.company_name || ""} ${c.contact_no || c.mobile ? `(${c.contact_no || c.mobile})` : ""}`.trim(),
                  }))}
                  value={
                    selectedContact
                      ? {
                          value: selectedContact,
                          label: (() => {
                            const c = contacts.find(
                              (x) => String(x.id) === String(selectedContact),
                            );
                            return c
                              ? `${c.customer_name || c.vendor_name || c.company_name || ""} ${c.contact_no || c.mobile ? `(${c.contact_no || c.mobile})` : ""}`.trim()
                              : "";
                          })(),
                        }
                      : null
                  }
                  onChange={(opt) => setSelectedContact(opt ? opt.value : "")}
                  placeholder="-- Select --"
                  isClearable
                  isSearchable
                />
              </FormGroup>
            </Col>
            <Col md={2}>
              <FormGroup>
                <Label className="fw-bold">From Date</Label>
                <Input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) =>
                    setFilters({ ...filters, fromDate: e.target.value })
                  }
                />
              </FormGroup>
            </Col>
            <Col md={2}>
              <FormGroup>
                <Label className="fw-bold">To Date</Label>
                <Input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) =>
                    setFilters({ ...filters, toDate: e.target.value })
                  }
                />
              </FormGroup>
            </Col>
            <Col md={2}>
              <Button
                color="primary"
                block
                onClick={fetchLedger}
                disabled={loading}
                className="mb-3"
              >
                {loading ? <Spinner size="sm" /> : "Fetch Ledger"}
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {ledgerData.length > 0 && (
        <Row className="mb-4 no-print g-3">
          <Col md={3}>
            <Card className="border shadow-sm h-100">
              <CardBody className="text-center p-3">
                <div className="small text-muted text-uppercase fw-bold">
                  Total Bills
                </div>
                <h4 className="fw-bold mb-0">
                  {
                    ledgerData.filter(
                      (e) =>
                        e.entry_type === "Purchase" ||
                        e.entry_type === "Sale" ||
                        e.entry_type === "Service Bill",
                    ).length
                  }
                </h4>
              </CardBody>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border shadow-sm h-100">
              <CardBody className="text-center p-3">
                <div className="small text-muted text-uppercase fw-bold">
                  {contactType === "customer"
                    ? "Total Billed (Debit)"
                    : "Total Paid (Debit)"}
                </div>
                <h4 className="fw-bold mb-0 text-danger">
                  ₹
                  {ledgerData
                    .reduce((sum, e) => sum + Number(e.debit || 0), 0)
                    .toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                </h4>
              </CardBody>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border shadow-sm h-100">
              <CardBody className="text-center p-3">
                <div className="small text-muted text-uppercase fw-bold">
                  {contactType === "customer"
                    ? "Total Paid (Credit)"
                    : "Total Billed (Credit)"}
                </div>
                <h4 className="fw-bold mb-0 text-success">
                  ₹
                  {ledgerData
                    .reduce((sum, e) => sum + Number(e.credit || 0), 0)
                    .toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                </h4>
              </CardBody>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border shadow-sm h-100">
              <CardBody className="text-center p-3">
                <div className="small text-muted text-uppercase fw-bold">
                  Overall Balance
                </div>
                <h4
                  className={`fw-bold mb-0 ${ledgerData[ledgerData.length - 1].balance > 0 ? "text-warning" : "text-primary"}`}
                >
                  ₹
                  {Math.abs(
                    ledgerData[ledgerData.length - 1].balance,
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                  {ledgerData[ledgerData.length - 1].balance > 0
                    ? " (Dr)"
                    : " (Cr)"}
                </h4>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      <Card className="shadow-sm border-0">
        <CardBody>
          <div className="text-center mb-4 only-print">
            <h3>CLAVIS TECH WORKS</h3>
            <h5>{contactType.toUpperCase()} LEDGER</h5>
            <p>
              {(selectedContact &&
                contacts.find((c) => c.id == selectedContact)?.customer_name) ||
                contacts.find((c) => c.id == selectedContact)?.vendor_name}
            </p>
          </div>

          <Table responsive bordered hover className="mt-2">
            <thead className="table-dark text-center">
              <tr>
                <th style={{ width: "100px" }}>Date</th>
                <th style={{ width: "180px" }}>Contact</th>
                <th style={{ width: "150px" }}>Reference</th>
                <th style={{ width: "130px" }}>Type</th>
                <th>Description</th>
                <th style={{ width: "120px" }}>Debit</th>
                <th style={{ width: "120px" }}>Credit</th>
                <th style={{ width: "140px" }}>Balance</th>
                <th style={{ width: "80px" }} className="no-print">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {ledgerData.length > 0 ? (
                ledgerData.map((entry, index) => (
                  <tr key={index} className="align-middle">
                    <td className="text-center text-muted small">
                      {formatDate(entry.date)}
                    </td>
                    <td className="small fw-bold">
                      {entry.contact_name || "-"}
                    </td>
                    <td className="fw-bold text-dark">{entry.ref_no}</td>
                    <td className="text-center">
                      <span
                        className={`badge rounded-pill px-3 py-2 bg-${
                          entry.entry_type === "Sale"
                            ? "primary"
                            : entry.entry_type === "Service Bill"
                              ? "info"
                              : entry.entry_type.includes("Payment")
                                ? "success"
                                : "warning"
                        }`}
                        style={{
                          fontSize: "0.7rem",
                          minWidth: "100px",
                          display: "inline-block",
                        }}
                      >
                        {entry.entry_type}
                      </span>
                    </td>
                    <td
                      className="small text-muted text-truncate"
                      style={{ maxWidth: "200px" }}
                    >
                      {entry.description || "-"}
                    </td>
                    <td className="text-end text-danger fw-bold">
                      {entry.debit > 0 ? (
                        <div>
                          <div>
                            ₹
                            {Number(entry.debit).toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </div>
                          {contactType === "vendor" && entry.payments && entry.payments.length > 1 && (
                            <span
                              className="badge bg-info-subtle text-info border border-info"
                              style={{ fontSize: "0.65rem", cursor: "pointer" }}
                              onClick={() => toggleDetailModal(entry)}
                              title="Click to view payment history"
                            >
                              {entry.payments.length} Payments
                            </span>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="text-end text-success fw-bold">
                      {entry.credit > 0 ? (
                        <div>
                          <div>
                            ₹
                            {Number(entry.credit).toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </div>
                          {contactType === "customer" && entry.payments && entry.payments.length > 1 && (
                            <span
                              className="badge bg-info-subtle text-info border border-info"
                              style={{ fontSize: "0.65rem", cursor: "pointer" }}
                              onClick={() => toggleDetailModal(entry)}
                              title="Click to view payment history"
                            >
                              {entry.payments.length} Payments
                            </span>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td
                      className={`text-end fw-bold ${
                        Math.abs(entry.balance) < 0.01
                          ? "text-muted"
                          : entry.balance > 0
                            ? "text-danger"
                            : "text-success"
                      }`}
                    >
                      ₹
                      {Math.abs(entry.balance).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                      {Math.abs(entry.balance) < 0.01
                        ? ""
                        : entry.balance > 0
                          ? " (Dr)"
                          : " (Cr)"}
                    </td>
                    <td className="text-center no-print">
                      <Button
                        color="link"
                        size="sm"
                        className="p-0 text-primary fw-bold"
                        onClick={() => toggleDetailModal(entry)}
                      >
                        {entry.payments && entry.payments.length > 0
                          ? "View History"
                          : "View"}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="9"
                    className="text-center py-5 text-muted border-0"
                  >
                    {loading ? (
                      <Spinner color="primary" />
                    ) : (
                      <div className="py-4">
                        <i
                          className="fa fa-info-circle mb-2"
                          style={{ fontSize: "2rem", opacity: 0.3 }}
                        ></i>
                        <p>No transactions found for this contact.</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
            {ledgerData.length > 0 && (
              <tfoot>
                <tr className="table-light fw-bold border-top border-dark">
                  <td colSpan="5" className="text-end py-3">
                    Closing Balance
                  </td>
                  <td className="text-end text-danger py-3">
                    ₹
                    {ledgerData
                      .reduce((sum, e) => sum + Number(e.debit || 0), 0)
                      .toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                  </td>
                  <td className="text-end text-success py-3">
                    ₹
                    {ledgerData
                      .reduce((sum, e) => sum + Number(e.credit || 0), 0)
                      .toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                  </td>
                  <td
                    className={`text-end py-3 ${
                      Math.abs(ledgerData[ledgerData.length - 1].balance) < 0.01
                        ? "text-muted"
                        : ledgerData[ledgerData.length - 1].balance > 0
                          ? "text-danger"
                          : "text-success"
                    }`}
                  >
                    ₹
                    {Math.abs(
                      ledgerData[ledgerData.length - 1].balance,
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                    {Math.abs(ledgerData[ledgerData.length - 1].balance) < 0.01
                      ? ""
                      : ledgerData[ledgerData.length - 1].balance > 0
                        ? " (Dr)"
                        : " (Cr)"}
                  </td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            )}
          </Table>
        </CardBody>
      </Card>

      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            .only-print { display: block !important; }
            .card { border: none !important; box-shadow: none !important; }
            .container-fluid { padding: 0 !important; }
            body { background: white !important; }
          }
          .only-print { display: none; }
        `}
      </style>

      {/* Payment Modal */}
      <Modal isOpen={paymentModal} toggle={togglePaymentModal}>
        <ModalHeader toggle={togglePaymentModal}>
          Record Vendor Payment
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Vendor</Label>
            <Input
              type="text"
              readOnly
              value={
                contacts.find((c) => c.id == selectedContact)?.company_name ||
                contacts.find((c) => c.id == selectedContact)?.vendor_name ||
                ""
              }
            />
          </FormGroup>
          <FormGroup>
            <Label className="fw-bold">Apply to Purchase Bill (Optional)</Label>
            <Input
              type="select"
              value={paymentForm.reference_no}
              onChange={(e) => {
                const selectedRef = e.target.value;
                const matchPurchase = ledgerData.find(
                  (d) => d.entry_type === "Purchase" && d.ref_no === selectedRef
                );
                const dueAmount = matchPurchase
                  ? Math.max(0, (Number(matchPurchase.credit) || 0) - (Number(matchPurchase.debit) || 0))
                  : "";
                setPaymentForm({
                  ...paymentForm,
                  reference_no: selectedRef,
                  amount: dueAmount > 0 ? dueAmount : paymentForm.amount,
                });
              }}
            >
              <option value="">-- Auto-Allocate to Pending Purchases --</option>
              {ledgerData
                .filter(
                  (d) =>
                    d.entry_type === "Purchase" &&
                    (Number(d.credit) || 0) > (Number(d.debit) || 0)
                )
                .map((p) => {
                  const due =
                    (Number(p.credit) || 0) - (Number(p.debit) || 0);
                  return (
                    <option key={p.id} value={p.ref_no}>
                      {p.ref_no} ({p.description || "Purchase"}) - Due: ₹
                      {due.toLocaleString()} (Total: ₹{Number(p.credit).toLocaleString()})
                    </option>
                  );
                })}
            </Input>
          </FormGroup>
          <FormGroup>
            <Label>Amount</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={paymentForm.amount}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, amount: e.target.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <Label>Payment Date</Label>
            <Input
              type="date"
              value={paymentForm.payment_date}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, payment_date: e.target.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <Label className="fw-bold">Payment Method</Label>
            <Input
              type="select"
              value={paymentForm.payment_method}
              onChange={(e) => {
                const method = e.target.value;
                setPaymentForm({
                  ...paymentForm,
                  payment_method: method,
                  paid_from: method === "Cash" ? "Cash" : "Current Account",
                });
              }}
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
            </Input>
          </FormGroup>

          {paymentForm.payment_method !== "Cash" && (
            <FormGroup>
              <Label className="fw-bold">Paid From (Select Account)</Label>
              <Input
                type="select"
                value={paymentForm.bank_account_id}
                onChange={(e) => {
                  const id = e.target.value;
                  const acc = bankAccounts.find((a) => a.id == id);
                  setPaymentForm({
                    ...paymentForm,
                    bank_account_id: id,
                    paid_from: acc ? acc.account_name : "",
                  });
                }}
              >
                <option value="">-- Select Bank Account --</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name} ({acc.bank_name}) - Bal: ₹
                    {Number(acc.current_balance).toFixed(2)}
                  </option>
                ))}
              </Input>
            </FormGroup>
          )}
          {paymentForm.payment_method === "Cheque" && (
            <Row className="g-2">
              <Col md={6}>
                <FormGroup>
                  <Label className="fw-bold">Cheque Number *</Label>
                  <Input
                    type="text"
                    value={paymentForm.cheque_no || ""}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, cheque_no: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label className="fw-bold">Cheque Date *</Label>
                  <Input
                    type="date"
                    value={paymentForm.cheque_date || ""}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, cheque_date: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>
            </Row>
          )}

          <FormGroup>
            <Label className="fw-bold">Collection Person / Agent</Label>
            <Input
              type="text"
              value={paymentForm.collection_person || ""}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, collection_person: e.target.value })
              }
            />
            <small className="text-muted">Vendor representative who collected the payment / cheque</small>
          </FormGroup>

          <FormGroup>
            <Label>Reference No (Optional)</Label>
            <Input
              type="text"
              value={paymentForm.reference_no}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, reference_no: e.target.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <Label>Notes</Label>
            <Input
              type="textarea"
              rows="2"
              value={paymentForm.notes}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, notes: e.target.value })
              }
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button
            color="secondary"
            onClick={togglePaymentModal}
            disabled={savingPayment}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={handlePaymentSubmit}
            disabled={savingPayment}
          >
            {savingPayment ? <Spinner size="sm" /> : "Save Payment"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Detail View Modal */}
      <Modal isOpen={detailModal} toggle={() => toggleDetailModal()} size="lg">
        <ModalHeader toggle={() => toggleDetailModal()}>
          Transaction Details: {selectedEntry?.ref_no}
        </ModalHeader>
        <ModalBody className="bg-light">
          {selectedEntry && (
            <div>
              <Row className="mb-4">
                <Col md={6}>
                  <div className="bg-white p-3 rounded shadow-sm">
                    <Label className="text-muted small text-uppercase mb-1">
                      Transaction Information
                    </Label>
                    <div className="fw-bold fs-5">
                      {selectedEntry.entry_type}
                    </div>
                    <div className="text-muted">
                      Date: {formatDate(selectedEntry.date)}
                    </div>
                    <div className="text-muted">
                      Ref No: {selectedEntry.ref_no}
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="bg-white p-3 rounded shadow-sm">
                    <Label className="text-muted small text-uppercase mb-1">
                      {contactType === "vendor"
                        ? "Vendor Details"
                        : "Customer Details"}
                    </Label>
                    <div className="fw-bold fs-5 text-primary">
                      {selectedEntry.contact_name}
                    </div>
                    <div className="text-muted">
                      Status:{" "}
                      <span className="badge bg-success">
                        {selectedEntry.status}
                      </span>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Financial Summary */}
              <Row className="mb-3 g-2">
                <Col md={4}>
                  <div className="bg-white p-2 rounded border text-center shadow-sm">
                    <small className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.72rem" }}>
                      {contactType === "customer" ? "Bill Amount" : "Purchase Amount"}
                    </small>
                    <div className="fs-5 fw-bold text-dark">
                      ₹{Number(
                        (contactType === "customer" ? selectedEntry.debit : selectedEntry.credit) || 0
                      ).toLocaleString()}
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="bg-white p-2 rounded border text-center shadow-sm">
                    <small className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.72rem" }}>
                      Paid Amount
                    </small>
                    <div className="fs-5 fw-bold text-success">
                      ₹{Number(
                        (contactType === "customer" ? selectedEntry.credit : selectedEntry.debit) || 0
                      ).toLocaleString()}
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="bg-white p-2 rounded border text-center shadow-sm">
                    <small className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.72rem" }}>
                      Balance Due
                    </small>
                    <div className={`fs-5 fw-bold ${
                      Math.abs(
                        Number(selectedEntry.debit || 0) - Number(selectedEntry.credit || 0)
                      ) > 0.01 ? "text-danger" : "text-muted"
                    }`}>
                      ₹{Math.abs(
                        Number(selectedEntry.debit || 0) - Number(selectedEntry.credit || 0)
                      ).toLocaleString()}
                      {Math.abs(
                        Number(selectedEntry.debit || 0) - Number(selectedEntry.credit || 0)
                      ) < 0.01 ? " (Paid)" : " (Due)"}
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Items Breakdown */}
              {selectedEntry.description && (
                <Card className="border-0 shadow-sm mb-3">
                  <CardBody className="p-3">
                    <Label className="fw-bold text-dark mb-2">
                      Items / Description
                    </Label>
                    <div className="p-2 bg-white rounded border">
                      <div className="lh-lg">
                        {selectedEntry.description.split(", ").map((item, i) => (
                          <div
                            key={i}
                            className="border-bottom py-1 d-flex justify-content-between align-items-center"
                          >
                            <span>{item}</span>
                            {selectedEntry.entry_type === "Purchase" ||
                            selectedEntry.entry_type === "Sale" ? (
                              <span className="badge bg-light text-dark border">
                                Item {i + 1}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Payment History */}
              <Card className="border-0 shadow-sm">
                <CardBody className="p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Label className="fw-bold text-dark mb-0">
                      Payment History {selectedEntry.payments && selectedEntry.payments.length > 0 ? `(${selectedEntry.payments.length})` : ""}
                    </Label>
                    {selectedEntry.payments && selectedEntry.payments.length > 0 && (
                      <span className="badge bg-success-subtle text-success border border-success">
                        Total Paid: ₹{Number(
                          (contactType === "customer" ? selectedEntry.credit : selectedEntry.debit) || 0
                        ).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {selectedEntry.payments && selectedEntry.payments.length > 0 ? (
                    <div className="table-responsive bg-white rounded border">
                      <Table size="sm" className="mb-0 align-middle">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: "40px" }}>#</th>
                            <th>Date</th>
                            <th>Method</th>
                            <th>Account / Ref</th>
                            <th className="text-end">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedEntry.payments.map((p, idx) => (
                            <tr key={idx}>
                              <td className="text-muted small">{idx + 1}</td>
                              <td className="small">{formatDate(p.date || selectedEntry.date)}</td>
                              <td>
                                <span className="badge bg-primary-subtle text-primary border border-primary">
                                  {p.method || p.paid_from || "Payment"}
                                </span>
                              </td>
                              <td className="small text-muted">
                                {p.bank_account_name || p.paid_from || (p.payment_ref_no ? `Ref: ${p.payment_ref_no}` : "-")}
                                {p.cheque_no && (
                                  <span className="badge bg-light text-dark border ms-1">
                                    Chq: {p.cheque_no} {p.cheque_date ? `(${formatDate(p.cheque_date)})` : ""}
                                  </span>
                                )}
                                {p.collection_person && (
                                  <span className="badge bg-info-subtle text-dark border ms-1">
                                    Coll: {p.collection_person}
                                  </span>
                                )}
                                {p.payment_for ? ` (${p.payment_for})` : ""}
                              </td>
                              <td className="text-end fw-bold text-success">
                                ₹{Number(p.amount || p.debit || p.credit || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="table-light fw-bold">
                          <tr>
                            <td colSpan="4" className="text-end">Total Paid</td>
                            <td className="text-end text-success">
                              ₹{Number(
                                (contactType === "customer" ? selectedEntry.credit : selectedEntry.debit) || 0
                              ).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </Table>
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded border text-center text-muted small">
                      {Number(contactType === "customer" ? selectedEntry.credit : selectedEntry.debit) > 0
                        ? `Paid in full (₹${Number(contactType === "customer" ? selectedEntry.credit : selectedEntry.debit).toLocaleString()})`
                        : "No payment recorded yet for this entry."}
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
                    <span className="text-muted small">
                      Running balance after this entry:
                    </span>
                    <span
                      className={`fw-bold ${selectedEntry.balance > 0 ? "text-danger" : "text-success"}`}
                    >
                      ₹
                      {Math.abs(selectedEntry.balance).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                      {selectedEntry.balance > 0 ? " (Dr)" : " (Cr)"}
                    </span>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => toggleDetailModal()}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
};

export default Ledger;
