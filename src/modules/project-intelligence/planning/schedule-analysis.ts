import type { Project, WorkItem } from "@/modules/projects";

export function analyzeSchedule(projectOrData: Project | { plannedStart: string; plannedEnd: string; actualStart?: string; actualEnd?: string; progress: number; workItems?: WorkItem[] }, options?: {
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  progress?: number;
  workItems?: WorkItem[];
}): {
  plannedCompletion: number;
  actualCompletion: number;
  scheduleVariance: number;
  overdueWorkItems: number;
  delayedMilestones: number;
  upcomingMilestones: number;
  explanation: string;
} {
  const plannedStart = options?.plannedStart ?? projectOrData.plannedStart;
  const plannedEnd = options?.plannedEnd ?? projectOrData.plannedEnd;
  const progress = options?.progress ?? projectOrData.progress;
  const workItems = options?.workItems ?? projectOrData.workItems ?? [];

  const startMs = new Date(plannedStart).getTime();
  const endMs = new Date(plannedEnd).getTime();
  const nowMs = Date.now();
  const durationMs = Math.max(1, endMs - startMs);
  const projectedMs = Math.max(0, Math.min(durationMs, nowMs - startMs));
  const plannedCompletion = Math.max(0, Math.min(100, (projectedMs / durationMs) * 100));
  const actualCompletion = Math.max(0, Math.min(100, progress));
  const scheduleVariance = Number((actualCompletion - plannedCompletion).toFixed(2));
  const overdueWorkItems = workItems.filter((item) => item.status !== "COMPLETED" && item.dueDate && new Date(item.dueDate) < new Date()).length;
  const delayedMilestones = "milestones" in projectOrData && projectOrData.milestones ? projectOrData.milestones.filter((item) => item.status === "DELAYED").length : 0;
  const upcomingMilestones = "milestones" in projectOrData && projectOrData.milestones ? projectOrData.milestones.filter((item) => item.status === "PLANNED" || item.status === "IN_PROGRESS").length : 0;

  return {
    plannedCompletion: Number(plannedCompletion.toFixed(2)),
    actualCompletion: Number(actualCompletion.toFixed(2)),
    scheduleVariance,
    overdueWorkItems,
    delayedMilestones,
    upcomingMilestones,
    explanation: scheduleVariance > 0
      ? "Observed reliability signal: execution is ahead of the baseline schedule."
      : scheduleVariance < 0
        ? "Primary degradation factor: execution is behind the planned trajectory and requires intervention."
        : "Observed reliability signal: current schedule is aligned with the planned baseline.",
  };
}
