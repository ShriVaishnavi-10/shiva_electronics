import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, CheckCircle2, XCircle, Clock, Plus, Search,
  FileText, Check, X, RefreshCw, AlertCircle, Users
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
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localLeaves, setLocalLeaves] = useState(null);
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Apply form state
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: 'Casual',
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

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.employee_id) {
      alert('Please select an employee');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BACKEND_URL}/api/hrms/leaves`, leaveForm, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setIsApplyModalOpen(false);
      setLeaveForm({ employee_id: '', leave_type: 'Casual', start_date: todayStr, end_date: todayStr, reason: '' });
      await fetchLeaves();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Leave apply error:', err);
      alert(err.response?.data?.message || 'Failed to submit leave application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (leaveId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${BACKEND_URL}/api/hrms/leaves/${leaveId}/status`,
        { status: newStatus },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      await fetchLeaves();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Update status error:', err);
      alert(err.response?.data?.message || 'Failed to update leave status');
    }
  };

  const getStatusBadge = (status) => {
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
    }
  };

  const calcDays = (start, end) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  return (
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
          {isStaff && (
            <button
              onClick={() => {
                setLeaveForm({ employee_id: employees[0]?.id || '', leave_type: 'Casual', start_date: todayStr, end_date: todayStr, reason: '' });
                setIsApplyModalOpen(true);
              }}
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)' }}
            >
              <Plus style={{ width: 16, height: 16 }} /> Apply Leave
            </button>
          )}

          <button
            onClick={() => { fetchLeaves(); if (onRefresh) onRefresh(); }}
            disabled={loading}
            title="Refresh"
            style={{ backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', opacity: loading ? 0.6 : 1 }}
          >
            <RefreshCw style={{ width: 16, height: 16 }} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

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
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.length === 0 ? (
                <tr>
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
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
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
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Applied On */}
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

      {/* 4. APPLY LEAVE MODAL */}
      {isStaff && isApplyModalOpen && (
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
                </div>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

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
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.end_date}
                    onClick={(e) => { try { if (typeof e.target.showPicker === 'function') e.target.showPicker(); } catch (err) {} }}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    style={{ width: '100%', backgroundColor: '#ffffff', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '13.5px', fontWeight: 500, outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
                  />
                </div>
              </div>

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
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '10px 22px', background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)' }}
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
