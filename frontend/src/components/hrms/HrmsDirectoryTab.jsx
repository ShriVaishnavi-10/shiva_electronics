import React, { useState } from "react";
import axios from "axios";
import {
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Badge,
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Input,
  Nav,
  NavItem,
  NavLink
} from "reactstrap";
import {
  FaUserPlus,
  FaSearch,
  FaFilter,
  FaIdBadge,
  FaEdit,
  FaTrash,
  FaEye,
  FaPhoneAlt,
  FaEnvelope,
  FaBriefcase,
  FaBuilding,
  FaMoneyBillWave
} from "react-icons/fa";

export default function HrmsDirectoryTab({
  employees = [],
  departments = [],
  designations = [],
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onRefresh,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [activeFormTab, setActiveFormTab] = useState("personal");

  // Form State
  const [form, setForm] = useState({
    name: "",
    employee_code: "",
    email: "",
    phone: "",
    department: "Sales & Billing",
    designation: "Executive",
    joining_date: new Date().toISOString().slice(0, 10),
    employment_type: "Full-Time",
    status: "Active",
    salary: "",
    dob: "",
    gender: "Male",
    pan_number: "",
    aadhaar_number: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    address: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    reporting_manager_id: "",
    sales_person_id: "",
    notes: "",
    login_username: "",
    login_password: "",
    pin: "123456",
    login_role: "Sales Person"
  });

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setForm({
      name: "",
      employee_code: "",
      email: "",
      phone: "",
      department: departments[0]?.name || "Sales & Billing",
      designation: "Executive",
      joining_date: new Date().toISOString().slice(0, 10),
      employment_type: "Full-Time",
      status: "Active",
      salary: "",
      dob: "",
      gender: "Male",
      pan_number: "",
      aadhaar_number: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      address: "",
      bank_name: "",
      account_number: "",
      ifsc_code: "",
      reporting_manager_id: "",
      sales_person_id: "",
      notes: "",
      login_username: "",
      login_password: "",
      pin: "123456",
      login_role: "Sales Person"
    });
    setActiveFormTab("personal");
    setModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmployee(emp);
    setForm({
      name: emp.name || "",
      employee_code: emp.employee_code || "",
      email: emp.email || "",
      phone: emp.phone || "",
      department: emp.department || "Sales & Billing",
      designation: emp.designation || "Executive",
      joining_date: emp.joining_date ? emp.joining_date.slice(0, 10) : "",
      employment_type: emp.employment_type || "Full-Time",
      status: emp.status || "Active",
      salary: emp.salary ?? "",
      dob: emp.dob ? emp.dob.slice(0, 10) : "",
      gender: emp.gender || "Male",
      pan_number: emp.pan_number || "",
      aadhaar_number: emp.aadhaar_number || "",
      emergency_contact_name: emp.emergency_contact_name || "",
      emergency_contact_phone: emp.emergency_contact_phone || "",
      address: emp.address || "",
      bank_name: emp.bank_name || "",
      account_number: emp.account_number || "",
      ifsc_code: emp.ifsc_code || "",
      reporting_manager_id: emp.reporting_manager_id || "",
      sales_person_id: emp.sales_person_id || "",
      notes: emp.notes || "",
      login_username: emp.login_username || emp.username || emp.email || emp.employee_code || "",
      login_password: "",
      pin: emp.pin || "123456",
      login_role: emp.login_role || emp.role || "Sales Person"
    });
    setActiveFormTab("personal");
    setModalOpen(true);
  };

  const handleOpenView = (emp) => {
    setViewingEmployee(emp);
    setViewModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      if (editingEmployee) {
        if (onUpdateEmployee) {
          onUpdateEmployee(editingEmployee.id, form);
        } else {
          await axios.put(`${BACKEND_URL}/api/hrms/employees/${editingEmployee.id}`, form, { headers });
        }
      } else {
        if (onAddEmployee) {
          onAddEmployee(form);
        } else {
          await axios.post(`${BACKEND_URL}/api/hrms/employees`, form, { headers });
        }
      }
      setModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Employee submit error:", err);
      alert(err.response?.data?.message || err.message || "Failed to save employee");
    }
  };

  const safeEmployees = Array.isArray(employees) ? employees : [];
  const filteredEmployees = safeEmployees.filter((emp) => {
    const matchesSearch =
      !searchTerm ||
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone?.includes(searchTerm);
    const matchesDept = selectedDept === "All" || emp.department === selectedDept;
    const matchesStatus = selectedStatus === "All" || emp.status === selectedStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div>
      {/* TOOLBAR */}
      <Card className="border-0 shadow-sm rounded-3 bg-white mb-3">
        <CardBody className="p-3">
          <Row className="g-2 align-items-center">
            <Col xs={12} md={4}>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </span>
                <Input
                  placeholder="Search by name, code, phone..."
                  className="border-start-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </Col>
            <Col xs={6} md={3}>
              <Input
                type="select"
                bsSize="sm"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="All">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </Input>
            </Col>
            <Col xs={6} md={3}>
              <Input
                type="select"
                bsSize="sm"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="On Notice">On Notice</option>
                <option value="On Leave">On Leave</option>
                <option value="Resigned">Resigned</option>
                <option value="Terminated">Terminated</option>
              </Input>
            </Col>
            <Col xs={12} md={2} className="text-md-end">
              <Button size="sm" color="primary" className="d-flex align-items-center gap-1 w-100 justify-content-center" onClick={handleOpenAdd}>
                <FaUserPlus size={12} /> Add Employee
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* DIRECTORY TABLE */}
      <Card className="border-0 shadow-sm rounded-3 bg-white">
        <CardBody className="p-0">
          <div className="table-responsive">
            <Table hover className="align-middle mb-0">
              <thead className="table-light">
                <tr style={{ fontSize: "0.82rem" }}>
                  <th className="ps-3">Employee</th>
                  <th>Contact</th>
                  <th>Department & Role</th>
                  <th>Joining Date</th>
                  <th>Status</th>
                  <th>Salary</th>
                  <th className="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length ? (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} style={{ fontSize: "0.85rem" }}>
                      <td className="ps-3">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary fw-bold"
                            style={{ width: 34, height: 34, fontSize: 13 }}
                          >
                            {emp.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{emp.name}</div>
                            <small className="text-muted">{emp.employee_code || "EMP"}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="small text-secondary">{emp.phone || "—"}</div>
                        <small className="text-muted">{emp.email || "—"}</small>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{emp.department}</div>
                        <small className="text-muted">{emp.designation}</small>
                      </td>
                      <td>
                        <small className="text-secondary">
                          {emp.joining_date ? emp.joining_date.slice(0, 10) : "—"}
                        </small>
                      </td>
                      <td>
                        <Badge
                          color={
                            emp.status === "Active"
                              ? "success"
                              : emp.status === "On Notice"
                              ? "warning"
                              : "secondary"
                          }
                          pill
                        >
                          {emp.status}
                        </Badge>
                      </td>
                      <td className="fw-semibold text-dark">
                        {emp.salary ? `₹${Number(emp.salary).toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="text-end pe-3">
                        <div className="btn-group btn-group-sm">
                          <Button size="sm" outline color="info" onClick={() => handleOpenView(emp)} title="View Dossier">
                            <FaEye size={11} />
                          </Button>
                          <Button size="sm" outline color="secondary" onClick={() => handleOpenEdit(emp)} title="Edit Employee">
                            <FaEdit size={11} />
                          </Button>
                          <Button
                            size="sm"
                            outline
                            color="danger"
                            onClick={async () => {
                              if (!window.confirm(`Are you sure you want to remove ${emp.name}?`)) return;
                              try {
                                if (onDeleteEmployee) {
                                  onDeleteEmployee(emp.id);
                                } else {
                                  const token = localStorage.getItem("token");
                                  const headers = token ? { Authorization: `Bearer ${token}` } : {};
                                  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
                                  await axios.delete(`${BACKEND_URL}/api/hrms/employees/${emp.id}`, { headers });
                                }
                                if (onRefresh) onRefresh();
                              } catch (err) {
                                console.error("Employee delete error:", err);
                                alert(err.response?.data?.message || err.message || "Failed to remove employee");
                              }
                            }}
                            title="Remove"
                          >
                            <FaTrash size={11} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      No employees match the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>

      {/* ADD / EDIT EMPLOYEE MODAL WITH TABS */}
      <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)} centered size="lg">
        <ModalHeader toggle={() => setModalOpen(false)}>
          {editingEmployee ? `Edit Employee (${editingEmployee.name})` : "Add New Employee"}
        </ModalHeader>
        <Form onSubmit={handleSubmit}>
          <ModalBody className="p-3">
            {/* Nav Tabs */}
            <Nav tabs className="mb-3">
              <NavItem>
                <NavLink
                  className={activeFormTab === "personal" ? "active fw-bold" : "text-muted cursor-pointer"}
                  onClick={() => setActiveFormTab("personal")}
                >
                  1. Personal & Identity
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={activeFormTab === "employment" ? "active fw-bold" : "text-muted cursor-pointer"}
                  onClick={() => setActiveFormTab("employment")}
                >
                  2. Employment & Role
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={activeFormTab === "bank" ? "active fw-bold" : "text-muted cursor-pointer"}
                  onClick={() => setActiveFormTab("bank")}
                >
                  3. Bank & Statutory
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={activeFormTab === "login" ? "active fw-bold text-warning" : "text-muted cursor-pointer"}
                  onClick={() => setActiveFormTab("login")}
                >
                  ✦ 4. Login Credentials
                </NavLink>
              </NavItem>
            </Nav>

            {/* TAB 1: PERSONAL & IDENTITY */}
            {activeFormTab === "personal" && (
              <Row className="g-3">
                <Col md={6}>
                  <Label className="fw-semibold small">Full Name *</Label>
                  <Input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fw-semibold small">Phone Number</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fw-semibold small">Email Address</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Col>
                <Col md={3}>
                  <Label className="fw-semibold small">Date of Birth</Label>
                  <Input
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  />
                </Col>
                <Col md={3}>
                  <Label className="fw-semibold small">Gender</Label>
                  <Input
                    type="select"
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Input>
                </Col>
                <Col md={6}>
                  <Label className="fw-semibold small">PAN Number</Label>
                  <Input
                    value={form.pan_number}
                    onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase() })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fw-semibold small">Aadhaar Number</Label>
                  <Input
                    value={form.aadhaar_number}
                    onChange={(e) => setForm({ ...form, aadhaar_number: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fw-semibold small">Emergency Contact Person</Label>
                  <Input
                    value={form.emergency_contact_name}
                    onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fw-semibold small">Emergency Contact Phone</Label>
                  <Input
                    value={form.emergency_contact_phone}
                    onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                  />
                </Col>
                <Col md={12}>
                  <Label className="fw-semibold small">Residential Address</Label>
                  <Input
                    type="textarea"
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </Col>
              </Row>
            )}

            {/* TAB 2: EMPLOYMENT & ROLE */}
            {activeFormTab === "employment" && (
              <Row className="g-3">
                <Col md={6}>
                  <Label className="fw-semibold small">Employee Code (Auto if blank)</Label>
                  <Input
                    placeholder="e.g. EMP-001"
                    value={form.employee_code}
                    onChange={(e) => setForm({ ...form, employee_code: e.target.value.toUpperCase() })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fw-semibold small">Department</Label>
                  <Input
                    type="select"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </Input>
                </Col>
                <Col md={6}>
                  <Label className="fw-semibold small">Designation / Role</Label>
                  <Input
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fw-semibold small">Joining Date</Label>
                  <Input
                    type="date"
                    value={form.joining_date}
                    onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                  />
                </Col>
                <Col md={4}>
                  <Label className="fw-semibold small">Employment Type</Label>
                  <Input
                    type="select"
                    value={form.employment_type}
                    onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Trainee">Trainee</option>
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="fw-semibold small">Employment Status</Label>
                  <Input
                    type="select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="On Notice">On Notice</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Resigned">Resigned</option>
                    <option value="Terminated">Terminated</option>
                  </Input>
                </Col>
                <Col md={4}>
                  <Label className="fw-semibold small">Billing Salesperson ID (Optional)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1"
                    value={form.sales_person_id}
                    onChange={(e) => setForm({ ...form, sales_person_id: e.target.value })}
                  />
                </Col>
                <Col md={12}>
                  <Label className="fw-semibold small">Notes / Work History</Label>
                  <Input
                    type="textarea"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </Col>
              </Row>
            )}

            {/* TAB 3: BANK & STATUTORY */}
            {activeFormTab === "bank" && (
              <Row className="g-3">
                <Col md={6}>
                  <Label className="fw-semibold small">Monthly Base Salary (₹)</Label>
                  <Input
                    type="number"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fw-semibold small">Bank Name</Label>
                  <Input
                    placeholder="e.g. HDFC Bank, SBI"
                    value={form.bank_name}
                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fw-semibold small">Bank Account Number</Label>
                  <Input
                    value={form.account_number}
                    onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fw-semibold small">IFSC Code</Label>
                  <Input
                    value={form.ifsc_code}
                    onChange={(e) => setForm({ ...form, ifsc_code: e.target.value.toUpperCase() })}
                  />
                </Col>
              </Row>
            )}

            {/* TAB 4: PORTAL LOGIN & ACCESS CREDENTIALS */}
            {activeFormTab === "login" && (
              <Row className="g-3">
                <Col md={12}>
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(217, 119, 6, 0.15)', border: '1px solid rgba(217, 119, 6, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309', fontSize: '16px', fontWeight: 800 }}>
                      ✦
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>Staff HRMS Portal Login Credentials</div>
                      <div style={{ fontSize: '11.5px', color: '#78350f' }}>
                        Set the login username and password for this employee. They can sign in directly on the main login screen using this username/email and password, automatically landing on their personal HRMS dashboard.
                      </div>
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <Label className="fw-semibold small">Login Username / Email</Label>
                  <Input
                    placeholder={form.email || form.employee_code || "e.g. employee username"}
                    value={form.login_username || ""}
                    onChange={(e) => setForm({ ...form, login_username: e.target.value })}
                  />
                  <small className="text-muted" style={{ fontSize: '11px' }}>
                    Defaults to Email Address or Staff ID
                  </small>
                </Col>

                <Col md={6}>
                  <Label className="fw-semibold small">
                    Login Password {editingEmployee ? "(Leave blank to keep unchanged)" : "*"}
                  </Label>
                  <Input
                    type="text"
                    placeholder={editingEmployee ? "•••••••• (Unchanged)" : "Default: 123456"}
                    value={form.login_password || ""}
                    onChange={(e) => setForm({ ...form, login_password: e.target.value })}
                  />
                  <small className="text-muted" style={{ fontSize: '11px' }}>
                    Default initial password is: <strong>123456</strong>
                  </small>
                </Col>

                <Col md={6}>
                  <Label className="fw-semibold small">Daily Attendance Check-in PIN</Label>
                  <Input
                    placeholder="e.g. 123456"
                    value={form.pin || ""}
                    onChange={(e) => setForm({ ...form, pin: e.target.value })}
                  />
                  <small className="text-muted" style={{ fontSize: '11px' }}>
                    Used for live punching & kiosk check-in (Default: 123456)
                  </small>
                </Col>

                <Col md={6}>
                  <Label className="fw-semibold small">Portal Access Role</Label>
                  <Input
                    type="select"
                    value={form.login_role || "Sales Person"}
                    onChange={(e) => setForm({ ...form, login_role: e.target.value })}
                  >
                    <option value="Sales Person">Sales Person (HRMS ESS + Billing Commissions)</option>
                    <option value="Cashier">Cashier (Billing Counter & Invoicing)</option>
                  </Input>
                  <small className="text-muted" style={{ fontSize: '11px' }}>
                    Determines self-service access & billing performance permissions
                  </small>
                </Col>
              </Row>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button color="primary" type="submit">
              {editingEmployee ? "Update Employee" : "Save Employee"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* VIEW DOSSIER MODAL */}
      {viewingEmployee && (
        <Modal isOpen={viewModalOpen} toggle={() => setViewModalOpen(false)} centered size="md">
          <ModalHeader toggle={() => setViewModalOpen(false)}>
            Employee Profile Dossier
          </ModalHeader>
          <ModalBody className="p-3">
            <div className="d-flex align-items-center gap-3 pb-3 border-bottom mb-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center bg-primary text-white fw-bold fs-5"
                style={{ width: 50, height: 50 }}
              >
                {viewingEmployee.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h5 className="mb-0 fw-bold">{viewingEmployee.name}</h5>
                <span className="badge bg-light text-dark border me-1">{viewingEmployee.employee_code}</span>
                <span className="badge bg-primary">{viewingEmployee.department}</span>
              </div>
            </div>

            <div className="row g-2 small">
              <div className="col-6"><strong>Role:</strong> {viewingEmployee.designation || "—"}</div>
              <div className="col-6"><strong>Status:</strong> {viewingEmployee.status || "—"}</div>
              <div className="col-6"><strong>Phone:</strong> {viewingEmployee.phone || "—"}</div>
              <div className="col-6"><strong>Email:</strong> {viewingEmployee.email || "—"}</div>
              <div className="col-6"><strong>Joining Date:</strong> {viewingEmployee.joining_date ? viewingEmployee.joining_date.slice(0, 10) : "—"}</div>
              <div className="col-6"><strong>Salary:</strong> {viewingEmployee.salary ? `₹${Number(viewingEmployee.salary).toLocaleString("en-IN")}` : "—"}</div>
              <div className="col-6"><strong>PAN:</strong> {viewingEmployee.pan_number || "—"}</div>
              <div className="col-6"><strong>Aadhaar:</strong> {viewingEmployee.aadhaar_number || "—"}</div>
              <div className="col-12"><strong>Bank:</strong> {viewingEmployee.bank_name ? `${viewingEmployee.bank_name} (A/C: ${viewingEmployee.account_number || "—"}, IFSC: ${viewingEmployee.ifsc_code || "—"})` : "—"}</div>
              <div className="col-12"><strong>Emergency Contact:</strong> {viewingEmployee.emergency_contact_name ? `${viewingEmployee.emergency_contact_name} (${viewingEmployee.emergency_contact_phone || "—"})` : "—"}</div>
              <div className="col-12"><strong>Address:</strong> {viewingEmployee.address || "—"}</div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setViewModalOpen(false)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}

