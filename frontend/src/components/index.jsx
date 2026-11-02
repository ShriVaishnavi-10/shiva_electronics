import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Header from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./footer";
import 'react-toastify/dist/ReactToastify.css';

const ALLOWED_NON_USER_PATHS = [
  "overview",
  "customer",
  "salesform",
  "saleslist",
  "salesreceipt",
  "thermalreceipt",
  "sales-persons",
  "sales-person-report",
  "ledger",
  "bank-accounts",
  "day-closing",
  "dailysalesreport",
  "salesreport",
  "daily-cash-report",
  "expenses"
];

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const isNonUser = storedUser.role_name?.toLowerCase().includes("non user") || storedUser.role_id === 6;

    if (isNonUser) {
      const pathParts = location.pathname.toLowerCase().split("/").filter(Boolean);
      const subPath = pathParts[1] || "overview";
      const isAllowed = ALLOWED_NON_USER_PATHS.some(allowed => subPath.startsWith(allowed));
      if (!isAllowed) {
        navigate("/index/overview", { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  const isPos = location.pathname.toLowerCase().includes("salesform");

  return (
    <div className="layout">
      <Header
        toggleSidebar={() => setSidebarOpen(true)}
        toggleDesktopSidebar={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className="body-wrapper">
        <Sidebar desktop collapsed={sidebarCollapsed} />
        <Sidebar mobile open={sidebarOpen} toggle={() => setSidebarOpen(false)} />

        <div className={`content-area ${sidebarCollapsed ? "collapsed" : ""} ${isPos ? "p-0" : ""}`}>
          <Outlet />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
