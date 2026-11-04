import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarCheck,
  FaCalendarPlus,
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
  FaBell
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
import api from "../../utils/api";

const defaultSampleFollowups = [
  {
    id: 1,
    followup_id: "FLW-1001",
    followup_title: "Commercial Air Conditioners Proposal Discussion",
    related_to: "Lead",
    entity_name: "Karthik Raja",
    company_name: "Apex Retail Solutions",
    mobile_number: "9876543210",
    followup_type: "Call",
    followup_date: new Date().toISOString().slice(0, 10),
    followup_time: "11:30",
    duration: 20,
    priority: "High",
    followup_status: "Pending",
    discussion_summary: "Discussed cooling capacity requirements for 3 commercial branch showrooms.",
    customer_requirement: "12 units 2.0 Ton Inverter Cassette AC with installation warranty.",
    customer_response: "Interested",
    next_action: "Send revised wholesale quotation before Friday.",
    attachment_name: "Specification_Sheet_AC.pdf",
    assigned_to: "Rajesh (SP-002)",
    created_by: "Administrator",
    reminder_enabled: true,
    reminder_before: "15 minutes",
    next_followup_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    next_followup_time: "15:00",
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    followup_id: "FLW-1002",
    followup_title: "Smart TV Bulk Order Requirement WhatsApp Follow-up",
    related_to: "Contact",
    entity_name: "Suresh Kumar",
    company_name: "SK Electronics",
    mobile_number: "9840123456",
    followup_type: "WhatsApp",
    followup_date: new Date().toISOString().slice(0, 10),
    followup_time: "14:15",
    duration: 10,
    priority: "Medium",
    followup_status: "Completed",
    discussion_summary: "Sent product brochure and promotional dealer pricing for 55-inch 4K UHD LED TVs.",
    customer_requirement: "50 Units for festive showroom sale.",
    customer_response: "Interested",
    next_action: "Call procurement manager on Monday.",
    attachment_name: "",
    assigned_to: "Ramesh (SP-001)",
    created_by: "Administrator",
    reminder_enabled: true,
    reminder_before: "30 minutes",
    next_followup_date: "",
    next_followup_time: "",
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 3,
    followup_id: "FLW-1003",
    followup_title: "On-site Factory Facility Visit for Inverter Setup",
    related_to: "Lead",
    entity_name: "Vignesh Murugan",
    company_name: "Murugan Textiles",
    mobile_number: "9443219870",
    followup_type: "Site Visit",
    followup_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    followup_time: "10:00",
    duration: 60,
    priority: "High",
    followup_status: "Pending",
    discussion_summary: "Physical site inspection to verify load distribution and battery backup space.",
    customer_requirement: "15 KVA 3-phase Solar Hybrid Inverter with tubular batteries.",
    customer_response: "Need More Time",
    next_action: "Prepare engineering feasibility report.",
    attachment_name: "Site_Blueprint.jpg",
    assigned_to: "Rajesh (SP-002)",
    created_by: "Administrator",
    reminder_enabled: true,
    reminder_before: "1 day",
    next_followup_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    next_followup_time: "11:00",
    created_at: new Date().toISOString()
  }
];

const CrmFollowupsList = () => {
  const navigate = useNavigate();

  // State
  const [followups, setFollowups] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals
  const [viewFollowup, setViewFollowup] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Load from Backend Database API
  const loadFollowups = async () => {
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
          page,
          limit
        }
      });
      if (res.data?.success) {
        setFollowups(res.data.data || []);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load follow-ups from backend:", err);
      toast.error("Failed to fetch follow-ups from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowups();
  }, [search, statusFilter, typeFilter, priorityFilter, fromDate, toDate, page, limit]);

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
      }
    } catch (err) {
      console.error("Failed to delete follow-up from database:", err);
      toast.error("Failed to delete follow-up from database.");
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
      case "High":
        return { bg: "#fef2f2", color: "#dc2626" };
      case "Medium":
        return { bg: "#fffbeb", color: "#d97706" };
      case "Low":
        return { bg: "#ecfdf5", color: "#059669" };
      default:
        return { bg: "#f1f5f9", color: "#64748b" };
    }
  };

  // Type Icon
  const getTypeIcon = (type) => {
    switch (type) {
      case "Call":
        return <FaPhoneAlt size={12} className="text-primary me-1" />;
      case "WhatsApp":
        return <FaWhatsapp size={13} className="text-success me-1" />;
      case "Email":
        return <FaEnvelope size={12} className="text-warning me-1" />;
      case "Meeting":
        return <FaUsers size={12} className="text-info me-1" />;
      case "Site Visit":
        return <FaMapMarkerAlt size={12} className="text-danger me-1" />;
      default:
        return <FaClock size={12} className="text-muted me-1" />;
    }
  };

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
              Schedule, track, and execute customer communication activities seamlessly.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-light border d-flex align-items-center gap-2"
              onClick={loadFollowups}
              title="Refresh Follow-ups"
              style={{ borderRadius: "10px", fontSize: "13px", padding: "8px 14px" }}
            >
              <FaSyncAlt size={12} />
              <span className="d-none d-sm-inline">Refresh</span>
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

      {/* Filter & Search Card */}
      <div className="crm-card p-3 mb-4" style={{ borderRadius: "14px" }}>
        {/* Row 1: Entries limit + Search */}
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
          {/* Follow-up Status */}
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
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
              <option value="Meeting">Meeting</option>
              <option value="Site Visit">Site Visit</option>
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
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Follow-ups Table Card */}
      <div className="crm-card overflow-hidden" style={{ borderRadius: "14px" }}>
        <div className="table-responsive">
          <table className="table align-middle mb-0 crm-table">
            <thead className="bg-light">
              <tr>
                <th style={{ width: "45px" }}>#</th>
                <th>Follow-up ID & Title</th>
                <th>Related To / Contact</th>
                <th>Activity</th>
                <th>Date & Time</th>
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
                    <div className="fw-semibold text-dark mb-1">No follow-ups found</div>
                    <p className="text-muted mb-3" style={{ fontSize: "13px" }}>
                      {search || statusFilter !== "All" || typeFilter !== "All"
                        ? "Try clearing your filters or search terms."
                        : "Click 'New Follow-up' above to create your first follow-up activity."}
                    </p>
                    {(search || statusFilter !== "All" || typeFilter !== "All") && (
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={handleResetFilters}
                        style={{ borderRadius: "8px" }}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                followups.map((item, idx) => {
                  const statusStyle = getStatusBadge(item.followup_status);
                  const priorityStyle = getPriorityBadge(item.priority);

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
                            {item.priority || "Medium"}
                          </span>
                          <span className="text-muted" style={{ fontSize: "11px", fontWeight: "600" }}>
                            {item.followup_id}
                          </span>
                        </div>
                      </td>

                      {/* Related To / Contact */}
                      <td>
                        <div className="fw-medium text-dark">
                          {item.entity_name || "Direct Prospect"}
                        </div>
                        <div className="text-muted" style={{ fontSize: "12px" }}>
                          <span className="badge bg-light text-dark border me-1" style={{ fontSize: "10px" }}>
                            {item.related_to}
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

                      {/* Activity */}
                      <td>
                        <div className="d-flex align-items-center" style={{ fontSize: "13px", fontWeight: "500" }}>
                          {getTypeIcon(item.followup_type)}
                          <span>{item.followup_type}</span>
                        </div>
                        {item.duration && (
                          <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                            Duration: {item.duration} mins
                          </div>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td>
                        <div className="text-dark" style={{ fontSize: "12.5px", fontWeight: "600" }}>
                          {item.followup_date || "-"}
                        </div>
                        <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                          {item.followup_time || "Anytime"}
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
                            Next: {item.next_followup_date}
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
                          <button
                            className="btn btn-sm btn-light border p-1 px-2"
                            onClick={() => setDeleteTarget(item)}
                            title="Delete Follow-up"
                            style={{ borderRadius: "6px" }}
                          >
                            <FaTrash size={12} className="text-danger" />
                          </button>
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
                {viewFollowup.followup_id}
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
                    <div><strong>Date & Time:</strong> {viewFollowup.followup_date} at {viewFollowup.followup_time || "N/A"}</div>
                    <div><strong>Duration:</strong> {viewFollowup.duration ? `${viewFollowup.duration} minutes` : "-"}</div>
                    <div><strong>Priority:</strong> {viewFollowup.priority}</div>
                    <div><strong>Status:</strong> {viewFollowup.followup_status}</div>
                  </div>
                </div>

                {/* D. Assignment Details */}
                <div className="col-12 col-md-6">
                  <div className="p-3 bg-light rounded h-100" style={{ fontSize: "13px" }}>
                    <div className="fw-bold text-dark mb-2 border-bottom pb-1">
                      D. Assignment Details
                    </div>
                    <div><strong>Assigned To:</strong> {viewFollowup.assigned_to || "Unassigned"}</div>
                    <div><strong>Created By:</strong> {viewFollowup.created_by || "Admin"}</div>
                    <div><strong>Reminder:</strong> {viewFollowup.reminder_enabled ? `Enabled (${viewFollowup.reminder_before || "15 mins"})` : "Disabled"}</div>
                    <div>
                      <strong>Next Follow-up:</strong>{" "}
                      {viewFollowup.next_followup_date
                        ? `${viewFollowup.next_followup_date} ${viewFollowup.next_followup_time || ""}`
                        : "None scheduled"}
                    </div>
                  </div>
                </div>

                {/* C. Discussion & Requirements */}
                <div className="col-12">
                  <div className="p-3 bg-light rounded" style={{ fontSize: "13px" }}>
                    <div className="fw-bold text-dark mb-2 border-bottom pb-1">
                      C. Discussion & Requirements
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
                  For: <strong className="text-dark">{selectedFollowup.followup_title}</strong> • Related: {selectedFollowup.related_to} ({selectedFollowup.entity_name || "-"}) {selectedFollowup.mobile_number && `(${selectedFollowup.mobile_number})`}
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

