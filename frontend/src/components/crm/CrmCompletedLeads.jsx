import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaPlus,
  FaSearch,
  FaPhoneAlt,
  FaCalendarAlt,
  FaEye,
  FaTrash,
  FaWhatsapp,
  FaBuilding,
  FaChevronLeft,
  FaChevronRight,
  FaTag,
  FaClock,
  FaSyncAlt,
  FaFilter,
  FaUndo,
  FaEdit,
  FaAward,
  FaChartLine,
  FaRupeeSign,
  FaUndoAlt
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

const CrmCompletedLeads = () => {
  const navigate = useNavigate();

  // State
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateField, setDateField] = useState("expected_closing_date");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [viewLead, setViewLead] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reopenTarget, setReopenTarget] = useState(null);
  const [reopening, setReopening] = useState(false);

  // Fetch Completed Leads from Backend API
  const fetchCompletedLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get("/crm/leads/completed", {
        params: {
          search: search.trim() || undefined,
          priority: priorityFilter !== "All" ? priorityFilter : undefined,
          source: sourceFilter !== "All" ? sourceFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          dateField: dateField || "expected_closing_date",
          page,
          limit
        }
      });

      if (res.data?.success) {
        setLeads(res.data.data || []);
        setTotalCount(res.data.total || (res.data.data ? res.data.data.length : 0));
      }
    } catch (err) {
      console.error("Failed to fetch completed leads:", err);
      toast.error(err.response?.data?.message || "Failed to fetch completed leads from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedLeads();
  }, [search, priorityFilter, sourceFilter, startDate, endDate, dateField, page, limit]);

  // Compute KPI metrics from completed leads
  const { totalRevenue, averageDealValue } = useMemo(() => {
    const rev = leads.reduce((acc, lead) => acc + (parseFloat(lead.expected_budget) || 0), 0);
    const avg = leads.length > 0 ? rev / leads.length : 0;
    return {
      totalRevenue: rev,
      averageDealValue: avg
    };
  }, [leads]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearch("");
    setPriorityFilter("All");
    setSourceFilter("All");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // Reopen Lead (changes status back to "In Negotiation")
  const handleReopen = async () => {
    if (!reopenTarget) return;
    setReopening(true);
    try {
      const res = await api.patch(`/crm/leads/${reopenTarget.id}/status`, {
        lead_status: "In Negotiation"
      });
      if (res.data?.success) {
        toast.success(`Lead "${reopenTarget.lead_title}" reopened successfully!`);
        setReopenTarget(null);
        fetchCompletedLeads();
      }
    } catch (err) {
      console.error("Failed to reopen lead:", err);
      toast.error(err.response?.data?.message || "Failed to reopen lead");
    } finally {
      setReopening(false);
    }
  };

  // Delete Lead
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await api.delete(`/crm/leads/${deleteTarget.id}`);
      if (res.data?.success) {
        toast.success("Completed lead deleted successfully from database!");
        setDeleteTarget(null);
        fetchCompletedLeads();
      }
    } catch (err) {
      console.error("Failed to delete lead:", err);
      toast.error(err.response?.data?.message || "Failed to delete lead");
    }
  };

  // Priority badge helper
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

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="crm-content-scroll" style={{ paddingBottom: "70px" }}>
      {/* Top Header */}
      <div className="crm-contacts-header mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h2 className="crm-page-title d-flex align-items-center gap-2 mb-1">
              <FaAward className="text-success" />
              <span>Completed Leads</span>
            </h2>
            <p className="text-muted mb-0" style={{ fontSize: "13.5px" }}>
              Track successfully won deals, converted customer accounts, and sales achievements.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-light border d-flex align-items-center gap-2"
              onClick={fetchCompletedLeads}
              title="Refresh Completed Leads"
              style={{ borderRadius: "10px", fontSize: "13px", padding: "8px 14px" }}
            >
              <FaSyncAlt size={12} />
              <span className="d-none d-sm-inline">Refresh</span>
            </button>

            <button
              className="crm-btn-primary"
              onClick={() => navigate("/crm/leads/new")}
              style={{ borderRadius: "10px", padding: "8px 18px", fontSize: "13px" }}
            >
              <FaPlus size={11} />
              <span>Add New Lead</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="row g-3 mb-4">
        {/* Metric 1: Total Completed Leads */}
        <div className="col-12 col-md-4">
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
              <div className="text-muted" style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
                Completed Leads
              </div>
              <div className="fw-bold text-dark" style={{ fontSize: "20px" }}>
                {totalCount} <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>Closed Won</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Revenue Won */}
        <div className="col-12 col-md-4">
          <div
            className="crm-card p-3 d-flex align-items-center gap-3"
            style={{
              borderRadius: "14px",
              borderLeft: "4px solid #2563eb",
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
              <FaRupeeSign size={20} />
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
                Total Won Value
              </div>
              <div className="fw-bold text-dark" style={{ fontSize: "20px" }}>
                ₹{totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </div>

        {/* Metric 3: Average Deal Size */}
        <div className="col-12 col-md-4">
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
              <FaChartLine size={20} />
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
                Avg. Deal Size
              </div>
              <div className="fw-bold text-dark" style={{ fontSize: "20px" }}>
                ₹{averageDealValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Show Entries Card */}
      <div className="crm-card p-3 mb-4" style={{ borderRadius: "14px" }}>
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
                placeholder="Search completed leads by title, customer, product, phone, rep..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {/* Row 2: Date Filters & Priority */}
        <div className="row g-2 align-items-end pt-2 border-top">
          {/* Priority */}
          <div className="col-6 col-md-3">
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
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* From Date */}
          <div className="col-6 col-md-3">
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
                setPage(1);
              }}
            />
          </div>

          {/* To Date */}
          <div className="col-6 col-md-3">
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
                setPage(1);
              }}
            />
          </div>

          {/* Reset Filters */}
          <div className="col-12 col-md-3">
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

      {/* Completed Leads Table Card */}
      <div className="crm-card overflow-hidden" style={{ borderRadius: "14px" }}>
        <div className="table-responsive">
          <table className="table align-middle mb-0 crm-table">
            <thead className="bg-light">
              <tr>
                <th style={{ width: "45px" }}>#</th>
                <th>Lead Code & Title</th>
                <th>Customer & Company</th>
                <th>Requirement & Deal Value</th>
                <th>Lead Source</th>
                <th>Status</th>
                <th>Assigned Rep</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <Spinner color="success" size="md" />
                    <div className="text-muted mt-2" style={{ fontSize: "13px" }}>
                      Fetching completed leads from database...
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        backgroundColor: "#ecfdf5",
                        color: "#059669",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 12px auto"
                      }}
                    >
                      <FaAward size={26} />
                    </div>
                    <div className="fw-semibold text-dark mb-1">No completed leads found</div>
                    <p className="text-muted mb-3" style={{ fontSize: "13px" }}>
                      {search || priorityFilter !== "All" || startDate || endDate
                        ? "Try clearing your filters to see all completed deals."
                        : "When leads reach 'Closed Won' or 'Completed' status, they appear here."}
                    </p>
                    {(search || priorityFilter !== "All" || startDate || endDate) && (
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={handleResetFilters}
                        style={{ borderRadius: "8px" }}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                leads.map((lead, idx) => {
                  const priorityStyle = getPriorityBadge(lead.priority);
                  const fullName = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Unnamed Prospect";
                  const closingDate = lead.expected_closing_date ? lead.expected_closing_date.slice(0, 10) : "";

                  return (
                    <tr key={lead.id || idx}>
                      {/* # */}
                      <td className="text-muted" style={{ fontSize: "12px" }}>
                        {(page - 1) * limit + idx + 1}
                      </td>

                      {/* Code & Title */}
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
                          <span className="text-muted" style={{ fontSize: "11px", fontWeight: "600" }}>
                            {lead.lead_code || `ID: ${lead.id}`}
                          </span>
                        </div>
                      </td>

                      {/* Customer & Company */}
                      <td>
                        <div className="fw-medium text-dark">{fullName}</div>
                        {lead.company_name && (
                          <div className="text-muted" style={{ fontSize: "12px" }}>
                            {lead.company_name} {lead.designation && `• ${lead.designation}`}
                          </div>
                        )}
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

                      {/* Requirement & Value */}
                      <td>
                        <div style={{ fontSize: "13px", color: "#1e293b", maxWidth: "240px" }}>
                          {lead.interested_product || "-"}
                        </div>
                        <div className="fw-bold text-success mt-1 d-inline-flex align-items-center" style={{ fontSize: "13px" }}>
                          ₹{Number(lead.expected_budget || 0).toLocaleString("en-IN")}
                        </div>
                      </td>

                      {/* Source */}
                      <td>
                        <div className="text-dark" style={{ fontSize: "12.5px" }}>
                          {lead.lead_source || "Direct"}
                        </div>
                        {closingDate && (
                          <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                            Won: {closingDate}
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td>
                        <span
                          className="crm-status-pill"
                          style={{
                            backgroundColor: "#ecfdf5",
                            color: "#059669",
                            border: "1px solid #a7f3d0",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px"
                          }}
                        >
                          <FaCheckCircle size={10} />
                          <span>{lead.lead_status || "Completed"}</span>
                        </span>
                      </td>

                      {/* Assigned Rep */}
                      <td>
                        <span className="fw-medium text-dark" style={{ fontSize: "12.5px" }}>
                          {lead.assigned_to || "Unassigned"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div className="d-inline-flex align-items-center gap-1">
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
                          <button
                            className="btn btn-sm btn-light border p-1 px-2"
                            onClick={() => setReopenTarget(lead)}
                            title="Re-open Lead (Move to Negotiation)"
                            style={{ borderRadius: "6px" }}
                          >
                            <FaUndoAlt size={11} className="text-warning" />
                          </button>
                          <button
                            className="btn btn-sm btn-light border p-1 px-2"
                            onClick={() => setDeleteTarget(lead)}
                            title="Delete Lead"
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
        {!loading && leads.length > 0 && (
          <div
            className="p-3 bg-white border-top d-flex flex-wrap align-items-center justify-content-between gap-3"
            style={{ fontSize: "13px" }}
          >
            <div className="text-muted">
              Showing{" "}
              <strong>
                {Math.min((page - 1) * limit + 1, totalCount)} - {Math.min(page * limit, totalCount)}
              </strong>{" "}
              of <strong>{totalCount}</strong> completed leads
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

      {/* View Lead Modal */}
      <Modal isOpen={!!viewLead} toggle={() => setViewLead(null)} centered size="lg">
        <ModalHeader toggle={() => setViewLead(null)}>
          <div className="d-flex align-items-center gap-2">
            <FaAward className="text-success" />
            <span className="fw-bold">Completed Lead Summary</span>
            {viewLead && (
              <span className="badge bg-success-subtle text-success border border-success-subtle ms-2">
                {viewLead.lead_code || `ID: ${viewLead.id}`}
              </span>
            )}
          </div>
        </ModalHeader>
        <ModalBody>
          {viewLead && (
            <div className="container-fluid p-0">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="p-3 bg-light rounded" style={{ fontSize: "13px" }}>
                    <div className="fw-bold text-dark mb-2">Customer & Contact Information</div>
                    <div><strong>Title:</strong> {viewLead.lead_title}</div>
                    <div><strong>Prospect:</strong> {viewLead.first_name} {viewLead.last_name || ""}</div>
                    <div><strong>Company:</strong> {viewLead.company_name || "-"}</div>
                    <div><strong>Designation:</strong> {viewLead.designation || "-"}</div>
                    <div><strong>Mobile:</strong> {viewLead.mobile_number || "-"}</div>
                    <div><strong>Email:</strong> {viewLead.email_address || "-"}</div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="p-3 bg-light rounded" style={{ fontSize: "13px" }}>
                    <div className="fw-bold text-dark mb-2">Deal & Revenue Details</div>
                    <div><strong>Source:</strong> {viewLead.lead_source || "-"}</div>
                    <div><strong>Status:</strong> <span className="text-success fw-bold">{viewLead.lead_status}</span></div>
                    <div><strong>Priority:</strong> {viewLead.priority || "Medium"}</div>
                    <div>
                      <strong>Won Value:</strong>{" "}
                      <span className="text-success fw-bold">
                        ₹{Number(viewLead.expected_budget || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div><strong>Closing Date:</strong> {viewLead.expected_closing_date || "-"}</div>
                    <div><strong>Product:</strong> {viewLead.interested_product || "-"}</div>
                  </div>
                </div>

                <div className="col-12">
                  <div className="p-3 bg-light rounded" style={{ fontSize: "13px" }}>
                    <div className="fw-bold text-dark mb-2">Assignment & Completion Notes</div>
                    <div><strong>Assigned Rep:</strong> {viewLead.assigned_to || "Unassigned"}</div>
                    <div className="mt-2"><strong>Notes:</strong> {viewLead.lead_notes || "No notes recorded."}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="d-flex justify-content-between">
          <Button
            color="primary"
            onClick={() => {
              const id = viewLead.id;
              setViewLead(null);
              navigate(`/crm/leads/edit/${id}`);
            }}
            style={{ borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FaEdit size={13} /> Edit Lead
          </Button>
          <Button color="secondary" onClick={() => setViewLead(null)} style={{ borderRadius: "8px" }}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Re-open Lead Modal */}
      <Modal isOpen={!!reopenTarget} toggle={() => setReopenTarget(null)} centered size="sm">
        <ModalHeader toggle={() => setReopenTarget(null)}>
          <span className="text-warning fw-bold">Re-open Lead</span>
        </ModalHeader>
        <ModalBody>
          <p className="text-muted mb-0" style={{ fontSize: "13.5px" }}>
            Re-opening <strong>{reopenTarget?.lead_title}</strong> will move its status back to{" "}
            <strong>In Negotiation</strong> in your active leads pipeline.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setReopenTarget(null)} disabled={reopening}>
            Cancel
          </Button>
          <Button color="warning" onClick={handleReopen} disabled={reopening}>
            {reopening ? "Reopening..." : "Confirm Re-open"}
          </Button>
        </ModalFooter>
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

export default CrmCompletedLeads;

