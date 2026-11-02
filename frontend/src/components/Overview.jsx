import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  Button,
  Input,
  Table,
  Badge,
} from "reactstrap";
import { Line, Pie, Bar } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import {
  FaFileInvoiceDollar,
  FaRupeeSign,
  FaUsers,
  FaBoxOpen,
  FaCalendarAlt,
  FaFilter,
  FaClipboardList,
  FaShoppingCart,
  FaWarehouse,
  FaTools,
} from "react-icons/fa";
import api from "../utils/api";
import { toast } from "react-toastify";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [monthlySales, setMonthlySales] = useState({ labels: [], values: [] });
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const [topProducts, setTopProducts] = useState([]);
  const [profitLoss, setProfitLoss] = useState([]);
  const [plView, setPlView] = useState("profit");
  const [plSort, setPlSort] = useState("profit");
  const [plLimit, setPlLimit] = useState(10);

  const [recentSales, setRecentSales] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const monthlyRevenueData = {
    labels: monthlySales.labels,
    datasets: [
      {
        label: "Monthly Revenue",
        data: monthlySales.values,
        borderWidth: 3,
        tension: 0.4,
        borderColor: "#FFD700",
        backgroundColor: "rgba(255, 215, 0, 0.18)",
        fill: true,
      },
    ],
  };

  const productChartData = {
    labels: topProducts.map((p) => {
      const name = p.product_name;
      if (!name || String(name).trim().toLowerCase() === "null" || String(name).trim() === "") {
        return p.product_id ? `Product #${p.product_id}` : "Other Product";
      }
      return String(name).trim();
    }),
    datasets: [
      {
        data: topProducts.map((p) => Number(p.total_qty) || 0),
        backgroundColor: [
          "#FFD700",
          "#16a34a",
          "#f59e0b",
          "#ef4444",
          "#7c3aed",
          "#0891b2",
          "#ec4899",
          "#14b8a6",
          "#f97316",
          "#6366f1",
        ],
        borderWidth: 1,
      },
    ],
  };

  const fmtCurrency = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
      Number(n || 0),
    );

  const fmtCompact = (n) => {
    const v = Number(n || 0);
    const abs = Math.abs(v);
    if (abs >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
    return `₹${v.toFixed(0)}`;
  };

  const truncate = (s, n = 26) =>
    String(s || "").length > n ? `${String(s).slice(0, n - 1)}…` : String(s || "");

  const plTotals = profitLoss.reduce(
    (acc, p) => {
      acc.revenue += Number(p.revenue) || 0;
      acc.cost += Number(p.cost) || 0;
      acc.profit += Number(p.profit) || 0;
      if (Number(p.profit) < 0) acc.lossItems += 1;
      return acc;
    },
    { revenue: 0, cost: 0, profit: 0, lossItems: 0 },
  );
  const plMargin = plTotals.revenue > 0 ? (plTotals.profit / plTotals.revenue) * 100 : 0;

  const plRows = [...profitLoss]
    .filter((p) =>
      plSort === "loss" ? Number(p.profit) < 0 : true,
    )
    .sort((a, b) => {
      if (plSort === "loss") return Number(a.profit) - Number(b.profit);
      if (plSort === "revenue") return Number(b.revenue) - Number(a.revenue);
      if (plSort === "margin") return Number(b.margin_pct) - Number(a.margin_pct);
      return Number(b.profit) - Number(a.profit);
    })
    .slice(0, plLimit);

  const GREEN = "rgba(22, 163, 74, 0.8)";
  const RED = "rgba(220, 38, 38, 0.8)";

  const profitLossChartData =
    plView === "compare"
      ? {
          labels: plRows.map((p) => truncate(p.product_name)),
          datasets: [
            {
              label: "Revenue",
              data: plRows.map((p) => p.revenue),
              backgroundColor: "rgba(37, 99, 235, 0.8)",
              borderRadius: 4,
            },
            {
              label: "Cost",
              data: plRows.map((p) => p.cost),
              backgroundColor: "rgba(245, 158, 11, 0.85)",
              borderRadius: 4,
            },
            {
              label: "Profit",
              data: plRows.map((p) => p.profit),
              backgroundColor: plRows.map((p) => (p.profit >= 0 ? GREEN : RED)),
              borderRadius: 4,
            },
          ],
        }
      : {
          labels: plRows.map((p) => truncate(p.product_name)),
          datasets: [
            {
              label: "Profit (₹)",
              data: plRows.map((p) => p.profit),
              backgroundColor: plRows.map((p) => (p.profit >= 0 ? GREEN : RED)),
              borderRadius: 4,
            },
          ],
        };

  const formatDateDashboard = (dateStr) => {
    if (!dateStr) return "-";
    const cleanStr = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}-${month}-${year}`;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get("/dashboard/summary", {
        params: { fromDate: fromDate || undefined, toDate: toDate || undefined },
      });
      setSummary(res.data || null);
    } catch (err) {
      console.error("Failed to load dashboard summary", err.response?.data || err);
      toast.error(err.response?.data?.message || "Failed to load dashboard summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadMonthlySales = async () => {
    setMonthlyLoading(true);
    try {
      const res = await api.get("/dashboard/monthly-sales", {
        params: { fromDate: fromDate || undefined, toDate: toDate || undefined },
      });
      setMonthlySales(res.data || { labels: [], values: [] });
    } catch (err) {
      console.error("Failed to load monthly sales", err.response?.data || err);
      toast.error(err.response?.data?.message || "Failed to load monthly sales");
      setMonthlySales({ labels: [], values: [] });
    } finally {
      setMonthlyLoading(false);
    }
  };

  const loadTopProducts = async () => {
    try {
      const res = await api.get("/dashboard/top-products", {
        params: { fromDate: fromDate || undefined, toDate: toDate || undefined },
      });
      const validProducts = (Array.isArray(res.data) ? res.data : [])
        .map((p) => {
          let name = p.product_name;
          if (
            !name ||
            String(name).trim().toLowerCase() === "null" ||
            String(name).trim().toLowerCase() === "undefined" ||
            String(name).trim() === ""
          ) {
            name = p.product_id ? `Product #${p.product_id}` : "Other Product";
          }
          return {
            ...p,
            product_name: String(name).trim(),
            total_qty: Number(p.total_qty || 0),
          };
        })
        .filter((p) => p.total_qty > 0 && p.product_name.toLowerCase() !== "null");
      setTopProducts(validProducts);
    } catch (err) {
      console.error("Failed to load top products", err.response?.data || err);
      setTopProducts([]);
    }
  };

  const loadProfitLoss = async () => {
    try {
      const res = await api.get("/dashboard/profit-loss", {
        params: { fromDate: fromDate || undefined, toDate: toDate || undefined },
      });
      const validItems = (Array.isArray(res.data) ? res.data : [])
        .map((item) => {
          let name = item.product_name;
          if (
            !name ||
            String(name).trim().toLowerCase() === "null" ||
            String(name).trim().toLowerCase() === "undefined" ||
            String(name).trim() === ""
          ) {
            name = item.product_id ? `Product #${item.product_id}` : "Other Product";
          }
          return {
            ...item,
            product_name: String(name).trim(),
          };
        })
        .filter((item) => item.product_name.toLowerCase() !== "null");
      setProfitLoss(validItems);
    } catch (err) {
      console.error("Failed to load profit/loss", err.response?.data || err);
      setProfitLoss([]);
    }
  };

  const loadRecent = async () => {
    setRecentLoading(true);
    try {
      const res = await api.get("/dashboard/recent", {
        params: { fromDate: fromDate || undefined, toDate: toDate || undefined },
      });
      setRecentSales(Array.isArray(res.data?.recentSales) ? res.data.recentSales : []);
    } catch (err) {
      console.error("Failed to load recent documents", err.response?.data || err);
      setRecentSales([]);
    } finally {
      setRecentLoading(false);
    }
  };

  const handleFilter = () => {
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      toast.error("From date cannot be after To date");
      return;
    }
    loadSummary();
    loadMonthlySales();
    loadTopProducts();
    loadProfitLoss();
    loadRecent();
  };

  useEffect(() => {
    handleFilter();
  }, []);

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isNonUser = storedUser.role_name?.toLowerCase().includes("non user") || storedUser.role_id === 6;

  const actionCards = isNonUser
    ? [
        {
          key: "sale",
          title: "Non-GST Sales",
          subtitle: "Manage sales and invoices",
          icon: <FaClipboardList />,
          color: "success",
          path: "/index/salesList",
        },
        {
          key: "customer",
          title: "Customers",
          subtitle: "Customer management",
          icon: <FaUsers />,
          color: "info",
          path: "/index/customer",
        },
        {
          key: "bank",
          title: "Bank Accounts",
          subtitle: "Bank balances & accounts",
          icon: <FaRupeeSign />,
          color: "primary",
          path: "/index/bank-accounts",
        },
        {
          key: "closing",
          title: "Opening Balance",
          subtitle: "Day opening and cash log",
          icon: <FaCalendarAlt />,
          color: "warning",
          path: "/index/day-closing",
        },
      ]
    : [
        {
          key: "sale",
          title: "Sales",
          subtitle: "Click to open sales form",
          icon: <FaClipboardList />,
          color: "success",
          path: "/index/salesList",
        },
        {
          key: "purchase",
          title: "Purchase",
          subtitle: "Click purchase form",
          icon: <FaShoppingCart />,
          color: "warning",
          path: "/index/purchaseList",
        },
        {
          key: "stocks",
          title: "Stocks",
          subtitle: "Click stocks list",
          icon: <FaWarehouse />,
          color: "info",
          path: "/index/stock-details",
        },
      ];

  return (
    <Container fluid className="dashboard p-4">
      <Row className="mb-4 align-items-center">
        <Col md="6">
          <h4 className="fw-bold dashboard-welcome">
            {isNonUser ? "WELCOME TO NON-GST ADMIN PANEL" : "WELCOME, CLAVIS TECH WORKS"}
          </h4>
        </Col>
        <Col
          md="6"
          className="d-flex gap-2 justify-content-md-end justify-content-start mt-3 mt-md-0 flex-wrap"
        >
          <div className="date-box d-flex align-items-center gap-2">
            <FaCalendarAlt />
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="date-box d-flex align-items-center gap-2">
            <FaCalendarAlt />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <Button color="primary" className="filter-btn" onClick={handleFilter}>
            <FaFilter /> Filter
          </Button>
        </Col>
      </Row>

      <Row className="mb-4 g-3">
        {actionCards.map((item) => (
          <Col lg={isNonUser ? "3" : "4"} md="6" sm="6" xs="12" key={item.key}>
            <Card
              className={`stat-card border-${item.color}`}
              role="button"
              onClick={() => navigate(item.path)}
              style={{ cursor: "pointer" }}
            >
              <CardBody className="d-flex align-items-center gap-3">
                <div className={`icon-box bg-${item.color}`}>{item.icon}</div>
                <div>
                  <p className="text-muted mb-1">{item.title}</p>
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Summary Metrics */}
      {isNonUser ? (
        <Row className="mb-4 g-3">
          <Col lg="3" md="6" sm="6" xs="12">
            <Card className="stat-card border-success">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="icon-box bg-success">
                  <FaClipboardList />
                </div>
                <div>
                  <p className="text-muted mb-1">Today's Sales</p>
                  <h4 className="fw-bold mb-0">
                    {summaryLoading || !summary ? "-" : fmtCurrency(summary.todaySalesAmount)}
                  </h4>
                  <small className="text-muted">
                    {summaryLoading || !summary ? "" : `${summary.todaySalesCount || 0} Bills`}
                  </small>
                </div>
              </CardBody>
            </Card>
          </Col>

          <Col lg="3" md="6" sm="6" xs="12">
            <Card className="stat-card border-primary">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="icon-box bg-primary">
                  <FaRupeeSign />
                </div>
                <div>
                  <p className="text-muted mb-1">Today's Collection</p>
                  <h4 className="fw-bold mb-0">
                    {summaryLoading || !summary ? "-" : fmtCurrency(summary.todayCollection)}
                  </h4>
                  <small className="text-muted">Cash & Bank in</small>
                </div>
              </CardBody>
            </Card>
          </Col>

          <Col lg="3" md="6" sm="6" xs="12">
            <Card className="stat-card border-danger">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="icon-box bg-danger">
                  <FaRupeeSign />
                </div>
                <div>
                  <p className="text-muted mb-1">Customer Outstanding</p>
                  <h4 className="fw-bold mb-0 text-danger">
                    {summaryLoading || !summary ? "-" : fmtCurrency(summary.customerOutstanding)}
                  </h4>
                  <small className="text-muted">Total unpaid balance</small>
                </div>
              </CardBody>
            </Card>
          </Col>

          <Col lg="3" md="6" sm="6" xs="12">
            <Card className="stat-card border-info">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="icon-box bg-info">
                  <FaRupeeSign />
                </div>
                <div>
                  <p className="text-muted mb-1">Cash In Hand</p>
                  <h4 className="fw-bold mb-0">
                    {summaryLoading || !summary ? "-" : fmtCurrency(summary.cashBalance)}
                  </h4>
                  <small className="text-muted">Current cash drawer</small>
                </div>
              </CardBody>
            </Card>
          </Col>

          <Col lg="3" md="6" sm="6" xs="12">
            <Card className="stat-card border-warning">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="icon-box bg-warning">
                  <FaRupeeSign />
                </div>
                <div>
                  <p className="text-muted mb-1">Bank Accounts</p>
                  <h4 className="fw-bold mb-0">
                    {summaryLoading || !summary ? "-" : fmtCurrency(summary.bankBalance)}
                  </h4>
                  <small className="text-muted">Total bank balances</small>
                </div>
              </CardBody>
            </Card>
          </Col>

          <Col lg="3" md="6" sm="6" xs="12">
            <Card className="stat-card border-success">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="icon-box bg-success">
                  <FaRupeeSign />
                </div>
                <div>
                  <p className="text-muted mb-1">Total Revenue</p>
                  <h4 className="fw-bold mb-0">
                    {summaryLoading || !summary ? "-" : fmtCurrency(summary.totalRevenue)}
                  </h4>
                  <small className="text-muted">{summaryLoading || !summary ? "" : `${summary.totalSales || 0} Total Sales`}</small>
                </div>
              </CardBody>
            </Card>
          </Col>

          <Col lg="3" md="6" sm="6" xs="12">
            <Card className="stat-card border-info">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="icon-box bg-info">
                  <FaUsers />
                </div>
                <div>
                  <p className="text-muted mb-1">Total Customers</p>
                  <h4 className="fw-bold mb-0">
                    {summaryLoading || !summary ? "-" : summary.totalCustomers}
                  </h4>
                  <small className="text-muted">Non-GST registered</small>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      ) : (
        <Row className="mb-4 g-3">
          <Col lg="3" md="6" sm="6" xs="12">
            <Card className="stat-card border-success">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="icon-box bg-success">
                  <FaClipboardList />
                </div>
                <div>
                  <p className="text-muted mb-1">Total Sales</p>
                  <h4 className="fw-bold mb-0">
                    {summaryLoading || !summary ? "-" : summary.totalSales}
                  </h4>
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3" md="6" sm="6" xs="12">
            <Card className="stat-card border-warning">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="icon-box bg-warning">
                  <FaShoppingCart />
                </div>
                <div>
                  <p className="text-muted mb-1">Total Purchases</p>
                  <h4 className="fw-bold mb-0">
                    {summaryLoading || !summary ? "-" : summary.totalPurchases}
                  </h4>
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3" md="6" sm="6" xs="12">
            <Card className="stat-card border-success">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="icon-box bg-success">
                  <FaRupeeSign />
                </div>
                <div>
                  <p className="text-muted mb-1">Total Revenue</p>
                  <h4 className="fw-bold mb-0">
                    {summaryLoading || !summary
                      ? "-"
                      : fmtCurrency(summary.totalRevenue)}
                  </h4>
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3" md="6" sm="6" xs="12">
            <Card className="stat-card border-info">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="icon-box bg-info">
                  <FaUsers />
                </div>
                <div>
                  <p className="text-muted mb-1">Total Customers</p>
                  <h4 className="fw-bold mb-0">
                    {summaryLoading || !summary ? "-" : summary.totalCustomers}
                  </h4>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      <Row className="mb-4 g-3">
        <Col md="8">
          <Card className="shadow-sm chart-card">
            <CardBody>
              <CardTitle tag="h6">📈 Monthly Sales / Revenue</CardTitle>
              {monthlyLoading ? (
                <p className="text-muted mb-0">Loading sales data…</p>
              ) : monthlySales.labels.length === 0 ? (
                <p className="text-muted mb-0">No Sales Data Available</p>
              ) : (
                <Line data={monthlyRevenueData} />
              )}
            </CardBody>
          </Card>
        </Col>
        <Col md="4">
          <Card className="shadow-sm chart-card">
            <CardBody>
              <CardTitle tag="h6">📦 Top Products Sold</CardTitle>
              {topProducts.length > 0 ? (
                <Pie
                  data={productChartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: {
                          boxWidth: 12,
                          font: { size: 11 },
                          generateLabels: (chart) => {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                              return data.labels.map((label, i) => {
                                const meta = chart.getDatasetMeta(0);
                                const style = meta.controller?.getStyle(i) || {};
                                return {
                                  text:
                                    label && String(label).toLowerCase() !== "null"
                                      ? String(label)
                                      : "Other Product",
                                  fillStyle: style.backgroundColor,
                                  strokeStyle: style.borderColor,
                                  lineWidth: style.borderWidth,
                                  hidden: isNaN(data.datasets[0].data[i]) || meta.data[i]?.hidden,
                                  index: i,
                                };
                              });
                            }
                            return [];
                          },
                        },
                      },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => {
                            const label =
                              ctx.label && String(ctx.label).toLowerCase() !== "null"
                                ? ctx.label
                                : "Other Product";
                            const value = ctx.parsed || 0;
                            return ` ${label}: ${value} sold`;
                          },
                        },
                      },
                    },
                  }}
                />
              ) : (
                <p className="text-muted mb-0">No product sales data.</p>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4 g-3">
        <Col md="12">
          <Card className="shadow-sm chart-card">
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <CardTitle tag="h6" className="mb-0">
                  💹 Profit / Loss by Product
                </CardTitle>
                <div className="d-flex flex-wrap gap-2">
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ width: "auto" }}
                    value={plView}
                    onChange={(e) => setPlView(e.target.value)}
                  >
                    <option value="profit">Profit only</option>
                    <option value="compare">Revenue vs Cost vs Profit</option>
                  </Input>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ width: "auto" }}
                    value={plSort}
                    onChange={(e) => setPlSort(e.target.value)}
                  >
                    <option value="profit">Highest profit</option>
                    <option value="loss">Biggest loss</option>
                    <option value="revenue">Highest revenue</option>
                    <option value="margin">Best margin %</option>
                  </Input>
                  <Input
                    type="select"
                    bsSize="sm"
                    style={{ width: "auto" }}
                    value={plLimit}
                    onChange={(e) => setPlLimit(Number(e.target.value))}
                  >
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                    <option value={20}>Top 20</option>
                    <option value={50}>Top 50</option>
                  </Input>
                </div>
              </div>

              {profitLoss.length === 0 ? (
                <p className="text-muted mb-0">
                  No profit/loss data available.
                </p>
              ) : (
                <>
                  <Row className="g-2 mb-3">
                    {[
                      { label: "Revenue (ex-GST)", value: fmtCurrency(plTotals.revenue), color: "#2563eb" },
                      { label: "Cost", value: fmtCurrency(plTotals.cost), color: "#d97706" },
                      {
                        label: "Net Profit",
                        value: fmtCurrency(plTotals.profit),
                        color: plTotals.profit >= 0 ? "#16a34a" : "#dc2626",
                      },
                      {
                        label: "Margin",
                        value: `${plMargin.toFixed(1)}%`,
                        color: plMargin >= 0 ? "#16a34a" : "#dc2626",
                      },
                      {
                        label: "Loss-making items",
                        value: plTotals.lossItems,
                        color: plTotals.lossItems > 0 ? "#dc2626" : "#16a34a",
                      },
                    ].map((k) => (
                      <Col key={k.label} xs="6" md>
                        <div
                          className="p-2 rounded"
                          style={{ background: "#f8fafc", borderLeft: `4px solid ${k.color}` }}
                        >
                          <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                            {k.label}
                          </div>
                          <div className="fw-bold" style={{ color: k.color, fontSize: "1.05rem" }}>
                            {k.value}
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>

                  {plRows.length === 0 ? (
                    <p className="text-muted mb-0">No products match this filter.</p>
                  ) : (
                    <div
                      style={{
                        position: "relative",
                        height: `${Math.max(
                          260,
                          plRows.length * (plView === "compare" ? 56 : 34) + 60,
                        )}px`,
                      }}
                    >
                      <Bar
                        data={profitLossChartData}
                        options={{
                          indexAxis: "y",
                          responsive: true,
                          maintainAspectRatio: false,
                          interaction: { mode: "index", intersect: false },
                          plugins: {
                            legend: { display: plView === "compare", position: "top" },
                            tooltip: {
                              callbacks: {
                                title: (items) => plRows[items[0]?.dataIndex]?.product_name || "",
                                label: (ctx) =>
                                  ` ${ctx.dataset.label}: ${fmtCurrency(ctx.parsed.x)}`,
                                afterBody: (items) => {
                                  const item = plRows[items[0]?.dataIndex];
                                  if (!item) return [];
                                  const lines = [
                                    `Margin: ${Number(item.margin_pct || 0).toFixed(1)}%`,
                                    `Qty Sold: ${item.qty_sold}`,
                                    `Avg Sale Price: ${fmtCurrency(item.sale_price)}`,
                                    `Avg Cost Price: ${fmtCurrency(item.purchase_price)}`,
                                  ];
                                  if (item.cost_known === false) {
                                    lines.push("⚠ No purchase cost recorded");
                                  }
                                  return lines;
                                },
                              },
                            },
                          },
                          scales: {
                            x: {
                              grid: { color: "rgba(148,163,184,0.2)" },
                              ticks: { callback: (v) => fmtCompact(v) },
                            },
                            y: {
                              grid: { display: false },
                              ticks: { autoSkip: false },
                            },
                          },
                        }}
                      />
                    </div>
                  )}
                  <div className="text-muted mt-2" style={{ fontSize: "0.72rem" }}>
                    Revenue excludes GST. Cost uses the average purchase price from stock-in
                    entries; products with no purchase record show zero cost.
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        <Col md="12">
          <Card className="shadow-sm">
            <CardBody>
              <CardTitle tag="h6">🧾 Recent Sales</CardTitle>
              <Table responsive hover className="align-middle">
                <thead className="table-light">
                  <tr>
                    <th>S.No</th>
                    <th>Invoice No</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLoading ? (
                    <tr>
                      <td colSpan="5" className="text-center text-muted py-3">
                        Loading...
                      </td>
                    </tr>
                  ) : recentSales.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center text-muted py-3">
                        No recent sales
                      </td>
                    </tr>
                  ) : (
                    recentSales.map((s, index) => (
                      <tr key={s.id || index}>
                        <td>{index + 1}</td>
                        <td>{s.invoice_no || s.invoiceNo}</td>
                        <td>{s.customer_name || s.customer}</td>
                        <td>{formatDateDashboard(s.sales_date || s.date)}</td>
                        <td className="fw-bold text-success">
                          {fmtCurrency(s.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
