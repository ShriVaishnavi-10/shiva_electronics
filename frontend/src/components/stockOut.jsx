import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Table,
  Input,
  Button,
  Card,
  CardBody,
  Pagination,
  PaginationItem,
  PaginationLink,
  Badge,
} from "reactstrap";
import api from "../utils/api";
import { toast } from "react-toastify";

const STOCK_OUT_LIST_API = "/stocks/out/list";

export default function StockOutList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);

  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  };

  const fetchStockOut = async () => {
    setLoading(true);
    try {
      const res = await api.get(STOCK_OUT_LIST_API, {
        params: {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          search: search || undefined,
          page,
          limit,
        },
      });
      setData(Array.isArray(res.data?.data) ? res.data.data : []);
      setTotal(res.data?.total ?? 0);
    } catch (err) {
      setData([]);
      setTotal(0);
      toast.error(err.response?.data?.message || "Failed to load stock out list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockOut();
  }, [page, limit]);

  const applyFilters = () => {
    setPage(1);
    fetchStockOut();
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setSearch("");
    setPage(1);
    fetchStockOut();
  };

  const downloadCSV = () => {
    const headers = [
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
      "Total Items",
    ];
    const rows = data.map((r) => [
      r.type ?? "",
      formatDate(r.date),
      r.customer_name ?? "",
      r.contact_number ?? "",
      r.gst_no ?? "",
      r.location ?? "",
      r.payment_status ?? "",
      r.payment_method ?? "",
      r.total_amount ?? "",
      r.total_paid ?? "",
      r.total_items ?? "",
    ]);
    const escape = (val) => {
      const s = String(val ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n"))
        return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    let csv = headers.map(escape).join(",") + "\n";
    rows.forEach((r) => {
      csv += r.map(escape).join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stock_out_unified_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const startEntry = total === 0 ? 0 : (page - 1) * limit + 1;
  const endEntry = Math.min(page * limit, total);

  return (
    <Container fluid className="p-3">
      <h4 className="mb-3">Stock Out List</h4>
      <Card className="shadow-sm border-0">
        <CardBody>
          <Row className="mb-3 g-2 align-items-end">
            <Col md={2}>
              <label className="form-label small text-muted mb-1">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                bsSize="sm"
              />
            </Col>
            <Col md={2}>
              <label className="form-label small text-muted mb-1">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                bsSize="sm"
              />
            </Col>
            <Col md={4}>
              <label className="form-label small text-muted mb-1">Search</label>
              <Input
                type="text"
                placeholder="Search by customer, phone, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                bsSize="sm"
              />
            </Col>
            <Col md={4} className="d-flex gap-2">
              <Button color="primary" size="sm" onClick={applyFilters} className="w-100">Apply</Button>
              <Button color="secondary" size="sm" outline onClick={resetFilters} className="w-100">Reset</Button>
              <Button color="success" size="sm" onClick={downloadCSV} className="w-100">CSV</Button>
            </Col>
          </Row>

          <Row className="mb-2 align-items-center">
            <Col md={6} className="d-flex align-items-center gap-2">
              <span className="small text-muted">Show</span>
              <Input
                type="select"
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                bsSize="sm"
                style={{ width: "auto" }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Input>
              <span className="small text-muted">entries</span>
            </Col>
            <Col md={6} className="text-end small text-muted">
              Showing {startEntry} to {endEntry} of {total} entries
            </Col>
          </Row>

          <div className="table-responsive">
            <Table hover size="sm" className="align-middle mb-0 border">
              <thead className="table-light">
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
                  <tr><td colSpan="13" className="text-center py-4">Loading...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan="13" className="text-center py-4 text-muted">No stock out records found</td></tr>
                ) : (
                  data.map((r, i) => (
                    <tr key={i}>
                      <td>{startEntry + i}</td>
                      <td>
                        <Badge color={r.type === "Sale" ? "primary" : "info"} pill className="px-2">
                          {r.type}
                        </Badge>
                      </td>
                      <td>{formatDate(r.date)}</td>
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
                      <td className="fw-bold text-danger">{r.qty ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <Pagination size="sm">
                <PaginationItem disabled={page === 1}>
                  <PaginationLink previous onClick={() => setPage(page - 1)} href="#" />
                </PaginationItem>
                {[...Array(totalPages)].map((_, i) => (
                  <PaginationItem key={i} active={i + 1 === page}>
                    <PaginationLink onClick={() => setPage(i + 1)} href="#">{i + 1}</PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem disabled={page === totalPages}>
                  <PaginationLink next onClick={() => setPage(page + 1)} href="#" />
                </PaginationItem>
              </Pagination>
            </div>
          )}
        </CardBody>
      </Card>
    </Container>
  );
}
