import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Container, Row, Col, Table, Button, Input, Label,
  Modal, ModalHeader, ModalBody, ModalFooter, Badge,
} from "reactstrap";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import { apiUrl } from "../config/urls";

const API = apiUrl("categories");

const EMPTY_FORM = { category_name: "", status: "Active" };

export default function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API);
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModal(true);
  };

  const openEdit = (row) => {
    setEditId(row.id);
    setForm({ category_name: row.category_name || "", status: row.status || "Active" });
    setModal(true);
  };

  const closeModal = () => { setModal(false); setForm(EMPTY_FORM); setEditId(null); };

  const handleSave = async () => {
    if (!form.category_name.trim()) return toast.error("Category name is required");
    setSaving(true);
    try {
      if (editId) {
        await axios.put(`${API}/${editId}`, form);
        toast.success("Category updated");
      } else {
        await axios.post(API, form);
        toast.success("Category added");
      }
      closeModal();
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (row) => { setDeleteTarget(row); setDeleteModal(true); };
  const closeDelete = () => { setDeleteModal(false); setDeleteTarget(null); };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/${deleteTarget.id}`);
      toast.success("Category deleted");
      closeDelete();
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const filtered = categories.filter((c) =>
    c.category_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container fluid className="p-3">
      <Row className="mb-3 align-items-center g-3">
        <Col xs={12} md={6}><h4 className="fw-bold mb-0">Category List</h4></Col>
        <Col xs={12} md={6} className="d-flex justify-content-md-end justify-content-start gap-2 flex-wrap">
          <Input
            placeholder="Search category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 240, width: "100%", flex: 1, minWidth: 150 }}
          />
          <Button color="primary" onClick={openAdd}>
            <FaPlus className="me-1" /> Add Category
          </Button>
        </Col>
      </Row>

      <Table bordered hover responsive className="bg-white shadow-sm">
        <thead className="table-dark">
          <tr>
            <th style={{ width: 60 }}>S.No</th>
            <th>Category Name</th>
            <th>Status</th>
            <th style={{ width: 120 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={4} className="text-center py-4">Loading...</td></tr>
          ) : filtered.length === 0 ? (
            <tr><td colSpan={4} className="text-center text-muted py-4">No categories found</td></tr>
          ) : (
            filtered.map((row, i) => (
              <tr key={row.id}>
                <td>{i + 1}</td>
                <td>{row.category_name}</td>
                <td>
                  <Badge color={row.status === "Active" ? "success" : "secondary"}>
                    {row.status || "Active"}
                  </Badge>
                </td>
                <td>
                  <div className="d-flex gap-1 flex-wrap">
                    <Button size="sm" color="warning" outline title="Edit" onClick={() => openEdit(row)}>
                      <FaEdit />
                    </Button>
                    <Button size="sm" color="danger" outline title="Delete" onClick={() => openDelete(row)}>
                      <FaTrash />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* Add / Edit Modal */}
      <Modal isOpen={modal} toggle={closeModal} centered>
        <ModalHeader toggle={closeModal}>{editId ? "Edit Category" : "Add Category"}</ModalHeader>
        <ModalBody>
          <Label>Category Name *</Label>
          <Input
            value={form.category_name}
            onChange={(e) => setForm({ ...form, category_name: e.target.value })}
            placeholder="Enter category name"
            className="mb-3"
          />
          <Label>Status</Label>
          <Input type="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Input>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={closeModal}>Cancel</Button>
          <Button color="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editId ? "Update" : "Add"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={deleteModal} toggle={closeDelete} centered size="sm">
        <ModalHeader toggle={closeDelete}>Confirm Delete</ModalHeader>
        <ModalBody>
          Are you sure you want to delete <strong>{deleteTarget?.category_name}</strong>?
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline size="sm" onClick={closeDelete}>Cancel</Button>
          <Button color="danger" size="sm" onClick={confirmDelete}>Delete</Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
}
