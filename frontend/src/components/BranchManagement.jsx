import React, { useEffect, useState } from "react";
import {
  Container, Row, Col, Table, Button, Input, Modal, ModalHeader, ModalBody, ModalFooter, FormGroup, Label, Badge,
} from "reactstrap";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../utils/api";

const empty = {
  branch_name: "", branch_code: "", address: "", city: "", state: "", pincode: "",
  phone: "", email: "", gst_no: "", status: "Active",
  sale_prefix: "", quotation_prefix: "", purchase_prefix: "", receipt_prefix: "", proforma_prefix: "", delivery_challan_prefix: "",
  sale_start: "", quotation_start: "", purchase_start: "", receipt_start: "", proforma_start: "", delivery_challan_start: "",
};

export default function BranchManagement() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const permissions = storedUser.permissions || [];
  const roleLower = String(storedUser.role_name || "").toLowerCase().trim();
  const isSuperAdmin = roleLower === "super admin" || storedUser.role_id === 5;
  const hasPermission = (key) => isSuperAdmin;

  const [branches, setBranches] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [editId, setEditId] = useState(null);

  const load = () => api.get("/branches").then((r) => setBranches(r.data)).catch(() => toast.error("Failed to load branches"));

  useEffect(() => { load(); }, []);

  const toggle = () => { setModal(!modal); if (modal) { setForm({ ...empty }); setEditId(null); } };

  const openEdit = (b) => {
    const seq = b.sequences || {};
    setForm({
      ...b,
      sale_prefix:      seq.sale?.prefix      || "",
      quotation_prefix: seq.quotation?.prefix  || "",
      purchase_prefix:  seq.purchase?.prefix   || "",
      receipt_prefix:   seq.receipt?.prefix     || "",
      proforma_prefix:  seq.proforma?.prefix    || "",
      delivery_challan_prefix: seq.delivery_challan?.prefix || "",
      sale_start:       String(seq.sale?.start_number      || 1),
      quotation_start:  String(seq.quotation?.start_number || 1),
      purchase_start:   String(seq.purchase?.start_number  || 1),
      receipt_start:    String(seq.receipt?.start_number    || 1),
      proforma_start:   String(seq.proforma?.start_number   || 1),
      delivery_challan_start: String(seq.delivery_challan?.start_number || 1),
    });
    setEditId(b.id);
    setModal(true);
  };

  const autoFillPrefixes = (code) => {
    return {
      sale_prefix: "SREE/{FY}/",
      quotation_prefix: "SREE/{FY}/QO",
      purchase_prefix: "ShreePO -{SERIAL}/{FY_LONG}",
      receipt_prefix: "SREE/{FY}/",
      proforma_prefix: "SREE -{SERIAL}/{FY_LONG}",
      delivery_challan_prefix: "SREE/{FY}/DC",
    };
  };

  const save = async () => {
    if (!form.branch_name?.trim()) return toast.error("Branch name required");
    if (!form.branch_code?.trim()) return toast.error("Branch code required");
    try {
      if (editId) {
        await api.put(`/branches/${editId}`, form);
        toast.success("Branch updated");
      } else {
        await api.post("/branches", form);
        toast.success("Branch created");
      }
      toggle(); load();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this branch?")) return;
    try { await api.delete(`/branches/${id}`); toast.success("Branch deleted"); load(); }
    catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    const updates = { [name]: value };
    if (name === "branch_code" && !editId) {
      Object.assign(updates, autoFillPrefixes(value));
    }
    setForm((prev) => ({ ...prev, ...updates }));
  };

  if (!isSuperAdmin) {
    return (
      <Container className="p-5 text-center">
        <h4 className="text-danger fw-bold">Access Restricted</h4>
        <p className="text-muted">Branch Management is confidential and strictly restricted to Super Admin only.</p>
      </Container>
    );
  }

  return (
    <Container fluid className="p-3 bg-light min-vh-100">
      <Row className="mb-3 align-items-center">
        <Col><h4 className="fw-bold mb-0">Branch Management</h4></Col>
        {hasPermission("branches.create") && (
          <Col className="text-end">
            <Button color="primary" size="sm" onClick={toggle}><FaPlus className="me-1" /> Add Branch</Button>
          </Col>
        )}
      </Row>

      <Table bordered hover responsive className="bg-white shadow-sm">
        <thead className="table-dark">
          <tr>
            <th>#</th><th>Branch Name</th><th>Code</th><th>City</th><th>Phone</th><th>GST</th><th>Status</th>
            {hasPermission("branches.edit") && <th width="110">Action</th>}
          </tr>
        </thead>
        <tbody>
          {branches.map((b, i) => (
            <tr key={b.id}>
              <td>{i + 1}</td>
              <td>{b.branch_name}</td>
              <td><Badge color="info">{b.branch_code}</Badge></td>
              <td>{b.city || "-"}</td>
              <td>{b.phone || "-"}</td>
              <td>{b.gst_no || "-"}</td>
              <td><Badge color={b.status === "Active" ? "success" : "secondary"}>{b.status}</Badge></td>
              {hasPermission("branches.edit") && (
                <td className="d-flex gap-1">
                  <Button size="sm" color="warning" onClick={() => openEdit(b)}><FaEdit /></Button>
                  <Button size="sm" color="danger" onClick={() => remove(b.id)}><FaTrash /></Button>
                </td>
              )}
            </tr>
          ))}
          {!branches.length && (
            <tr>
              <td colSpan={hasPermission("branches.edit") ? "8" : "7"} className="text-center text-muted py-4">
                No branches found
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      <Modal isOpen={modal} toggle={toggle} centered size="lg">
        <ModalHeader toggle={toggle}>{editId ? "Edit Branch" : "Add Branch"}</ModalHeader>
        <ModalBody>
          <Row className="g-3">
            <Col md={6}><FormGroup><Label className="small fw-bold">Branch Name *</Label><Input name="branch_name" value={form.branch_name} onChange={onChange} /></FormGroup></Col>
            <Col md={6}><FormGroup><Label className="small fw-bold">Branch Code *</Label><Input name="branch_code" value={form.branch_code} onChange={onChange} placeholder="e.g. CHN" /></FormGroup></Col>
            <Col md={12}><FormGroup><Label className="small fw-bold">Address</Label><Input type="textarea" rows="2" name="address" value={form.address || ""} onChange={onChange} /></FormGroup></Col>
            <Col md={4}><FormGroup><Label className="small fw-bold">City</Label><Input name="city" value={form.city || ""} onChange={onChange} /></FormGroup></Col>
            <Col md={4}><FormGroup><Label className="small fw-bold">State</Label><Input name="state" value={form.state || ""} onChange={onChange} /></FormGroup></Col>
            <Col md={4}><FormGroup><Label className="small fw-bold">Pincode</Label><Input name="pincode" value={form.pincode || ""} onChange={onChange} /></FormGroup></Col>
            <Col md={4}><FormGroup><Label className="small fw-bold">Phone</Label><Input name="phone" value={form.phone || ""} onChange={onChange} /></FormGroup></Col>
            <Col md={4}><FormGroup><Label className="small fw-bold">Email</Label><Input name="email" value={form.email || ""} onChange={onChange} /></FormGroup></Col>
            <Col md={4}><FormGroup><Label className="small fw-bold">GST No</Label><Input name="gst_no" value={form.gst_no || ""} onChange={onChange} /></FormGroup></Col>
            <Col md={4}>
              <FormGroup>
                <Label className="small fw-bold">Status</Label>
                <Input type="select" name="status" value={form.status} onChange={onChange}>
                  <option>Active</option><option>Inactive</option>
                </Input>
              </FormGroup>
            </Col>
          </Row>

          <hr className="my-3" />
          <h6 className="fw-bold text-primary mb-1">Invoice Number Settings</h6>
          <p className="small text-muted mb-3">
            Counters in table <code className="small">invoice_no</code> use{" "}
            <strong>bill_type</strong>: <code>sale</code> (sales invoice), <code>quotation</code>,{" "}
            <code>purchase</code>, <code>receipt</code> (service invoice). Start numbers below seed each counter; the
            app then continues sequentially per branch and bill type with no duplicate numbers.
            <br />
            <span className="text-primary fw-bold">Dynamic Financial Year:</span> You can use <code>{"{FY}"}</code> for a 2-digit financial year (e.g. <code>26-27</code>) or <code>{"{FY_LONG}"}</code> for a 4-digit start year (e.g. <code>2026-27</code>). The system will automatically calculate and update the year based on the transaction date (running from April 1 to March 31). To set a fixed year, simply type the exact year manually without placeholders (e.g. <code>26-27</code>).
          </p>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">Sales Invoice Prefix</Label>
                <Input name="sale_prefix" value={form.sale_prefix || ""} onChange={onChange} placeholder="e.g. SREE/{FY}/" />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">Sales Start Number</Label>
                <Input type="number" min="1" name="sale_start" value={form.sale_start} onChange={onChange} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">Quotation Prefix</Label>
                <Input name="quotation_prefix" value={form.quotation_prefix || ""} onChange={onChange} placeholder="e.g. SREE/{FY}/QO" />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">Quotation Start Number</Label>
                <Input type="number" min="1" name="quotation_start" value={form.quotation_start} onChange={onChange} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">Proforma Prefix</Label>
                <Input name="proforma_prefix" value={form.proforma_prefix || ""} onChange={onChange} placeholder="e.g. SREE -{SERIAL}/{FY_LONG}" />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">Proforma Start Number</Label>
                <Input type="number" min="1" name="proforma_start" value={form.proforma_start} onChange={onChange} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">Delivery Challan Prefix</Label>
                <Input name="delivery_challan_prefix" value={form.delivery_challan_prefix || ""} onChange={onChange} placeholder="e.g. SREE/{FY}/DC" />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">Delivery Challan Start Number</Label>
                <Input type="number" min="1" name="delivery_challan_start" value={form.delivery_challan_start} onChange={onChange} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">Purchase Prefix</Label>
                <Input name="purchase_prefix" value={form.purchase_prefix || ""} onChange={onChange} placeholder="e.g. ShreePO -{SERIAL}/{FY_LONG}" />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">Purchase Start Number</Label>
                <Input type="number" min="1" name="purchase_start" value={form.purchase_start} onChange={onChange} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">Service Invoice Prefix</Label>
                <Input name="receipt_prefix" value={form.receipt_prefix || ""} onChange={onChange} placeholder="e.g. SREE/{FY}/" />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label className="small fw-bold">Service Start Number</Label>
                <Input type="number" min="1" name="receipt_start" value={form.receipt_start} onChange={onChange} />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle}>Cancel</Button>
          <Button color="primary" onClick={save}>{editId ? "Update" : "Save"}</Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
}
