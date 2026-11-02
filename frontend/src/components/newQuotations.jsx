import React, { useState } from "react";
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
  Form,
  FormGroup,
  Label
} from "reactstrap";
import { Eye, Edit, Trash2, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
const emptyQuotation = {
  customer: "",
  contact: "",
  date: "",
  price: ""
};

export default function QuotationList() {
     const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [viewIndex, setViewIndex] = useState(null);
  const [form, setForm] = useState(emptyQuotation);

  const toggle = () => setModal(!modal);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (editIndex !== null) {
      const updated = [...quotations];
      updated[editIndex] = form;
      setQuotations(updated);
    } else {
      setQuotations([...quotations, form]);
    }
    setForm(emptyQuotation);
    setEditIndex(null);
    toggle();
  };

  const handleEdit = (index) => {
    setEditIndex(index);
    setForm(quotations[index]);
    toggle();
  };

  const handleDelete = (index) => {
    if (window.confirm("Delete this quotation?")) {
      setQuotations(quotations.filter((_, i) => i !== index));
    }
  };

  const filtered = quotations.filter((q) =>
    q.customer.toLowerCase().includes(search.toLowerCase()) ||
    q.contact.includes(search)
  );

  return (
    <Container fluid className="p-3">
      <Row className="mb-3 align-items-center">
        <Col md={6}><h4>Invoices List</h4></Col>
        <Col md={3}>
          <Input
            placeholder="Search customer / contact"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col md={3} className="text-end">
          <Button color="primary"  onClick={() => { navigate("/index/quotationsForm"); close && close(); }} >
            + New Invoice
          </Button>
        </Col>
      </Row>

      <Row>
        <Col>
          <Table responsive bordered hover className="align-middle">
            <thead className="table-light">
              <tr>
                <th>S.No</th>
                <th>Customer</th>
                <th>Contact No</th>
                <th>Date</th>
                <th>Price</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">No records</td>
                </tr>
              ) : (
                filtered.map((q, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{q.customer}</td>
                    <td>{q.contact}</td>
                    <td>{q.date}</td>
                    <td>₹ {q.price}</td>
                    <td className="text-center d-flex justify-content-center gap-2">
                      <Button size="sm" color="secondary" title="Receipt">
                        <FileText size={16} />
                      </Button>
                      <Button size="sm" color="info" title="View" onClick={() => setViewIndex(i)}>
                        <Eye size={16} />
                      </Button>
                      <Button size="sm" color="warning" title="Edit" onClick={() => handleEdit(i)}>
                        <Edit size={16} />
                      </Button>
                      <Button size="sm" color="danger" title="Delete" onClick={() => handleDelete(i)}>
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Col>
      </Row>

   
    </Container>
  );
}
