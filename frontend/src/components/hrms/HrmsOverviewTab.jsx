import React, { useState } from "react";
import axios from "axios";
import {
  Row,
  Col,
  Card,
  CardBody,
  Badge,
  Button,
  Table,
  Spinner,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Label,
} from "reactstrap";
import {
  FaUsers,
  FaUserCheck,
  FaUserClock,
  FaCalendarAlt,
  FaBirthdayCake,
  FaAward,
  FaSync,
  FaCheck,
  FaTimes,
  FaArrowRight,
  FaClock,
  FaRegCalendarCheck,
} from "react-icons/fa";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function HrmsOverviewTab({
  stats,
  dashboardData,
  loading = false,
  fetchDashboardData,
  onRefresh,
  attendanceDate = new Date().toISOString().slice(0, 10),
  setAttendanceDate = () => {},
  setActiveTab,
  onNavigate,
  handleQuickStatusChange = () => {},
}) {
  const data = dashboardData || stats || {};
  const summary = data.summary || {};
  const weeklyTrend = Array.isArray(data.weeklyTrend) ? data.weeklyTrend : [];
  const departmentBreakdown = Array.isArray(data.departmentBreakdown)
    ? data.departmentBreakdown
    : [];
  const todayAttendance = Array.isArray(data.todayAttendance)
    ? data.todayAttendance
    : [];
  const upcomingBirthdays = Array.isArray(data.upcomingBirthdays)
    ? data.upcomingBirthdays
    : [];
  const upcomingAnniversaries = Array.isArray(data.upcomingAnniversaries)
    ? data.upcomingAnniversaries
    : [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const navigateTab = onNavigate || setActiveTab || (() => {});
  const refresh = fetchDashboardData || onRefresh || (() => {});

  // Modal State for Setting Exact Date & Time
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isSavingTime, setIsSavingTime] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [modalForm, setModalForm] = useState({
    employee_id: "",
    date: attendanceDate || todayStr,
    check_in: "09:30",
    check_out: "19:30",
    status: "Present",
    notes: "",
  });

  const handleOpenTimeModal = (emp) => {
    setSelectedStaff(emp);
    setModalForm({
      employee_id: emp.id,
      date: attendanceDate || todayStr,
      check_in: emp.check_in ? String(emp.check_in).slice(0, 5) : "09:30",
      check_out: emp.check_out ? String(emp.check_out).slice(0, 5) : "",
      status: emp.attendance_status && emp.attendance_status !== "Not Marked" ? emp.attendance_status : "Present",
      notes: emp.attendance_notes || "",
    });
    setIsTimeModalOpen(true);
  };

  const handleSaveModalAttendance = async (e) => {
    e.preventDefault();
    if (!modalForm.employee_id) return;
    setIsSavingTime(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${BACKEND_URL}/api/hrms/attendance`, modalForm, { headers });
      setIsTimeModalOpen(false);
      refresh(attendanceDate);
    } catch (err) {
      console.error("Dashboard attendance save error:", err);
      alert(err.response?.data?.message || "Failed to update attendance");
    } finally {
      setIsSavingTime(false);
    }
  };

  // Helper: Format Date String
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "Today";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Helper: Format Time in 12-hour AM/PM format
  const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return "--:--";
    const clean = String(timeStr).slice(0, 5);
    const [hStr, mStr] = clean.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return clean;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  // Chart: Weekly Trend
  const weeklyLabels = weeklyTrend.map((d) => {
    if (!d.attendance_date) return "";
    const p = d.attendance_date.split("-");
    return `${p[2]}/${p[1]}`;
  });
  const weeklyPresent = weeklyTrend.map((d) => d.present_count || 0);
  const weeklyLate = weeklyTrend.map((d) => d.late_count || 0);

  const weeklyChartData = {
    labels: weeklyLabels,
    datasets: [
      {
        label: "Present",
        data: weeklyPresent,
        backgroundColor: "#10B981",
        borderRadius: 4,
      },
      {
        label: "Late",
        data: weeklyLate,
        backgroundColor: "#F59E0B",
        borderRadius: 4,
      },
    ],
  };

  // Chart: Department Breakdown
  const deptLabels = departmentBreakdown.map((d) => d.department || "General");
  const deptCounts = departmentBreakdown.map((d) => d.count || 0);
  const deptChartData = {
    labels: deptLabels,
    datasets: [
      {
        data: deptCounts,
        backgroundColor: [
          "#3B82F6",
          "#10B981",
          "#F59E0B",
          "#8B5CF6",
          "#EC4899",
          "#6366F1",
        ],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  return (
    <div className="d-flex flex-column gap-3">
      {/* 0. DASHBOARD OVERVIEW DATE NAVIGATION BAR */}
      <Card className="border-0 shadow-sm rounded-3 bg-white">
        <CardBody className="p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-2 d-flex align-items-center justify-content-center text-primary bg-primary bg-opacity-10"
              style={{ width: 36, height: 36 }}
            >
              <FaCalendarAlt size={16} />
            </div>
            <div>
              <div className="fw-bold text-dark fs-6">
                Dashboard Overview Date:{" "}
                <span className="text-primary">{formatDateDisplay(attendanceDate)}</span>
              </div>
              <small className="text-muted">
                Displaying daily metrics, staff attendance, and presence logs for this date
              </small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="d-flex align-items-center gap-1">
              <span className="small text-muted fw-semibold me-1">Date:</span>
              <Input
                type="date"
                bsSize="sm"
                value={attendanceDate}
                onChange={(e) => {
                  setAttendanceDate(e.target.value);
                  refresh(e.target.value);
                }}
                style={{ width: 145, fontSize: "13px", fontWeight: 500 }}
              />
            </div>

            <Button
              size="sm"
              color={attendanceDate === todayStr ? "primary" : "light"}
              className="border fw-semibold"
              onClick={() => {
                setAttendanceDate(todayStr);
                refresh(todayStr);
              }}
            >
              Today
            </Button>

            <Button
              size="sm"
              color="light"
              className="border fw-semibold text-secondary"
              onClick={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                const yStr = y.toISOString().slice(0, 10);
                setAttendanceDate(yStr);
                refresh(yStr);
              }}
            >
              Yesterday
            </Button>

            <Button
              size="sm"
              color="light"
              className="border text-secondary"
              onClick={() => refresh(attendanceDate)}
              title="Refresh Dashboard Summary"
            >
              <FaSync size={11} className={loading ? "fa-spin" : ""} />
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* 1. TOP STAT CARDS (ALIGNED KPI METRICS) */}
      <Row className="g-3">
        {/* Total Staff */}
        <Col xs={6} sm={4} md={true}>
          <Card className="border-0 shadow-sm rounded-3 h-100 bg-white">
            <CardBody className="p-3 d-flex flex-column justify-content-between h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small text-muted fw-bold text-uppercase" style={{ fontSize: "0.72rem" }}>
                  Total Staff
                </span>
                <div
                  className="rounded-2 d-flex align-items-center justify-content-center text-primary"
                  style={{ width: "32px", height: "32px", backgroundColor: "#EFF6FF" }}
                >
                  <FaUsers size={15} />
                </div>
              </div>
              <div className="my-1">
                <h4 className="mb-0 fw-bold text-dark fs-4">
                  {summary.totalEmployees || 0}
                </h4>
              </div>
              <div className="mt-auto pt-1">
                <span className="badge bg-success bg-opacity-10 text-success fw-semibold" style={{ fontSize: "0.72rem" }}>
                  {summary.activeEmployees || 0} Active
                </span>
              </div>
            </CardBody>
          </Card>
        </Col>

<<<<<<< HEAD
        {/* Present on Selected Date */}
        <Col xs={6} sm={4} md={true}>
=======
        {/* Checked In Today */}
        <Col xs={6} sm={4} lg={2}>
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
          <Card className="border-0 shadow-sm rounded-3 h-100 bg-white">
            <CardBody className="p-3 d-flex flex-column justify-content-between h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small text-muted fw-bold text-uppercase" style={{ fontSize: "0.72rem" }}>
<<<<<<< HEAD
                  Present
=======
                  Checked In Today
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
                </span>
                <div
                  className="rounded-2 d-flex align-items-center justify-content-center text-success"
                  style={{ width: "32px", height: "32px", backgroundColor: "#ECFDF5" }}
                >
                  <FaUserCheck size={15} />
                </div>
              </div>
              <div className="my-1">
                <h4 className="mb-0 fw-bold text-success fs-4">
                  {summary.todayCheckedIn != null ? summary.todayCheckedIn : ((summary.todayPresent || 0) + (summary.todayLate || 0) + (summary.todayHalfDay || 0))}
                </h4>
              </div>
              <div className="mt-auto pt-1">
                <span className="badge bg-success bg-opacity-10 text-success fw-semibold" style={{ fontSize: "0.72rem" }}>
                  {summary.todayPresent || 0} On-Time • {summary.todayLate || 0} Late
                </span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Late Arrivals */}
        <Col xs={6} sm={4} md={true}>
          <Card className="border-0 shadow-sm rounded-3 h-100 bg-white">
            <CardBody className="p-3 d-flex flex-column justify-content-between h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small text-muted fw-bold text-uppercase" style={{ fontSize: "0.72rem" }}>
                  Late Arrivals
                </span>
                <div
                  className="rounded-2 d-flex align-items-center justify-content-center text-warning"
                  style={{ width: "32px", height: "32px", backgroundColor: "#FFFBEB" }}
                >
                  <FaUserClock size={15} />
                </div>
              </div>
              <div className="my-1">
                <h4 className="mb-0 fw-bold text-warning fs-4">
                  {summary.todayLate || 0}
                </h4>
              </div>
              <div className="mt-auto pt-1">
                <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                  {summary.todayHalfDay || 0} Half-Day
                </span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* On Leave */}
        <Col xs={6} sm={4} md={true}>
          <Card className="border-0 shadow-sm rounded-3 h-100 bg-white">
            <CardBody className="p-3 d-flex flex-column justify-content-between h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small text-muted fw-bold text-uppercase" style={{ fontSize: "0.72rem" }}>
                  On Leave
                </span>
                <div
                  className="rounded-2 d-flex align-items-center justify-content-center text-info"
                  style={{ width: "32px", height: "32px", backgroundColor: "#F0FDF4" }}
                >
                  <FaCalendarAlt size={15} />
                </div>
              </div>
              <div className="my-1">
                <h4 className="mb-0 fw-bold text-info fs-4">
                  {summary.todayOnLeave || 0}
                </h4>
              </div>
              <div className="mt-auto pt-1">
                <span className="text-danger fw-semibold small" style={{ fontSize: "0.75rem" }}>
                  {summary.todayAbsent || 0} Absent
                </span>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Pending Leaves */}
        <Col xs={6} sm={4} md={true}>
          <Card
            className="border-0 shadow-sm rounded-3 h-100 bg-white cursor-pointer"
            onClick={() => navigateTab("leaves")}
            style={{ transition: "transform 0.15s ease", cursor: "pointer" }}
          >
            <CardBody className="p-3 d-flex flex-column justify-content-between h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small text-muted fw-bold text-uppercase" style={{ fontSize: "0.72rem" }}>
                  Pending Leaves
                </span>
                <div
                  className="rounded-2 d-flex align-items-center justify-content-center text-danger"
                  style={{ width: "32px", height: "32px", backgroundColor: "#FFF1F2" }}
                >
                  <FaCalendarAlt size={15} />
                </div>
              </div>
              <div className="my-1">
                <h4 className="mb-0 fw-bold text-danger fs-4">
                  {summary.pendingLeaves || 0}
                </h4>
              </div>
              <div className="mt-auto pt-1">
                <span className="text-primary fw-bold small d-inline-flex align-items-center gap-1" style={{ fontSize: "0.74rem" }}>
                  Review &rarr;
                </span>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* 2. CHARTS ROW */}
      <Row className="g-3">
        {/* Weekly Attendance Trend */}
        <Col xs={12} lg={8}>
          <Card className="border-0 shadow-sm rounded-3 bg-white h-100">
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <div>
                  <h6 className="fw-bold mb-0 text-dark">Weekly Attendance Trend</h6>
                  <small className="text-muted">
                    Present vs Late punches for the 7 days ending {formatDateDisplay(attendanceDate)}
                  </small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Input
                    type="date"
                    bsSize="sm"
                    value={attendanceDate}
                    onChange={(e) => {
                      setAttendanceDate(e.target.value);
                      refresh(e.target.value);
                    }}
                    style={{ maxWidth: 140, height: "31px", fontSize: "12px" }}
                  />
                  <Button
                    size="sm"
                    outline
                    color="secondary"
                    onClick={() => refresh(attendanceDate)}
                    style={{ height: "31px", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title="Refresh chart data"
                  >
                    <FaSync size={11} className={loading ? "fa-spin" : ""} />
                  </Button>
                </div>
              </div>
              <div style={{ height: "230px" }}>
                {weeklyLabels.length ? (
                  <Bar
                    data={weeklyChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: "top", labels: { boxWidth: 12 } },
                      },
                      scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } },
                      },
                    }}
                  />
                ) : (
                  <div className="text-center py-5 text-muted small">
                    No attendance records for this period
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Department Distribution */}
        <Col xs={12} lg={4}>
          <Card className="border-0 shadow-sm rounded-3 bg-white h-100">
            <CardBody className="p-3">
              <div className="mb-2">
                <h6 className="fw-bold mb-0 text-dark">Department Distribution</h6>
                <small className="text-muted d-block">Active staff breakdown</small>
              </div>
              <div
                style={{ height: "230px" }}
                className="d-flex align-items-center justify-content-center"
              >
                {deptCounts.length ? (
                  <Doughnut
                    data={deptChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "right",
                          labels: { boxWidth: 10, font: { size: 11 } },
                        },
                      },
                    }}
                  />
                ) : (
                  <span className="text-muted small">No department data</span>
                )}
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* 3. STAFF ATTENDANCE TABLE FOR SELECTED DATE + QUICK ACTIONS */}
      <Row className="g-3">
        <Col xs={12} lg={8}>
          <Card className="border-0 shadow-sm rounded-3 bg-white h-100">
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <div>
<<<<<<< HEAD
                  <h6 className="fw-bold mb-0 text-dark">
                    Staff Attendance on {formatDateDisplay(attendanceDate)}
                  </h6>
=======
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h6 className="fw-bold mb-0 text-dark">
                      Today's Staff Attendance ({attendanceDate})
                    </h6>
                    <span className="badge bg-success bg-opacity-10 text-success fw-bold" style={{ fontSize: "0.75rem" }}>
                      Checked In: {summary.todayCheckedIn != null ? summary.todayCheckedIn : todayAttendance.filter(e => e.check_in).length} / {summary.activeEmployees || todayAttendance.length} Staff
                    </span>
                  </div>
>>>>>>> a9269b78077bc55fadb532a8bd8d6f8cb10180ef
                  <small className="text-muted">
                    Instant check-in status, punch time, and direct updates
                  </small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Button
                    size="sm"
                    color="primary"
                    outline
                    onClick={() => navigateTab("attendance")}
                    className="d-inline-flex align-items-center gap-1 shadow-sm"
                    style={{ height: "31px" }}
                  >
                    <span>Full Attendance Register</span>
                    <FaArrowRight size={10} />
                  </Button>
                </div>
              </div>

              <div className="table-responsive" style={{ maxHeight: "330px", overflowY: "auto" }}>
                <Table hover size="sm" className="align-middle mb-0 text-nowrap">
                  <thead className="table-light sticky-top">
                    <tr style={{ fontSize: "0.82rem" }}>
                      <th style={{ minWidth: "150px" }}>Employee</th>
                      <th style={{ minWidth: "120px" }}>Department</th>
                      <th className="text-center" style={{ minWidth: "105px" }}>Status</th>
                      <th className="text-center" style={{ minWidth: "100px" }}>Check In</th>
                      <th className="text-center" style={{ minWidth: "210px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayAttendance.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted small">
                          No active employees or attendance found for this date
                        </td>
                      </tr>
                    ) : (
                      todayAttendance.map((emp) => {
                        const isPresent = emp.attendance_status === "Present";
                        const isLate = emp.attendance_status === "Late";
                        const isLeave = emp.attendance_status === "On Leave";
                        const isAbsent = emp.attendance_status === "Absent";

                        const badgeColor = isPresent
                          ? "success"
                          : isLate
                          ? "warning"
                          : isLeave
                          ? "info"
                          : "danger";

                        return (
                          <tr key={emp.id} style={{ fontSize: "0.85rem" }}>
                            <td>
                              <div className="fw-bold text-dark">{emp.name}</div>
                              <small className="text-muted font-monospace">{emp.employee_code || "EMP"}</small>
                            </td>
                            <td>
                              <span className="badge bg-light text-secondary border">
                                {emp.department || "General"}
                              </span>
                            </td>
                            <td className="text-center">
                              <Badge color={badgeColor} pill className="px-2 py-1">
                                {emp.attendance_status || "Not Marked"}
                              </Badge>
                            </td>
                            <td className="text-center">
                              <span className="font-monospace small px-2 py-0.5 rounded bg-light border text-dark">
                                {emp.check_in ? formatTimeDisplay(emp.check_in) : "—"}
                              </span>
                            </td>
                            <td className="text-center">
                              <div className="d-inline-flex align-items-center gap-1">
                                <Button
                                  size="sm"
                                  color="success"
                                  outline={!isPresent}
                                  onClick={() => handleQuickStatusChange(emp.id, "Present", attendanceDate)}
                                  title="Mark Present"
                                  className="py-1 px-2 d-inline-flex align-items-center gap-1"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  <FaCheck size={9} />
                                  <span>Present</span>
                                </Button>
                                <Button
                                  size="sm"
                                  color="warning"
                                  outline={!isLate}
                                  onClick={() => handleQuickStatusChange(emp.id, "Late", attendanceDate)}
                                  title="Mark Late"
                                  className="py-1 px-2 d-inline-flex align-items-center gap-1"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  <FaUserClock size={9} />
                                  <span>Late</span>
                                </Button>
                                <Button
                                  size="sm"
                                  color="danger"
                                  outline={!isAbsent}
                                  onClick={() => handleQuickStatusChange(emp.id, "Absent", attendanceDate)}
                                  title="Mark Absent"
                                  className="py-1 px-2 d-inline-flex align-items-center gap-1"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  <FaTimes size={9} />
                                  <span>Absent</span>
                                </Button>
                                <Button
                                  size="sm"
                                  color="primary"
                                  outline
                                  onClick={() => handleOpenTimeModal(emp)}
                                  title="Set Exact Date & Time"
                                  className="py-1 px-2 d-inline-flex align-items-center gap-1 border-secondary border-opacity-25"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  <FaClock size={9} />
                                  <span>Time</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Celebrations & Anniversaries */}
        <Col xs={12} lg={4}>
          <div className="d-flex flex-column gap-3 h-100 justify-content-between">
            {/* Birthdays */}
            <Card className="border-0 shadow-sm rounded-3 bg-white flex-fill">
              <CardBody className="p-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div
                    className="p-1.5 rounded bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center"
                    style={{ width: "28px", height: "28px" }}
                  >
                    <FaBirthdayCake size={14} />
                  </div>
                  <h6 className="fw-bold mb-0 text-dark">Upcoming Birthdays</h6>
                </div>
                {upcomingBirthdays.length ? (
                  <div className="d-flex flex-column gap-2 mt-2">
                    {upcomingBirthdays.map((b) => (
                      <div
                        key={b.id}
                        className="d-flex align-items-center justify-content-between p-2 rounded bg-light border"
                      >
                        <div>
                          <div className="fw-semibold small text-dark">{b.name}</div>
                          <small className="text-muted">{b.department}</small>
                        </div>
                        <Badge color="warning" className="text-dark small px-2 py-1">
                          {b.formatted_dob}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <small className="text-muted fst-italic d-block mt-2">
                    No upcoming birthdays this month
                  </small>
                )}
              </CardBody>
            </Card>

            {/* Anniversaries */}
            <Card className="border-0 shadow-sm rounded-3 bg-white flex-fill">
              <CardBody className="p-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div
                    className="p-1.5 rounded bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center"
                    style={{ width: "28px", height: "28px" }}
                  >
                    <FaAward size={14} />
                  </div>
                  <h6 className="fw-bold mb-0 text-dark">Work Anniversaries</h6>
                </div>
                {upcomingAnniversaries.length ? (
                  <div className="d-flex flex-column gap-2 mt-2">
                    {upcomingAnniversaries.map((a) => (
                      <div
                        key={a.id}
                        className="d-flex align-items-center justify-content-between p-2 rounded bg-light border"
                      >
                        <div>
                          <div className="fw-semibold small text-dark">{a.name}</div>
                          <small className="text-muted">{a.department}</small>
                        </div>
                        <Badge color="primary" pill className="px-2 py-1">
                          {a.years_completed} Year{a.years_completed > 1 ? "s" : ""}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <small className="text-muted fst-italic d-block mt-2">
                    No upcoming work anniversaries
                  </small>
                )}
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>

      {/* 4. MODAL: SET EXACT DATE & TIME FROM DASHBOARD */}
      <Modal isOpen={isTimeModalOpen} toggle={() => setIsTimeModalOpen(false)} centered>
        <ModalHeader toggle={() => setIsTimeModalOpen(false)}>
          <div className="d-flex align-items-center gap-2">
            <FaClock className="text-primary" />
            <span className="fw-bold">Record Staff Date & Time</span>
          </div>
        </ModalHeader>
        <form onSubmit={handleSaveModalAttendance}>
          <ModalBody className="p-4 d-flex flex-column gap-3">
            {selectedStaff && (
              <div className="p-2.5 rounded bg-light border d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-bold text-dark">{selectedStaff.name}</div>
                  <small className="text-muted font-monospace">{selectedStaff.employee_code}</small>
                </div>
                <Badge color="info" pill>{selectedStaff.department || "Staff"}</Badge>
              </div>
            )}

            {/* Attendance Date with Shortcuts */}
            <div>
              <div className="d-flex align-items-center justify-content-between mb-1">
                <Label className="small fw-bold text-dark mb-0">Attendance Date *</Label>
                <div className="d-flex gap-1">
                  <Button
                    size="sm"
                    color="light"
                    className="py-0 px-2 border"
                    style={{ fontSize: "11px" }}
                    onClick={() => setModalForm({ ...modalForm, date: todayStr })}
                  >
                    Today
                  </Button>
                  <Button
                    size="sm"
                    color="light"
                    className="py-0 px-2 border"
                    style={{ fontSize: "11px" }}
                    onClick={() => {
                      const y = new Date();
                      y.setDate(y.getDate() - 1);
                      setModalForm({ ...modalForm, date: y.toISOString().slice(0, 10) });
                    }}
                  >
                    Yesterday
                  </Button>
                </div>
              </div>
              <Input
                type="date"
                required
                value={modalForm.date}
                onChange={(e) => setModalForm({ ...modalForm, date: e.target.value })}
              />
            </div>

            {/* Status */}
            <div>
              <Label className="small fw-bold text-dark mb-1">Status *</Label>
              <Input
                type="select"
                value={modalForm.status}
                onChange={(e) => setModalForm({ ...modalForm, status: e.target.value })}
              >
                <option value="Present">Present</option>
                <option value="Late">Late Arrival</option>
                <option value="Half Day">Half Day</option>
                <option value="On Leave">On Leave</option>
                <option value="Absent">Absent</option>
              </Input>
            </div>

            {/* Time Pickers with Presets */}
            <Row className="g-2">
              <Col xs={6}>
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <Label className="small fw-bold text-dark mb-0">Check In Time</Label>
                  <Button
                    size="sm"
                    color="success"
                    outline
                    className="py-0 px-1.5"
                    style={{ fontSize: "10px" }}
                    onClick={() => setModalForm({ ...modalForm, check_in: new Date().toTimeString().slice(0, 5) })}
                  >
                    Now
                  </Button>
                </div>
                <Input
                  type="time"
                  value={modalForm.check_in}
                  onChange={(e) => setModalForm({ ...modalForm, check_in: e.target.value })}
                />
                <div className="d-flex gap-1 mt-1">
                  {["09:00", "09:30", "10:00"].map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      color="light"
                      className="py-0 px-1 border small"
                      style={{ fontSize: "10px" }}
                      onClick={() => setModalForm({ ...modalForm, check_in: t })}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </Col>

              <Col xs={6}>
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <Label className="small fw-bold text-dark mb-0">Check Out Time</Label>
                  <Button
                    size="sm"
                    color="success"
                    outline
                    className="py-0 px-1.5"
                    style={{ fontSize: "10px" }}
                    onClick={() => setModalForm({ ...modalForm, check_out: new Date().toTimeString().slice(0, 5) })}
                  >
                    Now
                  </Button>
                </div>
                <Input
                  type="time"
                  value={modalForm.check_out}
                  onChange={(e) => setModalForm({ ...modalForm, check_out: e.target.value })}
                />
                <div className="d-flex gap-1 mt-1">
                  {["18:30", "19:30", "20:00"].map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      color="light"
                      className="py-0 px-1 border small"
                      style={{ fontSize: "10px" }}
                      onClick={() => setModalForm({ ...modalForm, check_out: t })}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </Col>
            </Row>

            {/* Remarks */}
            <div>
              <Label className="small fw-bold text-dark mb-1">Notes / Remarks</Label>
              <Input
                type="text"
                placeholder="e.g. Approved shift / biometric correction"
                value={modalForm.notes}
                onChange={(e) => setModalForm({ ...modalForm, notes: e.target.value })}
              />
            </div>
          </ModalBody>
          <ModalFooter className="p-3">
            <Button color="secondary" outline size="sm" onClick={() => setIsTimeModalOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" size="sm" type="submit" disabled={isSavingTime}>
              {isSavingTime ? "Saving..." : "Save Attendance"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
