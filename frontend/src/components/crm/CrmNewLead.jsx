import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaUserFriends
} from "react-icons/fa";
import { Spinner } from "reactstrap";
import { toast } from "react-toastify";
import api from "../../utils/api";

const initialFormState = {
  lead_title: "",
  first_name: "",
  last_name: "",
  company_name: "",
  designation: "",
  mobile_number: "",
  email_address: "",
  whatsapp_number: "",
  website: "",
  lead_source: "Showroom Walk-in",
  lead_status: "New",
  priority: "Medium",
  expected_budget: "",
  expected_closing_date: "",
  interested_product: "",
  assigned_to: "",
  followup_type: "",
  followup_date: "",
  followup_time: "",
  lead_notes: ""
};

const CrmNewLead = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [loadingLead, setLoadingLead] = useState(isEdit);
  const [leadCode, setLeadCode] = useState("");
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

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
        if (isMounted) {
          setLoadingEmployees(false);
        }
      }
    };

    fetchEmployees();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load existing lead if in edit mode
  useEffect(() => {
    if (isEdit) {
      const loadLeadDetails = async () => {
        try {
          setLoadingLead(true);
          const res = await api.get(`/crm/leads/${id}`);
          if (res.data?.data) {
            const d = res.data.data;
            setLeadCode(d.lead_code || "");
            setFormData({
              lead_title: d.lead_title || "",
              first_name: d.first_name || "",
              last_name: d.last_name || "",
              company_name: d.company_name || "",
              designation: d.designation || "",
              mobile_number: d.mobile_number || "",
              email_address: d.email_address || "",
              whatsapp_number: d.whatsapp_number || "",
              website: d.website || "",
              lead_source: d.lead_source || "Showroom Walk-in",
              lead_status: d.lead_status || "New",
              priority: d.priority || "Medium",
              expected_budget: d.expected_budget !== undefined && d.expected_budget !== null ? String(d.expected_budget) : "",
              expected_closing_date: d.expected_closing_date ? String(d.expected_closing_date).slice(0, 10) : "",
              interested_product: d.interested_product || "",
              assigned_to: d.assigned_to || "",
              followup_type: d.followup_type || "",
              followup_date: d.followup_date ? String(d.followup_date).slice(0, 10) : "",
              followup_time: d.followup_time || "",
              lead_notes: d.lead_notes || ""
            });
          }
        } catch (err) {
          console.error("Failed to load lead details:", err);
          toast.error("Failed to load lead details for editing");
          navigate("/crm/leads");
        } finally {
          setLoadingLead(false);
        }
      };
      loadLeadDetails();
    }
  }, [id, isEdit, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.lead_title.trim()) {
      toast.error("Lead Title is required");
      return;
    }
    if (!formData.first_name.trim()) {
      toast.error("First Name is required");
      return;
    }
    if (!formData.mobile_number.trim()) {
      toast.error("Mobile Number is required");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        lead_title: formData.lead_title.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim() || null,
        company_name: formData.company_name.trim() || null,
        designation: formData.designation.trim() || null,
        mobile_number: formData.mobile_number.trim(),
        email_address: formData.email_address.trim() || null,
        whatsapp_number: formData.whatsapp_number.trim() || null,
        website: formData.website.trim() || null,
        lead_source: formData.lead_source || "Showroom Walk-in",
        lead_status: formData.lead_status || "New",
        priority: formData.priority || "Medium",
        expected_budget: formData.expected_budget ? parseFloat(formData.expected_budget) : 0,
        expected_closing_date: formData.expected_closing_date || null,
        interested_product: formData.interested_product.trim() || null,
        assigned_to: formData.assigned_to || null,
        followup_type: formData.followup_type || null,
        followup_date: formData.followup_date || null,
        followup_time: formData.followup_time || null,
        lead_notes: formData.lead_notes || null
      };

      if (isEdit) {
        const res = await api.put(`/crm/leads/${id}`, payload);
        if (res.data?.success) {
          toast.success(res.data.message || "Lead updated successfully!");
          navigate("/crm/leads");
        }
      } else {
        const res = await api.post("/crm/leads", payload);
        if (res.data?.success) {
          toast.success(res.data.message || "Lead created successfully in database!");
          navigate("/crm/leads");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || `Failed to ${isEdit ? "update" : "create"} lead in database`);
    } finally {
      setSubmitting(false);
    }
  };

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
    marginBottom: "16px"
  };

  return (
    <div className="crm-content-scroll" style={{ backgroundColor: "#f8fafc", minHeight: "100%", paddingBottom: "80px" }}>
      {/* Top Header / Back navigation */}
      <div className="mb-3 d-flex align-items-center gap-2">
        <button
          onClick={() => navigate("/crm/leads")}
          className="btn btn-sm btn-light border d-flex align-items-center gap-2 text-dark px-3 py-2"
          style={{ borderRadius: "10px", fontSize: "13px", fontWeight: "600" }}
        >
          <FaArrowLeft size={11} />
          <span>Back to Leads</span>
        </button>
      </div>

      {/* Main Form Container */}
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto 40px auto",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
          padding: "32px 36px 36px 36px"
        }}
      >
        {/* Form Title & Subtitle */}
        <div style={{ marginBottom: "26px", borderBottom: "1px solid #f1f5f9", paddingBottom: "18px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", marginBottom: "6px" }}>
            {isEdit ? (leadCode ? `Edit Lead: ${leadCode}` : "Edit Lead") : "Create New Lead"}
          </h2>
          <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0 }}>
            {isEdit
              ? "Update potential customer details, pipeline stage, and follow-up timeline."
              : "Add and manage your potential customer information."}
          </p>
        </div>

        {loadingLead ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
            <div className="text-muted mt-2" style={{ fontSize: "13px" }}>
              Loading lead details from database...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* SECTION 1: Basic Information */}
            <div style={{ marginBottom: "28px", borderBottom: "1px solid #f1f5f9", paddingBottom: "24px" }}>
              <div style={sectionHeadingStyle}>Basic Information</div>

              <div className="row g-3">
                {/* Lead Title * */}
                <div className="col-12">
                  <label style={labelStyle}>
                    Lead Title <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="lead_title"
                    placeholder="Enter lead title"
                    value={formData.lead_title}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>

                {/* First Name * */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>
                    First Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    placeholder="First name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>

                {/* Last Name */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    placeholder="Last name"
                    value={formData.last_name}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>

                {/* Company Name */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>Company Name</label>
                  <input
                    type="text"
                    name="company_name"
                    placeholder="Company name"
                    value={formData.company_name}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>

                {/* Designation */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>Designation</label>
                  <input
                    type="text"
                    name="designation"
                    placeholder="Job title"
                    value={formData.designation}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: Contact Information */}
            <div style={{ marginBottom: "28px", borderBottom: "1px solid #f1f5f9", paddingBottom: "24px" }}>
              <div style={sectionHeadingStyle}>Contact Information</div>

              <div className="row g-3">
                {/* Mobile Number * */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>
                    Mobile Number <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="mobile_number"
                    placeholder="+91"
                    value={formData.mobile_number}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>

                {/* Email Address */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    name="email_address"
                    placeholder="example@email.com"
                    value={formData.email_address}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>

                {/* WhatsApp Number */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>WhatsApp Number</label>
                  <input
                    type="text"
                    name="whatsapp_number"
                    placeholder="WhatsApp number"
                    value={formData.whatsapp_number}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>

                {/* Website */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>Website</label>
                  <input
                    type="text"
                    name="website"
                    placeholder="Website URL"
                    value={formData.website}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Lead Details */}
            <div style={{ marginBottom: "28px", borderBottom: "1px solid #f1f5f9", paddingBottom: "24px" }}>
              <div style={sectionHeadingStyle}>Lead Details</div>

              <div className="row g-3">
                {/* Lead Source */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>Lead Source</label>
                  <select
                    name="lead_source"
                    value={formData.lead_source}
                    onChange={handleChange}
                    style={selectStyle}
                  >
                    <option value="">Select source</option>
                    <option value="Showroom Walk-in">Showroom Walk-in</option>
                    <option value="Website">Website</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Phone Inquiry">Phone Inquiry</option>
                    <option value="Customer Referral">Customer Referral</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Advertisement">Advertisement</option>
                  </select>
                </div>

                {/* Lead Status */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>Lead Status</label>
                  <select
                    name="lead_status"
                    value={formData.lead_status}
                    onChange={handleChange}
                    style={selectStyle}
                  >
                    <option value="">Select status</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="In Negotiation">In Negotiation</option>
                    <option value="Closed Won">Closed Won</option>
                    <option value="Completed">Completed</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                {/* Priority */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    style={selectStyle}
                  >
                    <option value="">Select priority</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                {/* Expected Budget */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>Expected Budget</label>
                  <input
                    type="text"
                    name="expected_budget"
                    placeholder="₹ Enter amount"
                    value={formData.expected_budget}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>

                {/* Expected Closing Date */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>Expected Closing Date</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="date"
                      name="expected_closing_date"
                      value={formData.expected_closing_date}
                      onChange={handleChange}
                      style={{ ...inputStyle, paddingRight: "40px" }}
                    />
                    <FaCalendarAlt
                      size={14}
                      style={{
                        position: "absolute",
                        right: "16px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
                        pointerEvents: "none"
                      }}
                    />
                  </div>
                </div>

                {/* Interested Product / Service */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>Interested Product / Service</label>
                  <input
                    type="text"
                    name="interested_product"
                    placeholder="Enter requirement"
                    value={formData.interested_product}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: Assignment & Follow-up */}
            <div style={{ marginBottom: "28px" }}>
              <div style={sectionHeadingStyle}>Assignment & Follow-up</div>

              <div className="row g-3">
                {/* Assigned To */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>Assigned To</label>
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
                </div>

                {/* Follow-up Type */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>Follow-up Type</label>
                  <select
                    name="followup_type"
                    value={formData.followup_type}
                    onChange={handleChange}
                    style={selectStyle}
                  >
                    <option value="">Select type</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="Showroom Demo">Showroom Demo</option>
                    <option value="In-person Meeting">In-person Meeting</option>
                    <option value="Email">Email</option>
                    <option value="WhatsApp Chat">WhatsApp Chat</option>
                  </select>
                </div>

                {/* Follow-up Date */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>Follow-up Date</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="date"
                      name="followup_date"
                      value={formData.followup_date}
                      onChange={handleChange}
                      style={{ ...inputStyle, paddingRight: "40px" }}
                    />
                    <FaCalendarAlt
                      size={14}
                      style={{
                        position: "absolute",
                        right: "16px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
                        pointerEvents: "none"
                      }}
                    />
                  </div>
                </div>

                {/* Follow-up Time */}
                <div className="col-12 col-md-6">
                  <label style={labelStyle}>Follow-up Time</label>
                  <input
                    type="time"
                    name="followup_time"
                    placeholder="HH:MM"
                    value={formData.followup_time}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>

                {/* Lead Notes */}
                <div className="col-12">
                  <label style={labelStyle}>Lead Notes</label>
                  <textarea
                    name="lead_notes"
                    rows={4}
                    placeholder="Enter customer requirements and additional notes..."
                    value={formData.lead_notes}
                    onChange={handleChange}
                    style={{
                      ...inputStyle,
                      borderRadius: "14px",
                      resize: "vertical",
                      lineHeight: "1.5"
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Form Actions Footer */}
            <div
              className="d-flex align-items-center justify-content-end gap-3 pt-4 pb-2"
              style={{
                borderTop: "1px solid #f1f5f9",
                marginTop: "24px"
              }}
            >
              <button
                type="button"
                onClick={() => navigate("/crm/leads")}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#475569",
                  borderRadius: "24px",
                  padding: "10px 26px",
                  height: "44px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13.5px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  backgroundColor: "#000000",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: "24px",
                  padding: "10px 32px",
                  height: "44px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  transition: "all 0.2s"
                }}
              >
                {submitting ? "Saving..." : isEdit ? "Update Lead" : "Create Lead"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CrmNewLead;
