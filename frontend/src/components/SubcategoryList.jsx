import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Container, Row, Col, Table, Button, Input, Label,
  Modal, ModalHeader, ModalBody, ModalFooter, Badge,
} from "reactstrap";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import { apiUrl } from "../config/urls";

const API = apiUrl("subcategories");
const CAT_API = apiUrl("categories");

const EMPTY_FORM = { category_id: "", subcategory_name: "", status: "Active" };

export default function SubcategoryList() {
  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [subRes, catRes] = await Promise.all([
        axios.get(API),
        axios.get(CAT_API),
      ]);
      setSubcategories(Array.isArray(subRes.data) ? subRes.data : []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModal(true);
  };

  const openEdit = (row) => {
    setEditId(row.id);
    setForm({
      category_id: String(row.category_id || ""),
      subcategory_name: row.subcategory_name || "",
      status: row.status || "Active",
    });
    setModal(true);
  };

  const closeModal = () => { setModal(false); setForm(EMPTY_FORM); setEditId(null); };

  const handleSave = async () => {
    if (!form.category_id) return toast.error("Please select a category");
    if (!form.subcategory_name.trim()) return toast.error("Subcategory name is required");
    setSaving(true);
    try {
      if (editId) {
        await axios.put(`${API}/${editId}`, form);
        toast.success("Subcategory updated");
      } else {
        await axios.post(API, form);
        toast.success("Subcategory added");
      }
      closeModal();
      fetchAll();
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
      toast.success("Subcategory deleted");
      closeDelete();
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const filtered = subcategories.filter((s) => {
    const matchSearch = s.subcategory_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.category_name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat ? String(s.category_id) === filterCat : true;
    return matchSearch && matchCat;
  });

  return (
    <Container fluid className="p-3">
      <Row className="mb-3 align-items-center g-3">
        <Col xs={12} md={4}><h4 className="fw-bold mb-0">Subcategory List</h4></Col>
        <Col xs={12} md={8} className="d-flex justify-content-md-end justify-content-start gap-2 flex-wrap">
          <Input
            type="select"
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            style={{ maxWidth: 180, flex: 1, minWidth: 140 }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.category_name}</option>
            ))}
          </Input>
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 200, flex: 1, minWidth: 140 }}
          />
          <Button color="primary" onClick={openAdd}>
            <FaPlus className="me-1" /> Add Subcategory
          </Button>
        </Col>
      </Row>

      <Table bordered hover responsive className="bg-white shadow-sm">
        <thead className="table-dark">
          <tr>
            <th style={{ width: 60 }}>S.No</th>
            <th>Category</th>
            <th>Subcategory Name</th>
            <th>Status</th>
            <th style={{ width: 120 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
          ) : filtered.length === 0 ? (
            <tr><td colSpan={5} className="text-center text-muted py-4">No subcategories found</td></tr>
          ) : (
            filtered.map((row, i) => (
              <tr key={row.id}>
                <td>{i + 1}</td>
                <td>{row.category_name || "-"}</td>
                <td>{row.subcategory_name}</td>
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

      <Modal isOpen={modal} toggle={closeModal} centered>
        <ModalHeader toggle={closeModal}>{editId ? "Edit Subcategory" : "Add Subcategory"}</ModalHeader>
        <ModalBody>
          <Label>Category *</Label>
          <Input
            type="select"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="mb-3"
          >
            <option value="">-- Select Category --</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.category_name}</option>
            ))}
          </Input>
          <Label>Subcategory Name *</Label>
          <Input
            value={form.subcategory_name}
            onChange={(e) => setForm({ ...form, subcategory_name: e.target.value })}
            placeholder="Enter subcategory name"
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

      <Modal isOpen={deleteModal} toggle={closeDelete} centered size="sm">
        <ModalHeader toggle={closeDelete}>Confirm Delete</ModalHeader>
        <ModalBody>
          Are you sure you want to delete <strong>{deleteTarget?.subcategory_name}</strong>?
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline size="sm" onClick={closeDelete}>Cancel</Button>
          <Button color="danger" size="sm" onClick={confirmDelete}>Delete</Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
}
