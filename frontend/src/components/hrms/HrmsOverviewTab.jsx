import React from "react";
import {
  Row,
  Col,
  Card,
  CardBody,
  Badge,
  Button,
  Table,
  Spinner,
} from "reactstrap";
import {
  FaUsers,
  FaUserCheck,
  FaUserClock,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaBirthdayCake,
  FaAward,
  FaSync,
  FaCheck,
  FaTimes,
  FaArrowRight,
  FaChartLine,
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

  const navigateTab = onNavigate || setActiveTab || (() => {});
  const refresh = fetchDashboardData || onRefresh || (() => {});

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
      {/* 1. TOP STAT CARDS (6 METRICS ALIGNED) */}
      <Row className="g-3">
        {/* Total Staff */}
        <Col xs={6} sm={4} lg={2}>
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

        {/* Checked In Today */}
        <Col xs={6} sm={4} lg={2}>
          <Card className="border-0 shadow-sm rounded-3 h-100 bg-white">
            <CardBody className="p-3 d-flex flex-column justify-content-between h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small text-muted fw-bold text-uppercase" style={{ fontSize: "0.72rem" }}>
                  Checked In Today
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
        <Col xs={6} sm={4} lg={2}>
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
        <Col xs={6} sm={4} lg={2}>
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
        <Col xs={6} sm={4} lg={2}>
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

        {/* Est. Payroll */}
        <Col xs={6} sm={4} lg={2}>
          <Card
            className="border-0 shadow-sm rounded-3 h-100 bg-white cursor-pointer"
            onClick={() => navigateTab("payroll")}
            style={{ transition: "transform 0.15s ease", cursor: "pointer" }}
          >
            <CardBody className="p-3 d-flex flex-column justify-content-between h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small text-muted fw-bold text-uppercase" style={{ fontSize: "0.72rem" }}>
                  Est. Payroll
                </span>
                <div
                  className="rounded-2 d-flex align-items-center justify-content-center text-success"
                  style={{ width: "32px", height: "32px", backgroundColor: "#ECFDF5" }}
                >
                  <FaMoneyBillWave size={15} />
                </div>
              </div>
              <div className="my-1">
                <h4 className="mb-0 fw-bold text-dark fs-4">
                  ₹{((summary.monthlyPayroll || 0) / 1000).toFixed(1)}k
                </h4>
              </div>
              <div className="mt-auto pt-1">
                <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                  Monthly Gross
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
                    Present vs Late punches over the last 7 days
                  </small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={attendanceDate}
                    onChange={(e) => {
                      setAttendanceDate(e.target.value);
                      refresh(e.target.value);
                    }}
                    style={{ maxWidth: 140, height: "31px" }}
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
                    No attendance records for this week
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

      {/* 3. TODAY'S ATTENDANCE QUICK ACTION + CELEBRATIONS */}
      <Row className="g-3">
        {/* Attendance Table */}
        <Col xs={12} lg={8}>
          <Card className="border-0 shadow-sm rounded-3 bg-white h-100">
            <CardBody className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h6 className="fw-bold mb-0 text-dark">
                      Today's Staff Attendance ({attendanceDate})
                    </h6>
                    <span className="badge bg-success bg-opacity-10 text-success fw-bold" style={{ fontSize: "0.75rem" }}>
                      Checked In: {summary.todayCheckedIn != null ? summary.todayCheckedIn : todayAttendance.filter(e => e.check_in).length} / {summary.activeEmployees || todayAttendance.length} Staff
                    </span>
                  </div>
                  <small className="text-muted">
                    Live employee presence status & quick update
                  </small>
                </div>
                <Button
                  size="sm"
                  color="primary"
                  outline
                  onClick={() => navigateTab("attendance")}
                  className="d-inline-flex align-items-center gap-1 shadow-sm"
                  style={{ height: "31px" }}
                >
                  <span>Full Sheet</span>
                  <FaArrowRight size={10} />
                </Button>
              </div>

              <div
                className="table-responsive"
                style={{ maxHeight: "310px", overflowY: "auto" }}
              >
                <Table hover size="sm" className="align-middle mb-0 text-nowrap">
                  <thead className="table-light sticky-top">
                    <tr style={{ fontSize: "0.8rem" }}>
                      <th style={{ minWidth: "150px" }}>Employee</th>
                      <th style={{ minWidth: "120px" }}>Department</th>
                      <th className="text-center" style={{ minWidth: "105px" }}>Status</th>
                      <th className="text-center" style={{ minWidth: "90px" }}>Check In</th>
                      <th className="text-center" style={{ minWidth: "160px" }}>Quick Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayAttendance.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="text-center py-4 text-muted small"
                        >
                          No attendance marked yet for today
                        </td>
                      </tr>
                    ) : (
                      todayAttendance.slice(0, 10).map((emp) => {
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
                              <small className="text-muted">
                                {emp.employee_code || "EMP"}
                              </small>
                            </td>
                            <td>
                              <span className="badge bg-light text-secondary border">
                                {emp.department}
                              </span>
                            </td>
                            <td className="text-center">
                              <Badge
                                color={badgeColor}
                                pill
                                className="px-2 py-1"
                              >
                                {emp.attendance_status || "Not Marked"}
                              </Badge>
                            </td>
                            <td className="text-center">
                              <small className="text-muted font-monospace fw-semibold">
                                {emp.check_in || "—"}
                              </small>
                            </td>
                            <td className="text-center">
                              <div className="d-inline-flex align-items-center gap-1">
                                <Button
                                  size="sm"
                                  color="success"
                                  outline={!isPresent}
                                  onClick={() =>
                                    handleQuickStatusChange(emp.id, "Present")
                                  }
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
                                  onClick={() =>
                                    handleQuickStatusChange(emp.id, "Late")
                                  }
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
                                  onClick={() =>
                                    handleQuickStatusChange(emp.id, "Absent")
                                  }
                                  title="Mark Absent"
                                  className="py-1 px-2 d-inline-flex align-items-center gap-1"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  <FaTimes size={9} />
                                  <span>Absent</span>
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
                          <div className="fw-semibold small text-dark">
                            {b.name}
                          </div>
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
                          <div className="fw-semibold small text-dark">
                            {a.name}
                          </div>
                          <small className="text-muted">{a.department}</small>
                        </div>
                        <Badge color="primary" pill className="px-2 py-1">
                          {a.years_completed} Year
                          {a.years_completed > 1 ? "s" : ""}
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
    </div>
  );
}
