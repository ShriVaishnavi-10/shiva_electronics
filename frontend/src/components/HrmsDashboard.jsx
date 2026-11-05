import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  LayoutDashboard, Users, Building2, Clock, Calendar,
  CreditCard, TrendingUp, Receipt, UserPlus, FileText,
  UserCheck, ArrowLeft, RefreshCw, ChevronLeft, ChevronRight,
  Shield, Bell, Sparkles, Store, Search, CheckCircle2,
<<<<<<< HEAD
  Play, Square, ChevronDown, BarChart2, ClipboardList, UserCog
=======
  Play, Square, LogOut, Briefcase, CalendarCheck, ExternalLink
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
} from 'lucide-react';

// Import Modular Tab Components
import HrmsOverviewTab from './hrms/HrmsOverviewTab';
import HrmsDirectoryTab from './hrms/HrmsDirectoryTab';
import HrmsAttendanceTab from './hrms/HrmsAttendanceTab';
import HrmsLeavesTab from './hrms/HrmsLeavesTab';
import HrmsReportsTab from './hrms/HrmsReportsTab';

import '../style/HrmsTheme.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
<<<<<<< HEAD
  { id: 'attendance', label: 'Attendance', icon: Clock, badge: null },
=======
  { id: 'crm_leads', label: 'Allocated Leads', icon: Briefcase, badge: 'CRM', path: '/crm/leads?assigned_to=me' },
  { id: 'crm_followups', label: 'Follow-ups', icon: CalendarCheck, badge: 'CRM', path: '/crm/followups?assigned_to=me' },
  { id: 'attendance', label: 'My Attendance', icon: Clock, badge: null },
  { id: 'reports', label: 'Reports', icon: FileText, badge: null },
  { id: 'leaves', label: 'Leave', icon: Calendar, badge: 'leaves' },
  { id: 'payroll', label: 'Payroll & Payslip', icon: CreditCard, badge: null },
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
  { id: 'directory', label: 'Employee Directory', icon: Users, badge: null },
  { id: 'leaves', label: 'Leave', icon: Calendar, badge: 'leaves' },
  { id: 'reports', label: 'Reports', icon: FileText, badge: null }
];

const REPORT_SUB_ITEMS = [
  { id: 'muster',     label: 'Monthly Attendance Summary', icon: BarChart2 },
  { id: 'attendance', label: 'Attendance Register',         icon: ClipboardList },
  { id: 'leaves',     label: 'Leave Audit Report',          icon: CheckCircle2 },
  { id: 'employees',  label: 'Staff Master Directory',      icon: UserCog }
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
  const [notifications, setNotifications] = useState([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Dashboard active attendance date
  const [dashboardDate, setDashboardDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Logged in user & active branch
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : { name: 'Admin', role: 'Super Admin' };
    } catch {
      return { name: 'Admin', role: 'Super Admin' };
    }
  });

  // Identify logged in employee record early
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

  const roleLower = String(currentUser?.role_name || currentUser?.role || '').toLowerCase();
  const desigLower = String(currentEmp?.designation || currentUser?.designation || '').toLowerCase();
  const deptLower = String(currentEmp?.department || currentUser?.department || '').toLowerCase();

  const isCashier = Boolean(currentUser?.is_cashier) ||
    currentUser?.role_id === 8 ||
    roleLower.includes('cashier') ||
    desigLower.includes('cashier') ||
    deptLower.includes('accounts');

  const isSalesPerson = !isCashier && (roleLower.includes('sales') || desigLower.includes('sales'));
  const isStaffOnly = isSalesPerson || roleLower.includes('staff') || roleLower.includes('employee');
  const isStaff = isCashier || isStaffOnly || Boolean(currentUser?.is_staff);
  const canReturnToBilling = isCashier || (!isStaffOnly && !currentUser?.is_staff);
  const defaultTab = 'dashboard';
  const activeTab = tab || defaultTab;

  const validTabs = ['dashboard', 'attendance', 'directory', 'leaves', 'reports'];
  useEffect(() => {
<<<<<<< HEAD
    if (tab && !validTabs.includes(tab)) {
      navigate('/hrms/dashboard', { replace: true });
    }
  }, [tab, navigate]);
=======
    if (isCashier && ['crm_leads', 'crm_followups'].includes(tab)) {
      navigate('/hrms/dashboard', { replace: true });
      return;
    }
    if (isStaff && (!tab || ['directory', 'departments', 'recruitment'].includes(tab))) {
      navigate('/hrms/dashboard', { replace: true });
    }
  }, [isStaff, isCashier, tab, navigate]);
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef

  // Live Header Punch Station State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [headerPunching, setHeaderPunching] = useState(false);
  const [localHeaderPunch, setLocalHeaderPunch] = useState(() => currentUser?.today_punch || null);

  // Reports sub-section state
  const [activeReportType, setActiveReportType] = useState('muster');
  const [reportsExpanded, setReportsExpanded] = useState(true);

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

  // currentEmp resolved above

  const todayStr = getLocalDateStr(new Date());
  const effectiveEmpId = currentEmp?.id || currentUser?.employee_id;
  const matchedTodayPunch = attendanceData.find(a => {
    const isEmpMatch = (
      (effectiveEmpId && String(a.employee_id) === String(effectiveEmpId)) ||
      (currentEmp?.id && String(a.employee_id) === String(currentEmp.id)) ||
      (currentEmp?.user_id && String(a.employee_id) === String(currentEmp.user_id)) ||
      (currentUser?.id && String(a.employee_id) === String(currentUser.id)) ||
      (currentUser?.id && String(a.user_id) === String(currentUser.id)) ||
      (currentEmp?.employee_code && a.employee_code === currentEmp.employee_code) ||
      (currentUser?.employee_code && a.employee_code === currentUser.employee_code)
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

<<<<<<< HEAD
  const permittedNavItems = NAV_ITEMS;
=======
  const permittedNavItems = NAV_ITEMS.filter(item => {
    if (!isStaff) {
      // For Admin: show full HRMS administrative modules; omit personal CRM assigned leads & follow-ups
      return item.id !== 'crm_leads' && item.id !== 'crm_followups';
    }
    if (isCashier) {
      // For Cashier: strictly omit CRM Allocated Leads and CRM Follow-ups
      return item.id !== 'crm_leads' && item.id !== 'crm_followups' &&
        ['dashboard', 'attendance', 'reports', 'leaves', 'payroll'].includes(item.id);
    }
    // For Sales Staff: keep CRM assigned leads & follow-ups workstation links
    return ['dashboard', 'crm_leads', 'crm_followups', 'attendance', 'reports', 'leaves', 'payroll'].includes(item.id);
  });
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeBranchId');
    navigate('/');
  };

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    const branchId = localStorage.getItem('activeBranchId');
    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    if (branchId) h['x-active-branch'] = branchId;
    return h;
  };

  const fetchDashboardSummary = useCallback(async (targetDate = dashboardDate) => {
    try {
      const headers = getHeaders();
      const res = await axios.get(`${BACKEND_URL}/api/hrms/dashboard-summary`, {
        params: { date: targetDate },
        headers
      });
      if (res.data?.success && res.data.data) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.warn('Dashboard summary fetch error:', e);
    }
  }, [dashboardDate]);

  const fetchAllHrmsData = useCallback(async (targetDate = dashboardDate) => {
    setLoading(true);
    setError(null);
    const headers = getHeaders();

    try {
      const summaryPromise = axios.get(`${BACKEND_URL}/api/hrms/dashboard-summary`, {
        params: { date: targetDate || dashboardDate },
        headers
      }).catch(e => ({ data: { data: {} } }));
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
      const punchPromise = axios.get(`${BACKEND_URL}/api/hrms/my/punch-status`, { headers }).catch(e => ({ data: { punch: null } }));
      const notifPromise = axios.get(`${BACKEND_URL}/api/hrms/notifications`, { headers }).catch(e => ({ data: { data: [] } }));

      const [
        sumRes, empRes, deptRes, desigRes, attRes, leaveRes,
        payRes, perfRes, ruleRes, expRes, advRes, jobRes, candRes, punchRes, notifRes
      ] = await Promise.all([
        summaryPromise, empPromise, deptPromise, desigPromise, attPromise, leavesPromise,
        payrollPromise, perfPromise, rulesPromise, expPromise, advPromise, jobsPromise, candsPromise, punchPromise, notifPromise
      ]);

      if (punchRes?.data?.punch) {
        setLocalHeaderPunch(punchRes.data.punch);
      }

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
      setNotifications(Array.isArray(notifRes.data?.data) ? notifRes.data.data : []);
    } catch (err) {
      console.error('Failed to load HRMS platform data:', err);
      setError('Could not connect to HRMS services. Please ensure server is running.');
    } finally {
      setLoading(false);
    }
  }, [dashboardDate]);

  useEffect(() => {
    fetchAllHrmsData();
  }, [fetchAllHrmsData]);

  const handleTabChange = (itemOrId) => {
    if (typeof itemOrId === 'object' && itemOrId?.path) {
      navigate(itemOrId.path);
      return;
    }
    const matched = NAV_ITEMS.find(n => n.id === itemOrId);
    if (matched?.path) {
      navigate(matched.path);
    } else {
      navigate(`/hrms/${itemOrId}`);
    }
  };

  const handleQuickAttendance = async (employeeId, status, targetDate = dashboardDate, checkInTime = null) => {
    try {
      const headers = getHeaders();
<<<<<<< HEAD
      const dateToUse = targetDate || dashboardDate;
      const nowTime = new Date().toTimeString().slice(0, 5);
      await axios.post(`${BACKEND_URL}/api/hrms/attendance`, {
        employee_id: employeeId,
        date: dateToUse,
        status: status,
        check_in: status === 'Absent' ? null : (checkInTime || nowTime)
=======
      const normalizedStatus = (status || '').toUpperCase() === 'PRESENT' ? 'Present' :
                               (status || '').toUpperCase() === 'LATE' ? 'Late' :
                               (status || '').toUpperCase() === 'ABSENT' ? 'Absent' : status;
      await axios.post(`${BACKEND_URL}/api/hrms/attendance`, {
        employee_id: employeeId,
        date: todayStr,
        status: normalizedStatus,
        check_in: new Date().toTimeString().slice(0, 5)
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
      }, { headers });
      fetchDashboardSummary(dateToUse);
      const attRes = await axios.get(`${BACKEND_URL}/api/hrms/attendance`, { headers }).catch(() => null);
      if (attRes?.data?.data) setAttendanceData(attRes.data.data);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to record attendance');
    }
  };

  const pendingLeavesCount = leavesData.filter(l => String(l.status || '').toUpperCase() === 'PENDING').length;

  const markNotificationRead = async (id) => {
    try {
      const headers = getHeaders();
      await axios.put(`${BACKEND_URL}/api/hrms/notifications/${id}/read`, {}, { headers });
      setNotifications(prev => prev.map(n => (id === 'all' || n.id === id ? { ...n, is_read: 1 } : n)));
    } catch (e) {
      console.error('Failed to mark notification read:', e);
    }
  };

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

        {/* Back to Billing ERP Button - Only for Cashier and Admin */}
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

        {/* CRM Workstation Quick Access - For Sales Staff */}
        {!canReturnToBilling && (
          <button
            onClick={() => navigate('/crm/leads?assigned_to=me')}
            className="hrms-billing-return-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: '10px',
              margin: '12px 14px',
              padding: '11px 14px',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(124, 58, 237, 0.2))',
              border: '1.5px solid rgba(96, 165, 250, 0.5)',
              color: '#93c5fd',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Open CRM Workstation (Allocated Leads & Follow-ups)"
          >
            <Briefcase size={16} color="#60a5fa" />
            {!sidebarCollapsed && <span>CRM Allocated Leads</span>}
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
            const isReports = item.id === 'reports';

            return (
              <div key={item.id}>
                {/* Main Nav Button */}
                <button
                  onClick={() => {
                    if (isReports) {
                      // clicking Reports: navigate there AND toggle sub-menu
                      handleTabChange(item.id);
                      setReportsExpanded((prev) => (activeTab === 'reports' ? !prev : true));
                    } else {
                      handleTabChange(item.id);
                    }
                  }}
                  className={`hrms-menu-item ${isActive ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    textAlign: 'left',
                    gap: '12px',
                    padding: sidebarCollapsed ? '12px 0' : '12px 16px',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    marginBottom: isReports && !sidebarCollapsed && reportsExpanded && activeTab === 'reports' ? '2px' : '6px',
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
                  {/* Chevron expand/collapse for Reports */}
                  {!sidebarCollapsed && isReports && (
                    <ChevronDown
                      size={15}
                      style={{
                        color: isActive ? '#08090D' : '#94a3b8',
                        transform: (reportsExpanded && activeTab === 'reports') ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0
                      }}
                    />
                  )}
                </button>

                {/* Sub-items under Reports */}
                {isReports && !sidebarCollapsed && reportsExpanded && activeTab === 'reports' && (
                  <div
                    style={{
                      marginLeft: '14px',
                      paddingLeft: '12px',
                      borderLeft: '2px solid rgba(255, 215, 0, 0.25)',
                      marginBottom: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    {REPORT_SUB_ITEMS.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = activeReportType === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => setActiveReportType(sub.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            width: '100%',
                            textAlign: 'left',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            fontWeight: isSubActive ? 700 : 500,
                            cursor: 'pointer',
                            background: isSubActive ? 'rgba(255, 215, 0, 0.14)' : 'transparent',
                            color: isSubActive ? '#FFD700' : '#94a3b8',
                            border: isSubActive ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid transparent',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <SubIcon size={15} style={{ flexShrink: 0 }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {sub.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Footer Profile & Logout Button */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255, 215, 0, 0.18)', background: '#060810' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{currentUser.name || 'Store Staff'}</div>
                <div style={{ fontSize: '11px', color: '#FFD700', fontWeight: 600 }}>{currentUser.role || currentUser.role_name || 'Staff Member'}</div>
              </div>
            )}
          </div>

          {/* Explicit Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              marginTop: '10px',
              width: '100%',
              padding: sidebarCollapsed ? '8px 0' : '8px 12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              fontSize: '12.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="Sign out of Shiva Workforce & HRMS"
          >
            <LogOut size={14} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Top Navbar */}
        <header className="hrms-top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flexShrink: 1 }}>
            <img
              src="/shiva_logo.png"
              alt="Shiva Electronics Logo"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                objectFit: 'contain',
                background: '#FFFFFF',
                padding: '2px',
                border: '1.5px solid #FFD700',
                boxShadow: '0 2px 10px rgba(255, 215, 0, 0.35)',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                  {isStaff && activeTab === 'dashboard'
                    ? 'Personal Dashboard'
                    : activeTab === 'reports'
                      ? (REPORT_SUB_ITEMS.find(r => r.id === activeReportType)?.label || 'Reports')
                      : (NAV_ITEMS.find(n => n.id === activeTab)?.label || 'HRMS Workspace')}
                </h1>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(255, 215, 0, 0.12)',
                    color: '#FFD700',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.3px'
                  }}
                >
                  {isStaff ? (isCashier ? 'CASHIER PORTAL' : 'SALES PORTAL') : 'SHIVA ELECTRONICS'}
                </span>
              </div>
<<<<<<< HEAD
              <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8' }}>
                'Workforce Attendance, Directory, Leaves & Reports'
=======
              <p
                className="d-none d-xl-block"
                style={{ margin: 0, fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {isStaff ? 'Personal Attendance, Invoices, Performance & Payroll' : 'Human Resource Management System & Workforce Operations'}
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
              </p>
            </div>
          </div>

<<<<<<< HEAD
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Live Digital Clock */}
=======
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'nowrap' }}>
            {/* Header Punch Station: Check In / Check Out */}
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
<<<<<<< HEAD
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: '#060810',
=======
                gap: '8px',
                height: '36px',
                padding: '2px 6px 2px 12px',
                borderRadius: '20px',
                background: '#070a13',
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
                border: '1px solid rgba(255, 215, 0, 0.3)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                flexShrink: 0
              }}
            >
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

            {/* Quick Refresh */}
            <button
              onClick={fetchAllHrmsData}
              disabled={loading}
              className="hrms-outline-gold-btn"
              style={{ height: '36px', padding: '0 12px', fontSize: '12px', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}
              title="Refresh Data"
            >
              <RefreshCw size={13} className={loading ? 'fa-spin' : ''} />
              <span>Refresh</span>
            </button>

            {/* Notification Bell Dropdown */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setNotifDropdownOpen(prev => !prev)}
                className="hrms-outline-gold-btn"
                style={{
                  position: 'relative',
                  height: '36px',
                  width: '36px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: notifDropdownOpen ? 'rgba(255, 215, 0, 0.2)' : undefined
                }}
                title="HRMS Notifications & Leave Alerts"
              >
                <Bell size={15} style={{ color: notifications.some(n => !n.is_read) ? '#FFD700' : '#cbd5e1' }} />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      minWidth: '17px',
                      height: '17px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)'
                    }}
                  >
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '340px',
                    maxHeight: '420px',
                    background: '#0e121e',
                    border: '1.5px solid rgba(255, 215, 0, 0.35)',
                    borderRadius: '16px',
                    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
                      background: 'rgba(255, 215, 0, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Bell size={14} style={{ color: '#FFD700' }} />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFD700' }}>
                        HRMS Alerts
                      </span>
                    </div>
                    {notifications.some(n => !n.is_read) && (
                      <button
                        onClick={() => markNotificationRead('all')}
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ overflowY: 'auto', flex: 1, maxHeight: '340px' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                        No alerts or leave notifications
                      </div>
                    ) : (
                      notifications.slice(0, 15).map(n => {
                        const isLeaveApp = n.type === 'LEAVE_APPLICATION';
                        const isApproved = n.type === 'LEAVE_APPROVED';
                        const isRejected = n.type === 'LEAVE_REJECTED';

                        return (
                          <div
                            key={n.id}
                            style={{
                              padding: '12px 14px',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                              background: !n.is_read ? 'rgba(255, 215, 0, 0.06)' : 'transparent',
                              display: 'flex',
                              gap: '10px',
                              alignItems: 'flex-start',
                              transition: 'background 0.2s'
                            }}
                          >
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isLeaveApp ? 'rgba(245, 158, 11, 0.2)' : isApproved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                color: isLeaveApp ? '#fbbf24' : isApproved ? '#34d399' : '#f87171'
                              }}
                            >
                              <Calendar size={14} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                                {n.title}
                              </p>
                              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '3px 0 6px', lineHeight: '1.4' }}>
                                {n.message}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '10px', color: '#64748b' }}>
                                  {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                </span>
                                {isLeaveApp && (
                                  <button
                                    onClick={() => {
                                      markNotificationRead(n.id);
                                      handleTabChange('leaves');
                                      setNotifDropdownOpen(false);
                                    }}
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      background: 'linear-gradient(135deg, #FFD700 0%, #D49A00 100%)',
                                      color: '#08090D',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Review Leave →
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Total Staff / Personal Employee Badge */}
            {isStaff ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  background: '#070a13',
                  border: '1px solid rgba(255, 215, 0, 0.25)',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
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
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  background: '#070a13',
                  border: '1px solid rgba(255, 215, 0, 0.25)',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                <span style={{ color: '#94a3b8' }}>Total Staff:</span>
                <strong style={{ color: '#FFD700', fontFamily: 'monospace' }}>{employees.length}</strong>
              </div>
            )}

            {/* Direct Logout Button in Header */}
            <button
              onClick={handleLogout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#f87171',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              title="Logout from HRMS"
            >
              <LogOut size={13} />
              <span className="d-none d-sm-inline">Logout</span>
            </button>
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
<<<<<<< HEAD
            <HrmsOverviewTab
              stats={stats}
              dashboardData={stats}
              loading={loading}
              fetchDashboardData={fetchDashboardSummary}
              attendanceDate={dashboardDate}
              setAttendanceDate={(d) => {
                setDashboardDate(d);
                fetchDashboardSummary(d);
              }}
              employees={employees}
              attendanceData={attendanceData}
              leavesData={leavesData}
              departments={departments}
              onNavigate={handleTabChange}
              setActiveTab={handleTabChange}
              onRefresh={() => fetchAllHrmsData(dashboardDate)}
              handleQuickStatusChange={handleQuickAttendance}
            />
=======
            isStaff ? (
              <HrmsEssTab
                currentUser={currentUser}
                isCashier={isCashier}
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
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
          )}

          {activeTab === 'directory' && (
            <HrmsDirectoryTab
              employees={employees}
              departments={departments}
              designations={designations}
              onRefresh={fetchAllHrmsData}
            />
          )}

          {activeTab === 'attendance' && (
            <HrmsAttendanceTab
<<<<<<< HEAD
              employees={employees}
              attendanceData={attendanceData}
=======
              employees={isStaff ? (currentEmp?.id ? [currentEmp] : employees) : employees}
              attendanceData={isStaff && currentEmp?.id ? attendanceData.filter(a => String(a.employee_id) === String(currentEmp.id)) : attendanceData}
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
              departments={departments}
              onRefresh={fetchAllHrmsData}
              currentUser={currentUser}
              isStaff={false}
            />
          )}

          {activeTab === 'leaves' && (
            <HrmsLeavesTab
<<<<<<< HEAD
              employees={employees}
              leavesData={leavesData}
=======
              employees={isStaff ? (currentEmp?.id ? [currentEmp] : employees) : employees}
              leavesData={isStaff && currentEmp?.id ? leavesData.filter(l => String(l.employee_id) === String(currentEmp.id)) : leavesData}
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
              currentUser={currentUser}
              onRefresh={fetchAllHrmsData}
              isStaff={isStaff}
            />
          )}

<<<<<<< HEAD
          {activeTab === 'reports' && (
            <HrmsReportsTab
              employees={employees}
              attendanceData={attendanceData}
=======
          {activeTab === 'payroll' && (
            <HrmsPayrollTab
              employees={isStaff ? (currentEmp?.id ? [currentEmp] : employees) : employees}
              payrollData={isStaff && currentEmp?.id ? payrollData.filter(p => String(p.employee_id) === String(currentEmp.id)) : payrollData}
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
              attendanceData={isStaff && currentEmp?.id ? attendanceData.filter(a => String(a.employee_id) === String(currentEmp.id)) : attendanceData}
              payrollData={isStaff && currentEmp?.id ? payrollData.filter(p => String(p.employee_id) === String(currentEmp.id)) : payrollData}
              performanceData={isStaff && currentEmp?.id ? performanceData.filter(p => String(p.employee_id) === String(currentEmp.id)) : performanceData}
              expensesData={expensesData}
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
              departments={departments}
              currentUser={currentUser}
              isStaff={isStaff}
              initialReportType={activeReportType}
              onReportTypeChange={setActiveReportType}
            />
<<<<<<< HEAD
          )}</div>
=======
          )}

          {activeTab === 'selfservice' && (
            <HrmsEssTab
              currentUser={currentUser}
              isCashier={isCashier}
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
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
      </main>
    </div>
  );
}
