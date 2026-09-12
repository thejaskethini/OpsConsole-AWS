"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Search,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  Sliders,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { AlertSeverityBadge, AlertStatusBadge } from "@/components/alerts";
import { useIdentity } from "@/components/identity/IdentityProvider";
import type { Alert, AlertSeverity, AlertStatus } from "@/modules/alerting/types";

export default function AlertsPage() {
  const { workspace, activeEnvironment, can } = useIdentity();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "ALL">("ALL");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal State for Resolve
  const [resolvingAlert, setResolvingAlert] = useState<Alert | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const canManage = can("alerts:manage");

  const fetchAlerts = useCallback(async () => {
    if (!workspace || !activeEnvironment) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        workspaceId: workspace.id,
        environmentId: activeEnvironment.id,
      });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (severityFilter !== "ALL") params.set("severity", severityFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/alerts?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data?.alerts) {
        setAlerts(data.data.alerts);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  }, [workspace, activeEnvironment, statusFilter, severityFilter, searchQuery]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Trigger evaluation pass
  const handleEvaluateAll = async () => {
    if (!workspace || !activeEnvironment || !canManage) return;
    setEvaluating(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch(
        `/api/alerts/evaluate?workspaceId=${workspace.id}&environmentId=${activeEnvironment.id}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(data.data.message);
        await fetchAlerts();
      } else {
        setFeedbackMessage(data.error?.message || "Evaluation failed.");
      }
    } catch {
      setFeedbackMessage("Evaluation request failed.");
    } finally {
      setEvaluating(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  // Quick Acknowledge
  const handleAcknowledge = async (alertId: string) => {
    if (!workspace || !canManage) return;
    try {
      const res = await fetch(
        `/api/alerts/${alertId}/ack?workspaceId=${workspace.id}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(`Alert acknowledged successfully.`);
        await fetchAlerts();
      }
    } catch {
      setFeedbackMessage("Failed to acknowledge alert.");
    } finally {
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // Submit Resolve
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert || !workspace || !canManage) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(
        `/api/alerts/${resolvingAlert.id}/resolve?workspaceId=${workspace.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: resolutionNote }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(`Alert marked as resolved.`);
        setResolvingAlert(null);
        setResolutionNote("");
        await fetchAlerts();
      }
    } catch {
      setFeedbackMessage("Failed to resolve alert.");
    } finally {
      setSubmittingAction(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // KPI Calculations
  const firingCount = alerts.filter((a) => a.status === "FIRING").length;
  const criticalFiring = alerts.filter(
    (a) => a.status === "FIRING" && a.severity === "CRITICAL"
  ).length;
  const ackCount = alerts.filter((a) => a.status === "ACKNOWLEDGED").length;
  const resolvedCount = alerts.filter((a) => a.status === "RESOLVED").length;

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <PageHeader
        icon={Bell}
        title="Alert Management"
        subtitle="Centralized SRE alert evaluation, deduplication, and lifecycle state management."
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
            Simulated SRE Telemetry Model
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <Link
              href="/alerts/rules"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0f172a] hover:bg-[#16223d] border border-slate-700/60 text-slate-300 hover:text-white text-xs font-medium transition-all duration-150"
            >
              <Sliders size={14} className="text-cyan-400" />
              <span>Rule Registry</span>
            </Link>
            {canManage && (
              <button
                onClick={handleEvaluateAll}
                disabled={evaluating}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all duration-150 cursor-pointer"
              >
                {evaluating ? (
                  <RotateCcw size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                <span>{evaluating ? "Evaluating..." : "Evaluate All Rules"}</span>
              </button>
            )}
          </div>
        }
      />

      {/* ── Feedback Notification ──────────────────────────────── */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs flex items-center justify-between">
          <span>{feedbackMessage}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-cyan-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── KPI Stat Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={AlertTriangle}
          label="Active Firing"
          value={firingCount.toString()}
          sub={
            criticalFiring > 0
              ? `${criticalFiring} critical breach`
              : "All nominal"
          }
          color={criticalFiring > 0 ? "#ef4444" : "#10b981"}
          badge={
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                criticalFiring > 0
                  ? "bg-red-500/15 text-red-300 border-red-500/30"
                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              }`}
            >
              {criticalFiring > 0 ? "CRITICAL" : "HEALTHY"}
            </span>
          }
        />
        <StatCard
          icon={Bell}
          label="Acknowledged"
          value={ackCount.toString()}
          sub="Investigating incidents"
          color="#f59e0b"
          badge={
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {ackCount > 0 ? "ATTENTION" : "CLEAR"}
            </span>
          }
        />
        <StatCard
          icon={CheckCircle2}
          label="Auto / Manually Resolved"
          value={resolvedCount.toString()}
          sub="Telemetry nominal"
          color="#64748b"
          badge={
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              RESOLVED
            </span>
          }
        />
        <StatCard
          icon={ShieldCheck}
          label="Evaluation Model"
          value="5 Rules"
          sub="Continuous sliding window"
          color="#06b6d4"
          badge={
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              SIMULATED
            </span>
          }
        />
      </div>

      {/* ── Filters & Search ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-[#0f172a] border border-slate-800 rounded-xl">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(["ALL", "FIRING", "ACKNOWLEDGED", "RESOLVED"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-150 cursor-pointer ${
                statusFilter === st
                  ? "bg-slate-700/80 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Severity & Search */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="bg-[#090e1a] border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>

          <div className="relative flex-1 sm:w-56">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#090e1a] border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* ── Scannable Alert Operational Table ───────────────────── */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0c1322] text-slate-400 font-semibold tracking-wide uppercase text-[10px]">
                <th className="px-4 py-3.5">Severity</th>
                <th className="px-4 py-3.5">Alert / Summary</th>
                <th className="px-4 py-3.5">Target Service</th>
                <th className="px-4 py-3.5">Condition Snapshot</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Triggered</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <RotateCcw size={18} className="animate-spin inline mr-2 text-cyan-400" />
                    Loading alert instances...
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-400/60" />
                    No alerts matching the selected filters.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-[#16223d]/40 transition-colors duration-150 group"
                  >
                    {/* Severity */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <AlertSeverityBadge severity={alert.severity} />
                    </td>

                    {/* Alert Title & Summary */}
                    <td className="px-4 py-3.5 max-w-md">
                      <Link
                        href={`/alerts/${alert.id}`}
                        className="font-medium text-slate-200 group-hover:text-cyan-300 transition-colors duration-150 flex items-center gap-1.5"
                      >
                        <span>{alert.title}</span>
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-70 text-cyan-400 shrink-0" />
                      </Link>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {alert.summary}
                      </p>
                    </td>

                    {/* Target Service */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Link
                        href={`/services/${alert.serviceId}`}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600 font-mono text-[11px]"
                      >
                        {alert.serviceName}
                      </Link>
                    </td>

                    {/* Condition Snapshot */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-300">
                      <span className="text-slate-400">
                        {alert.conditionSnapshot.metricType} {alert.conditionSnapshot.operator} {alert.conditionSnapshot.threshold}{alert.conditionSnapshot.unit || ""}
                      </span>
                      <div className="text-[10px] text-cyan-400/90 font-medium">
                        Observed: {alert.conditionSnapshot.observedValue}{alert.conditionSnapshot.unit || ""}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <AlertStatusBadge status={alert.status} />
                      {alert.acknowledgedBy && alert.status === "ACKNOWLEDGED" && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          by {alert.acknowledgedBy}
                        </div>
                      )}
                    </td>

                    {/* Triggered Time */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      <span title={new Date(alert.triggeredAt).toLocaleString()}>
                        {new Date(alert.triggeredAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>

                    {/* Quick Actions */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canManage && alert.status === "FIRING" && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition-all duration-150 cursor-pointer"
                            title="Acknowledge Alert"
                          >
                            Ack
                          </button>
                        )}
                        {canManage &&
                          (alert.status === "FIRING" ||
                            alert.status === "ACKNOWLEDGED") && (
                            <button
                              onClick={() => {
                                setResolvingAlert(alert);
                                setResolutionNote("");
                              }}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition-all duration-150 cursor-pointer"
                              title="Resolve Alert"
                            >
                              Resolve
                            </button>
                          )}
                        <Link
                          href={`/alerts/${alert.id}`}
                          className="px-2 py-1 rounded bg-[#090e1a] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[11px] font-medium transition-all duration-150"
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Resolution Modal ────────────────────────────────────── */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white">
                Resolve Alert: {resolvingAlert.serviceName}
              </h3>
              <button
                onClick={() => setResolvingAlert(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 mb-2">
                  Resolving <strong className="text-slate-200">{resolvingAlert.title}</strong>.
                  If the underlying telemetry condition remains breached during the next evaluation,
                  the alert will transition to <span className="font-mono text-cyan-400">FIRING</span> (RE_TRIGGERED).
                </p>
                <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                  Resolution Note (Optional)
                </label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g., Deployed worker pool scale-out; latency recovered."
                  rows={3}
                  className="w-full bg-[#090e1a] border border-slate-700/80 rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer shadow-sm"
                >
                  {submittingAction ? (
                    <RotateCcw size={13} className="animate-spin" />
                  ) : (
                    <Check size={13} />
                  )}
                  <span>Confirm Resolve</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
