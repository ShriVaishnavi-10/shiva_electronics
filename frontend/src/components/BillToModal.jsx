import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormGroup,
  Label,
  Input,
  Row,
  Col,
} from "reactstrap";
import {
  FaBuilding,
  FaUser,
  FaPhone,
  FaMapMarkerAlt,
  FaReceipt,
  FaCopy,
  FaCheck,
  FaTimes,
  FaTrashAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";

export const INDIAN_STATES = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh (Old)" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh (New)" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
];

export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function BillToModal({
  isOpen,
  toggle,
  billTo,
  onSave,
  onClear,
  selectedCustomer,
}) {
  const [form, setForm] = useState({
    company_name: "",
    customer_name: "",
    phone: "",
    address: "",
    gstin: "",
    state: "Tamil Nadu",
    state_code: "33",
    place_of_supply: "Tamil Nadu",
    place_of_supply_state_code: "33",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (billTo && (billTo.customer_name || billTo.company_name || billTo.gstin)) {
        setForm({
          company_name: billTo.company_name || "",
          customer_name: billTo.customer_name || "",
          phone: billTo.phone || "",
          address: billTo.address || "",
          gstin: billTo.gstin || "",
          state: billTo.state || "Tamil Nadu",
          state_code: billTo.state_code || "33",
          place_of_supply: billTo.place_of_supply || "Tamil Nadu",
          place_of_supply_state_code: billTo.place_of_supply_state_code || "33",
        });
      } else if (selectedCustomer) {
        // Pre-fill defaults from selected customer if nothing saved yet
        const custGst = selectedCustomer.gst_no ? selectedCustomer.gst_no.trim().toUpperCase() : "";
        let derivedState = "Tamil Nadu";
        let derivedCode = "33";
        if (custGst && custGst.length >= 2) {
          const prefix = custGst.substring(0, 2);
          const found = INDIAN_STATES.find((s) => s.code === prefix);
          if (found) {
            derivedState = found.name;
            derivedCode = found.code;
          }
        }

        setForm({
          company_name: "",
          customer_name: selectedCustomer.customer_name || selectedCustomer.name || "",
          phone: selectedCustomer.contact_no || selectedCustomer.phone || "",
          address: [
            selectedCustomer.address,
            selectedCustomer.address2,
            selectedCustomer.city,
            selectedCustomer.pincode,
          ]
            .filter(Boolean)
            .join(", "),
          gstin: custGst,
          state: derivedState,
          state_code: derivedCode,
          place_of_supply: derivedState,
          place_of_supply_state_code: derivedCode,
        });
      } else {
        setForm({
          company_name: "",
          customer_name: "",
          phone: "",
          address: "",
          gstin: "",
          state: "Tamil Nadu",
          state_code: "33",
          place_of_supply: "Tamil Nadu",
          place_of_supply_state_code: "33",
        });
      }
      setErrors({});
    }
  }, [isOpen, billTo, selectedCustomer]);

  const handleChange = (field, value) => {
    let updated = { ...form, [field]: value };

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }

    // Auto sync state code if state changes
    if (field === "state") {
      const found = INDIAN_STATES.find(
        (s) => s.name.toLowerCase() === String(value).toLowerCase()
      );
      if (found) {
        updated.state_code = found.code;
      }
    }

    // Auto sync state if state code changes
    if (field === "state_code") {
      const found = INDIAN_STATES.find((s) => s.code === String(value).trim());
      if (found) {
        updated.state = found.name;
      }
    }

    // Auto sync place of supply state code
    if (field === "place_of_supply") {
      const found = INDIAN_STATES.find(
        (s) => s.name.toLowerCase() === String(value).toLowerCase()
      );
      if (found) {
        updated.place_of_supply_state_code = found.code;
      }
    }

    // Auto sync place of supply state if code changes
    if (field === "place_of_supply_state_code") {
      const found = INDIAN_STATES.find((s) => s.code === String(value).trim());
      if (found) {
        updated.place_of_supply = found.name;
      }
    }

    // Auto detect state from GSTIN
    if (field === "gstin") {
      const valUpper = String(value).toUpperCase().trim();
      updated.gstin = valUpper;
      if (valUpper.length >= 2) {
        const prefix = valUpper.substring(0, 2);
        const match = INDIAN_STATES.find((s) => s.code === prefix);
        if (match) {
          updated.state = match.name;
          updated.state_code = match.code;
          if (!form.place_of_supply || form.place_of_supply === "Tamil Nadu") {
            updated.place_of_supply = match.name;
            updated.place_of_supply_state_code = match.code;
          }
        }
      }
    }

    setForm(updated);
  };

  const handleCopyFromCustomer = () => {
    if (!selectedCustomer) {
      toast.warning("No customer selected in the sales form.");
      return;
    }

    const custGst = selectedCustomer.gst_no ? selectedCustomer.gst_no.trim().toUpperCase() : "";
    let derivedState = form.state || "Tamil Nadu";
    let derivedCode = form.state_code || "33";
    if (custGst && custGst.length >= 2) {
      const prefix = custGst.substring(0, 2);
      const found = INDIAN_STATES.find((s) => s.code === prefix);
      if (found) {
        derivedState = found.name;
        derivedCode = found.code;
      }
    }

    const fullAddr = [
      selectedCustomer.address,
      selectedCustomer.address2,
      selectedCustomer.city,
      selectedCustomer.pincode,
    ]
      .filter(Boolean)
      .join(", ");

    setForm((prev) => ({
      ...prev,
      customer_name: selectedCustomer.customer_name || selectedCustomer.name || prev.customer_name,
      phone: selectedCustomer.contact_no || selectedCustomer.phone || prev.phone,
      address: fullAddr || prev.address,
      gstin: custGst || prev.gstin,
      state: derivedState,
      state_code: derivedCode,
      place_of_supply: derivedState,
      place_of_supply_state_code: derivedCode,
    }));

    toast.info("Copied details from selected customer.");
  };

  const validate = () => {
    const errs = {};

    if (!form.customer_name?.trim() && !form.company_name?.trim()) {
      errs.customer_name = "Either Customer Name or Company Name is required";
    }

    if (form.phone) {
      const cleanPhone = form.phone.replace(/[\s\-\+]/g, "");
      if (cleanPhone.length < 10 || cleanPhone.length > 13) {
        errs.phone = "Enter a valid 10-digit phone number";
      }
    }

    if (form.gstin) {
      const upperGstin = form.gstin.trim().toUpperCase();
      if (!GSTIN_REGEX.test(upperGstin)) {
        errs.gstin = "Invalid GSTIN format (e.g. 33AAAAA0000A1Z5)";
      }
    }

    if (!form.state) {
      errs.state = "State is required";
    }

    if (!form.place_of_supply) {
      errs.place_of_supply = "Place of Supply is required";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      toast.error("Please correct the errors in the Bill To form.");
      return;
    }

    const cleanedData = {
      company_name: form.company_name?.trim() || "",
      customer_name: form.customer_name?.trim() || "",
      phone: form.phone?.trim() || "",
      address: form.address?.trim() || "",
      gstin: form.gstin?.trim().toUpperCase() || "",
      state: form.state?.trim() || "Tamil Nadu",
      state_code: form.state_code?.trim() || "33",
      place_of_supply: form.place_of_supply?.trim() || form.state?.trim() || "Tamil Nadu",
      place_of_supply_state_code:
        form.place_of_supply_state_code?.trim() || form.state_code?.trim() || "33",
    };

    onSave(cleanedData);
    toast.success("Bill To details saved successfully!");
    toggle();
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
      toast.info("Bill To details cleared.");
    }
    toggle();
  };

  const isConfigured = Boolean(
    billTo && (billTo.customer_name || billTo.company_name || billTo.gstin)
  );

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" centered backdrop="static">
      <ModalHeader
        toggle={toggle}
        className="text-white py-3"
        close={
          <button
            type="button"
            className="btn-close btn-close-white"
            aria-label="Close"
            onClick={toggle}
          />
        }
        style={{
          background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
          borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <FaReceipt className="me-1" size={18} style={{ color: "#FFD700" }} />
          <span className="fw-bold" style={{ fontSize: "1.1rem", color: "#FFD700" }}>
            Bill To (Add-on Details)
          </span>
        </div>
      </ModalHeader>

      <ModalBody className="p-4" style={{ backgroundColor: "#F8FAFC" }}>
        <div
          className="d-flex align-items-center justify-content-between p-2.5 mb-3 rounded"
          style={{
            backgroundColor: "#FEF3C7",
            border: "1px solid #FDE68A",
            color: "#92400E",
            fontSize: "0.85rem",
          }}
        >
          <div>
            <strong>Note:</strong> These details will be printed in the <strong>"Billed To"</strong> section of the invoice.
          </div>
          {selectedCustomer && (
            <Button
              size="sm"
              className="d-flex align-items-center gap-1 fw-bold text-dark shadow-sm"
              style={{
                background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                border: "none",
                fontSize: "0.78rem",
              }}
              onClick={handleCopyFromCustomer}
            >
              <FaCopy size={12} />
              <span>Copy from Customer</span>
            </Button>
          )}
        </div>

        <Row className="g-3">
          {/* Company Name */}
          <Col md={6}>
            <FormGroup className="mb-0">
              <Label className="fw-bold text-dark small mb-1">
                <FaBuilding className="me-1" style={{ color: "#D49A00" }} />
                Company Name
              </Label>
              <Input
                type="text"
                placeholder="e.g. ABC Enterprises Pvt Ltd"
                value={form.company_name}
                onChange={(e) => handleChange("company_name", e.target.value)}
                style={{ borderRadius: "8px", border: "1.5px solid #CBD5E1" }}
              />
            </FormGroup>
          </Col>

          {/* Customer Name */}
          <Col md={6}>
            <FormGroup className="mb-0">
              <Label className="fw-bold text-dark small mb-1">
                <FaUser className="me-1" style={{ color: "#D49A00" }} />
                Customer / Contact Name *
              </Label>
              <Input
                type="text"
                placeholder="e.g. John Doe"
                value={form.customer_name}
                invalid={!!errors.customer_name}
                onChange={(e) => handleChange("customer_name", e.target.value)}
                style={{ borderRadius: "8px", border: "1.5px solid #CBD5E1" }}
              />
              {errors.customer_name && (
                <div className="text-danger small mt-1">{errors.customer_name}</div>
              )}
            </FormGroup>
          </Col>

          {/* Phone Number */}
          <Col md={6}>
            <FormGroup className="mb-0">
              <Label className="fw-bold text-dark small mb-1">
                <FaPhone className="me-1" style={{ color: "#D49A00" }} />
                Phone Number
              </Label>
              <Input
                type="text"
                placeholder="10-digit mobile number"
                value={form.phone}
                invalid={!!errors.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                style={{ borderRadius: "8px", border: "1.5px solid #CBD5E1" }}
              />
              {errors.phone && (
                <div className="text-danger small mt-1">{errors.phone}</div>
              )}
            </FormGroup>
          </Col>

          {/* GSTIN */}
          <Col md={6}>
            <FormGroup className="mb-0">
              <Label className="fw-bold text-dark small mb-1">
                <FaReceipt className="me-1" style={{ color: "#D49A00" }} />
                GSTIN (15 Characters)
              </Label>
              <Input
                type="text"
                placeholder="e.g. 33AAAAA0000A1Z5"
                maxLength={15}
                value={form.gstin}
                invalid={!!errors.gstin}
                onChange={(e) => handleChange("gstin", e.target.value)}
                className="text-uppercase fw-semibold"
                style={{ borderRadius: "8px", border: "1.5px solid #CBD5E1" }}
              />
              {errors.gstin && (
                <div className="text-danger small mt-1">{errors.gstin}</div>
              )}
            </FormGroup>
          </Col>

          {/* Address */}
          <Col md={12}>
            <FormGroup className="mb-0">
              <Label className="fw-bold text-dark small mb-1">
                <FaMapMarkerAlt className="me-1" style={{ color: "#D49A00" }} />
                Address
              </Label>
              <Input
                type="textarea"
                rows={2}
                placeholder="Billing address, street, city, pincode..."
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                style={{ borderRadius: "8px", border: "1.5px solid #CBD5E1" }}
              />
            </FormGroup>
          </Col>

          {/* State & State Code */}
          <Col md={8}>
            <FormGroup className="mb-0">
              <Label className="fw-bold text-dark small mb-1">State *</Label>
              <Input
                type="select"
                value={form.state}
                invalid={!!errors.state}
                onChange={(e) => handleChange("state", e.target.value)}
                style={{ borderRadius: "8px", border: "1.5px solid #CBD5E1" }}
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </Input>
              {errors.state && (
                <div className="text-danger small mt-1">{errors.state}</div>
              )}
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup className="mb-0">
              <Label className="fw-bold text-dark small mb-1">State Code</Label>
              <Input
                type="text"
                maxLength={2}
                placeholder="33"
                value={form.state_code}
                onChange={(e) => handleChange("state_code", e.target.value)}
                className="text-center fw-bold"
                style={{ borderRadius: "8px", border: "1.5px solid #CBD5E1" }}
              />
            </FormGroup>
          </Col>

          {/* Place of Supply & Place of Supply State Code */}
          <Col md={8}>
            <FormGroup className="mb-0">
              <Label className="fw-bold text-dark small mb-1">Place of Supply *</Label>
              <Input
                type="select"
                value={form.place_of_supply}
                invalid={!!errors.place_of_supply}
                onChange={(e) => handleChange("place_of_supply", e.target.value)}
                style={{ borderRadius: "8px", border: "1.5px solid #CBD5E1" }}
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </Input>
              {errors.place_of_supply && (
                <div className="text-danger small mt-1">{errors.place_of_supply}</div>
              )}
            </FormGroup>
          </Col>

          <Col md={4}>
            <FormGroup className="mb-0">
              <Label className="fw-bold text-dark small mb-1">POS State Code</Label>
              <Input
                type="text"
                maxLength={2}
                placeholder="33"
                value={form.place_of_supply_state_code}
                onChange={(e) => handleChange("place_of_supply_state_code", e.target.value)}
                className="text-center fw-bold"
                style={{ borderRadius: "8px", border: "1.5px solid #CBD5E1" }}
              />
            </FormGroup>
          </Col>
        </Row>
      </ModalBody>

      <ModalFooter className="d-flex justify-content-between bg-light py-2.5">
        <div>
          {isConfigured && (
            <Button
              color="danger"
              outline
              size="sm"
              onClick={handleClear}
              className="d-flex align-items-center gap-1"
            >
              <FaTrashAlt size={12} />
              <span>Remove Bill To</span>
            </Button>
          )}
        </div>

        <div className="d-flex gap-2">
          <Button color="secondary" outline size="sm" onClick={toggle}>
            <FaTimes className="me-1" size={12} />
            Cancel
          </Button>
          <Button
            style={{
              background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
              color: "#08090D",
              border: "none",
              fontWeight: "800",
              boxShadow: "0 3px 10px rgba(212, 154, 0, 0.35)",
            }}
            size="sm"
            onClick={handleSubmit}
            className="d-flex align-items-center gap-1 px-3"
          >
            <FaCheck size={12} />
            <span>Apply Bill To</span>
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
