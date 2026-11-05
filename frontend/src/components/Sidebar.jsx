import React, { useState, useEffect } from "react";
import { Nav, NavItem, Offcanvas, OffcanvasBody } from "reactstrap";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaTachometerAlt, FaUsers, FaBoxOpen, FaFileInvoice,
  FaPlusCircle, FaListAlt, FaChartBar, FaCog, FaSignOutAlt,
  FaChevronDown, FaChevronRight, FaWarehouse, FaShoppingCart,
  FaMinusCircle, FaTruck, FaStore, FaMapMarkerAlt, FaDollarSign,
  FaPercent, FaLayerGroup, FaCodeBranch, FaUserShield, FaTools, FaWallet,
  FaMoon, FaMoneyCheckAlt, FaUndo, FaHandshake, FaUserTie
} from "react-icons/fa";
import "../style/Sidebar.css";

const SidebarContent = ({ close, collapsed = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const permissions = storedUser.permissions || [];
<<<<<<< HEAD
  const roleLower = String(storedUser.role_name || "").toLowerCase().trim();
  const isSuperAdmin = roleLower === "super admin" || storedUser.role_id === 5;
  const isAdmin = !isSuperAdmin && (roleLower.includes("admin") || storedUser.role_id === 1 || storedUser.id === 1);
  const isNonUser = !isSuperAdmin && !isAdmin && (roleLower.includes("non user") || storedUser.role_id === 6);
  const isCashier = !isSuperAdmin && !isAdmin && (roleLower.includes("cashier") || storedUser.role_id === 8);

  const isConfidentialKey = (key) =>
    key.startsWith("reports.") ||
    key.startsWith("quotations.") ||
    key.startsWith("business_location.") ||
    key.startsWith("branches.") ||
    key.startsWith("users.");

  const hasPermission = (key) => {
    if (isSuperAdmin) return true;
    if (isConfidentialKey(key)) return false;
    if (isAdmin) return true;
    if (isNonUser && key.startsWith("expenses.")) return true;
    return permissions.includes(key);
  };
=======
  const isSuperAdmin = storedUser.role_name?.toLowerCase() === "super admin";
  const isNonUser = storedUser.role_name?.toLowerCase().includes("non user") || storedUser.role_id === 6;
  const isCashier = storedUser.role_name?.toLowerCase().includes("cashier") || storedUser.role_id === 8;
  const roleLower = String(storedUser.role_name || storedUser.role || "").toLowerCase();
  const isAdmin = roleLower.includes("admin") || roleLower.includes("super admin") || storedUser.id === 1;
  const hasPermission = (key) => isSuperAdmin || permissions.includes(key) || (isNonUser && key.startsWith("expenses."));
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef

  const currentPath = location.pathname.toLowerCase();
  const segments = currentPath.split("/").filter(Boolean);
  const hasSegment = (path) => segments.includes(String(path).toLowerCase());
  const isActive = (path) => {
    if (!path) return false;
    const p = path.toLowerCase().replace(/^\//, "");
    if (segments.includes(p)) return true;
    if (currentPath.includes(p)) return true;
    return false;
  };
  const isCategoryActive =
    hasSegment("categorylist") || hasSegment("subcategorylist");
  const isPurchaseActive =
    hasSegment("purchase") || hasSegment("purchaseform") || hasSegment("purchaselist");
  const isQuotationsActive =
    hasSegment("quotations") ||
    hasSegment("quotationsform") ||
    hasSegment("quotationslist") ||
    hasSegment("newdemoquotations");
  const isReportsActive =
    hasSegment("quotationsreport") ||
    hasSegment("salesreport") ||
    hasSegment("dailysalesreport") ||
    hasSegment("gstreport") ||
    hasSegment("purchasereport") ||
    hasSegment("daily-cash-report") ||
    hasSegment("stockreport");
  const isBusinessLocationActive =
    hasSegment("businesslocation") ||
    hasSegment("addlocation") ||
    hasSegment("locationlist");
  const isSalesActive =
    hasSegment("sales") ||
    hasSegment("salesform") ||
    hasSegment("saleslist") ||
    hasSegment("sales-persons") ||
    hasSegment("sales-person-report");
  const isExpensesActive = hasSegment("expenses");
  const isHrmsActive = hasSegment("hrms");
  const isStockActive =
    hasSegment("stock") ||
    hasSegment("stockinlist") ||
    hasSegment("stockout") ||
    hasSegment("stockinoutlist") ||
    hasSegment("stock-details");

  const toggleMenu = (menu) => {
    setOpenMenu(prev => (prev === menu ? null : menu));
  };

  useEffect(() => {
    if (isCategoryActive) setOpenMenu("category");
    else if (isQuotationsActive) setOpenMenu("quotations");
    else if (isStockActive) setOpenMenu("stock");
    else if (isPurchaseActive) setOpenMenu("purchase");
    else if (isSalesActive) setOpenMenu("sales");
    else if (isReportsActive) setOpenMenu("reports");
    else if (isBusinessLocationActive) setOpenMenu("businesslocation");
    else if (isExpensesActive) setOpenMenu("expenses");
    else setOpenMenu(null);
  }, [location.pathname]);

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        {collapsed
          ? (isCashier ? "SC" : isNonUser ? "NGP" : "SE")
          : (isCashier ? "✦ Shiva Cashier" : isNonUser ? "⚡ Non-GST Panel" : isSuperAdmin ? "✦ Super Admin" : "✦ Shiva Admin")}
      </div>

      {isCashier ? (
        <Nav vertical className="sidebar-menu cashier-sidebar">
          {/* 1. POS / New Bill */}
          <NavItem
            className={`menu-item ${isActive("salesform") ? "active" : ""}`}
            onClick={() => { navigate("/index/salesForm"); close && close(); }}
          >
            <FaPlusCircle className="menu-icon" />
            {!collapsed && <span className="menu-text">POS / New Bill</span>}
          </NavItem>

          {/* 2. Invoices / Bills List */}
          <NavItem
            className={`menu-item ${isActive("saleslist") ? "active" : ""}`}
            onClick={() => { navigate("/index/salesList"); close && close(); }}
          >
            <FaListAlt className="menu-icon" />
            {!collapsed && <span className="menu-text">Invoices & Bills</span>}
          </NavItem>

          {/* 3. Customer */}
          <NavItem
            className={`menu-item ${isActive("customer") ? "active" : ""}`}
            onClick={() => { navigate("/index/customer"); close && close(); }}
          >
            <FaUsers className="menu-icon" />
            {!collapsed && <span className="menu-text">Customers</span>}
          </NavItem>

          {/* 4. Products / Stock Availability */}
          <NavItem
            className={`menu-item ${isActive("product") || isActive("stock-details") ? "active" : ""}`}
            onClick={() => { navigate("/index/stock-details"); close && close(); }}
          >
            <FaBoxOpen className="menu-icon" />
            {!collapsed && <span className="menu-text">Stock Availability</span>}
          </NavItem>

          {/* 5. Day Closing / Cash Register */}
          <NavItem
            className={`menu-item ${isActive("day-closing") ? "active" : ""}`}
            onClick={() => { navigate("/index/day-closing"); close && close(); }}
          >
            <FaMoneyCheckAlt className="menu-icon" />
            {!collapsed && <span className="menu-text">Day Closing Register</span>}
          </NavItem>

          {/* 6. Daily Cash Report */}
          <NavItem
            className={`menu-item ${isActive("daily-cash-report") ? "active" : ""}`}
            onClick={() => { navigate("/index/daily-cash-report"); close && close(); }}
          >
            <FaChartBar className="menu-icon" />
            {!collapsed && <span className="menu-text">Daily Cash Report</span>}
          </NavItem>

          {/* 7. My HRMS */}
          <NavItem
            className={`menu-item ${location.pathname.startsWith("/hrms") ? "active" : ""}`}
            onClick={() => { navigate("/hrms/dashboard"); close && close(); }}
          >
            <FaUserTie className="menu-icon" />
            {!collapsed && <span className="menu-text">My HRMS</span>}
          </NavItem>

          {/* 8. Logout */}
          <NavItem
            className="menu-item logout mt-auto"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              navigate("/");
              close && close();
            }}
          >
            <FaSignOutAlt className="menu-icon" />
            {!collapsed && <span className="menu-text">Logout</span>}
          </NavItem>
        </Nav>
      ) : (
      <Nav vertical className="sidebar-menu">

        {/* 1. Dashboard */}
        {hasPermission("dashboard.view") && (
        <NavItem className={`menu-item ${isActive("overview") ? "active" : ""}`}
          onClick={() => { navigate("overview"); close && close(); }}>
          <FaTachometerAlt className="menu-icon" />
          {!collapsed && <span className="menu-text">Dashboard</span>}
        </NavItem>
        )}

        {/* CRM Portal (Hidden for Cashier) */}
        {!isCashier && (
          <NavItem
            className={`menu-item ${location.pathname.startsWith("/crm") ? "active" : ""}`}
            onClick={() => {
              navigate(isAdmin ? "/crm" : "/crm/leads");
              close && close();
            }}
            title={collapsed ? "CRM Portal" : undefined}
          >
            <FaHandshake className="menu-icon" style={{ color: "#60a5fa" }} />
            {!collapsed && <span className="menu-text">CRM</span>}
            {!collapsed && (
              <span
                className="badge ms-auto"
                style={{
                  fontSize: "10px",
                  background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                  color: "#ffffff",
                  padding: "2px 7px",
                  borderRadius: "10px",
                  fontWeight: "700"
                }}
              >
                Portal
              </span>
            )}
          </NavItem>
        )}

        {/* 2. Category (GST only) */}
        {!isNonUser && hasPermission("category.view") && (
        <>
        <NavItem className={`menu-item ${isCategoryActive ? "active" : ""}`}
          onClick={() => toggleMenu("category")}>
          <FaLayerGroup className="menu-icon" />
          {!collapsed && <span className="menu-text">Category</span>}
          {!collapsed && (openMenu === "category" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        {!collapsed && openMenu === "category" && (
          <div className="submenu">
            <div className={`submenu-item ${isActive("categoryList") ? "active" : ""}`}
              onClick={() => { navigate("/index/categoryList"); close && close(); }}>
              <FaListAlt className="submenu-icon" /> <span>Category List</span>
            </div>
            <div className={`submenu-item ${isActive("subcategoryList") ? "active" : ""}`}
              onClick={() => { navigate("/index/subcategoryList"); close && close(); }}>
              <FaListAlt className="submenu-icon" /> <span>Subcategory List</span>
            </div>
          </div>
        )}
        </>
        )}

        {/* 3. Product (GST only) */}
        {!isNonUser && hasPermission("products.view") && (
        <NavItem className={`menu-item ${isActive("product") ? "active" : ""}`}
          onClick={() => { navigate("/index/product"); close && close(); }}>
          <FaBoxOpen className="menu-icon" />
          {!collapsed && <span className="menu-text">Product</span>}
        </NavItem>
        )}

        {/* 4. Vendor (GST only) */}
        {!isNonUser && hasPermission("vendors.view") && (
        <NavItem className={`menu-item ${isActive("vendor") ? "active" : ""}`}
          onClick={() => { navigate("/index/vendor"); close && close(); }}>
          <FaStore className="menu-icon" />
          {!collapsed && <span className="menu-text">Vendor</span>}
        </NavItem>
        )}

        {/* 5. Purchase (GST only) */}
        {!isNonUser && hasPermission("purchases.view") && (
        <>
        <NavItem className={`menu-item ${isPurchaseActive ? "active" : ""}`}
          onClick={() => toggleMenu("purchase")}>
          <FaShoppingCart className="menu-icon" />
          {!collapsed && <span className="menu-text">Purchase</span>}
          {!collapsed && (openMenu === "purchase" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        {!collapsed && openMenu === "purchase" && (
          <div className="submenu">
            <div className={`submenu-item ${isActive("purchaseForm") ? "active" : ""}`}
              onClick={() => { navigate("/index/purchaseForm"); close && close(); }}>
              <FaPlusCircle className="submenu-icon" /> <span>Add Purchase</span>
            </div>
            <div className={`submenu-item ${isActive("purchaseList") ? "active" : ""}`}
              onClick={() => { navigate("/index/purchaseList"); close && close(); }}>
              <FaListAlt className="submenu-icon" /> <span>Purchase List</span>
            </div>
            <div className="submenu-item"
              onClick={() => { navigate("/index/purchaseList?tab=returns"); close && close(); }}>
              <FaUndo className="submenu-icon" /> <span>Purchase Returns</span>
            </div>
          </div>
        )}
        </>
        )}

        {/* 6. Customer */}
        {hasPermission("customers.view") && (
        <NavItem className={`menu-item ${isActive("customer") ? "active" : ""}`}
          onClick={() => { navigate("/index/customer"); close && close(); }}>
          <FaUsers className="menu-icon" />
          {!collapsed && <span className="menu-text">Customer</span>}
        </NavItem>
        )}

        {/* 7. Sales */}
        {hasPermission("sales.view") && (
        <>
        <NavItem className={`menu-item ${isSalesActive ? "active" : ""}`}
          onClick={() => toggleMenu("sales")}>
          <FaDollarSign className="menu-icon" />
          {!collapsed && <span className="menu-text">{isNonUser ? "Non-GST Sales" : "Sales"}</span>}
          {!collapsed && (openMenu === "sales" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        {!collapsed && openMenu === "sales" && (
          <div className="submenu">
            <div className={`submenu-item ${isActive("salesForm") ? "active" : ""}`}
              onClick={() => { navigate("/index/salesForm"); close && close(); }}>
              <FaPlusCircle className="submenu-icon" /> <span>Add Sale / POS</span>
            </div>
            <div className={`submenu-item ${isActive("salesList") ? "active" : ""}`}
              onClick={() => { navigate("/index/salesList"); close && close(); }}>
              <FaListAlt className="submenu-icon" /> <span>Sales List</span>
            </div>
            {!isCashier && (
              <>
<<<<<<< HEAD
                <NavItem className={`submenu-item ${isActive("sales-persons") ? "active" : ""}`}
                  onClick={() => { navigate("sales-persons"); close && close(); }}>
                  <FaUsers /> <span>Sales Persons</span>
                </NavItem>
                {isSuperAdmin && (
                  <NavItem className={`submenu-item ${isActive("sales-person-report") ? "active" : ""}`}
                    onClick={() => { navigate("sales-person-report"); close && close(); }}>
                    <FaChartBar /> <span>Sales Person Report</span>
                  </NavItem>
                )}
=======
                <div className={`submenu-item ${isActive("sales-persons") ? "active" : ""}`}
                  onClick={() => { navigate("/index/sales-persons"); close && close(); }}>
                  <FaUsers className="submenu-icon" /> <span>Sales Persons</span>
                </div>
                <div className={`submenu-item ${isActive("sales-person-report") ? "active" : ""}`}
                  onClick={() => { navigate("/index/sales-person-report"); close && close(); }}>
                  <FaChartBar className="submenu-icon" /> <span>Sales Person Report</span>
                </div>
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
              </>
            )}
          </div>
        )}
        </>
        )}

        {/* 8. Stocks (GST only) */}
        {!isNonUser && hasPermission("stock.view") && (
        <>
        <NavItem className={`menu-item ${isStockActive ? "active" : ""}`}
          onClick={() => toggleMenu("stock")}>
          <FaWarehouse className="menu-icon" />
          {!collapsed && <span className="menu-text">Stocks</span>}
          {!collapsed && (openMenu === "stock" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        {!collapsed && openMenu === "stock" && (
          <div className="submenu">
            {!isCashier && (
              <>
                <div className={`submenu-item ${isActive("StockInList") ? "active" : ""}`}
                  onClick={() => { navigate("/index/StockInList"); close && close(); }}>
                  <FaPlusCircle className="submenu-icon" /> <span>Stock In</span>
                </div>
                <div className={`submenu-item ${isActive("stockout") ? "active" : ""}`}
                  onClick={() => { navigate("/index/stockout"); close && close(); }}>
                  <FaMinusCircle className="submenu-icon" /> <span>Stock Out</span>
                </div>
              </>
            )}
            <div className={`submenu-item ${isActive("stock-details") ? "active" : ""}`}
              onClick={() => { navigate("/index/stock-details"); close && close(); }}>
              <FaListAlt className="submenu-icon" /> <span>Stock List</span>
            </div>
          </div>
        )}
        </>
        )}

        {/* 9. Expense */}
        {hasPermission("expenses.view") && (
        <>
        <NavItem className={`menu-item ${isExpensesActive ? "active" : ""}`}
          onClick={() => toggleMenu("expenses")}>
          <FaWallet className="menu-icon" />
          {!collapsed && <span className="menu-text">{isNonUser ? "Non-GST Expenses" : "Expenses"}</span>}
          {!collapsed && (openMenu === "expenses" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        {!collapsed && openMenu === "expenses" && (
          <div className="submenu">
            <div className={`submenu-item ${isActive("expenses/categories") ? "active" : ""}`}
              onClick={() => { navigate("/index/expenses/categories"); close && close(); }}>
              <FaLayerGroup className="submenu-icon" /> <span>Add Categories</span>
            </div>
            <div className={`submenu-item ${isActive("expenses/add") ? "active" : ""}`}
              onClick={() => { navigate("/index/expenses/add"); close && close(); }}>
              <FaPlusCircle className="submenu-icon" /> <span>{isNonUser ? "Add Non-GST Expense" : "Add Expenses"}</span>
            </div>
            <div className={`submenu-item ${isActive("expenses/list") ? "active" : ""}`}
              onClick={() => { navigate("/index/expenses/list"); close && close(); }}>
              <FaListAlt className="submenu-icon" /> <span>{isNonUser ? "Non-GST Expenses List" : "Expenses List"}</span>
            </div>
          </div>
        )}
        </>
        )}

        {/* 10. Opening Balance */}
        {hasPermission("day_closing.view") && (
        <NavItem className={`menu-item ${isActive("day-closing") ? "active" : ""}`}
          onClick={() => { navigate("/index/day-closing"); close && close(); }}>
          <FaMoneyCheckAlt className="menu-icon" />
          {!collapsed && <span className="menu-text">Opening Balance</span>}
        </NavItem>
        )}

        {/* 11. Ledger */}
        {hasPermission("ledger.view") && (
        <NavItem className={`menu-item ${isActive("ledger") ? "active" : ""}`}
          onClick={() => { navigate("/index/ledger"); close && close(); }}>
          <FaFileInvoice className="menu-icon" />
          {!collapsed && <span className="menu-text">Ledger</span>}
        </NavItem>
        )}

        {/* 12. Bank Accounts */}
        {hasPermission("bank_accounts.view") && (
        <NavItem className={`menu-item ${isActive("bank-accounts") ? "active" : ""}`}
          onClick={() => { navigate("/index/bank-accounts"); close && close(); }}>
          <FaWallet className="menu-icon" />
          {!collapsed && <span className="menu-text">Bank Accounts</span>}
        </NavItem>
        )}

        {/* 13. Reports (Super Admin only) */}
        {!isNonUser && !isCashier && isSuperAdmin && hasPermission("reports.view") && (
        <>
        <NavItem className={`menu-item ${isReportsActive ? "active" : ""}`}
          onClick={() => toggleMenu("reports")}>
          <FaChartBar className="menu-icon" />
          {!collapsed && <span className="menu-text">Reports</span>}
          {!collapsed && (openMenu === "reports" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        {!collapsed && openMenu === "reports" && (
          <div className="submenu">
            <div className={`submenu-item ${isActive("dailySalesReport") ? "active" : ""}`}
              onClick={() => { navigate("/index/dailySalesReport"); close && close(); }}>
              <FaListAlt className="submenu-icon" /> <span>Daily Sales Report</span>
            </div>

            {!isCashier && (
              <div className={`submenu-item ${isActive("salesReport") ? "active" : ""}`}
                onClick={() => { navigate("/index/salesReport"); close && close(); }}>
                <FaListAlt className="submenu-icon" /> <span>Sale Report</span>
              </div>
            )}

            {!isNonUser && !isCashier && (
            <div className={`submenu-item ${isActive("gstReport") ? "active" : ""}`}
              onClick={() => { navigate("/index/gstReport"); close && close(); }}>
              <FaListAlt className="submenu-icon" /> <span>GST Report</span>
            </div>
            )}
            {!isNonUser && !isCashier && (
            <div className={`submenu-item ${isActive("purchaseReport") ? "active" : ""}`}
              onClick={() => { navigate("/index/purchaseReport"); close && close(); }}>
              <FaListAlt className="submenu-icon" /> <span>Purchase Report</span>
            </div>
            )}
            {!isNonUser && !isCashier && (
            <div className={`submenu-item ${isActive("stockReport") ? "active" : ""}`}
              onClick={() => { navigate("/index/stockReport"); close && close(); }}>
              <FaListAlt className="submenu-icon" /> <span>Stock Report</span>
            </div>
            )}
            <div className={`submenu-item ${isActive("daily-cash-report") ? "active" : ""}`}
              onClick={() => { navigate("/index/daily-cash-report"); close && close(); }}>
              <FaListAlt className="submenu-icon" /> <span>Daily Cash Report</span>
            </div>
          </div>
        )}
        </>
        )}

        {/* Tax Modules (GST only) */}
        {!isNonUser && !isCashier && hasPermission("tax_modules.view") && (
        <NavItem className={`menu-item ${isActive("taxModulesList") ? "active" : ""}`}
          onClick={() => { navigate("/index/taxModulesList"); close && close(); }}>
          <FaPercent className="menu-icon" />
          {!collapsed && <span className="menu-text">Tax Modules List</span>}
        </NavItem>
        )}

        {/* Tax Groups (GST only) */}
        {!isNonUser && !isCashier && hasPermission("tax_groups.view") && (
        <NavItem className={`menu-item ${isActive("taxGroupsList") ? "active" : ""}`}
          onClick={() => { navigate("/index/taxGroupsList"); close && close(); }}>
          <FaLayerGroup className="menu-icon" />
          {!collapsed && <span className="menu-text">Tax Groups List</span>}
        </NavItem>
        )}

        {/* Quotations (Super Admin only) */}
        {!isNonUser && !isCashier && isSuperAdmin && hasPermission("quotations.view") && (
        <>
        <NavItem className={`menu-item ${isQuotationsActive ? "active" : ""}`}
          onClick={() => toggleMenu("quotations")}>
          <FaFileInvoice className="menu-icon" />
          {!collapsed && <span className="menu-text">Quotations</span>}
          {!collapsed && (openMenu === "quotations" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        {!collapsed && openMenu === "quotations" && (
          <div className="submenu">
            <div className={`submenu-item ${isActive("quotationsList") ? "active" : ""}`}
              onClick={() => { navigate("/index/quotationsList"); close && close(); }}>
              <FaListAlt className="submenu-icon" /> <span>Quotations List</span>
            </div>
          </div>
        )}
        </>
        )}

        {/* Business Location (Super Admin only) */}
        {!isNonUser && !isCashier && isSuperAdmin && hasPermission("business_location.view") && (
        <>
        <NavItem className={`menu-item ${isBusinessLocationActive ? "active" : ""}`}
          onClick={() => toggleMenu("businesslocation")}>
          <FaMapMarkerAlt className="menu-icon" />
          {!collapsed && <span className="menu-text">Business Location</span>}
          {!collapsed && (openMenu === "businesslocation" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        {!collapsed && openMenu === "businesslocation" && (
          <div className="submenu">
            <div className={`submenu-item ${isActive("businessLocation") ? "active" : ""}`}
              onClick={() => { navigate("/index/businessLocation"); close && close(); }}>
              <FaListAlt className="submenu-icon" /> <span>Location List</span>
            </div>
          </div>
        )}
        </>
        )}

        {/* Branch Management (Super Admin only) */}
        {!isNonUser && !isCashier && isSuperAdmin && hasPermission("branches.view") && (
        <NavItem className={`menu-item ${isActive("branches") ? "active" : ""}`}
          onClick={() => { navigate("/index/branches"); close && close(); }}>
          <FaCodeBranch className="menu-icon" />
          {!collapsed && <span className="menu-text">Branches</span>}
        </NavItem>
        )}

        {/* HRMS (Separate Panel) */}
        {!isNonUser && !isCashier && (
        <NavItem className={`menu-item ${location.pathname.startsWith("/hrms") ? "active" : ""}`}
          onClick={() => { navigate("/hrms"); close && close(); }}>
          <FaUserTie className="menu-icon" />
          {!collapsed && <span className="menu-text">HRMS</span>}
        </NavItem>
        )}

        {/* User Management (Super Admin only) */}
        {!isNonUser && !isCashier && isSuperAdmin && hasPermission("users.view") && (
        <NavItem className={`menu-item ${isActive("userManagement") ? "active" : ""}`}
          onClick={() => { navigate("userManagement"); close && close(); }}>
          <FaUserShield className="menu-icon" />
          {!collapsed && <span className="menu-text">Users & Roles</span>}
        </NavItem>
        )}

        {/* Settings (GST only) */}
        {!isNonUser && !isCashier && hasPermission("settings.view") && (
        <NavItem className={`menu-item ${isActive("Settings") ? "active" : ""}`}
          onClick={() => { navigate("Settings"); close && close(); }}>
          <FaCog className="menu-icon" />
          {!collapsed && <span className="menu-text">Settings</span>}
        </NavItem>
        )}

        {/* Logout */}
        <NavItem className="menu-item logout"
          onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); navigate("/"); close && close(); }}>
          <FaSignOutAlt className="menu-icon" />
          {!collapsed && <span className="menu-text">Logout</span>}
        </NavItem>

      </Nav>
      )}
    </div>
  );
};

const Sidebar = ({ desktop, mobile, open, toggle, collapsed = false }) => {
  if (desktop) return <div className={`desktop-sidebar d-none d-md-block ${collapsed ? "collapsed" : ""}`}><SidebarContent collapsed={collapsed} /></div>;

  if (mobile) return (
    <Offcanvas direction="start" isOpen={open} toggle={toggle}>
      <OffcanvasBody className="sidebar-offcanvas-body">
        <SidebarContent close={toggle} />
      </OffcanvasBody>
    </Offcanvas>
  );

  return null;
};

export default Sidebar;
