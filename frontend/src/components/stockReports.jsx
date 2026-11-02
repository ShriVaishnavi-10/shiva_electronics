import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Card,
  CardBody,
  Row,
  Col,
  Table,
  Button,
  Label,
  Input,
  Pagination,
  PaginationItem,
  PaginationLink,
} from "reactstrap";
import { toast } from "react-toastify";
import { FaFileCsv } from "react-icons/fa";

import api from "../utils/api";
import { apiUrl } from "../config/urls";

const STOCK_DETAILS_API = "/stocks/details";
const LOCATIONS_API = "/locations";
const ENTRY_OPTIONS = [25, 50, 100, 500];

function formatNum(n) {
  const x = Number(n);
  if (x === 0) return "0";
  return Number.isFinite(x)
    ? x.toLocaleString("en-IN", { maximumFractionDigits: 3 })
    : "0";
}

function formatCurrency(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "₹ 0.00";
  return (
    "₹ " +
    x.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function escapeCell(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function StockReport() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    productSearch: "",
    locationId: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await api.get(LOCATIONS_API, { params: { limit: 100 } });
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setLocations(list);
      } catch (e) {
        console.error("Failed to load locations in StockReport", e);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filters.productSearch.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [filters.productSearch]);

  const filterKeyRef = useRef(
    `${debouncedSearch}|${filters.fromDate}|${filters.toDate}|${filters.locationId}`
  );

  const fetchData = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      try {
        const res = await api.get(STOCK_DETAILS_API, {
          params: {
            page: targetPage,
            limit,
            fromDate: filters.fromDate || undefined,
            toDate: filters.toDate || undefined,
            productSearch: debouncedSearch || undefined,
            search: debouncedSearch || undefined,
            locationId: filters.locationId || undefined,
          },
        });
        setData(Array.isArray(res.data?.data) ? res.data.data : []);
        setTotal(res.data?.total ?? 0);
        setSummary(res.data?.summary ?? null);
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Failed to load stock report"
        );
        setData([]);
        setTotal(0);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    },
    [limit, filters.fromDate, filters.toDate, debouncedSearch, filters.locationId, page]
  );

  useEffect(() => {
    const currentKey = `${debouncedSearch}|${filters.fromDate}|${filters.toDate}|${filters.locationId}`;
    if (filterKeyRef.current !== currentKey) {
      filterKeyRef.current = currentKey;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }
    fetchData(page);
  }, [debouncedSearch, filters.fromDate, filters.toDate, filters.locationId, page, limit, fetchData]);

  const resetFilters = () => {
    setFilters({ fromDate: "", toDate: "", productSearch: "", locationId: "" });
    setDebouncedSearch("");
    filterKeyRef.current = "|||";
    setPage(1);
  };

  const downloadCSV = async () => {
    try {
      const res = await api.get(STOCK_DETAILS_API, {
        params: {
          page: 1,
          limit: 100000,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          productSearch: filters.productSearch.trim() || undefined,
          search: filters.productSearch.trim() || undefined,
          locationId: filters.locationId || undefined,
        },
      });
      const rows = res.data?.data || [];
      if (rows.length === 0) {
        toast.info("No records to export");
        return;
      }

      const headers = [
        "S.No",
        "Product",
        "Total Qty",
        "Total Out Qty",
        "Total In Qty",
        "Total Out Qty Amount",
        "Total In Qty Amount",
      ];

      const lines = [];
      lines.push(headers.map(escapeCell).join(","));

      rows.forEach((r, idx) => {
        lines.push(
          [
            idx + 1,
            r.product_name || "-",
            Number(r.total_qty) || 0,
            Number(r.total_out_qty) || 0,
            Number(r.total_in_qty) || 0,
            (Number(r.total_out_qty_amount) || 0).toFixed(2),
            (Number(r.total_in_qty_amount) || 0).toFixed(2),
          ]
            .map(escapeCell)
            .join(",")
        );
      });

      const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `stock_report_${filters.fromDate || "all"}_${filters.toDate || "all"}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("CSV downloaded successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download CSV");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Container fluid className="p-3">
      <h4 className="mb-3">Stock Report</h4>

      <Card className="shadow-sm">
        <CardBody>
          <Row className="mb-3 g-3 align-items-end">
            <Col md={3}>
              <Label>Product Search</Label>
              <Input
                placeholder="Search product name"
                value={filters.productSearch}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, productSearch: e.target.value }))
                }
              />
            </Col>
            <Col md={2}>
              <Label>Location</Label>
              <Input
                type="select"
                value={filters.locationId}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, locationId: e.target.value }))
                }
              >
                <option value="">All Locations</option>
                {locations.map((loc) => {
                  let cityOrName = loc.city || loc.name || `Location ${loc.id}`;
                  if (
                    loc.landmark &&
                    loc.landmark.toLowerCase().includes("attur") &&
                    !cityOrName.toLowerCase().includes("attur")
                  ) {
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
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, fromDate: e.target.value }))
                }
              />
            </Col>
            <Col md={2}>
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, toDate: e.target.value }))
                }
              />
            </Col>
            <Col md={3} className="d-flex flex-wrap justify-content-md-end gap-2">
              <Button color="secondary" outline onClick={resetFilters}>
                Reset
              </Button>
              <Button color="success" onClick={downloadCSV}>
                <FaFileCsv className="me-1" /> Download CSV
              </Button>
            </Col>
          </Row>

          <Row className="mb-3 align-items-center">
            <Col md={6}>
              <Label className="mb-0">
                Show{" "}
                <Input
                  type="select"
                  bsSize="sm"
                  className="mx-2 d-inline-block w-auto"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {ENTRY_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Input>
                entries
              </Label>
            </Col>
            <Col md={6} className="text-end small text-muted">
              Total: {total}
            </Col>
          </Row>

          {summary != null && (
            <Row className="mb-2 small text-muted">
              <Col>
                Total Products: {summary.total_products ?? total} &nbsp;|&nbsp;
                Total In Qty: {formatNum(summary.total_in_qty)} &nbsp;|&nbsp;
                Total Out Qty: {formatNum(summary.total_out_qty)} &nbsp;|&nbsp;
                Available Stock: {formatNum(summary.current_qty)} &nbsp;|&nbsp;
                Total In Amount: {formatCurrency(summary.total_in_amount)} &nbsp;|&nbsp;
                Total Out Amount: {formatCurrency(summary.total_out_amount)}
              </Col>
            </Row>
          )}

          <div className="table-responsive">
            <Table
              bordered
              hover
              responsive
              size="sm"
              className="align-middle mb-0"
            >
              <thead
                className="table-light"
                style={{ position: "sticky", top: 0, zIndex: 1 }}
              >
                <tr>
                  <th className="text-center">S.No</th>
                  <th>Product</th>
                  <th className="text-end">Total Qty</th>
                  <th className="text-end">Total Out Qty</th>
                  <th className="text-end">Total In Qty</th>
                  <th className="text-end">Total Out Qty Amount</th>
                  <th className="text-end">Total In Qty Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      No records found
                    </td>
                  </tr>
                ) : (
                  data.map((r, i) => (
                    <tr key={r.product_id ? `p-${r.product_id}` : `c-${r.product_name}-${i}`}>
                      <td className="text-center">
                        {(page - 1) * limit + i + 1}
                      </td>
                      <td>{r.product_name || "-"}</td>
                      <td className="text-end">{formatNum(r.total_qty)}</td>
                      <td className="text-end">{formatNum(r.total_out_qty)}</td>
                      <td className="text-end">{formatNum(r.total_in_qty)}</td>
                      <td className="text-end">
                        {formatCurrency(r.total_out_qty_amount)}
                      </td>
                      <td className="text-end">
                        {formatCurrency(r.total_in_qty_amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Pagination className="justify-content-center mt-3 mb-0">
              <PaginationItem disabled={page === 1}>
                <PaginationLink
                  first
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(1);
                  }}
                />
              </PaginationItem>
              <PaginationItem disabled={page === 1}>
                <PaginationLink
                  previous
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                />
              </PaginationItem>
              <PaginationItem active>
                <PaginationLink href="#">
                  {page} of {totalPages}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem disabled={page === totalPages}>
                <PaginationLink
                  next
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                />
              </PaginationItem>
              <PaginationItem disabled={page === totalPages}>
                <PaginationLink
                  last
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(totalPages);
                  }}
                />
              </PaginationItem>
            </Pagination>
          )}
        </CardBody>
      </Card>
    </Container>
  );
}
