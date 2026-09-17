"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useIdentity } from "@/components/identity/IdentityProvider";
import type { Project, WorkItem } from "@/modules/projects";
import { formatProjectDate, loadProjectPortfolio } from "@/app/projects/project-data";

type WorkItemRow = WorkItem & { projectName: string };

export default function ProjectWorkItemsPage() {
  const { workspace, activeEnvironment, can } = useIdentity();
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [projectId, setProjectId] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace || !activeEnvironment) return;
    loadProjectPortfolio(workspace.id, activeEnvironment.id)
      .then((data) => setProjects(data.projects))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load work items"))
      .finally(() => setLoading(false));
  }, [workspace, activeEnvironment]);

  const rows = useMemo<WorkItemRow[]>(() => projects.flatMap((project) => project.workItems.map((item) => ({ ...item, projectName: project.name }))), [projects]);
  const filtered = rows.filter((item) => (status === "ALL" || item.status === status) && (priority === "ALL" || item.priority === priority) && (projectId === "ALL" || item.projectId === projectId));
  const isOverdue = (item: WorkItem) => item.status !== "COMPLETED" && !!item.dueDate && new Date(item.dueDate) < new Date();

  if (!can("projects:read")) return <PermissionNotice />;
  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardList} title="Project Work Items" subtitle="Execution work across the active project portfolio." iconColor="#38bdf8" iconBgColor="rgba(56, 189, 248, 0.12)" />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <>
          <ScopeBanner workspaceName={workspace?.name} environmentName={activeEnvironment?.name} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FilterSelect label="Status" value={status} onChange={setStatus} options={["ALL", "TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"]} />
            <FilterSelect label="Priority" value={priority} onChange={setPriority} options={["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"]} />
            <FilterSelect label="Project" value={projectId} onChange={setProjectId} options={["ALL", ...projects.map((project) => project.id)]} labels={new Map(projects.map((project) => [project.id, project.name]))} />
          </div>
          <div className="rounded-2xl surface-card overflow-hidden">
            <DataTable headers={["Project", "Work item", "Owner", "Priority", "Status", "Estimate", "Due", "Milestone", "Dependencies", "Incident"]}>
              {filtered.map((item) => <tr key={item.id} className="border-t border-white/[0.06] text-xs text-slate-300"><td className="px-4 py-3 font-medium text-white">{item.projectName}</td><td className="px-4 py-3 min-w-52">{item.title}<div className="text-[11px] text-slate-500 mt-1">{item.description}</div></td><td className="px-4 py-3">{item.owner}</td><td className={`px-4 py-3 ${item.priority === "CRITICAL" ? "text-rose-300 font-semibold" : ""}`}>{item.priority}</td><td className={`px-4 py-3 font-semibold ${item.status === "BLOCKED" ? "text-rose-300" : "text-cyan-300"}`}>{item.status}{isOverdue(item) && <div className="text-amber-300">OVERDUE</div>}</td><td className="px-4 py-3">{item.estimate}h</td><td className="px-4 py-3">{formatProjectDate(item.dueDate)}</td><td className="px-4 py-3">{item.milestoneId || "-"}</td><td className="px-4 py-3">{item.dependencyIds.length || "-"}</td><td className="px-4 py-3">{item.linkedIncidentId || "-"}</td></tr>)}
            </DataTable>
            {filtered.length === 0 && <EmptyState label="No work items match these filters." />}
          </div>
        </>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Map<string, string> }) { return <label className="text-[11px] uppercase tracking-wider text-slate-400">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0c1322] px-3 py-2 text-xs text-slate-200">{options.map((option) => <option key={option} value={option}>{labels?.get(option) || option}</option>)}</select></label>; }
function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead><tr className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-slate-400">{headers.map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function ScopeBanner({ workspaceName, environmentName }: { workspaceName?: string; environmentName?: string }) { return <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-xs text-cyan-100">Active scope: <span className="font-semibold">{workspaceName || "Workspace"}</span> / <span className="font-semibold">{environmentName || "Environment"}</span> · SIMULATED</div>; }
function LoadingState() { return <div className="rounded-2xl surface-card p-12 flex justify-center gap-3 text-sm text-slate-400"><Loader2 size={18} className="animate-spin text-cyan-400" /> Loading project work items...</div>; }
function ErrorState({ message }: { message: string }) { return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 flex gap-2"><AlertTriangle size={16} />{message}</div>; }
function EmptyState({ label }: { label: string }) { return <div className="p-10 text-center text-sm text-slate-400">{label}</div>; }
function PermissionNotice() { return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-300">You do not have permission to view project work items.</div>; }