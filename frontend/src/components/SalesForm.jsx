import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  Col,
  Input,
  Button,
  Card,
  CardBody,
  Row,
  Table,
  Label,
  FormGroup,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  Badge,
  Spinner,
} from "reactstrap";
import {
  FaPlus,
  FaTrash,
  FaSearch,
  FaEdit,
  FaReply,
  FaTimes,
  FaChevronDown,
  FaPrint,
  FaRupeeSign,
  FaHistory,
  FaKeyboard,
  FaBox,
  FaListUl,
  FaPercent,
  FaMapMarkerAlt,
  FaUser,
  FaCalendarAlt,
  FaFileInvoice,
  FaSave,
  FaCreditCard,
  FaLayerGroup,
  FaReceipt,
  FaUserPlus,
  FaGlobe,
  FaCopy,
  FaCheck,
  FaPhone,
  FaBuilding,
  FaTruck,
  FaPlusCircle,
  FaUserTie,
  FaExclamationTriangle,
  FaRedo,
} from "react-icons/fa";
import { toast } from "react-toastify";
import api, { getActiveBranchId } from "../utils/api";
import { apiUrl } from "../config/urls";
import BillToModal, { INDIAN_STATES } from "./BillToModal";

const CUSTOMER_API = apiUrl("customers");
const PRODUCT_API = apiUrl("products");
const TRANSACTION_API = apiUrl("transactions");
const TAX_GROUPS_API = apiUrl("tax-groups");
const LOCATIONS_API = apiUrl("locations");

function getLocationDisplayName(loc) {
  if (!loc) return "";
  let cityOrName = loc.city || loc.name || "";
  if (
    loc.landmark &&
    loc.landmark.toLowerCase().includes("attur") &&
    !cityOrName.toLowerCase().includes("attur")
  ) {
    cityOrName = "Attur";
  }
  const idStr = loc.location_id ? ` (${loc.location_id})` : "";
  return `${cityOrName}${idStr}`;
}

function splitInvoiceTail(full) {
  const s = String(full || "").trim();
  const m = s.match(/^(.*?)(\d+)$/);
  if (!m) return null;
  return { prefix: m[1], raw: parseInt(m[2], 10), pad: m[2].length };
}

async function ensureUniqueInvoiceString(startingFull, branchId, isNonGst = false) {
  const trimmed = String(startingFull || "").trim();
  if (!trimmed) return "";
  if (branchId == null || Number.isNaN(Number(branchId))) {
    toast.error(
      "Select an active branch. Numbers are branch-specific from Invoice Number Settings.",
    );
    return trimmed;
  }

  let parts = splitInvoiceTail(trimmed);
  if (!parts || !Number.isFinite(parts.raw)) {
    let peekRes;
    if (branchId) {
      peekRes = await api.get("/branches/peek-number", {
        params: { type: isNonGst ? "non_gst_sale" : "sale", branch_id: branchId },
      });
    } else {
      try {
        peekRes = await api.get("/transactions/next-invoice");
      } catch {
        toast.error(
          "Select an active branch. Invoice numbers use Branch → Invoice Number Settings only.",
        );
        return "";
      }
      const d = peekRes.data || {};
      return ensureUniqueFromParts(
        {
          prefix: d.prefix != null ? String(d.prefix) : "",
          raw: Number(d.raw) || 1,
          pad: Number(d.suffix_length) || 2,
        },
        d.invoice_no ||
        `${d.prefix || ""}${String(d.raw || 1).padStart(Number(d.suffix_length) || 2, "0")}`,
        branchId,
        isNonGst,
      );
    }
    const p = peekRes.data || {};
    const prefix = p.prefix != null ? String(p.prefix) : "";
    let raw = Number(p.raw);
    if (!Number.isFinite(raw)) {
      const suf = String(p.next_number || "").slice(prefix.length);
      raw = parseInt(String(suf).replace(/\D/g, ""), 10) || 1;
    }
    const pad = Number(p.suffix_length) || Math.max(2, String(raw).length);
    return ensureUniqueFromParts(
      { prefix, raw, pad },
      String(p.next_number || "").trim(),
      branchId,
      isNonGst,
    );
  }

  return ensureUniqueFromParts(parts, trimmed, branchId, isNonGst);
}

async function ensureUniqueFromParts(parts, firstFull, branchId, isNonGst = false) {
  let { prefix, raw, pad } = parts;
  if (isNonGst) pad = Math.max(2, pad || 2);
  let current = firstFull || `${prefix}${String(raw).padStart(pad, "0")}`;
  for (let attempt = 0; attempt < 500; attempt++) {
    const { data } = await api.get("/transactions/check-invoice-no", {
      params: {
        invoice_no: current,
        ...(isNonGst ? { is_gst: 0 } : { is_gst: 1 }),
        ...(branchId != null && !Number.isNaN(branchId)
          ? { branch_id: branchId }
          : {}),
      },
    });
    if (!data?.exists) return current;
    raw += 1;
    pad = Math.max(pad, String(raw).length);
    current = prefix + String(raw).padStart(pad, "0");
  }
  toast.error("Could not find a free invoice number.");
  return firstFull;
}

const PAYMENT_METHODS = [
  "Cash",
  "Credit",
  "Credit Card",
  "Debit Card",
  "UPI",
  "GPay",
  "PhonePe",
  "Paytm",
  "Net Banking",
  "Cheque",
  "Bank Transfer",
];

const CARD_TYPES = ["Visa", "Mastercard", "RuPay", "American Express", "Other"];

const STATUS_OPTIONS = ["Final", "Draft", "Quotation"];

const INVOICE_SCHEMES = ["Standard", "GST", "Non-GST"];

const COMMON_COUNTRIES = [
  "India",
  "United Arab Emirates",
  "Saudi Arabia",
  "Singapore",
  "Malaysia",
  "United States",
  "United Kingdom",
  "Sri Lanka",
  "Qatar",
  "Oman",
  "Kuwait",
  "Australia",
  "Canada",
];

function AdvanceStateSelect({ value, onChange, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedStateObj = INDIAN_STATES.find(
    (s) => s.name.toLowerCase() === (value || "").toLowerCase()
  );

  const filteredStates = useMemo(() => {
    if (!search.trim()) return INDIAN_STATES;
    const term = search.toLowerCase().trim();
    return INDIAN_STATES.filter(
      (s) => s.name.toLowerCase().includes(term) || s.code.includes(term)
    );
  }, [search]);

  useEffect(() => {
    const handleDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleDocClick);
    }
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      const idx = filteredStates.findIndex(
        (s) => s.name.toLowerCase() === (value || "").toLowerCase()
      );
      setActiveIndex(idx >= 0 ? idx : 0);
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll(".state-option-item");
      if (items && items[activeIndex]) {
        items[activeIndex].scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [activeIndex, isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (!filteredStates.length) return;
      setActiveIndex((prev) => (prev < filteredStates.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (!filteredStates.length) return;
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredStates.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && filteredStates.length > 0) {
        const chosen = filteredStates[activeIndex >= 0 ? activeIndex : 0];
        if (chosen) {
          onChange(chosen.name, chosen.code);
          setIsOpen(false);
        }
      } else {
        setIsOpen(true);
      }
    } else if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  return (
    <div className="position-relative" ref={containerRef}>
      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => setIsOpen((prev) => !prev)}
        className="d-flex align-items-center justify-content-between px-3 bg-white"
        style={{
          height: "38px",
          borderRadius: "8px",
          border: isOpen ? "1.5px solid #D49A00" : error ? "1.5px solid #EF4444" : "1.5px solid #CBD5E1",
          boxShadow: isOpen ? "0 0 0 3px rgba(212,154,0,0.18)" : "none",
          cursor: "pointer",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        <div className="d-flex align-items-center gap-2 text-truncate" style={{ flex: 1, minWidth: 0 }}>
          <FaMapMarkerAlt style={{ color: "#D49A00", flexShrink: 0 }} size={13} />
          <span className="fw-semibold text-truncate" style={{ fontSize: "0.88rem", color: value ? "#0F172A" : "#94A3B8" }}>
            {selectedStateObj ? selectedStateObj.name : (value || "-- Select State --")}
          </span>
          {selectedStateObj && (
            <span
              className="badge rounded-pill fw-bold"
              style={{
                backgroundColor: "#FEF3C7",
                color: "#92400E",
                border: "1px solid #FDE68A",
                fontSize: "0.7rem",
                padding: "2px 7px",
              }}
            >
              Code {selectedStateObj.code}
            </span>
          )}
        </div>
        <FaChevronDown
          style={{
            fontSize: "0.75rem",
            color: "#64748B",
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
            marginLeft: "6px",
          }}
        />
      </div>

      {isOpen && (
        <div
          className="position-absolute w-100 shadow-lg border-0 bg-white"
          style={{
            zIndex: 1060,
            top: "calc(100% + 4px)",
            left: 0,
            borderRadius: "10px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            border: "1px solid #E2E8F0",
            overflow: "hidden",
          }}
        >
          <div className="p-2 border-bottom bg-light">
            <div
              className="d-flex align-items-center bg-white px-2 py-1"
              style={{ borderRadius: "6px", border: "1px solid #CBD5E1" }}
            >
              <FaSearch className="text-muted me-2" size={12} style={{ opacity: 0.6 }} />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search state name or code (e.g. 33, Tamil)..."
                className="border-0 shadow-none p-0 flex-grow-1"
                style={{ fontSize: "0.82rem", outline: "none", backgroundColor: "transparent" }}
              />
              {search && (
                <FaTimes
                  className="text-muted"
                  size={11}
                  style={{ cursor: "pointer", opacity: 0.6 }}
                  onClick={() => {
                    setSearch("");
                    setActiveIndex(0);
                    if (searchInputRef.current) searchInputRef.current.focus();
                  }}
                />
              )}
            </div>
          </div>

          <div
            ref={listRef}
            style={{
              maxHeight: "220px",
              overflowY: "auto",
              padding: "4px",
            }}
          >
            {filteredStates.length > 0 ? (
              filteredStates.map((st, idx) => {
                const isSelected = st.name.toLowerCase() === (value || "").toLowerCase();
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={st.code}
                    className="p-2 rounded d-flex justify-content-between align-items-center state-option-item"
                    style={{
                      cursor: "pointer",
                      transition: "background-color 0.12s, border-left-color 0.12s",
                      backgroundColor: isActive ? "#FFFBEB" : isSelected ? "#F8FAFC" : "transparent",
                      borderLeft: isActive
                        ? "3px solid #D49A00"
                        : isSelected
                          ? "3px solid #D49A00"
                          : "3px solid transparent",
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => {
                      onChange(st.name, st.code);
                      setIsOpen(false);
                    }}
                  >
                    <span
                      className="fw-semibold"
                      style={{
                        fontSize: "0.86rem",
                        color: isActive || isSelected ? "#92400E" : "#1E293B",
                      }}
                    >
                      {st.name}
                    </span>
                    <div className="d-flex align-items-center gap-1.5">
                      <span
                        className="badge rounded-pill"
                        style={{
                          fontSize: "0.68rem",
                          backgroundColor: isActive || isSelected ? "#D49A00" : "#E2E8F0",
                          color: isActive || isSelected ? "#08090D" : "#475569",
                          fontWeight: isActive || isSelected ? "700" : "500",
                        }}
                      >
                        {st.code}
                      </span>
                      {isSelected && <FaCheck size={11} style={{ color: "#D49A00" }} className="ms-1" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-muted p-3 text-center small">
                No matching state found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdvanceCountrySelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return COMMON_COUNTRIES;
    const t = search.toLowerCase().trim();
    return COMMON_COUNTRIES.filter((c) => c.toLowerCase().includes(t));
  }, [search]);

  useEffect(() => {
    const handleDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleDocClick);
    }
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [isOpen]);

  return (
    <div className="position-relative" ref={containerRef}>
      <div
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        className="d-flex align-items-center justify-content-between px-3 bg-white"
        style={{
          height: "38px",
          borderRadius: "8px",
          border: isOpen ? "1.5px solid #D49A00" : "1.5px solid #CBD5E1",
          boxShadow: isOpen ? "0 0 0 3px rgba(212,154,0,0.18)" : "none",
          cursor: "pointer",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        <div className="d-flex align-items-center gap-2 text-truncate">
          <FaGlobe style={{ color: "#D49A00", flexShrink: 0 }} size={13} />
          <span className="fw-semibold text-truncate" style={{ fontSize: "0.88rem", color: value ? "#0F172A" : "#94A3B8" }}>
            {value || "India"}
          </span>
        </div>
        <FaChevronDown
          style={{
            fontSize: "0.75rem",
            color: "#64748B",
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </div>

      {isOpen && (
        <div
          className="position-absolute w-100 shadow-lg border-0 bg-white"
          style={{
            zIndex: 1060,
            top: "calc(100% + 4px)",
            left: 0,
            borderRadius: "10px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.18)",
            border: "1px solid #E2E8F0",
            overflow: "hidden",
          }}
        >
          <div className="p-2 border-bottom bg-light">
            <div
              className="d-flex align-items-center bg-white px-2.5 py-1"
              style={{ borderRadius: "6px", border: "1px solid #CBD5E1" }}
            >
              <FaSearch className="text-muted me-2" size={12} style={{ opacity: 0.6 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="border-0 shadow-none p-0 flex-grow-1"
                style={{ fontSize: "0.82rem", outline: "none", backgroundColor: "transparent" }}
                autoFocus
              />
            </div>
          </div>
          <div style={{ maxHeight: "180px", overflowY: "auto", padding: "4px" }}>
            {filtered.map((c) => {
              const isSelected = (value || "India").toLowerCase() === c.toLowerCase();
              return (
                <div
                  key={c}
                  className="p-2 rounded d-flex justify-content-between align-items-center"
                  style={{
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#FFFBEB" : "transparent",
                    borderLeft: isSelected ? "3px solid #D49A00" : "3px solid transparent",
                  }}
                  onClick={() => {
                    onChange(c);
                    setIsOpen(false);
                  }}
                >
                  <span
                    className="fw-semibold"
                    style={{ fontSize: "0.86rem", color: isSelected ? "#92400E" : "#1E293B" }}
                  >
                    {c}
                  </span>
                  {isSelected && <FaCheck size={11} style={{ color: "#D49A00" }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchableSalesPersonSelect({
  value,
  salesPersons = [],
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selectedPerson = useMemo(() => {
    if (!value) return null;
    return salesPersons.find((sp) => String(sp.id) === String(value)) || null;
  }, [value, salesPersons]);

  useEffect(() => {
    if (selectedPerson) {
      setSearch(selectedPerson.name || "");
    } else {
      setSearch("");
    }
  }, [selectedPerson]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        if (selectedPerson) {
          setSearch(selectedPerson.name || "");
        } else {
          setSearch("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedPerson]);

  const filteredList = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return salesPersons;
    if (selectedPerson && selectedPerson.name && q === selectedPerson.name.toLowerCase()) {
      return salesPersons;
    }
    return salesPersons.filter((sp) => {
      const name = (sp.name || "").toLowerCase();
      const code = (sp.employee_code || `sp-${sp.id}`).toLowerCase();
      const phone = (sp.phone || sp.mobile || sp.contact_no || "").toLowerCase();
      return name.includes(q) || code.includes(q) || phone.includes(q);
    });
  }, [salesPersons, search, selectedPerson]);

  const handleSelect = (sp) => {
    if (sp) {
      onChange(String(sp.id), sp);
      setSearch(sp.name || "");
    } else {
      onChange("", null);
      setSearch("");
    }
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((prev) => (prev < filteredList.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredList.length - 1));
    } else if (e.key === "Enter") {
      if (isOpen && filteredList.length > 0 && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(filteredList[activeIndex]);
      } else if (isOpen && filteredList.length === 1) {
        e.preventDefault();
        handleSelect(filteredList[0]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      if (selectedPerson) setSearch(selectedPerson.name || "");
      else setSearch("");
    }
  };

  return (
    <div className="position-relative w-100" ref={containerRef}>
      <div
        className="d-flex align-items-center bg-white px-2.5"
        style={{
          height: "38px",
          borderRadius: "8px",
          border: isOpen ? "1.5px solid #D49A00" : "1.5px solid #CBD5E1",
          boxShadow: isOpen ? "0 0 0 3px rgba(212, 154, 0, 0.18)" : "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={search}
          placeholder="Search Sales Executive..."
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="border-0 shadow-none fw-semibold p-0 flex-grow-1"
          style={{
            outline: "none",
            backgroundColor: "transparent",
            fontSize: "0.9rem",
            color: "#0F172A",
            minWidth: 0,
          }}
        />

        {(value || search) && (
          <FaTimes
            className="text-muted mx-1"
            style={{
              fontSize: "0.82rem",
              cursor: "pointer",
              opacity: 0.6,
              flexShrink: 0,
            }}
            title="Clear sales executive"
            onClick={(e) => {
              e.stopPropagation();
              handleSelect(null);
              if (inputRef.current) inputRef.current.focus();
            }}
          />
        )}

        <div
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
            if (!isOpen && inputRef.current) {
              inputRef.current.focus();
            }
          }}
          className="d-flex align-items-center justify-content-center ps-1"
          style={{ cursor: "pointer", flexShrink: 0 }}
        >
          <FaChevronDown
            style={{
              fontSize: "0.74rem",
              color: "#64748B",
              transition: "transform 0.2s",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </div>
      </div>

      {isOpen && (
        <div
          className="position-absolute w-100 bg-white border shadow-lg"
          style={{
            zIndex: 1060,
            top: "calc(100% + 4px)",
            left: 0,
            borderRadius: "8px",
            border: "1.5px solid #E2E8F0",
            maxHeight: "260px",
            overflowY: "auto",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          }}
          ref={listRef}
        >
          <div
            className="p-2 border-bottom d-flex align-items-center justify-content-between"
            style={{
              cursor: "pointer",
              backgroundColor: !value ? "#FFFBEB" : "transparent",
              color: !value ? "#92400E" : "#64748B",
              fontSize: "0.86rem",
              fontWeight: !value ? "700" : "500",
              borderLeft: !value ? "3px solid #D49A00" : "3px solid transparent",
            }}
            onClick={() => handleSelect(null)}
          >
            <span>-- None --</span>
            {!value && <FaCheck size={11} style={{ color: "#D49A00" }} />}
          </div>

          {filteredList.length > 0 ? (
            filteredList.map((sp, idx) => {
              const isSelected = String(sp.id) === String(value);
              const isActive = idx === activeIndex;
              const displayCode = sp.employee_code || `SP-${String(sp.id).padStart(3, "0")}`;

              return (
                <div
                  key={sp.id}
                  className="p-2 border-bottom d-flex align-items-center justify-content-between"
                  style={{
                    cursor: "pointer",
                    backgroundColor: isActive
                      ? "#FFFBEB"
                      : isSelected
                        ? "#F8FAFC"
                        : "transparent",
                    borderLeft: isActive || isSelected
                      ? "3px solid #D49A00"
                      : "3px solid transparent",
                    transition: "background-color 0.12s",
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => handleSelect(sp)}
                >
                  <div className="d-flex flex-column text-truncate" style={{ minWidth: 0, paddingRight: "8px" }}>
                    <div className="d-flex align-items-center gap-1.5 text-truncate">
                      <span
                        className="fw-bold text-truncate"
                        style={{
                          fontSize: "0.88rem",
                          color: isSelected ? "#92400E" : "#0F172A",
                        }}
                      >
                        {sp.name}
                      </span>
                      <span
                        className="badge rounded-pill fw-semibold"
                        style={{
                          fontSize: "0.68rem",
                          backgroundColor: "#FEF3C7",
                          color: "#92400E",
                          border: "1px solid #FDE68A",
                        }}
                      >
                        {displayCode}
                      </span>
                    </div>
                    {(sp.phone || sp.mobile) && (
                      <small className="text-muted" style={{ fontSize: "0.74rem" }}>
                        📞 {sp.phone || sp.mobile}
                      </small>
                    )}
                  </div>

                  {isSelected && (
                    <FaCheck size={12} style={{ color: "#D49A00", flexShrink: 0 }} />
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-muted p-3 text-center small">
              No matching sales executive found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SalesForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const quote_id = new URLSearchParams(routerLocation.search).get("quote_id");

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isNonUser = storedUser.role_name?.toLowerCase().includes("non user") || storedUser.role_id === 6;

  // Strict route guard: Sales Person has NO access to Billing!
  useEffect(() => {
    const roleLower = String(storedUser.role_name || storedUser.role || "").toLowerCase();
    const isCashier = storedUser.is_cashier || roleLower.includes("cashier") || storedUser.role_id === 8;
    const isSalesPerson = (roleLower.includes("sales") || storedUser.role_id === 7) && !isCashier;
    if (isSalesPerson) {
      navigate("/hrms/dashboard", { replace: true });
    }
  }, [navigate, storedUser]);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [showCustomerCard, setShowCustomerCard] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    customer_name: "",
    contact_no: "",
    alternate_no: "",
    gst_no: "",
    address: "",
    address2: "",
    pincode: "",
    city: "",
    state: "Tamil Nadu",
    country: "India",
  });
  const [shippingAddress, setShippingAddress] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [ewayInvoiceNo, setEwayInvoiceNo] = useState("");
  const [poNo, setPoNo] = useState("");
  const [poDate, setPoDate] = useState("");
  const [transportMode, setTransportMode] = useState("By Road");
  const [transportCharges, setTransportCharges] = useState("");
  const [additionalCharges, setAdditionalCharges] = useState([]);
  const [chargeName, setChargeName] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [billTo, setBillTo] = useState(null);
  const [showBillToModal, setShowBillToModal] = useState(false);
  const customerRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [submittingAction, setSubmittingAction] = useState(null);

  const [salesPersonsList, setSalesPersonsList] = useState([]);
  const [salesPersonId, setSalesPersonId] = useState("");
  const [selectedSalesPerson, setSelectedSalesPerson] = useState(null);
  const [commissionAmount, setCommissionAmount] = useState("");

  const [billDiscount, setBillDiscount] = useState("");
  const [billDiscountType, setBillDiscountType] = useState("fixed");
  const [isRoundOffEnabled, setIsRoundOffEnabled] = useState(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showProductCard, setShowProductCard] = useState(false);

  const [saleDate, setSaleDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [status, setStatus] = useState("Final");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [businessLocationId, setBusinessLocationId] = useState("");
  const [locations, setLocations] = useState([]);
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationActiveIndex, setLocationActiveIndex] = useState(-1);
  const locationWrapperRef = useRef(null);
  const locationInputRef = useRef(null);
  const locationListRef = useRef(null);
  const customerInputRef = useRef(null);

  useEffect(() => {
    if (businessLocationId && locations.length > 0) {
      const matched = locations.find(
        (l) => String(l.id) === String(businessLocationId),
      );
      if (matched) {
        setLocationSearch(getLocationDisplayName(matched));
      }
    }
  }, [businessLocationId, locations]);

  const handleSelectLocation = (loc) => {
    setBusinessLocationId(String(loc.id));
    setLocationSearch(getLocationDisplayName(loc));
    setShowLocationDropdown(false);
    setLocationActiveIndex(-1);
  };

  const [locationModal, setLocationModal] = useState(false);
  const [branches, setBranches] = useState([]);
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationForm, setLocationForm] = useState({
    location_id: "",
    name: "",
    branch_id: "",
    landmark: "",
    state: "Tamil Nadu",
    city: "",
    zip_code: "",
    mobile: "",
    alternate_number: "",
    email: "",
    gst_no: "",
  });

  useEffect(() => {
    api
      .get("/branches")
      .then((res) => {
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        setBranches(list);
      })
      .catch(() => {});
  }, []);

  const openAddLocationModal = () => {
    const activeBr = getActiveBranchId();
    setLocationForm({
      location_id: "",
      name: locationSearch?.trim() || "",
      branch_id: activeBr ? String(activeBr) : (branches[0]?.id ? String(branches[0].id) : ""),
      landmark: "",
      state: "Tamil Nadu",
      city: "",
      zip_code: "",
      mobile: "",
      alternate_number: "",
      email: "",
      gst_no: "",
    });
    if (branches.length === 0) {
      api
        .get("/branches")
        .then((res) => {
          const list = Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res.data)
              ? res.data
              : [];
          setBranches(list);
          if (!activeBr && list.length > 0) {
            setLocationForm((prev) => ({ ...prev, branch_id: String(list[0].id) }));
          }
        })
        .catch(() => {});
    }
    setShowLocationDropdown(false);
    setLocationModal(true);
  };

  const saveLocation = async () => {
    if (!locationForm.name || !locationForm.name.trim()) {
      return toast.error("Location name is required");
    }
    if (!locationForm.branch_id) {
      return toast.error("Branch is required");
    }

    setLocationSaving(true);
    try {
      const res = await api.post("/locations", {
        location_id: locationForm.location_id?.trim() || null,
        name: locationForm.name.trim(),
        branch_id: Number(locationForm.branch_id),
        landmark: locationForm.landmark?.trim() || null,
        state: locationForm.state?.trim() || "Tamil Nadu",
        city: locationForm.city?.trim() || null,
        zip_code: locationForm.zip_code?.trim() || null,
        mobile: locationForm.mobile?.trim() || null,
        alternate_number: locationForm.alternate_number?.trim() || null,
        email: locationForm.email?.trim() || null,
        gst_no: locationForm.gst_no?.trim().toUpperCase() || null,
      });

      toast.success("Business location added successfully");
      setLocationModal(false);

      const newId = res.data?.id || res.data?.insertId;
      const createdLoc = {
        id: newId,
        location_id: res.data?.location_id || locationForm.location_id || `LOC-${newId}`,
        name: locationForm.name.trim(),
        branch_id: Number(locationForm.branch_id),
        landmark: locationForm.landmark,
        state: locationForm.state,
        city: locationForm.city,
        zip_code: locationForm.zip_code,
        mobile: locationForm.mobile,
        alternate_number: locationForm.alternate_number,
        email: locationForm.email,
        gst_no: locationForm.gst_no,
      };

      // Refresh locations list
      api
        .get("/locations", { params: { limit: 100 } })
        .then((resp) => {
          const list = Array.isArray(resp.data?.data)
            ? resp.data.data
            : Array.isArray(resp.data)
              ? resp.data
              : [];
          setLocations(list);
        })
        .catch(() => {});

      setLocations((prev) => [createdLoc, ...prev.filter((l) => l.id !== newId)]);
      handleSelectLocation(createdLoc);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add location");
    } finally {
      setLocationSaving(false);
    }
  };

  const filteredLocations = locations.filter((loc) => {
    if (!locationSearch || !locationSearch.trim()) return true;
    const term = locationSearch.toLowerCase().trim();
    const name = (loc.name || "").toLowerCase();
    const city = (loc.city || "").toLowerCase();
    const landmark = (loc.landmark || "").toLowerCase();
    const code = (loc.location_id || "").toLowerCase();
    const disp = getLocationDisplayName(loc).toLowerCase();
    return (
      name.includes(term) ||
      city.includes(term) ||
      landmark.includes(term) ||
      code.includes(term) ||
      disp.includes(term)
    );
  });

  const openLocationDropdown = () => {
    setShowLocationDropdown(true);
    const idx = filteredLocations.findIndex(
      (l) => String(l.id) === String(businessLocationId)
    );
    setLocationActiveIndex(idx >= 0 ? idx : (filteredLocations.length > 0 ? 0 : -1));
  };

  const handleLocationKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showLocationDropdown) {
        openLocationDropdown();
        return;
      }
      if (!filteredLocations.length) return;
      setLocationActiveIndex((prev) =>
        prev < filteredLocations.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!showLocationDropdown) {
        openLocationDropdown();
        return;
      }
      if (!filteredLocations.length) return;
      setLocationActiveIndex((prev) =>
        prev > 0 ? prev - 1 : filteredLocations.length - 1
      );
    } else if (e.key === "Enter") {
      if (showLocationDropdown && filteredLocations.length > 0) {
        e.preventDefault();
        const idx =
          locationActiveIndex >= 0 && locationActiveIndex < filteredLocations.length
            ? locationActiveIndex
            : 0;
        const loc = filteredLocations[idx];
        if (loc) {
          handleSelectLocation(loc);
          if (customerInputRef.current) {
            customerInputRef.current.focus();
          }
        }
      }
    } else if (e.key === "Escape") {
      if (showLocationDropdown) {
        e.preventDefault();
        setShowLocationDropdown(false);
      }
    } else if (e.key === "Tab") {
      setShowLocationDropdown(false);
    }
  };

  // Auto-scroll active location option into view in dropdown
  useEffect(() => {
    if (showLocationDropdown && locationActiveIndex >= 0 && locationListRef.current) {
      const items = locationListRef.current.querySelectorAll(".location-option-item");
      if (items && items[locationActiveIndex]) {
        items[locationActiveIndex].scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [locationActiveIndex, showLocationDropdown]);

  const [items, setItems] = useState([
    {
      product_id: null,
      product_name: "",
      isEntered: false,
      hsncode: "",
      qty: 1,
      primary_unit: "pcs",
      secondary_unit: null,
      price: "",
      selling_price: "",
      discount: "",
      discount_type: "fixed",
      other: "",
      tax_group_id: "",
      total: "0",
    },
  ]);
  const [searchRowIndex, setSearchRowIndex] = useState(null);

  useEffect(() => {
    if (items.length === 0) {
      handleAddRow();
    }
  }, [items.length]);

  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      {
        product_id: null,
        product_name: "",
        hsncode: "",
        qty: 1,
        primary_unit: "pcs",
        secondary_unit: null,
        price: "",
        selling_price: "",
        discount: "",
        discount_type: "fixed",
        other: "",
        tax_group_id: "",
        total: "0",
      },
    ]);
  };
  const [taxGroups, setTaxGroups] = useState([]);
  const [gstMode, setGstMode] = useState(() => (isNonUser ? "without_gst" : "with_gst"));

  const [bankAccounts, setBankAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [splitPayments, setSplitPayments] = useState([
    {
      id: "split_1",
      method: "Cash",
      amount: "",
      bank_account_id: "",
      payment_ref_no: "",
      payment_for: "Payment",
    },
  ]);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "Cash",
    card_type: "",
    card_number: "",
    payment_for: "",
    payment_ref_no: "",
    business_id: "",
    bank_account_id: "",
  });
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);

  const paymentAmountInputRef = useRef(null);
  const latestHandlersRef = useRef({});

  const wrapperRef = useRef(null);
  const [customerActiveIndex, setCustomerActiveIndex] = useState(-1);
  const [productActiveIndex, setProductActiveIndex] = useState(-1);
  const customerCardSuppressedRef = useRef(false);
  const productSearchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowCustomerCard(false);
        setShowProductCard(false);
      }
      if (customerRef.current && !customerRef.current.contains(e.target)) {
        setShowCustomerCard(false);
      }
      if (
        locationWrapperRef.current &&
        !locationWrapperRef.current.contains(e.target)
      ) {
        setShowLocationDropdown(false);
        setLocationActiveIndex(-1);
        setBusinessLocationId((currentLocId) => {
          if (!currentLocId) {
            setLocationSearch("");
          } else {
            setLocations((locList) => {
              const matched = locList.find((l) => String(l.id) === String(currentLocId));
              if (matched) {
                setLocationSearch(getLocationDisplayName(matched));
              }
              return locList;
            });
          }
          return currentLocId;
        });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-scroll active customer option into view in dropdown
  useEffect(() => {
    if (showCustomerCard && customerActiveIndex >= 0 && customerRef.current) {
      const items = customerRef.current.querySelectorAll(".customer-item");
      if (items && items[customerActiveIndex]) {
        items[customerActiveIndex].scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [customerActiveIndex, showCustomerCard]);

  useEffect(() => {
    if (
      !customerSearch ||
      typeof customerSearch !== "string" ||
      !customerSearch.trim()
    ) {
      setCustomers([]);
      setShowCustomerCard(false);
      setCustomerActiveIndex(-1);
      return;
    }
    const delay = setTimeout(() => {
      axios
        .get(CUSTOMER_API, {
          params: { search: customerSearch, all: "true", ...(isNonUser ? { is_gst: 0 } : {}) },
        })
        .then((res) => {
          const list = Array.isArray(res.data?.data) ? res.data.data : [];
          setCustomers(list);
          setCustomerActiveIndex(list.length ? 0 : -1);
          if (!customerCardSuppressedRef.current) {
            setShowCustomerCard(!!list.length);
          }
        })
        .catch((err) => {
          toast.error(
            err.response?.data?.message || "Failed to load customers",
          );
          setCustomers([]);
          setShowCustomerCard(false);
          setCustomerActiveIndex(-1);
        });
    }, 300);
    return () => clearTimeout(delay);
  }, [customerSearch, isNonUser]);

  useEffect(() => {
    axios
      .get(apiUrl("bank-accounts"), { params: isNonUser ? { is_gst: 0 } : {} })
      .then((res) => setBankAccounts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setBankAccounts([]));
  }, [isNonUser]);

  useEffect(() => {
    if (isNonUser) {
      setTaxGroups([]);
      return;
    }
    axios
      .get(TAX_GROUPS_API, { params: { limit: 500 } })
      .then((res) =>
        setTaxGroups(Array.isArray(res.data?.data) ? res.data.data : []),
      )
      .catch(() => setTaxGroups([]));
  }, [isNonUser]);

  useEffect(() => {
    api
      .get("/locations", { params: { limit: 100 } })
      .then((res) => {
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        setLocations(list);
        if (list.length > 0) {
          const activeBr = getActiveBranchId();
          const match = activeBr ? list.find((l) => Number(l.branch_id) === Number(activeBr)) : null;
          const defaultLoc = match || list[0];
          setBusinessLocationId(String(defaultLoc.id));
          setLocationSearch(getLocationDisplayName(defaultLoc));
        }
      })
      .catch((err) => {
        console.error("Failed to load locations", err);
      });
  }, []);

  useEffect(() => {
    api
      .get("/sales-persons")
      .then((res) => {
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        const activeList = list.filter(
          (sp) => !sp.status || sp.status.toLowerCase() === "active",
        );
        setSalesPersonsList(activeList.length > 0 ? activeList : list);
      })
      .catch((err) => {
        console.error("Failed to load sales persons", err);
      });
  }, []);

  useEffect(() => {
    if (salesPersonId && salesPersonsList.length > 0) {
      const match = salesPersonsList.find((sp) => String(sp.id) === String(salesPersonId));
      setSelectedSalesPerson(match || null);
    } else if (!salesPersonId) {
      setSelectedSalesPerson(null);
    }
  }, [salesPersonId, salesPersonsList]);

  const fetchNextInvoiceNo = useCallback(async () => {
    if (id) return;
    const branchId = getActiveBranchId();
    if (!branchId) {
      setInvoiceNo("");
      toast.error(
        "Select an active branch. Invoice numbers are generated from Branch → Invoice Number Settings (sale).",
      );
      return;
    }
    try {
      const peekRes = await api.get("/branches/peek-number", {
        params: { type: isNonUser ? "non_gst_sale" : "sale", branch_id: branchId },
      });
      const suggested = (peekRes.data?.next_number || "").trim();
      if (!suggested) {
        setInvoiceNo("");
        toast.error(
          "Configure sale prefix and start number under Branch management → Invoice Number Settings.",
        );
        return;
      }
      const unique = await ensureUniqueInvoiceString(suggested, branchId, isNonUser);
      setInvoiceNo(unique);
    } catch (err) {
      setInvoiceNo("");
      toast.error(
        err.response?.data?.message ||
        "Could not load invoice number. Check Branch Invoice Number Settings for this branch.",
      );
    }
  }, [id, isNonUser]);

  useEffect(() => {
    fetchNextInvoiceNo();
  }, [fetchNextInvoiceNo, saleDate]);

  useEffect(() => {
    const onBranchChanged = () => {
      if (!id) fetchNextInvoiceNo();
    };
    window.addEventListener("branchChanged", onBranchChanged);
    return () => window.removeEventListener("branchChanged", onBranchChanged);
  }, [id, fetchNextInvoiceNo]);

  useEffect(() => {
    if (!id) return;

    axios
      .get(`${TRANSACTION_API}/${id}`)
      .then(async (res) => {
        const tx = res.data || {};
        if (tx.sales_date) {
          const d = new Date(tx.sales_date);
          if (!Number.isNaN(d.getTime())) {
            setSaleDate(d.toISOString().slice(0, 10));
          }
        }
        setStatus(tx.status || "Final");
        if (tx.invoice_no) setInvoiceNo(tx.invoice_no);
        if (tx.business_id || tx.location_id) {
          setBusinessLocationId(String(tx.business_id || tx.location_id));
        }
        if (tx.address) {
          setShippingAddress(tx.address);
        }
        if (tx.sales_person_id) {
          setSalesPersonId(String(tx.sales_person_id));
        }
        if (tx.commission_amount != null && tx.commission_amount !== "") {
          setCommissionAmount(String(tx.commission_amount));
        }
        if (tx.discount_amount != null && tx.discount_amount !== "") {
          setBillDiscount(String(tx.discount_amount));
        }
        if (tx.discount_type) {
          setBillDiscountType(tx.discount_type);
        }
        setVehicleNo(tx.vehicle_no || "");
        setEwayInvoiceNo(tx.eway_invoice_no || "");
        setPoNo(tx.po_no || "");
        setPoDate(tx.po_date ? String(tx.po_date).slice(0, 10) : "");
        setTransportMode(tx.transport_mode || "By Road");
        setTransportCharges(tx.transport_charges != null && tx.transport_charges !== "" ? String(tx.transport_charges) : "");
        if (tx.additional_charges) {
          try {
            const parsed = typeof tx.additional_charges === "string" ? JSON.parse(tx.additional_charges) : tx.additional_charges;
            setAdditionalCharges(Array.isArray(parsed) ? parsed : []);
          } catch (e) {
            setAdditionalCharges([]);
          }
        } else {
          setAdditionalCharges([]);
        }

        if (tx.bill_to || tx.bill_to_customer_name || tx.bill_to_company_name) {
          setBillTo({
            company_name: tx.bill_to?.company_name || tx.bill_to_company_name || "",
            customer_name: tx.bill_to?.customer_name || tx.bill_to_customer_name || "",
            phone: tx.bill_to?.phone || tx.bill_to_phone || "",
            address: tx.bill_to?.address || tx.bill_to_address || "",
            gstin: tx.bill_to?.gstin || tx.bill_to_gstin || "",
            state: tx.bill_to?.state || tx.bill_to_state || "Tamil Nadu",
            state_code: tx.bill_to?.state_code || tx.bill_to_state_code || "33",
            place_of_supply: tx.bill_to?.place_of_supply || tx.bill_to_place_of_supply || "Tamil Nadu",
            place_of_supply_state_code: tx.bill_to?.place_of_supply_state_code || tx.bill_to_place_of_supply_state_code || "33",
          });
        } else {
          setBillTo(null);
        }

        if (tx.contact_id) {
          try {
            const custRes = await axios.get(`${CUSTOMER_API}/${tx.contact_id}`);
            const cust = custRes.data || null;
            if (cust) {
              setSelectedCustomer(cust);
              customerCardSuppressedRef.current = true;
              setCustomerSearch(cust.customer_name || cust.name || "");
              if (!tx.address) {
                const shipAddr =
                  cust.address2 && String(cust.address2).trim()
                    ? cust.address2
                    : cust.address || "";
                setShippingAddress(shipAddr);
              }
            }
          } catch { }
        }

        const itemsArr = Array.isArray(tx.items) ? tx.items : [];
        const loadedItems = itemsArr.map((it) => {
          const qty = Number(it.quantity) || 1;
          let unitPrice = it.unit_price != null ? Number(it.unit_price) : 0;
          const sellingPriceStr = String(unitPrice);
          const productPrice =
            it.product_price != null ? Number(it.product_price) : 0;
          const historicalMrp =
            it.unit_price_before_discount != null && qty > 0
              ? Number(it.unit_price_before_discount) / qty
              : 0;
          const mrp =
            historicalMrp > 0
              ? historicalMrp
              : productPrice > 0
                ? productPrice
                : unitPrice || 0;

          let discountStr = "0";
          let discountType = it.discount_type || "fixed";
          if (it.discount_amount != null && Number(it.discount_amount) > 0) {
            discountStr = String(it.discount_amount);
          } else if (mrp > unitPrice && mrp > 0) {
            const diff = mrp - unitPrice;
            const pct = (diff / mrp) * 100;
            if (Math.abs(pct - Math.round(pct)) < 0.01) {
              discountStr = String(Math.round(pct));
              discountType = "percentage";
            } else {
              discountStr = String(diff.toFixed(2));
              discountType = "fixed";
            }
          }

          return {
            product_id: it.product_id || null,
            product_name: it.product_name || "",
            isEntered: true,
            hsncode: it.hsncode != null ? String(it.hsncode) : "",
            qty,
            primary_unit: it.primary_unit || it.unit || "pcs",
            secondary_unit: null,
            price: String(mrp),
            base_price: String(mrp || unitPrice),
            selling_price: sellingPriceStr,
            discount: discountStr,
            discount_type: discountType,
            other: "",
            tax_group_id:
              it.tax_group_id != null && String(it.tax_group_id).trim() !== ""
                ? String(it.tax_group_id)
                : tx.tax_group_id != null
                  ? String(tx.tax_group_id)
                  : "",
            total:
              it.total != null && Number(it.total) > 0
                ? String(it.total)
                : String(unitPrice * qty),
          };
        });
        setItems(loadedItems);

        const loadedPayments = Array.isArray(tx.payments)
          ? tx.payments.map((p) => ({
            id: p.id || Date.now(),
            amount: p.amount != null ? String(p.amount) : "",
            method: p.method || "",
            card_type: p.card_type || "",
            card_number: p.card_number || "",
            payment_for: p.payment_for || "",
            payment_ref_no: p.payment_ref_no || "",
            business_id: p.business_id || "",
            bank_account_id: p.bank_account_id || "",
            created_at: p.created_at || new Date().toISOString(),
          }))
          : [];
        setPayments(loadedPayments);
      })
      .catch(() => {
        toast.error("Failed to load sale for editing");
      });
  }, [id]);

  useEffect(() => {
    if (!quote_id || id) return;

    axios
      .get(`${apiUrl("quotations")}/${quote_id}`)
      .then(async (res) => {
        const quote = res.data || {};

        if (quote.customer_id) {
          try {
            const custRes = await axios.get(
              `${CUSTOMER_API}/${quote.customer_id}`,
            );
            const cust = custRes.data || null;
            if (cust) {
              setSelectedCustomer(cust);
              customerCardSuppressedRef.current = true;
              setCustomerSearch(cust.customer_name || cust.name || "");
              const shipAddr =
                cust.address2 && String(cust.address2).trim()
                  ? cust.address2
                  : cust.address || "";
              setShippingAddress(shipAddr);
            }
          } catch { }
        }
        const itemsArr = Array.isArray(quote.items) ? quote.items : [];
        const loadedItems = itemsArr.map((it) => {
          const productPrice =
            it.product_price != null ? Number(it.product_price) : 0;
          const sellingPrice = Number(it.rate_2 || it.rate || 0);
          const taxGroupIdStr =
            it.rate_4 != null &&
              !isNaN(Number(it.rate_4)) &&
              Number(it.rate_4) !== 0
              ? String(Math.floor(Number(it.rate_4)))
              : quote.tax_group_id != null
                ? String(Math.floor(Number(quote.tax_group_id)))
                : "";
          const tempItem = {
            product_id: it.product_id || null,
            product_name: it.product_name || it.product_master_name || "",
            isEntered: true,
            hsncode: it.hsncode || "",
            qty: Number(it.qty) || 1,
            primary_unit: it.primary_unit || "pcs",
            secondary_unit: null,
            price:
              productPrice > 0 ? String(productPrice) : String(sellingPrice),
            selling_price: String(sellingPrice),
            discount:
              productPrice > sellingPrice && productPrice > 0
                ? String((productPrice - sellingPrice).toFixed(2))
                : "0",
            discount_type: "fixed",
            other: "",
            tax_group_id: taxGroupIdStr,
          };
          tempItem.total = recalcTotal(tempItem);
          return tempItem;
        });
        setItems(loadedItems);
        const hasGst = loadedItems.some((item) => item.tax_group_id !== "");
        if (hasGst && !isNonUser) {
          setGstMode("with_gst");
        } else if (isNonUser) {
          setGstMode("without_gst");
        }

        toast.info("Prefilled details from Quotation");
      })
      .catch(() => {
        toast.error("Failed to load Quotation details");
      });
  }, [quote_id, id]);

  const handleSelectCustomer = (customer) => {
    customerCardSuppressedRef.current = true;
    setCustomers([]);
    setShowCustomerCard(false);
    setCustomerActiveIndex(-1);
    const customerName = customer?.customer_name || customer?.name || "";
    setCustomerSearch(customerName);
    setSelectedCustomer(customer);
    const shipping =
      customer?.address2 && customer.address2.trim()
        ? customer.address2
        : customer?.address || "";
    setShippingAddress(shipping);
  };

  const handleCustomerKeyDown = (e) => {
    if (e.key === "Enter") e.preventDefault();
    if (!showCustomerCard || !customers.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCustomerActiveIndex((prev) =>
        prev < customers.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCustomerActiveIndex((prev) =>
        prev > 0 ? prev - 1 : customers.length - 1,
      );
    } else if (e.key === "Enter") {
      const idx = customerActiveIndex >= 0 ? customerActiveIndex : 0;
      const c = customers[idx];
      if (c) handleSelectCustomer(c);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowCustomerCard(false);
    }
  };

  const saveCustomer = () => {
    const { customer_name, contact_no, gst_no } = customerForm;
    if (!customer_name?.trim()) return toast.error("Customer name is required");
    if (!contact_no?.trim()) return toast.error("Contact No is required");
    if (!/^\d{10}$/.test(contact_no))
      return toast.error("Invalid Contact No (10 digits)");

    if (gst_no && gst_no.trim()) {
      const cleanGst = gst_no.trim().toUpperCase();
      if (cleanGst.length > 15) {
        return toast.error("GST number must be at most 15 characters");
      }
      if (!/^[a-zA-Z0-9]+$/.test(cleanGst)) {
        return toast.error("GST number must be alphanumeric");
      }
    }

    axios
      .post(CUSTOMER_API, {
        customer_name: customerForm.customer_name.trim(),
        contact_no: customerForm.contact_no.trim(),
        alternate_no: customerForm.alternate_no?.trim() || null,
        gst_no: isNonUser ? null : (customerForm.gst_no?.trim().toUpperCase() || null),
        address: customerForm.address?.trim() || null,
        address2: customerForm.address2?.trim() || null,
        pincode: customerForm.pincode?.trim() || null,
        city: customerForm.city?.trim() || null,
        state: customerForm.state?.trim() || "Tamil Nadu",
        country: customerForm.country?.trim() || "India",
        is_gst: isNonUser ? 0 : 1,
      })
      .then((res) => {
        toast.success("Customer added successfully");
        setCustomerModal(false);

        const newCust = res.data?.data || res.data;
        const createdCustomer = {
          id: newCust.id || newCust.insertId || Date.now(),
          customer_name: customerForm.customer_name.trim(),
          name: customerForm.customer_name.trim(),
          contact_no: customerForm.contact_no.trim(),
          gst_no: customerForm.gst_no?.trim().toUpperCase() || "",
          address: customerForm.address?.trim() || "",
          address2: customerForm.address2?.trim() || "",
          city: customerForm.city?.trim() || "",
          state: customerForm.state?.trim() || "Tamil Nadu",
          country: customerForm.country?.trim() || "India",
        };
        handleSelectCustomer(createdCustomer);

        setCustomerForm({
          customer_name: "",
          contact_no: "",
          alternate_no: "",
          gst_no: "",
          address: "",
          address2: "",
          pincode: "",
          city: "",
          state: "Tamil Nadu",
          country: "India",
        });
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Failed to add customer";
        toast.error(msg);
      });
  };

  useEffect(() => {
    if (!query || typeof query !== "string" || !query.trim()) {
      setResults([]);
      setShowProductCard(false);
      setProductActiveIndex(-1);
      return;
    }
    const delay = setTimeout(() => {
      axios
        .get(`${PRODUCT_API}/search`, { params: { q: query } })
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : [];
          setResults(list);
          setProductActiveIndex(list.length ? 0 : -1);
          setShowProductCard(!!list.length);
        })
        .catch(() => {
          setResults([]);
          setShowProductCard(false);
          setProductActiveIndex(-1);
        });
    }, 300);
    return () => clearTimeout(delay);
  }, [query]);

  const addDirectProductToTable = (productName) => {
    const trimmed = String(productName || "").trim();
    if (!trimmed) return;

    let newTaxGroupId = "";
    if (gstMode === "with_gst") {
      const gst18 = taxGroups.find(
        (g) =>
          String(g.name).includes("18") ||
          (g.sub_taxes &&
            g.sub_taxes.reduce(
              (sum, t) => sum + Number(t.tax_rate || 0),
              0,
            ) === 18),
      );
      newTaxGroupId = gst18
        ? String(gst18.id)
        : taxGroups.length > 0
          ? String(taxGroups[0].id)
          : "";
    }

    const newItem = {
      product_id: null,
      product_name: trimmed,
      isEntered: true,
      hsncode: "",
      qty: 1,
      primary_unit: "pcs",
      secondary_unit: null,
      price: "",
      margin: "0",
      selling_price: "",
      discount: "",
      discount_type: "fixed",
      other: "0",
      tax_group_id: newTaxGroupId,
      total: "0",
    };
    newItem.total = recalcTotal(newItem);

    const targetIndex =
      searchRowIndex !== null ? searchRowIndex : items.length - 1;
    setItems((prev) => {
      const next = [...prev];
      if (targetIndex >= 0 && targetIndex < next.length) {
        next[targetIndex] = newItem;
        if (targetIndex === next.length - 1) {
          next.push({
            product_id: null,
            product_name: "",
            isEntered: false,
            hsncode: "",
            qty: 1,
            primary_unit: "pcs",
            secondary_unit: null,
            price: "",
            selling_price: "",
            discount: "",
            discount_type: "fixed",
            other: "",
            tax_group_id: "",
            total: "0",
          });
        }
      } else {
        next.push(newItem);
      }
      return next;
    });

    setQuery("");
    setResults([]);
    setShowProductCard(false);
    setProductActiveIndex(-1);
    setSearchRowIndex(null);

    setTimeout(() => {
      const rateEl = document.getElementById(`item-rate-${targetIndex}`);
      if (rateEl) {
        rateEl.focus();
        rateEl.select();
      }
    }, 60);
  };

  const addProductToTable = (product) => {
    const exists = items.find((i) => i.product_id === product.id);
    if (exists) {
      toast.warning("This barcode already scanned");
      return;
    }

    let newTaxGroupId = "";
    if (gstMode === "with_gst") {
      if (product.tax_group_id != null && product.tax_group_id !== "") {
        newTaxGroupId = String(product.tax_group_id);
      } else {
        const gst18 = taxGroups.find(
          (g) =>
            String(g.name).includes("18") ||
            (g.sub_taxes &&
              g.sub_taxes.reduce(
                (sum, t) => sum + Number(t.tax_rate || 0),
                0,
              ) === 18),
        );
        newTaxGroupId = gst18
          ? String(gst18.id)
          : taxGroups.length > 0
            ? String(taxGroups[0].id)
            : "";
      }
    }

    const mrp = Number(product.price || 0);
    const disc = Number(product.discount_percent || 0);
    const hasDiscPct =
      product.discount_percent != null &&
      product.discount_percent !== "" &&
      disc > 0;
    const calculatedSellingPrice = hasDiscPct
      ? (mrp - (mrp * disc) / 100).toFixed(2)
      : (mrp > 0 ? mrp.toFixed(2) : (product.price != null ? String(product.price) : "0"));

    const newItem = {
      product_id: product.id,
      product_name: product.product_name || "",
      isEntered: true,
      hsncode: product.hsncode || "",
      qty:
        (product.product_name || "").toUpperCase() === "SCRAP"
          ? Number(product.qty || 1)
          : 1,
      primary_unit: product.primary_unit || product.unit || "pcs",
      secondary_unit: product.secondary_unit || "",
      price: product.price != null ? String(product.price) : "",
      base_price: product.price != null ? String(product.price) : "",
      margin:
        product.margin != null && product.margin !== ""
          ? String(product.margin)
          : "0",
      selling_price: calculatedSellingPrice,
      discount: hasDiscPct ? String(product.discount_percent) : "",
      discount_type: hasDiscPct ? "percentage" : "fixed",
      other: "0",
      tax_group_id: newTaxGroupId,
      total: "0",
    };
    newItem.total = recalcTotal(newItem);
    if (searchRowIndex !== null) {
      const targetIndex = searchRowIndex;
      setItems((prev) => {
        const next = [...prev];
        next[targetIndex] = newItem;

        // Auto-add new empty row if the last row was just filled
        if (targetIndex === next.length - 1) {
          next.push({
            product_id: null,
            product_name: "",
            isEntered: false,
            hsncode: "",
            qty: 1,
            primary_unit: "pcs",
            secondary_unit: null,
            price: "",
            selling_price: "",
            discount: "",
            discount_type: "fixed",
            other: "",
            tax_group_id: "",
            total: "0",
          });
        }
        return next;
      });
      setSearchRowIndex(null);
      setTimeout(() => {
        const qtyEl = document.getElementById(`item-qty-${targetIndex}`);
        if (qtyEl) {
          qtyEl.focus();
          qtyEl.select();
        }
      }, 60);
    } else {
      setItems((prev) => [...prev, newItem]);
    }
  };

  const handleSelectProduct = (product) => {
    setQuery("");
    setResults([]);
    setShowProductCard(false);
    setProductActiveIndex(-1);
    addProductToTable(product);
  };

  const handleProductKeyDown = async (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      if (showProductCard && results.length > 0 && productActiveIndex >= 0) {
        e.preventDefault();
        const p = results[productActiveIndex];
        if (p) {
          setQuery("");
          setResults([]);
          setShowProductCard(false);
          setProductActiveIndex(-1);
          addProductToTable(p);
          return;
        }
      }

      const q = (e.target.value || query).trim();
      if (q) {
        e.preventDefault();
        const exactMatch = results.find(
          (p) =>
            String(p.sku || "").toLowerCase() === q.toLowerCase() ||
            String(p.barcode || "").toLowerCase() === q.toLowerCase() ||
            String(p.product_name || "").toLowerCase() === q.toLowerCase(),
        );
        if (exactMatch) {
          setQuery("");
          setResults([]);
          setShowProductCard(false);
          setProductActiveIndex(-1);
          addProductToTable(exactMatch);
        } else {
          addDirectProductToTable(q);
        }
      }
      return;
    }

    if (!showProductCard || !results.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setProductActiveIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setProductActiveIndex((prev) =>
        prev > 0 ? prev - 1 : results.length - 1,
      );
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowProductCard(false);
    }
  };

  const getItemGstRate = (taxGroupId, currentGstMode = gstMode, currentTaxGroups = taxGroups) => {
    if (currentGstMode === "without_gst" || !taxGroupId || !Array.isArray(currentTaxGroups)) return 0;
    const group = currentTaxGroups.find((g) => String(g.id) === String(taxGroupId));
    if (group && Array.isArray(group.sub_taxes)) {
      return group.sub_taxes.reduce((sum, t) => sum + (Number(t.tax_rate) || 0), 0);
    }
    return 0;
  };

  const recalcTotal = (item, currentGstMode = gstMode, currentTaxGroups = taxGroups) => {
    const rate = Number(item.selling_price || 0);
    const qty = Number(item.qty || 1) || 1;
    const base = Math.max(0, rate * qty);
    const gstRate = getItemGstRate(item.tax_group_id, currentGstMode, currentTaxGroups);
    if (gstRate > 0) {
      const taxAmt = Number(((base * gstRate) / 100).toFixed(2));
      return (base + taxAmt).toFixed(2);
    }
    return base.toFixed(2);
  };
  const handleChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const updated = { ...item, [field]: value };

        if (field === "selling_price") {
          const rate = value;
          updated.selling_price = rate;
          const base = Number(updated.base_price || updated.price || 0);
          const numRate = Number(rate || 0);
          if (base > numRate && base > 0) {
            if (updated.discount_type === "fixed") {
              updated.discount = (base - numRate).toFixed(2);
            } else {
              updated.discount = (((base - numRate) / base) * 100).toFixed(2);
            }
          } else {
            updated.base_price = rate;
            updated.price = rate;
            updated.discount = "";
          }
          updated.total = recalcTotal(updated);
        } else if (field === "discount") {
          const base =
            Number(
              updated.base_price != null && updated.base_price !== ""
                ? updated.base_price
                : updated.price != null && updated.price !== ""
                  ? updated.price
                  : updated.selling_price || 0,
            ) || 0;
          const disc = Number(value || 0);
          const discType = updated.discount_type || "fixed";
          if (disc > 0 && base > 0) {
            if (discType === "percentage") {
              updated.selling_price = Math.max(0, base - (base * disc) / 100).toFixed(2);
            } else {
              // Fixed amount discount per unit
              updated.selling_price = Math.max(0, base - disc).toFixed(2);
            }
          } else {
            updated.selling_price =
              base > 0 ? base.toFixed(2) : String(updated.selling_price || "");
          }
          updated.total = recalcTotal(updated);
        } else if (field === "discount_type") {
          const base =
            Number(
              updated.base_price != null && updated.base_price !== ""
                ? updated.base_price
                : updated.price != null && updated.price !== ""
                  ? updated.price
                  : updated.selling_price || 0,
            ) || 0;
          const disc = Number(updated.discount || 0);
          const newDiscType = value; // "percentage" or "fixed"
          updated.discount_type = newDiscType;
          if (disc > 0 && base > 0) {
            if (newDiscType === "percentage") {
              updated.selling_price = Math.max(0, base - (base * disc) / 100).toFixed(2);
            } else {
              // Fixed amount discount per unit
              updated.selling_price = Math.max(0, base - disc).toFixed(2);
            }
          } else {
            updated.selling_price =
              base > 0 ? base.toFixed(2) : String(updated.selling_price || "");
          }
          updated.total = recalcTotal(updated);
        } else if (field === "price") {
          const base = Number(value || 0);
          updated.base_price = value;
          const disc = Number(updated.discount || 0);
          const discType = updated.discount_type || "fixed";
          if (disc > 0 && base > 0) {
            if (discType === "percentage") {
              updated.selling_price = Math.max(0, base - (base * disc) / 100).toFixed(2);
            } else {
              updated.selling_price = Math.max(0, base - disc).toFixed(2);
            }
          } else {
            updated.selling_price = base.toFixed(2);
          }
          updated.total = recalcTotal(updated);
        } else if (field === "total") {
          const totalVal = Number(value) || 0;
          updated.total = value;
          const qty = Number(updated.qty || 1) || 1;
          const gstRate = getItemGstRate(updated.tax_group_id);
          const taxableTotal = gstRate > 0 ? totalVal / (1 + gstRate / 100) : totalVal;
          const rate = taxableTotal / qty;
          updated.selling_price = rate.toFixed(2);
          updated.base_price = updated.selling_price;
          updated.price = updated.selling_price;
          updated.discount = "";
        } else {
          updated.total = recalcTotal(updated);
        }

        return updated;
      }),
    );
  };

  const handleSetGstMode = (mode) => {
    if (isNonUser) return;
    setGstMode(mode);
    setItems((prev) =>
      prev.map((item) => {
        let newTaxGroupId = item.tax_group_id;
        if (mode === "with_gst") {
          if (!newTaxGroupId) {
            const gst18 = taxGroups.find(
              (g) =>
                String(g.name).includes("18") ||
                (g.sub_taxes &&
                  g.sub_taxes.reduce(
                    (sum, t) => sum + Number(t.tax_rate || 0),
                    0,
                  ) === 18),
            );
            newTaxGroupId = gst18
              ? String(gst18.id)
              : taxGroups.length > 0
                ? String(taxGroups[0].id)
                : "";
          }
        } else {
          newTaxGroupId = "";
        }
        const updated = { ...item, tax_group_id: newTaxGroupId };
        updated.total = recalcTotal(updated, mode, taxGroups);
        return updated;
      }),
    );
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (taxGroups.length > 0 && items.length > 0) {
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          total: recalcTotal(item, gstMode, taxGroups),
        })),
      );
    }
  }, [taxGroups, gstMode]);

  let grossItemsTotal = 0;
  items.forEach((item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.selling_price || item.price) || 0;
    const baseRow = Number((qty * rate).toFixed(2));
    grossItemsTotal += baseRow;
  });

  // Total Purchase Discount calculation
  let calculatedDiscount = 0;
  const discountNum = Number(billDiscount) || 0;
  if (discountNum > 0 && grossItemsTotal > 0) {
    if (billDiscountType === "percentage") {
      calculatedDiscount = Number(((grossItemsTotal * discountNum) / 100).toFixed(2));
    } else {
      calculatedDiscount = Number(Math.min(grossItemsTotal, discountNum).toFixed(2));
    }
  }

  // Proportionally allocate discount across items for accurate GST computation
  let calcTaxable = 0;
  let calcTax = 0;
  let calcTotalLine = 0;
  const discountRatio = grossItemsTotal > 0 ? Math.max(0, (grossItemsTotal - calculatedDiscount)) / grossItemsTotal : 1;

  items.forEach((item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.selling_price || item.price) || 0;
    const baseRow = Number((qty * rate).toFixed(2));
    const gstRate = getItemGstRate(item.tax_group_id, gstMode, taxGroups);
    const itemTaxable = Number((baseRow * discountRatio).toFixed(2));
    const gstAmt = gstRate > 0 ? Number(((itemTaxable * gstRate) / 100).toFixed(2)) : 0;
    const rowTotal = itemTaxable + gstAmt;

    calcTaxable += itemTaxable;
    calcTax += gstAmt;
    calcTotalLine += rowTotal;
  });
  const calcDiscount = calculatedDiscount;

  const handleAddAdditionalCharge = () => {
    const name = chargeName.trim();
    const amt = parseFloat(chargeAmount);
    if (!name) {
      toast.warning("Please enter a charge name");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      toast.warning("Please enter a valid amount greater than 0");
      return;
    }
    setAdditionalCharges((prev) => [
      ...prev,
      { id: Date.now(), name, amount: amt },
    ]);
    setChargeName("");
    setChargeAmount("");
  };

  const handleRemoveAdditionalCharge = (indexToRemove) => {
    setAdditionalCharges((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const transportChargesNum = Number(transportCharges) || 0;
  const additionalChargesTotal = additionalCharges.reduce(
    (sum, c) => sum + (Number(c.amount) || 0),
    0
  );
  const totalCharges = transportChargesNum + additionalChargesTotal;

  const preliminaryTotal = Number((calcTaxable + calcTax + totalCharges).toFixed(2));
  let grandTotal = preliminaryTotal;
  let roundOff = 0;
  if (isRoundOffEnabled) {
    grandTotal = Math.round(preliminaryTotal);
    roundOff = Number((grandTotal - preliminaryTotal).toFixed(2));
  } else {
    grandTotal = preliminaryTotal;
    roundOff = 0;
  }
  const validItems = items.filter(
    (it) => it.product_id || (it.product_name && it.product_name.trim() !== ""),
  );
  const totalItemCount = validItems.length;
  const totalQtyCount = validItems.reduce(
    (sum, it) => sum + (Number(it.qty) || 0),
    0,
  );

  const handleSplitRowChange = (id, field, value) => {
    setSplitPayments((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === "method") {
          const isElec = value !== "Cash" && value !== "Credit";
          if (!isElec) {
            updated.bank_account_id = "";
          } else if (!updated.bank_account_id && bankAccounts.length > 0) {
            updated.bank_account_id = String(bankAccounts[0].id);
          }
        }
        return updated;
      })
    );
  };

  const handleAddSplitRow = () => {
    const defaultBankId = bankAccounts.length > 0 ? String(bankAccounts[0].id) : "";
    const currentSum = splitPayments.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const remaining = Math.max(0, Number((grandTotal - currentSum).toFixed(2)));

    const lastRow = splitPayments[splitPayments.length - 1];
    let nextMethod = "GPay";
    if (lastRow?.method === "GPay" || lastRow?.method === "PhonePe" || lastRow?.method === "UPI") {
      nextMethod = "Cash";
    } else if (lastRow?.method === "Cash") {
      nextMethod = "GPay";
    }
    const isElec = nextMethod !== "Cash" && nextMethod !== "Credit";

    setSplitPayments((prev) => [
      ...prev,
      {
        id: `split_${Date.now()}_${prev.length}`,
        method: nextMethod,
        amount: remaining > 0 ? remaining.toFixed(2) : "",
        bank_account_id: isElec ? defaultBankId : "",
        payment_ref_no: "",
        payment_for: payments.length === 0 ? "Advance Payment" : "Payment",
      },
    ]);
  };

  const handleRemoveSplitRow = (id) => {
    if (splitPayments.length <= 1) {
      setSplitPayments([
        {
          id: `split_${Date.now()}`,
          method: "Cash",
          amount: "",
          bank_account_id: "",
          payment_ref_no: "",
          payment_for: "Payment",
        },
      ]);
      return;
    }
    setSplitPayments((prev) => prev.filter((r) => r.id !== id));
  };

  const handleQuickAll = (method) => {
    const defaultBankId = bankAccounts.length > 0 ? String(bankAccounts[0].id) : "";
    const isElec = method !== "Cash" && method !== "Credit";
    setSplitPayments([
      {
        id: `split_${Date.now()}`,
        method,
        amount: grandTotal > 0 ? grandTotal.toFixed(2) : "",
        bank_account_id: isElec ? defaultBankId : "",
        payment_ref_no: "",
        payment_for: payments.length === 0 ? "Advance Payment" : "Payment",
      },
    ]);
  };

  const handleQuickSplit5050 = (method1 = "Cash", method2 = "GPay") => {
    const half1 = Number((grandTotal / 2).toFixed(2));
    const half2 = Number((grandTotal - half1).toFixed(2));
    const defaultBankId = bankAccounts.length > 0 ? String(bankAccounts[0].id) : "";
    const isElec1 = method1 !== "Cash" && method1 !== "Credit";
    const isElec2 = method2 !== "Cash" && method2 !== "Credit";
    setSplitPayments([
      {
        id: `split_${Date.now()}_1`,
        method: method1,
        amount: half1 > 0 ? half1.toFixed(2) : "",
        bank_account_id: isElec1 ? defaultBankId : "",
        payment_ref_no: "",
        payment_for: payments.length === 0 ? "Advance Payment" : "Payment",
      },
      {
        id: `split_${Date.now()}_2`,
        method: method2,
        amount: half2 > 0 ? half2.toFixed(2) : "",
        bank_account_id: isElec2 ? defaultBankId : "",
        payment_ref_no: "",
        payment_for: payments.length === 0 ? "Advance Payment" : "Payment",
      },
    ]);
  };

  const handleConfirmSplitPayments = (silent = false) => {
    const validRows = splitPayments.filter(
      (r) => r.amount !== "" && !isNaN(Number(r.amount)) && Number(r.amount) !== 0
    );

    if (validRows.length === 0) {
      if (!silent) toast.error("Please enter a payment amount");
      return;
    }

    const defaultBankId = bankAccounts.length > 0 ? String(bankAccounts[0].id) : "";
    for (const r of validRows) {
      if (!r.method) {
        return toast.error("Please select a payment method for all entries");
      }
      const isElec = r.method !== "Cash" && r.method !== "Credit";
      if (isElec && !r.bank_account_id && !defaultBankId && bankAccounts.length > 0) {
        return toast.error(`Please select a bank account for ${r.method}`);
      }
    }

    const newPayments = validRows.map((r, idx) => {
      const isCredit = r.method === "Credit";
      const isElec = r.method !== "Cash" && !isCredit;
      const bankId = isCredit ? "" : (r.bank_account_id || (isElec ? defaultBankId : ""));
      return {
        id: r.id && !String(r.id).startsWith("split_") ? r.id : Date.now() + idx,
        amount: Number(r.amount),
        method: r.method,
        card_type: "",
        card_number: "",
        payment_for: r.payment_for || (idx === 0 && payments.length === 0 ? "Advance Payment" : "Payment"),
        payment_ref_no: r.payment_ref_no || "",
        business_id: "",
        bank_account_id: (r.method === "Credit" || r.method === "Cash") ? "" : bankId,
        created_at: new Date().toISOString(),
      };
    });

    setPayments(newPayments);
    setShowPaymentForm(false);
    if (!silent) {
      const totalEntered = newPayments.reduce(
        (s, p) => (p.method?.toLowerCase() === "credit" ? s : s + (Number(p.amount) || 0)),
        0
      );
      toast.success(
        `Payment saved: ₹${totalEntered.toFixed(2)} (${newPayments.map((p) => `${p.method}: ₹${p.amount}`).join(", ")})`
      );
    }
  };

  const addPayment = () => handleConfirmSplitPayments();

  const handlePaymentInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirmSplitPayments();
    }
  };

  const removePayment = (id) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const editPayment = (p) => {
    const isElec = p.method !== "Cash" && p.method !== "Credit";
    const defaultBankId = bankAccounts.length > 0 ? String(bankAccounts[0].id) : "";
    setSplitPayments([
      {
        id: p.id || `split_${Date.now()}`,
        amount: String(p.amount ?? ""),
        method: p.method || "Cash",
        payment_for: p.payment_for || "Payment",
        payment_ref_no: p.payment_ref_no || "",
        bank_account_id: p.bank_account_id ? String(p.bank_account_id) : (isElec ? defaultBankId : ""),
      },
    ]);
    setPayments((prev) => prev.filter((item) => item.id !== p.id));
    setShowPaymentHistoryModal(false);
    setShowPaymentForm(true);
  };

  const refundPayment = (p) => {
    const isElec = p.method !== "Cash" && p.method !== "Credit";
    const defaultBankId = bankAccounts.length > 0 ? String(bankAccounts[0].id) : "";
    setSplitPayments([
      {
        id: `refund_${Date.now()}`,
        amount: String(-Math.abs(p.amount)),
        method: p.method || "Cash",
        payment_for: "Refund",
        payment_ref_no: p.payment_ref_no || "",
        bank_account_id: p.bank_account_id ? String(p.bank_account_id) : (isElec ? defaultBankId : ""),
      },
    ]);
    setShowPaymentHistoryModal(false);
    setShowPaymentForm(true);
  };

  const totalPaid = payments.reduce(
    (sum, p) =>
      p.method && String(p.method).trim().toLowerCase() === "credit"
        ? sum
        : sum + (Number(p.amount) || 0),
    0,
  );

  const handleOpenPay = (isAdvance = false) => {
    const defaultBankId = bankAccounts.length > 0 ? String(bankAccounts[0].id) : "";
    if (payments && payments.length > 0) {
      setSplitPayments(
        payments.map((p, idx) => ({
          id: p.id || `split_${Date.now()}_${idx}`,
          method: p.method || "Cash",
          amount: p.amount != null ? String(p.amount) : "",
          bank_account_id: p.bank_account_id
            ? String(p.bank_account_id)
            : (p.method === "Cash" || p.method === "Credit" ? "" : defaultBankId),
          payment_ref_no: p.payment_ref_no || "",
          payment_for: p.payment_for || (isAdvance ? "Advance Payment" : "Payment"),
        }))
      );
    } else {
      const balance = Number((grandTotal - totalPaid).toFixed(2));
      const autoAmount =
        balance > 0
          ? balance.toFixed(2)
          : grandTotal > 0
            ? grandTotal.toFixed(2)
            : "";
      setSplitPayments([
        {
          id: `split_${Date.now()}_0`,
          method: "Cash",
          amount: autoAmount,
          bank_account_id: defaultBankId,
          payment_ref_no: "",
          payment_for: isAdvance ? "Advance Payment" : "Payment",
        },
      ]);
    }
    setShowPaymentForm(true);
  };

  const doSubmitSale = async (after = null) => {
    if (isSubmittingRef.current) return;
    if (!selectedCustomer) return toast.error("Please select a customer");
    if (!isNonUser && !invoiceNo) return toast.error("Invoice No is required");
    const activeBranch = getActiveBranchId();
    let effectiveLocId = businessLocationId;
    if (!effectiveLocId && locations.length > 0) {
      const match = activeBranch ? locations.find((l) => Number(l.branch_id) === Number(activeBranch)) : null;
      effectiveLocId = String((match || locations[0]).id);
    }
    const validItems = items.filter(
      (it) =>
        it.product_id || (it.product_name && it.product_name.trim() !== ""),
    );
    if (!validItems.length) return toast.error("Add at least one product");
    if (!id && !activeBranch) {
      return toast.error(
        "Select an active branch before saving. Invoice numbers are branch-based.",
      );
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmittingAction(after);

    let finalInvoiceNo = String(invoiceNo || "").trim();
    if (!id && !isNonUser) {
      try {
        const resolved = await ensureUniqueInvoiceString(
          finalInvoiceNo,
          activeBranch,
          isNonUser
        );
        if (resolved && resolved !== finalInvoiceNo) {
          finalInvoiceNo = resolved;
          setInvoiceNo(resolved);
          toast.info("Invoice number adjusted to the next available value.");
        } else if (resolved) {
          finalInvoiceNo = resolved;
        }
      } catch { }
    }
    const firstTaxGroup =
      validItems.find((it) => it.tax_group_id)?.tax_group_id || null;
    const chosenLocId = effectiveLocId ? Number(effectiveLocId) : null;
    const payload = {
      business_id: chosenLocId,
      location_id: chosenLocId,
      branch_id: activeBranch,
      contact_id: selectedCustomer.id,
      sales_person_id: salesPersonId ? Number(salesPersonId) : null,
      commission_amount: commissionAmount !== "" ? Number(commissionAmount) : null,
      address: shippingAddress || null,
      vehicle_no: vehicleNo ? vehicleNo.trim() : null,
      eway_invoice_no: ewayInvoiceNo ? ewayInvoiceNo.trim() : null,
      po_no: poNo ? poNo.trim() : null,
      po_date: poDate || null,
      transport_mode: transportMode ? transportMode.trim() : "By Road",
      transport_charges: Number(transportCharges) || 0,
      additional_charges: additionalCharges.length > 0 ? additionalCharges : null,
      invoice_no: finalInvoiceNo,
      sales_date: saleDate,
      status,
      tax_group_id: isNonUser || gstMode === "without_gst" ? null : (firstTaxGroup ? Number(firstTaxGroup) : null),
      is_gst: isNonUser ? 0 : (gstMode === "without_gst" ? 0 : 1),
      bill_to:
        !isNonUser && gstMode !== "without_gst" && billTo && (billTo.customer_name || billTo.company_name)
          ? billTo
          : null,
      items: validItems.map((item) => {
        const qty = Number(item.qty) || 1;
        const mrp = Number(item.base_price) || Number(item.price) || 0;
        // Net unit rate after discount; falls back to the original price when no discount applies
        const rate =
          item.selling_price !== "" && item.selling_price != null
            ? Number(item.selling_price) || 0
            : mrp;
        const discountType = item.discount_type || (item.discount ? "percentage" : "fixed");
        const discountVal = Number(item.discount || item.discount_amount || 0) || 0;
        const calcTotal = Number(item.total) > 0 ? Number(item.total) : rate * qty;
        return {
          product_id: item.product_id || null,
          product_name: item.product_name || "",
          hsncode: isNonUser ? "" : (item.hsncode || ""),
          qty,
          primary_unit: item.primary_unit || item.unit || "pcs",
          secondary_unit: null,
          base_price: mrp,
          price: rate,
          discount_amount: discountVal,
          discount_type: discountType,
          other: item.other || "",
          tax_group_id: isNonUser || gstMode === "without_gst" ? null : (item.tax_group_id ? Number(item.tax_group_id) : null),
          total: calcTotal,
        };
      }),
      discount_amount: Number(calculatedDiscount.toFixed(2)),
      discount_type: billDiscountType,
      final_amount: grandTotal,
      payments: payments.map((p) => {
        const isBank =
          p.method !== "Cash" && p.method !== "Credit" && p.method !== "";
        const numericId =
          p.id && !String(p.id).startsWith("temp_") && Number(p.id) > 0 && Number(p.id) < 1000000000000
            ? Number(p.id)
            : undefined;
        return {
          ...(numericId ? { id: numericId } : {}),
          amount: p.amount,
          method: p.method,
          card_type: p.method === "Credit Card" || p.method === "Debit Card" ? (p.card_type || null) : null,
          card_number: p.card_number || null,
          payment_for: p.payment_for || null,
          payment_ref_no: p.payment_ref_no || null,
          business_id: chosenLocId || activeBranch || null,
          bank_account_id: p.method === "Credit" ? null : (p.bank_account_id ? Number(p.bank_account_id) || null : null),
        };
      }),
    };

    const isEdit = !!id;
    try {
      const res = isEdit
        ? await api.put(`/transactions/${id}`, payload)
        : await api.post("/transactions", payload);
      const savedInvoiceNo = res.data?.invoice_no || finalInvoiceNo;
      const transactionId = res.data?.id || id;
      if (transactionId && after === "print") {
        toast.dismiss();
        navigate(`/index/thermalReceipt/${transactionId}?autoPrint=true`, {
          replace: true,
          state: { returnTo: "/index/salesList", autoPrint: true },
        });
      } else if (transactionId && after === "pdf") {
        toast.dismiss();
        navigate(`/index/salesReceipt/${transactionId}?pdf=true`, {
          replace: true,
          state: { returnTo: "/index/salesList" },
        });
      } else {
        toast.success(
          isEdit
            ? "Sale updated successfully"
            : (isNonUser
              ? `Non-GST Sale saved successfully (Invoice #${savedInvoiceNo})`
              : "Sale saved successfully"),
        );
        navigate("/index/salesList", { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save sale");
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      setSubmittingAction(null);
    }
  };

  const submitSale = () => void doSubmitSale(null);

  // Synchronize latest state & handlers for global shortcut listener
  useEffect(() => {
    latestHandlersRef.current = {
      doSubmitSale,
      handleOpenPay,
      handleConfirmSplitPayments,
      splitPayments,
      addPayment,
      showPaymentForm,
      setShowPaymentForm,
      paymentForm,
      payments,
      showShortcutsModal,
      setShowShortcutsModal,
      showNewSaleModal,
      setShowNewSaleModal,
      showPaymentHistoryModal,
      setShowPaymentHistoryModal,
      customerModal,
      setCustomerModal,
      locationModal,
      setLocationModal,
      showCustomerCard,
      setShowCustomerCard,
      showProductCard,
      setShowProductCard,
      showLocationDropdown,
      setShowLocationDropdown,
      showBillToModal,
      setShowBillToModal,
      items,
      handleAddRow,
    };
  });

  // Autofocus payment amount field immediately upon opening Payment Modal
  useEffect(() => {
    if (showPaymentForm) {
      const timer = setTimeout(() => {
        if (paymentAmountInputRef.current) {
          paymentAmountInputRef.current.focus();
          paymentAmountInputRef.current.select();
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [showPaymentForm]);

  // Global POS Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const h = latestHandlersRef.current;
      if (!h) return;

      // 1. Ctrl + Shift + P -> Open Sale Payment Modal
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        if (isSubmittingRef.current) return;
        h.handleOpenPay(h.payments?.length === 0);
        return;
      }

      // 2. Ctrl + P -> Sale & Print (Intercept and prevent browser default print dialog)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        if (isSubmittingRef.current) return;
        // If payment modal is open, confirm split payments before submitting
        if (h.showPaymentForm) {
          if (h.handleConfirmSplitPayments) {
            h.handleConfirmSplitPayments(true);
          } else if (h.addPayment) {
            h.addPayment();
          }
          h.setShowPaymentForm?.(false);
        }
        h.doSubmitSale("print");
        return;
      }

      // 3. F2 -> Add or Focus Product Item in Cart
      if (e.key === "F2") {
        e.preventDefault();
        e.stopPropagation();
        const currentItems = h.items || [];
        const last = currentItems[currentItems.length - 1];
        if (last && (last.product_id || last.product_name)) {
          h.handleAddRow?.();
          setTimeout(() => {
            const inputs = document.querySelectorAll('input[placeholder="Search Product..."]');
            if (inputs.length > 0) {
              inputs[inputs.length - 1].focus();
            }
          }, 60);
        } else {
          const inputs = document.querySelectorAll('input[placeholder="Search Product..."]');
          if (inputs.length > 0) {
            const lastInput = inputs[inputs.length - 1];
            lastInput.focus();
            lastInput.select?.();
          }
        }
        return;
      }

      // 4. F1 -> Toggle Keyboard Shortcuts Help
      if (e.key === "F1") {
        e.preventDefault();
        h.setShowShortcutsModal?.((prev) => !prev);
        return;
      }

      // 4. Escape -> Close active modal / popup / card / dropdown
      if (e.key === "Escape") {
        if (h.showNewSaleModal) {
          e.preventDefault();
          h.setShowNewSaleModal(false);
          return;
        }
        if (h.showShortcutsModal) {
          e.preventDefault();
          h.setShowShortcutsModal(false);
          return;
        }
        if (h.showBillToModal) {
          e.preventDefault();
          h.setShowBillToModal(false);
          return;
        }
        if (h.showPaymentForm) {
          e.preventDefault();
          h.setShowPaymentForm(false);
          return;
        }
        if (h.showPaymentHistoryModal) {
          e.preventDefault();
          h.setShowPaymentHistoryModal(false);
          return;
        }
        if (h.customerModal) {
          e.preventDefault();
          h.setCustomerModal(false);
          return;
        }
        if (h.locationModal) {
          e.preventDefault();
          h.setLocationModal(false);
          return;
        }
        if (h.showCustomerCard) {
          e.preventDefault();
          h.setShowCustomerCard(false);
          return;
        }
        if (h.showProductCard) {
          e.preventDefault();
          h.setShowProductCard(false);
          return;
        }
        if (h.showLocationDropdown) {
          e.preventDefault();
          h.setShowLocationDropdown(false);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="sales-form-wrapper p-2 d-flex flex-column position-relative"
      style={{
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        backgroundColor: "#F1F5F9",
      }}
    >
      {/* POS Top Navigation & Status Bar - Shiva Electronics Themed */}
      <div
        className="d-flex flex-wrap align-items-center justify-content-between px-2 px-md-3 py-2 rounded-3 shadow-sm flex-shrink-0 gap-2"
        style={{
          background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
          border: "1px solid rgba(212, 154, 0, 0.35)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
          marginBottom: "22px",
        }}
      >
        <div className="d-flex align-items-center">
          <Button
            size="sm"
            className="d-flex align-items-center px-2 px-sm-3 py-1 shadow-sm me-2 me-sm-3"
            onClick={() => navigate("/index/salesList")}
            title="Return to Sales List"
            style={{
              borderRadius: "8px",
              fontSize: "0.88rem",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 215, 0, 0.35)",
              color: "#FFD700",
              fontWeight: "600",
            }}
          >
            <FaReply size={13} style={{ color: "#FFD700", marginRight: "6px" }} />
            <span>Sales List</span>
          </Button>

          <div className="vr d-none d-sm-block me-3" style={{ height: "24px", borderColor: "rgba(255, 215, 0, 0.3)" }} />

          <div className="d-flex align-items-center">
            <img
              src="/shiva_logo.png"
              alt="Shiva Electronics"
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                objectFit: "contain",
                boxShadow: "0 0 10px rgba(255, 215, 0, 0.45)",
                border: "1.5px solid #FFD700",
                backgroundColor: "#0A0D16",
                marginRight: "8px",
              }}
            />
            <div>
              <span className="fw-bold text-white" style={{ fontSize: "1rem", letterSpacing: "0.02em" }}>
                {id ? "Edit Sale Invoice" : "POS Billing Terminal"}
              </span>
              {id && (
                <span
                  className="badge ms-2 font-monospace"
                  style={{
                    backgroundColor: "rgba(255, 215, 0, 0.15)",
                    color: "#FFD700",
                    border: "1px solid #D49A00",
                    fontSize: "0.82rem",
                  }}
                >
                  #{invoiceNo || id}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side shortcuts & actions */}
        <div className="d-flex align-items-center gap-2 flex-wrap">

          <div className="d-none d-lg-flex align-items-center gap-1.5">
            <span
              className="badge font-monospace"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "#CBD5E1",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                fontSize: "0.8rem",
              }}
            >
              F2: Add Item
            </span>
            <span
              className="badge font-monospace"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "#CBD5E1",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                fontSize: "0.8rem",
              }}
            >
              Ctrl+P: Print
            </span>
            <span
              className="badge font-monospace"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "#CBD5E1",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                fontSize: "0.8rem",
              }}
            >
              Ctrl+Shift+P: Pay
            </span>
          </div>

          <Button
            size="sm"
            className="border-0 fw-semibold d-flex align-items-center gap-1.5 px-3 py-1.5 shadow-sm"
            onClick={() => setShowNewSaleModal(true)}
            title="Start fresh invoice"
            style={{
              borderRadius: "8px",
              fontSize: "0.9rem",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#FCA5A5",
              border: "1px solid rgba(239, 68, 68, 0.35)",
            }}
          >
            <FaTimes size={12} />
            <span>New Sale</span>
          </Button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN POS WORKSPACE */}
      <Row className="g-3">
        {/* LEFT COLUMN: Customer & Basic Details + Billing Products Table */}
        <Col xs={12} lg={8} xl={8} className="d-flex flex-column">
          {/* 1. TOP TIER: CUSTOMER, INVOICE & DETAILS CARD */}
          <Card
            className="sales-top-customer-card border-0 mb-3 flex-shrink-0 shadow-sm"
            style={{
              borderRadius: "12px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderTop: "3.5px solid #D49A00",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
              position: "relative",
              zIndex: 20,
            }}
          >
            <CardBody className="p-3">
              {/* Row 1: Core Sale Identifiers (Customer, Invoice No, Sale Date) */}
              <Row className="g-2 g-md-3 align-items-start mb-2.5">
                {/* Customer Search / Ship To */}
                <Col xs={12} md={6} className="position-relative">
                  <div
                    className="d-flex align-items-center justify-content-between mb-1"
                    style={{ minHeight: "26px" }}
                  >
                    <div className="d-flex align-items-center">
                      <FaUser size={13} style={{ color: "#D49A00", marginRight: "8px", flexShrink: 0 }} />
                      <span className="fw-bold" style={{ color: "#0F172A", fontSize: "0.88rem" }}>
                        Customer / Ship To <span className="text-danger">*</span>
                      </span>
                    </div>

                    {!isNonUser && gstMode !== "without_gst" && (
                      <div>
                        {billTo && (billTo.customer_name || billTo.company_name) ? (
                          <div
                            className="d-flex align-items-center px-2 py-0.5 rounded shadow-sm"
                            style={{
                              backgroundColor: "#FEF3C7",
                              border: "1px solid #D49A00",
                              fontSize: "0.78rem",
                            }}
                          >
                            <FaReceipt style={{ color: "#D49A00", flexShrink: 0, marginRight: "6px" }} size={11} />
                            <span
                              className="fw-bold text-truncate"
                              style={{ maxWidth: "130px", color: "#92400E" }}
                              title={billTo.company_name || billTo.customer_name}
                            >
                              Bill To: {billTo.company_name || billTo.customer_name}
                            </span>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-decoration-none fw-bold ms-2"
                              style={{ color: "#D49A00", fontSize: "0.78rem" }}
                              onClick={() => setShowBillToModal(true)}
                              title="Edit Bill To"
                            >
                              Edit
                            </button>
                            <span className="text-muted mx-1" style={{ fontSize: "0.72rem" }}>•</span>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-decoration-none text-danger fw-bold"
                              style={{ fontSize: "0.78rem" }}
                              onClick={() => setBillTo(null)}
                              title="Remove Bill To"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowBillToModal(true)}
                            className="btn btn-sm d-flex align-items-center fw-bold"
                            style={{
                              border: "1px dashed #D49A00",
                              backgroundColor: "#FFFBEB",
                              color: "#92400E",
                              borderRadius: "6px",
                              fontSize: "0.76rem",
                              padding: "1px 8px",
                              height: "24px",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <FaReceipt size={10} style={{ color: "#D49A00", marginRight: "6px" }} />
                            <span>+ Bill To</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    className="d-flex align-items-center bg-white"
                    style={{
                      borderRadius: "8px",
                      border: showCustomerCard ? "1.5px solid #D49A00" : "1.5px solid #CBD5E1",
                      boxShadow: showCustomerCard ? "0 0 0 3px rgba(212, 154, 0, 0.15)" : "none",
                      height: "38px",
                      paddingLeft: "10px",
                      paddingRight: "3px",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                  >
                    <FaSearch
                      className="text-muted"
                      style={{ opacity: 0.5, fontSize: "0.88rem", flexShrink: 0, marginRight: "8px" }}
                    />
                    <input
                      ref={customerInputRef}
                      type="text"
                      placeholder="Search Name, Phone, GST..."
                      value={customerSearch}
                      onChange={(e) => {
                        customerCardSuppressedRef.current = false;
                        setCustomerSearch(e.target.value);
                      }}
                      onFocus={() => {
                        if (customerSearch.trim() || customers.length > 0) {
                          setShowCustomerCard(true);
                        }
                      }}
                      onKeyDown={handleCustomerKeyDown}
                      autoComplete="off"
                      className="fw-semibold"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: "100%",
                        border: "none",
                        outline: "none",
                        backgroundColor: "transparent",
                        padding: 0,
                        fontSize: "0.92rem",
                        color: "#1E293B",
                      }}
                    />
                    {customerSearch && (
                      <FaTimes
                        className="text-muted mx-1"
                        style={{ fontSize: "0.85rem", cursor: "pointer", opacity: 0.6, flexShrink: 0 }}
                        title="Clear customer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomerSearch("");
                          setSelectedCustomer(null);
                        }}
                      />
                    )}
                    <button
                      type="button"
                      className="fw-bold d-flex align-items-center justify-content-center"
                      onClick={() => {
                        setCustomerForm((prev) => ({
                          ...prev,
                          customer_name: prev.customer_name || customerSearch || "",
                          state: prev.state || "Tamil Nadu",
                          country: prev.country || "India",
                        }));
                        setCustomerModal(true);
                      }}
                      style={{
                        background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                        color: "#08090D",
                        border: "none",
                        borderRadius: "6px",
                        height: "30px",
                        fontSize: "0.82rem",
                        fontWeight: "700",
                        padding: "0 10px",
                        cursor: "pointer",
                        flexShrink: 0,
                        marginLeft: "4px",
                        boxShadow: "0 1px 3px rgba(212, 154, 0, 0.35)",
                        transition: "all 0.2s",
                      }}
                    >
                      <FaPlus style={{ fontSize: "0.72rem", marginRight: "5px" }} /> Add
                    </button>
                  </div>

                  {selectedCustomer && (selectedCustomer.gst_no || selectedCustomer.contact_no || selectedCustomer.contact || selectedCustomer.city) && (
                    <div className="mt-1 d-flex align-items-center gap-1.5 flex-wrap">
                      {selectedCustomer.gst_no && (
                        <span
                          className="badge fw-semibold"
                          style={{
                            backgroundColor: "#FFFBEB",
                            color: "#92400E",
                            border: "1px solid #FCD34D",
                            fontSize: "0.74rem",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          GST: {selectedCustomer.gst_no}
                        </span>
                      )}
                      {(selectedCustomer.contact_no || selectedCustomer.contact) && (
                        <span
                          className="badge fw-medium"
                          style={{
                            backgroundColor: "#F1F5F9",
                            color: "#475569",
                            border: "1px solid #E2E8F0",
                            fontSize: "0.74rem",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          Ph: {selectedCustomer.contact_no || selectedCustomer.contact}
                        </span>
                      )}
                      {selectedCustomer.city && (
                        <span
                          className="badge fw-medium"
                          style={{
                            backgroundColor: "#F1F5F9",
                            color: "#475569",
                            border: "1px solid #E2E8F0",
                            fontSize: "0.74rem",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {selectedCustomer.city}
                        </span>
                      )}
                    </div>
                  )}

                  {showCustomerCard && (
                    <Card
                      className="position-absolute w-100 shadow-lg mt-1 border"
                      style={{ zIndex: 1050, left: 0, top: "100%", borderColor: "#D49A00" }}
                    >
                      <CardBody className="p-2" style={{ maxHeight: "250px", overflowY: "auto" }}>
                        {customers.length ? (
                          customers.map((c, index) => (
                            <div
                              key={c.id}
                              className={`p-2 border-bottom customer-item ${index === customerActiveIndex ? "bg-dark text-warning" : ""}`}
                              style={{ cursor: "pointer", borderRadius: "6px" }}
                              onClick={() => handleSelectCustomer(c)}
                            >
                              <strong style={{ fontSize: "0.92rem" }}>
                                {c.customer_name || c.name || "-"}
                              </strong>
                              <br />
                              <small
                                className={
                                  index === customerActiveIndex
                                    ? "text-light"
                                    : "text-muted"
                                }
                                style={{ fontSize: "0.82rem" }}
                              >
                                {c.contact_no || c.contact || "-"} | {c.city || ""}
                                {c.gst_no ? ` | GST: ${c.gst_no}` : ""}
                              </small>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted p-2" style={{ fontSize: "0.88rem" }}>
                            No Customers Found
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  )}
                </Col>

                {/* Invoice No */}
                <Col xs={6} md={3}>
                  <div className="d-flex align-items-center mb-1" style={{ minHeight: "26px" }}>
                    <FaFileInvoice size={13} style={{ color: "#D49A00", marginRight: "8px", flexShrink: 0 }} />
                    <span className="fw-bold" style={{ color: "#0F172A", fontSize: "0.88rem" }}>
                      Invoice No {isNonUser ? "" : <span className="text-danger">*</span>}
                    </span>
                  </div>
                  <Input
                    bsSize="sm"
                    value={invoiceNo}
                    onChange={(e) => !isNonUser && setInvoiceNo(e.target.value)}
                    onBlur={async (e) => {
                      if (id || isNonUser) return;
                      const v = String(e.target.value || "").trim();
                      if (!v) return;
                      try {
                        const u = await ensureUniqueInvoiceString(
                          v,
                          getActiveBranchId(),
                          isNonUser,
                        );
                        if (u && u !== v) {
                          setInvoiceNo(u);
                          toast.info("Invoice number was in use; set to next available.");
                        }
                      } catch {
                        /* ignore */
                      }
                    }}
                    placeholder={isNonUser ? "Auto" : "SE-01"}
                    readOnly={!!id || isNonUser}
                    disabled={!!id || isNonUser}
                    className={`fw-bold px-2 w-100 ${id || isNonUser ? "text-muted" : "text-dark"}`}
                    style={{
                      height: "38px",
                      backgroundColor: (id || isNonUser) ? "#F8FAFC" : "#fff",
                      border: "1.5px solid #CBD5E1",
                      borderRadius: "8px",
                      fontSize: "0.92rem",
                      cursor: isNonUser ? "not-allowed" : "text",
                    }}
                  />
                </Col>

                {/* Sale Date */}
                <Col xs={6} md={3}>
                  <div className="d-flex align-items-center mb-1" style={{ minHeight: "26px" }}>
                    <FaCalendarAlt size={13} style={{ color: "#D49A00", marginRight: "8px", flexShrink: 0 }} />
                    <span className="fw-bold" style={{ color: "#0F172A", fontSize: "0.88rem" }}>
                      Sale Date <span className="text-danger">*</span>
                    </span>
                  </div>
                  <Input
                    bsSize="sm"
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="fw-semibold px-2 w-100"
                    style={{
                      height: "38px",
                      backgroundColor: "#fff",
                      border: "1.5px solid #CBD5E1",
                      borderRadius: "8px",
                      fontSize: "0.92rem",
                    }}
                  />
                </Col>
              </Row>

              {/* Row 2: Sales Executive, Logistics & Additional Charges */}
              <Row className="g-2 g-md-3 align-items-start">
                {/* Sales Executive */}
                <Col xs={12} sm={6} md={3}>
                  <div className="d-flex align-items-center mb-1" style={{ minHeight: "26px" }}>
                    <FaUserTie size={13} style={{ color: "#D49A00", marginRight: "8px", flexShrink: 0 }} />
                    <span className="fw-bold text-truncate" style={{ color: "#0F172A", fontSize: "0.88rem" }}>
                      Sales Executive
                    </span>
                  </div>
                  <SearchableSalesPersonSelect
                    value={salesPersonId}
                    salesPersons={salesPersonsList}
                    onChange={(val, sp) => {
                      setSalesPersonId(val);
                      setSelectedSalesPerson(sp || null);
                      if (!val) {
                        setCommissionAmount("");
                      }
                    }}
                  />
                </Col>

                {/* Vehicle No */}
                <Col xs={6} sm={6} md={2}>
                  <div className="d-flex align-items-center mb-1" style={{ minHeight: "26px" }}>
                    <FaTruck size={13} style={{ color: "#D49A00", marginRight: "8px", flexShrink: 0 }} />
                    <span className="fw-bold text-truncate" style={{ color: "#0F172A", fontSize: "0.88rem" }}>
                      Vehicle No
                    </span>
                  </div>
                  <Input
                    bsSize="sm"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="TN-38-AB-1234"
                    className="fw-semibold px-2 w-100"
                    style={{
                      height: "38px",
                      backgroundColor: "#fff",
                      border: "1.5px solid #CBD5E1",
                      borderRadius: "8px",
                      fontSize: "0.92rem",
                    }}
                  />
                </Col>

                {/* E-Way Invoice No */}
                <Col xs={6} sm={6} md={2}>
                  <div className="d-flex align-items-center mb-1" style={{ minHeight: "26px" }}>
                    <span className="fw-bold text-truncate" style={{ color: "#0F172A", fontSize: "0.88rem" }}>
                      E-Way Invoice No.
                    </span>
                  </div>
                  <Input
                    bsSize="sm"
                    value={ewayInvoiceNo}
                    onChange={(e) => setEwayInvoiceNo(e.target.value)}
                    placeholder="Enter e-way invoice no."
                    maxLength={100}
                    className="fw-semibold px-2 w-100"
                    style={{
                      height: "38px",
                      backgroundColor: "#fff",
                      border: "1.5px solid #CBD5E1",
                      borderRadius: "8px",
                      fontSize: "0.92rem",
                    }}
                  />
                </Col>

                {/* Transport Charges */}
                <Col xs={6} sm={6} md={2}>
                  <div className="d-flex align-items-center mb-1" style={{ minHeight: "26px" }}>
                    <FaRupeeSign size={12} style={{ color: "#D49A00", marginRight: "8px", flexShrink: 0 }} />
                    <span className="fw-bold text-truncate" style={{ color: "#0F172A", fontSize: "0.88rem" }}>
                      Transport (₹)
                    </span>
                  </div>
                  <Input
                    bsSize="sm"
                    type="number"
                    min="0"
                    step="any"
                    value={transportCharges}
                    onChange={(e) => setTransportCharges(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0.00"
                    className="fw-bold px-2 w-100 text-dark"
                    style={{
                      height: "38px",
                      backgroundColor: "#fff",
                      border: "1.5px solid #CBD5E1",
                      borderRadius: "8px",
                      fontSize: "0.92rem",
                    }}
                  />
                </Col>

                {/* Additional Charges */}
                <Col xs={12} sm={12} md={3}>
                  <div
                    className="d-flex align-items-center justify-content-between mb-1"
                    style={{ minHeight: "26px" }}
                  >
                    <div className="d-flex align-items-center">
                      <FaPlusCircle size={13} style={{ color: "#D49A00", marginRight: "8px", flexShrink: 0 }} />
                      <span className="fw-bold text-truncate" style={{ color: "#0F172A", fontSize: "0.88rem" }}>
                        Additional Charges
                      </span>
                    </div>
                    {additionalCharges.length > 0 && (
                      <span className="fw-bold" style={{ color: "#D49A00", fontSize: "0.78rem" }}>
                        Total: ₹{additionalChargesTotal.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="d-flex gap-1 align-items-center">
                    <Input
                      bsSize="sm"
                      style={{
                        flex: "1 1 50%",
                        minWidth: 0,
                        height: "38px",
                        borderRadius: "8px",
                        fontSize: "0.88rem",
                        border: "1.5px solid #CBD5E1",
                        backgroundColor: "#fff",
                      }}
                      placeholder="Charge name"
                      value={chargeName}
                      onChange={(e) => setChargeName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddAdditionalCharge();
                        }
                      }}
                    />
                    <Input
                      bsSize="sm"
                      style={{
                        width: "75px",
                        flexShrink: 0,
                        height: "38px",
                        borderRadius: "8px",
                        fontSize: "0.88rem",
                        border: "1.5px solid #CBD5E1",
                        backgroundColor: "#fff",
                      }}
                      type="number"
                      min="0"
                      step="any"
                      placeholder="₹"
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddAdditionalCharge();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleAddAdditionalCharge}
                      className="d-flex align-items-center gap-1 text-nowrap fw-bold shadow-sm"
                      style={{
                        height: "38px",
                        borderRadius: "8px",
                        background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                        color: "#08090D",
                        border: "none",
                        padding: "0 10px",
                        fontSize: "0.82rem",
                        fontWeight: "700",
                        flexShrink: 0,
                      }}
                    >
                      <FaPlus size={10} style={{ marginRight: "5px" }} /> Add
                    </Button>
                  </div>

                  {/* Badges of added charges */}
                  {additionalCharges.length > 0 && (
                    <div className="d-flex flex-wrap gap-1.5 align-items-center mt-1.5">
                      {additionalCharges.map((chg, idx) => (
                        <Badge
                          key={chg.id || idx}
                          color="light"
                          className="d-inline-flex align-items-center gap-1 py-1 px-1.5 border shadow-sm"
                          style={{
                            fontSize: "0.76rem",
                            borderRadius: "6px",
                            backgroundColor: "#FFFBEB",
                            borderColor: "#FCD34D",
                            color: "#0F172A",
                          }}
                        >
                          <span className="fw-semibold">{chg.name}:</span>
                          <span className="fw-bold" style={{ color: "#92400E" }}>
                            ₹{Number(chg.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            className="btn btn-link p-0 text-danger fw-bold ms-1"
                            style={{ fontSize: "0.78rem", textDecoration: "none", lineHeight: 1 }}
                            onClick={() => handleRemoveAdditionalCharge(idx)}
                            title="Remove charge"
                          >
                            ✕
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </Col>
              </Row>

              {/* Row 3: Order (P.O.) & Dispatch Details */}
              <Row className="g-2 g-md-3 align-items-start mt-1">
                {/* P.O. Number */}
                <Col xs={6} sm={6} md={3}>
                  <div className="d-flex align-items-center mb-1" style={{ minHeight: "26px" }}>
                    <FaFileInvoice size={13} style={{ color: "#D49A00", marginRight: "8px", flexShrink: 0 }} />
                    <span className="fw-bold text-truncate" style={{ color: "#0F172A", fontSize: "0.88rem" }}>
                      P.O. Number
                    </span>
                  </div>
                  <Input
                    bsSize="sm"
                    value={poNo}
                    onChange={(e) => setPoNo(e.target.value)}
                    placeholder="Enter P.O. No."
                    maxLength={100}
                    className="fw-semibold px-2 w-100"
                    style={{
                      height: "38px",
                      backgroundColor: "#fff",
                      border: "1.5px solid #CBD5E1",
                      borderRadius: "8px",
                      fontSize: "0.92rem",
                    }}
                  />
                </Col>

                {/* P.O. Date */}
                <Col xs={6} sm={6} md={3}>
                  <div className="d-flex align-items-center mb-1" style={{ minHeight: "26px" }}>
                    <FaCalendarAlt size={13} style={{ color: "#D49A00", marginRight: "8px", flexShrink: 0 }} />
                    <span className="fw-bold text-truncate" style={{ color: "#0F172A", fontSize: "0.88rem" }}>
                      P.O. Date
                    </span>
                  </div>
                  <Input
                    bsSize="sm"
                    type="date"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                    className="fw-semibold px-2 w-100"
                    style={{
                      height: "38px",
                      backgroundColor: "#fff",
                      border: "1.5px solid #CBD5E1",
                      borderRadius: "8px",
                      fontSize: "0.92rem",
                    }}
                  />
                </Col>

                {/* Transport / Dispatched Thru */}
                <Col xs={12} sm={6} md={3}>
                  <div className="d-flex align-items-center mb-1" style={{ minHeight: "26px" }}>
                    <FaTruck size={13} style={{ color: "#D49A00", marginRight: "8px", flexShrink: 0 }} />
                    <span className="fw-bold text-truncate" style={{ color: "#0F172A", fontSize: "0.88rem" }}>
                      Dispatched Thru
                    </span>
                  </div>
                  <Input
                    bsSize="sm"
                    value={transportMode}
                    onChange={(e) => setTransportMode(e.target.value)}
                    placeholder="e.g. By Road"
                    maxLength={100}
                    className="fw-semibold px-2 w-100"
                    style={{
                      height: "38px",
                      backgroundColor: "#fff",
                      border: "1.5px solid #CBD5E1",
                      borderRadius: "8px",
                      fontSize: "0.92rem",
                    }}
                  />
                </Col>
              </Row>
            </CardBody>
          </Card>

      {/* 2. MIDDLE TIER: BILLING & PRODUCTS TABLE */}
      <Card
        className="sales-table-card border-0 mb-3 shadow-sm"
        style={{
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          backgroundColor: "#fff",
          border: "1px solid #E2E8F0",
        }}
      >
        <CardBody className="p-0">
          {/* Table */}
          <div
            className="table-responsive pos-table-scroll p-2 p-md-3"
            style={{
              backgroundColor: "#fdfdfd",
            }}
          >
            <style>{`
              /* Full Page Natural Scrolling across all screens (Desktop, Tablets & Mobile) */
              .sales-form-wrapper {
                height: auto !important;
                min-height: 100vh !important;
                max-height: none !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                padding: 10px 14px 40px !important;
              }
              .sales-top-customer-card {
                flex-shrink: 0;
                margin-bottom: 12px !important;
              }
              .sales-table-card {
                height: auto !important;
                min-height: 420px !important;
                overflow: visible !important;
                margin-bottom: 14px !important;
              }
              .pos-table-scroll {
                overflow-x: auto !important;
                overflow-y: visible !important;
                min-height: 400px !important;
                -webkit-overflow-scrolling: touch;
              }
              .sales-bottom-payment-card {
                flex-shrink: 0;
                margin-bottom: 24px !important;
              }

              /* Tablet & Mobile (< 992px) */
              @media (max-width: 991.98px) {
                .sales-form-wrapper {
                  padding: 8px 10px 30px !important;
                }
              }

              /* Small Mobile (< 576px) */
              @media (max-width: 575.98px) {
                .sales-form-wrapper {
                  padding: 4px 6px 24px !important;
                }
                .pos-table-scroll {
                  padding: 6px !important;
                }
              }

              /* Shiva Electronics Gold & Obsidian Themed Table Header */
              .pos-product-table,
              .pos-product-table thead tr th,
              .pos-product-table tbody tr td {
                white-space: nowrap !important;
                vertical-align: middle !important;
              }
              .pos-product-table thead tr th {
                background: linear-gradient(135deg, #0A0D16 0%, #161C2E 100%) !important;
                color: #FFD700 !important;
                box-shadow: none !important;
                border: none !important;
                vertical-align: middle !important;
                white-space: nowrap !important;
              }
              .pos-product-table thead tr th * {
                color: #FFD700 !important;
              }
              .pos-product-table thead select {
                color: #FFD700 !important;
                background-color: transparent !important;
              }
              .pos-product-table thead select option {
                color: #0F172A !important;
                background-color: #FFFFFF !important;
              }
              .pos-product-table tbody tr td {
                padding-top: 6px !important;
                padding-bottom: 6px !important;
                white-space: nowrap !important;
                vertical-align: middle !important;
              }
            `}</style>
                <Table
                  borderless
                  hover
                  className="align-middle text-center mb-0 pos-product-table"
                  style={{ minWidth: "780px", width: "100%" }}
                >
                  <thead
                    style={{
                      background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
                      color: "#FFD700",
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                      fontSize: "0.82rem",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    <tr style={{ background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)", height: "42px" }}>
                      <th
                        className="text-center"
                        style={{
                          width: "44px",
                          minWidth: "44px",
                          padding: "10px 4px",
                          background: "transparent",
                          color: "#FFD700",
                          boxShadow: "none",
                          borderTopLeftRadius: "10px",
                          borderBottomLeftRadius: "10px",
                        }}
                      >
                        <div className="d-flex align-items-center justify-content-center gap-1">
                          <FaListUl size={11} style={{ color: "#FFD700" }} />
                          <span>#</span>
                        </div>
                      </th>
                      <th
                        className="text-start"
                        style={{
                          minWidth: "220px",
                          padding: "10px 8px",
                          background: "transparent",
                          color: "#FFD700",
                          boxShadow: "none",
                        }}
                      >
                        <div className="d-flex align-items-center gap-1.5">
                          <FaBox size={12} style={{ color: "#FFD700" }} />
                          <span>PRODUCT</span>
                        </div>
                      </th>
                      <th
                        className="text-center"
                        style={{
                          width: "68px",
                          minWidth: "65px",
                          padding: "10px 4px",
                          background: "transparent",
                          color: "#FFD700",
                          boxShadow: "none",
                        }}
                      >
                        <span>UNIT</span>
                      </th>
                      <th
                        className="text-center"
                        style={{
                          width: "95px",
                          minWidth: "90px",
                          padding: "10px 4px",
                          background: "transparent",
                          color: "#FFD700",
                          boxShadow: "none",
                        }}
                      >
                        <div className="d-flex align-items-center justify-content-center gap-1">
                          <FaRupeeSign size={11} style={{ color: "#FFD700" }} />
                          <span>RATE</span>
                        </div>
                      </th>
                      <th
                        className="text-center"
                        style={{
                          width: "75px",
                          minWidth: "70px",
                          padding: "10px 4px",
                          background: "transparent",
                          color: "#FFD700",
                          boxShadow: "none",
                        }}
                      >
                        <div className="d-flex align-items-center justify-content-center gap-1">
                          <FaLayerGroup size={11} style={{ color: "#FFD700" }} />
                          <span>QTY</span>
                        </div>
                      </th>
                      <th
                        className="text-center"
                        style={{
                          width: "95px",
                          minWidth: "90px",
                          padding: "10px 4px",
                          background: "transparent",
                          color: "#FFD700",
                          boxShadow: "none",
                        }}
                      >
                        <div className="d-flex align-items-center justify-content-center gap-1">
                          <FaPercent size={10} style={{ color: "#FFD700" }} />
                          <span>DISC</span>
                        </div>
                      </th>
                      {!isNonUser && (
                        <th
                          className="text-center"
                          style={{
                            width: "115px",
                            minWidth: "110px",
                            padding: "10px 4px",
                            background: "transparent",
                            color: "#FFD700",
                            boxShadow: "none",
                          }}
                        >
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <FaFileInvoice size={11} style={{ color: "#FFD700" }} />
                            <Input
                              type="select"
                              bsSize="sm"
                              value={gstMode}
                              onChange={(e) => handleSetGstMode(e.target.value)}
                              className="fw-bold border-0 bg-transparent text-center shadow-none p-0"
                              style={{
                                color: "#FFD700",
                                cursor: "pointer",
                                width: "75px",
                                outline: "none",
                                fontSize: "0.82rem",
                              }}
                            >
                              <option value="with_gst" style={{ color: "#0F172A", backgroundColor: "#FFF" }}>GST ⌵</option>
                              <option value="without_gst" style={{ color: "#0F172A", backgroundColor: "#FFF" }}>No GST ⌵</option>
                            </Input>
                          </div>
                        </th>
                      )}
                      <th
                        className="text-center"
                        style={{
                          width: "105px",
                          minWidth: "100px",
                          padding: "10px 4px",
                          background: "transparent",
                          color: "#FFD700",
                          boxShadow: "none",
                        }}
                      >
                        <div className="d-flex align-items-center justify-content-center gap-1">
                          <FaRupeeSign size={11} style={{ color: "#FFD700" }} />
                          <span>TOTAL</span>
                        </div>
                      </th>
                      <th
                        className="text-center"
                        style={{
                          width: "65px",
                          minWidth: "60px",
                          padding: "10px 4px",
                          background: "transparent",
                          color: "#FFD700",
                          boxShadow: "none",
                          borderTopRightRadius: "10px",
                          borderBottomRightRadius: "10px",
                        }}
                      >
                        <span>ACTION</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ borderSpacing: "0 8px" }}>
                    {items.map((item, i) => {
                      let itemGstRate = 0;
                      if (
                        gstMode !== "without_gst" &&
                        item.tax_group_id &&
                        Array.isArray(taxGroups)
                      ) {
                        const group = taxGroups.find(
                          (g) => String(g.id) === String(item.tax_group_id),
                        );
                        if (group && Array.isArray(group.sub_taxes)) {
                          itemGstRate = group.sub_taxes.reduce(
                            (sum, t) => sum + (Number(t.tax_rate) || 0),
                            0,
                          );
                        }
                      }
                      const itemBaseTotal =
                        (Number(item.selling_price || item.price) || 0) *
                        (Number(item.qty) || 1);
                      const taxAmt =
                        itemGstRate > 0
                          ? Number(((itemBaseTotal * itemGstRate) / 100).toFixed(2))
                          : 0;

                      return (
                        <tr
                          key={i}
                          className="bg-white shadow-sm"
                          style={{
                            borderBottom: "8px solid #fdfdfd",
                            verticalAlign: "middle",
                            position: "relative",
                            zIndex: searchRowIndex === i && showProductCard ? 1050 : 1,
                          }}
                        >
                          {/* 1. ROW NUMBER */}
                          <td
                            className="text-center rounded-start"
                            style={{
                              width: "44px",
                              minWidth: "44px",
                              padding: "8px 4px",
                              verticalAlign: "middle",
                            }}
                          >
                            <span
                              className="d-inline-flex align-items-center justify-content-center fw-bold"
                              style={{
                                backgroundColor: "#FEF3C7",
                                color: "#92400E",
                                borderRadius: "8px",
                                width: "32px",
                                height: "32px",
                                fontSize: "0.92rem",
                                border: "1px solid #FDE68A",
                              }}
                            >
                              {i + 1}
                            </span>
                          </td>

                          {/* 2. PRODUCT NAME / SEARCH */}
                          <td
                            className="text-start"
                            style={{
                              minWidth: "220px",
                              padding: "8px 6px",
                              verticalAlign: "middle",
                              position: "relative",
                              zIndex: searchRowIndex === i && showProductCard ? 1050 : "auto",
                            }}
                          >
                            {!(item.isEntered || item.product_name || item.product_id) ? (
                              <div className="position-relative w-100">
                                <div
                                  className="d-flex align-items-center bg-white px-2"
                                  style={{
                                    borderRadius: "8px",
                                    border: searchRowIndex === i && showProductCard ? "1.5px solid #D49A00" : "1.5px solid #CBD5E1",
                                    boxShadow: searchRowIndex === i && showProductCard ? "0 0 0 3px rgba(212, 154, 0, 0.18)" : "none",
                                    height: "38px",
                                    transition: "border-color 0.2s, box-shadow 0.2s",
                                  }}
                                >
                                  <FaSearch
                                    className="text-muted"
                                    style={{ fontSize: "0.88rem", marginRight: "8px", flexShrink: 0, opacity: 0.7 }}
                                  />
                                  <Input
                                    autoFocus={i === items.length - 1}
                                    placeholder="Search Product / Barcode..."
                                    value={searchRowIndex === i ? query : ""}
                                    onFocus={() => {
                                      setSearchRowIndex(i);
                                      if (query && query.trim() && results.length > 0) {
                                        setShowProductCard(true);
                                      }
                                    }}
                                    onChange={(e) => {
                                      setSearchRowIndex(i);
                                      setQuery(e.target.value);
                                      if (!showProductCard && e.target.value.trim()) {
                                        setShowProductCard(true);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      setSearchRowIndex(i);
                                      handleProductKeyDown(e);
                                    }}
                                    autoComplete="off"
                                    className="border-0 shadow-none fw-semibold p-0"
                                    style={{
                                      backgroundColor: "transparent",
                                      fontSize: "0.94rem",
                                      height: "100%",
                                    }}
                                  />
                                </div>

                                {searchRowIndex === i && showProductCard && results.length > 0 && (
                                  <Card
                                    className="search-card shadow-lg position-absolute border-0"
                                    style={{
                                      zIndex: 2500,
                                      top: "100%",
                                      marginTop: "4px",
                                      left: 0,
                                      minWidth: "360px",
                                      width: "100%",
                                      maxHeight: "340px",
                                      display: "flex",
                                      flexDirection: "column",
                                      borderRadius: "8px",
                                      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                                      border: "1.5px solid #D49A00",
                                      backgroundColor: "#FFFFFF",
                                    }}
                                  >
                                    <div
                                      className="d-flex justify-content-between align-items-center p-2 border-bottom"
                                      style={{
                                        background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
                                        borderTopLeftRadius: "8px",
                                        borderTopRightRadius: "8px",
                                      }}
                                    >
                                      <h6 className="mb-0 fw-bold small" style={{ color: "#FFD700" }}>
                                        Product Suggestions
                                      </h6>
                                      <FaTimes
                                        className="text-light"
                                        style={{
                                          cursor: "pointer",
                                          fontSize: "0.95rem",
                                          opacity: 0.8,
                                        }}
                                        onClick={() => {
                                          setQuery("");
                                          setShowProductCard(false);
                                        }}
                                      />
                                    </div>
                                    <CardBody
                                      className="p-0 text-start"
                                      style={{ overflowY: "auto" }}
                                    >
                                      {results.map((p, index) => (
                                        <div
                                          key={p.id}
                                          className="p-2 border-bottom product-item"
                                          style={{
                                            cursor: "pointer",
                                            transition: "background-color 0.15s",
                                            ...(index === productActiveIndex
                                              ? {
                                                background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
                                                color: "#FFD700",
                                              }
                                              : {
                                                backgroundColor: "#FFFFFF",
                                                color: "#0F172A",
                                              }),
                                          }}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelectProduct(p);
                                          }}
                                          onClick={() => handleSelectProduct(p)}
                                        >
                                          <div className="fw-bold" style={{ fontSize: "0.94rem" }}>
                                            {p.product_name || "-"}
                                          </div>
                                          <small
                                            className={
                                              index === productActiveIndex
                                                ? "text-light"
                                                : "text-muted"
                                            }
                                            style={{ fontSize: "0.82rem" }}
                                          >
                                            {p.category_name ? `${p.category_name} • ` : ""}₹{Number(p.selling_price || p.price || 0).toFixed(2)}
                                          </small>
                                        </div>
                                      ))}
                                    </CardBody>
                                  </Card>
                                )}
                              </div>
                            ) : (
                              <div
                                className="d-flex align-items-center bg-white px-2"
                                style={{
                                  borderRadius: "8px",
                                  border: "1.5px solid #CBD5E1",
                                  height: "38px",
                                  transition: "border-color 0.2s, box-shadow 0.2s",
                                }}
                              >
                                <Input
                                  id={`item-product-name-${i}`}
                                  type="text"
                                  placeholder="Product Name"
                                  value={item.product_name || ""}
                                  onChange={(e) => {
                                    handleChange(i, "product_name", e.target.value);
                                  }}
                                  autoComplete="off"
                                  className="border-0 shadow-none fw-bold text-dark px-1 py-0"
                                  style={{
                                    backgroundColor: "transparent",
                                    fontSize: "0.96rem",
                                    height: "100%",
                                  }}
                                />
                                <FaTimes
                                  className="text-muted ms-1"
                                  style={{
                                    fontSize: "0.88rem",
                                    cursor: "pointer",
                                    opacity: 0.6,
                                    flexShrink: 0,
                                  }}
                                  title="Clear / Change Product"
                                  onClick={() => {
                                    setItems((prev) =>
                                      prev.map((it, idx) =>
                                        idx === i
                                          ? {
                                              ...it,
                                              product_id: null,
                                              product_name: "",
                                              isEntered: false,
                                              selling_price: "",
                                              price: "",
                                              base_price: "",
                                              discount: "",
                                              total: "0",
                                            }
                                          : it,
                                      ),
                                    );
                                    setSearchRowIndex(i);
                                    setQuery("");
                                  }}
                                />
                              </div>
                            )}
                          </td>

                          {/* 3. UNIT */}
                          <td
                            className="text-center"
                            style={{
                              width: "68px",
                              minWidth: "65px",
                              padding: "8px 4px",
                              verticalAlign: "middle",
                            }}
                          >
                            <Input
                              id={`item-unit-${i}`}
                              bsSize="sm"
                              type="text"
                              placeholder="pcs"
                              className="text-center fw-semibold px-1 pos-number-input"
                              style={{
                                backgroundColor: "#F8FAFC",
                                border: "1.5px solid #CBD5E1",
                                borderRadius: "8px",
                                height: "38px",
                                fontSize: "0.88rem",
                                color: "#1E293B",
                              }}
                              value={item.primary_unit || item.unit || "pcs"}
                              onChange={(e) =>
                                handleChange(i, "primary_unit", e.target.value)
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                            />
                          </td>

                          {/* 4. RATE */}
                          <td
                            className="text-center"
                            style={{
                              width: "95px",
                              minWidth: "90px",
                              padding: "8px 4px",
                              verticalAlign: "middle",
                            }}
                          >
                            <Input
                              id={`item-rate-${i}`}
                              bsSize="sm"
                              type="number"
                              step="any"
                              placeholder="0.00"
                              className="text-center fw-bold px-1 pos-number-input"
                              style={{
                                backgroundColor: "#FFFFFF",
                                border: "1.5px solid #CBD5E1",
                                borderRadius: "8px",
                                height: "38px",
                                fontSize: "0.95rem",
                                color: "#0F172A",
                              }}
                              value={
                                item.base_price != null && item.base_price !== ""
                                  ? item.base_price
                                  : item.price != null && item.price !== ""
                                    ? item.price
                                    : item.selling_price || ""
                              }
                              onChange={(e) =>
                                handleChange(i, "price", e.target.value)
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                            />
                          </td>

                          {/* 5. QTY */}
                          <td
                            className="text-center"
                            style={{
                              width: "75px",
                              minWidth: "70px",
                              padding: "8px 4px",
                              verticalAlign: "middle",
                            }}
                          >
                            <Input
                              id={`item-qty-${i}`}
                              bsSize="sm"
                              type="number"
                              step="any"
                              min="1"
                              className="text-center fw-bold px-1 pos-number-input"
                              style={{
                                color: "#0F172A",
                                backgroundColor: "#FFFBEB",
                                border: "1.5px solid #D49A00",
                                borderRadius: "8px",
                                height: "38px",
                                fontSize: "1rem",
                                boxShadow: "0 0 0 1px rgba(212,154,0,0.15)",
                              }}
                              value={item.qty != null ? item.qty : 1}
                              onChange={(e) =>
                                handleChange(i, "qty", e.target.value)
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                            />
                          </td>

                          {/* 6. DISCOUNT */}
                          <td
                            className="text-center"
                            style={{
                              width: "95px",
                              minWidth: "90px",
                              padding: "8px 4px",
                              verticalAlign: "middle",
                            }}
                          >
                            <div
                              className="d-flex align-items-center bg-white rounded-2 overflow-hidden"
                              style={{ border: "1.5px solid #CBD5E1", height: "38px" }}
                            >
                              <Input
                                id={`item-discount-${i}`}
                                bsSize="sm"
                                type="number"
                                step="any"
                                placeholder="0"
                                className="text-center fw-bold px-1 border-0 shadow-none pos-number-input"
                                style={{
                                  backgroundColor: "transparent",
                                  height: "100%",
                                  fontSize: "0.92rem",
                                  flex: 1,
                                  minWidth: 0,
                                }}
                                value={item.discount || ""}
                                onChange={(e) =>
                                  handleChange(i, "discount", e.target.value)
                                }
                                onWheel={(e) => e.currentTarget.blur()}
                              />
                              <button
                                type="button"
                                className="fw-bold border-0 px-1.5 h-100"
                                onClick={() =>
                                  handleChange(
                                    i,
                                    "discount_type",
                                    item.discount_type === "percentage" ? "fixed" : "percentage",
                                  )
                                }
                                title="Toggle ₹ or %"
                                style={{
                                  background: item.discount_type === "percentage" ? "#0A0D16" : "#F1F5F9",
                                  color: item.discount_type === "percentage" ? "#FFD700" : "#0F172A",
                                  fontSize: "0.82rem",
                                  cursor: "pointer",
                                  minWidth: "26px",
                                  fontWeight: "800",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                {item.discount_type === "percentage" ? "%" : "₹"}
                              </button>
                            </div>
                          </td>

                          {/* 7. GST */}
                          {!isNonUser && (
                            <td
                              className="text-center"
                              style={{
                                width: "115px",
                                minWidth: "110px",
                                padding: "8px 4px",
                                verticalAlign: "middle",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {gstMode !== "without_gst" ? (
                                <div className="d-flex align-items-center justify-content-center">
                                  <Input
                                    id={`item-tax-${i}`}
                                    bsSize="sm"
                                    type="select"
                                    className="text-center p-1 fw-semibold"
                                    style={{
                                      fontSize: "0.82rem",
                                      backgroundColor: "#F8FAFC",
                                      border: "1.5px solid #CBD5E1",
                                      borderRadius: "8px",
                                      height: "38px",
                                      width: "100%",
                                    }}
                                    value={item.tax_group_id || ""}
                                    onChange={(e) =>
                                      handleChange(
                                        i,
                                        "tax_group_id",
                                        e.target.value,
                                      )
                                    }
                                    title={taxAmt > 0 ? `GST Tax: +₹${taxAmt.toFixed(2)}` : undefined}
                                  >
                                    <option value="">No GST</option>
                                    {taxGroups.map((g) => (
                                      <option key={g.id} value={g.id}>
                                        {g.name}
                                      </option>
                                    ))}
                                  </Input>
                                </div>
                              ) : (
                                <span className="text-muted small fw-semibold">None</span>
                              )}
                            </td>
                          )}

                          {/* 8. TOTAL */}
                          <td
                            className="text-center fw-bold"
                            style={{
                              width: "105px",
                              minWidth: "100px",
                              padding: "8px 4px",
                              verticalAlign: "middle",
                            }}
                          >
                            <Input
                              id={`item-total-${i}`}
                              bsSize="sm"
                              type="number"
                              step="any"
                              className="text-center fw-bold text-dark px-1 pos-number-input"
                              style={{
                                backgroundColor: "#F8FAFC",
                                border: "1.5px solid #CBD5E1",
                                borderRadius: "8px",
                                height: "38px",
                                fontSize: "1rem",
                              }}
                              value={
                                item.total ||
                                (
                                  (Number(item.selling_price || item.price) || 0) *
                                  (Number(item.qty) || 1)
                                ).toFixed(2)
                              }
                              onChange={(e) =>
                                handleChange(i, "total", e.target.value)
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                            />
                          </td>

                          {/* 9. ACTION (Trash / Add Row) */}
                          <td
                            className="text-center rounded-end"
                            style={{
                              width: "65px",
                              minWidth: "60px",
                              padding: "8px 4px",
                              verticalAlign: "middle",
                            }}
                          >
                            <div className="d-flex align-items-center justify-content-center gap-1.5">
                              {items.length > 1 && (
                                <FaTrash
                                  className="text-danger"
                                  style={{ cursor: "pointer", fontSize: "0.95rem", opacity: 0.8 }}
                                  onClick={() => removeItem(i)}
                                  title="Remove item"
                                />
                              )}
                              <Button
                                size="sm"
                                onClick={handleAddRow}
                                title="Add new row"
                                style={{
                                  background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                                  color: "#08090D",
                                  border: "none",
                                  padding: "3px 7px",
                                  borderRadius: "6px",
                                  fontSize: "0.75rem",
                                  fontWeight: "800",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                }}
                              >
                                <FaPlus size={10} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* RIGHT COLUMN: Payments & Checkout Section */}
        <Col xs={12} lg={4} xl={4} className="mt-3 mt-lg-0">
          {/* 3. PAYMENT & CHECKOUT SECTION (SHIVA ELECTRONICS THEMED) */}
          <Card
              className="sales-bottom-payment-card border-0 shadow-sm"
              style={{
                borderRadius: "12px",
                background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
                border: "1px solid rgba(212, 154, 0, 0.35)",
                borderTop: "3.5px solid #D49A00",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
              }}
            >
              <CardBody className="p-3 d-flex flex-column" style={{ gap: "11px" }}>
                {/* Header: Title + Status Badge */}
                <div className="d-flex align-items-center justify-content-between pb-2 border-bottom border-secondary border-opacity-25">
                  <div className="d-flex align-items-center">
                    <FaCreditCard size={16} style={{ color: "#FFD700", marginRight: "8px", flexShrink: 0 }} />
                    <span className="fw-bold text-white" style={{ fontSize: "0.98rem", letterSpacing: "0.04em" }}>
                      PAYMENT & CHECKOUT
                    </span>
                  </div>
                  {(() => {
                    const remaining = Math.max(0, Number((grandTotal - totalPaid).toFixed(2)));
                    if (totalPaid <= 0) {
                      return (
                        <span
                          className="badge px-2.5 py-1 rounded-pill fw-bold"
                          style={{ backgroundColor: "#EF4444", color: "#FFFFFF", fontSize: "0.78rem", letterSpacing: "0.04em" }}
                        >
                          DUE
                        </span>
                      );
                    } else if (remaining > 0.001) {
                      return (
                        <span
                          className="badge px-2.5 py-1 rounded-pill fw-bold text-dark"
                          style={{ backgroundColor: "#F59E0B", fontSize: "0.78rem", letterSpacing: "0.04em" }}
                        >
                          PARTIAL
                        </span>
                      );
                    } else {
                      return (
                        <span
                          className="badge px-2.5 py-1 rounded-pill fw-bold"
                          style={{ backgroundColor: "#10B981", color: "#FFFFFF", fontSize: "0.78rem", letterSpacing: "0.04em" }}
                        >
                          PAID
                        </span>
                      );
                    }
                  })()}
                </div>

                {/* Net Grand Total highlight card */}
                <div
                  className="px-3 py-2 rounded-3 text-center"
                  style={{
                    background: "radial-gradient(ellipse at top, rgba(212, 154, 0, 0.22) 0%, rgba(10, 13, 22, 0.9) 100%)",
                    border: "1.5px solid rgba(255, 215, 0, 0.4)",
                    boxShadow: "inset 0 0 16px rgba(255, 215, 0, 0.1)",
                  }}
                >
                  <div className="fw-bold text-uppercase" style={{ color: "#FFD700", letterSpacing: "0.07em", fontSize: "0.82rem" }}>
                    Net Payable Amount
                  </div>
                  <div
                    className="fw-extrabold font-monospace my-1"
                    style={{
                      color: "#FFFFFF",
                      fontSize: "2.1rem",
                      textShadow: "0 0 16px rgba(255, 215, 0, 0.5)",
                      lineHeight: 1.15,
                    }}
                  >
                    ₹{grandTotal.toFixed(2)}
                  </div>
                </div>

                {/* Status metrics in cards: Total Sale | Paid | Remaining Due */}
                <div
                  className="d-flex justify-content-between align-items-center py-2 px-3 rounded-3"
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className="text-center flex-fill">
                    <div className="fw-semibold mb-0.5" style={{ color: "#94A3B8", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total</div>
                    <div className="fw-bold text-white font-monospace" style={{ fontSize: "1.08rem" }}>₹{grandTotal.toFixed(2)}</div>
                  </div>
                  <div className="vr my-0.5" style={{ borderColor: "rgba(255, 255, 255, 0.12)", height: "22px" }} />
                  <div className="text-center flex-fill">
                    <div className="fw-semibold mb-0.5" style={{ color: "#94A3B8", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {payments.length === 1 && payments[0].payment_for === "Advance Payment" ? "Advance" : "Paid"}
                    </div>
                    <div className="fw-bold font-monospace" style={{ color: "#00E676", fontSize: "1.08rem" }}>₹{totalPaid.toFixed(2)}</div>
                  </div>
                  <div className="vr my-0.5" style={{ borderColor: "rgba(255, 255, 255, 0.12)", height: "22px" }} />
                  <div className="text-center flex-fill">
                    <div className="fw-semibold mb-0.5" style={{ color: "#94A3B8", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Due</div>
                    <div className="fw-bold font-monospace" style={{ color: "#FFD700", fontSize: "1.08rem" }}>
                      ₹{Math.max(0, grandTotal - totalPaid).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Controls: Bill Discount & Round-Off Option */}
                <div
                  className="p-2.5 px-3 rounded-3 d-flex flex-column"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                    gap: "10px",
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <div className="d-flex align-items-center">
                      <span className="fw-bold text-white text-nowrap" style={{ fontSize: "0.92rem" }}>
                        Bill Discount:
                      </span>
                      {calculatedDiscount > 0 && (
                        <span className="fw-bold ms-2 font-monospace" style={{ color: "#38BDF8", fontSize: "0.88rem" }}>
                          (-₹{calculatedDiscount.toFixed(2)})
                        </span>
                      )}
                    </div>
                    <div className="d-flex align-items-center gap-1.5">
                      <div
                        className="d-flex align-items-center rounded-2 overflow-hidden shadow-sm"
                        style={{
                          background: "#0E1322",
                          border: "1.5px solid rgba(255, 215, 0, 0.4)",
                          height: "36px",
                        }}
                      >
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={billDiscount}
                          onChange={(e) => setBillDiscount(e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="fw-bold px-2.5 border-0 shadow-none font-monospace"
                          style={{
                            width: "85px",
                            outline: "none",
                            fontSize: "1.02rem",
                            height: "100%",
                            textAlign: "right",
                            backgroundColor: "transparent",
                            color: "#FFD700",
                          }}
                        />
                        <button
                          type="button"
                          className="fw-bold border-0 px-2.5 h-100"
                          onClick={() =>
                            setBillDiscountType((prev) => (prev === "fixed" ? "percentage" : "fixed"))
                          }
                          title="Toggle ₹ (Fixed) or % (Percentage)"
                          style={{
                            background:
                              billDiscountType === "fixed"
                                ? "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)"
                                : "rgba(255, 215, 0, 0.18)",
                            color: billDiscountType === "fixed" ? "#08090D" : "#FFD700",
                            borderLeft: "1px solid rgba(255, 215, 0, 0.3)",
                            fontSize: "0.95rem",
                            cursor: "pointer",
                            minWidth: "34px",
                            fontWeight: "800",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {billDiscountType === "fixed" ? "₹" : "%"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Round-Off Option */}
                  <div className="pt-2 border-top border-secondary border-opacity-25">
                    <label
                      className="d-flex align-items-center justify-content-between mb-0 fw-bold px-2.5 py-1.5 rounded shadow-sm w-100"
                      style={{
                        cursor: "pointer",
                        backgroundColor: isRoundOffEnabled ? "rgba(255, 215, 0, 0.12)" : "rgba(255, 255, 255, 0.05)",
                        border: isRoundOffEnabled ? "1.5px solid rgba(255, 215, 0, 0.4)" : "1px solid rgba(255, 255, 255, 0.12)",
                        color: isRoundOffEnabled ? "#FFD700" : "#94A3B8",
                        fontSize: "0.88rem",
                        userSelect: "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isRoundOffEnabled}
                          onChange={(e) => setIsRoundOffEnabled(e.target.checked)}
                          style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#D49A00" }}
                        />
                        <span>Round-off to Rupee</span>
                      </div>
                      {isRoundOffEnabled && roundOff !== 0 && (
                        <span
                          className="font-monospace fw-bold"
                          style={{ color: roundOff >= 0 ? "#00E676" : "#F87171", fontSize: "0.92rem" }}
                        >
                          {roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                        </span>
                      )}
                    </label>
                  </div>
                </div>

                {/* Pay & View Payments buttons */}
                <div className="d-flex align-items-center gap-2">
                  <Button
                    className="fw-bold px-3 py-2 d-flex align-items-center justify-content-center flex-grow-1"
                    onClick={() => handleOpenPay(payments.length === 0)}
                    disabled={grandTotal > 0 && totalPaid >= grandTotal}
                    style={{
                      background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                      color: "#08090D",
                      border: "none",
                      borderRadius: "8px",
                      height: "42px",
                      fontSize: "0.95rem",
                      fontWeight: "800",
                      boxShadow: "0 2px 10px rgba(212, 154, 0, 0.35)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <FaRupeeSign size={14} style={{ marginRight: "6px", flexShrink: 0 }} />
                    <span>
                      {payments.length === 0
                        ? "Add Payment"
                        : (grandTotal - totalPaid) > 0.001
                          ? "+ Pay Due"
                          : "Add Payment"}
                    </span>
                    <span
                      className="ms-2 px-1.5 py-0.5 rounded shadow-sm"
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.18)",
                        color: "#08090D",
                        fontSize: "0.74rem",
                        fontWeight: "700",
                      }}
                    >
                      Ctrl+Shift+P
                    </span>
                  </Button>

                  <Button
                    className="fw-bold px-3 py-2 d-flex align-items-center justify-content-center"
                    onClick={() => setShowPaymentHistoryModal(true)}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.06)",
                      color: "#FFD700",
                      border: "1px solid rgba(255, 215, 0, 0.3)",
                      borderRadius: "8px",
                      height: "42px",
                      fontSize: "0.92rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <FaHistory size={13} style={{ marginRight: "6px", flexShrink: 0 }} />
                    <span>Payments ({payments.length})</span>
                  </Button>
                </div>

                {/* Vertical Summary Breakdown List */}
                <div
                  className="p-2.5 px-3 rounded-3 d-flex flex-column gap-1.5"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                    fontSize: "0.9rem",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ color: "#94A3B8" }}>Items Subtotal</span>
                    <span className="fw-semibold text-white font-monospace" style={{ fontSize: "0.95rem" }}>₹{grossItemsTotal.toFixed(2)}</span>
                  </div>
                  {calculatedDiscount > 0 && (
                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{ color: "#94A3B8" }}>Bill Discount</span>
                      <span className="fw-bold font-monospace" style={{ color: "#38BDF8", fontSize: "0.95rem" }}>-₹{calculatedDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ color: "#94A3B8" }}>Taxable Value</span>
                    <span className="fw-semibold text-white font-monospace" style={{ fontSize: "0.95rem" }}>₹{calcTaxable.toFixed(2)}</span>
                  </div>
                  {!isNonUser && gstMode !== "without_gst" && (
                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{ color: "#94A3B8" }}>GST Tax</span>
                      <span className="fw-bold font-monospace" style={{ color: "#FBBF24", fontSize: "0.95rem" }}>+₹{calcTax.toFixed(2)}</span>
                    </div>
                  )}
                  {(transportChargesNum > 0 || additionalChargesTotal > 0) && (
                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{ color: "#94A3B8" }}>Charges / Transport</span>
                      <span className="fw-bold font-monospace" style={{ color: "#CBD5E1", fontSize: "0.95rem" }}>
                        +₹{(transportChargesNum + additionalChargesTotal).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {isRoundOffEnabled && roundOff !== 0 && (
                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{ color: "#94A3B8" }}>Round-off</span>
                      <span className="fw-bold font-monospace" style={{ color: roundOff >= 0 ? "#00E676" : "#F87171", fontSize: "0.95rem" }}>
                        {roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons: Left (Save & Print) & Right (Save Sale) */}
                <div className="d-flex align-items-center gap-2 mt-1">
                  <Button
                    className="fw-bold d-flex align-items-center justify-content-center flex-fill"
                    disabled={isSubmitting}
                    onClick={() => doSubmitSale("print")}
                    style={{
                      background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                      color: "#08090D",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "0.95rem",
                      fontWeight: "800",
                      height: "44px",
                      boxShadow: "0 4px 14px rgba(212, 154, 0, 0.4)",
                      opacity: isSubmitting ? 0.7 : 1,
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                      padding: "0 10px",
                    }}
                  >
                    {isSubmitting && submittingAction === "print" ? (
                      <Spinner size="sm" style={{ marginRight: "6px" }} />
                    ) : (
                      <FaPrint size={15} style={{ marginRight: "6px" }} />
                    )}
                    <span>{id ? "Update & Print" : "Save & Print"}</span>
                    <span
                      className="ms-1.5 px-1.5 py-0.5 rounded shadow-sm d-none d-sm-inline-block"
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.2)",
                        color: "#08090D",
                        fontSize: "0.72rem",
                        fontWeight: "800",
                      }}
                    >
                      Ctrl+P
                    </span>
                  </Button>

                  <Button
                    className="fw-bold d-flex align-items-center justify-content-center flex-fill"
                    disabled={isSubmitting}
                    onClick={submitSale}
                    style={{
                      background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
                      color: "#FFD700",
                      border: "1.5px solid #D49A00",
                      borderRadius: "10px",
                      fontSize: "0.92rem",
                      height: "44px",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                      opacity: isSubmitting ? 0.7 : 1,
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                      padding: "0 10px",
                    }}
                  >
                    {isSubmitting && submittingAction === null ? (
                      <Spinner size="sm" style={{ marginRight: "6px" }} />
                    ) : (
                      <FaSave size={14} style={{ color: "#FFD700", marginRight: "6px" }} />
                    )}
                    <span>{id ? "Update Sale" : "Save Sale"}</span>
                  </Button>
                </div>
              </CardBody>
            </Card>
        </Col>
      </Row>

      {/* SIMPLIFIED MULTI-PAYMENT MODAL */}
      <Modal
        isOpen={showPaymentForm}
        toggle={() => setShowPaymentForm(false)}
        centered
        size="xl"
        style={{ maxWidth: "980px" }}
      >
        <ModalHeader
          toggle={() => setShowPaymentForm(false)}
          className="text-white py-2.5 px-3.5"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setShowPaymentForm(false)}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 shadow-sm"
              style={{
                width: "32px",
                height: "32px",
                background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                color: "#08090D",
              }}
            >
              <FaRupeeSign size={15} />
            </div>
            <div>
              <div className="fw-bold" style={{ color: "#FFD700", fontSize: "1.1rem" }}>
                Payment Options & Settlement
              </div>
              <small style={{ color: "#E2E8F0", fontSize: "0.78rem", opacity: 0.9 }}>
                Split payments across multiple methods (e.g. ₹500 GPay + ₹500 Cash)
              </small>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="p-3" style={{ backgroundColor: "#FFFFFF" }}>
          {(() => {
            const totalSplitPaying = splitPayments.reduce(
              (sum, r) =>
                r.method?.toLowerCase() === "credit"
                  ? sum
                  : sum + (Number(r.amount) || 0),
              0,
            );
            const remainingBalance = Number((grandTotal - totalSplitPaying).toFixed(2));
            const isSettled = Math.abs(remainingBalance) < 0.01;

            return (
              <div className="d-flex flex-column gap-2">
                {/* 1. TOP SUMMARY CARD */}
                <div
                  className="py-2 px-3 rounded-3 border d-flex justify-content-between align-items-center flex-wrap gap-2"
                  style={{
                    backgroundColor: "#F1F5F9",
                    borderColor: "#E2E8F0",
                  }}
                >
                  <div>
                    <div className="text-muted small text-uppercase fw-semibold" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                      Total Bill Amount
                    </div>
                    <div className="fw-bold fs-5 text-dark">
                      ₹{grandTotal.toFixed(2)}
                    </div>
                  </div>

                  <div className="vr d-none d-sm-block" style={{ height: "32px", borderColor: "#CBD5E1" }} />

                  <div>
                    <div className="text-muted small text-uppercase fw-semibold" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                      Total Paying Now
                    </div>
                    <div className="fw-bold fs-5" style={{ color: "#92400E" }}>
                      ₹{totalSplitPaying.toFixed(2)}
                    </div>
                  </div>

                  <div className="vr d-none d-sm-block" style={{ height: "32px", borderColor: "#CBD5E1" }} />

                  <div>
                    <div className="text-muted small text-uppercase fw-semibold" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                      Balance / Status
                    </div>
                    <div>
                      {isSettled ? (
                        <span
                          className="badge px-2.5 py-1 fw-bold"
                          style={{
                            backgroundColor: "#DCFCE7",
                            color: "#15803D",
                            border: "1px solid #86EFAC",
                            fontSize: "0.82rem",
                          }}
                        >
                          ✓ Fully Settled (₹0.00)
                        </span>
                      ) : remainingBalance > 0 ? (
                        <span
                          className="badge px-2.5 py-1 fw-bold"
                          style={{
                            backgroundColor: "#FEF3C7",
                            color: "#B45309",
                            border: "1px solid #FCD34D",
                            fontSize: "0.82rem",
                          }}
                        >
                          ₹{remainingBalance.toFixed(2)} Remaining
                        </span>
                      ) : (
                        <span
                          className="badge px-2.5 py-1 fw-bold"
                          style={{
                            backgroundColor: "#E0F2FE",
                            color: "#0369A1",
                            border: "1px solid #7DD3FC",
                            fontSize: "0.82rem",
                          }}
                        >
                          ₹{Math.abs(remainingBalance).toFixed(2)} Extra / Change
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. QUICK PRESET BUTTONS */}
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted fw-semibold" style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      ⚡ Quick 1-Click Fill & Split
                    </span>
                  </div>
                  <div className="d-flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 px-2 py-0.5"
                      onClick={() => handleQuickAll("Cash")}
                      style={{ borderRadius: "20px", fontSize: "0.8rem", fontWeight: "600" }}
                    >
                      💵 All Cash (₹{grandTotal.toFixed(2)})
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 px-2 py-0.5"
                      onClick={() => handleQuickAll("GPay")}
                      style={{ borderRadius: "20px", fontSize: "0.8rem", fontWeight: "600" }}
                    >
                      📱 All GPay (₹{grandTotal.toFixed(2)})
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 px-2 py-0.5"
                      onClick={() => handleQuickAll("PhonePe")}
                      style={{ borderRadius: "20px", fontSize: "0.8rem", fontWeight: "600" }}
                    >
                      ⚡ All PhonePe (₹{grandTotal.toFixed(2)})
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm d-flex align-items-center gap-1 px-2.5 py-0.5"
                      onClick={() => handleQuickSplit5050("Cash", "GPay")}
                      style={{
                        borderRadius: "20px",
                        fontSize: "0.8rem",
                        fontWeight: "700",
                        backgroundColor: "#FEF3C7",
                        color: "#92400E",
                        border: "1.5px solid #FDE68A",
                      }}
                      title="Split 50% Cash and 50% GPay automatically"
                    >
                      ⚖️ Split 50/50 (Cash & GPay)
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm d-flex align-items-center gap-1 px-2.5 py-0.5"
                      onClick={() => handleQuickSplit5050("Cash", "PhonePe")}
                      style={{
                        borderRadius: "20px",
                        fontSize: "0.8rem",
                        fontWeight: "700",
                        backgroundColor: "#FEF3C7",
                        color: "#92400E",
                        border: "1.5px solid #FDE68A",
                      }}
                      title="Split 50% Cash and 50% PhonePe automatically"
                    >
                      ⚖️ Split 50/50 (Cash & PhonePe)
                    </button>
                  </div>
                </div>

                {/* 3. MULTIPLE PAYMENT ROWS */}
                <div className="d-flex flex-column gap-2 mt-0.5">
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="text-muted fw-bold" style={{ fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Payment Methods & Amounts
                    </span>
                    <span className="text-muted small" style={{ fontSize: "0.72rem" }}>
                      {splitPayments.length} method{splitPayments.length > 1 ? "s" : ""} added
                    </span>
                  </div>

                  {splitPayments.map((row, idx) => {
                    const isElec = row.method !== "Cash" && row.method !== "Credit" && row.method !== "";
                    return (
                      <div
                        key={row.id || idx}
                        className="py-2 px-3 rounded-3 border position-relative"
                        style={{
                          backgroundColor: "#FAFAFA",
                          borderColor: "#E2E8F0",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}
                      >
                        <Row className="g-2 align-items-center">
                          {/* Payment Method Selector */}
                          <Col xs={12} sm={3} md={3}>
                            <Label className="fw-semibold small text-muted mb-0.5" style={{ fontSize: "0.72rem" }}>
                              Method #{idx + 1}
                            </Label>
                            <Input
                              type="select"
                              value={row.method}
                              onChange={(e) => handleSplitRowChange(row.id, "method", e.target.value)}
                              className="fw-bold"
                              style={{
                                height: "38px",
                                borderRadius: "8px",
                                borderColor: "#CBD5E1",
                                backgroundColor: "#FFFFFF",
                                fontSize: "0.92rem",
                              }}
                            >
                              {PAYMENT_METHODS.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </Input>
                          </Col>

                          {/* Payment Amount */}
                          <Col xs={isElec ? 8 : 10} sm={isElec ? 4 : 8} md={isElec ? 4 : 8}>
                            <Label className="fw-semibold small text-muted mb-0.5" style={{ fontSize: "0.72rem" }}>
                              Amount (₹) *
                            </Label>
                            <div className="input-group">
                              <span
                                className="input-group-text fw-bold text-muted py-0"
                                style={{
                                  backgroundColor: "#F1F5F9",
                                  borderColor: "#CBD5E1",
                                  borderRadius: "8px 0 0 8px",
                                  height: "38px",
                                }}
                              >
                                ₹
                              </span>
                              <Input
                                innerRef={idx === 0 ? paymentAmountInputRef : undefined}
                                type="number"
                                step="any"
                                value={row.amount}
                                onChange={(e) => handleSplitRowChange(row.id, "amount", e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onWheel={(e) => e.currentTarget.blur()}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleConfirmSplitPayments();
                                  }
                                }}
                                placeholder="0.00"
                                className="fw-bold pos-number-input"
                                style={{
                                  height: "38px",
                                  borderRadius: "0 8px 8px 0",
                                  borderColor: "#CBD5E1",
                                  fontSize: "1.08rem",
                                  color: "#0F172A",
                                }}
                              />
                            </div>
                          </Col>

                          {/* Bank Account (for electronic payments) */}
                          {isElec && (
                            <Col xs={12} sm={4} md={4}>
                              <Label className="fw-semibold small text-muted mb-0.5" style={{ fontSize: "0.72rem" }}>
                                Bank Account
                              </Label>
                              <Input
                                type="select"
                                value={row.bank_account_id}
                                onChange={(e) => handleSplitRowChange(row.id, "bank_account_id", e.target.value)}
                                className="small"
                                style={{
                                  height: "38px",
                                  borderRadius: "8px",
                                  borderColor: "#CBD5E1",
                                  fontSize: "0.82rem",
                                }}
                              >
                                {bankAccounts.length === 0 && <option value="">No Bank Accounts</option>}
                                {bankAccounts.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.account_name}{b.bank_name ? ` (${b.bank_name})` : ""}
                                  </option>
                                ))}
                              </Input>
                            </Col>
                          )}

                          {/* Delete / Remove Row Button */}
                          <Col xs={isElec ? 4 : 2} sm={1} md={1} className="text-end pt-sm-0 pt-1">
                            <Label className="d-none d-sm-block small text-transparent mb-0.5" style={{ fontSize: "0.72rem" }}>
                              &nbsp;
                            </Label>
                            {splitPayments.length > 1 ? (
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center"
                                onClick={() => handleRemoveSplitRow(row.id)}
                                title="Remove this payment method"
                                style={{
                                  width: "36px",
                                  height: "38px",
                                  borderRadius: "8px",
                                }}
                              >
                                <FaTrash size={13} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-light btn-sm d-flex align-items-center justify-content-center border"
                                onClick={() => handleSplitRowChange(row.id, "amount", "")}
                                title="Clear amount"
                                style={{
                                  width: "36px",
                                  height: "38px",
                                  borderRadius: "8px",
                                }}
                              >
                                <FaTimes size={13} />
                              </button>
                            )}
                          </Col>
                        </Row>

                        {/* Optional Reference Number for Electronic */}
                        {isElec && (
                          <div className="mt-1.5 pt-1.5 border-top d-flex align-items-center gap-2" style={{ borderColor: "#F1F5F9" }}>
                            <span className="text-muted small" style={{ fontSize: "0.74rem", whiteSpace: "nowrap" }}>
                              Ref / UPI ID:
                            </span>
                            <Input
                              type="text"
                              value={row.payment_ref_no || ""}
                              onChange={(e) => handleSplitRowChange(row.id, "payment_ref_no", e.target.value)}
                              placeholder="e.g. UPI-987654 / Transaction Ref (Optional)"
                              className="py-1 px-2 small"
                              style={{
                                height: "28px",
                                fontSize: "0.78rem",
                                borderRadius: "6px",
                                borderColor: "#E2E8F0",
                                maxWidth: "340px",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 4. ADD ANOTHER PAYMENT ROW BUTTON */}
                <div className="d-flex justify-content-between align-items-center pt-1">
                  <button
                    type="button"
                    className="btn d-flex align-items-center gap-2 px-3 py-1.5 fw-semibold"
                    onClick={handleAddSplitRow}
                    style={{
                      borderRadius: "8px",
                      fontSize: "0.84rem",
                      border: "1.5px dashed #D49A00",
                      backgroundColor: "#FFFBEB",
                      color: "#92400E",
                    }}
                  >
                    <FaPlus size={11} style={{ color: "#D49A00" }} />
                    <span>+ Add Another Payment Method (Split Pay)</span>
                    {remainingBalance > 0 && (
                      <span
                        className="badge ms-1"
                        style={{
                          backgroundColor: "#FEF3C7",
                          color: "#92400E",
                          fontSize: "0.74rem",
                          fontWeight: "700",
                          border: "1px solid #FDE68A",
                        }}
                      >
                        ₹{remainingBalance.toFixed(2)} left
                      </span>
                    )}
                  </button>

                  {/* Reset all button */}
                  <button
                    type="button"
                    className="btn btn-link text-muted p-0 small text-decoration-none"
                    onClick={() => handleQuickAll("Cash")}
                    style={{ fontSize: "0.78rem" }}
                  >
                    Reset to 100% Cash
                  </button>
                </div>

                {/* 5. MODAL FOOTER ACTIONS */}
                <div
                  className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top"
                  style={{ borderColor: "#E2E8F0" }}
                >
                  <Button
                    color="light"
                    className="border px-3 py-2 fw-semibold text-muted"
                    onClick={() => setShowPaymentForm(false)}
                    style={{ borderRadius: "8px", fontSize: "0.9rem" }}
                  >
                    Cancel (Esc)
                  </Button>

                  <Button
                    className="fw-bold px-4 py-2 d-flex align-items-center gap-2 shadow-sm"
                    onClick={() => handleConfirmSplitPayments()}
                    style={{
                      background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                      color: "#08090D",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "1rem",
                      fontWeight: "800",
                      boxShadow: "0 3px 10px rgba(212, 154, 0, 0.35)",
                    }}
                  >
                    <FaCheck size={14} />
                    <span>Confirm Payment (₹{totalSplitPaying.toFixed(2)})</span>
                  </Button>
                </div>
              </div>
            );
          })()}
        </ModalBody>
      </Modal>

      {/* PAYMENT HISTORY MODAL */}
      <Modal
        isOpen={showPaymentHistoryModal}
        toggle={() => setShowPaymentHistoryModal(false)}
        centered
        size="lg"
      >
        <ModalHeader
          toggle={() => setShowPaymentHistoryModal(false)}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setShowPaymentHistoryModal(false)}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <FaHistory style={{ color: "#FFD700" }} size={18} />
            <h5 className="fw-bold mb-0" style={{ color: "#FFD700" }}>Invoice Payment History</h5>
          </div>
        </ModalHeader>
        <ModalBody className="pt-3">
          {payments.length > 0 ? (
            <div className="table-responsive">
              <Table
                borderless
                hover
                className="align-middle text-center mb-0 text-nowrap"
                style={{ backgroundColor: "#fdfdfd" }}
              >
                <thead
                  style={{
                    background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
                    color: "#FFD700",
                    borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
                  }}
                >
                  <tr>
                    <th
                      className="py-3 px-3 rounded-start"
                      style={{ textAlign: "left" }}
                    >
                      Date & Time
                    </th>
                    <th className="py-3">Type</th>
                    <th className="py-3">Method</th>
                    <th className="py-3">Bank / Ref</th>
                    <th className="py-3">Amount</th>
                    <th className="py-3 rounded-end">Action</th>
                  </tr>
                </thead>
                <tbody style={{ borderSpacing: "0 10px" }}>
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      className="bg-white shadow-sm"
                      style={{ borderBottom: "5px solid #fdfdfd" }}
                    >
                      <td className="text-muted fw-semibold py-3 px-3 rounded-start text-start">
                        {p.created_at
                          ? new Date(p.created_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
                          : new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                      </td>
                      <td className="fw-semibold">
                        <Badge color={p.payment_for === "Advance Payment" ? "info" : "light"} className="text-dark border">
                          {p.payment_for || "Payment"}
                        </Badge>
                      </td>
                      <td className="fw-bold text-dark">{p.method}</td>
                      <td className="text-muted fw-semibold small">
                        {(() => {
                          let bankStr = "";
                          if (p.bank_account_id) {
                            const b = bankAccounts.find(
                              (acc) => String(acc.id) === String(p.bank_account_id)
                            );
                            if (b) {
                              bankStr = `${b.account_name}${b.bank_name ? ` (${b.bank_name})` : ""}`;
                            } else {
                              bankStr = `Account #${p.bank_account_id}`;
                            }
                          }
                          const refStr = p.payment_ref_no ? `Ref: ${p.payment_ref_no}` : "";
                          if (bankStr && refStr) return `${bankStr} | ${refStr}`;
                          if (bankStr) return bankStr;
                          if (refStr) return refStr;
                          return "-";
                        })()}
                      </td>
                      <td className="fw-bold fs-5" style={{ color: Number(p.amount) < 0 ? "#DC2626" : "#16A34A" }}>
                        ₹{Number(p.amount).toFixed(2)}
                      </td>
                      <td className="rounded-end d-flex justify-content-center align-items-center gap-3">
                        <FaReply
                          className="text-warning"
                          style={{ cursor: "pointer", opacity: 0.9 }}
                          title="Refund"
                          onClick={() => refundPayment(p)}
                        />
                        <FaEdit
                          className="text-primary"
                          style={{ cursor: "pointer", opacity: 0.8 }}
                          title="Edit"
                          onClick={() => editPayment(p)}
                        />
                        <FaTrash
                          className="text-danger"
                          style={{ cursor: "pointer", opacity: 0.8 }}
                          title="Delete"
                          onClick={() => removePayment(p.id)}
                        />
                      </td>
                    </tr>
                  ))}
                  <tr
                    className="bg-white"
                    style={{ borderTop: "2px solid #eee" }}
                  >
                    <td
                      colSpan="4"
                      className="text-end fw-bold py-3 fs-6 text-dark"
                    >
                      Total Paid:
                    </td>
                    <td className="fw-bold fs-5 text-success py-3">
                      ₹{totalPaid.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                  <tr className="bg-light">
                    <td
                      colSpan="4"
                      className="text-end fw-bold py-3 fs-6 text-dark"
                    >
                      Remaining Balance:
                    </td>
                    <td className="fw-bold fs-5 py-3" style={{ color: (grandTotal - totalPaid) > 0.001 ? "#DC2626" : "#16A34A" }}>
                      ₹{Math.max(0, grandTotal - totalPaid).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted py-5 fw-semibold">
              No payments recorded yet.
            </div>
          )}
        </ModalBody>
      </Modal>

      {/* ADD CUSTOMER MODAL (LANDSCAPE LAYOUT) */}
      <Modal
        isOpen={customerModal}
        toggle={() => setCustomerModal(false)}
        size="xl"
        centered
        style={{ maxWidth: "1150px" }}
      >
        <ModalHeader
          toggle={() => setCustomerModal(false)}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setCustomerModal(false)}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <div className="d-flex align-items-center gap-2.5">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                color: "#08090D",
              }}
            >
              <FaUserPlus size={17} />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: "1.12rem", letterSpacing: "0.01em", color: "#FFD700" }}>
                Add New Customer
              </div>
              <div style={{ fontSize: "0.76rem", color: "#E2E8F0", opacity: 0.88, fontWeight: "normal" }}>
                Quick customer registration for billing, receipts & invoices
              </div>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="p-3 p-md-4" style={{ backgroundColor: "#F8FAFC" }}>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              saveCustomer();
            }}
          >
            <Row className="g-3">
              {/* LEFT COLUMN: Customer Primary Details */}
              <Col lg={5} md={12}>
                <div
                  className="bg-white p-3.5 rounded-3 border shadow-sm h-100 d-flex flex-column"
                  style={{ borderColor: "#E2E8F0" }}
                >
                  <div
                    className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom"
                    style={{ borderColor: "#F1F5F9" }}
                  >
                    <FaUser style={{ color: "#D49A00" }} size={14} />
                    <span className="fw-bold text-dark" style={{ fontSize: "0.9rem" }}>
                      Customer Information
                    </span>
                  </div>

                  <div className="d-flex flex-column gap-3 flex-grow-1">
                    <FormGroup className="mb-0">
                      <Label className="fw-semibold text-dark small mb-1">
                        Customer Name <span className="text-danger">*</span>
                      </Label>
                      <Input
                        placeholder="e.g. Ramesh Kumar / ABC Traders"
                        value={customerForm.customer_name}
                        onChange={(e) =>
                          setCustomerForm((f) => ({
                            ...f,
                            customer_name: e.target.value,
                          }))
                        }
                        style={{
                          borderRadius: "8px",
                          border: "1.5px solid #CBD5E1",
                          height: "38px",
                          fontSize: "0.88rem",
                        }}
                        autoFocus
                      />
                    </FormGroup>

                    <Row className="g-2.5">
                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">
                            Contact No <span className="text-danger">*</span>
                          </Label>
                          <Input
                            placeholder="10-digit mobile"
                            value={customerForm.contact_no}
                            onChange={(e) =>
                              setCustomerForm((f) => ({
                                ...f,
                                contact_no: e.target.value.replace(/\D/g, "").slice(0, 10),
                              }))
                            }
                            maxLength={10}
                            style={{
                              borderRadius: "8px",
                              border: "1.5px solid #CBD5E1",
                              height: "38px",
                              fontSize: "0.88rem",
                            }}
                          />
                        </FormGroup>
                      </Col>

                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">
                            Alternate No <span className="text-muted fw-normal" style={{ fontSize: "0.72rem" }}>(Optional)</span>
                          </Label>
                          <Input
                            placeholder="Alt mobile no"
                            value={customerForm.alternate_no}
                            onChange={(e) =>
                              setCustomerForm((f) => ({
                                ...f,
                                alternate_no: e.target.value.replace(/\D/g, "").slice(0, 10),
                              }))
                            }
                            maxLength={10}
                            style={{
                              borderRadius: "8px",
                              border: "1.5px solid #CBD5E1",
                              height: "38px",
                              fontSize: "0.88rem",
                            }}
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    {!isNonUser && (
                      <FormGroup className="mb-0">
                        <Label className="fw-semibold text-dark small mb-1">
                          GSTIN / GST No <span className="text-muted fw-normal" style={{ fontSize: "0.72rem" }}>(Optional)</span>
                        </Label>
                        <Input
                          placeholder="15-character GSTIN (e.g. 33AAAAA0000A1Z5)"
                          value={customerForm.gst_no}
                          onChange={(e) =>
                            setCustomerForm((f) => ({
                              ...f,
                              gst_no: e.target.value.toUpperCase(),
                            }))
                          }
                          maxLength={15}
                          style={{
                            borderRadius: "8px",
                            border: "1.5px solid #CBD5E1",
                            height: "38px",
                            fontSize: "0.88rem",
                          }}
                        />
                      </FormGroup>
                    )}

                    <div
                      className="p-2.5 rounded mt-auto"
                      style={{
                        backgroundColor: "#FEF3C7",
                        border: "1px dashed #FDE68A",
                        fontSize: "0.78rem",
                        color: "#92400E",
                      }}
                    >
                      💡 <strong>Quick Tip:</strong> Required fields are Customer Name and a 10-digit mobile number.
                    </div>
                  </div>
                </div>
              </Col>

              {/* RIGHT COLUMN: Address & Location Details */}
              <Col lg={7} md={12}>
                <div
                  className="bg-white p-3.5 rounded-3 border shadow-sm h-100 d-flex flex-column"
                  style={{ borderColor: "#E2E8F0" }}
                >
                  <div
                    className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom"
                    style={{ borderColor: "#F1F5F9" }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <FaMapMarkerAlt style={{ color: "#D49A00" }} size={14} />
                      <span className="fw-bold text-dark" style={{ fontSize: "0.9rem" }}>
                        Address & Geography
                      </span>
                    </div>
                    {customerForm.address && customerForm.address.trim() && (
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none fw-bold d-flex align-items-center gap-1"
                        style={{ color: "#D49A00", fontSize: "0.76rem" }}
                        onClick={() =>
                          setCustomerForm((f) => ({
                            ...f,
                            address2: f.address,
                          }))
                        }
                      >
                        <FaCopy size={11} />
                        <span>Copy Billing to Shipping</span>
                      </button>
                    )}
                  </div>

                  <div className="d-flex flex-column gap-2.5 flex-grow-1">
                    {/* Billing Address & Shipping Address Side-by-Side */}
                    <Row className="g-2.5">
                      {/* <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">Billing Address</Label>
                          <Input
                            type="textarea"
                            rows={2}
                            placeholder="Door no, street, building..."
                            value={customerForm.address}
                            onChange={(e) =>
                              setCustomerForm((f) => ({
                                ...f,
                                address: e.target.value,
                              }))
                            }
                            style={{
                              borderRadius: "8px",
                              border: "1.5px solid #CBD5E1",
                              fontSize: "0.85rem",
                              resize: "none",
                            }}
                          />
                        </FormGroup>
                      </Col> */}

                      <Col sm={6} style={{ textAlign: "left" }}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">Shipping Address (Address 2)</Label>
                          <Input
                            type="textarea"
                            rows={2}
                            placeholder="Delivery address if different..."
                            value={customerForm.address2}
                            onChange={(e) =>
                              setCustomerForm((f) => ({
                                ...f,
                                address2: e.target.value,
                              }))
                            }
                            style={{
                              borderRadius: "8px",
                              border: "1.5px solid #CBD5E1",
                              fontSize: "0.85rem",
                              resize: "none",
                            }}
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    {/* City & Pincode Side-by-Side */}
                    <Row className="g-2.5">
                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">City / Town</Label>
                          <Input
                            placeholder="e.g. Salem / Attur"
                            value={customerForm.city}
                            onChange={(e) =>
                              setCustomerForm((f) => ({ ...f, city: e.target.value }))
                            }
                            style={{
                              borderRadius: "8px",
                              border: "1.5px solid #CBD5E1",
                              height: "38px",
                              fontSize: "0.88rem",
                            }}
                          />
                        </FormGroup>
                      </Col>

                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">Pincode</Label>
                          <Input
                            placeholder="6-digit pincode"
                            value={customerForm.pincode}
                            onChange={(e) =>
                              setCustomerForm((f) => ({
                                ...f,
                                pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                              }))
                            }
                            maxLength={6}
                            style={{
                              borderRadius: "8px",
                              border: "1.5px solid #CBD5E1",
                              height: "38px",
                              fontSize: "0.88rem",
                            }}
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    {/* State & Country Side-by-Side with Advanced Dropdowns */}
                    <Row className="g-2.5">
                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">
                            State <span className="text-muted fw-normal" style={{ fontSize: "0.72rem" }}>(Default: Tamil Nadu)</span>
                          </Label>
                          <AdvanceStateSelect
                            value={customerForm.state || "Tamil Nadu"}
                            onChange={(stName) => {
                              setCustomerForm((f) => ({
                                ...f,
                                state: stName,
                              }));
                            }}
                          />
                        </FormGroup>
                      </Col>

                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">
                            Country <span className="text-muted fw-normal" style={{ fontSize: "0.72rem" }}>(Default: India)</span>
                          </Label>
                          <AdvanceCountrySelect
                            value={customerForm.country || "India"}
                            onChange={(ctName) => {
                              setCustomerForm((f) => ({
                                ...f,
                                country: ctName,
                              }));
                            }}
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Modal Footer Actions */}
            <div className="d-flex align-items-center justify-content-end gap-2.5 pt-3 mt-1 border-top" style={{ borderColor: "#E2E8F0" }}>
              <Button
                type="button"
                color="light"
                className="fw-semibold px-4 border"
                style={{
                  borderRadius: "8px",
                  height: "38px",
                  fontSize: "0.88rem",
                  backgroundColor: "#FFFFFF",
                }}
                onClick={() => setCustomerModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="d-flex align-items-center gap-2 fw-bold px-4 shadow-sm"
                style={{
                  background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                  color: "#08090D",
                  fontWeight: "800",
                  border: "none",
                  borderRadius: "8px",
                  height: "38px",
                  fontSize: "0.88rem",
                  boxShadow: "0 2px 8px rgba(212, 154, 0, 0.35)",
                }}
              >
                <FaSave size={14} />
                <span>Save Customer</span>
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>

      {/* ADD BUSINESS LOCATION MODAL */}
      <Modal
        isOpen={locationModal}
        toggle={() => setLocationModal(false)}
        size="xl"
        centered
        style={{ maxWidth: "1050px" }}
      >
        <ModalHeader
          toggle={() => setLocationModal(false)}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setLocationModal(false)}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <div className="d-flex align-items-center gap-2.5">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                color: "#08090D",
              }}
            >
              <FaMapMarkerAlt size={17} />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: "1.12rem", letterSpacing: "0.01em", color: "#FFD700" }}>
                Add New Business Location
              </div>
              <div style={{ fontSize: "0.76rem", color: "#E2E8F0", opacity: 0.88, fontWeight: "normal" }}>
                Register a new store, branch outlet, or warehouse location
              </div>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="p-3 p-md-4" style={{ backgroundColor: "#F8FAFC" }}>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              saveLocation();
            }}
          >
            <Row className="g-3">
              {/* Card 1: Location & Contact Information */}
              <Col lg={6} md={12}>
                <div
                  className="bg-white p-3.5 rounded-3 border shadow-sm h-100 d-flex flex-column"
                  style={{ borderColor: "#E2E8F0" }}
                >
                  <div
                    className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom"
                    style={{ borderColor: "#F1F5F9" }}
                  >
                    <FaBuilding size={14} style={{ color: "#D49A00" }} />
                    <span className="fw-bold text-dark" style={{ fontSize: "0.9rem" }}>
                      Location & Contact Information
                    </span>
                  </div>

                  <div className="d-flex flex-column gap-2.5 flex-grow-1">
                    {/* Row 1: Location Name */}
                    <FormGroup className="mb-0">
                      <Label className="fw-semibold text-dark small mb-1">
                        Location Name <span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="text"
                        placeholder="e.g. Main Showroom / Outlet 1"
                        value={locationForm.name}
                        onChange={(e) =>
                          setLocationForm({ ...locationForm, name: e.target.value })
                        }
                        className="fw-medium shadow-none"
                        style={{
                          borderRadius: "8px",
                          border: "1.5px solid #CBD5E1",
                          height: "38px",
                          fontSize: "0.88rem",
                        }}
                        required
                        autoFocus
                      />
                    </FormGroup>

                    {/* Row 2: Branch & Location ID */}
                    <Row className="g-2.5">
                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">
                            Branch <span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="select"
                            value={locationForm.branch_id}
                            onChange={(e) =>
                              setLocationForm({ ...locationForm, branch_id: e.target.value })
                            }
                            className="fw-medium shadow-none"
                            style={{
                              borderRadius: "8px",
                              border: "1.5px solid #CBD5E1",
                              height: "38px",
                              fontSize: "0.88rem",
                            }}
                            required
                          >
                            <option value="">-- Select Branch --</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.branch_name || b.name}
                                {b.branch_code ? ` (${b.branch_code})` : ""}
                              </option>
                            ))}
                          </Input>
                        </FormGroup>
                      </Col>
                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">
                            Location ID (Code)
                          </Label>
                          <Input
                            type="text"
                            placeholder="Auto-generated (LOC-xxxx)"
                            value={locationForm.location_id}
                            onChange={(e) =>
                              setLocationForm({ ...locationForm, location_id: e.target.value })
                            }
                            className="fw-medium shadow-none"
                            style={{
                              borderRadius: "8px",
                              border: "1.5px solid #CBD5E1",
                              height: "38px",
                              fontSize: "0.88rem",
                            }}
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    {/* Row 3: Mobile No & Alternate No */}
                    <Row className="g-2.5">
                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">
                            Mobile No
                          </Label>
                          <Input
                            type="text"
                            maxLength={15}
                            placeholder="Contact mobile no"
                            value={locationForm.mobile}
                            onChange={(e) =>
                              setLocationForm({ ...locationForm, mobile: e.target.value })
                            }
                            className="fw-medium shadow-none"
                            style={{
                              borderRadius: "8px",
                              border: "1.5px solid #CBD5E1",
                              height: "38px",
                              fontSize: "0.88rem",
                            }}
                          />
                        </FormGroup>
                      </Col>
                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">
                            Alternate No <span className="text-muted fw-normal" style={{ fontSize: "0.72rem" }}>(Optional)</span>
                          </Label>
                          <Input
                            type="text"
                            maxLength={15}
                            placeholder="Alternate phone"
                            value={locationForm.alternate_number}
                            onChange={(e) =>
                              setLocationForm({ ...locationForm, alternate_number: e.target.value })
                            }
                            className="fw-medium shadow-none"
                            style={{
                              borderRadius: "8px",
                              border: "1.5px solid #CBD5E1",
                              height: "38px",
                              fontSize: "0.88rem",
                            }}
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    {/* Row 4: Email & GSTIN */}
                    <Row className="g-2.5">
                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">
                            Email Address
                          </Label>
                          <Input
                            type="email"
                            placeholder="location@email.com"
                            value={locationForm.email}
                            onChange={(e) =>
                              setLocationForm({ ...locationForm, email: e.target.value })
                            }
                            className="fw-medium shadow-none"
                            style={{
                              borderRadius: "8px",
                              border: "1.5px solid #CBD5E1",
                              height: "38px",
                              fontSize: "0.88rem",
                            }}
                          />
                        </FormGroup>
                      </Col>
                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">
                            GSTIN / GST No <span className="text-muted fw-normal" style={{ fontSize: "0.72rem" }}>(Optional)</span>
                          </Label>
                          <Input
                            type="text"
                            maxLength={15}
                            placeholder="15-digit GSTIN"
                            value={locationForm.gst_no}
                            onChange={(e) =>
                              setLocationForm({ ...locationForm, gst_no: e.target.value.toUpperCase() })
                            }
                            className="fw-medium shadow-none text-uppercase"
                            style={{
                              borderRadius: "8px",
                              border: "1.5px solid #CBD5E1",
                              height: "38px",
                              fontSize: "0.88rem",
                            }}
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                  </div>
                </div>
              </Col>

              {/* Card 2: Address & Regional Details */}
              <Col lg={6} md={12}>
                <div
                  className="bg-white p-3.5 rounded-3 border shadow-sm h-100 d-flex flex-column"
                  style={{ borderColor: "#E2E8F0" }}
                >
                  <div
                    className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom"
                    style={{ borderColor: "#F1F5F9" }}
                  >
                    <FaMapMarkerAlt size={14} style={{ color: "#D49A00" }} />
                    <span className="fw-bold text-dark" style={{ fontSize: "0.9rem" }}>
                      Address & Regional Details
                    </span>
                  </div>

                  <div className="d-flex flex-column gap-2.5 flex-grow-1">
                    {/* Row 1: Landmark / Address */}
                    <FormGroup className="mb-0">
                      <Label className="fw-semibold text-dark small mb-1">
                        Landmark / Street Address
                      </Label>
                      <Input
                        type="text"
                        placeholder="Building, Street, Landmark, Area..."
                        value={locationForm.landmark}
                        onChange={(e) =>
                          setLocationForm({ ...locationForm, landmark: e.target.value })
                        }
                        className="fw-medium shadow-none"
                        style={{
                          borderRadius: "8px",
                          border: "1.5px solid #CBD5E1",
                          height: "38px",
                          fontSize: "0.88rem",
                        }}
                      />
                    </FormGroup>

                    {/* Row 2: City & Pincode */}
                    <Row className="g-2.5">
                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">
                            City / Town
                          </Label>
                          <Input
                            type="text"
                            placeholder="e.g. Salem / Attur"
                            value={locationForm.city}
                            onChange={(e) =>
                              setLocationForm({ ...locationForm, city: e.target.value })
                            }
                            className="fw-medium shadow-none"
                            style={{
                              borderRadius: "8px",
                              border: "1.5px solid #CBD5E1",
                              height: "38px",
                              fontSize: "0.88rem",
                            }}
                          />
                        </FormGroup>
                      </Col>
                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">
                            Pincode
                          </Label>
                          <Input
                            type="text"
                            maxLength={10}
                            placeholder="6-digit pincode"
                            value={locationForm.zip_code}
                            onChange={(e) =>
                              setLocationForm({ ...locationForm, zip_code: e.target.value })
                            }
                            className="fw-medium shadow-none"
                            style={{
                              borderRadius: "8px",
                              border: "1.5px solid #CBD5E1",
                              height: "38px",
                              fontSize: "0.88rem",
                            }}
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    {/* Row 3: State & Country */}
                    <Row className="g-2.5">
                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">
                            State <span className="text-muted fw-normal" style={{ fontSize: "0.72rem" }}>(Default: Tamil Nadu)</span>
                          </Label>
                          <AdvanceStateSelect
                            value={locationForm.state || "Tamil Nadu"}
                            onChange={(val) =>
                              setLocationForm({ ...locationForm, state: val })
                            }
                          />
                        </FormGroup>
                      </Col>
                      <Col sm={6}>
                        <FormGroup className="mb-0">
                          <Label className="fw-semibold text-dark small mb-1">
                            Country <span className="text-muted fw-normal" style={{ fontSize: "0.72rem" }}>(Default: India)</span>
                          </Label>
                          <AdvanceCountrySelect
                            value="India"
                            onChange={() => {}}
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    {/* Row 4: Quick Note Tip Box */}
                    <div
                      className="p-2.5 rounded d-flex align-items-center gap-2 mt-auto"
                      style={{
                        backgroundColor: "#FEF3C7",
                        border: "1px dashed #FDE68A",
                        fontSize: "0.78rem",
                        color: "#92400E",
                        minHeight: "58px",
                      }}
                    >
                      <span style={{ fontSize: "1.15rem", flexShrink: 0 }}>💡</span>
                      <div>
                        <strong>Quick Note:</strong> Leave Location ID blank to auto-generate sequentially (e.g. LOC-0001). Active branch is pre-selected.
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Modal Footer Actions */}
            <div className="d-flex align-items-center justify-content-end gap-2.5 pt-3 mt-3 border-top" style={{ borderColor: "#E2E8F0" }}>
              <Button
                type="button"
                color="light"
                className="fw-semibold px-4 border"
                style={{
                  borderRadius: "8px",
                  height: "38px",
                  fontSize: "0.88rem",
                  backgroundColor: "#FFFFFF",
                }}
                onClick={() => setLocationModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={locationSaving}
                className="d-flex align-items-center gap-2 fw-bold px-4 shadow-sm"
                style={{
                  background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                  color: "#08090D",
                  fontWeight: "800",
                  border: "none",
                  borderRadius: "8px",
                  height: "38px",
                  fontSize: "0.88rem",
                  boxShadow: "0 2px 8px rgba(212, 154, 0, 0.35)",
                }}
              >
                {locationSaving ? (
                  <>
                    <Spinner size="sm" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FaBuilding size={14} />
                    <span>Save Location</span>
                  </>
                )}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>

      {/* KEYBOARD SHORTCUTS HELP MODAL */}
      <Modal
        isOpen={showShortcutsModal}
        toggle={() => setShowShortcutsModal(false)}
        centered
        size="md"
      >
        <ModalHeader
          toggle={() => setShowShortcutsModal(false)}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setShowShortcutsModal(false)}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 shadow-sm"
              style={{
                width: "34px",
                height: "34px",
                background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                color: "#08090D",
              }}
            >
              <FaKeyboard size={16} />
            </div>
            <div>
              <h5 className="fw-bold mb-0" style={{ color: "#FFD700" }}>Keyboard Shortcuts</h5>
              <small style={{ color: "#E2E8F0", fontSize: "0.8rem", opacity: 0.9 }}>POS Billing Quick Navigation</small>
            </div>
          </div>
        </ModalHeader>
        <ModalBody className="p-0">
          <div className="table-responsive">
            <Table className="mb-0 align-middle" hover>
              <thead style={{ background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)", color: "#FFD700" }}>
                <tr>
                  <th className="ps-4 py-2" style={{ width: "40%" }}>Shortcut</th>
                  <th className="pe-4 py-2">Action / Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="ps-4 py-3">
                    <kbd className="bg-dark text-white px-2 py-1 rounded shadow-sm fw-bold">Ctrl</kbd>
                    <span className="mx-1 text-muted">+</span>
                    <kbd className="bg-dark text-white px-2 py-1 rounded shadow-sm fw-bold">P</kbd>
                  </td>
                  <td className="pe-4 py-3">
                    <div className="fw-bold text-dark">Sale & Print</div>
                    <small className="text-muted">Saves sale and automatically triggers thermal receipt print</small>
                  </td>
                </tr>
                <tr>
                  <td className="ps-4 py-3">
                    <kbd className="bg-dark text-white px-2 py-1 rounded shadow-sm fw-bold">Ctrl</kbd>
                    <span className="mx-1 text-muted">+</span>
                    <kbd className="bg-dark text-white px-2 py-1 rounded shadow-sm fw-bold">Shift</kbd>
                    <span className="mx-1 text-muted">+</span>
                    <kbd className="bg-dark text-white px-2 py-1 rounded shadow-sm fw-bold">P</kbd>
                  </td>
                  <td className="pe-4 py-3">
                    <div className="fw-bold text-dark">Sale Payment</div>
                    <small className="text-muted">Opens payment modal & focuses amount field immediately</small>
                  </td>
                </tr>
                <tr>
                  <td className="ps-4 py-3">
                    <kbd className="bg-secondary text-white px-2 py-1 rounded shadow-sm fw-bold">Enter</kbd>
                  </td>
                  <td className="pe-4 py-3">
                    <div className="fw-bold text-dark">Confirm / Add</div>
                    <small className="text-muted">Confirm payment in modal or select dropdown item</small>
                  </td>
                </tr>
                <tr>
                  <td className="ps-4 py-3">
                    <kbd className="bg-secondary text-white px-2 py-1 rounded shadow-sm fw-bold">Esc</kbd>
                  </td>
                  <td className="pe-4 py-3">
                    <div className="fw-bold text-dark">Close</div>
                    <small className="text-muted">Close any active popup, modal, or dropdown</small>
                  </td>
                </tr>
                <tr>
                  <td className="ps-4 py-3">
                    <kbd className="bg-light text-dark border px-2 py-1 rounded shadow-sm fw-semibold">Tab</kbd>
                  </td>
                  <td className="pe-4 py-3">
                    <div className="fw-bold text-dark">Next Field</div>
                    <small className="text-muted">Move focus forward to the next input or button</small>
                  </td>
                </tr>
                <tr>
                  <td className="ps-4 py-3">
                    <kbd className="bg-light text-dark border px-2 py-1 rounded shadow-sm fw-semibold">Shift</kbd>
                    <span className="mx-1 text-muted">+</span>
                    <kbd className="bg-light text-dark border px-2 py-1 rounded shadow-sm fw-semibold">Tab</kbd>
                  </td>
                  <td className="pe-4 py-3">
                    <div className="fw-bold text-dark">Previous Field</div>
                    <small className="text-muted">Move focus backward to the previous input</small>
                  </td>
                </tr>
              </tbody>
            </Table>
          </div>
          <div className="p-3 bg-light border-top d-flex justify-content-between align-items-center">
            <small className="text-muted">Press <kbd className="bg-white border px-1 rounded text-dark">Esc</kbd> to close</small>
            <Button
              size="sm"
              color="primary"
              className="px-3 fw-bold shadow-sm"
              onClick={() => setShowShortcutsModal(false)}
            >
              Close
            </Button>
          </div>
        </ModalBody>
      </Modal>

      {/* CONFIRM NEW SALE THEMED MODAL */}
      <Modal
        isOpen={showNewSaleModal}
        toggle={() => setShowNewSaleModal(false)}
        centered
        size="md"
        contentClassName="border-0 shadow-lg"
        style={{ maxWidth: "460px" }}
      >
        <ModalHeader
          toggle={() => setShowNewSaleModal(false)}
          className="text-white py-3 px-4"
          close={
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={() => setShowNewSaleModal(false)}
            />
          }
          style={{
            background: "linear-gradient(135deg, #0A0D16 0%, #161C2E 100%)",
            borderBottom: "1px solid rgba(212, 154, 0, 0.35)",
            borderTopLeftRadius: "12px",
            borderTopRightRadius: "12px",
          }}
        >
          <div className="d-flex align-items-center gap-2.5">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 shadow-sm"
              style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
                color: "#08090D",
              }}
            >
              <FaExclamationTriangle size={18} />
            </div>
            <div>
              <h5 className="fw-bold mb-0" style={{ color: "#FFD700", letterSpacing: "0.2px", fontSize: "1.05rem" }}>
                Start New Sale?
              </h5>
              <small style={{ color: "#CBD5E1", fontSize: "0.8rem", opacity: 0.9 }}>
                POS Billing Terminal
              </small>
            </div>
          </div>
        </ModalHeader>
        <ModalBody className="p-4" style={{ backgroundColor: "#F8FAFC" }}>
          <div
            className="p-3 rounded-3 mb-3 d-flex align-items-start gap-3"
            style={{
              backgroundColor: "#FFFBEB",
              border: "1.5px solid rgba(212, 154, 0, 0.35)",
            }}
          >
            <div
              className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
              style={{
                width: "32px",
                height: "32px",
                backgroundColor: "rgba(212, 154, 0, 0.15)",
                color: "#B45309",
              }}
            >
              <FaRedo size={14} />
            </div>
            <div style={{ fontSize: "0.9rem", color: "#78350F", lineHeight: 1.5 }}>
              <div className="fw-bold mb-1" style={{ color: "#92400E" }}>
                Unsaved items will be cleared
              </div>
              Starting a new sale will discard the current draft, including all added products, customer details, and applied discounts.
            </div>
          </div>
          <p className="mb-0 text-center text-muted fw-semibold" style={{ fontSize: "0.88rem" }}>
            Are you sure you want to proceed and start a fresh bill?
          </p>
        </ModalBody>
        <ModalFooter
          className="py-2.5 px-4 d-flex justify-content-end gap-2 border-0"
          style={{
            backgroundColor: "#F1F5F9",
            borderBottomLeftRadius: "12px",
            borderBottomRightRadius: "12px",
            borderTop: "1px solid #E2E8F0",
          }}
        >
          <Button
            color="light"
            className="fw-semibold px-3 py-1.5"
            onClick={() => setShowNewSaleModal(false)}
            style={{
              border: "1.5px solid #CBD5E1",
              borderRadius: "8px",
              color: "#475569",
              fontSize: "0.88rem",
            }}
          >
            Cancel
          </Button>
          <Button
            className="fw-bold px-3 py-1.5 border-0 shadow-sm d-flex align-items-center gap-1.5"
            onClick={() => {
              setShowNewSaleModal(false);
              navigate("/index/salesForm", { replace: true });
              window.location.reload();
            }}
            style={{
              borderRadius: "8px",
              background: "linear-gradient(135deg, #D49A00 0%, #FFD700 100%)",
              color: "#08090D",
              fontSize: "0.88rem",
              boxShadow: "0 2px 6px rgba(212, 154, 0, 0.3)",
            }}
          >
            <FaRedo size={12} />
            <span>Yes, Start New Sale</span>
          </Button>
        </ModalFooter>
      </Modal>

      {/* BILL TO ADD-ON MODAL */}
      <BillToModal
        isOpen={showBillToModal}
        toggle={() => setShowBillToModal((prev) => !prev)}
        billTo={billTo}
        onSave={(saved) => setBillTo(saved)}
        onClear={() => setBillTo(null)}
        selectedCustomer={selectedCustomer}
      />
    </div>
  );
}
