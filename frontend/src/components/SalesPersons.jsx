import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Table,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Input,
  Spinner,
} from "reactstrap";
import {
  FaUserTie,
  FaPlus,
  FaEdit,
  FaTrash,
  FaPhoneAlt,
  FaEnvelope,
  FaCheckCircle,
  FaTimesCircle,
  FaSearch,
  FaPercent,
  FaBullseye,
  FaInfoCircle,
  FaChartLine,
} from "react-icons/fa";
import { toast } from "react-toastify";
import api, { getActiveBranchId } from "../utils/api";

const SalesPersons = () => {
  const navigate = useNavigate();
  const [salesPersons, setSalesPersons] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [idFilter, setIdFilter] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const initialForm = {
    employee_code: "",
    name: "",
    phone: "",
    email: "",
    commission_type: "percentage",
    commission_rate: 0,
    target_amount: 0,
    branch_id: 2,
    status: "Active",
    notes: "",
  };
  const [formData, setFormData] = useState(initialForm);

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get("/branches");
        setBranches(res.data?.data || res.data || []);
      } catch (err) {
        console.error("Failed to load branches:", err);
      }
    };
    fetchBranches();
  }, []);

  // Fetch sales persons
  const fetchSalesPersons = async () => {
    setLoading(true);
    try {
      const res = await api.get("/sales-persons");
      if (res.data?.success) {
        setSalesPersons(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch sales persons:", err);
      toast.error("Failed to load sales persons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesPersons();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      ...initialForm,
      branch_id: 2,
    });
    setModalOpen(true);
  };

  const openEditModal = (sp) => {
    setEditingId(sp.id);
    setFormData({
      employee_code: sp.employee_code || "",
      name: sp.name || "",
      phone: sp.phone || "",
      email: sp.email || "",
      commission_type: sp.commission_type || "percentage",
      commission_rate: sp.commission_rate != null ? Number(sp.commission_rate) : 0,
      target_amount: sp.target_amount != null ? Number(sp.target_amount) : 0,
      branch_id: sp.branch_id || "",
      status: sp.status || "Active",
      notes: sp.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warn("Sales person name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/sales-persons/${editingId}`, formData);
        toast.success("Sales person updated successfully");
      } else {
        await api.post("/sales-persons", formData);
        toast.success("Sales person added successfully");
      }
      setModalOpen(false);
      fetchSalesPersons();
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.message || "Failed to save sales person");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;

    try {
      const res = await api.delete(`/sales-persons/${id}`);
      toast.success(res.data?.message || "Sales person removed");
      fetchSalesPersons();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const toggleStatus = async (sp) => {
    const newStatus = sp.status === "Active" ? "Inactive" : "Active";
    try {
      await api.put(`/sales-persons/${sp.id}`, { ...sp, status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchSalesPersons();
    } catch (err) {
      console.error("Status update error:", err);
      toast.error("Failed to update status");
    }
  };

  // Filtered List
  const filtered = salesPersons.filter((sp) => {
    // 1. Filter by ID / Code
    if (idFilter && String(sp.id) !== String(idFilter) && sp.employee_code !== idFilter) {
      return false;
    }

    // 2. Filter by Status
    const matchesStatus = statusFilter === "All" || sp.status === statusFilter;
    if (!matchesStatus) return false;

    // 3. Filter by Search Query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        sp.name?.toLowerCase().includes(q) ||
        sp.employee_code?.toLowerCase().includes(q) ||
        sp.phone?.toLowerCase().includes(q) ||
        sp.email?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    return true;
  });

  const activeCount = salesPersons.filter((s) => s.status === "Active").length;
  const totalCount = salesPersons.length;

  return (
    <Container fluid className="py-3">
      {/* Page Title & Add Button */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
            <FaUserTie className="text-warning" /> Sales Persons Management
          </h4>
          <p className="text-muted small mb-0">
            Manage sales team executives, commission structures, and monthly revenue targets.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button
            color="warning"
            className="text-dark fw-bold d-flex align-items-center gap-2 shadow-sm"
            onClick={() => navigate("/index/sales-person-report")}
          >
            <FaChartLine /> Sales Reports & Commission
          </Button>
          <Button color="primary" onClick={openAddModal} className="d-flex align-items-center gap-2">
            <FaPlus /> Add Sales Person
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <Row className="mb-3 g-3">
        <Col xs={12} sm={4}>
          <Card className="border-0 shadow-sm" style={{ borderLeft: "4px solid #FFD700" }}>
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small fw-semibold">TOTAL EXECUTIVES</div>
                <div className="fs-4 fw-bold text-dark">{totalCount}</div>
              </div>
              <div className="rounded-circle p-3 bg-light text-warning fs-4">
                <FaUserTie />
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xs={12} sm={4}>
          <Card className="border-0 shadow-sm" style={{ borderLeft: "4px solid #16a34a" }}>
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small fw-semibold">ACTIVE EXECUTIVES</div>
                <div className="fs-4 fw-bold text-success">{activeCount}</div>
              </div>
              <div className="rounded-circle p-3 bg-light text-success fs-4">
                <FaCheckCircle />
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xs={12} sm={4}>
          <Card className="border-0 shadow-sm" style={{ borderLeft: "4px solid #ca8a04" }}>
            <CardBody className="p-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small fw-semibold">AVG COMMISSION</div>
                <div className="fs-4 fw-bold text-dark">
                  {totalCount > 0
                    ? (
                        salesPersons.reduce((acc, s) => acc + Number(s.commission_rate || 0), 0) /
                        totalCount
                      ).toFixed(1) + "%"
                    : "0%"}
                </div>
              </div>
              <div className="rounded-circle p-3 bg-light text-warning fs-4">
                <FaPercent />
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Search and Filter Card */}
      <Card className="border-0 shadow-sm mb-3">
        <CardBody className="p-3">
          <Row className="g-2 align-items-center">
            {/* Filter by ID / Employee Code */}
            <Col xs={12} sm={6} md={3}>
              <div className="d-flex align-items-center" style={{ gap: "6px" }}>
                <span className="small fw-semibold text-muted text-nowrap" style={{ fontSize: "0.78rem" }}>
                  Filter ID:
                </span>
                <Input
                  type="select"
                  bsSize="sm"
                  value={idFilter}
                  onChange={(e) => setIdFilter(e.target.value)}
                  className="shadow-sm"
                >
                  <option value="">All IDs / Codes</option>
                  {salesPersons.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.employee_code || `SP-${String(sp.id).padStart(3, "0")}`} - {sp.name}
                    </option>
                  ))}
                </Input>
              </div>
            </Col>

            {/* Search Input */}
            <Col xs={12} sm={6} md={4}>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <FaSearch className="text-muted" size={11} />
                </span>
                <Input
                  bsSize="sm"
                  type="text"
                  placeholder="Search name, code, phone, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-start-0 shadow-none"
                />
              </div>
            </Col>

            {/* Status Filter */}
            <Col xs={6} sm={4} md={2}>
              <Input
                type="select"
                bsSize="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="shadow-sm"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </Input>
            </Col>

            {/* Reset / Count */}
            <Col xs={6} sm={8} md={3} className="d-flex align-items-center justify-content-end gap-2">
              {(idFilter || search || statusFilter !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setIdFilter("");
                    setSearch("");
                    setStatusFilter("All");
                  }}
                  className="btn btn-sm btn-outline-secondary py-1 px-2"
                  style={{ fontSize: "11px", borderRadius: "6px" }}
                >
                  Clear Filters
                </button>
              )}
              <span className="small text-muted text-nowrap">
                Showing <b>{filtered.length}</b> of {totalCount}
              </span>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Table Card - Pure Single-Line Rows */}
      <Card className="border-0 shadow-sm">
        <CardBody className="p-0">
          <div className="table-responsive">
            <Table hover align="middle" className="mb-0 text-nowrap">
              <thead className="table-light text-nowrap">
                <tr>
                  <th style={{ width: 90 }} className="text-nowrap">Code / ID</th>
                  <th className="text-nowrap">Executive Name</th>
                  <th className="text-nowrap">Phone Number</th>
                  <th className="text-nowrap">Email Address</th>
                  <th className="text-nowrap">Commission Rate</th>
                  <th className="text-nowrap">Monthly Target</th>
                  <th className="text-nowrap">Status</th>
                  <th style={{ width: 110 }} className="text-end text-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="text-nowrap">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5">
                      <Spinner color="warning" size="sm" className="me-2" />
                      Loading sales persons...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      No sales persons found. Click <b>"+ Add Sales Person"</b> to create one.
                    </td>
                  </tr>
                ) : (
                  filtered.map((sp) => (
                    <tr key={sp.id} className="text-nowrap">
                      <td className="text-nowrap py-2">
                        <span className="badge bg-dark text-warning px-2 py-1 font-monospace">
                          {sp.employee_code || `SP-${String(sp.id).padStart(3, "0")}`}
                        </span>
                      </td>
                      <td className="text-nowrap py-2 fw-bold text-dark" title={sp.notes || undefined}>
                        {sp.name}
                      </td>
                      <td className="text-nowrap py-2 small text-muted">
                        {sp.phone ? (
                          <span className="d-inline-flex align-items-center gap-1">
                            <FaPhoneAlt size={10} className="text-secondary" /> {sp.phone}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-nowrap py-2 small text-muted">
                        {sp.email ? (
                          <span className="d-inline-flex align-items-center gap-1">
                            <FaEnvelope size={10} className="text-secondary" /> {sp.email}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-nowrap py-2">
                        {Number(sp.commission_rate || 0) > 0 ? (
                          <Badge color="light" className="text-dark border px-2 py-1">
                            {sp.commission_type === "fixed"
                              ? `₹${Number(sp.commission_rate || 0).toLocaleString()} / bill`
                              : `${Number(sp.commission_rate || 0)}% of sale`}
                          </Badge>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning text-dark py-0 px-2 fw-semibold"
                            style={{ fontSize: "11px", borderRadius: "12px", borderStyle: "dashed", whiteSpace: "nowrap" }}
                            onClick={() => openEditModal(sp)}
                            title="Configure commission rate based on performance"
                          >
                            + Set Commission
                          </button>
                        )}
                      </td>
                      <td className="text-nowrap py-2">
                        {Number(sp.target_amount || 0) > 0 ? (
                          <span className="small fw-bold text-dark d-inline-flex align-items-center gap-1">
                            <FaBullseye className="text-danger" size={12} />
                            ₹{Number(sp.target_amount || 0).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td className="text-nowrap py-2">
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            sp.status === "Active" ? "btn-outline-success" : "btn-outline-secondary"
                          } py-0 px-2`}
                          style={{ fontSize: "11px", borderRadius: "12px", whiteSpace: "nowrap" }}
                          onClick={() => toggleStatus(sp)}
                          title="Click to toggle status"
                        >
                          {sp.status === "Active" ? (
                            <>
                              <FaCheckCircle className="me-1" /> Active
                            </>
                          ) : (
                            <>
                              <FaTimesCircle className="me-1" /> Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="text-end text-nowrap py-2">
                        <Button
                          size="sm"
                          color="light"
                          className="me-1 border text-dark fw-semibold py-1 px-2"
                          onClick={() => navigate(`/index/sales-person-report?sales_person_id=${sp.id}`)}
                          title="View Sales Report, Invoices & Commission"
                          style={{ fontSize: "11.5px" }}
                        >
                          <FaChartLine className="text-warning me-1" /> Report
                        </Button>
                        <Button
                          size="sm"
                          color="light"
                          className="me-1 border text-primary py-1 px-2"
                          onClick={() => openEditModal(sp)}
                          title="Edit Profile & Set Commission"
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          size="sm"
                          color="light"
                          className="border text-danger py-1 px-2"
                          onClick={() => handleDelete(sp.id, sp.name)}
                          title="Delete / Deactivate"
                        >
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>

      {/* Add / Edit Modal - Wider (lg) with optimized compact height */}
      <Modal
        isOpen={modalOpen}
        toggle={() => !saving && setModalOpen(false)}
        centered
        size="lg"
        style={{ maxWidth: "860px" }}
      >
        <ModalHeader toggle={() => !saving && setModalOpen(false)} className="py-2 px-3 bg-light border-bottom">
          <span className="fw-bold" style={{ fontSize: "1rem" }}>
            {editingId ? "Configure Sales Executive & Commission" : "Add New Sales Executive"}
          </span>
        </ModalHeader>
        <Form onSubmit={handleSave}>
          <ModalBody className="py-3 px-4">
            {!editingId && (
              <div
                className="d-flex align-items-center gap-2 p-2 px-3 mb-2 rounded border"
                style={{ backgroundColor: "#F0FDF4", borderColor: "#BBF7D0", fontSize: "0.82rem" }}
              >
                <FaInfoCircle className="text-success flex-shrink-0" size={14} />
                <span className="text-dark">
                  Enter executive profile details to create. Commission rates, types, and monthly sales targets can be configured anytime later based on actual sales performance.
                </span>
              </div>
            )}

            <Row className="g-2">
              {/* Row 1: Code, Name, Phone */}
              <Col xs={12} md={4}>
                <FormGroup className="mb-1">
                  <Label className="fw-semibold text-muted mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                    EMPLOYEE CODE / ID
                  </Label>
                  <Input
                    bsSize="sm"
                    type="text"
                    placeholder="Auto-generated if blank"
                    value={formData.employee_code}
                    onChange={(e) =>
                      setFormData({ ...formData, employee_code: e.target.value.toUpperCase() })
                    }
                  />
                </FormGroup>
              </Col>

              <Col xs={12} md={4}>
                <FormGroup className="mb-1">
                  <Label className="fw-semibold text-muted mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                    FULL NAME <span className="text-danger">*</span>
                  </Label>
                  <Input
                    bsSize="sm"
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </FormGroup>
              </Col>

              <Col xs={12} md={4}>
                <FormGroup className="mb-1">
                  <Label className="fw-semibold text-muted mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                    MOBILE NUMBER
                  </Label>
                  <Input
                    bsSize="sm"
                    type="tel"
                    placeholder="10-digit phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </FormGroup>
              </Col>

              {/* Row 2: Email, Status */}
              <Col xs={12} md={6}>
                <FormGroup className="mb-1">
                  <Label className="fw-semibold text-muted mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                    EMAIL ADDRESS
                  </Label>
                  <Input
                    bsSize="sm"
                    type="email"
                    placeholder="name@shiva.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </FormGroup>
              </Col>

              <Col xs={12} md={6}>
                <FormGroup className="mb-1">
                  <Label className="fw-semibold text-muted mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                    STATUS
                  </Label>
                  <Input
                    bsSize="sm"
                    type="select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Input>
                </FormGroup>
              </Col>

              {/* Performance Commission Section - ONLY visible when editing an existing sales person based on performance */}
              {editingId && (
                <Col xs={12} className="my-2">
                  <div
                    className="p-3 rounded border"
                    style={{ backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <FaPercent className="text-warning" size={13} />
                        <span className="fw-bold" style={{ fontSize: "0.82rem", color: "#92400E" }}>
                          PERFORMANCE COMMISSION & TARGET CONFIGURATION
                        </span>
                      </div>
                      <span className="badge" style={{ backgroundColor: "#FDE68A", color: "#78350F", fontSize: "0.72rem" }}>
                        Assigned based on sales performance
                      </span>
                    </div>

                    <Row className="g-2">
                      <Col xs={12} md={4}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-muted mb-1" style={{ fontSize: "0.74rem" }}>
                            COMMISSION TYPE
                          </Label>
                          <Input
                            bsSize="sm"
                            type="select"
                            value={formData.commission_type}
                            onChange={(e) =>
                              setFormData({ ...formData, commission_type: e.target.value })
                            }
                          >
                            <option value="percentage">Percentage (%) of Total Sale</option>
                            <option value="fixed">Fixed Amount (₹) per Invoice</option>
                          </Input>
                        </FormGroup>
                      </Col>

                      <Col xs={12} md={4}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-muted mb-1" style={{ fontSize: "0.74rem" }}>
                            COMMISSION RATE ({formData.commission_type === "percentage" ? "%" : "₹"})
                          </Label>
                          <Input
                            bsSize="sm"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={formData.commission_rate}
                            onChange={(e) =>
                              setFormData({ ...formData, commission_rate: e.target.value })
                            }
                          />
                        </FormGroup>
                      </Col>

                      <Col xs={12} md={4}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-muted mb-1" style={{ fontSize: "0.74rem" }}>
                            MONTHLY TARGET (₹)
                          </Label>
                          <Input
                            bsSize="sm"
                            type="number"
                            step="1000"
                            min="0"
                            placeholder="0"
                            value={formData.target_amount}
                            onChange={(e) =>
                              setFormData({ ...formData, target_amount: e.target.value })
                            }
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                  </div>
                </Col>
              )}

              {/* Row: Notes */}
              <Col xs={12}>
                <FormGroup className="mb-0">
                  <Label className="fw-semibold text-muted mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                    NOTES / REMARKS
                  </Label>
                  <Input
                    bsSize="sm"
                    type="text"
                    placeholder="Optional notes regarding role, experience, or shift..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </FormGroup>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter className="bg-light py-2 px-3 border-top">
            <Button size="sm" color="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" color="primary" type="submit" disabled={saving}>
              {saving ? <Spinner size="sm" className="me-2" /> : null}
              {editingId ? "Save Changes & Commission" : "Create Executive"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Container>
  );
};

export default SalesPersons;

