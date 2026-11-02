import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
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
} from "reactstrap";
import { MdSave, MdCancel, MdAdd } from "react-icons/md";
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

              {/* ROW 3: MRP, DISCOUNT, STATUS, IMAGES */}
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

              <Col md={3}>
                <label className="fw-bold">Images</label>
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
                {product.images && product.images.trim() && (
                  <div className="mt-2">
                    <small className="text-muted d-block mb-1">
                      Current images:
                    </small>
                    <div className="d-flex flex-wrap gap-2">
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
                              width: 60,
                              height: 60,
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
              </Col>

              {/* 🛋️ FURNITURE SPECIFICATION FIELDS */}
              {product.product_type === "furniture" && (
                <>
                  <Col xs={12} className="mt-2">
                    <div className="border-bottom pb-2 mb-1">
                      <span className="fw-bold text-dark fs-6">🛋️ Furniture Specifications</span>
                    </div>
                  </Col>
                  <Col md={4}>
                    <label className="fw-bold">Material / Wood Type</label>
                    <Input
                      value={specifications.material || ""}
                      onChange={(e) => handleSpecChange("material", e.target.value)}
                    />
                  </Col>
                  <Col md={4}>
                    <label className="fw-bold">Color / Finish</label>
                    <Input
                      value={specifications.color_finish || ""}
                      onChange={(e) => handleSpecChange("color_finish", e.target.value)}
                    />
                  </Col>
                  <Col md={4}>
                    <label className="fw-bold">Dimensions (L × W × H)</label>
                    <Input
                      value={specifications.dimensions || ""}
                      onChange={(e) => handleSpecChange("dimensions", e.target.value)}
                    />
                  </Col>
                  <Col md={4}>
                    <label className="fw-bold">Size / Seating Capacity</label>
                    <Input
                      value={specifications.size_capacity || ""}
                      onChange={(e) => handleSpecChange("size_capacity", e.target.value)}
                    />
                  </Col>
                  <Col md={4}>
                    <label className="fw-bold">Assembly Required</label>
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
                    <label className="fw-bold">Warranty</label>
                    <Input
                      value={specifications.warranty || ""}
                      onChange={(e) => handleSpecChange("warranty", e.target.value)}
                    />
                  </Col>
                </>
              )}

              {/* 📺 HOME APPLIANCES SPECIFICATION FIELDS */}
              {product.product_type === "home_appliances" && (
                <>
                  <Col xs={12} className="mt-2">
                    <div className="border-bottom pb-2 mb-1">
                      <span className="fw-bold text-dark fs-6">📺 Home Appliance Specifications</span>
                    </div>
                  </Col>
                  <Col md={4}>
                    <label className="fw-bold">Model Number</label>
                    <Input
                      value={specifications.model_number || ""}
                      onChange={(e) => handleSpecChange("model_number", e.target.value)}
                    />
                  </Col>
                  <Col md={4}>
                    <label className="fw-bold">Capacity / Size</label>
                    <Input
                      value={specifications.capacity || ""}
                      onChange={(e) => handleSpecChange("capacity", e.target.value)}
                    />
                  </Col>
                  <Col md={4}>
                    <label className="fw-bold">Energy Star Rating</label>
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
                    <label className="fw-bold">Power Consumption</label>
                    <Input
                      value={specifications.power_consumption || ""}
                      onChange={(e) => handleSpecChange("power_consumption", e.target.value)}
                    />
                  </Col>
                  <Col md={4}>
                    <label className="fw-bold">Color / Body Finish</label>
                    <Input
                      value={specifications.color_finish || ""}
                      onChange={(e) => handleSpecChange("color_finish", e.target.value)}
                    />
                  </Col>
                  <Col md={4}>
                    <label className="fw-bold">Warranty Period</label>
                    <Input
                      value={specifications.warranty || ""}
                      onChange={(e) => handleSpecChange("warranty", e.target.value)}
                    />
                  </Col>
                </>
              )}

              {/* 📱 MOBILES SPECIFICATION FIELDS */}
              {product.product_type === "mobiles" && (
                <>
                  <Col xs={12} className="mt-2">
                    <div className="border-bottom pb-2 mb-1">
                      <span className="fw-bold text-dark fs-6">📱 Mobile Specifications</span>
                    </div>
                  </Col>
                  <Col md={3}>
                    <label className="fw-bold">Model Name / Number</label>
                    <Input
                      value={specifications.model_number || ""}
                      onChange={(e) => handleSpecChange("model_number", e.target.value)}
                    />
                  </Col>
                  <Col md={3}>
                    <label className="fw-bold">RAM</label>
                    <Input
                      value={specifications.ram || ""}
                      onChange={(e) => handleSpecChange("ram", e.target.value)}
                    />
                  </Col>
                  <Col md={3}>
                    <label className="fw-bold">ROM</label>
                    <Input
                      value={specifications.rom || ""}
                      onChange={(e) => handleSpecChange("rom", e.target.value)}
                    />
                  </Col>
                  <Col md={3}>
                    <label className="fw-bold">Color</label>
                    <Input
                      value={specifications.color || ""}
                      onChange={(e) => handleSpecChange("color", e.target.value)}
                    />
                  </Col>
                  <Col md={3}>
                    <label className="fw-bold">Front Camera</label>
                    <Input
                      value={specifications.front_camera || ""}
                      onChange={(e) => handleSpecChange("front_camera", e.target.value)}
                    />
                  </Col>
                  <Col md={3}>
                    <label className="fw-bold">Back Camera</label>
                    <Input
                      value={specifications.back_camera || ""}
                      onChange={(e) => handleSpecChange("back_camera", e.target.value)}
                    />
                  </Col>
                  <Col md={3}>
                    <label className="fw-bold">Battery Capacity</label>
                    <Input
                      value={specifications.battery || ""}
                      onChange={(e) => handleSpecChange("battery", e.target.value)}
                    />
                  </Col>
                  <Col md={3}>
                    <label className="fw-bold">Screen / Display Size</label>
                    <Input
                      value={specifications.display_size || ""}
                      onChange={(e) => handleSpecChange("display_size", e.target.value)}
                    />
                  </Col>
                  <Col md={6}>
                    <label className="fw-bold">Processor / OS</label>
                    <Input
                      value={specifications.processor_os || ""}
                      onChange={(e) => handleSpecChange("processor_os", e.target.value)}
                    />
                  </Col>
                  <Col md={6}>
                    <label className="fw-bold">Warranty</label>
                    <Input
                      value={specifications.warranty || ""}
                      onChange={(e) => handleSpecChange("warranty", e.target.value)}
                    />
                  </Col>
                </>
              )}
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
    </>
  );
}
