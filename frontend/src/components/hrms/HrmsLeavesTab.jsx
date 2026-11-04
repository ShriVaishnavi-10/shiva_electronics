import React, { useState } from 'react';
import {
  Calendar, CheckCircle2, XCircle, Clock, Plus, Search,
  Filter, FileText, Check, X, AlertCircle, RefreshCw
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function HrmsLeavesTab({
  employees = [],
  leavesData = [],
  onRefresh,
  currentUser = null,
  isStaff = false
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apply form state
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: 'CASUAL',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    reason: ''
  });

  const filteredLeaves = leavesData.filter(l => {
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || l.leave_type === typeFilter;
    const matchesSearch = !searchQuery ||
      (l.employee_name && l.employee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.reason && l.reason.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesType && matchesSearch;
  });

  const pendingCount = leavesData.filter(l => l.status === 'PENDING').length;
  const approvedCount = leavesData.filter(l => l.status === 'APPROVED').length;
  const rejectedCount = leavesData.filter(l => l.status === 'REJECTED').length;

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.employee_id) {
      alert('Please select an employee');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/hrms/leaves`,
        leaveForm,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setIsApplyModalOpen(false);
      setLeaveForm({
        employee_id: '',
        leave_type: 'CASUAL',
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date().toISOString().slice(0, 10),
        reason: ''
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Leave apply error:', err);
      alert(err.response?.data?.message || 'Failed to submit leave application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (leaveId, newStatus) => {
    const reason = newStatus === 'REJECTED' ? prompt('Enter reason for rejection (optional):') : '';
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${BACKEND_URL}/api/hrms/leaves/${leaveId}/status`,
        { status: newStatus, rejection_reason: reason },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Update status error:', err);
      alert(err.response?.data?.message || 'Failed to update leave status');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 w-max"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      case 'PENDING':
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-max"><Clock className="w-3.5 h-3.5" /> Pending Approval</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Pending Approvals</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">{isStaff ? "My Approved Leaves" : "Approved Leaves"}</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{approvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">{isStaff ? "My Rejected Requests" : "Rejected Requests"}</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{rejectedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Applications</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">{leavesData.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-sm text-slate-200 outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-sm text-slate-200 outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Leave Types</option>
            <option value="CASUAL">Casual Leave (CL)</option>
            <option value="SICK">Sick Leave (SL)</option>
            <option value="EMERGENCY">Emergency Leave</option>
            <option value="EARNED">Earned / Paid Leave</option>
            <option value="UNPAID">Loss of Pay (LOP)</option>
          </select>

          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by staff or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 pl-9 pr-3 py-2 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLeaveForm({
                employee_id: employees[0]?.id || '',
                leave_type: 'CASUAL',
                start_date: new Date().toISOString().slice(0, 10),
                end_date: new Date().toISOString().slice(0, 10),
                reason: ''
              });
              setIsApplyModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Apply Leave
          </button>
          <button
            onClick={() => onRefresh && onRefresh()}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Leave Type</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Days</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Applied On</th>
                <th className="py-3.5 px-4 text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    <Calendar className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    No leave applications found.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((item) => {
                  const sDate = new Date(item.start_date);
                  const eDate = new Date(item.end_date);
                  const diffTime = Math.abs(eDate - sDate);
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                            {item.employee_name ? item.employee_name.slice(0, 2).toUpperCase() : 'EM'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-100">{item.employee_name || 'Staff'}</p>
                            <p className="text-xs text-slate-400">{item.employee_code || `#${item.employee_id}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-xs px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700">
                          {item.leave_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                        {item.start_date} to {item.end_date}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-200">
                        {diffDays} {diffDays === 1 ? 'day' : 'days'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300 max-w-[200px] truncate" title={item.reason}>
                        {item.reason || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {item.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleStatusUpdate(item.id, 'APPROVED')}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                              title="Approve"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(item.id, 'REJECTED')}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                              title="Reject"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Completed</span>
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

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100">Apply Leave Application</h3>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Employee *</label>
                <select
                  required
                  value={leaveForm.employee_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code || `#${emp.id}`}) - {emp.department_name || 'General'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Leave Type *</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="CASUAL">Casual Leave (CL)</option>
                  <option value="SICK">Sick / Medical Leave (SL)</option>
                  <option value="EMERGENCY">Emergency Leave</option>
                  <option value="EARNED">Earned / Privilege Leave (EL)</option>
                  <option value="UNPAID">Loss of Pay (LOP)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Reason for Leave *</label>
                <textarea
                  required
                  rows="3"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Detail the purpose of leave..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

