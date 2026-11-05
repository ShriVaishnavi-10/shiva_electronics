<<<<<<< HEAD
import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, CheckCircle2, XCircle, Clock, Plus, Search,
  FileText, Check, X, RefreshCw, AlertCircle, Users
=======
import React, { useState, useEffect } from 'react';
import {
  Calendar, CheckCircle2, XCircle, Clock, Plus, Search,
  Filter, FileText, Check, X, AlertCircle, RefreshCw,
  Bell, User, ShieldCheck, MessageSquare
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const LEAVE_TYPE_LABELS = {
  CASUAL: 'Casual Leave (CL)',
  SICK: 'Sick Leave (SL)',
  EMERGENCY: 'Emergency Leave',
  EARNED: 'Earned / Paid Leave (EL)',
  UNPAID: 'Loss of Pay (LOP)',
  Casual: 'Casual Leave (CL)',
  Sick: 'Sick Leave (SL)',
  Emergency: 'Emergency Leave',
  Earned: 'Earned Leave (EL)',
  Unpaid: 'Loss of Pay (LOP)',
  Maternity: 'Maternity Leave'
};

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
<<<<<<< HEAD
  const [localLeaves, setLocalLeaves] = useState(null);
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
=======
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
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef

  // Apply form state
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: 'Casual',
<<<<<<< HEAD
    start_date: todayStr,
    end_date: todayStr,
    reason: ''
  });

  // Fetch live leaves from server
  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${BACKEND_URL}/api/hrms/leaves`, { headers });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setLocalLeaves(res.data.data);
      }
    } catch (err) {
      console.warn('Leave fetch failed, using props:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const displayLeaves = localLeaves !== null ? localLeaves : leavesData;

  const filteredLeaves = displayLeaves.filter((l) => {
    const rawStatus = (l.status || '').toUpperCase();
    const rawType = (l.leave_type || '').toUpperCase();
    const matchesStatus = statusFilter === 'ALL' || rawStatus === statusFilter.toUpperCase();
    const matchesType = typeFilter === 'ALL' || rawType === typeFilter.toUpperCase();
    const matchesSearch =
      !searchQuery ||
      (l.employee_name && l.employee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.employee_code && l.employee_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.reason && l.reason.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesType && matchesSearch;
  });

  const pendingCount = displayLeaves.filter((l) => (l.status || '').toUpperCase() === 'PENDING').length;
  const approvedCount = displayLeaves.filter((l) => (l.status || '').toUpperCase() === 'APPROVED').length;
  const rejectedCount = displayLeaves.filter((l) => (l.status || '').toUpperCase() === 'REJECTED').length;
=======
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
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef

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
<<<<<<< HEAD
      await axios.post(`${BACKEND_URL}/api/hrms/leaves`, leaveForm, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setIsApplyModalOpen(false);
      setLeaveForm({ employee_id: '', leave_type: 'Casual', start_date: todayStr, end_date: todayStr, reason: '' });
      await fetchLeaves();
=======
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

>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Leave apply error:', err);
      alert(err.response?.data?.message || 'Failed to submit leave application');
    } finally {
      setIsSubmitting(false);
    }
  };

<<<<<<< HEAD
  const handleStatusUpdate = async (leaveId, newStatus) => {
=======
  const handleStatusUpdate = async (leaveId, newStatus, reason = '') => {
    setActionLoading(leaveId);
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `${BACKEND_URL}/api/hrms/leaves/${leaveId}/status`,
        { status: newStatus },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
<<<<<<< HEAD
      await fetchLeaves();
=======

      setSuccessBanner(res.data?.message || `Leave application ${newStatus.toLowerCase()} successfully!`);
      setTimeout(() => setSuccessBanner(''), 6000);

>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
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
<<<<<<< HEAD
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '9999px', fontSize: '12.5px', fontWeight: 600, backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', whiteSpace: 'nowrap' }}>
          <CheckCircle2 style={{ width: 13, height: 13 }} /> Approved
        </span>
      );
    }
    if (s === 'REJECTED') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '9999px', fontSize: '12.5px', fontWeight: 600, backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', whiteSpace: 'nowrap' }}>
          <XCircle style={{ width: 13, height: 13 }} /> Rejected
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '9999px', fontSize: '12.5px', fontWeight: 600, backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', whiteSpace: 'nowrap' }}>
        <Clock style={{ width: 13, height: 13 }} /> Pending
      </span>
    );
  };

  const getLeaveTypeBadge = (type) => {
    const label = LEAVE_TYPE_LABELS[type] || type || 'Leave';
    return (
      <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
=======
    if (isApproved(status)) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 w-max">
          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
        </span>
      );
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
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

  const calcDays = (start, end) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  return (
<<<<<<< HEAD
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#0f172a' }}>

      {/* 1. KPI STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
        {[
          { label: 'Pending Approvals', value: pendingCount, color: '#92400e', bg: '#fffbeb', border: '#fde68a', Icon: Clock },
          { label: 'Approved Leaves', value: approvedCount, color: '#065f46', bg: '#ecfdf5', border: '#a7f3d0', Icon: CheckCircle2 },
          { label: 'Rejected Requests', value: rejectedCount, color: '#991b1b', bg: '#fef2f2', border: '#fecaca', Icon: XCircle },
          { label: 'Total Applications', value: displayLeaves.length, color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', Icon: FileText }
        ].map((kpi) => (
          <div key={kpi.label} style={{ backgroundColor: '#ffffff', border: `1px solid ${kpi.border}`, borderRadius: '12px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: kpi.color }}>{kpi.label}</span>
              <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                <kpi.Icon style={{ width: 16, height: 16 }} />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: kpi.color, marginTop: '6px' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* 2. TOOLBAR */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px', flex: 1 }}>
          {/* Status Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '13.5px', fontWeight: 500, outline: 'none', cursor: 'pointer' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Leave Type Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Leave Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '13.5px', fontWeight: 500, outline: 'none', cursor: 'pointer' }}
            >
              <option value="ALL">All Leave Types</option>
              <option value="CASUAL">Casual Leave (CL)</option>
              <option value="SICK">Sick Leave (SL)</option>
              <option value="EMERGENCY">Emergency Leave</option>
              <option value="EARNED">Earned / Paid Leave (EL)</option>
              <option value="UNPAID">Loss of Pay (LOP)</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Search Staff</label>
            <div style={{ position: 'relative' }}>
              <Search style={{ width: 15, height: 15, color: '#94a3b8', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Name, code, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px 8px 32px', fontSize: '13.5px', fontWeight: 500, outline: 'none', minWidth: '200px' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                >
                  <X style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => {
              setLeaveForm({ employee_id: employees[0]?.id || '', leave_type: 'Casual', start_date: todayStr, end_date: todayStr, reason: '' });
              setIsApplyModalOpen(true);
            }}
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)' }}
=======
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
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
          >
            <Plus style={{ width: 16, height: 16 }} /> Apply Leave
          </button>

<<<<<<< HEAD
          <button
            onClick={() => { fetchLeaves(); if (onRefresh) onRefresh(); }}
            disabled={loading}
=======
          {/* Refresh Button */}
          <button
            onClick={() => onRefresh && onRefresh()}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
            title="Refresh"
            style={{ backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', opacity: loading ? 0.6 : 1 }}
          >
            <RefreshCw style={{ width: 16, height: 16 }} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

<<<<<<< HEAD
      {/* 3. LEAVE TABLE */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {/* Table Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar style={{ width: 17, height: 17, color: '#059669' }} />
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Leave Applications</span>
            <span style={{ backgroundColor: '#e2e8f0', color: '#475569', fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px' }}>
              {filteredLeaves.length}
            </span>
          </div>
          {pendingCount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', borderRadius: '8px', padding: '4px 10px', fontSize: '12.5px', fontWeight: 600 }}>
              <AlertCircle style={{ width: 13, height: 13 }} /> {pendingCount} pending approval
            </span>
          )}
        </div>

        {/* Scrollable Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px', color: '#1e293b', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1', color: '#475569', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <th style={{ padding: '12px 16px' }}>Employee</th>
                <th style={{ padding: '12px 16px' }}>Leave Type</th>
                <th style={{ padding: '12px 16px' }}>From</th>
                <th style={{ padding: '12px 16px' }}>To</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Days</th>
                <th style={{ padding: '12px 16px' }}>Reason</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Applied On</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
=======
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
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.length === 0 ? (
                <tr>
<<<<<<< HEAD
                  <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <Calendar style={{ width: 36, height: 36, color: '#cbd5e1' }} />
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>No leave applications found</span>
                      <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Try adjusting the status or type filters above</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((item, idx) => {
                  const days = item.total_days || calcDays(item.start_date, item.end_date);
                  const initials = (item.employee_name || 'EM').slice(0, 2).toUpperCase();
                  const avatarColors = ['#7c3aed', '#059669', '#dc2626', '#d97706', '#2563eb', '#db2777'];
                  const avatarBg = avatarColors[(item.employee_id || idx) % avatarColors.length];

                  return (
                    <tr
                      key={item.id || idx}
                      style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', transition: 'background 0.12s' }}
                    >
                      {/* Employee */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: avatarBg, color: '#fff', fontWeight: 800, fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {initials}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{item.employee_name || 'Staff'}</span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>{item.employee_code || `#${item.employee_id}`}</span>
=======
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
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
<<<<<<< HEAD
                      <td style={{ padding: '14px 16px' }}>
                        {getLeaveTypeBadge(item.leave_type)}
                      </td>

                      {/* From */}
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                        {formatDate(item.start_date)}
                      </td>

                      {/* To */}
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                        {formatDate(item.end_date)}
                      </td>

                      {/* Days */}
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: '#0f172a', fontSize: '15px' }}>
                        {days}
                        <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', marginLeft: '4px' }}>
                          {days === 1 ? 'day' : 'days'}
                        </span>
                      </td>

                      {/* Reason */}
                      <td style={{ padding: '14px 16px', color: '#475569', maxWidth: '200px' }}>
                        <span
                          title={item.reason}
                          style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}
                        >
                          {item.reason || '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
=======
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
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Applied On */}
<<<<<<< HEAD
                      <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {item.created_at ? formatDate(item.created_at) : '—'}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {(item.status || '').toUpperCase() === 'PENDING' ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleStatusUpdate(item.id, 'APPROVED')}
                              title="Approve Leave"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', fontSize: '12.5px', fontWeight: 700, backgroundColor: '#ecfdf5', color: '#065f46', border: '1.5px solid #6ee7b7', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              <Check style={{ width: 13, height: 13 }} /> Approve
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(item.id, 'REJECTED')}
                              title="Reject Leave"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', fontSize: '12.5px', fontWeight: 700, backgroundColor: '#fef2f2', color: '#991b1b', border: '1.5px solid #fca5a5', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              <X style={{ width: 13, height: 13 }} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12.5px', color: '#94a3b8', fontStyle: 'italic' }}>—</span>
=======
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
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
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

<<<<<<< HEAD
      {/* 4. APPLY LEAVE MODAL */}
      {isApplyModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsApplyModalOpen(false); }}
        >
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Apply Leave Application</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>Fill in the leave details below</p>
=======
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
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
<<<<<<< HEAD
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '4px' }}
=======
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

<<<<<<< HEAD
            {/* Modal Form */}
            <form onSubmit={handleApplyLeave} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Employee Select */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Employee *</label>
                <select
                  required
                  value={leaveForm.employee_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', fontWeight: 500, outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="">— Select Employee —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()} ({emp.employee_code || `#${emp.id}`})
                    </option>
                  ))}
                </select>
              </div>

              {/* Leave Type */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Leave Type *</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', fontWeight: 500, outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="Casual">Casual Leave (CL)</option>
                  <option value="Sick">Sick / Medical Leave (SL)</option>
                  <option value="Emergency">Emergency Leave</option>
                  <option value="Earned">Earned / Privilege Leave (EL)</option>
                  <option value="Unpaid">Loss of Pay (LOP)</option>
                </select>
              </div>

              {/* Date Range */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.start_date}
                    onClick={(e) => { try { if (typeof e.target.showPicker === 'function') e.target.showPicker(); } catch (err) {} }}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', fontWeight: 500, outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
                  />
=======
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
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
                </div>

                {/* Leave Type */}
                <div>
<<<<<<< HEAD
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.end_date}
                    onClick={(e) => { try { if (typeof e.target.showPicker === 'function') e.target.showPicker(); } catch (err) {} }}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', fontWeight: 500, outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
=======
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
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
                  />
                </div>
              </div>

<<<<<<< HEAD
              {/* Duration Preview */}
              {leaveForm.start_date && leaveForm.end_date && (
                <div style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                  📅 Total Duration: <span style={{ color: '#0f172a', fontWeight: 800 }}>{calcDays(leaveForm.start_date, leaveForm.end_date)} day(s)</span>
                </div>
              )}

              {/* Reason */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Reason for Leave *</label>
                <textarea
                  required
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Briefly describe the reason for leave..."
                  style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', fontWeight: 400, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  style={{ padding: '10px 20px', backgroundColor: '#ffffff', color: '#475569', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
=======
              {/* Modal Sticky Footer with Save Option (ALWAYS VISIBLE) */}
              <div className="px-6 py-3.5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition cursor-pointer"
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
<<<<<<< HEAD
                  style={{ padding: '10px 22px', background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)' }}
=======
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 rounded-xl text-sm font-extrabold transition flex items-center gap-2 shadow-lg shadow-amber-500/25 disabled:opacity-50 cursor-pointer"
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
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
