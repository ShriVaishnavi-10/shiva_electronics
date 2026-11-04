import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { getActiveBranchId } from "../utils/api";
import {
  Col,
  Input,
  Button,
  Card,
  CardBody,
  Row,
  Table,
  Label,
  FormGroup,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  Badge,
} from "reactstrap";
import { FaPlus, FaTrash, FaSearch } from "react-icons/fa";
import { toast } from "react-toastify";

import { apiUrl } from "../config/urls";

const API = apiUrl();
const VENDOR_API = apiUrl("vendors");
const PRODUCT_API = apiUrl("products");
const CATEGORY_API = apiUrl("categories");
const SUBCATEGORY_API = apiUrl("subcategories");
const PURCHASE_API = apiUrl("purchases");
const PURCHASE_TX_API = apiUrl("purchase");
const TAX_GROUPS_API = apiUrl("tax-groups");
const BRANDS_API = apiUrl("brands");
const UNITS_API = apiUrl("units");

const PAYMENT_OPTIONS = [
  "Cash",
  "Credit",
  "Debit",
  "UPI",
  "GPay",
  "PhonePe",
  "Paytm",
  "Net Banking",
];

export default function PurchaseUI() {
  const location = useLocation();
  const navigate = useNavigate();
  const editId = location.state?.purchaseId || null;
  /* ---------------- Vendor ---------------- */
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendors, setVendors] = useState([]);
  const [showVendorCard, setShowVendorCard] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [activeVendorIndex, setActiveVendorIndex] = useState(-1);
  const [vendorSearchLocked, setVendorSearchLocked] = useState(false);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    company_name: "",
    vendor_type: "",
    mobile: "",
    email: "",
    address: "",
    pincode: "",
    status: "Active",
    gst_no: "",
    opening_balance: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    bank_branch: "",
    upi_id: "",
  });

  /* ---------------- Product Search ---------------- */
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showProductCard, setShowProductCard] = useState(false);
  const [activeProductIndex, setActiveProductIndex] = useState(-1);

  /* ---------------- Product Add Form (Modal) ---------------- */
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [primaryUnits, setPrimaryUnits] = useState([]);
  const [secondaryUnits, setSecondaryUnits] = useState([]);
  const [catSearch, setCatSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [primaryUnitSearch, setPrimaryUnitSearch] = useState("");
  const [secondaryUnitSearch, setSecondaryUnitSearch] = useState("");
  const [showCatList, setShowCatList] = useState(false);
  const [showSubList, setShowSubList] = useState(false);
  const [showBrandList, setShowBrandList] = useState(false);
  const [showPrimaryUnitList, setShowPrimaryUnitList] = useState(false);
  const [showSecondaryUnitList, setShowSecondaryUnitList] = useState(false);
  const [catActiveIndex, setCatActiveIndex] = useState(-1);
  const [subActiveIndex, setSubActiveIndex] = useState(-1);
  const [productForm, setProductForm] = useState({
    category_id: "",
    subcategory_id: "",
    brand_id: "",
    product_name: "",
    primary_unit: "",
    secondary_unit: "",
    hsncode: "",
    price: "",
    status: "Active",
  });
  const catRef = useRef(null);
  const subRef = useRef(null);
  const brandRef = useRef(null);
  const primaryUnitRef = useRef(null);
  const secondaryUnitRef = useRef(null);

  /* ---------------- Table ---------------- */
  const [items, setItems] = useState([]);
  const [taxGroups, setTaxGroups] = useState([]);
  const [taxGroupId, setTaxGroupId] = useState("");

  /* ---------------- Purchase ID, Date & Vehicle ---------------- */
  const [purchaseNo, setPurchaseNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [vehicleNo, setVehicleNo] = useState("");

  /* ---------------- Charges (Transport & Additional) ---------------- */
  const [transportCharges, setTransportCharges] = useState("");
  const [additionalCharges, setAdditionalCharges] = useState([]);
  const [chargeName, setChargeName] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");

  /* ---------------- Payment ---------------- */
  const [poNo, setPoNo] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [status, setStatus] = useState("Received");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountId, setBankAccountId] = useState("");

  const wrapperRef = useRef(null);
  const vendorInputRef = useRef(null);
  const productInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowVendorCard(false);
        setShowProductCard(false);
        setActiveVendorIndex(-1);
        setActiveProductIndex(-1);
      }
      if (catRef.current && !catRef.current.contains(e.target))
        setShowCatList(false);
      if (subRef.current && !subRef.current.contains(e.target))
        setShowSubList(false);
      if (brandRef.current && !brandRef.current.contains(e.target))
        setShowBrandList(false);
      if (primaryUnitRef.current && !primaryUnitRef.current.contains(e.target))
        setShowPrimaryUnitList(false);
      if (secondaryUnitRef.current && !secondaryUnitRef.current.contains(e.target))
        setShowSecondaryUnitList(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------------- Load Tax Groups (for tax dropdown) ---------------- */
  useEffect(() => {
    axios
      .get(TAX_GROUPS_API, { params: { limit: 500 } })
      .then((res) =>
        setTaxGroups(Array.isArray(res.data?.data) ? res.data.data : []),
      )
      .catch(() => setTaxGroups([]));
  }, []);

  /* ---------------- Load Bank Accounts ---------------- */
  useEffect(() => {
    axios
      .get(`${API}/bank-accounts`)
      .then((res) => setBankAccounts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setBankAccounts([]));
  }, []);

  /* ---------------- Load Categories ---------------- */
  useEffect(() => {
    axios
      .get(CATEGORY_API)
      .then((res) => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        const msg = err.response?.data?.message || "Failed to load categories";
        toast.error(msg);
        setCategories([]);
      });
  }, []);

  /* ---------------- Load Subcategories when Category changes ---------------- */
  useEffect(() => {
    if (!productForm.category_id) {
      setSubcategories([]);
      return;
    }

    axios
      .get(`${SUBCATEGORY_API}/${productForm.category_id}`)
      .then((res) => setSubcategories(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        const msg =
          err.response?.data?.message || "Failed to load subcategories";
        toast.error(msg);
        setSubcategories([]);
      });
  }, [productForm.category_id]);

  /* ---------------- Load Brands ---------------- */
  useEffect(() => {
    axios
      .get(BRANDS_API)
      .then((res) => setBrands(Array.isArray(res.data) ? res.data : []))
      .catch(() => setBrands([]));
  }, []);

  /* ---------------- Load Primary Units ---------------- */
  useEffect(() => {
    axios
      .get(UNITS_API, { params: { type: "primary" } })
      .then((res) => {
        const list = Array.isArray(res.data)
          ? res.data.map((u) => u.unit_name || u.name || "").filter(Boolean)
          : [];
        setPrimaryUnits(list);
      })
      .catch(() => setPrimaryUnits([]));
  }, []);

  /* ---------------- Load Secondary Units ---------------- */
  useEffect(() => {
    axios
      .get(UNITS_API, { params: { type: "secondary" } })
      .then((res) => {
        const list = Array.isArray(res.data)
          ? res.data.map((u) => u.unit_name || u.name || "").filter(Boolean)
          : [];
        setSecondaryUnits(list);
      })
      .catch(() => setSecondaryUnits([]));
  }, []);

  /* ---------------- Fetch next Purchase ID (for new purchase only) ---------------- */
  useEffect(() => {
    if (editId) return;
    const branchId = getActiveBranchId();
    if (branchId) {
      axios
        .get(`${API}/branches/peek-number`, {
          params: { type: "purchase", branch_id: branchId },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then((res) => setPurchaseNo(res.data.next_number || ""))
        .catch(() => setPurchaseNo(""));
    } else {
      axios
        .get(`${PURCHASE_API}/next-id`, { params: { date: purchaseDate } })
        .then((res) => setPurchaseNo(res.data.purchase_no || ""))
        .catch((err) => {
          toast.error(err.response?.data?.message || "Failed to generate purchase ID");
          setPurchaseNo("");
        });
    }
  }, [purchaseDate, editId]);

  /* ---------------- Load existing purchase when editing ---------------- */
  useEffect(() => {
    if (!editId) return;
    axios
      .get(`${PURCHASE_API}/${editId}`)
      .then((res) => {
        const p = res.data || {};
        setPurchaseNo(p.purchase_no || "");
        setPoNo(p.po_no || "");
        setVehicleNo(p.vehicle_no || "");
        setAdvanceAmount(p.paid_amount != null && p.paid_amount !== "" ? String(p.paid_amount) : "");
        setDueDate(p.due_date ? String(p.due_date).slice(0, 10) : "");
        setTransportCharges(p.transport_charges != null && p.transport_charges !== "" ? String(p.transport_charges) : "");
        if (p.additional_charges) {
          try {
            const parsed = typeof p.additional_charges === "string" ? JSON.parse(p.additional_charges) : p.additional_charges;
            if (Array.isArray(parsed)) {
              setAdditionalCharges(parsed);
            } else {
              setAdditionalCharges([]);
            }
          } catch (e) {
            setAdditionalCharges([]);
          }
        } else {
          setAdditionalCharges([]);
        }
        if (p.purchase_date) {
          const d = new Date(p.purchase_date);
          if (!Number.isNaN(d.getTime())) {
            setPurchaseDate(d.toISOString().slice(0, 10));
          }
        }
        setPaymentType(p.payment_type || "");
        setStatus(p.status || "Received");
        setBankAccountId(p.bank_account_id || "");
        if (p.vendor_id) {
          setSelectedVendor({
            id: p.vendor_id,
            company_name: p.company_name || p.vendor_name || "",
            mobile: p.mobile || "",
          });
          setVendorSearch(p.company_name || p.vendor_name || "");
          setVendorSearchLocked(true);
        }
        const loadedItems = Array.isArray(p.items)
          ? p.items.map((it) => {
              const row = {
                product_id: it.product_id || null,
                product_name: it.product_name || "",
                hsncode: it.hsncode || "",
                qty: it.qty || 1,
                price: it.price != null ? String(it.price) : "",
                margin: it.margin != null ? String(it.margin) : "0",
                selling_rate: it.selling_rate != null ? String(it.selling_rate) : "",
                primary_unit: it.primary_unit || "",
                discount: it.discount != null ? String(it.discount) : "",
                tax_group_id: it.tax_group_id != null ? String(it.tax_group_id) : "",
                total: it.total != null ? String(it.total) : "0",
              };
              // Calculate on the fly for UI if tax is selected
              const discountAmount = (Number(row.price || 0) * Number(row.qty || 1)) * (Number(row.discount || 0) / 100);
              const base = (Number(row.price || 0) * Number(row.qty || 1)) - discountAmount;
              let cgst = "0.00";
              let sgst = "0.00";
              if (row.tax_group_id) {
                const group = taxGroups.find((g) => String(g.id) === String(row.tax_group_id));
                if (group && Array.isArray(group.sub_taxes) && group.sub_taxes.length > 0) {
                  const rate = group.sub_taxes.reduce((sum, t) => sum + (Number(t.tax_rate) || 0), 0);
                  const taxAmount = base * (rate / 100);
                  cgst = (taxAmount / 2).toFixed(2);
                  sgst = (taxAmount / 2).toFixed(2);
                }
              }
              row.cgst = cgst;
              row.sgst = sgst;
              return row;
            })
          : [];
        setItems(loadedItems);
      })
      .catch((err) => {
        const msg =
          err.response?.data?.message || "Failed to load purchase for editing";
        toast.error(msg);
      });
  }, [editId]);

  /* ---------------- Vendor Search ---------------- */
  useEffect(() => {
    if (vendorSearch.trim() && !vendorSearchLocked) {
      fetchVendors();
    } else {
      setVendors([]);
      setShowVendorCard(false);
      setActiveVendorIndex(-1);
    }
  }, [vendorSearch, vendorSearchLocked]);

  const fetchVendors = async () => {
    try {
      const res = await axios.get(VENDOR_API, {
        params: { search: vendorSearch, all: "true" },
      });
      const data = res.data.data || [];
      setVendors(data);
      setShowVendorCard(data.length > 0);
      setActiveVendorIndex(data.length > 0 ? 0 : -1);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load vendors";
      toast.error(msg);
      setVendors([]);
    }
  };

  const handleSelectVendor = (vendor) => {
    setVendorSearch(vendor.company_name || vendor.vendor_name);
    setSelectedVendor(vendor);
    setShowVendorCard(false);
    setVendorSearchLocked(true);
    setActiveVendorIndex(-1);
    setVendors([]);
  };

  const handleVendorKeyDown = (e) => {
    if (!showVendorCard || !vendors.length) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActiveVendorIndex((prev) => {
        if (!vendors.length) return -1;
        if (e.key === "ArrowDown") {
          const next = prev < vendors.length - 1 ? prev + 1 : 0;
          return next;
        } else {
          const next = prev > 0 ? prev - 1 : vendors.length - 1;
          return next;
        }
      });
    } else if (e.key === "Enter") {
      if (activeVendorIndex >= 0 && activeVendorIndex < vendors.length) {
        e.preventDefault();
        handleSelectVendor(vendors[activeVendorIndex]);
      }
    }
  };

  /* ---------------- Vendor Form Submit ---------------- */
  const saveVendor = async () => {
    const { company_name, mobile } = vendorForm;
    if (!company_name?.trim()) return toast.error("Company name is required");
    if (!mobile?.trim()) return toast.error("Contact No is required");
    if (!/^[6-9]\d{9}$/.test(mobile)) return toast.error("Invalid Contact No (10 digits)");

    const companyNameTrimmed = company_name.trim();
    const mobileTrimmed = mobile.trim();
    const addressTrimmed = vendorForm.address?.trim() || "";
    const gstTrimmed = vendorForm.gst_no?.trim() || "";

    try {
      const res = await axios.post(VENDOR_API, {
        company_name: companyNameTrimmed,
        vendor_type: vendorForm.vendor_type || undefined,
        mobile: mobileTrimmed,
        email: vendorForm.email?.trim() || undefined,
        address: addressTrimmed || undefined,
        pincode: vendorForm.pincode?.trim() || undefined,
        status: vendorForm.status || "Active",
        gst_no: gstTrimmed || undefined,
        opening_balance: vendorForm.opening_balance ? Number(vendorForm.opening_balance) : 0,
        bank_name: vendorForm.bank_name?.trim() || undefined,
        account_number: vendorForm.account_number?.trim() || undefined,
        ifsc_code: vendorForm.ifsc_code?.trim() || undefined,
        bank_branch: vendorForm.bank_branch?.trim() || undefined,
        upi_id: vendorForm.upi_id?.trim() || undefined,
      });

      toast.success("Vendor added successfully");
      setVendorModalOpen(false);

      let createdId =
        res.data?.id ||
        res.data?.insertId ||
        res.data?.data?.id ||
        res.data?.data?.insertId;

      // Fallback: If ID is not returned directly, fetch the newly created vendor
      if (!createdId) {
        try {
          const fetchRes = await axios.get(VENDOR_API, {
            params: { search: companyNameTrimmed, limit: 1 },
          });
          const list = Array.isArray(fetchRes.data?.data)
            ? fetchRes.data.data
            : Array.isArray(fetchRes.data)
            ? fetchRes.data
            : [];
          const found = list.find(
            (v) =>
              (v.company_name || "").toLowerCase() === companyNameTrimmed.toLowerCase() ||
              v.mobile === mobileTrimmed,
          );
          if (found?.id) {
            createdId = found.id;
          }
        } catch (e) {
          console.warn("Could not query newly created vendor ID", e);
        }
      }

      const v = {
        id: createdId,
        company_name: companyNameTrimmed,
        vendor_name: companyNameTrimmed,
        mobile: mobileTrimmed,
        address: addressTrimmed,
        gst_no: gstTrimmed,
      };

      // Populate into vendor name field and selected vendor state
      setSelectedVendor(v);
      setVendorSearch(companyNameTrimmed);
      setVendorSearchLocked(true);
      setShowVendorCard(false);
      setActiveVendorIndex(-1);
      setVendors([]);

      // Reset vendor modal form
      setVendorForm({
        company_name: "",
        vendor_type: "",
        mobile: "",
        email: "",
        address: "",
        pincode: "",
        status: "Active",
        gst_no: "",
        opening_balance: "",
        bank_name: "",
        account_number: "",
        ifsc_code: "",
        bank_branch: "",
        upi_id: "",
      });
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to add vendor";
      toast.error(msg);
    }
  };

  /* ---------------- Product Search ---------------- */
  useEffect(() => {
    const delay = setTimeout(() => searchProduct(query), 300);
    return () => clearTimeout(delay);
  }, [query]);

  const searchProduct = async (text) => {
    try {
      console.log("Searching for product with query:", text);
      const res = await axios.get(`${PRODUCT_API}/search`, {
        params: { q: text },
      });
      console.log("Product search API response:", res.data);
      const data = Array.isArray(res.data) ? res.data : [];
      setResults(data);
      if (document.activeElement === productInputRef.current) {
        setShowProductCard(data.length > 0);
        setActiveProductIndex(data.length > 0 ? 0 : -1);
      }
    } catch (err) {
      console.error("Product search API error:", err.response?.data || err);
      const msg = err.response?.data?.message || "Failed to load products";
      toast.error(msg);
      setResults([]); // Clear results on error
    }
  };

  const handleSelectProduct = (product) => {
    setQuery("");
    setShowProductCard(false);
    const exists = items.find((i) => i.product_id === product.id); // Check against product_id in items
    if (exists) return;
    const hsncode =
      product.hsncode != null && product.hsncode !== ""
        ? String(product.hsncode)
        : "";
    const price =
      product.price != null && product.price !== ""
        ? String(product.price)
        : "";
    const margin = product.margin != null && product.margin !== "" ? String(product.margin) : "0";
    const selling_rate = product.selling_price != null && product.selling_price !== "" ? String(product.selling_price) : price;
    const primary_unit = product.primary_unit || product.unit || "";
    const discount = product.discount_percent != null && Number(product.discount_percent) !== 0 ? String(product.discount_percent) : "";

    // Explicitly set product_id from product.id
    const newItem = {
      product_id: product.id,
      product_name: product.product_name || "",
      hsncode,
      qty: 1,
      price,
      selling_rate,
      primary_unit,
      discount,
      tax_group_id: "",
      total: 0,
    };
    const { total, cgst, sgst } = recalcTotal(newItem);
    newItem.total = total;
    newItem.cgst = cgst;
    newItem.sgst = sgst;
    setItems([...items, newItem]);
    setActiveProductIndex(-1);
    
    // Focus the quantity field of the newly added row
    setTimeout(() => {
      const qtyInput = document.getElementById(`qty-input-${items.length}`);
      if (qtyInput) {
        qtyInput.focus();
        qtyInput.select(); // Select text for easy editing
      }
    }, 100);
  };

  const handleProductKeyDown = (e) => {
    if (!showProductCard || !results.length) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActiveProductIndex((prev) => {
        if (!results.length) return -1;
        if (e.key === "ArrowDown") {
          const next = prev < results.length - 1 ? prev + 1 : 0;
          return next;
        } else {
          const next = prev > 0 ? prev - 1 : results.length - 1;
          return next;
        }
      });
    } else if (e.key === "Enter") {
      // If a result is highlighted, select it
      if (activeProductIndex >= 0 && activeProductIndex < results.length) {
        e.preventDefault();
        handleSelectProduct(results[activeProductIndex]);
      } 
      // If no result is explicitly highlighted but results exist, select the first one
      else if (results.length > 0) {
        e.preventDefault();
        handleSelectProduct(results[0]);
      }
    }
  };

  /* ---------------- Product Add Form Submit ---------------- */
  const filteredCategories = categories.filter((c) =>
    (c.category_name || "").toLowerCase().includes(catSearch.toLowerCase()),
  );
  const filteredSubcategories = subcategories.filter((s) =>
    (s.subcategory_name || "").toLowerCase().includes(subSearch.toLowerCase()),
  );
  const filteredBrands = brands.filter((b) =>
    (b.brand_name || "").toLowerCase().includes(brandSearch.toLowerCase()),
  );
  const filteredPrimaryUnits = primaryUnits.filter((u) =>
    (u || "").toLowerCase().includes(primaryUnitSearch.toLowerCase()),
  );
  const filteredSecondaryUnits = secondaryUnits.filter((u) =>
    (u || "").toLowerCase().includes(secondaryUnitSearch.toLowerCase()),
  );



  const saveProduct = () => {
    if (!productForm.category_id) return toast.error("Select Category");
    if (!productForm.product_name?.trim())
      return toast.error("Enter Product Name");

    const payload = {
      category_id: productForm.category_id,
      subcategory_id: productForm.subcategory_id || null,
      brand_id: productForm.brand_id || null,
      product_name: productForm.product_name.trim(),
      unit: productForm.primary_unit || null,
      primary_unit: productForm.primary_unit || null,
      secondary_unit: productForm.secondary_unit || null,
      hsncode: productForm.hsncode?.trim() || null,
      price: productForm.price ? Number(productForm.price) : null,
      status: productForm.status,
    };

    axios
      .post(PRODUCT_API, payload)
      .then(() => {
        toast.success("Product added successfully");
        setProductModalOpen(false);
        setProductForm({
          category_id: "",
          subcategory_id: "",
          brand_id: "",
          product_name: "",
          primary_unit: "",
          secondary_unit: "",
          hsncode: "",
          price: "",
          status: "Active",
        });
        setCatSearch("");
        setSubSearch("");
        setBrandSearch("");
        setPrimaryUnitSearch("");
        setSecondaryUnitSearch("");
        if (query.trim()) searchProduct(query);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Failed to add product";
        toast.error(msg);
      });
  };

  /* ---------------- Table Logic (total = selling_rate * qty +/- tax) ---------------- */
  const recalcTotal = (row) => {
    const priceVal = Number(row.price || 0);
    const rateVal = Number(row.selling_rate || 0);
    const activePrice = rateVal > 0 ? rateVal : priceVal;
    
    const qty = Number(row.qty || 1) || 1;
    const discountPercent = Number(row.discount || 0);
    const discountAmount = (activePrice * qty) * (discountPercent / 100);
    const base = (activePrice * qty) - discountAmount;

    let cgst = "0.00";
    let sgst = "0.00";
    let total = base.toFixed(2);

    const rowTaxGroupId = row.tax_group_id;
    if (rowTaxGroupId && Array.isArray(taxGroups) && taxGroups.length > 0) {
      const group = taxGroups.find((g) => String(g.id) === String(rowTaxGroupId));
      if (
        group &&
        Array.isArray(group.sub_taxes) &&
        group.sub_taxes.length > 0
      ) {
        const rate = group.sub_taxes.reduce(
          (sum, t) => sum + (Number(t.tax_rate) || 0),
          0,
        );
        const taxAmount = base * (rate / 100);
        cgst = (taxAmount / 2).toFixed(2);
        sgst = (taxAmount / 2).toFixed(2);
        total = (base + taxAmount).toFixed(2);
      }
    }
    return { total, cgst, sgst };
  };

  const handleChange = (index, field, value) => {
    const data = [...items];
    data[index][field] = value;

    // If price changes, update selling rate. But we shouldn't zero out margin.
    if (field === "price") {
      // data[index].selling_rate = value;
      // We keep margin as is, and recalculate total
    }

    const { total, cgst, sgst } = recalcTotal(data[index]);
    data[index].total = total;
    data[index].cgst = cgst;
    data[index].sgst = sgst;
    setItems(data);
  };

  // When tax groups load, recompute totals for all rows
  useEffect(() => {
    setItems((prev) =>
      prev.map((row) => {
        const { total, cgst, sgst } = recalcTotal(row);
        return { ...row, total, cgst, sgst };
      }),
    );
  }, [taxGroups]);

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddAdditionalCharge = () => {
    const trimmedName = chargeName.trim();
    const numAmount = parseFloat(chargeAmount);

    if (!trimmedName) {
      toast.warning("Please enter a charge name (e.g. Delivery charge)");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.warning("Please enter a valid charge amount greater than 0");
      return;
    }

    setAdditionalCharges((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: trimmedName,
        amount: numAmount,
      },
    ]);
    setChargeName("");
    setChargeAmount("");
  };

  const handleRemoveAdditionalCharge = (indexToRemove) => {
    setAdditionalCharges((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const itemsSubtotal = items.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0,
  );
  const transportChargesNum = Number(transportCharges) || 0;
  const additionalChargesTotal = additionalCharges.reduce(
    (sum, c) => sum + (Number(c.amount) || 0),
    0,
  );
  const grandTotal = itemsSubtotal + transportChargesNum + additionalChargesTotal;

  const hasTaxSelected = items.some((item) => item.tax_group_id);

  const addRowManually = () => {
    setItems((prev) => [
      ...prev,
      {
        product_id: null,
        product_name: "",
        hsncode: "",
        qty: 1,
        price: "",
        selling_rate: "",
        primary_unit: "",
        discount: "",
        tax_group_id: "",
        total: 0,
        cgst: "0.00",
        sgst: "0.00",
      },
    ]);
    setTimeout(() => {
      const qtyInput = document.getElementById(`qty-input-${items.length}`);
      if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
      }
    }, 100);
  };

  /* ---------------- Submit Purchase (Create / Update) ---------------- */
  const submitPurchase = () => {
    if (!selectedVendor) return toast.error("Please select a vendor");
    if (!items.length) return toast.error("Add at least one product");

    const isBankPayment = paymentType !== "Cash" && paymentType !== "Credit" && paymentType !== "";
    if (isBankPayment && !bankAccountId) {
      return toast.error("Please select a bank account");
    }

    // Per-row validation
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowLabel = item.product_name?.trim()
        ? `Row ${i + 1} (${item.product_name.trim()})`
        : `Row ${i + 1}`;

      // Manual rows must have a product name
      if (item.product_id === null && (!item.product_name || !item.product_name.trim())) {
        return toast.error(`${rowLabel}: Product name is required.`);
      }

      // Price required and must be > 0
      const priceNum = Number(item.price);
      if (item.price === "" || item.price === null || item.price === undefined) {
        return toast.error(`${rowLabel}: Purchase price is required.`);
      }
      if (Number.isNaN(priceNum) || priceNum <= 0) {
        return toast.error(`${rowLabel}: Purchase price must be greater than 0.`);
      }
    }

    const isCredit = paymentType === "Credit";
    const advAmt = isCredit ? (Number(advanceAmount) || 0) : Math.round(grandTotal);

    const payload = {
      purchase_no: purchaseNo || null,
      po_no: poNo ? poNo.trim() : null,
      vendor_id: selectedVendor.id,
      branch_id: getActiveBranchId() || null,
      payment_type: paymentType || null,
      paid_amount: advAmt,
      advance_amount: advAmt,
      due_date: dueDate || null,
      purchase_date: purchaseDate || null,
      status,
      vehicle_no: vehicleNo ? vehicleNo.trim() : null,
      transport_charges: Number(transportCharges) || 0,
      additional_charges: additionalCharges.length > 0 ? additionalCharges : null,
      grandTotal: Math.round(grandTotal),
      bank_account_id: (isBankPayment || (isCredit && advAmt > 0 && bankAccountId)) ? bankAccountId : null,
      items: items.map((item) => ({
        product_id: item.product_id || null,
        product_name: item.product_name,
        hsncode: item.hsncode,
        qty: item.qty,
        price: item.price,
        selling_rate: item.selling_rate || 0,
        primary_unit: item.primary_unit || null,
        discount: item.discount || 0,
        tax_group_id: item.tax_group_id || null,
        total: item.total,
      })),
    };

    const req = editId
      ? axios.put(`${PURCHASE_TX_API}/update/${editId}`, payload)
      : axios.post(`${PURCHASE_TX_API}/create`, payload);

    req
      .then(() => {
        toast.success(
          editId
            ? "Purchase updated successfully"
            : "Purchase saved successfully",
        );
        setTimeout(() => navigate("/index/purchaseList"), 1500);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Failed to save purchase";
        toast.error(msg);
      });
  };

  return (
    <div ref={wrapperRef}>
      {/* -------- Purchase ID, PO Number, Purchase Date, Vehicle No -------- */}
      <Row className="mb-3 g-2">
        <Col md={3}>
          <Label className="fw-bold">Purchase ID</Label>
          <Input
            value={purchaseNo}
            onChange={(e) => setPurchaseNo(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Label className="fw-bold">PO Number</Label>
          <Input
            value={poNo}
            onChange={(e) => setPoNo(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Label className="fw-bold">Purchase Date</Label>
          <Input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Label className="fw-bold">Vehicle No</Label>
          <Input
            value={vehicleNo}
            onChange={(e) => setVehicleNo(e.target.value)}
          />
        </Col>
      </Row>

      {/* -------- Vendor Search + Add Vendor -------- */}
      <Col md={6} className="position-relative mb-3">
        <div className="p-3 bg-white rounded shadow-sm d-flex gap-2 align-items-center">
          <div className="position-relative flex-grow-1">
            <Input
              placeholder="Search Vendor"
              value={vendorSearch}
              onChange={(e) => {
                const value = e.target.value;
                setVendorSearchLocked(false);
                setSelectedVendor((prev) =>
                  prev && (prev.company_name === value || prev.vendor_name === value) ? prev : null,
                );
                setVendorSearch(value);
                setActiveVendorIndex(-1);
              }}
              onKeyDown={handleVendorKeyDown}
              autoComplete="off"
              innerRef={vendorInputRef}
            />
            {selectedVendor && (
              <span
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                  color: "#888",
                  fontWeight: "bold",
                  fontSize: "16px",
                  zIndex: 5,
                }}
                onClick={() => {
                  setSelectedVendor(null);
                  setVendorSearch("");
                  setVendorSearchLocked(false);
                  if (vendorInputRef.current) vendorInputRef.current.focus();
                }}
                title="Clear selected vendor"
              >
                ✕
              </span>
            )}
          </div>
          <Button color="primary" onClick={() => setVendorModalOpen(true)} className="text-nowrap">
            <FaPlus /> Add Vendor
          </Button>
        </div>

        {selectedVendor && (
          <div className="px-3 py-1 mt-1 text-muted small d-flex gap-3 flex-wrap">
            <span>
              <strong>Selected:</strong> {selectedVendor.company_name || selectedVendor.vendor_name}
            </span>
            {selectedVendor.mobile && <span><strong>Mobile:</strong> {selectedVendor.mobile}</span>}
            {selectedVendor.gst_no && <span><strong>GST:</strong> {selectedVendor.gst_no}</span>}
          </div>
        )}

        {showVendorCard && (
          <Card
            className="position-absolute w-100 shadow mt-1"
            style={{ zIndex: 10 }}
          >
            <CardBody className="p-2">
              {vendors.length ? (
                vendors.map((v, index) => (
                  <div
                    key={v.id}
                    className={`p-2 border-bottom vendor-item ${
                      index === activeVendorIndex ? "bg-primary text-white" : ""
                    }`}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSelectVendor(v)}
                  >
                    <strong>{v.company_name || v.vendor_name}</strong>
                    <br />
                    <small className="text-muted">{v.mobile}</small>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted p-2">
                  No Vendors Found
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </Col>

      {/* -------- Vendor Modal (Centered) -------- */}
      <Modal
        isOpen={vendorModalOpen}
        toggle={() => setVendorModalOpen(false)}
        size="xl"
        centered
        backdrop="static"
        style={{ maxWidth: "1080px", width: "95%" }}
      >
        <ModalHeader
          toggle={() => setVendorModalOpen(false)}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setVendorModalOpen(false)}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <span className="fw-bold fs-5" style={{ color: "#FFD700" }}>Add New Vendor</span>
        </ModalHeader>
        <ModalBody className="p-3">
          <Form onSubmit={(e) => { e.preventDefault(); saveVendor(); }}>
            <Row className="g-2">
              <Col lg={3} md={6}>
                <FormGroup className="mb-2">
                  <Label className="fw-semibold small mb-1">Company Name *</Label>
                  <Input
                    bsSize="sm"
                    name="company_name"
                    value={vendorForm.company_name}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, company_name: e.target.value }))
                    }
                    placeholder="Enter company name"
                    style={{ height: "34px", borderRadius: "6px" }}
                  />
                </FormGroup>
              </Col>
              <Col lg={3} md={6}>
                <FormGroup className="mb-2">
                  <Label className="fw-semibold small mb-1">Vendor Type</Label>
                  <Input
                    type="select"
                    bsSize="sm"
                    name="vendor_type"
                    value={vendorForm.vendor_type}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, vendor_type: e.target.value }))
                    }
                    style={{ height: "34px", borderRadius: "6px" }}
                  >
                    <option value="">-- Select --</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Wholesaler">Wholesaler</option>
                    <option value="Retailer">Retailer</option>
                  </Input>
                </FormGroup>
              </Col>
              <Col lg={3} md={6}>
                <FormGroup className="mb-2">
                  <Label className="fw-semibold small mb-1">Mobile *</Label>
                  <Input
                    bsSize="sm"
                    name="mobile"
                    value={vendorForm.mobile}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, mobile: e.target.value }))
                    }
                    placeholder="10-digit mobile"
                    maxLength={10}
                    style={{ height: "34px", borderRadius: "6px" }}
                  />
                </FormGroup>
              </Col>
              <Col lg={3} md={6}>
                <FormGroup className="mb-2">
                  <Label className="fw-semibold small mb-1">Email</Label>
                  <Input
                    bsSize="sm"
                    type="email"
                    name="email"
                    value={vendorForm.email}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="name@example.com"
                    style={{ height: "34px", borderRadius: "6px" }}
                  />
                </FormGroup>
              </Col>

              <Col lg={3} md={6}>
                <FormGroup className="mb-2">
                  <Label className="fw-semibold small mb-1">GST No</Label>
                  <Input
                    bsSize="sm"
                    name="gst_no"
                    value={vendorForm.gst_no}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, gst_no: e.target.value }))
                    }
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    style={{ height: "34px", borderRadius: "6px" }}
                  />
                </FormGroup>
              </Col>
              <Col lg={3} md={6}>
                <FormGroup className="mb-2">
                  <Label className="fw-semibold small mb-1">Pincode</Label>
                  <Input
                    bsSize="sm"
                    name="pincode"
                    value={vendorForm.pincode}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, pincode: e.target.value }))
                    }
                    placeholder="Pincode"
                    style={{ height: "34px", borderRadius: "6px" }}
                  />
                </FormGroup>
              </Col>
              <Col lg={3} md={6}>
                <FormGroup className="mb-2">
                  <Label className="fw-semibold small mb-1">Status</Label>
                  <Input
                    type="select"
                    bsSize="sm"
                    name="status"
                    value={vendorForm.status}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, status: e.target.value }))
                    }
                    style={{ height: "34px", borderRadius: "6px" }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Input>
                </FormGroup>
              </Col>
              <Col lg={3} md={6}>
                <FormGroup className="mb-2">
                  <Label className="fw-semibold small mb-1">Opening Balance</Label>
                  <Input
                    type="number"
                    bsSize="sm"
                    name="opening_balance"
                    value={vendorForm.opening_balance}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, opening_balance: e.target.value }))
                    }
                    placeholder="e.g. 1000"
                    style={{ height: "34px", borderRadius: "6px" }}
                  />
                </FormGroup>
              </Col>

              <Col lg={12}>
                <FormGroup className="mb-2">
                  <Label className="fw-semibold small mb-1">Address</Label>
                  <Input
                    type="text"
                    bsSize="sm"
                    name="address"
                    value={vendorForm.address}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, address: e.target.value }))
                    }
                    placeholder="Enter full address"
                    style={{ height: "34px", borderRadius: "6px" }}
                  />
                </FormGroup>
              </Col>
            </Row>

            <div className="d-flex align-items-center gap-2 mt-2 mb-2 pt-2 border-top">
              <span className="fw-bold text-dark small" style={{ letterSpacing: "0.02em" }}>
                Bank Details
              </span>
              <span className="text-muted" style={{ fontSize: "0.75rem" }}>(Optional)</span>
            </div>

            <Row className="g-2">
              <Col lg={3} md={4} sm={6}>
                <FormGroup className="mb-1">
                  <Label className="fw-semibold small mb-1">Bank Name</Label>
                  <Input
                    bsSize="sm"
                    name="bank_name"
                    value={vendorForm.bank_name}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, bank_name: e.target.value }))
                    }
                    placeholder="Enter Bank Name"
                    style={{ height: "34px", borderRadius: "6px" }}
                  />
                </FormGroup>
              </Col>
              <Col lg={3} md={4} sm={6}>
                <FormGroup className="mb-1">
                  <Label className="fw-semibold small mb-1">Account Number</Label>
                  <Input
                    bsSize="sm"
                    name="account_number"
                    value={vendorForm.account_number}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, account_number: e.target.value }))
                    }
                    placeholder="Enter Account Number"
                    style={{ height: "34px", borderRadius: "6px" }}
                  />
                </FormGroup>
              </Col>
              <Col lg={2} md={4} sm={6}>
                <FormGroup className="mb-1">
                  <Label className="fw-semibold small mb-1">IFSC Code</Label>
                  <Input
                    bsSize="sm"
                    name="ifsc_code"
                    value={vendorForm.ifsc_code}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, ifsc_code: e.target.value }))
                    }
                    placeholder="IFSC Code"
                    style={{ height: "34px", borderRadius: "6px" }}
                  />
                </FormGroup>
              </Col>
              <Col lg={2} md={6} sm={6}>
                <FormGroup className="mb-1">
                  <Label className="fw-semibold small mb-1">Bank Branch</Label>
                  <Input
                    bsSize="sm"
                    name="bank_branch"
                    value={vendorForm.bank_branch}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, bank_branch: e.target.value }))
                    }
                    placeholder="Branch Name"
                    style={{ height: "34px", borderRadius: "6px" }}
                  />
                </FormGroup>
              </Col>
              <Col lg={2} md={6} sm={6}>
                <FormGroup className="mb-1">
                  <Label className="fw-semibold small mb-1">UPI ID</Label>
                  <Input
                    bsSize="sm"
                    name="upi_id"
                    value={vendorForm.upi_id}
                    onChange={(e) =>
                      setVendorForm((f) => ({ ...f, upi_id: e.target.value }))
                    }
                    placeholder="UPI ID"
                    style={{ height: "34px", borderRadius: "6px" }}
                  />
                </FormGroup>
              </Col>
            </Row>

            <div className="text-end mt-3 pt-2 border-top d-flex justify-content-end gap-2">
              <Button
                color="secondary"
                size="sm"
                className="px-3"
                onClick={() => setVendorModalOpen(false)}
                style={{ height: "34px", borderRadius: "6px" }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                type="submit"
                className="px-4 fw-bold shadow-sm"
                style={{
                  height: "34px",
                  borderRadius: "6px",
                  background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                  color: "#08090D",
                  border: "none",
                  fontWeight: "800",
                }}
              >
                Save Vendor
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>

      {/* -------- Product Search + Add Product Button -------- */}
      <Card className="mb-3 shadow-sm border-0">
        <CardBody className="py-3" style={{ backgroundColor: "#f8f9fa" }}>
          <Row className="align-items-center g-2">
            <Col md={8} className="position-relative">
              <div className="d-flex align-items-center gap-2">
                <FaSearch className="text-muted" />
                <Input
                  placeholder="Search product to add..."
                  value={query}
                  onFocus={() => {
                    searchProduct(query);
                    setShowProductCard(true);
                  }}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveProductIndex(-1);
                  }}
                  onKeyDown={handleProductKeyDown}
                  autoComplete="off"
                  innerRef={productInputRef}
                />
              </div>
              {showProductCard && (
                <Card
                  className="shadow mt-1 position-absolute w-100"
                  style={{ zIndex: 10, maxHeight: 250, overflowY: "auto" }}
                >
                  <CardBody className="p-2">
                    {results.map((p, index) => (
                      <div
                        key={p.id}
                        className={`p-2 border-bottom ${index === activeProductIndex ? "bg-primary text-white" : ""}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSelectProduct(p)}
                      >
                        <div className="fw-semibold">{p.product_name}</div>
                        <small className="text-muted">
                          {p.category_name}
                          {p.subcategory_name && ` → ${p.subcategory_name}`}
                        </small>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              )}
            </Col>
            <Col md={2}>
              <Button
                color="warning"
                className="w-100"
                onClick={() =>
                  navigate("/index/productForm", {
                    state: {
                      returnTo: location.pathname,
                      returnState: location.state,
                    },
                  })
                }
              >
                <FaPlus className="me-1" /> Add Product
              </Button>
            </Col>
            <Col md={2}>
              <Button color="success" className="w-100" onClick={addRowManually}>
                <FaPlus className="me-1" /> Add Item
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      <div className="shadow-sm border-0">
        <div style={{ backgroundColor: "#f8f9fa" }}>
          {/* -------- Table: S.No, Product name, HSN Code, Qty, Price, Margin %, Selling Rate, Tax, Total, Action -------- */}
          <div className="table-responsive">
            <Table bordered hover size="sm" className="align-middle table-fixed text-nowrap">
              <thead className="bg-light text-center">
                <tr>
                  <th style={{ width: "60px" }}>S.No</th>
                  <th style={{ minWidth: "200px" }}>Product Name</th>
                  <th style={{ width: "100px" }}>HSN Code</th>
                  <th style={{ width: "100px" }}>Qty</th>
                  <th style={{ width: "100px" }}>Unit</th>
                  <th style={{ width: "120px" }}>MRP</th>
                  <th style={{ width: "100px" }}>Discount</th>
                  <th style={{ width: "100px" }}>Rate</th>
                  <th style={{ width: "120px" }}>Tax</th>
                  <th style={{ width: "90px" }}>CGST</th>
                  <th style={{ width: "90px" }}>SGST</th>
                  <th style={{ width: "120px" }}>Total</th>
                  <th style={{ width: "80px" }}>Action</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-muted">
                      Select product to add
                    </td>
                  </tr>
                ) : (
                  items.map((item, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        <Input
                          bsSize="sm"
                          value={item.product_name}
                          onChange={(e) =>
                            handleChange(i, "product_name", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <Input
                          bsSize="sm"
                          value={item.hsncode}
                          onChange={(e) =>
                            handleChange(i, "hsncode", e.target.value)
                          }
                          placeholder="HSN Code"
                        />
                      </td>
                      <td>
                        <Input
                          bsSize="sm"
                          type="number"
                          min={0}
                          step="any"
                          id={`qty-input-${i}`}
                          value={item.qty}
                          onChange={(e) =>
                            handleChange(i, "qty", e.target.value)
                          }
                          placeholder="1"
                        />
                      </td>
                      <td>
                        <Input
                          bsSize="sm"
                          value={item.primary_unit || ""}
                          onChange={(e) =>
                            handleChange(i, "primary_unit", e.target.value)
                          }
                          placeholder="Unit"
                        />
                      </td>
                      <td>
                        <Input
                          bsSize="sm"
                          id={`price-input-${i}`}
                          type="number"
                          step="any"
                          value={item.price}
                          onChange={(e) => {
                            handleChange(i, "price", e.target.value);
                          }}
                          placeholder="MRP"
                        />
                      </td>
                      <td>
                        <Input
                          bsSize="sm"
                          type="number"
                          step="any"
                          value={item.discount || ""}
                          onChange={(e) => {
                            handleChange(i, "discount", e.target.value);
                          }}
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <Input
                          bsSize="sm"
                          type="number"
                          step="any"
                          value={item.selling_rate || ""}
                          onChange={(e) => {
                            handleChange(i, "selling_rate", e.target.value);
                          }}
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <Input
                          bsSize="sm"
                          type="select"
                          value={item.tax_group_id || ""}
                          onChange={(e) => {
                            handleChange(i, "tax_group_id", e.target.value);
                          }}
                        >
                          <option value="">No Tax</option>
                          {taxGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </Input>
                      </td>
                       <td className="text-muted">₹{item.cgst || "0.00"}</td>
                      <td className="text-muted">₹{item.sgst || "0.00"}</td>
                      <td className="fw-bold">₹{item.total}</td>
                      <td>
                        <Button
                          size="sm"
                          color="danger"
                          outline
                          onClick={() => removeItem(i)}
                        >
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      {/* -------- Transport Charges & Additional Charges -------- */}
      <Card className="mt-3 border shadow-sm">
        <CardBody className="py-3">
          <Row className="g-3 align-items-start">
            {/* Transport Charges */}
            <Col lg={4} md={5}>
              <Label className="fw-bold small text-dark mb-1">
                Transport Charges (₹)
              </Label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={transportCharges}
                onChange={(e) => setTransportCharges(e.target.value)}
              />
            </Col>

            {/* Additional Charges (Multiple Add) */}
            <Col lg={8} md={7}>
              <Label className="fw-bold small text-dark mb-1">
                Additional Charges
              </Label>
              <div className="d-flex gap-2 align-items-center mb-2">
                <Input
                  style={{ flex: "2" }}
                  placeholder="(e.g. delivery charge)"
                  value={chargeName}
                  onChange={(e) => setChargeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddAdditionalCharge();
                    }
                  }}
                />
                <Input
                  style={{ flex: "1" }}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Amount (₹)"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddAdditionalCharge();
                    }
                  }}
                />
                <Button
                  color="primary"
                  type="button"
                  onClick={handleAddAdditionalCharge}
                  className="d-flex align-items-center gap-1 text-nowrap"
                >
                  <FaPlus size={12} /> Add
                </Button>
              </div>

              {/* Badges of added charges */}
              {additionalCharges.length > 0 ? (
                <div className="d-flex flex-wrap gap-2 pt-1">
                  {additionalCharges.map((chg, idx) => (
                    <Badge
                      key={chg.id || idx}
                      color="light"
                      className="text-dark border d-flex align-items-center gap-2 py-2 px-3"
                      style={{ fontSize: "0.85rem" }}
                    >
                      <span className="fw-semibold">{chg.name}:</span>
                      <span className="text-primary fw-bold">
                        ₹{Number(chg.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      <Button
                        close
                        aria-label="Remove"
                        onClick={() => handleRemoveAdditionalCharge(idx)}
                        style={{ fontSize: "0.7rem", marginLeft: "4px" }}
                      />
                    </Badge>
                  ))}
                  <div className="w-100 text-muted small mt-1">
                    Total Additional Charges:{" "}
                    <strong className="text-dark">₹{additionalChargesTotal.toFixed(2)}</strong>
                  </div>
                </div>
              ) : (
               <p></p>
              )}
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* -------- Payment Type + Submit -------- */}
      <Row className="mt-3 align-items-center g-3">
        <Col md={paymentType === "Credit" ? 2 : 3}>
          <Label className="fw-bold">Payment Type *</Label>
          <Input
            type="select"
            value={paymentType}
            onChange={(e) => {
              setPaymentType(e.target.value);
              if (e.target.value === "Cash" || e.target.value === "") {
                setBankAccountId("");
                setAdvanceAmount("");
              }
            }}
          >
            <option value="">-- Select --</option>
            {PAYMENT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Input>
        </Col>

        {paymentType === "Credit" && (
          <>
            <Col md={2}>
              <Label className="fw-bold">Advance Paid (₹)</Label>
              <Input
                type="number"
                min={0}
                max={Math.round(grandTotal)}
                step="0.01"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
              />
            </Col>
            {Number(advanceAmount) > 0 && (
              <Col md={2}>
                <Label className="fw-bold">Advance Account</Label>
                <Input
                  type="select"
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                >
                  <option value="">Cash</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.account_name} - ₹{parseFloat(b.current_balance || 0).toFixed(2)}
                    </option>
                  ))}
                </Input>
              </Col>
            )}
            <Col md={Number(advanceAmount) > 0 ? 2 : 3}>
              <Label className="fw-bold">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Col>
          </>
        )}

        {(paymentType !== "Cash" && paymentType !== "Credit" && paymentType !== "") && (
          <Col md={3}>
            <Label className="fw-bold">Bank Account *</Label>
            <Input
              type="select"
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
            >
              <option value="">-- Select Bank --</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.account_name} ({b.bank_name || "Bank"}) - ₹{parseFloat(b.current_balance || 0).toFixed(2)}
                </option>
              ))}
            </Input>
          </Col>
        )}

        <Col md={paymentType === "Credit" ? (Number(advanceAmount) > 0 ? 3 : 4) : ((paymentType !== "Cash" && paymentType !== "") ? 3 : 4)} className="text-end ms-auto">
          <div className="small text-muted mb-0">
            Items Subtotal: ₹{itemsSubtotal.toFixed(2)}
          </div>
          {(transportChargesNum > 0 || additionalChargesTotal > 0) && (
            <div className="small text-muted mb-0">
              Charges: +₹{(transportChargesNum + additionalChargesTotal).toFixed(2)}
            </div>
          )}
          <div className="small text-muted mb-1">
            Round Off: ₹{(Math.round(grandTotal) - grandTotal).toFixed(2)}
          </div>
          <div className="fw-bold fs-6 text-primary">
            Grand Total: ₹{Math.round(grandTotal)}
          </div>
          {paymentType === "Credit" && (
            <div className="small fw-bold text-danger mt-1">
              Due Amount: ₹{Math.max(0, Math.round(grandTotal) - (Number(advanceAmount) || 0)).toFixed(2)}
            </div>
          )}
        </Col>

        <Col md={2} className="text-end">
          <Button color="primary" size="lg" className="w-100" onClick={submitPurchase}>
            Save Purchase
          </Button>
        </Col>
      </Row>

      {/* -------- Add Product Modal (Centered, Horizontal) -------- */}
      <Modal
        isOpen={productModalOpen}
        toggle={() => setProductModalOpen(false)}
        size="lg"
        centered
      >
        <ModalHeader
          toggle={() => setProductModalOpen(false)}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setProductModalOpen(false)}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <span className="fw-bold" style={{ color: "#FFD700" }}>Add New Product</span>
        </ModalHeader>
        <ModalBody>
          <Row className="g-3">
            {/* Category */}
            <Col md={6} ref={catRef} className="position-relative">
              <Label className="small fw-bold">Category *</Label>
              <Input
                placeholder="Search category..."
                value={catSearch}
                onFocus={() => setShowCatList(true)}
                onChange={(e) => {
                  setCatSearch(e.target.value);
                  setShowCatList(true);
                  setCatActiveIndex(filteredCategories.length ? 0 : -1);
                }}
                onKeyDown={(e) => {
                  if (!showCatList || !filteredCategories.length) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCatActiveIndex((prev) =>
                      prev < filteredCategories.length - 1 ? prev + 1 : 0,
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCatActiveIndex((prev) =>
                      prev > 0 ? prev - 1 : filteredCategories.length - 1,
                    );
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const idx = catActiveIndex >= 0 ? catActiveIndex : 0;
                    const c = filteredCategories[idx];
                    if (c) {
                      setProductForm((p) => ({
                        ...p,
                        category_id: c.id,
                        subcategory_id: "",
                      }));
                      setCatSearch(c.category_name);
                      setSubSearch("");
                      setShowCatList(false);
                      setCatActiveIndex(-1);
                    }
                  } else if (e.key === "Escape") {
                    setShowCatList(false);
                    setCatActiveIndex(-1);
                  }
                }}
              />
              {showCatList && (
                <Card
                  className="mt-1 shadow position-absolute w-100"
                  style={{ zIndex: 20, maxHeight: 200, overflowY: "auto" }}
                >
                  <CardBody className="p-2">
                    {filteredCategories.length ? (
                      filteredCategories.map((c, index) => (
                        <div
                          key={c.id}
                          className={`p-2 border-bottom ${index === catActiveIndex ? "bg-primary text-white" : ""}`}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setProductForm((p) => ({
                              ...p,
                              category_id: c.id,
                              subcategory_id: "",
                            }));
                            setCatSearch(c.category_name);
                            setSubSearch("");
                            setShowCatList(false);
                            setCatActiveIndex(-1);
                          }}
                        >
                          {c.category_name}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted p-2">
                        No results
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}
            </Col>

            {/* Sub Category */}
            <Col md={6} ref={subRef} className="position-relative">
              <Label className="small fw-bold">Sub Category</Label>
              <Input
                placeholder="Search subcategory..."
                disabled={!productForm.category_id}
                value={subSearch}
                onFocus={() =>
                  productForm.category_id && setShowSubList(true)
                }
                onChange={(e) => {
                  setSubSearch(e.target.value);
                  setShowSubList(true);
                  setSubActiveIndex(filteredSubcategories.length ? 0 : -1);
                }}
                onKeyDown={(e) => {
                  if (!showSubList || !filteredSubcategories.length) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSubActiveIndex((prev) =>
                      prev < filteredSubcategories.length - 1 ? prev + 1 : 0,
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSubActiveIndex((prev) =>
                      prev > 0 ? prev - 1 : filteredSubcategories.length - 1,
                    );
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const idx = subActiveIndex >= 0 ? subActiveIndex : 0;
                    const s = filteredSubcategories[idx];
                    if (s) {
                      setProductForm((p) => ({
                        ...p,
                        subcategory_id: s.id,
                      }));
                      setSubSearch(s.subcategory_name);
                      setShowSubList(false);
                      setSubActiveIndex(-1);
                    }
                  } else if (e.key === "Escape") {
                    setShowSubList(false);
                    setSubActiveIndex(-1);
                  }
                }}
              />
              {showSubList && (
                <Card
                  className="mt-1 shadow position-absolute w-100"
                  style={{ zIndex: 20, maxHeight: 200, overflowY: "auto" }}
                >
                  <CardBody className="p-2">
                    {filteredSubcategories.length ? (
                      filteredSubcategories.map((s, index) => (
                        <div
                          key={s.id}
                          className={`p-2 border-bottom ${index === subActiveIndex ? "bg-primary text-white" : ""}`}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setProductForm((p) => ({
                              ...p,
                              subcategory_id: s.id,
                            }));
                            setSubSearch(s.subcategory_name);
                            setShowSubList(false);
                            setSubActiveIndex(-1);
                          }}
                        >
                          {s.subcategory_name}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted p-2">
                        No results
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}
            </Col>

            {/* Product Name */}
            <Col md={6}>
              <Label className="small fw-bold">Product Name *</Label>
              <Input
                value={productForm.product_name}
                onChange={(e) =>
                  setProductForm((p) => ({
                    ...p,
                    product_name: e.target.value,
                  }))
                }
                placeholder="Product Name"
              />
            </Col>

            {/* Brand */}
            <Col md={6} ref={brandRef} className="position-relative">
              <Label className="small fw-bold">Brand</Label>
              <Input
                placeholder="Search brand..."
                value={brandSearch}
                onFocus={() => setShowBrandList(true)}
                onChange={(e) => {
                  setBrandSearch(e.target.value);
                  setShowBrandList(true);
                  if (!e.target.value.trim())
                    setProductForm((p) => ({ ...p, brand_id: "" }));
                }}
              />
              {showBrandList && (
                <Card
                  className="mt-1 shadow position-absolute w-100"
                  style={{ zIndex: 20, maxHeight: 200, overflowY: "auto" }}
                >
                  <CardBody className="p-2">
                    {filteredBrands.length ? (
                      filteredBrands.map((b) => (
                        <div
                          key={b.id}
                          className="p-2 border-bottom"
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setProductForm((p) => ({
                              ...p,
                              brand_id: b.id,
                            }));
                            setBrandSearch(b.brand_name || "");
                            setShowBrandList(false);
                          }}
                        >
                          {b.brand_name}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted p-2">
                        No results
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}
            </Col>

            {/* Primary Unit */}
            <Col md={6} ref={primaryUnitRef} className="position-relative">
              <Label className="small fw-bold">Primary Unit</Label>
              <Input
                placeholder="Search primary unit..."
                value={primaryUnitSearch}
                onFocus={() => setShowPrimaryUnitList(true)}
                onChange={(e) => {
                  setPrimaryUnitSearch(e.target.value);
                  setShowPrimaryUnitList(true);
                }}
              />
              {showPrimaryUnitList && (
                <Card
                  className="mt-1 shadow position-absolute w-100"
                  style={{ zIndex: 20, maxHeight: 200, overflowY: "auto" }}
                >
                  <CardBody className="p-2">
                    {filteredPrimaryUnits.length ? (
                      filteredPrimaryUnits.map((u) => (
                        <div
                          key={u}
                          className="p-2 border-bottom"
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setProductForm((p) => ({
                              ...p,
                              primary_unit: u,
                            }));
                            setPrimaryUnitSearch(u);
                            setShowPrimaryUnitList(false);
                          }}
                        >
                          {u}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted p-2">
                        No results
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}
            </Col>

            {/* Secondary Unit */}
            <Col md={6} ref={secondaryUnitRef} className="position-relative">
              <Label className="small fw-bold">Secondary Unit</Label>
              <Input
                placeholder="Search secondary unit..."
                value={secondaryUnitSearch}
                onFocus={() => setShowSecondaryUnitList(true)}
                onChange={(e) => {
                  setSecondaryUnitSearch(e.target.value);
                  setShowSecondaryUnitList(true);
                }}
              />
              {showSecondaryUnitList && (
                <Card
                  className="mt-1 shadow position-absolute w-100"
                  style={{ zIndex: 20, maxHeight: 200, overflowY: "auto" }}
                >
                  <CardBody className="p-2">
                    {filteredSecondaryUnits.length ? (
                      filteredSecondaryUnits.map((u) => (
                        <div
                          key={u}
                          className="p-2 border-bottom"
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setProductForm((p) => ({
                              ...p,
                              secondary_unit: u,
                            }));
                            setSecondaryUnitSearch(u);
                            setShowSecondaryUnitList(false);
                          }}
                        >
                          {u}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted p-2">
                        No results
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}
            </Col>

            {/* HSN Code */}
            <Col md={6}>
              <Label className="small fw-bold">HSN Code</Label>
              <Input
                value={productForm.hsncode}
                onChange={(e) =>
                  setProductForm((p) => ({ ...p, hsncode: e.target.value }))
                }
                placeholder="HSN Code"
              />
            </Col>

            {/* Price */}
            <Col md={6}>
              <Label className="small fw-bold">MRP</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={productForm.price}
                onChange={(e) =>
                  setProductForm((p) => ({ ...p, price: e.target.value }))
                }
                placeholder="0.00"
              />
            </Col>

            {/* Margin */}
            <Col md={6}>
              <Label className="small fw-bold">Margin (%)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={productForm.margin}
                onChange={(e) =>
                  setProductForm((p) => ({ ...p, margin: e.target.value }))
                }
                placeholder="10"
              />
            </Col>

            {/* Selling Price */}
            <Col md={6}>
              <Label className="small fw-bold">Selling Price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={productForm.selling_price}
                onChange={(e) =>
                  setProductForm((p) => ({
                    ...p,
                    selling_price: e.target.value,
                  }))
                }
                placeholder="Auto from price + margin"
                className="bg-light"
              />
            </Col>

            {/* Status */}
            <Col md={6}>
              <Label className="small fw-bold">Status</Label>
              <Input
                type="select"
                value={productForm.status}
                onChange={(e) =>
                  setProductForm((p) => ({ ...p, status: e.target.value }))
                }
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Input>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button
            color="secondary"
            onClick={() => setProductModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={saveProduct}
            className="fw-bold px-3 shadow-sm"
            style={{
              background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
              color: "#08090D",
              fontWeight: "800",
              border: "none",
            }}
          >
            Save Product
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
