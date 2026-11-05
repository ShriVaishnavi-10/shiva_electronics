import React, { useState, useMemo } from 'react';
import {
  Clock, Calendar, CheckCircle2, XCircle, AlertCircle, Search,
  Filter, Plus, UserCheck, RefreshCw, Lock, Edit2, FileText,
  Check, ArrowRight, ShieldCheck, Briefcase
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function HrmsAttendanceTab({
  employees = [],
  attendanceData = [],
  onRefresh,
  departments = [],
  isStaff = false,
  currentUser = null
}) {
  // Filter states
  const [filterMode, setFilterMode] = useState('month'); // 'date', 'month', 'all'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Admin Attendance Edit / Record
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAttendanceId, setEditingAttendanceId] = useState(null);

  // Form state
  const [punchForm, setPunchForm] = useState({
    employee_id: '',
    date: new Date().toISOString().slice(0, 10),
    check_in: '09:30',
    check_out: '19:30',
    status: 'Present',
    overtime_hours: '0',
    notes: ''
  });

  // Helper to identify store staff roles
  const isCashierStaff = (empOrAtt) => {
    const desig = String(empOrAtt?.designation || empOrAtt?.designation_name || '').toLowerCase();
    const dept = String(empOrAtt?.department || empOrAtt?.department_name || '').toLowerCase();
    return desig.includes('cashier') || dept.includes('accounts');
  };

  // Helper to format exact time display (e.g. "10:37:00" -> "10:37 AM")
  const formatExactTime = (timeStr) => {
    if (!timeStr) return '--:--';
    const parts = String(timeStr).trim().split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1];
      if (isNaN(h)) return timeStr;
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      return `${h}:${m} ${ampm}`;
    }
    return timeStr;
  };

  // Helper to format dates cleanly (e.g. "2026-11-05" -> "05 Nov 2026")
  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return '--';
    const cleanStr = String(dateVal).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]} ${months[mIdx] || parts[1]} ${parts[0]}`;
    }
    return cleanStr;
  };

  // Helper to calculate total working hours
  const calculateWorkHours = (checkIn, checkOut, dateStr) => {
    if (!checkIn) return '--';
    const parseMins = (t) => {
      const parts = String(t).trim().split(':');
      if (parts.length < 2) return null;
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    };
    const inM = parseMins(checkIn);
    if (inM === null) return '--';

    if (checkOut) {
      const outM = parseMins(checkOut);
      if (outM !== null) {
        let diff = outM - inM;
        if (diff < 0) diff += 24 * 60; // Overnight shift
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return `${h}h ${m > 0 ? `${m}m` : '00m'}`;
      }
    }

    // If checked in today without check out
    const today = new Date().toISOString().slice(0, 10);
    const logDate = String(dateStr || '').split('T')[0];
    if (logDate === today) {
      const now = new Date();
      const curM = now.getHours() * 60 + now.getMinutes();
      let diff = curM - inM;
      if (diff > 0) {
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return `${h}h ${m > 0 ? `${m}m` : '00m'} (Active)`;
      }
      return 'In Progress';
    }
    return '--';
  };

  // Filtered attendance data based on date-wise, month-wise, employee, and status filters
  const filteredAttendance = useMemo(() => {
    return attendanceData.filter(att => {
      const attDate = String(att.attendance_date || att.date || '').split('T')[0];

      // 1. Date-wise or Month-wise filtering
      if (filterMode === 'date') {
        if (selectedDate && attDate !== selectedDate) return false;
      } else if (filterMode === 'month') {
        if (selectedMonth && !attDate.startsWith(selectedMonth)) return false;
      }

      // 2. Employee filter (for Admin)
      if (selectedEmployeeId !== 'ALL' && String(att.employee_id) !== String(selectedEmployeeId)) {
        return false;
      }

      // 3. Department filter
      if (deptFilter !== 'ALL') {
        const dName = att.department_name || att.department || '';
        if (dName !== deptFilter) return false;
      }

      // 4. Status filter
      if (statusFilter !== 'ALL') {
        const curStatus = (att.status || '').toUpperCase().replace(/_/g, ' ');
        const targetStatus = statusFilter.toUpperCase().replace(/_/g, ' ');
        if (curStatus !== targetStatus) return false;
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (att.employee_name || '').toLowerCase().includes(q);
        const matchesCode = (att.employee_code || '').toLowerCase().includes(q);
        const matchesDesig = (att.designation || att.designation_name || '').toLowerCase().includes(q);
        const matchesRemarks = (att.notes || att.remarks || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDesig && !matchesRemarks) return false;
      }

      return true;
    });
  }, [attendanceData, filterMode, selectedDate, selectedMonth, selectedEmployeeId, deptFilter, statusFilter, searchQuery]);

  // Aggregate Metrics for current filtered view
  const checkedInCount = filteredAttendance.filter(a => a.check_in || ['PRESENT', 'LATE', 'HALF DAY'].includes((a.status || '').toUpperCase().replace(/_/g, ' '))).length;
  const presentCount = filteredAttendance.filter(a => (a.status || '').toUpperCase() === 'PRESENT').length;
  const lateCount = filteredAttendance.filter(a => (a.status || '').toUpperCase() === 'LATE').length;
  const absentCount = filteredAttendance.filter(a => (a.status || '').toUpperCase() === 'ABSENT').length;
  const halfDayCount = filteredAttendance.filter(a => ['HALF DAY', 'HALF_DAY'].includes((a.status || '').toUpperCase())).length;
  const onLeaveCount = filteredAttendance.filter(a => ['ON LEAVE', 'ON_LEAVE'].includes((a.status || '').toUpperCase())).length;

  // Filtered employees for admin assignment dropdown (exclude admin accounts)
  const storeStaffEmployees = useMemo(() => {
    return (Array.isArray(employees) ? employees : []).filter(e => {
      const code = String(e.employee_code || '').toUpperCase();
      return code !== 'EMP-ADM' && code !== 'EMP-SUPER' && e.user_id !== 1 && e.user_id !== 4;
    });
  }, [employees]);

  // Admin Open Create / Edit Punch Modal
  const handleOpenEdit = (att) => {
    if (isStaff) return; // Strict RBAC: Sales staff cannot edit
    setEditingAttendanceId(att.id || null);
    setPunchForm({
      employee_id: att.employee_id || '',
      date: att.attendance_date || att.date || selectedDate,
      check_in: att.check_in ? String(att.check_in).slice(0, 5) : '09:30',
      check_out: att.check_out ? String(att.check_out).slice(0, 5) : '19:30',
      status: att.status || 'Present',
      overtime_hours: att.overtime_hours || '0',
      notes: att.notes || att.remarks || ''
    });
    setIsPunchModalOpen(true);
  };

  const handleOpenAdd = () => {
    if (isStaff) return; // Strict RBAC
    setEditingAttendanceId(null);
    setPunchForm({
      employee_id: storeStaffEmployees[0]?.id || employees[0]?.id || '',
      date: filterMode === 'date' ? selectedDate : new Date().toISOString().slice(0, 10),
      check_in: '09:30',
      check_out: '19:30',
      status: 'Present',
      overtime_hours: '0',
      notes: ''
    });
    setIsPunchModalOpen(true);
  };

  const handleSavePunch = async (e) => {
    e.preventDefault();
    if (isStaff) {
      alert('Access Denied: Only administrators have permission to edit attendance records.');
      return;
    }
    if (!punchForm.employee_id) {
      alert('Please select an employee');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        employee_id: Number(punchForm.employee_id),
        date: punchForm.date,
        check_in: punchForm.check_in,
        check_out: punchForm.check_out || null,
        status: punchForm.status,
        notes: punchForm.notes
      };

      await axios.post(
        `${BACKEND_URL}/api/hrms/attendance`,
        payload,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      setIsPunchModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Punch save error:', err);
      alert(err.response?.data?.message || 'Failed to record attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase().replace(/_/g, ' ');
    switch (s) {
      case 'PRESENT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Present</span>;
      case 'LATE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Late Arrival</span>;
      case 'ABSENT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Absent</span>;
      case 'HALF DAY':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">Half Day</span>;
      case 'ON LEAVE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">On Leave</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">{status || 'Not Marked'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Summary Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Checked In</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{checkedInCount}</p>
            <p className="text-[10px] text-slate-400">{presentCount} On-time • {lateCount} Late</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">On-Time Shifts</p>
            <p className="text-xl font-bold text-teal-400 mt-0.5">{presentCount}</p>
            <p className="text-[10px] text-slate-400">Standard punctuality</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Late Arrivals</p>
            <p className="text-xl font-bold text-amber-400 mt-0.5">{lateCount}</p>
            <p className="text-[10px] text-slate-400">After grace threshold</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Absent Days</p>
            <p className="text-xl font-bold text-rose-400 mt-0.5">{absentCount}</p>
            <p className="text-[10px] text-slate-400">No shift punch</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <XCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Half Days</p>
            <p className="text-xl font-bold text-orange-400 mt-0.5">{halfDayCount}</p>
            <p className="text-[10px] text-slate-400">Partial duration</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">On Leave</p>
            <p className="text-xl font-bold text-blue-400 mt-0.5">{onLeaveCount}</p>
            <p className="text-[10px] text-slate-400">Approved leaves</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Date-wise & Month-wise Control Bar */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter Mode Selector: Date-wise vs Month-wise vs All */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-400" /> Filter View:
            </span>
            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setFilterMode('date')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterMode === 'date'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Date-wise
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterMode === 'month'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Month-wise
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Records
              </button>
            </div>
          </div>

          {/* Preset Buttons for Quick Jumps */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setFilterMode('date');
                setSelectedDate(new Date().toISOString().slice(0, 10));
              }}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const yest = new Date();
                yest.setDate(yest.getDate() - 1);
                setFilterMode('date');
                setSelectedDate(yest.toISOString().slice(0, 10));
              }}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('month');
                setSelectedMonth(new Date().toISOString().slice(0, 7));
              }}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            >
              This Month
            </button>
          </div>
        </div>

        {/* Inputs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* 1. Date Picker (Visible in date mode) */}
            {filterMode === 'date' && (
              <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl text-sm">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-slate-200 outline-none text-sm cursor-pointer"
                  title="Filter attendance by specific date"
                />
              </div>
            )}

            {/* 2. Month Picker (Visible in month mode) */}
            {filterMode === 'month' && (
              <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl text-sm">
                <Calendar className="w-4 h-4 text-amber-400" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-slate-200 outline-none text-sm cursor-pointer"
                  title="Filter attendance by full month"
                />
              </div>
            )}

            {/* 3. Employee Filter (Only for Admin, since staff only view their own) */}
            {!isStaff && (
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl text-sm text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">All Staff Members ({storeStaffEmployees.length})</option>
                {storeStaffEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_code || `#${emp.id}`}) — {isCashierStaff(emp) ? 'Cashier' : (emp.designation || 'Sales')}
                  </option>
                ))}
              </select>
            )}

            {/* 4. Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl text-sm text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late Arrival</option>
              <option value="HALF DAY">Half Day</option>
              <option value="ABSENT">Absent</option>
              <option value="ON LEAVE">On Leave</option>
            </select>

            {/* 5. Search Box */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isStaff ? "Search my records..." : "Search staff, code, remarks..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 pl-9 pr-3 py-2 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Action Buttons: Only Admin has Add / Record option */}
          <div className="flex items-center gap-2">
            {!isStaff && (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Record Attendance
              </button>
            )}
            <button
              onClick={() => onRefresh && onRefresh()}
              title="Refresh attendance records"
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Staff Member</th>
                <th className="py-3.5 px-4 font-semibold">Department & Role</th>
                <th className="py-3.5 px-4 font-semibold">Date</th>
                <th className="py-3.5 px-4 font-semibold">Check In</th>
                <th className="py-3.5 px-4 font-semibold">Check Out</th>
                <th className="py-3.5 px-4 font-semibold">Total Work Hours</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Punch Notes / Remarks</th>
                <th className="py-3.5 px-4 font-semibold text-right">
                  {!isStaff ? 'Admin Action' : 'Access Mode'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500">
                    <Clock className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-60" />
                    <p className="font-medium text-slate-400">No attendance records found for this period.</p>
                    <p className="text-xs text-slate-600 mt-1">Try selecting a different date, month, or status filter.</p>
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((att) => {
                  const isCashier = isCashierStaff(att);
                  const attDate = att.attendance_date || att.date;
                  const totalWork = calculateWorkHours(att.check_in, att.check_out, attDate);

                  return (
                    <tr key={att.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* 1. Staff Member & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow ${
                              isCashier
                                ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white'
                                : 'bg-gradient-to-tr from-amber-500 to-yellow-600 text-slate-950 font-extrabold'
                            }`}
                          >
                            {att.employee_name ? att.employee_name.slice(0, 2).toUpperCase() : 'ST'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-100">{att.employee_name || 'Staff'}</p>
                              {isCashier ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                                  CASHIER
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  SALES
                                </span>
                              )}
                            </div>
                            <small className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700">
                              {att.employee_code || `#${att.employee_id}`}
                            </small>
                          </div>
                        </div>
                      </td>

                      {/* 2. Department & Designation */}
                      <td className="py-3.5 px-4">
                        <p className="text-slate-200 font-medium">
                          {att.department_name || att.department || (isCashier ? 'Accounts & Billing' : 'Sales & Billing')}
                        </p>
                        <p className="text-xs text-slate-400">
                          {att.designation_name || att.designation || (isCashier ? 'Cashier' : 'Sales Executive')}
                        </p>
                      </td>

                      {/* 3. Date */}
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-200">
                        {formatDateDisplay(attDate)}
                      </td>

                      {/* 4. Exact Check In Time */}
                      <td className="py-3.5 px-4">
                        {att.check_in ? (
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs bg-slate-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30 text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {formatExactTime(att.check_in)}
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-slate-500">--:--</span>
                        )}
                      </td>

                      {/* 5. Exact Check Out Time */}
                      <td className="py-3.5 px-4">
                        {att.check_out ? (
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs bg-slate-950/80 px-2.5 py-1 rounded-lg border border-teal-500/30 text-teal-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                            {formatExactTime(att.check_out)}
                          </div>
                        ) : att.check_in && String(attDate).split('T')[0] === new Date().toISOString().slice(0, 10) ? (
                          <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                            Working / In Progress
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-500">--:--</span>
                        )}
                      </td>

                      {/* 6. Total Work Hours */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {totalWork.includes('h') ? (
                          <span className="font-bold text-amber-300 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                            {totalWork}
                          </span>
                        ) : (
                          <span className="text-slate-500">{totalWork}</span>
                        )}
                      </td>

                      {/* 7. Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(att.status)}
                      </td>

                      {/* 8. Remarks / Punch Notes */}
                      <td className="py-3.5 px-4 text-xs text-slate-300 max-w-[180px] truncate" title={att.notes || att.remarks || ''}>
                        {att.notes || att.remarks || '-'}
                      </td>

                      {/* 9. Action (Strict RBAC: Edit only for Admin, Read-only Lock for Staff) */}
                      <td className="py-3.5 px-4 text-right">
                        {!isStaff ? (
                          // ADMIN ACTION: EDIT BUTTON
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(att)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 hover:border-amber-500/40 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                            title="Edit Attendance Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        ) : (
                          // SALESPERSON / CASHIER ACTION: READ-ONLY BADGE (NO EDIT)
                          <span
                            className="text-xs text-slate-500 font-medium inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950/60 border border-slate-800/80"
                            title="Sales staff have view-only access. Only administrators can modify attendance."
                          >
                            <Lock className="w-3 h-3 text-slate-500" />
                            <span>View Only</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Record / Edit Attendance Modal */}
      {isPunchModalOpen && !isStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    {editingAttendanceId ? 'Edit Staff Attendance' : 'Record Staff Attendance'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Administrator Attendance Control</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPunchModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePunch} className="p-6 space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Store Staff Member *</label>
                <select
                  required
                  value={punchForm.employee_id}
                  onChange={(e) => setPunchForm({ ...punchForm, employee_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose Employee --</option>
                  {storeStaffEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_code || `#${emp.id}`}) — {isCashierStaff(emp) ? 'Cashier' : (emp.designation || 'Sales')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Attendance Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Attendance Date *</label>
                <input
                  type="date"
                  required
                  value={punchForm.date}
                  onChange={(e) => setPunchForm({ ...punchForm, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
                />
              </div>

              {/* Check In & Check Out Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Check-In Time</label>
                  <input
                    type="time"
                    value={punchForm.check_in}
                    onChange={(e) => setPunchForm({ ...punchForm, check_in: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500 cursor-pointer font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Check-Out Time</label>
                  <input
                    type="time"
                    value={punchForm.check_out}
                    onChange={(e) => setPunchForm({ ...punchForm, check_out: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500 cursor-pointer font-mono"
                  />
                </div>
              </div>

              {/* Calculated Hours Preview */}
              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Calculated Working Hours:</span>
                <span className="font-bold text-amber-400">
                  {calculateWorkHours(punchForm.check_in, punchForm.check_out, punchForm.date)}
                </span>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Attendance Status *</label>
                <select
                  value={punchForm.status}
                  onChange={(e) => setPunchForm({ ...punchForm, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late Arrival</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              {/* Notes / Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Remarks</label>
                <textarea
                  rows="2"
                  value={punchForm.notes}
                  onChange={(e) => setPunchForm({ ...punchForm, notes: e.target.value })}
                  placeholder="e.g. Regular shift, approved late arrival..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500 placeholder-slate-600 resize-none"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPunchModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 rounded-xl text-sm font-extrabold transition flex items-center gap-2 shadow-lg shadow-amber-500/25 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  {isSubmitting ? 'Saving...' : editingAttendanceId ? 'Update Attendance' : 'Save Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
