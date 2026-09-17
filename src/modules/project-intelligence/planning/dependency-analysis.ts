import type { Project } from "@/modules/projects";

export function analyzeDependencies(project: Project): {
  totalDependencies: number;
  blockedDependencies: number;
  criticalDependencies: number;
  explanation: string;
} {
  const workItems = project.workItems ?? [];
  const totalDependencies = workItems.reduce((sum, workItem) => sum + workItem.dependencyIds.length, 0);
  const blockedDependencies = workItems.filter((item) => item.status === "BLOCKED").length;
  const criticalDependencies = workItems.filter((item) => item.priority === "CRITICAL" && item.status !== "COMPLETED").length;

  return {
    totalDependencies,
    blockedDependencies,
    criticalDependencies,
    explanation: blockedDependencies > 0
      ? "Affected dependency: blocked work items are delaying downstream execution."
      : "Observed reliability signal: dependency network is stable and no major blockers are currently exposed.",
  };
}
