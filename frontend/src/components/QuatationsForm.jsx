import React, { useState, useEffect, useRef, useCallback } from "react";
import api, { getActiveBranchId } from "../utils/api";
import {
  Container,
  Row,
  Col,
  Button,
  Input,
  Label,
  Table,
  Tooltip,
  FormGroup,
  Card,
  CardBody,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
} from "reactstrap";
import { FaPlus, FaSearch, FaTrash } from "react-icons/fa";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import CustomerForm from "./CustomerForm";

import { apiUrl } from "../config/urls";

const API = apiUrl();
const CUSTOMER_API = apiUrl("customers");
const PRODUCT_SEARCH_API = apiUrl("products/search");
const PRODUCT_API = apiUrl("products");
const CATEGORY_API = apiUrl("categories");
const SUBCATEGORY_API = apiUrl("subcategories");
const QUOTATION_API = apiUrl("quotations");
const UNITS_API = apiUrl("units");
const TAX_GROUPS_API = apiUrl("tax-groups");

const FIXED_QUOTATION_TERMS =
  "1. 100% payment should be done after our proforma invoice submission before delivery. 2. All disputes are subjected to salem jurisdiction";

export default function QuatationsForm() { 
  const { id } = useParams();
  const navigate = useNavigate();

  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [showCustomerCard, setShowCustomerCard] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    contact: "",
    alternate: "",
    gst: "",
    address: "",
    pincode: "",
    city: "",
    state: "",
    country: "",
  });


  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [showProductSearchCard, setShowProductSearchCard] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false); 
  const [newProductForm, setNewProductForm] = useState({
    category_id: "",
    subcategory_id: "",
    brand_id: "",
    product_name: "",
    primary_unit: "",
    secondary_unit: "",
    price: "",
    margin: "10",
    selling_price: "",
    hsncode: "",
    status: "Active",
  });
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [primaryUnits, setPrimaryUnits] = useState([]);
  const [secondaryUnits, setSecondaryUnits] = useState([]);
  const [catSearch, setCatSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const [catActiveIndex, setCatActiveIndex] = useState(-1);
  const [subActiveIndex, setSubActiveIndex] = useState(-1);
  const [brandSearch, setBrandSearch] = useState("");
  const [primaryUnitSearch, setPrimaryUnitSearch] = useState("");
  const [secondaryUnitSearch, setSecondaryUnitSearch] = useState("");
  const [showCatList, setShowCatList] = useState(false);
  const [showSubList, setShowSubList] = useState(false);
  const [showBrandList, setShowBrandList] = useState(false);
  const [showPrimaryUnitList, setShowPrimaryUnitList] = useState(false);
  const [showSecondaryUnitList, setShowSecondaryUnitList] = useState(false);
  const catRef = useRef(null);
  const subRef = useRef(null);
  const brandRef = useRef(null);
  const primaryUnitRef = useRef(null);
  const secondaryUnitRef = useRef(null);


  const [products, setProducts] = useState([]);
  const [taxGroups, setTaxGroups] = useState([]);
  const [taxGroupId, setTaxGroupId] = useState("");

  const grandTotal = products.reduce((sum, p) => sum + Number(p.total || 0), 0);
  const totalQty = products.reduce((sum, p) => sum + (Number(p.qty) || 0), 0);

  const [quotationDetails, setQuotationDetails] = useState({
    quotation_date: new Date().toISOString().slice(0, 10),
    valid_till: "",
    reference: "",
    quotation_no: "",
    transport_charges: "",
    terms: FIXED_QUOTATION_TERMS,
    notes: "",
    show_price_totals: false, 
  });

  const transportChargesNum = Number(quotationDetails.transport_charges) || 0;
  const grandTotalWithTransport = grandTotal + transportChargesNum;

  const [tooltipOpen, setTooltipOpen] = useState(false);

  const wrapperRef = useRef(null);
  const customerSearchRef = useRef(null);
  const productSearchRef = useRef(null);
  const [customerActiveIndex, setCustomerActiveIndex] = useState(-1);
  const [productActiveIndex, setProductActiveIndex] = useState(-1);
  const customerCardSuppressedRef = useRef(false);
  const qtyRefs = useRef([]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        customerSearchRef.current &&
        !customerSearchRef.current.contains(event.target)
      ) {
        setShowCustomerCard(false);
      }
      if (
        productSearchRef.current &&
        !productSearchRef.current.contains(event.target)
      ) {
        setShowProductSearchCard(false);
      }
      if (catRef.current && !catRef.current.contains(event.target))
        setShowCatList(false);
      if (subRef.current && !subRef.current.contains(event.target))
        setShowSubList(false);
      if (brandRef.current && !brandRef.current.contains(event.target))
        setShowBrandList(false);
      if (
        primaryUnitRef.current &&
        !primaryUnitRef.current.contains(event.target)
      )
        setShowPrimaryUnitList(false);
      if (
        secondaryUnitRef.current &&
        !secondaryUnitRef.current.contains(event.target)
      )
        setShowSecondaryUnitList(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleCustomerModal = () => setCustomerModalOpen((prev) => !prev);
  const toggleProductModal = () =>
    setProductModalOpen((prev) => !prev);

  const recalcTotal = (item) => {
    const unitPrice = Number(item.selling_price || item.price || 0);
    const qty = Number(item.qty || 1) || 1;
    const other = Number(item.other || 0) || 0;
    const base = Math.max(0, unitPrice * qty - other);
    const itemTaxGroupId = item.tax_group_id;
    if (itemTaxGroupId && Array.isArray(taxGroups) && taxGroups.length > 0) {
      const group = taxGroups.find((g) => String(g.id) === String(itemTaxGroupId));
      if (
        group &&
        Array.isArray(group.sub_taxes) &&
        group.sub_taxes.length > 0
      ) {
        const rate = group.sub_taxes.reduce(
          (sum, t) => sum + (Number(t.tax_rate) || 0),
          0,
        );
        return (base + base * (rate / 100)).toFixed(2);
      }
    }
    return base.toFixed(2);
  };

  const addRow = () => {
    setProducts([
      ...products,
      {
        product_id: null,
        product_name: "",
        hsncode: "",
        qty: 1,
        primary_unit: "",
        secondary_unit: "",
        price: "",
        margin: "",
        selling_price: "",
        other: "",
        total: "0",
        tax_group_id: "",
      },
    ]);
  };

  const updateRow = (i, key, value) => {
    setProducts((prev) =>
      prev.map((item, idx) => {
        if (idx !== i) return item;
        const updated = { ...item, [key]: value };
        if (key === "price" || key === "margin") {
          const priceNum = Number(key === "price" ? value : updated.price);
          const marginNum = Number(key === "margin" ? value : updated.margin);
          if (priceNum > 0 && !Number.isNaN(marginNum)) {
            updated.selling_price = (priceNum * (1 + marginNum / 100)).toFixed(2);
          } else {
            updated.selling_price = "";
          }
        } else if (key === "selling_price") {
          const priceNum = Number(updated.price);
          const sellingNum = Number(value);
          if (priceNum > 0 && !Number.isNaN(sellingNum) && sellingNum > 0) {
            updated.margin = ((sellingNum / priceNum - 1) * 100).toFixed(2);
          }
        }
        updated.total = recalcTotal(updated);
        return updated;
      }),
    );
  };

  const deleteRow = (i) => {
    setProducts((prev) => prev.filter((_, idx) => idx !== i));
  };

  useEffect(() => {
    setProducts((prev) =>
      prev.map((it) => ({ ...it, total: recalcTotal(it) })),
    );
  }, [taxGroups]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (customerSearch.trim()) fetchCustomers();
      else {
        setCustomers([]);
        setShowCustomerCard(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [customerSearch]);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(CUSTOMER_API, {
        params: { search: customerSearch, all: "true" },
      });
      const list = res.data.data || [];
      setCustomers(list);
      setCustomerActiveIndex(list.length ? 0 : -1);
      if (!customerCardSuppressedRef.current) {
        setShowCustomerCard(!!list.length);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to search customers");
      setCustomers([]);
      setCustomerActiveIndex(-1);
      setShowCustomerCard(false);
    }
  };

  const handleCustomerSelect = (customer) => {
    customerCardSuppressedRef.current = true;
    setCustomers([]);
    setShowCustomerCard(false);
    setCustomerActiveIndex(-1);
    setCustomerSearch(customer.customer_name);
    setSelectedCustomer(customer);
  };

  const handleCustomerKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
    if (!showCustomerCard || !customers.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCustomerActiveIndex((prev) => {
        const next = prev < customers.length - 1 ? prev + 1 : 0;
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCustomerActiveIndex((prev) => {
        const next = prev > 0 ? prev - 1 : customers.length - 1;
        return next;
      });
    } else if (e.key === "Enter") {
      const index = customerActiveIndex >= 0 ? customerActiveIndex : 0;
      const customer = customers[index];
      if (customer) {
        handleCustomerSelect(customer);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowCustomerCard(false);
    }
  };

  const handleNewCustomerChange = (e) => {
    const { name, value } = e.target;
    setNewCustomerForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveNewCustomer = async () => {
    const { name, contact, pincode, gst } = newCustomerForm;

    if (!name?.trim()) return toast.error("Customer name is required");
    if (!contact?.trim()) return toast.error("Contact number is required");
    if (!/^\d{10}$/.test(contact))
      return toast.error("Invalid Contact Number (10 digits)");
    if (pincode && !/^\d{6}$/.test(pincode))
      return toast.error("Invalid Pincode");
    if (gst && !/^[A-Za-z0-9]{1,15}$/.test(gst))
      return toast.error("Invalid GST Number");

    const payload = {
      customer_name: name,
      contact_no: contact,
      alternate_no: newCustomerForm.alternate,
      gst_no: newCustomerForm.gst || null,
      pincode: newCustomerForm.pincode,
      address: newCustomerForm.address,
      city: newCustomerForm.city,
      country: newCustomerForm.country,
    };

    try {
      const res = await axios.post(CUSTOMER_API, payload);
      const newId = res.data?.id;

      toast.success("Customer added successfully");

      const createdCustomer = {
        id: newId,
        customer_name: name,
        contact_no: contact,
        alternate_no: newCustomerForm.alternate || "",
        address: newCustomerForm.address || "",
        city: newCustomerForm.city || "",
        pincode: newCustomerForm.pincode || "",
        gst_no: newCustomerForm.gst || null,
        country: newCustomerForm.country || "",
      };

      customerCardSuppressedRef.current = true;
      setCustomers([]);
      setShowCustomerCard(false);
      setCustomerActiveIndex(-1);
      setSelectedCustomer(createdCustomer);
      setCustomerSearch(createdCustomer.customer_name);

      setCustomerModalOpen(false);
      setNewCustomerForm({
        name: "",
        contact: "",
        alternate: "",
        gst: "",
        address: "",
        pincode: "",
        city: "",
        state: "",
        country: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add customer");
    }
  };


  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (productSearchQuery.trim()) searchProducts();
      else {
        setProductSearchResults([]);
        setShowProductSearchCard(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [productSearchQuery]);

  const searchProducts = async () => {
    try {
      const res = await axios.get(PRODUCT_SEARCH_API, {
        params: { q: productSearchQuery, limit: 10 },
      });
      const list = res.data || [];
      setProductSearchResults(list);
      setShowProductSearchCard(!!list.length);
      setProductActiveIndex(list.length ? 0 : -1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to search products");
      setProductSearchResults([]);
      setProductActiveIndex(-1);
    }
  };

  const handleProductSelect = async (product) => {
    setProductSearchQuery("");
    setShowProductSearchCard(false);
    const exists = products.find((item) => item.product_id === product.id);
    if (exists) return;

    const primaryUnit = product.primary_unit || product.unit || "pcs";
    const secondaryUnit = product.secondary_unit || "";
    const price = product.price != null ? String(product.price) : "";
    const margin = product.margin != null ? String(product.margin) : "";
    const sellingPrice = product.selling_price != null ? String(product.selling_price) : "";

    const newProduct = {
      product_id: product.id,
      product_name: product.product_name || "",
      hsncode: product.hsncode || "",
      qty: 1,
      primary_unit: primaryUnit,
      secondary_unit: secondaryUnit,
      price: price,
      margin: margin,
      selling_price: sellingPrice,
      other: "",
      total: "0",
      tax_group_id: "",
    };
    newProduct.total = recalcTotal(newProduct);
    setProducts((prev) => {
      const nextIndex = prev.length;
      const updated = [...prev, newProduct];

      setTimeout(() => {
        const el = qtyRefs.current[nextIndex];
        if (el && typeof el.focus === "function") {
          el.focus();
          if (typeof el.select === "function") {
            el.select();
          }
        }
      }, 0);
      return updated;
    });
    setProductActiveIndex(-1);
  };

  const handleProductKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
    if (!productSearchResults.length || !showProductSearchCard) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setProductActiveIndex((prev) => {
        const next = prev < productSearchResults.length - 1 ? prev + 1 : 0;
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setProductActiveIndex((prev) => {
        const next = prev > 0 ? prev - 1 : productSearchResults.length - 1;
        return next;
      });
    } else if (e.key === "Enter") {
      const index = productActiveIndex >= 0 ? productActiveIndex : 0;
      const product = productSearchResults[index];
      if (product) {
        handleProductSelect(product);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowProductSearchCard(false);
    }
  };


  useEffect(() => {
    const priceNum = Number(newProductForm.price);
    const marginNum = Number(newProductForm.margin) || 10;
    if (priceNum > 0 && !Number.isNaN(marginNum)) {
      const selling = priceNum * (1 + marginNum / 100);
      setNewProductForm((p) => ({ ...p, selling_price: selling.toFixed(2) }));
    } else if (newProductForm.price !== "" || newProductForm.margin !== "") {
      setNewProductForm((p) => ({ ...p, selling_price: "" }));
    }
  }, [newProductForm.price, newProductForm.margin]);

  const saveNewProduct = async () => {
    const {
      category_id,
      subcategory_id,
      brand_id,
      product_name,
      primary_unit,
      secondary_unit,
      price,
      margin,
      selling_price,
      hsncode,
      status,
    } = newProductForm;

    if (!category_id) return toast.error("Select Category");
    if (!subcategory_id) return toast.error("Select Sub Category");
    if (!product_name?.trim()) return toast.error("Enter Product Name");

    const payload = {
      category_id,
      subcategory_id,
      brand_id: brand_id || null,
      product_name: product_name.trim(),
      unit: primary_unit || null,
      primary_unit: primary_unit || null,
      secondary_unit: secondary_unit || null,
      hsncode: hsncode || null,
      min_order_quantity: null,
      image: null,
      price: price != null && price !== "" ? price : null,
      margin: margin != null && margin !== "" ? margin : null,
      selling_price:
        selling_price != null && selling_price !== "" ? selling_price : null,
      status: status || "Active",
    };

    try {
      await axios.post(PRODUCT_API, payload);
      toast.success("Product added successfully");
      setProductModalOpen(false);
      setNewProductForm({
        category_id: "",
        subcategory_id: "",
        brand_id: "",
        product_name: "",
        primary_unit: "",
        secondary_unit: "",
        price: "",
        margin: "10",
        selling_price: "",
        hsncode: "",
        status: "Active",
      });
  
      if (productSearchQuery.trim()) searchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add product");
    }
  };


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

  useEffect(() => {
    if (newProductForm.category_id) {
      axios
        .get(`${SUBCATEGORY_API}/${newProductForm.category_id}`)
        .then((res) =>
          setSubcategories(Array.isArray(res.data) ? res.data : []),
        )
        .catch((err) => {
          toast.error(
            err.response?.data?.message || "Failed to load subcategories",
          );
          setSubcategories([]);
        });
    } else {
      setSubcategories([]);
    }
  }, [newProductForm.category_id]);

  useEffect(() => {
    axios
      .get(`${API}/brands`)
      .then((res) => setBrands(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        const msg = err.response?.data?.message || "Failed to load brands";
        toast.error(msg);
        setBrands([]);
      });
  }, []);

  useEffect(() => {
    axios
      .get(`${API}/units`, { params: { type: "primary" } })
      .then((res) => {
        const list = Array.isArray(res.data)
          ? res.data.map((u) => u.unit_name || u.name || "").filter(Boolean)
          : [];
        setPrimaryUnits(list);
      })
      .catch(() => {
        setPrimaryUnits([]);
      });
  }, []);

  useEffect(() => {
    axios
      .get(UNITS_API, { params: { type: "secondary" } })
      .then((res) => setSecondaryUnits(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSecondaryUnits([]));
  }, []);

  useEffect(() => {
    axios
      .get(TAX_GROUPS_API, { params: { limit: 500 } })
      .then((res) =>
        setTaxGroups(Array.isArray(res.data?.data) ? res.data.data : []),
      )
      .catch(() => setTaxGroups([]));
  }, []);

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
    (u.unit_name || u.name || "")
      .toLowerCase()
      .includes(secondaryUnitSearch.toLowerCase()),
  );


  const loadNextQuotationNo = useCallback(async () => {
    if (id) return;
    const qDate = quotationDetails.quotation_date;
    if (!qDate) return;
    try {
      const branchId = getActiveBranchId();
      let nextNo = "";
      if (branchId) {
        const res = await api.get("/branches/peek-number", {
          params: { type: "quotation", branch_id: branchId },
        });
        nextNo = res.data?.next_number || "";
      } else {
        const res = await axios.get(`${QUOTATION_API}/next-number`, {
          params: { date: qDate },
        });
        nextNo = res.data?.quotation_no || "";
      }
      if (nextNo) {
        setQuotationDetails((prev) => ({ ...prev, quotation_no: nextNo }));
      }
    } catch (err) {
      console.error(
        "Failed to fetch next quotation no",
        err.response?.data || err.message,
      );
    }
  }, [id, quotationDetails.quotation_date]);

  useEffect(() => {
    loadNextQuotationNo();
  }, [loadNextQuotationNo]);

  useEffect(() => {
    const onBranchChanged = () => {
      if (!id) loadNextQuotationNo();
    };
    window.addEventListener("branchChanged", onBranchChanged);
    return () => window.removeEventListener("branchChanged", onBranchChanged);
  }, [id, loadNextQuotationNo]);


  useEffect(() => {
    if (!id) return;

    const loadQuotation = async () => {
      try {
        const res = await axios.get(`${QUOTATION_API}/${id}`);
        const q = res.data;

        setSelectedCustomer({
          id: q.customer_id,
          customer_name: q.customer_name,
          contact_no: q.contact_no,
          address: q.address,
          city: q.city,
          pincode: q.pincode,
        });
        customerCardSuppressedRef.current = true;
        setCustomerSearch(q.customer_name || "");

        const sliceDate = (val) => (val ? String(val).slice(0, 10) : "");
        setQuotationDetails({
          quotation_date:
            sliceDate(q.quotation_date) ||
            new Date().toISOString().slice(0, 10),
          valid_till: sliceDate(q.valid_till_date || q.valid_till),
          reference: q.reference || "",
          quotation_no: q.quotation_no || "",
          transport_charges:
            q.transport_charges != null && q.transport_charges !== ""
              ? String(q.transport_charges)
              : "",
          terms: q.terms_and_conditions || FIXED_QUOTATION_TERMS,
          notes: q.notes || "",
          show_price_totals: q.show_price_totals === 1,
        });

        if (q.tax_group_id) {
          setTaxGroupId(String(q.tax_group_id));
        } else if (q.gst_percent) {
          const match = taxGroups.find(g => {
            const tr = g.sub_taxes ? g.sub_taxes.reduce((sum, t) => sum + (Number(t.tax_rate) || 0), 0) : 0;
            return tr === Number(q.gst_percent);
          });
          if (match) setTaxGroupId(String(match.id));
        }

        const mappedItems = (q.items || []).map((item) => {
          const price =
            item.rate_1 != null
              ? String(item.rate_1)
              : item.base_price != null
                ? String(item.base_price)
                : "";
          const sellingPrice =
            item.rate_2 != null
              ? String(item.rate_2)
              : item.price != null
                ? String(item.price)
                : price;
          
          let marginVal = "";
          const priceNum = Number(price);
          const sellingNum = Number(sellingPrice);
          if (priceNum > 0 && sellingNum > 0) {
            marginVal = ((sellingNum / priceNum - 1) * 100).toFixed(2);
          } else if (item.product_margin != null) {
            marginVal = String(item.product_margin);
          }

          const disc =
            item.discount != null
              ? String(item.discount)
              : item.rate_3 != null
                ? String(item.rate_3)
                : item.other != null
                  ? String(item.other)
                  : "";
          const qty = Number(item.qty) || 0;
          const storedTotal = item.total != null ? Number(item.total) : null;
          const calcTotal = Math.max(
            0,
            Number(sellingPrice || 0) * qty - Number(disc || 0),
          );
          return {
            product_id: item.product_id,
            product_name: item.product_name || item.product_master_name || "",
            hsncode: item.hsncode || "",
            qty,
            primary_unit: item.primary_unit || "",
            secondary_unit: item.secondary_unit || "",
            price,
            margin: marginVal,
            selling_price: sellingPrice,
            other: disc,
            total: (storedTotal !== null ? storedTotal : calcTotal).toFixed(2),
            tax_group_id: (item.rate_4 != null && !isNaN(Number(item.rate_4)) && Number(item.rate_4) !== 0)
              ? String(Math.floor(Number(item.rate_4)))
              : "",
          };
        });
        setProducts(mappedItems);
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Failed to load quotation for editing",
        );
      }
    };

    loadQuotation();
  }, [id]);


  const saveQuotation = async () => {
    if (!selectedCustomer) return toast.error("Please select a customer");
    if (!products.length) return toast.error("Add at least one product");

    const firstItemWithTax = products.find(p => p.tax_group_id);
    const headerTaxGroupId = firstItemWithTax ? firstItemWithTax.tax_group_id : null;
    let calculatedGstPercent = 0;
    if (headerTaxGroupId && taxGroups) {
      const selectedGroup = taxGroups.find(g => String(g.id) === String(headerTaxGroupId));
      if (selectedGroup && Array.isArray(selectedGroup.sub_taxes)) {
        calculatedGstPercent = selectedGroup.sub_taxes.reduce((sum, t) => sum + (Number(t.tax_rate) || 0), 0);
      }
    }

    const quotationPayload = {
      customer_id: selectedCustomer.id,
      branch_id: getActiveBranchId() || null,
      tax_group_id: headerTaxGroupId || null,
      gst_percent: calculatedGstPercent,
      gst_type: "exclusive",
      ...quotationDetails,
      items: products.map((item) => ({
        product_id: item.product_id || null,
        product_name: item.product_name || "",
        hsncode: item.hsncode || null,
        qty: Number(item.qty) || 1,
        rate_1:
          item.price != null && item.price !== ""
            ? Number(item.price)
            : 0,
        rate_2:
          item.selling_price != null && item.selling_price !== "" ? Number(item.selling_price) : 0,
        rate_3:
          item.other != null && item.other !== "" ? Number(item.other) : null,
        rate_4:
          item.tax_group_id != null && item.tax_group_id !== ""
            ? Number(item.tax_group_id)
            : null,
        discount:
          item.other != null && item.other !== "" ? Number(item.other) : null,
        total: item.total != null && item.total !== "" ? Number(item.total) : 0,
        primary_unit: item.primary_unit || "",
        secondary_unit: item.secondary_unit || "",
      })),
    };

    try {
      if (id) {
        const res = await axios.put(`${QUOTATION_API}/${id}`, quotationPayload);
        toast.success(res.data.message || "Quotation updated successfully");
      } else {
        const res = await axios.post(QUOTATION_API, quotationPayload);
        toast.success(res.data.message || "Quotation saved successfully");
      }

      setCustomerSearch("");
      setSelectedCustomer(null);
      setProducts([]);
      setTaxGroupId("");
      setQuotationDetails({
        quotation_date: new Date().toISOString().slice(0, 10),
        valid_till: "",
        reference: "",
        quotation_no: "",
        transport_charges: "",
        terms: FIXED_QUOTATION_TERMS,
        notes: "",
        show_price_totals: false,
      });
      navigate("/index/quotationsList");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save quotation");
    }
  };

  return (
    <Container
      fluid
      className="p-4 min-vh-100"
      style={{ background: "linear-gradient(135deg,#f8fbff,#eef3f9)" }}
      ref={wrapperRef}
    >
      <Row className="g-4">
        {/* Header */}
        <Col md="12">
          <div className="bg-white p-3 rounded-4 shadow-sm border border-primary-subtle">
            <h5 className="text-primary fw-semibold mb-0">
              {id ? "Edit Quotation" : "New Quotation"}
            </h5>
            <small className="text-muted">
              Create & manage customer quotations
            </small>
          </div>
        </Col>

        {/* Customer */}
        <Col md="6" className="position-relative" ref={customerSearchRef}>
          <div className="bg-white p-4 rounded-4 shadow-sm border border-info-subtle">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="text-info fw-semibold mb-0">Customer Details</h6>
              <div>
                <Button
                  id="custSearch"
                  size="sm"
                  outline
                  color="info"
                  className="me-2"
                >
                  <FaSearch />
                </Button>
                <Tooltip
                  isOpen={tooltipOpen}
                  target="custSearch"
                  toggle={() => setTooltipOpen(!tooltipOpen)}
                >
                  Search customer
                </Tooltip>
                <Button size="sm" color="info" onClick={toggleCustomerModal}>
                  <FaPlus />
                </Button>
              </div>
            </div>
            <Label className="small">Select Customer</Label>
            <Input
              placeholder="Search customer"
              value={customerSearch}
              onChange={(e) => {
                customerCardSuppressedRef.current = false;
                setCustomerSearch(e.target.value);
              }}
              autoComplete="off"
              onKeyDown={handleCustomerKeyDown}
            />

            {showCustomerCard && (
              <Card
                className="position-absolute w-100 shadow mt-1"
                style={{ zIndex: 10 }}
              >
                <CardBody className="p-2">
                  {customers.length ? (
                    customers.map((c, index) => (
                      <div
                        key={c.id}
                        className={`p-2 border-bottom customer-item ${index === customerActiveIndex ? "bg-primary text-white" : ""}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => handleCustomerSelect(c)}
                      >
                        <strong>{c.customer_name}</strong>
                        <br />
                        <small className="text-muted">
                          {c.contact_no} | {c.city}
                        </small>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted p-2">
                      No Customers Found
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {selectedCustomer && (
              <div className="mt-3 p-2 border rounded bg-light">
                <p className="mb-1">
                  <strong>Name:</strong> {selectedCustomer.customer_name}
                </p>
                <p className="mb-1">
                  <strong>Contact:</strong> {selectedCustomer.contact_no}
                </p>
                <p className="mb-0">
                  <strong>Address:</strong> {selectedCustomer.address},{" "}
                  {selectedCustomer.city} - {selectedCustomer.pincode}
                </p>
              </div>
            )}
          </div>
        </Col>


        <Col md="6">
          <div className="bg-white p-4 rounded-4 shadow-sm border border-success-subtle">
            <h6 className="text-success fw-semibold">Quotation Details</h6>
            <Row className="g-3">
              <Col md="6">
                <Label className="small">Quotation Date</Label>
                <Input
                  type="date"
                  value={quotationDetails.quotation_date}
                  onChange={(e) =>
                    setQuotationDetails((prev) => ({
                      ...prev,
                      quotation_date: e.target.value,
                    }))
                  }
                />
              </Col>
              <Col md="6">
                <Label className="small">Valid Till</Label>
                <Input
                  type="date"
                  value={quotationDetails.valid_till}
                  onChange={(e) =>
                    setQuotationDetails((prev) => ({
                      ...prev,
                      valid_till: e.target.value,
                    }))
                  }
                />
              </Col>
              <Col md="12">
                <Label className="small">Reference</Label>
                <Input
                  value={quotationDetails.reference}
                  onChange={(e) =>
                    setQuotationDetails((prev) => ({
                      ...prev,
                      reference: e.target.value,
                    }))
                  }
                />
              </Col>
              <Col md="12">
                <Label className="small">Transport charges (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  value={quotationDetails.transport_charges}
                  onChange={(e) =>
                    setQuotationDetails((prev) => ({
                      ...prev,
                      transport_charges: e.target.value,
                    }))
                  }
                />
              </Col>
              <Col md="12">
                <Label className="small">Quotation No</Label>
                <Input
                  value={quotationDetails.quotation_no}
                  onChange={(e) =>
                    setQuotationDetails((prev) => ({
                      ...prev,
                      quotation_no: e.target.value,
                    }))
                  }
                />
              </Col>
            </Row>
          </div>
        </Col>


        <Col md="12">
          <div className="bg-white p-4 rounded-4 shadow-sm border border-warning-subtle">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="text-warning fw-semibold mb-0">
                Products & Services
              </h6>
              <Button
                size="sm"
                color="warning"
                onClick={toggleProductModal}
              >
                <FaPlus className="me-1" /> Add Product
              </Button>
            </div>

            <Row className="g-2 mb-3">
              <Col md="10" className="position-relative" ref={productSearchRef}>
                <Input
                  placeholder="Search product"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  autoComplete="off"
                  onKeyDown={handleProductKeyDown}
                />
                {showProductSearchCard && (
                  <Card
                    className="position-absolute w-100 shadow mt-1"
                    style={{ zIndex: 10, maxHeight: 200, overflowY: "auto" }}
                  >
                    <CardBody className="p-2">
                      {productSearchResults.length ? (
                        productSearchResults.map((p, index) => (
                          <div
                            key={p.id}
                            className={`p-2 border-bottom product-item ${index === productActiveIndex ? "bg-primary text-white" : ""}`}
                            style={{ cursor: "pointer" }}
                            onClick={() => handleProductSelect(p)}
                          >
                            <strong>{p.product_name}</strong>
                            <br />
                            <small className="text-muted">
                              {p.category_name}
                              {p.subcategory_name && ` → ${p.subcategory_name}`}
                            </small>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted p-2">
                          No Products Found
                        </div>
                      )}
                    </CardBody>
                  </Card>
                )}
              </Col>
              <Col md="2">
                <Button color="success" block onClick={addRow}>
                  Add Item
                </Button>
              </Col>
            </Row>

            <div className="table-responsive">
              <Table bordered hover size="sm" className="align-middle text-nowrap">
                <thead className="bg-light text-center">
                  <tr>
                    <th style={{ width: "60px" }}>S.No</th>
                    <th style={{ minWidth: "200px" }}>Product Name</th>
                    <th style={{ width: "100px" }}>HSN Code</th>
                    <th style={{ width: "80px" }}>Qty</th>
                    <th style={{ width: "110px" }}>Primary Unit</th>
                    <th style={{ width: "100px" }}>Price</th>
                    <th style={{ width: "100px" }}>Margin (%)</th>
                    <th style={{ width: "110px" }}>Selling Price</th>
                    <th style={{ width: "100px" }}>Discount</th>
                    <th style={{ width: "120px" }}>Tax</th>
                    <th style={{ width: "120px" }}>Sub Total</th>
                    <th style={{ width: "80px" }}>Action</th>
                  </tr>
                </thead>
                <tbody className="text-center">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="text-muted">
                        Select product to add
                      </td>
                    </tr>
                  ) : (
                    products.map((p, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>
                          <Input
                            bsSize="sm"
                            value={p.product_name}
                            onChange={(e) =>
                              updateRow(i, "product_name", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <Input
                            bsSize="sm"
                            value={p.hsncode || ""}
                            onChange={(e) =>
                              updateRow(i, "hsncode", e.target.value)
                            }
                            placeholder="HSN Code"
                          />
                        </td>
                        <td>
                          <Input
                            bsSize="sm"
                            type="number"
                            min="0.01"
                            step="any"
                            value={p.qty}
                            onChange={(e) =>
                              updateRow(i, "qty", e.target.value)
                            }
                            placeholder="1"
                            innerRef={(el) => {
                              qtyRefs.current[i] = el;
                            }}
                          />
                        </td>
                        <td>
                          <Input
                            bsSize="sm"
                            type="select"
                            value={p.primary_unit || ""}
                            onChange={(e) =>
                              updateRow(i, "primary_unit", e.target.value)
                            }
                          >
                            <option value="">-- Select --</option>
                            {primaryUnits.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </Input>
                        </td>
                        <td>
                          <Input
                            bsSize="sm"
                            type="number"
                            step="any"
                            value={p.price ?? ""}
                            onChange={(e) =>
                              updateRow(i, "price", e.target.value)
                            }
                            placeholder="Price"
                          />
                        </td>
                        <td>
                          <Input
                            bsSize="sm"
                            type="number"
                            step="any"
                            value={p.margin ?? ""}
                            onChange={(e) =>
                              updateRow(i, "margin", e.target.value)
                            }
                            placeholder="Margin (%)"
                          />
                        </td>
                        <td>
                          <Input
                            bsSize="sm"
                            type="number"
                            step="any"
                            value={p.selling_price ?? ""}
                            onChange={(e) =>
                              updateRow(i, "selling_price", e.target.value)
                            }
                            placeholder="Selling Price"
                          />
                        </td>
                        <td>
                          <Input
                            bsSize="sm"
                            type="number"
                            step="any"
                            min={0}
                            value={p.other ?? ""}
                            onChange={(e) =>
                              updateRow(i, "other", e.target.value)
                            }
                            placeholder="Discount"
                          />
                        </td>
                        <td>
                          <Input
                            bsSize="sm"
                            type="select"
                            value={p.tax_group_id || ""}
                            onChange={(e) =>
                              updateRow(i, "tax_group_id", e.target.value)
                            }
                          >
                            <option value="">No Tax</option>
                            {taxGroups.map((g) => {
                              const totalRate =
                                Array.isArray(g.sub_taxes) &&
                                g.sub_taxes.length > 0
                                  ? g.sub_taxes.reduce(
                                      (sum, t) =>
                                        sum + (Number(t.tax_rate) || 0),
                                      0,
                                    )
                                  : 0;
                              return (
                                <option key={g.id} value={g.id}>
                                  {g.name} ({totalRate.toFixed(2)}%)
                                </option>
                              );
                            })}
                          </Input>
                        </td>
                        <td className="fw-bold">₹{p.total}</td>
                        <td>
                          <Button
                            size="sm"
                            color="danger"
                            outline
                            onClick={() => deleteRow(i)}
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

            <Row className="mt-3">
              <Col md={6} className="d-flex align-items-center">
                <FormGroup check className="mb-0">
                  <Input
                    type="checkbox"
                    id="showPriceTotals"
                    checked={quotationDetails.show_price_totals}
                    onChange={(e) =>
                      setQuotationDetails((prev) => ({
                        ...prev,
                        show_price_totals: e.target.checked,
                      }))
                    }
                  />
                  <Label
                    check
                    htmlFor="showPriceTotals"
                    className="ms-1 small text-muted"
                  >
                    Show price totals on receipt
                  </Label>
                </FormGroup>
              </Col>
              <Col md={6} className="text-end">
                {transportChargesNum > 0 && (
                  <div className="small text-muted fw-normal mb-1">
                    Items: ₹{grandTotal.toFixed(2)} + Transport: ₹
                    {transportChargesNum.toFixed(2)}
                  </div>
                )}
                <div className="small text-muted mb-1">
                  Round Off: ₹{(Math.round(grandTotalWithTransport) - grandTotalWithTransport).toFixed(2)}
                </div>
                <div className="fw-bold fs-6 text-primary">
                  Grand Total: ₹{Math.round(grandTotalWithTransport)}
                </div>
              </Col>
            </Row>
          </div>
        </Col>


        <Col md="6">
          <div className="bg-white p-4 rounded-4 shadow-sm border border-secondary-subtle">
            <h6 className="fw-semibold text-secondary">Terms & Conditions</h6>
            <FormGroup>
              <Input
                type="textarea"
                rows="4"
                value={quotationDetails.terms}
                onChange={(e) =>
                  setQuotationDetails((prev) => ({
                    ...prev,
                    terms: e.target.value,
                  }))
                }
                className="bg-light text-secondary"
              />
            </FormGroup>
          </div>
        </Col>

        <Col md="6">
          <div className="bg-white p-4 rounded-4 shadow-sm border border-primary-subtle">
            <h6 className="fw-semibold text-primary">Notes</h6>
            <FormGroup>
              <Input
                type="textarea"
                rows="4"
                value={quotationDetails.notes}
                onChange={(e) =>
                  setQuotationDetails((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
              />
            </FormGroup>
          </div>
        </Col>


        <Col md="12" className="text-end">
          <Button color="secondary" className="me-2 px-4">
            Save Draft
          </Button>
          <Button color="primary" className="px-4" onClick={saveQuotation}>
            Save Quotation
          </Button>
        </Col>
      </Row>


      <Modal
        isOpen={customerModalOpen}
        toggle={() => setCustomerModalOpen((prev) => !prev)}
        size="lg"
        centered
      >
        <ModalHeader
          toggle={() => setCustomerModalOpen((prev) => !prev)}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setCustomerModalOpen(false)}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <span className="fw-bold" style={{ color: "#FFD700" }}>Add New Customer</span>
        </ModalHeader>
        <ModalBody className="p-4" style={{ backgroundColor: "#F8FAFC" }}>
          <Form>
            <CustomerForm
              form={newCustomerForm}
              onChange={handleNewCustomerChange}
            />

            <div className="d-flex justify-content-end gap-2 pt-3 mt-3 border-top" style={{ borderColor: "#E2E8F0" }}>
              <Button
                color="secondary"
                outline
                size="sm"
                onClick={() => setCustomerModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveNewCustomer}
                className="fw-bold px-3 shadow-sm"
                style={{
                  background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                  color: "#08090D",
                  fontWeight: "800",
                  border: "none",
                }}
              >
                Save Customer
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>


      <Modal
        isOpen={productModalOpen}
        toggle={toggleProductModal}
        size="lg"
        centered
      >
        <ModalHeader toggle={toggleProductModal}>Add New Product</ModalHeader>
        <ModalBody>
          <Row className="g-2">
            <Col md={6} ref={catRef} className="position-relative">
              <Label className="small">Category *</Label>
              <Input
                placeholder="Search category..."
                value={catSearch}
                onFocus={() => setShowCatList(true)}
                onChange={(e) => {
                  setCatSearch(e.target.value);
                  setShowCatList(true);
                  setCatActiveIndex(
                    filteredCategories.length ? 0 : -1,
                  );
                }}
                onKeyDown={(e) => {
                  if (!showCatList || !filteredCategories.length) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCatActiveIndex((prev) => {
                      const next =
                        prev < filteredCategories.length - 1 ? prev + 1 : 0;
                      return next;
                    });
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCatActiveIndex((prev) => {
                      const next =
                        prev > 0 ? prev - 1 : filteredCategories.length - 1;
                      return next;
                    });
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const index = catActiveIndex >= 0 ? catActiveIndex : 0;
                    const c = filteredCategories[index];
                    if (c) {
                      setNewProductForm((p) => ({
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
                    e.preventDefault();
                    setShowCatList(false);
                    setCatActiveIndex(-1);
                  }
                }}
              />
              {showCatList && (
                <Card
                  className="mt-1 shadow position-absolute w-100"
                  style={{ zIndex: 10, maxHeight: 200, overflowY: "auto" }}
                >
                  <CardBody className="p-2">
                    {filteredCategories.length ? (
                      filteredCategories.map((c, index) => (
                        <div
                          key={c.id}
                          className={`p-2 border-bottom ${index === catActiveIndex ? "bg-primary text-white" : ""}`}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setNewProductForm((p) => ({
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
            <Col md={6} ref={subRef} className="position-relative">
              <Label className="small">Sub Category *</Label>
              <Input
                placeholder="Search subcategory..."
                disabled={!newProductForm.category_id}
                value={subSearch}
                onFocus={() =>
                  newProductForm.category_id && setShowSubList(true)
                }
                onChange={(e) => {
                  setSubSearch(e.target.value);
                  setShowSubList(true);
                  setSubActiveIndex(
                    filteredSubcategories.length ? 0 : -1,
                  );
                }}
                onKeyDown={(e) => {
                  if (!showSubList || !filteredSubcategories.length) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSubActiveIndex((prev) => {
                      const next =
                        prev < filteredSubcategories.length - 1 ? prev + 1 : 0;
                      return next;
                    });
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSubActiveIndex((prev) => {
                      const next =
                        prev > 0 ? prev - 1 : filteredSubcategories.length - 1;
                      return next;
                    });
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const index = subActiveIndex >= 0 ? subActiveIndex : 0;
                    const s = filteredSubcategories[index];
                    if (s) {
                      setNewProductForm((p) => ({
                        ...p,
                        subcategory_id: s.id,
                      }));
                      setSubSearch(s.subcategory_name);
                      setShowSubList(false);
                      setSubActiveIndex(-1);
                    }
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setShowSubList(false);
                    setSubActiveIndex(-1);
                  }
                }}
              />
              {showSubList && (
                <Card
                  className="mt-1 shadow position-absolute w-100"
                  style={{ zIndex: 10, maxHeight: 200, overflowY: "auto" }}
                >
                  <CardBody className="p-2">
                    {filteredSubcategories.length ? (
                      filteredSubcategories.map((s, index) => (
                        <div
                          key={s.id}
                          className={`p-2 border-bottom ${index === subActiveIndex ? "bg-primary text-white" : ""}`}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setNewProductForm((p) => ({
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
            <Col md={12}>
              <Label className="small">Product Name *</Label>
              <Input
                value={newProductForm.product_name}
                onChange={(e) =>
                  setNewProductForm((p) => ({
                    ...p,
                    product_name: e.target.value,
                  }))
                }
                placeholder="Product Name"
              />
            </Col>

            {/* Brand - search like Category base */}
            <Col md={6} ref={brandRef} className="position-relative">
              <Label className="small">Brand</Label>
              <Input
                placeholder="Search brand..."
                value={brandSearch}
                onFocus={() => setShowBrandList(true)}
                onChange={(e) => {
                  setBrandSearch(e.target.value);
                  setShowBrandList(true);
                }}
              />
              {showBrandList && (
                <Card
                  className="mt-1 shadow position-absolute w-100"
                  style={{ zIndex: 10, maxHeight: 200, overflowY: "auto" }}
                >
                  <CardBody className="p-2">
                    {filteredBrands.length ? (
                      filteredBrands.map((b) => (
                        <div
                          key={b.id}
                          className="p-2 border-bottom"
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setNewProductForm((p) => ({
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

            <Col md={4}>
              <Label className="small">Price</Label>
              <Input
                type="number"
                step="0.01"
                value={newProductForm.price}
                onChange={(e) =>
                  setNewProductForm((p) => ({ ...p, price: e.target.value }))
                }
                placeholder="0.00"
              />
            </Col>
            <Col md={4}>
              <Label className="small">Margin (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={newProductForm.margin}
                onChange={(e) =>
                  setNewProductForm((p) => ({ ...p, margin: e.target.value }))
                }
                placeholder="10"
              />
            </Col>
            <Col md={4}>
              <Label className="small">Selling Price</Label>
              <Input
                type="number"
                step="0.01"
                value={newProductForm.selling_price}
                onChange={(e) =>
                  setNewProductForm((p) => ({
                    ...p,
                    selling_price: e.target.value,
                  }))
                }
                placeholder="Auto from price + margin"
              />
            </Col>

            <Col md={6}>
              <Label className="small">HSN Code</Label>
              <Input
                value={newProductForm.hsncode}
                onChange={(e) =>
                  setNewProductForm((p) => ({ ...p, hsncode: e.target.value }))
                }
                placeholder="HSN Code"
              />
            </Col>
            <Col md={6}>
              <Label className="small">Primary Unit</Label>
              <Input
                placeholder="Search primary unit..."
                value={primaryUnitSearch}
                onFocus={() => setShowPrimaryUnitList(true)}
                onChange={(e) => {
                  const val = e.target.value;
                  setPrimaryUnitSearch(val);
                  setShowPrimaryUnitList(true);
                }}
              />
              {showPrimaryUnitList && (
                <Card
                  className="mt-1 shadow position-absolute w-100"
                  style={{ zIndex: 10, maxHeight: 200, overflowY: "auto" }}
                >
                  <CardBody className="p-2">
                    {filteredPrimaryUnits.length ? (
                      filteredPrimaryUnits.map((u) => (
                        <div
                          key={u}
                          className="p-2 border-bottom"
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setNewProductForm((p) => ({
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

            <Col md={6}>
              <Label className="small">Secondary Unit</Label>
              <Input
                placeholder="Search secondary unit..."
                value={secondaryUnitSearch}
                onFocus={() => setShowSecondaryUnitList(true)}
                onChange={(e) => {
                  const val = e.target.value;
                  setSecondaryUnitSearch(val);
                  setShowSecondaryUnitList(true);
                }}
              />
              {showSecondaryUnitList && (
                <Card
                  className="mt-1 shadow position-absolute w-100"
                  style={{ zIndex: 10, maxHeight: 200, overflowY: "auto" }}
                >
                  <CardBody className="p-2">
                    {filteredSecondaryUnits.length ? (
                      filteredSecondaryUnits.map((u) => (
                        <div
                          key={u.id}
                          className="p-2 border-bottom"
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            const name = u.unit_name || u.name || "";
                            setNewProductForm((p) => ({
                              ...p,
                              secondary_unit: name,
                            }));
                            setSecondaryUnitSearch(name);
                            setShowSecondaryUnitList(false);
                          }}
                        >
                          {u.unit_name || u.name || ""}
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

            <Col md={12}>
              <Label className="small">Status</Label>
              <Input
                type="select"
                value={newProductForm.status}
                onChange={(e) =>
                  setNewProductForm((p) => ({ ...p, status: e.target.value }))
                }
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Input>
            </Col>
            <Col md={12}>
              <Button color="primary" block onClick={saveNewProduct}>
                Save Product
              </Button>
            </Col>
          </Row>
        </ModalBody>
      </Modal>
    </Container>
  );
}
