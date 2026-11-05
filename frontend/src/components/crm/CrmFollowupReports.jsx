import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarCheck,
  FaPhoneAlt,
  FaWhatsapp,
  FaEnvelope,
  FaUsers,
  FaMapMarkerAlt,
  FaClock,
  FaFilter,
  FaUndo,
  FaSyncAlt,
  FaDownload,
  FaCheckCircle,
  FaTimesCircle,
  FaChartBar,
  FaChevronLeft,
  FaChevronRight,
  FaPaperclip
} from "react-icons/fa";
import { Spinner, Input } from "reactstrap";
import { toast } from "react-toastify";
import api from "../../utils/api";

const CrmFollowupReports = () => {
  const navigate = useNavigate();

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("All");
  const [quickDate, setQuickDate] = useState("All");

  // Data State
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState({
    summary: {
      total_followups: 0,
      completed_count: 0,
      pending_count: 0,
      rescheduled_count: 0,
      cancelled_count: 0,
      total_duration_minutes: 0,
      completion_rate: 0
    },
    typeBreakdown: [],
    responseBreakdown: [],
    staffBreakdown: []
  });

  // Detailed Log
  const [followupsList, setFollowupsList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Employees for dropdown
  const [employees, setEmployees] = useState([]);

  // Fetch employees
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

  // Fetch Analytics
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get("/crm/followups/reports/summary", {
        params: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          assigned_to: assignedTo !== "All" ? assignedTo : undefined
        }
      });
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        setAnalytics({
          summary: {
            total_followups: 0,
            completed_count: 0,
            pending_count: 0,
            rescheduled_count: 0,
            cancelled_count: 0,
            total_duration_minutes: 0,
            completion_rate: 0,
            ...(d.summary || {})
          },
          typeBreakdown: Array.isArray(d.typeBreakdown) ? d.typeBreakdown : [],
          responseBreakdown: Array.isArray(d.responseBreakdown) ? d.responseBreakdown : [],
          staffBreakdown: Array.isArray(d.staffBreakdown || d.repBreakdown)
            ? (d.staffBreakdown || d.repBreakdown)
            : []
        });
      }
    } catch (err) {
      console.error("Failed to load follow-up reports summary:", err);
      toast.error("Failed to load follow-up reports summary");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Detailed Followups
  const fetchDetailedFollowups = async () => {
    setListLoading(true);
    try {
      const res = await api.get("/crm/followups", {
        params: {
          search: search.trim() || undefined,
          fromDate: startDate || undefined,
          toDate: endDate || undefined,
          assigned_to: assignedTo !== "All" ? assignedTo : undefined,
          page,
          limit
        }
      });
      if (res.data?.success) {
        setFollowupsList(res.data.data || []);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch detailed follow-ups:", err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate, assignedTo]);

  useEffect(() => {
    fetchDetailedFollowups();
  }, [startDate, endDate, assignedTo, search, page, limit]);

  // Reset Filters
  const handleResetFilters = () => {
    setQuickDate("All");
    setStartDate("");
    setEndDate("");
    setAssignedTo("All");
    setSearch("");
    setPage(1);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!followupsList.length) {
      toast.warning("No follow-up records to export");
      return;
    }

    const headers = [
      "Follow-up ID",
      "Title",
      "Related To",
      "Contact Name",
      "Company",
      "Mobile",
      "Activity Type",
      "Date",
      "Time",
      "Duration (Mins)",
      "Priority",
      "Status",
      "Assigned To"
    ];

    const rows = followupsList.map((f) => [
      `"${f.followup_code || f.id}"`,
      `"${f.followup_title || ""}"`,
      `"${f.related_to || ""}"`,
      `"${f.entity_name || ""}"`,
      `"${f.company_name || ""}"`,
      `"${f.mobile_number || ""}"`,
      `"${f.followup_type || ""}"`,
      `"${f.followup_date || ""}"`,
      `"${f.followup_time || ""}"`,
      f.duration || 0,
      `"${f.priority || ""}"`,
      `"${f.followup_status || ""}"`,
      `"${f.assigned_to || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Followup_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Follow-up Report CSV exported successfully!");
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const summary = analytics?.summary || {};
  const typeBreakdown = Array.isArray(analytics?.typeBreakdown) ? analytics.typeBreakdown : [];
  const responseBreakdown = Array.isArray(analytics?.responseBreakdown) ? analytics.responseBreakdown : [];
  const staffBreakdown = Array.isArray(analytics?.staffBreakdown) ? analytics.staffBreakdown : [];

  return (
    <div className="crm-content-scroll" style={{ paddingBottom: "70px" }}>
      {/* Top Header & Tab Toggle */}
      <div className="crm-contacts-header mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h2 className="crm-page-title d-flex align-items-center gap-2 mb-1">
              <FaCalendarCheck className="text-primary" />
              <span>Follow-up Reports & Activity Analytics</span>
            </h2>
            <p className="text-muted mb-0" style={{ fontSize: "13.5px" }}>
              Track customer engagement channels, communication velocity, and representative activity ratios.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Quick Switch to Lead Reports */}
            <div
              className="bg-light p-1 border rounded-pill d-flex align-items-center me-2"
              style={{ fontSize: "12.5px" }}
            >
              <button
                className="btn btn-sm btn-link text-muted rounded-pill px-3 py-1 text-decoration-none shadow-none"
                style={{ fontSize: "12px" }}
                onClick={() => navigate("/crm/reports/leads")}
              >
                Lead Reports
              </button>
              <button
                className="btn btn-sm btn-primary rounded-pill px-3 py-1 fw-bold shadow-none"
                style={{ fontSize: "12px" }}
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
                fetchDetailedFollowups();
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
        {/* Metric 1: Total Activities */}
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
              <FaCalendarCheck size={20} />
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: "11.5px", fontWeight: "600", textTransform: "uppercase" }}>
                Total Follow-ups
              </div>
              <div className="fw-bold text-dark" style={{ fontSize: "20px" }}>
                {summary.total_followups}
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Completed Rate */}
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
              <FaCheckCircle size={20} />
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: "11.5px", fontWeight: "600", textTransform: "uppercase" }}>
                Completed
              </div>
              <div className="fw-bold text-dark d-flex align-items-baseline gap-2" style={{ fontSize: "20px" }}>
                <span>{summary.completed_count}</span>
                <span className="badge bg-success-subtle text-success" style={{ fontSize: "11px" }}>
                  {summary.completion_rate}% Done
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric 3: Pending Follow-ups */}
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
              <FaClock size={20} />
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: "11.5px", fontWeight: "600", textTransform: "uppercase" }}>
                Pending / Due
              </div>
              <div className="fw-bold text-dark" style={{ fontSize: "20px" }}>
                {summary.pending_count}
              </div>
            </div>
          </div>
        </div>

        {/* Metric 4: Total Time Spent */}
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
              <FaPhoneAlt size={18} />
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: "11.5px", fontWeight: "600", textTransform: "uppercase" }}>
                Total Call / Meeting Time
              </div>
              <div className="fw-bold text-dark" style={{ fontSize: "20px" }}>
                {summary.total_duration_minutes} <span style={{ fontSize: "13px", fontWeight: "500" }}>mins</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="row g-4 mb-4">
        {/* Activity Type Breakdown */}
        <div className="col-12 col-lg-6">
          <div className="crm-card p-4 h-100" style={{ borderRadius: "14px", backgroundColor: "#ffffff" }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: "15px" }}>
                Follow-up Activity by Channel
              </h5>
              <span className="badge bg-light text-secondary border">
                {typeBreakdown.length} Types
              </span>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <Spinner size="sm" color="primary" />
              </div>
            ) : typeBreakdown.length === 0 ? (
              <p className="text-muted text-center py-4 mb-0">No activity type data recorded.</p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {typeBreakdown.map((item, idx) => {
                  const pct = summary.total_followups > 0 ? ((item.count / summary.total_followups) * 100).toFixed(1) : 0;
                  return (
                    <div key={idx}>
                      <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: "12.5px" }}>
                        <span className="fw-semibold text-dark">{item.followup_type}</span>
                        <div className="text-end">
                          <span className="fw-bold text-dark">{item.count} total</span>
                          <span className="text-success ms-2">
                            ({item.completed_count || 0} completed)
                          </span>
                        </div>
                      </div>
                      <div className="progress" style={{ height: "7px", backgroundColor: "#f1f5f9", borderRadius: "10px" }}>
                        <div
                          className="progress-bar bg-primary"
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

        {/* Customer Response Breakdown */}
        <div className="col-12 col-lg-6">
          <div className="crm-card p-4 h-100" style={{ borderRadius: "14px", backgroundColor: "#ffffff" }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: "15px" }}>
                Customer Feedback & Response
              </h5>
              <span className="badge bg-light text-secondary border">
                {responseBreakdown.length} Responses
              </span>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <Spinner size="sm" color="primary" />
              </div>
            ) : responseBreakdown.length === 0 ? (
              <p className="text-muted text-center py-4 mb-0">No customer response data recorded.</p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {responseBreakdown.map((item, idx) => {
                  const pct = summary.total_followups > 0 ? ((item.count / summary.total_followups) * 100).toFixed(1) : 0;
                  const isInterested = item.response === "Interested";
                  const isNotInterested = item.response === "Not Interested";
                  const barColor = isInterested ? "#10b981" : isNotInterested ? "#ef4444" : "#f59e0b";

                  return (
                    <div key={idx}>
                      <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: "12.5px" }}>
                        <span className="fw-semibold text-dark">{item.response}</span>
                        <div className="text-end">
                          <span className="fw-bold text-dark">{item.count} leads</span>
                          <span className="badge bg-light text-dark border ms-2">{pct}%</span>
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
      </div>

      {/* Staff Activity Breakdown Table */}
      <div className="crm-card mb-4" style={{ borderRadius: "14px", overflow: "hidden" }}>
        <div className="p-3 bg-white border-bottom d-flex align-items-center justify-content-between">
          <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: "15px" }}>
            Staff Follow-up Activity & Completion
          </h5>
          <span className="text-muted" style={{ fontSize: "12px" }}>
            Task execution efficiency per representative
          </span>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0 crm-table">
            <thead className="bg-light">
              <tr>
                <th>Representative Name</th>
                <th>Total Assigned</th>
                <th>Completed</th>
                <th>Pending / Due</th>
                <th>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {staffBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted" style={{ fontSize: "13px" }}>
                    No staff activity records found for this period.
                  </td>
                </tr>
              ) : (
                staffBreakdown.map((staff, idx) => {
                  const total = staff.total_assigned ?? staff.total ?? 0;
                  const completed = staff.completed_count ?? staff.completed ?? 0;
                  const pending = staff.pending_count ?? staff.pending ?? 0;
                  const rate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
                  const repName = staff.staff_name || staff.rep_name || "Unassigned";

                  return (
                    <tr key={idx}>
                      <td className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                        {repName}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: "12px" }}>
                          {total} Tasks
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-success-subtle text-success px-2 py-1 fw-bold" style={{ fontSize: "12px" }}>
                          {completed} Done
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-warning-subtle text-warning px-2 py-1 fw-bold" style={{ fontSize: "12px" }}>
                          {pending} Pending
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress flex-fill" style={{ height: "6px", width: "90px" }}>
                            <div
                              className="progress-bar bg-success"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="fw-bold text-dark" style={{ fontSize: "12px" }}>
                            {rate}%
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

      {/* Detailed Follow-up Log Table */}
      <div className="crm-card overflow-hidden" style={{ borderRadius: "14px" }}>
        <div className="p-3 bg-white border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3">
          <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: "15px" }}>
            Detailed Follow-up Log ({totalCount} Records)
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
                <th>Contact & Company</th>
                <th>Type</th>
                <th>Date & Time</th>
                <th>Duration</th>
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
                      Loading follow-up log...
                    </div>
                  </td>
                </tr>
              ) : followupsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    No follow-ups matching the specified criteria.
                  </td>
                </tr>
              ) : (
                followupsList.map((f, idx) => (
                  <tr key={f.id || idx}>
                    <td className="text-muted" style={{ fontSize: "12px" }}>
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td>
                      <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                        {f.followup_title}
                      </div>
                      <span className="text-muted" style={{ fontSize: "11px" }}>
                        {f.followup_code || `ID: ${f.id}`}
                      </span>
                    </td>
                    <td>
                      <div className="fw-medium text-dark">{f.entity_name || "-"}</div>
                      {f.company_name && (
                        <div className="text-muted" style={{ fontSize: "11.5px" }}>
                          {f.company_name}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: "12.5px" }}>
                      {f.followup_type}
                    </td>
                    <td style={{ fontSize: "12.5px" }}>
                      {f.followup_date || "-"} {f.followup_time || ""}
                    </td>
                    <td style={{ fontSize: "12.5px" }}>
                      {f.duration ? `${f.duration} mins` : "-"}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: f.followup_status === "Completed" ? "#ecfdf5" : "#fffbeb",
                          color: f.followup_status === "Completed" ? "#059669" : "#d97706",
                          border: `1px solid ${f.followup_status === "Completed" ? "#a7f3d0" : "#fde68a"}`
                        }}
                      >
                        {f.followup_status}
                      </span>
                    </td>
                    <td style={{ fontSize: "12.5px" }}>
                      {f.assigned_to || "Unassigned"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!listLoading && followupsList.length > 0 && (
          <div className="p-3 bg-white border-top d-flex flex-wrap align-items-center justify-content-between gap-3" style={{ fontSize: "13px" }}>
            <div className="text-muted">
              Showing <strong>{(page - 1) * limit + 1} - {Math.min(page * limit, totalCount)}</strong> of <strong>{totalCount}</strong>
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

export default CrmFollowupReports;

