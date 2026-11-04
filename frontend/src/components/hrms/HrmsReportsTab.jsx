import React, { useState } from 'react';
import {
  FileText, Download, Calendar, Filter, Search,
  Users, DollarSign, Clock, TrendingUp, Receipt, Table
} from 'lucide-react';

export default function HrmsReportsTab({
  employees = [],
  attendanceData = [],
  payrollData = [],
  performanceData = [],
  expensesData = [],
  departments = []
}) {
  const [reportType, setReportType] = useState('EMPLOYEES');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate preview data based on report type
  const getReportData = () => {
    switch (reportType) {
      case 'EMPLOYEES':
        return employees.filter(e => {
          const matchesDept = deptFilter === 'ALL' || e.department_name === deptFilter || e.department === deptFilter;
          const matchesSearch = !searchQuery ||
            `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (e.employee_code && e.employee_code.toLowerCase().includes(searchQuery.toLowerCase()));
          return matchesDept && matchesSearch;
        }).map(e => ({
          'Employee Code': e.employee_code || `#${e.id}`,
          'Full Name': `${e.first_name || ''} ${e.last_name || ''}`.trim(),
          'Department': e.department_name || e.department || 'General',
          'Designation': e.designation_name || e.designation || 'Staff',
          'Phone': e.phone || '-',
          'Email': e.email || '-',
          'Employment Type': e.employment_type || 'Full Time',
          'Status': e.status || 'Active',
          'Joining Date': e.joining_date || '-',
          'Base Salary (₹)': e.basic_salary || '0'
        }));

      case 'ATTENDANCE':
        return attendanceData.filter(a => {
          const matchesSearch = !searchQuery ||
            (a.employee_name && a.employee_name.toLowerCase().includes(searchQuery.toLowerCase()));
          return matchesSearch;
        }).map(a => ({
          'Date': a.date ? new Date(a.date).toLocaleDateString('en-IN') : '-',
          'Employee Name': a.employee_name || 'Staff',
          'Employee Code': a.employee_code || `#${a.employee_id}`,
          'Check In': a.check_in || '--:--',
          'Check Out': a.check_out || '--:--',
          'Status': a.status || 'PRESENT',
          'Overtime (Hrs)': a.overtime_hours || '0',
          'Remarks': a.remarks || '-'
        }));

      case 'PAYROLL':
        return payrollData.filter(p => {
          const matchesSearch = !searchQuery ||
            (p.employee_name && p.employee_name.toLowerCase().includes(searchQuery.toLowerCase()));
          return matchesSearch;
        }).map(p => ({
          'Month / Year': `${p.month}/${p.year}`,
          'Employee Name': p.employee_name || 'Staff',
          'Employee Code': p.employee_code || `#${p.employee_id}`,
          'Basic Salary (₹)': p.basic_salary || 0,
          'Allowances (₹)': (parseFloat(p.hra || 0) + parseFloat(p.other_allowances || p.special_allowance || 0)),
          'Incentives (₹)': p.sales_incentives || p.incentives || 0,
          'Gross Pay (₹)': p.gross_salary || 0,
          'Total Deductions (₹)': p.total_deductions || 0,
          'Net Payable (₹)': p.net_salary || 0,
          'Status': p.payment_status || p.status || 'DRAFT'
        }));

      case 'PERFORMANCE':
        return performanceData.filter(p => {
          const matchesSearch = !searchQuery ||
            (p.employee_name && p.employee_name.toLowerCase().includes(searchQuery.toLowerCase()));
          return matchesSearch;
        }).map(p => ({
          'Sales Consultant': p.employee_name || 'Staff',
          'Employee Code': p.employee_code || `#${p.employee_id}`,
          'Sales Target (₹)': p.target_amount || 0,
          'Billed Revenue (₹)': p.actual_sales_amount || p.total_sales || 0,
          'Invoices Billed': p.total_invoices || p.invoice_count || 0,
          'Target Achievement %': `${p.achievement_percent || 0}%`,
          'Eligible Incentive (₹)': p.calculated_incentive || p.eligible_incentive || 0
        }));

      case 'EXPENSES':
        return expensesData.filter(ex => {
          const matchesSearch = !searchQuery ||
            (ex.employee_name && ex.employee_name.toLowerCase().includes(searchQuery.toLowerCase()));
          return matchesSearch;
        }).map(ex => ({
          'Claim Date': ex.claim_date || '-',
          'Employee': ex.employee_name || 'Staff',
          'Category': ex.category || 'OTHER',
          'Amount (₹)': ex.amount || 0,
          'Status': ex.status || 'PENDING',
          'Description': ex.description || '-'
        }));

      default:
        return [];
    }
  };

  const currentRows = getReportData();
  const headers = currentRows.length > 0 ? Object.keys(currentRows[0]) : [];

  const handleExportCSV = () => {
    if (currentRows.length === 0) {
      alert('No data available to export.');
      return;
    }

    const csvContent = [
      headers.join(','),
      ...currentRows.map(row =>
        headers.map(header => {
          let cell = row[header] === undefined || row[header] === null ? '' : String(row[header]);
          cell = cell.replace(/"/g, '""');
          if (cell.search(/("|,|\n)/g) >= 0) {
            cell = `"${cell}"`;
          }
          return cell;
        }).join(',')
      )
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `HRMS_${reportType}_REPORT_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Report Types selector */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { id: 'EMPLOYEES', label: 'Staff Master Directory', icon: Users, count: employees.length },
          { id: 'ATTENDANCE', label: 'Attendance Register', icon: Clock, count: attendanceData.length },
          { id: 'PAYROLL', label: 'Payroll & Payslips', icon: DollarSign, count: payrollData.length },
          { id: 'PERFORMANCE', label: 'Sales & Commission', icon: TrendingUp, count: performanceData.length },
          { id: 'EXPENSES', label: 'Claims & Advances', icon: Receipt, count: expensesData.length }
        ].map(item => {
          const Icon = item.icon;
          const isActive = reportType === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setReportType(item.id)}
              className={`p-4 rounded-2xl text-left border transition-all ${
                isActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950/60 text-slate-300">
                  {item.count}
                </span>
              </div>
              <p className="font-bold text-sm text-slate-100 mt-2">{item.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Audit & compliance log</p>
            </button>
          );
        })}
      </div>

      {/* Control & Export Bar */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {reportType === 'EMPLOYEES' && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-sm text-slate-200 outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          )}

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter preview data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 pl-9 pr-3 py-2 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" /> Export CSV Report
        </button>
      </div>

      {/* Dynamic Table Preview */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-emerald-400" />
            <h4 className="font-bold text-slate-200 text-sm">
              Live Report Preview ({currentRows.length} Records)
            </h4>
          </div>
          <span className="text-xs text-slate-500">Official Electronics Store HR Format</span>
        </div>

        <div className="overflow-x-auto max-h-[550px]">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800 sticky top-0 backdrop-blur-md">
              <tr>
                {headers.map(header => (
                  <th key={header} className="py-3 px-4 font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length || 1} className="py-12 text-center text-slate-500 font-sans">
                    No data matching filter criteria.
                  </td>
                </tr>
              ) : (
                currentRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    {headers.map(header => (
                      <td key={header} className="py-3 px-4 whitespace-nowrap">
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
