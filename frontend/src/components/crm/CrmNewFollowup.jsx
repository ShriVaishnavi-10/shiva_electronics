import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCalendarCheck,
  FaPhoneAlt,
  FaWhatsapp,
  FaEnvelope,
  FaUsers,
  FaMapMarkerAlt,
  FaClock,
  FaBell,
  FaUserTie,
  FaCheckCircle,
  FaBuilding,
  FaTimes
} from "react-icons/fa";
import { toast } from "react-toastify";
import api, { getUser } from "../../utils/api";

const initialFormState = {
  followup_id: "",
  followup_title: "",
  related_to: "Lead",
  entity_id: "",
  entity_name: "",
  company_name: "",
  mobile_number: "",
  followup_type: "Call",
  followup_date: new Date().toISOString().slice(0, 10),
  followup_time: new Date().toTimeString().slice(0, 5),
  duration: 15,
  priority: "Medium",
  followup_status: "Pending",
  discussion_summary: "",
  customer_requirement: "",
  customer_response: "Interested",
  next_action: "",
  attachment_name: "",
  assigned_to: "",
  created_by: "",
  reminder_enabled: true,
  reminder_before: "15 minutes",
  next_followup_date: "",
  next_followup_time: ""
};

const CrmNewFollowup = () => {
  const navigate = useNavigate();
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
  const myName = storedUser.displayName || storedUser.name || storedUser.full_name || storedUser.username || "Me";

  const [formData, setFormData] = useState(() => ({
    ...initialFormState,
    assigned_to: !isAdmin ? myName : ""
  }));
  const [submitting, setSubmitting] = useState(false);

  // Entities and employees data
  const [leadsList, setLeadsList] = useState([]);
  const [contactsList, setContactsList] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingEntities, setLoadingEntities] = useState(false);

  // Auto-generate Follow-up ID on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("crm_followups_data") || "[]");
      const nextId = stored.length + 1001;
      setFormData((prev) => ({
        ...prev,
        followup_id: `FLW-${nextId}`
      }));
    } catch {
      setFormData((prev) => ({
        ...prev,
        followup_id: `FLW-1001`
      }));
    }

    const storedUser = getUser() || JSON.parse(localStorage.getItem("user") || "{}");
    const authorName = storedUser.name || storedUser.username || "CRM Administrator";
    setFormData((prev) => ({
      ...prev,
      created_by: authorName
    }));
  }, []);

  // Fetch leads and contacts for selectable options
  useEffect(() => {
    let isMounted = true;
    const fetchEntities = async () => {
      setLoadingEntities(true);
      try {
        // Fetch leads
        const leadsRes = await api.get("/crm/leads").catch(() => ({ data: { data: [] } }));
        if (isMounted && leadsRes.data?.data) {
          setLeadsList(leadsRes.data.data);
        }
      } catch (err) {
        console.warn("Failed to fetch leads for follow-up:", err);
      }

      try {
        // Fetch contacts / customers
        const custRes = await api.get("/customers").catch(() => ({ data: { data: [] } }));
        if (isMounted && custRes.data?.data) {
          setContactsList(custRes.data.data);
        }
      } catch (err) {
        console.warn("Failed to fetch customers for follow-up:", err);
      } finally {
        if (isMounted) setLoadingEntities(false);
      }
    };

    fetchEntities();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch dynamic employees from backend
  useEffect(() => {
    let isMounted = true;
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const res = await api.get("/crm/leads/employees");
        if (isMounted && res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setEmployees(res.data.data);
          setLoadingEmployees(false);
          return;
        }
      } catch (err) {
        console.warn("Could not load /crm/leads/employees, trying /sales-persons fallback", err);
      }

      // Fallback to /sales-persons
      try {
        const res2 = await api.get("/sales-persons");
        const list = Array.isArray(res2.data?.data) ? res2.data.data : [];
        const active = list
          .filter((sp) => !sp.status || sp.status.toLowerCase() === "active")
          .map((sp) => ({
            id: sp.id,
            name: sp.name,
            code: sp.employee_code,
            type: "sales_person"
          }));
        if (isMounted) {
          setEmployees(active);
        }
      } catch (err2) {
        console.error("Failed to load employees / sales-persons:", err2);
      } finally {
        if (isMounted) setLoadingEmployees(false);
      }
    };

    fetchEmployees();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle generic input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  // Handle Select Lead / Contact selection
  const handleEntitySelect = (e) => {
    const val = e.target.value;
    if (!val) {
      setFormData((prev) => ({
        ...prev,
        entity_id: "",
        entity_name: "",
        company_name: "",
        mobile_number: ""
      }));
      return;
    }

    if (formData.related_to === "Lead") {
      const selected = leadsList.find((l) => String(l.id) === String(val));
      if (selected) {
        const leadName = `${selected.first_name || ""} ${selected.last_name || ""}`.trim() || selected.lead_title;
        setFormData((prev) => ({
          ...prev,
          entity_id: selected.id,
          entity_name: leadName,
          company_name: selected.company_name || "",
          mobile_number: selected.mobile_number || "",
          assigned_to: prev.assigned_to || selected.assigned_to || ""
        }));
      }
    } else {
      // Contact / Company
      const selected = contactsList.find((c) => String(c.id) === String(val));
      if (selected) {
        setFormData((prev) => ({
          ...prev,
          entity_id: selected.id,
          entity_name: selected.customer_name || selected.name || "",
          company_name: selected.company_name || selected.business_name || "",
          mobile_number: selected.mobile_no || selected.contact_no || selected.phone || ""
        }));
      }
    }
  };

  // Form submission with backend database integration
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.followup_title.trim()) {
      toast.error("Please enter a Follow-up Title.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        followup_title: formData.followup_title.trim(),
        related_to: formData.related_to || "Lead",
        entity_id: formData.entity_id || null,
        entity_name: formData.entity_name || null,
        company_name: formData.company_name ? formData.company_name.trim() : null,
        mobile_number: formData.mobile_number ? formData.mobile_number.trim() : null,
        followup_type: formData.followup_type || "Call",
        followup_date: formData.followup_date || null,
        followup_time: formData.followup_time || null,
        duration: formData.duration ? parseInt(formData.duration, 10) : 15,
        priority: formData.priority || "Medium",
        followup_status: formData.followup_status || "Pending",
        discussion_summary: formData.discussion_summary ? formData.discussion_summary.trim() : null,
        customer_requirement: formData.customer_requirement ? formData.customer_requirement.trim() : null,
        customer_response: formData.customer_response || "Interested",
        next_action: formData.next_action ? formData.next_action.trim() : null,
        attachment_name: formData.attachment_name || null,
        assigned_to: formData.assigned_to || null,
        created_by: formData.created_by || "Administrator",
        reminder_enabled: formData.reminder_enabled === true,
        reminder_before: formData.reminder_before || "15 minutes",
        next_followup_date: formData.next_followup_date || null,
        next_followup_time: formData.next_followup_time || null
      };

      const res = await api.post("/crm/followups", payload);
      if (res.data?.success) {
        toast.success(res.data.message || "Follow-up created successfully in database!");
        navigate("/crm/followups");
      }
    } catch (err) {
      console.error("Failed to save follow-up in database:", err);
      toast.error(err.response?.data?.message || "Failed to save follow-up in database.");
    } finally {
      setSubmitting(false);
    }
  };

  // Standard Pill & Form Styles identical to Leads UI
  const inputStyle = {
    borderRadius: "24px",
    padding: "10px 18px",
    fontSize: "13.5px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
    color: "#1e293b",
    outline: "none",
    width: "100%",
    transition: "border-color 0.2s, box-shadow 0.2s"
  };

  const selectStyle = {
    ...inputStyle,
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 16px center",
    backgroundSize: "16px 16px",
    cursor: "pointer"
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155"
  };

  const sectionHeadingStyle = {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  };

  return (
    <div
      className="crm-content-scroll"
      style={{
        backgroundColor: "#f8fafc",
        minHeight: "100%",
        paddingBottom: "100px"
      }}
    >
      {/* Top Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center gap-3">
          <button
            onClick={() => navigate("/crm/followups")}
            className="btn btn-light border d-flex align-items-center justify-content-center"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "#ffffff"
            }}
            title="Back to Follow-ups"
          >
            <FaArrowLeft size={14} color="#334155" />
          </button>
          <div>
            <h4 className="fw-bold mb-1" style={{ color: "#0f172a" }}>
              New Follow-up
            </h4>
            <p className="text-muted mb-0" style={{ fontSize: "13px" }}>
              Schedule, track, and log communication with customers and leads.
            </p>
          </div>
        </div>

        <div className="d-none d-sm-flex align-items-center gap-2">
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-semibold">
            <FaCalendarCheck className="me-1" /> Auto ID: {formData.followup_id}
          </span>
        </div>
      </div>

      {/* Main Form Container */}
      <div
        className="bg-white border shadow-sm p-4 p-md-5"
        style={{
          borderRadius: "16px",
          maxWidth: "960px",
          margin: "0 auto 40px auto"
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* SECTION A: Basic Information */}
          <div className="mb-5">
            <div style={sectionHeadingStyle}>
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: "#e0e7ff",
                  color: "#4338ca",
                  fontSize: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700"
                }}
              >
                A
              </span>
              <span>Basic Information</span>
            </div>

            <div className="row g-3">
              {/* Follow-up ID (Auto-generated) */}
              <div className="col-12 col-md-4">
                <label style={labelStyle}>Follow-up ID</label>
                <input
                  type="text"
                  name="followup_id"
                  value={formData.followup_id}
                  readOnly
                  style={{
                    ...inputStyle,
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    fontWeight: "600",
                    cursor: "not-allowed"
                  }}
                />
              </div>

              {/* Follow-up Title */}
              <div className="col-12 col-md-8">
                <label style={labelStyle}>
                  Follow-up Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="followup_title"
                  value={formData.followup_title}
                  onChange={handleChange}
                  placeholder="e.g., Quotation negotiation, Demo discussion"
                  style={inputStyle}
                  required
                />
              </div>

              {/* Related To */}
              <div className="col-12 col-md-4">
                <label style={labelStyle}>Related To</label>
                <select
                  name="related_to"
                  value={formData.related_to}
                  onChange={(e) => {
                    handleChange(e);
                    // reset selected entity on change
                    setFormData((prev) => ({
                      ...prev,
                      related_to: e.target.value,
                      entity_id: "",
                      entity_name: "",
                      company_name: "",
                      mobile_number: ""
                    }));
                  }}
                  style={selectStyle}
                >
                  <option value="Lead">Lead</option>
                  <option value="Contact">Contact</option>
                  <option value="Company">Company</option>
                </select>
              </div>

              {/* Select Lead / Contact */}
              <div className="col-12 col-md-8">
                <label style={labelStyle}>
                  Select {formData.related_to === "Lead" ? "Lead" : "Contact / Company"}
                </label>
                <select
                  value={formData.entity_id}
                  onChange={handleEntitySelect}
                  style={selectStyle}
                >
                  <option value="">
                    {loadingEntities
                      ? "Loading records..."
                      : `-- Select ${formData.related_to} --`}
                  </option>
                  {formData.related_to === "Lead" ? (
                    leadsList.map((lead) => {
                      const name = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || lead.lead_title;
                      return (
                        <option key={lead.id} value={lead.id}>
                          {name} ({lead.company_name || lead.mobile_number || "Lead"})
                        </option>
                      );
                    })
                  ) : (
                    contactsList.map((cust) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.customer_name || cust.name} ({cust.company_name || cust.mobile_no || "Contact"})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Company Name (Auto-filled) */}
              <div className="col-12 col-md-6">
                <label style={labelStyle}>Company Name</label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="Auto-filled or enter company name"
                  style={inputStyle}
                />
              </div>

              {/* Mobile Number (Auto-filled) */}
              <div className="col-12 col-md-6">
                <label style={labelStyle}>Mobile Number</label>
                <input
                  type="text"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleChange}
                  placeholder="Auto-filled or enter mobile number"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <hr style={{ borderColor: "#f1f5f9", margin: "24px 0" }} />

          {/* SECTION B: Follow-up Activity Details */}
          <div className="mb-5">
            <div style={sectionHeadingStyle}>
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: "#e0e7ff",
                  color: "#4338ca",
                  fontSize: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700"
                }}
              >
                B
              </span>
              <span>Follow-up Activity Details</span>
            </div>

            <div className="row g-3">
              {/* Follow-up Type */}
              <div className="col-12 col-md-4">
                <label style={labelStyle}>Follow-up Type</label>
                <select
                  name="followup_type"
                  value={formData.followup_type}
                  onChange={handleChange}
                  style={selectStyle}
                >
                  <option value="Call">📞 Call</option>
                  <option value="WhatsApp">💬 WhatsApp</option>
                  <option value="Email">✉️ Email</option>
                  <option value="Meeting">🤝 Meeting</option>
                  <option value="Site Visit">📍 Site Visit</option>
                </select>
              </div>

              {/* Follow-up Date */}
              <div className="col-12 col-md-4">
                <label style={labelStyle}>Follow-up Date</label>
                <input
                  type="date"
                  name="followup_date"
                  value={formData.followup_date}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              {/* Follow-up Time */}
              <div className="col-12 col-md-4">
                <label style={labelStyle}>Follow-up Time</label>
                <input
                  type="time"
                  name="followup_time"
                  value={formData.followup_time}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              {/* Duration (Minutes) */}
              <div className="col-12 col-md-4">
                <label style={labelStyle}>Duration (Minutes)</label>
                <input
                  type="number"
                  name="duration"
                  min="1"
                  max="480"
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="e.g. 15"
                  style={inputStyle}
                />
              </div>

              {/* Priority */}
              <div className="col-12 col-md-4">
                <label style={labelStyle}>Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  style={selectStyle}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Follow-up Status */}
              <div className="col-12 col-md-4">
                <label style={labelStyle}>Follow-up Status</label>
                <select
                  name="followup_status"
                  value={formData.followup_status}
                  onChange={handleChange}
                  style={selectStyle}
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Rescheduled">Rescheduled</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          <hr style={{ borderColor: "#f1f5f9", margin: "24px 0" }} />

          {/* SECTION C: Discussion & Requirements */}
          <div className="mb-5">
            <div style={sectionHeadingStyle}>
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: "#e0e7ff",
                  color: "#4338ca",
                  fontSize: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700"
                }}
              >
                C
              </span>
              <span>Discussion & Requirements</span>
            </div>

            <div className="row g-3">
              {/* Discussion Summary */}
              <div className="col-12">
                <label style={labelStyle}>Discussion Summary</label>
                <textarea
                  name="discussion_summary"
                  rows={3}
                  value={formData.discussion_summary}
                  onChange={handleChange}
                  placeholder="Key discussion points, customer feedback, topics covered..."
                  style={{
                    ...inputStyle,
                    borderRadius: "16px",
                    resize: "vertical"
                  }}
                />
              </div>

              {/* Customer Requirement */}
              <div className="col-12">
                <label style={labelStyle}>Customer Requirement</label>
                <textarea
                  name="customer_requirement"
                  rows={2}
                  value={formData.customer_requirement}
                  onChange={handleChange}
                  placeholder="Specific product specifications, quantity required, target budget..."
                  style={{
                    ...inputStyle,
                    borderRadius: "16px",
                    resize: "vertical"
                  }}
                />
              </div>

              {/* Customer Response */}
              <div className="col-12 col-md-6">
                <label style={labelStyle}>Customer Response</label>
                <select
                  name="customer_response"
                  value={formData.customer_response}
                  onChange={handleChange}
                  style={selectStyle}
                >
                  <option value="Interested">Interested</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Need More Time">Need More Time</option>
                </select>
              </div>

              {/* Next Action */}
              <div className="col-12">
                <label style={labelStyle}>Next Action</label>
                <textarea
                  name="next_action"
                  rows={2}
                  value={formData.next_action}
                  onChange={handleChange}
                  placeholder="e.g., Send revised quote by tomorrow 2 PM, arrange on-site demo..."
                  style={{
                    ...inputStyle,
                    borderRadius: "16px",
                    resize: "vertical"
                  }}
                />
              </div>
            </div>
          </div>

          <hr style={{ borderColor: "#f1f5f9", margin: "24px 0" }} />

          {/* SECTION D: Assignment Details */}
          <div className="mb-4">
            <div style={sectionHeadingStyle}>
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: "#e0e7ff",
                  color: "#4338ca",
                  fontSize: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700"
                }}
              >
                D
              </span>
              <span>Assignment Details</span>
            </div>

            <div className="row g-3">
              {/* Assigned To */}
              <div className="col-12 col-md-6">
                  <label style={labelStyle}>Assigned To</label>
                  {isAdmin ? (
                    <select
                      name="assigned_to"
                      value={formData.assigned_to ? formData.assigned_to.replace(/\s*\([^)]*\)/, "").trim() : ""}
                      onChange={handleChange}
                      style={selectStyle}
                    >
                      <option value="">
                        {loadingEmployees ? "Loading sales persons..." : "Select sales person"}
                      </option>
                      {employees.map((emp) => (
                        <option key={emp.id || emp.name} value={emp.name}>
                          {emp.name}
                        </option>
                      ))}
                      {formData.assigned_to &&
                        formData.assigned_to !== "Unassigned" &&
                        !employees.some((e) => e.name === formData.assigned_to) && (
                          <option value={formData.assigned_to}>
                            {formData.assigned_to}
                          </option>
                        )}
                      <option value="Unassigned">Unassigned</option>
                    </select>
                  ) : (
                    <div>
                      <input
                        type="text"
                        className="form-control"
                        disabled
                        readOnly
                        value={formData.assigned_to || myName}
                        style={{ ...selectStyle, backgroundColor: "#f8fafc", color: "#334155" }}
                      />
                      <small className="text-muted" style={{ fontSize: "11px" }}>
                        Assigned to your personal sales workstation.
                      </small>
                    </div>
                  )}
                </div>

              {/* Created By (Auto-filled) */}
              <div className="col-12 col-md-6">
                <label style={labelStyle}>Created By</label>
                <input
                  type="text"
                  name="created_by"
                  value={formData.created_by}
                  readOnly
                  style={{
                    ...inputStyle,
                    backgroundColor: "#f8fafc",
                    color: "#475569",
                    fontWeight: "500",
                    cursor: "not-allowed"
                  }}
                />
              </div>

              {/* Reminder Enable / Disable */}
              <div className="col-12 col-md-6">
                <label style={labelStyle}>Reminder</label>
                <div className="d-flex align-items-center gap-3 mt-1">
                  <label
                    className="d-flex align-items-center gap-2"
                    style={{ fontSize: "13.5px", cursor: "pointer" }}
                  >
                    <input
                      type="radio"
                      name="reminder_enabled"
                      checked={formData.reminder_enabled === true}
                      onChange={() =>
                        setFormData((p) => ({ ...p, reminder_enabled: true }))
                      }
                    />
                    <span>Enable</span>
                  </label>
                  <label
                    className="d-flex align-items-center gap-2"
                    style={{ fontSize: "13.5px", cursor: "pointer" }}
                  >
                    <input
                      type="radio"
                      name="reminder_enabled"
                      checked={formData.reminder_enabled === false}
                      onChange={() =>
                        setFormData((p) => ({ ...p, reminder_enabled: false }))
                      }
                    />
                    <span>Disable</span>
                  </label>
                </div>
              </div>

              {/* Reminder Before */}
              <div className="col-12 col-md-6">
                <label style={labelStyle}>Reminder Before</label>
                <select
                  name="reminder_before"
                  value={formData.reminder_before}
                  onChange={handleChange}
                  disabled={!formData.reminder_enabled}
                  style={{
                    ...selectStyle,
                    opacity: formData.reminder_enabled ? 1 : 0.6,
                    cursor: formData.reminder_enabled ? "pointer" : "not-allowed"
                  }}
                >
                  <option value="At time of follow-up">At time of follow-up</option>
                  <option value="5 minutes">5 minutes</option>
                  <option value="10 minutes">10 minutes</option>
                  <option value="15 minutes">15 minutes</option>
                  <option value="30 minutes">30 minutes</option>
                  <option value="1 hour">1 hour</option>
                  <option value="1 day">1 day</option>
                </select>
              </div>

              {/* Next Follow-up Date */}
              <div className="col-12 col-md-6">
                <label style={labelStyle}>Next Follow-up Date</label>
                <input
                  type="date"
                  name="next_followup_date"
                  value={formData.next_followup_date}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              {/* Next Follow-up Time */}
              <div className="col-12 col-md-6">
                <label style={labelStyle}>Next Follow-up Time</label>
                <input
                  type="time"
                  name="next_followup_time"
                  value={formData.next_followup_time}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div
            className="d-flex align-items-center justify-content-end gap-3 pt-4 border-top"
            style={{ marginTop: "32px" }}
          >
            <button
              type="button"
              onClick={() => navigate("/crm/followups")}
              className="btn btn-light border px-4"
              style={{
                borderRadius: "22px",
                height: "44px",
                fontSize: "13.5px",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-dark px-4"
              style={{
                borderRadius: "22px",
                height: "44px",
                fontSize: "13.5px",
                fontWeight: "600",
                backgroundColor: "#000000",
                borderColor: "#000000",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              {submitting ? "Saving..." : "Create Follow-up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrmNewFollowup;

