import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserFriends,
  FaFunnelDollar,
  FaCheckCircle,
  FaClock,
  FaPlus,
  FaPhoneAlt,
  FaCalendarAlt,
  FaFilter,
  FaArrowUp,
  FaArrowDown,
  FaStore,
  FaGlobe,
  FaWhatsapp,
  FaComments,
  FaChevronRight,
  FaSyncAlt,
  FaCalendarCheck,
  FaUserTie,
  FaTrophy,
  FaAward,
  FaSpinner,
  FaEye,
  FaSearch,
  FaPrint,
  FaMapMarkerAlt,
  FaExternalLinkAlt,
  FaChartLine,
  FaLayerGroup,
  FaEnvelope,
  FaBuilding,
  FaCheckDouble
} from "react-icons/fa";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "reactstrap";
import api, { getUser, getActiveBranchId } from "../../utils/api";
import { toast } from "react-toastify";

const CrmDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const storedUser = getUser() || JSON.parse(localStorage.getItem("user") || "{}");
  const userName = storedUser.name || storedUser.username || "Administrator";
  const roleLower = String(storedUser.role_name || storedUser.role || "").toLowerCase();
  const isSalesPerson =
    Number(storedUser.role_id) === 7 ||
    roleLower.includes("sales") ||
    roleLower.includes("seller") ||
    roleLower.includes("employee") ||
    roleLower.includes("staff") ||
    storedUser.is_sales_person === true ||
    Boolean(storedUser.sales_person_id);

  const isAdmin =
    !isSalesPerson && (
      roleLower.includes("admin") ||
      roleLower.includes("super admin") ||
      Number(storedUser.role_id) === 1 ||
      Number(storedUser.role_id) === 5 ||
      Number(storedUser.id) === 1
    );

  useEffect(() => {
    if (!isAdmin) {
      navigate("/crm/leads", { replace: true });
    }
  }, [isAdmin, navigate]);

  const userBranches = storedUser.branches || [];
  const activeBranchId = getActiveBranchId();

  const currentBranchName = useMemo(() => {
    if (!userBranches.length) return "Main Store";
    const selected = userBranches.find((b) => Number(b.branch_id || b.id) === Number(activeBranchId));
    return selected ? selected.branch_name : userBranches[0]?.branch_name || "Main Store";
  }, [userBranches, activeBranchId]);

  // Dashboard dynamic KPI data
  const [kpi, setKpi] = useState({
    total_leads: 0,
    leads_this_week: 0,
    leads_this_month: 0,
    active_pipeline_value: 0,
    active_opportunities_count: 0,
    won_value: 0,
    won_count: 0,
    conversion_rate: "0.0",
    today_due_followups: 0,
    high_priority_due_followups: 0,
    pending_total_followups: 0,
    total_followups: 0
  });

  const [pipelineStages, setPipelineStages] = useState([
    { stageNumber: 1, name: "New Leads", count: 0, total_value: 0, color: "#2563eb", badgeBg: "#eff6ff", estCycle: 2 },
    { stageNumber: 2, name: "Contacted", count: 0, total_value: 0, color: "#6366f1", badgeBg: "#e0e7ff", estCycle: 4 },
    { stageNumber: 3, name: "Proposal Sent", count: 0, total_value: 0, color: "#8b5cf6", badgeBg: "#ede9fe", estCycle: 6 },
    { stageNumber: 4, name: "In Negotiation", count: 0, total_value: 0, color: "#f59e0b", badgeBg: "#fef3c7", estCycle: 8 },
    { stageNumber: 5, name: "Closed Won", count: 0, total_value: 0, color: "#10b981", badgeBg: "#d1fae5", estCycle: 10 }
  ]);

  const [leadSources, setLeadSources] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [scheduledFollowups, setScheduledFollowups] = useState([]);
  const [selectedLeadModal, setSelectedLeadModal] = useState(null);

  // Admin Employee Performance & Activity Report State
  const [reportBasis, setReportBasis] = useState("all"); // 'all', 'today', 'this_week', 'this_month', 'custom'
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePerformanceData, setEmployeePerformanceData] = useState([]);
  const [employeeSummary, setEmployeeSummary] = useState(null);
  const [loadingEmployeeReport, setLoadingEmployeeReport] = useState(false);

  // Drilldown Modal State
  const [drilldownEmployee, setDrilldownEmployee] = useState(null);
  const [drilldownData, setDrilldownData] = useState(null);
  const [loadingDrilldown, setLoadingDrilldown] = useState(false);
  const [drilldownActiveTab, setDrilldownActiveTab] = useState("leads"); // 'leads' or 'activities'

  // Currency Formatter
  const formatINR = (val) => {
    const num = Number(val || 0);
    return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  };

  // Format relative time
  const formatRelativeTime = (date) => {
    if (!date) return "Just now";
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 45) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Fetch Dashboard Summary
  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get("/crm/dashboard/summary");
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        if (d.kpi) setKpi(d.kpi);
        if (Array.isArray(d.pipelineStages) && d.pipelineStages.length) {
          setPipelineStages(d.pipelineStages);
        }
        if (Array.isArray(d.leadSources)) setLeadSources(d.leadSources);
        if (Array.isArray(d.recentLeads)) setRecentLeads(d.recentLeads);
        if (Array.isArray(d.scheduledFollowups)) setScheduledFollowups(d.scheduledFollowups);
        if (Array.isArray(d.employeePerformance) && d.employeePerformance.length) {
          setEmployeePerformanceData(d.employeePerformance);
        }
        setLastUpdated(new Date());

        if (isManualRefresh) {
          toast.success("CRM metrics synchronized in real time");
        }
      }
    } catch (err) {
      console.error("Failed to load CRM dashboard summary:", err);
      if (isManualRefresh) {
        toast.error("Could not refresh CRM metrics. Please check network connection.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch Employee Performance Report dynamically by Report Basis
  const fetchEmployeePerformance = useCallback(
    async (basis = reportBasis, start = reportStartDate, end = reportEndDate) => {
      if (!isAdmin) return;
      setLoadingEmployeeReport(true);
      try {
        const res = await api.get("/crm/reports/employee-performance", {
          params: {
            basis,
            startDate: start || undefined,
            endDate: end || undefined
          }
        });
        if (res.data?.success) {
          setEmployeePerformanceData(res.data.employees || []);
          setEmployeeSummary(res.data.summary || null);
        }
      } catch (err) {
        console.error("Failed to load employee performance report:", err);
      } finally {
        setLoadingEmployeeReport(false);
      }
    },
    [isAdmin, reportBasis, reportStartDate, reportEndDate]
  );

  useEffect(() => {
    fetchDashboardData();
    if (isAdmin) {
      fetchEmployeePerformance("all", "", "");
    }
  }, [fetchDashboardData, fetchEmployeePerformance, isAdmin]);

  // Handle Basis Filter Switch
  const handleSelectBasis = (newBasis) => {
    setReportBasis(newBasis);
    if (newBasis !== "custom") {
      setReportStartDate("");
      setReportEndDate("");
      fetchEmployeePerformance(newBasis, "", "");
    }
  };

  const handleApplyCustomDateRange = () => {
    if (!reportStartDate || !reportEndDate) {
      toast.warn("Please select both Start Date and End Date");
      return;
    }
    fetchEmployeePerformance("custom", reportStartDate, reportEndDate);
  };

  // Open Drilldown for a specific employee
  const handleOpenDrilldown = async (emp) => {
    setDrilldownEmployee(emp);
    setDrilldownActiveTab("leads");
    setLoadingDrilldown(true);
    try {
      const res = await api.get("/crm/reports/employee-performance", {
        params: {
          basis: reportBasis,
          startDate: reportStartDate || undefined,
          endDate: reportEndDate || undefined,
          employeeName: emp.name
        }
      });
      if (res.data?.success && res.data.drilldown) {
        setDrilldownData(res.data.drilldown);
      } else {
        setDrilldownData({
          employee_name: emp.name,
          leads: [],
          activities: []
        });
      }
    } catch (err) {
      console.error("Failed to load employee drilldown details:", err);
      toast.error("Could not load employee activity details");
    } finally {
      setLoadingDrilldown(false);
    }
  };

  // Filtered employees by search
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employeePerformanceData;
    const q = employeeSearch.toLowerCase().trim();
    return employeePerformanceData.filter(
      (emp) =>
        (emp.name && emp.name.toLowerCase().includes(q)) ||
        (emp.employee_code && emp.employee_code.toLowerCase().includes(q)) ||
        (emp.phone && emp.phone.includes(q))
    );
  }, [employeePerformanceData, employeeSearch]);

  // Stage Badge Helpers
  const getStageStyle = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("won") || s.includes("completed")) {
      return { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" };
    }
    if (s.includes("lost") || s.includes("cancelled")) {
      return { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" };
    }
    if (s.includes("negotiation") || s.includes("proposal")) {
      return { bg: "#fef3c7", color: "#92400e", border: "#fde68a" };
    }
    if (s.includes("contact")) {
      return { bg: "#ede9fe", color: "#5b21b6", border: "#ddd6fe" };
    }
    return { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" };
  };

  // Followup Icon Helper
  const getFollowupIcon = (type) => {
    const t = String(type || "").toLowerCase();
    if (t.includes("call") || t.includes("phone")) return FaPhoneAlt;
    if (t.includes("whatsapp")) return FaWhatsapp;
    if (t.includes("demo") || t.includes("visit")) return FaMapMarkerAlt;
    if (t.includes("meeting")) return FaComments;
    return FaCalendarAlt;
  };

  return (
    <div className="crm-content-scroll" style={{ padding: "20px 24px 60px" }}>
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE WELCOME HERO CARD */}
      {/* ========================================================================= */}
      <div
        className="mb-4"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
          borderRadius: "16px",
          padding: "24px 28px",
          color: "#ffffff",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.25)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Decorative background glow accents */}
        <div
          style={{
            position: "absolute",
            top: "-40px",
            right: "-40px",
            width: "220px",
            height: "220px",
            background: "radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none"
          }}
        />

        <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3 position-relative">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "3px 10px",
                  borderRadius: "20px"
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 8px #10b981"
                  }}
                />
                Live CRM Operations
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "#94a3b8"
                }}
              >
                • Synced {formatRelativeTime(lastUpdated)}
              </span>
            </div>

            <h1
              className="mb-1 fw-bold"
              style={{
                fontSize: "24px",
                letterSpacing: "-0.5px",
                color: "#ffffff"
              }}
            >
              Welcome back, {userName}
            </h1>
            <p
              className="mb-0"
              style={{
                fontSize: "13.5px",
                color: "#94a3b8",
                maxWidth: "680px",
                lineHeight: "1.5"
              }}
            >
              Live overview of store inquiries, deal conversion pipeline, customer follow-ups, and sales team productivity.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Branch Isolation Chip */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                padding: "7px 14px",
                borderRadius: "10px",
                fontSize: "12.5px",
                color: "#e2e8f0",
                fontWeight: "500",
                backdropFilter: "blur(6px)"
              }}
            >
              <FaStore style={{ color: "#38bdf8" }} />
              <span>{currentBranchName}</span>
            </div>

            {/* Sync Refresh Button */}
            <button
              onClick={() => {
                fetchDashboardData(true);
                if (isAdmin) fetchEmployeePerformance();
              }}
              disabled={refreshing}
              className="btn btn-sm d-inline-flex align-items-center gap-2"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#f8fafc",
                borderRadius: "10px",
                padding: "7px 14px",
                fontSize: "12.5px",
                fontWeight: "600",
                transition: "all 0.2s ease"
              }}
              title="Refresh live metrics"
            >
              <FaSyncAlt className={refreshing ? "fa-spin" : ""} size={12} />
              <span>{refreshing ? "Syncing..." : "Sync"}</span>
            </button>

            {/* New Lead Action Button */}
            <button
              onClick={() => navigate("/crm/leads/new")}
              className="btn btn-sm d-inline-flex align-items-center gap-2"
              style={{
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "700",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
                transition: "all 0.2s ease"
              }}
            >
              <FaPlus size={11} />
              <span>New Lead</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. UNIFIED TOP METRIC KPI CARDS STRIP */}
      {/* ========================================================================= */}
      <div
        className="row g-3 mb-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px"
        }}
      >
        {/* KPI 1: Total Leads */}
        <div
          onClick={() => navigate("/crm/leads")}
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            position: "relative",
            overflow: "hidden"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 8px 20px rgba(37, 99, 235, 0.12)";
            e.currentTarget.style.borderColor = "#93c5fd";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(15, 23, 42, 0.04)";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "#2563eb"
            }}
          />
          <div className="d-flex align-items-center justify-content-between mb-3">
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: "700",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              Total Leads
            </span>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px"
              }}
            >
              <FaUserFriends />
            </div>
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "800",
              color: "#0f172a",
              lineHeight: "1.1",
              marginBottom: "10px",
              letterSpacing: "-0.5px"
            }}
          >
            {loading ? "..." : kpi.total_leads}
          </div>
          <div className="d-flex align-items-center justify-content-between" style={{ fontSize: "12px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                color: "#16a34a",
                fontWeight: "700",
                background: "#f0fdf4",
                padding: "2px 6px",
                borderRadius: "6px"
              }}
            >
              <FaArrowUp size={9} /> +{kpi.leads_this_week} this wk
            </span>
            <span style={{ color: "#64748b" }}>{kpi.leads_this_month} this mo</span>
          </div>
        </div>

        {/* KPI 2: Pipeline Value */}
        <div
          onClick={() => navigate("/crm/leads")}
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            position: "relative",
            overflow: "hidden"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 8px 20px rgba(139, 92, 246, 0.12)";
            e.currentTarget.style.borderColor = "#c4b5fd";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(15, 23, 42, 0.04)";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "#8b5cf6"
            }}
          />
          <div className="d-flex align-items-center justify-content-between mb-3">
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: "700",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              Pipeline Value
            </span>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#f5f3ff",
                color: "#8b5cf6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px"
              }}
            >
              <FaFunnelDollar />
            </div>
          </div>
          <div
            style={{
              fontSize: "26px",
              fontWeight: "800",
              color: "#0f172a",
              lineHeight: "1.1",
              marginBottom: "10px",
              letterSpacing: "-0.5px"
            }}
          >
            {loading ? "..." : formatINR(kpi.active_pipeline_value)}
          </div>
          <div className="d-flex align-items-center justify-content-between" style={{ fontSize: "12px" }}>
            <span
              style={{
                color: "#6d28d9",
                background: "#f5f3ff",
                padding: "2px 8px",
                borderRadius: "6px",
                fontWeight: "600"
              }}
            >
              {kpi.active_opportunities_count} active inquiries
            </span>
            <span style={{ color: "#64748b" }}>In negotiation</span>
          </div>
        </div>

        {/* KPI 3: Closed Won */}
        <div
          onClick={() => navigate("/crm/completed-leads")}
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            position: "relative",
            overflow: "hidden"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 8px 20px rgba(16, 185, 129, 0.12)";
            e.currentTarget.style.borderColor = "#6ee7b7";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(15, 23, 42, 0.04)";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "#10b981"
            }}
          />
          <div className="d-flex align-items-center justify-content-between mb-3">
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: "700",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              Closed Won Deals
            </span>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#f0fdf4",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px"
              }}
            >
              <FaCheckCircle />
            </div>
          </div>
          <div
            style={{
              fontSize: "26px",
              fontWeight: "800",
              color: "#059669",
              lineHeight: "1.1",
              marginBottom: "10px",
              letterSpacing: "-0.5px"
            }}
          >
            {loading ? "..." : formatINR(kpi.won_value)}
          </div>
          <div className="d-flex align-items-center justify-content-between" style={{ fontSize: "12px" }}>
            <span
              style={{
                color: "#065f46",
                background: "#d1fae5",
                padding: "2px 8px",
                borderRadius: "6px",
                fontWeight: "700"
              }}
            >
              {kpi.won_count} won
            </span>
            <span style={{ color: "#047857", fontWeight: "600" }}>{kpi.conversion_rate}% conv. rate</span>
          </div>
        </div>

        {/* KPI 4: Today's Follow-ups */}
        <div
          onClick={() => navigate("/crm/followups")}
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            position: "relative",
            overflow: "hidden"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 8px 20px rgba(245, 158, 11, 0.12)";
            e.currentTarget.style.borderColor = "#fcd34d";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(15, 23, 42, 0.04)";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: kpi.today_due_followups > 0 ? "#f59e0b" : "#10b981"
            }}
          />
          <div className="d-flex align-items-center justify-content-between mb-3">
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: "700",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              Follow-ups Due Today
            </span>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: kpi.today_due_followups > 0 ? "#fffbeb" : "#f0fdf4",
                color: kpi.today_due_followups > 0 ? "#d97706" : "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px"
              }}
            >
              <FaClock />
            </div>
          </div>
          <div
            style={{
              fontSize: "26px",
              fontWeight: "800",
              color: kpi.today_due_followups > 0 ? "#b45309" : "#0f172a",
              lineHeight: "1.1",
              marginBottom: "10px",
              letterSpacing: "-0.5px"
            }}
          >
            {loading ? "..." : `${kpi.today_due_followups} Due`}
          </div>
          <div className="d-flex align-items-center justify-content-between" style={{ fontSize: "12px" }}>
            <span
              style={{
                color: kpi.today_due_followups > 0 ? "#b45309" : "#065f46",
                background: kpi.today_due_followups > 0 ? "#fef3c7" : "#d1fae5",
                padding: "2px 8px",
                borderRadius: "6px",
                fontWeight: "700"
              }}
            >
              {kpi.today_due_followups > 0 ? "Action Required" : "All Caught Up"}
            </span>
            <span style={{ color: "#64748b" }}>
              {kpi.high_priority_due_followups > 0 ? `${kpi.high_priority_due_followups} urgent` : "0 urgent"}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MIDDLE GRID: PIPELINE FUNNEL & LEAD SOURCES */}
      {/* ========================================================================= */}
      <div className="row g-3 mb-4">
        {/* Left: Pipeline Funnel */}
        <div className="col-12 col-lg-7">
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
              height: "100%",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
              <div>
                <h3
                  className="mb-1 fw-bold text-dark d-flex align-items-center gap-2"
                  style={{ fontSize: "16px" }}
                >
                  <FaFunnelDollar style={{ color: "#2563eb" }} />
                  <span>Sales Pipeline Funnel</span>
                </h3>
                <p className="text-muted mb-0" style={{ fontSize: "12.5px" }}>
                  Active deal progression across milestone stages
                </p>
              </div>

              <button
                onClick={() => navigate("/crm/leads")}
                className="btn btn-sm btn-link text-decoration-none fw-semibold d-inline-flex align-items-center gap-1 p-0"
                style={{ color: "#2563eb", fontSize: "12.5px" }}
              >
                <span>View All Leads</span>
                <FaChevronRight size={10} />
              </button>
            </div>

            <div className="d-flex flex-column gap-3 my-auto">
              {pipelineStages.map((stage) => {
                const count = stage.count || 0;
                const maxCount = Math.max(...pipelineStages.map((s) => s.count || 0), 1);
                const percentage = Math.round((count / maxCount) * 100);

                return (
                  <div key={stage.stageNumber}>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <div className="d-flex align-items-center gap-2">
                        <span
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: stage.color,
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          {stage.stageNumber}
                        </span>
                        <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                          {stage.name}
                        </span>
                        <span className="text-muted" style={{ fontSize: "11.5px" }}>
                          (avg ~{stage.estCycle || 3}d)
                        </span>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                          {formatINR(stage.total_value)}
                        </span>
                        <span
                          style={{
                            background: stage.badgeBg || "#f1f5f9",
                            color: stage.color,
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            minWidth: "60px",
                            textAlign: "center"
                          }}
                        >
                          {count} leads
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        height: "7px",
                        background: "#f1f5f9",
                        borderRadius: "10px",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(percentage, 4)}%`,
                          height: "100%",
                          background: stage.color,
                          borderRadius: "10px",
                          transition: "width 0.4s ease"
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Lead Sources Distribution */}
        <div className="col-12 col-lg-5">
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
              height: "100%",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
              <div>
                <h3
                  className="mb-1 fw-bold text-dark d-flex align-items-center gap-2"
                  style={{ fontSize: "16px" }}
                >
                  <FaGlobe style={{ color: "#0ea5e9" }} />
                  <span>Lead Acquisition Sources</span>
                </h3>
                <p className="text-muted mb-0" style={{ fontSize: "12.5px" }}>
                  Customer acquisition channels and deal value
                </p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5 my-auto">
                <FaSpinner className="fa-spin text-primary" size={24} />
                <div className="mt-2 text-muted" style={{ fontSize: "13px" }}>Loading lead sources...</div>
              </div>
            ) : leadSources.length === 0 ? (
              <div className="text-center py-5 text-muted my-auto" style={{ fontSize: "13px" }}>
                <FaGlobe size={32} className="text-muted mb-2 opacity-50" />
                <div>No lead source records captured yet.</div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3 my-auto">
                {leadSources.map((src, idx) => {
                  const colors = ["#2563eb", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];
                  const color = colors[idx % colors.length];

                  return (
                    <div key={idx}>
                      <div className="d-flex align-items-center justify-content-between mb-1" style={{ fontSize: "13px" }}>
                        <div className="d-flex align-items-center gap-2">
                          <span
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background: color
                            }}
                          />
                          <span className="fw-semibold text-dark">{src.source}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-dark">{src.count}</span>
                          <span className="text-muted" style={{ fontSize: "11px" }}>
                            ({src.share}%)
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              background: "#f8fafc",
                              color: "#334155",
                              border: "1px solid #e2e8f0",
                              padding: "2px 7px",
                              borderRadius: "6px",
                              fontWeight: "600"
                            }}
                          >
                            {formatINR(src.value)}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          height: "6px",
                          background: "#f1f5f9",
                          borderRadius: "10px",
                          overflow: "hidden"
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(5, src.share))}%`,
                            height: "100%",
                            background: color,
                            borderRadius: "10px",
                            transition: "width 0.4s ease"
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

      {/* ========================================================================= */}
      {/* 4. BOTTOM GRID: RECENT LEADS & SCHEDULED FOLLOW-UPS */}
      {/* ========================================================================= */}
      <div className="row g-3 mb-4">
        {/* Left: Recent Leads */}
        <div className="col-12 col-xl-7">
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)"
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
              <div>
                <h3
                  className="mb-1 fw-bold text-dark d-flex align-items-center gap-2"
                  style={{ fontSize: "16px" }}
                >
                  <FaUserFriends style={{ color: "#2563eb" }} />
                  <span>Recent Inquiries</span>
                </h3>
                <p className="text-muted mb-0" style={{ fontSize: "12.5px" }}>
                  Newly logged leads, walk-ins, and product inquiries
                </p>
              </div>

              <button
                onClick={() => navigate("/crm/leads")}
                className="btn btn-sm btn-link text-decoration-none fw-semibold d-inline-flex align-items-center gap-1 p-0"
                style={{ color: "#2563eb", fontSize: "12.5px" }}
              >
                <span>View All ({kpi.total_leads})</span>
                <FaChevronRight size={10} />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <FaSpinner className="fa-spin text-primary" size={24} />
                <div className="mt-2 text-muted" style={{ fontSize: "13px" }}>Loading inquiries...</div>
              </div>
            ) : recentLeads.length === 0 ? (
              <div className="text-center py-5 border rounded bg-light">
                <FaUserFriends size={34} color="#94a3b8" />
                <h6 className="mt-3 font-weight-bold text-dark">No Inquiries Found</h6>
                <p className="text-muted mb-3" style={{ fontSize: "13px" }}>
                  Add your first lead inquiry to start managing your pipeline.
                </p>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => navigate("/crm/leads/new")}
                  style={{ borderRadius: "8px", fontWeight: "600" }}
                >
                  <FaPlus size={11} className="me-1" /> Add First Lead
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle table-hover mb-0" style={{ minWidth: "550px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                        Lead Details
                      </th>
                      <th style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                        Product Inquiry
                      </th>
                      <th style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                        Est. Budget
                      </th>
                      <th style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                        Stage
                      </th>
                      <th style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                        Assigned Rep
                      </th>
                      <th style={{ textAlign: "right", fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLeads.map((lead) => {
                      const fullName =
                        `${lead.first_name || ""} ${lead.last_name || ""}`.trim() ||
                        lead.lead_title ||
                        "Unnamed Lead";
                      const stageStyle = getStageStyle(lead.lead_status);
                      const initials = fullName
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      return (
                        <tr key={lead.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "8px",
                                  background: "#eff6ff",
                                  color: "#2563eb",
                                  fontWeight: "700",
                                  fontSize: "11.5px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                                  {fullName}
                                </div>
                                <div className="d-flex align-items-center gap-1 mt-0.5">
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      background: "#f1f5f9",
                                      color: "#475569",
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                      fontWeight: "600"
                                    }}
                                  >
                                    {lead.lead_code || `LD-${lead.id}`}
                                  </span>
                                  {lead.mobile_number && (
                                    <span className="text-muted" style={{ fontSize: "11px" }}>
                                      {lead.mobile_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: "12.5px", color: "#334155", fontWeight: "500" }}>
                              {lead.interested_product || lead.lead_title || "General Inquiry"}
                            </span>
                          </td>
                          <td>
                            <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                              {formatINR(lead.expected_budget)}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                background: stageStyle.bg,
                                color: stageStyle.color,
                                border: `1px solid ${stageStyle.border}`,
                                padding: "3px 8px",
                                borderRadius: "12px",
                                display: "inline-block"
                              }}
                            >
                              {lead.lead_status || "New"}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: "12px", color: "#475569", fontWeight: "500" }}>
                              {lead.assigned_to || "Unassigned"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              onClick={() => setSelectedLeadModal(lead)}
                              className="btn btn-sm btn-light border py-1 px-2 d-inline-flex align-items-center gap-1"
                              style={{ fontSize: "11.5px", borderRadius: "6px", fontWeight: "600" }}
                              title="View inquiry details"
                            >
                              <FaEye size={10} />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Scheduled Follow-ups Timeline */}
        <div className="col-12 col-xl-5">
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
              height: "100%",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
              <div>
                <h3
                  className="mb-1 fw-bold text-dark d-flex align-items-center gap-2"
                  style={{ fontSize: "16px" }}
                >
                  <FaClock style={{ color: "#f59e0b" }} />
                  <span>Scheduled Follow-ups</span>
                </h3>
                <p className="text-muted mb-0" style={{ fontSize: "12.5px" }}>
                  Customer call-backs, showroom demos & reminders
                </p>
              </div>

              <button
                onClick={() => navigate("/crm/followups")}
                className="btn btn-sm btn-link text-decoration-none fw-semibold d-inline-flex align-items-center gap-1 p-0"
                style={{ color: "#2563eb", fontSize: "12.5px" }}
              >
                <span>All Follow-ups</span>
                <FaChevronRight size={10} />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-5 my-auto">
                <FaSpinner className="fa-spin text-primary" size={24} />
                <div className="mt-2 text-muted" style={{ fontSize: "13px" }}>Loading follow-ups...</div>
              </div>
            ) : scheduledFollowups.length === 0 ? (
              <div className="text-center py-5 border rounded bg-light my-auto">
                <FaCalendarCheck size={32} color="#94a3b8" />
                <h6 className="mt-3 font-weight-bold text-dark">No Follow-ups Due</h6>
                <p className="text-muted mb-3" style={{ fontSize: "13px" }}>
                  All scheduled communication tasks are completed.
                </p>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => navigate("/crm/followups")}
                  style={{ borderRadius: "8px", fontWeight: "600" }}
                >
                  <FaPlus size={11} className="me-1" /> Schedule Follow-up
                </button>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2 overflow-auto" style={{ maxHeight: "420px" }}>
                {scheduledFollowups.map((item, index) => {
                  const ItemIcon = getFollowupIcon(item.followup_type);
                  const isPending = item.followup_status === "Pending";
                  const displayTime = item.followup_time || "10:30 AM";
                  const displayDate = item.followup_date || "Today";

                  return (
                    <div
                      key={item.id || index}
                      onClick={() => navigate("/crm/followups")}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "10px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#eff6ff";
                        e.currentTarget.style.borderColor = "#bfdbfe";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              color: "#1e293b",
                              padding: "2px 7px",
                              borderRadius: "6px"
                            }}
                          >
                            <ItemIcon size={10} className="me-1 text-primary" />
                            {item.followup_type || "Call"}
                          </span>
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontWeight: "700",
                              background: isPending ? "#fffbeb" : "#ecfdf5",
                              color: isPending ? "#d97706" : "#059669",
                              border: isPending ? "1px solid #fde68a" : "1px solid #a7f3d0",
                              padding: "2px 6px",
                              borderRadius: "6px"
                            }}
                          >
                            {item.followup_status || "Pending"}
                          </span>
                        </div>

                        <span className="text-muted" style={{ fontSize: "11px", fontWeight: "600" }}>
                          {displayDate} • {displayTime}
                        </span>
                      </div>

                      <div className="fw-bold text-dark mb-0.5" style={{ fontSize: "13px" }}>
                        {item.followup_title || `Follow up with ${item.entity_name || "Customer"}`}
                      </div>

                      <div className="text-muted d-flex align-items-center gap-2 flex-wrap" style={{ fontSize: "11.5px" }}>
                        {item.entity_name && <span>Customer: <strong>{item.entity_name}</strong></span>}
                        {item.mobile_number && <span>• {item.mobile_number}</span>}
                        {item.assigned_to && <span>• Rep: {item.assigned_to}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. ADMIN EXCLUSIVE: SALES TEAM PERFORMANCE SPOTLIGHT */}
      {/* ========================================================================= */}
      {isAdmin && (
        <div
          className="mt-4"
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "24px 28px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.06)"
          }}
        >
          {/* Section Header */}
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 pb-3 mb-3 border-bottom">
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px"
                }}
              >
                <FaTrophy style={{ color: "#f59e0b" }} />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h3 className="mb-0 fw-bold text-dark" style={{ fontSize: "18px" }}>
                    Sales Team Performance Spotlight
                  </h3>
                  <span
                    style={{
                      fontSize: "10px",
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "#d97706",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      padding: "2px 7px",
                      borderRadius: "6px",
                      fontWeight: "700"
                    }}
                  >
                    Admin Insight
                  </span>
                </div>
                <p className="text-muted mb-0" style={{ fontSize: "12.5px" }}>
                  Staff deal conversion, lead velocity, and follow-up communication tracking.
                </p>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              {/* Direct link to dedicated full report */}
              <button
                onClick={() => navigate("/crm/reports/performance")}
                className="btn btn-sm d-inline-flex align-items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #1e293b, #0f172a)",
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: "600",
                  padding: "6px 14px",
                  border: "none",
                  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.15)"
                }}
              >
                <span>View Full Performance Report</span>
                <FaChevronRight size={10} />
              </button>

              <button
                onClick={() => fetchEmployeePerformance(reportBasis, reportStartDate, reportEndDate)}
                disabled={loadingEmployeeReport}
                className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1"
                style={{ borderRadius: "8px", fontSize: "12px", padding: "6px 12px" }}
                title="Refresh metrics"
              >
                <FaSyncAlt size={11} className={loadingEmployeeReport ? "fa-spin" : ""} />
                <span className="d-none d-sm-inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Report Basis Filter Toolbar */}
          <div
            className="p-3 mb-3 rounded"
            style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
          >
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              {/* Basis Buttons */}
              <div className="d-flex align-items-center gap-1 flex-wrap">
                <span
                  className="text-muted fw-bold me-2"
                  style={{ fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}
                >
                  Period:
                </span>

                {[
                  { id: "all", label: "All Time" },
                  { id: "today", label: "★ Today" },
                  { id: "this_week", label: "This Week" },
                  { id: "this_month", label: "This Month" },
                  { id: "custom", label: "Custom Range" }
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBasis(b.id)}
                    className="btn btn-sm"
                    style={{
                      borderRadius: "20px",
                      fontSize: "12px",
                      padding: "4px 12px",
                      fontWeight: reportBasis === b.id ? "700" : "500",
                      background: reportBasis === b.id ? "#2563eb" : "#ffffff",
                      color: reportBasis === b.id ? "#ffffff" : "#475569",
                      border: reportBasis === b.id ? "1px solid #2563eb" : "1px solid #cbd5e1",
                      boxShadow: reportBasis === b.id ? "0 2px 6px rgba(37, 99, 235, 0.25)" : "none"
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              {/* Employee Search Box */}
              <div style={{ minWidth: "220px" }}>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0">
                    <FaSearch size={11} className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search sales rep..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    style={{ fontSize: "12px" }}
                  />
                  {employeeSearch && (
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => setEmployeeSearch("")}
                      style={{ fontSize: "10px" }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Date Range Picker Row (conditional) */}
            {reportBasis === "custom" && (
              <div className="d-flex align-items-center gap-2 flex-wrap mt-3 pt-3 border-top">
                <span className="text-muted fw-semibold" style={{ fontSize: "12px" }}>Select Date Window:</span>
                <div className="d-flex align-items-center gap-1">
                  <label className="text-muted mb-0 me-1" style={{ fontSize: "11.5px" }}>From:</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    style={{ borderRadius: "8px", fontSize: "12px", width: "150px" }}
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                  />
                </div>
                <div className="d-flex align-items-center gap-1 ms-sm-2">
                  <label className="text-muted mb-0 me-1" style={{ fontSize: "11.5px" }}>To:</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    style={{ borderRadius: "8px", fontSize: "12px", width: "150px" }}
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-sm btn-primary ms-sm-2"
                  onClick={handleApplyCustomDateRange}
                  style={{ borderRadius: "8px", fontSize: "12px", padding: "4px 14px" }}
                >
                  Apply Window
                </button>
              </div>
            )}
          </div>

          {/* Team Aggregated KPI Summary Counters Strip */}
          {employeeSummary && (
            <div className="row g-2 mb-3">
              <div className="col-6 col-md-3 col-lg-2">
                <div className="p-2 px-3 bg-light rounded border text-center">
                  <div className="text-muted fw-semibold" style={{ fontSize: "10.5px", textTransform: "uppercase" }}>
                    Sales Reps
                  </div>
                  <div className="fw-bold text-dark" style={{ fontSize: "18px" }}>
                    {employeeSummary.total_employees}
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3 col-lg-2">
                <div className="p-2 px-3 bg-light rounded border text-center">
                  <div className="text-muted fw-semibold" style={{ fontSize: "10.5px", textTransform: "uppercase" }}>
                    Total Leads
                  </div>
                  <div className="fw-bold text-primary" style={{ fontSize: "18px" }}>
                    {employeeSummary.total_leads}
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3 col-lg-3">
                <div className="p-2 px-3 bg-light rounded border text-center" style={{ backgroundColor: "#f0fdf4" }}>
                  <div className="text-muted fw-semibold" style={{ fontSize: "10.5px", textTransform: "uppercase" }}>
                    Completed / Won
                  </div>
                  <div className="fw-bold text-success" style={{ fontSize: "18px" }}>
                    {employeeSummary.total_completed_leads}{" "}
                    <span style={{ fontSize: "12px", color: "#15803d" }}>
                      ({employeeSummary.overall_completion_rate}%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3 col-lg-2">
                <div className="p-2 px-3 bg-light rounded border text-center">
                  <div className="text-muted fw-semibold" style={{ fontSize: "10.5px", textTransform: "uppercase" }}>
                    Won Revenue
                  </div>
                  <div className="fw-bold text-dark" style={{ fontSize: "16px" }}>
                    {formatINR(employeeSummary.total_won_value)}
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <div className="p-2 px-3 bg-light rounded border text-center">
                  <div className="text-muted fw-semibold" style={{ fontSize: "10.5px", textTransform: "uppercase" }}>
                    Team Activities
                  </div>
                  <div className="fw-bold text-dark" style={{ fontSize: "14px" }}>
                    <span>{employeeSummary.total_activities} Total</span> •{" "}
                    <span className="text-success">{employeeSummary.completed_activities} Done</span> •{" "}
                    <span className="text-warning">{employeeSummary.pending_activities} Due</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Performance Table */}
          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0" style={{ minWidth: "750px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ width: "35px", fontSize: "11px", color: "#64748b" }}>#</th>
                  <th style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                    Sales Representative
                  </th>
                  <th className="text-center" style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                    Assigned
                  </th>
                  <th className="text-center" style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                    Won Deals
                  </th>
                  <th className="text-center" style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                    Active
                  </th>
                  <th style={{ minWidth: "130px", fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                    Conversion Rate
                  </th>
                  <th className="text-end" style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                    Won Revenue
                  </th>
                  <th className="text-center" style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                    Activities
                  </th>
                  <th style={{ textAlign: "right", fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingEmployeeReport ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5">
                      <FaSpinner className="fa-spin text-primary me-2" />
                      <span className="text-muted" style={{ fontSize: "13px" }}>Loading performance spotlight...</span>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5">
                      <FaUserTie size={28} className="text-muted mb-2 opacity-50" />
                      <div className="fw-semibold text-dark">No Sales Staff Records</div>
                      <p className="text-muted mb-0" style={{ fontSize: "12px" }}>
                        {employeeSearch ? "No matches found." : "No sales persons configured."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp, idx) => {
                    const initials = (emp.name || "SP")
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    const rateNum = parseFloat(emp.completion_rate) || 0;

                    return (
                      <tr key={emp.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td className="text-muted" style={{ fontSize: "12px" }}>
                          {idx + 1}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #1e293b, #334155)",
                                color: "#f8fafc",
                                fontWeight: "700",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyCenter: "center"
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                                {emp.name}
                              </div>
                              <div className="d-flex align-items-center gap-2 mt-0.5">
                                <span
                                  style={{
                                    fontSize: "10px",
                                    background: "#f1f5f9",
                                    color: "#475569",
                                    padding: "1px 5px",
                                    borderRadius: "4px",
                                    fontWeight: "600"
                                  }}
                                >
                                  {emp.employee_code}
                                </span>
                                {emp.phone && emp.phone !== "—" && (
                                  <span className="text-muted" style={{ fontSize: "11px" }}>
                                    {emp.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="text-center">
                          <span
                            className="badge bg-light text-dark border px-2 py-1"
                            style={{ fontSize: "12.5px", fontWeight: "700" }}
                          >
                            {emp.total_leads}
                          </span>
                        </td>

                        <td className="text-center">
                          <span
                            style={{
                              backgroundColor: emp.won_leads > 0 ? "#ecfdf5" : "#f1f5f9",
                              color: emp.won_leads > 0 ? "#059669" : "#64748b",
                              border: emp.won_leads > 0 ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
                              fontSize: "11.5px",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontWeight: "700",
                              display: "inline-block"
                            }}
                          >
                            {emp.won_leads} Won
                          </span>
                        </td>

                        <td className="text-center">
                          <span
                            style={{
                              backgroundColor: "#eff6ff",
                              color: "#2563eb",
                              fontSize: "11.5px",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontWeight: "600",
                              display: "inline-block"
                            }}
                          >
                            {emp.active_leads} Open
                          </span>
                        </td>

                        <td>
                          <div className="d-flex align-items-center justify-content-between mb-1" style={{ fontSize: "11.5px" }}>
                            <span className="fw-bold text-dark">{emp.completion_rate}%</span>
                            <span className="text-muted" style={{ fontSize: "10.5px" }}>
                              {emp.won_leads}/{emp.total_leads}
                            </span>
                          </div>
                          <div
                            style={{
                              height: "6px",
                              background: "#f1f5f9",
                              borderRadius: "10px",
                              overflow: "hidden"
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(0, rateNum))}%`,
                                height: "100%",
                                background: rateNum >= 50 ? "#10b981" : rateNum > 0 ? "#f59e0b" : "#cbd5e1",
                                borderRadius: "10px",
                                transition: "width 0.4s ease"
                              }}
                            />
                          </div>
                        </td>

                        <td className="text-end">
                          <div className="fw-bold text-success" style={{ fontSize: "13px" }}>
                            {formatINR(emp.won_value)}
                          </div>
                          <div className="text-muted" style={{ fontSize: "10.5px" }}>
                            Pipe: {formatINR(emp.total_pipeline_value)}
                          </div>
                        </td>

                        <td className="text-center">
                          <span className="fw-bold text-dark" style={{ fontSize: "12px" }}>
                            {emp.total_activities}
                          </span>
                          <div className="d-flex align-items-center justify-content-center gap-1 mt-0.5" style={{ fontSize: "10px" }}>
                            <span className="text-success">{emp.completed_activities}✓</span>
                            <span className="text-muted">•</span>
                            <span className="text-warning">{emp.pending_activities}⏳</span>
                          </div>
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <button
                            onClick={() => handleOpenDrilldown(emp)}
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                            style={{ borderRadius: "6px", fontSize: "11.5px", padding: "3px 9px", fontWeight: "600" }}
                            title="Inspect staff activities & leads"
                          >
                            <FaEye size={10} />
                            <span>Details</span>
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
      )}

      {/* ========================================================================= */}
      {/* 6. EMPLOYEE ACTIVITY LOG & LEADS DRILLDOWN MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!drilldownEmployee}
        toggle={() => setDrilldownEmployee(null)}
        centered
        size="xl"
      >
        <ModalHeader toggle={() => setDrilldownEmployee(null)} className="border-bottom">
          <div className="d-flex align-items-center gap-2">
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#fff",
                fontWeight: "700",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <FaUserTie size={14} />
            </div>
            <div>
              <div className="fw-bold text-dark" style={{ fontSize: "16px" }}>
                Staff Performance Record: {drilldownEmployee?.name}
              </div>
              <div className="text-muted" style={{ fontSize: "12px" }}>
                Code: <strong>{drilldownEmployee?.employee_code}</strong> • Phone: {drilldownEmployee?.phone || "—"} • Basis:{" "}
                <span className="badge bg-light text-primary border">
                  {reportBasis === "all" ? "All Time" : reportBasis === "today" ? "Today" : reportBasis === "this_week" ? "This Week" : reportBasis === "this_month" ? "This Month" : "Custom Window"}
                </span>
              </div>
            </div>
          </div>
        </ModalHeader>
        <ModalBody className="p-3 p-md-4">
          {loadingDrilldown ? (
            <div className="text-center py-5">
              <FaSpinner className="fa-spin text-primary me-2" size={24} />
              <div className="mt-2 text-muted" style={{ fontSize: "13px" }}>Loading employee activity details...</div>
            </div>
          ) : (
            <div>
              {/* Tab Selector */}
              <div className="d-flex align-items-center gap-2 mb-3 border-bottom pb-2">
                <button
                  type="button"
                  className={`btn btn-sm ${
                    drilldownActiveTab === "leads"
                      ? "btn-primary fw-bold text-white shadow-sm"
                      : "btn-light border text-muted"
                  }`}
                  onClick={() => setDrilldownActiveTab("leads")}
                  style={{ borderRadius: "8px", fontSize: "12.5px" }}
                >
                  📋 Assigned Leads ({drilldownData?.leads?.length || 0})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${
                    drilldownActiveTab === "activities"
                      ? "btn-primary fw-bold text-white shadow-sm"
                      : "btn-light border text-muted"
                  }`}
                  onClick={() => setDrilldownActiveTab("activities")}
                  style={{ borderRadius: "8px", fontSize: "12.5px" }}
                >
                  📞 Follow-up Activities ({drilldownData?.activities?.length || 0})
                </button>
              </div>

              {/* TAB 1: Assigned Leads */}
              {drilldownActiveTab === "leads" && (
                <div className="table-responsive" style={{ maxHeight: "420px" }}>
                  <table className="table align-middle table-sm mb-0">
                    <thead className="bg-light sticky-top">
                      <tr>
                        <th>Lead ID & Title</th>
                        <th>Customer Name</th>
                        <th>Phone</th>
                        <th>Product Inquiry</th>
                        <th className="text-end">Budget</th>
                        <th>Status</th>
                        <th>Created Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!drilldownData?.leads || drilldownData.leads.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-4 text-muted" style={{ fontSize: "13px" }}>
                            No leads assigned to this staff member in the selected report period.
                          </td>
                        </tr>
                      ) : (
                        drilldownData.leads.map((ld) => {
                          const fullName = `${ld.first_name || ""} ${ld.last_name || ""}`.trim() || ld.lead_title;
                          const stageStyle = getStageStyle(ld.lead_status);

                          return (
                            <tr key={ld.id}>
                              <td>
                                <div className="fw-bold text-dark">{ld.lead_title}</div>
                                <span className="badge bg-light text-dark border" style={{ fontSize: "10px" }}>
                                  {ld.lead_code || `LD-${ld.id}`}
                                </span>
                              </td>
                              <td className="fw-medium text-dark">{fullName}</td>
                              <td>{ld.mobile_number || "—"}</td>
                              <td>{ld.interested_product || "General"}</td>
                              <td className="text-end fw-bold text-dark">{formatINR(ld.expected_budget)}</td>
                              <td>
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: "700",
                                    background: stageStyle.bg,
                                    color: stageStyle.color,
                                    border: `1px solid ${stageStyle.border}`,
                                    padding: "2px 7px",
                                    borderRadius: "10px"
                                  }}
                                >
                                  {ld.lead_status || "New"}
                                </span>
                              </td>
                              <td className="text-muted" style={{ fontSize: "11.5px" }}>{ld.created_at || "—"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: Follow-up Activities */}
              {drilldownActiveTab === "activities" && (
                <div className="table-responsive" style={{ maxHeight: "420px" }}>
                  <table className="table align-middle table-sm mb-0">
                    <thead className="bg-light sticky-top">
                      <tr>
                        <th>Activity Title</th>
                        <th>Customer / Lead</th>
                        <th>Activity Type</th>
                        <th>Scheduled Date & Time</th>
                        <th>Status</th>
                        <th>Discussion Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!drilldownData?.activities || drilldownData.activities.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-muted" style={{ fontSize: "13px" }}>
                            No follow-up communication activities recorded in this period.
                          </td>
                        </tr>
                      ) : (
                        drilldownData.activities.map((act) => {
                          const isDone = act.followup_status === "Completed";
                          const ActIcon = getFollowupIcon(act.followup_type);

                          return (
                            <tr key={act.id}>
                              <td>
                                <div className="fw-bold text-dark">{act.followup_title}</div>
                                <span className="badge bg-light text-dark border" style={{ fontSize: "10px" }}>
                                  {act.followup_code || `FLW-${act.id}`}
                                </span>
                              </td>
                              <td>
                                <div className="fw-medium text-dark">{act.entity_name || "Customer"}</div>
                                {act.mobile_number && (
                                  <div className="text-muted" style={{ fontSize: "11px" }}>{act.mobile_number}</div>
                                )}
                              </td>
                              <td>
                                <span
                                  className="badge d-inline-flex align-items-center gap-1"
                                  style={{
                                    backgroundColor: "#eff6ff",
                                    color: "#2563eb",
                                    fontSize: "11px",
                                    padding: "3px 7px"
                                  }}
                                >
                                  <ActIcon size={10} /> {act.followup_type || "Call"}
                                </span>
                              </td>
                              <td>
                                <div className="fw-semibold text-dark" style={{ fontSize: "12px" }}>
                                  {act.followup_date || "—"}
                                </div>
                                <div className="text-muted" style={{ fontSize: "11px" }}>
                                  {act.followup_time || "Anytime"}
                                </div>
                              </td>
                              <td>
                                <span
                                  style={{
                                    backgroundColor: isDone ? "#ecfdf5" : "#fffbeb",
                                    color: isDone ? "#059669" : "#d97706",
                                    border: isDone ? "1px solid #a7f3d0" : "1px solid #fde68a",
                                    fontWeight: "700",
                                    fontSize: "11px",
                                    padding: "2px 7px",
                                    borderRadius: "6px"
                                  }}
                                >
                                  {act.followup_status || "Pending"}
                                </span>
                              </td>
                              <td style={{ maxWidth: "250px" }}>
                                <span className="text-muted" style={{ fontSize: "12px" }}>
                                  {act.discussion_summary || "No remarks logged."}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter className="d-flex justify-content-between">
          <Button
            color="light"
            className="border"
            onClick={() => window.print()}
            style={{ borderRadius: "8px", fontSize: "13px" }}
          >
            <FaPrint size={12} className="me-1" /> Print Summary
          </Button>
          <Button
            color="secondary"
            onClick={() => setDrilldownEmployee(null)}
            style={{ borderRadius: "8px", fontSize: "13px" }}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* ========================================================================= */}
      {/* 7. LEAD DETAILS QUICK VIEW MODAL */}
      {/* ========================================================================= */}
      <Modal isOpen={!!selectedLeadModal} toggle={() => setSelectedLeadModal(null)} centered>
        <ModalHeader toggle={() => setSelectedLeadModal(null)}>
          <span className="text-primary fw-bold">
            Lead Details: {selectedLeadModal?.lead_code || `LD-${selectedLeadModal?.id}`}
          </span>
        </ModalHeader>
        <ModalBody>
          {selectedLeadModal && (
            <div className="py-2">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div>
                  <h5 className="mb-1 text-dark fw-bold">
                    {`${selectedLeadModal.first_name || ""} ${selectedLeadModal.last_name || ""}`.trim() || selectedLeadModal.lead_title}
                  </h5>
                  <span className="text-muted" style={{ fontSize: "12px" }}>
                    Company: {selectedLeadModal.company_name || "Individual Customer"}
                  </span>
                </div>
                <span
                  style={{
                    backgroundColor: getStageStyle(selectedLeadModal.lead_status).bg,
                    color: getStageStyle(selectedLeadModal.lead_status).color,
                    border: `1px solid ${getStageStyle(selectedLeadModal.lead_status).border}`,
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "3px 9px",
                    borderRadius: "12px"
                  }}
                >
                  {selectedLeadModal.lead_status || "New"}
                </span>
              </div>

              <div className="row g-2" style={{ fontSize: "13px" }}>
                <div className="col-6">
                  <div className="text-muted" style={{ fontSize: "11px" }}>Contact Number</div>
                  <div className="fw-semibold">{selectedLeadModal.mobile_number || "—"}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted" style={{ fontSize: "11px" }}>Email Address</div>
                  <div className="fw-semibold">{selectedLeadModal.email_address || "—"}</div>
                </div>
                <div className="col-6 mt-2">
                  <div className="text-muted" style={{ fontSize: "11px" }}>Interested Product</div>
                  <div className="fw-semibold text-primary">{selectedLeadModal.interested_product || selectedLeadModal.lead_title || "General"}</div>
                </div>
                <div className="col-6 mt-2">
                  <div className="text-muted" style={{ fontSize: "11px" }}>Estimated Budget</div>
                  <div className="fw-bold text-dark">{formatINR(selectedLeadModal.expected_budget)}</div>
                </div>
                <div className="col-6 mt-2">
                  <div className="text-muted" style={{ fontSize: "11px" }}>Assigned Representative</div>
                  <div className="fw-semibold">{selectedLeadModal.assigned_to || "Unassigned"}</div>
                </div>
                <div className="col-6 mt-2">
                  <div className="text-muted" style={{ fontSize: "11px" }}>Acquisition Channel</div>
                  <div className="fw-semibold">{selectedLeadModal.lead_source || "Showroom Walk-in"}</div>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="secondary"
            onClick={() => setSelectedLeadModal(null)}
            style={{ borderRadius: "8px" }}
          >
            Close
          </Button>
          <Button
            color="primary"
            onClick={() => {
              const id = selectedLeadModal.id;
              setSelectedLeadModal(null);
              navigate(`/crm/leads/edit/${id}`);
            }}
            style={{ borderRadius: "8px" }}
          >
            Edit Lead Full Record
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default CrmDashboard;
