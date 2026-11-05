import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Clock,
  Calendar,
  UserCheck,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Edit2,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  RotateCcw,
  X
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function HrmsAttendanceTab({
  employees = [],
  attendanceData = [],
  onRefresh,
  departments = [],
  currentUser = null
}) {
  // Filter mode: 'day' | 'range' | 'month' | 'all'
  const [filterMode, setFilterMode] = useState('day');

  // Date filters
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const firstDayOfMonthStr = useMemo(() => `${new Date().toISOString().slice(0, 7)}-01`, []);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [fromDate, setFromDate] = useState(firstDayOfMonthStr);
  const [toDate, setToDate] = useState(todayStr);

  // Time filters (Check-in window filter)
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');

  // Default HTML5 Date & Time Picker states (YYYY-MM-DDTHH:MM)
  const [selectedDateTime, setSelectedDateTime] = useState(`${todayStr}T09:30`);
  const [fromDateTime, setFromDateTime] = useState(`${firstDayOfMonthStr}T09:00`);
  const [toDateTime, setToDateTime] = useState(`${todayStr}T21:00`);

  // DOM Refs to trigger native graphical picker on click (no manual keyboard typing required)
  const fromDateTimeRef = useRef(null);
  const toDateTimeRef = useRef(null);
  const datePickerRef = useRef(null);
  const fromTimePickerRef = useRef(null);
  const toTimePickerRef = useRef(null);
  const monthPickerRef = useRef(null);

  const triggerPicker = (ref) => {
    try {
      if (ref && ref.current) {
        if (typeof ref.current.showPicker === 'function') {
          ref.current.showPicker();
        } else {
          ref.current.focus();
        }
      }
    } catch (err) {
      // Browser fallback
    }
  };

  // Employee, Status, and Search filters
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Local state for fetched logs & loading
  const [localAttendance, setLocalAttendance] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'

  // Punch modal form
  const [punchForm, setPunchForm] = useState({
    id: null,
    employee_id: '',
    employee_name: '',
    employee_code: '',
    department: '',
    date: todayStr,
    check_in: '09:30',
    check_out: '19:30',
    status: 'Present',
    notes: ''
  });

  // Fetch Attendance with Active Filters
  const fetchAttendanceLogs = useCallback(async (customSearch) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = {};

      const activeSearch = typeof customSearch === 'string' ? customSearch : searchQuery;
      if (activeSearch && activeSearch.trim()) {
        params.search = activeSearch.trim();
      }

      if (filterMode === 'datetime' || filterMode === 'range') {
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;
        if (fromTime) params.from_time = fromTime;
        if (toTime) params.to_time = toTime;
      } else if (filterMode === 'day') {
        if (!activeSearch || !activeSearch.trim()) {
          if (selectedDate) params.date = selectedDate;
        }
        if (fromTime) params.from_time = fromTime;
        if (toTime) params.to_time = toTime;
      } else if (filterMode === 'month' && selectedMonth) {
        params.month = selectedMonth;
        if (fromTime) params.from_time = fromTime;
        if (toTime) params.to_time = toTime;
      }

      if (fromTime) params.from_time = fromTime;
      if (toTime) params.to_time = toTime;

      if (selectedEmployeeId && selectedEmployeeId !== 'ALL') {
        params.employee_id = selectedEmployeeId;
      }

      if (statusFilter && statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const res = await axios.get(`${BACKEND_URL}/api/hrms/attendance`, {
        params,
        headers
      });

      if (res.data?.success && Array.isArray(res.data.data)) {
        setLocalAttendance(res.data.data);
      } else if (Array.isArray(attendanceData)) {
        setLocalAttendance(attendanceData);
      }
    } catch (err) {
      console.warn('Live attendance fetch failed, falling back to props:', err);
      if (Array.isArray(attendanceData)) {
        setLocalAttendance(attendanceData);
      }
    } finally {
      setLoading(false);
    }
  }, [filterMode, selectedDate, selectedMonth, fromDate, toDate, fromTime, toTime, selectedEmployeeId, statusFilter, searchQuery, attendanceData]);

  // Initial load and debounced filter/search change trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAttendanceLogs();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchAttendanceLogs]);

  // Combined client-side filtering for Dates, Time, Employee, Status, and Search
  const displayedAttendance = useMemo(() => {
    const list = localAttendance !== null ? localAttendance : (Array.isArray(attendanceData) ? attendanceData : []);
    const q = searchQuery.trim().toLowerCase();

    return list.filter((att) => {
      // Clean date (YYYY-MM-DD)
      const rawDate = att.date || att.attendance_date || '';
      const cleanDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

      // 1. DATE / RANGE / MONTH / DATETIME FILTER
      // When searching by staff, do not restrict to today's single date unless in range/month mode
      if (!q) {
        if (filterMode === 'datetime' || filterMode === 'range') {
          if (fromDate && toDate) {
            const start = fromDate <= toDate ? fromDate : toDate;
            const end = fromDate <= toDate ? toDate : fromDate;
            if (cleanDate < start || cleanDate > end) return false;
          } else if (fromDate) {
            if (cleanDate < fromDate) return false;
          } else if (toDate) {
            if (cleanDate > toDate) return false;
          }
        } else if (filterMode === 'day') {
          if (selectedDate && cleanDate !== selectedDate) return false;
        } else if (filterMode === 'month') {
          if (selectedMonth && !cleanDate.startsWith(selectedMonth)) return false;
        }
      } else {
        if (filterMode === 'range') {
          if (fromDate && toDate) {
            const start = fromDate <= toDate ? fromDate : toDate;
            const end = fromDate <= toDate ? toDate : fromDate;
            if (cleanDate < start || cleanDate > end) return false;
          }
        } else if (filterMode === 'month') {
          if (selectedMonth && !cleanDate.startsWith(selectedMonth)) return false;
        }
      }

      // 2. TIME FILTER (Check-In window)
      if (fromTime || toTime) {
        const checkIn = att.check_in ? String(att.check_in).slice(0, 5) : '';
        if (!checkIn) return false;
        if (fromTime && checkIn < fromTime) return false;
        if (toTime && checkIn > toTime) return false;
      }

      // 3. EMPLOYEE FILTER
      if (selectedEmployeeId !== 'ALL' && String(att.employee_id) !== String(selectedEmployeeId)) {
        return false;
      }

      // 4. STATUS FILTER
      if (statusFilter !== 'ALL') {
        const attStatus = (att.status || '').toLowerCase().replace(/_/g, ' ');
        const targetStatus = statusFilter.toLowerCase().replace(/_/g, ' ');
        if (attStatus !== targetStatus) return false;
      }

      // 5. SEARCH FILTER (matches employee name, employee code, department, designation, or notes)
      if (q) {
        const emp = employees.find((e) => String(e.id) === String(att.employee_id)) || {};
        const empName = att.employee_name || emp.name || '';
        const empCode = att.employee_code || emp.employee_code || '';
        const empDept = att.department || emp.department || '';
        const empDesig = att.designation || emp.designation || '';
        const notes = att.notes || att.remarks || '';
        if (
          !empName.toLowerCase().includes(q) &&
          !empCode.toLowerCase().includes(q) &&
          !empDept.toLowerCase().includes(q) &&
          !empDesig.toLowerCase().includes(q) &&
          !notes.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [localAttendance, attendanceData, filterMode, selectedDate, selectedMonth, fromDate, toDate, fromTime, toTime, selectedEmployeeId, statusFilter, searchQuery, employees]);

  // Quick Stats derived from displayed attendance
  const stats = useMemo(() => {
    let present = 0;
    let late = 0;
    let halfDay = 0;
    let onLeave = 0;
    let absent = 0;

    displayedAttendance.forEach((att) => {
      const s = (att.status || '').toLowerCase();
      if (s === 'present') present++;
      else if (s === 'late') late++;
      else if (s === 'half day' || s === 'half_day') halfDay++;
      else if (s === 'on leave' || s === 'on_leave') onLeave++;
      else if (s === 'absent') absent++;
    });

    return {
      total: displayedAttendance.length,
      present,
      late,
      halfDay,
      onLeave,
      absent
    };
  }, [displayedAttendance]);

  // Quick Preset Handlers
  const handleSetToday = () => {
    setFilterMode('day');
    setSelectedDate(todayStr);
    setSelectedDateTime(`${todayStr}T09:30`);
  };

  const handleSetYesterday = () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = y.toISOString().slice(0, 10);
    setFilterMode('day');
    setSelectedDate(yStr);
    setSelectedDateTime(`${yStr}T09:30`);
  };

  const handleSetThisMonth = () => {
    setFilterMode('month');
    setSelectedMonth(currentMonthStr);
  };

  const handleSetLast7Days = () => {
    setFilterMode('range');
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const sStr = start.toISOString().slice(0, 10);
    const eStr = end.toISOString().slice(0, 10);
    setFromDateTime(`${sStr}T09:00`);
    setToDateTime(`${eStr}T21:00`);
    setFromDate(sStr);
    setToDate(eStr);
    setFromTime('09:00');
    setToTime('21:00');
  };
  const handleSetDateTimeLast7Days = handleSetLast7Days;

  const handleSetLast30Days = () => {
    setFilterMode('range');
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 29);
    const sStr = start.toISOString().slice(0, 10);
    const eStr = end.toISOString().slice(0, 10);
    setFromDateTime(`${sStr}T09:00`);
    setToDateTime(`${eStr}T21:00`);
    setFromDate(sStr);
    setToDate(eStr);
    setFromTime('09:00');
    setToTime('21:00');
  };
  const handleSetDateTimeLast30Days = handleSetLast30Days;
  const handleSetDateTimeToday = handleSetToday;
  const handleSetDateTimeYesterday = handleSetYesterday;
  const handleSetDateTimeThisMonth = handleSetThisMonth;

  const handleSelectedDateTimeChange = (val) => {
    setSelectedDateTime(val);
    if (val && val.includes('T')) {
      const [d, t] = val.split('T');
      setSelectedDate(d);
      setFromTime(t || '');
    } else if (val) {
      setSelectedDate(val);
      setFromTime('');
    } else {
      setSelectedDate(todayStr);
      setFromTime('');
    }
  };

  const handleFromDateTimeChange = (val) => {
    setFromDateTime(val);
    if (val && val.includes('T')) {
      const [d, t] = val.split('T');
      setFromDate(d);
      setFromTime(t);
    } else if (val) {
      setFromDate(val);
      setFromTime('');
    } else {
      setFromDate('');
      setFromTime('');
    }
  };

  const handleToDateTimeChange = (val) => {
    setToDateTime(val);
    if (val && val.includes('T')) {
      const [d, t] = val.split('T');
      setToDate(d);
      setToTime(t);
    } else if (val) {
      setToDate(val);
      setToTime('');
    } else {
      setToDate('');
      setToTime('');
    }
  };

  const handleResetFilters = () => {
    setFilterMode('day');
    setSelectedDate(todayStr);
    setSelectedDateTime(`${todayStr}T09:30`);
    setSelectedMonth(currentMonthStr);
    setFromDate(firstDayOfMonthStr);
    setToDate(todayStr);
    setFromDateTime(`${firstDayOfMonthStr}T09:00`);
    setToDateTime(`${todayStr}T21:00`);
    setFromTime('');
    setToTime('');
    setSelectedEmployeeId('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
  };

  const handleClearTime = () => {
    setFromTime('');
    setToTime('');
  };

  const handleSetMorningShift = () => {
    setFromTime('09:00');
    setToTime('13:00');
  };

  const handleSetGeneralShift = () => {
    setFromTime('09:30');
    setToTime('18:30');
  };

  const handleSetEveningShift = () => {
    setFromTime('13:00');
    setToTime('21:00');
  };

  const handleSetLateArrivals = () => {
    setFromTime('10:00');
    setToTime('23:59');
  };

  // Open Modal for Add or Edit
  const handleOpenAddModal = (empId = '') => {
    setModalMode('create');
    const emp = employees.find((e) => String(e.id) === String(empId)) || employees[0] || {};
    setPunchForm({
      id: null,
      employee_id: empId || (emp.id ? String(emp.id) : ''),
      employee_name: emp.name || '',
      employee_code: emp.employee_code || '',
      department: emp.department || '',
      date: filterMode === 'day' ? selectedDate : todayStr,
      check_in: '09:30',
      check_out: '19:30',
      status: 'Present',
      notes: ''
    });
    setIsPunchModalOpen(true);
  };

  const handleOpenEditModal = (att) => {
    setModalMode('edit');
    const emp = employees.find((e) => String(e.id) === String(att.employee_id)) || {};
    const attDate = att.date || att.attendance_date || todayStr;
    const cleanDate = attDate.includes('T') ? attDate.split('T')[0] : attDate;

    setPunchForm({
      id: att.id || null,
      employee_id: String(att.employee_id),
      employee_name: att.employee_name || emp.name || 'Staff Member',
      employee_code: att.employee_code || emp.employee_code || '',
      department: att.department || emp.department || '',
      date: cleanDate,
      check_in: att.check_in ? String(att.check_in).slice(0, 5) : '09:30',
      check_out: att.check_out ? String(att.check_out).slice(0, 5) : '',
      status: att.status || 'Present',
      notes: att.notes || att.remarks || ''
    });
    setIsPunchModalOpen(true);
  };

  // Save Attendance Form
  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    if (!punchForm.employee_id) {
      alert('Please select an employee');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (modalMode === 'edit' && punchForm.id) {
        await axios.put(`${BACKEND_URL}/api/hrms/attendance/${punchForm.id}`, punchForm, { headers });
      } else {
        await axios.post(`${BACKEND_URL}/api/hrms/attendance`, punchForm, { headers });
      }

      setIsPunchModalOpen(false);
      await fetchAttendanceLogs();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Attendance save error:', err);
      alert(err.response?.data?.message || 'Failed to save attendance record');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Filtered Table to CSV
  const handleExportCSV = () => {
    if (displayedAttendance.length === 0) {
      alert('No attendance data available to export.');
      return;
    }

    const headers = ['Employee Code', 'Employee Name', 'Department', 'Date', 'Day', 'Check In', 'Check Out', 'Working Hours', 'Status', 'Notes'];
    const rows = displayedAttendance.map((att) => {
      const emp = employees.find((e) => String(e.id) === String(att.employee_id)) || {};
      const dateVal = att.date || att.attendance_date || '';
      const dayName = dateVal ? new Date(dateVal).toLocaleDateString('en-IN', { weekday: 'short' }) : '';
      const hours = calculateHours(att.check_in, att.check_out);

      return [
        `"${att.employee_code || emp.employee_code || ''}"`,
        `"${att.employee_name || emp.name || ''}"`,
        `"${att.department || emp.department || ''}"`,
        `"${dateVal}"`,
        `"${dayName}"`,
        `"${att.check_in ? String(att.check_in).slice(0, 5) : '--:--'}"`,
        `"${att.check_out ? String(att.check_out).slice(0, 5) : '--:--'}"`,
        `"${hours}"`,
        `"${att.status || 'Not Marked'}"`,
        `"${(att.notes || att.remarks || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hrms_attendance_${filterMode}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Helper: Format Time in 12-hour AM/PM format
  const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return '--:--';
    const clean = String(timeStr).slice(0, 5);
    const [hStr, mStr] = clean.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return clean;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Helper: Format Date String
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Helper: Get Day Name
  const formatDayName = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-IN', { weekday: 'short' });
    } catch {
      return '';
    }
  };

  // Status Badge Component (Strictly single-line, comfortable font size)
  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase().replace(/_/g, ' ');
    switch (s) {
      case 'present':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
            Present
          </span>
        );
      case 'late':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#faf5ff',
              color: '#6b21a8',
              border: '1px solid #e9d5ff',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#9333ea' }} />
            Late
          </span>
        );
      case 'half day':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#fffbeb',
              color: '#92400e',
              border: '1px solid #fde68a',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            Half Day
          </span>
        );
      case 'on leave':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#eff6ff',
              color: '#1e40af',
              border: '1px solid #bfdbfe',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3b82f6' }} />
            On Leave
          </span>
        );
      case 'absent':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            Absent
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              whiteSpace: 'nowrap'
            }}
          >
            {status || 'Not Marked'}
          </span>
        );
    }
  };

  return (
    <div className="hrms-scope" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* 1. TOP HEADER & SUMMARY METRICS */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '18px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Clock style={{ width: 24, height: 24, color: '#d97706' }} />
            Attendance Management
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: '4px 0 0 0' }}>
            Daily attendance register, shift punch logs, and comprehensive employee tracking
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus style={{ width: 17, height: 17 }} /> Record Attendance
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            title="Download CSV"
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease'
            }}
          >
            <FileSpreadsheet style={{ width: 17, height: 17, color: '#059669' }} /> Export CSV
          </button>

          <button
            type="button"
            onClick={fetchAttendanceLogs}
            disabled={loading}
            title="Refresh Attendance Logs"
            style={{
              backgroundColor: '#ffffff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw style={{ width: 17, height: 17, color: '#475569' }} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. STATS KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
        {/* Total Records */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#64748b' }}>Total Logs</span>
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <Users style={{ width: 16, height: 16 }} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{stats.total}</div>
        </div>

        {/* Present */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#166534' }}>Present</span>
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <UserCheck style={{ width: 16, height: 16 }} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803d', marginTop: '6px' }}>{stats.present}</div>
        </div>

        {/* Late */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#6b21a8' }}>Late</span>
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
              <Clock style={{ width: 16, height: 16 }} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#7e22ce', marginTop: '6px' }}>{stats.late}</div>
        </div>

        {/* Half Day */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#92400e' }}>Half Day</span>
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <AlertCircle style={{ width: 16, height: 16 }} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#b45309', marginTop: '6px' }}>{stats.halfDay}</div>
        </div>

        {/* On Leave */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e40af' }}>On Leave</span>
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <Calendar style={{ width: 16, height: 16 }} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#1d4ed8', marginTop: '6px' }}>{stats.onLeave}</div>
        </div>

        {/* Absent */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#991b1b' }}>Absent</span>
            <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <XCircle style={{ width: 16, height: 16 }} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#b91c1c', marginTop: '6px' }}>{stats.absent}</div>
        </div>
      </div>

      {/* 3. MULTI-LEVEL FILTER & SEARCH TOOLBAR (CLEAR, BRIGHT, STANDARD READABLE FONT) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {/* ROW 1: Filter Mode Selector Tabs & Quick Presets */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid #f1f5f9'
          }}
        >
          {/* Mode Selector Tabs */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '3px'
            }}
          >
            {[
              { id: 'day', label: 'Day-wise' },
              { id: 'range', label: 'Date Range' },
              { id: 'month', label: 'Month-wise' },
              { id: 'all', label: 'All Records' }
            ].map((m) => {
              const active = filterMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFilterMode(m.id)}
                  style={{
                    backgroundColor: active ? '#ffffff' : 'transparent',
                    color: active ? '#0f172a' : '#475569',
                    fontWeight: active ? 700 : 500,
                    fontSize: '13.5px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: active ? '1px solid #cbd5e1' : '1px solid transparent',
                    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Quick Date Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Quick:</span>
            <button
              type="button"
              onClick={handleSetToday}
              style={{
                backgroundColor: filterMode === 'day' && selectedDate === todayStr ? '#ecfdf5' : '#ffffff',
                color: filterMode === 'day' && selectedDate === todayStr ? '#065f46' : '#334155',
                border: filterMode === 'day' && selectedDate === todayStr ? '1px solid #6ee7b7' : '1px solid #cbd5e1',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Today
            </button>

            <button
              type="button"
              onClick={handleSetYesterday}
              style={{
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Yesterday
            </button>

            <button
              type="button"
              onClick={handleSetThisMonth}
              style={{
                backgroundColor: filterMode === 'month' && selectedMonth === currentMonthStr ? '#eff6ff' : '#ffffff',
                color: filterMode === 'month' && selectedMonth === currentMonthStr ? '#1e40af' : '#334155',
                border: filterMode === 'month' && selectedMonth === currentMonthStr ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              This Month
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all filters"
              style={{
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
            >
              <RotateCcw style={{ width: 13, height: 13 }} /> Reset
            </button>
          </div>
        </div>

        {/* ROW 2: Clean Inline Filter Controls Grid (Single Row, completely matching previous version) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: filterMode === 'range' 
              ? 'repeat(auto-fit, minmax(180px, 1fr))' 
              : 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '12px',
            alignItems: 'flex-end'
          }}
        >
          {/* DATE & TIME PICKER (Click anywhere opens native graphical picker modal) */}
          {filterMode === 'day' && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                <Calendar style={{ width: 14, height: 14, color: '#059669' }} /> Date &amp; Time
              </label>
              <input
                ref={fromDateTimeRef}
                type="datetime-local"
                value={selectedDateTime}
                onChange={(e) => handleSelectedDateTimeChange(e.target.value)}
                onClick={(e) => {
                  try {
                    if (typeof e.target.showPicker === 'function') e.target.showPicker();
                  } catch (err) {}
                }}
                title="Click to open Date & Time picker"
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

          {filterMode === 'range' && (
            <>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  <Calendar style={{ width: 14, height: 14, color: '#059669' }} /> From Date &amp; Time
                </label>
                <input
                  ref={fromDateTimeRef}
                  type="datetime-local"
                  value={fromDateTime}
                  onChange={(e) => handleFromDateTimeChange(e.target.value)}
                  onClick={(e) => {
                    try {
                      if (typeof e.target.showPicker === 'function') e.target.showPicker();
                    } catch (err) {}
                  }}
                  title="Click to open Date & Time picker"
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
                  <Calendar style={{ width: 14, height: 14, color: '#059669' }} /> To Date &amp; Time
                </label>
                <input
                  ref={toDateTimeRef}
                  type="datetime-local"
                  value={toDateTime}
                  onChange={(e) => handleToDateTimeChange(e.target.value)}
                  onClick={(e) => {
                    try {
                      if (typeof e.target.showPicker === 'function') e.target.showPicker();
                    } catch (err) {}
                  }}
                  title="Click to open Date & Time picker"
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

          {filterMode === 'month' && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                <Calendar style={{ width: 14, height: 14, color: '#059669' }} /> Select Month
              </label>
              <input
                ref={monthPickerRef}
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

          {filterMode === 'all' && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                <Calendar style={{ width: 14, height: 14, color: '#64748b' }} /> Attendance Scope
              </label>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: '#475569',
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap'
                }}
              >
                All Records (Full History)
              </div>
            </div>
          )}

          {/* Employee Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
              Employee
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
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
              <option value="ALL">All Employees ({employees.length})</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_code || `#${emp.id}`})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
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
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Half Day">Half Day</option>
              <option value="On Leave">On Leave</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

          {/* Search Query Input */}
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

        {/* ACTIVE FILTERS SUMMARY PILL STRIP */}
        {(filterMode !== 'all' || selectedEmployeeId !== 'ALL' || statusFilter !== 'ALL' || searchQuery.trim()) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              paddingTop: '10px',
              borderTop: '1px solid #f1f5f9',
              fontSize: '13px',
              color: '#475569'
            }}
          >
            <span style={{ fontWeight: 600, color: '#1e293b' }}>Active Filters:</span>

            {filterMode === 'day' && (
              <span style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                📅 Date: {formatDateDisplay(selectedDate)}
              </span>
            )}
            {filterMode === 'range' && (
              <span style={{ backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                📅 Range: {formatDateDisplay(fromDate)} → {formatDateDisplay(toDate)}
              </span>
            )}
            {filterMode === 'month' && (
              <span style={{ backgroundColor: '#faf5ff', color: '#6b21a8', border: '1px solid #e9d5ff', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                📅 Month: {selectedMonth}
              </span>
            )}

            {/* Employee Pill */}
            {selectedEmployeeId !== 'ALL' && (
              <span style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                👤 Staff: {employees.find((e) => String(e.id) === String(selectedEmployeeId))?.name || `#${selectedEmployeeId}`}
              </span>
            )}

            {/* Status Pill */}
            {statusFilter !== 'ALL' && (
              <span style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                🏷️ Status: {statusFilter}
              </span>
            )}

            {/* Search Pill */}
            {searchQuery.trim() && (
              <span style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                🔍 Search: "{searchQuery}"
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                marginLeft: 'auto',
                backgroundColor: 'transparent',
                color: '#dc2626',
                border: 'none',
                fontWeight: 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* 4. MAIN ATTENDANCE TABLE (STRICTLY SINGLE-LINE PER ROW & COMFORTABLE FONT SIZE) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}
      >
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '14px',
              color: '#1e293b',
              whiteSpace: 'nowrap'
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #cbd5e1' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b', fontSize: '13.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b', fontSize: '13.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department & Role</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b', fontSize: '13.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b', fontSize: '13.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Check In</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b', fontSize: '13.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Check Out</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b', fontSize: '13.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Working Hours</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b', fontSize: '13.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b', fontSize: '13.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Remarks</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b', fontSize: '13.5px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedAttendance.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                    <Clock style={{ width: 42, height: 42, margin: '0 auto 10px', color: '#94a3b8' }} />
                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#1e293b' }}>No attendance records found</div>
                    <div style={{ fontSize: '14px', color: '#64748b', marginTop: '6px' }}>
                      Try selecting another filter, changing date range, or click "Record Attendance" above.
                    </div>
                  </td>
                </tr>
              ) : (
                displayedAttendance.map((att) => {
                  const emp = employees.find((e) => String(e.id) === String(att.employee_id)) || {};
                  const empName = att.employee_name || emp.name || 'Staff Member';
                  const empCode = att.employee_code || emp.employee_code || `#${att.employee_id}`;
                  const dept = att.department || emp.department || 'General';
                  const desig = att.designation || emp.designation || 'Staff';
                  const dateVal = att.date || att.attendance_date || '';
                  const workingHours = calculateHours(att.check_in, att.check_out);

                  return (
                    <tr
                      key={`${att.id || att.employee_id}-${dateVal}`}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* Employee (Strictly Single Line, Standard Comfortable Font Size) */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              fontWeight: 700,
                              fontSize: '13px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {empName.charAt(0).toUpperCase()}
                          </span>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14.5px' }}>{empName}</span>
                          <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>({empCode})</span>
                        </div>
                      </td>

                      {/* Department & Role (Strictly Single Line) */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{dept}</span>
                        {desig && (
                          <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '6px', fontWeight: 500 }}>
                            • {desig}
                          </span>
                        )}
                      </td>

                      {/* Date & Day (Strictly Single Line) */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{formatDateDisplay(dateVal)}</span>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#64748b', marginLeft: '6px' }}>
                          ({formatDayName(dateVal)})
                        </span>
                      </td>

                      {/* Check In (Clickable for Admin) */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(att)}
                          title="Click to edit Check In & Check Out times"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontFamily: 'monospace',
                            fontSize: '13.5px',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#0f172a',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                        >
                          {formatTimeDisplay(att.check_in)}
                          <Edit2 style={{ width: 11, height: 11, color: '#64748b' }} />
                        </button>
                      </td>

                      {/* Check Out (Clickable for Admin) */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(att)}
                          title="Click to edit Check In & Check Out times"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontFamily: 'monospace',
                            fontSize: '13.5px',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: att.check_out ? '#f1f5f9' : '#fffbeb',
                            color: att.check_out ? '#0f172a' : '#b45309',
                            border: att.check_out ? '1px solid #cbd5e1' : '1px dashed #f59e0b',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = att.check_out ? '#e2e8f0' : '#fef3c7'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = att.check_out ? '#f1f5f9' : '#fffbeb'; }}
                        >
                          {att.check_out ? formatTimeDisplay(att.check_out) : '+ Set Check Out'}
                          <Edit2 style={{ width: 11, height: 11, color: att.check_out ? '#64748b' : '#d97706' }} />
                        </button>
                      </td>

                      {/* Working Hours (Strictly Single Line) */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{workingHours}</span>
                      </td>

                      {/* Status (Strictly Single Line Badge) */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {renderStatusBadge(att.status)}
                      </td>

                      {/* Remarks (Strictly Single Line truncated with title) */}
                      <td
                        style={{
                          padding: '12px 16px',
                          whiteSpace: 'nowrap',
                          maxWidth: '240px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: '#475569',
                          fontSize: '13.5px'
                        }}
                        title={att.notes || att.remarks || ''}
                      >
                        {att.notes || att.remarks || '—'}
                      </td>

                      {/* Action (Strictly Single Line Edit Button) */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(att)}
                          title="Change Check In and Check Out times for this employee"
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                        >
                          <Edit2 style={{ width: 13, height: 13, color: '#2563eb' }} /> Edit Times
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13.5px',
            color: '#475569'
          }}
        >
          <span>Showing <strong>{displayedAttendance.length}</strong> record(s)</span>
          <span>
            {filterMode === 'month' ? `Month: ${selectedMonth}` : filterMode === 'day' ? `Date: ${selectedDate}` : (filterMode === 'datetime' || filterMode === 'range') ? `Range: ${fromDate} to ${toDate}` : 'All Dates'}
            {(fromTime || toTime) ? ` • Time: ${fromTime || '00:00'} - ${toTime || '23:59'}` : ''}
          </span>
        </div>
      </div>

      {/* 5. RECORD / EDIT ATTENDANCE MODAL */}
      {isPunchModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 22px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock style={{ width: 20, height: 20, color: '#059669' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    {modalMode === 'edit' ? 'Change Check-In & Check-Out Times' : 'Record Staff Attendance'}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    {modalMode === 'edit' ? 'Admin attendance time adjustment' : 'Add manual punch entry for employee'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPunchModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '22px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveAttendance} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Employee Header: Info Card in Edit Mode, Dropdown in Create Mode */}
              {modalMode === 'edit' ? (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        fontWeight: 700,
                        fontSize: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {(punchForm.employee_name || 'E').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14.5px' }}>
                        {punchForm.employee_name || 'Staff Member'}
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                        {punchForm.employee_code ? `${punchForm.employee_code} • ` : ''}{punchForm.department || 'Operations'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>Date</span>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>
                      {formatDateDisplay(punchForm.date)}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Employee <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    required
                    value={punchForm.employee_id}
                    onChange={(e) => {
                      const emp = employees.find((em) => String(em.id) === String(e.target.value));
                      setPunchForm({
                        ...punchForm,
                        employee_id: e.target.value,
                        employee_name: emp?.name || '',
                        employee_code: emp?.employee_code || '',
                        department: emp?.department || ''
                      });
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_code || `#${emp.id}`}) - {emp.department || 'Store'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      Attendance Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setPunchForm({ ...punchForm, date: todayStr })}
                        style={{
                          backgroundColor: punchForm.date === todayStr ? '#ecfdf5' : '#f1f5f9',
                          color: punchForm.date === todayStr ? '#065f46' : '#475569',
                          border: punchForm.date === todayStr ? '1px solid #6ee7b7' : '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const y = new Date();
                          y.setDate(y.getDate() - 1);
                          setPunchForm({ ...punchForm, date: y.toISOString().slice(0, 10) });
                        }}
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Yesterday
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    required
                    value={punchForm.date}
                    onChange={(e) => setPunchForm({ ...punchForm, date: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Status <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={punchForm.status}
                    onChange={(e) => setPunchForm({ ...punchForm, status: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late Arrival</option>
                    <option value="Half Day">Half Day</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>

              {/* Check In & Check Out with Time Pickers & Quick Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      Check In Time
                    </label>
                    <button
                      type="button"
                      onClick={() => setPunchForm({ ...punchForm, check_in: new Date().toTimeString().slice(0, 5) })}
                      title="Set to current time"
                      style={{
                        backgroundColor: '#ecfdf5',
                        color: '#065f46',
                        border: '1px solid #6ee7b7',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Set Now
                    </button>
                  </div>
                  <input
                    type="time"
                    value={punchForm.check_in}
                    onChange={(e) => setPunchForm({ ...punchForm, check_in: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {/* Quick Check-in presets */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {['09:00', '09:30', '10:00'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPunchForm({ ...punchForm, check_in: t })}
                        style={{
                          backgroundColor: punchForm.check_in === t ? '#ecfdf5' : '#f8fafc',
                          color: punchForm.check_in === t ? '#065f46' : '#64748b',
                          border: punchForm.check_in === t ? '1px solid #6ee7b7' : '1px solid #e2e8f0',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '11px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        {formatTimeDisplay(t)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      Check Out Time
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setPunchForm({ ...punchForm, check_out: new Date().toTimeString().slice(0, 5) })}
                        title="Set to current time"
                        style={{
                          backgroundColor: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #6ee7b7',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Set Now
                      </button>
                      {punchForm.check_out && (
                        <button
                          type="button"
                          onClick={() => setPunchForm({ ...punchForm, check_out: '' })}
                          title="Clear check out"
                          style={{
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="time"
                    value={punchForm.check_out}
                    onChange={(e) => setPunchForm({ ...punchForm, check_out: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {/* Quick Check-out presets */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {['18:30', '19:30', '20:00'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPunchForm({ ...punchForm, check_out: t })}
                        style={{
                          backgroundColor: punchForm.check_out === t ? '#eff6ff' : '#f8fafc',
                          color: punchForm.check_out === t ? '#1e40af' : '#64748b',
                          border: punchForm.check_out === t ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '11px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        {formatTimeDisplay(t)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Shift & Duration Summary Preview */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  color: '#334155',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatDateDisplay(punchForm.date)}</span>
                  <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>({formatDayName(punchForm.date)})</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Shift:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {formatTimeDisplay(punchForm.check_in)} &rarr; {punchForm.check_out ? formatTimeDisplay(punchForm.check_out) : 'In Progress'}
                  </strong>{' '}
                  {punchForm.check_out && (
                    <span style={{ color: '#059669', fontWeight: 600, marginLeft: '6px' }}>
                      ({calculateHours(punchForm.check_in, punchForm.check_out)})
                    </span>
                  )}
                </div>
              </div>

              {/* Notes / Remarks */}
              <div>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Remarks / Notes
                </label>
                <textarea
                  rows="2"
                  value={punchForm.notes}
                  onChange={(e) => setPunchForm({ ...punchForm, notes: e.target.value })}
                  placeholder="e.g. Regular shift / Morning delay approved"
                  style={{
                    width: '100%',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    fontSize: '14px',
                    fontWeight: 500,
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setIsPunchModalOpen(false)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '9px 18px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 22px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                    opacity: isSubmitting ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckCircle2 style={{ width: 16, height: 16 }} />
                  {isSubmitting ? 'Saving...' : modalMode === 'edit' ? 'Update Punch Times' : 'Save Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
