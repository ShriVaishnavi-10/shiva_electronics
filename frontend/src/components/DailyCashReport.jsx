import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Table,
  Button,
  FormGroup,
  Label,
  Input,
  Spinner,
  Badge,
} from "reactstrap";
import axios from "axios";
import { apiUrl } from "../config/urls";
import { toast } from "react-toastify";
import {
  FaFileExcel,
  FaSearch,
  FaPrint,
  FaMoneyCheckAlt,
  FaTimes,
  FaWallet,
  FaArrowUp,
  FaArrowDown,
  FaCashRegister,
} from "react-icons/fa";
import { exportDailyCashToExcel } from "../utils/exportDailyCashExcel";

const DailyCashReport = () => {
  const navigate = useNavigate();

  const formatDateToDDMMYYYY = (dateVal) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatCurrency = (val) => {
    return `₹${Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
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
    const q = debouncedSearch.toLowerCase().replace(/₹/g, "").trim();
    return reportData.filter((h) => {
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
      const res = await axios.get(apiUrl("daily-cash/history"), {
        params: filters,
      });
      setReportData(res.data || []);
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
        formatDateToDDMMYYYY,
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
  const totalOpening = filteredData.reduce(
    (s, h) => s + Number(h.opening_balance || 0),
    0
  );
  const totalSales = filteredData.reduce(
    (s, h) => s + Number(h.cash_sales || 0),
    0
  );
  const totalPurchases = filteredData.reduce(
    (s, h) => s + Number(h.cash_purchases || 0),
    0
  );
  const totalExpenses = filteredData.reduce(
    (s, h) => s + Number(h.cash_expenses || 0),
    0
  );
  const totalExpected = filteredData.reduce(
    (s, h) => s + getExpected(h),
    0
  );
  const totalActual = filteredData.reduce(
    (s, h) => s + Number(h.actual_cash || 0),
    0
  );
  const totalDiff = totalActual > 0 ? totalActual - totalExpected : 0;
  const closedCount = filteredData.filter((h) => h.status === "Closed").length;
  const openCount = filteredData.filter((h) => h.status !== "Closed").length;

  return (
    <Container fluid className="p-4 bg-light min-vh-100">
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2 no-print">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold text-dark mb-0">Daily Cash Report</h4>
            <Badge
              color="warning"
              className="text-dark fw-semibold px-2 py-1 shadow-sm"
              style={{ fontSize: "0.76rem" }}
            >
              Cashier Register
            </Badge>
          </div>
          <p className="text-muted small mb-0 mt-1">
            Track daily cash register opening, sales collections, expenses, and
            expected closing cash balance
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Button
            color="primary"
            outline
            size="sm"
            className="fw-semibold shadow-sm d-flex align-items-center gap-1"
            onClick={() => navigate("/index/day-closing")}
          >
            <FaMoneyCheckAlt size={12} /> Day Closing Register
          </Button>
          <Button
            color="success"
            onClick={handleExportExcel}
            size="sm"
            className="fw-semibold shadow-sm d-flex align-items-center gap-1"
            disabled={exporting}
          >
            {exporting ? (
              <Spinner size="sm" />
            ) : (
              <FaFileExcel size={12} />
            )}
            {exporting ? "Exporting..." : "Excel"}
          </Button>
          <Button
            color="secondary"
            outline
            onClick={handlePrint}
            size="sm"
            className="fw-semibold d-flex align-items-center gap-1"
          >
            <FaPrint size={12} /> Print
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <Row className="g-3 mb-3 no-print">
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="border-0 shadow-sm rounded-3 h-100"
            style={{
              background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
              border: "1px solid #FDE68A",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div>
                <div
                  className="fw-bold text-uppercase"
                  style={{ color: "#92400E", fontSize: "0.74rem", letterSpacing: "0.5px" }}
                >
                  Total Opening Bal
                </div>
                <div className="fs-4 fw-bold mt-1" style={{ color: "#78350F" }}>
                  {formatCurrency(totalOpening)}
                </div>
                <div className="small mt-1" style={{ color: "#B45309", fontSize: "0.76rem" }}>
                  {filteredData.length} register entries
                </div>
              </div>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                style={{ width: "44px", height: "44px", backgroundColor: "#FDE68A", color: "#B45309" }}
              >
                <FaWallet size={19} />
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card
            className="border-0 shadow-sm rounded-3 h-100"
            style={{
              background: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
              border: "1px solid #A7F3D0",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div>
                <div
                  className="fw-bold text-uppercase"
                  style={{ color: "#065F46", fontSize: "0.74rem", letterSpacing: "0.5px" }}
                >
                  Total Cash Sales
                </div>
                <div className="fs-4 fw-bold mt-1" style={{ color: "#047857" }}>
                  {formatCurrency(totalSales)}
                </div>
                <div className="small mt-1" style={{ color: "#059669", fontSize: "0.76rem" }}>
                  Cash collected from POS bills
                </div>
              </div>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                style={{ width: "44px", height: "44px", backgroundColor: "#A7F3D0", color: "#047857" }}
              >
                <FaArrowDown size={19} />
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card
            className="border-0 shadow-sm rounded-3 h-100"
            style={{
              background: "linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)",
              border: "1px solid #FECDD3",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div>
                <div
                  className="fw-bold text-uppercase"
                  style={{ color: "#9F1239", fontSize: "0.74rem", letterSpacing: "0.5px" }}
                >
                  Total Cash Outflows
                </div>
                <div className="fs-4 fw-bold mt-1" style={{ color: "#BE123C" }}>
                  {formatCurrency(totalPurchases + totalExpenses)}
                </div>
                <div className="small mt-1 text-truncate" style={{ color: "#E11D48", fontSize: "0.76rem" }}>
                  Purchases {formatCurrency(totalPurchases)} • Exp {formatCurrency(totalExpenses)}
                </div>
              </div>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                style={{ width: "44px", height: "44px", backgroundColor: "#FECDD3", color: "#BE123C" }}
              >
                <FaArrowUp size={19} />
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card
            className="border-0 shadow-sm rounded-3 h-100"
            style={{
              background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
              border: "1px solid #BFDBFE",
            }}
          >
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div>
                <div
                  className="fw-bold text-uppercase"
                  style={{ color: "#1E40AF", fontSize: "0.74rem", letterSpacing: "0.5px" }}
                >
                  Expected Cash in Hand
                </div>
                <div className="fs-4 fw-bold mt-1" style={{ color: "#1D4ED8" }}>
                  {formatCurrency(totalExpected)}
                </div>
                <div className="small mt-1" style={{ color: "#2563EB", fontSize: "0.76rem" }}>
                  Opening + Sales - Outflows
                </div>
              </div>
              <div
                className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                style={{ width: "44px", height: "44px", backgroundColor: "#BFDBFE", color: "#1D4ED8" }}
              >
                <FaCashRegister size={19} />
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Filter Row Card */}
      <Card className="border shadow-sm mb-3 no-print bg-white">
        <CardBody className="p-3">
          <Row className="g-2 align-items-end">
            <Col lg={4} md={4} sm={12}>
              <Label className="small text-muted mb-1 text-truncate d-block fw-semibold">
                Search Register
              </Label>
              <div className="position-relative">
                <Input
                  bsSize="sm"
                  type="text"
                  placeholder="Date, amount, status..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={search ? "pe-4" : ""}
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

            <Col lg={3} md={3} sm={6} xs={6}>
              <Label className="small text-muted mb-1 text-truncate d-block fw-semibold">
                From Date
              </Label>
              <Input
                bsSize="sm"
                type="date"
                value={filters.fromDate}
                onChange={(e) =>
                  setFilters({ ...filters, fromDate: e.target.value })
                }
              />
            </Col>

            <Col lg={3} md={3} sm={6} xs={6}>
              <Label className="small text-muted mb-1 text-truncate d-block fw-semibold">
                To Date
              </Label>
              <Input
                bsSize="sm"
                type="date"
                value={filters.toDate}
                onChange={(e) =>
                  setFilters({ ...filters, toDate: e.target.value })
                }
              />
            </Col>

            <Col lg={2} md={2} sm={12}>
              <Label className="small text-muted mb-1 text-truncate d-none d-md-block invisible">
                Quick Filters
              </Label>
              <div className="d-flex gap-1">
                <Button
                  color="primary"
                  outline
                  size="sm"
                  className="flex-fill"
                  onClick={() => {
                    const today = new Date().toISOString().slice(0, 10);
                    setFilters({ fromDate: today, toDate: today });
                  }}
                >
                  Today
                </Button>
                <Button
                  color="secondary"
                  outline
                  size="sm"
                  className="flex-fill text-nowrap"
                  onClick={() => {
                    setFilters({
                      fromDate: new Date(
                        new Date().setDate(new Date().getDate() - 30)
                      )
                        .toISOString()
                        .slice(0, 10),
                      toDate: new Date().toISOString().slice(0, 10),
                    });
                    setSearch("");
                  }}
                >
                  30 Days
                </Button>
                {loading && (
                  <Spinner
                    size="sm"
                    className="text-primary align-self-center ms-1"
                  />
                )}
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Main Table Card */}
      <Card className="border shadow-sm bg-white">
        <CardBody className="p-0">
          <div className="only-print p-3 text-center border-bottom">
            <h4 className="fw-bold mb-1">SHIVA ELECTRONICS - DAILY CASH REPORT</h4>
            <div className="text-muted small">
              Period: {filters.fromDate} to {filters.toDate}
            </div>
          </div>

          <div className="table-responsive">
            <Table
              bordered
              hover
              size="sm"
              className="align-middle mb-0 text-nowrap"
            >
              <thead className="table-light">
                <tr className="text-nowrap">
                  <th className="px-3 py-2 text-center" style={{ width: "50px" }}>
                    S.No
                  </th>
                  <th className="px-3 py-2" style={{ minWidth: "115px" }}>
                    Date
                  </th>
                  <th className="px-3 py-2 text-end" style={{ minWidth: "125px" }}>
                    Opening Bal
                  </th>
                  <th
                    className="px-3 py-2 text-end text-success"
                    style={{ minWidth: "125px" }}
                  >
                    Cash Sales
                  </th>
                  <th
                    className="px-3 py-2 text-end text-danger"
                    style={{ minWidth: "115px" }}
                  >
                    Purchases
                  </th>
                  <th
                    className="px-3 py-2 text-end text-danger"
                    style={{ minWidth: "115px" }}
                  >
                    Expenses
                  </th>
                  <th
                    className="px-3 py-2 text-end text-primary fw-bold"
                    style={{ minWidth: "135px" }}
                  >
                    Expected Cash
                  </th>
                  <th
                    className="px-3 py-2 text-end fw-bold"
                    style={{ minWidth: "135px" }}
                  >
                    Actual Cash
                  </th>
                  <th
                    className="px-3 py-2 text-center"
                    style={{ minWidth: "125px" }}
                  >
                    Difference
                  </th>
                  <th
                    className="px-3 py-2 text-center"
                    style={{ minWidth: "105px" }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5 text-muted">
                      <Spinner color="primary" size="sm" className="me-2" />
                      Loading daily cash register data...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5 text-muted">
                      No daily cash register records found for the selected period.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((h, i) => {
                    const expected = getExpected(h);
                    const isOpen = h.status === "Open";
                    const hasActual = Number(h.actual_cash || 0) > 0;
                    const actualNum = Number(h.actual_cash || 0);
                    const diffNum = Number(h.difference || 0);

                    return (
                      <tr
                        key={h.id || i}
                        className={isOpen ? "table-warning bg-opacity-10" : ""}
                      >
                        <td className="px-3 py-2 text-center text-muted">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2 fw-bold text-dark">
                          {formatDateToDDMMYYYY(h.date)}
                        </td>
                        <td className="px-3 py-2 text-end fw-semibold text-secondary">
                          {formatCurrency(h.opening_balance)}
                        </td>
                        <td className="px-3 py-2 text-end text-success fw-bold">
                          {formatCurrency(h.cash_sales)}
                        </td>
                        <td className="px-3 py-2 text-end text-danger fw-semibold">
                          {formatCurrency(h.cash_purchases)}
                        </td>
                        <td className="px-3 py-2 text-end text-danger fw-semibold">
                          {formatCurrency(h.cash_expenses)}
                        </td>
                        <td
                          className="px-3 py-2 text-end fw-bold text-primary"
                          style={{ backgroundColor: "rgba(13, 110, 253, 0.03)" }}
                        >
                          {formatCurrency(expected)}
                        </td>
                        <td className="px-3 py-2 text-end fw-bold">
                          {isOpen && !hasActual ? (
                            <span className="badge bg-light text-muted border fw-normal py-1 px-2">
                              Pending Close
                            </span>
                          ) : (
                            formatCurrency(actualNum)
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isOpen && !hasActual ? (
                            <Badge color="warning" pill className="px-2 py-1">
                              In Progress
                            </Badge>
                          ) : Math.abs(diffNum) < 0.01 ? (
                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 fw-bold">
                              Balanced
                            </span>
                          ) : (
                            <Badge
                              color={diffNum > 0 ? "info" : "danger"}
                              pill
                              className="px-2 py-1"
                            >
                              {diffNum > 0 ? "+" : ""}
                              {formatCurrency(Math.abs(diffNum))}{" "}
                              {diffNum > 0 ? "Excess" : "Short"}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge
                            color={h.status === "Closed" ? "success" : "warning"}
                            pill
                            className="px-2 py-1 fw-semibold"
                          >
                            {h.status || "Open"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredData.length > 0 && (
                <tfoot className="table-light fw-bold text-nowrap">
                  <tr style={{ borderTop: "2px solid #CBD5E1" }}>
                    <td
                      className="px-3 py-2 text-center text-uppercase text-muted"
                      colSpan="2"
                    >
                      Total ({filteredData.length} Days)
                    </td>
                    <td className="px-3 py-2 text-end text-secondary">
                      {formatCurrency(totalOpening)}
                    </td>
                    <td className="px-3 py-2 text-end text-success">
                      {formatCurrency(totalSales)}
                    </td>
                    <td className="px-3 py-2 text-end text-danger">
                      {formatCurrency(totalPurchases)}
                    </td>
                    <td className="px-3 py-2 text-end text-danger">
                      {formatCurrency(totalExpenses)}
                    </td>
                    <td
                      className="px-3 py-2 text-end text-primary"
                      style={{ backgroundColor: "rgba(13, 110, 253, 0.05)" }}
                    >
                      {formatCurrency(totalExpected)}
                    </td>
                    <td className="px-3 py-2 text-end text-dark">
                      {totalActual > 0 ? formatCurrency(totalActual) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {totalActual > 0 ? (
                        <span
                          className={`badge ${
                            Math.abs(totalDiff) < 0.01
                              ? "bg-success"
                              : totalDiff > 0
                              ? "bg-info text-dark"
                              : "bg-danger"
                          } px-2 py-1`}
                        >
                          {Math.abs(totalDiff) < 0.01
                            ? "Balanced"
                            : `${totalDiff > 0 ? "+" : ""}${formatCurrency(
                                Math.abs(totalDiff)
                              )}`}
                        </span>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-muted small">
                      {closedCount} Closed / {openCount} Open
                    </td>
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>
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
