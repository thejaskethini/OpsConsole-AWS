"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, Loader2, Pencil, Plus } from "lucide-react";
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
  const [editor, setEditor] = useState<WorkItem | null | undefined>(undefined);
  const canManage = can("projects:manage");

  const refresh = () => {
    if (!workspace || !activeEnvironment) return Promise.resolve();
    return loadProjectPortfolio(workspace.id, activeEnvironment.id).then((data) => setProjects(data.projects));
  };

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

  async function saveWorkItem(input: Record<string, string>) {
    if (!workspace || !activeEnvironment) return;
    const existing = editor && editor !== null ? editor : null;
    const response = await fetch("/api/projects/work-items", { method: existing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: workspace.id, environmentId: activeEnvironment.id, ...(existing ? { workItemId: existing.id } : {}), ...input, estimate: Number(input.estimate || 0), dependencyIds: input.dependencyIds ? input.dependencyIds.split(",").map((value) => value.trim()).filter(Boolean) : [] }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to save work item");
    setEditor(undefined);
    await refresh();
  }

  if (!can("projects:read")) return <PermissionNotice />;
  return (
    <div className="space-y-6">
      <PageHeader icon={ClipboardList} title="Project Work Items" subtitle="Execution work across the active project portfolio." iconColor="#38bdf8" iconBgColor="rgba(56, 189, 248, 0.12)" actions={canManage ? <button type="button" onClick={() => setEditor(null)} className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 border border-cyan-500/30"><Plus size={14} /> New Work Item</button> : undefined} />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <>
          <ScopeBanner workspaceName={workspace?.name} environmentName={activeEnvironment?.name} />
          {editor !== undefined && <WorkItemEditor item={editor} projects={projects} onCancel={() => setEditor(undefined)} onSave={saveWorkItem} />}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FilterSelect label="Status" value={status} onChange={setStatus} options={["ALL", "TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"]} />
            <FilterSelect label="Priority" value={priority} onChange={setPriority} options={["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"]} />
            <FilterSelect label="Project" value={projectId} onChange={setProjectId} options={["ALL", ...projects.map((project) => project.id)]} labels={new Map(projects.map((project) => [project.id, project.name]))} />
          </div>
          <div className="rounded-2xl surface-card overflow-hidden">
            <DataTable headers={["Project", "Work item", "Owner", "Priority", "Status", "Estimate", "Due", "Milestone", "Dependencies", "Incident", "Actions"]}>
              {filtered.map((item) => <tr key={item.id} className="border-t border-white/[0.06] text-xs text-slate-300"><td className="px-4 py-3 font-medium text-white">{item.projectName}</td><td className="px-4 py-3 min-w-52">{item.title}<div className="text-[11px] text-slate-500 mt-1">{item.description}</div></td><td className="px-4 py-3">{item.owner}</td><td className={`px-4 py-3 ${item.priority === "CRITICAL" ? "text-rose-300 font-semibold" : ""}`}>{item.priority}</td><td className={`px-4 py-3 font-semibold ${item.status === "BLOCKED" ? "text-rose-300" : "text-cyan-300"}`}>{item.status}{isOverdue(item) && <div className="text-amber-300">OVERDUE</div>}</td><td className="px-4 py-3">{item.estimate}h</td><td className="px-4 py-3">{formatProjectDate(item.dueDate)}</td><td className="px-4 py-3">{item.milestoneId || "-"}</td><td className="px-4 py-3">{item.dependencyIds.length || "-"}</td><td className="px-4 py-3">{item.linkedIncidentId || "-"}</td><td className="px-4 py-3">{canManage && <button type="button" onClick={() => setEditor(item)} className="text-slate-400 hover:text-cyan-200"><Pencil size={13} /></button>}</td></tr>)}
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

function WorkItemEditor({ item, projects, onCancel, onSave }: { item: WorkItem | null; projects: Project[]; onCancel: () => void; onSave: (input: Record<string, string>) => Promise<void> }) {
  const [form, setForm] = useState({ projectId: item?.projectId || projects[0]?.id || "", title: item?.title || "", description: item?.description || "", owner: item?.owner || "", priority: item?.priority || "MEDIUM", status: item?.status || "TODO", estimate: String(item?.estimate || 0), dueDate: item?.dueDate?.slice(0, 10) || "", milestoneId: item?.milestoneId || "", dependencyIds: item?.dependencyIds.join(", ") || "" });
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <form onSubmit={(event) => { event.preventDefault(); void onSave(form); }} className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5 mb-4 space-y-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-white">{item ? "Edit work item" : "New work item"}</h2><button type="button" onClick={onCancel} className="text-slate-400">×</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Project" value={form.projectId} onChange={(value) => update("projectId", value)} options={projects.map((project) => project.id)} /><Field label="Title" value={form.title} onChange={(value) => update("title", value)} /><Field label="Owner" value={form.owner} onChange={(value) => update("owner", value)} /><Field label="Estimate hours" value={form.estimate} onChange={(value) => update("estimate", value)} /><Field label="Due date" value={form.dueDate} onChange={(value) => update("dueDate", value)} type="date" /><Field label="Milestone ID" value={form.milestoneId} onChange={(value) => update("milestoneId", value)} /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Priority" value={form.priority} onChange={(value) => update("priority", value)} options={["LOW", "MEDIUM", "HIGH", "CRITICAL"]} /><Field label="Status" value={form.status} onChange={(value) => update("status", value)} options={["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"]} /></div><label className="block text-[11px] uppercase tracking-wider text-slate-400">Description<textarea value={form.description} onChange={(event) => update("description", event.target.value)} className="mt-1 min-h-16 w-full rounded-lg border border-white/[0.08] bg-[#0c1322] px-3 py-2 text-xs text-slate-200" /></label><Field label="Dependency IDs (comma-separated)" value={form.dependencyIds} onChange={(value) => update("dependencyIds", value)} /><div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-slate-300">Cancel</button><button type="submit" className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950">Save work item</button></div></form>;
}

function Field({ label, value, onChange, options, type = "text" }: { label: string; value: string; onChange: (value: string) => void; options?: string[]; type?: string }) { return <label className="text-[11px] uppercase tracking-wider text-slate-400">{label}{options ? <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0c1322] px-3 py-2 text-xs text-slate-200">{options.map((option) => <option key={option}>{option}</option>)}</select> : <input required={label !== "Milestone ID" && label !== "Dependency IDs (comma-separated)"} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0c1322] px-3 py-2 text-xs text-slate-200" />}</label>; }