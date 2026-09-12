"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  RotateCcw,
  Activity,
  User,
  Check,
  X,
  History,
  AlertOctagon,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { AlertSeverityBadge, AlertStatusBadge } from "@/components/alerts";
import { useIdentity } from "@/components/identity/IdentityProvider";
import type { Alert, AlertEvent } from "@/modules/alerting/types";

export default function AlertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: alertId } = use(params);
  const { workspace, can } = useIdentity();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [linkedIncident, setLinkedIncident] = useState<{ id: string; incidentNumber: string } | null>(null);

  // Modal State for Resolve
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const canManage = can("alerts:manage") || can("incidents:manage");

  const fetchAlertDetail = async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/alerts/${alertId}?workspaceId=${workspace.id}`
      );
      const data = await res.json();
      if (data.success && data.data?.alert) {
        setAlert(data.data.alert);
        setEvents(data.data.events || []);

        // Check for linked incident
        try {
          const incRes = await fetch(`/api/incidents?alertId=${alertId}&workspaceId=${workspace.id}`);
          const incData = await incRes.json();
          if (incData.success && incData.data?.incident) {
            setLinkedIncident({
              id: incData.data.incident.id,
              incidentNumber: incData.data.incident.incidentNumber,
            });
          }
        } catch {
          // ignore
        }
      } else {
        setError(data.error?.message || "Alert not found.");
      }
    } catch {
      setError("Failed to load alert details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertDetail();
  }, [alertId, workspace]);

  // Acknowledge Action
  const handleAcknowledge = async () => {
    if (!alert || !workspace || !canManage) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(
        `/api/alerts/${alert.id}/ack?workspaceId=${workspace.id}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.success) {
        setActionMessage("Alert acknowledged successfully.");
        await fetchAlertDetail();
      } else {
        setActionMessage(data.error?.message || "Acknowledgement failed.");
      }
    } catch {
      setActionMessage("Action failed.");
    } finally {
      setSubmittingAction(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // Resolve Action
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert || !workspace || !canManage) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(
        `/api/alerts/${alert.id}/resolve?workspaceId=${workspace.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: resolutionNote }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setActionMessage("Alert resolved successfully.");
        setShowResolveModal(false);
        setResolutionNote("");
        await fetchAlertDetail();
      } else {
        setActionMessage(data.error?.message || "Resolution failed.");
      }
    } catch {
      setActionMessage("Resolution action failed.");
    } finally {
      setSubmittingAction(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <RotateCcw size={18} className="animate-spin text-cyan-400" />
          <span>Loading alert audit record...</span>
        </div>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <Bell size={24} />
        </div>
        <h2 className="text-lg font-semibold text-white">Alert Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          {error || `The alert with ID '${alertId}' does not exist in workspace '${workspace?.name}'.`}
        </p>
        <Link
          href="/alerts"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
        >
          <ArrowLeft size={14} />
          <span>Back to Alerts</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── Breadcrumb & Navigation ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          href="/alerts"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors duration-150"
        >
          <ArrowLeft size={14} />
          <span>Back to Alerts</span>
        </Link>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <span>Fingerprint:</span>
          <span className="text-slate-400 bg-[#0f172a] px-2 py-0.5 rounded border border-slate-800">
            {alert.fingerprint}
          </span>
        </div>
      </div>

      {/* ── Page Header ─────────────────────────────────────────── */}
      <PageHeader
        icon={Bell}
        title={alert.title}
        subtitle={alert.summary}
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
            Simulated SRE Telemetry Model
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5">
            {linkedIncident ? (
              <Link
                href={`/incidents/${linkedIncident.id}`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-semibold transition-all duration-150"
              >
                <AlertOctagon size={14} />
                <span>View Incident ({linkedIncident.incidentNumber})</span>
              </Link>
            ) : (
              canManage &&
              (alert.status === "FIRING" || alert.status === "ACKNOWLEDGED") && (
                <Link
                  href={`/incidents?declare=true&alertId=${alert.id}&serviceId=${alert.serviceId}&title=${encodeURIComponent(alert.title)}&severity=${alert.severity === "CRITICAL" ? "SEV1" : alert.severity === "WARNING" ? "SEV2" : "SEV3"}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-semibold transition-all duration-150"
                >
                  <AlertOctagon size={14} />
                  <span>Declare Incident</span>
                </Link>
              )
            )}
            {canManage && alert.status === "FIRING" && (
              <button
                onClick={handleAcknowledge}
                disabled={submittingAction}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all duration-150 cursor-pointer"
              >
                <Check size={14} />
                <span>Acknowledge Alert</span>
              </button>
            )}
            {canManage &&
              (alert.status === "FIRING" || alert.status === "ACKNOWLEDGED") && (
                <button
                  onClick={() => setShowResolveModal(true)}
                  disabled={submittingAction}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all duration-150 cursor-pointer shadow-sm"
                >
                  <CheckCircle2 size={14} />
                  <span>Resolve Alert</span>
                </button>
              )}
          </div>
        }
      />

      {/* ── Action Notification ─────────────────────────────────── */}
      {actionMessage && (
        <div className="p-3.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-cyan-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Primary Overview Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Alert State */}
        <div className="p-5 bg-[#0f172a] border border-slate-800 rounded-xl space-y-3.5">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Lifecycle & Severity
          </p>
          <div className="flex items-center gap-2.5">
            <AlertSeverityBadge severity={alert.severity} />
            <AlertStatusBadge status={alert.status} />
          </div>
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Rule ID:</span>
              <span className="font-mono text-slate-200">{alert.ruleId}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Triggered:</span>
              <span className="font-mono text-slate-200">
                {new Date(alert.triggeredAt).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Last Evaluated:</span>
              <span className="font-mono text-slate-200">
                {new Date(alert.lastEvaluatedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Condition Snapshot */}
        <div className="p-5 bg-[#0f172a] border border-slate-800 rounded-xl space-y-3.5">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Condition Snapshot
          </p>
          <div className="font-mono text-lg font-semibold text-white flex items-baseline gap-2">
            <span className="text-cyan-400">
              {alert.conditionSnapshot.observedValue}{alert.conditionSnapshot.unit || ""}
            </span>
            <span className="text-xs text-slate-400 font-normal">
              (Threshold: {alert.conditionSnapshot.operator} {alert.conditionSnapshot.threshold}{alert.conditionSnapshot.unit || ""})
            </span>
          </div>
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Metric Type:</span>
              <span className="font-mono text-cyan-300 font-medium">
                {alert.conditionSnapshot.metricType}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Operator:</span>
              <span className="font-mono text-slate-200">
                {alert.conditionSnapshot.operator}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Threshold:</span>
              <span className="font-mono text-slate-200">
                {alert.conditionSnapshot.threshold} {alert.conditionSnapshot.unit || ""}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Affected Service */}
        <div className="p-5 bg-[#0f172a] border border-slate-800 rounded-xl space-y-3.5">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Target Workload
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              {alert.serviceName}
            </span>
            <Link
              href={`/services/${alert.serviceId}`}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium inline-flex items-center gap-1 transition-colors duration-150"
            >
              <Activity size={12} />
              <span>Service Hub</span>
            </Link>
          </div>
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Service ID:</span>
              <span className="font-mono text-slate-200">{alert.serviceId}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Environment:</span>
              <span className="font-mono text-slate-200">{alert.environmentId}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Workspace:</span>
              <span className="font-mono text-slate-200">{alert.workspaceId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lifecycle & Actor Information ───────────────────────── */}
      {(alert.acknowledgedBy || alert.resolvedBy) && (
        <div className="p-4 bg-[#0f172a] border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {alert.acknowledgedBy && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} />
              </div>
              <div>
                <p className="font-semibold text-slate-200">
                  Acknowledged by {alert.acknowledgedBy}
                </p>
                <p className="text-slate-400 text-[11px] font-mono">
                  {alert.acknowledgedAt
                    ? new Date(alert.acknowledgedAt).toLocaleString()
                    : "—"}
                </p>
              </div>
            </div>
          )}

          {alert.resolvedBy && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={14} />
              </div>
              <div>
                <p className="font-semibold text-slate-200">
                  Resolved by {alert.resolvedBy}
                </p>
                <p className="text-slate-400 text-[11px] font-mono">
                  {alert.resolvedAt
                    ? new Date(alert.resolvedAt).toLocaleString()
                    : "—"}
                </p>
                {alert.resolutionNote && (
                  <p className="text-slate-300 text-[11px] mt-1 bg-[#090e1a] p-2 rounded border border-slate-800">
                    &ldquo;{alert.resolutionNote}&rdquo;
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Event Audit Timeline ────────────────────────────────── */}
      <div className="p-5 bg-[#0f172a] border border-slate-800 rounded-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History size={16} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              Event Audit Log & State Transitions
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {events.length} Recorded Events
          </span>
        </div>

        {events.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            No state transition events recorded.
          </p>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {events.map((evt) => (
              <div key={evt.id} className="relative group">
                <span className="absolute -left-6 top-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-4 ring-[#0f172a]" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-200">
                      {evt.eventType}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ({evt.previousStatus} → {evt.newStatus})
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 ml-auto">
                      {new Date(evt.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{evt.note || "State transition recorded."}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Actor: <span className="text-slate-400">{evt.actor}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Resolution Modal ────────────────────────────────────── */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white">Resolve Alert</h3>
              <button
                onClick={() => setShowResolveModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 mb-2">
                  Resolving <strong className="text-slate-200">{alert.title}</strong>.
                  If the underlying condition is still breached during the next evaluation,
                  the alert will re-trigger.
                </p>
                <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                  Resolution Note (Optional)
                </label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Explain remediation actions taken..."
                  rows={3}
                  className="w-full bg-[#090e1a] border border-slate-700/80 rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
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
