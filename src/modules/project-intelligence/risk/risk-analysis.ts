import type { Project, Risk } from "@/modules/projects";

export function analyzeProjectRisk(project: Project): {
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  unmitigatedRisks: number;
  risksWithoutOwners: number;
  prioritizedRisks: Array<{ id: string; description: string; severity: Risk["severity"]; probability: number; impact: number }>;
} {
  const criticalRisks = project.risks.filter((risk) => risk.severity === "CRITICAL").length;
  const highRisks = project.risks.filter((risk) => risk.severity === "HIGH").length;
  const mediumRisks = project.risks.filter((risk) => risk.severity === "MEDIUM").length;
  const lowRisks = project.risks.filter((risk) => risk.severity === "LOW").length;
  const unmitigatedRisks = project.risks.filter((risk) => risk.status !== "CLOSED" && !risk.mitigation.trim()).length;
  const risksWithoutOwners = project.risks.filter((risk) => !risk.owner || risk.owner.trim().length === 0).length;

  return {
    criticalRisks,
    highRisks,
    mediumRisks,
    lowRisks,
    unmitigatedRisks,
    risksWithoutOwners,
    prioritizedRisks: [...project.risks]
      .sort((a, b) => b.probability * b.impact - a.probability * a.impact)
      .slice(0, 5)
      .map((risk) => ({
        id: risk.id,
        description: risk.description,
        severity: risk.severity,
        probability: risk.probability,
        impact: risk.impact,
      })),
  };
}
