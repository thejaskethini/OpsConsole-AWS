import type {
  Project,
  ProjectHealthSummary,
  PortfolioHealthSummary,
  Risk,
  ProjectRiskInput,
} from "./types";
import { LocalProjectRepository, type ProjectRepository } from "./repository";

function deriveScheduleSnapshot(project: Project) {
  const now = Date.now();
  const startMs = new Date(project.plannedStart).getTime();
  const endMs = new Date(project.plannedEnd).getTime();
  const durationMs = Math.max(1, endMs - startMs);
  const elapsedMs = Math.max(0, Math.min(durationMs, now - startMs));
  const plannedCompletion = Math.max(0, Math.min(100, (elapsedMs / durationMs) * 100));
  const actualCompletion = Math.max(0, Math.min(100, project.progress));
  return {
    plannedCompletion: Number(plannedCompletion.toFixed(2)),
    actualCompletion: Number(actualCompletion.toFixed(2)),
    scheduleVariance: Number((actualCompletion - plannedCompletion).toFixed(2)),
  };
}

export class ProjectEngine {
  constructor(private repo: ProjectRepository) {}

  async createProject(project: Project): Promise<Project> {
    return this.repo.upsertProject(project);
  }

  async createRisk(risk: Risk): Promise<Risk> {
    return this.repo.createRisk(risk.workspaceId, risk.environmentId, risk);
  }

  async getProjectProgress(projectId: string, workspaceId: string, environmentId: string): Promise<number> {
    const project = await this.repo.getProjectById(workspaceId, environmentId, projectId);
    if (!project) return 0;
    return project.progress;
  }
}

export class ProjectHealthEngine {
  calculatePortfolioHealth(projects: Project[], operationalContext?: {
    activeIncidents?: number;
    criticalAlerts?: number;
    affectedServices?: number;
    sloIssues?: number;
    notificationFailures?: number;
  }): PortfolioHealthSummary {
    const activeProjects = projects.length;
    const onTrackProjects = projects.filter((project) => project.status === "ON_TRACK" || project.status === "ACTIVE").length;
    const atRiskProjects = projects.filter((project) => project.status === "AT_RISK" || project.status === "CRITICAL").length;
    const criticalProjects = projects.filter((project) => project.status === "CRITICAL").length;
    const overallCompletion = projects.length > 0 ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length) : 0;

    const overdueWorkItems = projects.reduce((sum, project) => sum + project.workItems.filter((item) => item.status !== "COMPLETED" && item.dueDate && new Date(item.dueDate) < new Date()).length, 0);
    const delayedMilestones = projects.reduce((sum, project) => sum + project.milestones.filter((item) => item.status === "DELAYED").length, 0);
    const upcomingMilestones = projects.reduce((sum, project) => sum + project.milestones.filter((item) => item.status === "PLANNED" || item.status === "IN_PROGRESS").length, 0);
    const totalOpenRisks = projects.reduce((sum, project) => sum + project.risks.filter((risk) => risk.status !== "CLOSED").length, 0);
    const scheduleSnapshots = projects.map((project) => deriveScheduleSnapshot(project));
    const plannedCompletion = projects.length > 0 ? Number((scheduleSnapshots.reduce((sum, snap) => sum + snap.plannedCompletion, 0) / projects.length).toFixed(2)) : 0;
    const actualCompletion = Math.max(0, Math.min(100, overallCompletion));
    const scheduleVariance = projects.length > 0 ? Number((scheduleSnapshots.reduce((sum, snap) => sum + snap.scheduleVariance, 0) / projects.length).toFixed(2)) : 0;

    return {
      activeProjects,
      onTrackProjects,
      atRiskProjects,
      criticalProjects,
      overallCompletion,
      portfolioStatus: criticalProjects > 0 ? "CRITICAL" : atRiskProjects > 0 ? "AT_RISK" : "ON_TRACK",
      indicators: [
        { label: "Active projects", value: String(activeProjects), description: "Projects currently in the portfolio." },
        { label: "On track", value: String(onTrackProjects), description: "Projects meeting current delivery plan." },
        { label: "At risk", value: String(atRiskProjects), description: "Projects with material schedule or risk pressure." },
        { label: "Critical", value: String(criticalProjects), description: "Projects with critical delivery or operational dependency risk." },
        { label: "Open risks", value: String(totalOpenRisks), description: "Risks needing active mitigation across the portfolio." },
        { label: "Overall completion", value: `${overallCompletion}%`, description: "Portfolio completion estimate across active projects." },
      ],
      scheduleSummary: {
        plannedCompletion,
        actualCompletion,
        scheduleVariance,
        overdueWorkItems,
        delayedMilestones,
        upcomingMilestones,
      },
      operationalContext: {
        activeIncidents: operationalContext?.activeIncidents ?? 0,
        criticalAlerts: operationalContext?.criticalAlerts ?? 0,
        affectedServices: operationalContext?.affectedServices ?? 0,
        sloIssues: operationalContext?.sloIssues ?? 0,
        notificationFailures: operationalContext?.notificationFailures ?? 0,
      },
    };
  }

  getProjectHealth(project: Project): ProjectHealthSummary {
    const overdueWorkItems = project.workItems.filter((item) => item.status !== "COMPLETED" && item.dueDate && new Date(item.dueDate) < new Date()).length;
    const delayedMilestones = project.milestones.filter((item) => item.status === "DELAYED").length;
    const criticalRisks = project.risks.filter((risk) => risk.severity === "CRITICAL").length;
    const openRisks = project.risks.filter((risk) => risk.status !== "CLOSED").length;
    const schedule = deriveScheduleSnapshot(project);

    return {
      projectId: project.id,
      projectName: project.name,
      status: project.status,
      completionPercent: project.progress,
      scheduleVariancePercent: schedule.scheduleVariance,
      overdueWorkItems,
      delayedMilestones,
      openRisks,
      criticalRisks,
      indicators: [
        { label: "Progress", value: `${project.progress}%`, description: "Current completion estimate." },
        { label: "Risk count", value: String(project.risks.length), description: "Total tracked risks." },
        { label: "Delayed milestones", value: String(delayedMilestones), description: "Milestones behind the planned date." },
        { label: "Work items overdue", value: String(overdueWorkItems), description: "Task items already past due date." },
      ],
      summary: project.status === "AT_RISK"
        ? "Primary degradation factor: schedule pressure and linked operational incidents affecting the critical migration path."
        : project.status === "ON_TRACK"
          ? "Observed reliability signal: current project execution remains aligned with the planned delivery sequence."
          : "Observed reliability signal: project is in planning and has not yet entered the active delivery phase.",
    };
  }
}

export function createProjectRiskFromIncident({
  project,
  incident,
  riskInput,
}: {
  project: Project;
  incident: { id: string; title: string; severity: string; summary?: string; workspaceId?: string; environmentId?: string };
  riskInput: ProjectRiskInput;
}): Risk {
  const severity = calculateRiskSeverity(riskInput.probability, riskInput.impact);

  return {
    id: `risk-${Date.now().toString(36)}`,
    projectId: project.id,
    workspaceId: riskInput.workspaceId || project.workspaceId,
    environmentId: riskInput.environmentId || project.environmentId,
    description: riskInput.description || `Risk created from incident ${incident.id}: ${incident.title}`,
    probability: riskInput.probability,
    impact: riskInput.impact,
    severity,
    owner: riskInput.owner,
    mitigation: riskInput.mitigation,
    status: riskInput.status,
    source: riskInput.source,
    linkedIncidentId: riskInput.linkedIncidentId || incident.id,
    createdAt: new Date().toISOString(),
  };
}

export function calculateRiskSeverity(probability: number, impact: number): Risk["severity"] {
  const combined = Math.max(0, Math.min(1, probability)) * Math.max(0, Math.min(1, impact));
  return combined >= 0.7 ? "CRITICAL" : combined >= 0.5 ? "HIGH" : combined >= 0.3 ? "MEDIUM" : "LOW";
}

export function analyzeProjectRisk(project: Project): { criticalRisks: number; highRisks: number; mediumRisks: number; lowRisks: number; unmitigatedRisks: number; risksWithoutOwners: number; prioritizedRisks: Array<{ id: string; description: string; severity: Risk["severity"]; probability: number; impact: number }> } {
  const criticalRisks = project.risks.filter((risk) => risk.severity === "CRITICAL").length;
  const highRisks = project.risks.filter((risk) => risk.severity === "HIGH").length;
  const mediumRisks = project.risks.filter((risk) => risk.severity === "MEDIUM").length;
  const lowRisks = project.risks.filter((risk) => risk.severity === "LOW").length;
  const unmitigatedRisks = project.risks.filter((risk) => risk.status !== "CLOSED" && risk.mitigation.trim().length === 0).length;
  const risksWithoutOwners = project.risks.filter((risk) => !risk.owner || risk.owner.trim().length === 0).length;

  const prioritizedRisks = [...project.risks]
    .sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact))
    .slice(0, 5)
    .map((risk) => ({
      id: risk.id,
      description: risk.description,
      severity: risk.severity,
      probability: risk.probability,
      impact: risk.impact,
    }));

  return {
    criticalRisks,
    highRisks,
    mediumRisks,
    lowRisks,
    unmitigatedRisks,
    risksWithoutOwners,
    prioritizedRisks,
  };
}

export type ProjectRepositoryFactory = () => ProjectRepository;

let repositoryInstance: ProjectRepository | null = null;

export function getProjectRepository(): ProjectRepository {
  if (!repositoryInstance) repositoryInstance = new LocalProjectRepository();
  return repositoryInstance;
}
