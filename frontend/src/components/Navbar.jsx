import React, { useState, useEffect, useMemo } from "react";
import {
  Navbar,
  NavbarBrand,
  Nav,
  NavItem,
  Button,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalHeader,
  ModalBody,
  Table,
  Input,
} from "reactstrap";
import {
  FaBell,
  FaCog,
  FaUserCircle,
  FaBars,
  FaCodeBranch,
  FaPhoneAlt,
  FaClock,
  FaCalendarCheck,
  FaBriefcase,
  FaCheckDouble,
  FaUserTie
} from "react-icons/fa";
import "../style/Header.css";
import { useNavigate } from "react-router-dom";
import api, { getUser, getActiveBranchId, setActiveBranchId } from "../utils/api";
import { serverAssetUrl } from "../config/urls";

const Header = ({
  toggleSidebar = () => {},
  toggleDesktopSidebar = () => {},
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [lowStockOpen, setLowStockOpen] = useState(false);
  const [notifActiveTab, setNotifActiveTab] = useState("crm");
  const [workNotifications, setWorkNotifications] = useState([]);
  const [workUnreadCount, setWorkUnreadCount] = useState(0);
  const [companySettings, setCompanySettings] = useState({
    company_name: "MyApp",
    branch: "",
    company_logo: null,
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [userBranches, setUserBranches] = useState([]);
  const [activeBranchId, setActiveBranch] = useState(getActiveBranchId());
  const activeBranchName = useMemo(() => {
    if (!userBranches.length) return companySettings.branch || "";
    const normalizedActive = Number(activeBranchId);
    const selected = userBranches.find(
      (b) => Number(b.branch_id || b.id) === normalizedActive,
    );
    if (selected?.branch_name) return selected.branch_name;
    if (userBranches.length === 1) return userBranches[0].branch_name || "";
    return "All Branches";
  }, [activeBranchId, userBranches, companySettings.branch]);

  const navigate = useNavigate();

  const toggle = () => setDropdownOpen(!dropdownOpen);

  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const response = await api.get("/settings/company");
        if (response.data) {
          setCompanySettings({
            company_name: response.data.company_name || "MyApp",
            branch: response.data.branch || "",
            company_logo: response.data.company_logo || null,
          });
        }
      } catch (error) {
        console.error("Failed to fetch company settings:", error);
      }
    };

    fetchCompanySettings();
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse stored user", e);
    }
  }, []);

  useEffect(() => {
    const user = getUser();
    if (user?.branches && user.branches.length > 0) {
      setUserBranches(user.branches);
    }
  }, []);

  useEffect(() => {
    const onBranchChanged = () => setActiveBranch(getActiveBranchId());
    window.addEventListener("branchChanged", onBranchChanged);
    return () => window.removeEventListener("branchChanged", onBranchChanged);
  }, []);

  const handleBranchChange = (branchId) => {
    const id = branchId ? parseInt(branchId, 10) : null;
    setActiveBranch(id);
    setActiveBranchId(id);
    window.location.reload();
  };

  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const res = await api.get("/products/low-stock", {
          params: { threshold: 10 },
        });
        const items = Array.isArray(res.data) ? res.data : [];
        setLowStockItems(items);
        setLowStockCount(items.length);
      } catch (err) {
        console.error(
          "Failed to load low stock products",
          err.response?.data || err,
        );
      }
    };

    fetchLowStock();
  }, []);

  const fetchWorkNotifications = async () => {
    try {
      const res = await api.get("/hrms/notifications");
      if (res.data?.success) {
        setWorkNotifications(res.data.data || []);
        setWorkUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // offline / non-auth
    }
  };

  useEffect(() => {
    fetchWorkNotifications();
    const interval = setInterval(fetchWorkNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const markWorkAsRead = async (id, e) => {
    e && e.stopPropagation();
    try {
      await api.put(`/hrms/notifications/${id}/read`);
      setWorkNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setWorkUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllWorkAsRead = async () => {
    try {
      await api.put("/hrms/notifications/read-all");
      setWorkNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setWorkUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif) => {
    markWorkAsRead(notif.id);
    setLowStockOpen(false);
    if (notif.type?.includes("FOLLOWUP") || notif.title?.toLowerCase().includes("follow-up")) {
      navigate("/crm/followups");
    } else if (notif.type?.includes("LEAD") || notif.title?.toLowerCase().includes("lead")) {
      navigate("/crm/leads");
    } else {
      navigate("/crm/followups");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("activeBranchId");
    setCurrentUser(null);
    navigate("/");
  };

  return (
    <Navbar className="app-header" expand="md">
      <div className="d-flex align-items-center gap-3">
        <button className="sidebar-toggle d-md-none" onClick={toggleSidebar}>
          <FaBars size={20} />
        </button>
        <button
          className="sidebar-toggle d-none d-md-inline-flex"
          onClick={toggleDesktopSidebar}
        >
          <FaBars />
        </button>

        {companySettings.company_logo && (
          <div className="company-logo-container">
            <img
              src={
                companySettings.company_logo.startsWith("http")
                  ? companySettings.company_logo
                  : serverAssetUrl(companySettings.company_logo)
              }
              alt="Company Logo"
              className="company-logo"
            />
          </div>
        )}

        <div className="company-info d-none d-sm-flex">
          <div className="company-name">{companySettings.company_name}</div>
          {activeBranchName && (
            <div className="company-branch">{activeBranchName}</div>
          )}
        </div>
      </div>

      <div className="navbar-center-container d-none d-xl-flex">
        <div className="navbar-support-badge">
          <div className="support-icon-circle">
            <FaPhoneAlt size={11} />
          </div>
          <span className="support-text-main">
            Customer Support - <span className="support-number"> 8098400690 </span>
          </span>
          <span className="support-text-sub">
            Mon-Sat | 10:00 AM - 7:00 PM
          </span>
        </div>
      </div>

      <Nav className="ms-auto align-items-center flex-row flex-nowrap" navbar>
        {userBranches.length > 1 && (
          <NavItem className="d-none d-lg-flex align-items-center me-2">
            <FaCodeBranch className="me-1 text-muted" />
            <Input
              type="select"
              bsSize="sm"
              value={activeBranchId || ""}
              onChange={(e) => handleBranchChange(e.target.value)}
              style={{ width: "auto", minWidth: 120 }}
            >
              <option value="">All Branches</option>
              {userBranches.map((b) => (
                <option key={b.branch_id || b.id} value={b.branch_id || b.id}>
                  {b.branch_name}
                </option>
              ))}
            </Input>
          </NavItem>
        )}
        {userBranches.length === 1 && (
          <NavItem className="d-none d-lg-flex align-items-center me-2">
            <FaCodeBranch className="me-1 text-muted" />
            <span className="small fw-semibold text-muted">
              {userBranches[0].branch_name}
            </span>
          </NavItem>
        )}

        <NavItem className="d-flex align-items-center me-2">
          <Button
            onClick={() => navigate("/index/salesForm")}
            className="pos-btn px-2 px-md-3"
          >
            POS
          </Button>
        </NavItem>
        <NavItem
          className="icon-btn position-relative me-2"
          onClick={() => {
            if (workUnreadCount > 0) setNotifActiveTab("crm");
            else setNotifActiveTab("stock");
            setLowStockOpen(true);
          }}
          title="Notifications & Work Reminders"
        >
          <FaBell />
          {workUnreadCount + lowStockCount > 0 && (
            <span className="badge bg-danger notif-badge">
              {workUnreadCount + lowStockCount > 9 ? "9+" : workUnreadCount + lowStockCount}
            </span>
          )}
        </NavItem>

        <Dropdown nav isOpen={dropdownOpen} toggle={toggle}>
          <DropdownToggle nav className="user-dropdown px-2">
            <FaUserCircle className="user-icon" />
            <span className="username d-none d-md-inline">
              {currentUser?.displayName || currentUser?.username || "Guest"}
            </span>
          </DropdownToggle>

          <DropdownMenu end>
            <DropdownItem header>
              Account ({currentUser?.role_name || currentUser?.role || "User"})
            </DropdownItem>
            <DropdownItem onClick={() => navigate("/crm")}>
              ✦ CRM Workstation
            </DropdownItem>
            <DropdownItem onClick={() => navigate("/hrms/dashboard")}>
              ✦ My HRMS & Attendance
            </DropdownItem>
            <DropdownItem divider />
            <DropdownItem onClick={handleLogout}>Logout</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </Nav>

      <Modal
        isOpen={lowStockOpen}
        toggle={() => setLowStockOpen(false)}
        size="lg"
      >
        <ModalHeader toggle={() => setLowStockOpen(false)} className="border-bottom-0 pb-0">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className={`btn btn-sm ${notifActiveTab === "crm" ? "btn-primary font-weight-bold" : "btn-light border"}`}
              style={{ borderRadius: "20px", padding: "6px 16px", fontSize: "13px" }}
              onClick={() => setNotifActiveTab("crm")}
            >
              <FaBell className="me-1" /> CRM & Reminders
              {workUnreadCount > 0 && (
                <span className="badge bg-danger ms-2">{workUnreadCount}</span>
              )}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${notifActiveTab === "stock" ? "btn-primary font-weight-bold" : "btn-light border"}`}
              style={{ borderRadius: "20px", padding: "6px 16px", fontSize: "13px" }}
              onClick={() => setNotifActiveTab("stock")}
            >
              Low Stock Alerts
              {lowStockCount > 0 && (
                <span className="badge bg-warning text-dark ms-2">{lowStockCount}</span>
              )}
            </button>
          </div>
        </ModalHeader>
        <ModalBody className="pt-3">
          {notifActiveTab === "crm" ? (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-muted small">Work assignments and scheduled follow-up reminders</span>
                {workUnreadCount > 0 && (
                  <button
                    className="btn btn-sm btn-link text-decoration-none p-0"
                    style={{ fontSize: "12px" }}
                    onClick={markAllWorkAsRead}
                  >
                    <FaCheckDouble className="me-1" /> Mark all as read
                  </button>
                )}
              </div>

              {workNotifications.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <FaBriefcase size={36} className="text-black-50 mb-2" />
                  <div className="fw-semibold">No work reminders</div>
                  <small>Follow-up reminders will appear here when due</small>
                </div>
              ) : (
                <div style={{ maxHeight: "420px", overflowY: "auto" }}>
                  {workNotifications.map((n) => {
                    const isReminder = n.type === "CRM_FOLLOWUP_REMINDER" || n.is_reminder_due === 1 || n.title?.includes("⏰");
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className="p-3 mb-2 rounded border d-flex align-items-start gap-3"
                        style={{
                          backgroundColor: n.is_read ? "#ffffff" : (isReminder ? "#fffdf5" : "#f8fafc"),
                          borderColor: isReminder && !n.is_read ? "#f59e0b" : "#e2e8f0",
                          borderLeftWidth: isReminder && !n.is_read ? "4px" : "1px",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <div
                          className="rounded d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{
                            width: "36px",
                            height: "36px",
                            backgroundColor: isReminder ? "#fef3c7" : "#eff6ff",
                            color: isReminder ? "#b45309" : "#2563eb"
                          }}
                        >
                          {isReminder ? <FaClock size={16} /> : <FaCalendarCheck size={16} />}
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-bold" style={{ fontSize: "13.5px", color: n.is_read ? "#334155" : "#0f172a" }}>
                              {isReminder && (
                                <span className="badge bg-warning text-dark me-2" style={{ fontSize: "10px" }}>
                                  REMINDER
                                </span>
                              )}
                              {n.title}
                            </span>
                            {!n.is_read && (
                              <span className="badge bg-primary" style={{ fontSize: "10px" }}>New</span>
                            )}
                          </div>
                          <div className="text-muted small mt-1" style={{ fontSize: "12px", lineHeight: "1.4" }}>
                            {n.message}
                          </div>
                          <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className="text-muted" style={{ fontSize: "11px" }}>
                              {n.created_at ? new Date(n.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Just now"}
                            </span>
                            <span className="text-primary fw-semibold small">Open in CRM &rarr;</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>
              {lowStockItems.length === 0 ? (
                <p className="text-muted mb-0 py-4 text-center">No low stock products.</p>
              ) : (
                <Table bordered hover size="sm" className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>S.No</th>
                      <th>Product</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map((p, index) => (
                      <tr key={p.id}>
                        <td>{index + 1}</td>
                        <td>{p.product_name}</td>
                        <td>
                          <span className="badge bg-danger">{p.qty}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          )}
        </ModalBody>
      </Modal>
    </Navbar>
  );
};

export default Header;
