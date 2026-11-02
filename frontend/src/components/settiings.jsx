import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
} from "reactstrap";
import axios from "axios";
import { toast } from "react-toastify";

import { apiUrl, serverAssetUrl } from "../config/urls";

const SETTINGS_API = apiUrl("settings");

const Settings = () => {
  const [formData, setFormData] = useState({
    company_name: "",
    gst_no: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    branch: "",
    company_logo: null,
    logoPreview: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    try {
      const response = await axios.get(`${SETTINGS_API}/company`);
      if (response.data) {
        setFormData({
          company_name: response.data.company_name || "",
          gst_no: response.data.gst_no || "",
          address: response.data.address || "",
          city: response.data.city || "",
          state: response.data.state || "",
          country: response.data.country || "India",
          branch: response.data.branch || "",
          company_logo: null,
          logoPreview: response.data.company_logo || "",
        });
      }
    } catch (error) {
      console.error("Failed to load company settings:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);

      try {
        const formDataUpload = new FormData();
        formDataUpload.append("logo", file);

        const response = await axios.post(
          `${SETTINGS_API}/upload-logo`,
          formDataUpload,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        setFormData({
          ...formData,
          company_logo: file,
          logoPreview: response.data.logoUrl,
        });

        toast.success("Logo uploaded successfully");
      } catch (error) {
        console.error("Logo upload failed:", error);
        toast.error("Failed to upload logo");

        setFormData({
          ...formData,
          company_logo: file,
          logoPreview: previewUrl,
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const settingsData = {
        company_name: formData.company_name,
        gst_no: formData.gst_no,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        branch: formData.branch,
        company_logo: formData.logoPreview, 
      };

      const response = await axios.post(
        `${SETTINGS_API}/company`,
        settingsData,
      );
      toast.success(
        response.data.message || "Company settings saved successfully",
      );

      await loadCompanySettings();
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error(
        error.response?.data?.message || "Failed to save company settings",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="p-4">
      <Row className="justify-content-center">
        <Col md="8">
          <Card>
            <CardBody>
              <h4 className="mb-4 text-center">⚙ Company Settings</h4>

              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label>Company Name</Label>
                      <Input
                        type="text"
                        name="company_name"
                        placeholder="Enter company name"
                        value={formData.company_name}
                        onChange={handleChange}
                        required
                      />
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>GST No</Label>
                      <Input
                        type="text"
                        name="gst_no"
                        placeholder="Enter GST number"
                        value={formData.gst_no}
                        onChange={handleChange}
                      />
                    </FormGroup>
                  </Col>
                </Row>

                <FormGroup>
                  <Label>Address</Label>
                  <Input
                    type="textarea"
                    name="address"
                    placeholder="Enter full address"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </FormGroup>

                <Row>
                  <Col md="4">
                    <FormGroup>
                      <Label>City</Label>
                      <Input
                        type="text"
                        name="city"
                        placeholder="City"
                        value={formData.city}
                        onChange={handleChange}
                      />
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <Label>State</Label>
                      <Input
                        type="text"
                        name="state"
                        placeholder="State"
                        value={formData.state}
                        onChange={handleChange}
                      />
                    </FormGroup>
                  </Col>

                  <Col md="4">
                    <FormGroup>
                      <Label>Country</Label>
                      <Input
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                      />
                    </FormGroup>
                  </Col>
                </Row>

                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label>Branch</Label>
                      <Input
                        type="text"
                        name="branch"
                        placeholder="Branch name"
                        value={formData.branch}
                        onChange={handleChange}
                      />
                    </FormGroup>
                  </Col>

                  <Col md="6">
                    <FormGroup>
                      <Label>Company Logo</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                      />
                    </FormGroup>
                  </Col>
                </Row>

                {formData.logoPreview && (
                  <div className="text-center mb-3">
                    <img
                      src={
                        formData.logoPreview.startsWith("http")
                          ? formData.logoPreview
                          : serverAssetUrl(formData.logoPreview)
                      }
                      alt="Company Logo"
                      height="80"
                      className="border rounded p-2"
                    />
                  </div>
                )}

                <div className="text-center">
                  <Button color="primary" type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </Form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Settings;
