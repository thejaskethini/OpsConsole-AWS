"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileSearch,
  Loader2,
  ShieldAlert,
  Sparkles,
  Target,
  UserCog,
  Workflow,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { useIdentity } from "@/components/identity/IdentityProvider";
import type { Project, Risk, WorkItem, Milestone, Dependency } from "@/modules/projects";

interface ProjectDetailResponse {
  project: Project;
  health: {
    projectId: string;
    projectName: string;
    status: string;
    completionPercent: number;
    scheduleVariancePercent: number;
    overdueWorkItems: number;
    delayedMilestones: number;
    openRisks: number;
    criticalRisks: number;
    indicators: Array<{ label: string; value: string; description: string }>;
    summary: string;
  };
  schedule: {
    plannedCompletion: number;
    actualCompletion: number;
    scheduleVariance: number;
    overdueWorkItems: number;
    delayedMilestones: number;
    upcomingMilestones: number;
    explanation: string;
  };
  risk: {
    criticalRisks: number;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
    unmitigatedRisks: number;
    risksWithoutOwners: number;
    prioritizedRisks: Array<{ id: string; description: string; severity: Risk["severity"]; probability: number; impact: number }>;
  };
  evidence: Array<{ key: string; source: string; detail: string }>;
}

const workflowSteps = [
  { key: "OBSERVE", label: "Observe", desc: "Operational signals and linked incidents" },
  { key: "UNDERSTAND", label: "Understand", desc: "Risk and schedule analysis" },
  { key: "DECIDE", label: "Decide", desc: "Delivery recommendation" },
  { key: "APPROVAL", label: "Approval", desc: "Human decision gate" },
  { key: "EXECUTE", label: "Execute", desc: "Work items and milestones" },
  { key: "TRACK", label: "Track", desc: "Status verification" },
] as const;

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const { workspace, activeEnvironment, can } = useIdentity();
  const [data, setData] = useState<ProjectDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalState, setApprovalState] = useState<"pending" | "approved" | "rejected">("pending");

  const fetchProjectDetail = useCallback(async () => {
    if (!workspace || !activeEnvironment) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        workspaceId: workspace.id,
        environmentId: activeEnvironment.id,
      });

      const res = await fetch(`/api/projects/${projectId}?${params.toString()}`);
      const payload = await res.json();

      if (!res.ok || !payload.project) {
        throw new Error(payload.error || "Failed to load project detail");
      }

      setData(payload);
      setApprovalState("pending");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load project detail");
    } finally {
      setLoading(false);
    }
  }, [projectId, workspace, activeEnvironment]);

  useEffect(() => {
    fetchProjectDetail();
  }, [fetchProjectDetail]);

  const canRead = can("projects:read");

  const decisionSummary = useMemo(() => {
    if (!data) return "No recommendation yet.";

    if (data.project.status === "AT_RISK" || data.project.status === "CRITICAL") {
      return "Escalate delivery dependencies and require explicit owner signoff before the next deployment checkpoint.";
    }

    if (data.project.progress >= 75) {
      return "Maintain the current execution cadence and keep launch readiness gates active for the final release window.";
    }

    return "Continue incremental execution while reducing the highest-probability dependency risk blocks.";
  }, [data]);

  if (!canRead) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
        You do not have permission to view this project.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 text-xs">
        <Loader2 size={18} className="animate-spin text-violet-400" />
        Loading project intelligence…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-12 space-y-4">
        <Link href="/projects" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-violet-300">
          <ArrowLeft size={14} /> Back to portfolio
        </Link>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          <div className="flex items-center gap-2"><AlertTriangle size={16} className="text-rose-400" /> {error || "Project not found"}</div>
        </div>
      </div>
    );
  }

  const { project, health, schedule, risk, evidence } = data;

  const approvalStatusMap = {
    pending: { text: "Awaiting approval", tone: "border-amber-500/30 bg-amber-500/10 text-amber-200" },
    approved: { text: "Approved", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" },
    rejected: { text: "Changes requested", tone: "border-rose-500/30 bg-rose-500/10 text-rose-200" },
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/projects" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-violet-300">
          <ArrowLeft size={14} /> Back to portfolio
        </Link>
        <span className="px-2.5 py-1 rounded-full border border-violet-500/20 bg-violet-500/10 text-[10px] font-bold uppercase tracking-wider text-violet-300">
          Simulated ASPM
        </span>
      </div>

      <PageHeader
        icon={Sparkles}
        title={project.name}
        subtitle={project.description}
        iconColor="#a78bfa"
        iconBgColor="rgba(167, 139, 250, 0.12)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-violet-500/10 border border-violet-500/20 text-violet-300">
            {project.status}
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Target} label="Progress" value={`${project.progress}%`} sub="delivery completion" color="#8b5cf6" />
        <StatCard icon={Workflow} label="Schedule variance" value={`${schedule.scheduleVariance}%`} sub="vs planned baseline" color="#38bdf8" />
        <StatCard icon={ShieldAlert} label="Critical risks" value={String(risk.criticalRisks)} sub="highest severity" color="#f43f5e" />
        <StatCard icon={CheckCircle2} label="Milestones" value={String(project.milestones.length)} sub="tracked" color="#10b981" />
      </div>

      <div className="rounded-2xl surface-card p-4 border border-white/[0.06]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2"><Workflow size={14} className="text-violet-400" /> Execution flow</h2>
          <span className={`px-2.5 py-1 rounded-full border text-[10px] font-mono ${approvalStatusMap[approvalState].tone}`}>
            {approvalStatusMap[approvalState].text}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {workflowSteps.map((step, idx) => {
            const isCurrent = step.key === "APPROVAL";
            const isComplete = idx < 3 || approvalState !== "pending";
            return (
              <div key={step.key} className={`rounded-xl border p-3 ${isCurrent ? "border-violet-500/30 bg-violet-500/10" : isComplete ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/[0.06] bg-white/[0.02]"}`}>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{step.key}</div>
                <div className="mt-2 text-sm font-semibold text-white">{step.label}</div>
                <div className="mt-1 text-[11px] text-slate-400">{step.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <div className="rounded-2xl surface-card p-5 border border-white/[0.06]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4"><FileSearch size={14} className="text-cyan-400" /> Observe</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {health.indicators.map((indicator) => (
                <div key={indicator.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">{indicator.label}</div>
                  <div className="mt-2 text-lg font-bold text-white">{indicator.value}</div>
                  <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{indicator.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl surface-card p-5 border border-white/[0.06]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4"><Target size={14} className="text-amber-400" /> Understand</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Schedule narrative</div>
                <div className="mt-3 text-sm text-slate-200 leading-relaxed">{schedule.explanation}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Risk priority</div>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {risk.prioritizedRisks.slice(0, 3).map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-violet-400" />
                      <span>{item.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-violet-100">
              <div className="font-semibold">Decision recommendation</div>
              <p className="mt-1 text-violet-200/90">{decisionSummary}</p>
            </div>
          </div>

          <div className="rounded-2xl surface-card p-5 border border-white/[0.06]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2"><UserCog size={14} className="text-emerald-400" /> Execute</h2>
              <button
                onClick={() => setApprovalState((current) => (current === "approved" ? "pending" : "approved"))}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-xs font-semibold text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
              >
                {approvalState === "approved" ? "Update decision" : "Approve plan"}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-slate-400 mb-3">Work items</h3>
                <div className="space-y-3">
                  {project.workItems.map((item: WorkItem) => (
                    <div key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{item.title}</div>
                          <div className="mt-1 text-[11px] text-slate-400">Owner: {item.owner}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-[10px] text-cyan-300">{item.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-slate-400 mb-3">Milestones</h3>
                <div className="space-y-3">
                  {project.milestones.map((milestone: Milestone) => (
                    <div key={milestone.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-white">{milestone.name}</div>
                        <span className="px-2 py-0.5 rounded-full border border-violet-500/20 bg-violet-500/10 text-[10px] text-violet-300">{milestone.status}</span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-400">Planned: {new Date(milestone.plannedDate).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl surface-card p-5 border border-white/[0.06]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4"><Clock3 size={14} className="text-amber-400" /> Track</h2>
            <div className="space-y-3">
              {project.linkedOperationalEntities.map((entity) => (
                <div key={`${entity.type}-${entity.id}`} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-slate-300">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">{entity.type}</div>
                  <div className="mt-1 font-medium text-white">{entity.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl surface-card p-5 border border-white/[0.06]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4"><ShieldAlert size={14} className="text-rose-400" /> Risk & evidence</h2>
            <div className="space-y-3">
              {risk.prioritizedRisks.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-2"><span className="text-sm text-white">{item.severity}</span><span className="text-[10px] text-slate-400">P {item.probability}</span></div>
                  <div className="mt-2 text-[12px] text-slate-300">{item.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl surface-card p-5 border border-white/[0.06]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4"><ExternalLink size={14} className="text-cyan-400" /> Evidence taps</h2>
            <div className="space-y-3">
              {evidence.map((item) => (
                <div key={item.key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-cyan-400">{item.source}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{item.key}</span>
                  </div>
                  <div className="mt-2 text-[12px] text-slate-300">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl surface-card p-5 border border-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2"><ChevronRight size={14} className="text-violet-400" /> Operational decisions</h2>
          <button
            onClick={() => setApprovalState((current) => (current === "rejected" ? "approved" : "rejected"))}
            className="px-3 py-1.5 rounded-lg bg-violet-500/15 text-xs font-semibold text-violet-200 border border-violet-500/30 hover:bg-violet-500/25"
          >
            {approvalState === "rejected" ? "Approve revision" : "Request changes"}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-300">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Owner</div>
            <div className="mt-2 font-medium text-white">{project.owner}</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Priority</div>
            <div className="mt-2 font-medium text-white">{project.priority}</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Linked incidents</div>
            <div className="mt-2 font-medium text-white">{project.linkedIncidentIds.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
