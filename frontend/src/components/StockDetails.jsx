import React, { useEffect, useState } from "react";
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
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaFileCsv } from "react-icons/fa";

import { apiUrl } from "../config/urls";

const STOCK_DETAILS_API = apiUrl("stocks/details");
const LOCATIONS_API = apiUrl("locations");
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

export default function StockDetails() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
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
        const res = await axios.get(LOCATIONS_API, { params: { limit: 100 } });
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setLocations(list);
      } catch (e) {
        console.error("Failed to load locations in StockDetails", e);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filters.productSearch);
    }, 400);
    return () => clearTimeout(handler);
  }, [filters.productSearch]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(STOCK_DETAILS_API, {
        params: {
          page,
          limit,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          productSearch: debouncedSearch || undefined,
          search: debouncedSearch || undefined,
          locationId: filters.locationId || undefined,
        },
      });
      setData(Array.isArray(res.data.data) ? res.data.data : []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load stock details",
      );
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.fromDate, filters.toDate, filters.locationId]);

  useEffect(() => {
    fetchData();
  }, [page, limit, debouncedSearch, filters.fromDate, filters.toDate, filters.locationId]);

  const resetFilters = () => {
    const empty = { fromDate: "", toDate: "", productSearch: "", locationId: "" };
    setFilters(empty);
    setPage(1);
  };

  const downloadCSV = async () => {
    try {
      const res = await axios.get(STOCK_DETAILS_API, {
        params: {
          page: 1,
          limit: total > 0 ? total : 9999,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          productSearch: debouncedSearch || undefined,
          search: debouncedSearch || undefined,
          locationId: filters.locationId || undefined,
        },
      });
      const rows = Array.isArray(res.data.data) ? res.data.data : [];
      const escape = (val) => {
        const s = String(val ?? "");
        if (s.includes(",") || s.includes('"') || s.includes("\n"))
          return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const headers = [
        "S.No",
        "Product",
        "Total Qty",
        "Total Out Qty",
        "Returned Quantity",
        "Total In Qty",
        "Total Out Qty Amount",
        "Total In Qty Amount",
      ];
      const csvRows = rows.map((r, i) => [
        i + 1,
        r.product_name || "",
        formatNum(r.total_qty),
        formatNum(r.total_out_qty),
        formatNum(r.total_returned_qty),
        formatNum(r.total_in_qty),
        formatCurrency(r.total_out_qty_amount),
        formatCurrency(r.total_in_qty_amount),
      ]);
      const csv = [headers, ...csvRows]
        .map((line) => line.map(escape).join(","))
        .join("\n");
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "stock_details.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download CSV");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Container fluid className="p-3">
      <h4 className="mb-3">Stock Details</h4>

      <Card className="shadow-sm">
        <CardBody>
          <Row className="mb-3">
            <Col className="d-flex flex-wrap gap-2 align-items-center">
              <Button
                color="secondary"
                outline
                onClick={() => navigate("/index/stockinOutList")}
              >
                Stock In List
              </Button>
              <Button
                color="secondary"
                outline
                onClick={() => navigate("/index/stockinOutList", { state: { tab: "out" } })}
              >
                Stock Out List
              </Button>
              <Button color="primary">
                Stock Details
              </Button>
            </Col>
          </Row>
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
                  <th className="text-end">Returned Quantity</th>
                  <th className="text-end">Total In Qty</th>
                  <th className="text-end">Total Out Qty Amount</th>
                  <th className="text-end">Total In Qty Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
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
                      <td className="text-end fw-semibold text-warning">
                        {formatNum(r.total_returned_qty)}
                      </td>
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
