"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  ArrowLeft,
  Clock,
  Shield,
  User,
  Users,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
  Send,
  ExternalLink,
  Flame,
  Activity,
  FileText,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
  Check,
  X,
  MessageSquare,
  Radio,
  Zap,
} from "lucide-react";
import { useIdentity } from "@/components/identity/IdentityProvider";
import { PageHeader } from "@/components/common/PageHeader";
import {
  SeverityBadge,
  IncidentStatusBadge,
  DetectionBadge,
} from "../page";
import type {
  Incident,
  IncidentEvent,
  IncidentEvidence,
  IncidentStatus,
} from "@/modules/incidents";

// ─── Timeline Event Node Component ───────────────────────────────────────────

function TimelineEventNode({ event }: { event: IncidentEvent }) {
  const typeConfigs: Record<
    string,
    { icon: typeof Activity; color: string; bg: string; border: string }
  > = {
    INCIDENT_CREATED: {
      icon: AlertOctagon,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
    },
    ALERT_TRIGGERED: {
      icon: Flame,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
    },
    ACKNOWLEDGED: {
      icon: Check,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
    },
    ASSIGNED: {
      icon: Users,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
    },
    INVESTIGATION_STARTED: {
      icon: Activity,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
    },
    NOTE_ADDED: {
      icon: MessageSquare,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
    },
    STATUS_CHANGED: {
      icon: Radio,
      color: "text-slate-300",
      bg: "bg-slate-500/10",
      border: "border-slate-500/30",
    },
    MITIGATION_STARTED: {
      icon: Zap,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
    },
    MITIGATED: {
      icon: CheckCircle2,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
    },
    RESOLVED: {
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
    },
  };

  const conf = typeConfigs[event.type] || typeConfigs.NOTE_ADDED;
  const Icon = conf.icon;

  return (
    <div className="relative flex items-start gap-4 group">
      {/* Icon Node */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border z-10 ${conf.bg} ${conf.border} shadow-sm`}
      >
        <Icon size={14} className={conf.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 hover:border-white/[0.1] transition-all">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">
              {event.actor.name}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({event.type.replace(/_/g, " ")})
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {new Date(event.timestamp).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              day: "2-digit",
              month: "short",
            })}
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-normal">
          {event.message}
        </p>
      </div>
    </div>
  );
}

// ─── Evidence Card Component ─────────────────────────────────────────────────

function EvidenceCard({ item }: { item: IncidentEvidence }) {
  const typeIcons: Record<string, typeof Activity> = {
    ALERT: Flame,
    SERVICE_HEALTH: Activity,
    SLO: Shield,
    ERROR_BUDGET: Clock,
    BURN_RATE: Flame,
    METRIC: Activity,
    AWS_SIGNAL: Layers,
    FAILURE_EVENT: AlertTriangle,
  };

  const Icon = typeIcons[item.type] || Activity;

  return (
    <div className="rounded-xl p-4 surface-card flex flex-col gap-2.5 border border-white/[0.06] hover:border-cyan-500/30 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Icon size={12} className="text-cyan-400" />
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
            {item.type.replace(/_/g, " ")}
          </span>
        </div>
        {item.sourceUrl && (
          <Link
            href={item.sourceUrl}
            className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors font-medium"
          >
            Source <ExternalLink size={10} />
          </Link>
        )}
      </div>

      <div>
        <h4 className="text-xs font-bold text-white">{item.title}</h4>
        <p className="text-[11.5px] text-slate-400 mt-1 leading-relaxed">
          {item.description}
        </p>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-white/[0.04]">
        <span>Source: {item.source}</span>
        <span className="font-mono">
          {new Date(item.observedAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

// ─── Incident Detail Page Component ──────────────────────────────────────────

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const incidentId = resolvedParams.id;

  const { workspace, activeEnvironment } = useIdentity();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [evidence, setEvidence] = useState<IncidentEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Actions
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals for Mitigate / Resolve / Assign
  const [showMitigateModal, setShowMitigateModal] = useState(false);
  const [mitigateSummary, setMitigateSummary] = useState("");

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveSummary, setResolveSummary] = useState("");

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState("usr-thejas");
  const [selectedCommander, setSelectedCommander] = useState("usr-alex");

  const fetchIncidentDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (workspace?.id) params.set("workspaceId", workspace.id);
      if (activeEnvironment?.id) params.set("environmentId", activeEnvironment.id);

      const res = await fetch(`/api/incidents/${incidentId}?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load incident");
      }
      const data = await res.json();
      setIncident(data.incident);
      setEvents(data.events || []);
      setEvidence(data.evidence || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading incident details");
    } finally {
      setLoading(false);
    }
  }, [incidentId, workspace?.id, activeEnvironment?.id]);

  useEffect(() => {
    fetchIncidentDetail();
  }, [fetchIncidentDetail]);

  // Action Handlers
  const handleAcknowledge = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/ack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace?.id,
          environmentId: activeEnvironment?.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to acknowledge incident");
      }
      fetchIncidentDetail();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error acknowledging incident");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartInvestigation = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace?.id,
          environmentId: activeEnvironment?.id,
          status: "INVESTIGATING",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to start investigation");
      }
      fetchIncidentDetail();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error starting investigation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace?.id,
          environmentId: activeEnvironment?.id,
          note: noteText.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add note");
      }
      setNoteText("");
      fetchIncidentDetail();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error adding note");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleMitigateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mitigateSummary.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/mitigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace?.id,
          environmentId: activeEnvironment?.id,
          mitigationSummary: mitigateSummary.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to mitigate incident");
      }
      setShowMitigateModal(false);
      setMitigateSummary("");
      fetchIncidentDetail();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error mitigating incident");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveSummary.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace?.id,
          environmentId: activeEnvironment?.id,
          resolutionSummary: resolveSummary.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to resolve incident");
      }
      setShowResolveModal(false);
      setResolveSummary("");
      fetchIncidentDetail();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error resolving incident");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace?.id,
          environmentId: activeEnvironment?.id,
          assigneeId: selectedAssignee,
          commanderId: selectedCommander,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to assign incident");
      }
      setShowAssignModal(false);
      fetchIncidentDetail();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error assigning incident");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto py-24 flex items-center justify-center gap-2 text-slate-400 text-xs">
        <Loader2 size={20} className="animate-spin text-cyan-400" />
        <span>Loading incident details & audit timeline…</span>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="w-full max-w-7xl mx-auto py-12 flex flex-col gap-4">
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft size={14} /> Back to Incidents
        </Link>
        <div className="p-6 rounded-2xl surface-card border border-rose-500/25 bg-rose-500/[0.04] text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle size={18} className="text-rose-400" />
          <span>{error || "Incident not found"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* ── Breadcrumb & Back Link ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Incidents Inbox
        </Link>
        <span className="text-[11px] text-slate-500 font-mono">
          Environment: <span className="text-slate-300 font-semibold">{incident.environmentId}</span>
        </span>
      </div>

      {/* ── Incident Header Card ──────────────────────────────────── */}
      <div className="surface-card rounded-2xl p-6 flex flex-col gap-4 border border-white/[0.08] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <SeverityBadge severity={incident.severity} />
              <span className="font-mono text-base font-bold text-cyan-400">
                {incident.incidentNumber}
              </span>
              <IncidentStatusBadge status={incident.status} />
              <DetectionBadge source={incident.detectionSource} />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-heading tracking-tight leading-tight">
              {incident.title}
            </h1>
          </div>

          {/* Action Buttons Bar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {incident.status === "OPEN" && (
              <button
                onClick={handleAcknowledge}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-xs font-bold text-blue-300 border border-blue-500/30 transition-all flex items-center gap-1.5"
              >
                <Check size={13} /> Acknowledge
              </button>
            )}

            {(incident.status === "OPEN" || incident.status === "ACKNOWLEDGED") && (
              <button
                onClick={handleStartInvestigation}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-xs font-bold text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5"
              >
                <Activity size={13} /> Start Investigation
              </button>
            )}

            {incident.status !== "RESOLVED" && incident.status !== "MITIGATED" && (
              <button
                onClick={() => setShowMitigateModal(true)}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-xs font-bold text-purple-300 border border-purple-500/30 transition-all flex items-center gap-1.5"
              >
                <Zap size={13} /> Mark Mitigated
              </button>
            )}

            {incident.status !== "RESOLVED" && (
              <button
                onClick={() => setShowResolveModal(true)}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-xs font-bold text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
              >
                <CheckCircle2 size={13} /> Resolve
              </button>
            )}

            <button
              onClick={() => setShowAssignModal(true)}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 border border-white/[0.08] transition-all flex items-center gap-1.5"
            >
              <User size={13} /> Assign
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/[0.06] text-xs">
          <div>
            <span className="text-slate-500 text-[11px] block">Assignee</span>
            <span className="text-slate-200 font-semibold mt-0.5 block truncate">
              {incident.assignee ? incident.assignee.name : "Unassigned"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[11px] block">Incident Commander</span>
            <span className="text-slate-200 font-semibold mt-0.5 block truncate">
              {incident.commander ? incident.commander.name : "Not designated"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[11px] block">Started At</span>
            <span className="text-slate-300 font-mono text-[11px] mt-0.5 block">
              {new Date(incident.startedAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "short",
              })}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[11px] block">Affected Workload</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {incident.affectedServiceIds.map((sid) => (
                <Link
                  key={sid}
                  href={`/services/${sid}`}
                  className="font-mono text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 truncate"
                >
                  {sid}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column (2/3): Operational Summary + Timeline ─────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Operational Summary */}
          <div className="surface-card rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 border-b border-white/[0.06] pb-3">
              <FileText size={15} className="text-cyan-400" />
              Operational Summary & Symptoms
            </h3>

            <div className="flex flex-col gap-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                {incident.description}
              </p>

              {incident.summary && (
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">
                    Observed Diagnostics:
                  </span>
                  <p className="text-slate-200 leading-relaxed font-medium">
                    {incident.summary}
                  </p>
                </div>
              )}

              {incident.resolutionSummary && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <span className="text-[11px] text-emerald-400 uppercase font-bold block mb-1">
                    Resolution Summary:
                  </span>
                  <p className="leading-relaxed font-medium">
                    {incident.resolutionSummary}
                  </p>
                </div>
              )}

              {incident.primaryAlertId && (
                <div className="flex items-center gap-2 pt-2 text-xs">
                  <span className="text-slate-400">Triggering Alert:</span>
                  <Link
                    href={`/alerts/${incident.primaryAlertId}`}
                    className="text-cyan-400 hover:text-cyan-300 font-mono font-semibold flex items-center gap-1"
                  >
                    {incident.primaryAlertId} <ExternalLink size={11} />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Chronological Incident Timeline */}
          <div className="surface-card rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Clock size={15} className="text-cyan-400" />
                Response Timeline ({events.length} Events)
              </h3>
              <span className="text-[11px] text-slate-500">Chronological Audit Log</span>
            </div>

            {/* Timeline Stream */}
            <div className="relative flex flex-col gap-4 before:absolute before:top-3 before:bottom-3 before:left-4 before:w-px before:bg-white/[0.08]">
              {events.map((evt) => (
                <TimelineEventNode key={evt.id} event={evt} />
              ))}
            </div>

            {/* Add Note Form */}
            <form
              onSubmit={handleAddNote}
              className="flex items-center gap-2 pt-4 border-t border-white/[0.06]"
            >
              <input
                type="text"
                placeholder="Add operational observation or status note…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/40"
              />
              <button
                type="submit"
                disabled={submittingNote || !noteText.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-xs font-bold text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1.5 disabled:opacity-40"
              >
                {submittingNote ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Add Note
              </button>
            </form>
          </div>
        </div>

        {/* ── Right Column (1/3): Operational Evidence ─────────────── */}
        <div className="flex flex-col gap-6">
          <div className="surface-card rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Shield size={15} className="text-cyan-400" />
                Supporting Evidence ({evidence.length})
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">
                Simulated
              </span>
            </div>

            <p className="text-[11.5px] text-slate-400 leading-relaxed">
              Observed reliability telemetry, SLO error budgets, and alarm triggers captured during detection.
            </p>

            {evidence.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs bg-white/[0.01] rounded-xl border border-white/[0.04]">
                No explicit evidence attached to this incident.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {evidence.map((evi) => (
                  <EvidenceCard key={evi.id} item={evi} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mitigation Modal ──────────────────────────────────────── */}
      {showMitigateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="surface-elevated rounded-2xl w-full max-w-lg p-6 flex flex-col gap-4 border border-white/[0.1] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap size={18} className="text-purple-400" /> Mark Incident as Mitigated
              </h3>
              <button
                onClick={() => setShowMitigateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleMitigateSubmit} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Mitigation Summary & Action Taken *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the temporary relief or failover action applied to stabilize the service…"
                  value={mitigateSummary}
                  onChange={(e) => setMitigateSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/40"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMitigateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !mitigateSummary.trim()}
                  className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold"
                >
                  Confirm Mitigation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Resolution Modal ──────────────────────────────────────── */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="surface-elevated rounded-2xl w-full max-w-lg p-6 flex flex-col gap-4 border border-white/[0.1] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" /> Resolve Incident
              </h3>
              <button
                onClick={() => setShowResolveModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleResolveSubmit} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Resolution Summary & Remediation Outcome *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Summarize the remediation fix, telemetry normalization, and post-resolution notes…"
                  value={resolveSummary}
                  onChange={(e) => setResolveSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/40"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !resolveSummary.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                >
                  Resolve Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Modal ──────────────────────────────────────────── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="surface-elevated rounded-2xl w-full max-w-md p-6 flex flex-col gap-4 border border-white/[0.1] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <User size={18} className="text-cyan-400" /> Assign Incident Responders
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAssignSubmit} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Incident Lead / Assignee</label>
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/40 font-mono"
                >
                  <option value="usr-thejas" className="bg-[#0b101c]">Thejas (Owner / SRE)</option>
                  <option value="usr-alex" className="bg-[#0b101c]">Alex (Admin / SRE)</option>
                  <option value="usr-priya" className="bg-[#0b101c]">Priya (Operator / Triage)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Incident Commander</label>
                <select
                  value={selectedCommander}
                  onChange={(e) => setSelectedCommander(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/40 font-mono"
                >
                  <option value="usr-alex" className="bg-[#0b101c]">Alex (Admin / Commander)</option>
                  <option value="usr-thejas" className="bg-[#0b101c]">Thejas (Owner / Commander)</option>
                  <option value="usr-priya" className="bg-[#0b101c]">Priya (Operator)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
