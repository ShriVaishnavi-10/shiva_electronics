import React, { useEffect, useMemo, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";
import axios from "axios";
import { toast } from "react-toastify";
import { FaPlus, FaTrash, FaEllipsisV, FaFileInvoice } from "react-icons/fa";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import DemoDeliveryChallan from "./DemoDeliveryChallan";

import { apiUrl } from "../config/urls";

const API = apiUrl();
const CUSTOMER_API = apiUrl("customers");
const PRODUCT_API = apiUrl("products");
const DEMO_QTN_API = apiUrl("demo-quotations");
const SETTINGS_API = apiUrl("settings/company");

const getToday = () => new Date().toISOString().split("T")[0];

const emptyItem = {
  product_id: null,
  product_name: "",
  thickness: "",
  width: "",
  height: "",
  sqft: "",
  qty: "",
  rate: "",
  total: 0,
};

const emptyForm = {
  quotation_no: "",
  quotation_date: getToday(),
  valid_till_date: "",
  reference: "",
  customer_id: null,
  customer_name: "",
  contact_no: "",
  alternate_no: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  gst_type: "exclusive",
  gst_percent: 18,
  terms_and_conditions: "",
  notes: "",
};

export default function NewDemoQuotations() {
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([emptyItem]);

  const [editingId, setEditingId] = useState(null);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerCard, setShowCustomerCard] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [showProductCard, setShowProductCard] = useState(false);

  const [listSearch, setListSearch] = useState("");
  const [listRows, setListRows] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const [menuOpenId, setMenuOpenId] = useState(null);
  const [convertModalId, setConvertModalId] = useState(null);
  const [dcViewData, setDcViewData] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);

  const summary = useMemo(() => {
    const normalized = items.map((it) => {
      const qty = Number(it.qty || 0);
      const sqft = Number(it.sqft || 0);
      const rate = Number(it.rate || 0);
      const total = Number((qty * sqft * rate).toFixed(2));
      return { ...it, qty, sqft, rate, total };
    });

    const rawSubtotal = normalized.reduce(
      (s, it) => s + Number(it.total || 0),
      0,
    );
    const subtotal = Number(rawSubtotal.toFixed(2));
    const gstPercent = Number(form.gst_percent || 0);

    let taxable = subtotal;
    let gstTotal = 0;
    let grand = subtotal;
    if (form.gst_type === "inclusive") {
      gstTotal =
        subtotal > 0 ? (subtotal * gstPercent) / (100 + gstPercent) : 0;
      taxable = subtotal - gstTotal;
      grand = subtotal;
    } else {
      gstTotal = subtotal * (gstPercent / 100);
      taxable = subtotal;
      grand = subtotal + gstTotal;
    }

    gstTotal = Number(gstTotal.toFixed(2));
    taxable = Number(taxable.toFixed(2));
    grand = Number(grand.toFixed(2));
    const cgst = Number((gstTotal / 2).toFixed(2));
    const sgst = Number((gstTotal / 2).toFixed(2));

    return { normalized, taxable, cgst, sgst, gstTotal, grand };
  }, [items, form.gst_type, form.gst_percent]);

  const loadList = async () => {
    setLoadingList(true);
    try {
      const res = await axios.get(DEMO_QTN_API, {
        params: { search: listSearch || undefined, page: 1, limit: 100 },
      });
      setListRows(res.data.data || []);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load quotations list",
      );
    } finally {
      setLoadingList(false);
    }
  };

  const loadCompany = async () => {
    try {
      const res = await axios.get(SETTINGS_API);
      setCompanyInfo(res.data || null);
    } catch (err) {
      console.error(
        "Failed to load company settings",
        err.response?.data || err,
      );
    }
  };

  useEffect(() => {
    loadList();
    loadCompany();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!customerSearch.trim()) {
        setCustomerResults([]);
        setShowCustomerCard(false);
        return;
      }
      try {
        const res = await axios.get(CUSTOMER_API, {
          params: { search: customerSearch, all: "true" },
        });
        setCustomerResults(res.data.data || []);
        setShowCustomerCard(true);
      } catch (err) {
        setCustomerResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [customerSearch]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!productSearch.trim()) {
        setProductResults([]);
        setShowProductCard(false);
        return;
      }
      try {
        const res = await axios.get(`${PRODUCT_API}/search`, {
          params: { q: productSearch },
        });
        setProductResults(res.data || []);
        setShowProductCard(true);
      } catch (err) {
        setProductResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [productSearch]);

  const selectCustomer = (c) => {
    setForm((prev) => ({
      ...prev,
      customer_id: c.id,
      customer_name: c.customer_name || "",
      contact_no: c.contact_no || "",
      alternate_no: c.alternate_no || "",
      address: c.address || "",
      city: c.city || "",
      state: c.state || "",
      country: c.country || "India",
      pincode: c.pincode || "",
    }));
    setCustomerSearch(c.customer_name || "");
    setShowCustomerCard(false);
  };

  const selectProduct = (p) => {
    const sqft =
      p.sqft || (Number(p.length || 0) * Number(p.width || 0)).toFixed(2) || "";
    setItems((prev) => [
      ...prev,
      {
        product_id: p.id,
        product_name: p.product_name || "",
        thickness: p.thickness || "",
        width: p.width || "",
        height: p.length || "",
        sqft,
        qty: 1,
        rate: "",
        total: 0,
      },
    ]);
    setProductSearch("");
    setShowProductCard(false);
  };

  const updateItem = (index, key, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      const qty = Number(copy[index].qty || 0);
      const sqft = Number(copy[index].sqft || 0);
      const rate = Number(copy[index].rate || 0);
      copy[index].total = Number((qty * sqft * rate).toFixed(2));
      return copy;
    });
  };

  const addBillRow = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeBillRow = (index) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const resetForm = () => {
    setForm(emptyForm);
    setItems([emptyItem]);
    setEditingId(null);
    setCustomerSearch("");
    setProductSearch("");
  };

  const validateBeforeSave = () => {
    if (!form.customer_name.trim()) return "Customer name is required";
    if (!form.contact_no.trim()) return "Contact no is required";
    if (!form.quotation_date) return "Quotation date is required";

    const validRows = summary.normalized.filter((it) =>
      String(it.product_name || "").trim(),
    );
    if (!validRows.length) return "At least one product row is required";

    const invalidQty = validRows.find((it) => Number(it.qty || 0) <= 0);
    if (invalidQty) return "Qty should be greater than zero in all rows";

    return "";
  };

  const handleSave = async () => {
    const error = validateBeforeSave();
    if (error) {
      toast.error(error);
      return;
    }

    const payload = {
      ...form,
      gst_percent: Number(form.gst_percent || 18),
      subtotal: summary.taxable,
      cgst_amount: summary.cgst,
      sgst_amount: summary.sgst,
      gst_total: summary.gstTotal,
      grand_total: summary.grand,
      items: summary.normalized
        .filter((it) => String(it.product_name || "").trim())
        .map((it) => ({
          product_id: it.product_id || null,
          product_name: it.product_name,
          thickness: it.thickness,
          width: it.width,
          height: it.height,
          sqft: Number(it.sqft || 0),
          qty: Number(it.qty || 0),
          rate: Number(it.rate || 0),
          total: Number(it.total || 0),
        })),
    };

    try {
      if (editingId) {
        const res = await axios.put(`${DEMO_QTN_API}/${editingId}`, payload);
        toast.success(res.data.message || "Updated successfully");
      } else {
        const res = await axios.post(DEMO_QTN_API, payload);
        toast.success(res.data.message || "Saved successfully");
      }
      resetForm();
      loadList();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save quotation");
    }
  };

  const handleEdit = async (id) => {
    try {
      const res = await axios.get(`${DEMO_QTN_API}/${id}`);
      const q = res.data;
      setEditingId(q.id);
      setForm({
        quotation_no: q.quotation_no || "",
        quotation_date: q.quotation_date
          ? String(q.quotation_date).slice(0, 10)
          : getToday(),
        valid_till_date: q.valid_till_date
          ? String(q.valid_till_date).slice(0, 10)
          : "",
        reference: q.reference || "",
        customer_id: q.customer_id || null,
        customer_name: q.customer_name || "",
        contact_no: q.contact_no || "",
        alternate_no: q.alternate_no || "",
        address: q.address || "",
        city: q.city || "",
        state: q.state || "",
        country: q.country || "India",
        pincode: q.pincode || "",
        gst_type: q.gst_type || "exclusive",
        gst_percent: Number(q.gst_percent || 18),
        terms_and_conditions: q.terms_and_conditions || "",
        notes: q.notes || "",
      });
      setItems(
        (q.items || []).map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name || "",
          thickness: it.thickness || "",
          width: it.width || "",
          height: it.height || "",
          sqft: it.sqft || "",
          qty: it.qty || "",
          rate: it.rate || "",
          total: it.total || 0,
        })),
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load quotation");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quotation?")) return;
    try {
      const res = await axios.delete(`${DEMO_QTN_API}/${id}`);
      toast.success(res.data.message || "Deleted successfully");
      loadList();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete quotation");
    }
  };

  const handleConvertToDc = async () => {
    if (!convertModalId) return;
    try {
      const res = await axios.post(
        `${DEMO_QTN_API}/${convertModalId}/convert-dc`,
      );
      toast.success(res.data.message || "Converted to DC");
      setConvertModalId(null);
      loadList();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to convert to DC");
    }
  };

  const openDcView = async (id) => {
    try {
      const res = await axios.get(`${DEMO_QTN_API}/${id}`);
      if (Number(res.data.is_dc) !== 1) {
        toast.error("This quotation is not converted to DC yet");
        return;
      }
      setDcViewData(res.data);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load delivery challan",
      );
    }
  };

  return (
    <Container fluid className="p-4">
      <h4 className="mb-3">
        {editingId ? "Edit Demo Quotation" : "New Demo Quotation"}
      </h4>

      <Card className="mb-3">
        <CardHeader>Quotation Details</CardHeader>
        <CardBody>
          <Row className="g-3">
            <Col md={3}>
              <Label>Quotation No</Label>
              <Input
                value={form.quotation_no}
                onChange={(e) =>
                  setForm((p) => ({ ...p, quotation_no: e.target.value }))
                }
              />
            </Col>
            <Col md={3}>
              <Label>
                Quotation Date <span className="text-danger">*</span>
              </Label>
              <Input
                type="date"
                value={form.quotation_date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, quotation_date: e.target.value }))
                }
              />
            </Col>
            <Col md={3}>
              <Label>Valid Till</Label>
              <Input
                type="date"
                value={form.valid_till_date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, valid_till_date: e.target.value }))
                }
              />
            </Col>
            <Col md={3}>
              <Label>Reference</Label>
              <Input
                value={form.reference}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reference: e.target.value }))
                }
              />
            </Col>
          </Row>
        </CardBody>
      </Card>

      <Card className="mb-3">
        <CardHeader>Customer Details</CardHeader>
        <CardBody>
          <Row className="g-3">
            <Col md={12} className="position-relative">
              <Label>Search Customer</Label>
              <Input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customer name / contact"
              />
              {showCustomerCard && (
                <Card
                  className="position-absolute w-100 shadow mt-1"
                  style={{ zIndex: 10, maxHeight: 200, overflowY: "auto" }}
                >
                  <CardBody className="p-2">
                    {customerResults.length ? (
                      customerResults.map((c) => (
                        <div
                          key={c.id}
                          className="p-2 border-bottom"
                          style={{ cursor: "pointer" }}
                          onClick={() => selectCustomer(c)}
                        >
                          <strong>{c.customer_name}</strong>
                          <br />
                          <small>{c.contact_no}</small>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted text-center p-2">
                        No customers
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}
            </Col>

            <Col md={4}>
              <Label>
                Customer Name <span className="text-danger">*</span>
              </Label>
              <Input
                value={form.customer_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, customer_name: e.target.value }))
                }
              />
            </Col>
            <Col md={4}>
              <Label>
                Contact No <span className="text-danger">*</span>
              </Label>
              <Input
                value={form.contact_no}
                onChange={(e) =>
                  setForm((p) => ({ ...p, contact_no: e.target.value }))
                }
              />
            </Col>
            <Col md={4}>
              <Label>Alternate No</Label>
              <Input
                value={form.alternate_no}
                onChange={(e) =>
                  setForm((p) => ({ ...p, alternate_no: e.target.value }))
                }
              />
            </Col>
            <Col md={12}>
              <Label>Address</Label>
              <Input
                type="textarea"
                rows="2"
                value={form.address}
                onChange={(e) =>
                  setForm((p) => ({ ...p, address: e.target.value }))
                }
              />
            </Col>
            <Col md={3}>
              <Label>Pincode</Label>
              <Input
                value={form.pincode}
                onChange={(e) =>
                  setForm((p) => ({ ...p, pincode: e.target.value }))
                }
              />
            </Col>
            <Col md={3}>
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(e) =>
                  setForm((p) => ({ ...p, city: e.target.value }))
                }
              />
            </Col>
            <Col md={3}>
              <Label>State</Label>
              <Input
                value={form.state}
                onChange={(e) =>
                  setForm((p) => ({ ...p, state: e.target.value }))
                }
              />
            </Col>
            <Col md={3}>
              <Label>Country</Label>
              <Input
                value={form.country}
                onChange={(e) =>
                  setForm((p) => ({ ...p, country: e.target.value }))
                }
              />
            </Col>
          </Row>
        </CardBody>
      </Card>

      <Card className="mb-3">
        <CardHeader>Product Details</CardHeader>
        <CardBody>
          <Row className="g-3 align-items-end">
            <Col md={10} className="position-relative">
              <Label>Search Product</Label>
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search product name / category / subcategory"
              />
              {showProductCard && (
                <Card
                  className="position-absolute w-100 shadow mt-1"
                  style={{ zIndex: 10, maxHeight: 200, overflowY: "auto" }}
                >
                  <CardBody className="p-2">
                    {productResults.length ? (
                      productResults.map((p) => (
                        <div
                          key={p.id}
                          className="p-2 border-bottom"
                          style={{ cursor: "pointer" }}
                          onClick={() => selectProduct(p)}
                        >
                          <strong>{p.product_name}</strong>
                          <br />
                          <small>
                            {p.category_name}
                            {p.subcategory_name
                              ? ` -> ${p.subcategory_name}`
                              : ""}
                          </small>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted text-center p-2">
                        No products
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}
            </Col>
            <Col md={2}>
              <Button color="primary" className="w-100" onClick={addBillRow}>
                <FaPlus className="me-1" /> Add Bill
              </Button>
            </Col>
          </Row>

          <div className="mt-3 table-responsive">
            <Table bordered size="sm" className="align-middle text-center">
              <thead className="table-light">
                <tr>
                  <th>S.No</th>
                  <th>
                    Product Name <span className="text-danger">*</span>
                  </th>
                  <th>Thickness</th>
                  <th>Width</th>
                  <th>Height</th>
                  <th>Sqft</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      <Input
                        bsSize="sm"
                        value={it.product_name}
                        onChange={(e) =>
                          updateItem(i, "product_name", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <Input
                        bsSize="sm"
                        value={it.thickness || ""}
                        onChange={(e) =>
                          updateItem(i, "thickness", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <Input
                        bsSize="sm"
                        type="number"
                        step="any"
                        value={it.width || ""}
                        onChange={(e) => updateItem(i, "width", e.target.value)}
                      />
                    </td>
                    <td>
                      <Input
                        bsSize="sm"
                        type="number"
                        step="any"
                        value={it.height || ""}
                        onChange={(e) =>
                          updateItem(i, "height", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <Input
                        bsSize="sm"
                        type="number"
                        step="any"
                        value={it.sqft || ""}
                        onChange={(e) => updateItem(i, "sqft", e.target.value)}
                      />
                    </td>
                    <td>
                      <Input
                        bsSize="sm"
                        type="number"
                        step="any"
                        value={it.qty || ""}
                        onChange={(e) => updateItem(i, "qty", e.target.value)}
                      />
                    </td>
                    <td>
                      <Input
                        bsSize="sm"
                        type="number"
                        step="any"
                        value={it.rate || ""}
                        onChange={(e) => updateItem(i, "rate", e.target.value)}
                      />
                    </td>
                    <td className="fw-bold">
                      ₹ {Number(it.total || 0).toFixed(2)}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        color="danger"
                        outline
                        onClick={() => removeBillRow(i)}
                      >
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>

      <Card className="mb-3">
        <CardHeader>GST & Total</CardHeader>
        <CardBody>
          <Row className="g-3">
            <Col md={3}>
              <Label>GST Type</Label>
              <Input
                type="select"
                value={form.gst_type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, gst_type: e.target.value }))
                }
              >
                <option value="exclusive">Exclusive GST</option>
                <option value="inclusive">Inclusive GST</option>
              </Input>
            </Col>
            <Col md={3}>
              <Label>GST %</Label>
              <Input
                type="select"
                value={form.gst_percent}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    gst_percent: Number(e.target.value),
                  }))
                }
              >
                <option value={18}>18%</option>
                <option value={12}>12%</option>
                <option value={5}>5%</option>
                <option value={28}>28%</option>
              </Input>
            </Col>
            <Col md={3}>
              <Label>CGST</Label>
              <Input readOnly value={`₹ ${summary.cgst.toFixed(2)}`} />
            </Col>
            <Col md={3}>
              <Label>SGST</Label>
              <Input readOnly value={`₹ ${summary.sgst.toFixed(2)}`} />
            </Col>
            <Col md={3}>
              <Label>Taxable Amount</Label>
              <Input readOnly value={`₹ ${summary.taxable.toFixed(2)}`} />
            </Col>
            <Col md={3}>
              <Label>GST Total</Label>
              <Input readOnly value={`₹ ${summary.gstTotal.toFixed(2)}`} />
            </Col>
            <Col md={3}>
              <Label>Grand Total</Label>
              <Input
                readOnly
                className="fw-bold"
                value={`₹ ${summary.grand.toFixed(2)}`}
              />
            </Col>
          </Row>
        </CardBody>
      </Card>

      <Card className="mb-3">
        <CardHeader>Terms & Notes</CardHeader>
        <CardBody>
          <Row className="g-3">
            <Col md={6}>
              <Label>Terms & Conditions</Label>
              <Input
                type="textarea"
                rows="3"
                value={form.terms_and_conditions}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    terms_and_conditions: e.target.value,
                  }))
                }
              />
            </Col>
            <Col md={6}>
              <Label>Notes</Label>
              <Input
                type="textarea"
                rows="3"
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
              />
            </Col>
          </Row>
          <div className="mt-3 d-flex gap-2">
            <Button color="success" onClick={handleSave}>
              Save
            </Button>
            <Button color="secondary" outline onClick={resetForm}>
              Reset
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Demo Quotations List</CardHeader>
        <CardBody>
          <Row className="g-2 mb-3">
            <Col md={4}>
              <Input
                placeholder="Search quotation / customer / contact"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Button color="primary" onClick={loadList}>
                Search
              </Button>
            </Col>
          </Row>

          <Table bordered hover responsive size="sm" className="align-middle">
            <thead className="table-light">
              <tr>
                <th>S.No</th>
                <th>Quotation No</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Date</th>
                <th>Total</th>
                <th>DC</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr>
                  <td colSpan="8" className="text-center">
                    Loading...
                  </td>
                </tr>
              ) : listRows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center text-muted">
                    No records found
                  </td>
                </tr>
              ) : (
                listRows.map((row, idx) => (
                  <tr key={row.id}>
                    <td>{idx + 1}</td>
                    <td>{row.quotation_no || "-"}</td>
                    <td>{row.customer_name}</td>
                    <td>{row.contact_no}</td>
                    <td>
                      {row.quotation_date
                        ? String(row.quotation_date).slice(0, 10)
                        : "-"}
                    </td>
                    <td>₹ {Number(row.grand_total || 0).toFixed(2)}</td>
                    <td>{Number(row.is_dc) === 1 ? "Yes" : "No"}</td>
                    <td className="d-flex align-items-center gap-2">
                      <Button
                        size="sm"
                        color="warning"
                        onClick={() => handleEdit(row.id)}
                        title="Edit"
                      >
                        <FiEdit />
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        onClick={() => handleDelete(row.id)}
                        title="Delete"
                      >
                        <FiTrash2 />
                      </Button>
                      <Button
                        size="sm"
                        color={
                          Number(row.is_dc) === 1 ? "success" : "secondary"
                        }
                        outline={Number(row.is_dc) !== 1}
                        onClick={() => openDcView(row.id)}
                        title="Delivery Challan"
                      >
                        <FaFileInvoice />
                      </Button>
                      <Dropdown
                        isOpen={menuOpenId === row.id}
                        toggle={() =>
                          setMenuOpenId((prev) =>
                            prev === row.id ? null : row.id,
                          )
                        }
                      >
                        <DropdownToggle size="sm" color="light">
                          <FaEllipsisV />
                        </DropdownToggle>
                        <DropdownMenu end>
                          <DropdownItem
                            disabled={Number(row.is_dc) === 1}
                            onClick={() => setConvertModalId(row.id)}
                          >
                            Convert to DC
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={!!convertModalId} toggle={() => setConvertModalId(null)} centered>
        <ModalHeader
          toggle={() => setConvertModalId(null)}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setConvertModalId(null)}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <span className="fw-bold" style={{ color: "#FFD700" }}>Convert to Delivery Challan</span>
        </ModalHeader>
        <ModalBody className="p-4" style={{ backgroundColor: "#F8FAFC" }}>
          <p className="mb-4 text-dark">Are you sure you want to convert this quotation to DC?</p>
          <div className="d-flex justify-content-end gap-2">
            <Button color="secondary" outline size="sm" onClick={() => setConvertModalId(null)}>
              No, Cancel
            </Button>
            <Button
              size="sm"
              className="fw-bold px-3 shadow-sm"
              style={{
                background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                color: "#08090D",
                fontWeight: "800",
                border: "none",
              }}
              onClick={handleConvertToDc}
            >
              Yes, Convert
            </Button>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={!!dcViewData} toggle={() => setDcViewData(null)} size="xl" centered>
        <ModalHeader
          toggle={() => setDcViewData(null)}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setDcViewData(null)}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <span className="fw-bold" style={{ color: "#FFD700" }}>Delivery Challan</span>
        </ModalHeader>
        <ModalBody className="p-0">
          {dcViewData && (
            <DemoDeliveryChallan
              companyInfo={companyInfo}
              challanData={dcViewData}
            />
          )}
        </ModalBody>
      </Modal>
    </Container>
  );
}
