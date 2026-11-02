import React, { useEffect, useState } from "react";
import { Container, Row, Col, Button, Table, Input } from "reactstrap";
import { Pencil, Trash2, FileText, Download, Plus, FileCheck, Truck, ShoppingCart } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import { apiUrl } from "../config/urls";

const QUOTATION_API = apiUrl("quotations");

export default function QuotationListAdvanced() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await axios.get(QUOTATION_API, {
        params: {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          search: search || undefined,
          page,
          limit,
        },
      });
      setData(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load quotations list",
      );
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [page, limit]);

  const handleSearchClick = () => {
    setPage(1);
    fetchQuotations();
  };

  const handleExportCSV = () => {
    const headers = [
      "Quotation No",
      "Customer",
      "Contact",
      "Quotation Date",
      "Reference",
      "Product Name",
      "Quantity",
      "Price",
      "Total Price",
      "Grand Total",
    ];
    const rows = data.map((q) => {
      const items = Array.isArray(q.items) ? q.items : [];
      let pNames, qtys, prices, totals;
      if (items.length > 0) {
        pNames = items.map((it) => it.product_name ?? "—").join("\n");
        qtys = items.map((it) => Number(it.qty || 0).toFixed(2)).join("\n");
        prices = items.map((it) => Number(it.rate_1 ?? 0).toFixed(2)).join("\n");
        totals = items.map((it) => Number(it.line_total ?? 0).toFixed(2)).join("\n");
      } else {
        pNames = q.products_summary || "";
        qtys = "";
        prices = "";
        totals = "";
      }

      return [
        q.quotation_no || "",
        q.customer_name || "",
        q.contact_no || "",
        q.quotation_date || "",
        q.reference || "",
        pNames,
        qtys,
        prices,
        totals,
        Number(q.grand_total || 0).toFixed(2),
      ];
    });

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
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "quotations.csv";
    link.click();
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quotation?")) return;
    try {
      await axios.delete(`${QUOTATION_API}/${id}`);
      toast.success("Quotation deleted successfully");
      fetchQuotations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete quotation");
    }
  };

  return (
    <Container fluid className="p-3">
      <Row className="mb-3">
        <Col>
          <div className="d-flex justify-content-between align-items-center bg-white p-3 rounded shadow-sm">
            <h4 className="mb-0">Quotations List</h4>
            <Button
              color="primary"
              onClick={() => navigate("/index/quotationsForm")}
            >
              <Plus size={16} className="me-1" /> New Quotation
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="mb-3 align-items-end g-2">
        <Col xs={12} md={3}>
          <label className="small">
            Search (Quotation No / Name / Contact)
          </label>
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col xs={6} md={2}>
          <label className="small">From Date</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </Col>
        <Col xs={6} md={2}>
          <label className="small">To Date</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </Col>
        <Col xs={6} md={2}>
          <label className="small">Show entries</label>
          <Input
            type="select"
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
        </Col>
        <Col xs={6} md={3} className="text-end d-flex gap-2 justify-content-end align-items-end">
          <Button color="primary" onClick={handleSearchClick}>
            Search
          </Button>
          <Button color="success" onClick={handleExportCSV}>
            <Download size={16} className="me-1" /> CSV
          </Button>
        </Col>
      </Row>

      <Row>
        <Col>
          <Table responsive bordered hover className="align-middle">
            <thead className="table-light">
              <tr>
                <th>S.No</th>
                <th style={{ width: "110px" }}>Quotation No</th>
                <th>Customer</th>
                <th>Notes</th>
                <th>Product Name</th>
                <th className="text-end">Qty</th>
                <th className="text-end">Price</th>
                <th className="text-end">Total Price</th>
                <th className="text-end">Grand Total</th>
                <th className="text-center">Invoice</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center">
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center">
                    No records
                  </td>
                </tr>
              ) : (
                data.map((q, index) => {
                  const items = Array.isArray(q.items) ? q.items : [];
                  return (
                    <tr key={q.id}>
                      <td>{(page - 1) * limit + index + 1}</td>
                      <td>{q.quotation_no}</td>
                      <td>
                        <div className="fw-semibold">{q.customer_name}</div>
                        <div className="small text-muted">{q.contact_no}</div>
                      </td>
                      <td>
                        {q.notes ? (
                          <div
                            style={{
                              maxWidth: "150px",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              fontSize: "0.85rem"
                            }}
                          >
                            {q.notes}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
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
                          q.products_summary || "-"
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
                      <td className="text-end fw-semibold">₹{Number(q.grand_total || 0).toFixed(2)}</td>
                      <td className="text-center">
                        <Button
                          size="sm"
                          color="secondary"
                          title="Quotation Receipt"
                          onClick={() =>
                            navigate(`/index/quotationsReceipt/${q.id}`)
                          }
                        >
                          <FileText size={16} className="me-1" /> Receipt
                        </Button>
                      </td>
                      <td className="text-center text-nowrap">
                        <Button
                          size="sm"
                          color="success"
                          title="Convert to Sale"
                          className="me-1"
                          onClick={() =>
                            navigate(`/index/salesForm?quote_id=${q.id}`)
                          }
                        >
                          <ShoppingCart size={16} />
                        </Button>
                        <Button
                          size="sm"
                          color="primary"
                          title="Edit"
                          className="me-1"
                          onClick={() =>
                            navigate(`/index/quotationsForm/${q.id}`)
                          }
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          size="sm"
                          color="danger"
                          title="Delete"
                          className="me-1"
                          onClick={() => handleDelete(q.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Col>
      </Row>

      {/* Pagination summary + controls */}
      <Row className="mt-2">
        <Col md={6} className="small text-muted">
          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of{" "}
          {total} entries
        </Col>
        <Col md={6} className="text-end">
          <Button
            size="sm"
            disabled={page <= 1}
            className="me-2"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <span className="me-2 small">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </Col>
      </Row>
    </Container>
  );
}
