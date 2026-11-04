import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import CrmSidebar from "./CrmSidebar";
import CrmNavbar from "./CrmNavbar";
import "./crm.css";

const CrmLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
