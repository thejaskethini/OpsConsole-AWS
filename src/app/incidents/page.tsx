"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  Flame,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  RefreshCw,
  User,
  Sparkles,
  X,
  ExternalLink,
  ChevronRight,
  Activity,
  Tag,
} from "lucide-react";
import { useIdentity } from "@/components/identity/IdentityProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  DetectionSource,
  IncidentStats,
  CreateIncidentInput,
} from "@/modules/incidents";

// ─── Severity Pill Badge ─────────────────────────────────────────────────────

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const configs: Record<IncidentSeverity, { bg: string; text: string; border: string; glow: string }> = {
    SEV1: {
      bg: "bg-rose-500/15",
      text: "text-rose-400",
      border: "border-rose-500/30",
      glow: "shadow-[0_0_10px_rgba(244,63,94,0.25)]",
    },
    SEV2: {
      bg: "bg-orange-500/15",
      text: "text-orange-400",
      border: "border-orange-500/30",
      glow: "shadow-[0_0_10px_rgba(249,115,22,0.25)]",
    },
    SEV3: {
      bg: "bg-amber-500/15",
      text: "text-amber-400",
      border: "border-amber-500/30",
      glow: "shadow-[0_0_8px_rgba(245,158,11,0.2)]",
    },
    SEV4: {
      bg: "bg-slate-500/15",
      text: "text-slate-300",
      border: "border-slate-500/30",
      glow: "shadow-none",
    },
  };

  const conf = configs[severity] || configs.SEV4;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono tracking-wider uppercase border ${conf.bg} ${conf.text} ${conf.border} ${conf.glow}`}
    >
      {severity}
    </span>
  );
}

// ─── Status Pill Badge ───────────────────────────────────────────────────────

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const configs: Record<IncidentStatus, { bg: string; text: string; border: string; dot: string }> = {
    OPEN: {
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      border: "border-rose-500/25",
      dot: "bg-rose-400 animate-pulse-subtle",
    },
    ACKNOWLEDGED: {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/25",
      dot: "bg-blue-400",
    },
    INVESTIGATING: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/25",
      dot: "bg-amber-400 animate-pulse-subtle",
    },
    MITIGATED: {
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/25",
      dot: "bg-purple-400",
    },
    RESOLVED: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/25",
      dot: "bg-emerald-400",
    },
  };

  const conf = configs[status] || configs.OPEN;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${conf.bg} ${conf.text} ${conf.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
      {status}
    </span>
  );
}

// ─── Detection Source Badge ─────────────────────────────────────────────────

export function DetectionBadge({ source }: { source: DetectionSource }) {
  const configs: Record<DetectionSource, { color: string; label: string }> = {
    ALERT: { color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", label: "Alert" },
    SLO: { color: "text-purple-400 bg-purple-500/10 border-purple-500/20", label: "SLO" },
    MANUAL: { color: "text-amber-400 bg-amber-500/10 border-amber-500/20", label: "Manual" },
    SYSTEM: { color: "text-slate-300 bg-slate-500/10 border-slate-500/20", label: "System" },
  };

  const conf = configs[source] || configs.MANUAL;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${conf.color}`}>
      {conf.label}
    </span>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function IncidentsPage() {
  const { workspace, activeEnvironment } = useIdentity();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    severity: IncidentSeverity;
    affectedService: string;
    detectionSource: DetectionSource;
    summary: string;
    primaryAlertId?: string;
  }>({
    title: "",
    description: "",
    severity: "SEV2",
    affectedService: "srv-orders-api",
    detectionSource: "MANUAL",
    summary: "",
  });

  // Check URL query on client mount for declare=true prefill
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("declare") === "true") {
        const titleParam = sp.get("title") || "";
        const alertIdParam = sp.get("alertId") || "";
        const serviceIdParam = sp.get("serviceId") || "srv-orders-api";
        const severityParam = (sp.get("severity") as IncidentSeverity) || "SEV2";

        setFormData({
          title: titleParam ? `Incident: ${titleParam}` : "",
          description: alertIdParam
            ? `Declared in response to firing alert: ${alertIdParam}`
            : "",
          severity: severityParam,
          affectedService: serviceIdParam,
          detectionSource: alertIdParam ? "ALERT" : "MANUAL",
          summary: titleParam ? `Observed firing alert on ${serviceIdParam}` : "",
          primaryAlertId: alertIdParam || undefined,
        });
        setShowCreateModal(true);
      }
    }
  }, []);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (workspace?.id) params.set("workspaceId", workspace.id);
      if (activeEnvironment?.id) params.set("environmentId", activeEnvironment.id);

      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (severityFilter !== "ALL") params.set("severity", severityFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/incidents?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load incidents");
      }
      const data = await res.json();
      setIncidents(data.incidents || []);
      setStats(data.stats || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading incidents");
    } finally {
      setLoading(false);
    }
  }, [workspace?.id, activeEnvironment?.id, statusFilter, severityFilter, searchQuery]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const payload: CreateIncidentInput = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        severity: formData.severity,
        affectedServiceIds: [formData.affectedService],
        detectionSource: formData.detectionSource,
        summary: formData.summary.trim() || undefined,
        primaryAlertId: formData.primaryAlertId || undefined,
      };

      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace?.id,
          environmentId: activeEnvironment?.id,
          ...payload,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create incident");
      }

      setShowCreateModal(false);
      setFormData({
        title: "",
        description: "",
        severity: "SEV2",
        affectedService: "srv-orders-api",
        detectionSource: "MANUAL",
        summary: "",
      });
      fetchIncidents();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create incident");
    } finally {
      setCreating(false);
    }
  };

  const statusPills: { label: string; value: string }[] = [
    { label: "All", value: "ALL" },
    { label: "Open", value: "OPEN" },
    { label: "Acknowledged", value: "ACKNOWLEDGED" },
    { label: "Investigating", value: "INVESTIGATING" },
    { label: "Mitigated", value: "MITIGATED" },
    { label: "Resolved", value: "RESOLVED" },
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <PageHeader
        icon={AlertOctagon}
        title="Incidents"
        subtitle="Operational incident triage inbox, active degradation diagnostics, and response timelines"
        iconColor="#f43f5e"
        iconBgColor="rgba(244, 63, 94, 0.1)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/25 flex items-center gap-1">
            <Sparkles size={11} className="text-violet-400" /> Simulated Incident Lifecycle
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchIncidents()}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-200 border border-white/[0.08] transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-xs font-bold text-rose-300 border border-rose-500/30 hover:border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)] transition-all flex items-center gap-1.5"
            >
              <Plus size={14} /> Create Incident
            </button>
          </div>
        }
      />

      {/* ── KPI Summary Strip ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={AlertOctagon}
          label="Open Incidents"
          value={stats ? stats.open : 0}
          sub="Requires initial triage"
          color="#f43f5e"
        />
        <StatCard
          icon={Flame}
          label="Critical (SEV1 / SEV2)"
          value={stats ? stats.sev1Count + stats.sev2Count : 0}
          sub={`${stats?.sev1Count || 0} SEV1 critical, ${stats?.sev2Count || 0} SEV2 high`}
          color="#f97316"
        />
        <StatCard
          icon={Activity}
          label="Under Investigation"
          value={stats ? stats.investigating + stats.acknowledged : 0}
          sub="Active response underway"
          color="#a855f7"
        />
        <StatCard
          icon={CheckCircle2}
          label="Mitigated & Resolved"
          value={stats ? stats.mitigated + stats.resolved : 0}
          sub={`${stats?.mitigated || 0} mitigated, ${stats?.resolved || 0} resolved`}
          color="#10b981"
        />
      </div>

      {/* ── Search & Filter Strip ─────────────────────────────────── */}
      <div className="surface-card rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {statusPills.map((pill) => (
            <button
              key={pill.value}
              onClick={() => setStatusFilter(pill.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === pill.value
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search & Severity Dropdown */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search incidents…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 font-mono"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-slate-300 focus:outline-none focus:border-cyan-500/40"
          >
            <option value="ALL" className="bg-[#0b101c]">All Severities</option>
            <option value="SEV1" className="bg-[#0b101c]">SEV1 (Critical)</option>
            <option value="SEV2" className="bg-[#0b101c]">SEV2 (High)</option>
            <option value="SEV3" className="bg-[#0b101c]">SEV3 (Warning)</option>
            <option value="SEV4" className="bg-[#0b101c]">SEV4 (Info)</option>
          </select>
        </div>
      </div>

      {/* ── Incidents Table / List ─────────────────────────────────── */}
      {loading ? (
        <div className="surface-card rounded-2xl p-16 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <Loader2 size={18} className="animate-spin text-cyan-400" />
          <span>Loading incident triage queue…</span>
        </div>
      ) : error ? (
        <div className="surface-card rounded-2xl p-6 border border-rose-500/25 bg-rose-500/[0.04] text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-rose-400" />
          <span>{error}</span>
        </div>
      ) : incidents.length === 0 ? (
        <div className="surface-card rounded-2xl p-16 text-center text-slate-400 flex flex-col items-center">
          <CheckCircle2 size={32} className="text-emerald-400 mb-3" />
          <h3 className="text-base font-bold text-white">No Incidents Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {statusFilter !== "ALL" || severityFilter !== "ALL" || searchQuery
              ? "No incidents match the active filter criteria."
              : "Zero active incidents in this workspace and environment."}
          </p>
        </div>
      ) : (
        <div className="surface-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Incident</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Severity</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Title & Affected Service</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Detection</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Assignee</th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Started</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {incidents.map((inc, i) => (
                  <tr
                    key={inc.id}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      i % 2 === 0 ? "" : "bg-white/[0.01]"
                    }`}
                  >
                    {/* Number */}
                    <td className="px-4 py-4 font-mono font-bold text-cyan-400 text-xs">
                      {inc.incidentNumber}
                    </td>

                    {/* Severity */}
                    <td className="px-4 py-4">
                      <SeverityBadge severity={inc.severity} />
                    </td>

                    {/* Title & Service */}
                    <td className="px-4 py-4 min-w-[280px]">
                      <Link
                        href={`/incidents/${inc.id}`}
                        className="font-semibold text-white hover:text-cyan-300 transition-colors text-xs line-clamp-1"
                      >
                        {inc.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-slate-400 font-mono bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06]">
                          {inc.affectedServiceIds.join(", ")}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <IncidentStatusBadge status={inc.status} />
                    </td>

                    {/* Detection */}
                    <td className="px-4 py-4">
                      <DetectionBadge source={inc.detectionSource} />
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-4 text-slate-300">
                      {inc.assignee ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium">
                          <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[10px] text-cyan-300 font-bold">
                            {inc.assignee.avatarInitials || inc.assignee.name.substring(0, 2).toUpperCase()}
                          </span>
                          {inc.assignee.name}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* Started */}
                    <td className="px-4 py-4 text-slate-400 text-[11px] font-mono">
                      {new Date(inc.startedAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/incidents/${inc.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-200 border border-white/[0.08] hover:border-cyan-500/30 hover:text-cyan-300 transition-all"
                      >
                        View <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Incident Modal ─────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="surface-elevated rounded-2xl w-full max-w-xl p-6 flex flex-col gap-5 border border-white/[0.1] shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon size={18} className="text-rose-400" />
                <h3 className="text-base font-bold text-white font-heading">Declare Incident</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04]"
              >
                <X size={16} />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Incident Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Orders API latency surge above 300ms threshold"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/40"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide technical context on observed telemetry symptoms…"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Severity *</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as IncidentSeverity })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/40"
                  >
                    <option value="SEV1" className="bg-[#0b101c]">SEV1 — Critical (High Outage / Loss)</option>
                    <option value="SEV2" className="bg-[#0b101c]">SEV2 — Major (Degraded SLO / Core)</option>
                    <option value="SEV3" className="bg-[#0b101c]">SEV3 — Moderate (Secondary Subsystem)</option>
                    <option value="SEV4" className="bg-[#0b101c]">SEV4 — Minor (Informational)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Affected Service *</label>
                  <select
                    value={formData.affectedService}
                    onChange={(e) => setFormData({ ...formData, affectedService: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/40 font-mono"
                  >
                    <option value="srv-orders-api" className="bg-[#0b101c]">Orders API (srv-orders-api)</option>
                    <option value="srv-notification-worker" className="bg-[#0b101c]">Notification Worker (srv-notification-worker)</option>
                    <option value="srv-payment-gateway" className="bg-[#0b101c]">Payment Gateway (srv-payment-gateway)</option>
                    <option value="srv-auth-service" className="bg-[#0b101c]">Auth Service (srv-auth-service)</option>
                    <option value="srv-inventory-db" className="bg-[#0b101c]">Inventory DB (srv-inventory-db)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Detection Source</label>
                <select
                  value={formData.detectionSource}
                  onChange={(e) => setFormData({ ...formData, detectionSource: e.target.value as DetectionSource })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/40"
                >
                  <option value="MANUAL" className="bg-[#0b101c]">Manual Declaration</option>
                  <option value="ALERT" className="bg-[#0b101c]">Alert Triggered</option>
                  <option value="SLO" className="bg-[#0b101c]">SLO Violation</option>
                  <option value="SYSTEM" className="bg-[#0b101c]">System Telemetry</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Initial Summary / Observations</label>
                <input
                  type="text"
                  placeholder="Optional observed degradation summary…"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Declare Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
