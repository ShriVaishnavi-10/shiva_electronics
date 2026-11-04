import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserFriends,
  FaFunnelDollar,
  FaCheckCircle,
  FaClock,
  FaPlus,
  FaPhoneAlt,
  FaCalendarAlt,
  FaFileAlt,
  FaFilter,
  FaArrowUp,
  FaArrowDown,
  FaStore,
  FaGlobe,
  FaWhatsapp,
  FaComments,
  FaInfoCircle,
  FaHandshake,
  FaChevronRight
} from "react-icons/fa";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "reactstrap";

const CrmDashboard = () => {
  const [activeModuleModal, setActiveModuleModal] = useState(null);

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = storedUser.name || storedUser.username || "Admin";

  // KPI Metrics data
  const kpiData = [
    {
      title: "Total Inquiries & Leads",
      value: "154",
      subtext: "18 added this week",
      trend: "+14.8%",
      isPositive: true,
      icon: FaUserFriends,
      color: "#2563eb",
      bgColor: "#eff6ff"
    },
    {
      title: "Active Pipeline Value",
      value: "₹24,85,000",
      subtext: "38 active opportunities",
      trend: "+8.2%",
      isPositive: true,
      icon: FaFunnelDollar,
      color: "#7c3aed",
      bgColor: "#f5f3ff"
    },
    {
      title: "Deals Closed Won",
      value: "₹18,40,000",
      subtext: "68% conversion rate",
      trend: "+12.4%",
      isPositive: true,
      icon: FaCheckCircle,
      color: "#10b981",
      bgColor: "#ecfdf5"
    },
    {
      title: "Follow-ups Due Today",
      value: "12 Pending",
      subtext: "4 high priority calls",
      trend: "Immediate",
      isPositive: false,
      icon: FaClock,
      color: "#f59e0b",
      bgColor: "#fffbeb"
    }
  ];

  // Pipeline Stages
  const pipelineStages = [
    { name: "New Leads", count: 48, value: "₹4,80,000", color: "#3b82f6", badgeBg: "#dbeafe" },
    { name: "Contacted", count: 32, value: "₹6,20,000", color: "#6366f1", badgeBg: "#e0e7ff" },
    { name: "Proposal Sent", count: 24, value: "₹7,10,000", color: "#8b5cf6", badgeBg: "#ede9fe" },
    { name: "In Negotiation", count: 14, value: "₹3,95,000", color: "#f59e0b", badgeBg: "#fef3c7" },
    { name: "Closed Won", count: 36, value: "₹18,40,000", color: "#10b981", badgeBg: "#d1fae5" }
  ];

  // Sample Recent Leads
  const recentLeads = [
    {
      id: "LD-1042",
      name: "Rajesh Kumar",
      phone: "+91 98452 11204",
      product: "Sony Bravia 55' 4K OLED + Soundbar",
      stage: "Proposal Sent",
      stageColor: "#8b5cf6",
      stageBg: "#ede9fe",
      rep: "Karthik R.",
      value: "₹1,15,000",
      source: "Showroom Visit"
    },
    {
      id: "LD-1043",
      name: "Suresh Enterprises (Pvt Ltd)",
      phone: "+91 94432 99810",
      product: "5x Daikin 1.5T Inverter ACs (Bulk)",
      stage: "In Negotiation",
      stageColor: "#f59e0b",
      stageBg: "#fef3c7",
      rep: "Anitha M.",
      value: "₹2,35,000",
      source: "Phone Inquiry"
    },
    {
      id: "LD-1044",
      name: "Dr. Kavitha Sundaram",
      phone: "+91 98410 44219",
      product: "Bosch Front Load Washer & Refrigerator",
      stage: "Contacted",
      stageColor: "#6366f1",
      stageBg: "#e0e7ff",
      rep: "Vignesh K.",
      value: "₹92,000",
      source: "Website / WhatsApp"
    },
    {
      id: "LD-1045",
      name: "Praveen Varma",
      phone: "+91 97890 33120",
      product: "LG Double Door Refrigerator 420L",
      stage: "New Lead",
      stageColor: "#3b82f6",
      stageBg: "#dbeafe",
      rep: "Unassigned",
      value: "₹54,000",
      source: "Showroom Visit"
    },
    {
      id: "LD-1046",
      name: "Green Valley Tech Hub",
      phone: "+91 98840 88201",
      product: "Samsung 65' Commercial Display Panel",
      stage: "Closed Won",
      stageColor: "#10b981",
      stageBg: "#d1fae5",
      rep: "Karthik R.",
      value: "₹1,48,000",
      source: "Referral"
    }
  ];

  // Sample Today's Follow-ups
  const scheduledFollowups = [
    {
      time: "11:30 AM",
      title: "Call Rajesh Kumar re: Soundbar Combo Quotation",
      type: "Call",
      rep: "Karthik R.",
      priority: "High",
      icon: FaPhoneAlt,
      iconColor: "#2563eb",
      bgColor: "#eff6ff"
    },
    {
      time: "02:00 PM",
      title: "Showroom demo for Dr. Kavitha Sundaram",
      type: "Meeting",
      rep: "Vignesh K.",
      priority: "Medium",
      icon: FaCalendarAlt,
      iconColor: "#7c3aed",
      bgColor: "#f5f3ff"
    },
    {
      time: "04:30 PM",
      title: "Send revised bulk discount quote to Suresh Enterprises",
      type: "Proposal",
      rep: "Anitha M.",
      priority: "Urgent",
      icon: FaFileAlt,
      iconColor: "#f59e0b",
      bgColor: "#fffbeb"
    }
  ];

  // Lead Sources
  const leadSources = [
    { source: "Showroom Walk-ins", share: 44, count: 68, icon: FaStore, color: "#2563eb" },
    { source: "WhatsApp & Phone Inquiries", share: 26, count: 40, icon: FaWhatsapp, color: "#10b981" },
    { source: "Website & Digital Leads", share: 18, count: 28, icon: FaGlobe, color: "#7c3aed" },
    { source: "Customer Referrals", share: 12, count: 18, icon: FaUserFriends, color: "#f59e0b" }
  ];

  const handleActionClick = (moduleName) => {
    setActiveModuleModal(moduleName);
  };

  return (
    <div className="crm-content-scroll">
      {/* Welcome Banner */}
      <div className="crm-welcome-banner">
        <div>
          <div className="crm-welcome-title">
            <span>Welcome to Shiva CRM Suite</span>
            <span style={{ fontSize: "12px", background: "rgba(59, 130, 246, 0.25)", color: "#93c5fd", padding: "4px 10px", borderRadius: "12px", fontWeight: "600" }}>
              v1.0 Architecture
            </span>
          </div>
          <p className="crm-welcome-subtitle">
            Dedicated Customer Relationship Management portal for Shiva Electronics. Track inquiries, manage deal pipelines, schedule customer follow-ups, and accelerate conversions.
          </p>
        </div>

        <div className="crm-welcome-actions">
          <button
            className="crm-btn-primary"
            onClick={() => navigate("/crm/leads/new")}
          >
            <FaPlus size={12} />
            <span>Add New Lead</span>
          </button>
          <button
            className="crm-btn-secondary"
            onClick={() => handleActionClick("Schedule Follow-up")}
          >
            <FaCalendarAlt size={12} />
            <span>Schedule Follow-up</span>
          </button>
        </div>
      </div>

      {/* CRM Readiness Notice */}
      <div className="crm-ready-banner">
        <div className="crm-ready-icon">
          <FaHandshake />
        </div>
        <div>
          <div className="crm-ready-title">CRM Structure & Dedicated Navigation Ready</div>
          <p className="crm-ready-desc">
            The CRM dashboard layout and dedicated sidebar structure have been successfully established. All existing admin panel features remain completely unchanged. You can now provide the detailed requirements for each CRM module (Leads, Deals, Activities, Customers, etc.) one by one.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="crm-kpi-grid">
        {kpiData.map((kpi, idx) => {
          const IconComp = kpi.icon;
          return (
            <div key={idx} className="crm-kpi-card">
              <div className="crm-kpi-header">
                <span className="crm-kpi-label">{kpi.title}</span>
                <div
                  className="crm-kpi-icon-wrap"
                  style={{ backgroundColor: kpi.bgColor, color: kpi.color }}
                >
                  <IconComp />
                </div>
              </div>
              <div className="crm-kpi-value">{kpi.value}</div>
              <div className="crm-kpi-footer">
                <span className={kpi.isPositive ? "crm-trend-up" : "crm-trend-down"}>
                  {kpi.isPositive ? <FaArrowUp size={11} /> : <FaClock size={11} />}
                  {kpi.trend}
                </span>
                <span>• {kpi.subtext}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline Stage Tracker */}
      <div className="crm-pipeline-section">
        <div className="crm-section-header">
          <div>
            <h3 className="crm-section-title">
              <FaFunnelDollar className="text-primary" />
              <span>Deal Pipeline & Opportunity Funnel</span>
            </h3>
            <p className="crm-section-subtitle">
              Overview of active electronics inquiries moving across customer sales stages
            </p>
          </div>
          <button
            className="btn btn-sm btn-outline-primary"
            style={{ borderRadius: "8px", fontSize: "12px", fontWeight: "600" }}
            onClick={() => handleActionClick("Pipeline Funnel Configuration")}
          >
            Configure Stages
          </button>
        </div>

        <div className="crm-stages-container">
          {pipelineStages.map((stage, idx) => (
            <div
              key={idx}
              className="crm-stage-card"
              onClick={() => handleActionClick(`Pipeline Stage: ${stage.name}`)}
              style={{ cursor: "pointer" }}
            >
              <div className="crm-stage-top">
                <span
                  className="crm-stage-badge"
                  style={{ backgroundColor: stage.badgeBg, color: stage.color }}
                >
                  Stage {idx + 1}
                </span>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                  {stage.count} Deals
                </span>
              </div>
              <div className="crm-stage-title">{stage.name}</div>
              <div className="crm-stage-val">{stage.value}</div>
              <div className="crm-stage-count">Avg cycle: {(idx + 1) * 2} days</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="crm-grid-columns">
        {/* Left Column: Recent Leads Queue */}
        <div className="crm-card">
          <div className="crm-section-header">
            <div>
              <h3 className="crm-section-title">
                <FaUserFriends className="text-primary" />
                <span>Recent Leads & Customer Inquiries</span>
              </h3>
              <p className="crm-section-subtitle">
                Latest customer prospects requiring response or quotation
              </p>
            </div>
            <button
              className="btn btn-sm btn-light border"
              style={{ fontSize: "12px", borderRadius: "8px" }}
              onClick={() => navigate("/crm/leads")}
            >
              View All Leads
            </button>
          </div>

          <div className="table-responsive">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Lead Details</th>
                  <th>Product Interest</th>
                  <th>Est. Value</th>
                  <th>Pipeline Stage</th>
                  <th>Assigned Rep</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="crm-lead-name">{lead.name}</div>
                      <div className="crm-lead-sub">{lead.phone} • {lead.source}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: "12.5px", color: "#334155" }}>
                        {lead.product}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: "700", color: "#0f172a" }}>
                        {lead.value}
                      </span>
                    </td>
                    <td>
                      <span
                        className="crm-status-pill"
                        style={{ backgroundColor: lead.stageBg, color: lead.stageColor }}
                      >
                        {lead.stage}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "#475569" }}>
                        {lead.rep}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-secondary py-1 px-2"
                        style={{ fontSize: "11px", borderRadius: "6px" }}
                        onClick={() => handleActionClick(`Lead Details: ${lead.name}`)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Follow-ups & Lead Sources */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Scheduled Follow-ups */}
          <div className="crm-card">
            <div className="crm-section-header">
              <div>
                <h3 className="crm-section-title">
                  <FaClock className="text-warning" />
                  <span>Today's Follow-ups</span>
                </h3>
                <p className="crm-section-subtitle">Pending customer touchpoints</p>
              </div>
              <button
                className="btn btn-sm btn-light border"
                style={{ fontSize: "11.5px", borderRadius: "6px" }}
                onClick={() => handleActionClick("Add Follow-up")}
              >
                + New
              </button>
            </div>

            <div className="crm-timeline-list">
              {scheduledFollowups.map((item, index) => {
                const ItemIcon = item.icon;
                return (
                  <div key={index} className="crm-timeline-item">
                    <div
                      className="crm-timeline-icon"
                      style={{ backgroundColor: item.bgColor, color: item.iconColor }}
                    >
                      <ItemIcon />
                    </div>
                    <div className="crm-timeline-content">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>
                          {item.time}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "700",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            backgroundColor: item.priority === "Urgent" ? "#fee2e2" : "#fef3c7",
                            color: item.priority === "Urgent" ? "#b91c1c" : "#b45309"
                          }}
                        >
                          {item.priority}
                        </span>
                      </div>
                      <div className="crm-timeline-title">{item.title}</div>
                      <div className="crm-timeline-sub">Assigned: {item.rep}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lead Source Breakdown */}
          <div className="crm-card">
            <div className="crm-section-header">
              <div>
                <h3 className="crm-section-title">
                  <FaStore className="text-info" />
                  <span>Lead Acquisition Channels</span>
                </h3>
                <p className="crm-section-subtitle">Where customer prospects originate</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {leadSources.map((src, idx) => {
                const SrcIcon = src.icon;
                return (
                  <div key={idx}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "5px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600", color: "#334155" }}>
                        <SrcIcon color={src.color} size={13} />
                        {src.source}
                      </span>
                      <span style={{ fontWeight: "700", color: "#0f172a" }}>
                        {src.count} ({src.share}%)
                      </span>
                    </div>
                    <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${src.share}%`,
                          height: "100%",
                          background: src.color,
                          borderRadius: "10px"
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Action / Placeholder Modal */}
      <Modal isOpen={!!activeModuleModal} toggle={() => setActiveModuleModal(null)} centered>
        <ModalHeader toggle={() => setActiveModuleModal(null)}>
          <span className="text-primary font-weight-bold">
            CRM Module Setup Ready
          </span>
        </ModalHeader>
        <ModalBody>
          <div className="text-center py-3">
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "#eff6ff",
                color: "#2563eb",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                marginBottom: "16px"
              }}
            >
              <FaHandshake />
            </div>
            <h5 className="font-weight-bold text-dark mb-2">
              {activeModuleModal}
            </h5>
            <p className="text-muted" style={{ fontSize: "13.5px", lineHeight: "1.6" }}>
              The CRM layout, sidebar routing, and dashboard structure are completely set up!
              <br />
              This module container is ready. You can specify the exact requirements, form fields, and workflows for this module, and we will implement it step by step.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={() => setActiveModuleModal(null)} style={{ borderRadius: "8px" }}>
            Got it, ready for requirements
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default CrmDashboard;
