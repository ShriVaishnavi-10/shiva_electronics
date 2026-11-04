import React, { useState } from 'react';
import {
  Building2, Briefcase, Plus, Users, Trash2, Edit2, Search,
  RefreshCw, CheckCircle2
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function HrmsDepartmentsTab({
  departments = [],
  designations = [],
  employees = [],
  onRefresh
}) {
  const [activeSubTab, setActiveSubTab] = useState('DEPARTMENTS'); // 'DEPARTMENTS' or 'DESIGNATIONS'
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDesigModalOpen, setIsDesigModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [desigForm, setDesigForm] = useState({ name: '', department_id: '', description: '', base_salary_min: '15000', base_salary_max: '35000' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveDept = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/hrms/departments`,
        deptForm,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setIsDeptModalOpen(false);
      setDeptForm({ name: '', description: '' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Save dept error:', err);
      alert(err.response?.data?.message || 'Failed to save department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDesig = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/hrms/designations`,
        desigForm,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setIsDesigModalOpen(false);
      setDesigForm({ name: '', department_id: '', description: '', base_salary_min: '15000', base_salary_max: '35000' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Save desig error:', err);
      alert(err.response?.data?.message || 'Failed to save designation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subtab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('DEPARTMENTS')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              activeSubTab === 'DEPARTMENTS'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" /> Store Departments ({departments.length})
          </button>
          <button
            onClick={() => setActiveSubTab('DESIGNATIONS')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              activeSubTab === 'DESIGNATIONS'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Job Designations ({designations.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'DEPARTMENTS' ? (
            <button
              onClick={() => setIsDeptModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Department
            </button>
          ) : (
            <button
              onClick={() => {
                setDesigForm({
                  name: '',
                  department_id: departments[0]?.id || '',
                  description: '',
                  base_salary_min: '15000',
                  base_salary_max: '35000'
                });
                setIsDesigModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Designation
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

      {/* Subtab 1: Departments */}
      {activeSubTab === 'DEPARTMENTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => {
            const memberCount = employees.filter(e => e.department_id === dept.id || e.department === dept.name).length;

            return (
              <div
                key={dept.id}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 text-base">{dept.name}</h4>
                      <p className="text-xs text-slate-400">ID: #{dept.id}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" /> {memberCount} staff
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2">
                  {dept.description || 'Core department handling electronics shop operations and customer experience.'}
                </p>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Designations: {designations.filter(d => d.department_id === dept.id).length} roles</span>
                  <span className="text-emerald-400 font-semibold cursor-pointer hover:underline">View Team →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subtab 2: Designations */}
      {activeSubTab === 'DESIGNATIONS' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Designation / Role</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Base Salary Range</th>
                  <th className="py-3.5 px-4">Staff Count</th>
                  <th className="py-3.5 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {designations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-500">
                      <Briefcase className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                      No designations configured yet.
                    </td>
                  </tr>
                ) : (
                  designations.map((desig) => {
                    const empCount = employees.filter(e => e.designation_id === desig.id || e.designation === desig.name).length;
                    return (
                      <tr key={desig.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-100 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-emerald-400" />
                          {desig.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {desig.department_name || 'General Operations'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                          ₹{parseFloat(desig.base_salary_min || 15000).toLocaleString('en-IN')} - ₹{parseFloat(desig.base_salary_max || 35000).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-xs">
                            {empCount} employees
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400 max-w-[250px] truncate">
                          {desig.description || 'Standard shop designation'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100">Add Department</h3>
              </div>
              <button onClick={() => setIsDeptModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSaveDept} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  placeholder="e.g. Service & Repairs / Home Delivery"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                <textarea
                  rows="3"
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  placeholder="Role and function of this store unit..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Designation Modal */}
      {isDesigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100">Add Designation</h3>
              </div>
              <button onClick={() => setIsDesigModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSaveDesig} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Designation Title *</label>
                <input
                  type="text"
                  required
                  value={desigForm.name}
                  onChange={(e) => setDesigForm({ ...desigForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  placeholder="e.g. Senior TV Specialist / Cashier"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Department</label>
                <select
                  value={desigForm.department_id}
                  onChange={(e) => setDesigForm({ ...desigForm, department_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="">-- No Specific Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Min Salary (₹)</label>
                  <input
                    type="number"
                    value={desigForm.base_salary_min}
                    onChange={(e) => setDesigForm({ ...desigForm, base_salary_min: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Max Salary (₹)</label>
                  <input
                    type="number"
                    value={desigForm.base_salary_max}
                    onChange={(e) => setDesigForm({ ...desigForm, base_salary_max: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDesigModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

