import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaBars,
  FaSearch,
  FaBell,
  FaArrowLeft,
  FaClock,
  FaShieldAlt,
  FaStore
} from "react-icons/fa";
import { getUser, getActiveBranchId } from "../../utils/api";

const CrmNavbar = ({
  toggleMobile = () => {},
  toggleCollapse = () => {}
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");

  const storedUser = getUser() || JSON.parse(localStorage.getItem("user") || "{}");
  const userName = storedUser.name || storedUser.username || "Admin";
  const userBranches = storedUser.branches || [];
  const activeBranchId = getActiveBranchId();
  
  const currentBranchName = React.useMemo(() => {
    if (!userBranches.length) return "Main Store";
    const selected = userBranches.find((b) => Number(b.branch_id || b.id) === Number(activeBranchId));
    return selected ? selected.branch_name : (userBranches[0]?.branch_name || "Main Store");
  }, [userBranches, activeBranchId]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="crm-navbar">
      {/* Left: Hamburger + Breadcrumb */}
      <div className="crm-navbar-left">
        <button
          className="crm-menu-toggle d-md-none"
          onClick={toggleMobile}
          title="Open Menu"
        >
          <FaBars size={16} color="#334155" />
        </button>
        <button
          className="crm-menu-toggle d-none d-md-flex"
          onClick={toggleCollapse}
          title="Toggle Sidebar"
        >
          <FaBars size={16} color="#334155" />
        </button>

        <div className="crm-breadcrumb">
          <span>CRM Suite</span>
          <span>/</span>
          <span className="active-crumb">
            {location.pathname.includes("reports/followups")
              ? "Follow-up Reports"
              : location.pathname.includes("reports")
              ? "Lead Reports"
              : location.pathname.includes("completed-leads")
              ? "Completed Leads"
              : location.pathname.includes("contacts")
              ? "Contacts"
              : location.pathname.includes("leads/edit")
              ? "Edit Lead"
              : location.pathname.includes("leads/new")
              ? "Create New Lead"
              : location.pathname.includes("followups/new")
              ? "New Follow-up"
              : location.pathname.includes("followups")
              ? "Follow-ups"
              : location.pathname.includes("leads")
              ? "Leads"
              : "Dashboard"}
          </span>
        </div>
      </div>

      {/* Center: Search Box */}
      <div className="crm-navbar-center d-none d-lg-block">
        <div className="crm-search-box">
          <FaSearch color="#94a3b8" />
          <input
            type="text"
            placeholder="Search leads, customer accounts, deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="crm-search-shortcut">⌘K</span>
        </div>
      </div>

      {/* Right: Actions, Switcher, Time, User */}
      <div className="crm-navbar-right">
        {/* Branch pill if available */}
        <div className="d-none d-sm-flex align-items-center gap-1 px-2 py-1 rounded bg-light border text-muted" style={{ fontSize: "12px" }}>
          <FaStore className="text-primary" />
          <span className="fw-medium text-dark">{currentBranchName}</span>
        </div>

        {/* Live clock badge */}
        <div className="d-none d-xl-flex align-items-center gap-2 text-muted px-2 py-1" style={{ fontSize: "12.5px" }}>
          <FaClock className="text-secondary" />
          <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Switch back to Main Admin Panel */}
        <button
          className="crm-admin-switch-btn"
          onClick={() => navigate("/index/overview")}
          title="Return to Shiva ERP & Admin Panel"
        >
          <FaArrowLeft size={11} />
          <span className="d-none d-sm-inline">Main Admin Panel</span>
        </button>

        {/* Notifications Icon */}
        <div className="crm-icon-btn" title="CRM Notifications">
          <FaBell size={14} />
          <span className="crm-badge-dot"></span>
        </div>

        {/* User Avatar */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
            color: "white",
            fontWeight: 700,
            fontSize: "13.5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
            cursor: "pointer"
          }}
          title={userName}
        >
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
};

export default CrmNavbar;

