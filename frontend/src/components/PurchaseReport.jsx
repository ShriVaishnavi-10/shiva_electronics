import React, { useState, useEffect, useCallback } from "react";
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
} from "reactstrap";
import { FaFileExcel, FaSearch, FaRedo, FaFileInvoice } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import api from "../utils/api";

const LIST_URL = "/purchases/list";

const ENTRY_OPTIONS = [10, 25, 50, 100];

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/** Purchase date as dd/mm/yyyy */
function formatPurchaseDate(val) {
  if (val == null || val === "") return "—";
  const s = String(val).trim().slice(0, 10);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    const [, y, mo, d] = iso;
    return `${d}/${mo}/${y}`;
  }
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return s;
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = dt.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function vendorDisplay(row) {
  const c = row.company_name != null ? String(row.company_name).trim() : "";
  const v = row.vendor_name != null ? String(row.vendor_name).trim() : "";
  if (c) return c;
  if (v) return v;
  return "—";
}

function numQty(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function numMoney(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

export default function PurchaseReport() {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({
    grand_total_qty: 0,
    grand_total_amount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(LIST_URL, {
        params: {
          page,
          limit,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          search: debouncedSearch.trim() || undefined,
        },
      });
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      const tot = Number(res.data?.total ?? 0) || 0;
      const sum = res.data?.summary || {};
      setRows(data);
      setTotal(tot);
      setSummary({
        grand_total_qty: Number(sum.grand_total_qty ?? 0),
        grand_total_amount: Number(sum.grand_total_amount ?? 0),
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load purchase report");
      setRows([]);
      setTotal(0);
      setSummary({ grand_total_qty: 0, grand_total_amount: 0 });
    } finally {
      setLoading(false);
    }
  }, [page, limit, fromDate, toDate, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fromDate, toDate]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const handleLimitChange = (e) => {
    const next = Math.max(10, parseInt(e.target.value, 10) || 25);
    setLimit(next);
    setPage(1);
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setSearch("");
    setPage(1);
    setLimit(25);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

  const downloadExcel = async () => {
    if (total === 0) {
      toast.info("No rows to export for the current filters.");
      return;
    }
    setExporting(true);
    try {
      const exportLimit = Math.min(50000, total);
      const res = await api.get(LIST_URL, {
        params: {
          page: 1,
          limit: exportLimit,
          export: "1",
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          search: debouncedSearch.trim() || undefined,
        },
      });
      const allRows = Array.isArray(res.data?.data) ? res.data.data : [];
      const sum = res.data?.summary || {
        grand_total_qty: summary.grand_total_qty,
        grand_total_amount: summary.grand_total_amount,
      };
      const gQty = Number(sum.grand_total_qty ?? 0);
      const gAmt = Number(sum.grand_total_amount ?? 0);

      const aoa = [
        ["Sri Gomatha Traders Purchase Report"],
        [
          "Period",
          fromDate || "All",
          toDate || "All",
        ],
        [
          "Search (vendor / company / contact)",
          debouncedSearch.trim() || "—",
        ],
        [],
        [
          "S.No",
          "Vendor Name",
          "Invoice No",
          "Purchase Date (dd/mm/yyyy)",
          "Product Name",
          "Quantity",
          "Purchase Price",
          "Total Price",
        ],
        ...allRows.map((r, i) => {
          const items = Array.isArray(r.items) ? r.items : [];
          if (items.length > 0) {
            return [
              i + 1,
              vendorDisplay(r),
              r.purchase_no || "—",
              formatPurchaseDate(r.purchase_date),
              items.map((it) => it.product_name ?? "—").join("\n"),
              items.map((it) => numQty(it.qty)).join("\n"),
              items.map((it) => numMoney(it.price)).join("\n"),
              items.map((it) => numMoney(it.line_total != null ? it.line_total : it.total)).join("\n") +
                (items.length > 1
                  ? `\nTotal: ${items.reduce((sum, it) => sum + numMoney(it.line_total != null ? it.line_total : it.total), 0)}`
                  : ""),
            ];
          }
          return [
            i + 1,
            vendorDisplay(r),
            r.purchase_no || "—",
            formatPurchaseDate(r.purchase_date),
            r.product_name ?? "—",
            numQty(r.qty),
            numMoney(r.price),
            numMoney(r.line_total != null ? r.line_total : r.total),
          ];
        }),
        [],
        ["", "", "", "", "Grand Total Quantity", gQty, "", ""],
        ["", "", "", "", "Grand Total Amount", "", "", gAmt],
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Purchase Report");
      const fname = `purchase_report_${fromDate || "all"}_${toDate || "all"}.xlsx`;
      XLSX.writeFile(wb, fname);
      toast.success("Excel file downloaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const startSerial = (page - 1) * limit;

  return (
    <Container fluid className="p-3 purchase-report-page">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h4 className="mb-0 fw-semibold text-dark">Purchase Report</h4>
          <div className="small text-muted">
            Product-level lines · Vendor name &amp; contact search · Branch-scoped
          </div>
        </div>
      </div>

      <Card className="shadow-sm border-0">
        <CardBody className="p-3 p-md-4">
          <Row className="g-3 mb-3 align-items-end">
            <Col xs={12} md={4} lg={4}>
              <Label className="small fw-semibold text-secondary mb-1">Search</Label>
              <Input
                bsSize="sm"
                placeholder="Vendor name, company, or contact number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>
            <Col xs={6} md={2} lg={2}>
              <Label className="small fw-semibold text-secondary mb-1">From date</Label>
              <Input
                type="date"
                bsSize="sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </Col>
            <Col xs={6} md={2} lg={2}>
              <Label className="small fw-semibold text-secondary mb-1">To date</Label>
              <Input
                type="date"
                bsSize="sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </Col>
            <Col xs={12} md={4} lg={4} className="d-flex flex-wrap gap-2 align-items-end">
              <Button
                color="light"
                size="sm"
                className="border"
                onClick={resetFilters}
                disabled={loading || exporting}
                type="button"
              >
                <FaRedo className="me-1" />
                Reset
              </Button>
              <Button
                color="success"
                size="sm"
                onClick={downloadExcel}
                disabled={loading || exporting || total === 0}
                type="button"
              >
                {exporting ? (
                  <>
                    <Spinner size="sm" className="me-1" /> Export…
                  </>
                ) : (
                  <>
                    <FaFileExcel className="me-1" />
                    Excel export
                  </>
                )}
              </Button>
            </Col>
          </Row>

          <Row className="mb-2 align-items-center g-2">
            <Col xs="auto" className="d-flex align-items-center gap-2">
              <Label className="small mb-0 text-secondary">Show</Label>
              <Input
                type="select"
                bsSize="sm"
                style={{ width: "auto", minWidth: 72 }}
                value={limit}
                onChange={handleLimitChange}
                disabled={loading}
              >
                {ENTRY_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Input>
              <span className="small text-muted">entries</span>
            </Col>
            <Col className="small text-muted">
              {loading ? (
                <span className="d-inline-flex align-items-center gap-2">
                  <Spinner size="sm" /> Loading…
                </span>
              ) : (
                <>
                  <FaSearch className="me-1 text-secondary" />
                  {total.toLocaleString("en-IN")} line item{total !== 1 ? "s" : ""} match filters
                  {total > 50000 && (
                    <span className="text-warning ms-1">
                      (export capped at 50,000 rows; narrow filters if needed)
                    </span>
                  )}
                </>
              )}
            </Col>
          </Row>

          <div
            className="table-responsive rounded border"
            style={{ maxHeight: "min(70vh, 640px)", overflow: "auto" }}
          >
            <Table hover size="sm" className="align-middle mb-0 purchase-report-table">
              <thead className="table-light sticky-top shadow-sm">
                <tr className="small text-uppercase text-secondary">
                  <th style={{ width: 56 }} className="text-center">
                    S.No
                  </th>
                  <th>Vendor name</th>
                  <th>Invoice No</th>
                  <th style={{ width: 110 }}>Purchase date</th>
                  <th>Product name</th>
                  <th className="text-end" style={{ width: 88 }}>
                    Qty
                  </th>
                  <th className="text-end" style={{ width: 110 }}>
                    Purchase price
                  </th>
                  <th className="text-end" style={{ width: 120 }}>
                    Total price
                  </th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-5">
                      No purchase lines found. Adjust dates or search.
                    </td>
                  </tr>
                )}
                {rows.map((r, idx) => {
                  const items = Array.isArray(r.items) ? r.items : [];
                  const key = `p-${r.purchase_id}-${idx}`;
                  return (
                    <tr key={key}>
                      <td className="text-center text-muted">{startSerial + idx + 1}</td>
                      <td className="fw-medium">{vendorDisplay(r)}</td>
                      <td>{r.purchase_no || "—"}</td>
                      <td className="text-nowrap">{formatPurchaseDate(r.purchase_date)}</td>
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
                                {numQty(it.qty).toLocaleString("en-IN")}
                              </div>
                            ))}
                          </div>
                        ) : (
                          numQty(r.qty).toLocaleString("en-IN")
                        )}
                      </td>
                      <td className="text-end">
                        {items.length > 0 ? (
                          <div>
                            {items.map((it, i) => (
                              <div key={i} className={i > 0 ? "border-top pt-1 mt-1" : ""}>
                                ₹{numMoney(it.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            ))}
                          </div>
                        ) : (
                          r.price != null ? `₹${numMoney(r.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"
                        )}
                      </td>
                      <td className="text-end fw-semibold">
                        {items.length > 0 ? (
                          <div>
                            {items.map((it, i) => {
                              const itemTotal = it.line_total != null ? it.line_total : it.total;
                              return (
                                <div key={i} className={i > 0 ? "border-top pt-1 mt-1" : ""}>
                                  ₹{numMoney(itemTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              );
                            })}
                            {items.length > 1 && (
                              <div className="border-top border-secondary pt-1 mt-1 fw-bold text-primary">
                                Total: ₹{items.reduce((sum, it) => sum + numMoney(it.line_total != null ? it.line_total : it.total), 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
                          </div>
                        ) : (
                          `₹${(r.line_total != null ? numMoney(r.line_total) : numMoney(r.total)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="table-secondary fw-semibold">
                  <tr>
                    <td colSpan={5} className="text-end border-top">
                      Grand totals
                    </td>
                    <td className="text-end border-top">
                      {summary.grand_total_qty.toLocaleString("en-IN", {
                        maximumFractionDigits: 4,
                      })}
                    </td>
                    <td className="border-top" />
                    <td className="text-end border-top">
                      ₹
                      {summary.grand_total_amount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>

          {total > limit && (
            <div className="d-flex justify-content-center mt-3">
              <Pagination className="mb-0">
                <PaginationItem disabled={page <= 1}>
                  <PaginationLink
                    previous
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage((p) => p - 1);
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pNum;
                  if (totalPages <= 5) pNum = i + 1;
                  else if (page <= 3) pNum = i + 1;
                  else if (page >= totalPages - 2) pNum = totalPages - 4 + i;
                  else pNum = page - 2 + i;
                  return (
                    <PaginationItem key={pNum} active={pNum === page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(pNum);
                        }}
                      >
                        {pNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem disabled={page >= totalPages}>
                  <PaginationLink
                    next
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage((p) => p + 1);
                    }}
                  />
                </PaginationItem>
              </Pagination>
            </div>
          )}
        </CardBody>
      </Card>
    </Container>
  );
}
