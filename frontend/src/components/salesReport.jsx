import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Input,
  Label,
  Button,
  Table,
} from "reactstrap";
import { FaFileCsv, FaSearch, FaFileInvoice, FaFileContract, FaTruck, FaUserTie } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../utils/api";

const REPORT_URL = "/transactions/sales-report-lines";

function formatDisplayDate(val) {
  if (!val) return "";
  const s = String(val).slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

function escapeCell(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsvFromPayload(data, summary, fromDate, toDate) {
  const headers = [
    "S.No",
    "Sale Date",
    "Bill No",
    "Customer Name",
    "Customer Details",
    "Sales Executive",
    "Location",
    "Product",
    "Qty",
    "MRP",
    "Total Price",
  ];

  const lines = [];
  lines.push(headers.map(escapeCell).join(","));

  (data || []).forEach((r, idx) => {
    const items = Array.isArray(r.items) ? r.items : [];
    let pNames, qtys, prices, totals;
    if (items.length > 0) {
      pNames = items.map((it) => it.product_name ?? "—").join("\n");
      qtys = items.map((it) => Number(it.quantity) || 0).join("\n");
      prices = items.map((it) => Number(it.unit_price ?? 0).toFixed(2)).join("\n");
      totals = items.map((it) => Number(it.line_total ?? 0).toFixed(2)).join("\n") +
        (items.length > 1 ? `\nTotal: ${Number(r.line_total ?? 0).toFixed(2)}` : "");
    } else {
      pNames = r.product_name ?? "—";
      qtys = Number(r.quantity) || 0;
      prices = Number(r.unit_price ?? 0).toFixed(2);
      totals = Number(r.line_total ?? 0).toFixed(2);
    }

    const spText = r.sales_person_name
      ? `${r.sales_person_name}${r.sales_person_code ? ` (${r.sales_person_code})` : ""}`
      : "";

    const row = [
      idx + 1,
      formatDisplayDate(r.sales_date),
      r.invoice_no ?? "",
      r.customer_name ?? "",
      r.customer_details ?? "",
      spText,
      r.location ?? "",
      pNames,
      qtys,
      prices,
      totals,
    ];
    lines.push(row.map(escapeCell).join(","));
  });

  lines.push("");
  lines.push(["", "", "", "", "", "", "Total Bill Count", "", Number(summary?.sale_count ?? 0)].map(escapeCell).join(","));
  lines.push(["", "", "", "", "", "", "Total Sold Qty", "", Number(summary?.total_quantity ?? 0)].map(escapeCell).join(","));
  lines.push(["", "", "", "", "", "", "Total Grand Amount", "", Number(summary?.total_line_amount ?? 0).toFixed(2)].map(escapeCell).join(","));

  return "\uFEFF" + lines.join("\r\n");
}

export default function SalesReport() {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [billType, setBillType] = useState("all");
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [salesPersons, setSalesPersons] = useState([]);
  const [salesPersonId, setSalesPersonId] = useState("");
  const [loading, setLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await api.get("/locations?limit=100");
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setLocations(list);
      } catch (e) {
        console.error("Failed to load locations", e);
      }
    };
    const fetchSalesPersons = async () => {
      try {
        const res = await api.get("/sales-persons");
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setSalesPersons(list);
      } catch (e) {
        console.error("Failed to load sales persons", e);
      }
    };
    fetchLocations();
    fetchSalesPersons();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: debouncedSearch.trim() || undefined,
        billType: billType !== "all" ? billType : undefined,
        locationId: selectedLocation || undefined,
        sales_person_id: salesPersonId || undefined,
        limit: 25000,
      };
      const res = await api.get(REPORT_URL, { params });
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      const sum = res.data?.summary || null;
      setRows(data);
      setSummary(sum);
      setAppliedFrom(fromDate);
      setAppliedTo(toDate);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load sales report");
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, debouncedSearch, billType, selectedLocation, salesPersonId]);

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billType, fromDate, toDate, debouncedSearch, selectedLocation, salesPersonId]);

  const downloadCSV = () => {
    if (summary == null) {
      toast.info("Click Search to load the report, then export CSV.");
      return;
    }
    const csv = buildCsvFromPayload(rows, summary, appliedFrom, appliedTo);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sales_report_${billType}_${appliedFrom || "all"}_${appliedTo || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("CSV downloaded");
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setSearch("");
    setSelectedLocation("");
    setSalesPersonId("");
    setRows([]);
    setSummary(null);
    setAppliedFrom("");
    setAppliedTo("");
    setBillType("all");
  };

  return (
    <Container fluid className="p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 fw-semibold">Sales Report</h4>
        <Button
          color="primary"
          size="sm"
          outline
          onClick={() => navigate("/index/sales-person-report")}
        >
          <FaUserTie className="me-1" />
          Sales Person Report
        </Button>
      </div>
      <Card className="shadow-sm">
        <CardBody>
          <Row className="mb-3 g-3 align-items-end">
            <Col md={3}>
              <Label className="small">Search</Label>
              <Input
                placeholder="Invoice, customer, contact, product, location"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                bsSize="sm"
              />
            </Col>
            <Col md={2}>
              <Label className="small">Location</Label>
              <Input
                type="select"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                bsSize="sm"
              >
                <option value="">All Locations</option>
                {locations.map((loc) => {
                  let cityOrName = loc.city || loc.name || `Location ${loc.id}`;
                  if (loc.landmark && loc.landmark.toLowerCase().includes("attur") && !cityOrName.toLowerCase().includes("attur")) {
                    cityOrName = "Attur";
                  }
                  return (
                    <option key={loc.id} value={loc.id}>
                      {cityOrName}
                    </option>
                  );
                })}
              </Input>
            </Col>
            <Col md={2}>
              <Label className="small">Sales Executive</Label>
              <Input
                type="select"
                value={salesPersonId}
                onChange={(e) => setSalesPersonId(e.target.value)}
                bsSize="sm"
              >
                <option value="">All Sales Executives</option>
                {salesPersons.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name} {sp.employee_code ? `(${sp.employee_code})` : ""}
                  </option>
                ))}
              </Input>
            </Col>
            <Col md={2}>
              <Label className="small">From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                bsSize="sm"
              />
            </Col>
            <Col md={2}>
              <Label className="small">To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                bsSize="sm"
              />
            </Col>
            <Col md={1}>
              <Label className="small">Bill Type</Label>
              <Input
                type="select"
                value={billType}
                onChange={(e) => setBillType(e.target.value)}
                bsSize="sm"
              >
                <option value="all">All</option>
                <option value="tax">Tax</option>
                <option value="non-tax">Non-Tax</option>
              </Input>
            </Col>
            <Col md={12} className="d-flex justify-content-end gap-2 pt-1">
              <Button color="secondary" size="sm" outline onClick={resetFilters} disabled={loading}>
                Reset
              </Button>
              <Button color="success" size="sm" onClick={downloadCSV} disabled={loading}>
                <FaFileCsv className="me-1" />
                CSV
              </Button>
            </Col>
          </Row>

          {summary != null && (
            <Row className="mb-2 small text-muted">
              <Col>
                Sales: {summary.sale_count ?? 0} &nbsp;|&nbsp; Line rows: {rows.length}{" "}
                &nbsp;|&nbsp; Total Qty: {Number(summary.total_quantity ?? 0).toLocaleString()} &nbsp;|&nbsp;
                Line total: ₹{Number(summary.total_line_amount ?? 0).toFixed(2)} &nbsp;|&nbsp; Grand total
                (sales): ₹{Number(summary.grand_total_sales ?? 0).toFixed(2)}
              </Col>
            </Row>
          )}

          <div className="table-responsive" style={{ maxHeight: "70vh", overflow: "auto" }}>
            <Table bordered hover size="sm" className="align-middle mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th>Sale Number</th>
                  <th>Sale Date</th>
                  <th>Customer Name</th>
                  <th>Customer Place / Details</th>
                  <th>Sales Executive</th>
                  <th>Location</th>
                  <th>Product Name</th>
                  <th className="text-end">Qty</th>
                  <th className="text-end">MRP</th>
                  <th className="text-end">Item Total</th>
                  <th className="text-end">Sale Total</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center text-muted py-4">
                      {loading
                        ? "Loading…"
                        : summary != null
                          ? "No sales match these filters."
                          : "Click Search to load the report."}
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => {
                    const items = Array.isArray(r.items) ? r.items : [];
                    return (
                      <tr key={`${r.transaction_id}-${idx}`}>
                        <td>{r.invoice_no ?? "—"}</td>
                        <td>{formatDisplayDate(r.sales_date)}</td>
                        <td>{r.customer_name ?? "—"}</td>
                        <td className="small">{r.customer_details ?? "—"}</td>
                        <td>
                          {r.sales_person_name ? (
                            <span className="badge bg-info text-dark">
                              {r.sales_person_name}
                              {r.sales_person_code ? ` (${r.sales_person_code})` : ""}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-nowrap"><span className="badge bg-light text-dark border">{r.location || "—"}</span></td>
                        <td>
                          {items.length > 0 ? (
                            <div>
                              {items.map((it, i) => (
                                <div key={i} className={i > 0 ? "border-top pt-1 mt-1" : ""}>
                                  {it.product_name ?? "—"}
                                </div>
                              ))}
                            </div>
                          ) : (
                            r.product_name ?? "—"
                          )}
                        </td>
                        <td className="text-end">
                          {items.length > 0 ? (
                            <div>
                              {items.map((it, i) => (
                                <div key={i} className={i > 0 ? "border-top pt-1 mt-1" : ""}>
                                  {Number(it.quantity) || 0}
                                </div>
                              ))}
                            </div>
                          ) : (
                            r.quantity ?? ""
                          )}
                        </td>
                        <td className="text-end">
                          {items.length > 0 ? (
                            <div>
                              {items.map((it, i) => (
                                <div key={i} className={i > 0 ? "border-top pt-1 mt-1" : ""}>
                                  ₹{Number(it.unit_price ?? 0).toFixed(2)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            r.unit_price != null ? `₹${Number(r.unit_price).toFixed(2)}` : "—"
                          )}
                        </td>
                        <td className="text-end">
                          {items.length > 0 ? (
                            <div>
                              {items.map((it, i) => (
                                <div key={i} className={i > 0 ? "border-top pt-1 mt-1" : ""}>
                                  ₹{Number(it.line_total ?? 0).toFixed(2)}
                                </div>
                              ))}
                              {items.length > 1 && (
                                <div className="border-top border-secondary pt-1 mt-1 fw-bold text-primary">
                                  Total: ₹{Number(r.line_total ?? 0).toFixed(2)}
                                </div>
                              )}
                            </div>
                          ) : (
                            `₹${Number(r.line_total ?? 0).toFixed(2)}`
                          )}
                        </td>
                        <td className="text-end fw-semibold">₹{Number(r.sale_total ?? 0).toFixed(2)}</td>
                        <td className="text-center text-nowrap align-middle">
                          <Button
                            size="sm"
                            color="secondary"
                            outline
                            onClick={() => navigate(`/index/salesReceipt/${r.transaction_id}`)}
                            title="Tax Invoice"
                            className="py-1 px-2"
                          >
                            <FaFileInvoice />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {summary != null && rows.length > 0 && (
                <tfoot className="table-secondary fw-semibold">
                  <tr>
                    <td colSpan={7} className="text-end">
                      Totals
                    </td>
                    <td className="text-end">{Number(summary.total_quantity ?? 0).toLocaleString()}</td>
                    <td />
                    <td className="text-end">₹{Number(summary.total_line_amount ?? 0).toFixed(2)}</td>
                    <td className="text-end">₹{Number(summary.grand_total_sales ?? 0).toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
