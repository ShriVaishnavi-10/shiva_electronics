import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

import { apiUrl } from "../config/urls";

const API = apiUrl();
const STOCK_IN_API = apiUrl("stockin-list");
const SALES_STOCK_OUT_API = apiUrl("stocks/out/list");

export default function StockList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || "in");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    search: "",
    fromDate: "",
    toDate: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);
    return () => clearTimeout(handler);
  }, [filters.search]);
  const [grandQty, setGrandQty] = useState(0);
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  const formatDateDMY = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  };

  const applySorting = (data) => {
    if (!sortField) return data;
    const dir = sortDir === "desc" ? -1 : 1;
    return [...data].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      if (va == null && vb == null) return 0;
      if (va == null) return -1 * dir;
      if (vb == null) return 1 * dir;
      if (typeof va === "number" && typeof vb === "number") {
        return va === vb ? 0 : va > vb ? dir : -dir;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa === sb) return 0;
      return sa > sb ? dir : -dir;
    });
  };

  const changeSort = (field) => {
    setSortField((prevField) => {
      if (prevField === field) {
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevField;
      }
      setSortDir("asc");
      return field;
    });
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const common = {
        page,
        limit,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
      };
      let url;
      let params;

      if (activeTab === "in") {
        // Stock In from purchases
        params = {
          ...common,
          product: debouncedSearch || undefined,
          vendor: debouncedSearch || undefined,
        };
        url = STOCK_IN_API;
      } else {
        // Stock Out from sales transactions (same source as SalesList)
        params = {
          ...common,
          search: debouncedSearch || undefined,
        };
        url = SALES_STOCK_OUT_API;
      }

      const res = await axios.get(url, { params });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setRows(applySorting(list));
      const totalVal = res.data?.total ?? res.data?.totalRecords ?? list.length;
      setTotal(totalVal);
      if (activeTab === "in") {
        const gq =
          typeof res.data.grandQty === "number"
            ? res.data.grandQty
            : list.reduce((s, r) => s + (Number(r.qty) || 0), 0);
        setGrandQty(gq);
      } else {
        setGrandQty(0);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load stock list");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [activeTab, page, limit, debouncedSearch, filters.fromDate, filters.toDate, sortField, sortDir]);



  const resetFilters = () => {
    const empty = { search: "", fromDate: "", toDate: "" };
    setFilters(empty);
    setPage(1);
  };

  const downloadCSV = () => {
    const escape = (val) => {
      const s = String(val ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n"))
        return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const headerIn = [
      "S.No",
      "Product",
      "Qty",
      "Available Qty",
      "Purchase Date",
      "Purchase Price",
      "Selling Price",
      "Vendor",
    ];
    const rowsIn = rows.map((r, index) => [
      index + 1,
      r.product_name || "",
      r.qty != null ? Number(r.qty).toFixed(2) : "",
      r.current_qty != null ? Number(r.current_qty).toFixed(2) : "",
      r.purchase_date ? formatDateDMY(r.purchase_date) : "",
      r.purchase_price ?? r.selling_price ?? "",
      r.selling_price ?? "",
      r.vendor_name || r.company_name || "",
    ]);

    const headerOut = [
      "Type",
      "Date",
      "Customer Name",
      "Contact Number",
      "Gst No",
      "Location",
      "Status",
      "Method",
      "Total Amount",
      "Total Paid",
      "Qty Out",
    ];
    const rowsOut = rows.map((r) => [
      r.type ?? "",
      r.date ? formatDateDMY(r.date) : "",
      r.customer_name ?? "",
      r.contact_number ?? "",
      r.gst_no ?? "",
      r.location ?? "",
      r.payment_status ?? "",
      r.payment_method ?? "",
      r.total_amount ?? "",
      r.total_paid ?? "",
      r.qty != null ? Number(r.qty).toFixed(2) : "",
    ]);

    const data =
      activeTab === "in" ? [headerIn, ...rowsIn] : [headerOut, ...rowsOut];
    const csv = data.map((line) => line.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    if (activeTab === "in") {
      a.download = "stock_in_list.csv";
    } else {
      const now = new Date();
      const name = formatDateDMY(now.toISOString());
      a.download = `stockout_report_${name}.csv`;
    }
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Container fluid className="p-3">
      <h4 className="mb-3">Stock List</h4>

      <Card className="shadow-sm">
        <CardBody>
          <Row className="mb-3">
            <Col className="d-flex flex-wrap gap-2 align-items-center">
              <Button
                color={activeTab === "in" ? "primary" : "secondary"}
                outline={activeTab !== "in"}
                onClick={() => {
                  setActiveTab("in");
                  setPage(1);
                }}
              >
                Stock In List
              </Button>
              <Button
                color={activeTab === "out" ? "primary" : "secondary"}
                outline={activeTab !== "out"}
                onClick={() => {
                  setActiveTab("out");
                  setPage(1);
                }}
              >
                Stock Out List
              </Button>
              <Button
                color="secondary"
                outline
                onClick={() => navigate("/index/stock-details")}
              >
                Stock Details
              </Button>
            </Col>
          </Row>

          <Row className="mb-3 g-3 align-items-end">
            <Col md={4}>
              <Label>
                {activeTab === "in" ? "Product Search" : "Customer Search"}
              </Label>
              <Input
                placeholder={
                  activeTab === "in"
                    ? "Product / Vendor"
                    : "Customer / Location"
                }
                value={filters.search}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, search: e.target.value }))
                }
              />
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
            <Col md={4} className="d-flex gap-2">

              <Button color="secondary" outline onClick={resetFilters}>
                Reset
              </Button>
              <Button color="success" onClick={downloadCSV}>
                Download CSV
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
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </Input>
                entries
              </Label>
            </Col>
            <Col md={6} className="text-end small text-muted">
              Total Entries: {total}
            </Col>
          </Row>

          {activeTab === "in" ? (
            <Table bordered hover responsive size="sm" className="align-middle">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => changeSort("product_name")}
                  >
                    Product
                  </th>
                  <th>Qty</th>
                  <th>Available Qty</th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => changeSort("purchase_date")}
                  >
                    Purchase Date
                  </th>
                  <th>Purchase Price</th>
                  <th>Selling Price</th>
                  <th>Vendor</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center">
                      No records found
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={r.stock_in_id || i}>
                      <td>{(page - 1) * limit + i + 1}</td>
                      <td>{r.product_name || "-"}</td>
                      <td>{r.qty != null ? Number(r.qty).toFixed(2) : "-"}</td>
                      <td className="fw-bold text-success">{r.current_qty != null ? Number(r.current_qty).toFixed(2) : "-"}</td>
                      <td>
                        {r.purchase_date ? formatDateDMY(r.purchase_date) : "-"}
                      </td>
                      <td>
                        ₹{" "}
                        {Number(
                          r.purchase_price ?? r.selling_price ?? 0,
                        ).toFixed(2)}
                      </td>
                      <td>₹ {Number(r.selling_price || 0).toFixed(2)}</td>
                      <td>{r.vendor_name || r.company_name || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan="2" className="text-end fw-bold">
                      Grand Total Qty (filtered):
                    </td>
                    <td className="fw-bold">{Number(grandQty).toFixed(2)}</td>
                    <td />
                    <td colSpan="3" />
                    <td />
                  </tr>
                </tfoot>
              )}
            </Table>
          ) : (
            <Table hover responsive size="sm" className="align-middle mb-0 border">
              <thead className="table-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th>S.No</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>Contact Number</th>
                  <th>Product / Item</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Total Amount</th>
                  <th>Total Paid</th>
                  <th>Qty Out</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="12" className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="text-center py-4 text-muted">
                      No stock out records found
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i}>
                      <td>{(page - 1) * limit + i + 1}</td>
                      <td>
                        <span className={`badge ${r.type === "Sale" ? "bg-primary" : "bg-info"} rounded-pill px-2`}>
                          {r.type}
                        </span>
                      </td>
                      <td>{r.date ? formatDateDMY(r.date) : "-"}</td>
                      <td className="fw-bold">{r.customer_name ?? "-"}</td>
                      <td>{r.contact_number ?? "-"}</td>
                      <td className="text-primary fw-bold">{r.product_name ?? "-"}</td>
                      <td>{r.type === "Sale" ? (r.location || "-") : "-"}</td>
                      <td>
                        <span className="small">{r.payment_status ?? "-"}</span>
                      </td>
                      <td>{r.payment_method ?? "-"}</td>
                      <td className="fw-bold">₹{Number(r.total_amount || 0).toFixed(2)}</td>
                      <td className="text-success">₹{Number(r.total_paid || 0).toFixed(2)}</td>
                      <td className="fw-bold text-danger">{r.qty != null ? Number(r.qty).toFixed(2) : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}

          {totalPages > 1 && (
            <Pagination className="justify-content-center mt-3">
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
                <PaginationLink href="#">{page}</PaginationLink>
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
