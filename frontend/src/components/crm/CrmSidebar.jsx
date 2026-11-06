import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaAddressBook,
  FaUserFriends,
  FaArrowLeft,
  FaSignOutAlt,
  FaChevronLeft,
  FaChevronRight,
  FaHandshake,
  FaCalendarCheck,
  FaCheckCircle,
  FaChartBar,
  FaChevronDown,
  FaFileAlt,
  FaCheckDouble,
  FaTrophy
} from "react-icons/fa";

const CrmSidebar = ({
  collapsed = false,
  setCollapsed = () => {},
  mobileOpen = false,
  closeMobile = () => {}
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = storedUser.name || storedUser.username || "Admin User";
  const userRole = storedUser.role_name || "CRM Administrator";

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
      Number(storedUser.id) === 1
    );

  const returnPath = isSalesPerson ? "/hrms/dashboard" : "/index/overview";
  const returnLabel = isSalesPerson ? "Back to My Portal" : "Back to Admin Panel";

  const isDashboardActive =
    location.pathname === "/crm" ||
    location.pathname === "/crm/" ||
    location.pathname === "/crm/dashboard";

  const isContactsActive = location.pathname.startsWith("/crm/contacts");
  const isLeadsActive = location.pathname.startsWith("/crm/leads");
  const isFollowupsActive = location.pathname.startsWith("/crm/followups");
  const isCompletedLeadsActive = location.pathname.startsWith("/crm/completed-leads");
  const isReportsActive = location.pathname.startsWith("/crm/reports");
  const isLeadReportsActive = location.pathname === "/crm/reports/leads" || location.pathname === "/crm/reports";
  const isFollowupReportsActive = location.pathname === "/crm/reports/followups";
  const isPerformanceReportActive = location.pathname === "/crm/reports/performance" || location.pathname === "/crm/performance";
  const [reportsOpen, setReportsOpen] = React.useState(isReportsActive);

  React.useEffect(() => {
    if (isReportsActive) setReportsOpen(true);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={closeMobile}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 999
          }}
        />
      )}

      <aside className={`crm-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        {/* Brand Header */}
        <div className="crm-sidebar-brand">
          <div className="crm-brand-content">
            <div className="crm-brand-icon">
              <FaHandshake />
            </div>
            {!collapsed && (
              <div className="crm-brand-text">
                <span className="crm-brand-title">Shiva CRM</span>
                <span className="crm-brand-badge">Relationship Suite</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Transition Back to Main Admin Panel */}
        <div
          className={`crm-back-pill ${collapsed ? "collapsed-pill" : ""}`}
          onClick={() => {
            navigate(returnPath);
            closeMobile();
          }}
          title="Return to Main Admin Panel"
        >
          <FaArrowLeft style={{ flexShrink: 0 }} />
          {!collapsed && <span>{returnLabel}</span>}
        </div>

        {/* CRM Sidebar Navigation */}
        <div className="crm-sidebar-nav">
          {!collapsed && (
            <div className="crm-sidebar-section-title">Main Menu</div>
          )}

          {/* 1. Dashboard (Admins Only) */}
          {isAdmin && (
            <div
              className={`crm-nav-link ${isDashboardActive ? "active" : ""}`}
              onClick={() => {
                navigate("/crm");
                closeMobile();
              }}
              title={collapsed ? "Dashboard" : undefined}
            >
              <div className="crm-nav-icon">
                <FaTachometerAlt />
              </div>
              {!collapsed && (
                <>
                  <span className="crm-nav-text">Dashboard</span>
                </>
              )}
            </div>
          )}

          {/* 2. Contacts (Admins Only) */}
          {isAdmin && (
            <div
              className={`crm-nav-link ${isContactsActive ? "active" : ""}`}
              onClick={() => {
                navigate("/crm/contacts");
                closeMobile();
              }}
              title={collapsed ? "Contacts" : undefined}
            >
              <div className="crm-nav-icon">
                <FaAddressBook />
              </div>
              {!collapsed && (
                <>
                  <span className="crm-nav-text">Contacts</span>
                </>
              )}
            </div>
          )}

          {/* 3. Leads */}
          <div
            className={`crm-nav-link ${isLeadsActive ? "active" : ""}`}
            onClick={() => {
              navigate("/crm/leads");
              closeMobile();
            }}
            title={collapsed ? "Leads" : undefined}
          >
            <div className="crm-nav-icon">
              <FaUserFriends />
            </div>
            {!collapsed && (
              <>
                <span className="crm-nav-text">Leads</span>
              </>
            )}
          </div>

          {/* 4. Completed Leads (Admins Only) */}
          {isAdmin && (
            <div
              className={`crm-nav-link ${isCompletedLeadsActive ? "active" : ""}`}
              onClick={() => {
                navigate("/crm/completed-leads");
                closeMobile();
              }}
              title={collapsed ? "Completed Leads" : undefined}
            >
              <div className="crm-nav-icon">
                <FaCheckCircle style={{ color: isCompletedLeadsActive ? "#10b981" : undefined }} />
              </div>
              {!collapsed && (
                <>
                  <span className="crm-nav-text">Completed Leads</span>
                </>
              )}
            </div>
          )}

          {/* 5. Follow-ups */}
          <div
            className={`crm-nav-link ${isFollowupsActive ? "active" : ""}`}
            onClick={() => {
              navigate("/crm/followups");
              closeMobile();
            }}
            title={collapsed ? "Follow-ups" : undefined}
          >
            <div className="crm-nav-icon">
              <FaCalendarCheck />
            </div>
            {!collapsed && (
              <>
                <span className="crm-nav-text">Follow-ups</span>
              </>
            )}
          </div>

          {/* Performance Report (Admins Only) */}
          {isAdmin && (
            <div
              className={`crm-nav-link ${isPerformanceReportActive ? "active" : ""}`}
              onClick={() => {
                navigate("/crm/reports/performance");
                closeMobile();
              }}
              title={collapsed ? "Performance Report" : undefined}
            >
              <div className="crm-nav-icon">
                <FaTrophy style={{ color: isPerformanceReportActive ? "#f59e0b" : "#fbbf24" }} />
              </div>
              {!collapsed && (
                <>
                  <span className="crm-nav-text">Performance Report</span>
                  <span
                    className="badge ms-auto"
                    style={{
                      fontSize: "9.5px",
                      background: "rgba(245, 158, 11, 0.18)",
                      color: "#f59e0b",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      fontWeight: "700"
                    }}
                  >
                    Admin
                  </span>
                </>
              )}
            </div>
          )}

          {/* 6. Reports Section (Admins Only) */}
          {isAdmin && (
            <>
              {!collapsed && (
                <div className="crm-sidebar-section-title mt-2">Analytics & Reports</div>
              )}

              {/* Reports Parent Menu */}
              <div
                className={`crm-nav-link ${isReportsActive ? "active" : ""}`}
                onClick={() => {
                  if (collapsed) {
                    navigate("/crm/reports/leads");
                    closeMobile();
                  } else {
                    setReportsOpen(!reportsOpen);
                  }
                }}
                title={collapsed ? "Reports" : undefined}
              >
                <div className="crm-nav-icon">
                  <FaChartBar />
                </div>
                {!collapsed && (
                  <>
                    <span className="crm-nav-text">Reports</span>
                    <span className="ms-auto" style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {reportsOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                    </span>
                  </>
                )}
              </div>

              {/* Submenu for Reports */}
              {reportsOpen && !collapsed && (
                <div className="crm-submenu">
                  {/* Lead Reports */}
                  <div
                    className={`crm-submenu-link ${isLeadReportsActive ? "active" : ""}`}
                    onClick={() => {
                      navigate("/crm/reports/leads");
                      closeMobile();
                    }}
                  >
                    <div className="crm-submenu-icon">
                      <FaFileAlt size={12} />
                    </div>
                    <span>Lead Reports</span>
                  </div>

                  {/* Follow-up Reports */}
                  <div
                    className={`crm-submenu-link ${isFollowupReportsActive ? "active" : ""}`}
                    onClick={() => {
                      navigate("/crm/reports/followups");
                      closeMobile();
                    }}
                  >
                    <div className="crm-submenu-icon">
                      <FaCalendarCheck size={12} />
                    </div>
                    <span>Follow-up Reports</span>
                  </div>
                  {/* Performance Report */}
                  <div
                    className={`crm-submenu-link ${isPerformanceReportActive ? "active" : ""}`}
                    onClick={() => {
                      navigate("/crm/reports/performance");
                      closeMobile();
                    }}
                  >
                    <div className="crm-submenu-icon">
                      <FaTrophy size={12} style={{ color: isPerformanceReportActive ? "#f59e0b" : "#fbbf24" }} />
                    </div>
                    <span>Performance Report</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* User Profile & Collapse Toggle */}
        <div className="crm-sidebar-footer">
          <div className="crm-user-profile">
            <div className="crm-user-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="crm-user-info">
                <span className="crm-user-name">{userName}</span>
                <span className="crm-user-role">{userRole}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              className="crm-collapse-btn d-none d-md-flex"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {collapsed ? <FaChevronRight size={12} /> : <FaChevronLeft size={12} />}
            </button>
            <button
              className="crm-collapse-btn text-danger"
              onClick={handleLogout}
              title="Logout"
            >
              <FaSignOutAlt size={13} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default CrmSidebar;
