import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardClock,
  Clock3,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Send,
  UserRound,
} from "lucide-react";
import api from "../utils/api";
import "../style/SalesPersonHrms.css";

const todayDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTime = (value) => (value ? String(value).slice(0, 5) : "--:--");

const attendanceStatusClass = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  const statusClass = {
    present: "present",
    late: "late",
    "half day": "half-day",
    absent: "absent",
    "on leave": "on-leave",
  }[normalized] || "other";
  return `sales-hrms-attendance-status ${statusClass}`;
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)",
};

const inputStyle = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  padding: "10px 12px",
  color: "#0f172a",
  background: "#fff",
};

export default function SalesPersonHrms() {
  const navigate = useNavigate();
  const { tab } = useParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [todayPunch, setTodayPunch] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState({});
  const [attendanceMonth, setAttendanceMonth] = useState(todayDate().slice(0, 7));
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceHistorySummary, setAttendanceHistorySummary] = useState({});
  const [attendanceHistoryLoading, setAttendanceHistoryLoading] = useState(false);
  const [attendanceHistoryError, setAttendanceHistoryError] = useState("");
  const attendanceRequestId = useRef(0);
  const [leaveSummary, setLeaveSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [leaveForm, setLeaveForm] = useState({
    leave_type: "Casual",
    start_date: todayDate(),
    end_date: todayDate(),
    reason: "",
  });
  const activeSection = ["dashboard", "attendance", "leaves"].includes(tab) ? tab : "dashboard";

  useEffect(() => {
    if (tab && !["dashboard", "attendance", "leaves"].includes(tab)) {
      navigate("/hrms/dashboard", { replace: true });
    }
  }, [tab, navigate]);

  const loadPortal = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/hrms/my/summary");
      if (!response.data?.success || !response.data?.data?.profile) {
        throw new Error(response.data?.message || "Could not load your HRMS profile");
      }
      const data = response.data.data;
      setProfile(data.profile);
      setAttendance(data.recentAttendance || []);
      setLeaves(data.recentLeaves || []);
      setTodayPunch(data.todayPunch || null);
      setAttendanceSummary(data.attendanceSummary || {});
      setLeaveSummary(data.leaveSummary || {});
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Could not load your HRMS information");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  const loadAttendanceHistory = useCallback(async () => {
    const requestId = ++attendanceRequestId.current;
    setAttendanceHistoryLoading(true);
    setAttendanceHistoryError("");
    try {
      const response = await api.get("/hrms/my/attendance", { params: { month: attendanceMonth } });
      if (!response.data?.success || !response.data?.data) {
        throw new Error(response.data?.message || "Could not load attendance history");
      }
      if (requestId !== attendanceRequestId.current) return;
      setAttendanceHistory(response.data.data.records || []);
      setAttendanceHistorySummary(response.data.data.summary || {});
    } catch (requestError) {
      if (requestId !== attendanceRequestId.current) return;
      setAttendanceHistoryError(requestError.response?.data?.message || requestError.message || "Could not load attendance history");
    } finally {
      if (requestId === attendanceRequestId.current) setAttendanceHistoryLoading(false);
    }
  }, [attendanceMonth]);

  useEffect(() => {
    if (activeSection === "attendance") loadAttendanceHistory();
  }, [activeSection, loadAttendanceHistory]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePunch = async () => {
    const punchType = todayPunch?.check_in ? "CLOCK_OUT" : "CLOCK_IN";
    setPunching(true);
    setError("");
    setNotice("");
    try {
      const response = await api.post("/hrms/my/punch", { punch_type: punchType });
      setTodayPunch(response.data?.punch || null);
      setNotice(response.data?.message || "Attendance recorded");
      await loadPortal();
      if (activeSection === "attendance") await loadAttendanceHistory();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not record attendance");
    } finally {
      setPunching(false);
    }
  };

  const handleLeaveSubmit = async (event) => {
    event.preventDefault();
    setSubmittingLeave(true);
    setError("");
    setNotice("");
    try {
      const response = await api.post("/hrms/my/leaves", leaveForm);
      setNotice(response.data?.message || "Leave request submitted");
      setLeaveForm((current) => ({ ...current, reason: "" }));
      await loadPortal();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not submit leave request");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeBranchId");
    navigate("/");
  };

  const punchComplete = Boolean(todayPunch?.check_in && todayPunch?.check_out);
  const pendingLeaves = Number(leaveSummary.pending_requests || 0);
  const recordedDays = Number(attendanceSummary.recorded_days || 0);
  const presentDays = Number(attendanceSummary.present_days || 0);
  const lateDays = Number(attendanceSummary.late_days || 0);
  const halfDays = Number(attendanceSummary.half_days || 0);
  const todayLabel = currentTime.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const navItems = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { id: "attendance", label: "My Attendance", Icon: ClipboardClock },
    { id: "leaves", label: "Leaves", Icon: CalendarDays, badge: pendingLeaves },
  ];

  return (
    <div className="sales-hrms-layout">
      <aside className={`sales-hrms-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sales-hrms-brand">
          <img src="/shiva_logo.png" alt="Shiva Electronics" />
          {!sidebarCollapsed && (
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <strong style={{ fontSize: "13.5px", letterSpacing: "0.5px" }}>SHIVA ELECTRONICS</strong>
              <span style={{ fontSize: "11px" }}>Sales Person HRMS</span>
            </div>
          )}
          <button
            type="button"
            className="sales-hrms-collapse"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              background: "rgba(255, 215, 0, 0.08)",
              borderColor: "rgba(255, 215, 0, 0.3)",
              color: "#ffd700"
            }}
          >
            {sidebarCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>
        {!sidebarCollapsed && <div className="sales-hrms-section-label">My Workspace</div>}
        <nav className="sales-hrms-nav" aria-label="Sales Person HRMS">
          {navItems.map(({ id, label, Icon, badge }) => {
            const isActive = activeSection === id;
            return (
              <button
                type="button"
                key={id}
                onClick={() => navigate(`/hrms/${id}`)}
                className={`sales-hrms-nav-item ${isActive ? "active" : ""}`}
                style={{
                  background: isActive ? "linear-gradient(135deg, #ffd700 0%, #d49a00 100%)" : "transparent",
                  color: isActive ? "#08090d" : "#cbd5e1",
                  borderColor: isActive ? "#ffd700" : "transparent"
                }}
                title={label}
              >
                <Icon size={18} style={{ color: isActive ? "#08090d" : "#ffd700" }} />
                {!sidebarCollapsed && <span>{label}</span>}
                {!sidebarCollapsed && badge > 0 && <span className="sales-hrms-nav-badge">{badge}</span>}
              </button>
            );
          })}
        </nav>

        {/* Quick Link to CRM Workstation for Sales Person */}
        <div style={{ padding: "0 12px 10px" }}>
          <button
            type="button"
            onClick={() => navigate("/crm/leads")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: sidebarCollapsed ? "10px 0" : "10px 14px",
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              borderRadius: "11px",
              border: "1px solid rgba(59, 130, 246, 0.35)",
              background: "rgba(59, 130, 246, 0.12)",
              color: "#93c5fd",
              fontSize: "13.5px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            title="Go to CRM Leads & Follow-ups"
          >
            <Briefcase size={17} style={{ color: "#60a5fa", flexShrink: 0 }} />
            {!sidebarCollapsed && <span>CRM Leads Suite &rarr;</span>}
          </button>
        </div>

        <div className="sales-hrms-user">
          <div className="sales-hrms-user-avatar">{(profile?.name || "SP").slice(0, 1).toUpperCase()}</div>
          {!sidebarCollapsed && <div className="sales-hrms-user-name"><strong>{profile?.name || "Sales Person"}</strong><span>Sales Person</span></div>}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="sales-hrms-sidebar-logout"
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            borderColor: "rgba(248, 113, 113, 0.35)",
            color: "#fca5a5"
          }}
          title="Logout"
        >
          <LogOut size={17} style={{ color: "#f87171" }} />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </aside>

      <div className="sales-hrms-workspace">
        <header className="sales-hrms-header">
          <div className="sales-hrms-header-brand">
            <img src="/shiva_logo.png" alt="Shiva Electronics" />
            <div className="sales-hrms-header-title">
              <h1>{navItems.find((item) => item.id === activeSection)?.label || "Dashboard"}</h1>
              <span>{profile?.name ? `${profile.name} · ${profile.employee_code || "Sales Person"}` : "Personal HRMS Portal"}</span>
            </div>
          </div>
          <div className="sales-hrms-header-actions">
            <div className="sales-hrms-clock">
              <Clock3 size={15} />
              <span>{currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>
            <div className="sales-hrms-punch-status">
              <span>Today&apos;s attendance</span>
              <strong>{formatTime(todayPunch?.check_in)} <span>→</span> {formatTime(todayPunch?.check_out)}</strong>
            </div>
            <button
              type="button"
              onClick={handlePunch}
              disabled={punching || loading || punchComplete || profile?.status !== "Active"}
              className={`sales-hrms-punch-button ${todayPunch?.check_in && !punchComplete ? "checkout" : ""}`}
              style={
                todayPunch?.check_in && !punchComplete
                  ? { background: "linear-gradient(135deg, #ffd700 0%, #d49a00 100%)", color: "#08090d", borderColor: "#ffd700" }
                  : (punching || loading || punchComplete || profile?.status !== "Active")
                  ? { background: "#1e293b", color: "#94a3b8", borderColor: "rgba(255,255,255,0.1)" }
                  : { background: "#059669", color: "#ffffff", borderColor: "#10b981" }
              }
            >
              <Clock3 size={16} />
              {punching ? "Recording..." : punchComplete ? "Attendance complete" : todayPunch?.check_in ? "Check out" : "Check in"}
            </button>
            <button
              type="button"
              onClick={loadPortal}
              disabled={loading}
              className="sales-hrms-icon-button"
              style={{
                background: "rgba(255, 215, 0, 0.08)",
                borderColor: "rgba(255, 215, 0, 0.35)",
                color: "#ffd700"
              }}
              title="Refresh"
            >
              <RefreshCw size={17} className={loading ? "sales-hrms-spin" : ""} />
            </button>
          </div>
        </header>

        <main className="sales-hrms-content">
          {error && <div role="alert" style={messageStyle("#b91c1c", "#fee2e2")}><AlertCircle size={17} />{error}</div>}
          {notice && <div role="status" style={messageStyle("#047857", "#d1fae5")}><CheckCircle2 size={17} />{notice}</div>}

          {loading && !profile ? (
            <div style={{ ...cardStyle, textAlign: "center", color: "#64748b" }}>Loading your HRMS profile...</div>
          ) : profile ? (
            <>
              {activeSection === "dashboard" && (
                <>
                  <section className="sales-hrms-welcome">
                    <div className="sales-hrms-welcome-copy">
                      <div className="sales-hrms-welcome-eyebrow">{todayLabel}</div>
                      <h2>Welcome back, {profile.name}</h2>
                      <p>Your personal attendance, leave requests, and employee details in one place.</p>
                      <div className="sales-hrms-welcome-meta">
                        <span><UserRound size={14} />{profile.designation || "Sales Person"}</span>
                        {profile.department && <span>{profile.department}</span>}
                        {profile.employee_code && <span>ID: {profile.employee_code}</span>}
                      </div>
                    </div>
                    <div className="sales-hrms-welcome-status">
                      <span className={profile.status === "Active" ? "online" : "offline"} />
                      {profile.status || "Active"}
                    </div>
                  </section>

                  <div className="sales-hrms-metric-grid">
                    <section style={cardStyle}>
                      <div className="sales-hrms-metric-label"><Clock3 size={17} /> Attendance this month</div>
                      <strong className="sales-hrms-metric-value">{recordedDays}</strong>
                      <span className="sales-hrms-metric-caption">Recorded workdays</span>
                    </section>
                    <section style={cardStyle}>
                      <div className="sales-hrms-metric-label"><CheckCircle2 size={17} /> Present days</div>
                      <strong className="sales-hrms-metric-value">{presentDays + halfDays}</strong>
                      <span className="sales-hrms-metric-caption">{presentDays} present · {halfDays} half day</span>
                    </section>
                    <section style={cardStyle}>
                      <div className="sales-hrms-metric-label"><CalendarDays size={17} /> Pending leave</div>
                      <strong className="sales-hrms-metric-value">{pendingLeaves}</strong>
                      <span className="sales-hrms-metric-caption">{Number(leaveSummary.total_requests || 0)} requests in total</span>
                    </section>
                    <section style={cardStyle}>
                      <div className="sales-hrms-metric-label"><Clock3 size={17} /> Late days</div>
                      <strong className="sales-hrms-metric-value">{lateDays}</strong>
                      <span className="sales-hrms-metric-caption">This month</span>
                    </section>
                  </div>

                  <div className="sales-hrms-dashboard-grid">
                    <section style={cardStyle}>
                      <div className="sales-hrms-card-heading"><Clock3 size={20} color="#b7791f" /><h2>Recent attendance</h2></div>
                      <ProfileDetail label="Today’s check in" value={formatTime(todayPunch?.check_in)} />
                      <ProfileDetail label="Today’s check out" value={formatTime(todayPunch?.check_out)} />
                      <ProfileDetail label="Today’s status" value={todayPunch?.status || "Not checked in"} />
                      {attendance.slice(0, 4).map((record) => (
                        <div className="sales-hrms-dashboard-record" key={record.id}>
                          <span>{formatDate(record.attendance_date)}</span>
                          <strong>{formatTime(record.check_in)} – {formatTime(record.check_out)}</strong>
                          <span>{record.status || "-"}</span>
                        </div>
                      ))}
                      <button type="button" onClick={() => navigate("/hrms/attendance")} className="sales-hrms-text-link">View my attendance</button>
                    </section>

                    <section style={cardStyle}>
                      <div className="sales-hrms-card-heading"><CalendarDays size={20} color="#b7791f" /><h2>Leave overview</h2></div>
                      <ProfileDetail label="Pending" value={Number(leaveSummary.pending_requests || 0)} />
                      <ProfileDetail label="Approved" value={Number(leaveSummary.approved_requests || 0)} />
                      <ProfileDetail label="Approved days" value={Number(leaveSummary.approved_days || 0)} />
                      {leaves.slice(0, 3).map((leave) => (
                        <div className="sales-hrms-dashboard-record" key={leave.id}>
                          <span>{leave.leave_type} · {formatDate(leave.start_date)}</span>
                          <strong className={`sales-hrms-leave-status ${String(leave.status || "").toLowerCase()}`}>{leave.status}</strong>
                        </div>
                      ))}
                      <button type="button" onClick={() => navigate("/hrms/leaves")} className="sales-hrms-text-link">View my leaves</button>
                    </section>

                    <section style={cardStyle}>
                      <div className="sales-hrms-card-heading"><UserRound size={20} color="#b7791f" /><h2>My details</h2></div>
                      <ProfileDetail label="Email" value={profile.email} />
                      <ProfileDetail label="Phone" value={profile.phone} />
                      <ProfileDetail label="Department" value={profile.department} />
                      <ProfileDetail label="Joining date" value={formatDate(profile.joining_date)} />
                    </section>
                  </div>
                </>
              )}

              {activeSection === "attendance" && (
                <section className="sales-hrms-attendance-panel">
                  <div className="sales-hrms-attendance-toolbar">
                    <div className="sales-hrms-card-heading">
                      <Clock3 size={20} color="#b7791f" />
                      <div><h2>My Attendance</h2><p>Review your attendance records by month.</p></div>
                    </div>
                    <div className="sales-hrms-attendance-controls">
                      <label htmlFor="sales-attendance-month">Month</label>
                      <input
                        id="sales-attendance-month"
                        type="month"
                        max={todayDate().slice(0, 7)}
                        value={attendanceMonth}
                        onChange={(event) => {
                          if (event.target.value) setAttendanceMonth(event.target.value);
                        }}
                      />
                      <button type="button" onClick={loadAttendanceHistory} disabled={attendanceHistoryLoading} aria-label="Refresh attendance">
                        <RefreshCw size={16} className={attendanceHistoryLoading ? "sales-hrms-spin" : ""} />
                        Refresh
                      </button>
                    </div>
                  </div>

                  {attendanceHistoryError && <div className="sales-hrms-attendance-error" role="alert">{attendanceHistoryError}</div>}

                  <div className="sales-hrms-attendance-summary">
                    {[
                      ["Recorded days", attendanceHistorySummary.recorded_days],
                      ["Present", attendanceHistorySummary.present_days],
                      ["Late", attendanceHistorySummary.late_days],
                      ["Half day", attendanceHistorySummary.half_days],
                      ["Absent", attendanceHistorySummary.absent_days],
                      ["On leave", attendanceHistorySummary.leave_days],
                    ].map(([label, count]) => (
                      <div className="sales-hrms-attendance-stat" key={label}>
                        <span>{label}</span><strong>{Number(count || 0)}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="sales-hrms-table-wrap">
                    <table className="sales-hrms-table">
                      <thead><tr><th>Date</th><th>Check in</th><th>Check out</th><th>Status</th></tr></thead>
                      <tbody>
                        {attendanceHistoryLoading ? (
                          <tr><td className="sales-hrms-attendance-empty" colSpan={4}>Loading attendance records…</td></tr>
                        ) : attendanceHistory.length ? attendanceHistory.map((record) => (
                          <tr key={record.id}>
                            <td>{formatDate(record.attendance_date)}</td>
                            <td>{formatTime(record.check_in)}</td>
                            <td>{formatTime(record.check_out)}</td>
                            <td><span className={attendanceStatusClass(record.status)}>{record.status || "Not marked"}</span></td>
                          </tr>
                        )) : (
                          <tr><td className="sales-hrms-attendance-empty" colSpan={4}>No attendance records for this month.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeSection === "leaves" && (
                <div className="sales-hrms-summary-grid">
                  <section style={cardStyle}>
                    <div className="sales-hrms-card-heading"><CalendarDays size={20} color="#b7791f" /><h2>Request Leave</h2></div>
                    <form onSubmit={handleLeaveSubmit} style={{ display: "grid", gap: 12 }}>
                      <label style={labelStyle}>Leave type
                        <select value={leaveForm.leave_type} onChange={(event) => setLeaveForm({ ...leaveForm, leave_type: event.target.value })} style={inputStyle}>
                          {["Casual", "Sick", "Earned", "Emergency", "Maternity", "Unpaid"].map((type) => <option key={type}>{type}</option>)}
                        </select>
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <label style={labelStyle}>From
                          <input required type="date" value={leaveForm.start_date} onChange={(event) => setLeaveForm({ ...leaveForm, start_date: event.target.value })} style={inputStyle} />
                        </label>
                        <label style={labelStyle}>To
                          <input required type="date" min={leaveForm.start_date} value={leaveForm.end_date} onChange={(event) => setLeaveForm({ ...leaveForm, end_date: event.target.value })} style={inputStyle} />
                        </label>
                      </div>
                      <label style={labelStyle}>Reason
                        <textarea rows={3} value={leaveForm.reason} onChange={(event) => setLeaveForm({ ...leaveForm, reason: event.target.value })} style={{ ...inputStyle, resize: "vertical" }} placeholder="Add a reason for your request" />
                      </label>
                      <button type="submit" disabled={submittingLeave || profile.status !== "Active"} style={{ ...buttonStyle, justifyContent: "center", background: "#b7791f", color: "#fff", borderColor: "#b7791f" }}>
                        <Send size={15} />{submittingLeave ? "Submitting..." : "Submit leave request"}
                      </button>
                    </form>
                  </section>

                  <section style={cardStyle}>
                    <div className="sales-hrms-card-heading"><CalendarDays size={20} color="#b7791f" /><h2>My Leave Requests</h2></div>
                    {leaves.length ? leaves.map((leave) => (
                      <div key={leave.id} className="sales-hrms-leave-item">
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <strong>{leave.leave_type}</strong>
                          <span className={`sales-hrms-leave-status ${String(leave.status || "").toLowerCase()}`}>{leave.status}</span>
                        </div>
                        <div style={{ color: "#64748b", fontSize: 15, marginTop: 4 }}>
                          {formatDate(leave.start_date)} – {formatDate(leave.end_date)} · {leave.total_days} day(s)
                        </div>
                        {leave.reason && <div style={{ color: "#475569", fontSize: 15, marginTop: 4 }}>{leave.reason}</div>}
                        {leave.rejection_reason && <div style={{ color: "#b91c1c", fontSize: 14, marginTop: 4 }}>Reason: {leave.rejection_reason}</div>}
                      </div>
                    )) : <p style={{ color: "#64748b", fontSize: 14 }}>You have no leave requests yet.</p>}
                  </section>
                </div>
              )}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function ProfileDetail({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid #f1f5f9", fontSize: 16 }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <strong style={{ textAlign: "right", overflowWrap: "anywhere" }}>{value || "-"}</strong>
    </div>
  );
}

const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  border: "1px solid",
  borderRadius: 9,
  padding: "9px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const labelStyle = {
  display: "grid",
  gap: 6,
  color: "#475569",
  fontSize: 15,
  fontWeight: 600,
};

const messageStyle = (color, background) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "11px 14px",
  marginBottom: 14,
  borderRadius: 9,
  color,
  background,
  fontSize: 15,
});
