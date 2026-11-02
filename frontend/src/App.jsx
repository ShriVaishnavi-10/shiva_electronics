import React, { useEffect } from "react";
import Login from "./components/Login";
import Index from "./components/index";
import DynamicInvoicePrint from "./components/DynamicInvoicePrint";
import DeliveryChallanPrint from "./components/DeliveryChallanPrint";
import PurchaseOrderPrint from "./components/PurchaseOrderPrint";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

        {/* Layout Route */}
        <Route path="/index" element={<Index />}>
          <Route path="customer" element={<Customer />} />
          <Route path="billing" element={<Billing />} />
          <Route path="qautations" element={<Qautations />} />
           <Route path="product" element={<Product />} />
           <Route path="productForm" element={<ProductForm />} />
           <Route path="productForm/:id" element={<ProductForm />} />
           <Route path="quotations" element={<NewQuotations />} />
            <Route path="quotationsForm" element={<QuotationsForm />} />
            <Route path="quotationsForm/:id" element={<QuotationsForm />} />
            <Route path="quotationsList" element={<QuotationsList />} />
            <Route path="quotationsReceipt/:id" element={<QuotationsReceipt />} />
              <Route path="quotationsReport" element={<QuotationsReport />} />
              {/* <Route path="salesReports" element={<SalesReport />} /> */}
              <Route path="purchaseReport" element={<PurchaseReport />} />
              <Route path="salesReport" element={<SalesReport />} />
              <Route path="gstReport" element={<GstReport />} />
              <Route path="stockReport" element={<StockReport />} />
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
              <Route path="businessLocation" element={<BusinessLocation />} />
              <Route path="addLocation" element={<BusinessLocation />} />
              <Route path="locationList" element={<BusinessLocation />} />
              <Route path="salesList" element={<SalesList />} />
              <Route path="sales-persons" element={<SalesPersons />} />
              <Route path="sales-person-report" element={<SalesPersonReport />} />
              <Route path="salesReceipt/:id" element={<SalesReceipt />} />
              <Route path="thermalReceipt/:id" element={<ThermalReceipt />} />
              <Route path="taxModulesList" element={<TaxModulesList />} />
              <Route path="taxGroupsList" element={<TaxGroupsList />} />
               <Route path="NewDemoQuotations" element={<NewDemoQuotations />} />
              <Route path="branches" element={<BranchManagement />} />
              <Route path="userManagement" element={<UserManagement />} />
              <Route path="categoryList" element={<CategoryList />} />
              <Route path="subcategoryList" element={<SubcategoryList />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="expenses/categories" element={<ExpenseCategories />} />
              <Route path="expenses/add" element={<AddExpense />} />
              <Route path="expenses/edit/:id" element={<EditExpense />} />
              <Route path="expenses/list" element={<ExpenseList />} />
              <Route path="bank-accounts" element={<BankAccount />} />
              <Route path="day-closing" element={<DayClosing />} />
              <Route path="daily-cash-report" element={<DailyCashReport />} />
              <Route path="dailySalesReport" element={<DailySalesReport />} />


        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
