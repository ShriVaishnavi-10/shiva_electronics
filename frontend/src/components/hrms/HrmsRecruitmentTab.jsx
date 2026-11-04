import React, { useState } from 'react';
import {
  UserPlus, Briefcase, Plus, Search, Filter, CheckCircle2,
  XCircle, Clock, Calendar, Mail, Phone, RefreshCw, Award
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function HrmsRecruitmentTab({
  jobOpenings = [],
  candidates = [],
  departments = [],
  onRefresh
}) {
  const [activeSubTab, setActiveSubTab] = useState('CANDIDATES'); // 'JOBS' or 'CANDIDATES'
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Job Form
  const [jobForm, setJobForm] = useState({
    title: '',
    department_id: '',
    vacancies: '2',
    experience_required: '1-3 Years',
    salary_range: '₹18,000 - ₹25,000',
    description: '',
    status: 'OPEN'
  });

  // Candidate Form
  const [candidateForm, setCandidateForm] = useState({
    job_id: '',
    name: '',
    email: '',
    phone: '',
    experience: '2 Years',
    status: 'APPLIED',
    interview_date: '',
    notes: ''
  });

  const handleSaveJob = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/hrms/recruitment/jobs`,
        jobForm,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setIsJobModalOpen(false);
      setJobForm({ title: '', department_id: '', vacancies: '2', experience_required: '1-3 Years', salary_range: '₹18,000 - ₹25,000', description: '', status: 'OPEN' });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save job opening');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCandidate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/hrms/recruitment/candidates`,
        candidateForm,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setIsCandidateModalOpen(false);
      setCandidateForm({ job_id: '', name: '', email: '', phone: '', experience: '2 Years', status: 'APPLIED', interview_date: '', notes: '' });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register candidate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCandidateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${BACKEND_URL}/api/hrms/recruitment/candidates/${id}/status`,
        { status },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update candidate status');
    }
  };

  const getCandidateBadge = (status) => {
    switch (status) {
      case 'HIRED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Hired</span>;
      case 'SELECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Selected</span>;
      case 'INTERVIEW':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">Interview Scheduled</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Rejected</span>;
      case 'APPLIED':
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">New Applicant</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Subtab Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('CANDIDATES')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              activeSubTab === 'CANDIDATES'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Applicant Pipeline ({candidates.length})
          </button>
          <button
            onClick={() => setActiveSubTab('JOBS')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              activeSubTab === 'JOBS'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Store Openings ({jobOpenings.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'CANDIDATES' ? (
            <button
              onClick={() => {
                setCandidateForm({ job_id: jobOpenings[0]?.id || '', name: '', email: '', phone: '', experience: '2 Years', status: 'APPLIED', interview_date: '', notes: '' });
                setIsCandidateModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Candidate
            </button>
          ) : (
            <button
              onClick={() => {
                setJobForm({ title: '', department_id: departments[0]?.id || '', vacancies: '2', experience_required: '1-3 Years', salary_range: '₹18,000 - ₹25,000', description: '', status: 'OPEN' });
                setIsJobModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Post New Job
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

      {/* Subtab 1: Candidates Pipeline */}
      {activeSubTab === 'CANDIDATES' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Candidate Name</th>
                  <th className="py-3.5 px-4">Target Position</th>
                  <th className="py-3.5 px-4">Experience</th>
                  <th className="py-3.5 px-4">Contact Details</th>
                  <th className="py-3.5 px-4">Interview Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Pipeline Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500">
                      <UserPlus className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                      No candidates currently in the recruitment pipeline.
                    </td>
                  </tr>
                ) : (
                  candidates.map((cand) => (
                    <tr key={cand.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                            {cand.name ? cand.name.slice(0, 2).toUpperCase() : 'CD'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-100">{cand.name}</p>
                            <p className="text-xs text-slate-400">ID: #{cand.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-200">{cand.job_title || 'General Store Associate'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 text-xs">
                        {cand.experience || 'Fresher'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 space-y-0.5">
                        <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-emerald-400" /> {cand.phone || '-'}</div>
                        <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-cyan-400" /> {cand.email || '-'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                        {cand.interview_date ? new Date(cand.interview_date).toLocaleDateString('en-IN') : 'Not Scheduled'}
                      </td>
                      <td className="py-3.5 px-4">
                        {getCandidateBadge(cand.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <select
                          value={cand.status}
                          onChange={(e) => handleCandidateStatus(cand.id, e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="APPLIED">Applied</option>
                          <option value="INTERVIEW">Schedule Interview</option>
                          <option value="SELECTED">Select</option>
                          <option value="HIRED">Hire as Staff</option>
                          <option value="REJECTED">Reject</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Open Jobs */}
      {activeSubTab === 'JOBS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobOpenings.map((job) => (
            <div key={job.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-100 text-base">{job.title}</h4>
                  <p className="text-xs text-slate-400">{job.department_name || 'Retail Store'}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  job.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                }`}>
                  {job.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-400">
                <p>Vacancies: <strong className="text-slate-200 font-bold">{job.vacancies} Positions</strong></p>
                <p>Experience: <strong className="text-slate-200">{job.experience_required}</strong></p>
                <p>Salary Range: <strong className="text-emerald-400 font-mono">{job.salary_range}</strong></p>
              </div>

              <p className="text-xs text-slate-400 line-clamp-2 pt-2 border-t border-slate-800/80">
                {job.description || 'Responsible for electronics store presentation and product sales.'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Post Job Modal */}
      {isJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100">Post Store Vacancy</h3>
              </div>
              <button onClick={() => setIsJobModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSaveJob} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  placeholder="e.g. Smart TV Sales Consultant"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Department</label>
                  <select
                    value={jobForm.department_id}
                    onChange={(e) => setJobForm({ ...jobForm, department_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Department --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Vacancies</label>
                  <input
                    type="number"
                    min="1"
                    value={jobForm.vacancies}
                    onChange={(e) => setJobForm({ ...jobForm, vacancies: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Experience</label>
                  <input
                    type="text"
                    value={jobForm.experience_required}
                    onChange={(e) => setJobForm({ ...jobForm, experience_required: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    placeholder="1-3 Years"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Salary Range</label>
                  <input
                    type="text"
                    value={jobForm.salary_range}
                    onChange={(e) => setJobForm({ ...jobForm, salary_range: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    placeholder="₹18k - ₹25k"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Job Description</label>
                <textarea
                  rows="2"
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting...' : 'Publish Vacancy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {isCandidateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100">Add Applicant Candidate</h3>
              </div>
              <button onClick={() => setIsCandidateModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSaveCandidate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Candidate Full Name *</label>
                <input
                  type="text"
                  required
                  value={candidateForm.name}
                  onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  placeholder="e.g. Suresh Kumar"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={candidateForm.phone}
                    onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    placeholder="9876543210"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={candidateForm.email}
                    onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    placeholder="candidate@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Applying For Job</label>
                  <select
                    value={candidateForm.job_id}
                    onChange={(e) => setCandidateForm({ ...candidateForm, job_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select Vacancy --</option>
                    {jobOpenings.map(j => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Experience</label>
                  <input
                    type="text"
                    value={candidateForm.experience}
                    onChange={(e) => setCandidateForm({ ...candidateForm, experience: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    placeholder="2 Years"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Interview Date (Optional)</label>
                <input
                  type="date"
                  value={candidateForm.interview_date}
                  onChange={(e) => setCandidateForm({ ...candidateForm, interview_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCandidateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Add Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

