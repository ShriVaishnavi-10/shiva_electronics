import React, { useState, useMemo } from "react";
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
  FaMoneyBillWave,
  FaBullseye,
  FaPercentage,
  FaCheckCircle,
  FaUserTie,
  FaSyncAlt,
  FaHandshake,
  FaCashRegister,
  FaUsers,
  FaShieldAlt
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
  const [selectedRoleType, setSelectedRoleType] = useState("All"); // All, Sales, Cashier
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
    designation: "Sales Executive",
    commission_rate: "",
    target_amount: "",
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
    login_role: "Sales Person" // 'Sales Person' or 'Cashier'
  });

  // Helper to determine role type
  const isCashierStaff = (emp) => {
    const desig = String(emp.designation || "").toLowerCase();
    const role = String(emp.login_role || emp.role || "").toLowerCase();
    const dept = String(emp.department || "").toLowerCase();
    return desig.includes("cashier") || role.includes("cashier") || dept.includes("accounts");
  };

  const isSalesStaff = (emp) => {
    if (isCashierStaff(emp)) return false;
    const desig = String(emp.designation || "").toLowerCase();
    const role = String(emp.login_role || emp.role || "").toLowerCase();
    const dept = String(emp.department || "").toLowerCase();
    return (
      emp.sales_person_id != null ||
      emp.sp_id != null ||
      desig.includes("sales") ||
      role.includes("sales") ||
      dept.includes("sales")
    );
  };

  // Filter to store staff (Sales Persons + Cashiers), excluding admin/management
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const storeStaff = useMemo(() => {
    return safeEmployees.filter((emp) => {
      const code = String(emp.employee_code || "").toUpperCase();
      if (code === "EMP-ADM" || code === "EMP-SUPER" || emp.user_id === 1 || emp.user_id === 4) {
        return false;
      }
      return isCashierStaff(emp) || isSalesStaff(emp);
    });
  }, [safeEmployees]);

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return storeStaff.filter((emp) => {
      const matchesSearch =
        !term ||
        emp.name?.toLowerCase().includes(term) ||
        emp.employee_code?.toLowerCase().includes(term) ||
        emp.sp_code?.toLowerCase().includes(term) ||
        emp.phone?.includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.designation?.toLowerCase().includes(term);

      const matchesStatus = selectedStatus === "All" || emp.status === selectedStatus;

      let matchesRole = true;
      if (selectedRoleType === "Sales") matchesRole = isSalesStaff(emp);
      else if (selectedRoleType === "Cashier") matchesRole = isCashierStaff(emp);

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [storeStaff, searchTerm, selectedStatus, selectedRoleType]);

  // Aggregate Metrics for Store Staff
  const totalStaffCount = storeStaff.length;
  const salesCount = storeStaff.filter(isSalesStaff).length;
  const cashierCount = storeStaff.filter(isCashierStaff).length;
  const totalSalesTarget = storeStaff
    .filter(isSalesStaff)
    .reduce((sum, e) => sum + Number(e.target_amount || 0), 0);

  const handleOpenAdd = (defaultRole = "Sales Person") => {
    setEditingEmployee(null);
    const isCashier = defaultRole === "Cashier";
    setForm({
      name: "",
      employee_code: "",
      email: "",
      phone: "",
      department: isCashier ? "Accounts & Billing" : "Sales & Billing",
      designation: isCashier ? "Cashier" : "Sales Executive",
      commission_rate: "",
      target_amount: "",
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
      login_role: defaultRole
    });
    setActiveFormTab("personal");
    setModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    const isCashier = isCashierStaff(emp);
    setEditingEmployee(emp);
    setForm({
      name: emp.name || "",
      employee_code: emp.employee_code || emp.sp_code || "",
      email: emp.email || "",
      phone: emp.phone || "",
      department: emp.department || (isCashier ? "Accounts & Billing" : "Sales & Billing"),
      designation: emp.designation || (isCashier ? "Cashier" : "Sales Executive"),
      commission_rate: emp.commission_rate ?? "",
      target_amount: emp.target_amount ?? "",
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
      sales_person_id: emp.sales_person_id || emp.sp_id || "",
      notes: emp.notes || "",
      login_username: emp.login_username || emp.username || emp.email || emp.employee_code || "",
      login_password: "",
      pin: emp.pin || "123456",
      login_role: isCashier ? "Cashier" : "Sales Person"
    });
    setActiveFormTab("personal");
    setModalOpen(true);
  };

  const handleOpenView = (emp) => {
    setViewingEmployee(emp);
    setViewModalOpen(true);
  };

  const handleRoleTypeChange = (newRole) => {
    if (newRole === "Cashier") {
      setForm({
        ...form,
        login_role: "Cashier",
        department: "Accounts & Billing",
        designation: "Cashier"
      });
    } else {
      setForm({
        ...form,
        login_role: "Sales Person",
        department: "Sales & Billing",
        designation: "Sales Executive"
      });
    }
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

  return (
    <div>
      {/* STORE STAFF & CASHIERS KPI RIBBON */}
      <Row className="g-3 mb-3">
        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm rounded-3 bg-white h-100">
            <CardBody className="p-3 d-flex align-items-center gap-3">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary"
                style={{ width: 44, height: 44, fontSize: 18 }}
              >
                <FaUsers />
              </div>
              <div>
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: "11px" }}>
                  Total Store Staff
                </small>
                <h4 className="mb-0 fw-bold text-dark">{totalStaffCount}</h4>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm rounded-3 bg-white h-100">
            <CardBody className="p-3 d-flex align-items-center gap-3">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center bg-warning bg-opacity-10 text-warning"
                style={{ width: 44, height: 44, fontSize: 18 }}
              >
                <FaUserTie />
              </div>
              <div>
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: "11px" }}>
                  Sales Representatives
                </small>
                <div className="d-flex align-items-center gap-2">
                  <h4 className="mb-0 fw-bold text-dark">{salesCount}</h4>
                  <span className="badge bg-warning bg-opacity-10 text-warning border border-warning-subtle" style={{ fontSize: "10px" }}>
                    CRM Desk
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm rounded-3 bg-white h-100">
            <CardBody className="p-3 d-flex align-items-center gap-3">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center bg-info bg-opacity-10 text-info"
                style={{ width: 44, height: 44, fontSize: 18 }}
              >
                <FaCashRegister />
              </div>
              <div>
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: "11px" }}>
                  Billing Cashiers
                </small>
                <div className="d-flex align-items-center gap-2">
                  <h4 className="mb-0 fw-bold text-dark">{cashierCount}</h4>
                  <span className="badge bg-info bg-opacity-10 text-info border border-info-subtle" style={{ fontSize: "10px" }}>
                    POS Billing
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm rounded-3 bg-white h-100">
            <CardBody className="p-3 d-flex align-items-center gap-3">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success"
                style={{ width: 44, height: 44, fontSize: 18 }}
              >
                <FaBullseye />
              </div>
              <div>
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: "11px" }}>
                  Monthly Sales Targets
                </small>
                <h4 className="mb-0 fw-bold text-dark">
                  ₹{totalSalesTarget.toLocaleString("en-IN")}
                </h4>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* TOOLBAR */}
      <Card className="border-0 shadow-sm rounded-3 bg-white mb-3">
        <CardBody className="p-3">
          <Row className="g-2 align-items-center">
            <Col xs={12} md={5}>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </span>
                <Input
                  placeholder="Search staff by name, code (SP-001, EMP-009), phone, email, role..."
                  className="border-start-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </Col>

            <Col xs={6} md={2}>
              <Input
                type="select"
                bsSize="sm"
                value={selectedRoleType}
                onChange={(e) => setSelectedRoleType(e.target.value)}
              >
                <option value="All">All Roles ({totalStaffCount})</option>
                <option value="Sales">Sales Persons ({salesCount})</option>
                <option value="Cashier">Cashiers ({cashierCount})</option>
              </Input>
            </Col>

            <Col xs={6} md={2}>
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

            <Col xs={12} md={3} className="text-end">
              <div className="d-flex gap-2">
                <Button
                  size="sm"
                  color="primary"
                  className="d-flex align-items-center gap-1 flex-grow-1 justify-content-center"
                  onClick={() => handleOpenAdd("Sales Person")}
                >
                  <FaUserPlus size={12} /> Add Sales Staff
                </Button>
                <Button
                  size="sm"
                  color="info"
                  className="d-flex align-items-center gap-1 text-white flex-grow-1 justify-content-center"
                  onClick={() => handleOpenAdd("Cashier")}
                >
                  <FaCashRegister size={12} /> Add Cashier
                </Button>
              </div>
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
                  <th className="ps-3">Staff Member & Code</th>
                  <th>Contact Details</th>
                  <th>Department & Role</th>
                  <th>System Access</th>
                  <th>Commission & Targets / Station</th>
                  <th>Joining Date</th>
                  <th>Status</th>
                  <th className="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length ? (
                  filteredEmployees.map((emp) => {
                    const isCashier = isCashierStaff(emp);
                    const staffCode = emp.employee_code || emp.sp_code || (isCashier ? `CSH-${emp.id}` : `SP-${emp.id}`);
                    return (
                      <tr key={emp.id} style={{ fontSize: "0.85rem" }}>
                        {/* 1. Staff Member & Code */}
                        <td className="ps-3">
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${
                                isCashier
                                  ? "bg-info bg-opacity-10 text-info"
                                  : "bg-primary bg-opacity-10 text-primary"
                              }`}
                              style={{ width: 36, height: 36, fontSize: 13 }}
                            >
                              {emp.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="fw-bold text-dark d-flex align-items-center gap-1">
                                {emp.name}
                                {isCashier ? (
                                  <span
                                    className="badge bg-info bg-opacity-10 text-info border border-info-subtle"
                                    style={{ fontSize: "10px", padding: "1px 6px" }}
                                    title="Store Cashier: POS Billing & Day Closing Access"
                                  >
                                    CASHIER
                                  </span>
                                ) : (
                                  <span
                                    className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle"
                                    style={{ fontSize: "10px", padding: "1px 6px" }}
                                    title="Sales Executive: CRM Pipeline & Commissions"
                                  >
                                    SALES
                                  </span>
                                )}
                              </div>
                              <small className="badge bg-light text-secondary border font-monospace" style={{ fontSize: "11px" }}>
                                {staffCode}
                              </small>
                            </div>
                          </div>
                        </td>

                        {/* 2. Contact Details */}
                        <td>
                          <div className="small text-dark fw-medium d-flex align-items-center gap-1">
                            <FaPhoneAlt size={10} className="text-muted" />
                            {emp.phone || "—"}
                          </div>
                          <small className="text-muted d-flex align-items-center gap-1">
                            <FaEnvelope size={10} className="text-muted" />
                            {emp.email || "—"}
                          </small>
                        </td>

                        {/* 3. Department & Designation */}
                        <td>
                          <div className="fw-semibold text-dark">
                            {emp.department || (isCashier ? "Accounts & Billing" : "Sales & Billing")}
                          </div>
                          <small className="text-muted">
                            {emp.designation || (isCashier ? "Cashier & Billing Officer" : "Sales Executive")}
                          </small>
                        </td>

                        {/* 4. System Access */}
                        <td>
                          {isCashier ? (
                            <div>
                              <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle d-inline-flex align-items-center gap-1">
                                <FaCashRegister size={10} /> POS Sale Billing
                              </span>
                              <div className="text-muted" style={{ fontSize: "11px" }}>
                                + HRMS Attendance
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="badge bg-warning bg-opacity-10 text-dark border border-warning-subtle d-inline-flex align-items-center gap-1">
                                <FaHandshake size={10} /> CRM Suite
                              </span>
                              <div className="text-muted" style={{ fontSize: "11px" }}>
                                + HRMS Attendance
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 5. Commission & Targets / Counter Station */}
                        <td>
                          {isCashier ? (
                            <div>
                              <div className="small fw-semibold text-info d-flex align-items-center gap-1">
                                <FaCashRegister size={11} /> POS Counter Desk
                              </div>
                              <small className="text-muted">
                                Cash & Digital Billing Station
                              </small>
                            </div>
                          ) : (
                            <div>
                              <div className="small fw-semibold text-primary">
                                <FaPercentage size={10} className="me-1" />
                                {emp.commission_rate ? `${emp.commission_rate}% Commission` : "Standard Comm."}
                              </div>
                              <small className="text-muted">
                                <FaBullseye size={10} className="me-1 text-warning" />
                                {emp.target_amount ? `Target: ₹${Number(emp.target_amount).toLocaleString("en-IN")}` : "No Target"}
                              </small>
                            </div>
                          )}
                        </td>

                        {/* 6. Joining Date */}
                        <td>
                          <small className="text-secondary">
                            {emp.joining_date ? emp.joining_date.slice(0, 10) : "—"}
                          </small>
                        </td>

                        {/* 7. Status */}
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
                            {emp.status || "Active"}
                          </Badge>
                        </td>

                        {/* 8. Actions */}
                        <td className="text-end pe-3">
                          <div className="btn-group btn-group-sm">
                            <Button
                              size="sm"
                              outline
                              color="info"
                              onClick={() => handleOpenView(emp)}
                              title="View Dossier"
                            >
                              <FaEye size={11} />
                            </Button>
                            <Button
                              size="sm"
                              outline
                              color="secondary"
                              onClick={() => handleOpenEdit(emp)}
                              title="Edit Details"
                            >
                              <FaEdit size={11} />
                            </Button>
                            <Button
                              size="sm"
                              outline
                              color="danger"
                              onClick={async () => {
                                if (!window.confirm(`Are you sure you want to remove staff member ${emp.name}?`)) return;
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
                                  alert(err.response?.data?.message || err.message || "Failed to remove staff member");
                                }
                              }}
                              title="Remove Staff"
                            >
                              <FaTrash size={11} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      <FaUsers size={32} className="text-muted opacity-50 mb-2" />
                      <div>No store staff members match the selected filter.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>

      {/* ADD / EDIT STAFF MODAL WITH TABS */}
      <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)} centered size="lg">
        <ModalHeader toggle={() => setModalOpen(false)}>
          {editingEmployee
            ? `Edit Staff Member (${editingEmployee.name})`
            : form.login_role === "Cashier"
            ? "Add New Cashier & Billing Officer"
            : "Add New Sales Representative"}
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
                  1. Identity & Contact
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={activeFormTab === "employment" ? "active fw-bold" : "text-muted cursor-pointer"}
                  onClick={() => setActiveFormTab("employment")}
                >
                  {form.login_role === "Cashier" ? "2. Cashier Desk & Station" : "2. Sales Role & Targets"}
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={activeFormTab === "bank" ? "active fw-bold" : "text-muted cursor-pointer"}
                  onClick={() => setActiveFormTab("bank")}
                >
                  3. Bank & Salary
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={activeFormTab === "login" ? "active fw-bold text-warning" : "text-muted cursor-pointer"}
                  onClick={() => setActiveFormTab("login")}
                >
                  ✦ 4. Login Credentials & System Role
                </NavLink>
              </NavItem>
            </Nav>

            {/* TAB 1: PERSONAL & CONTACT */}
            {activeFormTab === "personal" && (
              <Row className="g-3">
                <Col md={6}>
                  <Label className="fw-semibold small">Full Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Ramya or Ramesh Kumar"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fw-semibold small">Phone Number *</Label>
                  <Input
                    required
                    placeholder="e.g. 9898978908"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fw-semibold small">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="e.g. ramya@gmail.com"
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

            {/* TAB 2: ROLE, TARGETS & RESPONSIBILITIES */}
            {activeFormTab === "employment" && (
              <Row className="g-3">
                <Col md={12}>
                  <div className="p-2 border rounded bg-light d-flex align-items-center justify-content-between mb-1">
                    <div>
                      <div className="fw-bold small text-dark">Staff Assignment Type</div>
                      <small className="text-muted">Select whether this staff is a Sales Executive or POS Cashier</small>
                    </div>
                    <div className="btn-group btn-group-sm">
                      <Button
                        type="button"
                        color={form.login_role === "Sales Person" ? "primary" : "outline-secondary"}
                        onClick={() => handleRoleTypeChange("Sales Person")}
                      >
                        <FaUserTie className="me-1" /> Sales Representative
                      </Button>
                      <Button
                        type="button"
                        color={form.login_role === "Cashier" ? "info" : "outline-secondary"}
                        className={form.login_role === "Cashier" ? "text-white" : ""}
                        onClick={() => handleRoleTypeChange("Cashier")}
                      >
                        <FaCashRegister className="me-1" /> Cashier & Billing Desk
                      </Button>
                    </div>
                  </div>
                </Col>

                {form.login_role === "Cashier" ? (
                  <Col md={12}>
                    <div className="alert alert-info py-2 px-3 small mb-0 d-flex align-items-center gap-2">
                      <FaCashRegister className="text-info flex-shrink-0" size={16} />
                      <div>
                        <strong>Cashier & Billing Desk:</strong> Cashiers have full access to POS Sale Billing (<code>/sales</code>), Customer Management, Register Day-Closing (<code>/day-closing</code>), and HRMS Self-Service Attendance & Leaves. Sales commissions are optional.
                      </div>
                    </div>
                  </Col>
                ) : (
                  <Col md={12}>
                    <div className="alert alert-warning py-2 px-3 small mb-0 d-flex align-items-center gap-2">
                      <FaBullseye className="text-warning flex-shrink-0" size={16} />
                      <div>
                        <strong>Sales Representative:</strong> Sales executives have access to their CRM Allocated Workstation (<code>/crm</code>), assigned inquiries, commissions, and monthly sales targets.
                      </div>
                    </div>
                  </Col>
                )}

                <Col md={6}>
                  <Label className="fw-semibold small">Employee / Staff Code</Label>
                  <Input
                    placeholder={form.login_role === "Cashier" ? "e.g. EMP-009 or CSH-001" : "e.g. EMP-001 or SP-001"}
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
                    <option value="Accounts & Billing">Accounts & Billing</option>
                    <option value="Sales & Billing">Sales & Billing</option>
                    <option value="Operations">Operations</option>
                  </Input>
                </Col>

                <Col md={6}>
                  <Label className="fw-semibold small">Designation / Role Title</Label>
                  <Input
                    type="select"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  >
                    {form.login_role === "Cashier" ? (
                      <>
                        <option value="Cashier">Cashier</option>
                        <option value="Cashier & Billing Officer">Cashier & Billing Officer</option>
                        <option value="Head Cashier">Head Cashier</option>
                        <option value="POS Billing Operator">POS Billing Operator</option>
                      </>
                    ) : (
                      <>
                        <option value="Sales Executive">Sales Executive</option>
                        <option value="Senior Sales Executive">Senior Sales Executive</option>
                        <option value="Store Manager">Store Manager</option>
                        <option value="Counter Sales Rep">Counter Sales Rep</option>
                      </>
                    )}
                  </Input>
                </Col>

                <Col md={6}>
                  <Label className="fw-semibold small">Joining Date</Label>
                  <Input
                    type="date"
                    value={form.joining_date}
                    onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                  />
                </Col>

                {form.login_role === "Sales Person" ? (
                  <>
                    <Col md={6}>
                      <Label className="fw-semibold small">Sales Commission Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 5.0"
                        value={form.commission_rate}
                        onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
                      />
                    </Col>
                    <Col md={6}>
                      <Label className="fw-semibold small">Monthly Sales Target (₹)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 300000"
                        value={form.target_amount}
                        onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                      />
                    </Col>
                  </>
                ) : (
                  <>
                    <Col md={6}>
                      <Label className="fw-semibold small">Counter Invoicing Target (₹) <span className="text-muted fw-normal">(Optional)</span></Label>
                      <Input
                        type="number"
                        placeholder="e.g. 500000 (Monthly register billing)"
                        value={form.target_amount}
                        onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                      />
                    </Col>
                    <Col md={6}>
                      <Label className="fw-semibold small">POS Counter Desk / Register Number</Label>
                      <Input
                        type="text"
                        placeholder="e.g. Counter 1 - Main Floor Billing"
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </Col>
                  </>
                )}

                <Col md={6}>
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

                <Col md={6}>
                  <Label className="fw-semibold small">Status</Label>
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
              </Row>
            )}

            {/* TAB 3: BANK & SALARY */}
            {activeFormTab === "bank" && (
              <Row className="g-3">
                <Col md={6}>
                  <Label className="fw-semibold small">Monthly Base Salary (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 25000"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Label className="fw-semibold small">Bank Name</Label>
                  <Input
                    placeholder="e.g. State Bank of India"
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
                    placeholder="e.g. SBIN0001234"
                    value={form.ifsc_code}
                    onChange={(e) => setForm({ ...form, ifsc_code: e.target.value.toUpperCase() })}
                  />
                </Col>
              </Row>
            )}

            {/* TAB 4: SYSTEM CREDENTIALS & ACCESS ROLE */}
            {activeFormTab === "login" && (
              <Row className="g-3">
                <Col md={12}>
                  {form.login_role === "Cashier" ? (
                    <div className="alert alert-info py-2 px-3 small mb-0 d-flex align-items-center gap-2">
                      <FaShieldAlt className="text-info flex-shrink-0" size={16} />
                      <span>
                        <strong>Cashier Credentials:</strong> Enables login to <strong>POS Sale Billing</strong>, register day closing, invoice printing, and the <strong>HRMS Portal</strong> for attendance and leaves.
                      </span>
                    </div>
                  ) : (
                    <div className="alert alert-primary py-2 px-3 small mb-0 d-flex align-items-center gap-2">
                      <FaShieldAlt className="text-primary flex-shrink-0" size={16} />
                      <span>
                        <strong>Sales Person Credentials:</strong> Enables login to their dedicated <strong>CRM Suite</strong> and <strong>HRMS Portal</strong>.
                      </span>
                    </div>
                  )}
                </Col>

                <Col md={6}>
                  <Label className="fw-semibold small">Portal Access Role *</Label>
                  <Input
                    type="select"
                    value={form.login_role}
                    onChange={(e) => handleRoleTypeChange(e.target.value)}
                  >
                    <option value="Cashier">Cashier (POS Sale Billing + Day Closing + HRMS)</option>
                    <option value="Sales Person">Sales Person (CRM Deals + Leads + HRMS)</option>
                  </Input>
                </Col>

                <Col md={6}>
                  <Label className="fw-semibold small">Login Username / Email *</Label>
                  <Input
                    placeholder={form.email || form.employee_code || "e.g. ramya@gmail.com"}
                    value={form.login_username || ""}
                    onChange={(e) => setForm({ ...form, login_username: e.target.value })}
                  />
                  <small className="text-muted" style={{ fontSize: "11px" }}>
                    Used to sign in to Shiva Electronics
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
                  <small className="text-muted" style={{ fontSize: "11px" }}>
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
                  <small className="text-muted" style={{ fontSize: "11px" }}>
                    Used for live punching & kiosk check-in (Default: 123456)
                  </small>
                </Col>
              </Row>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" type="submit">
              {editingEmployee
                ? `Update ${form.login_role === "Cashier" ? "Cashier" : "Sales Person"}`
                : `Save ${form.login_role === "Cashier" ? "Cashier" : "Sales Person"}`}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* VIEW DOSSIER MODAL */}
      {viewingEmployee && (
        <Modal isOpen={viewModalOpen} toggle={() => setViewModalOpen(false)} centered size="md">
          <ModalHeader toggle={() => setViewModalOpen(false)}>
            {isCashierStaff(viewingEmployee) ? "Cashier Profile Dossier" : "Sales Person Profile Dossier"}
          </ModalHeader>
          <ModalBody className="p-3">
            <div className="d-flex align-items-center gap-3 pb-3 border-bottom mb-3">
              <div
                className={`rounded-circle d-flex align-items-center justify-content-center text-white fw-bold fs-5 ${
                  isCashierStaff(viewingEmployee) ? "bg-info" : "bg-primary"
                }`}
                style={{ width: 50, height: 50 }}
              >
                {viewingEmployee.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h5 className="mb-0 fw-bold">{viewingEmployee.name}</h5>
                <span className="badge bg-light text-dark border me-1">
                  {viewingEmployee.employee_code || viewingEmployee.sp_code}
                </span>
                {isCashierStaff(viewingEmployee) ? (
                  <span className="badge bg-info">Cashier & Billing Desk</span>
                ) : (
                  <span className="badge bg-primary">Sales & Billing</span>
                )}
              </div>
            </div>

            <div className="row g-2 small">
              <div className="col-6">
                <strong>System Role:</strong> {isCashierStaff(viewingEmployee) ? "Cashier (POS Billing)" : "Sales Representative"}
              </div>
              <div className="col-6">
                <strong>Designation:</strong> {viewingEmployee.designation || (isCashierStaff(viewingEmployee) ? "Cashier" : "Sales Executive")}
              </div>
              <div className="col-6">
                <strong>Department:</strong> {viewingEmployee.department || (isCashierStaff(viewingEmployee) ? "Accounts & Billing" : "Sales & Billing")}
              </div>
              <div className="col-6">
                <strong>Status:</strong> {viewingEmployee.status || "Active"}
              </div>
              <div className="col-6">
                <strong>Phone:</strong> {viewingEmployee.phone || "—"}
              </div>
              <div className="col-6">
                <strong>Email:</strong> {viewingEmployee.email || "—"}
              </div>
              {isCashierStaff(viewingEmployee) ? (
                <>
                  <div className="col-12">
                    <strong>Assigned Responsibilities:</strong> POS Counter Billing, Day Closing, Cash Register & HRMS Portal
                  </div>
                </>
              ) : (
                <>
                  <div className="col-6">
                    <strong>Commission Rate:</strong> {viewingEmployee.commission_rate ? `${viewingEmployee.commission_rate}%` : "Standard"}
                  </div>
                  <div className="col-6">
                    <strong>Sales Target:</strong> {viewingEmployee.target_amount ? `₹${Number(viewingEmployee.target_amount).toLocaleString("en-IN")}` : "No Target"}
                  </div>
                </>
              )}
              <div className="col-6">
                <strong>Joining Date:</strong> {viewingEmployee.joining_date ? viewingEmployee.joining_date.slice(0, 10) : "—"}
              </div>
              <div className="col-6">
                <strong>Base Salary:</strong> {viewingEmployee.salary ? `₹${Number(viewingEmployee.salary).toLocaleString("en-IN")}` : "—"}
              </div>
              <div className="col-6">
                <strong>PAN:</strong> {viewingEmployee.pan_number || "—"}
              </div>
              <div className="col-6">
                <strong>Aadhaar:</strong> {viewingEmployee.aadhaar_number || "—"}
              </div>
              <div className="col-12">
                <strong>Bank Details:</strong> {viewingEmployee.bank_name ? `${viewingEmployee.bank_name} (A/C: ${viewingEmployee.account_number || "—"}, IFSC: ${viewingEmployee.ifsc_code || "—"})` : "—"}
              </div>
              <div className="col-12">
                <strong>Emergency Contact:</strong> {viewingEmployee.emergency_contact_name ? `${viewingEmployee.emergency_contact_name} (${viewingEmployee.emergency_contact_phone || "—"})` : "—"}
              </div>
              <div className="col-12">
                <strong>Address:</strong> {viewingEmployee.address || "—"}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
