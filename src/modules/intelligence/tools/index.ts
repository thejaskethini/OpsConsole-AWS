import { getProjectRepository, type Project, type WorkItem, type Milestone, type Risk, type Dependency } from "@/modules/projects";
import { getNotificationRepository } from "@/modules/notifications";
import { getIncidentRepository } from "@/modules/incidents";
import { getCloudProvider } from "@/modules/cloud";
import {
  analyzeSchedule as projectAnalyzeSchedule,
  analyzeDependencies as projectAnalyzeDependencies,
  analyzeProjectRisk as projectAnalyzeProjectRisk,
  calculateFunctionPoints as projectCalculateFunctionPoints,
  calculateCOCOMO as projectCalculateCOCOMO,
  calculateNPV as projectCalculateNPV,
  calculateROI as projectCalculateROI,
} from "@/modules/project-intelligence";

export interface ProjectIntelligenceToolset {
  getProject(projectId: string, workspaceId: string, environmentId: string): Promise<Project | null>;
  getProjects(workspaceId: string, environmentId: string): Promise<Project[]>;
  getWorkItems(workspaceId: string, environmentId: string, projectId?: string): Promise<WorkItem[]>;
  getMilestones(workspaceId: string, environmentId: string, projectId?: string): Promise<Milestone[]>;
  getDependencies(workspaceId: string, environmentId: string, projectId?: string): Promise<Dependency[]>;
  getRisks(workspaceId: string, environmentId: string, projectId?: string): Promise<Risk[]>;
  getProjectProgress(projectId: string, workspaceId: string, environmentId: string): Promise<number>;
  getProjectHealth(projectId: string, workspaceId: string, environmentId: string): Promise<{ projectId: string; projectName: string; status: string; completionPercent: number; indicators: Array<{ label: string; value: string; description: string }> }>; 
}

export function getProjectIntelligenceToolset(): ProjectIntelligenceToolset {
  const repo = getProjectRepository();
  const incidents = getIncidentRepository();
  const notifications = getNotificationRepository();
  const cloud = getCloudProvider();

  return {
    async getProject(projectId: string, workspaceId: string, environmentId: string) {
      return repo.getProjectById(workspaceId, environmentId, projectId);
    },
    async getProjects(workspaceId: string, environmentId: string) {
      return repo.listProjects(workspaceId, environmentId);
    },
    async getWorkItems(workspaceId: string, environmentId: string, projectId?: string) {
      return repo.listWorkItems(workspaceId, environmentId, projectId);
    },
    async getMilestones(workspaceId: string, environmentId: string, projectId?: string) {
      return repo.listMilestones(workspaceId, environmentId, projectId);
    },
    async getDependencies(workspaceId: string, environmentId: string, projectId?: string) {
      return repo.listDependencies(workspaceId, environmentId, projectId);
    },
    async getRisks(workspaceId: string, environmentId: string, projectId?: string) {
      const projects = await repo.listProjects(workspaceId, environmentId);
      const items = projects.filter((project) => (projectId ? project.id === projectId : true));
      return items.flatMap((project) => project.risks);
    },
    async getProjectProgress(projectId: string, workspaceId: string, environmentId: string) {
      const project = await repo.getProjectById(workspaceId, environmentId, projectId);
      return project ? project.progress : 0;
    },
    async getProjectHealth(projectId: string, workspaceId: string, environmentId: string) {
      const project = await repo.getProjectById(workspaceId, environmentId, projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const [schedule, dependencies, risk, incidentsForProject, notificationsForProject, overview] = await Promise.all([
        projectAnalyzeSchedule(project),
        projectAnalyzeDependencies(project),
        projectAnalyzeProjectRisk(project),
        incidents.listIncidents(workspaceId, environmentId, { search: project.name }),
        notifications.listNotifications(workspaceId, environmentId, { search: project.name }),
        cloud.getOverviewMetrics("us-east-1"),
      ]);

      const incidentCount = incidentsForProject.filter((incident) => incident.affectedServiceIds.some((serviceId) => project.linkedOperationalEntities.some((entity) => entity.type === "SERVICE" && entity.id === serviceId))).length;
      const notificationCount = notificationsForProject.length;

      return {
        projectId: project.id,
        projectName: project.name,
        status: project.status,
        completionPercent: project.progress,
        indicators: [
          { label: "Schedule variance", value: `${schedule.scheduleVariance}%`, description: "Difference between actual and planned completion." },
          { label: "Dependencies", value: String(dependencies.totalDependencies), description: "Tracked dependency count for execution flow." },
          { label: "Critical risks", value: String(risk.criticalRisks), description: "Highest priority program risks." },
          { label: "Overdue work", value: String(schedule.overdueWorkItems), description: "Work items already past due date." },
          { label: "Operational impact", value: `${incidentCount}/${notificationCount}/${overview.criticalAlertsCount}`, description: "Incident, notification, and alert impact observed for this project context." },
        ],
      };
    },
  };
}

export const calculateFunctionPoints = projectCalculateFunctionPoints;
export const calculateCOCOMO = projectCalculateCOCOMO;
export const calculateNPV = projectCalculateNPV;
export const calculateROI = projectCalculateROI;
export const analyzeSchedule = projectAnalyzeSchedule;
export const analyzeDependencies = projectAnalyzeDependencies;
export const analyzeProjectRisk = projectAnalyzeProjectRisk;

export default getProjectIntelligenceToolset;
