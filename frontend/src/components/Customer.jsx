import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Button,
  Table,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  Badge,
} from "reactstrap";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CustomerForm from "./CustomerForm";
import { apiUrl } from "../config/urls";

const API = apiUrl("customers");

const emptyCustomer = {
  name: "",
  contact: "",
  alternate: "",
  gst: "",
  address: "",
  pincode: "",
  city: "",
  country: "",
  opening_balance: "",
};

export default function CustomerList() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isNonUser = storedUser.role_name?.toLowerCase().includes("non user") || storedUser.role_id === 6;

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyCustomer);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const toggle = () => setModal(!modal);
  const toggleBulk = () => {
    setBulkModal((v) => !v);
    setBulkFile(null);
    setBulkResult(null);
  };

  const totalPages = Math.ceil(total / limit);

  // 🔹 Load customers (with pagination)
  const loadCustomers = async () => {
    try {
      const res = await axios.get(
        `${API}?page=${page}&limit=${limit}&search=${search}${isNonUser ? "&is_gst=0" : ""}`,
      );

      setCustomers(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      toast.error("Failed to load customers");
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search, page, limit]);

  // 🔹 Handle form change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🔹 Validation
  const validate = () => {
    // if (!form.name || !form.contact || !form.pincode || !form.address) {
    //   toast.error("Please fill mandatory fields");
    //   return false;
    // }
    if (!/^\d{10}$/.test(form.contact)) {
      toast.error("Invalid Contact Number");
      return false;
    }
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      toast.error("Invalid Pincode");
      return false;
    }
    if (form.gst && !/^[A-Za-z0-9]{1,15}$/.test(form.gst)) {
      toast.error("Invalid GST Number");
      return false;
    }
    return true;
  };

  // 🔹 Submit
  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      if (editId) {
        await axios.put(`${API}/${editId}`, {
          customer_name: form.name,
          contact_no: form.contact,
          alternate_no: form.alternate,
          gst_no: isNonUser ? null : (form.gst || null),
          pincode: form.pincode,
          address: form.address,
          city: form.city,
          country: form.country,
          opening_balance: form.opening_balance,
        });
        toast.success("Customer Updated Successfully");
      } else {
        await axios.post(API, {
          customer_name: form.name,
          contact_no: form.contact,
          alternate_no: form.alternate,
          gst_no: isNonUser ? null : (form.gst || null),
          pincode: form.pincode,
          address: form.address,
          city: form.city,
          country: form.country,
          opening_balance: form.opening_balance,
          is_gst: isNonUser ? 0 : 1,
        });
        toast.success("Customer Added Successfully");
      }

      toggle();
      setForm(emptyCustomer);
      setEditId(null);
      loadCustomers();
    } catch {
      toast.error("Server Error");
    }
  };

  // 🔹 Edit
  const handleEdit = (cust) => {
    setEditId(cust.id ?? cust.customer_id);
    setForm({
      name: cust.customer_name,
      contact: cust.contact_no,
      alternate: cust.alternate_no,
      gst: cust.gst_no || "",
      address: cust.address,
      pincode: cust.pincode,
      city: cust.city,
      state: "",
      country: cust.country,
      opening_balance: cust.opening_balance || "",
    });
    toggle();
  };

  const openDeleteConfirm = (cust) => {
    const id = cust.id ?? cust.customer_id;
    if (id == null) {
      toast.error("Cannot delete: missing customer id");
      return;
    }
    setDeleteTarget({ id, name: cust.customer_name || "this customer" });
    setDeleteModal(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteModal(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await axios.delete(`${API}/${deleteTarget.id}`);
      toast.success("Customer Deleted");
      closeDeleteConfirm();
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete Failed");
    }
  };

  const handleView = (cust) => {
    setViewCustomer(cust);
    setViewModal(true);
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
      a.download = "customer_bulk_template.xlsx";
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
    if (!bulkFile) {
      toast.error("Please choose Excel file");
      return;
    }
    const fd = new FormData();
    fd.append("file", bulkFile);
    setUploadingBulk(true);
    try {
      const res = await axios.post(`${API}/bulk-upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setBulkResult(res.data);
      toast.success("Customer bulk upload completed");
      loadCustomers();
    } catch (err) {
      const data = err.response?.data;
      if (data) setBulkResult(data);
      toast.error(data?.message || "Bulk upload failed");
    } finally {
      setUploadingBulk(false);
    }
  };

  return (
    <Container fluid className="p-3">

      <Row className="mb-3 align-items-center g-2 g-md-3">
        <Col xs={12} md={3}>
          <h4 className="mb-0">{isNonUser ? "Non-GST Customer List" : "Customer List"}</h4>
        </Col>

        <Col xs={4} sm={3} md={2}>
          <Input
            type="select"
            value={limit}
            onChange={(e) => {
              setLimit(+e.target.value);
              setPage(1);
            }}
          >
            <option value={25}>25</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </Input>
        </Col>

        <Col xs={8} sm={9} md={3}>
          <Input
            placeholder="Search name / number / city"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>

        <Col xs={12} md={4} className="text-md-end text-start d-flex gap-2 flex-wrap justify-content-md-end">
          {!isNonUser && (
            <Button color="success" className="me-1" onClick={toggleBulk}>
              Bulk Upload
            </Button>
          )}
          <Button
            color="primary"
            onClick={() => {
              setForm(emptyCustomer);
              setEditId(null);
              toggle();
            }}
          >
            {isNonUser ? "+ Add Non-GST Customer" : "+ Add Customer"}
          </Button>
        </Col>
      </Row>

      <Table responsive bordered hover>
        <thead className="table-light">
          <tr>
            <th>S.No</th>
            <th>Name</th>
            <th>Contact</th>
            <th>City</th>
            <th className="text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {customers.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center">
                No records
              </td>
            </tr>
          ) : (
            customers.map((c, i) => (
              <tr key={c.id ?? c.customer_id}>
                <td>{(page - 1) * limit + i + 1}</td>
                <td>{c.customer_name}</td>
                <td>{c.contact_no}</td>
                <td>{c.city}</td>
                <td className="text-center d-flex gap-1 justify-content-center flex-wrap">
                  <Button
                    size="sm"
                    color="secondary"
                    className="me-2"
                    onClick={() => handleView(c)}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    color="info"
                    className="me-2"
                    onClick={() => handleEdit(c)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    onClick={() => openDeleteConfirm(c)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 mt-3">
        <div>
          Showing {customers.length} of {total} entries
        </div>
        <div>
          <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Prev
          </Button>
          <span className="mx-3">
            Page {page} / {totalPages}
          </span>
          <Button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal isOpen={modal} toggle={toggle} size="lg" centered>
        <ModalHeader
          toggle={toggle}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={toggle}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <span className="fw-bold" style={{ color: "#FFD700" }}>
            {editId ? "Edit Customer" : "Add Customer"}
          </span>
        </ModalHeader>
        <ModalBody className="p-4" style={{ backgroundColor: "#F8FAFC" }}>
          <Form>
            <CustomerForm form={form} onChange={handleChange} />

            <div className="d-flex justify-content-end gap-2 pt-3 mt-3 border-top" style={{ borderColor: "#E2E8F0" }}>
              <Button color="secondary" outline size="sm" onClick={toggle}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
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

      <Modal isOpen={bulkModal} toggle={toggleBulk} size="lg">
        <ModalHeader toggle={toggleBulk}>Customer Bulk Upload</ModalHeader>
        <ModalBody>
          <div className="mb-3 d-flex align-items-center gap-2">
            <Button color="info" onClick={handleDownloadTemplate}>
              Download Excel Template
            </Button>
            <Badge color="warning" className="text-dark">
              Mandatory: customer_name, contact_no
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

      <Modal isOpen={deleteModal} toggle={closeDeleteConfirm} size="md">
        <ModalHeader toggle={closeDeleteConfirm}>Confirm delete</ModalHeader>
        <ModalBody>
          {deleteTarget ? (
            <p className="mb-0">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This cannot be
              undone.
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={closeDeleteConfirm}>
            Cancel
          </Button>
          <Button color="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={viewModal} toggle={() => setViewModal(false)} size="md">
        <ModalHeader toggle={() => setViewModal(false)}>Customer Details</ModalHeader>
        <ModalBody>
          {viewCustomer ? (
            <Table bordered size="sm" className="mb-0">
              <tbody>
                <tr>
                  <th style={{ width: 170 }}>Name</th>
                  <td>{viewCustomer.customer_name || "-"}</td>
                </tr>
                <tr>
                  <th>Contact No</th>
                  <td>{viewCustomer.contact_no || "-"}</td>
                </tr>
                <tr>
                  <th>Alternate No</th>
                  <td>{viewCustomer.alternate_no || "-"}</td>
                </tr>
                {!isNonUser && (
                  <tr>
                    <th>GST No</th>
                    <td>{viewCustomer.gst_no || "-"}</td>
                  </tr>
                )}
                <tr>
                  <th>Pincode</th>
                  <td>{viewCustomer.pincode || "-"}</td>
                </tr>
                <tr>
                  <th>Address</th>
                  <td>{viewCustomer.address || "-"}</td>
                </tr>
                <tr>
                  <th>City</th>
                  <td>{viewCustomer.city || "-"}</td>
                </tr>
                <tr>
                  <th>Country</th>
                  <td>{viewCustomer.country || "-"}</td>
                </tr>
                <tr>
                  <th>Opening Balance</th>
                  <td>{viewCustomer.opening_balance || "-"}</td>
                </tr>
              </tbody>
            </Table>
          ) : (
            <p className="text-muted mb-0">No customer data</p>
          )}
        </ModalBody>
      </Modal>
    </Container>
  );
}
