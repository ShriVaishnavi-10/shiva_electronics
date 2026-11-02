import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaFileInvoice } from "react-icons/fa";
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
  Pagination,
  PaginationItem,
  PaginationLink,
} from "reactstrap";
import axios from "axios";
import { toast } from "react-toastify";

import { apiUrl } from "../config/urls";

const API = apiUrl("quotations");

export default function QuotationsReport() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API, {
        params: {
          page,
          limit,
          search: debouncedSearch || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        },
      });
      setRows(Array.isArray(res.data.data) ? res.data.data : []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load quotations report",
      );
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [page, limit, debouncedSearch, fromDate, toDate]);

  const resetFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const escapeCell = (v) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\\n") || s.includes("\\r"))
      return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const downloadCSV = () => {
    const header = [
      "Date",
      "Quotation No",
      "Customer",
      "Contact",
      "Product Name",
      "Quantity",
      "Price",
      "Total Price",
      "Grand Total",
    ];
    const dataRows = rows.map((r) => {
      const items = Array.isArray(r.items) ? r.items : [];
      let pNames, qtys, prices, totals;
      if (items.length > 0) {
        pNames = items.map((it) => it.product_name ?? "—").join("\n");
        qtys = items.map((it) => Number(it.qty || 0).toFixed(2)).join("\n");
        prices = items.map((it) => Number(it.rate_1 ?? 0).toFixed(2)).join("\n");
        totals = items.map((it) => Number(it.line_total ?? 0).toFixed(2)).join("\n");
      } else {
        pNames = r.products_summary || "";
        qtys = "";
        prices = "";
        totals = "";
      }

      return [
        r.quotation_date ? formatDate(r.quotation_date) : "",
        r.quotation_no || "",
        r.customer_name || "",
        r.contact_no || "",
        pNames,
        qtys,
        prices,
        totals,
        Number(r.grand_total || 0).toFixed(2),
      ];
    });
    const csv = "\\uFEFF" + [header, ...dataRows]
      .map((line) => line.map(escapeCell).join(","))
      .join("\\r\\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "quotations_report.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Container fluid className="p-3">
      <h4 className="mb-3">Quotations Report</h4>
      <Card className="shadow-sm">
        <CardBody>
          <Row className="mb-3 g-3 align-items-end">
            <Col md={4}>
              <Label>Search</Label>
              <Input
                placeholder="Quotation no / customer / contact"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Label>From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Label>To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
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
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                </Input>
                entries
              </Label>
            </Col>
            <Col md={6} className="text-end small text-muted">
              Total: {total}
            </Col>
          </Row>

          <Table bordered hover responsive size="sm" className="align-middle">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Quotation No</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Product Name</th>
                <th className="text-end">Qty</th>
                <th className="text-end">Price</th>
                <th className="text-end">Total Price</th>
                <th className="text-end">Grand Total</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">
                    No records found
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  const items = Array.isArray(r.items) ? r.items : [];
                  return (
                    <tr key={r.id}>
                      <td>{(page - 1) * limit + i + 1}</td>
                      <td>{formatDate(r.quotation_date)}</td>
                      <td>{r.quotation_no || "-"}</td>
                      <td>{r.customer_name || "-"}</td>
                      <td>{r.contact_no || "-"}</td>
                      <td>
                        {items.length > 0 ? (
                          <div>
                            {items.map((it, idx) => (
                              <div key={idx} className={idx > 0 ? "border-top pt-1 mt-1" : ""}>
                                {it.product_name ?? "—"}
                              </div>
                            ))}
                          </div>
                        ) : (
                          r.products_summary || "-"
                        )}
                      </td>
                      <td className="text-end">
                        {items.length > 0 ? (
                          <div>
                            {items.map((it, idx) => (
                              <div key={idx} className={idx > 0 ? "border-top pt-1 mt-1" : ""}>
                                {Number(it.qty || 0).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="text-end">
                        {items.length > 0 ? (
                          <div>
                            {items.map((it, idx) => (
                              <div key={idx} className={idx > 0 ? "border-top pt-1 mt-1" : ""}>
                                ₹{Number(it.rate_1 ?? 0).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="text-end">
                        {items.length > 0 ? (
                          <div>
                            {items.map((it, idx) => (
                              <div key={idx} className={idx > 0 ? "border-top pt-1 mt-1" : ""}>
                                ₹{Number(it.line_total ?? 0).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="text-end fw-semibold">₹ {Number(r.grand_total || 0).toFixed(2)}</td>
                      <td className="text-center text-nowrap align-middle">
                        <Button
                          size="sm"
                          color="secondary"
                          outline
                          title="Quotation Receipt"
                          onClick={() => navigate(`/index/quotationsReceipt/${r.id}`)}
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
          </Table>

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
