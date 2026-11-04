import React, { useState } from 'react';
import {
  TrendingUp, Award, Target, ShoppingBag, DollarSign,
  Calendar, CheckCircle, Plus, Search, Filter, RefreshCw, Zap
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function HrmsPerformanceTab({
  performanceData = [],
  incentiveRules = [],
  employees = [],
  onRefresh
}) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Target Form
  const [targetForm, setTargetForm] = useState({
    employee_id: '',
    target_amount: '200000',
    target_invoices: '20'
  });

  // Rule Form
  const [ruleForm, setRuleForm] = useState({
    title: 'Festival Electronics Sales Booster',
    min_sales_amount: '100000',
    incentive_percentage: '2.5',
    flat_bonus: '1500',
    category: 'ALL',
    is_active: 1
  });

  const filteredData = performanceData.filter(p => {
    return !searchQuery ||
      (p.employee_name && p.employee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.employee_code && p.employee_code.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Aggregates
  const totalStoreSales = performanceData.reduce((acc, p) => acc + (parseFloat(p.actual_sales_amount || p.total_sales) || 0), 0);
  const totalInvoices = performanceData.reduce((acc, p) => acc + (parseInt(p.total_invoices || p.invoice_count) || 0), 0);
  const totalIncentivesEarned = performanceData.reduce((acc, p) => acc + (parseFloat(p.calculated_incentive || p.eligible_incentive) || 0), 0);
  const avgTargetAchieved = performanceData.length
    ? Math.round(performanceData.reduce((acc, p) => acc + (parseFloat(p.achievement_percent) || 0), 0) / performanceData.length)
    : 0;

  const handleSaveTarget = async (e) => {
    e.preventDefault();
    if (!targetForm.employee_id) {
      alert('Please select an employee');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      await axios.post(
        `${BACKEND_URL}/api/hrms/performance/targets`,
        {
          ...targetForm,
          month: monthStr
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setIsTargetModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Target save error:', err);
      alert(err.response?.data?.message || 'Failed to save sales target');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/hrms/performance/incentive-rules`,
        ruleForm,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setIsRuleModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Incentive rule error:', err);
      alert(err.response?.data?.message || 'Failed to save incentive rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Billing Integration Notice */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-emerald-500/20 rounded-2xl p-5 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wide">
              <Zap className="w-4 h-4 fill-emerald-400" />
              Live Billing ERP Integrated Sales Engine
            </div>
            <p className="text-slate-300 text-xs mt-1">
              Real-time sales invoices, revenue targets, and commission incentives calculated automatically from customer billing transactions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTargetForm({
                  employee_id: employees[0]?.id || '',
                  target_amount: '200000',
                  target_invoices: '20'
                });
                setIsTargetModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              <Target className="w-4 h-4 text-emerald-400" /> Set Sales Target
            </button>
            <button
              onClick={() => setIsRuleModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
            >
              <Award className="w-4 h-4" /> Configure Rules
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Billed Store Revenue</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">₹{totalStoreSales.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Invoices Billed</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">{totalInvoices}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Average Target Met</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{avgTargetAchieved}%</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Target className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Eligible Incentives</p>
            <p className="text-2xl font-bold text-purple-400 mt-1">₹{totalIncentivesEarned.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Award className="w-5 h-5" />
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

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sales consultant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 pl-9 pr-3 py-2 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <button
          onClick={() => onRefresh && onRefresh()}
          className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Staff Performance Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Sales Representative</th>
                <th className="py-3.5 px-4">Target Amount</th>
                <th className="py-3.5 px-4">Achieved Sales (Billing)</th>
                <th className="py-3.5 px-4">Invoices Billed</th>
                <th className="py-3.5 px-4">Achievement %</th>
                <th className="py-3.5 px-4">Eligible Incentive</th>
                <th className="py-3.5 px-4 text-right">Performance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <TrendingUp className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    No sales consultant records found for this period.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => {
                  const percent = parseFloat(item.achievement_percent) || 0;
                  const isTopStar = idx === 0 && percent >= 100;

                  return (
                    <tr key={item.employee_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                            isTopStar ? 'bg-gradient-to-tr from-amber-400 to-orange-500 ring-2 ring-amber-400/50' : 'bg-slate-800 text-slate-200'
                          }`}>
                            {isTopStar ? '★' : (item.employee_name ? item.employee_name.slice(0, 2).toUpperCase() : 'SR')}
                          </div>
                          <div>
                            <p className="font-medium text-slate-100 flex items-center gap-1.5">
                              {item.employee_name || 'Staff'}
                              {isTopStar && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold">Top Seller</span>}
                            </p>
                            <p className="text-xs text-slate-400">{item.employee_code || `#${item.employee_id}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        ₹{parseFloat(item.target_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                        ₹{parseFloat(item.actual_sales_amount || item.total_sales || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-1 rounded bg-slate-800 text-cyan-400 font-mono text-xs">
                          {item.total_invoices || item.invoice_count || 0} bills
                        </span>
                      </td>
                      <td className="py-3.5 px-4 min-w-[150px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percent >= 100 ? 'bg-emerald-500' : percent >= 75 ? 'bg-cyan-500' : percent >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-bold text-slate-200">{percent}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        ₹{parseFloat(item.calculated_incentive || item.eligible_incentive || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {percent >= 100 ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Target Met</span>
                        ) : percent >= 75 ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">On Track</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Below Target</span>
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

      {/* Active Incentive Rule Schemes Cards */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-slate-100">Configured Incentive Schemes</h3>
          </div>
          <span className="text-xs text-slate-400">Rules govern monthly commission payouts</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {incentiveRules.length === 0 ? (
            <div className="col-span-3 text-center py-6 text-slate-500 text-xs">
              No active incentive schemes defined. Click "Configure Rules" to add one.
            </div>
          ) : (
            incentiveRules.map(rule => (
              <div key={rule.id} className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-200 text-sm">{rule.title}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>Min Sales: <strong className="text-slate-200">₹{parseFloat(rule.min_sales_amount || 0).toLocaleString('en-IN')}</strong></p>
                  <p>Commission: <strong className="text-emerald-400 font-bold">{rule.incentive_percentage}%</strong> of billed turnover</p>
                  <p>Flat Bonus: <strong className="text-cyan-400">₹{parseFloat(rule.flat_bonus || 0).toLocaleString('en-IN')}</strong></p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Set Sales Target Modal */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100">Assign Monthly Sales Target</h3>
              </div>
              <button onClick={() => setIsTargetModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSaveTarget} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Sales Consultant *</label>
                <select
                  required
                  value={targetForm.employee_id}
                  onChange={(e) => setTargetForm({ ...targetForm, employee_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Consultant --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code || `#${emp.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target Sales Turnover (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={targetForm.target_amount}
                  onChange={(e) => setTargetForm({ ...targetForm, target_amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  placeholder="e.g. 200000"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target Invoices Count</label>
                <input
                  type="number"
                  min="0"
                  value={targetForm.target_invoices}
                  onChange={(e) => setTargetForm({ ...targetForm, target_invoices: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  placeholder="e.g. 25"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Set Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Incentive Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-slate-100">Create Incentive Scheme</h3>
              </div>
              <button onClick={() => setIsRuleModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSaveRule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Scheme Name *</label>
                <input
                  type="text"
                  required
                  value={ruleForm.title}
                  onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  placeholder="e.g. Smart TV & AC Commission Sched"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Minimum Billed Sales (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={ruleForm.min_sales_amount}
                  onChange={(e) => setRuleForm({ ...ruleForm, min_sales_amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Incentive % *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={ruleForm.incentive_percentage}
                    onChange={(e) => setRuleForm({ ...ruleForm, incentive_percentage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    placeholder="2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Flat Bonus (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={ruleForm.flat_bonus}
                    onChange={(e) => setRuleForm({ ...ruleForm, flat_bonus: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    placeholder="1000"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
