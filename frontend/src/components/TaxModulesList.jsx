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
} from "reactstrap";
import { FaPlus, FaTrash, FaEdit, FaEye } from "react-icons/fa";
import { toast } from "react-toastify";
import Delete from "../assets/index/Delete Animation.gif";

import { apiUrl } from "../config/urls";

const TAX_API = apiUrl("tax-modules");

const emptyForm = { name: "", tax_rate: "" };

export default function TaxModulesList() {
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [list, setList] = useState([]);
  const [editId, setEditId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(emptyForm);

  const totalPages = Math.ceil(total / limit) || 1;

  const fetchList = async () => {
    try {
      const res = await axios.get(TAX_API, { params: { search, page, limit } });
      setList(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load tax modules");
      setList([]);
      setTotal(0);
    }
  };

  useEffect(() => {
    fetchList();
  }, [search, page, limit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!form.name || !String(form.name).trim()) return "Name is required";
    const rate = Number(form.tax_rate);
    if (
      form.tax_rate === "" ||
      form.tax_rate === null ||
      isNaN(rate) ||
      rate < 0
    )
      return "Tax Rate % is required and must be a number >= 0";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);

    try {
      if (editId) {
        await axios.put(`${TAX_API}/${editId}`, form);
        toast.success("Tax module updated successfully");
      } else {
        await axios.post(TAX_API, form);
        toast.success("Tax module added successfully");
      }
      fetchList();
      setModal(false);
      setEditId(null);
      setForm(emptyForm);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving tax module");
    }
  };

  const handleEdit = (row) => {
    setForm({
      name: row.name || "",
      tax_rate: row.tax_rate != null ? String(row.tax_rate) : "",
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
      await axios.delete(`${TAX_API}/${deleteId}`);
      toast.success("Tax module deleted successfully");
      fetchList();
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
            <CardTitle tag="h5">Tax Modules List</CardTitle>
            <Button color="primary" onClick={openAddModal}>
              <FaPlus /> Add Tax Module
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
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{ width: 280 }}
              />
            </Col>
          </Row>

          <Table bordered hover responsive>
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Tax Rate %</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-muted">
                    No records found
                  </td>
                </tr>
              ) : (
                list.map((row, i) => (
                  <tr key={row.id}>
                    <td>{(page - 1) * limit + i + 1}</td>
                    <td>{row.name}</td>
                    <td>{row.tax_rate != null ? Number(row.tax_rate) : "-"}</td>
                    <td>
                      <Button
                        size="sm"
                        color="info"
                        className="me-1"
                        onClick={() => handleView(row)}
                        title="View"
                      >
                        <FaEye />
                      </Button>
                      <Button
                        size="sm"
                        color="warning"
                        className="me-1"
                        onClick={() => handleEdit(row)}
                        title="Edit"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        onClick={() => confirmDelete(row.id)}
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
      >
        <ModalHeader
          toggle={() => {
            setModal(false);
            setEditId(null);
            setForm(emptyForm);
          }}
        >
          {editId ? "Edit Tax Module" : "Add Tax Module"}
        </ModalHeader>
        <ModalBody>
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>Name *</Label>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Tax name"
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Tax Rate % *</Label>
              <Input
                type="number"
                name="tax_rate"
                value={form.tax_rate}
                onChange={handleChange}
                placeholder="e.g. 18"
                min={0}
                step="0.01"
                required
              />
            </FormGroup>
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
          Tax Module Details
        </ModalHeader>
        <ModalBody>
          {viewRow && (
            <Row>
              <Col md={5} className="mb-2">
                <strong>Name:</strong>
              </Col>
              <Col md={7} className="mb-2">
                {viewRow.name}
              </Col>
              <Col md={5} className="mb-2">
                <strong>Tax Rate %:</strong>
              </Col>
              <Col md={7} className="mb-2">
                {viewRow.tax_rate != null ? Number(viewRow.tax_rate) : "-"}
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
