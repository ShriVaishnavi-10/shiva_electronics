const fs = require('fs');

const file = 'src/components/Sidebar.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /return \([\s\S]*?(?=^};\n\nconst Sidebar =)/m;
const match = content.match(regex);

if (match) {
  let newReturn = `return (
    <div className={\`sidebar \${collapsed ? "collapsed" : ""}\`}>
      <div className="sidebar-header">{collapsed ? "AP" : "Admin Panel"}</div>

      <Nav vertical className="sidebar-menu">

        {/* 1. Dashboard */}
        {hasPermission("dashboard.view") && (
        <NavItem className={\`menu-item \${isActive("overview") ? "active" : ""}\`}
          onClick={() => { navigate("overview"); close && close(); }}>
          <FaTachometerAlt className="menu-icon" />
          {!collapsed && <span className="menu-text">Dashboard</span>}
        </NavItem>
        )}

        {/* 2. Customer */}
        {hasPermission("customers.view") && (
        <NavItem className={\`menu-item \${isActive("customer") ? "active" : ""}\`}
          onClick={() => { navigate("customer"); close && close(); }}>
          <FaUsers className="menu-icon" />
          {!collapsed && <span className="menu-text">Customer</span>}
        </NavItem>
        )}

        {/* 3. Vendor */}
        {hasPermission("vendors.view") && (
        <NavItem className={\`menu-item \${isActive("vendor") ? "active" : ""}\`}
          onClick={() => { navigate("vendor"); close && close(); }}>
          <FaStore className="menu-icon" />
          {!collapsed && <span className="menu-text">Vendor</span>}
        </NavItem>
        )}

        {/* 4. Category */}
        {hasPermission("category.view") && (
        <>
        <NavItem className={\`menu-item \${isCategoryActive ? "active" : ""}\`}
          onClick={() => toggleMenu("category")}>
          <FaLayerGroup className="menu-icon" />
          {!collapsed && <span className="menu-text">Category</span>}
          {!collapsed && (openMenu === "category" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        <Collapse isOpen={!collapsed && openMenu === "category"}>
          <div className="submenu">
            <NavItem className={\`submenu-item \${isActive("categoryList") ? "active" : ""}\`}
              onClick={() => { navigate("categoryList"); close && close(); }}>
              <FaListAlt /> <span>Category List</span>
            </NavItem>
            <NavItem className={\`submenu-item \${isActive("subcategoryList") ? "active" : ""}\`}
              onClick={() => { navigate("subcategoryList"); close && close(); }}>
              <FaListAlt /> <span>Subcategory List</span>
            </NavItem>
          </div>
        </Collapse>
        </>
        )}

        {/* 5. Product */}
        {hasPermission("products.view") && (
        <NavItem className={\`menu-item \${isActive("product") ? "active" : ""}\`}
          onClick={() => { navigate("product"); close && close(); }}>
          <FaBoxOpen className="menu-icon" />
          {!collapsed && <span className="menu-text">Product</span>}
        </NavItem>
        )}

        {/* 6. Purchase */}
        {hasPermission("purchases.view") && (
        <>
        <NavItem className={\`menu-item \${isActive("purchase") ? "active" : ""}\`}
          onClick={() => toggleMenu("purchase")}>
          <FaShoppingCart className="menu-icon" />
          {!collapsed && <span className="menu-text">Purchase</span>}
          {!collapsed && (openMenu === "purchase" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        <Collapse isOpen={!collapsed && openMenu === "purchase"}>
          <div className="submenu">
            <NavItem className={\`submenu-item \${isActive("purchaseForm") ? "active" : ""}\`}
              onClick={() => { navigate("purchaseForm"); close && close(); }}>
              <FaPlusCircle /> <span>Add Purchase</span>
            </NavItem>
            <NavItem className={\`submenu-item \${isActive("purchaseList") ? "active" : ""}\`}
              onClick={() => { navigate("purchaseList"); close && close(); }}>
              <FaListAlt /> <span>Purchase List</span>
            </NavItem>
          </div>
        </Collapse>
        </>
        )}

        {/* 7. Service */}
        {hasPermission("services.view") && (
        <NavItem className={\`menu-item \${isActive("service") ? "active" : ""}\`}
          onClick={() => { navigate("service"); close && close(); }}>
          <FaTools className="menu-icon" />
          {!collapsed && <span className="menu-text">Services</span>}
        </NavItem>
        )}

        {/* 8. Sales */}
        {hasPermission("sales.view") && (
        <>
        <NavItem className={\`menu-item \${isSalesActive ? "active" : ""}\`}
          onClick={() => toggleMenu("sales")}>
          <FaDollarSign className="menu-icon" />
          {!collapsed && <span className="menu-text">Sales</span>}
          {!collapsed && (openMenu === "sales" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        <Collapse isOpen={!collapsed && openMenu === "sales"}>
          <div className="submenu">
            <NavItem className={\`submenu-item \${isActive("salesForm") ? "active" : ""}\`}
              onClick={() => { navigate("salesForm"); close && close(); }}>
              <FaPlusCircle /> <span>Add Sale</span>
            </NavItem>
            <NavItem className={\`submenu-item \${isActive("salesList") ? "active" : ""}\`}
              onClick={() => { navigate("salesList"); close && close(); }}>
              <FaListAlt /> <span>Sales List</span>
            </NavItem>
          </div>
        </Collapse>
        </>
        )}

        {/* 9. Stocks */}
        {hasPermission("stock.view") && (
        <>
        <NavItem className={\`menu-item \${isActive("stock") ? "active" : ""}\`}
          onClick={() => toggleMenu("stock")}>
          <FaWarehouse className="menu-icon" />
          {!collapsed && <span className="menu-text">Stocks</span>}
          {!collapsed && (openMenu === "stock" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        <Collapse isOpen={!collapsed && openMenu === "stock"}>
          <div className="submenu">
            <NavItem className={\`submenu-item \${isActive("StockInList") ? "active" : ""}\`}
              onClick={() => { navigate("StockInList"); close && close(); }}>
              <FaPlusCircle /> <span>Stock In</span>
            </NavItem>
            <NavItem className={\`submenu-item \${isActive("stockout") ? "active" : ""}\`}
              onClick={() => { navigate("stockout"); close && close(); }}>
              <FaMinusCircle /> <span>Stock Out</span>
            </NavItem>
            <NavItem className={\`submenu-item \${isActive("stockinOutList") ? "active" : ""}\`}
              onClick={() => { navigate("stockinOutList"); close && close(); }}>
              <FaListAlt /> <span>Stock List</span>
            </NavItem>
          </div>
        </Collapse>
        </>
        )}

        {/* 10. Expense */}
        {hasPermission("expenses.view") && (
        <>
        <NavItem className={\`menu-item \${isExpensesActive ? "active" : ""}\`}
          onClick={() => toggleMenu("expenses")}>
          <FaWallet className="menu-icon" />
          {!collapsed && <span className="menu-text">Expenses</span>}
          {!collapsed && (openMenu === "expenses" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        <Collapse isOpen={!collapsed && openMenu === "expenses"}>
          <div className="submenu">
             <NavItem className={\`submenu-item \${isActive("expenses/categories") ? "active" : ""}\`}
              onClick={() => { navigate("expenses/categories"); close && close(); }}>
              <FaLayerGroup /> <span>Add Categories</span>
            </NavItem>
             <NavItem className={\`submenu-item \${isActive("expenses/add") ? "active" : ""}\`}
              onClick={() => { navigate("expenses/add"); close && close(); }}>
              <FaPlusCircle /> <span>Add Expenses</span>
            </NavItem>
            <NavItem className={\`submenu-item \${isActive("expenses/list") ? "active" : ""}\`}
              onClick={() => { navigate("expenses/list"); close && close(); }}>
              <FaListAlt /> <span> Expenses List</span>
            </NavItem>
          </div>
        </Collapse>
        </>
        )}

        {/* 11. Tax Modules */}
        {hasPermission("tax_modules.view") && (
        <NavItem className={\`menu-item \${isActive("taxModulesList") ? "active" : ""}\`}
          onClick={() => { navigate("taxModulesList"); close && close(); }}>
          <FaPercent className="menu-icon" />
          {!collapsed && <span className="menu-text">Tax Modules List</span>}
        </NavItem>
        )}

        {/* 12. Tax Groups */}
        {hasPermission("tax_groups.view") && (
        <NavItem className={\`menu-item \${isActive("taxGroupsList") ? "active" : ""}\`}
          onClick={() => { navigate("taxGroupsList"); close && close(); }}>
          <FaLayerGroup className="menu-icon" />
          {!collapsed && <span className="menu-text">Tax Groups List</span>}
        </NavItem>
        )}

        {/* 13. Ledger */}
        {hasPermission("ledger.view") && (
        <NavItem className={\`menu-item \${isActive("ledger") ? "active" : ""}\`}
          onClick={() => { navigate("ledger"); close && close(); }}>
          <FaFileInvoice className="menu-icon" />
          {!collapsed && <span className="menu-text">Ledger</span>}
        </NavItem>
        )}

        {/* 14. Bank Accounts */}
        {hasPermission("bank_accounts.view") && (
        <NavItem className={\`menu-item \${isActive("bank-accounts") ? "active" : ""}\`}
          onClick={() => { navigate("bank-accounts"); close && close(); }}>
          <FaWallet className="menu-icon" />
          {!collapsed && <span className="menu-text">Bank Accounts</span>}
        </NavItem>
        )}

        {/* 15. Day Closing */}
        {hasPermission("day_closing.view") && (
        <NavItem className={\`menu-item \${isActive("day-closing") ? "active" : ""}\`}
          onClick={() => { navigate("day-closing"); close && close(); }}>
          <FaMoon className="menu-icon" />
          {!collapsed && <span className="menu-text">Day Closing</span>}
        </NavItem>
        )}

        {/* 14. Reports */}
        {hasPermission("reports.view") && (
        <>
        <NavItem className={\`menu-item \${isReportsActive ? "active" : ""}\`}
          onClick={() => toggleMenu("reports")}>
          <FaChartBar className="menu-icon" />
          {!collapsed && <span className="menu-text">Reports</span>}
          {!collapsed && (openMenu === "reports" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        <Collapse isOpen={!collapsed && openMenu === "reports"}>
          <div className="submenu">
            <NavItem className={\`submenu-item \${isActive("salesReport") ? "active" : ""}\`}
              onClick={() => { navigate("salesReport"); close && close(); }}>
              <FaListAlt /> <span>Sale Report</span>
            </NavItem>
            <NavItem className={\`submenu-item \${isActive("gstReport") ? "active" : ""}\`}
              onClick={() => { navigate("gstReport"); close && close(); }}>
              <FaListAlt /> <span>GST Report</span>
            </NavItem>
            <NavItem className={\`submenu-item \${isActive("purchaseReport") ? "active" : ""}\`}
              onClick={() => { navigate("purchaseReport"); close && close(); }}>
              <FaListAlt /> <span>Purchase Report</span>
            </NavItem>
            <NavItem className={\`submenu-item \${isActive("stock-details") ? "active" : ""}\`}
              onClick={() => { navigate("stock-details"); close && close(); }}>
              <FaListAlt /> <span>Stock Report</span>
            </NavItem>
            <NavItem className={\`submenu-item \${isActive("serviceReport") ? "active" : ""}\`}
              onClick={() => { navigate("serviceReport"); close && close(); }}>
              <FaListAlt /> <span>Service Report</span>
            </NavItem>
            <NavItem className={\`submenu-item \${isActive("daily-cash-report") ? "active" : ""}\`}
              onClick={() => { navigate("daily-cash-report"); close && close(); }}>
              <FaListAlt /> <span>Daily Cash Report</span>
            </NavItem>
          </div>
        </Collapse>
        </>
        )}

        {/* Quotations */}
        {hasPermission("quotations.view") && (
        <>
        <NavItem className={\`menu-item \${isQuotationsActive ? "active" : ""}\`}
          onClick={() => toggleMenu("quotations")}>
          <FaFileInvoice className="menu-icon" />
          {!collapsed && <span className="menu-text">Quotations</span>}
          {!collapsed && (openMenu === "quotations" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        <Collapse isOpen={!collapsed && openMenu === "quotations"}>
          <div className="submenu">
            <NavItem className={\`submenu-item \${isActive("quotationsList") ? "active" : ""}\`}
              onClick={() => { navigate("quotationsList"); close && close(); }}>
              <FaListAlt /> <span>Quotations List</span>
            </NavItem>
          </div>
        </Collapse>
        </>
        )}

        {/* Business Location */}
        {hasPermission("business_location.view") && (
        <>
        <NavItem className={\`menu-item \${isBusinessLocationActive ? "active" : ""}\`}
          onClick={() => toggleMenu("businesslocation")}>
          <FaMapMarkerAlt className="menu-icon" />
          {!collapsed && <span className="menu-text">Business Location</span>}
          {!collapsed && (openMenu === "businesslocation" ? <FaChevronDown className="arrow-icon" /> : <FaChevronRight className="arrow-icon" />)}
        </NavItem>
        <Collapse isOpen={!collapsed && openMenu === "businesslocation"}>
          <div className="submenu">
            <NavItem className={\`submenu-item \${isActive("businessLocation") ? "active" : ""}\`}
              onClick={() => { navigate("businessLocation"); close && close(); }}>
              <FaListAlt /> <span>Location List</span>
            </NavItem>
          </div>
        </Collapse>
        </>
        )}

        {/* Branch Management */}
        {hasPermission("branches.view") && (
        <NavItem className={\`menu-item \${isActive("branches") ? "active" : ""}\`}
          onClick={() => { navigate("branches"); close && close(); }}>
          <FaCodeBranch className="menu-icon" />
          {!collapsed && <span className="menu-text">Branches</span>}
        </NavItem>
        )}

        {/* User Management */}
        {hasPermission("users.view") && (
        <NavItem className={\`menu-item \${isActive("userManagement") ? "active" : ""}\`}
          onClick={() => { navigate("userManagement"); close && close(); }}>
          <FaUserShield className="menu-icon" />
          {!collapsed && <span className="menu-text">Users & Roles</span>}
        </NavItem>
        )}

        {/* Settings */}
        {hasPermission("settings.view") && (
        <NavItem className={\`menu-item \${isActive("Settings") ? "active" : ""}\`}
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
    </div>
  );`;
  
  const updatedContent = content.replace(regex, newReturn + '\n');
  fs.writeFileSync(file, updatedContent, 'utf8');
  console.log('Sidebar replaced successfully.');
} else {
  console.log('Regex did not match.');
}
