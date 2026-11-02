import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Input,
  Badge,
} from "reactstrap";
import { FaPlus, FaEdit, FaTrash, FaFileCsv, FaFileExcel, FaPrint, FaColumns, FaFilePdf, FaSearch } from "react-icons/fa";
import { toast } from "react-toastify";
import { getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory } from "../../api/expenseApi";

import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";

export default function ExpenseCategories() {
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: ""
  });

  const toggle = () => {
    setModal(!modal);
    if (modal) {
      setEditId(null);
      setForm({ name: "", code: "" });
    }
  };

  const loadCategories = async () => {
    try {
      const res = await getExpenseCategories();
      setCategories(res.data);
    } catch (err) {
      toast.error("Failed to load categories");
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error("Category name is required");

    try {
      if (editId) {
        await updateExpenseCategory(editId, form);
        toast.success("Category updated");
      } else {
        await createExpenseCategory(form);
        toast.success("Category created");
      }
      toggle();
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleEdit = (cat) => {
    setEditId(cat.id);
    setForm({
      name: cat.name,
      code: cat.code || ""
    });
    setModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      await deleteExpenseCategory(id);
      toast.success("Category deleted");
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.code && c.code.toLowerCase().includes(search.toLowerCase()))
  );

  const exportToCSV = () => {
    const headers = ["Category Name", "Category Code"];
    const rows = filteredCategories.map(c => [c.name, c.code || ""]);
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "expense_categories.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    const data = filteredCategories.map(c => ({ "Category Name": c.name, "Category Code": c.code || "" }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Categories");
    XLSX.writeFile(workbook, "expense_categories.xlsx");
  };

  const exportToPDF = () => {
    const element = document.getElementById('category-table-container');
    const opt = {
      margin: 0.5,
      filename: 'expense_categories.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <Container fluid className="p-4 bg-light min-vh-100">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-0 text-dark">Expense Categories</h2>
        </div>
        <Button color="primary" onClick={toggle} className="px-4 shadow-sm fw-bold rounded-pill">
          <FaPlus className="me-2" /> Add Category
        </Button>
      </div>

      <Card className="border shadow-sm rounded-4 overflow-hidden bg-white">
        <CardBody className="p-0">
          <div className="p-4 border-bottom d-flex flex-wrap gap-3 justify-content-between align-items-center">
            <h6 className="mb-0 fw-bold text-muted text-uppercase small">Category List</h6>
            <div className="d-flex gap-2">
              <Button onClick={exportToCSV} outline color="secondary" size="sm" className="bg-white border text-black fw-bold px-3"><FaFileCsv className="me-1" /> CSV</Button>
              {/* <Button onClick={exportToExcel} outline color="secondary" size="sm" className="bg-white border text-black fw-bold px-3"><FaFileExcel className="me-1" /> Excel</Button> */}
            </div>
            <div className="position-relative w-100" style={{ maxWidth: '250px' }}>
              <Input 
                placeholder="Search..." 
                className="ps-3 border rounded-3 bg-light" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div id="category-table-container">
            <Table hover responsive className="mb-0 align-middle">
            <thead className="bg-light">
              <tr className="text-muted small text-uppercase fw-bold border-bottom">
                <th className="px-4 py-3">S.no</th>
                <th className="px-4 py-3">Category Name</th>
                <th className="py-3">Category Code</th>
                <th className="px-4 py-3 text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-5 text-muted">No categories found</td></tr>
              ) : (
                filteredCategories.map((cat, index) => (
                  <tr key={cat.id} className="border-bottom">
                    <td className="px-4 py-3 text-muted small">{index + 1}</td>
                    <td className="px-4 py-3 fw-bold text-dark">{cat.name}</td>
                    <td className="py-3 text-muted">{cat.code || "-"}</td>
                    <td className="px-4 py-3 text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <Button color="link" size="sm" className="text-primary p-0 me-2" onClick={() => handleEdit(cat)}>
                          <FaEdit size={16} />
                        </Button>
                        <Button color="link" size="sm" className="text-danger p-0" onClick={() => handleDelete(cat.id)}>
                          <FaTrash size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>

      <Modal isOpen={modal} toggle={toggle} centered>
        <ModalHeader toggle={toggle} className="border-bottom pb-3 fw-bold">
          {editId ? "Edit Category" : "Add New Category"}
        </ModalHeader>
        <ModalBody className="pt-4">
          <Form onSubmit={handleSubmit}>
            <FormGroup className="mb-4">
              <Label className="fw-bold small text-muted text-uppercase">Category Name:*</Label>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Office Supplies"
                className="py-2 border rounded-3"
                required
              />
            </FormGroup>
            <FormGroup className="mb-4">
              <Label className="fw-bold small text-muted text-uppercase">Category Code:</Label>
              <Input
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="e.g. EXP001"
                className="py-2 border rounded-3"
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter className="border-top pt-3">
          <Button color="light" onClick={toggle} className="px-4 fw-bold border-0">
            Cancel
          </Button>
          <Button color="primary" onClick={handleSubmit} className="px-4 shadow-sm fw-bold">
            {editId ? "Update Category" : "Save Category"}
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
}
