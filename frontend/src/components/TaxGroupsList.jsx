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
import { FaPlus, FaTrash, FaEdit, FaEye, FaChevronDown } from "react-icons/fa";
import { toast } from "react-toastify";
import Delete from "../assets/index/Delete Animation.gif";

import { apiUrl } from "../config/urls";

const TAX_GROUPS_API = apiUrl("tax-groups");
const TAX_MODULES_API = apiUrl("tax-modules");

const emptyForm = { name: "", sub_taxes: [] };

export default function TaxGroupsList() {
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [list, setList] = useState([]);
  const [taxModules, setTaxModules] = useState([]);
  const [editId, setEditId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [subTaxesDropdownOpen, setSubTaxesDropdownOpen] = useState(false);
  const subTaxesDropdownRef = useRef(null);

  const totalPages = Math.ceil(total / limit) || 1;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        subTaxesDropdownRef.current &&
        !subTaxesDropdownRef.current.contains(e.target)
      ) {
        setSubTaxesDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchList = async () => {
    try {
      const res = await axios.get(TAX_GROUPS_API, {
        params: { search, page, limit },
      });
      setList(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load tax groups");
      setList([]);
      setTotal(0);
    }
  };

  const fetchTaxModules = async () => {
    try {
      const res = await axios.get(TAX_MODULES_API, { params: { limit: 500 } });
      setTaxModules(res.data.data || []);
    } catch (err) {
      setTaxModules([]);
    }
  };

  useEffect(() => {
    fetchList();
  }, [search, page, limit]);

  useEffect(() => {
    fetchTaxModules();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSubTax = (taxId) => {
    const id = Number(taxId);
    setForm((prev) => {
      const current = prev.sub_taxes || [];
      const has = current.includes(id);
      const next = has ? current.filter((x) => x !== id) : [...current, id];
      return { ...prev, sub_taxes: next };
    });
  };

  const getSelectedTaxLabels = () => {
    if (!Array.isArray(form.sub_taxes) || form.sub_taxes.length === 0)
      return null;
    return form.sub_taxes
      .map((id) => taxModules.find((tm) => tm.id === id))
      .filter(Boolean)
      .map(
        (tm) =>
          `${tm.name} (${tm.tax_rate != null ? Number(tm.tax_rate) : "?"}%)`,
      );
  };

  const validate = () => {
    if (!form.name || !String(form.name).trim()) return "Name is required";
    if (!Array.isArray(form.sub_taxes) || form.sub_taxes.length === 0)
      return "Sub taxes is required (select at least one tax)";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);

    try {
      const payload = { name: form.name.trim(), sub_taxes: form.sub_taxes };
      if (editId) {
        await axios.put(`${TAX_GROUPS_API}/${editId}`, payload);
        toast.success("Tax group updated successfully");
      } else {
        await axios.post(TAX_GROUPS_API, payload);
        toast.success("Tax group added successfully");
      }
      fetchList();
      closeFormModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving tax group");
    }
  };

  const handleEdit = (row) => {
    setForm({
      name: row.name || "",
      sub_taxes: Array.isArray(row.sub_taxes)
        ? row.sub_taxes.map((t) => t.id)
        : [],
    });
    setEditId(row.id);
    setSubTaxesDropdownOpen(false);
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
      await axios.delete(`${TAX_GROUPS_API}/${deleteId}`);
      toast.success("Tax group deleted successfully");
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
    setSubTaxesDropdownOpen(false);
    setModal(true);
  };

  const closeFormModal = () => {
    setModal(false);
    setEditId(null);
    setForm(emptyForm);
    setSubTaxesDropdownOpen(false);
  };

  const formatSubTaxes = (subTaxes) => {
    if (!Array.isArray(subTaxes) || subTaxes.length === 0) return "-";
    return subTaxes
      .map(
        (t) =>
          `${t.name || "Tax"} (${t.tax_rate != null ? Number(t.tax_rate) : "?"}%)`,
      )
      .join(", ");
  };

  return (
    <Container fluid className="p-3">

      <Card className="shadow">
        <CardBody>
          <div className="d-flex justify-content-between mb-3">
            <CardTitle tag="h5">Tax Groups List</CardTitle>
            <Button color="primary" onClick={openAddModal}>
              <FaPlus /> Add Tax Group
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
                <th>Sub taxes</th>
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
                    <td>{formatSubTaxes(row.sub_taxes)}</td>
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
      <Modal isOpen={modal} toggle={closeFormModal} size="md">
        <ModalHeader toggle={closeFormModal}>
          {editId ? "Edit Tax Group" : "Add Tax Group"}
        </ModalHeader>
        <ModalBody>
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>Name *</Label>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Tax group name"
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Sub taxes *</Label>
              <div className="position-relative" ref={subTaxesDropdownRef}>
                <div
                  className="form-control d-flex align-items-center justify-content-between cursor-pointer"
                  style={{ minHeight: 38, cursor: "pointer" }}
                  onClick={() => setSubTaxesDropdownOpen((o) => !o)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSubTaxesDropdownOpen((o) => !o);
                    }
                  }}
                >
                  <span className="text-muted">
                    {getSelectedTaxLabels()?.length
                      ? `${form.sub_taxes.length} selected: ${getSelectedTaxLabels().slice(0, 2).join(", ")}${form.sub_taxes.length > 2 ? "..." : ""}`
                      : "Select sub taxes..."}
                  </span>
                  <FaChevronDown className="ms-1" style={{ opacity: 0.7 }} />
                </div>
                {subTaxesDropdownOpen && (
                  <div
                    className="border rounded shadow-sm bg-white position-absolute w-100 mt-1 overflow-auto"
                    style={{ maxHeight: 220, zIndex: 1050 }}
                  >
                    {taxModules.length === 0 ? (
                      <div className="p-2 text-muted small">
                        No tax modules available. Add taxes in Tax Modules List
                        first.
                      </div>
                    ) : (
                      taxModules.map((tm) => (
                        <label
                          key={tm.id}
                          className="d-flex align-items-center gap-2 p-2 m-0 border-bottom cursor-pointer"
                          style={{ cursor: "pointer" }}
                        >
                          <input
                            type="checkbox"
                            checked={(form.sub_taxes || []).includes(tm.id)}
                            onChange={() => toggleSubTax(tm.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span>
                            {tm.name} (
                            {tm.tax_rate != null ? Number(tm.tax_rate) : "?"}%)
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
              <small className="text-muted">
                Select one or more taxes to include in this group.
              </small>
            </FormGroup>
            <div className="text-end mt-3">
              <Button color="secondary" type="button" onClick={closeFormModal}>
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
          Tax Group Details
        </ModalHeader>
        <ModalBody>
          {viewRow && (
            <Row>
              <Col md={4} className="mb-2">
                <strong>Name:</strong>
              </Col>
              <Col md={8} className="mb-2">
                {viewRow.name}
              </Col>
              <Col md={4} className="mb-2">
                <strong>Sub taxes:</strong>
              </Col>
              <Col md={8} className="mb-2">
                {formatSubTaxes(viewRow.sub_taxes)}
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
