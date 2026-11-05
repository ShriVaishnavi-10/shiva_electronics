import React, { useState, useEffect } from 'react';
import {
  Calendar, CheckCircle2, XCircle, Clock, Plus, Search,
  Filter, FileText, Check, X, AlertCircle, RefreshCw,
  Bell, User, ShieldCheck, MessageSquare
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
  // Filter out admin accounts so only real store staff (Sales & Cashiers) are selectable
  const storeStaff = React.useMemo(() => {
    return (Array.isArray(employees) ? employees : []).filter(e => {
      const code = String(e.employee_code || '').toUpperCase();
      return code !== 'EMP-ADM' && code !== 'EMP-SUPER' && e.user_id !== 1 && e.user_id !== 4;
    });
  }, [employees]);

  const isCashierStaff = (empOrLeave) => {
    const desig = String(empOrLeave?.designation || '').toLowerCase();
    const dept = String(empOrLeave?.department || '').toLowerCase();
    return desig.includes('cashier') || dept.includes('accounts');
  };

  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return '-';
    const cleanStr = String(dateVal).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]} ${months[mIdx] || parts[1]} ${parts[0]}`;
    }
    return cleanStr;
  };
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [successBanner, setSuccessBanner] = useState('');

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedLeaveForReject, setSelectedLeaveForReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Identify current employee if staff/salesperson
  const loggedInEmp = employees.find(e => {
    if (!currentUser) return false;
    if (currentUser.employee_id && String(e.id) === String(currentUser.employee_id)) return true;
    if (currentUser.id && String(e.user_id) === String(currentUser.id)) return true;
    if (currentUser.employee_code && e.employee_code === currentUser.employee_code) return true;
    return false;
  }) || (isStaff && employees.length > 0 ? employees[0] : null);

  // Apply form state
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: 'Casual',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    reason: ''
  });

  useEffect(() => {
    if (isStaff && loggedInEmp?.id) {
      setLeaveForm(prev => ({ ...prev, employee_id: loggedInEmp.id }));
    } else if (storeStaff.length > 0 && !leaveForm.employee_id) {
      setLeaveForm(prev => ({ ...prev, employee_id: storeStaff[0].id }));
    }
  }, [isStaff, loggedInEmp, storeStaff]);

  // Case-insensitive status helpers
  const isPending = (status) => String(status || '').toUpperCase() === 'PENDING';
  const isApproved = (status) => String(status || '').toUpperCase() === 'APPROVED';
  const isRejected = (status) => String(status || '').toUpperCase() === 'REJECTED';

  const filteredLeaves = leavesData.filter(l => {
    const statusUpper = String(l.status || '').toUpperCase();
    const matchesStatus = statusFilter === 'ALL' || statusUpper === statusFilter;
    const typeUpper = String(l.leave_type || '').toUpperCase();
    const matchesType = typeFilter === 'ALL' || typeUpper === typeFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      (l.employee_name && l.employee_name.toLowerCase().includes(q)) ||
      (l.employee_code && l.employee_code.toLowerCase().includes(q)) ||
      (l.reason && l.reason.toLowerCase().includes(q)) ||
      (l.leave_type && l.leave_type.toLowerCase().includes(q));
    return matchesStatus && matchesType && matchesSearch;
  });

  const pendingCount = leavesData.filter(l => isPending(l.status)).length;
  const approvedCount = leavesData.filter(l => isApproved(l.status)).length;
  const rejectedCount = leavesData.filter(l => isRejected(l.status)).length;

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    const empId = isStaff ? (loggedInEmp?.id || currentUser?.employee_id || leaveForm.employee_id) : leaveForm.employee_id;
    if (!empId) {
      alert('Please select an employee');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...leaveForm,
        employee_id: empId
      };

      const res = await axios.post(
        `${BACKEND_URL}/api/hrms/leaves`,
        payload,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      setIsApplyModalOpen(false);
      setSuccessBanner(res.data?.message || 'Leave request submitted successfully! Admin has been notified.');
      setTimeout(() => setSuccessBanner(''), 6000);

      setLeaveForm({
        employee_id: isStaff && loggedInEmp?.id ? loggedInEmp.id : (employees[0]?.id || ''),
        leave_type: 'Casual',
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

  const handleStatusUpdate = async (leaveId, newStatus, reason = '') => {
    setActionLoading(leaveId);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `${BACKEND_URL}/api/hrms/leaves/${leaveId}/status`,
        { status: newStatus, rejection_reason: reason },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      setSuccessBanner(res.data?.message || `Leave application ${newStatus.toLowerCase()} successfully!`);
      setTimeout(() => setSuccessBanner(''), 6000);

      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Update status error:', err);
      alert(err.response?.data?.message || 'Failed to update leave status');
    } finally {
      setActionLoading(null);
      setRejectModalOpen(false);
      setSelectedLeaveForReject(null);
      setRejectReason('');
    }
  };

  const openRejectDialog = (leave) => {
    setSelectedLeaveForReject(leave);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const getStatusBadge = (status) => {
    if (isApproved(status)) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 w-max">
          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
        </span>
      );
    }
    if (isRejected(status)) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5 w-max">
          <XCircle className="w-3.5 h-3.5" /> Rejected
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 w-max animate-pulse">
        <Clock className="w-3.5 h-3.5 text-amber-400" /> Pending Approval
      </span>
    );
  };

  // Calculate day difference
  const calcDays = (start, end) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.max(0, Math.floor((e - s) / (1000 * 60 * 60 * 24))) + 1;
    return diff || 1;
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-between shadow-lg shadow-emerald-500/10 animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm font-medium">{successBanner}</p>
          </div>
          <button
            onClick={() => setSuccessBanner('')}
            className="text-emerald-400 hover:text-emerald-200 text-xs px-2 py-1 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Pending Approvals */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-amber-500/40 transition">
          <div>
            <p className="text-xs text-slate-400 font-medium">
              {isStaff ? 'My Pending Requests' : 'Pending Approvals'}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
              {!isStaff && pendingCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Action Needed
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Approved Leaves */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-emerald-500/40 transition">
          <div>
            <p className="text-xs text-slate-400 font-medium">
              {isStaff ? 'My Approved Leaves' : 'Approved Leaves'}
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{approvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Rejected Requests */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-rose-500/40 transition">
          <div>
            <p className="text-xs text-slate-400 font-medium">
              {isStaff ? 'My Rejected Requests' : 'Rejected Requests'}
            </p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{rejectedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Total Applications */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-cyan-500/40 transition">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Applications</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">{leavesData.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search & Apply Action */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-sm text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
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
            className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-sm text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">All Leave Types</option>
            <option value="CASUAL">Casual Leave (CL)</option>
            <option value="SICK">Sick Leave (SL)</option>
            <option value="EMERGENCY">Emergency Leave</option>
            <option value="EARNED">Earned / Paid Leave</option>
            <option value="UNPAID">Loss of Pay (LOP)</option>
          </select>

          {/* Search Bar */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by staff, code or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 pl-9 pr-3 py-2 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Apply Leave Button */}
          <button
            onClick={() => {
              setLeaveForm({
                employee_id: isStaff ? (loggedInEmp?.id || '') : (employees[0]?.id || ''),
                leave_type: 'Casual',
                start_date: new Date().toISOString().slice(0, 10),
                end_date: new Date().toISOString().slice(0, 10),
                reason: ''
              });
              setIsApplyModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Apply Leave
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => onRefresh && onRefresh()}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Employee</th>
                <th className="py-3.5 px-4 font-semibold">Leave Type</th>
                <th className="py-3.5 px-4 font-semibold">Duration</th>
                <th className="py-3.5 px-4 font-semibold">Days</th>
                <th className="py-3.5 px-4 font-semibold">Reason</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Applied On</th>
                <th className="py-3.5 px-4 font-semibold text-right">
                  {!isStaff ? 'Admin Approval Actions' : 'Approval Status'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    <Calendar className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-60" />
                    <p className="font-medium text-slate-400">No leave applications found.</p>
                    <p className="text-xs text-slate-600 mt-1">Applications submitted by salespersons or staff will appear here.</p>
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((item) => {
                  const days = item.total_days ? Number(item.total_days) : calcDays(item.start_date, item.end_date);
                  const pending = isPending(item.status);
                  const approved = isApproved(item.status);
                  const rejected = isRejected(item.status);

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Employee Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-extrabold text-xs shadow">
                            {item.employee_name ? item.employee_name.slice(0, 2).toUpperCase() : 'SP'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-100">{item.employee_name || 'Sales Staff'}</p>
                              {isCashierStaff(item) ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                                  CASHIER
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  SALES
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] font-mono text-slate-300 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700">
                                {item.employee_code || `#${item.employee_id}`}
                              </span>
                              <span className="text-xs text-slate-400">
                                {item.designation || (isCashierStaff(item) ? 'Cashier & Billing Desk' : 'Sales Executive')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700">
                          {item.leave_type || 'Casual'}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                        <span className="text-slate-100 font-medium">{formatDateDisplay(item.start_date)}</span>
                        {item.start_date !== item.end_date && (
                          <>
                            <span className="text-slate-500 mx-1">to</span>
                            <span className="text-slate-100 font-medium">{formatDateDisplay(item.end_date)}</span>
                          </>
                        )}
                      </td>

                      {/* Days */}
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-200">
                        <span className="px-2 py-0.5 rounded bg-slate-800/80 text-amber-300 border border-slate-700">
                          {days} {days === 1 ? 'day' : 'days'}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 text-xs text-slate-300 max-w-[220px]" title={item.reason}>
                        <p className="truncate font-medium">{item.reason || 'Personal commitment'}</p>
                        {rejected && item.rejection_reason && (
                          <p className="text-[11px] text-rose-400 truncate mt-0.5">
                            Rejection Note: {item.rejection_reason}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Applied On */}
                      <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">
                        {item.created_at ? formatDateDisplay(item.created_at) : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {!isStaff ? (
                          // ADMIN VIEW: APPROVE / REJECT CONTROLS
                          pending ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleStatusUpdate(item.id, 'Approved')}
                                disabled={actionLoading === item.id}
                                className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                                title="Approve this leave application"
                              >
                                <Check className="w-3.5 h-3.5" />
                                {actionLoading === item.id ? 'Saving...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => openRejectDialog(item)}
                                disabled={actionLoading === item.id}
                                className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                                title="Reject this leave application"
                              >
                                <X className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </div>
                          ) : approved ? (
                            <div className="text-right">
                              <span className="text-xs text-emerald-400 font-semibold flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                              </span>
                              <p className="text-[10px] text-slate-400">by {item.approved_by || 'Admin'}</p>
                            </div>
                          ) : (
                            <div className="text-right">
                              <span className="text-xs text-rose-400 font-semibold flex items-center justify-end gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Rejected
                              </span>
                              <p className="text-[10px] text-slate-400">by {item.approved_by || 'Admin'}</p>
                            </div>
                          )
                        ) : (
                          // SALESPERSON / STAFF VIEW: STATUS NOTIFICATION
                          pending ? (
                            <span className="text-xs text-amber-400 font-semibold flex items-center justify-end gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                              Awaiting Admin Approval
                            </span>
                          ) : approved ? (
                            <span className="text-xs text-emerald-400 font-semibold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approved by {item.approved_by || 'Admin'}
                            </span>
                          ) : (
                            <span className="text-xs text-rose-400 font-semibold flex items-center justify-end gap-1" title={item.rejection_reason || 'Rejected'}>
                              <XCircle className="w-3.5 h-3.5" /> Request Rejected
                            </span>
                          )
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

      {/* Apply Leave Modal with Guaranteed Viewport Fit & Sticky Save Option */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col my-auto"
            style={{ maxHeight: 'min(92vh, 640px)' }}
          >
            {/* Modal Header (Fixed at top) */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Apply Leave Application</h3>
                  <p className="text-[11px] text-slate-400">Admin will be notified for review & approval</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleApplyLeave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto flex-1">
                {/* Employee Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Employee / Applicant *</label>
                  {isStaff && loggedInEmp ? (
                    // Locked for Salesperson / Staff
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                          {loggedInEmp.name ? loggedInEmp.name.slice(0, 2).toUpperCase() : 'SP'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{loggedInEmp.name}</p>
                          <p className="text-xs text-amber-400 font-mono">{loggedInEmp.employee_code} • {loggedInEmp.designation || 'Sales Person'}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                        Applicant
                      </span>
                    </div>
                  ) : (
                    // Selectable for Admin
                    <select
                      required
                      value={leaveForm.employee_id}
                      onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="">-- Select Store Staff / Sales Person --</option>
                      {storeStaff.map(emp => {
                        const isCashier = isCashierStaff(emp);
                        return (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.employee_code || `#${emp.id}`}) — {isCashier ? 'Cashier & Billing Desk' : (emp.designation || 'Sales Executive')}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                {/* Leave Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Leave Type *</label>
                  <select
                    value={leaveForm.leave_type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Casual">Casual Leave (CL)</option>
                    <option value="Sick">Sick / Medical Leave (SL)</option>
                    <option value="Emergency">Emergency Leave</option>
                    <option value="Earned">Earned / Privilege Leave (EL)</option>
                    <option value="Unpaid">Loss of Pay (LOP)</option>
                  </select>
                </div>

                {/* Date Ranges */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={leaveForm.start_date}
                      onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">End Date *</label>
                    <input
                      type="date"
                      required
                      value={leaveForm.end_date}
                      onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Calculated Duration Display */}
                <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs text-slate-400">
                  <span>Calculated Duration:</span>
                  <span className="font-bold text-amber-400">
                    {calcDays(leaveForm.start_date, leaveForm.end_date)} {calcDays(leaveForm.start_date, leaveForm.end_date) === 1 ? 'Day' : 'Days'}
                  </span>
                </div>

                {/* Reason for Leave */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reason for Leave *</label>
                  <textarea
                    required
                    rows="2"
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    placeholder="Detail the reason for requesting leave..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500 placeholder-slate-600 resize-none"
                  />
                </div>
              </div>

              {/* Modal Sticky Footer with Save Option (ALWAYS VISIBLE) */}
              <div className="px-6 py-3.5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 rounded-xl text-sm font-extrabold transition flex items-center gap-2 shadow-lg shadow-amber-500/25 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                  {isSubmitting ? 'Saving Application...' : 'Save & Submit Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Rejection Modal with Guaranteed Viewport Fit & Sticky Footer */}
      {rejectModalOpen && selectedLeaveForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col my-auto"
            style={{ maxHeight: 'min(90vh, 520px)' }}
          >
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Reject Leave Request</h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedLeaveForReject.employee_name} ({selectedLeaveForReject.leave_type} Leave)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1">
                <p className="text-slate-400">Leave Duration: <span className="text-slate-200 font-mono">{selectedLeaveForReject.start_date} to {selectedLeaveForReject.end_date}</span></p>
                <p className="text-slate-400">Staff Reason: <span className="text-slate-200 italic">"{selectedLeaveForReject.reason || 'None'}"</span></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reason for Rejection *
                </label>
                <textarea
                  rows="3"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this leave application is rejected..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-rose-500 placeholder-slate-600 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStatusUpdate(selectedLeaveForReject.id, 'Rejected', rejectReason || 'Rejected by Administrator')}
                disabled={actionLoading === selectedLeaveForReject.id}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
                {actionLoading === selectedLeaveForReject.id ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
