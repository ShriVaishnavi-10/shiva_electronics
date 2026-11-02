import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Table,
  Input,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Progress,
  Badge,
} from "reactstrap";
import {
  FaEdit,
  FaTrash,
  FaSearch,
  FaEye,
  FaCloudUploadAlt,
  FaDownload,
  FaFileAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaTimes,
  FaPrint,
} from "react-icons/fa";
import ReactPaginate from "react-paginate";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Barcode from "react-barcode";
import { useReactToPrint } from "react-to-print";
import { apiUrl } from "../config/urls";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";

function PrintBarcodeButton({ barcode, mrp }) {
  const handlePrint = () => {
    const qtyStr = window.prompt("How many labels do you want to print?", "2");
    if (qtyStr === null) return;
    const quantity = parseInt(qtyStr, 10);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Please enter a valid number");
      return;
    }

    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [100, 25]
      });

      // Generate barcode image using an in-memory canvas
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, barcode, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        width: 2,
        height: 60
      });
      const barcodeImgData = canvas.toDataURL("image/png");

      // Shared dimensions
      const barcodeW = 40; 
      const barcodeH = 12; 
      const topTextY = 5;
      const barcodeY = 7;
      const bottomTextY = 23;
      
      const priceText = mrp != null ? `MRP: Rs.${mrp}` : "MRP: Rs.0.00";
      const totalPages = Math.ceil(quantity / 2);
      let labelsPrinted = 0;

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage([100, 25], "landscape");
        }

        // --- Label 1 (Left 50mm) ---
        if (labelsPrinted < quantity) {
          const center1 = 25;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          pdf.setTextColor(0, 0, 0);
          pdf.text(barcode, center1, topTextY, { align: "center" });
          pdf.addImage(barcodeImgData, "PNG", center1 - (barcodeW / 2), barcodeY, barcodeW, barcodeH);
          pdf.text(priceText, center1, bottomTextY, { align: "center" });
          labelsPrinted++;
        }

        // --- Label 2 (Right 50mm) ---
        if (labelsPrinted < quantity) {
          const center2 = 75;
          pdf.setFontSize(12);
          pdf.text(barcode, center2, topTextY, { align: "center" });
          pdf.addImage(barcodeImgData, "PNG", center2 - (barcodeW / 2), barcodeY, barcodeW, barcodeH);
          pdf.text(priceText, center2, bottomTextY, { align: "center" });
          labelsPrinted++;
        }
      }

      // Open PDF in new tab
      const blobUrl = pdf.output("bloburl");
      const win = window.open(blobUrl, "_blank");
      if (win) {
         win.onload = () => { win.print(); };
      } else {
         pdf.save(`barcode-${barcode}.pdf`);
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF barcode.");
    }
  };

  return (
    <Button size="sm" color="dark" outline title="Print Barcode" onClick={handlePrint}>
      <FaPrint />
    </Button>
  );
}


const API = apiUrl("products");

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editData, setEditData] = useState({});
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  const [viewModal, setViewModal] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  /* Bulk Upload States */
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const ENTRY_OPTIONS = [25, 50, 100, 200];
  const [pageSize, setPageSize] = useState(25);
  
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [printQuantities, setPrintQuantities] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const res = await axios.get(API);
    setProducts(res.data);
  };

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearch(q);
    setPage(0);

    if (!q) return fetchProducts();

    const res = await axios.get(`${API}/search?q=${q}`);
    setProducts(res.data);
  };

  const toggle = () => setModal(!modal);

  const handleEdit = (row) => {
    setEditData(row);
    toggle();
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    await axios.put(`${API}/${editData.id}`, editData);
    toast.success("Product Updated");
    toggle();
    fetchProducts();
  };

  const openDeleteConfirm = (row) => {
    if (!row?.id) return;
    setDeleteTarget({
      id: row.id,
      label: row.product_name ? String(row.product_name) : `Product #${row.id}`,
    });
    setDeleteModal(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteModal(false);
    setDeleteTarget(null);
  };

  const confirmDeleteProduct = async () => {
    if (!deleteTarget?.id) return;
    try {
      await axios.delete(`${API}/${deleteTarget.id}`);
      toast.success("Product Deleted");
      closeDeleteConfirm();
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete product");
    }
  };

  const toggleViewModal = () => {
    setViewModal((open) => {
      const next = !open;
      if (open) {
        setViewDetail(null);
        setViewLoading(false);
      }
      return next;
    });
  };

  const handleViewProduct = async (id) => {
    setViewModal(true);
    setViewDetail(null);
    setViewLoading(true);
    try {
      const res = await axios.get(`${API}/${id}`);
      setViewDetail(res.data || null);
      if (!res.data) toast.error("Product not found");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load product details",
      );
      setViewDetail(null);
    } finally {
      setViewLoading(false);
    }
  };

  /* ================= BULK UPLOAD ================= */
  const toggleBulkModal = () => {
    setBulkModal((prev) => !prev);
    if (bulkModal) {
      setBulkFile(null);
      setUploadProgress(0);
      setUploadResult(null);
      setDragOver(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open(apiUrl("products/csv-template"), "_blank");
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Only .csv files are allowed");
      return;
    }
    setBulkFile(file);
    setUploadResult(null);
    setUploadProgress(0);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleBulkUpload = async () => {
    if (!bulkFile) return toast.error("Please select a CSV file");
    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", bulkFile);

    try {
      const res = await axios.post(`${API}/bulk-upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) {
            setUploadProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });
      setUploadResult(res.data);
      if (res.data.success_count > 0) {
        toast.success(
          `${res.data.success_count} product(s) uploaded successfully`,
        );
        fetchProducts();
      }
      if (res.data.error_count > 0) {
        toast.warn(`${res.data.error_count} row(s) had errors`);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Bulk upload failed";
      toast.error(msg);
      setUploadResult({ success_count: 0, error_count: 0, message: msg });
    } finally {
      setUploading(false);
    }
  };

  /* ================= BULK PRINT BARCODES ================= */
  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProductIds(currentPageData.map((p) => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleBulkPrint = () => {
    const selectedProducts = products.filter(p => selectedProductIds.includes(p.id) && p.barcode);
    if (selectedProducts.length === 0) {
      toast.warning("Please select products that have a barcode.");
      return;
    }

    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [100, 25]
      });

      const canvas = document.createElement("canvas");
      const barcodeW = 40;
      const barcodeH = 12;
      const topTextY = 5;
      const barcodeY = 7;
      const bottomTextY = 23;
      const center1 = 25;
      const center2 = 75;

      // Flatten the array so each product appears 'quantity' times based on its input
      const labelsToPrint = [];
      selectedProducts.forEach(p => {
        let quantity = parseInt(printQuantities[p.id], 10);
        if (isNaN(quantity) || quantity <= 0) {
          quantity = 1; // default to 1 if no valid value is entered
        }
        for (let i = 0; i < quantity; i++) {
          labelsToPrint.push(p);
        }
      });

      for (let i = 0; i < labelsToPrint.length; i += 2) {
        if (i > 0) {
          pdf.addPage([100, 25], "landscape");
        }
        
        // Draw Label 1 (Left)
        const p1 = labelsToPrint[i];
        JsBarcode(canvas, p1.barcode, { format: "CODE128", displayValue: false, margin: 0, width: 2, height: 60 });
        const imgData1 = canvas.toDataURL("image/png");
        const price1 = p1.price != null ? `MRP: Rs.${p1.price}` : "MRP: Rs.0.00";
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text(p1.barcode, center1, topTextY, { align: "center" });
        pdf.addImage(imgData1, "PNG", center1 - (barcodeW / 2), barcodeY, barcodeW, barcodeH);
        pdf.text(price1, center1, bottomTextY, { align: "center" });

        // Draw Label 2 (Right) if exists
        if (i + 1 < labelsToPrint.length) {
          const p2 = labelsToPrint[i + 1];
          JsBarcode(canvas, p2.barcode, { format: "CODE128", displayValue: false, margin: 0, width: 2, height: 60 });
          const imgData2 = canvas.toDataURL("image/png");
          const price2 = p2.price != null ? `MRP: Rs.${p2.price}` : "MRP: Rs.0.00";
          
          pdf.text(p2.barcode, center2, topTextY, { align: "center" });
          pdf.addImage(imgData2, "PNG", center2 - (barcodeW / 2), barcodeY, barcodeW, barcodeH);
          pdf.text(price2, center2, bottomTextY, { align: "center" });
        }
      }

      const blobUrl = pdf.output("bloburl");
      const win = window.open(blobUrl, "_blank");
      if (win) {
         win.onload = () => { win.print(); };
      } else {
         pdf.save("bulk-barcode-labels.pdf");
      }
    } catch (err) {
      console.error("Bulk PDF generation failed:", err);
      toast.error("Failed to generate bulk PDF barcodes.");
    }
  };


  const totalProducts = products.length;
  const pageCount = Math.max(1, Math.ceil(totalProducts / pageSize) || 1);
  const offset = page * pageSize;
  const currentPageData = products.slice(offset, offset + pageSize);
  const startEntry = totalProducts === 0 ? 0 : offset + 1;
  const endEntry = Math.min(offset + pageSize, totalProducts);

  useEffect(() => {
    setPage(0);
  }, [pageSize]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(totalProducts / pageSize) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [totalProducts, pageSize, page]);

  return (
    <Container fluid className="p-3 bg-light min-vh-100">
      <Row className="mb-3 align-items-center">
        <Col xs={12} md={6} className="mb-2 mb-md-0">
          <h4 className="fw-bold mb-0">Products List</h4>
        </Col>

        <Col xs={12} md={6}>
          <div className="d-flex gap-2">
            <Input
              placeholder="Search product / code / category / barcode"
              value={search}
              onChange={handleSearch}
            />
            <Button color="primary">
              <FaSearch />
            </Button>
          </div>
        </Col>
      </Row>
      <Row className="mb-2">
        <Col className="d-flex justify-content-end gap-2 flex-wrap">
          {selectedProductIds.length > 0 && (
            <Button
              size="sm"
              color="dark"
              onClick={handleBulkPrint}
            >
              <FaPrint className="me-1" /> Print Selected
            </Button>
          )}
          <Button
            size="sm"
            color="success"
            outline
            onClick={toggleBulkModal}
          >
            <FaCloudUploadAlt className="me-1" /> Bulk Upload
          </Button>
          <Button
            size="sm"
            color="primary"
            onClick={() => {
              navigate("/index/productForm");
            }}
          >
            + Add Product
          </Button>
        </Col>
      </Row>

      <div className="table-responsive shadow-sm rounded-3">
        <Table bordered hover className="bg-white mb-0 align-middle text-nowrap">
          <thead className="table-dark text-nowrap" style={{ background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)", color: "#FFD700" }}>
            <tr className="align-middle">
              <th style={{ width: "40px" }} className="text-center align-middle">
                <Input
                  type="checkbox"
                  onChange={toggleSelectAll}
                  checked={
                    currentPageData.length > 0 &&
                    currentPageData.every((p) => selectedProductIds.includes(p.id))
                  }
                />
              </th>
              <th className="align-middle">S.No</th>
              <th className="align-middle">Product Code</th>
              <th className="align-middle">Category</th>
              <th className="align-middle">Subcategory</th>
              <th className="align-middle">Product</th>
              <th className="align-middle">MRP</th>
              <th className="align-middle">Discount (%)</th>
              <th className="align-middle text-center">Barcode</th>
              <th style={{ width: "90px" }} className="align-middle text-center">Print Qty</th>
              <th style={{ minWidth: 140 }} className="align-middle text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {currentPageData.map((row, i) => (
              <tr key={row.id} className="align-middle text-nowrap">
                <td className="text-center">
                  <Input
                    type="checkbox"
                    checked={selectedProductIds.includes(row.id)}
                    onChange={() => toggleSelect(row.id)}
                  />
                </td>
                <td>{offset + i + 1}</td>
                <td className="fw-semibold">{row.product_code || "-"}</td>
                <td>{row.category_name}</td>
                <td>{row.subcategory_name || "-"}</td>
                <td className="fw-semibold" style={{ maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis" }} title={row.product_name}>
                  {row.product_name}
                </td>
                <td>{row.price != null ? row.price : "-"}</td>
                <td>{row.discount_percent != null ? row.discount_percent : "-"}</td>
                <td className="text-center">
                  {row.barcode ? (
                    <Barcode value={row.barcode} height={18} width={1} displayValue={true} fontSize={11} margin={0} background="transparent" />
                  ) : (
                    "-"
                  )}
                </td>
                <td className="text-center">
                  <Input
                    type="number"
                    min="1"
                    bsSize="sm"
                    className="mx-auto text-center"
                    style={{ width: "70px", padding: "0.2rem" }}
                    disabled={!selectedProductIds.includes(row.id)}
                    value={printQuantities[row.id] || ""}
                    onChange={(e) => setPrintQuantities({ ...printQuantities, [row.id]: e.target.value })}
                  />
                </td>
                <td className="text-center">
                  <div className="d-flex align-items-center justify-content-center gap-1.5 text-nowrap">
                    <Button
                      size="sm"
                      color="info"
                      outline
                      title="View"
                      className="px-2 py-1"
                      onClick={() => handleViewProduct(row.id)}
                    >
                      <FaEye />
                    </Button>
                    <Button
                      size="sm"
                      color="warning"
                      outline
                      title="Edit"
                      className="px-2 py-1"
                      onClick={() => navigate(`/index/productForm/${row.id}`)}
                    >
                      <FaEdit />
                    </Button>
                    <Button
                      size="sm"
                      color="danger"
                      outline
                      title="Delete"
                      className="px-2 py-1"
                      onClick={() => openDeleteConfirm(row)}
                    >
                      <FaTrash />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

            {!currentPageData.length && (
              <tr>
                <td colSpan="11" className="text-center text-muted py-4">
                  No Data Found
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Page size + pagination */}
      {totalProducts > 0 && (
        <>
          <Row className="mt-3 mb-2 align-items-center">
            <Col md={6} className="d-flex align-items-center gap-2 flex-wrap">
              <Label className="mb-0 small">Show</Label>
              <Input
                type="select"
                bsSize="sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                }}
                style={{ width: "auto", minWidth: 88 }}
              >
                {ENTRY_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Input>
              <span className="small text-muted">entries</span>
            </Col>
            <Col md={6} className="text-md-end small text-muted">
              Showing {startEntry} to {endEntry} of {totalProducts} entries
            </Col>
          </Row>
          <div className="d-flex justify-content-end flex-wrap gap-2">
            <ReactPaginate
              previousLabel={"← Prev"}
              nextLabel={"Next →"}
              pageCount={pageCount}
              forcePage={Math.min(page, pageCount - 1)}
              onPageChange={({ selected }) => setPage(selected)}
              pageRangeDisplayed={3}
              marginPagesDisplayed={1}
              containerClassName={"pagination mb-0 flex-wrap"}
              pageClassName={"page-item"}
              pageLinkClassName={"page-link"}
              previousClassName={"page-item"}
              previousLinkClassName={"page-link"}
              nextClassName={"page-item"}
              nextLinkClassName={"page-link"}
              activeClassName={"active"}
              breakClassName={"page-item"}
              breakLinkClassName={"page-link"}
              disabledClassName={"disabled"}
            />
          </div>
        </>
      )}

      <Modal isOpen={deleteModal} toggle={closeDeleteConfirm} centered size="md">
        <ModalHeader toggle={closeDeleteConfirm}>Confirm delete</ModalHeader>
        <ModalBody>
          {deleteTarget ? (
            <p className="mb-0">
              Are you sure you want to delete this product?
              <br />
              <span className="text-muted small">{deleteTarget.label}</span>
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline size="sm" onClick={closeDeleteConfirm}>
            Cancel
          </Button>
          <Button color="danger" size="sm" onClick={confirmDeleteProduct}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      {/* View product (read-only) */}
      <Modal isOpen={viewModal} toggle={toggleViewModal} centered size="lg">
        <ModalHeader toggle={toggleViewModal}>Product details</ModalHeader>
        <ModalBody>
          {viewLoading && (
            <p className="text-muted text-center py-3 mb-0">Loading…</p>
          )}
          {!viewLoading && !viewDetail && (
            <p className="text-muted text-center py-3 mb-0">
              Could not load this product.
            </p>
          )}
          {!viewLoading && viewDetail && (
            <>
              <Row className="g-2 mb-2 small">
                <Col md={4}>
                  <strong className="text-muted">Product</strong>
                  <div className="fw-semibold">{viewDetail.product_name || "—"}</div>
                </Col>
                <Col md={4}>
                  <strong className="text-muted">Product Code</strong>
                  <div className="fw-semibold">{viewDetail.product_code || "—"}</div>
                </Col>
                <Col md={4}>
                  <strong className="text-muted">Status</strong>
                  <div>{viewDetail.status || "—"}</div>
                </Col>
                <Col md={4}>
                  <strong className="text-muted">Category</strong>
                  <div>{viewDetail.category_name || "—"}</div>
                </Col>
                <Col md={4}>
                  <strong className="text-muted">Subcategory</strong>
                  <div>{viewDetail.subcategory_name || "—"}</div>
                </Col>
                <Col md={4}>
                  <strong className="text-muted">Brand</strong>
                  <div>{viewDetail.brand_name || "—"}</div>
                </Col>
                <Col md={4}>
                  <strong className="text-muted">HSN / SAC</strong>
                  <div>{viewDetail.hsncode ?? "—"}</div>
                </Col>
                <Col md={4}>
                  <strong className="text-muted">Primary unit</strong>
                  <div>{viewDetail.primary_unit || viewDetail.unit || "—"}</div>
                </Col>

                <Col md={4}>
                  <strong className="text-muted">Qty in stock</strong>
                  <div>{viewDetail.qty != null ? viewDetail.qty : "—"}</div>
                </Col>
                <Col md={4}>
                  <strong className="text-muted">Min. order qty</strong>
                  <div>{viewDetail.min_order_quantity ?? "—"}</div>
                </Col>
                <Col md={4}>
                  <strong className="text-muted">MRP</strong>
                  <div>{viewDetail.price != null ? viewDetail.price : "—"}</div>
                </Col>

                {(viewDetail.length != null && viewDetail.length !== "") ||
                (viewDetail.width != null && viewDetail.width !== "") ||
                (viewDetail.sqft != null && viewDetail.sqft !== "") ? (
                  <>
                    <Col md={4}>
                      <strong className="text-muted">Length</strong>
                      <div>{viewDetail.length ?? "—"}</div>
                    </Col>
                    <Col md={4}>
                      <strong className="text-muted">Width</strong>
                      <div>{viewDetail.width ?? "—"}</div>
                    </Col>
                    <Col md={4}>
                      <strong className="text-muted">Sqft</strong>
                      <div>{viewDetail.sqft ?? "—"}</div>
                    </Col>
                  </>
                ) : null}
              </Row>

              {/* CATEGORY-SPECIFIC SPECIFICATIONS */}
              {(() => {
                let specs = viewDetail.specifications;
                if (typeof specs === "string") {
                  try {
                    specs = JSON.parse(specs);
                  } catch (e) {
                    specs = null;
                  }
                }
                if (!specs || typeof specs !== "object" || Object.keys(specs).length === 0) return null;

                const type = viewDetail.product_type || "";
                const typeLabel =
                  type === "furniture"
                    ? "🛋️ Furniture Specifications"
                    : type === "home_appliances"
                    ? "📺 Home Appliance Specifications"
                    : type === "mobiles"
                    ? "📱 Mobile Phone Specifications"
                    : "Product Specifications";

                return (
                  <div className="mt-3 p-3 bg-light border rounded">
                    <h6 className="fw-bold mb-2 text-primary">{typeLabel}</h6>
                    <Row className="g-2 small">
                      {Object.entries(specs).map(([key, value]) => {
                        if (value == null || value === "") return null;
                        let formattedKey = key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase());
                        if (key.toLowerCase() === "ram") formattedKey = "RAM";
                        if (key.toLowerCase() === "rom") formattedKey = "ROM";
                        if (key.toLowerCase() === "processor_os") formattedKey = "Processor / OS";
                        return (
                          <Col md={4} key={key}>
                            <strong className="text-muted d-block">{formattedKey}</strong>
                            <div className="fw-semibold">{String(value)}</div>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>
                );
              })()}

              {viewDetail.images ? (
                <div className="small">
                  <strong className="text-muted">Images / file</strong>
                  <div className="text-break">{String(viewDetail.images)}</div>
                </div>
              ) : null}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleViewModal}>
            Close
          </Button>
          {viewDetail?.id ? (
            <Button
              color="primary"
              onClick={() => {
                toggleViewModal();
                navigate(`/index/productForm/${viewDetail.id}`);
              }}
            >
              Edit product
            </Button>
          ) : null}
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={modal} toggle={toggle} centered>
        <ModalHeader toggle={toggle}>Edit Product</ModalHeader>
        <ModalBody>
          <Form onSubmit={handleUpdate}>
            <FormGroup>
              <Label>Product Name</Label>
              <Input
                value={editData.product_name || ""}
                onChange={(e) =>
                  setEditData({ ...editData, product_name: e.target.value })
                }
                required
              />
            </FormGroup>

            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label>Length</Label>
                  <Input
                    value={editData.length || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, length: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Width</Label>
                  <Input
                    value={editData.width || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, width: e.target.value })
                    }
                  />
                </FormGroup>
              </Col>
            </Row>

            <FormGroup>
              <Label>Sqft</Label>
              <Input
                value={editData.sqft || ""}
                onChange={(e) =>
                  setEditData({ ...editData, sqft: e.target.value })
                }
              />
            </FormGroup>

            <div className="text-end">
              <Button color="success">Update</Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>

      {/* ================= BULK UPLOAD MODAL ================= */}
      <Modal
        isOpen={bulkModal}
        toggle={toggleBulkModal}
        centered
        size="lg"
      >
        <ModalHeader toggle={toggleBulkModal}>
          <FaCloudUploadAlt className="me-2" />
          Bulk Upload Products
        </ModalHeader>
        <ModalBody>
          {/* Step 1: Download Template */}
          <div
            className="p-3 mb-3 rounded-3 d-flex align-items-center justify-content-between"
            style={{ background: "#eef6ff", border: "1px solid #c5dcf7" }}
          >
            <div>
              <h6 className="mb-1 fw-bold" style={{ color: "#1a5fb4" }}>
                Step 1: Download CSV Template
              </h6>
              <small className="text-muted">
                Download the template, fill in your product data offline, then upload.
              </small>
            </div>
            <Button
              color="primary"
              outline
              size="sm"
              onClick={handleDownloadTemplate}
            >
              <FaDownload className="me-1" /> Download Template
            </Button>
          </div>

          {/* Step 2: Upload */}
          <div
            className="p-3 mb-3 rounded-3"
            style={{ background: "#f0faf0", border: "1px solid #b7e4b7" }}
          >
            <h6 className="mb-2 fw-bold" style={{ color: "#2a7d2a" }}>
              Step 2: Upload CSV File
            </h6>

            {/* Drag & Drop Zone */}
            <div
              className={`text-center p-4 rounded-3 ${dragOver ? "border-primary bg-white" : ""}`}
              style={{
                border: `2px dashed ${dragOver ? "#0d6efd" : "#ced4da"}`,
                background: dragOver ? "#f0f7ff" : "#fafafa",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                className="d-none"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />

              {bulkFile ? (
                <div>
                  <FaFileAlt
                    size={36}
                    className="mb-2"
                    style={{ color: "#2a7d2a" }}
                  />
                  <p className="mb-1 fw-semibold">{bulkFile.name}</p>
                  <small className="text-muted">
                    {(bulkFile.size / 1024).toFixed(1)} KB
                  </small>
                  <div className="mt-2">
                    <Button
                      size="sm"
                      color="danger"
                      outline
                      onClick={(e) => {
                        e.stopPropagation();
                        setBulkFile(null);
                        setUploadResult(null);
                        setUploadProgress(0);
                      }}
                    >
                      <FaTimes className="me-1" /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <FaCloudUploadAlt
                    size={42}
                    className="mb-2 text-muted"
                  />
                  <p className="mb-1 fw-semibold text-muted">
                    Drag & drop your CSV file here
                  </p>
                  <small className="text-muted">
                    or click to browse (only .csv files, max 10 MB)
                  </small>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="mt-3">
                <div className="d-flex justify-content-between mb-1">
                  <small className="fw-semibold">Uploading...</small>
                  <small>{uploadProgress}%</small>
                </div>
                <Progress
                  value={uploadProgress}
                  animated
                  striped
                  color="primary"
                  style={{ height: 8 }}
                />
              </div>
            )}
          </div>

          {/* Upload Results */}
          {uploadResult && (
            <div
              className="p-3 rounded-3"
              style={{
                background:
                  uploadResult.error_count > 0 ? "#fff8f0" : "#f0faf0",
                border: `1px solid ${uploadResult.error_count > 0 ? "#f0c87a" : "#b7e4b7"}`,
              }}
            >
              <h6 className="fw-bold mb-3">Upload Results</h6>
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <div className="d-flex align-items-center gap-2 p-2 rounded bg-white border">
                    <FaCheckCircle size={20} className="text-success" />
                    <div>
                      <div className="fw-bold text-success fs-5">
                        {uploadResult.success_count || 0}
                      </div>
                      <small className="text-muted">
                        Successfully Uploaded
                      </small>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center gap-2 p-2 rounded bg-white border">
                    <FaTimesCircle size={20} className="text-danger" />
                    <div>
                      <div className="fw-bold text-danger fs-5">
                        {uploadResult.error_count || 0}
                      </div>
                      <small className="text-muted">Failed Rows</small>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Error Details */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  <Table
                    size="sm"
                    bordered
                    className="mb-0 bg-white align-middle"
                  >
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: 60 }}>Row</th>
                        <th>Product</th>
                        <th>Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.errors.map((err, i) => (
                        <tr key={i}>
                          <td>
                            <Badge color="secondary">{err.row}</Badge>
                          </td>
                          <td className="small">
                            {err.data?.product_name || "-"}
                          </td>
                          <td>
                            {err.errors.map((e, j) => (
                              <div key={j} className="text-danger small">
                                {e}
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleBulkModal}>
            Close
          </Button>
          <Button
            color="primary"
            onClick={handleBulkUpload}
            disabled={!bulkFile || uploading}
          >
            {uploading ? "Uploading..." : "Upload & Import"}
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
}
