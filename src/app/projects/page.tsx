"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Loader2,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { useIdentity } from "@/components/identity/IdentityProvider";
import type { Project } from "@/modules/projects";

interface ProjectPortfolioSummary {
  activeProjects: number;
  onTrackProjects: number;
  atRiskProjects: number;
  overallCompletion: number;
  criticalProjects: number;
}

export default function ProjectsPage() {
  const { workspace, activeEnvironment, can } = useIdentity();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canRead = can("projects:read");

  const fetchProjects = useCallback(async () => {
    if (!workspace || !activeEnvironment) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        workspaceId: workspace.id,
        environmentId: activeEnvironment.id,
      });

      const res = await fetch(`/api/projects?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load projects");
      }

      if (!data || !Array.isArray(data.projects)) {
        setProjects([]);
        return;
      }

      setProjects(data.projects || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load projects");
    } finally {
      setLoading(false);
    }
  }, [workspace, activeEnvironment]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const portfolio = useMemo<ProjectPortfolioSummary>(() => {
    const total = projects.length || 1;
    return {
      activeProjects: projects.length,
      onTrackProjects: projects.filter((project) => project.status === "ON_TRACK" || project.status === "ACTIVE").length,
      atRiskProjects: projects.filter((project) => project.status === "AT_RISK" || project.status === "CRITICAL").length,
      overallCompletion: Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / total),
      criticalProjects: projects.filter((project) => project.status === "CRITICAL").length,
    };
  }, [projects]);

  const portfolioContext = useMemo(() => ({
    overdueWork: projects.reduce((count, project) => count + project.workItems.filter((item) => item.status !== "COMPLETED" && item.dueDate && new Date(item.dueDate) < new Date()).length, 0),
    delayedMilestones: projects.reduce((count, project) => count + project.milestones.filter((milestone) => milestone.status === "DELAYED").length, 0),
    upcomingMilestones: projects.reduce((count, project) => count + project.milestones.filter((milestone) => milestone.status === "PLANNED" || milestone.status === "IN_PROGRESS").length, 0),
    criticalRisks: projects.reduce((count, project) => count + project.risks.filter((risk) => risk.severity === "CRITICAL").length, 0),
    highRisks: projects.reduce((count, project) => count + project.risks.filter((risk) => risk.severity === "HIGH").length, 0),
    mediumRisks: projects.reduce((count, project) => count + project.risks.filter((risk) => risk.severity === "MEDIUM").length, 0),
    lowRisks: projects.reduce((count, project) => count + project.risks.filter((risk) => risk.severity === "LOW").length, 0),
    openRisks: projects.reduce((count, project) => count + project.risks.filter((risk) => risk.status !== "CLOSED").length, 0),
    linkedIncidents: new Set(projects.flatMap((project) => project.linkedIncidentIds)).size,
    linkedAlerts: projects.reduce((count, project) => count + project.linkedOperationalEntities.filter((entity) => entity.type === "ALERT").length, 0),
    linkedServices: projects.reduce((count, project) => count + project.linkedOperationalEntities.filter((entity) => entity.type === "SERVICE").length, 0),
    linkedSlos: projects.reduce((count, project) => count + project.linkedOperationalEntities.filter((entity) => entity.type === "SLO").length, 0),
  }), [projects]);

  if (!canRead) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
        You do not have permission to view the project portfolio.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FolderKanban}
        title="Project Portfolio"
        subtitle="ASPM project intelligence, delivery status, risks, milestones, and operational linkage."
        iconColor="#a78bfa"
        iconBgColor="rgba(167, 139, 250, 0.12)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-violet-500/10 border border-violet-500/20 text-violet-300">
            Simulated ASPM
          </span>
        }
      />

      {loading && (
        <div className="rounded-2xl surface-card p-12 text-slate-400 text-sm flex items-center justify-center gap-3">
          <Loader2 size={18} className="animate-spin text-violet-400" />
          Loading portfolio intelligence…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-400" />
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="rounded-2xl surface-card p-4 border border-violet-500/20 bg-violet-500/5 text-sm text-violet-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-violet-200/80">Workspace context</div>
              <div className="mt-1 font-semibold text-white">{workspace?.name ?? "Demo workspace"} / {activeEnvironment?.name ?? "Production"}</div>
            </div>
            <div className="text-xs text-violet-200/80 font-mono">{workspace?.id ?? "ws_demo_001"} · {activeEnvironment?.id ?? "env_prod_001"}</div>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-2xl surface-card border border-dashed border-violet-500/30 p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10 text-violet-300">
                <FolderKanban size={24} />
              </div>
              <h3 className="text-xl font-semibold text-white">No projects found</h3>
              <p className="mt-2 text-sm text-slate-300">
                There are no ASPM projects in the active workspace and environment: {workspace?.name ?? "Demo workspace"} / {activeEnvironment?.name ?? "Production"}.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard icon={BriefcaseBusiness} label="Portfolio" value={String(portfolio.activeProjects)} sub="active projects" color="#8b5cf6" />
                <StatCard icon={CheckCircle2} label="On Track" value={String(portfolio.onTrackProjects)} sub="steady delivery" color="#10b981" />
                <StatCard icon={ShieldAlert} label="At Risk" value={String(portfolio.atRiskProjects)} sub="requires attention" color="#f59e0b" />
                <StatCard icon={Target} label="Completion" value={`${portfolio.overallCompletion}%`} sub="weighted portfolio progress" color="#38bdf8" />
                <StatCard icon={AlertTriangle} label="Critical" value={String(portfolio.criticalProjects)} sub="priority interventions" color="#f43f5e" />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <SummaryPanel title="Schedule / Delivery" items={[
                  ["Progress", `${portfolio.overallCompletion}%`],
                  ["Overdue work", String(portfolioContext.overdueWork)],
                  ["Delayed milestones", String(portfolioContext.delayedMilestones)],
                  ["Upcoming milestones", String(portfolioContext.upcomingMilestones)],
                ]} />
                <SummaryPanel title="Risk Health" items={[
                  ["Critical", String(portfolioContext.criticalRisks)],
                  ["High", String(portfolioContext.highRisks)],
                  ["Medium / low", `${portfolioContext.mediumRisks} / ${portfolioContext.lowRisks}`],
                  ["Open / unmitigated", String(portfolioContext.openRisks)],
                ]} />
                <SummaryPanel title="Operational Impact" items={[
                  ["Linked incidents", String(portfolioContext.linkedIncidents)],
                  ["Linked alerts", String(portfolioContext.linkedAlerts)],
                  ["Linked services", String(portfolioContext.linkedServices)],
                  ["SLO links", String(portfolioContext.linkedSlos)],
                ]} />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Sparkles size={15} className="text-violet-400" /> Portfolio Projects
                  </h2>
                  <Link href="/projects" className="text-xs text-violet-300 hover:text-violet-200 flex items-center gap-1">
                    Refresh <ArrowUpRight size={12} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {projects.map((project) => (
                    <div key={project.id} className="rounded-2xl surface-card p-5 flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">{project.priority} priority</p>
                          <h3 className="mt-2 text-xl font-bold text-white">{project.name}</h3>
                        </div>
                        <span className="px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider border-violet-500/30 bg-violet-500/10 text-violet-300">
                          {project.status}
                        </span>
                      </div>

                      <p className="text-sm text-slate-300 leading-relaxed">{project.description}</p>

                      <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                        <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                          <div className="text-slate-400 mb-1">Owner</div>
                          <div className="font-semibold text-white">{project.owner}</div>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                          <div className="text-slate-400 mb-1">Progress</div>
                          <div className="font-semibold text-cyan-300">{project.progress}%</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase tracking-wider">
                          <span>Delivery confidence</span>
                          <span>{project.progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500" style={{ width: `${project.progress}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-300 border-t border-white/[0.06] pt-4">
                        <div className="flex items-center gap-2">
                          <Activity size={14} className="text-cyan-400" />
                          {project.workItems.length} work items
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock3 size={14} className="text-amber-400" />
                          {project.milestones.length} milestones
                        </div>
                        <Link href={`/projects/${project.id}`} className="text-violet-300 hover:text-violet-200 font-medium inline-flex items-center gap-1">
                          Open <ArrowUpRight size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function SummaryPanel({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div className="rounded-2xl surface-card p-5">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">{title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white/[0.03] p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
            <div className="mt-1 text-lg font-bold text-white">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
