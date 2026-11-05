import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaBars,
  FaSearch,
  FaBell,
  FaArrowLeft,
  FaClock,
  FaShieldAlt,
  FaStore,
  FaCheckDouble,
  FaBriefcase,
  FaCalendarCheck,
  FaUserTie
} from "react-icons/fa";
import api, { getUser, getActiveBranchId } from "../../utils/api";

const CrmNavbar = ({
  toggleMobile = () => {},
  toggleCollapse = () => {}
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  const storedUser = getUser() || JSON.parse(localStorage.getItem("user") || "{}");
  const userName = storedUser.name || storedUser.username || "Admin";
  const userBranches = storedUser.branches || [];
  const activeBranchId = getActiveBranchId();
  const isSalesPerson =
    storedUser.role_name?.toLowerCase().includes("sales") ||
    storedUser.role_name?.toLowerCase().includes("employee") ||
    storedUser.role_name?.toLowerCase().includes("staff") ||
    storedUser.role_name?.toLowerCase().includes("cashier") ||
    storedUser.is_sales_person ||
    (!storedUser.permissions?.includes("dashboard.view") && storedUser.role_name?.toLowerCase() !== "super admin");
  
  const currentBranchName = React.useMemo(() => {
    if (!userBranches.length) return "Main Store";
    const selected = userBranches.find((b) => Number(b.branch_id || b.id) === Number(activeBranchId));
    return selected ? selected.branch_name : (userBranches[0]?.branch_name || "Main Store");
  }, [userBranches, activeBranchId]);

  const loadNotifications = async () => {
    try {
      const res = await api.get("/hrms/notifications");
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      // silently ignore if not logged in or offline
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id, e) => {
    e && e.stopPropagation();
    try {
      await api.put(`/hrms/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/hrms/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    setShowNotifDropdown(false);

    if (notif.type?.includes("LEAD") || notif.title?.toLowerCase().includes("lead")) {
      navigate("/crm/leads");
    } else if (notif.type?.includes("FOLLOWUP") || notif.title?.toLowerCase().includes("follow-up")) {
      navigate("/crm/followups");
    } else if (notif.type?.includes("LEAVE")) {
      navigate("/hrms/leaves");
    } else {
      navigate(isSalesPerson ? "/crm/leads" : "/crm/dashboard");
    }
  };

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
            {location.pathname.includes("performance")
              ? "Sales Person Performance Report"
              : location.pathname.includes("reports/followups")
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
          onClick={() => navigate(isSalesPerson ? "/hrms/dashboard" : "/index/overview")}
          title="Return to Shiva ERP & Admin Panel"
        >
          <FaArrowLeft size={11} />
          <span className="d-none d-sm-inline">{isSalesPerson ? "HRMS Portal" : "Main Admin Panel"}</span>
        </button>

        {/* Notifications Icon & Dropdown */}
        <div style={{ position: "relative" }} ref={notifRef}>
          <div
            className="crm-icon-btn"
            title="CRM Work & System Notifications"
            onClick={() => setShowNotifDropdown((prev) => !prev)}
            style={{ position: "relative", cursor: "pointer" }}
          >
            <FaBell size={15} color={unreadCount > 0 ? "#2563eb" : "#64748b"} />
            {unreadCount > 0 ? (
              <span
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  minWidth: "18px",
                  height: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                  boxShadow: "0 2px 5px rgba(239, 68, 68, 0.4)"
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : (
              <span className="crm-badge-dot"></span>
            )}
          </div>

          {showNotifDropdown && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                width: "360px",
                maxWidth: "90vw",
                background: "#ffffff",
                borderRadius: "14px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0,0,0,0.08)",
                border: "1px solid #e2e8f0",
                zIndex: 2000,
                overflow: "hidden",
                animation: "submenuFadeIn 0.2s ease-out"
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "14px 18px",
                  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaBell color="#60a5fa" size={14} />
                  <span style={{ fontWeight: 700, fontSize: "14px" }}>Work & Notifications</span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        background: "rgba(239, 68, 68, 0.9)",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "1px 7px",
                        borderRadius: "10px"
                      }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      border: "none",
                      color: "#93c5fd",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                    title="Mark all as read"
                  >
                    <FaCheckDouble size={11} /> Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div style={{ maxHeight: "360px", overflowY: "auto", padding: "6px 0" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "30px 20px", textAlign: "center", color: "#64748b" }}>
                    <FaBriefcase size={28} color="#cbd5e1" style={{ marginBottom: "8px" }} />
                    <div style={{ fontSize: "13.5px", fontWeight: 600 }}>No work notifications</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                      Assigned leads and scheduled follow-ups will appear here
                    </div>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isWork = notif.type?.includes("LEAD") || notif.type?.includes("WORK");
                    const isFollowup = notif.type?.includes("FOLLOWUP");
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid #f1f5f9",
                          background: notif.is_read ? "#ffffff" : "#f8fafc",
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                          display: "flex",
                          gap: "12px",
                          alignItems: "flex-start"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = notif.is_read ? "#ffffff" : "#f8fafc")}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            background: isWork ? "#eff6ff" : isFollowup ? "#fef3c7" : "#ecfdf5",
                            color: isWork ? "#2563eb" : isFollowup ? "#d97706" : "#059669",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: "2px"
                          }}
                        >
                          {isWork ? <FaBriefcase size={14} /> : isFollowup ? <FaCalendarCheck size={14} /> : <FaUserTie size={14} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "6px" }}>
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: notif.is_read ? 600 : 700,
                                color: notif.is_read ? "#334155" : "#0f172a",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}
                            >
                              {notif.title}
                            </div>
                            {!notif.is_read && (
                              <span
                                style={{
                                  width: "7px",
                                  height: "7px",
                                  borderRadius: "50%",
                                  background: "#2563eb",
                                  flexShrink: 0
                                }}
                              />
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              marginTop: "3px",
                              lineHeight: "1.4",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden"
                            }}
                          >
                            {notif.message}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#94a3b8",
                              marginTop: "5px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                          >
                            <span>
                              {notif.created_at ? new Date(notif.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Just now"}
                            </span>
                            <span style={{ color: "#2563eb", fontWeight: 600, fontSize: "11px" }}>View &rarr;</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "10px 16px",
                  background: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  textAlign: "center"
                }}
              >
                <button
                  onClick={() => {
                    setShowNotifDropdown(false);
                    navigate("/crm/leads");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  View All CRM Leads &rarr;
                </button>
              </div>
            </div>
          )}
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

