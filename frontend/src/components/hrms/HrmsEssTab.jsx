import React, { useState, useEffect } from 'react';
import {
  User, Clock, Calendar, DollarSign, TrendingUp, Receipt,
  CheckCircle2, Bell, AlertCircle, Printer, FileText, ArrowUpRight,
  Play, Square, Check, RefreshCw, X, Shield, Award, Sparkles, Building
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function HrmsEssTab({
  currentUser = null,
  employees = [],
  attendanceData = [],
  leavesData = [],
  payrollData = [],
  performanceData = [],
  expensesData = [],
  advancesData = [],
  onRefresh,
  onPunchSuccess
}) {
  const [selectedSlip, setSelectedSlip] = useState(null);

  // Find logged in employee record
  const currentEmp = employees.find(e => {
    if (!currentUser) return false;
    if (currentUser.employee_id && String(e.id) === String(currentUser.employee_id)) return true;
    if (currentUser.id && String(e.user_id) === String(currentUser.id)) return true;
    if (currentUser.employee_code && e.employee_code === currentUser.employee_code) return true;
    if (currentUser.phone && e.phone === currentUser.phone) return true;
    if (currentUser.email && e.email === currentUser.email) return true;
    const empName = `${e.name || e.first_name || ''}`.trim().toLowerCase();
    const curName = `${currentUser.name || currentUser.username || currentUser.displayName || ''}`.trim().toLowerCase();
    if (curName && empName && (empName === curName || empName.includes(curName) || curName.includes(empName))) return true;
    return false;
  }) || {};

  const myAttendance = attendanceData.filter(a => {
    return (
      (currentEmp?.id && String(a.employee_id) === String(currentEmp.id)) ||
      (currentEmp?.user_id && String(a.employee_id) === String(currentEmp.user_id)) ||
      (currentUser?.employee_id && String(a.employee_id) === String(currentUser.employee_id))
    );
  });
  const myLeaves = leavesData.filter(l => currentEmp?.id && l.employee_id === currentEmp.id);
  const myPayroll = payrollData.filter(p => currentEmp?.id && p.employee_id === currentEmp.id);
  const myPerformance = performanceData.find(p => currentEmp?.id && p.employee_id === currentEmp.id) || {};
  const myExpenses = expensesData.filter(e => currentEmp?.id && e.employee_id === currentEmp.id);
  const myAdvances = advancesData.filter(a => currentEmp?.id && a.employee_id === currentEmp.id);

  // Current Month Calculations
  const now = new Date();
  const currentMonthStr = now.toISOString().slice(0, 7); // 'YYYY-MM'
  const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const getLocalDateStr = (d = new Date()) => {
    if (!d) return '';
    if (typeof d === 'string') {
      const match = d.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateStr();
  const [localPunchOverride, setLocalPunchOverride] = useState(null);

  const thisMonthAttendance = myAttendance.filter(a => {
    const d = getLocalDateStr(a.attendance_date || a.date);
    return d.slice(0, 7) === currentMonthStr;
  });

  const myPresentDays = thisMonthAttendance.filter(a => {
    const s = (a.status || a.attendance_status || '').toUpperCase();
    return s === 'PRESENT' || s === 'HALF_DAY';
  }).length;

  const myLateDays = thisMonthAttendance.filter(a => {
    const s = (a.status || a.attendance_status || '').toUpperCase();
    return s === 'LATE' || Boolean(a.is_late) || (Number(a.late_minutes) > 0);
  }).length;

  const myApprovedLeaves = myLeaves.filter(l => (l.status || '').toUpperCase() === 'APPROVED').length;
  const myPendingLeaves = myLeaves.filter(l => (l.status || '').toUpperCase() === 'PENDING').length;
  const totalAnnualQuota = 18;
  const leaveBalance = Math.max(0, totalAnnualQuota - myApprovedLeaves);

  // Billing & Performance
  const salesAmount = parseFloat(myPerformance.actual_sales_amount || myPerformance.total_sales || 0);
  const invoiceCount = parseInt(myPerformance.total_invoices || myPerformance.invoice_count || 0);
  const incentiveEarned = parseFloat(myPerformance.calculated_incentive || myPerformance.eligible_incentive || 0);

  // Latest Pay
  const latestPayslip = myPayroll[0] || null;
  const netPay = latestPayslip ? parseFloat(latestPayslip.net_salary || 0) : (parseFloat(currentEmp?.basic_salary) || 0);

  // Check today's punch status
  const matchedPunch = myAttendance.find(a => {
    const attDate = getLocalDateStr(a.attendance_date || a.date);
    return attDate === todayStr;
  });

  return (
    <div className="space-y-6">
      {/* 1. Employee Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-900 text-2xl font-black shadow-md shadow-amber-500/20">
              {currentEmp?.name ? currentEmp.name.slice(0, 1).toUpperCase() : (currentUser?.name?.slice(0, 1).toUpperCase() || 'C')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  Welcome, {currentEmp?.name || currentUser?.name || 'Staff Member'}!
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 border border-amber-500/30">
                  {currentEmp?.status || 'Active Staff'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {currentEmp?.designation || 'Staff Specialist'} • {currentEmp?.department || 'Store Operations'}
              </p>
              <p className="text-xs font-mono font-bold text-amber-600 mt-0.5">
                Staff ID: {currentEmp?.employee_code || `#EMP-${currentEmp?.id || '001'}`}
              </p>
            </div>
          </div>

          {/* Company Branding & Role Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 pr-3 border-r border-slate-200">
              <img
                src="/shiva_logo.png"
                alt="Shiva Electronics"
                className="w-12 h-12 rounded-full object-contain bg-white p-1 border-2 border-amber-400 shadow-sm"
              />
              <div className="leading-tight">
                <p className="text-xs font-black tracking-wider text-slate-800 uppercase">Shiva Electronics</p>
                <p className="text-[10px] text-amber-600 font-bold uppercase">Staff HRMS Portal</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-200 rounded-2xl p-3 text-center min-w-[130px]">
              <p className="text-[10px] uppercase tracking-wider text-amber-800 font-bold">Portal Access</p>
              <p className="text-sm font-bold text-amber-950 mt-0.5">
                Personal Dashboard
              </p>
              <span className="text-[10px] text-emerald-700 font-semibold flex items-center justify-center gap-1 mt-0.5">
                <Shield size={10} /> Verified User
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Personal Key Workforce Metrics (Personal Data Only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: My Monthly Attendance */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '18px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)'
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">My Attendance</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-950 mt-2">
            {myPresentDays} <span className="text-xs font-semibold text-emerald-800">Days</span>
          </p>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            Present in {now.toLocaleString('default', { month: 'short' })}
          </p>
        </div>

        {/* Card 2: My Late Punches */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '18px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)'
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">My Late Punches</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-amber-950 mt-2">
            {myLateDays} <span className="text-xs font-semibold text-amber-800">Day{myLateDays === 1 ? '' : 's'}</span>
          </p>
          <p className="text-[11px] text-amber-700 font-medium mt-1">
            {myLateDays === 0 ? 'Zero Late Arrivals' : 'Post 09:45 AM grace'}
          </p>
        </div>

        {/* Card 3: My Leave Balance */}
        <div
          style={{
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            borderRadius: '18px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.08)'
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">My Leaves</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-700 flex items-center justify-center">
              <Calendar size={16} />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-blue-950 mt-2">
            {leaveBalance} <span className="text-xs font-semibold text-blue-800">Available</span>
          </p>
          <p className="text-[11px] text-blue-700 font-medium mt-1">
            {myApprovedLeaves} Used • {myPendingLeaves} Pending
          </p>
        </div>

        {/* Card 4: My POS Sales / Billing */}
        <div
          style={{
            background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            borderRadius: '18px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.08)'
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">My POS Billing</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-700 flex items-center justify-center">
              <Receipt size={16} />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-purple-950 mt-2">
            ₹{salesAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-purple-700 font-medium mt-1">
            {invoiceCount} Invoices Handled
          </p>
        </div>

        {/* Card 5: My Incentives */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
            border: '1px solid rgba(249, 115, 22, 0.35)',
            borderRadius: '18px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(249, 115, 22, 0.08)'
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">My Incentives</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-700 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-orange-950 mt-2">
            ₹{incentiveEarned.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-orange-700 font-medium mt-1">
            Earned for Payout
          </p>
        </div>

        {/* Card 6: My Net Pay */}
        <div
          style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            borderRadius: '18px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)'
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">My Net Pay</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-700 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-950 mt-2">
            ₹{netPay.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            {latestPayslip ? `Status: ${latestPayslip.payment_status || 'Processed'}` : 'Monthly Structure'}
          </p>
        </div>
      </div>

      {/* 3. Three Columns Self-Service Dossier */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Widget 1: Personal Dossier */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm">Personal Dossier</h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Employee Code:</span>
              <span className="font-mono font-bold text-slate-800">{currentEmp?.employee_code || `#EMP-${currentEmp?.id || '01'}`}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Full Name:</span>
              <span className="font-semibold text-slate-800">{currentEmp?.name || currentUser?.name || 'Staff User'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Mobile Phone:</span>
              <span className="font-semibold text-slate-800">{currentEmp?.phone || currentUser?.phone || '-'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Department:</span>
              <span className="font-semibold text-slate-800">{currentEmp?.department || 'Billing & Accounts'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Designation:</span>
              <span className="font-semibold text-slate-800">{currentEmp?.designation || 'Staff Specialist'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Bank Account:</span>
              <span className="font-mono text-slate-800">{currentEmp?.account_number || 'Registered with Accounts'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Emergency Contact:</span>
              <span className="font-medium text-slate-800">{currentEmp?.emergency_contact_phone || currentEmp?.emergency_contact_name || 'Store Administration'}</span>
            </div>
          </div>
        </div>

        {/* Widget 2: Recent Punches */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="w-5 h-5 text-cyan-600" />
            <h3 className="font-bold text-slate-900 text-sm">My Recent Attendance Logs</h3>
          </div>

          <div className="space-y-3">
            {myAttendance.slice(0, 4).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No punch logs recorded yet.</p>
            ) : (
              myAttendance.slice(0, 4).map(att => (
                <div key={att.id} className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div>
                    <p className="font-semibold text-slate-800">{att.date ? new Date(att.date).toLocaleDateString('en-IN') : 'Today'}</p>
                    <p className="text-slate-500 text-[11px] font-mono">
                      In: {att.check_in?.slice(0, 5) || '--:--'} • Out: {att.check_out?.slice(0, 5) || '--:--'}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    att.status === 'Present' || att.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {att.status || att.attendance_status || 'Present'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Widget 3: My Payslips */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-slate-900 text-sm">My Monthly Payslips</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Click to view</span>
          </div>

          <div className="space-y-3">
            {myPayroll.slice(0, 3).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No payroll issued yet.</p>
            ) : (
              myPayroll.slice(0, 3).map(pay => (
                <div
                  key={pay.id}
                  onClick={() => setSelectedSlip(pay)}
                  className="flex items-center justify-between text-xs bg-slate-50 hover:bg-amber-50/50 p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 transition cursor-pointer"
                  title="Click to view details"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {pay.month || `${pay.year}-${pay.month}`}
                    </p>
                    <p className="text-emerald-700 font-mono font-bold">
                      Net: ₹{parseFloat(pay.net_salary || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                      {pay.payment_status || pay.status || 'Processed'}
                    </span>
                    <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center justify-end gap-1">
                      <FileText size={10} /> View Slip
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. Store Announcements & Guidelines */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-slate-900 text-sm">Store Announcements & Cashier Guidelines</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
          <div className="bg-amber-50/50 border border-amber-200/60 p-3.5 rounded-xl">
            <p className="font-bold text-amber-900">Cash Counter Closing & Daily Cash Report</p>
            <p className="text-amber-800 mt-1">Please ensure daily cash reconciliation is completed and submitted via the Cashier Daily Cash Report at the end of each shift.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <p className="font-bold text-slate-900">Attendance & Shift Timing Policy</p>
            <p className="text-slate-600 mt-1">Punch check-in before 09:45 AM daily at your cashier station. Grace period is 15 minutes before mark-as-late.</p>
          </div>
        </div>
      </div>

      {/* 6. Payslip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <img src="/shiva_logo.png" alt="Shiva Electronics" className="w-10 h-10 object-contain rounded-full border border-amber-400 p-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Salary Payslip</h3>
                  <p className="text-[11px] text-slate-500">{selectedSlip.month || 'Current Month'} • Shiva Electronics</p>
                </div>
              </div>
              <button onClick={() => setSelectedSlip(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee Name:</span>
                  <span className="font-bold text-slate-800">{currentEmp?.name || currentUser?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee Code:</span>
                  <span className="font-mono text-slate-800">{currentEmp?.employee_code || `#EMP-${currentEmp?.id || '01'}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Designation:</span>
                  <span className="text-slate-800">{currentEmp?.designation || 'Staff Specialist'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-emerald-50/50 border border-emerald-200/60 p-3 rounded-xl">
                  <p className="font-bold text-emerald-900 mb-1.5">Earnings</p>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Basic Pay:</span>
                      <span className="font-mono font-semibold">₹{parseFloat(selectedSlip.basic_salary || currentEmp?.basic_salary || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">HRA & Allowances:</span>
                      <span className="font-mono font-semibold">₹{parseFloat(selectedSlip.allowances || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Incentive:</span>
                      <span className="font-mono font-semibold">₹{parseFloat(selectedSlip.incentives || incentiveEarned || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-rose-50/50 border border-rose-200/60 p-3 rounded-xl">
                  <p className="font-bold text-rose-900 mb-1.5">Deductions</p>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">PF & ESI:</span>
                      <span className="font-mono font-semibold">₹{parseFloat(selectedSlip.pf_deduction || selectedSlip.esi_deduction || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tax / Other:</span>
                      <span className="font-mono font-semibold">₹{parseFloat(selectedSlip.other_deductions || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t border-rose-200">
                      <span className="text-rose-900">Total Deductions:</span>
                      <span className="font-mono text-rose-700">₹{parseFloat(selectedSlip.total_deductions || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center justify-between mt-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Net Take-Home Salary</p>
                  <p className="text-xl font-black font-mono text-amber-950">₹{parseFloat(selectedSlip.net_salary || 0).toLocaleString('en-IN')}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {selectedSlip.payment_status || 'Processed'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Printer size={13} /> Print Payslip
              </button>
              <button
                onClick={() => setSelectedSlip(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
