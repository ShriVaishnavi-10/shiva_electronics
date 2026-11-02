import React from "react";
import { Row, Col, FormGroup, Label, Input } from "reactstrap";

export default function CustomerForm({ form, onChange, isNonUser: isNonUserProp }) {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isNonUser = isNonUserProp !== undefined ? isNonUserProp : (storedUser.role_name?.toLowerCase().includes("non user") || storedUser.role_id === 6);

  const inputStyle = {
    borderRadius: "8px",
    border: "1.5px solid #CBD5E1",
    height: "38px",
    fontSize: "0.88rem",
  };

  return (
    <Row className="g-3">
      <Col md={6}>
        <FormGroup className="mb-0">
          <Label className="fw-bold text-dark small mb-1">CUSTOMER NAME *</Label>
          <Input
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Enter Customer Name"
            style={inputStyle}
          />
        </FormGroup>
      </Col>
      <Col md={6}>
        <FormGroup className="mb-0">
          <Label className="fw-bold text-dark small mb-1">CONTACT NO *</Label>
          <Input
            name="contact"
            value={form.contact}
            onChange={onChange}
            placeholder="Enter 10-digit mobile number"
            style={inputStyle}
          />
        </FormGroup>
      </Col>
      {!isNonUser && (
        <Col md={6}>
          <FormGroup className="mb-0">
            <Label className="fw-bold text-dark small mb-1">GST NO</Label>
            <Input
              type="text"
              name="gst"
              placeholder="e.g. 33AAAAA0000A1Z5"
              value={form.gst}
              maxLength={15}
              onChange={onChange}
              className="text-uppercase"
              style={inputStyle}
            />
          </FormGroup>
        </Col>
      )}
      <Col md={6}>
        <FormGroup className="mb-0">
          <Label className="fw-bold text-dark small mb-1">ALTERNATE NO</Label>
          <Input
            name="alternate"
            value={form.alternate}
            onChange={onChange}
            placeholder="Enter Alternate No"
            style={inputStyle}
          />
        </FormGroup>
      </Col>
      <Col md={6}>
        <FormGroup className="mb-0">
          <Label className="fw-bold text-dark small mb-1">PINCODE</Label>
          <Input
            name="pincode"
            value={form.pincode}
            onChange={onChange}
            placeholder="6-digit pincode"
            style={inputStyle}
          />
        </FormGroup>
      </Col>
      <Col md={6}>
        <FormGroup className="mb-0">
          <Label className="fw-bold text-dark small mb-1">CITY</Label>
          <Input
            name="city"
            value={form.city}
            onChange={onChange}
            placeholder="Enter City"
            style={inputStyle}
          />
        </FormGroup>
      </Col>
      <Col md={6}>
        <FormGroup className="mb-0">
          <Label className="fw-bold text-dark small mb-1">STATE</Label>
          <Input
            name="state"
            value={form.state}
            onChange={onChange}
            placeholder="Tamil Nadu"
            style={inputStyle}
          />
        </FormGroup>
      </Col>
      <Col md={6}>
        <FormGroup className="mb-0">
          <Label className="fw-bold text-dark small mb-1">COUNTRY</Label>
          <Input
            name="country"
            value={form.country}
            onChange={onChange}
            placeholder="India"
            style={inputStyle}
          />
        </FormGroup>
      </Col>
      <Col md={12}>
        <FormGroup className="mb-0">
          <Label className="fw-bold text-dark small mb-1">ADDRESS</Label>
          <Input
            type="textarea"
            rows={2}
            name="address"
            value={form.address}
            onChange={onChange}
            placeholder="Enter full street address..."
            style={{ borderRadius: "8px", border: "1.5px solid #CBD5E1", fontSize: "0.88rem" }}
          />
        </FormGroup>
      </Col>
      <Col md={6}>
        <FormGroup className="mb-0">
          <Label className="fw-bold text-dark small mb-1">OPENING BALANCE (₹)</Label>
          <Input
            type="number"
            name="opening_balance"
            value={form.opening_balance}
            onChange={onChange}
            placeholder="0.00"
            style={inputStyle}
          />
        </FormGroup>
      </Col>
    </Row>
  );
}
