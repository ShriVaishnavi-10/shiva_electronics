import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserTie,
  FaTrophy,
  FaCalendarCheck,
  FaSearch,
  FaFilter,
  FaUndo,
  FaSyncAlt,
  FaDownload,
  FaCheckCircle,
  FaTimesCircle,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaEnvelope,
  FaWhatsapp,
  FaEye,
  FaTimes,
  FaArrowRight,
  FaLayerGroup,
  FaMoneyBillWave,
  FaClock,
  FaUserPlus,
  FaHandshake,
  FaPrint,
  FaChevronRight
} from "react-icons/fa";
import { Spinner, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { toast } from "react-toastify";
import api from "../../utils/api";

export default function CrmPerformanceReport() {
  const navigate = useNavigate();

  // Authentication check
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const roleLower = String(storedUser.role_name || storedUser.role || "").toLowerCase();
  const isAdmin =
    roleLower.includes("admin") ||
    roleLower.includes("super admin") ||
    storedUser.id === 1;

  // Filter States
  const [basis, setBasis] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  // Data States
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_sales_persons: 0,
    total_leads_created: 0,
    total_leads_assigned: 0,
    total_won_leads: 0,
    total_active_leads: 0,
    total_won_value: 0,
    total_pipeline_value: 0,
    total_followups: 0,
    completed_followups: 0,
    pending_followups: 0,
    overall_conversion_rate: "0.0"
  });
  const [salesPersons, setSalesPersons] = useState([]);

  // Drilldown Modal State
  const [selectedRep, setSelectedRep] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [repLeads, setRepLeads] = useState([]);
  const [repLeadFilter, setRepLeadFilter] = useState("all"); // "all", "assigned", "created", "won"
  const [repLeadStatus, setRepLeadStatus] = useState("All");
  const [repLeadSearch, setRepLeadSearch] = useState("");
  const [expandedLeadId, setExpandedLeadId] = useState(null);

  // Fetch Report Data
  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get("/crm/reports/sales-performance", {
        params: {
          basis,
          startDate: basis === "custom" ? startDate : undefined,
          endDate: basis === "custom" ? endDate : undefined,
          search: search.trim() || undefined
        }
      });
      if (res.data?.success) {
        setSummary(res.data.summary || {});
        setSalesPersons(Array.isArray(res.data.salesPersons) ? res.data.salesPersons : []);
      }
    } catch (err) {
      console.error("Failed to load sales performance report:", err);
      if (err.response?.status === 403) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/crm/leads");
      } else {
        toast.error("Failed to load sales performance report");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [basis, startDate, endDate]);

  // Handle Quick Date Selection
  const handleQuickPeriod = (p) => {
    setBasis(p);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (p === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (p === "this_week") {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      setStartDate(startOfWeek.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (p === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(startOfMonth.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (p === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Open Rep Drilldown Modal
  const handleOpenDrilldown = async (rep) => {
    setSelectedRep(rep);
    setRepLeadFilter("all");
    setRepLeadStatus("All");
    setRepLeadSearch("");
    setExpandedLeadId(null);
    setModalOpen(true);
    setModalLoading(true);

    try {
      const res = await api.get(`/crm/reports/sales-performance/${rep.id}/leads`, {
        params: {
          filterType: "all",
          basis,
          startDate: basis === "custom" ? startDate : undefined,
          endDate: basis === "custom" ? endDate : undefined
        }
      });
      if (res.data?.success) {
        setRepLeads(Array.isArray(res.data.leads) ? res.data.leads : []);
      }
    } catch (err) {
      console.error("Failed to load rep leads:", err);
      toast.error("Failed to load leads for this sales representative");
    } finally {
      setModalLoading(false);
    }
  };

  // Filter Rep Leads inside Modal
  const filteredRepLeads = useMemo(() => {
    return repLeads.filter((lead) => {
      // Relationship filter (all, assigned, created, won)
      if (repLeadFilter === "assigned" && lead.relationship !== "assigned" && lead.relationship !== "both") {
        return false;
      }
      if (repLeadFilter === "created" && lead.relationship !== "created" && lead.relationship !== "both") {
        return false;
      }
      if (repLeadFilter === "won" && !["Closed Won", "Completed", "Won"].includes(lead.lead_status)) {
        return false;
      }

      // Status filter
      if (repLeadStatus !== "All" && lead.lead_status !== repLeadStatus) {
        return false;
      }

      // Search term
      if (repLeadSearch.trim()) {
        const q = repLeadSearch.trim().toLowerCase();
        const title = String(lead.lead_title || "").toLowerCase();
        const code = String(lead.lead_code || "").toLowerCase();
        const name = String(lead.customer_name || "").toLowerCase();
        const phone = String(lead.mobile_number || "").toLowerCase();
        const product = String(lead.interested_product || "").toLowerCase();
        const city = String(lead.city || "").toLowerCase();
        if (
          !title.includes(q) &&
          !code.includes(q) &&
          !name.includes(q) &&
          !phone.includes(q) &&
          !product.includes(q) &&
          !city.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [repLeads, repLeadFilter, repLeadStatus, repLeadSearch]);

  // Export Main Report to CSV
  const handleExportCSV = () => {
    if (!salesPersons.length) {
      toast.warning("No data to export");
      return;
    }
    const headers = [
      "Sales Representative",
      "Sales Code",
      "Contact Phone",
      "Email",
      "Target Amount (₹)",
      "Leads Created",
      "Leads Assigned",
      "Won Deals",
      "Active Deals",
      "Lost Deals",
      "Conversion Rate (%)",
      "Won Revenue (₹)",
      "Pipeline Value (₹)",
      "Total Activities",
      "Completed Activities",
      "Pending Activities"
    ];

    const rows = salesPersons.map((s) => [
      `"${s.name}"`,
      `"${s.sales_code}"`,
      `"${s.phone}"`,
      `"${s.email}"`,
      s.target_amount,
      s.total_leads_created,
      s.total_leads_assigned,
      s.won_leads,
      s.active_leads,
      s.lost_leads,
      s.conversion_rate,
      s.won_value,
      s.total_pipeline_value,
      s.total_followups,
      s.completed_followups,
      s.pending_followups
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Sales_Performance_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sales Performance Report exported to CSV!");
  };

  // Export Individual Rep Leads to CSV
  const handleExportRepLeadsCSV = () => {
    if (!filteredRepLeads.length) {
      toast.warning("No leads to export for this representative");
      return;
    }
    const headers = [
      "Lead Code",
      "Lead Title",
      "Customer Name",
      "Contact Phone",
      "Email",
      "Address",
      "City",
      "Relationship",
      "Status",
      "Priority",
      "Expected Budget (₹)",
      "Interested Product",
      "Assigned To",
      "Assigned Date",
      "Total Follow-ups",
      "Latest Follow-up Date",
      "Latest Follow-up Status"
    ];

    const rows = filteredRepLeads.map((l) => [
      `"${l.lead_code || ""}"`,
      `"${(l.lead_title || "").replace(/"/g, '""')}"`,
      `"${(l.customer_name || "").replace(/"/g, '""')}"`,
      `"${l.mobile_number || ""}"`,
      `"${l.email_address || ""}"`,
      `"${(l.address || "").replace(/"/g, '""')}"`,
      `"${l.city || ""}"`,
      `"${l.relationship === "both" ? "Created & Assigned" : l.relationship === "created" ? "Created by Rep" : "Assigned"}"`,
      `"${l.lead_status || ""}"`,
      `"${l.priority || ""}"`,
      l.expected_budget || 0,
      `"${(l.interested_product || "").replace(/"/g, '""')}"`,
      `"${l.assigned_to || ""}"`,
      `"${l.assigned_date || ""}"`,
      l.followups_count || 0,
      `"${l.latest_followup?.followup_date || "N/A"}"`,
      `"${l.latest_followup?.followup_status || "N/A"}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Leads_${selectedRep?.name || "Rep"}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredRepLeads.length} leads to CSV!`);
  };

  return (
    <div className="crm-content-scroll" style={{ paddingBottom: "70px" }}>
      {/* 1. Header & Navigation Title */}
      <div className="crm-contacts-header mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0f172a",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.35)"
                }}
              >
                <FaTrophy size={18} />
              </span>
              <h2 className="crm-page-title mb-0" style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff" }}>
                Sales Person Performance Report
              </h2>
              <span
                className="badge ms-2"
                style={{
                  background: "rgba(245, 158, 11, 0.2)",
                  color: "#f59e0b",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontWeight: "700"
                }}
              >
                Admin Only
              </span>
            </div>
            <p className="text-muted mb-0" style={{ fontSize: "13.5px" }}>
              Comprehensive performance analysis: track leads created, leads assigned, won conversions, and customer interactions per representative.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              className="btn btn-sm btn-light border d-flex align-items-center gap-2"
              onClick={handleExportCSV}
              title="Export Full Performance Report to CSV"
              style={{ borderRadius: "10px", fontSize: "12.5px", padding: "8px 14px", fontWeight: "600" }}
            >
              <FaDownload size={12} className="text-secondary" />
              <span>Export CSV</span>
            </button>
            <button
              className="btn btn-sm btn-light border d-flex align-items-center gap-2"
              onClick={() => window.print()}
              title="Print Performance Report"
              style={{ borderRadius: "10px", fontSize: "12.5px", padding: "8px 14px", fontWeight: "600" }}
            >
              <FaPrint size={12} />
              <span>Print</span>
            </button>
            <button
              className="btn btn-sm btn-primary d-flex align-items-center gap-2"
              onClick={fetchReport}
              title="Refresh Data"
              style={{ borderRadius: "10px", fontSize: "12.5px", padding: "8px 16px", fontWeight: "700" }}
            >
              <FaSyncAlt size={12} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="crm-card p-3 mb-4" style={{ borderRadius: "14px", backgroundColor: "#ffffff" }}>
        <div className="row g-3 align-items-center">
          {/* Quick Period Buttons */}
          <div className="col-12 col-md-5 col-xl-4">
            <label className="form-label text-muted mb-1 fw-bold" style={{ fontSize: "11.5px", textTransform: "uppercase" }}>
              Report Basis (Time Period)
            </label>
            <div className="d-flex gap-1">
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "this_week", label: "This Week" },
                { id: "this_month", label: "This Month" },
                { id: "custom", label: "Custom" }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleQuickPeriod(p.id)}
                  className={`btn btn-sm flex-fill ${basis === p.id ? "btn-primary fw-bold" : "btn-light border text-secondary"}`}
                  style={{ borderRadius: "8px", fontSize: "11.5px", padding: "6px 8px" }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range if Custom */}
          {basis === "custom" && (
            <div className="col-12 col-md-4 col-xl-4">
              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label text-muted mb-1 fw-semibold" style={{ fontSize: "11px" }}>
                    From Date
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label text-muted mb-1 fw-semibold" style={{ fontSize: "11px" }}>
                    To Date
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Search Box */}
          <div className={`col-12 ${basis === "custom" ? "col-md-3 col-xl-4" : "col-md-7 col-xl-8"}`}>
            <label className="form-label text-muted mb-1 fw-bold" style={{ fontSize: "11.5px", textTransform: "uppercase" }}>
              Search Sales Person
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0" style={{ borderRadius: "8px 0 0 8px" }}>
                <FaSearch size={12} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by sales representative name, code, phone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchReport()}
                style={{ borderRadius: "0 8px 8px 0", fontSize: "12.5px" }}
              />
              {search && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setSearch("");
                    fetchReport();
                  }}
                  title="Clear search"
                >
                  <FaTimes size={11} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Team Summary Cards */}
      <div className="row g-3 mb-4">
        {/* Card 1: Active Sales Persons */}
        <div className="col-12 col-sm-6 col-xl">
          <div
            className="crm-card p-3 h-100"
            style={{
              borderRadius: "14px",
              backgroundColor: "#ffffff",
              borderLeft: "4px solid #6366f1"
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#eef2ff",
                  color: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <FaUserTie size={19} />
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Sales Persons
                </span>
                <h3 className="fw-bold mb-0 text-dark" style={{ fontSize: "21px" }}>
                  {summary.total_sales_persons}
                </h3>
                <span className="text-muted" style={{ fontSize: "11px" }}>
                  Active representatives
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Leads Created by Reps */}
        <div className="col-12 col-sm-6 col-xl">
          <div
            className="crm-card p-3 h-100"
            style={{
              borderRadius: "14px",
              backgroundColor: "#ffffff",
              borderLeft: "4px solid #8b5cf6"
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#f5f3ff",
                  color: "#7c3aed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <FaUserPlus size={19} />
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Leads Created
                </span>
                <h3 className="fw-bold mb-0 text-dark" style={{ fontSize: "21px" }}>
                  {summary.total_leads_created}
                </h3>
                <span className="text-purple fw-semibold" style={{ fontSize: "11px", color: "#7c3aed" }}>
                  Self-sourced by staff
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Leads Assigned */}
        <div className="col-12 col-sm-6 col-xl">
          <div
            className="crm-card p-3 h-100"
            style={{
              borderRadius: "14px",
              backgroundColor: "#ffffff",
              borderLeft: "4px solid #3b82f6"
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <FaLayerGroup size={19} />
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Leads Assigned
                </span>
                <h3 className="fw-bold mb-0 text-dark" style={{ fontSize: "21px" }}>
                  {summary.total_leads_assigned}
                </h3>
                <span className="text-primary fw-semibold" style={{ fontSize: "11px" }}>
                  Active workload
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Won Conversion Rate */}
        <div className="col-12 col-sm-6 col-xl">
          <div
            className="crm-card p-3 h-100"
            style={{
              borderRadius: "14px",
              backgroundColor: "#ffffff",
              borderLeft: "4px solid #10b981"
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <FaCheckCircle size={19} />
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Won Deals
                </span>
                <div className="d-flex align-items-baseline gap-2">
                  <h3 className="fw-bold mb-0 text-dark" style={{ fontSize: "21px" }}>
                    {summary.total_won_leads}
                  </h3>
                  <span className="badge bg-success-subtle text-success" style={{ fontSize: "11px", fontWeight: "700" }}>
                    {summary.overall_conversion_rate}%
                  </span>
                </div>
                <span className="text-muted" style={{ fontSize: "11px" }}>
                  Team win conversion
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: Won Revenue */}
        <div className="col-12 col-sm-6 col-xl">
          <div
            className="crm-card p-3 h-100"
            style={{
              borderRadius: "14px",
              backgroundColor: "#ffffff",
              borderLeft: "4px solid #f59e0b"
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#fffbeb",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <FaMoneyBillWave size={19} />
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Won Revenue
                </span>
                <h3 className="fw-bold mb-0 text-success" style={{ fontSize: "19px" }}>
                  ₹{Number(summary.total_won_value || 0).toLocaleString("en-IN")}
                </h3>
                <span className="text-muted" style={{ fontSize: "11px" }}>
                  Pipeline: ₹{Number(summary.total_pipeline_value || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sales Persons Performance Table */}
      <div className="crm-card mb-4" style={{ borderRadius: "14px", overflow: "hidden", backgroundColor: "#ffffff" }}>
        <div className="p-3 bg-white border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: "16px" }}>
              Sales Representative Performance Breakdown
            </h5>
            <span className="text-muted" style={{ fontSize: "12px" }}>
              Click on any sales person to inspect their complete lead inventory, contact details, and follow-up activities.
            </span>
          </div>
          <span className="badge bg-light text-secondary border px-2 py-1" style={{ fontSize: "12px" }}>
            {salesPersons.length} Sales Persons Listed
          </span>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0 crm-table">
            <thead className="bg-light">
              <tr>
                <th style={{ width: "260px" }}>Sales Person</th>
                <th className="text-center" style={{ width: "140px" }}>Leads Created</th>
                <th className="text-center" style={{ width: "140px" }}>Leads Assigned</th>
                <th style={{ width: "200px" }}>Conversion & Progress</th>
                <th style={{ width: "160px" }}>Won Revenue</th>
                <th style={{ width: "180px" }}>Follow-up Activity</th>
                <th className="text-end" style={{ width: "150px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <Spinner color="primary" />
                    <div className="text-muted mt-2" style={{ fontSize: "13px" }}>
                      Generating sales performance report...
                    </div>
                  </td>
                </tr>
              ) : salesPersons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <FaUserTie size={36} className="text-muted mb-2 opacity-50" />
                    <div className="fw-semibold text-dark">No sales persons found</div>
                    <div className="text-muted" style={{ fontSize: "12.5px" }}>
                      No active sales personnel records matched your filters.
                    </div>
                  </td>
                </tr>
              ) : (
                salesPersons.map((sp) => {
                  const initials = sp.name
                    ? sp.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "SP";

                  return (
                    <tr
                      key={sp.id}
                      style={{ cursor: "pointer", transition: "background 0.15s ease" }}
                      onClick={() => handleOpenDrilldown(sp)}
                      className="crm-hover-row"
                    >
                      {/* 1. Sales Person Profile */}
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "12px",
                              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "800",
                              fontSize: "14px",
                              flexShrink: 0
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="fw-bold text-dark" style={{ fontSize: "14px" }}>
                              {sp.name}
                            </div>
                            <div className="d-flex align-items-center gap-2" style={{ fontSize: "11.5px" }}>
                              <span className="badge bg-light text-dark border px-1.5 py-0.5">
                                {sp.sales_code}
                              </span>
                              {sp.phone && (
                                <span className="text-muted">
                                  <FaPhoneAlt size={9} className="me-1" />
                                  {sp.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Leads Created */}
                      <td className="text-center">
                        <span
                          className="badge px-3 py-1.5"
                          style={{
                            backgroundColor: sp.total_leads_created > 0 ? "rgba(139, 92, 246, 0.15)" : "#f1f5f9",
                            color: sp.total_leads_created > 0 ? "#7c3aed" : "#64748b",
                            border: `1px solid ${sp.total_leads_created > 0 ? "rgba(139, 92, 246, 0.3)" : "#e2e8f0"}`,
                            fontSize: "13px",
                            fontWeight: "800"
                          }}
                        >
                          {sp.total_leads_created} Created
                        </span>
                        <div className="text-muted mt-1" style={{ fontSize: "10.5px" }}>
                          Self-sourced
                        </div>
                      </td>

                      {/* 3. Leads Assigned */}
                      <td className="text-center">
                        <span
                          className="badge px-3 py-1.5"
                          style={{
                            backgroundColor: sp.total_leads_assigned > 0 ? "rgba(37, 99, 235, 0.15)" : "#f1f5f9",
                            color: sp.total_leads_assigned > 0 ? "#2563eb" : "#64748b",
                            border: `1px solid ${sp.total_leads_assigned > 0 ? "rgba(37, 99, 235, 0.3)" : "#e2e8f0"}`,
                            fontSize: "13px",
                            fontWeight: "800"
                          }}
                        >
                          {sp.total_leads_assigned} Assigned
                        </span>
                        <div className="text-muted mt-1" style={{ fontSize: "10.5px" }}>
                          Active pipeline
                        </div>
                      </td>

                      {/* 4. Conversion & Progress */}
                      <td>
                        <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: "12px" }}>
                          <span className="fw-bold text-success">
                            {sp.won_leads} Won
                          </span>
                          <span className="text-muted">
                            {sp.active_leads} Active
                          </span>
                          <span className="badge bg-light text-dark border">
                            {sp.conversion_rate}%
                          </span>
                        </div>
                        <div className="progress" style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "10px" }}>
                          <div
                            className="progress-bar bg-success"
                            role="progressbar"
                            style={{
                              width: `${Math.min(parseFloat(sp.conversion_rate) || 0, 100)}%`,
                              borderRadius: "10px"
                            }}
                          />
                        </div>
                      </td>

                      {/* 5. Won Revenue */}
                      <td>
                        <div className="fw-bold text-success" style={{ fontSize: "13.5px" }}>
                          ₹{Number(sp.won_value || 0).toLocaleString("en-IN")}
                        </div>
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          Pipeline: ₹{Number(sp.total_pipeline_value || 0).toLocaleString("en-IN")}
                        </div>
                      </td>

                      {/* 6. Follow-up Activity */}
                      <td>
                        <div className="d-flex align-items-center gap-1 mb-1">
                          <span className="badge bg-success-subtle text-success px-2 py-0.5" style={{ fontSize: "11px", fontWeight: "700" }}>
                            {sp.completed_followups} Done
                          </span>
                          <span className="badge bg-warning-subtle text-warning px-2 py-0.5" style={{ fontSize: "11px", fontWeight: "700" }}>
                            {sp.pending_followups} Due
                          </span>
                        </div>
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          {sp.total_followups} total tasks
                        </div>
                      </td>

                      {/* 7. Action Button */}
                      <td className="text-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1.5"
                          onClick={() => handleOpenDrilldown(sp)}
                          style={{ borderRadius: "8px", fontSize: "12px", fontWeight: "700", padding: "5px 12px" }}
                        >
                          <FaEye size={12} />
                          <span>View Leads</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Detailed Drilldown Modal for Selected Sales Person */}
      <Modal
        isOpen={modalOpen}
        toggle={() => setModalOpen(!modalOpen)}
        size="xl"
        centered
        scrollable
      >
        <ModalHeader
          toggle={() => setModalOpen(false)}
          className="bg-light border-bottom"
          style={{ padding: "16px 24px" }}
        >
          <div className="d-flex align-items-center gap-3">
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                fontSize: "15px"
              }}
            >
              {selectedRep?.name
                ? selectedRep.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "SP"}
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: "17px" }}>
                  {selectedRep?.name} — Lead Performance & Activities
                </h5>
                <span className="badge bg-primary px-2 py-0.5" style={{ fontSize: "11px" }}>
                  {selectedRep?.sales_code}
                </span>
              </div>
              <div className="text-muted mt-0.5" style={{ fontSize: "12px" }}>
                <span>Phone: <strong>{selectedRep?.phone}</strong></span>
                <span className="mx-2">•</span>
                <span>Email: <strong>{selectedRep?.email}</strong></span>
                {selectedRep?.target_amount > 0 && (
                  <>
                    <span className="mx-2">•</span>
                    <span>Target: <strong>₹{Number(selectedRep.target_amount).toLocaleString("en-IN")}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>
        </ModalHeader>

        <ModalBody style={{ backgroundColor: "#f8fafc", padding: "20px 24px" }}>
          {/* Top Quick Stats Strip in Modal */}
          <div className="row g-2 mb-3">
            <div className="col-6 col-md-3">
              <div className="bg-white p-2.5 rounded-3 border text-center">
                <div className="text-muted" style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>
                  Leads Created
                </div>
                <div className="fw-bold text-purple" style={{ fontSize: "18px", color: "#7c3aed" }}>
                  {selectedRep?.total_leads_created || 0}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="bg-white p-2.5 rounded-3 border text-center">
                <div className="text-muted" style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>
                  Leads Assigned
                </div>
                <div className="fw-bold text-primary" style={{ fontSize: "18px" }}>
                  {selectedRep?.total_leads_assigned || 0}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="bg-white p-2.5 rounded-3 border text-center">
                <div className="text-muted" style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>
                  Won Deals
                </div>
                <div className="fw-bold text-success" style={{ fontSize: "18px" }}>
                  {selectedRep?.won_leads || 0}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="bg-white p-2.5 rounded-3 border text-center">
                <div className="text-muted" style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>
                  Won Revenue
                </div>
                <div className="fw-bold text-success" style={{ fontSize: "18px" }}>
                  ₹{Number(selectedRep?.won_value || 0).toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Filter Toolbar */}
          <div className="bg-white p-3 rounded-3 border mb-3">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              {/* Relationship Filter Tabs */}
              <div className="d-flex gap-1 flex-wrap">
                {[
                  { id: "all", label: `All Leads (${repLeads.length})` },
                  {
                    id: "assigned",
                    label: `Assigned (${repLeads.filter((l) => l.relationship === "assigned" || l.relationship === "both").length})`
                  },
                  {
                    id: "created",
                    label: `Created by Rep (${repLeads.filter((l) => l.relationship === "created" || l.relationship === "both").length})`
                  },
                  {
                    id: "won",
                    label: `Won Deals (${repLeads.filter((l) => ["Closed Won", "Completed", "Won"].includes(l.lead_status)).length})`
                  }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`btn btn-sm ${repLeadFilter === tab.id ? "btn-primary fw-bold" : "btn-light border text-secondary"}`}
                    onClick={() => setRepLeadFilter(tab.id)}
                    style={{ borderRadius: "8px", fontSize: "11.5px", padding: "5px 11px" }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Status & Search Controls */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <select
                  className="form-select form-select-sm"
                  style={{ width: "140px", borderRadius: "8px", fontSize: "12px" }}
                  value={repLeadStatus}
                  onChange={(e) => setRepLeadStatus(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Closed Won">Closed Won</option>
                  <option value="Lost">Lost</option>
                </select>

                <div className="input-group input-group-sm" style={{ width: "220px" }}>
                  <span className="input-group-text bg-light border-end-0">
                    <FaSearch size={11} className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search in leads..."
                    value={repLeadSearch}
                    onChange={(e) => setRepLeadSearch(e.target.value)}
                    style={{ borderRadius: "0 8px 8px 0", fontSize: "12px" }}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                  onClick={handleExportRepLeadsCSV}
                  title="Export filtered leads to CSV"
                  style={{ borderRadius: "8px", fontSize: "12px", padding: "5px 10px" }}
                >
                  <FaDownload size={11} />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>

          {/* Leads Listing in Modal */}
          {modalLoading ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
              <div className="text-muted mt-2" style={{ fontSize: "13px" }}>
                Loading assigned and created leads for {selectedRep?.name}...
              </div>
            </div>
          ) : filteredRepLeads.length === 0 ? (
            <div className="bg-white p-5 rounded-3 border text-center">
              <FaLayerGroup size={32} className="text-muted mb-2 opacity-50" />
              <h6 className="fw-bold text-dark mb-1">No Leads Found</h6>
              <p className="text-muted mb-0" style={{ fontSize: "12.5px" }}>
                No lead records matched your current filter selection.
              </p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filteredRepLeads.map((lead) => {
                const isWon = ["Closed Won", "Completed", "Won"].includes(lead.lead_status);
                const isLost = ["Lost", "Cancelled"].includes(lead.lead_status);
                const isExpanded = expandedLeadId === lead.id;

                return (
                  <div
                    key={lead.id}
                    className="bg-white rounded-3 border p-3.5 shadow-sm"
                    style={{
                      borderLeft: `4.5px solid ${isWon ? "#10b981" : isLost ? "#ef4444" : "#3b82f6"}`
                    }}
                  >
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2 mb-2">
                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                          <span className="badge bg-light text-dark border fw-bold" style={{ fontSize: "11px" }}>
                            {lead.lead_code}
                          </span>
                          <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "15px" }}>
                            {lead.lead_title}
                          </h6>

                          {/* Relationship Badge */}
                          {lead.relationship === "both" ? (
                            <span
                              className="badge"
                              style={{
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "#059669",
                                border: "1px solid rgba(16, 185, 129, 0.35)",
                                fontSize: "10.5px"
                              }}
                            >
                              Created & Assigned to Rep
                            </span>
                          ) : lead.relationship === "created" ? (
                            <span
                              className="badge"
                              style={{
                                background: "rgba(139, 92, 246, 0.15)",
                                color: "#7c3aed",
                                border: "1px solid rgba(139, 92, 246, 0.35)",
                                fontSize: "10.5px"
                              }}
                            >
                              Created by Rep (Self-sourced)
                            </span>
                          ) : (
                            <span
                              className="badge"
                              style={{
                                background: "rgba(37, 99, 235, 0.15)",
                                color: "#2563eb",
                                border: "1px solid rgba(37, 99, 235, 0.35)",
                                fontSize: "10.5px"
                              }}
                            >
                              Assigned by Admin
                            </span>
                          )}

                          <span
                            className={`badge ${isWon ? "bg-success" : isLost ? "bg-danger" : "bg-primary"}`}
                            style={{ fontSize: "10.5px" }}
                          >
                            {lead.lead_status}
                          </span>

                          {lead.priority && (
                            <span className="badge bg-light text-secondary border" style={{ fontSize: "10px" }}>
                              {lead.priority} Priority
                            </span>
                          )}
                        </div>

                        {/* Customer Information */}
                        <div className="d-flex align-items-center gap-3 flex-wrap text-muted" style={{ fontSize: "12px" }}>
                          <span>
                            <strong>Customer:</strong> {lead.customer_name || "N/A"}
                            {lead.company_name && ` (${lead.company_name})`}
                          </span>
                          {lead.mobile_number && (
                            <span>
                              <FaPhoneAlt size={10} className="me-1 text-primary" />
                              <a href={`tel:${lead.mobile_number}`} className="text-decoration-none text-dark fw-semibold">
                                {lead.mobile_number}
                              </a>
                            </span>
                          )}
                          {lead.email_address && (
                            <span>
                              <FaEnvelope size={10} className="me-1" />
                              {lead.email_address}
                            </span>
                          )}
                          {(lead.address || lead.city) && (
                            <span>
                              <FaMapMarkerAlt size={10} className="me-1 text-danger" />
                              {[lead.address, lead.city].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Budget & Date */}
                      <div className="text-md-end">
                        <div className="fw-bold text-dark" style={{ fontSize: "15px" }}>
                          {lead.expected_budget > 0
                            ? `₹${Number(lead.expected_budget).toLocaleString("en-IN")}`
                            : "Budget Open"}
                        </div>
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          Assigned: <strong>{lead.assigned_date || lead.created_date}</strong>
                        </div>
                        {lead.interested_product && (
                          <div className="badge bg-light text-dark border mt-1" style={{ fontSize: "10.5px" }}>
                            {lead.interested_product}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Follow-up Details Summary Box */}
                    <div
                      className="p-2.5 rounded-2 mt-2"
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px dashed #cbd5e1",
                        fontSize: "12px"
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                          <FaCalendarCheck size={12} className="text-primary" />
                          <span className="fw-bold text-dark">Follow-up Activity:</span>
                          {lead.latest_followup ? (
                            <span>
                              Next: <strong>{lead.latest_followup.followup_date}</strong> ({lead.latest_followup.followup_time || "10:30"})
                              <span className="badge bg-warning-subtle text-warning border ms-2">
                                {lead.latest_followup.followup_status}
                              </span>
                              {lead.latest_followup.customer_response && (
                                <span className="badge bg-info-subtle text-info border ms-1">
                                  Response: {lead.latest_followup.customer_response}
                                </span>
                              )}
                            </span>
                          ) : lead.followup_date ? (
                            <span>
                              Scheduled on <strong>{lead.followup_date}</strong> ({lead.followup_time || "10:30"}) - {lead.followup_type}
                            </span>
                          ) : (
                            <span className="text-muted">No scheduled follow-up</span>
                          )}
                        </div>

                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-light text-secondary border">
                            {lead.followups_count} Interaction(s)
                          </span>
                          {lead.followups_count > 0 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-link p-0 text-decoration-none shadow-none text-primary fw-bold"
                              style={{ fontSize: "11.5px" }}
                              onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                            >
                              {isExpanded ? "Hide History ▲" : "View Follow-up History ▼"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Notes Preview */}
                      {lead.lead_notes && (
                        <div className="text-muted mt-1" style={{ fontSize: "11.5px" }}>
                          <strong>Notes:</strong> {lead.lead_notes}
                        </div>
                      )}

                      {/* Expandable Follow-up History */}
                      {isExpanded && lead.followups && (
                        <div className="mt-2.5 pt-2 border-top">
                          <div className="fw-bold text-dark mb-1.5" style={{ fontSize: "11.5px" }}>
                            Detailed Follow-up Log:
                          </div>
                          <div className="d-flex flex-column gap-1.5">
                            {lead.followups.map((f) => (
                              <div
                                key={f.id}
                                className="bg-white p-2 rounded border d-flex justify-content-between align-items-center gap-2"
                                style={{ fontSize: "11.5px" }}
                              >
                                <div>
                                  <span className="badge bg-light text-dark border me-2">{f.followup_code}</span>
                                  <strong>{f.followup_type}</strong> on {f.followup_date} at {f.followup_time || "10:30"}
                                  {f.discussion_summary && (
                                    <div className="text-muted mt-0.5" style={{ fontSize: "11px" }}>
                                      "{f.discussion_summary}"
                                    </div>
                                  )}
                                </div>
                                <div className="text-end">
                                  <span
                                    className={`badge ${f.followup_status === "Completed" ? "bg-success" : "bg-warning text-dark"}`}
                                  >
                                    {f.followup_status}
                                  </span>
                                  {f.customer_response && (
                                    <div className="text-info fw-semibold mt-0.5" style={{ fontSize: "10.5px" }}>
                                      {f.customer_response}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ModalBody>

        <ModalFooter className="bg-light border-top d-flex justify-content-between" style={{ padding: "12px 24px" }}>
          <div className="text-muted" style={{ fontSize: "12px" }}>
            Showing <strong>{filteredRepLeads.length}</strong> of <strong>{repLeads.length}</strong> leads for {selectedRep?.name}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setModalOpen(false)}
            style={{ borderRadius: "8px", padding: "6px 18px", fontWeight: "600" }}
          >
            Close
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

