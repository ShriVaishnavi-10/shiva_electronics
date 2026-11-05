import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaChartBar,
  FaFileAlt,
  FaUserFriends,
  FaCalendarCheck,
  FaFilter,
  FaUndo,
  FaSyncAlt,
  FaDownload,
  FaPrint,
  FaRupeeSign,
  FaCheckCircle,
  FaTimesCircle,
  FaTrophy,
  FaPhoneAlt,
  FaWhatsapp,
  FaChevronLeft,
  FaChevronRight,
  FaArrowRight
} from "react-icons/fa";
import { Spinner, Input } from "reactstrap";
import { toast } from "react-toastify";
import api from "../../utils/api";

const CrmLeadReports = () => {
  const navigate = useNavigate();

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateField, setDateField] = useState("created_at");
  const [assignedTo, setAssignedTo] = useState("All");
  const [quickDate, setQuickDate] = useState("All");

  // Data State
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState({
    summary: {
      total_leads: 0,
      won_leads: 0,
      lost_leads: 0,
      total_pipeline_value: 0,
      total_won_value: 0,
      conversion_rate: 0
    },
    statusBreakdown: [],
    sourceBreakdown: [],
    repBreakdown: []
  });

  // Detailed leads list
  const [leadsList, setLeadsList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);

  // Employees for dropdown
  const [employees, setEmployees] = useState([]);

  // Fetch employees list
  useEffect(() => {
    api.get("/crm/leads/employees")
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setEmployees(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Quick date selector
  const handleQuickDate = (type) => {
    setQuickDate(type);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (type === "Today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === "Week") {
      const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      setStartDate(oneWeekAgo);
      setEndDate(todayStr);
    } else if (type === "Month") {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(firstDayOfMonth);
      setEndDate(todayStr);
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  // Fetch Analytics Summary
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get("/crm/leads/reports/summary", {
        params: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          dateField,
          assigned_to: assignedTo !== "All" ? assignedTo : undefined
        }
      });
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        setAnalytics({
          summary: {
            total_leads: 0,
            won_leads: 0,
            lost_leads: 0,
            total_pipeline_value: 0,
            total_won_value: 0,
            conversion_rate: 0,
            ...(d.summary || {})
          },
          statusBreakdown: Array.isArray(d.statusBreakdown) ? d.statusBreakdown : [],
          sourceBreakdown: Array.isArray(d.sourceBreakdown) ? d.sourceBreakdown : [],
          repBreakdown: Array.isArray(d.repBreakdown) ? d.repBreakdown : []
        });
      }
    } catch (err) {
      console.error("Failed to fetch lead analytics:", err);
      toast.error("Failed to load lead reports summary");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Detailed Table
  const fetchDetailedLeads = async () => {
    setListLoading(true);
    try {
      const res = await api.get("/crm/leads", {
        params: {
          search: search.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          dateField,
          assigned_to: assignedTo !== "All" ? assignedTo : undefined,
          page,
          limit
        }
      });
      if (res.data?.success) {
        setLeadsList(res.data.data || []);
        setTotalLeadsCount(res.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch detailed leads:", err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate, dateField, assignedTo]);

  useEffect(() => {
    fetchDetailedLeads();
  }, [startDate, endDate, dateField, assignedTo, search, page, limit]);

  // Reset Filters
  const handleResetFilters = () => {
    setQuickDate("All");
    setStartDate("");
    setEndDate("");
    setAssignedTo("All");
    setDateField("created_at");
    setSearch("");
    setPage(1);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!leadsList.length) {
      toast.warning("No lead data available to export");
      return;
    }

    const headers = [
      "Lead Code",
      "Title",
      "Prospect",
      "Company",
      "Mobile",
      "Product",
      "Budget",
      "Source",
      "Status",
      "Assigned Rep",
      "Created Date"
    ];

    const rows = leadsList.map((l) => [
      `"${l.lead_code || l.id}"`,
      `"${l.lead_title || ""}"`,
      `"${(l.first_name || "") + " " + (l.last_name || "")}"`,
      `"${l.company_name || ""}"`,
      `"${l.mobile_number || ""}"`,
      `"${l.interested_product || ""}"`,
      l.expected_budget || 0,
      `"${l.lead_source || ""}"`,
      `"${l.lead_status || ""}"`,
      `"${l.assigned_to || ""}"`,
      `"${(l.created_at || "").slice(0, 10)}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Lead_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Lead Report CSV exported successfully!");
  };

  const totalPages = Math.ceil(totalLeadsCount / limit) || 1;
  const summary = analytics?.summary || {};
  const statusBreakdown = Array.isArray(analytics?.statusBreakdown) ? analytics.statusBreakdown : [];
  const sourceBreakdown = Array.isArray(analytics?.sourceBreakdown) ? analytics.sourceBreakdown : [];
  const repBreakdown = Array.isArray(analytics?.repBreakdown) ? analytics.repBreakdown : [];

  return (
    <div className="crm-content-scroll" style={{ paddingBottom: "70px" }}>
      {/* Top Header & Tab Toggle */}
      <div className="crm-contacts-header mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h2 className="crm-page-title d-flex align-items-center gap-2 mb-1">
              <FaChartBar className="text-primary" />
              <span>Lead Reports & Analytics</span>
            </h2>
            <p className="text-muted mb-0" style={{ fontSize: "13.5px" }}>
              Comprehensive performance analysis, deal conversion funnel, and revenue tracking.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Quick Switch to Follow-up Reports */}
            <div
              className="bg-light p-1 border rounded-pill d-flex align-items-center me-2"
              style={{ fontSize: "12.5px" }}
            >
              <button
                className="btn btn-sm btn-primary rounded-pill px-3 py-1 fw-bold shadow-none"
                style={{ fontSize: "12px" }}
              >
                Lead Reports
              </button>
              <button
                className="btn btn-sm btn-link text-muted rounded-pill px-3 py-1 text-decoration-none shadow-none"
                style={{ fontSize: "12px" }}
                onClick={() => navigate("/crm/reports/followups")}
              >
                Follow-up Reports
              </button>
            </div>

            <button
              className="btn btn-light border d-flex align-items-center gap-2"
              onClick={handleExportCSV}
              title="Export Report to CSV"
              style={{ borderRadius: "10px", fontSize: "13px", padding: "8px 14px" }}
            >
              <FaDownload size={12} className="text-secondary" />
              <span className="d-none d-sm-inline">Export CSV</span>
            </button>

            <button
              className="btn btn-light border d-flex align-items-center gap-2"
              onClick={() => {
                fetchAnalytics();
                fetchDetailedLeads();
              }}
              title="Refresh Analytics"
              style={{ borderRadius: "10px", fontSize: "13px", padding: "8px 14px" }}
            >
              <FaSyncAlt size={12} />
              <span className="d-none d-sm-inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="crm-card p-3 mb-4" style={{ borderRadius: "14px" }}>
        <div className="row g-2 align-items-end">
          {/* Quick Date Pills */}
          <div className="col-12 col-lg-3">
            <label className="form-label text-muted mb-1 fw-semibold" style={{ fontSize: "11.5px" }}>
              Time Period
            </label>
            <div className="d-flex gap-1">
              {["All", "Today", "Week", "Month"].map((p) => (
                <button
                  key={p}
                  className={`btn btn-sm flex-fill ${quickDate === p ? "btn-primary" : "btn-light border"}`}
                  style={{ borderRadius: "8px", fontSize: "11.5px", padding: "4px 8px" }}
                  onClick={() => handleQuickDate(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div className="col-6 col-md-2">
            <label className="form-label text-muted mb-1 fw-semibold" style={{ fontSize: "11.5px" }}>
              From Date
            </label>
            <input
              type="date"
              className="form-control form-control-sm"
              style={{ borderRadius: "8px", fontSize: "12px" }}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setQuickDate("Custom");
              }}
            />
          </div>

          {/* End Date */}
          <div className="col-6 col-md-2">
            <label className="form-label text-muted mb-1 fw-semibold" style={{ fontSize: "11.5px" }}>
              To Date
            </label>
            <input
              type="date"
              className="form-control form-control-sm"
              style={{ borderRadius: "8px", fontSize: "12px" }}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setQuickDate("Custom");
              }}
            />
          </div>

          {/* Assigned Staff Filter */}
          <div className="col-6 col-md-3">
            <label className="form-label text-muted mb-1 fw-semibold" style={{ fontSize: "11.5px" }}>
              Assigned Representative
            </label>
            <select
              className="form-select form-select-sm"
              style={{ borderRadius: "8px", fontSize: "12.5px" }}
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="All">All Representatives</option>
              {employees.map((emp) => (
                <option key={emp.id || emp.name} value={emp.name}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          <div className="col-6 col-md-2">
            <button
              className="btn btn-sm btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-1"
              style={{ borderRadius: "8px", height: "31px", fontSize: "12px" }}
              onClick={handleResetFilters}
            >
              <FaUndo size={10} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="row g-3 mb-4">
        {/* Metric 1: Total Leads */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="crm-card p-3 d-flex align-items-center gap-3"
            style={{
              borderRadius: "14px",
              borderLeft: "4px solid #3b82f6",
              backgroundColor: "#ffffff"
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb"
              }}
            >
              <FaUserFriends size={20} />
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: "11.5px", fontWeight: "600", textTransform: "uppercase" }}>
                Total Leads
              </div>
              <div className="fw-bold text-dark" style={{ fontSize: "20px" }}>
                {summary.total_leads}
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Won Deals & Conversion % */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="crm-card p-3 d-flex align-items-center gap-3"
            style={{
              borderRadius: "14px",
              borderLeft: "4px solid #10b981",
              backgroundColor: "#ffffff"
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "#ecfdf5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#059669"
              }}
            >
              <FaTrophy size={20} />
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: "11.5px", fontWeight: "600", textTransform: "uppercase" }}>
                Won Deals
              </div>
              <div className="fw-bold text-dark d-flex align-items-baseline gap-2" style={{ fontSize: "20px" }}>
                <span>{summary.won_leads}</span>
                <span className="badge bg-success-subtle text-success" style={{ fontSize: "11px" }}>
                  {summary.conversion_rate}% Conv.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric 3: Total Pipeline Opportunity */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="crm-card p-3 d-flex align-items-center gap-3"
            style={{
              borderRadius: "14px",
              borderLeft: "4px solid #f59e0b",
              backgroundColor: "#ffffff"
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "#fffbeb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#d97706"
              }}
            >
              <FaRupeeSign size={20} />
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: "11.5px", fontWeight: "600", textTransform: "uppercase" }}>
                Pipeline Value
              </div>
              <div className="fw-bold text-dark" style={{ fontSize: "20px" }}>
                ₹{summary.total_pipeline_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </div>

        {/* Metric 4: Total Won Revenue */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div
            className="crm-card p-3 d-flex align-items-center gap-3"
            style={{
              borderRadius: "14px",
              borderLeft: "4px solid #8b5cf6",
              backgroundColor: "#ffffff"
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "#f5f3ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#7c3aed"
              }}
            >
              <FaCheckCircle size={20} />
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: "11.5px", fontWeight: "600", textTransform: "uppercase" }}>
                Won Revenue
              </div>
              <div className="fw-bold text-dark" style={{ fontSize: "20px" }}>
                ₹{summary.total_won_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="row g-4 mb-4">
        {/* Stage & Funnel Breakdown */}
        <div className="col-12 col-lg-6">
          <div className="crm-card p-4 h-100" style={{ borderRadius: "14px", backgroundColor: "#ffffff" }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: "15px" }}>
                Lead Status & Conversion Pipeline
              </h5>
              <span className="badge bg-light text-secondary border">
                {statusBreakdown.length} Stages
              </span>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <Spinner size="sm" color="primary" />
              </div>
            ) : statusBreakdown.length === 0 ? (
              <p className="text-muted text-center py-4 mb-0">No lead status data available.</p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {statusBreakdown.map((item, idx) => {
                  const pct = summary.total_leads > 0 ? ((item.count / summary.total_leads) * 100).toFixed(1) : 0;
                  const isWon = ["Closed Won", "Completed", "Won"].includes(item.lead_status);
                  const isLost = item.lead_status === "Lost";
                  const barColor = isWon ? "#10b981" : isLost ? "#ef4444" : "#3b82f6";

                  return (
                    <div key={idx}>
                      <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: "12.5px" }}>
                        <span className="fw-semibold text-dark">{item.lead_status}</span>
                        <div className="text-end">
                          <span className="fw-bold text-dark">{item.count} leads</span>
                          <span className="text-muted ms-2">
                            (₹{Number(item.total_value).toLocaleString("en-IN")})
                          </span>
                        </div>
                      </div>
                      <div className="progress" style={{ height: "7px", backgroundColor: "#f1f5f9", borderRadius: "10px" }}>
                        <div
                          className="progress-bar"
                          role="progressbar"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: barColor,
                            borderRadius: "10px"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Lead Source Breakdown */}
        <div className="col-12 col-lg-6">
          <div className="crm-card p-4 h-100" style={{ borderRadius: "14px", backgroundColor: "#ffffff" }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: "15px" }}>
                Lead Generation by Source
              </h5>
              <span className="badge bg-light text-secondary border">
                {sourceBreakdown.length} Sources
              </span>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <Spinner size="sm" color="primary" />
              </div>
            ) : sourceBreakdown.length === 0 ? (
              <p className="text-muted text-center py-4 mb-0">No source data available.</p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {sourceBreakdown.map((item, idx) => {
                  const pct = summary.total_leads > 0 ? ((item.count / summary.total_leads) * 100).toFixed(1) : 0;
                  return (
                    <div key={idx}>
                      <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: "12.5px" }}>
                        <span className="fw-semibold text-dark">{item.lead_source}</span>
                        <div className="text-end">
                          <span className="fw-bold text-dark">{item.count} leads</span>
                          <span className="badge bg-light text-dark border ms-2">{pct}%</span>
                        </div>
                      </div>
                      <div className="progress" style={{ height: "7px", backgroundColor: "#f1f5f9", borderRadius: "10px" }}>
                        <div
                          className="progress-bar bg-info"
                          role="progressbar"
                          style={{
                            width: `${pct}%`,
                            borderRadius: "10px"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sales Representative Performance Table */}
      <div className="crm-card mb-4" style={{ borderRadius: "14px", overflow: "hidden" }}>
        <div className="p-3 bg-white border-bottom d-flex align-items-center justify-content-between">
          <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: "15px" }}>
            Sales Representative Performance Breakdown
          </h5>
          <span className="text-muted" style={{ fontSize: "12px" }}>
            Conversion and deal volume per sales rep
          </span>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0 crm-table">
            <thead className="bg-light">
              <tr>
                <th>Representative Name</th>
                <th>Total Assigned Leads</th>
                <th>Won / Converted</th>
                <th>Pipeline Opportunity</th>
                <th>Closed Won Value</th>
                <th>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {repBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted" style={{ fontSize: "13px" }}>
                    No sales representative assignments found for this period.
                  </td>
                </tr>
              ) : (
                repBreakdown.map((rep, idx) => {
                  const convPct = rep.total_leads > 0 ? ((rep.won_leads / rep.total_leads) * 100).toFixed(1) : 0;

                  return (
                    <tr key={idx}>
                      <td className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                        {rep.rep_name}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: "12px" }}>
                          {rep.total_leads} Leads
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-success-subtle text-success px-2 py-1 fw-bold" style={{ fontSize: "12px" }}>
                          {rep.won_leads} Won
                        </span>
                      </td>
                      <td className="text-dark fw-medium" style={{ fontSize: "13px" }}>
                        ₹{Number(rep.total_value).toLocaleString("en-IN")}
                      </td>
                      <td className="text-success fw-bold" style={{ fontSize: "13px" }}>
                        ₹{Number(rep.won_value).toLocaleString("en-IN")}
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress flex-fill" style={{ height: "6px", width: "80px" }}>
                            <div
                              className="progress-bar bg-success"
                              style={{ width: `${convPct}%` }}
                            />
                          </div>
                          <span className="fw-bold text-dark" style={{ fontSize: "12px" }}>
                            {convPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Leads Report Table */}
      <div className="crm-card overflow-hidden" style={{ borderRadius: "14px" }}>
        <div className="p-3 bg-white border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3">
          <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: "15px" }}>
            Detailed Lead Log ({totalLeadsCount} Records)
          </h5>

          <div style={{ maxWidth: "280px" }}>
            <Input
              type="text"
              placeholder="Search in log..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: "12.5px", borderRadius: "8px" }}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0 crm-table">
            <thead className="bg-light">
              <tr>
                <th style={{ width: "45px" }}>#</th>
                <th>Code & Title</th>
                <th>Customer / Company</th>
                <th>Requirement</th>
                <th>Value (₹)</th>
                <th>Source</th>
                <th>Status</th>
                <th>Assigned Rep</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <Spinner size="sm" color="primary" />
                    <div className="text-muted mt-2" style={{ fontSize: "13px" }}>
                      Loading lead logs...
                    </div>
                  </td>
                </tr>
              ) : leadsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    No leads matching the specified criteria.
                  </td>
                </tr>
              ) : (
                leadsList.map((lead, idx) => (
                  <tr key={lead.id || idx}>
                    <td className="text-muted" style={{ fontSize: "12px" }}>
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td>
                      <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                        {lead.lead_title}
                      </div>
                      <span className="text-muted" style={{ fontSize: "11px" }}>
                        {lead.lead_code || `ID: ${lead.id}`}
                      </span>
                    </td>
                    <td>
                      <div className="fw-medium text-dark">{lead.first_name} {lead.last_name || ""}</div>
                      {lead.company_name && (
                        <div className="text-muted" style={{ fontSize: "11.5px" }}>
                          {lead.company_name}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: "12.5px", maxWidth: "200px" }}>
                      {lead.interested_product || "-"}
                    </td>
                    <td className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                      ₹{Number(lead.expected_budget || 0).toLocaleString("en-IN")}
                    </td>
                    <td style={{ fontSize: "12.5px" }}>
                      {lead.lead_source || "Direct"}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border" style={{ fontSize: "11px" }}>
                        {lead.lead_status}
                      </span>
                    </td>
                    <td style={{ fontSize: "12.5px" }}>
                      {lead.assigned_to || "Unassigned"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!listLoading && leadsList.length > 0 && (
          <div className="p-3 bg-white border-top d-flex flex-wrap align-items-center justify-content-between gap-3" style={{ fontSize: "13px" }}>
            <div className="text-muted">
              Showing <strong>{(page - 1) * limit + 1} - {Math.min(page * limit, totalLeadsCount)}</strong> of <strong>{totalLeadsCount}</strong>
            </div>

            <div className="d-flex align-items-center gap-1">
              <button
                className="btn btn-sm btn-light border px-2 py-1"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ borderRadius: "6px" }}
              >
                <FaChevronLeft size={10} /> Prev
              </button>

              <span className="mx-2 text-muted fw-semibold">
                Page {page} of {totalPages}
              </span>

              <button
                className="btn btn-sm btn-light border px-2 py-1"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ borderRadius: "6px" }}
              >
                Next <FaChevronRight size={10} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrmLeadReports;

