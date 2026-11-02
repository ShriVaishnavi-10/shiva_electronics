import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Input,
  Label,
  Table,
  Button,
  Pagination,
  PaginationItem,
  PaginationLink,
} from "reactstrap";
import { FaSearch, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import { apiUrl } from "../config/urls";

const STOCK_IN_LIST_API = apiUrl("stocks/in/list");
const PRODUCT_SEARCH_API = apiUrl("products/search");
const VENDOR_SEARCH_API = apiUrl("vendors");

export default function StockInList() {
  const navigate = useNavigate();

  const [stockInItems, setStockInItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    product: "",
    vendor: "",
  });

  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [showProductSearchCard, setShowProductSearchCard] = useState(false);
  const productSearchRef = useRef(null);

  const [vendorSearchQuery, setVendorSearchQuery] = useState("");
  const [vendorSearchResults, setVendorSearchResults] = useState([]);
  const [showVendorSearchCard, setShowVendorSearchCard] = useState(false);
  const vendorSearchRef = useRef(null);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleProductSelect = (product) => {
    setFilters((prev) => ({ ...prev, product: product.product_name }));
    setProductSearchQuery(product.product_name);
    setShowProductSearchCard(false);
  };

  const handleVendorSelect = (vendor) => {
    setFilters((prev) => ({ ...prev, vendor: vendor.vendor_name }));
    setVendorSearchQuery(vendor.vendor_name);
    setShowVendorSearchCard(false);
  };

  const applyFilters = () => {
    setCurrentPage(1); 
    fetchStockInList();
  };

  const downloadCSV = () => {
    const header = [
      "Product Name",
      "Qty In",
      "Available Qty",
      "Selling Price",
      "Purchase No",
      "Vendor Name",
      "Purchase Date",
    ];
    const rows = stockInItems.map((item) => {
      const items = Array.isArray(item.items) ? item.items : [];
      let pNames, qtys, curQtys, prices;
      if (items.length > 0) {
        pNames = items.map((it) => it.product_name ?? "—").join("\n");
        qtys = items.map((it) => (Number(it.qty) || 0).toFixed(2)).join("\n");
        curQtys = items.map((it) => Number(it.current_qty || 0).toFixed(2)).join("\n");
        prices = items.map((it) => Number(it.selling_price ?? 0).toFixed(2)).join("\n");
      } else {
        pNames = item.product_name || "";
        qtys = (Number(item.qty) || 0).toFixed(2);
        curQtys = Number(item.current_qty || 0).toFixed(2);
        prices = Number(item.selling_price ?? 0).toFixed(2);
      }

      return [
        pNames,
        qtys,
        curQtys,
        prices,
        item.purchase_no || "",
        item.vendor_name || item.company_name || "",
        item.purchase_date
          ? new Date(item.purchase_date).toISOString().slice(0, 10)
          : "",
      ];
    });

    const escape = (val) => {
      const s = String(val ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n"))
        return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const csv = [header, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "stock_in_report.csv";
    link.click();
  };

  const resetFilters = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      product: "",
      vendor: "",
    });
    setProductSearchQuery("");
    setVendorSearchQuery("");
    setCurrentPage(1);
  };

  const fetchStockInList = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: limit,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        product: filters.product,
        vendor: filters.vendor,
      };
      const res = await axios.get(STOCK_IN_LIST_API, { params });
      setStockInItems(Array.isArray(res.data.data) ? res.data.data : []);
      setTotalItems(res.data.total || 0);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to fetch stock in list",
      );
      setStockInItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (queryText) => {
    try {
      const res = await axios.get(PRODUCT_SEARCH_API, {
        params: { q: queryText, limit: 10 },
      });
      setProductSearchResults(Array.isArray(res.data) ? res.data : []);
      setShowProductSearchCard(true);
    } catch (err) {
      console.error("Product search error:", err);
      setProductSearchResults([]);
    }
  };

  const searchVendors = async (queryText) => {
    try {
      const res = await axios.get(VENDOR_SEARCH_API, {
        params: { search: queryText, all: "true" },
      });
      setVendorSearchResults(Array.isArray(res.data.data) ? res.data.data : []);
      setShowVendorSearchCard(true);
    } catch (err) {
      console.error("Vendor search error:", err);
      setVendorSearchResults([]);
    }
  };

  useEffect(() => {
    fetchStockInList();
  }, [currentPage, limit, filters]); 
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (productSearchQuery.trim() && productSearchQuery !== filters.product) {
        searchProducts(productSearchQuery);
      } else if (!productSearchQuery.trim()) {
        setShowProductSearchCard(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [productSearchQuery, filters.product]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (vendorSearchQuery.trim() && vendorSearchQuery !== filters.vendor) {
        searchVendors(vendorSearchQuery);
      } else if (!vendorSearchQuery.trim()) {
        setShowVendorSearchCard(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [vendorSearchQuery, filters.vendor]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        productSearchRef.current &&
        !productSearchRef.current.contains(event.target)
      ) {
        setShowProductSearchCard(false);
      }
      if (
        vendorSearchRef.current &&
        !vendorSearchRef.current.contains(event.target)
      ) {
        setShowVendorSearchCard(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalPages = Math.ceil(totalItems / limit);

  const renderPaginationItems = () => {
    const items = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem
          key={i}
          active={i === currentPage}
          onClick={() => setCurrentPage(i)}
        >
          <PaginationLink href="#">{i}</PaginationLink>
        </PaginationItem>,
      );
    }
    return items;
  };

  return (
    <Container fluid className="p-4">
      <h4 className="mb-4">Stock In List</h4>

      <Card className="mb-3 shadow-sm">
        <CardBody>
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <Label>From Date</Label>
              <Input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleFilterChange}
              />
            </Col>
            <Col md={3}>
              <Label>To Date</Label>
              <Input
                type="date"
                name="toDate"
                value={filters.toDate}
                onChange={handleFilterChange}
              />
            </Col>
            <Col md={3} className="position-relative" ref={productSearchRef}>
              <Label>Product</Label>
              <Input
                type="text"
                name="product"
                placeholder="Search Product..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                onFocus={() =>
                  productSearchQuery.trim() &&
                  searchProducts(productSearchQuery)
                }
                autoComplete="off"
              />
              {showProductSearchCard && productSearchResults.length > 0 && (
                <Card
                  className="position-absolute w-100 shadow mt-1"
                  style={{ zIndex: 10, maxHeight: 200, overflowY: "auto" }}
                >
                  <CardBody className="p-2">
                    {productSearchResults.map((p) => (
                      <div
                        key={p.id}
                        className="p-2 border-bottom product-item"
                        style={{ cursor: "pointer" }}
                        onClick={() => handleProductSelect(p)}
                      >
                        <strong>{p.product_name}</strong>
                        <br />
                        <small className="text-muted">{p.category_name}</small>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              )}
            </Col>
            <Col md={3} className="position-relative" ref={vendorSearchRef}>
              <Label>Vendor</Label>
              <Input
                type="text"
                name="vendor"
                placeholder="Search Vendor..."
                value={vendorSearchQuery}
                onChange={(e) => setVendorSearchQuery(e.target.value)}
                onFocus={() =>
                  vendorSearchQuery.trim() && searchVendors(vendorSearchQuery)
                }
                autoComplete="off"
              />
              {showVendorSearchCard && vendorSearchResults.length > 0 && (
                <Card
                  className="position-absolute w-100 shadow mt-1"
                  style={{ zIndex: 10, maxHeight: 200, overflowY: "auto" }}
                >
                  <CardBody className="p-2">
                    {vendorSearchResults.map((v) => (
                      <div
                        key={v.id}
                        className="p-2 border-bottom vendor-item"
                        style={{ cursor: "pointer" }}
                        onClick={() => handleVendorSelect(v)}
                      >
                        <strong>{v.vendor_name}</strong>
                        <br />
                        <small className="text-muted">{v.company_name}</small>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              )}
            </Col>
            <Col md={6}>
              <Button color="primary" onClick={applyFilters} className="me-2">
                <FaSearch className="me-1" /> Search
              </Button>
              <Button color="secondary" onClick={resetFilters} outline>
                Reset
              </Button>
            </Col>
            <Col md={6} className="text-end">
              <Button color="success" className="me-2" onClick={downloadCSV}>
                Download CSV
              </Button>
              <Button
                color="success"
                onClick={() => navigate("/index/purchaseForm")}
              >
                <FaPlus className="me-1" /> Add Stock In
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      <Card className="shadow-sm">
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Label className="mb-0">
              Show
              <Input
                type="select"
                bsSize="sm"
                className="mx-2 d-inline-block w-auto"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </Input>
              entries
            </Label>
            <div>Total Items: {totalItems}</div>
          </div>

          <div className="table-responsive">
            <Table bordered hover size="sm" className="align-middle">
              <thead className="table-light text-center">
                <tr>
                  <th>S.No</th>
                  <th>Product Name</th>
                  <th>Qty</th>
                  <th>Available Qty</th>
                  <th>Selling Price</th>
                  <th>Purchase No</th>
                  <th>Vendor Name</th>
                  <th>Purchase Date</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {loading ? (
                  <tr>
                    <td colSpan="8">Loading...</td>
                  </tr>
                ) : stockInItems.length === 0 ? (
                  <tr>
                    <td colSpan="8">No stock in records found.</td>
                  </tr>
                ) : (
                  stockInItems.map((item, index) => {
                    const items = Array.isArray(item.items) ? item.items : [];
                    return (
                      <tr key={item.purchase_id || item.stock_in_id || index}>
                        <td>{(currentPage - 1) * limit + index + 1}</td>
                        <td className="text-start">
                          {items.length > 0 ? (
                            <div>
                              {items.map((it, idx) => (
                                <div key={idx} className={idx > 0 ? "border-top pt-1 mt-1" : ""}>
                                  {it.product_name ?? "—"}
                                </div>
                              ))}
                            </div>
                          ) : (
                            item.product_name || "N/A"
                          )}
                        </td>
                        <td>
                          {items.length > 0 ? (
                            <div>
                              {items.map((it, idx) => (
                                <div key={idx} className={idx > 0 ? "border-top pt-1 mt-1" : ""}>
                                  {Number(it.qty).toFixed(2)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            Number(item.qty).toFixed(2)
                          )}
                        </td>
                        <td>
                          {items.length > 0 ? (
                            <div>
                              {items.map((it, idx) => (
                                <div key={idx} className={idx > 0 ? "border-top pt-1 mt-1" : ""}>
                                  {Number(it.current_qty || 0).toFixed(2)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            Number(item.current_qty || 0).toFixed(2)
                          )}
                        </td>
                        <td>
                          {items.length > 0 ? (
                            <div>
                              {items.map((it, idx) => (
                                <div key={idx} className={idx > 0 ? "border-top pt-1 mt-1" : ""}>
                                  ₹{Number(it.selling_price || 0).toFixed(2)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            item.selling_price != null ? `₹${Number(item.selling_price).toFixed(2)}` : "—"
                          )}
                        </td>
                        <td>{item.purchase_no || "N/A"}</td>
                        <td className="text-start">
                          {item.vendor_name || item.company_name || "N/A"}
                        </td>
                        <td>
                          {item.purchase_date
                            ? (() => {
                                const d = new Date(item.purchase_date);
                                if (Number.isNaN(d.getTime())) return "N/A";
                                const dd = String(d.getDate()).padStart(2, "0");
                                const mm = String(d.getMonth() + 1).padStart(2, "0");
                                const yyyy = d.getFullYear();
                                return `${dd}-${mm}-${yyyy}`;
                              })()
                            : "N/A"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {!loading && stockInItems.length > 0 && (
                <tfoot className="text-center bg-light fw-bold">
                  <tr>
                    <td colSpan="2">Total</td>
                    <td>
                      {stockInItems.reduce(
                        (sum, item) => sum + (Number(item.qty) || 0),
                        0,
                      ).toFixed(2)}
                    </td>
                    <td>
                      {stockInItems.reduce(
                        (sum, item) => sum + (Number(item.current_qty) || 0),
                        0,
                      ).toFixed(2)}
                    </td>
                    <td colSpan="4"></td>
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>

          {totalPages > 1 && (
            <Pagination className="justify-content-center mt-3">
              <PaginationItem
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
              >
                <PaginationLink first href="#" />
              </PaginationItem>
              <PaginationItem
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <PaginationLink previous href="#" />
              </PaginationItem>
              {renderPaginationItems()}
              <PaginationItem
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <PaginationLink next href="#" />
              </PaginationItem>
              <PaginationItem
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                <PaginationLink last href="#" />
              </PaginationItem>
            </Pagination>
          )}
        </CardBody>
      </Card>
    </Container>
  );
}
