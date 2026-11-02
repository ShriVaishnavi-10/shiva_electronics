import React, { useState, useEffect } from "react";
import {
  Container, Row, Col, Card, CardBody, Button, FormGroup, Label, Input, Table, Badge, Spinner
} from "reactstrap";
import axios from "axios";
import { apiUrl } from "../config/urls";
import { toast } from "react-toastify";
import { FaSun, FaMoon, FaHistory, FaCheckCircle, FaExclamationTriangle, FaFileInvoiceDollar, FaEdit } from "react-icons/fa";

const DayClosing = () => {
  const [dayStatus, setDayStatus] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingBalance, setOpeningBalance] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);

  const formatDateToYYYYMMDD = (dateVal) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateToDDMMYYYY = (dateVal) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await axios.get(apiUrl("daily-cash/status"), {
        params: { date: selectedDate }
      });
      setDayStatus(res.data);
      
      if (res.data.status === 'Open' || res.data.status === 'Closed') {
        // Fetch summary
        const summaryRes = await axios.get(apiUrl("daily-cash/summary"), {
          params: { date: selectedDate }
        });
        setSummary(summaryRes.data);
      } else {
        setSummary(null);
      }

      // Prefill fields
      if (res.data.status === 'Closed' || res.data.status === 'Open') {
        setOpeningBalance(res.data.opening_balance !== null && res.data.opening_balance !== undefined ? res.data.opening_balance : "");
        setActualCash(res.data.actual_cash !== null && res.data.actual_cash !== undefined ? res.data.actual_cash : "");
        setNotes(res.data.notes || "");
      } else {
        setOpeningBalance("");
        setActualCash("");
        setNotes("");
      }

      // Fetch history
      const historyRes = await axios.get(apiUrl("daily-cash/history"));
      setHistory(historyRes.data);
    } catch (err) {
      toast.error("Failed to fetch day status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsManuallyEdited(false);
    fetchStatus();
  }, [selectedDate]);

  useEffect(() => {
    if (dayStatus?.status === 'Open' && summary && !isManuallyEdited) {
      const calculated = Number(dayStatus.opening_balance) + summary.cash_sales - summary.cash_purchases - summary.cash_expenses;
      const rounded = Math.round(calculated);
      setActualCash(rounded > 0 ? rounded : "");
    }
  }, [dayStatus, summary, isManuallyEdited]);

  const handleStartDay = async () => {
    if (openingBalance === "") {
      toast.error("Please enter opening balance");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(apiUrl("daily-cash/start"), { 
        opening_balance: openingBalance,
        date: selectedDate
      });
      toast.success("Day started successfully");
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start day");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDay = async () => {
    if (actualCash === "") {
      toast.error("Please enter actual physical cash amount");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(apiUrl("daily-cash/close"), {
        ...summary,
        actual_cash: actualCash,
        notes,
        date: selectedDate
      });
      toast.success("Day closed successfully");
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to close day");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRegistry = async () => {
    if (openingBalance === "") {
      toast.error("Please enter opening balance");
      return;
    }
    if (dayStatus?.status === 'Closed' && actualCash === "") {
      toast.error("Please enter actual physical cash");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(apiUrl("daily-cash/update"), {
        date: selectedDate,
        opening_balance: openingBalance,
        actual_cash: actualCash,
        notes,
        status: dayStatus?.status
      });
      toast.success("Registry updated successfully");
      setIsEditing(false);
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update registry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopenRegistry = async () => {
    setSubmitting(true);
    try {
      await axios.post(apiUrl("daily-cash/update"), {
        date: selectedDate,
        opening_balance: dayStatus.opening_balance,
        actual_cash: dayStatus.actual_cash,
        notes: dayStatus.notes,
        status: 'Open'
      });
      toast.success("Registry re-opened successfully");
      setIsManuallyEdited(false);
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to re-open registry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditFromHistory = async (h) => {
    const formatted = formatDateToYYYYMMDD(h.date);
    setSelectedDate(formatted);
    
    setSubmitting(true);
    try {
      await axios.post(apiUrl("daily-cash/update"), {
        date: formatted,
        opening_balance: h.opening_balance,
        actual_cash: h.actual_cash,
        notes: h.notes || "",
        status: 'Open'
      });
      toast.success("Registry re-opened successfully");
      setIsManuallyEdited(false);
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to re-open registry");
    } finally {
      setSubmitting(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calculateCalculatedClosing = () => {
    if (!dayStatus || !summary) return 0;
    const opening = isEditing ? Number(openingBalance || 0) : Number(dayStatus.opening_balance);
    return opening + summary.cash_sales - summary.cash_purchases - summary.cash_expenses;
  };

  if (loading) return <div className="text-center p-5"><Spinner color="primary" /></div>;

  return (
    <Container fluid className="p-2 p-md-4 bg-light min-vh-100">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="text-dark fw-bold mb-0 fs-3">Opening Balance & Closing Registry</h2>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <FormGroup className="mb-0 d-flex align-items-center">
            <Label className="fw-bold small mb-0 me-2">Select Date:</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                const dateStr = e.target.value;
                setSelectedDate(dateStr);
                
                setIsEditing(false);
              }}
              style={{ maxWidth: '160px', width: '100%' }}
              max={new Date().toISOString().slice(0, 10)}
            />
          </FormGroup>
          {dayStatus?.status === 'Closed' && (
            <Badge color="success" pill className="px-3 py-2">Day Closed</Badge>
          )}
          {dayStatus?.status === 'Open' && (
            <Badge color="primary" pill className="px-3 py-2">Day In Progress</Badge>
          )}
        </div>
      </div>

      <Row>
        <Col lg={12}>
          {dayStatus?.status === 'Not Started' && (
            <Card className="border shadow-sm mb-4">
              <CardBody className="p-4">
                <h5 className="fw-bold mb-3">Set Opening Balance ({formatDateToDDMMYYYY(selectedDate)})</h5>
                <p className="text-muted small">Enter the opening cash balance to begin today's record.</p>
                <hr />
                <Row className="align-items-end g-3">
                  <Col md={6}>
                    <FormGroup className="mb-0">
                      <Label className="fw-bold small">Opening Cash Balance (₹)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(e.target.value)}
                      />
                      <div className="text-muted x-small mt-1">Suggested (last closing): ₹{Number(dayStatus.lastClosing).toFixed(2)}</div>
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <Button color="primary" className="fw-bold w-100" onClick={handleStartDay} disabled={submitting}>
                      {submitting ? <Spinner size="sm" /> : "Set Opening Balance"}
                    </Button>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          )}

          {dayStatus?.status === 'Open' && summary && !isEditing && (
            <>
              <Row className="g-4 mb-4">
                <Col md={6}>
                  <Card className="border shadow-sm h-100">
                    <CardBody className="p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="text-muted fw-bold small text-uppercase mb-0">Live Summary ({formatDateToDDMMYYYY(selectedDate)})</h6>
                        <Button color="link" size="sm" className="p-0 text-warning fw-bold text-decoration-none small" onClick={() => setIsEditing(true)}>
                          <FaEdit className="me-1" /> Edit Opening
                        </Button>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="small text-muted">Opening Balance:</span>
                        <span className="fw-bold">₹{Number(dayStatus.opening_balance).toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1 text-success">
                        <span className="small">Sales Inflow (+):</span>
                        <span className="fw-bold">₹{summary.cash_sales.toFixed(2)}</span>
                      </div>

                      <div className="d-flex justify-content-between mb-1 text-danger">
                        <span className="small">Purchase Outflow (-):</span>
                        <span className="fw-bold">₹{summary.cash_purchases.toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1 text-danger">
                        <span className="small">Expense Outflow (-):</span>
                        <span className="fw-bold">₹{summary.cash_expenses.toFixed(2)}</span>
                      </div>
                      {(Number(summary.cash_expenses_gst) > 0 || Number(summary.cash_expenses_non_gst) > 0) && (
                        <div className="d-flex justify-content-between mb-3 text-muted" style={{ fontSize: "0.75rem" }}>
                          <span>Breakdown:</span>
                          <span>
                            {Number(summary.cash_expenses_gst) > 0 && `GST: ₹${Number(summary.cash_expenses_gst).toFixed(2)}`}
                            {Number(summary.cash_expenses_gst) > 0 && Number(summary.cash_expenses_non_gst) > 0 && " | "}
                            {Number(summary.cash_expenses_non_gst) > 0 && `Non-GST: ₹${Number(summary.cash_expenses_non_gst).toFixed(2)}`}
                          </span>
                        </div>
                      )}
                      <hr />
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <span className="fw-bold">Calculated Cash:</span>
                        <span className="h4 mb-0 fw-bold text-primary">₹{calculateCalculatedClosing().toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-1 text-muted">
                        <span className="small fw-semibold">Round Off Cash:</span>
                        <span className="fw-bold text-secondary">₹{Math.round(calculateCalculatedClosing()).toFixed(2)}</span>
                      </div>
                    </CardBody>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border shadow-sm h-100">
                    <CardBody className="p-4">
                      <h6 className="text-muted fw-bold small text-uppercase mb-3">Closing Balance</h6>
                      <FormGroup>
                        <Label className="small fw-bold">Actual Physical Cash *</Label>
                        <Input
                          type="number"
                          value={actualCash}
                          onChange={(e) => {
                            setActualCash(e.target.value);
                            setIsManuallyEdited(true);
                          }}
                          className="form-control-lg"
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label className="small fw-bold">Closing Notes</Label>
                        <Input
                          type="textarea"
                          rows="1"
                          placeholder="Optional notes..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </FormGroup>
                      <Button color="success" className="fw-bold w-100 py-2" onClick={handleCloseDay} disabled={submitting}>
                        {submitting ? <Spinner size="sm" /> : "Save Closing Balance"}
                      </Button>
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              <Card className="border shadow-sm mb-4">
                <CardBody className="p-0">
                  <div className="p-3 border-bottom">
                    <h6 className="fw-bold mb-0 text-muted small text-uppercase">Transaction Summary (Cash)</h6>
                  </div>
                  <Table responsive hover className="mb-0">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-4 py-2 border-bottom small text-muted">Description</th>
                        <th className="py-2 border-bottom small text-muted text-end">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-4 py-2">Cash Sales</td>
                        <td className="py-2 text-end text-dark fw-bold">₹{summary.cash_sales.toFixed(2)}</td>
                      </tr>

                      <tr>
                        <td className="px-4 py-2">Vendor Payments</td>
                        <td className="py-2 text-end text-dark fw-bold">₹{summary.cash_purchases.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 border-0">
                          <div>Business Expenses</div>
                          {(Number(summary.cash_expenses_gst) > 0 || Number(summary.cash_expenses_non_gst) > 0) && (
                            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                              {Number(summary.cash_expenses_gst) > 0 && <span>GST: ₹{Number(summary.cash_expenses_gst).toFixed(2)}</span>}
                              {Number(summary.cash_expenses_gst) > 0 && Number(summary.cash_expenses_non_gst) > 0 && <span> | </span>}
                              {Number(summary.cash_expenses_non_gst) > 0 && <span>Non-GST: ₹{Number(summary.cash_expenses_non_gst).toFixed(2)}</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-2 text-end text-dark fw-bold border-0 align-middle">₹{summary.cash_expenses.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </>
          )}

          {dayStatus?.status === 'Closed' && !isEditing && (
            <Card className="border shadow-sm mb-4 border-success">
              <CardBody className="p-5 text-center">
                <FaCheckCircle size={40} className="text-success mb-3" />
                <h4 className="fw-bold">Balance Closed ({formatDateToDDMMYYYY(selectedDate)})</h4>
                <p className="text-muted">The cash settlement has been completed.</p>
                <Row className="justify-content-center mt-4 mb-3 g-3">
                  <Col md={4}>
                    <div className="small text-muted">Opening Balance</div>
                    <div className="h5 fw-bold">₹{Number(dayStatus.opening_balance).toFixed(2)}</div>
                  </Col>
                  <Col md={4}>
                    <div className="small text-muted">Calculated Closing</div>
                    <div className="h5 fw-bold">₹{Number(dayStatus.closing_balance).toFixed(2)}</div>
                  </Col>
                  <Col md={4}>
                    <div className="small text-muted">Actual Cash</div>
                    <div className="h5 fw-bold text-primary">₹{Number(dayStatus.actual_cash).toFixed(2)}</div>
                  </Col>
                </Row>
                {dayStatus.notes && (
                  <div className="mt-3 p-3 bg-light rounded text-start border d-inline-block w-100">
                    <strong className="small text-uppercase text-muted d-block mb-1">Notes:</strong>
                    <span className="text-dark">{dayStatus.notes}</span>
                  </div>
                )}
                <hr className="my-4" />
                <Button color="warning" className="fw-bold px-4" onClick={handleReopenRegistry} disabled={submitting}>
                  {submitting ? <Spinner size="sm" /> : <><FaEdit className="me-2" /> Edit / Re-open Balance</>}
                </Button>
              </CardBody>
            </Card>
          )}

          {isEditing && (
            <Card className="border shadow-sm mb-4 border-warning">
              <CardBody className="p-4">
                <h5 className="fw-bold mb-3 text-warning">Edit Balance ({formatDateToDDMMYYYY(selectedDate)})</h5>
                <p className="text-muted small">You can update the opening balance, actual cash, and notes for this date.</p>
                <hr />
                <Row className="g-3 mb-3">
                  <Col md={dayStatus?.status === 'Closed' ? 6 : 12}>
                    <FormGroup>
                      <Label className="small fw-bold">Opening Cash Balance (₹)</Label>
                      <Input
                        type="number"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(e.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  {dayStatus?.status === 'Closed' && (
                    <Col md={6}>
                      <FormGroup>
                        <Label className="small fw-bold">Actual Physical Cash (₹)</Label>
                        <Input
                          type="number"
                          value={actualCash}
                          onChange={(e) => {
                            setActualCash(e.target.value);
                            setIsManuallyEdited(true);
                          }}
                        />
                      </FormGroup>
                    </Col>
                  )}
                  <Col md={12}>
                    <FormGroup className="mb-0">
                      <Label className="small fw-bold">Notes</Label>
                      <Input
                        type="textarea"
                        rows="2"
                        placeholder="Enter notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </FormGroup>
                  </Col>
                </Row>
                
                {summary && (
                  <div className="mt-3 p-3 bg-light rounded border mb-3">
                    <h6 className="fw-bold small text-uppercase text-muted mb-2">Calculated Details (Live)</h6>
                    <div className="d-flex justify-content-between mb-1 small">
                      <span>Sales Inflow (+):</span>
                      <span className="fw-bold">₹{summary.cash_sales.toFixed(2)}</span>
                    </div>

                    <div className="d-flex justify-content-between mb-1 small">
                      <span>Purchase Outflow (-):</span>
                      <span className="fw-bold">₹{summary.cash_purchases.toFixed(2)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1 small text-danger">
                      <span>Expense Outflow (-):</span>
                      <span className="fw-bold">₹{summary.cash_expenses.toFixed(2)}</span>
                    </div>
                    {(Number(summary.cash_expenses_gst) > 0 || Number(summary.cash_expenses_non_gst) > 0) && (
                      <div className="d-flex justify-content-between mb-2 text-muted" style={{ fontSize: "0.72rem" }}>
                        <span>Breakdown:</span>
                        <span>
                          {Number(summary.cash_expenses_gst) > 0 && `GST: ₹${Number(summary.cash_expenses_gst).toFixed(2)}`}
                          {Number(summary.cash_expenses_gst) > 0 && Number(summary.cash_expenses_non_gst) > 0 && " | "}
                          {Number(summary.cash_expenses_non_gst) > 0 && `Non-GST: ₹${Number(summary.cash_expenses_non_gst).toFixed(2)}`}
                        </span>
                      </div>
                    )}
                    <hr className="my-1" />
                     <div className="d-flex justify-content-between align-items-center fw-bold">
                      <span>New Calculated Cash:</span>
                      <span className="text-primary">
                        ₹{calculateCalculatedClosing().toFixed(2)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-1 text-muted small">
                      <span>Round Off Cash:</span>
                      <span className="fw-bold text-secondary">
                        ₹{Math.round(calculateCalculatedClosing()).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="d-flex gap-2">
                  <Button color="success" className="fw-bold px-4" onClick={handleUpdateRegistry} disabled={submitting}>
                    {submitting ? <Spinner size="sm" /> : "Save Changes"}
                  </Button>
                  <Button color="secondary" className="fw-bold px-4" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </Col>

        <Col lg={12}>
          <Card className="border shadow-sm">
            <CardBody className="p-0">
              <div className="p-3 border-bottom d-flex align-items-center bg-light">
                <FaHistory className="text-muted me-2" />
                <h6 className="fw-bold mb-0 small text-uppercase">Detailed Opening & Closing History</h6>
              </div>
              <Table responsive hover className="mb-0 small align-middle">
                <thead>
                  <tr className="bg-white">
                    <th className="px-3 py-3 border-0">Date</th>
                    <th className="py-3 border-0 text-end">Opening</th>
                    <th className="py-3 border-0 text-end text-success">Sales</th>

                    <th className="py-3 border-0 text-end text-danger">Purchase</th>
                    <th className="py-3 border-0 text-end text-danger">Expense</th>
                    <th className="py-3 border-0 text-end">Calculated</th>
                    <th className="py-3 border-0 text-end text-primary">Actual</th>
                    <th className="py-3 border-0 text-center">Diff</th>
                    <th className="py-3 border-0 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan="10" className="text-center py-4 text-muted">No history found</td></tr>
                  ) : history.map((h, i) => (
                    <tr key={i}>
                      <td className="px-3 py-3 fw-bold">{formatDateToDDMMYYYY(h.date)}</td>
                      <td className="py-3 text-end">₹{Number(h.opening_balance).toFixed(2)}</td>
                      <td className="py-3 text-end text-success">₹{Number(h.cash_sales).toFixed(2)}</td>

                      <td className="py-3 text-end text-danger">₹{Number(h.cash_purchases).toFixed(2)}</td>
                      <td className="py-3 text-end text-danger">₹{Number(h.cash_expenses).toFixed(2)}</td>
                      <td className="py-3 text-end">₹{Number(h.closing_balance).toFixed(2)}</td>
                      <td className="py-3 text-end fw-bold text-dark">₹{Number(h.actual_cash).toFixed(2)}</td>
                      <td className="py-3 text-center">
                        {h.difference == 0 ? (
                          <Badge color="success" pill>OK</Badge>
                        ) : (
                          <Badge color={h.difference > 0 ? 'info' : 'danger'} pill>
                            {h.difference > 0 ? '+' : ''}{Number(h.difference).toFixed(2)}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <Button
                          color="info"
                          size="sm"
                          className="py-1 px-2 fw-bold"
                          onClick={() => handleEditFromHistory(h)}
                        >
                          <FaEdit /> Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <style>
        {`
          .x-small { font-size: 0.7rem; }
          .bg-light { background-color: #f8f9fa !important; }
        `}
      </style>
    </Container>
  );
};

export default DayClosing;
