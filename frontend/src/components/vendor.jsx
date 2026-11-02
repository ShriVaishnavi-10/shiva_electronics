import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  Button,
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  Form,
  FormGroup,
  Label,
  Input,
  Badge,
} from "reactstrap";
import { FaPlus, FaStore, FaTrash, FaEdit, FaSearch, FaEye } from "react-icons/fa";
import { toast } from "react-toastify";
import Delete from "../assets/index/Delete Animation.gif";

import { apiUrl } from "../config/urls";

const API = apiUrl("vendors");

const emptyForm = {
  company_name: "",
  mobile: "",
  email: "",
  address: "",
  pincode: "",
  gst_no: "",
  vendor_type: "",
  status: "Active",
  bank_name: "",
  account_number: "",
  ifsc_code: "",
  bank_branch: "",
  upi_id: "",
  opening_balance: "",
};

export default function Vendor() {
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);

  const [vendors, setVendors] = useState([]);
  const [editId, setEditId] = useState(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / limit);

  const [form, setForm] = useState(emptyForm);

  const fetchVendors = async () => {
    const res = await axios.get(API, { params: { search, page, limit } });
    setVendors(res.data.data);
    setTotal(res.data.total);
  };

  useEffect(() => {
    fetchVendors();
  }, [search, page, limit]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.company_name) return "Company Name required";
    if (!form.mobile) return "Mobile required";
    if (!/^[6-9]\d{9}$/.test(form.mobile)) return "Invalid mobile number";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);

    try {
      if (editId) {
        await axios.put(`${API}/${editId}`, form);
        toast.success("Vendor Updated");
      } else {
        const createPayload = {
          company_name: form.company_name,
          mobile: form.mobile,
          email: form.email || "",
          address: form.address,
          pincode: form.pincode || "",
          gst_no: form.gst_no,
          vendor_type: form.vendor_type || "",
          status: form.status || "Active",
          bank_name: form.bank_name || "",
          account_number: form.account_number || "",
          ifsc_code: form.ifsc_code || "",
          bank_branch: form.bank_branch || "",
          upi_id: form.upi_id || "",
          opening_balance: form.opening_balance || "",
        };
        await axios.post(API, createPayload);
        toast.success("Vendor Added");
      }

      fetchVendors();
      setModal(false);
      setEditId(null);
      setForm(emptyForm);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error");
    }
  };

  const handleEdit = (row) => {
    setForm({
      company_name: row.company_name || "",
      mobile: row.mobile || "",
      email: row.email || "",
      address: row.address || "",
      pincode: row.pincode || "",
      gst_no: row.gst_no || "",
      vendor_type: row.vendor_type || "",
      status: row.status || "Active",
      bank_name: row.bank_name || "",
      account_number: row.account_number || "",
      ifsc_code: row.ifsc_code || "",
      bank_branch: row.bank_branch || "",
      upi_id: row.upi_id || "",
      opening_balance: row.opening_balance || "",
    });
    setEditId(row.id);
    setModal(true);
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setDeleteModal(true);
  };

  const handleView = (row) => {
    setViewRow(row);
    setViewModal(true);
  };

  const toggleBulk = () => {
    setBulkModal((v) => !v);
    setBulkFile(null);
    setBulkResult(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await axios.get(`${API}/template`, { responseType: "blob" });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vendor_bulk_template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Template downloaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download template");
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return toast.error("Please select Excel file");
    const fd = new FormData();
    fd.append("file", bulkFile);
    setUploadingBulk(true);
    try {
      const res = await axios.post(`${API}/bulk-upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setBulkResult(res.data);
      toast.success("Vendor bulk upload completed");
      fetchVendors();
    } catch (err) {
      const data = err.response?.data;
      if (data) setBulkResult(data);
      toast.error(data?.message || "Bulk upload failed");
    } finally {
      setUploadingBulk(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/${deleteId}`);
      toast.success("Vendor Deleted");
      fetchVendors();
    } catch (err) {
      toast.error("Delete failed");
    }
    setDeleteModal(false);
  };

  return (
    <Container fluid className="p-3">

      <Card className="shadow">
        <CardBody>
          {/* HEADER */}
          <div className="d-flex flex-column flex-sm-row justify-content-between mb-3 gap-2">
            <CardTitle tag="h5">
              <FaStore className="me-2" /> Vendor Management
            </CardTitle>
            <div className="d-flex gap-2">
              <Button color="success" onClick={toggleBulk}>
                Bulk Upload
              </Button>
              <Button
                color="primary"
                onClick={() => {
                  setForm(emptyForm);
                  setEditId(null);
                  setModal(true);
                }}
              >
                <FaPlus /> Add Vendor
              </Button>
            </div>
          </div>

          {/* SEARCH + LIMIT */}
          <Row className="mb-3 g-3">
            <Col md={6} className="d-flex align-items-center gap-2">
              <span>Show</span>
              <Input
                type="select"
                style={{ width: 90 }}
                value={limit}
                onChange={(e) => {
                  setLimit(+e.target.value);
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </Input>
              <span>entries</span>
            </Col>

            <Col md={6} className="d-flex justify-content-md-end justify-content-start">
              <div className="d-flex align-items-center gap-2">
                <FaSearch />
                <Input
                  placeholder="Search vendor / company / mobile / GST"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  style={{ maxWidth: 260, width: "100%" }}
                />
              </div>
            </Col>
          </Row>

          {/* TABLE */}
          <Table bordered hover responsive>
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Company</th>
                <th>Vendor Type</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>Address</th>
                <th>Pincode</th>
                <th>GST</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center text-muted">
                    No records found
                  </td>
                </tr>
              ) : (
                vendors.map((v, i) => (
                  <tr key={v.id}>
                    <td>{(page - 1) * limit + i + 1}</td>
                    <td>{v.company_name}</td>
                    <td>{v.vendor_type || "-"}</td>
                    <td>{v.mobile}</td>
                    <td>{v.email}</td>
                    <td>{v.address}</td>
                    <td>{v.pincode}</td>
                    <td>{v.gst_no}</td>
                    <td>{v.status || "Active"}</td>
                    <td className="d-flex gap-1 flex-wrap justify-content-center">
                      <Button
                        size="sm"
                        color="secondary"
                        className="me-1"
                        onClick={() => handleView(v)}
                        title="View"
                      >
                        <FaEye />
                      </Button>
                      <Button
                        size="sm"
                        color="warning"
                        className="me-1"
                        onClick={() => handleEdit(v)}
                      >
                        <FaEdit />
                      </Button>{" "}
                      <Button
                        size="sm"
                        color="danger"
                        onClick={() => confirmDelete(v.id)}
                      >
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>

          {/* PAGINATION */}
          <Row className="align-items-center g-3">
            <Col md={6}>
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, total)} of {total} entries
            </Col>

            <Col md={6} className="d-flex justify-content-center justify-content-md-end gap-1 flex-wrap">
              <Button
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Prev
              </Button>
              {[...Array(totalPages)].map((_, i) => (
                <Button
                  key={i}
                  size="sm"
                  color={page === i + 1 ? "primary" : "secondary"}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={modal}
        toggle={() => setModal(false)}
        size="xl"
        centered
        style={{ maxWidth: "1080px", width: "95%" }}
      >
        <ModalHeader toggle={() => setModal(false)} className="py-2 px-3 border-bottom">
          <span className="fw-bold fs-5 text-dark">{editId ? "Edit Vendor" : "Add Vendor"}</span>
        </ModalHeader>
        <ModalBody className="p-3">
          <Form onSubmit={handleSubmit}>
            <Row className="g-2">
              <Col lg={3} md={6}>
                <FormGroup className="mb-2">
                  <Label className="fw-semibold small mb-1">Company Name *</Label>
                  <Input
                    bsSize="sm"
                    name="company_name"
                    value={form.company_name}
                    onChange={handleChange}
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
                    value={form.vendor_type}
                    onChange={handleChange}
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
                    value={form.mobile}
                    onChange={handleChange}
                    placeholder="10-digit mobile"
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
                    value={form.email}
                    onChange={handleChange}
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
                    value={form.gst_no}
                    onChange={handleChange}
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
                    value={form.pincode}
                    onChange={handleChange}
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
                    value={form.status}
                    onChange={handleChange}
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
                    value={form.opening_balance}
                    onChange={handleChange}
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
                    value={form.address}
                    onChange={handleChange}
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
                    value={form.bank_name}
                    onChange={handleChange}
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
                    value={form.account_number}
                    onChange={handleChange}
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
                    value={form.ifsc_code}
                    onChange={handleChange}
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
                    value={form.bank_branch}
                    onChange={handleChange}
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
                    value={form.upi_id}
                    onChange={handleChange}
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
                onClick={() => setModal(false)}
                style={{ height: "34px", borderRadius: "6px" }}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                size="sm"
                type="submit"
                className="px-4 fw-bold shadow-sm"
                style={{
                  height: "34px",
                  borderRadius: "6px",
                  backgroundColor: "#0d6efd",
                  borderColor: "#0d6efd",
                  color: "#FFFFFF",
                }}
              >
                {editId ? "Update" : "Save"}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>

      <Modal isOpen={viewModal} toggle={() => setViewModal(false)} size="md">
        <ModalHeader toggle={() => setViewModal(false)}>Vendor Details</ModalHeader>
        <ModalBody>
          {viewRow ? (
            <Table bordered size="sm" className="mb-0">
              <tbody>
                <tr><th style={{ width: 170 }}>Company</th><td>{viewRow.company_name || "-"}</td></tr>
                <tr><th>Mobile</th><td>{viewRow.mobile || "-"}</td></tr>
                <tr><th>Email</th><td>{viewRow.email || "-"}</td></tr>
                <tr><th>Address</th><td>{viewRow.address || "-"}</td></tr>
                <tr><th>Pincode</th><td>{viewRow.pincode || "-"}</td></tr>
                <tr><th>GST</th><td>{viewRow.gst_no || "-"}</td></tr>
                <tr><th>Vendor Type</th><td>{viewRow.vendor_type || "-"}</td></tr>
                <tr><th>Status</th><td>{viewRow.status || "Active"}</td></tr>
                <tr><th className="table-secondary" colSpan="2">Bank Details</th></tr>
                <tr><th>Bank Name</th><td>{viewRow.bank_name || "-"}</td></tr>
                <tr><th>Account Number</th><td>{viewRow.account_number || "-"}</td></tr>
                <tr><th>IFSC Code</th><td>{viewRow.ifsc_code || "-"}</td></tr>
                <tr><th>Branch</th><td>{viewRow.bank_branch || "-"}</td></tr>
                <tr><th>UPI ID</th><td>{viewRow.upi_id || "-"}</td></tr>
                <tr><th>Opening Balance</th><td>{viewRow.opening_balance || "-"}</td></tr>
              </tbody>
            </Table>
          ) : (
            <p className="text-muted mb-0">No data found</p>
          )}
        </ModalBody>
      </Modal>

      <Modal isOpen={bulkModal} toggle={toggleBulk} size="lg">
        <ModalHeader toggle={toggleBulk}>Vendor Bulk Upload</ModalHeader>
        <ModalBody>
          <div className="mb-3 d-flex align-items-center gap-2">
            <Button color="info" onClick={handleDownloadTemplate}>
              Download Excel Template
            </Button>
            <Badge color="warning" className="text-dark">
              Mandatory: company_name, mobile
            </Badge>
          </div>

          <div className="mb-3">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
            />
          </div>

          {bulkFile && (
            <p className="text-muted mb-3">
              Selected file: <strong>{bulkFile.name}</strong>
            </p>
          )}

          <div className="text-end">
            <Button color="secondary" className="me-2" onClick={toggleBulk}>
              Cancel
            </Button>
            <Button color="primary" onClick={handleBulkUpload} disabled={uploadingBulk}>
              {uploadingBulk ? "Uploading..." : "Upload"}
            </Button>
          </div>

          {bulkResult && (
            <div className="mt-4">
              <h6>Upload Result</h6>
              <p className="mb-1">Success: {bulkResult.success_count || 0}</p>
              <p className="mb-2">Failed: {bulkResult.error_count || 0}</p>
              {Array.isArray(bulkResult.errors) && bulkResult.errors.length > 0 && (
                <Table bordered size="sm">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResult.errors.map((e, idx) => (
                      <tr key={idx}>
                        <td>{e.row}</td>
                        <td>{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          )}
        </ModalBody>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} centered>
        <ModalBody className="text-center">
          <img src={Delete} alt="delete" width="200" />
          <h5 className="mt-3">Are you sure?</h5>
          <p>This action cannot be undone.</p>
          <div className="d-flex justify-content-center gap-3 mt-3">
            <Button color="secondary" onClick={() => setDeleteModal(false)}>
              Cancel
            </Button>
            <Button color="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </ModalBody>
      </Modal>
    </Container>
  );
}
