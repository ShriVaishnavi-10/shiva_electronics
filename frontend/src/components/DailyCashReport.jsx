import React, { useState, useEffect } from "react";
import {
  Container, Row, Col, Card, CardBody, Table, Button, FormGroup, Label, Input, Spinner, Badge
} from "reactstrap";
import axios from "axios";
import { apiUrl } from "../config/urls";
import { toast } from "react-toastify";
import { FaFileExcel, FaSearch, FaPrint } from "react-icons/fa";
import { exportDailyCashToExcel } from "../utils/exportDailyCashExcel";

const DailyCashReport = () => {
  const formatDateToDDMMYYYY = (dateVal) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const getExpected = (h) => {
    const closing = Number(h.closing_balance || 0);
    if (closing > 0) return closing;
    const open = Number(h.opening_balance || 0);
    const sales = Number(h.cash_sales || 0);
    const purch = Number(h.cash_purchases || 0);
    const exp = Number(h.cash_expenses || 0);
    return open + sales - purch - exp;
  };

  const filteredData = React.useMemo(() => {
    if (!debouncedSearch) return reportData;
    const q = debouncedSearch.toLowerCase().replace(/₹/g, '').trim();
    return reportData.filter(h => {
      const dateStr = formatDateToDDMMYYYY(h.date).toLowerCase();
      const openStr = Number(h.opening_balance).toFixed(2);
      const salesStr = Number(h.cash_sales).toFixed(2);

      const purchaseStr = Number(h.cash_purchases).toFixed(2);
      const expStr = Number(h.cash_expenses).toFixed(2);
      const expectedStr = getExpected(h).toFixed(2);
      const actualStr = Number(h.actual_cash).toFixed(2);
      const diffStr = Number(h.difference).toFixed(2);

      return (
        dateStr.includes(q) ||
        openStr.includes(q) ||
        salesStr.includes(q) ||
        purchaseStr.includes(q) ||
        expStr.includes(q) ||
        expectedStr.includes(q) ||
        actualStr.includes(q) ||
        diffStr.includes(q) ||
        (h.status && h.status.toLowerCase().includes(q))
      );
    });
  }, [reportData, debouncedSearch]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(apiUrl("daily-cash/history"), { params: filters });
      setReportData(res.data);
    } catch (err) {
      toast.error("Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const handlePrint = () => {
    window.print();
  };

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (!filteredData || filteredData.length === 0) {
      toast.warning("No data available to export");
      return;
    }
    setExporting(true);
    try {
      await exportDailyCashToExcel({
        filteredData,
        filters,
        totalOpening,
        totalSales,
        totalPurchases,
        totalExpenses,
        totalExpected,
        getExpected,
        formatDateToDDMMYYYY
      });
      toast.success("Excel report exported successfully!");
    } catch (err) {
      console.error("Excel Export Error:", err);
      toast.error("Failed to export Excel report");
    } finally {
      setExporting(false);
    }
  };

  // Aggregated totals
  const totalOpening = filteredData.reduce((s, h) => s + Number(h.opening_balance || 0), 0);
  const totalSales = filteredData.reduce((s, h) => s + Number(h.cash_sales || 0), 0);
  const totalPurchases = filteredData.reduce((s, h) => s + Number(h.cash_purchases || 0), 0);
  const totalExpenses = filteredData.reduce((s, h) => s + Number(h.cash_expenses || 0), 0);
  const totalExpected = filteredData.reduce((s, h) => s + getExpected(h), 0);

  return (
    <Container fluid className="p-4 bg-white min-vh-100">
      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <div>
          <h2 className="text-dark fw-bold mb-1">Daily Cash Report</h2>
          <p className="text-muted small mb-0">Track daily cash register opening, sales collections, expenses, and expected closing cash balance</p>
        </div>
        <div className="d-flex gap-2">
          <Button color="success" onClick={handleExportExcel} size="sm" className="fw-semibold shadow-sm" disabled={exporting}>
            {exporting ? <Spinner size="sm" className="me-1" /> : <FaFileExcel className="me-1" />}
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>
          <Button color="outline-secondary" onClick={handlePrint} size="sm" className="fw-semibold">
            <FaPrint className="me-1" /> Print
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <Row className="g-3 mb-4 no-print">
        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-3" style={{ background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)" }}>
            <CardBody className="p-3">
              <div className="text-muted small fw-bold text-uppercase">Total Opening Bal</div>
              <div className="fs-4 fw-bold text-dark mt-1">₹{totalOpening.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div className="text-muted x-small mt-1">{filteredData.length} records selected</div>
            </CardBody>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-3" style={{ background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)" }}>
            <CardBody className="p-3">
              <div className="text-success small fw-bold text-uppercase">Total Cash Sales</div>
              <div className="fs-4 fw-bold text-success mt-1">₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div className="text-success x-small mt-1">Cash received from sales</div>
            </CardBody>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-3" style={{ background: "linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)" }}>
            <CardBody className="p-3">
              <div className="text-danger small fw-bold text-uppercase">Total Cash Expenses</div>
              <div className="fs-4 fw-bold text-danger mt-1">₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div className="text-danger x-small mt-1">Cash paid out for expenses</div>
            </CardBody>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-3" style={{ background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)" }}>
            <CardBody className="p-3">
              <div className="text-primary small fw-bold text-uppercase">Expected Cash in Hand</div>
              <div className="fs-4 fw-bold text-primary mt-1">₹{totalExpected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div className="text-primary x-small mt-1">Opening + Sales - Purchases - Expenses</div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Card className="border shadow-sm mb-4 no-print">
        <CardBody className="p-3">
          <Row className="align-items-end g-3">
            <Col md={3}>
              <FormGroup className="mb-0">
                <Label className="small fw-bold">Search</Label>
                <Input
                  type="text"
                  placeholder="Date, Amount, Status..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup className="mb-0">
                <Label className="small fw-bold">From Date</Label>
                <Input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                />
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup className="mb-0">
                <Label className="small fw-bold">To Date</Label>
                <Input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                />
              </FormGroup>
            </Col>
            <Col md={3} className="d-flex align-items-end justify-content-end gap-2">
              <Button color="outline-primary" size="sm" onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                setFilters({ fromDate: today, toDate: today });
              }}>Today</Button>
              <Button color="secondary" outline size="sm" onClick={() => {
                setFilters({
                  fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
                  toDate: new Date().toISOString().slice(0, 10),
                });
                setSearch("");
              }}>Last 30 Days</Button>
              {loading && <Spinner size="sm" className="text-primary align-self-center ms-2" />}
            </Col>
          </Row>
        </CardBody>
      </Card>

      <Card className="border shadow-sm">
        <CardBody className="p-0">
          <div className="only-print p-3 text-center border-bottom">
            <h4>Daily Cash Report</h4>
            <div className="text-muted small">From: {filters.fromDate} To: {filters.toDate}</div>
          </div>
          <Table responsive hover bordered className="mb-0 small align-middle">
            <thead className="bg-light">
              <tr>
                <th className="px-3 py-3 border-0">Date</th>
                <th className="py-3 border-0 text-end">Opening Bal</th>
                <th className="py-3 border-0 text-end text-success">Cash Sales</th>
                <th className="py-3 border-0 text-end text-danger">Purchases</th>
                <th className="py-3 border-0 text-end text-danger">Expenses</th>
                <th className="py-3 border-0 text-end text-primary fw-bold">Expected</th>
                <th className="py-3 border-0 text-end">Actual</th>
                <th className="py-3 border-0 text-center">Difference</th>
                <th className="py-3 border-0 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center py-5"><Spinner color="primary" /></td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-5 text-muted">No data found for the selected range.</td></tr>
              ) : filteredData.map((h, i) => {
                const expected = getExpected(h);
                const isOpen = h.status === 'Open';
                const hasActual = Number(h.actual_cash || 0) > 0;

                return (
                  <tr key={i}>
                    <td className="px-3 py-3 fw-bold">{formatDateToDDMMYYYY(h.date)}</td>
                    <td className="py-3 text-end">₹{Number(h.opening_balance || 0).toFixed(2)}</td>
                    <td className="py-3 text-end text-success fw-semibold">₹{Number(h.cash_sales || 0).toFixed(2)}</td>
                    <td className="py-3 text-end text-danger">₹{Number(h.cash_purchases || 0).toFixed(2)}</td>
                    <td className="py-3 text-end text-danger">₹{Number(h.cash_expenses || 0).toFixed(2)}</td>
                    <td className="py-3 text-end fw-bold text-primary">₹{expected.toFixed(2)}</td>
                    <td className="py-3 text-end fw-bold">
                      {isOpen && !hasActual ? (
                        <span className="text-muted small fst-italic">Pending Close</span>
                      ) : (
                        `₹${Number(h.actual_cash || 0).toFixed(2)}`
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {isOpen && !hasActual ? (
                        <Badge color="warning" pill>In Progress</Badge>
                      ) : Number(h.difference || 0) === 0 ? (
                        <span className="text-success small fw-bold">Balanced</span>
                      ) : (
                        <Badge color={Number(h.difference) > 0 ? 'info' : 'danger'} pill>
                          {Number(h.difference) > 0 ? '+' : ''}{Number(h.difference).toFixed(2)}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <Badge color={h.status === 'Closed' ? 'success' : 'warning'} pill>
                        {h.status || 'Open'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot className="bg-light fw-bold">
                <tr>
                  <td className="px-3 py-3">TOTALS</td>
                  <td className="py-3 text-end">₹{totalOpening.toFixed(2)}</td>
                  <td className="py-3 text-end text-success">₹{totalSales.toFixed(2)}</td>
                  <td className="py-3 text-end text-danger">₹{totalPurchases.toFixed(2)}</td>
                  <td className="py-3 text-end text-danger">₹{totalExpenses.toFixed(2)}</td>
                  <td className="py-3 text-end text-primary">₹{totalExpected.toFixed(2)}</td>
                  <td colSpan="3"></td>
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
            .bg-white { background-color: white !important; }
          }
          .only-print { display: none; }
        `}
      </style>
    </Container>
  );
};

export default DailyCashReport;
