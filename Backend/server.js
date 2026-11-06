const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), override: true });

const express = require("express");
const cors = require("cors");

const customerRoutes = require("./routes/customer.routes");
const productRoutes = require("./routes/product.routes");
const categoryRoutes = require("./routes/category.routes");
const subCategoryRoutes = require("./routes/subcategory.routes");
const vendorRoutes = require("./routes/vendor.routes");
const purchaseRoutes = require("./routes/purchase.routes");
const quotationRoutes = require("./routes/quotation.routes");
const demoQuotationRoutes = require("./routes/demoQuotation.routes");
const stockRoutes = require("./routes/stock.routes");
const settingsRoutes = require("./routes/settings.routes");
const brandRoutes = require("./routes/brand.routes");
const locationRoutes = require("./routes/location.routes");
const transactionRoutes = require("./routes/transaction.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const taxRoutes = require("./routes/tax.routes");
const taxGroupRoutes = require("./routes/taxGroup.routes");
const unitRoutes = require("./routes/unit.routes");
const branchRoutes = require("./routes/branch.routes");
const userRoutes = require("./routes/user.routes");
const roleRoutes = require("./routes/role.routes");

const app = express();

/* -------------------- MIDDLEWARE -------------------- */

const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin && String(corsOrigin).trim()) {
  app.use(
    cors({
      origin: corsOrigin.split(",").map((s) => s.trim()).filter(Boolean),
      credentials: true,
    }),
  );
} else {
  app.use(cors());
}
app.use(express.json()); // body parser (modern Express)

const { JWT_SECRET, isNonUser, blockNonUserFromGst } = require("./middleware/auth.middleware");
const jwt = require("jsonwebtoken");

// Automatically resolve token & non-user status for all requests
app.use((req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      req.isNonUser = isNonUser(decoded);
      req.isGst = req.isNonUser ? 0 : 1;
    } catch (e) {
      // Ignore token decode error for public endpoints
    }
  }
  next();
});

// Disable caching
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
});

// Static folders
app.use("/uploads", express.static("uploads"));
app.use("/src/assets", express.static("../src/assets"));

/* -------------------- TEST ROUTE -------------------- */

app.get("/", (req, res) => {
  res.send("Backend is running successfully 🚀");
});

/* -------------------- API ROUTES -------------------- */

app.use("/api", require("./routes/auth"));
app.use("/api", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/subcategories", subCategoryRoutes);
app.use("/api/search", productRoutes);
app.use("/api", vendorRoutes);
app.use("/api", purchaseRoutes);
app.use("/api", require("./routes/purchaseReturn.routes"));
app.use("/api", quotationRoutes);
app.use("/api", demoQuotationRoutes);
app.use("/api", stockRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api", locationRoutes);
app.use("/api", transactionRoutes);
app.use("/api", require("./routes/salesPerson.routes"));
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/tax-modules", blockNonUserFromGst, taxRoutes);
app.use("/api/tax-groups", blockNonUserFromGst, taxGroupRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/users", blockNonUserFromGst, userRoutes);
app.use("/api/roles", blockNonUserFromGst, roleRoutes);

app.use("/api/expenses", require("./routes/expense.routes"));
app.use("/api", require("./routes/ledger.routes"));
app.use("/api", require("./routes/bankAccount.routes"));
app.use("/api", require("./routes/dailyCash.routes"));
app.use("/api", require("./routes/dailySalesReport.routes"));
app.use("/api", require("./routes/crmLead.routes"));
app.use("/api/crm/followups", require("./routes/crmFollowup.routes"));
app.use("/api/hrms", require("./routes/hrms.routes"));
app.use("/api/notifications", require("./routes/notification.routes"));

/* -------------------- ERROR HANDLER -------------------- */

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
  });
});

/* -------------------- SERVER -------------------- */

const { ensureBillToColumns } = require("./migrations/add_bill_to_columns");
const { ensureCustomerStateColumn } = require("./migrations/add_customer_state_column");
const { ensurePurchaseReturnsTables } = require("./migrations/create_purchase_returns_tables");
const { ensurePurchaseChargesColumns } = require("./migrations/add_purchase_charges_columns");
const { ensureSalesChargesColumns } = require("./migrations/add_sales_charges_columns");
const { updateSslToCtw } = require("./migrations/update_ssl_to_ctw");
const { ensureSalesPersonTables } = require("./migrations/create_sales_person_tables");
const { ensureCrmLeadsTables } = require("./migrations/create_crm_leads_tables");
const { ensureCrmFollowupsTables } = require("./migrations/create_crm_followups_tables");
const { ensureHrmsNotificationsTables } = require("./migrations/create_hrms_notifications_table");
const { ensureHrmsTables } = require("./migrations/create_hrms_tables");
const { ensureProductQuantityColumn } = require("./migrations/add_product_quantity");
const { ensurePoFieldsColumns } = require("./migrations/add_po_fields_to_transactions");
const { ensureProductCombosAndFreebiesColumns } = require("./migrations/add_combos_freebies_to_products");
const { ensureProductSerialNumbersTable } = require("./migrations/add_serial_numbers_to_products");

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  ensureBillToColumns().catch(() => {});
  ensureCustomerStateColumn().catch(() => {});
  ensurePurchaseReturnsTables().catch(() => {});
  ensurePurchaseChargesColumns().catch(() => {});
  ensureSalesChargesColumns().catch(() => {});
  updateSslToCtw().catch(() => {});
  ensureSalesPersonTables().catch(() => {});
  ensureCrmLeadsTables().catch(() => {});
  ensureCrmFollowupsTables().catch(() => {});
  ensureHrmsNotificationsTables().catch(() => {});
  ensureHrmsTables().catch((err) => {
    console.error("HRMS initialization failed:", err.message || err);
  });
  ensureProductQuantityColumn().catch(() => {});
  ensurePoFieldsColumns().catch(() => {});
  ensureProductCombosAndFreebiesColumns().catch(() => {});
  ensureProductSerialNumbersTable().catch(() => {});
});