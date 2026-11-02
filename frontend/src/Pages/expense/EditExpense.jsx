import React, { useEffect, useState, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  InputGroup,
  InputGroupText,
  Badge,
} from "reactstrap";
import { 
  FaSave, FaCalendarAlt, 
  FaFolderOpen, FaMoneyBillWave,
  FaTag, FaArrowLeft
} from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "axios";
import { apiUrl } from "../../config/urls";
import { getExpenseCategories, getExpenseById, updateExpense } from "../../api/expenseApi";
import { useNavigate, useParams } from "react-router-dom";

export default function EditExpense() {
  const { id } = useParams();
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isNonUser = storedUser.role_name?.toLowerCase().includes("non user") || storedUser.role_id === 6;

  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [bankAccounts, setBankAccounts] = useState([]);
  const [form, setForm] = useState({
    branch_id: "",
    category_id: "",
    expense_date: "",
    total_amount: "",
    payment_mode: "Cash",
    notes: "",
    payment_amount: "",
    payment_account_id: "",
    is_refund: false,
    is_gst: isNonUser ? 0 : 1
  });

  const [attachment, setAttachment] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, branchRes, bankRes, expenseRes] = await Promise.all([
          getExpenseCategories(),
          axios.get(apiUrl("branches")),
          axios.get(apiUrl("bank-accounts")),
          getExpenseById(id)
        ]);
        setCategories(catRes.data || []);
        setBranches(branchRes.data || []);
        setBankAccounts(bankRes.data || []);
        
        const exp = expenseRes.data;
        setForm({
          branch_id: exp.branch_id || "",
          category_id: exp.category_id || "",
          expense_date: exp.expense_date ? exp.expense_date.split('T')[0] : "",
          total_amount: exp.amount || "",
          payment_mode: exp.payment_mode || "Cash",
          notes: exp.notes || "",
          payment_amount: exp.amount || "",
          payment_account_id: exp.payment_account_id || "",
          is_refund: exp.is_refund || false,
          is_gst: exp.is_gst !== undefined ? (isNonUser ? 0 : Number(exp.is_gst)) : (isNonUser ? 0 : 1)
        });
        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load expense details");
        navigate("/index/expenses/list");
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newForm = { ...form, [name]: type === 'checkbox' ? checked : value };
    if (name === "total_amount") {
      newForm.payment_amount = value;
    }
    if (name === "payment_mode") {
      if (value === "Cash") {
        newForm.payment_account_id = "";
      } else if (!form.payment_account_id && bankAccounts.length > 0) {
        newForm.payment_account_id = String(bankAccounts[0].id);
      }
    }
    setForm(newForm);
  };

  const handleFileChange = (e) => {
    setAttachment(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category_id || !form.total_amount) {
      return toast.error("Category and Amount are required");
    }
    if (form.payment_mode !== "Cash" && !form.payment_account_id) {
      return toast.error("Please select a bank account for non-cash payment");
    }

    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        if (key === "payment_account_id" && form.payment_mode === "Cash") {
          return;
        }
        formData.append(key, form[key]);
      });
      if (attachment) formData.append("document", attachment);

      await updateExpense(id, formData);
      toast.success("Expense updated successfully");
      navigate(`/index/expenses/list${form.is_gst === 0 ? "?is_gst=0" : "?is_gst=1"}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update expense");
    }
  };

  if (loading) return <div className="p-5 text-center">Loading...</div>;

  return (
    <Container fluid className="p-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div className="mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3">
          <Button color="link" className="p-0 text-dark" onClick={() => navigate(`/index/expenses/list${form.is_gst === 0 ? "?is_gst=0" : "?is_gst=1"}`)}>
            <FaArrowLeft size={20} />
          </Button>
          <div>
            <h3 className="fw-bold text-dark mb-0">
              {isNonUser || form.is_gst === 0 ? "Edit Non-GST Expense" : "Edit GST Expense"}
            </h3>
          </div>
        </div>
        {isNonUser ? (
          <Badge color="info" className="px-3 py-2 rounded-pill fs-6">
            Non-GST Panel
          </Badge>
        ) : (
          <Badge color={form.is_gst === 0 ? "secondary" : "success"} className="px-3 py-2 rounded-pill fs-6">
            {form.is_gst === 0 ? "Non-GST Expense" : "GST Expense"}
          </Badge>
        )}
      </div>

      <Form onSubmit={handleSubmit}>
        <Card className="border shadow-sm rounded-4 mb-4">
          <CardBody className="p-4">
            <Row className="g-4">
              {/* BILLING TYPE */}
              <Col md={6}>
                <FormGroup>
                  <Label className="fw-bold small text-muted text-uppercase">Billing Type:*</Label>
                  {isNonUser ? (
                    <div className="p-2 px-3 bg-light rounded-3 border d-flex align-items-center gap-2" style={{ height: "42px" }}>
                      <Badge color="info" className="px-2 py-1 text-uppercase fw-bold">Non-GST</Badge>
                      <span className="small text-dark fw-semibold">Non-GST Expense Record</span>
                    </div>
                  ) : (
                    <InputGroup className="rounded-3 border overflow-hidden">
                      <InputGroupText className="bg-light border-0 text-muted"><FaTag size={14} /></InputGroupText>
                      <Input 
                        type="select" 
                        name="is_gst" 
                        value={form.is_gst} 
                        onChange={(e) => setForm({ ...form, is_gst: Number(e.target.value) })} 
                        className="border-0 py-2 fw-semibold"
                      >
                        <option value={1}>GST Expense</option>
                        <option value={0}>Non-GST Expense</option>
                      </Input>
                    </InputGroup>
                  )}
                </FormGroup>
              </Col>

              {/* CATEGORY */}
              <Col md={6}>
                <FormGroup>
                  <Label className="fw-bold small text-muted text-uppercase">Expense Category:*</Label>
                  <InputGroup className="rounded-3 border overflow-hidden">
                    <InputGroupText className="bg-light border-0 text-muted"><FaTag size={14} /></InputGroupText>
                    <Input type="select" name="category_id" value={form.category_id} onChange={handleChange} className="border-0 py-2">
                      <option value="">Please Select Category</option>
                      {categories.filter(c => !c.parent_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Input>
                  </InputGroup>
                </FormGroup>
              </Col>

              {/* DATE */}
              <Col md={6}>
                <FormGroup>
                  <Label className="fw-bold small text-muted text-uppercase">Expense Date:*</Label>
                  <InputGroup className="rounded-3 border overflow-hidden">
                    <InputGroupText className="bg-light border-0 text-muted"><FaCalendarAlt size={14} /></InputGroupText>
                    <Input type="date" name="expense_date" value={form.expense_date} onChange={handleChange} className="border-0 py-2" />
                  </InputGroup>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label className="fw-bold small text-muted text-uppercase">Total Amount:*</Label>
                  <InputGroup className="rounded-3 border overflow-hidden">
                    <InputGroupText className="bg-light border-0 text-muted fw-bold">₹</InputGroupText>
                    <Input type="number" name="total_amount" value={form.total_amount} onChange={handleChange} placeholder="0.00" className="border-0 py-2 fw-bold text-primary" />
                  </InputGroup>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label className="fw-bold small text-muted text-uppercase">Payment Method:*</Label>
                  <InputGroup className="rounded-3 border overflow-hidden">
                    <InputGroupText className="bg-light border-0 text-muted"><FaMoneyBillWave size={14} /></InputGroupText>
                    <Input type="select" name="payment_mode" value={form.payment_mode} onChange={handleChange} className="border-0 py-2">
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </Input>
                  </InputGroup>
                </FormGroup>
              </Col>
              {form.payment_mode !== "Cash" ? (
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-bold small text-muted text-uppercase">Paid From (Bank Account):*</Label>
                    <InputGroup className="rounded-3 border overflow-hidden">
                      <InputGroupText className="bg-light border-0 text-muted"><FaMoneyBillWave size={14} /></InputGroupText>
                      <Input type="select" name="payment_account_id" value={form.payment_account_id} onChange={handleChange} className="border-0 py-2" required>
                        <option value="">Select Bank Account</option>
                        {bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.account_name} ({b.bank_name || 'Bank'}) - Balance: ₹{parseFloat(b.current_balance || 0).toFixed(2)}
                          </option>
                        ))}
                      </Input>
                    </InputGroup>
                  </FormGroup>
                </Col>
              ) : (
                <Col md={6}>
                  <FormGroup>
                    <Label className="fw-bold small text-muted text-uppercase">Paid From:</Label>
                    <div className="p-2 px-3 bg-light rounded-3 border d-flex align-items-center gap-2" style={{ height: "42px" }}>
                      <Badge color="success" className="px-2 py-1 text-uppercase fw-bold">Cash Drawer</Badge>
                      <span className="small text-muted">Paid from Physical Cash Register (No Bank Deduction)</span>
                    </div>
                  </FormGroup>
                </Col>
              )}
              <Col md={8}>
                <FormGroup>
                  <Label className="fw-bold small text-muted text-uppercase">Expense Details / Note:</Label>
                  <Input type="textarea" name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="Notes..." className="border rounded-3 p-3" />
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <Label className="fw-bold small text-muted text-uppercase">Receipt / Document:</Label>
                  <Input type="file" innerRef={fileInputRef} onChange={handleFileChange} className="d-none" />
                  <div 
                    className="border py-4 px-3 rounded-3 bg-light d-flex flex-column align-items-center justify-content-center text-center"
                    onClick={() => fileInputRef.current.click()}
                    style={{ cursor: 'pointer', borderStyle: 'dashed !important', borderWidth: '2px' }}
                  >
                    <FaFolderOpen className="text-primary mb-2" size={24} />
                    <span className="text-muted small text-truncate w-100">{attachment ? attachment.name : "Click to change receipt"}</span>
                  </div>
                </FormGroup>
              </Col>
            </Row>

            <div className="d-flex flex-column flex-sm-row justify-content-center gap-3 mt-5 pb-3">
              <Button color="light" className="px-5 py-2 fw-bold text-muted border-0 rounded-pill" onClick={() => navigate("/index/expenses/list")}>
                Cancel
              </Button>
              <Button color="primary" type="submit" className="px-5 py-2 fw-bold rounded-pill shadow" style={{ minWidth: '200px' }}>
                <FaSave className="me-2" /> Update Expense
              </Button>
            </div>
          </CardBody>
        </Card>
      </Form>
    </Container>
  );
}
