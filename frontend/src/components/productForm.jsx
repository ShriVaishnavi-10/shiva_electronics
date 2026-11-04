import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  CardBody,
  CardTitle,
  Button,
  Form,
  Input,
  Row,
  Col,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Badge,
} from "reactstrap";
import { MdSave, MdCancel, MdAdd } from "react-icons/md";
import { FaBoxes, FaGift, FaPlus, FaTag, FaBarcode, FaMobileAlt } from "react-icons/fa";
import { toast } from "react-toastify";

import { apiUrl } from "../config/urls";

const API = apiUrl();

const detectCategoryType = (name) => {
  if (!name) return "";
  const s = String(name).toLowerCase().trim();
  if (
    s.includes("furnitur") ||
    s.includes("sofa") ||
    s.includes("chair") ||
    s.includes("table") ||
    s.includes("bed") ||
    s.includes("cot") ||
    s.includes("desk") ||
    s.includes("wardrobe") ||
    s.includes("cupboard") ||
    s.includes("dressing")
  ) {
    return "furniture";
  }
  if (
    s.includes("appliance") ||
    s.includes("fridge") ||
    s.includes("refrigerator") ||
    s.includes("wash") ||
    s.includes("ac") ||
    s.includes("air conditioner") ||
    s.includes("cooler") ||
    s.includes("heater") ||
    s.includes("tv") ||
    s.includes("television") ||
    s.includes("microwave") ||
    s.includes("oven") ||
    s.includes("fan") ||
    s.includes("chimney")
  ) {
    return "home_appliances";
  }
  if (
    s.includes("mobile") ||
    s.includes("phone") ||
    s.includes("smartphone") ||
    s.includes("cell") ||
    s.includes("iphone") ||
    s.includes("android") ||
    s.includes("tablet")
  ) {
    return "mobiles";
  }
  return "";
};

export default function ProductForm({ onCancel }) {
  const { id } = useParams();
  const navigate = useNavigate();

  /* ================= STATES ================= */

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [primaryUnits, setPrimaryUnits] = useState([]);


  const [product, setProduct] = useState({
    category_id: "",
    subcategory_id: "",
    brand_id: "",
    product_name: "",
    product_code: "",
    primary_unit: "",
    quantity: "",
    hsncode: "",
    min_order_quantity: "",
    price: "",
    images: "",
    status: "Active",
    is_insulation_subfield: false,
    discount_percent: "",
    barcode: "",
    product_type: "",
  });

  const [specifications, setSpecifications] = useState({});

  const [combos, setCombos] = useState([]);
  const [freebies, setFreebies] = useState([]);
  const [comboInput, setComboInput] = useState("");
  const [freebieInput, setFreebieInput] = useState("");

  const [serialUnits, setSerialUnits] = useState([]);
  const [trackSerials, setTrackSerials] = useState(false);
  const [bulkSerialText, setBulkSerialText] = useState("");
  const [showBulkSerialModal, setShowBulkSerialModal] = useState(false);

  const handleAddCombo = (item) => {
    const text = (typeof item === "string" ? item : comboInput).trim();
    if (!text) return;
    if (!combos.includes(text)) {
      setCombos((prev) => [...prev, text]);
    }
    setComboInput("");
  };

  const handleRemoveCombo = (idx) => {
    setCombos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddFreebie = (item) => {
    const text = (typeof item === "string" ? item : freebieInput).trim();
    if (!text) return;
    if (!freebies.includes(text)) {
      setFreebies((prev) => [...prev, text]);
    }
    setFreebieInput("");
  };

  const handleRemoveFreebie = (idx) => {
    setFreebies((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSerialUnitChange = (index, field, value) => {
    setSerialUnits((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          [field]: value,
        };
      }
      return updated;
    });
  };

  const handleApplyBulkSerials = () => {
    if (!bulkSerialText.trim()) {
      setShowBulkSerialModal(false);
      return;
    }
    const lines = bulkSerialText.split("\n").map((l) => l.trim()).filter(Boolean);
    setSerialUnits((prev) => {
      const updated = [...prev];
      lines.forEach((line, idx) => {
        const parts = line.split(/[,\t;|]+/).map((p) => p.trim()).filter(Boolean);
        const imei1 = parts[0] || "";
        const imei2 = parts[1] || "";
        const serial = parts[2] || "";
        if (idx < updated.length) {
          updated[idx] = {
            ...updated[idx],
            imei_1: imei1 || updated[idx].imei_1 || "",
            imei_2: imei2 || updated[idx].imei_2 || "",
            serial_number: serial || updated[idx].serial_number || "",
            status: "AVAILABLE",
          };
        } else {
          updated.push({
            imei_1: imei1,
            imei_2: imei2,
            serial_number: serial,
            status: "AVAILABLE",
          });
        }
      });
      return updated;
    });
    if (lines.length > (parseInt(product.quantity, 10) || 0)) {
      setProduct((p) => ({ ...p, quantity: lines.length }));
    }
    setShowBulkSerialModal(false);
    setBulkSerialText("");
    toast.success(`Imported ${lines.length} unit serial records`);
  };

  useEffect(() => {
    if (trackSerials || product.product_type === "mobiles") {
      const qty = Math.max(0, parseInt(product.quantity, 10) || 0);
      setSerialUnits((prev) => {
        if (prev.length === qty) return prev;
        const updated = [...prev];
        if (qty > updated.length) {
          for (let i = updated.length; i < qty; i++) {
            updated.push({ imei_1: "", imei_2: "", serial_number: "", status: "AVAILABLE" });
          }
        } else if (qty < updated.length) {
          updated.splice(qty);
        }
        return updated;
      });
    }
  }, [product.quantity, trackSerials, product.product_type]);

  const [selectedImageFiles, setSelectedImageFiles] = useState([]);

  /* SEARCH */
  const [catSearch, setCatSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [primaryUnitSearch, setPrimaryUnitSearch] = useState("");

  const [showCatList, setShowCatList] = useState(false);
  const [showSubList, setShowSubList] = useState(false);
  const [showBrandList, setShowBrandList] = useState(false);
  const [showPrimaryUnitList, setShowPrimaryUnitList] = useState(false);


  /* MODALS */
  const [catModal, setCatModal] = useState(false);
  const [subModal, setSubModal] = useState(false);
  const [brandModal, setBrandModal] = useState(false);
  const [unitModalFor, setUnitModalFor] = useState(""); // "primary" | ""
  const [newCategory, setNewCategory] = useState("");
  const [newSubCategory, setNewSubCategory] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newUnit, setNewUnit] = useState("");

  /* REFS */
  const catRef = useRef(null);
  const subRef = useRef(null);
  const brandRef = useRef(null);
  const primaryUnitRef = useRef(null);

  /* ================= EFFECTS ================= */

  // Load categories on component mount
  useEffect(() => {
    axios
      .get(`${API}/categories`)
      .then((res) => setCategories(res.data))
      .catch(() => toast.error("Failed to load categories"));
  }, []);

  // Load brands on component mount
  useEffect(() => {
    axios
      .get(`${API}/brands`)
      .then((res) => setBrands(res.data || []))
      .catch(() => toast.error("Failed to load brands"));
  }, []);

  // Load primary units on component mount
  useEffect(() => {
    axios
      .get(`${API}/units`)
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

  // Load product data for editing if ID is present
  useEffect(() => {
    if (id) {
      axios
        .get(`${API}/products/${id}`)
        .then((res) => {
          const productData = res.data;
          if (productData) {
            let loadedSpecs = {};
            if (productData.specifications) {
              if (typeof productData.specifications === "string") {
                try {
                  loadedSpecs = JSON.parse(productData.specifications);
                } catch (e) {
                  loadedSpecs = {};
                }
              } else if (typeof productData.specifications === "object") {
                loadedSpecs = productData.specifications;
              }
            }

            const detectedType =
              productData.product_type ||
              detectCategoryType(productData.category_name) ||
              "";

            setProduct({
              category_id: productData.category_id || "",
              subcategory_id: productData.subcategory_id || "",
              brand_id: productData.brand_id || "",
              product_name: productData.product_name || "",
              product_code: productData.product_code || "",
              primary_unit:
                productData.primary_unit ||
                productData.unit ||
                productData.thickness ||
                "",
              quantity: productData.quantity ?? "",
              hsncode: productData.hsncode || "",
              min_order_quantity: productData.min_order_quantity ?? "",
              price: productData.price ?? "",
              barcode: productData.barcode || "",
              images: productData.image ?? productData.images ?? "",
              status: productData.status || "Active",
              is_insulation_subfield: !!productData.is_insulation_subfield,
              discount_percent: productData.discount_percent ?? "",
              product_type: detectedType,
            });

            setSpecifications(loadedSpecs || {});

            let loadedCombos = [];
            if (productData.combos) {
              if (Array.isArray(productData.combos)) loadedCombos = productData.combos;
              else if (typeof productData.combos === "string") {
                try {
                  loadedCombos = JSON.parse(productData.combos);
                } catch (_) {}
              }
            }
            setCombos(Array.isArray(loadedCombos) ? loadedCombos : []);

            let loadedFreebies = [];
            if (productData.freebies) {
              if (Array.isArray(productData.freebies)) loadedFreebies = productData.freebies;
              else if (typeof productData.freebies === "string") {
                try {
                  loadedFreebies = JSON.parse(productData.freebies);
                } catch (_) {}
              }
            }
            setFreebies(Array.isArray(loadedFreebies) ? loadedFreebies : []);

            let loadedSerials = [];
            if (productData.serial_units) {
              if (Array.isArray(productData.serial_units)) loadedSerials = productData.serial_units;
              else if (typeof productData.serial_units === "string") {
                try {
                  loadedSerials = JSON.parse(productData.serial_units);
                } catch (_) {}
              }
            }
            if (Array.isArray(loadedSerials) && loadedSerials.length > 0) {
              setSerialUnits(loadedSerials);
              setTrackSerials(true);
            } else if (detectedType === "mobiles") {
              setTrackSerials(true);
            }

            setPrimaryUnitSearch(
              productData.primary_unit ||
                productData.unit ||
                productData.thickness ||
                "",
            );

            if (productData.category_name)
              setCatSearch(productData.category_name);
            if (productData.subcategory_name)
              setSubSearch(productData.subcategory_name);
            if (productData.brand_name) setBrandSearch(productData.brand_name);
          }
        })
        .catch(() => toast.error("Failed to load product for editing"));
    }
  }, [id]);

  // Load subcategories when category_id changes
  // This useEffect will run when product.category_id is set either initially or by user selection.
  useEffect(() => {
    if (product.category_id) {
      axios
        .get(`${API}/subcategories/${product.category_id}`)
        .then((res) => {
          setSubcategories(res.data);
          // If editing and subcategory_id is already set, ensure subSearch is updated
          if (id && product.subcategory_id) {
            const currentSubcategory = res.data.find(
              (sub) => sub.id === product.subcategory_id,
            );
            if (currentSubcategory) {
              setSubSearch(currentSubcategory.subcategory_name);
            }
          }
        })
        .catch(() => setSubcategories([]));
    } else {
      setSubcategories([]);
    }
  }, [id, product.category_id]); // Added 'id' to dependency array for re-evaluation on edit load



  // Close category/subcategory/brand lists when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (catRef.current && !catRef.current.contains(e.target))
        setShowCatList(false);
      if (subRef.current && !subRef.current.contains(e.target))
        setShowSubList(false);
      if (brandRef.current && !brandRef.current.contains(e.target))
        setShowBrandList(false);
      if (primaryUnitRef.current && !primaryUnitRef.current.contains(e.target))
        setShowPrimaryUnitList(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ================= HANDLERS ================= */

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct((p) => ({ ...p, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setProduct((p) => ({ ...p, [name]: checked }));
  };

  const handleSpecChange = (field, value) => {
    setSpecifications((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveProduct = () => {
    if (!product.category_id) return toast.error("Select Category");
    if (!product.product_name.trim()) return toast.error("Enter Product Name");

    const brandIdVal =
      product.brand_id != null && product.brand_id !== ""
        ? Number(product.brand_id)
        : null;
    const primaryUnitVal = product.primary_unit || null;

    const productData = {
      category_id: product.category_id,
      subcategory_id: product.subcategory_id || null,
      brand_id: brandIdVal,
      product_name: product.product_name,
      product_code: product.product_code ? product.product_code.trim() : null,
      // Keep legacy unit column in sync with primary unit
      unit: primaryUnitVal,
      primary_unit: primaryUnitVal,
      quantity: product.quantity !== "" && product.quantity != null ? Number(product.quantity) : null,
      hsncode: product.hsncode || null,
      min_order_quantity: product.min_order_quantity || null,
      price:
        product.price != null && product.price !== "" ? product.price : null,
      barcode: product.barcode || null,
      image: product.images || product.image || null,
      status: product.status || "Active",
      is_insulation_subfield: product.is_insulation_subfield ? 1 : 0,
      discount_percent: product.discount_percent != null && product.discount_percent !== "" ? parseFloat(product.discount_percent) : 0,
      product_type: product.product_type || null,
      specifications: specifications && Object.keys(specifications).length > 0 ? specifications : null,
      combos: combos && combos.length > 0 ? combos : null,
      freebies: freebies && freebies.length > 0 ? freebies : null,
      serial_units: (trackSerials || product.product_type === "mobiles") && serialUnits.length > 0 ? serialUnits : null,
    };

    const doSave = (payload) => {
      if (id) {
        return axios
          .put(`${API}/products/${id}`, payload)
          .then(() => {
            toast.success("Product updated successfully");
            onCancel?.();
            navigate("/index/product");
          })
          .catch(() => toast.error("Update failed"));
      }
      return axios
        .post(`${API}/products`, payload)
        .then(() => {
          toast.success("Product saved successfully");
          onCancel?.();
          navigate("/index/product");
        })
        .catch(() => toast.error("Save failed"));
    };

    if (selectedImageFiles.length > 0) {
      const formData = new FormData();
      selectedImageFiles.forEach((file) => formData.append("images", file));
      axios
        .post(`${API}/products/upload-images`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((res) => {
          const newUrls = (res.data.urls || []).join(",");
          const existing = (productData.image || product.images || "").trim();
          productData.image = existing ? existing + "," + newUrls : newUrls;
          setSelectedImageFiles([]);
          return doSave(productData);
        })
        .catch((err) =>
          toast.error(err.response?.data?.message || "Image upload failed"),
        );
    } else {
      doSave(productData);
    }
  };

  const addCategory = () => {
    if (!newCategory.trim()) return toast.error("Category required");

    axios
      .post(`${API}/categories`, { category_name: newCategory })
      .then(() => {
        toast.success("Category added");
        setCatModal(false);
        setNewCategory("");
        return axios.get(`${API}/categories`);
      })
      .then((res) => setCategories(res.data))
      .catch(() => toast.error("Failed to add category"));
  };

  const addSubCategory = () => {
    if (!product.category_id) return toast.error("Select category first");

    if (!newSubCategory.trim()) return toast.error("SubCategory required");

    axios
      .post(`${API}/subcategories`, {
        category_id: product.category_id,
        subcategory_name: newSubCategory,
      })
      .then(() => {
        toast.success("SubCategory added");
        setSubModal(false);
        setNewSubCategory("");
        return axios.get(`${API}/subcategories/${product.category_id}`);
      })
      .then((res) => setSubcategories(res.data))
      .catch(() => toast.error("Failed to add subcategory"));
  };

  const addBrand = () => {
    if (!newBrand.trim()) return toast.error("Brand name required");

    axios
      .post(`${API}/brands`, { brand_name: newBrand })
      .then((res) => {
        const newId = res.data?.id;
        toast.success("Brand added");
        setBrandModal(false);
        setBrandSearch(newBrand);
        if (newId != null) {
          setProduct((p) => ({ ...p, brand_id: Number(newId) }));
        }
        setNewBrand("");
        return axios.get(`${API}/brands`);
      })
      .then((res) => setBrands(res.data || []))
      .catch(() => toast.error("Failed to add brand"));
  };

  const handleTypeSelect = (type) => {
    let catName = "";
    if (type === "furniture") catName = "Furnitures";
    else if (type === "home_appliances") catName = "Home Appliances";
    else if (type === "mobiles") catName = "Mobiles";

    const matchedCat =
      categories.find(
        (c) =>
          c.category_name.toLowerCase().trim() === catName.toLowerCase().trim()
      ) ||
      categories.find(
        (c) => detectCategoryType(c.category_name) === type
      );

    setProduct((p) => ({
      ...p,
      product_type: type,
      category_id: matchedCat ? matchedCat.id : p.category_id,
      subcategory_id: "",
    }));

    if (matchedCat) {
      setCatSearch(matchedCat.category_name);
      setSubSearch("");
    }
  };

  /* ================= FILTER ================= */

  const filteredCategories = categories.filter((c) =>
    c.category_name.toLowerCase().includes(catSearch.toLowerCase()),
  );

  const filteredSubCategories = subcategories.filter((s) =>
    s.subcategory_name.toLowerCase().includes(subSearch.toLowerCase()),
  );

  const filteredBrands = brands.filter((b) =>
    (b.brand_name || "").toLowerCase().includes(brandSearch.toLowerCase()),
  );

  const filteredPrimaryUnits = primaryUnits.filter((u) =>
    u.toLowerCase().includes(primaryUnitSearch.toLowerCase()),
  );



  const addUnit = () => {
    const val = newUnit.trim();
    if (!val) {
      toast.error("Unit name required");
      return;
    }
    // Persist unit in backend, then update local list and selection
    const type = "primary";
    axios
      .post(`${API}/units`, { unit_name: val }, { params: { type } })
      .then((res) => {
        const savedName = res.data?.unit_name || val;

        setPrimaryUnits((prev) =>
          prev.includes(savedName) ? prev : [...prev, savedName],
        );
        setProduct((p) => ({ ...p, primary_unit: savedName }));
        setPrimaryUnitSearch(savedName);

        setNewUnit("");
        setUnitModalFor("");
        toast.success("Unit added");
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Failed to add unit";
        toast.error(msg);
      });
  };

  /* ================= UI ================= */

  return (
    <>
      <Card>
        <CardBody>
          <CardTitle tag="h6">{id ? "Edit Product" : "Add Product"}</CardTitle>

          <Form>
            <Row className="g-3">
              {/* STARTING ROW: SELECT CATEGORY TYPE */}
              <Col xs={12}>
                <div className="d-flex align-items-center justify-content-between p-2 px-3 bg-light border rounded flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold text-dark">Category / Product Type *</span>
                  </div>
                  <div className="btn-group" role="group">
                    <button
                      type="button"
                      className={`btn btn-sm px-4 py-2 fw-bold ${
                        product.product_type === "furniture"
                          ? "btn-primary shadow-sm"
                          : "btn-outline-secondary bg-white text-dark"
                      }`}
                      onClick={() => handleTypeSelect("furniture")}
                    >
                      🛋️ Furniture
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm px-4 py-2 fw-bold ${
                        product.product_type === "home_appliances"
                          ? "btn-primary shadow-sm"
                          : "btn-outline-secondary bg-white text-dark"
                      }`}
                      onClick={() => handleTypeSelect("home_appliances")}
                    >
                      📺 Home Appliances
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm px-4 py-2 fw-bold ${
                        product.product_type === "mobiles"
                          ? "btn-primary shadow-sm"
                          : "btn-outline-secondary bg-white text-dark"
                      }`}
                      onClick={() => handleTypeSelect("mobiles")}
                    >
                      📱 Mobiles
                    </button>
                  </div>
                </div>
              </Col>

              {/* ROW 1: CATEGORY, SUBCATEGORY, BRAND, PRODUCT NAME */}
              <Col md={3} ref={catRef} className="position-relative">
                <label className="fw-bold">Category *</label>
                <Input
                  value={catSearch}
                  onFocus={() => setShowCatList(true)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCatSearch(val);
                    setShowCatList(true);
                    if (!val.trim()) {
                      setProduct((p) => ({ ...p, category_id: "", product_type: "" }));
                    } else {
                      const detected = detectCategoryType(val);
                      if (detected) {
                        setProduct((p) => ({ ...p, product_type: detected }));
                      }
                    }
                  }}
                />

                {showCatList && (
                  <Card className="mt-1 shadow-sm position-absolute w-100" style={{ zIndex: 1050 }}>
                    <CardBody style={{ maxHeight: 200, overflowY: "auto" }}>
                      {filteredCategories.length ? (
                        filteredCategories.map((c) => (
                          <div
                            key={c.id}
                            className="p-2 border rounded mb-2 cursor-pointer d-flex justify-content-between align-items-center"
                            onClick={() => {
                              const detected = detectCategoryType(c.category_name);
                              setProduct((p) => ({
                                ...p,
                                category_id: c.id,
                                subcategory_id: "",
                                product_type: detected || p.product_type || "",
                              }));
                              setCatSearch(c.category_name);
                              setSubSearch("");
                              setShowCatList(false);
                            }}
                          >
                            <span>{c.category_name}</span>
                            {detectCategoryType(c.category_name) && (
                              <small className="badge bg-light text-dark border">
                                {detectCategoryType(c.category_name) === "furniture"
                                  ? "🛋️ Furniture"
                                  : detectCategoryType(c.category_name) === "home_appliances"
                                  ? "📺 Appliance"
                                  : "📱 Mobile"}
                              </small>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-muted text-center">No results</div>
                      )}

                      <Button
                        size="sm"
                        outline
                        block
                        onClick={() => setCatModal(true)}
                      >
                        <MdAdd /> Add Category
                      </Button>
                    </CardBody>
                  </Card>
                )}
              </Col>

              {/* SUBCATEGORY */}
              <Col md={3} ref={subRef} className="position-relative">
                <label className="fw-bold">Sub Category</label>
                <Input
                  disabled={!product.category_id}
                  value={subSearch}
                  onFocus={() => product.category_id && setShowSubList(true)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSubSearch(val);
                    if (!val.trim()) {
                      setProduct((p) => ({ ...p, subcategory_id: null }));
                    }
                    setShowSubList(true);
                  }}
                />

                {showSubList && (
                  <Card className="mt-1 shadow-sm position-absolute w-100" style={{ zIndex: 1050 }}>
                    <CardBody style={{ maxHeight: 200, overflowY: "auto" }}>
                      {filteredSubCategories.length ? (
                        filteredSubCategories.map((s) => (
                          <div
                            key={s.id}
                            className="p-2 border rounded mb-2 cursor-pointer"
                            onClick={() => {
                              setProduct((p) => ({
                                ...p,
                                subcategory_id: s.id,
                              }));
                              setSubSearch(s.subcategory_name);
                              setShowSubList(false);
                            }}
                          >
                            {s.subcategory_name}
                          </div>
                        ))
                      ) : (
                        <div className="text-muted text-center">No results</div>
                      )}

                      <Button
                        size="sm"
                        outline
                        block
                        onClick={() => setSubModal(true)}
                      >
                        <MdAdd /> Add SubCategory
                      </Button>
                    </CardBody>
                  </Card>
                )}
              </Col>

              {/* BRAND */}
              <Col md={3} ref={brandRef} className="position-relative">
                <label className="fw-bold">Brand</label>
                <Input
                  value={brandSearch}
                  onFocus={() => setShowBrandList(true)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBrandSearch(val);
                    setShowBrandList(true);
                    if (!val.trim())
                      setProduct((p) => ({ ...p, brand_id: "" }));
                  }}
                />

                {showBrandList && (
                  <Card className="mt-1 shadow-sm position-absolute w-100" style={{ zIndex: 1050 }}>
                    <CardBody style={{ maxHeight: 200, overflowY: "auto" }}>
                      {filteredBrands.length ? (
                        filteredBrands.map((b) => (
                          <div
                            key={b.id}
                            className="p-2 border rounded mb-2 cursor-pointer"
                            onClick={() => {
                              const brandId =
                                b.id != null ? Number(b.id) : b.id;
                              setProduct((p) => ({ ...p, brand_id: brandId }));
                              setBrandSearch(b.brand_name || "");
                              setShowBrandList(false);
                            }}
                          >
                            {b.brand_name}
                          </div>
                        ))
                      ) : (
                        <div className="text-muted text-center">No results</div>
                      )}

                      <Button
                        size="sm"
                        outline
                        block
                        onClick={() => setBrandModal(true)}
                      >
                        <MdAdd /> Add Brand
                      </Button>
                    </CardBody>
                  </Card>
                )}
              </Col>

              {/* PRODUCT NAME */}
              <Col md={3}>
                <label className="fw-bold">Product Name *</label>
                <Input
                  name="product_name"
                  value={product.product_name}
                  onChange={handleChange}
                />
              </Col>

              {/* ROW 2: PRODUCT CODE, BARCODE, HSN CODE, PRIMARY UNIT */}
              <Col md={3}>
                <label className="fw-bold">Product Code</label>
                <Input
                  name="product_code"
                  value={product.product_code || ''}
                  onChange={handleChange}
                />
              </Col>

              <Col md={3}>
                <label className="fw-bold">Barcode</label>
                <Input
                  name="barcode"
                  value={product.barcode || ''}
                  onChange={handleChange}
                />
              </Col>

              <Col md={3}>
                <label className="fw-bold">HSN Code</label>
                <Input
                  name="hsncode"
                  value={product.hsncode || ''}
                  onChange={handleChange}
                />
              </Col>

              <Col md={3} ref={primaryUnitRef} className="position-relative">
                <label className="fw-bold">Primary Unit</label>
                <Input
                  value={primaryUnitSearch}
                  onFocus={() => setShowPrimaryUnitList(true)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPrimaryUnitSearch(val);
                    setShowPrimaryUnitList(true);
                  }}
                />

                {showPrimaryUnitList && (
                  <Card className="mt-1 shadow-sm position-absolute w-100" style={{ zIndex: 1050 }}>
                    <CardBody style={{ maxHeight: 200, overflowY: "auto" }}>
                      {filteredPrimaryUnits.length ? (
                        filteredPrimaryUnits.map((u) => (
                          <div
                            key={u}
                            className="p-2 border rounded mb-2 cursor-pointer"
                            onClick={() => {
                              setProduct((p) => ({ ...p, primary_unit: u }));
                              setPrimaryUnitSearch(u);
                              setShowPrimaryUnitList(false);
                            }}
                          >
                            {u}
                          </div>
                        ))
                      ) : (
                        <div className="text-muted text-center">No results</div>
                      )}

                      <Button
                        size="sm"
                        outline
                        block
                        onClick={() => {
                          setUnitModalFor("primary");
                          setShowPrimaryUnitList(false);
                        }}
                      >
                        <MdAdd /> Add Primary Unit
                      </Button>
                    </CardBody>
                  </Card>
                )}
              </Col>

              {/* ROW 3: QUANTITY, MRP, DISCOUNT, STATUS */}
              <Col md={3}>
                <label className="fw-bold">Quantity</label>
                <Input
                  type="number"
                  name="quantity"
                  value={product.quantity}
                  onChange={handleChange}
                  min={0}
                  step="1"
                />
              </Col>

              <Col md={3}>
                <label className="fw-bold">MRP</label>
                <Input
                  type="number"
                  name="price"
                  value={product.price}
                  onChange={handleChange}
                  min={0}
                  step="0.01"
                />
              </Col>

              <Col md={3}>
                <label className="fw-bold">Discount (%)</label>
                <Input
                  type="number"
                  name="discount_percent"
                  value={product.discount_percent}
                  onChange={handleChange}
                  min={0}
                  max={100}
                  step="0.01"
                />
              </Col>

              <Col md={3}>
                <label className="fw-bold">Status</label>
                <Input
                  type="select"
                  name="status"
                  value={product.status}
                  onChange={handleChange}
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </Input>
              </Col>

              {/* ROW 4: PRODUCT IMAGES */}
              <Col xs={12} className="mt-2">
                <label className="fw-bold">Product Images</label>
                <div className="row g-2 align-items-center">
                  <div className="col-md-4">
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) =>
                        setSelectedImageFiles(
                          e.target.files ? [...e.target.files] : [],
                        )
                      }
                    />
                    {selectedImageFiles.length > 0 && (
                      <small className="text-muted d-block mt-1">
                        {selectedImageFiles.length} file(s) chosen
                      </small>
                    )}
                  </div>
                  {product.images && product.images.trim() && (
                    <div className="col-md-8">
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                        <small className="text-muted me-1">Current images:</small>
                        {product.images
                          .split(",")
                          .map((url) => url.trim())
                          .filter(Boolean)
                          .map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Product ${idx + 1}`}
                              style={{
                                width: 52,
                                height: 52,
                                objectFit: "cover",
                                borderRadius: 6,
                                border: "1px solid #dee2e6",
                              }}
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </Col>

              {/* ============================================================== */}
              {/* 🏷️ CATEGORY SPECIFICATIONS & VARIATIONS CARD                   */}
              {/* ============================================================== */}
              <Col xs={12} className="mt-4">
                <div className="p-3.5 p-md-4 rounded-3 border shadow-sm bg-white">
                  {/* Card Header with Category Pills */}
                  <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between pb-3 mb-3 border-bottom gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className="fs-5">
                        {product.product_type === "mobiles"
                          ? "📱"
                          : product.product_type === "home_appliances"
                          ? "📺"
                          : product.product_type === "furniture"
                          ? "🛋️"
                          : "⚙️"}
                      </span>
                      <div>
                        <h6 className="mb-0 fw-bold text-dark">Category Variations & Specifications</h6>
                        <small className="text-muted">
                          {product.product_type === "mobiles"
                            ? "Mobiles & Smartphones hardware specifications & variant attributes"
                            : product.product_type === "home_appliances"
                            ? "Home & Kitchen Appliances capacity, ratings & technical attributes"
                            : product.product_type === "furniture"
                            ? "Furniture materials, dimensions, assembly & finish attributes"
                            : "Select a category template below to configure product specifications and variations"}
                        </small>
                      </div>
                    </div>

                    {/* Category Switcher Pills */}
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="small text-muted fw-semibold">Template:</span>
                      {[
                        { id: "mobiles", label: "📱 Mobiles" },
                        { id: "home_appliances", label: "📺 Home Appliances" },
                        { id: "furniture", label: "🛋️ Furniture" },
                      ].map((cat) => {
                        const isActive = product.product_type === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            className={`btn btn-sm ${isActive ? "btn-dark shadow-sm text-white" : "btn-outline-secondary"}`}
                            style={{
                              borderRadius: "20px",
                              padding: "4px 14px",
                              fontSize: "0.82rem",
                              fontWeight: isActive ? "600" : "500",
                            }}
                            onClick={() => setProduct((p) => ({ ...p, product_type: cat.id }))}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                      {product.product_type && (
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-muted p-0 ms-1"
                          style={{ fontSize: "0.8rem", textDecoration: "none" }}
                          onClick={() => setProduct((p) => ({ ...p, product_type: "" }))}
                          title="Clear category variation template"
                        >
                          ✕ Reset
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 🛋️ FURNITURE SPECIFICATION FIELDS */}
                  {product.product_type === "furniture" && (
                    <Row className="g-3">
                      <Col md={4}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Material / Wood Type</label>
                        <Input
                          value={specifications.material || ""}
                          onChange={(e) => handleSpecChange("material", e.target.value)}
                        />
                      </Col>
                      <Col md={4}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Color / Finish</label>
                        <Input
                          value={specifications.color_finish || ""}
                          onChange={(e) => handleSpecChange("color_finish", e.target.value)}
                        />
                      </Col>
                      <Col md={4}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Dimensions (L × W × H)</label>
                        <Input
                          value={specifications.dimensions || ""}
                          onChange={(e) => handleSpecChange("dimensions", e.target.value)}
                        />
                      </Col>
                      <Col md={4}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Size / Seating Capacity</label>
                        <Input
                          value={specifications.size_capacity || ""}
                          onChange={(e) => handleSpecChange("size_capacity", e.target.value)}
                        />
                      </Col>
                      <Col md={4}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Assembly Required</label>
                        <Input
                          type="select"
                          value={specifications.assembly_required || "Pre-assembled"}
                          onChange={(e) => handleSpecChange("assembly_required", e.target.value)}
                        >
                          <option value="Pre-assembled">Pre-assembled</option>
                          <option value="Self-Assembly (DIY)">Self-Assembly (DIY)</option>
                          <option value="Carpenter Assembly Required">Carpenter Assembly Required</option>
                        </Input>
                      </Col>
                      <Col md={4}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Warranty Period</label>
                        <Input
                          value={specifications.warranty || ""}
                          onChange={(e) => handleSpecChange("warranty", e.target.value)}
                        />
                      </Col>
                    </Row>
                  )}

                  {/* 📺 HOME APPLIANCES SPECIFICATION FIELDS */}
                  {product.product_type === "home_appliances" && (
                    <Row className="g-3">
                      <Col md={4}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Model Number</label>
                        <Input
                          value={specifications.model_number || ""}
                          onChange={(e) => handleSpecChange("model_number", e.target.value)}
                        />
                      </Col>
                      <Col md={4}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Capacity / Size</label>
                        <Input
                          value={specifications.capacity || ""}
                          onChange={(e) => handleSpecChange("capacity", e.target.value)}
                        />
                      </Col>
                      <Col md={4}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Energy Star Rating</label>
                        <Input
                          type="select"
                          value={specifications.energy_rating || "5 Star"}
                          onChange={(e) => handleSpecChange("energy_rating", e.target.value)}
                        >
                          <option value="5 Star">5 Star</option>
                          <option value="4 Star">4 Star</option>
                          <option value="3 Star">3 Star</option>
                          <option value="2 Star">2 Star</option>
                          <option value="1 Star">1 Star</option>
                          <option value="Inverter / Not Applicable">Inverter / Not Applicable</option>
                        </Input>
                      </Col>
                      <Col md={4}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Power Consumption</label>
                        <Input
                          value={specifications.power_consumption || ""}
                          onChange={(e) => handleSpecChange("power_consumption", e.target.value)}
                        />
                      </Col>
                      <Col md={4}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Color / Body Finish</label>
                        <Input
                          value={specifications.color_finish || ""}
                          onChange={(e) => handleSpecChange("color_finish", e.target.value)}
                        />
                      </Col>
                      <Col md={4}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Warranty Period</label>
                        <Input
                          value={specifications.warranty || ""}
                          onChange={(e) => handleSpecChange("warranty", e.target.value)}
                        />
                      </Col>
                    </Row>
                  )}

                  {/* 📱 MOBILES SPECIFICATION FIELDS */}
                  {product.product_type === "mobiles" && (
                    <Row className="g-3">
                      <Col md={3}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Model Name / Number</label>
                        <Input
                          value={specifications.model_number || ""}
                          onChange={(e) => handleSpecChange("model_number", e.target.value)}
                        />
                      </Col>
                      <Col md={3}>
                        <label className="form-label fw-semibold small text-secondary mb-1">RAM</label>
                        <Input
                          value={specifications.ram || ""}
                          onChange={(e) => handleSpecChange("ram", e.target.value)}
                        />
                      </Col>
                      <Col md={3}>
                        <label className="form-label fw-semibold small text-secondary mb-1">ROM / Storage</label>
                        <Input
                          value={specifications.rom || ""}
                          onChange={(e) => handleSpecChange("rom", e.target.value)}
                        />
                      </Col>
                      <Col md={3}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Color</label>
                        <Input
                          value={specifications.color || ""}
                          onChange={(e) => handleSpecChange("color", e.target.value)}
                        />
                      </Col>
                      <Col md={3}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Front Camera</label>
                        <Input
                          value={specifications.front_camera || ""}
                          onChange={(e) => handleSpecChange("front_camera", e.target.value)}
                        />
                      </Col>
                      <Col md={3}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Back / Rear Camera</label>
                        <Input
                          value={specifications.back_camera || ""}
                          onChange={(e) => handleSpecChange("back_camera", e.target.value)}
                        />
                      </Col>
                      <Col md={3}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Battery Capacity</label>
                        <Input
                          value={specifications.battery || ""}
                          onChange={(e) => handleSpecChange("battery", e.target.value)}
                        />
                      </Col>
                      <Col md={3}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Screen / Display Size</label>
                        <Input
                          value={specifications.display_size || ""}
                          onChange={(e) => handleSpecChange("display_size", e.target.value)}
                        />
                      </Col>
                      <Col md={6}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Processor / OS</label>
                        <Input
                          value={specifications.processor_os || ""}
                          onChange={(e) => handleSpecChange("processor_os", e.target.value)}
                        />
                      </Col>
                      <Col md={6}>
                        <label className="form-label fw-semibold small text-secondary mb-1">Warranty Period</label>
                        <Input
                          value={specifications.warranty || ""}
                          onChange={(e) => handleSpecChange("warranty", e.target.value)}
                        />
                      </Col>
                    </Row>
                  )}

                  {/* 📱 DUAL IMEI & SERIAL NUMBERS PER UNIT (OPTION A) */}
                  {(product.product_type === "mobiles" || trackSerials) && (
                    <div className="mt-4 pt-3 border-top">
                      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between mb-2 gap-2">
                        <div className="d-flex align-items-center gap-2">
                          <FaMobileAlt style={{ color: "#2563EB", fontSize: "1.15rem" }} />
                          <span className="fw-bold fs-6 text-dark">
                            Unit Identification — Dual IMEI & Serial Numbers
                          </span>
                          {parseInt(product.quantity, 10) > 0 && (
                            <span className="badge bg-light text-dark border">
                              {serialUnits.filter((u) => u.imei_1 || u.serial_number).length} / {parseInt(product.quantity, 10)} units entered
                            </span>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <Button
                            size="sm"
                            outline
                            color="primary"
                            className="d-flex align-items-center gap-1"
                            onClick={() => setShowBulkSerialModal(true)}
                          >
                            <FaBarcode size={12} /> Bulk Paste IMEIs
                          </Button>
                        </div>
                      </div>

                      {parseInt(product.quantity, 10) > 0 ? (
                        <div
                          className="border rounded-3 overflow-hidden shadow-sm bg-white"
                          style={{ maxHeight: "380px", overflowY: "auto" }}
                        >
                          <table className="table table-sm table-hover table-bordered mb-0 align-middle">
                            <thead className="table-light sticky-top" style={{ zIndex: 2 }}>
                              <tr style={{ fontSize: "0.82rem" }}>
                                <th style={{ width: "85px" }} className="text-center"># Unit</th>
                                <th>IMEI 1 (Primary SIM)</th>
                                <th>IMEI 2 (Secondary SIM / eSIM)</th>
                                <th>Serial Number</th>
                                <th style={{ width: "95px" }} className="text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {serialUnits.map((unit, idx) => {
                                const isImei1Valid = unit.imei_1 && unit.imei_1.length === 15;
                                const isImei2Valid = unit.imei_2 && unit.imei_2.length === 15;
                                return (
                                  <tr key={idx}>
                                    <td className="text-center fw-bold text-muted small bg-light">
                                      Unit {idx + 1}
                                    </td>
                                    <td>
                                      <div className="position-relative">
                                        <Input
                                          bsSize="sm"
                                          type="text"
                                          value={unit.imei_1 || ""}
                                          maxLength={18}
                                          onChange={(e) =>
                                            handleSerialUnitChange(idx, "imei_1", e.target.value.replace(/[^0-9A-Za-z]/g, ""))
                                          }
                                        />
                                        {unit.imei_1 && (
                                          <span
                                            className={`position-absolute top-50 end-0 translate-middle-y me-2 badge ${
                                              isImei1Valid ? "bg-success" : "bg-secondary"
                                            }`}
                                            style={{ fontSize: "0.68rem" }}
                                          >
                                            {unit.imei_1.length}/15
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <div className="position-relative">
                                        <Input
                                          bsSize="sm"
                                          type="text"
                                          value={unit.imei_2 || ""}
                                          maxLength={18}
                                          onChange={(e) =>
                                            handleSerialUnitChange(idx, "imei_2", e.target.value.replace(/[^0-9A-Za-z]/g, ""))
                                          }
                                        />
                                        {unit.imei_2 && (
                                          <span
                                            className={`position-absolute top-50 end-0 translate-middle-y me-2 badge ${
                                              isImei2Valid ? "bg-success" : "bg-secondary"
                                            }`}
                                            style={{ fontSize: "0.68rem" }}
                                          >
                                            {unit.imei_2.length}/15
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <Input
                                        bsSize="sm"
                                        type="text"
                                        value={unit.serial_number || ""}
                                        maxLength={35}
                                        onChange={(e) =>
                                          handleSerialUnitChange(idx, "serial_number", e.target.value)
                                        }
                                      />
                                    </td>
                                    <td className="text-center">
                                      <Badge color="success" pill style={{ fontSize: "0.72rem" }}>
                                        {unit.status || "Available"}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div
                          className="p-3 rounded-2 text-center text-muted"
                          style={{ backgroundColor: "#F8FAFC", border: "1px dashed #CBD5E1" }}
                        >
                          <small>
                            Please enter a <strong>Quantity</strong> above (e.g. 1, 2, 5) to generate individual IMEI 1, IMEI 2, and Serial Number rows for each device.
                          </small>
                        </div>
                      )}
                    </div>
                  )}

                  {!product.product_type && (
                    <div className="text-center py-4 px-3 rounded-2" style={{ backgroundColor: "#F8FAFC", border: "1px dashed #CBD5E1" }}>
                      <p className="text-muted mb-2">No category variation template selected.</p>
                      <p className="small text-secondary mb-3">Choose a category above or click a template to configure technical specs, variants, and dimensions:</p>
                      <div className="d-flex justify-content-center gap-2 flex-wrap">
                        <Button size="sm" outline color="primary" onClick={() => setProduct((p) => ({ ...p, product_type: "mobiles" }))}>📱 Mobiles Template</Button>
                        <Button size="sm" outline color="success" onClick={() => setProduct((p) => ({ ...p, product_type: "home_appliances" }))}>📺 Home Appliances Template</Button>
                        <Button size="sm" outline color="info" onClick={() => setProduct((p) => ({ ...p, product_type: "furniture" }))}>🛋️ Furniture Template</Button>
                      </div>
                    </div>
                  )}
                </div>
              </Col>

              {/* ============================================================== */}
              {/* 📦 BUNDLES, COMBOS & PROMOTIONAL FREEBIES                      */}
              {/* ============================================================== */}
              <Col xs={12} className="mt-4">
                <Row className="g-3">
                  {/* LEFT: Included Combo Package / Accessories */}
                  <Col xs={12} lg={6}>
                    <div
                      className="p-3 rounded-3 shadow-sm border h-100 d-flex flex-column justify-content-between"
                      style={{ backgroundColor: "#F8FAFC", borderColor: "#CBD5E1" }}
                    >
                      <div>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <FaBoxes style={{ color: "#2563EB", fontSize: "1.15rem" }} />
                            <span className="fw-bold fs-6" style={{ color: "#0F172A" }}>
                              Included Combo Package / Accessories
                            </span>
                          </div>
                          {combos.length > 0 ? (
                            <Badge color="primary" pill className="px-2 py-1">
                              {combos.length} item{combos.length > 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <span className="small text-muted">0 items</span>
                          )}
                        </div>

                        <p className="small text-muted mb-2">
                          Items packed together inside the box or bundled as a value package.
                        </p>

                        {/* Category Quick Add Suggestions */}
                        <div className="mb-3">
                          <div className="small fw-semibold text-secondary mb-1">Quick Add Suggestions:</div>
                          <div className="d-flex flex-wrap gap-1 align-items-center">
                            {(product.product_type === "mobiles"
                              ? [
                                  "65W Fast Charger",
                                  "Type-C Braided Cable",
                                  "TWS Wireless Earbuds",
                                  "Bluetooth Neckband",
                                  "10,000mAh Power Bank",
                                ]
                              : product.product_type === "home_appliances"
                              ? [
                                  "Heavy Duty Wall Mount",
                                  "4kVA Voltage Stabilizer",
                                  "Machine Movable Trolley",
                                  "Anti-Scale Water Filter",
                                  "High Speed 4K HDMI Cable",
                                  "Waterproof Dust Cover",
                                ]
                              : [
                                  "Pair of Fiber Pillows",
                                  "Center Coffee Table",
                                  "2x Puffy Stools",
                                  "Fitted Bed Sheet Set",
                                  "Wood Polish Wax Kit",
                                ]
                            ).map((item, idx) => {
                              const isAdded = combos.includes(item);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`btn btn-sm ${isAdded ? "btn-light text-muted border-0" : "btn-white border text-dark"}`}
                                  style={{
                                    fontSize: "0.75rem",
                                    borderRadius: "14px",
                                    padding: "2px 8px",
                                    backgroundColor: isAdded ? "#E2E8F0" : "#FFFFFF",
                                    cursor: isAdded ? "default" : "pointer",
                                  }}
                                  onClick={() => !isAdded && handleAddCombo(item)}
                                  disabled={isAdded}
                                >
                                  {isAdded ? `✓ ${item}` : `+ ${item}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div>
                        {/* Custom Add InputGroup */}
                        <div className="input-group mb-2">
                          <Input
                            value={comboInput}
                            onChange={(e) => setComboInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddCombo();
                              }
                            }}
                            style={{ borderTopLeftRadius: "8px", borderBottomLeftRadius: "8px" }}
                          />
                          <Button
                            color="primary"
                            className="d-flex align-items-center gap-1 fw-semibold px-3"
                            onClick={() => handleAddCombo()}
                            style={{ backgroundColor: "#0F172A", borderColor: "#0F172A", borderTopRightRadius: "8px", borderBottomRightRadius: "8px" }}
                          >
                            <FaPlus size={11} /> Add
                          </Button>
                        </div>

                        {/* Added Combo Items Badges */}
                        <div className="pt-2 border-top" style={{ minHeight: "42px" }}>
                          {combos.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1.5 align-items-center">
                              {combos.map((item, idx) => (
                                <Badge
                                  key={idx}
                                  className="d-inline-flex align-items-center gap-1 py-1 px-2 border shadow-sm"
                                  style={{
                                    fontSize: "0.82rem",
                                    borderRadius: "8px",
                                    backgroundColor: "#EFF6FF",
                                    borderColor: "#BFDBFE",
                                    color: "#1E3A8A",
                                  }}
                                >
                                  <FaTag size={9} style={{ color: "#3B82F6" }} />
                                  <span className="fw-semibold">{item}</span>
                                  <button
                                    type="button"
                                    className="btn btn-link p-0 text-danger ms-1 fw-bold"
                                    style={{ fontSize: "0.85rem", textDecoration: "none", lineHeight: 1 }}
                                    onClick={() => handleRemoveCombo(idx)}
                                    title="Remove item"
                                  >
                                    ✕
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <small className="text-muted fst-italic">No combo accessories added yet.</small>
                          )}
                        </div>
                      </div>
                    </div>
                  </Col>

                  {/* RIGHT: Promotional Freebies / Complimentary Gifts */}
                  <Col xs={12} lg={6}>
                    <div
                      className="p-3 rounded-3 shadow-sm border h-100 d-flex flex-column justify-content-between"
                      style={{ backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }}
                    >
                      <div>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <FaGift style={{ color: "#D97706", fontSize: "1.15rem" }} />
                            <span className="fw-bold fs-6" style={{ color: "#92400E" }}>
                              Promotional Freebies / Gifts
                            </span>
                          </div>
                          {freebies.length > 0 ? (
                            <Badge color="warning" pill className="text-dark px-2 py-1 fw-bold">
                              {freebies.length} Free Gift{freebies.length > 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <span className="small text-muted">0 gifts</span>
                          )}
                        </div>

                        <p className="small text-muted mb-2">
                          Zero-cost promotional giveaways, complimentary gifts, or free services.
                        </p>

                        {/* Category Quick Add Suggestions */}
                        <div className="mb-3">
                          <div className="small fw-semibold text-secondary mb-1">Quick Add Freebies:</div>
                          <div className="d-flex flex-wrap gap-1 align-items-center">
                            {(product.product_type === "mobiles"
                              ? [
                                  "Free 11D Tempered Glass",
                                  "Free Transparent Back Case",
                                  "Free OTG Type-C Adapter",
                                  "Free Mobile Desktop Stand",
                                ]
                              : product.product_type === "home_appliances"
                              ? [
                                  "Free Standard Installation",
                                  "Free 1L Matic Detergent",
                                  "Free Anti-Vibration Pads",
                                  "Free 4x Water Bottles Set",
                                  "Free 1-Yr OTT Subscription",
                                ]
                              : [
                                  "Free Microfiber Pillows",
                                  "Free Cushion Covers Set",
                                  "Free Carpenter Assembly",
                                  "Free Home Delivery",
                                ]
                            ).map((item, idx) => {
                              const isAdded = freebies.includes(item);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`btn btn-sm ${isAdded ? "btn-light text-muted border-0" : "btn-white border text-dark"}`}
                                  style={{
                                    fontSize: "0.75rem",
                                    borderRadius: "14px",
                                    padding: "2px 8px",
                                    backgroundColor: isAdded ? "#FEF3C7" : "#FFFFFF",
                                    borderColor: "#FCD34D",
                                    cursor: isAdded ? "default" : "pointer",
                                  }}
                                  onClick={() => !isAdded && handleAddFreebie(item)}
                                  disabled={isAdded}
                                >
                                  {isAdded ? `✓ ${item}` : `+ ${item}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div>
                        {/* Custom Add InputGroup */}
                        <div className="input-group mb-2">
                          <Input
                            value={freebieInput}
                            onChange={(e) => setFreebieInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddFreebie();
                              }
                            }}
                            style={{ borderTopLeftRadius: "8px", borderBottomLeftRadius: "8px" }}
                          />
                          <Button
                            className="d-flex align-items-center gap-1 fw-bold text-dark px-3"
                            onClick={() => handleAddFreebie()}
                            style={{ backgroundColor: "#F59E0B", borderColor: "#D97706", borderTopRightRadius: "8px", borderBottomRightRadius: "8px" }}
                          >
                            <FaPlus size={11} /> Add
                          </Button>
                        </div>

                        {/* Added Freebies Badges */}
                        <div className="pt-2 border-top" style={{ minHeight: "42px" }}>
                          {freebies.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1.5 align-items-center">
                              {freebies.map((item, idx) => (
                                <Badge
                                  key={idx}
                                  className="d-inline-flex align-items-center gap-1 py-1 px-2 border shadow-sm"
                                  style={{
                                    fontSize: "0.82rem",
                                    borderRadius: "8px",
                                    backgroundColor: "#FEF3C7",
                                    borderColor: "#FCD34D",
                                    color: "#92400E",
                                  }}
                                >
                                  <FaGift size={9} style={{ color: "#D97706" }} />
                                  <span className="fw-semibold">{item}</span>
                                  <button
                                    type="button"
                                    className="btn btn-link p-0 text-danger ms-1 fw-bold"
                                    style={{ fontSize: "0.85rem", textDecoration: "none", lineHeight: 1 }}
                                    onClick={() => handleRemoveFreebie(idx)}
                                    title="Remove freebie"
                                  >
                                    ✕
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <small className="text-muted fst-italic">No freebies or gifts added yet.</small>
                          )}
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Col>
                        </Row>

            <div className="text-end mt-4">
              <Button
                outline
                onClick={() => {
                  onCancel?.();
                  navigate("/index/product");
                }}
              >
                <MdCancel /> Cancel
              </Button>{" "}
              <Button
                onClick={saveProduct}
                className="fw-bold px-4 shadow-sm"
                style={{
                  background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                  color: "#08090D",
                  fontWeight: "800",
                  border: "none",
                }}
              >
                <MdSave /> Save
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>

      {/* CATEGORY MODAL */}
      <Modal isOpen={catModal} toggle={() => setCatModal(false)} centered>
        <ModalHeader
          toggle={() => setCatModal(false)}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setCatModal(false)}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <span className="fw-bold" style={{ color: "#FFD700" }}>Add Category</span>
        </ModalHeader>
        <ModalBody className="p-4" style={{ backgroundColor: "#F8FAFC" }}>
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Enter Category Name"
            style={{ borderRadius: "8px", border: "1.5px solid #CBD5E1", height: "38px" }}
          />
          <Button
            className="mt-3 w-100 fw-bold shadow-sm"
            style={{
              background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
              color: "#08090D",
              fontWeight: "800",
              border: "none",
              height: "38px",
            }}
            onClick={addCategory}
          >
            Save Category
          </Button>
        </ModalBody>
      </Modal>

      {/* SUBCATEGORY MODAL */}
      <Modal isOpen={subModal} toggle={() => setSubModal(false)} centered>
        <ModalHeader
          toggle={() => setSubModal(false)}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setSubModal(false)}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <span className="fw-bold" style={{ color: "#FFD700" }}>Add SubCategory</span>
        </ModalHeader>

        <ModalBody className="p-4" style={{ backgroundColor: "#F8FAFC" }}>
          {/* CATEGORY DROPDOWN */}
          <label className="fw-bold small mb-1">Category *</label>
          <Input
            type="select"
            value={product.category_id}
            onChange={(e) =>
              setProduct((p) => ({
                ...p,
                category_id: e.target.value,
              }))
            }
            style={{ borderRadius: "8px", border: "1.5px solid #CBD5E1", height: "38px" }}
          >
            <option value="">-- Select Category --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.category_name}
              </option>
            ))}
          </Input>

          {/* SUBCATEGORY NAME */}
          <label className="fw-bold small mt-3 mb-1">SubCategory Name *</label>
          <Input
            value={newSubCategory}
            onChange={(e) => setNewSubCategory(e.target.value)}
            placeholder="Enter SubCategory Name"
            style={{ borderRadius: "8px", border: "1.5px solid #CBD5E1", height: "38px" }}
          />

          <Button
            className="mt-4 w-100 fw-bold shadow-sm"
            style={{
              background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
              color: "#08090D",
              fontWeight: "800",
              border: "none",
              height: "38px",
            }}
            onClick={addSubCategory}
            disabled={!product.category_id || !newSubCategory}
          >
            Save SubCategory
          </Button>
        </ModalBody>
      </Modal>

      {/* BRAND MODAL */}
      <Modal isOpen={brandModal} toggle={() => setBrandModal(false)} centered>
        <ModalHeader
          toggle={() => setBrandModal(false)}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setBrandModal(false)}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <span className="fw-bold" style={{ color: "#FFD700" }}>Add Brand</span>
        </ModalHeader>
        <ModalBody className="p-4" style={{ backgroundColor: "#F8FAFC" }}>
          <Input
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
            placeholder="Enter Brand Name"
            style={{ borderRadius: "8px", border: "1.5px solid #CBD5E1", height: "38px" }}
          />
          <Button
            className="mt-3 w-100 fw-bold shadow-sm"
            style={{
              background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
              color: "#08090D",
              fontWeight: "800",
              border: "none",
              height: "38px",
            }}
            onClick={addBrand}
          >
            Save Brand
          </Button>
        </ModalBody>
      </Modal>

      {/* UNIT MODAL (Primary / Secondary) */}
      <Modal
        isOpen={!!unitModalFor}
        toggle={() => setUnitModalFor("")}
        centered
      >
        <ModalHeader
          toggle={() => setUnitModalFor("")}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setUnitModalFor("")}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <span className="fw-bold" style={{ color: "#FFD700" }}>
            {unitModalFor === "primary"
              ? "Add Primary Unit"
              : "Add Secondary Unit"}
          </span>
        </ModalHeader>
        <ModalBody className="p-4" style={{ backgroundColor: "#F8FAFC" }}>
          <Input
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            placeholder="e.g. PCS, NOS, BOX"
            style={{ borderRadius: "8px", border: "1.5px solid #CBD5E1", height: "38px" }}
          />
          <Button
            className="mt-3 w-100 fw-bold shadow-sm"
            style={{
              background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
              color: "#08090D",
              fontWeight: "800",
              border: "none",
              height: "38px",
            }}
            onClick={addUnit}
          >
            Save Unit
          </Button>
        </ModalBody>
      </Modal>

      {/* BULK PASTE IMEIS MODAL (OPTION A) */}
      <Modal isOpen={showBulkSerialModal} toggle={() => setShowBulkSerialModal(false)} centered size="md">
        <ModalHeader toggle={() => setShowBulkSerialModal(false)}>
          <div className="d-flex align-items-center gap-2">
            <FaBarcode /> Bulk Paste IMEI & Serial Numbers
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="small text-muted mb-2">
            Paste one unit per line from Excel, CSV, or a barcode scanner. Separate IMEI 1, IMEI 2, and Serial Number with commas, tabs, or spaces:
          </p>
          <div className="p-2 mb-2 rounded bg-light border small text-secondary">
            <code>864521045896321, 864521045896322, SN001<br />864521045896333, 864521045896334, SN002</code>
          </div>
          <Input
            type="textarea"
            rows={6}
            value={bulkSerialText}
            onChange={(e) => setBulkSerialText(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowBulkSerialModal(false)}>Cancel</Button>
          <Button color="primary" onClick={handleApplyBulkSerials}>Apply to Units</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
