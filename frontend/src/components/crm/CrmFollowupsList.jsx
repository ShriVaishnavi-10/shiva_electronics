import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FaCalendarCheck,
  FaCalendarPlus,
  FaCalendarAlt,
  FaCalendarDay,
  FaList,
  FaPlus,
  FaSearch,
  FaPhoneAlt,
  FaWhatsapp,
  FaEnvelope,
  FaUsers,
  FaMapMarkerAlt,
  FaClock,
  FaEye,
  FaTrash,
  FaCheckCircle,
  FaUndo,
  FaChevronLeft,
  FaChevronRight,
  FaBuilding,
  FaTag,
  FaFilter,
  FaSyncAlt,
  FaPaperclip,
  FaBell,
  FaCheck,
  FaFileExcel
} from "react-icons/fa";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Badge,
  Input,
  Spinner
} from "reactstrap";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import api from "../../utils/api";

// Helper to get today YYYY-MM-DD
const getTodayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

// Date formatting helper without timezone drift
const formatFollowupDate = (dateStr) => {
  if (!dateStr) return { formatted: "-", day: "", diffDays: null, badge: null };
  const str = String(dateStr).slice(0, 10);
  const parts = str.split("-");
  if (parts.length !== 3) return { formatted: str, day: "", diffDays: null, badge: null };

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const formatted = `${String(day).padStart(2, "0")} ${months[month]} ${year}`;
  const dayName = days[d.getDay()];

  // Compare with local today
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(year, month, day);
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  let badge = null;
  if (diffDays === 0) {
    badge = { label: "Today", bg: "#fef3c7", color: "#b45309", border: "#fde68a" };
  } else if (diffDays === 1) {
    badge = { label: "Tomorrow", bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" };
  } else if (diffDays === -1) {
    badge = { label: "Yesterday", bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" };
  } else if (diffDays < -1) {
    badge = { label: `${Math.abs(diffDays)}d overdue`, bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" };
  } else if (diffDays <= 7) {
    badge = { label: `In ${diffDays} days`, bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" };
  } else {
    badge = { label: dayName, bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };
  }

  return { formatted, day: dayName, diffDays, badge };
};

// Time formatting helper
const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return "Anytime";
  const str = String(timeStr).trim();
  const parts = str.split(":");
  if (parts.length < 2) return str;
  let h = parseInt(parts[0], 10);
  const m = parts[1].slice(0, 2);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

const CrmFollowupsList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
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
      (Number(storedUser.id) === 1 && !storedUser.employee_id)
    );
  const isSalesStaff = !isAdmin;

  const initialAssigned = searchParams.get("assigned_to") || (isSalesStaff ? "me" : "All");
  const [assignedFilter, setAssignedFilter] = useState(initialAssigned);
  const [myAllocatedCount, setMyAllocatedCount] = useState(0);

  // View Mode: 'list' or 'calendar'
  const [viewMode, setViewMode] = useState("list");

  const [exporting, setExporting] = useState(false);

  // Export filtered follow-ups to Excel (.xlsx)
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      toast.info("Preparing Excel export for follow-ups...");

      // Fetch all matching follow-ups using current filters
      const res = await api.get("/crm/followups", {
        params: {
          search: search.trim() || undefined,
          status: statusFilter !== "All" ? statusFilter : undefined,
          type: typeFilter !== "All" ? typeFilter : undefined,
          priority: priorityFilter !== "All" ? priorityFilter : undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          dateFilter: dateFilter !== "All" ? dateFilter : undefined,
          selectedDate: selectedSpecificDate || undefined,
          assigned_to: assignedFilter !== "All" ? assignedFilter : undefined,
          all: true
        }
      });

      const list = res.data?.data || followups;
      if (!list || list.length === 0) {
        toast.warn("No follow-ups available to export with current filters");
        return;
      }

      const rows = list.map((item, idx) => ({
        "S.No": idx + 1,
        "Follow-up Code": item.followup_code || `FLW-${item.id}`,
        "Title": item.followup_title || "Follow-up",
        "Customer / Contact Name": item.entity_name || "—",
        "Company": item.company_name || "—",
        "Phone Number": item.mobile_number || "—",
        "Activity Type": item.followup_type || "Call",
        "Scheduled Date": item.followup_date ? String(item.followup_date).slice(0, 10) : "—",
        "Scheduled Time": item.followup_time || "—",
        "Status": item.followup_status || "Pending",
        "Priority": item.priority || "Medium",
        "Assigned Representative": item.assigned_to || "Unassigned",
        "Customer Requirement": item.customer_requirement || "—",
        "Customer Response": item.customer_response || "—",
        "Discussion Remarks": item.discussion_summary || item.discussion_remarks || "—",
        "Next Action": item.next_action || "—",
        "Next Follow-up Date": item.next_followup_date ? String(item.next_followup_date).slice(0, 10) : "—",
        "Next Follow-up Time": item.next_followup_time || "—",
        "Created Date": item.created_at ? String(item.created_at).slice(0, 10) : "—"
      }));

      const ws = XLSX.utils.json_to_sheet(rows);

      // Set clean column widths for Excel
      ws["!cols"] = [
        { wch: 6 },  // S.No
        { wch: 15 }, // Code
        { wch: 25 }, // Title
        { wch: 22 }, // Contact
        { wch: 18 }, // Company
        { wch: 15 }, // Phone
        { wch: 15 }, // Type
        { wch: 15 }, // Date
        { wch: 15 }, // Time
        { wch: 14 }, // Status
        { wch: 12 }, // Priority
        { wch: 22 }, // Assigned
        { wch: 25 }, // Requirement
        { wch: 25 }, // Response
        { wch: 30 }, // Remarks
        { wch: 20 }, // Next Action
        { wch: 18 }, // Next Date
        { wch: 16 }, // Next Time
        { wch: 14 }  // Created Date
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Follow-ups");

      const fileDateStr = selectedSpecificDate || (dateFilter === "today" ? getTodayStr() : "All");
      XLSX.writeFile(wb, `CRM_Followups_Report_${fileDateStr}.xlsx`);
      toast.success(`Successfully exported ${rows.length} follow-ups to Excel!`);
    } catch (err) {
      console.error("Failed to export follow-ups to Excel:", err);
      toast.error("Failed to export follow-ups to Excel");
    } finally {
      setExporting(false);
    }
  };

  // State for List View
  const [followups, setFollowups] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Quick Date Filter Tab: 'All', 'today', 'tomorrow', 'this_week', 'upcoming', 'overdue'
  // Default selected date is today's date
  const paramDate = searchParams.get("date");
  const paramDateFilter = searchParams.get("dateFilter");
  const [dateFilter, setDateFilter] = useState(paramDateFilter || (paramDate ? "All" : "today"));
  const [selectedSpecificDate, setSelectedSpecificDate] = useState(paramDate || "");

  // Live Date Metrics
  const [dateMetrics, setDateMetrics] = useState({
    total: 0,
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    upcoming: 0,
    overdue: 0
  });

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarFollowups, setCalendarFollowups] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarSelectedDay, setCalendarSelectedDay] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals
  const [viewFollowup, setViewFollowup] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [followupModal, setFollowupModal] = useState(false);
  const [selectedFollowup, setSelectedFollowup] = useState(null);
  const [savingFollowup, setSavingFollowup] = useState(false);
  const [followupForm, setFollowupForm] = useState({
    followup_type: "Phone Call",
    priority: "Medium",
    next_followup_date: "",
    scheduled_time: "",
    discussion_remarks: ""
  });

  // Load from Backend Database API for Table View
  const loadFollowups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/crm/followups", {
        params: {
          search: search.trim() || undefined,
          status: statusFilter !== "All" ? statusFilter : undefined,
          type: typeFilter !== "All" ? typeFilter : undefined,
          priority: priorityFilter !== "All" ? priorityFilter : undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          dateFilter: dateFilter !== "All" ? dateFilter : undefined,
          selectedDate: selectedSpecificDate || undefined,
          assigned_to: assignedFilter !== "All" ? assignedFilter : undefined,
          page,
          limit
        }
      });
      if (res.data?.success) {
        setFollowups(res.data.data || []);
        setTotalCount(res.data.total || 0);
        if (res.data.dateMetrics) {
          setDateMetrics(res.data.dateMetrics);
        }
        if (res.data.myAllocatedCount !== undefined) {
          setMyAllocatedCount(res.data.myAllocatedCount);
        }
      }
    } catch (err) {
      console.error("Failed to load follow-ups from backend:", err);
      toast.error("Failed to fetch follow-ups from database");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, priorityFilter, fromDate, toDate, dateFilter, selectedSpecificDate, assignedFilter, page, limit]);

  // Load Calendar Month Follow-ups
  const loadCalendarMonthData = useCallback(async (targetDate) => {
    setLoadingCalendar(true);
    try {
      const y = targetDate.getFullYear();
      const m = String(targetDate.getMonth() + 1).padStart(2, "0");
      const monthStr = `${y}-${m}`;

      const res = await api.get("/crm/followups", {
        params: {
          month: monthStr,
          all: true,
          status: statusFilter !== "All" ? statusFilter : undefined,
          type: typeFilter !== "All" ? typeFilter : undefined,
          assigned_to: assignedFilter !== "All" ? assignedFilter : undefined
        }
      });
      if (res.data?.success) {
        setCalendarFollowups(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load calendar follow-ups:", err);
    } finally {
      setLoadingCalendar(false);
    }
  }, [statusFilter, typeFilter, assignedFilter]);

  useEffect(() => {
    loadFollowups();
  }, [loadFollowups]);

  useEffect(() => {
    if (viewMode === "calendar") {
      loadCalendarMonthData(calendarDate);
    }
  }, [viewMode, calendarDate, loadCalendarMonthData]);

  // Total pages
  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Reset Filters
  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setTypeFilter("All");
    setPriorityFilter("All");
    setFromDate("");
    setToDate("");
    setDateFilter("today");
    setSelectedSpecificDate("");
    setPage(1);
  };

  // Quick Date Filter selection
  const handleSelectDateTab = (tab) => {
    setDateFilter(tab);
    setSelectedSpecificDate("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  // Toggle quick complete via backend API
  const handleToggleComplete = async (item) => {
    const newStatus = item.followup_status === "Completed" ? "Pending" : "Completed";
    try {
      const res = await api.patch(`/crm/followups/${item.id}/status`, { status: newStatus });
      if (res.data?.success) {
        toast.success(res.data.message || `Follow-up marked as ${newStatus}!`);
        loadFollowups();
        if (viewMode === "calendar") loadCalendarMonthData(calendarDate);
      }
    } catch (err) {
      console.error("Failed to update status in database:", err);
      toast.error("Failed to update follow-up status in database.");
    }
  };

  // Delete Follow-up from database
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await api.delete(`/crm/followups/${deleteTarget.id}`);
      if (res.data?.success) {
        toast.success(res.data.message || "Follow-up deleted successfully from database!");
        setDeleteTarget(null);
        loadFollowups();
        if (viewMode === "calendar") loadCalendarMonthData(calendarDate);
      }
    } catch (err) {
      console.error("Failed to delete follow-up from database:", err);
      toast.error("Failed to delete follow-up from database.");
    }
  };

  // Schedule Next Follow-up
  const handleOpenFollowupModal = (followup) => {
    setSelectedFollowup(followup);
    setFollowupForm({
      followup_type: "Phone Call",
      priority: followup?.priority || "Medium",
      next_followup_date: "",
      scheduled_time: "",
      discussion_remarks: ""
    });
    setFollowupModal(true);
  };

  const handleSaveFollowup = async (e) => {
    e.preventDefault();
    if (!followupForm.next_followup_date) {
      toast.error("Next follow-up date is required");
      return;
    }
    if (!selectedFollowup?.id) {
      toast.error("No follow-up selected");
      return;
    }
    setSavingFollowup(true);
    try {
      const res = await api.post(`/crm/followups/${selectedFollowup.id}/next-followup`, followupForm);
      if (res.data?.success) {
        toast.success(res.data.message || "Next follow-up scheduled successfully!");
        setFollowupModal(false);
        loadFollowups();
        if (viewMode === "calendar") loadCalendarMonthData(calendarDate);
      } else {
        toast.error(res.data?.message || "Failed to schedule follow-up");
      }
    } catch (err) {
      console.error("Error scheduling follow-up:", err);
      toast.error(err.response?.data?.message || "Failed to schedule follow-up");
    } finally {
      setSavingFollowup(false);
    }
  };

  // Status Badge Colors
  const getStatusBadge = (status) => {
    switch (status) {
      case "Completed":
        return { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" };
      case "Pending":
        return { bg: "#fffbeb", color: "#d97706", border: "#fde68a" };
      case "Rescheduled":
        return { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
      case "Cancelled":
        return { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
      default:
        return { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };
    }
  };

  // Priority Badge Colors
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "Urgent":
      case "High":
        return { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
      case "Medium":
        return { bg: "#fffbeb", color: "#d97706", border: "#fde68a" };
      case "Low":
        return { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" };
      default:
        return { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" };
    }
  };

  // Type Icon
  const getTypeIcon = (type) => {
    switch (type) {
      case "Call":
      case "Phone Call":
        return <FaPhoneAlt size={12} className="text-primary me-1" />;
      case "WhatsApp":
        return <FaWhatsapp size={13} className="text-success me-1" />;
      case "Email":
        return <FaEnvelope size={12} className="text-warning me-1" />;
      case "Meeting":
        return <FaUsers size={12} className="text-info me-1" />;
      case "Site Visit":
      case "Showroom Demo":
        return <FaMapMarkerAlt size={12} className="text-danger me-1" />;
      default:
        return <FaClock size={12} className="text-muted me-1" />;
    }
  };

  // Calendar Helpers
  const calendarMonthYearStr = useMemo(() => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${months[calendarDate.getMonth()]} ${calendarDate.getFullYear()}`;
  }, [calendarDate]);

  const calendarDaysMatrix = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDay.getDay(); // 0 is Sunday
    const totalDaysInMonth = lastDay.getDate();

    // Previous month trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const matrix = [];

    let currentWeek = [];

    // Fill previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = prevMonthLastDay - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(prevDate).padStart(2, "0")}`;
      currentWeek.push({
        dayNumber: prevDate,
        dateStr,
        isCurrentMonth: false
      });
    }

    // Fill current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      currentWeek.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true
      });
      if (currentWeek.length === 7) {
        matrix.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill next month days
    if (currentWeek.length > 0) {
      let nextDayNum = 1;
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      while (currentWeek.length < 7) {
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(nextDayNum).padStart(2, "0")}`;
        currentWeek.push({
          dayNumber: nextDayNum,
          dateStr,
          isCurrentMonth: false
        });
        nextDayNum++;
      }
      matrix.push(currentWeek);
    }

    return matrix;
  }, [calendarDate]);

  // Group calendar follow-ups by dateStr
  const followupsByDate = useMemo(() => {
    const map = {};
    calendarFollowups.forEach((f) => {
      if (!f.followup_date) return;
      const d = String(f.followup_date).slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(f);
    });
    return map;
  }, [calendarFollowups]);

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const handleTodayMonth = () => {
    setCalendarDate(new Date());
  };

  const handleCalendarDayClick = (dayObj) => {
    setCalendarSelectedDay(dayObj);
    setSelectedSpecificDate(dayObj.dateStr);
    setDateFilter("All");
    setPage(1);
  };

  const todayStr = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  }, []);

  return (
    <div className="crm-content-scroll" style={{ paddingBottom: "60px" }}>
      {/* Top Header */}
      <div className="crm-contacts-header mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h2 className="crm-page-title d-flex align-items-center gap-2 mb-1">
              <FaCalendarCheck className="text-primary" />
              <span>Follow-ups Management</span>
            </h2>
            <p className="text-muted mb-0" style={{ fontSize: "13.5px" }}>
              Schedule, track, and execute customer follow-up activities date-wise and on interactive calendar.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* View Mode Switcher Pill */}
            <div
              className="d-inline-flex align-items-center p-1 bg-white border rounded-pill shadow-sm"
              style={{ fontSize: "12.5px" }}
            >
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`btn btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1 border-0 ${
                  viewMode === "list"
                    ? "bg-primary text-white fw-bold shadow-sm"
                    : "text-muted bg-transparent"
                }`}
                style={{ fontSize: "12.5px", transition: "all 0.2s" }}
              >
                <FaList size={11} />
                <span>List View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`btn btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1 border-0 ${
                  viewMode === "calendar"
                    ? "bg-primary text-white fw-bold shadow-sm"
                    : "text-muted bg-transparent"
                }`}
                style={{ fontSize: "12.5px", transition: "all 0.2s" }}
              >
                <FaCalendarAlt size={11} />
                <span>Calendar View</span>
              </button>
            </div>

            <button
              className="btn btn-light border d-flex align-items-center gap-2"
              onClick={() => {
                loadFollowups();
                if (viewMode === "calendar") loadCalendarMonthData(calendarDate);
              }}
              title="Refresh Follow-ups"
              style={{ borderRadius: "10px", fontSize: "13px", padding: "8px 14px" }}
            >
              <FaSyncAlt size={12} className={loading || loadingCalendar ? "fa-spin" : ""} />
              <span className="d-none d-sm-inline">Refresh</span>
            </button>

            <button
              className="btn btn-outline-success d-flex align-items-center gap-2 shadow-sm"
              onClick={handleExportExcel}
              disabled={exporting}
              title="Download follow-ups as Excel (.xlsx)"
              style={{ borderRadius: "10px", fontSize: "13px", padding: "8px 14px", fontWeight: "600" }}
            >
              <FaFileExcel size={14} className="text-success" />
              <span>{exporting ? "Exporting..." : "Export Excel"}</span>
            </button>

            <button
              className="crm-btn-primary"
              onClick={() => navigate("/crm/followups/new")}
              style={{ borderRadius: "10px", padding: "8px 18px", fontSize: "13px" }}
            >
              <FaPlus size={11} />
              <span>New Follow-up</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Date-Wise Filter Tabs */}
      <div className="crm-card p-3 mb-3" style={{ borderRadius: "14px" }}>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="text-muted fw-bold me-1" style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Date Filter:
            </span>

            {/* All Records */}
            <button
              onClick={() => handleSelectDateTab("All")}
              className={`btn btn-sm ${
                dateFilter === "All" && !selectedSpecificDate
                  ? "btn-dark text-white fw-bold shadow-sm"
                  : "btn-light border text-muted"
              }`}
              style={{ borderRadius: "20px", fontSize: "12px", padding: "5px 14px" }}
            >
              All Records ({dateMetrics.total})
            </button>

            {/* Today */}
            <button
              onClick={() => handleSelectDateTab("today")}
              className={`btn btn-sm ${
                dateFilter === "today"
                  ? "btn-primary text-white fw-bold shadow-sm"
                  : "btn-light border text-dark"
              }`}
              style={{
                borderRadius: "20px",
                fontSize: "12px",
                padding: "5px 14px",
                background: dateFilter === "today" ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : undefined
              }}
            >
              ★ Today ({dateMetrics.today})
            </button>

            {/* Tomorrow */}
            <button
              onClick={() => handleSelectDateTab("tomorrow")}
              className={`btn btn-sm ${
                dateFilter === "tomorrow"
                  ? "btn-info text-white fw-bold shadow-sm"
                  : "btn-light border text-dark"
              }`}
              style={{ borderRadius: "20px", fontSize: "12px", padding: "5px 14px" }}
            >
              Tomorrow ({dateMetrics.tomorrow})
            </button>

            {/* This Week */}
            <button
              onClick={() => handleSelectDateTab("this_week")}
              className={`btn btn-sm ${
                dateFilter === "this_week"
                  ? "btn-secondary text-white fw-bold shadow-sm"
                  : "btn-light border text-muted"
              }`}
              style={{ borderRadius: "20px", fontSize: "12px", padding: "5px 14px" }}
            >
              This Week ({dateMetrics.thisWeek})
            </button>

            {/* Upcoming */}
            <button
              onClick={() => handleSelectDateTab("upcoming")}
              className={`btn btn-sm ${
                dateFilter === "upcoming"
                  ? "btn-success text-white fw-bold shadow-sm"
                  : "btn-light border text-success"
              }`}
              style={{ borderRadius: "20px", fontSize: "12px", padding: "5px 14px" }}
            >
              Upcoming ({dateMetrics.upcoming})
            </button>

            {/* Overdue */}
            {dateMetrics.overdue > 0 && (
              <button
                onClick={() => handleSelectDateTab("overdue")}
                className={`btn btn-sm ${
                  dateFilter === "overdue"
                    ? "btn-danger text-white fw-bold shadow-sm"
                    : "btn-outline-danger"
                }`}
                style={{ borderRadius: "20px", fontSize: "12px", padding: "5px 14px" }}
              >
                ⚠️ Overdue ({dateMetrics.overdue})
              </button>
            )}

            {/* If a specific single date was clicked in calendar */}
            {selectedSpecificDate && (
              <span
                className="badge d-inline-flex align-items-center gap-1"
                style={{
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  borderRadius: "20px",
                  padding: "6px 12px",
                  fontSize: "12px"
                }}
              >
                Selected: <strong>{formatFollowupDate(selectedSpecificDate).formatted}</strong>
                <button
                  type="button"
                  className="btn-close ms-1"
                  style={{ fontSize: "8px" }}
                  onClick={() => setSelectedSpecificDate("")}
                />
              </span>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="text-muted fw-semibold" style={{ fontSize: "12px" }}>
              Active View: <strong>{viewMode === "list" ? "Date-Wise Table" : "Monthly Calendar"}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Filter & Search Card (for Table List) */}
      <div className="crm-card p-3 mb-4" style={{ borderRadius: "14px" }}>
        {/* Quick Allocation Filter Tabs */}
        {isAdmin ? (
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pb-3 mb-3 border-bottom">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setAssignedFilter("All");
                  setPage(1);
                }}
                className={`btn btn-sm ${assignedFilter === "All" ? "btn-dark fw-bold text-white shadow-sm" : "btn-light border text-muted"}`}
                style={{ borderRadius: "20px", fontSize: "12px", padding: "5px 14px" }}
              >
                All Follow-ups ({totalCount})
              </button>
              <button
                onClick={() => {
                  setAssignedFilter("me");
                  setPage(1);
                }}
                className={`btn btn-sm ${assignedFilter === "me" ? "btn-primary fw-bold text-white shadow-sm" : "btn-light border text-primary"}`}
                style={{
                  borderRadius: "20px",
                  fontSize: "12px",
                  padding: "5px 14px",
                  background: assignedFilter === "me" ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : undefined
                }}
              >
                ★ My Assigned Follow-ups {myAllocatedCount > 0 ? `(${myAllocatedCount})` : ""}
              </button>
              <button
                onClick={() => {
                  setAssignedFilter("unassigned");
                  setPage(1);
                }}
                className={`btn btn-sm ${assignedFilter === "unassigned" ? "btn-warning fw-bold text-dark shadow-sm" : "btn-light border text-muted"}`}
                style={{ borderRadius: "20px", fontSize: "12px", padding: "5px 14px" }}
              >
                Unassigned
              </button>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="text-muted fw-semibold" style={{ fontSize: "12px", whiteSpace: "nowrap" }}>Filter By Staff:</span>
              <select
                className="form-select form-select-sm"
                style={{ borderRadius: "8px", fontSize: "12px", minWidth: "170px" }}
                value={assignedFilter}
                onChange={(e) => {
                  setAssignedFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="All">All Staff Members</option>
                <option value="me">★ Assigned to Me ({storedUser.name || storedUser.username || "My Tasks"})</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pb-3 mb-3 border-bottom">
            <div className="d-flex align-items-center gap-2">
              <span
                className="badge d-inline-flex align-items-center gap-1 shadow-sm"
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#fff",
                  fontSize: "12.5px",
                  padding: "7px 15px",
                  borderRadius: "20px"
                }}
              >
                ★ My Assigned Follow-ups ({totalCount})
              </span>
              <span className="text-muted" style={{ fontSize: "12.5px" }}>
                Only follow-ups assigned to you are displayed.
              </span>
            </div>
            <div className="badge bg-light text-dark border px-3 py-2" style={{ fontSize: "12px" }}>
              Representative: <strong>{storedUser.displayName || storedUser.name || storedUser.username}</strong>
            </div>
          </div>
        )}

        {/* Row 1: Entries limit + Search */}
        <div className="row g-2 align-items-center mb-3">
          <div className="col-12 col-sm-6 col-md-4 d-flex align-items-center gap-2">
            <span className="text-muted fw-semibold" style={{ fontSize: "13px", whiteSpace: "nowrap" }}>
              Show
            </span>
            <select
              className="form-select form-select-sm"
              style={{
                width: "85px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer"
              }}
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-muted fw-semibold" style={{ fontSize: "13px", whiteSpace: "nowrap" }}>
              entries
            </span>
          </div>

          <div className="col-12 col-sm-6 col-md-8">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0" style={{ borderRadius: "10px 0 0 10px" }}>
                <FaSearch className="text-muted" size={13} />
              </span>
              <Input
                type="text"
                className="border-start-0"
                style={{ borderRadius: "0 10px 10px 0", fontSize: "13px" }}
                placeholder="Search by title, contact, company, ID, or assigned staff..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {/* Row 2: Status, Type, Priority, Date Range */}
        <div className="row g-2 align-items-end pt-2 border-top">
          {/* Status */}
          <div className="col-6 col-md-2">
            <label className="form-label text-muted mb-1 fw-semibold" style={{ fontSize: "11.5px" }}>
              Status
            </label>
            <select
              className="form-select form-select-sm"
              style={{ borderRadius: "8px", fontSize: "12.5px" }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Rescheduled">Rescheduled</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Activity Type */}
          <div className="col-6 col-md-2">
            <label className="form-label text-muted mb-1 fw-semibold" style={{ fontSize: "11.5px" }}>
              Activity Type
            </label>
            <select
              className="form-select form-select-sm"
              style={{ borderRadius: "8px", fontSize: "12.5px" }}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All Types</option>
              <option value="Call">Call</option>
              <option value="Phone Call">Phone Call</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
              <option value="Meeting">Meeting</option>
              <option value="Site Visit">Site Visit</option>
              <option value="Showroom Demo">Showroom Demo</option>
            </select>
          </div>

          {/* Priority */}
          <div className="col-6 col-md-2">
            <label className="form-label text-muted mb-1 fw-semibold" style={{ fontSize: "11.5px" }}>
              Priority
            </label>
            <select
              className="form-select form-select-sm"
              style={{ borderRadius: "8px", fontSize: "12.5px" }}
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* From Date */}
          <div className="col-6 col-md-2">
            <label className="form-label text-muted mb-1 fw-semibold" style={{ fontSize: "11.5px" }}>
              From Date
            </label>
            <input
              type="date"
              className="form-control form-control-sm"
              style={{ borderRadius: "8px", fontSize: "12px" }}
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDateFilter("All");
                setSelectedSpecificDate("");
                setPage(1);
              }}
            />
          </div>

          {/* To Date */}
          <div className="col-6 col-md-2">
            <label className="form-label text-muted mb-1 fw-semibold" style={{ fontSize: "11.5px" }}>
              To Date
            </label>
            <input
              type="date"
              className="form-control form-control-sm"
              style={{ borderRadius: "8px", fontSize: "12px" }}
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDateFilter("All");
                setSelectedSpecificDate("");
                setPage(1);
              }}
            />
          </div>

          {/* Reset Button */}
          <div className="col-6 col-md-2">
            <button
              className="btn btn-sm btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-1"
              style={{ borderRadius: "8px", height: "31px", fontSize: "12px" }}
              onClick={handleResetFilters}
            >
              <FaUndo size={10} />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: CALENDAR VIEW */}
      {viewMode === "calendar" && (
        <div className="crm-card p-3 mb-4" style={{ borderRadius: "14px" }}>
          {/* Calendar Header Navigation */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 pb-3 mb-3 border-bottom">
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-light border btn-sm p-1 px-2"
                onClick={handlePrevMonth}
                title="Previous Month"
                style={{ borderRadius: "8px" }}
              >
                <FaChevronLeft size={12} />
              </button>
              <h4 className="mb-0 fw-bold text-dark" style={{ fontSize: "18px", minWidth: "180px", textAlign: "center" }}>
                {calendarMonthYearStr}
              </h4>
              <button
                className="btn btn-light border btn-sm p-1 px-2"
                onClick={handleNextMonth}
                title="Next Month"
                style={{ borderRadius: "8px" }}
              >
                <FaChevronRight size={12} />
              </button>
              <button
                className="btn btn-outline-primary btn-sm ms-2"
                onClick={handleTodayMonth}
                style={{ borderRadius: "8px", fontSize: "12px", padding: "4px 12px" }}
              >
                Today
              </button>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-light text-dark border px-3 py-2" style={{ fontSize: "12px" }}>
                Total in Month: <strong>{calendarFollowups.length} Follow-ups</strong>
              </span>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setViewMode("list")}
                style={{ borderRadius: "8px", fontSize: "12px" }}
              >
                Switch to Table View
              </button>
            </div>
          </div>

          {/* Weekday Names Header */}
          <div className="row g-1 mb-2 text-center text-muted fw-bold" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((dayName, idx) => (
              <div key={idx} className="col">
                <div className="p-2 bg-light rounded" style={{ fontWeight: "700" }}>
                  {dayName}
                </div>
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          {loadingCalendar ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary spinner-border-sm me-2" role="status" />
              <span className="text-muted" style={{ fontSize: "13px" }}>Loading calendar events...</span>
            </div>
          ) : (
            <div className="d-flex flex-column gap-1">
              {calendarDaysMatrix.map((week, wIdx) => (
                <div key={wIdx} className="row g-1">
                  {week.map((dayObj, dIdx) => {
                    const isToday = dayObj.dateStr === todayStr;
                    const isSelected = selectedSpecificDate === dayObj.dateStr || (!selectedSpecificDate && dateFilter === "today" && isToday);
                    const itemsOnThisDay = followupsByDate[dayObj.dateStr] || [];

                    return (
                      <div key={dIdx} className="col" style={{ minHeight: "115px" }}>
                        <div
                          onClick={() => handleCalendarDayClick(dayObj)}
                          className="h-100 p-2 d-flex flex-column justify-content-between border rounded"
                          style={{
                            backgroundColor: isSelected
                              ? "#eff6ff"
                              : isToday
                              ? "#fffdf5"
                              : dayObj.isCurrentMonth
                              ? "#ffffff"
                              : "#f8fafc",
                            borderColor: isSelected
                              ? "#2563eb"
                              : isToday
                              ? "#f59e0b"
                              : "#e2e8f0",
                            borderWidth: isSelected || isToday ? "2px" : "1px",
                            cursor: "pointer",
                            transition: "all 0.15s ease-in-out",
                            position: "relative"
                          }}
                        >
                          {/* Top: Day Number and Badges */}
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span
                              className={`fw-bold ${
                                isToday
                                  ? "text-primary"
                                  : dayObj.isCurrentMonth
                                  ? "text-dark"
                                  : "text-muted opacity-50"
                              }`}
                              style={{ fontSize: "13px" }}
                            >
                              {dayObj.dayNumber}
                            </span>

                            {isToday && (
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: "#fef3c7",
                                  color: "#b45309",
                                  fontSize: "9.5px",
                                  padding: "2px 5px",
                                  fontWeight: "700"
                                }}
                              >
                                TODAY
                              </span>
                            )}

                            {itemsOnThisDay.length > 0 && !isToday && (
                              <span
                                className="badge bg-primary rounded-pill text-white"
                                style={{ fontSize: "9.5px", padding: "2px 6px" }}
                              >
                                {itemsOnThisDay.length}
                              </span>
                            )}
                          </div>

                          {/* Middle: Follow-up Activity Items */}
                          <div className="d-flex flex-column gap-1 flex-grow-1 overflow-hidden">
                            {itemsOnThisDay.slice(0, 3).map((item, fIdx) => {
                              const isCompleted = item.followup_status === "Completed";
                              const pBadge = getPriorityBadge(item.priority);

                              return (
                                <div
                                  key={item.id || fIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewFollowup(item);
                                  }}
                                  className="p-1 px-2 rounded shadow-2xs d-flex align-items-center justify-content-between"
                                  style={{
                                    fontSize: "11px",
                                    backgroundColor: isCompleted ? "#ecfdf5" : "#f1f5f9",
                                    borderLeft: `3px solid ${pBadge.color}`,
                                    cursor: "pointer"
                                  }}
                                  title={`${item.followup_title} - ${item.entity_name || ""}`}
                                >
                                  <div className="text-truncate me-1" style={{ maxWidth: "85%" }}>
                                    <strong>{item.followup_time ? formatTimeDisplay(item.followup_time) : "•"}</strong>{" "}
                                    <span>{item.entity_name || item.followup_title}</span>
                                  </div>
                                  <span style={{ fontSize: "10px" }}>
                                    {getTypeIcon(item.followup_type)}
                                  </span>
                                </div>
                              );
                            })}

                            {itemsOnThisDay.length > 3 && (
                              <div className="text-muted text-center" style={{ fontSize: "10px", fontWeight: "600" }}>
                                +{itemsOnThisDay.length - 3} more
                              </div>
                            )}
                          </div>

                          {/* Bottom Action Hint */}
                          {itemsOnThisDay.length > 0 && (
                            <div className="mt-1 pt-1 border-top text-end" style={{ fontSize: "10px" }}>
                              <span className="text-primary fw-semibold">View in list →</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: TABLE LIST VIEW */}
      <div className="crm-card overflow-hidden" style={{ borderRadius: "14px" }}>
        <div className="p-3 bg-white border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <FaCalendarCheck className="text-primary" size={16} />
            <span className="fw-bold text-dark" style={{ fontSize: "15px" }}>
              Follow-ups Schedule List
            </span>
            <span className="badge bg-light text-dark border">
              {totalCount} total entries
            </span>
          </div>

          {(selectedSpecificDate || dateFilter === "today") && (
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary text-white" style={{ fontSize: "12px", padding: "6px 12px" }}>
                Showing Date: {selectedSpecificDate ? formatFollowupDate(selectedSpecificDate).formatted : `Today (${formatFollowupDate(todayStr).formatted})`}
              </span>
              {dateFilter === "today" && !selectedSpecificDate && (
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleSelectDateTab("All")}
                  style={{ borderRadius: "6px", fontSize: "11px" }}
                  title="View all records"
                >
                  View All Dates
                </button>
              )}
              {selectedSpecificDate && (
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setSelectedSpecificDate("")}
                  style={{ borderRadius: "6px", fontSize: "11px" }}
                >
                  Clear Date
                </button>
              )}
            </div>
          )}
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0 crm-table">
            <thead className="bg-light">
              <tr>
                <th style={{ width: "45px" }}>#</th>
                <th>Follow-up ID & Title</th>
                <th>Related To / Contact</th>
                <th>Activity Type</th>
                <th style={{ minWidth: "160px" }}>Scheduled Date & Time</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <div className="spinner-border text-primary spinner-border-sm me-2" role="status" />
                    <span className="text-muted" style={{ fontSize: "13px" }}>
                      Loading follow-ups...
                    </span>
                  </td>
                </tr>
              ) : followups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        backgroundColor: "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 12px auto"
                      }}
                    >
                      <FaCalendarCheck size={24} className="text-muted" />
                    </div>
                    <div className="fw-semibold text-dark mb-1">No follow-ups found for this criteria</div>
                    <p className="text-muted mb-3" style={{ fontSize: "13px" }}>
                      {search || statusFilter !== "All" || typeFilter !== "All" || dateFilter !== "All" || selectedSpecificDate
                        ? "Try clearing your date or search filters."
                        : "Click 'New Follow-up' above to create your first follow-up activity."}
                    </p>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={handleResetFilters}
                      style={{ borderRadius: "8px" }}
                    >
                      Reset All Filters
                    </button>
                  </td>
                </tr>
              ) : (
                followups.map((item, idx) => {
                  const statusStyle = getStatusBadge(item.followup_status);
                  const priorityStyle = getPriorityBadge(item.priority);
                  const dateInfo = formatFollowupDate(item.followup_date);
                  const displayTime = formatTimeDisplay(item.followup_time);

                  return (
                    <tr key={item.id || idx}>
                      {/* # */}
                      <td className="text-muted" style={{ fontSize: "12px" }}>
                        {(page - 1) * limit + idx + 1}
                      </td>

                      {/* ID & Title */}
                      <td>
                        <div className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                          {item.followup_title}
                        </div>
                        <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
                          <span
                            style={{
                              fontSize: "10.5px",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              backgroundColor: priorityStyle.bg,
                              color: priorityStyle.color,
                              fontWeight: "700"
                            }}
                          >
                            {item.priority || "Medium"}
                          </span>
                          <span className="text-muted" style={{ fontSize: "11px", fontWeight: "600" }}>
                            {item.followup_code || item.followup_id || `FLW-${item.id}`}
                          </span>
                        </div>
                      </td>

                      {/* Related To / Contact */}
                      <td>
                        <div className="fw-medium text-dark">
                          {item.entity_name || "Direct Customer"}
                        </div>
                        <div className="text-muted" style={{ fontSize: "12px" }}>
                          <span className="badge bg-light text-dark border me-1" style={{ fontSize: "10px" }}>
                            {item.related_to || "Lead"}
                          </span>
                          {item.company_name && <span>{item.company_name}</span>}
                        </div>
                        {item.mobile_number && (
                          <div className="text-muted mt-1" style={{ fontSize: "11.5px" }}>
                            <FaPhoneAlt size={10} className="me-1" />
                            <span>{item.mobile_number}</span>
                          </div>
                        )}
                      </td>

                      {/* Activity Type */}
                      <td>
                        <div className="d-flex align-items-center" style={{ fontSize: "13px", fontWeight: "500" }}>
                          {getTypeIcon(item.followup_type)}
                          <span>{item.followup_type || "Call"}</span>
                        </div>
                        {item.duration && (
                          <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                            Duration: {item.duration} mins
                          </div>
                        )}
                      </td>

                      {/* Date & Time (Clean, formatted without timezone skew) */}
                      <td>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                            {dateInfo.formatted}
                          </span>
                          {dateInfo.badge && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: "700",
                                padding: "1px 7px",
                                borderRadius: "12px",
                                backgroundColor: dateInfo.badge.bg,
                                color: dateInfo.badge.color,
                                border: `1px solid ${dateInfo.badge.border}`
                              }}
                            >
                              {dateInfo.badge.label}
                            </span>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-1 text-muted mt-1" style={{ fontSize: "11.5px" }}>
                          <FaClock size={10} className="text-primary" />
                          <span>{displayTime}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className="crm-status-pill"
                          style={{
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                            border: `1px solid ${statusStyle.border}`,
                            fontWeight: "700"
                          }}
                        >
                          {item.followup_status || "Pending"}
                        </span>
                      </td>

                      {/* Assigned To */}
                      <td>
                        <span className="fw-medium text-dark" style={{ fontSize: "12.5px" }}>
                          {item.assigned_to || "Unassigned"}
                        </span>
                        {item.next_followup_date && (
                          <div className="text-muted mt-1" style={{ fontSize: "10.5px" }}>
                            Next: {formatFollowupDate(item.next_followup_date).formatted}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div className="d-inline-flex align-items-center gap-1">
                          <button
                            className="btn btn-sm border p-1 px-2 text-primary"
                            onClick={() => handleOpenFollowupModal(item)}
                            title="Schedule Next Follow-up"
                            style={{ borderRadius: "6px", backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }}
                          >
                            <FaCalendarPlus size={12} className="text-primary" />
                          </button>
                          <button
                            className="btn btn-sm btn-light border p-1 px-2"
                            onClick={() => setViewFollowup(item)}
                            title="View Follow-up Details"
                            style={{ borderRadius: "6px" }}
                          >
                            <FaEye size={12} className="text-info" />
                          </button>
                          <button
                            className={`btn btn-sm border p-1 px-2 ${
                              item.followup_status === "Completed"
                                ? "btn-success text-white"
                                : "btn-light text-success"
                            }`}
                            onClick={() => handleToggleComplete(item)}
                            title={
                              item.followup_status === "Completed"
                                ? "Mark as Pending"
                                : "Mark as Completed"
                            }
                            style={{ borderRadius: "6px" }}
                          >
                            <FaCheckCircle size={12} />
                          </button>
                          {isAdmin && (
                            <button
                              className="btn btn-sm btn-light border p-1 px-2"
                              onClick={() => setDeleteTarget(item)}
                              title="Delete Follow-up"
                              style={{ borderRadius: "6px" }}
                            >
                              <FaTrash size={12} className="text-danger" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && followups.length > 0 && (
          <div
            className="p-3 bg-white border-top d-flex flex-wrap align-items-center justify-content-between gap-3"
            style={{ fontSize: "13px" }}
          >
            <div className="text-muted">
              Showing{" "}
              <strong>
                {Math.min((page - 1) * limit + 1, totalCount)} - {Math.min(page * limit, totalCount)}
              </strong>{" "}
              of <strong>{totalCount}</strong> entries
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

      {/* View Follow-up Details Modal */}
      <Modal isOpen={!!viewFollowup} toggle={() => setViewFollowup(null)} centered size="lg">
        <ModalHeader toggle={() => setViewFollowup(null)}>
          <div className="d-flex align-items-center gap-2">
            <FaCalendarCheck className="text-primary" />
            <span className="fw-bold">Follow-up Details</span>
            {viewFollowup && (
              <span className="badge bg-light text-dark border ms-2">
                {viewFollowup.followup_code || viewFollowup.followup_id || `FLW-${viewFollowup.id}`}
              </span>
            )}
          </div>
        </ModalHeader>
        <ModalBody>
          {viewFollowup && (
            <div className="container-fluid p-0">
              <div className="row g-3">
                {/* A. Basic Information */}
                <div className="col-12">
                  <div className="p-3 bg-light rounded" style={{ fontSize: "13px" }}>
                    <div className="fw-bold text-dark mb-2 border-bottom pb-1">
                      A. Basic Information
                    </div>
                    <div className="row g-2">
                      <div className="col-md-6">
                        <strong>Title:</strong> {viewFollowup.followup_title}
                      </div>
                      <div className="col-md-6">
                        <strong>Related To:</strong> {viewFollowup.related_to} ({viewFollowup.entity_name || "-"})
                      </div>
                      <div className="col-md-6">
                        <strong>Company Name:</strong> {viewFollowup.company_name || "-"}
                      </div>
                      <div className="col-md-6">
                        <strong>Mobile Number:</strong> {viewFollowup.mobile_number || "-"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* B. Activity Details */}
                <div className="col-12 col-md-6">
                  <div className="p-3 bg-light rounded h-100" style={{ fontSize: "13px" }}>
                    <div className="fw-bold text-dark mb-2 border-bottom pb-1">
                      B. Activity Details
                    </div>
                    <div><strong>Type:</strong> {viewFollowup.followup_type}</div>
                    <div>
                      <strong>Scheduled Date:</strong>{" "}
                      {formatFollowupDate(viewFollowup.followup_date).formatted} at{" "}
                      {formatTimeDisplay(viewFollowup.followup_time)}
                    </div>
                    <div><strong>Duration:</strong> {viewFollowup.duration ? `${viewFollowup.duration} minutes` : "-"}</div>
                    <div><strong>Priority:</strong> {viewFollowup.priority}</div>
                    <div><strong>Status:</strong> {viewFollowup.followup_status}</div>
                  </div>
                </div>

                {/* D. Assignment Details */}
                <div className="col-12 col-md-6">
                  <div className="p-3 bg-light rounded h-100" style={{ fontSize: "13px" }}>
                    <div className="fw-bold text-dark mb-2 border-bottom pb-1">
                      C. Assignment Details
                    </div>
                    <div><strong>Assigned To:</strong> {viewFollowup.assigned_to || "Unassigned"}</div>
                    <div><strong>Created By:</strong> {viewFollowup.created_by || "Admin"}</div>
                    <div><strong>Reminder:</strong> {viewFollowup.reminder_enabled ? `Enabled (${viewFollowup.reminder_before || "15 mins"})` : "Disabled"}</div>
                    <div>
                      <strong>Next Follow-up:</strong>{" "}
                      {viewFollowup.next_followup_date
                        ? `${formatFollowupDate(viewFollowup.next_followup_date).formatted} ${formatTimeDisplay(viewFollowup.next_followup_time)}`
                        : "None scheduled"}
                    </div>
                  </div>
                </div>

                {/* C. Discussion & Requirements */}
                <div className="col-12">
                  <div className="p-3 bg-light rounded" style={{ fontSize: "13px" }}>
                    <div className="fw-bold text-dark mb-2 border-bottom pb-1">
                      D. Discussion & Requirements
                    </div>
                    <div className="mb-2">
                      <strong>Customer Response:</strong>{" "}
                      <span className="badge bg-white text-dark border">
                        {viewFollowup.customer_response || "Interested"}
                      </span>
                    </div>
                    <div className="mb-2">
                      <strong>Discussion Summary:</strong>
                      <p className="mb-0 text-secondary mt-1">
                        {viewFollowup.discussion_summary || "No discussion summary entered."}
                      </p>
                    </div>
                    <div className="mb-2">
                      <strong>Customer Requirement:</strong>
                      <p className="mb-0 text-secondary mt-1">
                        {viewFollowup.customer_requirement || "No specific requirement entered."}
                      </p>
                    </div>
                    <div className="mb-2">
                      <strong>Next Action:</strong>
                      <p className="mb-0 text-secondary mt-1">
                        {viewFollowup.next_action || "No next action specified."}
                      </p>
                    </div>
                    {viewFollowup.attachment_name && (
                      <div>
                        <strong>Attachment:</strong>{" "}
                        <span className="badge bg-white text-dark border ms-1">
                          <FaPaperclip size={10} className="me-1" />
                          {viewFollowup.attachment_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="d-flex justify-content-between flex-wrap gap-2">
          <Button
            color="primary"
            style={{ borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#2563eb" }}
            onClick={() => {
              const target = viewFollowup;
              setViewFollowup(null);
              handleOpenFollowupModal(target);
            }}
          >
            <FaCalendarPlus size={13} /> Schedule Next Follow-up
          </Button>
          <Button color="secondary" onClick={() => setViewFollowup(null)} style={{ borderRadius: "8px" }}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Schedule Next Follow-up Modal */}
      <Modal
        isOpen={followupModal}
        toggle={() => setFollowupModal(false)}
        centered
        style={{ maxWidth: "520px" }}
      >
        <form onSubmit={handleSaveFollowup}>
          <ModalHeader toggle={() => setFollowupModal(false)} className="border-bottom py-3">
            <div>
              <div className="d-flex align-items-center gap-2">
                <FaCalendarPlus className="text-primary" size={18} />
                <span className="fw-bold text-dark" style={{ fontSize: "16.5px" }}>
                  Schedule Next Follow-up
                </span>
              </div>
              {selectedFollowup && (
                <div className="text-muted fw-normal mt-1" style={{ fontSize: "12px" }}>
                  For: <strong className="text-dark">{selectedFollowup.followup_title}</strong> • Related: {selectedFollowup.related_to || "Lead"} ({selectedFollowup.entity_name || "-"}) {selectedFollowup.mobile_number && `(${selectedFollowup.mobile_number})`}
                </div>
              )}
            </div>
          </ModalHeader>
          <ModalBody className="p-3 p-md-4">
            <div className="row g-3">
              {/* Follow-up Type */}
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: "13px" }}>
                  Follow-up Type
                </label>
                <select
                  className="form-select"
                  style={{ borderRadius: "8px", fontSize: "13px" }}
                  value={followupForm.followup_type}
                  onChange={(e) =>
                    setFollowupForm({ ...followupForm, followup_type: e.target.value })
                  }
                >
                  <option value="Phone Call">Phone Call</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Site Visit">Site Visit</option>
                  <option value="Showroom Demo">Showroom Demo</option>
                </select>
              </div>

              {/* Priority */}
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: "13px" }}>
                  Priority
                </label>
                <select
                  className="form-select"
                  style={{ borderRadius: "8px", fontSize: "13px" }}
                  value={followupForm.priority}
                  onChange={(e) =>
                    setFollowupForm({ ...followupForm, priority: e.target.value })
                  }
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Next Follow-up Date */}
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: "13px" }}>
                  Next Follow-up Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  required
                  style={{ borderRadius: "8px", fontSize: "13px" }}
                  value={followupForm.next_followup_date}
                  onChange={(e) =>
                    setFollowupForm({ ...followupForm, next_followup_date: e.target.value })
                  }
                />
              </div>

              {/* Scheduled Time */}
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: "13px" }}>
                  Scheduled Time
                </label>
                <input
                  type="time"
                  className="form-control"
                  style={{ borderRadius: "8px", fontSize: "13px" }}
                  value={followupForm.scheduled_time}
                  onChange={(e) =>
                    setFollowupForm({ ...followupForm, scheduled_time: e.target.value })
                  }
                />
              </div>

              {/* Today's Discussion / Remarks */}
              <div className="col-12">
                <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: "13px" }}>
                  Today's Discussion / Remarks
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Enter discussion notes or client requirements..."
                  style={{ borderRadius: "8px", fontSize: "13px" }}
                  value={followupForm.discussion_remarks}
                  onChange={(e) =>
                    setFollowupForm({ ...followupForm, discussion_remarks: e.target.value })
                  }
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="border-top py-2 d-flex justify-content-end gap-2">
            <Button
              type="button"
              color="light"
              className="border"
              onClick={() => setFollowupModal(false)}
              disabled={savingFollowup}
              style={{ borderRadius: "8px", fontSize: "13px", padding: "6px 16px" }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              color="primary"
              disabled={savingFollowup}
              style={{
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                padding: "6px 20px",
                backgroundColor: "#2563eb",
                borderColor: "#2563eb"
              }}
            >
              {savingFollowup ? (
                <>
                  <Spinner size="sm" className="me-1" /> Saving...
                </>
              ) : (
                "Save Follow-up"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} toggle={() => setDeleteTarget(null)} centered size="sm">
        <ModalHeader toggle={() => setDeleteTarget(null)}>
          <span className="text-danger fw-bold">Delete Follow-up</span>
        </ModalHeader>
        <ModalBody>
          <p className="text-muted mb-0" style={{ fontSize: "13.5px" }}>
            Are you sure you want to delete follow-up{" "}
            <strong>{deleteTarget?.followup_title}</strong>?
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button color="danger" onClick={handleDelete}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default CrmFollowupsList;
