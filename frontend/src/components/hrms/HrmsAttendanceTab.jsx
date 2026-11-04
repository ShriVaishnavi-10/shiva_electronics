import React, { useState } from 'react';
import {
  Clock, Calendar, CheckCircle2, XCircle, AlertCircle, Search,
  Filter, Plus, Download, UserCheck, ArrowUpRight, ArrowDownRight, RefreshCw
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'calendar'

  // Punch modal form state
  const [punchForm, setPunchForm] = useState({
    employee_id: '',
    date: new Date().toISOString().slice(0, 10),
    check_in: '09:30',
    check_out: '19:30',
    status: 'PRESENT',
    overtime_hours: '0',
    remarks: ''
  });

  // Calculate summary metrics for current view
  const filteredAttendance = attendanceData.filter(att => {
    const emp = employees.find(e => e.id === att.employee_id) || {};
    const matchesDept = deptFilter === 'ALL' || emp.department_name === deptFilter || emp.department === deptFilter;
    const attStatus = (att.status || '').toUpperCase();
    const matchesStatus = statusFilter === 'ALL' || attStatus === statusFilter;
    const matchesSearch = !searchQuery ||
      (att.employee_name && att.employee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (att.employee_code && att.employee_code.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDept && matchesStatus && matchesSearch;
  });

  const presentCount = attendanceData.filter(a => (a.status || '').toUpperCase() === 'PRESENT').length;
  const absentCount = attendanceData.filter(a => (a.status || '').toUpperCase() === 'ABSENT').length;
  const halfDayCount = attendanceData.filter(a => (a.status || '').toUpperCase() === 'HALF_DAY').length;
  const onLeaveCount = attendanceData.filter(a => (a.status || '').toUpperCase() === 'ON_LEAVE').length;
  const totalOvertime = attendanceData.reduce((acc, a) => acc + (parseFloat(a.overtime_hours) || 0), 0);

  const handleOpenPunch = (emp = null) => {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);
    setPunchForm({
      employee_id: emp ? emp.id : (employees[0]?.id || ''),
      date: selectedDate,
      check_in: timeStr,
      check_out: '',
      status: 'PRESENT',
      overtime_hours: '0',
      remarks: ''
    });
    setIsPunchModalOpen(true);
  };

  const handleSavePunch = async (e) => {
    e.preventDefault();
    if (!punchForm.employee_id) {
      alert('Please select an employee');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/hrms/attendance`,
        punchForm,
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
    switch ((status || '').toUpperCase()) {
      case 'PRESENT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Present</span>;
      case 'ABSENT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">{isStaff ? "My Absent Days" : "Absent"}</span>;
      case 'HALF_DAY':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">{isStaff ? "My Half Days" : "Half Day"}</span>;
      case 'ON_LEAVE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">{isStaff ? "My Leaves" : "On Leave"}</span>;
      case 'LATE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">Late Arrival</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">{status || 'Not Marked'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">{isStaff ? "My Days Present" : "Present Today"}</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{presentCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Absent</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{absentCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Half Day</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{halfDayCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">On Leave</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{onLeaveCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between col-span-2 md:col-span-1">
          <div>
            <p className="text-xs text-slate-400 font-medium">{isStaff ? "My Overtime" : "Overtime Hours"}</p>
            <p className="text-2xl font-bold text-purple-400 mt-1">{totalOvertime}h</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-sm">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-200 outline-none text-sm cursor-pointer"
            />
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-sm text-slate-200 outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-sm text-slate-200 outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Status</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="LATE">Late</option>
          </select>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 pl-9 pr-3 py-2 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isStaff && (
          <button
            onClick={() => handleOpenPunch()}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Record Attendance
          </button>
          )}
          <button
            onClick={() => onRefresh && onRefresh()}
            title="Refresh"
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Daily Attendance Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Department / Role</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Check In</th>
                <th className="py-3.5 px-4">Check Out</th>
                <th className="py-3.5 px-4">Overtime</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Remarks</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500">
                    <Clock className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    No attendance logs found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((att) => {
                  return (
                    <tr key={att.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                            {att.employee_name ? att.employee_name.slice(0, 2).toUpperCase() : 'EM'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-100">{att.employee_name || 'Staff'}</p>
                            <p className="text-xs text-slate-400">{att.employee_code || `#EMP-${att.employee_id}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-slate-200">{att.department_name || 'Store Operations'}</p>
                        <p className="text-xs text-slate-400">{att.designation_name || 'Staff'}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                        {att.date ? new Date(att.date).toLocaleDateString('en-IN') : selectedDate}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs bg-slate-950/80 px-2 py-1 rounded border border-slate-800 text-emerald-400">
                          {att.check_in ? String(att.check_in).slice(0, 5) : '--:--'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs bg-slate-950/80 px-2 py-1 rounded border border-slate-800 text-teal-400">
                          {att.check_out ? String(att.check_out).slice(0, 5) : '--:--'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {parseFloat(att.overtime_hours) > 0 ? (
                          <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            +{att.overtime_hours} hrs
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">0h</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(att.status)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 max-w-[150px] truncate">
                        {att.remarks || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setPunchForm({
                              employee_id: att.employee_id,
                              date: att.date ? new Date(att.date).toISOString().slice(0, 10) : selectedDate,
                              check_in: att.check_in ? att.check_in.slice(0, 5) : '09:30',
                              check_out: att.check_out ? att.check_out.slice(0, 5) : '19:30',
                              status: att.status || 'PRESENT',
                              overtime_hours: att.overtime_hours || '0',
                              remarks: att.remarks || ''
                            });
                            setIsPunchModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Punch / Attendance Modal */}
      {isPunchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100">Record Staff Attendance</h3>
              </div>
              <button
                onClick={() => setIsPunchModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePunch} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Select Employee *</label>
                <select
                  required
                  value={punchForm.employee_id}
                  onChange={(e) => setPunchForm({ ...punchForm, employee_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code || `#${emp.id}`}) - {emp.department_name || 'General'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={punchForm.date}
                    onChange={(e) => setPunchForm({ ...punchForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Attendance Status *</label>
                  <select
                    value={punchForm.status}
                    onChange={(e) => setPunchForm({ ...punchForm, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="LATE">Late Arrival</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Clock In (Time)</label>
                  <input
                    type="time"
                    value={punchForm.check_in}
                    onChange={(e) => setPunchForm({ ...punchForm, check_in: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Clock Out (Time)</label>
                  <input
                    type="time"
                    value={punchForm.check_out}
                    onChange={(e) => setPunchForm({ ...punchForm, check_out: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Overtime Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={punchForm.overtime_hours}
                  onChange={(e) => setPunchForm({ ...punchForm, overtime_hours: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  placeholder="0.0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Remarks / Note</label>
                <input
                  type="text"
                  value={punchForm.remarks}
                  onChange={(e) => setPunchForm({ ...punchForm, remarks: e.target.value })}
                  placeholder="e.g. Sales event shift / Biometric scan"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPunchModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
