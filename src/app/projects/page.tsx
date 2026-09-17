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

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load projects");
      }

      setProjects(data.data.projects || []);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon={BriefcaseBusiness} label="Portfolio" value={String(portfolio.activeProjects)} sub="active projects" color="#8b5cf6" />
            <StatCard icon={CheckCircle2} label="On Track" value={String(portfolio.onTrackProjects)} sub="steady delivery" color="#10b981" />
            <StatCard icon={ShieldAlert} label="At Risk" value={String(portfolio.atRiskProjects)} sub="requires attention" color="#f59e0b" />
            <StatCard icon={Target} label="Completion" value={`${portfolio.overallCompletion}%`} sub="weighted portfolio progress" color="#38bdf8" />
            <StatCard icon={AlertTriangle} label="Critical" value={String(portfolio.criticalProjects)} sub="priority interventions" color="#f43f5e" />
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
    </div>
  );
}
