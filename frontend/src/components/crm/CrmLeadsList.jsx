import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FaUserFriends,
  FaPlus,
  FaSearch,
  FaPhoneAlt,
  FaCalendarAlt,
  FaCalendarPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaWhatsapp,
  FaBuilding,
  FaChevronLeft,
  FaChevronRight,
  FaTag,
  FaClock,
  FaSyncAlt,
  FaFilter,
  FaUndo
} from "react-icons/fa";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Badge,
  Input
} from "reactstrap";
import { toast } from "react-toastify";
import api from "../../utils/api";
import { Spinner } from "reactstrap";

const CrmLeadsList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const roleLower = String(storedUser.role_name || storedUser.role || "").toLowerCase();
  const isAdmin = roleLower.includes("admin") || roleLower.includes("super admin") || storedUser.id === 1;
  const isSalesStaff = !isAdmin;

  const initialAssigned = searchParams.get("assigned_to") || (isSalesStaff ? "me" : "All");
  const [assignedFilter, setAssignedFilter] = useState(initialAssigned);
  const [myAllocatedCount, setMyAllocatedCount] = useState(0);
  const [employees, setEmployees] = useState([]);

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  // Date Filtering State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateField, setDateField] = useState("created_at");

  // Modals
  const [viewLead, setViewLead] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Schedule Next Follow-up Modal State
  const [followupModal, setFollowupModal] = useState(false);
  const [followupLead, setFollowupLead] = useState(null);
  const [followupForm, setFollowupForm] = useState({
    followup_type: "Phone Call",
    priority: "Medium",
    next_followup_date: "",
    scheduled_time: "",
    discussion_remarks: ""
  });
  const [savingFollowup, setSavingFollowup] = useState(false);

  useEffect(() => {
    api.get("/crm/leads/employees")
      .then(res => setEmployees(res.data?.data || []))
      .catch(() => {});
  }, []);

  // Pagination & Show Entries
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Dynamic Fetch Leads from Backend Database
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get("/crm/leads", {
        params: {
          search: debouncedSearch,
          status: statusFilter,
          priority: priorityFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          dateField,
          assigned_to: assignedFilter !== "All" ? assignedFilter : undefined,
          page,
          limit
        }
      });
      if (res.data) {
        setLeads(res.data.data || []);
        setTotal(res.data.total || 0);
        if (res.data.myAllocatedCount !== undefined) {
          setMyAllocatedCount(res.data.myAllocatedCount);
        }
      }
    } catch (err) {
      console.error("Failed to fetch leads from backend:", err);
      toast.error(err.response?.data?.message || "Failed to load leads from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [debouncedSearch, statusFilter, priorityFilter, startDate, endDate, dateField, assignedFilter, page, limit]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setStartDate("");
    setEndDate("");
    setDateField("created_at");
    setAssignedFilter(isSalesStaff ? "me" : "All");
    setPage(1);
    toast.info("Filters reset");
  };

  const isFilterActive =
    search ||
    statusFilter !== "All" ||
    priorityFilter !== "All" ||
    startDate ||
    endDate ||
    (!isSalesStaff && assignedFilter !== "All");

  const totalPages = Math.ceil(total / limit) || 1;
  const paginatedLeads = leads;

  const handleOpenFollowupModal = (lead) => {
    setFollowupLead(lead);

    setFollowupForm({
      followup_type: "Phone Call",
      priority: lead?.priority || "Medium",
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
    setSavingFollowup(true);
    try {
      const res = await api.post(`/crm/leads/${followupLead.id}/next-followup`, followupForm);
      if (res.data?.success) {
        toast.success("Next follow-up scheduled successfully!");
        setFollowupModal(false);
        fetchLeads();
      } else {
        toast.error(res.data?.message || "Failed to schedule follow-up");
      }
    } catch (err) {
      console.error("Failed to schedule next follow-up:", err);
      toast.error(err.response?.data?.message || "Failed to schedule follow-up");
    } finally {
      setSavingFollowup(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/crm/leads/${deleteTarget.id}`);
      toast.success("Lead removed successfully from database!");
      setDeleteTarget(null);
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete lead");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "New":
        return { bg: "#dbeafe", color: "#1d4ed8" };
      case "Contacted":
        return { bg: "#e0e7ff", color: "#4338ca" };
      case "Qualified":
        return { bg: "#fef3c7", color: "#b45309" };
      case "Proposal Sent":
        return { bg: "#ede9fe", color: "#6d28d9" };
      case "In Negotiation":
        return { bg: "#ffedd5", color: "#c2410c" };
      case "Closed Won":
        return { bg: "#d1fae5", color: "#047857" };
      case "Lost":
        return { bg: "#fee2e2", color: "#b91c1c" };
      default:
        return { bg: "#f1f5f9", color: "#475569" };
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "Urgent":
        return { bg: "#fee2e2", color: "#b91c1c" };
      case "High":
        return { bg: "#ffedd5", color: "#c2410c" };
      case "Medium":
        return { bg: "#fef3c7", color: "#b45309" };
      case "Low":
        return { bg: "#f1f5f9", color: "#475569" };
      default:
        return { bg: "#f1f5f9", color: "#475569" };
    }
  };

  return (
    <div className="crm-content-scroll" style={{ paddingBottom: "60px" }}>
      {/* Top Header */}
      <div className="crm-contacts-header mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h2 className="crm-page-title d-flex align-items-center gap-2 mb-1">
              <FaUserFriends className="text-primary" />
              <span>Leads Management</span>
            </h2>
            <p className="text-muted mb-0" style={{ fontSize: "13.5px" }}>
              Track and manage all customer inquiries, sales opportunities, and assignments.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-light border d-flex align-items-center gap-2"
              onClick={fetchLeads}
              title="Refresh Leads"
              style={{ borderRadius: "10px", fontSize: "13px", padding: "8px 14px" }}
            >
              <FaSyncAlt size={12} />
              <span className="d-none d-sm-inline">Refresh</span>
            </button>

            {/* Add Lead Button -> Navigates to the new lead page */}
            <button
              className="crm-btn-primary"
              onClick={() => navigate("/crm/leads/new")}
              style={{ borderRadius: "10px", padding: "8px 18px", fontSize: "13px" }}
            >
              <FaPlus size={11} />
              <span>Add Lead</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Show Entries Card */}
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
                All Leads ({total})
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
                ★ My Allocated Leads {myAllocatedCount > 0 ? `(${myAllocatedCount})` : ""}
              </button>
              <button
                onClick={() => {
                  setAssignedFilter("unassigned");
                  setPage(1);
                }}
                className={`btn btn-sm ${assignedFilter === "unassigned" ? "btn-warning fw-bold text-dark shadow-sm" : "btn-light border text-muted"}`}
                style={{ borderRadius: "20px", fontSize: "12px", padding: "5px 14px" }}
              >
                Unassigned Leads
              </button>
            </div>

            {/* Assigned Salesperson Dropdown */}
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted fw-semibold" style={{ fontSize: "12px", whiteSpace: "nowrap" }}>Filter By Salesperson:</span>
              <select
                className="form-select form-select-sm"
                style={{ borderRadius: "8px", fontSize: "12px", minWidth: "180px" }}
                value={assignedFilter}
                onChange={(e) => {
                  setAssignedFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="All">All Representatives</option>
                <option value="me">★ Assigned to Me ({storedUser.name || storedUser.username || "My Leads"})</option>
                <option value="unassigned">Unassigned Leads</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name} ({emp.employee_code || "Sales"})
                  </option>
                ))}
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
                ★ My Assigned Leads ({total})
              </span>
              <span className="text-muted" style={{ fontSize: "12.5px" }}>
                Only leads assigned to you by Admin are visible.
              </span>
            </div>
            <div className="badge bg-light text-dark border px-3 py-2" style={{ fontSize: "12px" }}>
              Representative: <strong>{storedUser.displayName || storedUser.name || storedUser.username}</strong>
            </div>
          </div>
        )}

        {/* Row 1: Search & Show Entries Dropdown */}
        <div className="row g-2 align-items-center mb-3">
          {/* Show Entries Dropdown */}
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

          {/* Search Input */}
          <div className="col-12 col-sm-6 col-md-8">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0" style={{ borderRadius: "10px 0 0 10px" }}>
                <FaSearch className="text-muted" size={13} />
              </span>
              <Input
                type="text"
                className="border-start-0"
                style={{ borderRadius: "0 10px 10px 0", fontSize: "13px" }}
                placeholder="Search by title, prospect, company, product, or mobile..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {/* Row 2: Date Filtering & Categorical Filters */}
        <div className="row g-2 align-items-center pt-2 border-top">
          {/* Date Field Type Selector */}
          <div className="col-12 col-sm-6 col-md-3">
            <div className="d-flex align-items-center gap-1">
              <span className="text-muted" style={{ fontSize: "12px", whiteSpace: "nowrap" }}>Date By:</span>
              <select
                className="form-select form-select-sm"
                style={{ borderRadius: "8px", fontSize: "12.5px" }}
                value={dateField}
                onChange={(e) => {
                  setDateField(e.target.value);
                  setPage(1);
                }}
              >
                <option value="created_at">Creation Date</option>
                <option value="followup_date">Follow-up Date</option>
                <option value="expected_closing_date">Closing Date</option>
              </select>
            </div>
          </div>

          {/* From Date */}
          <div className="col-6 col-sm-3 col-md-2">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0 text-muted" style={{ fontSize: "11.5px" }}>
                From
              </span>
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ borderRadius: "0 8px 8px 0", fontSize: "12px" }}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* To Date */}
          <div className="col-6 col-sm-3 col-md-2">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0 text-muted" style={{ fontSize: "11.5px" }}>
                To
              </span>
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ borderRadius: "0 8px 8px 0", fontSize: "12px" }}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="col-6 col-md-2">
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
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="In Negotiation">In Negotiation</option>
              <option value="Closed Won">Closed Won</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="col-6 col-md-2">
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
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {isFilterActive && (
            <div className="col-12 col-md-1 text-md-end">
              <button
                className="btn btn-sm btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-1"
                onClick={handleResetFilters}
                title="Reset all filters"
                style={{ borderRadius: "8px", fontSize: "11.5px", padding: "5px 8px" }}
              >
                <FaUndo size={10} />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="crm-card p-0 overflow-hidden mb-4" style={{ borderRadius: "16px" }}>
        <div className="table-responsive">
          <table className="crm-table mb-0">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>#</th>
                <th>Lead Info</th>
                <th>Prospect Details</th>
                <th>Requirement & Budget</th>
                <th>Source & Type</th>
                <th>Status</th>
                <th>Assigned Rep</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <Spinner color="primary" size="md" />
                    <div className="text-muted mt-2" style={{ fontSize: "13px" }}>
                      Fetching leads dynamically from database...
                    </div>
                  </td>
                </tr>
              ) : paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        background: "#eff6ff",
                        color: "#2563eb",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                        marginBottom: "12px"
                      }}
                    >
                      <FaUserFriends />
                    </div>
                    <div className="fw-bold text-dark fs-6 mb-1">No Leads Found</div>
                    <p className="text-muted mb-3" style={{ fontSize: "13px" }}>
                      {isFilterActive
                        ? "No leads match the specified filter or date criteria."
                        : "You haven't added any leads yet."}
                    </p>
                    {isFilterActive ? (
                      <button className="btn btn-sm btn-outline-secondary" onClick={handleResetFilters}>
                        Reset Filters
                      </button>
                    ) : (
                      <button
                        className="crm-btn-primary mx-auto"
                        onClick={() => navigate("/crm/leads/new")}
                      >
                        <FaPlus size={11} />
                        <span>Create New Lead</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead, idx) => {
                  const statusStyle = getStatusBadge(lead.lead_status);
                  const priorityStyle = getPriorityBadge(lead.priority);
                  const fullName = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Unnamed Prospect";
                  const createdDate = lead.created_at ? lead.created_at.slice(0, 10) : "";

                  return (
                    <tr key={lead.id || idx}>
                      <td className="text-muted" style={{ fontSize: "12px" }}>
                        {(page - 1) * limit + idx + 1}
                      </td>
                      <td>
                        <div className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                          {lead.lead_title}
                        </div>
                        <div className="d-flex align-items-center gap-2 mt-1">
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
                            {lead.priority || "Medium"}
                          </span>
                          <span className="text-muted" style={{ fontSize: "11px" }}>
                            ID: {lead.id}
                          </span>
                          {createdDate && (
                            <span className="text-muted" style={{ fontSize: "11px" }}>
                              • {createdDate}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="fw-medium text-dark">{fullName}</div>
                        {(lead.city || lead.address) ? (
                          <div className="text-muted" style={{ fontSize: "11.5px" }}>
                            📍 {lead.city || ""}{lead.state ? (lead.city ? `, ${lead.state}` : lead.state) : ""}{lead.pincode ? ` - ${lead.pincode}` : ""}
                          </div>
                        ) : lead.company_name ? (
                          <div className="text-muted" style={{ fontSize: "12px" }}>
                            {lead.company_name} {lead.designation && `• ${lead.designation}`}
                          </div>
                        ) : null}
                        <div className="d-flex align-items-center gap-2 text-muted mt-1" style={{ fontSize: "11.5px" }}>
                          <FaPhoneAlt size={10} />
                          <span>{lead.mobile_number || "-"}</span>
                          {lead.mobile_number && (
                            <a
                              href={`https://wa.me/91${lead.mobile_number.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-success ms-1"
                              title="WhatsApp"
                            >
                              <FaWhatsapp size={13} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "13px", color: "#1e293b", maxWidth: "220px" }}>
                          {lead.interested_product || "-"}
                        </div>
                        {lead.expected_budget && (
                          <div className="fw-bold text-dark mt-1" style={{ fontSize: "12.5px" }}>
                            ₹{Number(lead.expected_budget).toLocaleString("en-IN")}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="text-dark" style={{ fontSize: "12.5px" }}>
                          {lead.lead_source || "Direct"}
                        </div>
                        <span className="badge bg-light text-secondary border mt-1" style={{ fontSize: "10.5px" }}>
                          {lead.lead_type || "Standard"}
                        </span>
                      </td>
                      <td>
                        <span
                          className="crm-status-pill"
                          style={{
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                            fontWeight: "700"
                          }}
                        >
                          {lead.lead_status || "New"}
                        </span>
                      </td>
                      <td>
                        <span className="fw-medium text-dark" style={{ fontSize: "12.5px" }}>
                          {lead.assigned_to || "Unassigned"}
                        </span>
                        {lead.followup_date && (
                          <div className="text-muted mt-1 d-flex align-items-center gap-1" style={{ fontSize: "11px" }}>
                            <FaCalendarAlt size={10} />
                            <span>{lead.followup_date}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="d-inline-flex align-items-center gap-1">
                          <button
                            className="btn btn-sm border p-1 px-2 text-primary"
                            onClick={() => handleOpenFollowupModal(lead)}
                            title="Schedule Next Follow-up"
                            style={{ borderRadius: "6px", backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }}
                          >
                            <FaCalendarPlus size={12} className="text-primary" />
                          </button>
                          <button
                            className="btn btn-sm btn-light border p-1 px-2"
                            onClick={() => setViewLead(lead)}
                            title="View Lead Details"
                            style={{ borderRadius: "6px" }}
                          >
                            <FaEye size={12} className="text-info" />
                          </button>
                          <button
                            className="btn btn-sm btn-light border p-1 px-2"
                            onClick={() => navigate(`/crm/leads/edit/${lead.id}`)}
                            title="Edit Lead"
                            style={{ borderRadius: "6px" }}
                          >
                            <FaEdit size={12} className="text-primary" />
                          </button>
                          {isAdmin && (
                            <button
                              className="btn btn-sm btn-light border p-1 px-2"
                              onClick={() => setDeleteTarget(lead)}
                              title="Delete Lead"
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

        {/* Pagination Footer - Show entries summary & pagination controls */}
        {!loading && leads.length > 0 && (
          <div className="d-flex flex-wrap align-items-center justify-content-between p-3 border-top gap-2 bg-light bg-opacity-50">
            <div className="text-muted" style={{ fontSize: "12.5px" }}>
              Showing <strong>{(page - 1) * limit + 1}</strong> to{" "}
              <strong>{Math.min(page * limit, total)}</strong> of{" "}
              <strong>{total}</strong> entries
            </div>

            <div className="d-flex align-items-center gap-1">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ borderRadius: "6px", fontSize: "12px" }}
              >
                <FaChevronLeft size={10} /> Prev
              </button>

              <span className="px-2 text-dark fw-bold" style={{ fontSize: "12.5px" }}>
                {page} / {totalPages}
              </span>

              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ borderRadius: "6px", fontSize: "12px" }}
              >
                Next <FaChevronRight size={10} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Lead Details Modal */}
      <Modal isOpen={!!viewLead} toggle={() => setViewLead(null)} size="lg" centered>
        <ModalHeader toggle={() => setViewLead(null)}>
          <span className="fw-bold text-dark">Lead Information: {viewLead?.lead_title}</span>
        </ModalHeader>
        <ModalBody>
          {viewLead && (
            <div className="p-2">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="p-3 bg-light rounded" style={{ fontSize: "13px" }}>
                    <div className="fw-bold text-dark mb-2">Basic & Prospect Info</div>
                    <div><strong>Title:</strong> {viewLead.lead_title}</div>
                    <div><strong>Type:</strong> {viewLead.lead_type || "-"}</div>
                    <div><strong>Prospect:</strong> {viewLead.first_name} {viewLead.last_name || ""}</div>
                    {viewLead.company_name && <div><strong>Company:</strong> {viewLead.company_name}</div>}
                    {viewLead.designation && <div><strong>Designation:</strong> {viewLead.designation}</div>}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="p-3 bg-light rounded" style={{ fontSize: "13px" }}>
                    <div className="fw-bold text-dark mb-2">Contact Details</div>
                    <div><strong>Mobile:</strong> {viewLead.mobile_number}</div>
                    <div><strong>WhatsApp:</strong> {viewLead.whatsapp_number || "-"}</div>
                    <div><strong>Email:</strong> {viewLead.email_address || "-"}</div>
                    {viewLead.website && <div><strong>Website:</strong> {viewLead.website}</div>}
                  </div>
                </div>

                {/* Address Information */}
                {(viewLead.address || viewLead.city || viewLead.state || viewLead.pincode) && (
                  <div className="col-12">
                    <div className="p-3 bg-light rounded" style={{ fontSize: "13px" }}>
                      <div className="fw-bold text-dark mb-2">Address Information</div>
                      {viewLead.address && <div><strong>Street Address:</strong> {viewLead.address}</div>}
                      <div className="row mt-1">
                        <div className="col-12 col-md-4"><strong>City:</strong> {viewLead.city || "-"}</div>
                        <div className="col-12 col-md-4"><strong>State:</strong> {viewLead.state || "-"}</div>
                        <div className="col-12 col-md-4"><strong>Pincode:</strong> {viewLead.pincode || "-"}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="col-12 col-md-6">
                  <div className="p-3 bg-light rounded" style={{ fontSize: "13px" }}>
                    <div className="fw-bold text-dark mb-2">Lead Stage & Requirement</div>
                    <div><strong>Source:</strong> {viewLead.lead_source || "-"}</div>
                    <div><strong>Status:</strong> {viewLead.lead_status || "New"}</div>
                    <div><strong>Priority:</strong> {viewLead.priority || "Medium"}</div>
                    <div><strong>Budget:</strong> ₹{viewLead.expected_budget || "0"}</div>
                    <div><strong>Closing Date:</strong> {viewLead.expected_closing_date || "-"}</div>
                    <div><strong>Product:</strong> {viewLead.interested_product || "-"}</div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="p-3 bg-light rounded" style={{ fontSize: "13px" }}>
                    <div className="fw-bold text-dark mb-2">Follow-up & Assignment</div>
                    <div><strong>Assigned To:</strong> {viewLead.assigned_to || "Unassigned"}</div>
                    <div><strong>Follow-up Type:</strong> {viewLead.followup_type || "-"}</div>
                    <div><strong>Date & Time:</strong> {viewLead.followup_date || "-"} {viewLead.followup_time || ""}</div>
                    <div className="mt-2"><strong>Notes:</strong> {viewLead.lead_notes || "No notes entered."}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="d-flex justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <Button
              color="primary"
              style={{ borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#2563eb" }}
              onClick={() => {
                const targetLead = viewLead;
                setViewLead(null);
                handleOpenFollowupModal(targetLead);
              }}
            >
              <FaCalendarPlus size={13} /> Schedule Next Follow-up
            </Button>
            <Button
              color="outline-primary"
              onClick={() => {
                const id = viewLead.id;
                setViewLead(null);
                navigate(`/crm/leads/edit/${id}`);
              }}
              style={{ borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <FaEdit size={13} /> Edit Lead
            </Button>
          </div>
          <Button color="secondary" onClick={() => setViewLead(null)} style={{ borderRadius: "8px" }}>
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
              {followupLead && (
                <div className="text-muted fw-normal mt-1" style={{ fontSize: "12px" }}>
                  Lead: <strong className="text-dark">{followupLead.lead_title}</strong> • Prospect: {followupLead.first_name} {followupLead.last_name || ""} {followupLead.mobile_number && `(${followupLead.mobile_number})`}
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

      {/* Delete Lead Modal */}
      <Modal isOpen={!!deleteTarget} toggle={() => setDeleteTarget(null)} centered size="sm">
        <ModalHeader toggle={() => setDeleteTarget(null)}>
          <span className="text-danger fw-bold">Delete Lead</span>
        </ModalHeader>
        <ModalBody>
          <p className="text-muted mb-0" style={{ fontSize: "13.5px" }}>
            Are you sure you want to delete lead <strong>{deleteTarget?.lead_title}</strong>?
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="danger" onClick={handleDelete}>Delete</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default CrmLeadsList;
