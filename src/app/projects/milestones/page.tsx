"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useIdentity } from "@/components/identity/IdentityProvider";
import type { Project } from "@/modules/projects";
import { formatProjectDate, loadProjectPortfolio } from "@/app/projects/project-data";

export default function ProjectMilestonesPage() {
  const { workspace, activeEnvironment, can } = useIdentity();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!workspace || !activeEnvironment) return; loadProjectPortfolio(workspace.id, activeEnvironment.id).then((data) => setProjects(data.projects)).catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load milestones")).finally(() => setLoading(false)); }, [workspace, activeEnvironment]);
  const milestones = useMemo(() => projects.flatMap((project) => project.milestones.map((milestone) => ({ ...milestone, projectName: project.name, workItems: project.workItems.filter((item) => item.milestoneId === milestone.id), risks: project.risks.filter((risk) => risk.projectId === project.id), links: project.linkedOperationalEntities }))), [projects]);
  if (!can("projects:read")) return <PermissionNotice />;
  return <div className="space-y-6"><PageHeader icon={CalendarDays} title="Project Milestones" subtitle="Delivery checkpoints, operational context, and schedule health." iconColor="#f59e0b" iconBgColor="rgba(245, 158, 11, 0.12)" />{loading && <LoadingState />}{error && <ErrorState message={error} />}{!loading && !error && <><ScopeBanner workspaceName={workspace?.name} environmentName={activeEnvironment?.name} /><div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{milestones.map((milestone) => <div key={milestone.id} className={`rounded-2xl surface-card p-5 border ${milestone.status === "DELAYED" ? "border-rose-500/30" : "border-white/[0.06]"}`}><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] uppercase tracking-wider text-slate-400">{milestone.projectName}</div><h2 className="mt-2 text-lg font-semibold text-white">{milestone.name}</h2></div><span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-200">{milestone.status}</span></div><p className="mt-2 text-sm text-slate-300">{milestone.description}</p><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><Info label="Owner" value={milestone.owner} /><Info label="Planned" value={formatProjectDate(milestone.plannedDate)} /><Info label="Actual" value={formatProjectDate(milestone.actualDate)} /><Info label="Related work" value={String(milestone.workItems.length)} /></div>{milestone.status === "DELAYED" && <div className="mt-4 flex gap-2 text-xs text-rose-200"><AlertTriangle size={14} /> Delayed milestone requires delivery review.</div>}<div className="mt-4 border-t border-white/[0.06] pt-3 text-[11px] text-slate-400">{milestone.risks.length} project risks · {milestone.links.length} operational links</div></div>)}</div>{milestones.length === 0 && <EmptyState />}</>}</div>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-white/[0.03] p-3"><div className="text-slate-500">{label}</div><div className="mt-1 font-semibold text-slate-200">{value}</div></div>; }
function ScopeBanner({ workspaceName, environmentName }: { workspaceName?: string; environmentName?: string }) { return <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-xs text-cyan-100">Active scope: <span className="font-semibold">{workspaceName || "Workspace"}</span> / <span className="font-semibold">{environmentName || "Environment"}</span> · SIMULATED</div>; }
function LoadingState() { return <div className="rounded-2xl surface-card p-12 flex justify-center gap-3 text-sm text-slate-400"><Loader2 size={18} className="animate-spin text-amber-400" /> Loading milestones...</div>; }
function ErrorState({ message }: { message: string }) { return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 flex gap-2"><AlertTriangle size={16} />{message}</div>; }
function EmptyState() { return <div className="rounded-2xl surface-card p-10 text-center text-sm text-slate-400">No milestones found in the active scope.</div>; }
function PermissionNotice() { return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-300">You do not have permission to view project milestones.</div>; }