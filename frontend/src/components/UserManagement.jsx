import React, { useEffect, useState } from "react";
import {
  Container, Row, Col, Table, Button, Input, Modal, ModalHeader, ModalBody, ModalFooter,
  FormGroup, Label, Badge, Nav, NavItem, NavLink, TabContent, TabPane,
} from "reactstrap";
import { FaEdit, FaTrash, FaPlus, FaUserShield, FaKey } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../utils/api";

const emptyUser = {
  username: "", password: "", full_name: "", email: "", phone: "",
  role_id: "", branch_ids: [], status: "Active",
};

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("users");

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [userModal, setUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ ...emptyUser });
  const [editUserId, setEditUserId] = useState(null);

  const [roleModal, setRoleModal] = useState(false);
  const [roleForm, setRoleForm] = useState({ role_name: "", description: "" });
  const [editRoleId, setEditRoleId] = useState(null);

  const [permModal, setPermModal] = useState(false);
  const [permRoleId, setPermRoleId] = useState(null);
  const [permRoleName, setPermRoleName] = useState("");
  const [allPerms, setAllPerms] = useState([]);
  const [rolePerms, setRolePerms] = useState([]);

  const loadUsers = () => api.get("/users").then((r) => setUsers(r.data)).catch(() => {});
  const loadRoles = () => api.get("/roles").then((r) => setRoles(r.data)).catch(() => {});
  const loadBranches = () => api.get("/branches").then((r) => setBranches(r.data)).catch(() => {});

  useEffect(() => { loadUsers(); loadRoles(); loadBranches(); }, []);

  /* ---- User CRUD ---- */
  const toggleUser = () => {
    setUserModal(!userModal);
    if (userModal) { setUserForm({ ...emptyUser }); setEditUserId(null); }
  };

  const openEditUser = async (u) => {
    try {
      const res = await api.get(`/users/${u.id}`);
      const data = res.data;
      setUserForm({
        username: data.username || "",
        password: "",
        full_name: data.full_name || "",
        email: data.email || "",
        phone: data.phone || "",
        role_id: data.role_id || "",
        branch_ids: data.branch_ids || [],
        status: data.status || "Active",
      });
      setEditUserId(data.id);
      setUserModal(true);
    } catch {
      toast.error("Failed to load user");
    }
  };

  const toggleBranchSelection = (branchId) => {
    const id = parseInt(branchId, 10);
    setUserForm((prev) => {
      const current = prev.branch_ids || [];
      return {
        ...prev,
        branch_ids: current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id],
      };
    });
  };

  const saveUser = async () => {
    if (!userForm.username?.trim()) return toast.error("Username required");
    if (!editUserId && !userForm.password?.trim()) return toast.error("Password required");
    try {
      if (editUserId) {
        await api.put(`/users/${editUserId}`, userForm);
        toast.success("User updated");
      } else {
        await api.post("/users", userForm);
        toast.success("User created");
      }
      toggleUser();
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const removeUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("User deleted");
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  /* ---- Role CRUD ---- */
  const toggleRole = () => {
    setRoleModal(!roleModal);
    if (roleModal) { setRoleForm({ role_name: "", description: "" }); setEditRoleId(null); }
  };
  const openEditRole = (r) => { setRoleForm(r); setEditRoleId(r.id); setRoleModal(true); };

  const saveRole = async () => {
    if (!roleForm.role_name?.trim()) return toast.error("Role name required");
    try {
      if (editRoleId) { await api.put(`/roles/${editRoleId}`, roleForm); toast.success("Role updated"); }
      else { await api.post("/roles", roleForm); toast.success("Role created"); }
      toggleRole(); loadRoles();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const removeRole = async (id) => {
    if (!window.confirm("Delete this role?")) return;
    try { await api.delete(`/roles/${id}`); toast.success("Role deleted"); loadRoles(); }
    catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  /* ---- Permissions ---- */
  const openPermissions = async (role) => {
    setPermRoleId(role.id);
    setPermRoleName(role.role_name);
    try {
      const [allRes, roleRes] = await Promise.all([
        api.get("/roles/permissions"),
        api.get(`/roles/${role.id}/permissions`),
      ]);
      setAllPerms(allRes.data || []);
      setRolePerms((roleRes.data || []).map((p) => p.id));
      setPermModal(true);
    } catch { toast.error("Failed to load permissions"); }
  };

  const togglePerm = (pid) => {
    setRolePerms((prev) => prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]);
  };

  const savePermissions = async () => {
    try {
      await api.put(`/roles/${permRoleId}/permissions`, { permission_ids: rolePerms });
      toast.success("Permissions updated");
      setPermModal(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const modules = [...new Set(allPerms.map((p) => p.module_name))];

  return (
    <Container fluid className="p-3 bg-light min-vh-100">
      <h4 className="fw-bold mb-3">User & Role Management</h4>

      <Nav tabs className="mb-3">
        <NavItem>
          <NavLink className={activeTab === "users" ? "active fw-bold" : ""}
            onClick={() => setActiveTab("users")} style={{ cursor: "pointer" }}>
            Users
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink className={activeTab === "roles" ? "active fw-bold" : ""}
            onClick={() => setActiveTab("roles")} style={{ cursor: "pointer" }}>
            Roles & Permissions
          </NavLink>
        </NavItem>
      </Nav>

      <TabContent activeTab={activeTab}>
        {/* ========== USERS TAB ========== */}
        <TabPane tabId="users">
          <Row className="mb-2">
            <Col className="text-end">
              <Button color="primary" size="sm" onClick={toggleUser}>
                <FaPlus className="me-1" /> Add User
              </Button>
            </Col>
          </Row>

          <Table bordered hover responsive className="bg-white shadow-sm">
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Username</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Branches</th>
                <th>Status</th>
                <th width="110">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id}>
                  <td>{i + 1}</td>
                  <td>{u.username}</td>
                  <td>{u.full_name || "-"}</td>
                  <td><Badge color="info">{u.role_name || "-"}</Badge></td>
                  <td>
                    {(u.branches || []).length > 0 ? (
                      <div className="d-flex flex-wrap gap-1">
                        {u.branches.map((b) => (
                          <Badge key={b.id} color="primary" pill className="px-2">
                            {b.branch_name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <Badge color={u.status === "Active" ? "success" : "secondary"}>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="d-flex gap-1">
                    <Button size="sm" color="warning" onClick={() => openEditUser(u)}>
                      <FaEdit />
                    </Button>
                    <Button size="sm" color="danger" onClick={() => removeUser(u.id)}>
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-4">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </TabPane>

        {/* ========== ROLES TAB ========== */}
        <TabPane tabId="roles">
          <Row className="mb-2">
            <Col className="text-end">
              <Button color="primary" size="sm" onClick={toggleRole}>
                <FaPlus className="me-1" /> Add Role
              </Button>
            </Col>
          </Row>

          <Table bordered hover responsive className="bg-white shadow-sm">
            <thead className="table-dark">
              <tr><th>#</th><th>Role Name</th><th>Description</th><th width="150">Action</th></tr>
            </thead>
            <tbody>
              {roles.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td><FaUserShield className="me-1 text-primary" />{r.role_name}</td>
                  <td>{r.description || "-"}</td>
                  <td className="d-flex gap-1">
                    <Button size="sm" color="info" title="Permissions" onClick={() => openPermissions(r)}><FaKey /></Button>
                    <Button size="sm" color="warning" onClick={() => openEditRole(r)}><FaEdit /></Button>
                    <Button size="sm" color="danger" onClick={() => removeRole(r.id)}><FaTrash /></Button>
                  </td>
                </tr>
              ))}
              {!roles.length && <tr><td colSpan="4" className="text-center text-muted py-4">No roles found</td></tr>}
            </tbody>
          </Table>
        </TabPane>
      </TabContent>

      {/* ========== USER MODAL ========== */}
      <Modal isOpen={userModal} toggle={toggleUser} centered size="lg">
        <ModalHeader toggle={toggleUser}>
          {editUserId ? "Edit User" : "Add User"}
        </ModalHeader>
        <ModalBody>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">Username *</Label>
                <Input value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">
                  Password {editUserId ? "(leave blank to keep)" : "*"}
                </Label>
                <Input type="password" value={userForm.password || ""}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">Full Name</Label>
                <Input value={userForm.full_name || ""}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">Email</Label>
                <Input type="email" value={userForm.email || ""}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup>
                <Label className="small fw-bold">Phone</Label>
                <Input value={userForm.phone || ""}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup>
                <Label className="small fw-bold">Role</Label>
                <Input type="select" value={userForm.role_id || ""}
                  onChange={(e) => setUserForm({ ...userForm, role_id: e.target.value })}>
                  <option value="">-- Select Role --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.role_name}</option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup>
                <Label className="small fw-bold">Status</Label>
                <Input type="select" value={userForm.status}
                  onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}>
                  <option>Active</option>
                  <option>Inactive</option>
                </Input>
              </FormGroup>
            </Col>

            {/* ===== MULTI-BRANCH SELECTION ===== */}
            <Col md={12}>
              <Label className="small fw-bold mb-2">
                Assigned Branches
                {userForm.branch_ids.length > 0 && (
                  <Badge color="primary" pill className="ms-2">
                    {userForm.branch_ids.length} selected
                  </Badge>
                )}
              </Label>
              <div
                className="border rounded p-3"
                style={{ maxHeight: 220, overflowY: "auto", background: "#fafbfc" }}
              >
                {branches.length === 0 ? (
                  <p className="text-muted mb-0 small">No branches available</p>
                ) : (
                  <Row className="g-2">
                    {branches.map((b) => {
                      const isChecked = (userForm.branch_ids || []).includes(b.id);
                      return (
                        <Col md={4} sm={6} key={b.id}>
                          <div
                            className={`d-flex align-items-center gap-2 p-2 rounded border ${isChecked ? "border-primary bg-primary bg-opacity-10" : "bg-white"}`}
                            style={{ cursor: "pointer", transition: "all 0.15s" }}
                            onClick={() => toggleBranchSelection(b.id)}
                          >
                            <Input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleBranchSelection(b.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0"
                            />
                            <div>
                              <div className="fw-semibold small">{b.branch_name}</div>
                              <div className="text-muted" style={{ fontSize: 11 }}>
                                {b.branch_code}
                              </div>
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                )}
              </div>
              {branches.length > 0 && (
                <div className="mt-1 d-flex gap-2">
                  <Button size="sm" color="link" className="p-0 text-primary small"
                    onClick={() => setUserForm({ ...userForm, branch_ids: branches.map((b) => b.id) })}>
                    Select All
                  </Button>
                  <Button size="sm" color="link" className="p-0 text-secondary small"
                    onClick={() => setUserForm({ ...userForm, branch_ids: [] })}>
                    Clear All
                  </Button>
                </div>
              )}
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleUser}>Cancel</Button>
          <Button color="primary" onClick={saveUser}>
            {editUserId ? "Update" : "Save"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ========== ROLE MODAL ========== */}
      <Modal isOpen={roleModal} toggle={toggleRole} centered>
        <ModalHeader toggle={toggleRole}>{editRoleId ? "Edit Role" : "Add Role"}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label className="small fw-bold">Role Name *</Label>
            <Input value={roleForm.role_name}
              onChange={(e) => setRoleForm({ ...roleForm, role_name: e.target.value })} />
          </FormGroup>
          <FormGroup>
            <Label className="small fw-bold">Description</Label>
            <Input value={roleForm.description || ""}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleRole}>Cancel</Button>
          <Button color="primary" onClick={saveRole}>{editRoleId ? "Update" : "Save"}</Button>
        </ModalFooter>
      </Modal>

      {/* ========== PERMISSIONS MODAL ========== */}
      <Modal isOpen={permModal} toggle={() => setPermModal(false)} centered size="lg" scrollable>
        <ModalHeader toggle={() => setPermModal(false)}>
          <FaKey className="me-2" /> Permissions for "{permRoleName}"
        </ModalHeader>
        <ModalBody>
          {modules.map((mod) => (
            <div key={mod} className="mb-3">
              <h6 className="fw-bold text-primary text-capitalize border-bottom pb-1">{mod}</h6>
              <Row className="g-2">
                {allPerms.filter((p) => p.module_name === mod).map((p) => (
                  <Col md={4} key={p.id}>
                    <FormGroup check>
                      <Input type="checkbox" id={`perm-${p.id}`}
                        checked={rolePerms.includes(p.id)} onChange={() => togglePerm(p.id)} />
                      <Label check htmlFor={`perm-${p.id}`} className="small">
                        {p.description || p.permission_key}
                      </Label>
                    </FormGroup>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setPermModal(false)}>Cancel</Button>
          <Button color="primary" onClick={savePermissions}>Save Permissions</Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
}
