import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Spinner,
  Pagination,
  PaginationItem,
  PaginationLink,
  InputGroup,
  InputGroupText,
} from "reactstrap";
import { FaFileCsv, FaSearch, FaFilter, FaFileInvoice } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../utils/api";

const GST_REPORT_URL = "/transactions/gst-report";
const GST_EXPORT_URL = "/transactions/gst-report-export";

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

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

function escapeCsvCell(v) {
  const s = String(v ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildGstCsv(rows, summary, fromDate, toDate, truncated) {
  const headers = [
    "S.No",
    "Invoice Date",
    "Invoice No",
    "Customer Name",
    "Customer GSTIN",
    "Contact No",
    "Location",
    "Address",
    "HSN/SAC Code",
    "Product Name",
    "Unit",
    "Qty",
    "Unit Price",
    "Taxable Value",
    "Tax Amount",
    "Total Amount (Inc. Tax)",
  ];

  const lines = [];
  lines.push("GST DETAILED SALES REPORT");
  lines.push(`Period,${escapeCsvCell(fromDate || "All")} to ${escapeCsvCell(toDate || "All")}`);
  if (truncated) {
    lines.push("NOTE,Export row limit reached. Grand totals reflect all matching records in the database.");
  }
  lines.push("");
  lines.push(headers.map(escapeCsvCell).join(","));

  let totalTaxableValue = 0;
  let totalTaxAmount = 0;

  (rows || []).forEach((r, idx) => {
    const qty = Number(r.quantity) || 0;
    const unitPrice = Number(r.unit_price ?? 0);
    const taxableValue = Number(r.taxable_value ?? qty * unitPrice);
    const taxAmount = Number(r.tax_amount ?? 0);
    const totalPrice = Number(r.total_price ?? 0);
    totalTaxableValue += taxableValue;
    totalTaxAmount += taxAmount;
    lines.push(
      [
        idx + 1,
        formatDisplayDate(r.sales_date),
        r.invoice_no ?? "",
        r.customer_name ?? "",
        r.customer_gstin ?? "",
        r.contact_no ?? "",
        r.location ?? "",
        r.sale_address ?? "",
        r.hsn_code ?? "",
        r.product_name ?? "",
        r.unit ?? "",
        qty,
        unitPrice.toFixed(2),
        taxableValue.toFixed(2),
        taxAmount.toFixed(2),
        totalPrice.toFixed(2),
      ]
        .map(escapeCsvCell)
        .join(","),
    );
  });

  const grandQty = Number(summary?.grand_quantity ?? 0);
  const grandTotal = Number(summary?.grand_total_amount ?? 0);

  lines.push("");
  lines.push(["", "", "", "", "", "", "", "", "Total Qty", grandQty, "", "", "", ""].map(escapeCsvCell).join(","));
  lines.push(["", "", "", "", "", "", "", "", "Total Taxable Value", "", "", totalTaxableValue.toFixed(2), "", ""].map(escapeCsvCell).join(","));
  lines.push(["", "", "", "", "", "", "", "", "Total Tax Amount", "", "", "", totalTaxAmount.toFixed(2), ""].map(escapeCsvCell).join(","));
  lines.push(["", "", "", "", "", "", "", "", "Grand Total (Inc. Tax)", "", "", "", "", grandTotal.toFixed(2)].map(escapeCsvCell).join(","));

  return "\uFEFF" + lines.join("\r\n");
}

function startOfMonthIso() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function todayIso() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

export default function GstReport() {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState(() => startOfMonthIso());
  const [toDate, setToDate] = useState(() => todayIso());
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);

  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [totalLines, setTotalLines] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [appliedFrom, setAppliedFrom] = useState(startOfMonthIso());
  const [appliedTo, setAppliedTo] = useState(todayIso());
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedLocation, setAppliedLocation] = useState("");

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await api.get("/locations?limit=100");
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setLocations(list);
      } catch (e) {
        console.error("Failed to load locations in GST report", e);
      }
    };
    fetchLocations();
  }, []);

  const filterKeyRef = useRef(`${fromDate}|${toDate}|${debouncedSearch}|${selectedLocation}`);

  const loadReport = useCallback(async () => {
    const fk = `${fromDate}|${toDate}|${debouncedSearch}|${selectedLocation}`;
    let requestPage = page;
    if (filterKeyRef.current !== fk) {
      filterKeyRef.current = fk;
      requestPage = 1;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api.get(GST_REPORT_URL, {
        params: {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          search: debouncedSearch.trim() || undefined,
          locationId: selectedLocation || undefined,
          page: requestPage,
          pageSize,
        },
      });
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setRows(data);
      setSummary(res.data?.summary ?? null);
      setTotalLines(Number(res.data?.totalLines) || 0);
      setTotalPages(Number(res.data?.totalPages) || 0);
      setAppliedFrom(fromDate);
      setAppliedTo(toDate);
      setAppliedSearch(debouncedSearch.trim());
      setAppliedLocation(selectedLocation);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load GST report");
      setRows([]);
      setSummary(null);
      setTotalLines(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, debouncedSearch, selectedLocation, page, pageSize]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const downloadCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get(GST_EXPORT_URL, {
        params: {
          fromDate: appliedFrom || undefined,
          toDate: appliedTo || undefined,
          search: appliedSearch || undefined,
          locationId: appliedLocation || undefined,
          limit: 100000,
        },
      });
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      const sum = res.data?.summary || { grand_quantity: 0, grand_total_amount: 0 };
      const truncated = !!res.data?.truncated;

      if (truncated) {
        toast.warning(
          `Export includes up to ${data.length} rows. Grand totals in the file are for all matching records.`,
        );
      }

      const csv = buildGstCsv(data, sum, appliedFrom, appliedTo, truncated);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `gst_report_${appliedFrom || "all"}_${appliedTo || "all"}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("CSV downloaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "CSV export failed");
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setFromDate(startOfMonthIso());
    setToDate(todayIso());
    setSearch("");
    setSelectedLocation("");
    setPage(1);
    setPageSize(25);
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [];
    const max = 7;
    const half = Math.floor(max / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    const arr = [];
    for (let i = start; i <= end; i += 1) arr.push(i);
    return arr;
  }, [page, totalPages]);

  const serialBase = (page - 1) * pageSize;

  return (
    <Container fluid className="p-3 bg-light min-vh-100">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h4 className="fw-bold mb-0 text-dark">GST Report</h4>
         
        </div>
      </div>

      <Card className="shadow-sm border-0">
        <CardBody className="p-3 p-md-4">
          <Row className="g-3 mb-3 align-items-end">
            <Col lg={3} md={6}>
              <Label className="small fw-semibold text-secondary">Search</Label>
              <InputGroup size="sm">
                <InputGroupText className="bg-white">
                  <FaSearch className="text-muted" />
                </InputGroupText>
                <Input
                  placeholder="Customer, contact, invoice, product…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>
            </Col>
            <Col lg={2} md={3}>
              <Label className="small fw-semibold text-secondary">Location</Label>
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
            <Col lg={2} md={3}>
              <Label className="small fw-semibold text-secondary">From date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} bsSize="sm" />
            </Col>
            <Col lg={2} md={3}>
              <Label className="small fw-semibold text-secondary">To date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} bsSize="sm" />
            </Col>
            <Col lg={3} md={12} className="d-flex flex-wrap gap-2 align-items-end">
              <div>
                <Label className="small fw-semibold text-secondary d-block">Rows / page</Label>
                <Input
                  type="select"
                  bsSize="sm"
                  style={{ width: "88px" }}
                  value={String(pageSize)}
                  onChange={(e) => {
                    setPage(1);
                    setPageSize(Number(e.target.value));
                  }}
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </Input>
              </div>

              <Button color="secondary" size="sm" outline onClick={resetFilters} disabled={loading}>
                Reset
              </Button>
              <Button color="success" size="sm" onClick={downloadCsv} disabled={loading || exporting || summary == null}>
                {exporting ? <Spinner size="sm" className="me-1" /> : <FaFileCsv className="me-1" />}
                CSV
              </Button>
            </Col>
          </Row>

          {summary != null && (
            <Row className="mb-2">
              <Col>
                <div className="d-flex flex-wrap gap-3 small rounded border bg-white px-3 py-2">
                  <span>
                    <span className="text-muted">Matching lines: </span>
                    <strong>{totalLines.toLocaleString()}</strong>
                  </span>
                  <span>
                    <span className="text-muted">Total qty: </span>
                    <strong>{Number(summary.grand_quantity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}</strong>
                  </span>
                  <span>
                    <span className="text-muted">Grand total: </span>
                    <strong>
                      {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
                        Number(summary.grand_total_amount ?? 0),
                      )}
                    </strong>
                  </span>
                  {totalPages > 1 && (
                    <span className="text-muted">
                      Page {page} of {totalPages}
                    </span>
                  )}
                </div>
              </Col>
            </Row>
          )}

          <div className="table-responsive rounded border" style={{ maxHeight: "62vh", overflow: "auto" }}>
            <Table hover size="sm" className="align-middle mb-0">
              <thead className="table-dark text-white sticky-top">
                <tr>
                  <th className="text-center" style={{ width: "52px" }}>S.No</th>
                  <th>Invoice Date</th>
                  <th>Invoice No</th>
                  <th>Customer Name</th>
                  <th>GSTIN</th>
                  <th>Contact No</th>
                  <th>HSN/SAC</th>
                  <th>Product Name</th>
                  <th>Unit</th>
                  <th className="text-end">Qty</th>
                  <th className="text-end">Unit Price</th>
                  <th className="text-end">Taxable Value</th>
                  <th className="text-end">Tax Amt</th>
                  <th className="text-end">Total (Inc. Tax)</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center text-muted py-5">
                      <Spinner size="sm" className="me-2" />
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center text-muted py-5">
                      No records for the selected filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => {
                    const qty = Number(r.quantity) || 0;
                    const unitPrice = Number(r.unit_price ?? 0);
                    const taxableValue = Number(r.taxable_value ?? qty * unitPrice);
                    const taxAmount = Number(r.tax_amount ?? 0);
                    const totalPrice = Number(r.total_price ?? 0);
                    return (
                      <tr key={r.line_id != null ? `line-${r.line_id}` : `row-${serialBase + idx}`}>
                        <td className="text-center text-muted">{serialBase + idx + 1}</td>
                        <td className="text-nowrap">{formatDisplayDate(r.sales_date)}</td>
                        <td className="font-monospace small">{r.invoice_no ?? "—"}</td>
                        <td>
                          <div className="fw-medium">{r.customer_name ?? "—"}</div>
                          {r.location ? (
                            <div className="small mt-1">
                              <span className="badge bg-light text-dark border me-1">{r.location}</span>
                              {r.sale_address ? <span className="small text-muted">{r.sale_address}</span> : null}
                            </div>
                          ) : null}
                        </td>
                        <td className="small">{r.customer_gstin || "—"}</td>
                        <td className="text-nowrap">{r.contact_no ?? "—"}</td>
                        <td className="small">{r.hsn_code || "—"}</td>
                        <td>{r.product_name || "—"}</td>
                        <td className="small">{r.unit || "—"}</td>
                        <td className="text-end">{qty.toLocaleString("en-IN")}</td>
                        <td className="text-end">₹{unitPrice.toFixed(2)}</td>
                        <td className="text-end">₹{taxableValue.toFixed(2)}</td>
                        <td className="text-end">₹{taxAmount.toFixed(2)}</td>
                        <td className="text-end fw-medium">₹{totalPrice.toFixed(2)}</td>
                        <td className="text-center text-nowrap align-middle">
                          <Button
                            size="sm"
                            color="secondary"
                            outline
                            title="Tax Invoice"
                            onClick={() => navigate(`/index/salesReceipt/${r.transaction_id}`)}
                            className="py-1 px-2"
                            disabled={!r.transaction_id}
                          >
                            <FaFileInvoice />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {summary != null && totalLines > 0 && (
                <tfoot className="table-light border-top border-2 fw-bold">
                  <tr>
                    <td colSpan={9} className="text-end text-secondary text-uppercase small">Grand Totals</td>
                    <td className="text-end">
                      {Number(summary.grand_quantity ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td />
                    <td className="text-end text-primary">
                      ₹{Number(summary.grand_taxable_value ?? 0).toFixed(2)}
                    </td>
                    <td className="text-end text-danger">
                      ₹{Number(summary.grand_tax_amount ?? 0).toFixed(2)}
                    </td>
                    <td className="text-end text-success">
                      ₹{Number(summary.grand_total_amount ?? 0).toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <Pagination size="sm" className="mb-0">
                <PaginationItem disabled={page <= 1 || loading}>
                  <PaginationLink previous onClick={() => setPage((p) => Math.max(1, p - 1))} />
                </PaginationItem>
                {pageNumbers.map((n) => (
                  <PaginationItem key={n} active={n === page}>
                    <PaginationLink onClick={() => setPage(n)}>{n}</PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem disabled={page >= totalPages || loading}>
                  <PaginationLink next onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
                </PaginationItem>
              </Pagination>
            </div>
          )}
        </CardBody>
      </Card>
    </Container>
  );
}
