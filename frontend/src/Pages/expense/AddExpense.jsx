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
  FaTag
} from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "axios";
import { apiUrl } from "../../config/urls";
import { getExpenseCategories, createExpense } from "../../api/expenseApi";
import { useNavigate, useLocation } from "react-router-dom";

export default function AddExpense() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isNonUser = storedUser.role_name?.toLowerCase().includes("non user") || storedUser.role_id === 6;

  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const urlGst = queryParams.get("is_gst");
  const initialGst = isNonUser ? 0 : (urlGst === "0" ? 0 : 1);

  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const fileInputRef = useRef(null);
  
  const [form, setForm] = useState({
    branch_id: "",
    category_id: "",
    sub_category_id: "",
    reference_no: "",
    expense_date: new Date().toISOString().slice(0, 10),
    expense_for_type: "None",
    expense_for_id: "",
    tax_id: "",
    total_amount: "",
    notes: "",
    is_refund: false,
    payment_amount: "",
    paid_on: new Date().toISOString().slice(0, 10),
    payment_mode: "Cash",
    payment_account_id: "",
    payment_notes: "",
    is_gst: initialGst
  });

  const [bankAccounts, setBankAccounts] = useState([]);
  const [attachment, setAttachment] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, branchRes, bankRes] = await Promise.all([
          getExpenseCategories(),
          axios.get(apiUrl("branches")),
          axios.get(apiUrl("bank-accounts"))
        ]);
        const bankList = bankRes.data || [];
        setCategories(catRes.data || []);
        setBankAccounts(bankList);
        const branchList = branchRes.data || [];
        setBranches(branchList);
        setForm(prev => ({
          ...prev,
          branch_id: branchList[0]?.id || prev.branch_id,
          payment_account_id: prev.payment_mode === "Cash" ? "" : (prev.payment_account_id || (bankList[0] ? String(bankList[0].id) : ""))
        }));
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    fetchData();
  }, []);

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

      await createExpense(formData);
      toast.success("Expense recorded successfully");
      navigate(`/index/expenses/list${form.is_gst === 0 ? "?is_gst=0" : "?is_gst=1"}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save expense");
    }
  };

  return (
    <Container fluid className="p-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div className="mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            {isNonUser || form.is_gst === 0 ? "Add Non-GST Expense" : "Add GST Expense"}
          </h3>
          <p className="text-muted small mb-0">Record and track operational expenses</p>
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
                    <span className="text-muted small text-truncate w-100">{attachment ? attachment.name : "Click to upload receipt"}</span>
                  </div>
                </FormGroup>
              </Col>
            </Row>

            <div className="d-flex flex-column flex-sm-row justify-content-center gap-3 mt-5 pb-3">
              <Button color="light" className="px-5 py-2 fw-bold text-muted border-0 rounded-pill" onClick={() => navigate("/index/expenses/list")}>
                Cancel
              </Button>
              <Button color="primary" type="submit" className="px-5 py-2 fw-bold rounded-pill shadow" style={{ minWidth: '200px' }}>
                <FaSave className="me-2" /> Add Expense
              </Button>
            </div>
          </CardBody>
        </Card>
      </Form>
    </Container>
  );
}
