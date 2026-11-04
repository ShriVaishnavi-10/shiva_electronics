import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  LayoutDashboard, Users, Building2, Clock, Calendar,
  CreditCard, TrendingUp, Receipt, UserPlus, FileText,
  UserCheck, ArrowLeft, RefreshCw, ChevronLeft, ChevronRight,
  Shield, Bell, Sparkles, Store, Search, CheckCircle2,
  Play, Square
} from 'lucide-react';

// Import Modular Tab Components
import HrmsOverviewTab from './hrms/HrmsOverviewTab';
import HrmsDirectoryTab from './hrms/HrmsDirectoryTab';
import HrmsDepartmentsTab from './hrms/HrmsDepartmentsTab';
import HrmsAttendanceTab from './hrms/HrmsAttendanceTab';
import HrmsLeavesTab from './hrms/HrmsLeavesTab';
import HrmsPayrollTab from './hrms/HrmsPayrollTab';
import HrmsPerformanceTab from './hrms/HrmsPerformanceTab';
import HrmsExpensesTab from './hrms/HrmsExpensesTab';
import HrmsRecruitmentTab from './hrms/HrmsRecruitmentTab';
import HrmsReportsTab from './hrms/HrmsReportsTab';
import HrmsEssTab from './hrms/HrmsEssTab';

import '../style/HrmsTheme.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { id: 'attendance', label: 'My Attendance', icon: Clock, badge: null },
  { id: 'reports', label: 'Reports', icon: FileText, badge: null },
  { id: 'leaves', label: 'Leave', icon: Calendar, badge: 'leaves' },
  { id: 'payroll', label: 'Payroll & Payslip', icon: CreditCard, badge: null },
  { id: 'directory', label: 'Employee Directory', icon: Users, badge: null },
  { id: 'departments', label: 'Departments & Roles', icon: Building2, badge: null },
  { id: 'performance', label: 'Sales & Commissions', icon: TrendingUp, badge: 'ERP' },
  { id: 'expenses', label: 'Claims & Advances', icon: Receipt, badge: null },
  { id: 'recruitment', label: 'Recruitment & Jobs', icon: UserPlus, badge: null },
  { id: 'selfservice', label: 'Employee Self-Service', icon: UserCheck, badge: 'ESS' }
];

export default function HrmsDashboard() {
  const navigate = useNavigate();
  const { tab } = useParams();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Core Data States
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [leavesData, setLeavesData] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [incentiveRules, setIncentiveRules] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [advancesData, setAdvancesData] = useState([]);
  const [jobOpenings, setJobOpenings] = useState([]);
  const [candidates, setCandidates] = useState([]);

  // Logged in user & active branch
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : { name: 'Admin', role: 'Super Admin' };
    } catch {
      return { name: 'Admin', role: 'Super Admin' };
    }
  });

  const isCashier = currentUser?.is_cashier || currentUser?.role === 'Cashier' || currentUser?.role_name === 'Cashier';
  const roleLower = String(currentUser?.role_name || currentUser?.role || '').toLowerCase();
  const isSalesPerson = roleLower.includes('sales');
  const isStaffOnly = isSalesPerson || roleLower.includes('staff') || roleLower.includes('employee');
  const isStaff = isCashier || isStaffOnly || currentUser?.is_staff;
  const canReturnToBilling = isCashier || (!isStaffOnly && !currentUser?.is_staff);
  const defaultTab = 'dashboard';
  const activeTab = tab || defaultTab;

  useEffect(() => {
    if (isStaff && (!tab || ['directory', 'departments', 'recruitment'].includes(tab))) {
      navigate('/hrms/dashboard', { replace: true });
    }
  }, [isStaff, tab, navigate]);

  // Live Header Punch Station State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [headerPunching, setHeaderPunching] = useState(false);
  const [localHeaderPunch, setLocalHeaderPunch] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Identify logged in employee record for punch
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

  const todayStr = getLocalDateStr(new Date());
  const effectiveEmpId = currentEmp?.id || currentUser?.employee_id;
  const matchedTodayPunch = attendanceData.find(a => {
    const isEmpMatch = (
      (effectiveEmpId && String(a.employee_id) === String(effectiveEmpId)) ||
      (currentEmp?.user_id && String(a.employee_id) === String(currentEmp.user_id)) ||
      (currentUser?.id && String(a.employee_id) === String(currentUser.id)) ||
      (currentUser?.id && String(a.user_id) === String(currentUser.id))
    );
    if (!isEmpMatch) return false;
    const attDate = getLocalDateStr(a.attendance_date || a.date);
    return attDate === todayStr;
  });

  const todayPunch = localHeaderPunch || matchedTodayPunch;

  const handleHeaderPunch = async (punchType) => {
    const empId = currentEmp?.id || currentUser?.employee_id || currentUser?.id;
    if (!empId) {
      alert("Employee profile not found for attendance punch");
      return;
    }
    setHeaderPunching(true);
    try {
      const headers = getHeaders();
      const res = await axios.post(
        `${BACKEND_URL}/api/hrms/my/punch`,
        {
          employee_id: empId,
          punch_type: punchType
        },
        { headers }
      );
      if (res.data?.punch) {
        const punchObj = res.data.punch;
        setLocalHeaderPunch(punchObj);
        setAttendanceData(prev => {
          const filtered = prev.filter(a => !(
            (String(a.employee_id) === String(empId) || String(a.employee_id) === String(punchObj.employee_id)) && 
            getLocalDateStr(a.attendance_date || a.date) === todayStr
          ));
          return [{
            id: 'temp-' + Date.now(),
            employee_id: punchObj.employee_id || empId,
            attendance_date: todayStr,
            date: todayStr,
            check_in: punchObj.check_in,
            check_out: punchObj.check_out || null,
            status: punchObj.status || 'Present',
            attendance_status: punchObj.status || 'Present'
          }, ...filtered];
        });
      }
      fetchAllHrmsData();
    } catch (err) {
      console.error('Header punch error:', err);
      alert(err.response?.data?.message || 'Failed to record punch');
    } finally {
      setHeaderPunching(false);
    }
  };

  const permittedNavItems = NAV_ITEMS.filter(item => {
    if (!isStaff) return true;
    return ['dashboard', 'attendance', 'reports', 'leaves', 'payroll'].includes(item.id);
  });

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    const branchId = localStorage.getItem('activeBranchId');
    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    if (branchId) h['x-active-branch'] = branchId;
    return h;
  };

  const fetchAllHrmsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const headers = getHeaders();

    try {
      const summaryPromise = axios.get(`${BACKEND_URL}/api/hrms/dashboard-summary`, { headers }).catch(e => ({ data: { data: {} } }));
      const empPromise = axios.get(`${BACKEND_URL}/api/hrms/employees`, { headers }).catch(e => ({ data: { data: [] } }));
      const deptPromise = axios.get(`${BACKEND_URL}/api/hrms/departments`, { headers }).catch(e => ({ data: { data: [] } }));
      const desigPromise = axios.get(`${BACKEND_URL}/api/hrms/designations`, { headers }).catch(e => ({ data: { data: [] } }));
      const attPromise = axios.get(`${BACKEND_URL}/api/hrms/attendance`, { headers }).catch(e => ({ data: { data: [] } }));
      const leavesPromise = axios.get(`${BACKEND_URL}/api/hrms/leaves`, { headers }).catch(e => ({ data: { data: [] } }));
      const payrollPromise = axios.get(`${BACKEND_URL}/api/hrms/payroll`, { headers }).catch(e => ({ data: { data: [] } }));
      const perfPromise = axios.get(`${BACKEND_URL}/api/hrms/performance`, { headers }).catch(e => ({ data: { data: [] } }));
      const rulesPromise = axios.get(`${BACKEND_URL}/api/hrms/performance/incentive-rules`, { headers }).catch(e => ({ data: { data: [] } }));
      const expPromise = axios.get(`${BACKEND_URL}/api/hrms/expenses`, { headers }).catch(e => ({ data: { data: [] } }));
      const advPromise = axios.get(`${BACKEND_URL}/api/hrms/advances`, { headers }).catch(e => ({ data: { data: [] } }));
      const jobsPromise = axios.get(`${BACKEND_URL}/api/hrms/recruitment/jobs`, { headers }).catch(e => ({ data: { data: [] } }));
      const candsPromise = axios.get(`${BACKEND_URL}/api/hrms/recruitment/candidates`, { headers }).catch(e => ({ data: { data: [] } }));

      const [
        sumRes, empRes, deptRes, desigRes, attRes, leaveRes,
        payRes, perfRes, ruleRes, expRes, advRes, jobRes, candRes
      ] = await Promise.all([
        summaryPromise, empPromise, deptPromise, desigPromise, attPromise, leavesPromise,
        payrollPromise, perfPromise, rulesPromise, expPromise, advPromise, jobsPromise, candsPromise
      ]);

      setStats(sumRes.data?.data || null);
      setEmployees(Array.isArray(empRes.data?.data) ? empRes.data.data : []);
      setDepartments(Array.isArray(deptRes.data?.data) ? deptRes.data.data : []);
      setDesignations(Array.isArray(desigRes.data?.data) ? desigRes.data.data : []);
      setAttendanceData(Array.isArray(attRes.data?.data) ? attRes.data.data : []);
      setLeavesData(Array.isArray(leaveRes.data?.data) ? leaveRes.data.data : []);
      setPayrollData(Array.isArray(payRes.data?.data) ? payRes.data.data : []);
      setPerformanceData(Array.isArray(perfRes.data?.data) ? perfRes.data.data : []);
      setIncentiveRules(Array.isArray(ruleRes.data?.data) ? ruleRes.data.data : []);
      setExpensesData(Array.isArray(expRes.data?.data) ? expRes.data.data : []);
      setAdvancesData(Array.isArray(advRes.data?.data) ? advRes.data.data : []);
      setJobOpenings(Array.isArray(jobRes.data?.data) ? jobRes.data.data : []);
      setCandidates(Array.isArray(candRes.data?.data) ? candRes.data.data : []);
    } catch (err) {
      console.error('Failed to load HRMS platform data:', err);
      setError('Could not connect to HRMS services. Please ensure server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllHrmsData();
  }, [fetchAllHrmsData]);

  const handleTabChange = (newTab) => {
    navigate(`/hrms/${newTab}`);
  };

  const handleQuickAttendance = async (employeeId, status) => {
    try {
      const headers = getHeaders();
      await axios.post(`${BACKEND_URL}/api/hrms/attendance`, {
        employee_id: employeeId,
        date: new Date().toISOString().slice(0, 10),
        status: status.toUpperCase(),
        check_in: new Date().toTimeString().slice(0, 5)
      }, { headers });
      fetchAllHrmsData();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to record attendance');
    }
  };

  const pendingLeavesCount = leavesData.filter(l => l.status === 'PENDING').length;

  return (
    <div className="hrms-layout" style={{ display: 'flex', flexDirection: 'row', height: '100vh', width: '100vw', overflow: 'hidden', background: '#f4f6fb' }}>
      {/* 1. SHIVA ELECTRONICS GOLD & OBSIDIAN SIDEBAR */}
      <aside
        className={`hrms-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
        style={{
          width: sidebarCollapsed ? '76px' : '280px',
          minWidth: sidebarCollapsed ? '76px' : '280px',
          maxWidth: sidebarCollapsed ? '76px' : '280px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          background: 'linear-gradient(180deg, #0e121e 0%, #060810 100%)',
          borderRight: '1.5px solid rgba(255, 215, 0, 0.22)',
          boxShadow: '6px 0 25px rgba(0, 0, 0, 0.5)',
          zIndex: 100,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Brand Banner with Company Logo */}
        <div
          className="hrms-sidebar-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: sidebarCollapsed ? '16px 10px' : '16px 18px',
            borderBottom: '1.5px solid rgba(255, 215, 0, 0.2)',
            minHeight: '72px',
          }}
        >
          {!sidebarCollapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
              <img
                src="/shiva_logo.png"
                alt="Shiva Electronics"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  objectFit: 'contain',
                  background: '#FFFFFF',
                  padding: '2px',
                  border: '2px solid #FFD700',
                  boxShadow: '0 2px 12px rgba(255, 215, 0, 0.4)',
                  flexShrink: 0,
                }}
              />
              <div style={{ lineHeight: 1.2, minWidth: 0 }}>
                <div
                  style={{
                    color: '#FFD700',
                    fontWeight: 800,
                    fontSize: '14px',
                    letterSpacing: '1px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  SHIVA ELECTRONICS
                </div>
                <div
                  style={{
                    color: '#94a3b8',
                    fontWeight: 700,
                    fontSize: '10.5px',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                  }}
                >
                  Workforce & HRMS
                </div>
              </div>
            </div>
          ) : (
            <img
              src="/shiva_logo.png"
              alt="Shiva Electronics"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                objectFit: 'contain',
                background: '#FFFFFF',
                padding: '2px',
                border: '2px solid #FFD700',
                boxShadow: '0 2px 10px rgba(255, 215, 0, 0.35)',
                margin: '0 auto',
              }}
            />
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ background: 'transparent', border: 'none', color: '#FFD700', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Back to Billing ERP Button - Only for Cashier and Admin, HIDDEN for Sales Persons / Floor Staff */}
        {canReturnToBilling && (
          <button
            onClick={() => navigate(isCashier ? '/index/salesList' : '/index/overview')}
            className="hrms-billing-return-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: '10px',
              margin: '12px 14px',
              padding: '11px 14px',
              background: 'rgba(255, 215, 0, 0.08)',
              border: '1.5px solid rgba(255, 215, 0, 0.35)',
              color: '#FFD700',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title={isCashier ? "Return to POS Billing Counter" : "Return to Main Admin ERP"}
          >
            <ArrowLeft size={16} />
            {!sidebarCollapsed && <span>{isCashier ? "Return to Billing (POS)" : "Return to Main ERP"}</span>}
          </button>
        )}

        {/* Navigation Menu */}
        <nav
          className="hrms-sidebar-menu"
          style={{
            padding: '12px 12px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
        >
          {!sidebarCollapsed && (
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#94a3b8', fontWeight: 800, padding: '8px 14px 12px' }}>
              HRMS Modules
            </div>
          )}
          {permittedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badgeValue = item.badge === 'leaves' ? pendingLeavesCount : item.badge;

            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`hrms-menu-item ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  textAlign: 'left',
                  gap: '12px',
                  padding: sidebarCollapsed ? '12px 0' : '12px 16px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  marginBottom: '6px',
                  borderRadius: '12px',
                  fontSize: '14.5px',
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  background: isActive ? 'linear-gradient(135deg, #FFD700 0%, #D49A00 100%)' : 'transparent',
                  color: isActive ? '#08090D' : '#e2e8f0',
                  border: isActive ? '1px solid #FFD700' : '1px solid transparent',
                  boxShadow: isActive ? '0 4px 15px rgba(255, 215, 0, 0.35)' : 'none',
                  transition: 'all 0.18s ease'
                }}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon
                  className="hrms-menu-icon"
                  size={19}
                  style={{ color: isActive ? '#08090D' : '#FFD700', flexShrink: 0 }}
                />
                {!sidebarCollapsed && (
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.2px' }}>
                    {item.label}
                  </span>
                )}
                {!sidebarCollapsed && badgeValue && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '10px',
                      background: isActive ? '#08090D' : 'rgba(255, 215, 0, 0.18)',
                      color: isActive ? '#FFD700' : '#FFD700',
                      border: '1px solid rgba(255, 215, 0, 0.35)'
                    }}
                  >
                    {badgeValue}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Footer Profile */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255, 215, 0, 0.18)', background: '#060810' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #FFD700 0%, #D49A00 100%)',
                color: '#08090D',
                fontWeight: 800,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'AD'}
            </div>
            {!sidebarCollapsed && (
              <div style={{ lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#f8fafc' }}>{currentUser.name || 'Store Staff'}</div>
                <div style={{ fontSize: '11px', color: '#FFD700', fontWeight: 600 }}>{currentUser.role || currentUser.role_name || 'Staff Member'}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Top Navbar */}
        <header className="hrms-top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/shiva_logo.png"
              alt="Shiva Electronics Logo"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                objectFit: 'contain',
                background: '#FFFFFF',
                padding: '2px',
                border: '1.5px solid #FFD700',
                boxShadow: '0 2px 10px rgba(255, 215, 0, 0.35)',
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                  {isStaff && activeTab === 'dashboard'
                    ? 'Personal Dashboard'
                    : (NAV_ITEMS.find(n => n.id === activeTab)?.label || 'HRMS Workspace')}
                </h1>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(255, 215, 0, 0.12)',
                    color: '#FFD700',
                    border: '1px solid rgba(255, 215, 0, 0.3)'
                  }}
                >
                  {isStaff ? (isSalesPerson ? 'SALES PORTAL' : 'CASHIER PORTAL') : 'SHIVA ELECTRONICS'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8' }}>
                {isStaff ? 'Personal Attendance, Invoices, Performance & Payroll' : 'Human Resource Management System & Workforce Operations'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Header Punch Station: Check In / Check Out */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 6px 4px 12px',
                borderRadius: '24px',
                background: '#060810',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} style={{ color: '#FFD700' }} />
                <span
                  style={{
                    color: '#f8fafc',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '12px',
                    letterSpacing: '0.5px',
                  }}
                >
                  {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              {!todayPunch?.check_in ? (
                <button
                  onClick={() => handleHeaderPunch('CLOCK_IN')}
                  disabled={headerPunching}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 14px',
                    borderRadius: '18px',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '11.5px',
                    border: 'none',
                    cursor: headerPunching ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                    transition: 'all 0.15s ease',
                  }}
                  title="Punch Check-In for today"
                >
                  <Play size={11} fill="#FFFFFF" />
                  <span>{headerPunching ? 'Recording...' : 'Check In'}</span>
                </button>
              ) : !todayPunch?.check_out ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#34D399',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                    title={`Clocked in at ${todayPunch.check_in}`}
                  >
                    In: {String(todayPunch.check_in || '').slice(0, 5)}
                  </span>
                  <button
                    onClick={() => handleHeaderPunch('CLOCK_OUT')}
                    disabled={headerPunching}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 14px',
                      borderRadius: '18px',
                      background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '11.5px',
                      border: 'none',
                      cursor: headerPunching ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                      transition: 'all 0.15s ease',
                    }}
                    title="Punch Check-Out to conclude today's shift"
                  >
                    <Square size={10} fill="#FFFFFF" />
                    <span>{headerPunching ? 'Recording...' : 'Check Out'}</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '18px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#34D399',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                    title={`Shift: ${String(todayPunch.check_in || '').slice(0, 5)} to ${String(todayPunch.check_out || '').slice(0, 5)}`}
                  >
                    <CheckCircle2 size={12} style={{ color: '#34D399' }} />
                    <span>Shift Done ({String(todayPunch.check_in || '').slice(0, 5)} - {String(todayPunch.check_out || '').slice(0, 5)})</span>
                  </div>
                  <button
                    onClick={() => handleHeaderPunch('CLOCK_IN')}
                    disabled={headerPunching}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#E2E8F0',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      cursor: headerPunching ? 'not-allowed' : 'pointer'
                    }}
                    title="Punch In Again to resume shift"
                  >
                    <Play size={10} fill="#E2E8F0" />
                    <span>{headerPunching ? '...' : 'Punch In Again'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Refresh */}
            <button
              onClick={fetchAllHrmsData}
              disabled={loading}
              className="hrms-outline-gold-btn"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              title="Refresh Data"
            >
              <RefreshCw size={13} className={loading ? 'fa-spin' : ''} />
              <span>Refresh</span>
            </button>

            {/* Total Staff / Personal Employee Badge */}
            {isStaff ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#060810',
                  border: '1px solid rgba(255, 215, 0, 0.25)',
                  fontSize: '12px'
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                <span style={{ color: '#94a3b8' }}>Staff ID:</span>
                <strong style={{ color: '#FFD700', fontFamily: 'monospace' }}>
                  {currentEmp?.employee_code || `#EMP-${currentEmp?.id || '01'}`}
                </strong>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#060810',
                  border: '1px solid rgba(255, 215, 0, 0.25)',
                  fontSize: '12px'
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                <span style={{ color: '#94a3b8' }}>Total Staff:</span>
                <strong style={{ color: '#FFD700', fontFamily: 'monospace' }}>{employees.length}</strong>
              </div>
            )}
          </div>
        </header>

        {/* Workspace Body / Scrollable Area */}
        <div className="hrms-content-area" style={{ flex: 1, background: '#f4f6fb', padding: '24px', overflowY: 'auto', height: '100%', minHeight: 0 }}>
          {error && (
            <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', borderRadius: '10px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{error}</span>
              <button onClick={fetchAllHrmsData} style={{ padding: '4px 8px', background: '#f87171', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                Retry
              </button>
            </div>
          )}

          {/* Module Views */}
          {activeTab === 'dashboard' && (
            isStaff ? (
              <HrmsEssTab
                currentUser={currentUser}
                employees={employees}
                attendanceData={attendanceData}
                leavesData={leavesData}
                payrollData={payrollData}
                performanceData={performanceData}
                expensesData={expensesData}
                advancesData={advancesData}
                onRefresh={fetchAllHrmsData}
                onPunchSuccess={(p) => setLocalHeaderPunch(p)}
              />
            ) : (
              <HrmsOverviewTab
                stats={stats}
                dashboardData={stats}
                loading={loading}
                fetchDashboardData={fetchAllHrmsData}
                employees={employees}
                attendanceData={attendanceData}
                leavesData={leavesData}
                payrollData={payrollData}
                departments={departments}
                onNavigate={handleTabChange}
                setActiveTab={handleTabChange}
                onRefresh={fetchAllHrmsData}
                handleQuickStatusChange={handleQuickAttendance}
              />
            )
          )}

          {activeTab === 'directory' && (
            <HrmsDirectoryTab
              employees={employees}
              departments={departments}
              designations={designations}
              onRefresh={fetchAllHrmsData}
            />
          )}

          {activeTab === 'departments' && (
            <HrmsDepartmentsTab
              departments={departments}
              designations={designations}
              employees={employees}
              onRefresh={fetchAllHrmsData}
            />
          )}

          {activeTab === 'attendance' && (
            <HrmsAttendanceTab
              employees={isStaff ? (currentEmp?.id ? [currentEmp] : employees) : employees}
              attendanceData={isStaff && currentEmp?.id ? attendanceData.filter(a => a.employee_id === currentEmp.id) : attendanceData}
              departments={departments}
              onRefresh={fetchAllHrmsData}
              currentUser={currentUser}
              isStaff={isStaff}
            />
          )}

          {activeTab === 'leaves' && (
            <HrmsLeavesTab
              employees={isStaff ? (currentEmp?.id ? [currentEmp] : employees) : employees}
              leavesData={isStaff && currentEmp?.id ? leavesData.filter(l => l.employee_id === currentEmp.id) : leavesData}
              currentUser={currentUser}
              onRefresh={fetchAllHrmsData}
              isStaff={isStaff}
            />
          )}

          {activeTab === 'payroll' && (
            <HrmsPayrollTab
              employees={isStaff ? (currentEmp?.id ? [currentEmp] : employees) : employees}
              payrollData={isStaff && currentEmp?.id ? payrollData.filter(p => p.employee_id === currentEmp.id) : payrollData}
              onRefresh={fetchAllHrmsData}
              currentUser={currentUser}
              isStaff={isStaff}
            />
          )}

          {activeTab === 'performance' && (
            <HrmsPerformanceTab
              performanceData={performanceData}
              incentiveRules={incentiveRules}
              employees={employees}
              onRefresh={fetchAllHrmsData}
            />
          )}

          {activeTab === 'expenses' && (
            <HrmsExpensesTab
              employees={employees}
              expensesData={expensesData}
              advancesData={advancesData}
              onRefresh={fetchAllHrmsData}
            />
          )}

          {activeTab === 'recruitment' && (
            <HrmsRecruitmentTab
              jobOpenings={jobOpenings}
              candidates={candidates}
              departments={departments}
              onRefresh={fetchAllHrmsData}
            />
          )}

          {activeTab === 'reports' && (
            <HrmsReportsTab
              employees={isStaff ? (currentEmp?.id ? [currentEmp] : employees) : employees}
              attendanceData={isStaff && currentEmp?.id ? attendanceData.filter(a => a.employee_id === currentEmp.id) : attendanceData}
              payrollData={isStaff && currentEmp?.id ? payrollData.filter(p => p.employee_id === currentEmp.id) : payrollData}
              performanceData={isStaff && currentEmp?.id ? performanceData.filter(p => p.employee_id === currentEmp.id) : performanceData}
              expensesData={expensesData}
              departments={departments}
              currentUser={currentUser}
              isStaff={isStaff}
            />
          )}

          {activeTab === 'selfservice' && (
            <HrmsEssTab
              currentUser={currentUser}
              employees={employees}
              attendanceData={attendanceData}
              leavesData={leavesData}
              payrollData={payrollData}
              performanceData={performanceData}
              expensesData={expensesData}
              advancesData={advancesData}
              onRefresh={fetchAllHrmsData}
              onPunchSuccess={(p) => setLocalHeaderPunch(p)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
