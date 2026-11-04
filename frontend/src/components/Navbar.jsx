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
import { FaBell, FaCog, FaUserCircle, FaBars, FaCodeBranch, FaPhoneAlt } from "react-icons/fa";
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
          onClick={() => setLowStockOpen(true)}
        >
          <FaBell />
          {lowStockCount > 0 && (
            <span className="badge bg-danger notif-badge">{lowStockCount}</span>
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
        <ModalHeader toggle={() => setLowStockOpen(false)}>
          Low Stock Products
        </ModalHeader>
        <ModalBody>
          {lowStockItems.length === 0 ? (
            <p className="text-muted mb-0">No low stock products.</p>
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
                    <td>{p.qty}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </ModalBody>
      </Modal>
    </Navbar>
  );
};

export default Header;
