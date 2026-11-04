import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Row,
  Col,
  FormGroup,
  Label,
  Badge,
  Spinner
} from "reactstrap";
import {
  FaAddressBook,
  FaPlus,
  FaSearch,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaEye,
  FaEdit,
  FaTrash,
  FaSyncAlt,
  FaWhatsapp,
  FaIdCard,
  FaBuilding,
  FaChevronLeft,
  FaChevronRight,
  FaUser,
  FaMoneyBillWave,
  FaHistory,
  FaShoppingCart,
  FaFileInvoiceDollar,
  FaCalendarCheck,
  FaBullseye,
  FaCheckCircle,
  FaClock,
  FaCommentDots,
  FaUserCheck,
  FaExternalLinkAlt,
  FaFilter,
  FaFileAlt
} from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../../utils/api";

const initialContactState = {
  customer_name: "",
  contact_no: "",
  alternate_no: "",
  gst_no: "",
  pincode: "",
  address: "",
  address2: "",
  city: "",
  state: "Tamil Nadu",
  country: "India",
  opening_balance: ""
};

const CrmContacts = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals state
  const [createModal, setCreateModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState("all");
  const [activeContact, setActiveContact] = useState(null);
  const [formData, setFormData] = useState(initialContactState);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch contacts dynamically from backend
  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/customers", {
        params: {
          page,
          limit,
          search: debouncedSearch
        }
      });

      if (res.data) {
        setContacts(res.data.data || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch CRM contacts:", err);
      toast.error(err.response?.data?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData(initialContactState);
    setIsEditing(false);
    setCreateModal(true);
  };

  // Open Customer 360° History
  const handleOpenHistory = async (contact) => {
    setActiveContact(contact);
    setHistoryModal(true);
    setLoadingHistory(true);
    setHistoryTab("all");
    try {
      const res = await api.get(`/customers/${contact.id}/history`);
      if (res.data?.success) {
        setHistoryData(res.data.data);
      } else {
        toast.error("Failed to load customer history");
      }
    } catch (err) {
      console.error("Failed to load customer history:", err);
      toast.error(err.response?.data?.message || "Failed to load customer history");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (contact) => {
    setActiveContact(contact);
    setFormData({
      customer_name: contact.customer_name || contact.name || "",
      contact_no: contact.contact_no || contact.phone || "",
      alternate_no: contact.alternate_no || "",
      gst_no: contact.gst_no || "",
      pincode: contact.pincode || "",
      address: contact.address || "",
      address2: contact.address2 || "",
      city: contact.city || "",
      state: contact.state || "Tamil Nadu",
      country: contact.country || "India",
      opening_balance: contact.opening_balance ?? ""
    });
    setIsEditing(true);
    setCreateModal(true);
  };

  // Open View Modal
  const handleOpenView = (contact) => {
    setActiveContact(contact);
    setViewModal(true);
  };

  // Open Delete Confirmation
  const handleOpenDelete = (contact) => {
    setActiveContact(contact);
    setDeleteModal(true);
  };

  // Form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Form Validation
  const validateForm = () => {
    if (!formData.customer_name.trim()) {
      toast.error("Contact name is required");
      return false;
    }
    const cleanPhone = formData.contact_no.trim();
    if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return false;
    }
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode.trim())) {
      toast.error("Pincode must be 6 digits");
      return false;
    }
    if (formData.gst_no && !/^[A-Za-z0-9]{1,15}$/.test(formData.gst_no.trim())) {
      toast.error("GST number should be alphanumeric and up to 15 characters");
      return false;
    }
    return true;
  };

  // Submit Create or Edit
  const handleSubmitContact = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      if (isEditing && activeContact) {
        await api.put(`/customers/${activeContact.id}`, {
          customer_name: formData.customer_name.trim(),
          contact_no: formData.contact_no.trim(),
          alternate_no: formData.alternate_no.trim() || null,
          gst_no: formData.gst_no.trim() || null,
          pincode: formData.pincode.trim() || null,
          address: formData.address.trim() || null,
          address2: formData.address2.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || "Tamil Nadu",
          country: formData.country.trim() || "India",
          opening_balance: parseFloat(formData.opening_balance) || 0
        });
        toast.success("Contact updated successfully!");
      } else {
        await api.post("/customers", {
          customer_name: formData.customer_name.trim(),
          contact_no: formData.contact_no.trim(),
          alternate_no: formData.alternate_no.trim() || null,
          gst_no: formData.gst_no.trim() || null,
          pincode: formData.pincode.trim() || null,
          address: formData.address.trim() || null,
          address2: formData.address2.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || "Tamil Nadu",
          country: formData.country.trim() || "India",
          opening_balance: parseFloat(formData.opening_balance) || 0
        });
        toast.success("Contact created successfully!");
      }
      setCreateModal(false);
      fetchContacts();
    } catch (err) {
      console.error("Error saving contact:", err);
      toast.error(err.response?.data?.message || "Failed to save contact");
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete Contact
  const handleConfirmDelete = async () => {
    if (!activeContact) return;
    try {
      setSubmitting(true);
      await api.delete(`/customers/${activeContact.id}`);
      toast.success("Contact deleted successfully!");
      setDeleteModal(false);
      fetchContacts();
    } catch (err) {
      console.error("Error deleting contact:", err);
      toast.error(err.response?.data?.message || "Failed to delete contact");
    } finally {
      setSubmitting(false);
    }
  };

  // Pagination calculation
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="crm-content-scroll">
      {/* Top Header & Actions */}
      <div className="crm-contacts-header mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h2 className="crm-page-title d-flex align-items-center gap-2 mb-1">
              <FaAddressBook className="text-primary" />
              <span>Contacts</span>
            </h2>
            <p className="text-muted mb-0" style={{ fontSize: "13.5px" }}>
              Dynamic customer directory fetched directly from the backend. Manage, search, and create customer contacts.
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-light border d-flex align-items-center gap-2"
              onClick={fetchContacts}
              disabled={loading}
              title="Refresh Contacts"
              style={{ borderRadius: "10px", fontSize: "13px", padding: "8px 14px" }}
            >
              <FaSyncAlt className={loading ? "fa-spin" : ""} size={12} />
              <span className="d-none d-sm-inline">Refresh</span>
            </button>

            <button
              className="crm-btn-primary"
              onClick={handleOpenCreate}
              style={{ borderRadius: "10px", padding: "8px 18px", fontSize: "13px" }}
            >
              <FaPlus size={11} />
              <span>Create Contact</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="crm-card p-3 mb-4" style={{ borderRadius: "14px" }}>
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6 col-lg-5">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0" style={{ borderRadius: "10px 0 0 10px" }}>
                <FaSearch className="text-muted" size={13} />
              </span>
              <Input
                type="text"
                className="border-start-0"
                style={{ borderRadius: "0 10px 10px 0", fontSize: "13px" }}
                placeholder="Search by contact name, phone, city, GST..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-7 d-flex justify-content-md-end align-items-center gap-2">
            <span className="text-muted" style={{ fontSize: "12.5px" }}>Rows per page:</span>
            <select
              className="form-select form-select-sm"
              style={{ width: "80px", borderRadius: "8px", fontSize: "12.5px" }}
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
          </div>
        </div>
      </div>

      {/* Contacts Data Table */}
      <div className="crm-card p-0 overflow-hidden mb-4" style={{ borderRadius: "16px" }}>
        <div className="table-responsive">
          <table className="crm-table mb-0">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>#</th>
                <th>Contact Name</th>
                <th>Phone / Mobile</th>
                <th>Location</th>
                <th>GST / Business</th>
                <th>Opening Bal.</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <Spinner color="primary" size="md" />
                    <div className="text-muted mt-2" style={{ fontSize: "13px" }}>
                      Fetching customer contacts dynamically from backend...
                    </div>
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
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
                      <FaAddressBook />
                    </div>
                    <div className="fw-bold text-dark fs-6 mb-1">No Contacts Found</div>
                    <p className="text-muted mb-3" style={{ fontSize: "13px" }}>
                      {search ? `No contact records match "${search}".` : "There are currently no customer contacts in the database."}
                    </p>
                    <button className="crm-btn-primary mx-auto" onClick={handleOpenCreate}>
                      <FaPlus size={11} />
                      <span>Create New Contact</span>
                    </button>
                  </td>
                </tr>
              ) : (
                contacts.map((contact, index) => {
                  const displayName = contact.customer_name || contact.name || "Unnamed Contact";
                  const phone = contact.contact_no || contact.phone || "-";
                  const city = contact.city || "-";
                  const state = contact.state || "Tamil Nadu";
                  const gst = contact.gst_no || "";
                  const balance = parseFloat(contact.opening_balance) || 0;
                  const initial = displayName.charAt(0).toUpperCase();

                  return (
                    <tr key={contact.id || index}>
                      <td className="text-muted" style={{ fontSize: "12px" }}>
                        {(page - 1) * limit + index + 1}
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                              color: "#fff",
                              fontWeight: "700",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}
                          >
                            {initial}
                          </div>
                          <div>
                            <div className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                              {displayName}
                            </div>
                            <div className="text-muted" style={{ fontSize: "11.5px" }}>
                              ID: #{contact.id} {contact.alternate_no && `• Alt: ${contact.alternate_no}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-medium text-dark">{phone}</span>
                          {phone !== "-" && (
                            <a
                              href={`https://wa.me/91${phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-success"
                              title="Chat on WhatsApp"
                              style={{ display: "inline-flex" }}
                            >
                              <FaWhatsapp size={14} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: "12.5px" }}>
                          <FaMapMarkerAlt size={11} className="text-secondary" />
                          <span className="text-dark">{city}</span>
                          {state && <span className="text-muted">, {state}</span>}
                        </div>
                      </td>
                      <td>
                        {gst ? (
                          <Badge color="primary" className="fw-medium px-2 py-1" style={{ fontSize: "11px" }}>
                            {gst}
                          </Badge>
                        ) : (
                          <span className="text-muted" style={{ fontSize: "12px" }}>Regular Customer</span>
                        )}
                      </td>
                      <td>
                        <span className="fw-semibold text-dark" style={{ fontSize: "13px" }}>
                          ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="d-inline-flex align-items-center gap-1">
                          <button
                            className="btn btn-sm border p-1 px-2 text-primary"
                            onClick={() => handleOpenHistory(contact)}
                            title="View Customer 360° History & Activity Timeline"
                            style={{ borderRadius: "6px", backgroundColor: "#eef2ff", borderColor: "#c7d2fe" }}
                          >
                            <FaHistory size={12} className="text-primary" />
                            <span className="ms-1 d-none d-lg-inline fw-semibold" style={{ fontSize: "11px" }}>
                              History
                            </span>
                          </button>
                          <button
                            className="btn btn-sm btn-light border p-1 px-2"
                            onClick={() => handleOpenView(contact)}
                            title="View Contact Details"
                            style={{ borderRadius: "6px" }}
                          >
                            <FaEye size={12} className="text-info" />
                          </button>
                          <button
                            className="btn btn-sm btn-light border p-1 px-2"
                            onClick={() => handleOpenEdit(contact)}
                            title="Edit Contact"
                            style={{ borderRadius: "6px" }}
                          >
                            <FaEdit size={12} className="text-primary" />
                          </button>
                          <button
                            className="btn btn-sm btn-light border p-1 px-2"
                            onClick={() => handleOpenDelete(contact)}
                            title="Delete Contact"
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
        {!loading && contacts.length > 0 && (
          <div className="d-flex flex-wrap align-items-center justify-content-between p-3 border-top gap-2 bg-light bg-opacity-50">
            <div className="text-muted" style={{ fontSize: "12.5px" }}>
              Showing <strong>{(page - 1) * limit + 1}</strong> to{" "}
              <strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> contacts
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

      {/* Create / Edit Contact Modal */}
      <Modal isOpen={createModal} toggle={() => setCreateModal(false)} size="lg" centered>
        <form onSubmit={handleSubmitContact}>
          <ModalHeader toggle={() => setCreateModal(false)}>
            <div className="d-flex align-items-center gap-2">
              <FaAddressBook className="text-primary" />
              <span className="fw-bold">
                {isEditing ? "Edit Contact" : "Create New Contact"}
              </span>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="row g-3">
              {/* Contact Name */}
              <div className="col-12 col-md-6">
                <FormGroup>
                  <Label className="fw-semibold text-dark" style={{ fontSize: "13px" }}>
                    Contact Name <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="text"
                    name="customer_name"
                    placeholder="e.g. Ramesh Kumar / Sri Agencies"
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    required
                    style={{ borderRadius: "8px", fontSize: "13px" }}
                  />
                </FormGroup>
              </div>

              {/* Mobile Phone */}
              <div className="col-12 col-md-6">
                <FormGroup>
                  <Label className="fw-semibold text-dark" style={{ fontSize: "13px" }}>
                    Primary Mobile (10 digits) <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="text"
                    name="contact_no"
                    placeholder="e.g. 9845012345"
                    maxLength={10}
                    value={formData.contact_no}
                    onChange={handleInputChange}
                    required
                    style={{ borderRadius: "8px", fontSize: "13px" }}
                  />
                </FormGroup>
              </div>

              {/* Alternate Number */}
              <div className="col-12 col-md-6">
                <FormGroup>
                  <Label className="fw-semibold text-dark" style={{ fontSize: "13px" }}>
                    Alternate Contact No.
                  </Label>
                  <Input
                    type="text"
                    name="alternate_no"
                    placeholder="Optional secondary phone"
                    value={formData.alternate_no}
                    onChange={handleInputChange}
                    style={{ borderRadius: "8px", fontSize: "13px" }}
                  />
                </FormGroup>
              </div>

              {/* GST Number */}
              <div className="col-12 col-md-6">
                <FormGroup>
                  <Label className="fw-semibold text-dark" style={{ fontSize: "13px" }}>
                    GST Number (Optional)
                  </Label>
                  <Input
                    type="text"
                    name="gst_no"
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    maxLength={15}
                    value={formData.gst_no}
                    onChange={handleInputChange}
                    style={{ borderRadius: "8px", fontSize: "13px" }}
                  />
                </FormGroup>
              </div>

              {/* Street Address */}
              <div className="col-12">
                <FormGroup>
                  <Label className="fw-semibold text-dark" style={{ fontSize: "13px" }}>
                    Address Line 1
                  </Label>
                  <Input
                    type="text"
                    name="address"
                    placeholder="Door no, building name, street"
                    value={formData.address}
                    onChange={handleInputChange}
                    style={{ borderRadius: "8px", fontSize: "13px" }}
                  />
                </FormGroup>
              </div>

              {/* Address Line 2 */}
              <div className="col-12 col-md-6">
                <FormGroup>
                  <Label className="fw-semibold text-dark" style={{ fontSize: "13px" }}>
                    Address Line 2 / Area
                  </Label>
                  <Input
                    type="text"
                    name="address2"
                    placeholder="Landmark, area or locality"
                    value={formData.address2}
                    onChange={handleInputChange}
                    style={{ borderRadius: "8px", fontSize: "13px" }}
                  />
                </FormGroup>
              </div>

              {/* City */}
              <div className="col-12 col-md-6">
                <FormGroup>
                  <Label className="fw-semibold text-dark" style={{ fontSize: "13px" }}>
                    City / Town
                  </Label>
                  <Input
                    type="text"
                    name="city"
                    placeholder="e.g. Coimbatore, Salem, Chennai"
                    value={formData.city}
                    onChange={handleInputChange}
                    style={{ borderRadius: "8px", fontSize: "13px" }}
                  />
                </FormGroup>
              </div>

              {/* State */}
              <div className="col-12 col-md-4">
                <FormGroup>
                  <Label className="fw-semibold text-dark" style={{ fontSize: "13px" }}>
                    State
                  </Label>
                  <Input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    style={{ borderRadius: "8px", fontSize: "13px" }}
                  />
                </FormGroup>
              </div>

              {/* Pincode */}
              <div className="col-12 col-md-4">
                <FormGroup>
                  <Label className="fw-semibold text-dark" style={{ fontSize: "13px" }}>
                    Pincode (6 digits)
                  </Label>
                  <Input
                    type="text"
                    name="pincode"
                    placeholder="e.g. 641001"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={handleInputChange}
                    style={{ borderRadius: "8px", fontSize: "13px" }}
                  />
                </FormGroup>
              </div>

              {/* Opening Balance */}
              <div className="col-12 col-md-4">
                <FormGroup>
                  <Label className="fw-semibold text-dark" style={{ fontSize: "13px" }}>
                    Opening Balance (₹)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="opening_balance"
                    placeholder="0.00"
                    value={formData.opening_balance}
                    onChange={handleInputChange}
                    style={{ borderRadius: "8px", fontSize: "13px" }}
                  />
                </FormGroup>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={() => setCreateModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button color="primary" type="submit" disabled={submitting} style={{ borderRadius: "8px" }}>
              {submitting ? (
                <>
                  <Spinner size="sm" className="me-2" /> Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Contact"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* View Contact Details Modal */}
      <Modal isOpen={viewModal} toggle={() => setViewModal(false)} centered>
        <ModalHeader toggle={() => setViewModal(false)}>
          <div className="d-flex align-items-center gap-2">
            <FaUser className="text-primary" />
            <span className="fw-bold">Contact Profile</span>
          </div>
        </ModalHeader>
        <ModalBody>
          {activeContact && (
            <div className="p-2">
              <div className="text-center pb-3 border-bottom mb-3">
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "20px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "8px"
                  }}
                >
                  {(activeContact.customer_name || activeContact.name || "C").charAt(0).toUpperCase()}
                </div>
                <h5 className="fw-bold text-dark mb-1">
                  {activeContact.customer_name || activeContact.name}
                </h5>
                <div className="text-muted" style={{ fontSize: "12px" }}>
                  Contact ID: #{activeContact.id} • Registered in Database
                </div>
              </div>

              <div className="d-flex flex-column gap-2" style={{ fontSize: "13px" }}>
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted">Primary Phone:</span>
                  <span className="fw-semibold text-dark">{activeContact.contact_no || activeContact.phone || "-"}</span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted">Alternate Phone:</span>
                  <span className="fw-semibold text-dark">{activeContact.alternate_no || "-"}</span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted">GST Number:</span>
                  <span className="fw-semibold text-dark">{activeContact.gst_no || "N/A"}</span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted">City / Town:</span>
                  <span className="fw-semibold text-dark">{activeContact.city || "-"}</span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted">State:</span>
                  <span className="fw-semibold text-dark">{activeContact.state || "Tamil Nadu"}</span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted">Pincode:</span>
                  <span className="fw-semibold text-dark">{activeContact.pincode || "-"}</span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom">
                  <span className="text-muted">Address:</span>
                  <span className="fw-semibold text-dark text-end" style={{ maxWidth: "240px" }}>
                    {[activeContact.address, activeContact.address2].filter(Boolean).join(", ") || "-"}
                  </span>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted">Opening Balance:</span>
                  <span className="fw-bold text-primary">
                    ₹{Number(activeContact.opening_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="d-flex justify-content-between">
          <Button
            color="primary"
            outline
            onClick={() => {
              setViewModal(false);
              handleOpenHistory(activeContact);
            }}
            style={{ borderRadius: "8px", fontSize: "13px" }}
          >
            <FaHistory className="me-1" size={13} /> View Customer History
          </Button>
          <div className="d-flex gap-2">
            <Button color="light" onClick={() => setViewModal(false)}>
              Close
            </Button>
            <Button
              color="primary"
              onClick={() => {
                setViewModal(false);
                handleOpenEdit(activeContact);
              }}
              style={{ borderRadius: "8px" }}
            >
              Edit Contact
            </Button>
          </div>
        </ModalFooter>
      </Modal>


      {/* ========================================================================= */}
      {/* CUSTOMER 360° HISTORY & TIMELINE MODAL                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={historyModal}
        toggle={() => setHistoryModal(false)}
        size="xl"
        centered
        scrollable
        style={{ maxWidth: "1140px" }}
      >
        <ModalHeader toggle={() => setHistoryModal(false)} className="bg-light bg-opacity-75 py-3 border-bottom">
          <div className="d-flex align-items-center justify-content-between w-100 pe-3 flex-wrap gap-2">
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "18px",
                  boxShadow: "0 4px 10px rgba(79, 70, 229, 0.25)"
                }}
              >
                {(activeContact?.customer_name || activeContact?.name || "C").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: "17px" }}>
                    {activeContact?.customer_name || activeContact?.name}
                  </h5>
                  <Badge color="primary" pill style={{ fontSize: "11px", fontWeight: "600" }}>
                    ID: #{activeContact?.id}
                  </Badge>
                  {activeContact?.gst_no && (
                    <span className="badge bg-secondary" style={{ fontSize: "10.5px" }}>
                      GST: {activeContact.gst_no}
                    </span>
                  )}
                </div>
                <div className="text-muted d-flex align-items-center gap-3 mt-1" style={{ fontSize: "12.5px" }}>
                  <span>
                    <FaPhoneAlt size={10} className="me-1 text-primary" />
                    {activeContact?.contact_no || activeContact?.phone || "No phone"}
                  </span>
                  {activeContact?.city && (
                    <span>
                      <FaMapMarkerAlt size={11} className="me-1 text-danger" />
                      {activeContact.city}, {activeContact.state || "Tamil Nadu"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action: Log Follow-up */}
            <div className="d-flex align-items-center gap-2">
              <Button
                color="primary"
                size="sm"
                className="d-flex align-items-center gap-1 shadow-sm"
                style={{ borderRadius: "8px", fontWeight: "600", fontSize: "12.5px" }}
                onClick={() => {
                  setHistoryModal(false);
                  navigate(`/crm/followups/new?contact_id=${activeContact?.id}&contact_name=${encodeURIComponent(activeContact?.customer_name || activeContact?.name || "")}&phone=${encodeURIComponent(activeContact?.contact_no || activeContact?.phone || "")}`);
                }}
              >
                <FaPlus size={11} /> + Log Follow-up
              </Button>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="p-4" style={{ backgroundColor: "#f8fafc", minHeight: "500px" }}>
          {loadingHistory ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
              <div className="text-muted mt-2 fw-semibold" style={{ fontSize: "13px" }}>
                Loading customer 360° activity history...
              </div>
            </div>
          ) : !historyData ? (
            <div className="text-center py-5 text-muted">
              Failed to load history data. Please try again.
            </div>
          ) : (
            <>
              {/* Row 1: Executive KPI Metrics Cards */}
              <div className="row g-2 mb-4">
                {/* 1. Total Purchases */}
                <div className="col-6 col-md-4 col-lg-2">
                  <div
                    className="p-3 bg-white border rounded-3 shadow-sm h-100"
                    style={{ borderLeft: "4px solid #10b981 !important" }}
                  >
                    <div className="text-muted fw-semibold" style={{ fontSize: "11.5px" }}>
                      Total Purchases
                    </div>
                    <div className="fw-bold text-dark mt-1" style={{ fontSize: "15px" }}>
                      ₹{Number(historyData.summary?.total_purchases_amount || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                    <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                      Lifetime spend
                    </div>
                  </div>
                </div>

                {/* 2. Invoices Count */}
                <div className="col-6 col-md-4 col-lg-2">
                  <div
                    className="p-3 bg-white border rounded-3 shadow-sm h-100"
                    style={{ borderLeft: "4px solid #3b82f6 !important" }}
                  >
                    <div className="text-muted fw-semibold" style={{ fontSize: "11.5px" }}>
                      Invoices
                    </div>
                    <div className="fw-bold text-primary mt-1" style={{ fontSize: "16px" }}>
                      {historyData.summary?.total_invoices_count || 0}
                    </div>
                    <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                      Orders billed
                    </div>
                  </div>
                </div>

                {/* 3. Quotations Count */}
                <div className="col-6 col-md-4 col-lg-2">
                  <div
                    className="p-3 bg-white border rounded-3 shadow-sm h-100"
                    style={{ borderLeft: "4px solid #6366f1 !important" }}
                  >
                    <div className="text-muted fw-semibold" style={{ fontSize: "11.5px" }}>
                      Quotations
                    </div>
                    <div className="fw-bold text-dark mt-1" style={{ fontSize: "16px" }}>
                      {historyData.summary?.total_quotations_count || 0}
                    </div>
                    <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                      Estimates sent
                    </div>
                  </div>
                </div>

                {/* 4. Follow-ups */}
                <div className="col-6 col-md-4 col-lg-2">
                  <div
                    className="p-3 bg-white border rounded-3 shadow-sm h-100"
                    style={{ borderLeft: "4px solid #f59e0b !important" }}
                  >
                    <div className="text-muted fw-semibold" style={{ fontSize: "11.5px" }}>
                      Follow-ups
                    </div>
                    <div className="fw-bold text-warning mt-1" style={{ fontSize: "16px" }}>
                      {historyData.summary?.total_followups_count || 0}
                    </div>
                    <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                      Touchpoints logged
                    </div>
                  </div>
                </div>

                {/* 5. Leads */}
                <div className="col-6 col-md-4 col-lg-2">
                  <div
                    className="p-3 bg-white border rounded-3 shadow-sm h-100"
                    style={{ borderLeft: "4px solid #8b5cf6 !important" }}
                  >
                    <div className="text-muted fw-semibold" style={{ fontSize: "11.5px" }}>
                      CRM Leads
                    </div>
                    <div className="fw-bold text-dark mt-1" style={{ fontSize: "16px" }}>
                      {historyData.summary?.total_leads_count || 0}
                    </div>
                    <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                      Pipeline enquiries
                    </div>
                  </div>
                </div>

                {/* 6. Outstanding / Balance */}
                <div className="col-6 col-md-4 col-lg-2">
                  <div
                    className="p-3 bg-white border rounded-3 shadow-sm h-100"
                    style={{ borderLeft: "4px solid #ec4899 !important" }}
                  >
                    <div className="text-muted fw-semibold" style={{ fontSize: "11.5px" }}>
                      Ledger Balance
                    </div>
                    <div className="fw-bold text-dark mt-1" style={{ fontSize: "15px" }}>
                      ₹{Number(historyData.summary?.opening_balance || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                    <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                      Current balance
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="d-flex align-items-center gap-2 mb-3 border-bottom pb-2 overflow-auto">
                <button
                  className={`btn btn-sm d-flex align-items-center gap-1 ${
                    historyTab === "all" ? "btn-primary shadow-sm" : "btn-light border"
                  }`}
                  style={{ borderRadius: "8px", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" }}
                  onClick={() => setHistoryTab("all")}
                >
                  <FaHistory size={11} /> All Activities
                  <Badge color={historyTab === "all" ? "light" : "secondary"} className="ms-1" pill>
                    {historyData.timeline?.length || 0}
                  </Badge>
                </button>

                <button
                  className={`btn btn-sm d-flex align-items-center gap-1 ${
                    historyTab === "sales" ? "btn-primary shadow-sm" : "btn-light border"
                  }`}
                  style={{ borderRadius: "8px", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" }}
                  onClick={() => setHistoryTab("sales")}
                >
                  <FaShoppingCart size={11} /> Invoices & Purchases
                  <Badge color={historyTab === "sales" ? "light" : "secondary"} className="ms-1" pill>
                    {historyData.sales?.length || 0}
                  </Badge>
                </button>

                <button
                  className={`btn btn-sm d-flex align-items-center gap-1 ${
                    historyTab === "quotations" ? "btn-primary shadow-sm" : "btn-light border"
                  }`}
                  style={{ borderRadius: "8px", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" }}
                  onClick={() => setHistoryTab("quotations")}
                >
                  <FaFileAlt size={11} /> Quotations
                  <Badge color={historyTab === "quotations" ? "light" : "secondary"} className="ms-1" pill>
                    {historyData.quotations?.length || 0}
                  </Badge>
                </button>

                <button
                  className={`btn btn-sm d-flex align-items-center gap-1 ${
                    historyTab === "followups" ? "btn-primary shadow-sm" : "btn-light border"
                  }`}
                  style={{ borderRadius: "8px", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" }}
                  onClick={() => setHistoryTab("followups")}
                >
                  <FaCalendarCheck size={11} /> CRM Follow-ups
                  <Badge color={historyTab === "followups" ? "light" : "secondary"} className="ms-1" pill>
                    {historyData.followups?.length || 0}
                  </Badge>
                </button>

                <button
                  className={`btn btn-sm d-flex align-items-center gap-1 ${
                    historyTab === "leads" ? "btn-primary shadow-sm" : "btn-light border"
                  }`}
                  style={{ borderRadius: "8px", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" }}
                  onClick={() => setHistoryTab("leads")}
                >
                  <FaBullseye size={11} /> CRM Leads
                  <Badge color={historyTab === "leads" ? "light" : "secondary"} className="ms-1" pill>
                    {historyData.leads?.length || 0}
                  </Badge>
                </button>

                <button
                  className={`btn btn-sm d-flex align-items-center gap-1 ${
                    historyTab === "payments" ? "btn-primary shadow-sm" : "btn-light border"
                  }`}
                  style={{ borderRadius: "8px", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" }}
                  onClick={() => setHistoryTab("payments")}
                >
                  <FaMoneyBillWave size={11} /> Payments Received
                  <Badge color={historyTab === "payments" ? "light" : "secondary"} className="ms-1" pill>
                    {historyData.payments?.length || 0}
                  </Badge>
                </button>
              </div>

              {/* TAB 1: ALL ACTIVITIES TIMELINE */}
              {historyTab === "all" && (
                <div className="bg-white p-3 p-md-4 rounded-3 border shadow-sm">
                  <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                    <FaClock className="text-primary" /> Chronological Activity & Interaction Timeline
                  </h6>

                  {(!historyData.timeline || historyData.timeline.length === 0) ? (
                    <div className="text-center py-5 text-muted">
                      <FaHistory size={36} className="text-muted opacity-50 mb-2" />
                      <div className="fw-semibold">No recorded activity history for this customer yet.</div>
                      <div style={{ fontSize: "12px" }}>
                        Sales, quotations, leads, and follow-ups logged for this contact will automatically appear here.
                      </div>
                    </div>
                  ) : (
                    <div className="crm-timeline-container" style={{ position: "relative", paddingLeft: "28px" }}>
                      <div
                        style={{
                          position: "absolute",
                          left: "11px",
                          top: "8px",
                          bottom: "8px",
                          width: "2px",
                          background: "#e2e8f0"
                        }}
                      />

                      {historyData.timeline.map((item, idx) => {
                        const isSale = item.type === "sale";
                        const isQuote = item.type === "quotation";
                        const isFollowup = item.type === "followup";
                        const isLead = item.type === "lead";
                        const isPayment = item.type === "payment";

                        const iconBg = isSale
                          ? "#d1fae5"
                          : isQuote
                          ? "#e0e7ff"
                          : isFollowup
                          ? "#fef3c7"
                          : isLead
                          ? "#ede9fe"
                          : "#ccfbf1";

                        const iconColor = isSale
                          ? "#059669"
                          : isQuote
                          ? "#4338ca"
                          : isFollowup
                          ? "#d97706"
                          : isLead
                          ? "#7c3aed"
                          : "#0d9488";

                        return (
                          <div key={item.id || idx} className="mb-4" style={{ position: "relative" }}>
                            {/* Dot icon */}
                            <div
                              style={{
                                position: "absolute",
                                left: "-28px",
                                top: "0px",
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                background: iconBg,
                                color: iconColor,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                boxShadow: "0 0 0 3px #fff, 0 1px 3px rgba(0,0,0,0.1)"
                              }}
                            >
                              {isSale && <FaShoppingCart />}
                              {isQuote && <FaFileAlt />}
                              {isFollowup && <FaCalendarCheck />}
                              {isLead && <FaBullseye />}
                              {isPayment && <FaMoneyBillWave />}
                            </div>

                            {/* Card Content */}
                            <div className="p-3 bg-light bg-opacity-50 border rounded-3 hover-shadow-sm">
                              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                                    {item.title}
                                  </span>
                                  <Badge
                                    color={
                                      item.status === "Completed" || item.status === "paid" || item.status === "Won" || item.status === "Received"
                                        ? "success"
                                        : item.status === "Pending"
                                        ? "warning"
                                        : item.status === "Rescheduled"
                                        ? "info"
                                        : "secondary"
                                    }
                                    style={{ fontSize: "10.5px" }}
                                  >
                                    {item.status}
                                  </Badge>
                                </div>
                                <span className="text-muted fw-semibold" style={{ fontSize: "11.5px" }}>
                                  {item.date ? new Date(item.date).toLocaleDateString("en-IN", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  }) : "-"}
                                </span>
                              </div>

                              <div className="text-muted" style={{ fontSize: "12px" }}>
                                {item.subtitle}
                              </div>

                              {/* Amount if applicable */}
                              {item.amount > 0 && (
                                <div className="mt-2 fw-bold text-dark" style={{ fontSize: "13px" }}>
                                  Value: ₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </div>
                              )}

                              {/* Detailed follow-up discussion notes */}
                              {isFollowup && item.details?.discussion_summary && (
                                <div
                                  className="mt-2 p-2 rounded"
                                  style={{ backgroundColor: "#fef9c3", borderLeft: "3px solid #eab308", fontSize: "12px" }}
                                >
                                  <strong>Discussion:</strong> {item.details.discussion_summary}
                                  {item.details.next_action && (
                                    <div className="mt-1 text-secondary">
                                      <strong>Next Action:</strong> {item.details.next_action}
                                    </div>
                                  )}
                                  {item.details.next_followup_date && (
                                    <div className="mt-1 text-primary fw-semibold" style={{ fontSize: "11.5px" }}>
                                      Next Scheduled: {item.details.next_followup_date} {item.details.next_followup_time || ""}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: INVOICES & PURCHASES */}
              {historyTab === "sales" && (
                <div className="bg-white p-3 p-md-4 rounded-3 border shadow-sm">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold text-dark mb-0">Sales Invoices & Billing History</h6>
                    <span className="text-muted" style={{ fontSize: "12px" }}>
                      Total {historyData.sales?.length || 0} Invoices
                    </span>
                  </div>

                  {(!historyData.sales || historyData.sales.length === 0) ? (
                    <div className="text-center py-5 text-muted">
                      No sales or billing records found for this customer.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0" style={{ fontSize: "13px" }}>
                        <thead className="table-light">
                          <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Sales Rep</th>
                            <th>Payment Status</th>
                            <th className="text-end">Final Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.sales.map((s) => (
                            <tr key={s.id}>
                              <td className="fw-bold text-primary">#{s.invoice_no || s.id}</td>
                              <td className="text-muted">
                                {s.sales_date ? String(s.sales_date).slice(0, 10) : "-"}
                              </td>
                              <td>{s.sales_person_name || "Direct Store"}</td>
                              <td>
                                <Badge
                                  color={s.payment_status === "paid" ? "success" : "warning"}
                                  style={{ textTransform: "capitalize" }}
                                >
                                  {s.payment_status || "Pending"}
                                </Badge>
                              </td>
                              <td className="text-end fw-bold text-dark">
                                ₹{Number(s.final_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: QUOTATIONS */}
              {historyTab === "quotations" && (
                <div className="bg-white p-3 p-md-4 rounded-3 border shadow-sm">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold text-dark mb-0">Quotations & Estimates History</h6>
                    <span className="text-muted" style={{ fontSize: "12px" }}>
                      Total {historyData.quotations?.length || 0} Quotations
                    </span>
                  </div>

                  {(!historyData.quotations || historyData.quotations.length === 0) ? (
                    <div className="text-center py-5 text-muted">
                      No quotation records generated for this customer.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0" style={{ fontSize: "13px" }}>
                        <thead className="table-light">
                          <tr>
                            <th>Quotation #</th>
                            <th>Date</th>
                            <th>Valid Till</th>
                            <th>Notes</th>
                            <th className="text-end">Total Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.quotations.map((q) => (
                            <tr key={q.id}>
                              <td className="fw-bold text-primary">#{q.quotation_no}</td>
                              <td className="text-muted">
                                {q.quotation_date ? String(q.quotation_date).slice(0, 10) : "-"}
                              </td>
                              <td className="text-muted">
                                {q.valid_till_date ? String(q.valid_till_date).slice(0, 10) : "Open"}
                              </td>
                              <td className="text-muted" style={{ maxWidth: "250px" }}>
                                {q.notes || "-"}
                              </td>
                              <td className="text-end fw-bold text-dark">
                                ₹{Number(q.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CRM FOLLOW-UPS */}
              {historyTab === "followups" && (
                <div className="bg-white p-3 p-md-4 rounded-3 border shadow-sm">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold text-dark mb-0">CRM Follow-ups & Touchpoints Log</h6>
                    <Button
                      color="primary"
                      size="sm"
                      onClick={() => {
                        setHistoryModal(false);
                        navigate(`/crm/followups/new?contact_id=${activeContact?.id}&contact_name=${encodeURIComponent(activeContact?.customer_name || activeContact?.name || "")}&phone=${encodeURIComponent(activeContact?.contact_no || activeContact?.phone || "")}`);
                      }}
                    >
                      <FaPlus size={10} className="me-1" /> New Follow-up
                    </Button>
                  </div>

                  {(!historyData.followups || historyData.followups.length === 0) ? (
                    <div className="text-center py-5 text-muted">
                      No follow-up interactions logged for this customer.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {historyData.followups.map((f) => (
                        <div key={f.id} className="p-3 bg-light bg-opacity-50 border rounded-3">
                          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <Badge color="primary" style={{ fontSize: "11px" }}>
                                {f.followup_type || "Call"}
                              </Badge>
                              <span className="fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                                {f.followup_title}
                              </span>
                              <span className="badge bg-secondary" style={{ fontSize: "10.5px" }}>
                                {f.followup_code || `FLW-#${f.id}`}
                              </span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <Badge
                                color={
                                  f.followup_status === "Completed"
                                    ? "success"
                                    : f.followup_status === "Rescheduled"
                                    ? "info"
                                    : "warning"
                                }
                              >
                                {f.followup_status}
                              </Badge>
                              <span className="text-muted" style={{ fontSize: "12px" }}>
                                {f.followup_date} {f.followup_time || ""}
                              </span>
                            </div>
                          </div>

                          <div className="row g-2 mb-2" style={{ fontSize: "12px" }}>
                            <div className="col-12 col-md-4">
                              <span className="text-muted">Assigned Staff:</span>{" "}
                              <strong>{f.assigned_to || "Unassigned"}</strong>
                            </div>
                            <div className="col-12 col-md-4">
                              <span className="text-muted">Customer Response:</span>{" "}
                              <Badge
                                color={
                                  f.customer_response === "Interested"
                                    ? "success"
                                    : f.customer_response === "Not Interested"
                                    ? "danger"
                                    : "secondary"
                                }
                              >
                                {f.customer_response || "Pending"}
                              </Badge>
                            </div>
                            <div className="col-12 col-md-4">
                              <span className="text-muted">Priority:</span>{" "}
                              <span className="fw-semibold">{f.priority || "Medium"}</span>
                            </div>
                          </div>

                          {f.discussion_summary && (
                            <div className="p-2 rounded mt-2" style={{ backgroundColor: "#fef9c3", fontSize: "12.5px" }}>
                              <strong>Discussion:</strong> {f.discussion_summary}
                            </div>
                          )}

                          {f.next_action && (
                            <div className="mt-1 text-secondary" style={{ fontSize: "12px" }}>
                              <strong>Next Action:</strong> {f.next_action}
                            </div>
                          )}

                          {f.next_followup_date && (
                            <div className="mt-2 text-primary fw-semibold" style={{ fontSize: "11.5px" }}>
                              Next Follow-up Due: {f.next_followup_date} {f.next_followup_time || ""}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: CRM LEADS */}
              {historyTab === "leads" && (
                <div className="bg-white p-3 p-md-4 rounded-3 border shadow-sm">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold text-dark mb-0">CRM Leads & Sales Pipeline Opportunities</h6>
                    <span className="text-muted" style={{ fontSize: "12px" }}>
                      Total {historyData.leads?.length || 0} Leads
                    </span>
                  </div>

                  {(!historyData.leads || historyData.leads.length === 0) ? (
                    <div className="text-center py-5 text-muted">
                      No CRM lead enquiries associated with this contact's phone or company.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0" style={{ fontSize: "13px" }}>
                        <thead className="table-light">
                          <tr>
                            <th>Lead Code</th>
                            <th>Lead Title</th>
                            <th>Interested Product</th>
                            <th>Status</th>
                            <th>Assigned Rep</th>
                            <th className="text-end">Budget</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.leads.map((l) => (
                            <tr key={l.id}>
                              <td className="fw-bold text-primary">{l.lead_code || `LD-#${l.id}`}</td>
                              <td className="fw-semibold text-dark">{l.lead_title}</td>
                              <td className="text-muted">{l.interested_product || "General Enquiry"}</td>
                              <td>
                                <Badge
                                  color={
                                    l.lead_status === "Won" || l.lead_status === "Completed"
                                      ? "success"
                                      : l.lead_status === "Lost"
                                      ? "danger"
                                      : "primary"
                                  }
                                >
                                  {l.lead_status}
                                </Badge>
                              </td>
                              <td>{l.assigned_to || "Unassigned"}</td>
                              <td className="text-end fw-bold text-dark">
                                ₹{Number(l.expected_budget || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: PAYMENTS */}
              {historyTab === "payments" && (
                <div className="bg-white p-3 p-md-4 rounded-3 border shadow-sm">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold text-dark mb-0">Payments Received History</h6>
                    <span className="text-muted" style={{ fontSize: "12px" }}>
                      Total Payments: ₹{Number(historyData.summary?.total_payments_amount || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2
                      })}
                    </span>
                  </div>

                  {(!historyData.payments || historyData.payments.length === 0) ? (
                    <div className="text-center py-5 text-muted">
                      No payment transaction receipts recorded for this customer.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0" style={{ fontSize: "13px" }}>
                        <thead className="table-light">
                          <tr>
                            <th>Date</th>
                            <th>Invoice Ref</th>
                            <th>Payment Method</th>
                            <th>Ref Number</th>
                            <th className="text-end">Amount Paid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.payments.map((p) => (
                            <tr key={p.id}>
                              <td className="text-muted">
                                {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "-"}
                              </td>
                              <td className="fw-bold text-primary">#{p.invoice_no || "Invoice"}</td>
                              <td style={{ textTransform: "capitalize" }}>{p.method || "Cash"}</td>
                              <td className="text-muted">{p.payment_ref_no || "N/A"}</td>
                              <td className="text-end fw-bold text-success">
                                ₹{Number(p.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </ModalBody>

        <ModalFooter className="d-flex justify-content-between">
          <Button color="light" onClick={() => setHistoryModal(false)}>
            Close
          </Button>
          <div className="d-flex gap-2">
            <Button
              color="outline-secondary"
              size="sm"
              onClick={() => handleOpenHistory(activeContact)}
              disabled={loadingHistory}
              style={{ borderRadius: "8px" }}
            >
              <FaSyncAlt size={11} className={loadingHistory ? "fa-spin me-1" : "me-1"} /> Refresh History
            </Button>
          </div>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} centered size="sm">
        <ModalHeader toggle={() => setDeleteModal(false)}>
          <span className="text-danger fw-bold">Delete Contact?</span>
        </ModalHeader>
        <ModalBody>
          <p className="text-muted mb-0" style={{ fontSize: "13.5px" }}>
            Are you sure you want to delete contact <strong>{activeContact?.customer_name || activeContact?.name}</strong>? This action cannot be undone.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setDeleteModal(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button color="danger" onClick={handleConfirmDelete} disabled={submitting}>
            {submitting ? "Deleting..." : "Delete"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default CrmContacts;

