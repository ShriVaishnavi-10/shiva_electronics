import React, { useEffect } from "react";
import Login from "./components/Login";
import Index from "./components/index";
import DynamicInvoicePrint from "./components/DynamicInvoicePrint";
import DeliveryChallanPrint from "./components/DeliveryChallanPrint";
import PurchaseOrderPrint from "./components/PurchaseOrderPrint";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getUser } from "./utils/api";
import Billing from "./components/Billing";
import Qautations from "./components/Qautations";
import Customer from "./components/Customer";
import 'bootstrap/dist/css/bootstrap.min.css';
import Product from "./components/product";
import ProductForm from "./components/productForm";
import NewQuotations from "./components/newQuotations";
import QuotationsForm from "./components/QuatationsForm";
import QuotationsList from "./components/quotationsList";
import QuotationsReceipt from "./components/quotationsReceipt";
import Dashboard from "./components/Overview";
import QuotationsReport from "./components/quotationsReport";
import SalesReport from "./components/salesReport";
import GstReport from "./components/GstReport";
import StockReport from "./components/stockReports";
import PurchaseForms from "./components/purchaseForm";
import StockInList from "./components/stockIn";
import StockOutList from "./components/stockOut";
import Settings from "./components/settiings";
import StockOut from "./components/stockOut";
import StockinOutList from "./components/stockFullList";
import StockDetails from "./components/StockDetails";
import PurchaseList from "./components/purchaseList";
import Vendor from "./components/vendor";
import BusinessLocation from "./components/BusinessLocation";
import SalesList from "./components/SalesList";
import SalesForm from "./components/SalesForm";
import SalesReceipt from "./components/SalesReceipt";
import ThermalReceipt from "./components/ThermalReceipt";
import NewDemoQuotations from "./components/new_form_quotation";
import TaxModulesList from "./components/TaxModulesList";
import TaxGroupsList from "./components/TaxGroupsList";
import BranchManagement from "./components/BranchManagement";
import UserManagement from "./components/UserManagement";
import PurchaseReport from "./components/PurchaseReport";
import CategoryList from "./components/CategoryList";
import SubcategoryList from "./components/SubcategoryList";
import Ledger from "./components/Ledger";
import ExpenseCategories from "./Pages/expense/ExpenseCategories";
import AddExpense from "./Pages/expense/AddExpense";
import EditExpense from "./Pages/expense/EditExpense";
import ExpenseList from "./Pages/expense/ExpenseList";
import BankAccount from "./components/BankAccount";
import DayClosing from "./components/DayClosing";
import DailyCashReport from "./components/DailyCashReport";
import DailySalesReport from "./components/DailySalesReport";
import SalesPersons from "./components/SalesPersons";
import SalesPersonReport from "./components/SalesPersonReport";
import CrmLayout from "./components/crm/CrmLayout";
import CrmDashboard from "./components/crm/CrmDashboard";
import CrmContacts from "./components/crm/CrmContacts";
import CrmLeadsList from "./components/crm/CrmLeadsList";
import CrmNewLead from "./components/crm/CrmNewLead";
import CrmFollowupsList from "./components/crm/CrmFollowupsList";
import CrmNewFollowup from "./components/crm/CrmNewFollowup";
import CrmCompletedLeads from "./components/crm/CrmCompletedLeads";
import CrmLeadReports from "./components/crm/CrmLeadReports";
import CrmFollowupReports from "./components/crm/CrmFollowupReports";
import CrmPerformanceReport from "./components/crm/CrmPerformanceReport";
import HrmsDashboard from "./components/HrmsDashboard";
import SalesPersonHrms from "./components/SalesPersonHrms";

const HrmsPortal = () => {
  const user = getUser();
  const roleName = String(user?.role_name || user?.role || "").toLowerCase();
  const isSalesPerson = Number(user?.role_id) === 7 || roleName.includes("sales");
  return isSalesPerson ? <SalesPersonHrms /> : <HrmsDashboard />;
};

const SuperAdminOnly = ({ children }) => {
  const user = getUser();
  const roleLower = String(user?.role_name || "").toLowerCase().trim();
  const isSuperAdmin = roleLower === "super admin" || user?.role_id === 5;
  if (!isSuperAdmin) {
    return <Navigate to="/index/overview" replace />;
  }
  return children;
};

function App() {
  useEffect(() => {
    // Disable accidental increment/decrement on number inputs during mouse scrolling
    const handleWheel = () => {
      if (document.activeElement && document.activeElement.type === "number") {
        document.activeElement.blur();
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/proforma-invoice/:id" element={<DynamicInvoicePrint type="PROFORMA INVOICE" />} />
        <Route path="/delivery-challan/:id" element={<DeliveryChallanPrint type="DELIVERY CHALLAN" />} />
        <Route path="/purchase-order/:id" element={<PurchaseOrderPrint />} />
        <Route path="/thermalReceipt/:id" element={<ThermalReceipt />} />
        <Route path="/thermal-receipt/:id" element={<ThermalReceipt />} />

        {/* POS Fullscreen Routes */}
        <Route path="/index/salesForm" element={<SalesForm />} />
        <Route path="/index/salesForm/:id" element={<SalesForm />} />


        {/* Dedicated CRM Portal Layout & Routes */}
        <Route path="/crm" element={<CrmLayout />}>
          <Route index element={<CrmDashboard />} />
          <Route path="dashboard" element={<CrmDashboard />} />
          <Route path="contacts" element={<CrmContacts />} />
          <Route path="leads" element={<CrmLeadsList />} />
          <Route path="leads/new" element={<CrmNewLead />} />
          <Route path="leads/edit/:id" element={<CrmNewLead />} />
          <Route path="followups" element={<CrmFollowupsList />} />
          <Route path="followups/new" element={<CrmNewFollowup />} />
          <Route path="completed-leads" element={<CrmCompletedLeads />} />
          <Route path="reports" element={<CrmLeadReports />} />
          <Route path="reports/leads" element={<CrmLeadReports />} />
          <Route path="reports/followups" element={<CrmFollowupReports />} />
          <Route path="reports/performance" element={<CrmPerformanceReport />} />
          <Route path="performance" element={<CrmPerformanceReport />} />
        </Route>
        {/* Dedicated Standalone HRMS Panel (Separate URL outside Billing layout) */}
        <Route path="/hrms" element={<HrmsPortal />} />
        <Route path="/hrms/:tab" element={<HrmsPortal />} />

        {/* Layout Route */}
        <Route path="/index" element={<Index />}>
          <Route path="customer" element={<Customer />} />
          <Route path="billing" element={<Billing />} />
          <Route path="qautations" element={<Qautations />} />
           <Route path="product" element={<Product />} />
           <Route path="productForm" element={<ProductForm />} />
           <Route path="productForm/:id" element={<ProductForm />} />
           <Route path="quotations" element={<SuperAdminOnly><NewQuotations /></SuperAdminOnly>} />
            <Route path="quotationsForm" element={<SuperAdminOnly><QuotationsForm /></SuperAdminOnly>} />
            <Route path="quotationsForm/:id" element={<SuperAdminOnly><QuotationsForm /></SuperAdminOnly>} />
            <Route path="quotationsList" element={<SuperAdminOnly><QuotationsList /></SuperAdminOnly>} />
            <Route path="quotationsReceipt/:id" element={<SuperAdminOnly><QuotationsReceipt /></SuperAdminOnly>} />
              <Route path="quotationsReport" element={<SuperAdminOnly><QuotationsReport /></SuperAdminOnly>} />
              {/* <Route path="salesReports" element={<SalesReport />} /> */}
              <Route path="purchaseReport" element={<SuperAdminOnly><PurchaseReport /></SuperAdminOnly>} />
              <Route path="salesReport" element={<SuperAdminOnly><SalesReport /></SuperAdminOnly>} />
              <Route path="gstReport" element={<SuperAdminOnly><GstReport /></SuperAdminOnly>} />
              <Route path="stockReport" element={<SuperAdminOnly><StockReport /></SuperAdminOnly>} />
              <Route path="overview" element={<Dashboard />} />
                   <Route path="purchaseForm" element={<PurchaseForms />} />
              <Route path="StockInList" element={<StockInList />} />
              <Route path="StockOutList" element={<StockOutList />} />
              <Route path="Settings" element={<Settings />} />
              <Route path="stockout" element={<StockOut />} />
              <Route path="stockinOutList" element={<StockinOutList />} />
              <Route path="stock-details" element={<StockDetails />} />
              <Route path="purchaseList" element={<PurchaseList />} />
              <Route path="vendor" element={<Vendor />} />
              <Route path="businessLocation" element={<SuperAdminOnly><BusinessLocation /></SuperAdminOnly>} />
              <Route path="addLocation" element={<SuperAdminOnly><BusinessLocation /></SuperAdminOnly>} />
              <Route path="locationList" element={<SuperAdminOnly><BusinessLocation /></SuperAdminOnly>} />
              <Route path="salesList" element={<SalesList />} />
              <Route path="sales-persons" element={<SalesPersons />} />
              <Route path="sales-person-report" element={<SuperAdminOnly><SalesPersonReport /></SuperAdminOnly>} />
              <Route path="salesReceipt/:id" element={<SalesReceipt />} />
              <Route path="thermalReceipt/:id" element={<ThermalReceipt />} />
              <Route path="taxModulesList" element={<TaxModulesList />} />
              <Route path="taxGroupsList" element={<TaxGroupsList />} />
               <Route path="NewDemoQuotations" element={<SuperAdminOnly><NewDemoQuotations /></SuperAdminOnly>} />
              <Route path="branches" element={<SuperAdminOnly><BranchManagement /></SuperAdminOnly>} />
              <Route path="userManagement" element={<SuperAdminOnly><UserManagement /></SuperAdminOnly>} />
              <Route path="categoryList" element={<CategoryList />} />
              <Route path="subcategoryList" element={<SubcategoryList />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="expenses/categories" element={<ExpenseCategories />} />
              <Route path="expenses/add" element={<AddExpense />} />
              <Route path="expenses/edit/:id" element={<EditExpense />} />
              <Route path="expenses/list" element={<ExpenseList />} />
              <Route path="bank-accounts" element={<BankAccount />} />
              <Route path="day-closing" element={<DayClosing />} />
              <Route path="daily-cash-report" element={<SuperAdminOnly><DailyCashReport /></SuperAdminOnly>} />
              <Route path="dailySalesReport" element={<SuperAdminOnly><DailySalesReport /></SuperAdminOnly>} />


        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
