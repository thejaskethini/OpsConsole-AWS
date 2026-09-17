"use client";

import { useCallback, useEffect, useState } from "react";
import { BrainCircuit, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useIdentity } from "@/components/identity/IdentityProvider";
import type { Project } from "@/modules/projects";

const questions = ["Is this project at risk?", "Why is the project behind schedule?", "What are the highest risks?", "Which milestones are delayed?", "Which work items are blocked?", "What operational issues affect delivery?", "Explain project health.", "What should management review?", "How did an incident affect this project?", "Show estimation analysis."];
interface IntelligenceResponse { project: Project; health: { indicators: Array<{ label: string; value: string; description: string }> }; workItems: Project["workItems"]; milestones: Project["milestones"]; dependencies: unknown[]; risks: Project["risks"]; evidence: Array<{ source: string; detail: string }> }

export default function ProjectIntelligencePage() {
  const { workspace, activeEnvironment, can } = useIdentity();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [data, setData] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState(questions[0]);

  const loadIntelligence = useCallback(async (id: string, workspaceId = workspace?.id, environmentId = activeEnvironment?.id) => {
    if (!workspaceId || !environmentId || !id) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ workspaceId, environmentId, projectId: id });
      const response = await fetch(`/api/projects/intelligence?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload.project) throw new Error(payload.error || "Project intelligence is unavailable for this project");
      setData(payload);
    } catch (err: unknown) {
      setData(null);
      setError(err instanceof Error ? err.message : "Unable to load intelligence");
    } finally {
      setLoading(false);
    }
  }, [workspace?.id, activeEnvironment?.id]);

  useEffect(() => {
    if (!workspace || !activeEnvironment) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ workspaceId: workspace.id, environmentId: activeEnvironment.id });
    fetch(`/api/projects?${params.toString()}`).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load projects");
      const nextProjects = payload.projects || [];
      setProjects(nextProjects);
      const nextId = nextProjects[0]?.id || "";
      setProjectId(nextId);
      if (nextId) await loadIntelligence(nextId, workspace.id, activeEnvironment.id);
      else { setData(null); setLoading(false); }
    }).catch((err: unknown) => { setData(null); setError(err instanceof Error ? err.message : "Unable to load projects"); setLoading(false); });
  }, [workspace, activeEnvironment, loadIntelligence]);

  if (!can("projects:read") || !can("intelligence:read")) return <PermissionNotice />;
  const answer = data ? answerQuestion(selectedQuestion, data) : "Select a project to inspect deterministic project intelligence.";
  return <div className="space-y-6"><PageHeader icon={BrainCircuit} title="AI Project Manager" subtitle="Controlled project intelligence backed by deterministic tools and evidence." iconColor="#c084fc" iconBgColor="rgba(192, 132, 252, 0.12)" tag={<span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-mono text-violet-200">TOOL-BACKED · NO RUNTIME LLM</span>} /><div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-xs text-violet-100">Active project context is sent to the controlled intelligence API for every question. No runtime LLM is configured.</div>{loading && <div className="rounded-2xl surface-card p-12 flex justify-center gap-3 text-sm text-slate-400"><Loader2 size={18} className="animate-spin text-violet-400" /> Loading project intelligence...</div>}{error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>}{!loading && !error && <><div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5"><aside className="rounded-2xl surface-card p-4"><label className="text-[11px] uppercase tracking-wider text-slate-400">Active project<select value={projectId} onChange={(event) => { setProjectId(event.target.value); void loadIntelligence(event.target.value); }} className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0c1322] px-3 py-2 text-xs text-slate-200">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><div className="mt-5 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-xs text-violet-100">{data?.project.name || "No project selected"}<div className="mt-1 text-violet-200/70">{data?.project.status || "UNAVAILABLE"} · {data?.project.progress ?? 0}% complete</div></div><div className="mt-5 space-y-1">{questions.map((question) => <button key={question} onClick={() => setSelectedQuestion(question)} className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${selectedQuestion === question ? "bg-violet-500/15 text-violet-200" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"}`}>{question}</button>)}</div></aside><section className="rounded-2xl surface-card p-5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300"><Sparkles size={15} className="text-violet-400" />{selectedQuestion}</div><div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm leading-relaxed text-slate-200">{answer}</div>{data && <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">{data.evidence.map((item) => <div key={item.source} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="text-[10px] uppercase tracking-wider text-cyan-300">{item.source}</div><div className="mt-2 text-xs text-slate-300">{item.detail}</div></div>)}</div>}</section></div></>}</div>;
}

function answerQuestion(question: string, data: IntelligenceResponse): string { const blocked = data.workItems.filter((item) => item.status === "BLOCKED").length; const delayed = data.milestones.filter((item) => item.status === "DELAYED").length; const critical = data.risks.filter((risk) => risk.severity === "CRITICAL").length; const high = data.risks.filter((risk) => risk.severity === "HIGH").length; const schedule = data.health.indicators.find((indicator) => indicator.label === "Schedule variance"); if (question.includes("at risk")) return `PROJECT STATUS: ${data.project.status}. OBSERVED: progress ${data.project.progress}%, critical risks ${critical}, high risks ${high}, delayed milestones ${delayed}, blocked work items ${blocked}, linked incidents ${data.project.linkedIncidentIds.length}. INFERRED: review the blocked and incident-linked delivery path before execution.`; if (question.includes("behind")) return `CALCULATED: ${schedule?.value || "Schedule variance unavailable"}. ${schedule?.description || "UNAVAILABLE: schedule calculation was not returned."}`; if (question.includes("highest risks")) return data.risks.slice().sort((a, b) => b.probability * b.impact - a.probability * a.impact).slice(0, 3).map((risk) => `${risk.severity}: ${risk.description} (priority ${(risk.probability * risk.impact).toFixed(2)})`).join(" ") || "UNAVAILABLE: no project risks are currently recorded."; if (question.includes("milestones")) return `OBSERVED: ${delayed} milestones are delayed and ${data.milestones.filter((item) => item.status === "IN_PROGRESS").length} are in progress.`; if (question.includes("blocked")) return `OBSERVED: ${blocked} work items are blocked and ${data.workItems.filter((item) => item.status === "IN_PROGRESS").length} are in progress.`; if (question.includes("operational")) return `OBSERVED: ${data.project.linkedOperationalEntities.length} operational entities and ${data.project.linkedIncidentIds.length} incidents are linked to this project.`; if (question.includes("incident")) return data.project.linkedIncidentIds.length ? `OBSERVED: linked incidents ${data.project.linkedIncidentIds.join(", ")}. INFERRED: review the associated risk and delivery impact before approval.` : "UNAVAILABLE: no incident is linked to this project."; if (question.includes("estimation")) return "UNAVAILABLE in this context: open Estimates for deterministic Function Points, COCOMO, NPV, and ROI analysis."; return data.health.indicators.map((indicator) => `${indicator.label}: ${indicator.value}`).join(" · "); }
function PermissionNotice() { return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-300">You do not have permission to view project intelligence.</div>; }
