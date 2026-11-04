import React, { useState } from 'react';
import {
  CreditCard, DollarSign, Calendar, Printer, CheckCircle2,
  AlertCircle, Download, FileText, ChevronRight, RefreshCw, Play
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function HrmsPayrollTab({
  employees = [],
  payrollData = [],
  onRefresh,
  isStaff = false,
  currentUser = null
}) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredPayroll = payrollData.filter(p => {
    let pMonth = p.month;
    let pYear = p.year;
    if (typeof p.month === 'string' && p.month.includes('-')) {
      const parts = p.month.split('-');
      pYear = parseInt(parts[0]);
      pMonth = parseInt(parts[1]);
    }
    const matchesMonth = parseInt(pMonth) === parseInt(selectedMonth);
    const matchesYear = pYear ? parseInt(pYear) === parseInt(selectedYear) : true;
    const currentStatus = (p.payment_status || p.status || 'DRAFT').toUpperCase();
    const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter;
    return matchesMonth && matchesYear && matchesStatus;
  });

  const totalGross = filteredPayroll.reduce((acc, p) => acc + (parseFloat(p.gross_salary) || 0), 0);
  const totalDeductions = filteredPayroll.reduce((acc, p) => acc + (parseFloat(p.total_deductions) || 0), 0);
  const totalNet = filteredPayroll.reduce((acc, p) => acc + (parseFloat(p.net_salary) || 0), 0);
  const paidCount = filteredPayroll.filter(p => (p.payment_status || p.status || '').toUpperCase() === 'PAID').length;

  const handleGeneratePayroll = async () => {
    if (!window.confirm(`Generate monthly payroll for ${selectedMonth}/${selectedYear} based on staff attendance, incentives, and salary structures?`)) {
      return;
    }
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const res = await axios.post(
        `${BACKEND_URL}/api/hrms/payroll/generate`,
        { month: monthStr, monthNum: selectedMonth, year: selectedYear },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      alert(res.data?.message || 'Payroll processed successfully!');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Generate payroll error:', err);
      alert(err.response?.data?.message || 'Failed to generate payroll');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateStatus = async (payrollId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${BACKEND_URL}/api/hrms/payroll/${payrollId}/status`,
        { status },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Update status error:', err);
      alert(err.response?.data?.message || 'Failed to update payroll status');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">PAID</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">APPROVED</span>;
      case 'DRAFT':
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">DRAFT</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">{isStaff ? "My Gross Salary" : "Total Gross Payroll"}</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">₹{totalGross.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">{isStaff ? "My Deductions" : "Statutory Deductions"}</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">₹{totalDeductions.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">{isStaff ? "My Net Disbursable" : "Net Disbursable"}</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">₹{totalNet.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Disbursed Staff</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">{paidCount} / {filteredPayroll.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Month selector */}
          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-sm">
            <span className="text-xs text-slate-400">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-slate-200 outline-none font-semibold cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m} className="bg-slate-900">
                  {new Date(2026, m - 1, 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          {/* Year selector */}
          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-sm">
            <span className="text-xs text-slate-400">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-slate-200 outline-none font-semibold cursor-pointer"
            >
              <option value={2025} className="bg-slate-900">2025</option>
              <option value={2026} className="bg-slate-900">2026</option>
              <option value={2027} className="bg-slate-900">2027</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-sm text-slate-200 outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isStaff && (
          <button
            onClick={handleGeneratePayroll}
            disabled={isGenerating}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            {isGenerating ? 'Processing...' : 'Run Monthly Payroll'}
          </button>
          )}
          <button
            onClick={() => onRefresh && onRefresh()}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Basic Pay</th>
                <th className="py-3.5 px-4">HRA / Allowances</th>
                <th className="py-3.5 px-4">Incentives / Overtime</th>
                <th className="py-3.5 px-4">Gross Total</th>
                <th className="py-3.5 px-4">Deductions (PF/ESI)</th>
                <th className="py-3.5 px-4">Net Payable</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPayroll.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500">
                    <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    No payroll records calculated for this period. Click <strong>"Run Monthly Payroll"</strong> to process.
                  </td>
                </tr>
              ) : (
                filteredPayroll.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-xs">
                            {p.employee_name ? p.employee_name.slice(0, 2).toUpperCase() : 'EM'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-100">{p.employee_name || 'Staff'}</p>
                            <p className="text-xs text-slate-400">{p.employee_code || `#${p.employee_id}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-200">
                        ₹{parseFloat(p.basic_salary || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        ₹{(parseFloat(p.hra || 0) + parseFloat(p.other_allowances || p.special_allowance || 0)).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400">
                        +₹{(parseFloat(p.incentives || p.sales_incentives || 0) + parseFloat(p.overtime_pay || 0)).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-100">
                        ₹{parseFloat(p.gross_salary || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-rose-400">
                        -₹{parseFloat(p.total_deductions || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-base">
                        ₹{parseFloat(p.net_salary || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge((p.payment_status || p.status || 'Draft').toUpperCase())}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedSlip(p)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                            title="Print / View Payslip"
                          >
                            <Printer className="w-3.5 h-3.5 text-cyan-400" /> Slip
                          </button>
                          {(p.payment_status || p.status || '').toUpperCase() === 'DRAFT' && (
                            <button
                              onClick={() => handleUpdateStatus(p.id, 'Approved')}
                              className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium border border-blue-500/20 transition"
                            >
                              Approve
                            </button>
                          )}
                          {(p.payment_status || p.status || '').toUpperCase() === 'APPROVED' && (
                            <button
                              onClick={() => handleUpdateStatus(p.id, 'Paid')}
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium border border-emerald-500/20 transition"
                            >
                              Disburse
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* A4 Printable Payslip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            {/* Header / Actions bar (non-printable) */}
            <div className="px-6 py-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800">Employee Payslip Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
                >
                  <Printer className="w-4 h-4" /> Print Payslip
                </button>
                <button
                  onClick={() => setSelectedSlip(null)}
                  className="text-slate-500 hover:text-slate-800 p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div className="p-8 overflow-y-auto space-y-6 bg-white text-slate-900" id="printable-payslip">
              {/* Company Branding */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">SHIVA ELECTRONICS</h1>
                  <p className="text-xs text-slate-600 mt-0.5">Electronics Retail, Appliances & Distribution</p>
                  <p className="text-xs text-slate-500">GSTIN: 33AAAAA0000A1Z5 | TN-India</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded">
                    Pay Advice
                  </span>
                  <p className="text-xs text-slate-600 font-bold mt-2">
                    Month: {selectedSlip.month || `${selectedSlip.year}-${selectedSlip.month}`}
                  </p>
                </div>
              </div>

              {/* Employee Information Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-slate-500">Employee Name:</p>
                  <p className="font-bold text-slate-900 text-sm">{selectedSlip.employee_name || 'Staff'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Employee Code:</p>
                  <p className="font-bold text-slate-900 text-sm font-mono">{selectedSlip.employee_code || `#EMP-${selectedSlip.employee_id}`}</p>
                </div>
                <div>
                  <p className="text-slate-500">Department:</p>
                  <p className="font-semibold text-slate-800">{selectedSlip.department_name || selectedSlip.department || 'Sales & Retail'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Designation:</p>
                  <p className="font-semibold text-slate-800">{selectedSlip.designation_name || selectedSlip.designation || 'Store Executive'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Bank Account No:</p>
                  <p className="font-mono text-slate-800">{selectedSlip.account_number || 'XXXXXXXXXXXX'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Payment Status:</p>
                  <p className="font-bold text-emerald-700">{selectedSlip.payment_status || selectedSlip.status || 'PROCESSED'}</p>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="grid grid-cols-2 gap-6">
                {/* Earnings */}
                <div>
                  <div className="bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase tracking-wider border-b border-slate-300">
                    Earnings
                  </div>
                  <table className="w-full text-xs mt-2">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 text-slate-600">Basic Salary</td>
                        <td className="py-1.5 text-right font-mono font-medium">₹{parseFloat(selectedSlip.basic_salary || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 text-slate-600">House Rent Allowance (HRA)</td>
                        <td className="py-1.5 text-right font-mono font-medium">₹{parseFloat(selectedSlip.hra || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 text-slate-600">Special / Other Allowances</td>
                        <td className="py-1.5 text-right font-mono font-medium">₹{parseFloat(selectedSlip.special_allowance || selectedSlip.other_allowances || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 text-slate-600">Sales Commission / Incentive</td>
                        <td className="py-1.5 text-right font-mono font-medium text-emerald-700">₹{parseFloat(selectedSlip.sales_incentives || selectedSlip.incentives || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 text-slate-600">Overtime Pay</td>
                        <td className="py-1.5 text-right font-mono font-medium">₹{parseFloat(selectedSlip.overtime_pay || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-t-2 border-slate-900 font-bold">
                        <td className="py-2 text-slate-900">Total Gross Earnings</td>
                        <td className="py-2 text-right font-mono text-sm text-slate-900">₹{parseFloat(selectedSlip.gross_salary || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Deductions */}
                <div>
                  <div className="bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase tracking-wider border-b border-slate-300">
                    Deductions
                  </div>
                  <table className="w-full text-xs mt-2">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 text-slate-600">Provident Fund (PF)</td>
                        <td className="py-1.5 text-right font-mono font-medium text-rose-700">₹{parseFloat(selectedSlip.pf_deduction || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 text-slate-600">Employee State Insurance (ESI)</td>
                        <td className="py-1.5 text-right font-mono font-medium text-rose-700">₹{parseFloat(selectedSlip.esi_deduction || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 text-slate-600">Professional Tax (PT)</td>
                        <td className="py-1.5 text-right font-mono font-medium text-rose-700">₹{parseFloat(selectedSlip.prof_tax || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 text-slate-600">Salary Advance Repayment</td>
                        <td className="py-1.5 text-right font-mono font-medium text-rose-700">₹{parseFloat(selectedSlip.advance_deduction || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1.5 text-slate-600">TDS / Other Deductions</td>
                        <td className="py-1.5 text-right font-mono font-medium text-rose-700">₹{parseFloat(selectedSlip.other_deductions || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr className="border-t-2 border-slate-900 font-bold">
                        <td className="py-2 text-slate-900">Total Deductions</td>
                        <td className="py-2 text-right font-mono text-sm text-rose-700">₹{parseFloat(selectedSlip.total_deductions || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Net Salary Highlight Box */}
              <div className="bg-emerald-50 border-2 border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-bold text-emerald-800 tracking-wider">Net Disbursed Take-Home</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Direct bank credit to account on file</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-emerald-700 font-mono">
                    ₹{parseFloat(selectedSlip.net_salary || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-10 grid grid-cols-2 gap-10 text-xs text-center">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-semibold text-slate-800">Employee Signature</p>
                  <p className="text-[10px] text-slate-500">I acknowledge receipt of full payment</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-semibold text-slate-800">Authorized Signatory / HR</p>
                  <p className="text-[10px] text-slate-500">For SHIVA ELECTRONICS</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
