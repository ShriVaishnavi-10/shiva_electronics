import React, { useState } from 'react';
import {
  Receipt, DollarSign, Plus, CheckCircle2, XCircle, Clock,
  Filter, Search, RefreshCw, FileText, Check, X
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function HrmsExpensesTab({
  employees = [],
  expensesData = [],
  advancesData = [],
  onRefresh
}) {
  const [activeSubTab, setActiveSubTab] = useState('EXPENSES'); // 'EXPENSES' or 'ADVANCES'
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    employee_id: '',
    category: 'TRAVEL',
    amount: '',
    claim_date: new Date().toISOString().slice(0, 10),
    description: ''
  });

  // Advance form
  const [advanceForm, setAdvanceForm] = useState({
    employee_id: '',
    amount: '',
    reason: '',
    request_date: new Date().toISOString().slice(0, 10),
    repayment_months: '3'
  });

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.employee_id) return alert('Select an employee');
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/hrms/expenses`,
        expenseForm,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setIsExpenseModalOpen(false);
      setExpenseForm({ employee_id: '', category: 'TRAVEL', amount: '', claim_date: new Date().toISOString().slice(0, 10), description: '' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Expense error:', err);
      alert(err.response?.data?.message || 'Failed to submit expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAdvance = async (e) => {
    e.preventDefault();
    if (!advanceForm.employee_id) return alert('Select an employee');
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/hrms/advances`,
        advanceForm,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setIsAdvanceModalOpen(false);
      setAdvanceForm({ employee_id: '', amount: '', reason: '', request_date: new Date().toISOString().slice(0, 10), repayment_months: '3' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Advance error:', err);
      alert(err.response?.data?.message || 'Failed to submit advance request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpenseStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${BACKEND_URL}/api/hrms/expenses/${id}/status`,
        { status },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update expense status');
    }
  };

  const handleAdvanceStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${BACKEND_URL}/api/hrms/advances/${id}/status`,
        { status },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update advance status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Switcher & Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('EXPENSES')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              activeSubTab === 'EXPENSES'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" /> Expense Claims ({expensesData.length})
          </button>
          <button
            onClick={() => setActiveSubTab('ADVANCES')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              activeSubTab === 'ADVANCES'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Salary Advances ({advancesData.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'EXPENSES' ? (
            <button
              onClick={() => {
                setExpenseForm({ employee_id: employees[0]?.id || '', category: 'TRAVEL', amount: '', claim_date: new Date().toISOString().slice(0, 10), description: '' });
                setIsExpenseModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Claim Expense
            </button>
          ) : (
            <button
              onClick={() => {
                setAdvanceForm({ employee_id: employees[0]?.id || '', amount: '', reason: '', request_date: new Date().toISOString().slice(0, 10), repayment_months: '3' });
                setIsAdvanceModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Request Advance
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

      {/* Subtab 1: Expense Claims */}
      {activeSubTab === 'EXPENSES' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {expensesData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500">
                      <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                      No expense reimbursement claims submitted.
                    </td>
                  </tr>
                ) : (
                  expensesData.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-100">{exp.employee_name || 'Staff'}</p>
                        <p className="text-xs text-slate-400">{exp.employee_code || `#${exp.employee_id}`}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-xs font-semibold">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                        ₹{parseFloat(exp.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                        {exp.claim_date}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 max-w-[200px] truncate" title={exp.description}>
                        {exp.description || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        {exp.status === 'APPROVED' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Approved</span>
                        ) : exp.status === 'REJECTED' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Rejected</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {exp.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleExpenseStatus(exp.id, 'APPROVED')}
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium border border-emerald-500/20 transition flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleExpenseStatus(exp.id, 'REJECTED')}
                              className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-medium border border-rose-500/20 transition flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Salary Advances */}
      {activeSubTab === 'ADVANCES' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Advance Amount</th>
                  <th className="py-3.5 px-4">Repayment Tenure</th>
                  <th className="py-3.5 px-4">Repaid / Balance</th>
                  <th className="py-3.5 px-4">Request Date</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {advancesData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-500">
                      <DollarSign className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                      No salary advances requested.
                    </td>
                  </tr>
                ) : (
                  advancesData.map((adv) => (
                    <tr key={adv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-100">{adv.employee_name || 'Staff'}</p>
                        <p className="text-xs text-slate-400">{adv.employee_code || `#${adv.employee_id}`}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-base">
                        ₹{parseFloat(adv.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-200">
                        {adv.repayment_months || 3} monthly EMIs
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                        ₹{parseFloat(adv.repaid_amount || 0).toLocaleString('en-IN')} / ₹{(parseFloat(adv.amount || 0) - parseFloat(adv.repaid_amount || 0)).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                        {adv.request_date}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 max-w-[200px] truncate" title={adv.reason}>
                        {adv.reason || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        {adv.status === 'APPROVED' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Approved</span>
                        ) : adv.status === 'REJECTED' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Rejected</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {adv.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAdvanceStatus(adv.id, 'APPROVED')}
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium border border-emerald-500/20 transition flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleAdvanceStatus(adv.id, 'REJECTED')}
                              className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-medium border border-rose-500/20 transition flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Claim Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100">Claim Staff Expense</h3>
              </div>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Employee *</label>
                <select
                  required
                  value={expenseForm.employee_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, employee_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Staff --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code || `#${emp.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Expense Category *</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  >
                    <option value="TRAVEL">Customer Delivery / Travel</option>
                    <option value="FOOD">Food & Refreshment</option>
                    <option value="SHOP_SUPPLIES">Store Supplies & Tools</option>
                    <option value="CUSTOMER_VISIT">Client Site Visit</option>
                    <option value="OTHER">Other Business Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    placeholder="1200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Claim Date</label>
                <input
                  type="date"
                  value={expenseForm.claim_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, claim_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description / Bill Details</label>
                <textarea
                  rows="2"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  placeholder="e.g. Fuel for home delivery of 65 inch OLED TV"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Advance Modal */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100">Request Salary Advance</h3>
              </div>
              <button onClick={() => setIsAdvanceModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSaveAdvance} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Employee *</label>
                <select
                  required
                  value={advanceForm.employee_id}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, employee_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Staff --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code || `#${emp.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Requested Advance (₹) *</label>
                  <input
                    type="number"
                    required
                    min="500"
                    step="500"
                    value={advanceForm.amount}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Repayment (Months) *</label>
                  <select
                    value={advanceForm.repayment_months}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, repayment_months: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  >
                    <option value="1">1 Month (Next Paycheck)</option>
                    <option value="2">2 Months</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Reason for Advance</label>
                <textarea
                  rows="2"
                  value={advanceForm.reason}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  placeholder="e.g. Medical emergency / Family festival expenses"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

