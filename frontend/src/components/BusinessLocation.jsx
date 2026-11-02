import React, { useEffect, useState, useRef } from "react";
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
} from "reactstrap";
import {
  FaPlus,
  FaMapMarkerAlt,
  FaTrash,
  FaEdit,
  FaSearch,
  FaEye,
} from "react-icons/fa";
import { toast } from "react-toastify";
import Delete from "../assets/index/Delete Animation.gif";

import { apiUrl } from "../config/urls";

const API = apiUrl("locations");
const BRANCHES_API = apiUrl("branches");

const emptyForm = {
  location_id: "",
  name: "",
  branch_id: "",
  landmark: "",
  state: "",
  city: "",
  zip_code: "",
  mobile: "",
  alternate_number: "",
  email: "",
  gst_no: "",
  account_holder: "",
  bank_name: "",
  account_number: "",
  branch: "",
  ifsc_code: "",
  images: "",
};

export default function BusinessLocation() {
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [locations, setLocations] = useState([]);
  const [editId, setEditId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [branches, setBranches] = useState([]);
  const fileInputRef = useRef(null);

  const totalPages = Math.ceil(total / limit) || 1;

  const fetchLocations = async () => {
    try {
      const res = await axios.get(API, { params: { search, page, limit } });
      setLocations(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load locations");
      setLocations([]);
      setTotal(0);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [search, page, limit]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await axios.get(BRANCHES_API);
        const data = res.data;
        setBranches(Array.isArray(data) ? data : data.data || []);
      } catch (err) {
        console.error("Failed to load branches for locations", err.response?.data || err);
      }
    };
    loadBranches();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("images", files[i]);
      }
      const res = await axios.post(`${API}/upload-images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newUrls = (res.data.urls || []).join(",");
      const existing = (form.images || "").trim();
      setForm({
        ...form,
        images: existing ? existing + "," + newUrls : newUrls,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload images");
    } finally {
      setUploadingImages(false);
    }
  };

  const validate = () => {
    if (!form.name || !form.name.trim()) return "Name is required";
    if (!form.branch_id) return "Branch is required";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);

    try {
      if (editId) {
        await axios.put(`${API}/${editId}`, form);
        toast.success("Location updated successfully");
      } else {
        const res = await axios.post(API, form);
        toast.success(
          "Location added successfully" +
            (res.data.location_id ? ` (${res.data.location_id})` : ""),
        );
      }
      fetchLocations();
      setModal(false);
      setEditId(null);
      setForm(emptyForm);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving location");
    }
  };

  const handleEdit = (row) => {
    setForm({
      location_id: row.location_id || "",
      name: row.name || "",
      branch_id: row.branch_id ? String(row.branch_id) : "",
      landmark: row.landmark || "",
      state: row.state || "",
      city: row.city || "",
      zip_code: row.zip_code || "",
      mobile: row.mobile || "",
      alternate_number: row.alternate_number || "",
      email: row.email || "",
      gst_no: row.gst_no || "",
      account_holder: row.account_holder || "",
      bank_name: row.bank_name || "",
      account_number: row.account_number || "",
      branch: row.branch || "",
      ifsc_code: row.ifsc_code || "",
      images: row.images || "",
    });
    setEditId(row.id);
    setModal(true);
  };

  const handleView = (row) => {
    setViewRow(row);
    setViewModal(true);
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/${deleteId}`);
      toast.success("Location deleted successfully");
      fetchLocations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
    setDeleteModal(false);
    setDeleteId(null);
  };

  const openAddModal = () => {
    setForm(emptyForm);
    setEditId(null);
    setModal(true);
  };

  return (
    <Container fluid className="p-3">

      <Card className="shadow">
        <CardBody>
          <div className="d-flex justify-content-between mb-3">
            <CardTitle tag="h5">
              <FaMapMarkerAlt className="me-2" /> Business Location
            </CardTitle>
            <Button color="primary" onClick={openAddModal}>
              <FaPlus /> Add Location
            </Button>
          </div>

          <Row className="mb-3">
            <Col md={6} className="d-flex align-items-center gap-2">
              <span>Show</span>
              <Input
                type="select"
                style={{ width: 90 }}
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Input>
              <span>entries</span>
            </Col>
            <Col md={6} className="d-flex justify-content-end">
              <div className="d-flex align-items-center gap-2">
                <FaSearch />
                <Input
                  placeholder="Search name, city, state, mobile, email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: 280 }}
                />
              </div>
            </Col>
          </Row>

          <Table bordered hover responsive>
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Location ID</th>
                <th>Name</th>
                <th>Branch</th>
                <th>Landmark</th>
                <th>State</th>
                <th>City</th>
                <th>Zip Code</th>
                <th>Mobile</th>
                <th>Alternate No</th>
                <th>Email</th>
                <th>Images</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {locations.length === 0 ? (
                <tr>
                  <td colSpan="13" className="text-center text-muted">
                    No records found
                  </td>
                </tr>
              ) : (
                locations.map((loc, i) => (
                  <tr key={loc.id}>
                    <td>{(page - 1) * limit + i + 1}</td>
                    <td>{loc.location_id || "-"}</td>
                    <td>{loc.name}</td>
                    <td>{loc.branch_name || loc.branch_id || "-"}</td>
                    <td>{loc.landmark || "-"}</td>
                    <td>{loc.state || "-"}</td>
                    <td>{loc.city || "-"}</td>
                    <td>{loc.zip_code || "-"}</td>
                    <td>{loc.mobile || "-"}</td>
                    <td>{loc.alternate_number || "-"}</td>
                    <td>{loc.email || "-"}</td>
                    <td>
                      {loc.images ? (
                        <div className="d-flex flex-wrap gap-1 align-items-center">
                          {loc.images
                            .split(",")
                            .filter(Boolean)
                            .map((url, i) => (
                              <img
                                key={i}
                                src={url.trim()}
                                alt={`Location ${i + 1}`}
                                style={{
                                  width: 40,
                                  height: 40,
                                  objectFit: "cover",
                                }}
                                className="rounded border"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        color="info"
                        className="me-1"
                        onClick={() => handleView(loc)}
                        title="View"
                      >
                        <FaEye />
                      </Button>
                      <Button
                        size="sm"
                        color="warning"
                        className="me-1"
                        onClick={() => handleEdit(loc)}
                        title="Edit"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        onClick={() => confirmDelete(loc.id)}
                        title="Delete"
                      >
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>

          <Row className="align-items-center">
            <Col md={6}>
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, total)} of {total} entries
            </Col>
            <Col md={6} className="d-flex justify-content-end gap-1">
              <Button
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p =
                  totalPages <= 5
                    ? i + 1
                    : page <= 3
                      ? i + 1
                      : page >= totalPages - 2
                        ? totalPages - 4 + i
                        : page - 2 + i;
                p = Math.max(1, Math.min(p, totalPages));
                return (
                  <Button
                    key={p}
                    size="sm"
                    color={page === p ? "primary" : "secondary"}
                    outline={page !== p}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                );
              })}
              <Button
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modal}
        toggle={() => {
          setModal(false);
          setEditId(null);
          setForm(emptyForm);
        }}
        size="lg"
      >
        <ModalHeader
          toggle={() => {
            setModal(false);
            setEditId(null);
            setForm(emptyForm);
          }}
        >
          {editId ? "Edit Location" : "Add Location"}
        </ModalHeader>
        <ModalBody>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label>Location ID</Label>
                  <Input
                    name="location_id"
                    value={form.location_id}
                    onChange={handleChange}
                    placeholder="Leave empty for auto (e.g. LOC-0001)"
                    disabled={!!editId}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Name *</Label>
                  <Input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Location name"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Branch *</Label>
                  <Input
                    type="select"
                    name="branch_id"
                    value={form.branch_id}
                    onChange={handleChange}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name || b.name}
                        {b.branch_code ? ` (${b.branch_code})` : ""}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Landmark</Label>
                  <Input
                    name="landmark"
                    value={form.landmark}
                    onChange={handleChange}
                    placeholder="Landmark"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>State</Label>
                  <Input
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="State"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>City</Label>
                  <Input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="City"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Zip Code</Label>
                  <Input
                    name="zip_code"
                    value={form.zip_code}
                    onChange={handleChange}
                    placeholder="Zip code"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Mobile</Label>
                  <Input
                    name="mobile"
                    value={form.mobile}
                    onChange={handleChange}
                    placeholder="Mobile"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Alternate Number</Label>
                  <Input
                    name="alternate_number"
                    value={form.alternate_number}
                    onChange={handleChange}
                    placeholder="Alternate number"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>GST No</Label>
                  <Input
                    name="gst_no"
                    value={form.gst_no}
                    onChange={handleChange}
                    placeholder="GST No"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>A/c Holder</Label>
                  <Input
                    name="account_holder"
                    value={form.account_holder}
                    onChange={handleChange}
                    placeholder="A/c Holder"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Bank Name</Label>
                  <Input
                    name="bank_name"
                    value={form.bank_name}
                    onChange={handleChange}
                    placeholder="Bank Name"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>A/c No</Label>
                  <Input
                    name="account_number"
                    value={form.account_number}
                    onChange={handleChange}
                    placeholder="A/c No"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Bank Branch</Label>
                  <Input
                    name="branch"
                    value={form.branch}
                    onChange={handleChange}
                    placeholder="Bank Branch"
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>IFSC</Label>
                  <Input
                    name="ifsc_code"
                    value={form.ifsc_code}
                    onChange={handleChange}
                    placeholder="IFSC"
                  />
                </FormGroup>
              </Col>
              <Col md={12}>
                <FormGroup>
                  <Label>Images</Label>
                  <Input
                    type="file"
                    innerRef={fileInputRef}
                    accept="image/*"
                    multiple
                    onChange={handleImageFileChange}
                    disabled={uploadingImages}
                  />
                  {uploadingImages && (
                    <small className="text-muted ms-2">Uploading...</small>
                  )}
                  {form.images && (
                    <div className="d-flex flex-wrap gap-2 align-items-center mt-2">
                      {form.images
                        .split(",")
                        .filter(Boolean)
                        .map((url, i) => (
                          <img
                            key={i}
                            src={url.trim()}
                            alt={`Location ${i + 1}`}
                            style={{
                              maxWidth: 80,
                              maxHeight: 80,
                              objectFit: "cover",
                            }}
                            className="rounded border"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ))}
                    </div>
                  )}
                </FormGroup>
              </Col>
            </Row>
            <div className="text-end mt-3">
              <Button
                color="secondary"
                type="button"
                onClick={() => {
                  setModal(false);
                  setEditId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </Button>{" "}
              <Button color="success" type="submit">
                {editId ? "Update" : "Save"}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewModal} toggle={() => setViewModal(false)} size="md">
        <ModalHeader toggle={() => setViewModal(false)}>
          Location Details
        </ModalHeader>
        <ModalBody>
          {viewRow && (
            <Row>
              <Col md={6} className="mb-2">
                <strong>Location ID:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.location_id || "-"}
              </Col>
              <Col md={6} className="mb-2">
                <strong>Name:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.name}
              </Col>
              <Col md={6} className="mb-2">
                <strong>Landmark:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.landmark || "-"}
              </Col>
              <Col md={6} className="mb-2">
                <strong>State:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.state || "-"}
              </Col>
              <Col md={6} className="mb-2">
                <strong>City:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.city || "-"}
              </Col>
              <Col md={6} className="mb-2">
                <strong>Zip Code:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.zip_code || "-"}
              </Col>
              <Col md={6} className="mb-2">
                <strong>Mobile:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.mobile || "-"}
              </Col>
              <Col md={6} className="mb-2">
                <strong>Alternate Number:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.alternate_number || "-"}
              </Col>
              <Col md={6} className="mb-2">
                <strong>Email:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.email || "-"}
              </Col>
              <Col md={6} className="mb-2">
                <strong>GST No:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.gst_no || "-"}
              </Col>
              <Col md={6} className="mb-2">
                <strong>A/c Holder:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.account_holder || "-"}
              </Col>
              <Col md={6} className="mb-2">
                <strong>Bank Name:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.bank_name || "-"}
              </Col>
              <Col md={6} className="mb-2">
                <strong>A/c No:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.account_number || "-"}
              </Col>
              <Col md={6} className="mb-2">
                <strong>Bank Branch:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.branch || "-"}
              </Col>
              <Col md={6} className="mb-2">
                <strong>IFSC:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.ifsc_code || "-"}
              </Col>
              <Col md={6} className="mb-2">
                <strong>Images:</strong>
              </Col>
              <Col md={6} className="mb-2">
                {viewRow.images ? (
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    {viewRow.images
                      .split(",")
                      .filter(Boolean)
                      .map((url, i) => (
                        <img
                          key={i}
                          src={url.trim()}
                          alt={`Location ${i + 1}`}
                          style={{
                            maxWidth: 80,
                            maxHeight: 80,
                            objectFit: "cover",
                          }}
                          className="rounded border"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ))}
                  </div>
                ) : (
                  "-"
                )}
              </Col>
            </Row>
          )}
        </ModalBody>
      </Modal>

      {/* Delete Confirm Modal */}
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
