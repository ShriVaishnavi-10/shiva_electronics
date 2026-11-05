import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Search,
  Users,
  Clock,
  Printer,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  X,
  Filter,
  UserCheck
} from 'lucide-react';
import axios from 'axios';
import html2pdf from 'html2pdf.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function HrmsReportsTab({
  employees = [],
  departments = [],
  currentUser = null,
  initialReportType = 'muster',
  onReportTypeChange
}) {
  // Current Date Strings
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().slice(0, 10);
  const firstDayOfMonthStr = `${currentMonthStr}-01`;

  // Selected Report Type: 'muster' | 'attendance' | 'leaves' | 'employees'
  const [reportType, setReportType] = useState(initialReportType || 'muster');

  // Keep in sync with initialReportType from URL / Sidebar
  useEffect(() => {
    if (initialReportType && initialReportType !== reportType) {
      setReportType(initialReportType);
    }
  }, [initialReportType]);

  const handleSelectReportType = (id) => {
    setReportType(id);
    if (onReportTypeChange) onReportTypeChange(id);
  };

  // Filter States
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [fromDate, setFromDate] = useState(firstDayOfMonthStr);
  const [toDate, setToDate] = useState(todayStr);
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Loading & Data States
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Native Picker Refs
  const monthInputRef = useRef(null);
  const fromDateRef = useRef(null);
  const toDateRef = useRef(null);
  const printableReportRef = useRef(null);

  // Fetch Report Data from Backend API
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const params = {
        report_type: reportType
      };

      if (reportType === 'muster') {
        params.month = selectedMonth;
        if (departmentFilter !== 'ALL') params.department = departmentFilter;
      } else if (reportType === 'attendance') {
        params.from_date = fromDate;
        params.to_date = toDate;
        if (departmentFilter !== 'ALL') params.department = departmentFilter;
        if (statusFilter !== 'ALL') params.status = statusFilter;
      } else if (reportType === 'leaves') {
        params.from_date = fromDate;
        params.to_date = toDate;
        if (departmentFilter !== 'ALL') params.department = departmentFilter;
        if (statusFilter !== 'ALL') params.status = statusFilter;
      } else if (reportType === 'employees') {
        if (departmentFilter !== 'ALL') params.department = departmentFilter;
        if (statusFilter !== 'ALL') params.status = statusFilter;
      }

      const res = await axios.get(`${BACKEND_URL}/api/hrms/reports`, { params, headers });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setReportData(res.data.data);
      } else {
        setReportData([]);
      }
      setLastFetchedAt(new Date());
    } catch (err) {
      console.warn('Live report fetch failed, using fallback:', err);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [reportType, selectedMonth, fromDate, toDate, departmentFilter, statusFilter]);

  // Re-fetch report when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReport();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchReport]);

  // Client-side filtering for Search Query (Name, Code, Dept, Notes)
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return reportData;
    const q = searchQuery.trim().toLowerCase();

    return reportData.filter((row) => {
      const name = (row.employee_name || row.name || '').toLowerCase();
      const code = (row.employee_code || '').toLowerCase();
      const dept = (row.department || '').toLowerCase();
      const desig = (row.designation || '').toLowerCase();
      const notes = (row.notes || row.reason || '').toLowerCase();

      return name.includes(q) || code.includes(q) || dept.includes(q) || desig.includes(q) || notes.includes(q);
    });
  }, [reportData, searchQuery]);

  // Derived Summary KPI Stats based on current report type
  const stats = useMemo(() => {
    const count = filteredRows.length;
    if (reportType === 'muster') {
      let totalPresent = 0;
      let totalLate = 0;
      let totalHalfDay = 0;
      let totalLeaves = 0;
      let totalAbsent = 0;

      filteredRows.forEach((r) => {
        totalPresent += Number(r.present_days || 0);
        totalLate += Number(r.late_days || 0);
        totalHalfDay += Number(r.half_days || 0);
        totalLeaves += Number(r.leave_days || 0);
        totalAbsent += Number(r.absent_days || 0);
      });

      return {
        count,
        label1: 'Present Logged',
        val1: totalPresent,
        label2: 'Late Marks',
        val2: totalLate,
        label3: 'Leaves Taken',
        val3: totalLeaves,
        label4: 'Absences',
        val4: totalAbsent
      };
    } else if (reportType === 'attendance') {
      let present = 0;
      let late = 0;
      let onLeave = 0;
      let absent = 0;

      filteredRows.forEach((r) => {
        const s = (r.status || '').toLowerCase();
        if (s === 'present') present++;
        else if (s === 'late') late++;
        else if (s === 'on leave' || s === 'on_leave') onLeave++;
        else if (s === 'absent') absent++;
      });

      return {
        count,
        label1: 'Present',
        val1: present,
        label2: 'Late',
        val2: late,
        label3: 'On Leave',
        val3: onLeave,
        label4: 'Absent',
        val4: absent
      };
    } else if (reportType === 'leaves') {
      let approved = 0;
      let pending = 0;
      let rejected = 0;
      let totalDays = 0;

      filteredRows.forEach((r) => {
        const s = (r.status || '').toLowerCase();
        if (s === 'approved') approved++;
        else if (s === 'pending') pending++;
        else if (s === 'rejected') rejected++;
        totalDays += Number(r.total_days || 0);
      });

      return {
        count,
        label1: 'Approved',
        val1: approved,
        label2: 'Pending',
        val2: pending,
        label3: 'Rejected',
        val3: rejected,
        label4: 'Total Leave Days',
        val4: totalDays
      };
    } else {
      let active = 0;
      let inactive = 0;
      let totalSalary = 0;

      filteredRows.forEach((r) => {
        const s = (r.status || '').toLowerCase();
        if (s === 'active') active++;
        else inactive++;
        totalSalary += Number(r.salary || 0);
      });

      return {
        count,
        label1: 'Active Staff',
        val1: active,
        label2: 'Inactive / Relieved',
        val2: inactive,
        label3: 'Total Monthly Salary',
        val3: `₹${totalSalary.toLocaleString('en-IN')}`,
        label4: 'Avg Salary',
        val4: count ? `₹${Math.round(totalSalary / count).toLocaleString('en-IN')}` : '₹0'
      };
    }
  }, [filteredRows, reportType]);

  // Export Filtered Table Data to CSV
  const handleExportCSV = () => {
    if (filteredRows.length === 0) {
      alert('No report data available to export.');
      return;
    }

    let csvHeaders = [];
    let csvRows = [];

    if (reportType === 'muster') {
      csvHeaders = ['Employee Code', 'Staff Name', 'Department', 'Designation', 'Present Days', 'Late Days', 'Half Days', 'Leaves', 'Absent Days', 'Total Logged Days', 'Salary (₹)', 'Status'];
      csvRows = filteredRows.map((r) => [
        `"${r.employee_code || ''}"`,
        `"${r.employee_name || ''}"`,
        `"${r.department || ''}"`,
        `"${r.designation || ''}"`,
        `"${r.present_days || 0}"`,
        `"${r.late_days || 0}"`,
        `"${r.half_days || 0}"`,
        `"${r.leave_days || 0}"`,
        `"${r.absent_days || 0}"`,
        `"${r.total_logged_days || 0}"`,
        `"${r.salary ? Number(r.salary).toLocaleString('en-IN') : '0'}"`,
        `"${r.employee_status || 'Active'}"`
      ]);
    } else if (reportType === 'attendance') {
      csvHeaders = ['Date', 'Employee Code', 'Staff Name', 'Department', 'Designation', 'Check In', 'Check Out', 'Working Hours', 'Status', 'Notes'];
      csvRows = filteredRows.map((r) => {
        const rawDate = r.attendance_date ? String(r.attendance_date).slice(0, 10) : '';
        const inTime = r.check_in ? String(r.check_in).slice(0, 5) : '--:--';
        const outTime = r.check_out ? String(r.check_out).slice(0, 5) : '--:--';
        const hours = calculateHours(r.check_in, r.check_out);
        return [
          `"${rawDate}"`,
          `"${r.employee_code || ''}"`,
          `"${r.employee_name || ''}"`,
          `"${r.department || ''}"`,
          `"${r.designation || ''}"`,
          `"${inTime}"`,
          `"${outTime}"`,
          `"${hours}"`,
          `"${r.status || 'Present'}"`,
          `"${(r.notes || '').replace(/"/g, '""')}"`
        ];
      });
    } else if (reportType === 'leaves') {
      csvHeaders = ['Employee Code', 'Staff Name', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Total Days', 'Status', 'Reason', 'Approved By'];
      csvRows = filteredRows.map((r) => [
        `"${r.employee_code || ''}"`,
        `"${r.employee_name || ''}"`,
        `"${r.department || ''}"`,
        `"${r.leave_type || 'Casual'}"`,
        `"${r.start_date ? String(r.start_date).slice(0, 10) : ''}"`,
        `"${r.end_date ? String(r.end_date).slice(0, 10) : ''}"`,
        `"${r.total_days || 1}"`,
        `"${r.status || 'Pending'}"`,
        `"${(r.reason || '').replace(/"/g, '""')}"`,
        `"${r.approved_by || 'Admin'}"`
      ]);
    } else {
      csvHeaders = ['Employee Code', 'Staff Name', 'Department', 'Designation', 'Phone', 'Email', 'Joining Date', 'Employment Type', 'Monthly Salary (₹)', 'Status'];
      csvRows = filteredRows.map((r) => [
        `"${r.employee_code || ''}"`,
        `"${r.employee_name || ''}"`,
        `"${r.department || ''}"`,
        `"${r.designation || ''}"`,
        `"${r.phone || ''}"`,
        `"${r.email || ''}"`,
        `"${r.joining_date ? String(r.joining_date).slice(0, 10) : ''}"`,
        `"${r.employment_type || 'Full-Time'}"`,
        `"${r.salary ? Number(r.salary).toLocaleString('en-IN') : '0'}"`,
        `"${r.status || 'Active'}"`
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [csvHeaders.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStamp = reportType === 'muster' ? selectedMonth : `${fromDate}_to_${toDate}`;
    link.setAttribute('download', `HRMS_${reportType.toUpperCase()}_REPORT_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    if (filteredRows.length === 0) {
      alert('No report data available to export.');
      return;
    }

    if (!printableReportRef.current) {
      alert('The report is not ready to export. Please try again.');
      return;
    }

    const dateStamp = reportType === 'muster' ? selectedMonth : `${fromDate}_to_${toDate}`;
    const exportElement = printableReportRef.current.cloneNode(true);
    exportElement.style.position = 'fixed';
    exportElement.style.left = '-10000px';
    exportElement.style.top = '0';
    exportElement.style.width = 'max-content';
    exportElement.style.minWidth = '297mm';
    exportElement.style.overflow = 'visible';
    exportElement.querySelectorAll('div').forEach((element) => {
      if (element.style.overflowX === 'auto') {
        element.style.overflowX = 'visible';
        element.style.width = 'max-content';
      }
    });
    document.body.appendChild(exportElement);

    setExportingPDF(true);
    try {
      await html2pdf()
        .set({
          margin: 8,
          filename: `HRMS_${reportType.toUpperCase()}_REPORT_${dateStamp}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak: { mode: ['css', 'legacy'] }
        })
        .from(exportElement)
        .save();
    } catch (error) {
      console.error('PDF report export failed:', error);
      alert('Failed to export the report as PDF. Please try again.');
    } finally {
      exportElement.remove();
      setExportingPDF(false);
    }
  };

  // Helper: Format Time Duration
  function calculateHours(checkIn, checkOut) {
    if (!checkIn) return '—';
    if (!checkOut) return 'In Progress';
    const parseMinutes = (t) => {
      const parts = String(t).split(':');
      return parseInt(parts[0] || 0, 10) * 60 + parseInt(parts[1] || 0, 10);
    };
    const diff = parseMinutes(checkOut) - parseMinutes(checkIn);
    if (diff <= 0) return '0h 00m';
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hrs}h ${mins < 10 ? '0' : ''}${mins}m`;
  }

  // Print Report Document
  const handlePrint = () => {
    window.print();
  };

  // Helper: Render Status Badge
  const renderBadge = (status) => {
    const s = String(status || '').toLowerCase().replace(/_/g, ' ');
    let bg = '#f1f5f9';
    let color = '#475569';
    let border = '#cbd5e1';

    if (s === 'present' || s === 'approved' || s === 'active') {
      bg = '#ecfdf5';
      color = '#065f46';
      border = '#a7f3d0';
    } else if (s === 'late' || s === 'pending') {
      bg = '#fffbeb';
      color = '#92400e';
      border = '#fde68a';
    } else if (s === 'absent' || s === 'rejected' || s === 'inactive' || s === 'relieved') {
      bg = '#fef2f2';
      color = '#991b1b';
      border = '#fecaca';
    } else if (s === 'half day') {
      bg = '#faf5ff';
      color = '#6b21a8';
      border = '#e9d5ff';
    } else if (s === 'on leave') {
      bg = '#eff6ff';
      color = '#1e40af';
      border = '#bfdbfe';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 9px',
          borderRadius: '9999px',
          fontSize: '12.5px',
          fontWeight: 600,
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
          whiteSpace: 'nowrap'
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#0f172a' }}>
      {/* Print CSS Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-area, #printable-report-area * {
            visibility: visible;
          }
          #printable-report-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* 1. TOP HEADER & ACTION CONTROLS */}
      <div
        className="no-print"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '18px 22px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileSpreadsheet style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                HRMS Reports &amp; Registers
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0 0' }}>
                Generate official monthly muster rolls, daily attendance registers, and leave audits.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={exportingPDF}
            style={{
              backgroundColor: '#ffffff',
              color: '#b91c1c',
              border: '1.5px solid #ef4444',
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: exportingPDF ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              opacity: exportingPDF ? 0.65 : 1
            }}
          >
            <FileText style={{ width: 16, height: 16 }} /> {exportingPDF ? 'Exporting PDF...' : 'Export PDF'}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              backgroundColor: '#ffffff',
              color: '#065f46',
              border: '1.5px solid #10b981',
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 2px rgba(16, 185, 129, 0.1)',
              transition: 'all 0.15s ease'
            }}
          >
            <Download style={{ width: 16, height: 16 }} /> Export CSV
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              backgroundColor: '#ffffff',
              color: '#1e40af',
              border: '1.5px solid #3b82f6',
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 2px rgba(59, 130, 246, 0.1)',
              transition: 'all 0.15s ease'
            }}
          >
            <Printer style={{ width: 16, height: 16 }} /> Print / PDF
          </button>

          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            title="Refresh Report Data"
            style={{
              backgroundColor: '#ffffff',
              color: '#475569',
              border: '1.5px solid #cbd5e1',
              borderRadius: '8px',
              padding: '9px 12px',
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              opacity: loading ? 0.6 : 1
            }}
          >
            <RefreshCw style={{ width: 16, height: 16 }} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. REPORT TYPE SELECTION CARDS (BRIGHT & CLEAN) */}
      <div
        className="no-print"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '14px'
        }}
      >
        {[
          {
            id: 'muster',
            title: 'Monthly Attendance Summary',
            subtitle: 'Staff monthly count of Present, Late, Half-Days & Absences',
            icon: Calendar,
            color: '#10b981',
            bg: '#ecfdf5'
          },
          {
            id: 'attendance',
            title: 'Daily Attendance Register',
            subtitle: 'Date-wise punch logs with in/out times & working hours',
            icon: Clock,
            color: '#3b82f6',
            bg: '#eff6ff'
          },
          {
            id: 'leaves',
            title: 'Leave Audit Report',
            subtitle: 'Audit log of staff leave requests, types & approval status',
            icon: CheckCircle2,
            color: '#f59e0b',
            bg: '#fffbeb'
          },
          {
            id: 'employees',
            title: 'Staff Master Directory',
            subtitle: 'Official roster with designation, department, contact & pay',
            icon: Users,
            color: '#8b5cf6',
            bg: '#f5f3ff'
          }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = reportType === item.id;
          return (
            <div
              key={item.id}
              onClick={() => handleSelectReportType(item.id)}
              style={{
                backgroundColor: '#ffffff',
                border: isActive ? `2px solid ${item.color}` : '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '8px',
                    backgroundColor: item.bg,
                    color: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Icon style={{ width: 18, height: 18 }} />
                </div>
                {isActive && (
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: item.color,
                      backgroundColor: item.bg,
                      padding: '2px 8px',
                      borderRadius: '9999px'
                    }}
                  >
                    Active Report
                  </span>
                )}
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '2px 0', color: '#0f172a' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, lineHeight: 1.35 }}>
                  {item.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. FILTER TOOLBAR & DATE PICKERS */}
      <div
        className="no-print"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            alignItems: 'flex-end'
          }}
        >
          {/* MONTH PICKER (FOR MUSTER ROLL) */}
          {reportType === 'muster' && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                <Calendar style={{ width: 14, height: 14, color: '#059669' }} /> Report Month
              </label>
              <input
                ref={monthInputRef}
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                onClick={(e) => {
                  try {
                    if (typeof e.target.showPicker === 'function') e.target.showPicker();
                  } catch (err) {}
                }}
                title="Click to open Month picker"
                style={{
                  width: '100%',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* DATE RANGE (FOR ATTENDANCE & LEAVES) */}
          {(reportType === 'attendance' || reportType === 'leaves') && (
            <>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  <Calendar style={{ width: 14, height: 14, color: '#059669' }} /> From Date
                </label>
                <input
                  ref={fromDateRef}
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      if (typeof e.target.showPicker === 'function') e.target.showPicker();
                    } catch (err) {}
                  }}
                  title="Click to open Date picker"
                  style={{
                    width: '100%',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  <Calendar style={{ width: 14, height: 14, color: '#059669' }} /> To Date
                </label>
                <input
                  ref={toDateRef}
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      if (typeof e.target.showPicker === 'function') e.target.showPicker();
                    } catch (err) {}
                  }}
                  title="Click to open Date picker"
                  style={{
                    width: '100%',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </>
          )}

          {/* DEPARTMENT FILTER */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
              Department
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '13.5px',
                fontWeight: 500,
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* STATUS FILTER (FOR ATTENDANCE, LEAVES, EMPLOYEES) */}
          {reportType !== 'muster' && (
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Statuses</option>
                {reportType === 'attendance' && (
                  <>
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Half Day">Half Day</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Absent">Absent</option>
                  </>
                )}
                {reportType === 'leaves' && (
                  <>
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                  </>
                )}
                {reportType === 'employees' && (
                  <>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Relieved">Relieved</option>
                  </>
                )}
              </select>
            </div>
          )}

          {/* SEARCH STAFF INPUT */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
              Search Staff
            </label>
            <div style={{ position: 'relative' }}>
              <Search style={{ width: 15, height: 15, color: '#94a3b8', position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search staff, code, dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: searchQuery ? '9px 30px 9px 34px' : '9px 12px 9px 34px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4
                  }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ACTIVE FILTERS STRIP & RESET */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
            <span style={{ fontWeight: 600 }}>Active Scope:</span>
            <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, color: '#334155' }}>
              {reportType === 'muster' ? `Month: ${selectedMonth}` : `${fromDate} to ${toDate}`}
            </span>
            {departmentFilter !== 'ALL' && (
              <span style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                Dept: {departmentFilter}
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                Status: {statusFilter}
              </span>
            )}
            {searchQuery.trim() && (
              <span style={{ backgroundColor: '#fffbeb', color: '#92400e', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                Filter: &quot;{searchQuery}&quot;
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedMonth(currentMonthStr);
              setFromDate(firstDayOfMonthStr);
              setToDate(todayStr);
              setDepartmentFilter('ALL');
              setStatusFilter('ALL');
              setSearchQuery('');
            }}
            style={{
              backgroundColor: '#ffffff',
              color: '#dc2626',
              border: '1px solid #fecaca',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RotateCcw style={{ width: 13, height: 13 }} /> Reset Filters
          </button>
        </div>
      </div>

      {/* 4. SUMMARY KPI CHIPS */}
      <div
        className="no-print"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px'
        }}
      >
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 16px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b' }}>Matching Records</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            {stats.count}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#166534' }}>{stats.label1}</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
            {stats.val1}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px 16px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#9a3412' }}>{stats.label2}</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#c2410c', marginTop: '4px' }}>
            {stats.val2}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 16px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e40af' }}>{stats.label3}</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>
            {stats.val3}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#991b1b' }}>{stats.label4}</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>
            {stats.val4}
          </div>
        </div>
      </div>

      {/* 5. PRINTABLE REPORT CARD & DATA TABLE (BRIGHT & CRISP) */}
      <div
        id="printable-report-area"
        ref={printableReportRef}
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}
      >
        {/* Printable Official Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1.5px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', color: '#059669', textTransform: 'uppercase' }}>
              SIVA ELECTRONICS • HRMS AUDIT REPORT
            </span>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '2px 0 0 0', color: '#0f172a' }}>
              {reportType === 'muster' && `Monthly Attendance Summary — ${selectedMonth}`}
              {reportType === 'attendance' && `Daily Attendance Register (${fromDate} to ${toDate})`}
              {reportType === 'leaves' && `Staff Leave Audit Register (${fromDate} to ${toDate})`}
              {reportType === 'employees' && 'Staff Master Directory & Payroll Roster'}
            </h3>
          </div>
          <div style={{ fontSize: '12.5px', color: '#64748b', textAlign: 'right' }}>
            <div>Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>Total Records: {filteredRows.length}</div>
          </div>
        </div>

        {/* Table Container */}
        <div style={{ overflowX: 'auto', width: '100%', minHeight: '260px' }}>
          <table
            style={{
              minWidth: '100%',
              width: 'max-content',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '13.5px',
              color: '#1e293b',
              whiteSpace: 'nowrap'
            }}
          >
            {/* 1. MUSTER ROLL COLUMNS */}
            {reportType === 'muster' && (
              <>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1', color: '#475569', fontSize: '12.5px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 14px' }}>Staff Code</th>
                    <th style={{ padding: '12px 14px' }}>Employee Name</th>
                    <th style={{ padding: '12px 14px' }}>Department</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Present</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Late</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Half Day</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Leaves</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Absent</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Total Logged</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Base Pay</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                        No staff records found for the selected month and filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>{r.employee_code || `#${r.employee_id}`}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>{r.employee_name || 'Staff'}</td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>{r.department || 'General'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{r.present_days || 0}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#ea580c' }}>{r.late_days || 0}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#7c3aed' }}>{r.half_days || 0}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>{r.leave_days || 0}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>{r.absent_days || 0}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>{r.total_logged_days || 0}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                          ₹{r.salary ? Number(r.salary).toLocaleString('en-IN') : '0'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {renderBadge(r.employee_status || 'Active')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}

            {/* 2. DAILY ATTENDANCE COLUMNS */}
            {reportType === 'attendance' && (
              <>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1', color: '#475569', fontSize: '12.5px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 14px' }}>Date</th>
                    <th style={{ padding: '12px 14px' }}>Staff Code</th>
                    <th style={{ padding: '12px 14px' }}>Employee Name</th>
                    <th style={{ padding: '12px 14px' }}>Department</th>
                    <th style={{ padding: '12px 14px' }}>Check In</th>
                    <th style={{ padding: '12px 14px' }}>Check Out</th>
                    <th style={{ padding: '12px 14px' }}>Duration</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px 14px' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                        No attendance records found for the selected date range.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, idx) => {
                      const cleanDate = r.attendance_date ? String(r.attendance_date).slice(0, 10) : '';
                      const inTime = r.check_in ? String(r.check_in).slice(0, 5) : '--:--';
                      const outTime = r.check_out ? String(r.check_out).slice(0, 5) : '--:--';
                      const hours = calculateHours(r.check_in, r.check_out);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 600 }}>{cleanDate}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>{r.employee_code || '-'}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 600 }}>{r.employee_name || 'Staff'}</td>
                          <td style={{ padding: '12px 14px', color: '#475569' }}>{r.department || 'General'}</td>
                          <td style={{ padding: '12px 14px', color: '#047857', fontWeight: 600 }}>{inTime}</td>
                          <td style={{ padding: '12px 14px', color: '#b91c1c', fontWeight: 600 }}>{outTime}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#334155' }}>{hours}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            {renderBadge(r.status || 'Present')}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#64748b' }}>{r.notes || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </>
            )}

            {/* 3. LEAVE REGISTER COLUMNS */}
            {reportType === 'leaves' && (
              <>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1', color: '#475569', fontSize: '12.5px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 14px' }}>Staff Code</th>
                    <th style={{ padding: '12px 14px' }}>Employee Name</th>
                    <th style={{ padding: '12px 14px' }}>Department</th>
                    <th style={{ padding: '12px 14px' }}>Leave Type</th>
                    <th style={{ padding: '12px 14px' }}>Start Date</th>
                    <th style={{ padding: '12px 14px' }}>End Date</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Days</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px 14px' }}>Reason</th>
                    <th style={{ padding: '12px 14px' }}>Approved By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                        No leave records found for the selected scope.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{r.employee_code || '-'}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>{r.employee_name || 'Staff'}</td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>{r.department || 'General'}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#334155' }}>{r.leave_type || 'Casual'}</td>
                        <td style={{ padding: '12px 14px' }}>{r.start_date ? String(r.start_date).slice(0, 10) : ''}</td>
                        <td style={{ padding: '12px 14px' }}>{r.end_date ? String(r.end_date).slice(0, 10) : ''}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>{r.total_days || 1}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {renderBadge(r.status || 'Pending')}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>{r.reason || '—'}</td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>{r.approved_by || 'Admin'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}

            {/* 4. STAFF MASTER DIRECTORY COLUMNS */}
            {reportType === 'employees' && (
              <>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1', color: '#475569', fontSize: '12.5px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 14px' }}>Staff Code</th>
                    <th style={{ padding: '12px 14px' }}>Employee Name</th>
                    <th style={{ padding: '12px 14px' }}>Department</th>
                    <th style={{ padding: '12px 14px' }}>Designation</th>
                    <th style={{ padding: '12px 14px' }}>Phone</th>
                    <th style={{ padding: '12px 14px' }}>Joining Date</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Monthly Salary</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                        No staff matching the selected department/status.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>{r.employee_code || `#${r.id}`}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>{r.employee_name || 'Staff'}</td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>{r.department || 'General'}</td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>{r.designation || 'Staff'}</td>
                        <td style={{ padding: '12px 14px', color: '#334155' }}>{r.phone || '—'}</td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>{r.joining_date ? String(r.joining_date).slice(0, 10) : '—'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                          ₹{r.salary ? Number(r.salary).toLocaleString('en-IN') : '0'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {renderBadge(r.status || 'Active')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
