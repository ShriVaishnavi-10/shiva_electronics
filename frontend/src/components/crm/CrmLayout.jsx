import React, { useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import CrmSidebar from "./CrmSidebar";
import CrmNavbar from "./CrmNavbar";
import "./crm.css";

const CrmLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
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

  const isCashier = Boolean(storedUser.is_cashier) || Number(storedUser.role_id) === 8 || roleLower.includes("cashier");
  if (isCashier) {
    return <Navigate to="/hrms/dashboard" replace />;
  }

  // Strict route protection: Non-admin sales staff must not access Dashboard, Reports, Contacts, or Completed Leads
  if (!isAdmin) {
    const p = location.pathname.toLowerCase().replace(/\/+$/, "");
    if (
      p === "" ||
      p === "/crm" ||
      p === "/crm/dashboard" ||
      p.startsWith("/crm/reports") ||
      p.startsWith("/crm/performance") ||
      p.startsWith("/crm/contacts") ||
      p.startsWith("/crm/completed-leads")
    ) {
      return <Navigate to="/crm/leads" replace />;
    }
  }

  return (
    <div className="crm-layout">
      {/* Dedicated CRM Sidebar */}
      <CrmSidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        closeMobile={() => setMobileOpen(false)}
      />

      {/* Main CRM Workspace */}
      <div className="crm-main">
        {/* Dedicated CRM Top Navbar */}
        <CrmNavbar
          toggleMobile={() => setMobileOpen((prev) => !prev)}
          toggleCollapse={() => setCollapsed((prev) => !prev)}
        />

        {/* Dynamic CRM Page / Content */}
        <Outlet />
      </div>
    </div>
  );
};

export default CrmLayout;
