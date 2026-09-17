import type { Project, Risk, WorkItem, Milestone, Dependency } from "./types";
import { LocalProjectStore } from "./local-store";

export interface ProjectRepository {
  listProjects(workspaceId: string, environmentId: string): Promise<Project[]>;
  getProjectById(workspaceId: string, environmentId: string, id: string): Promise<Project | null>;
  upsertProject(project: Project): Promise<Project>;
  listWorkItems(workspaceId: string, environmentId: string, projectId?: string): Promise<WorkItem[]>;
  listMilestones(workspaceId: string, environmentId: string, projectId?: string): Promise<Milestone[]>;
  listDependencies(workspaceId: string, environmentId: string, projectId?: string): Promise<Dependency[]>;
  createRisk(workspaceId: string, environmentId: string, risk: Risk): Promise<Risk>;
  getRiskById(workspaceId: string, environmentId: string, riskId: string): Promise<Risk | null>;
  reset(): void;
}

export class LocalProjectRepository implements ProjectRepository {
  private store: LocalProjectStore;

  constructor(store?: LocalProjectStore) {
    this.store = store ?? new LocalProjectStore();
  }

  async listProjects(workspaceId: string, environmentId: string): Promise<Project[]> {
    return this.store.listProjects(workspaceId, environmentId);
  }

  async getProjectById(workspaceId: string, environmentId: string, id: string): Promise<Project | null> {
    return this.store.getProjectById(workspaceId, environmentId, id);
  }

  async upsertProject(project: Project): Promise<Project> {
    return this.store.saveProject(project);
  }

  async listWorkItems(workspaceId: string, environmentId: string, projectId?: string): Promise<WorkItem[]> {
    const list = await this.listProjects(workspaceId, environmentId);
    return list
      .filter((project) => (projectId ? project.id === projectId : true))
      .flatMap((project) => project.workItems.map((item) => ({ ...item, projectId: project.id })));
  }

  async listMilestones(workspaceId: string, environmentId: string, projectId?: string): Promise<Milestone[]> {
    const list = await this.listProjects(workspaceId, environmentId);
    return list
      .filter((project) => (projectId ? project.id === projectId : true))
      .flatMap((project) => project.milestones.map((item) => ({ ...item, projectId: project.id })));
  }

  async listDependencies(workspaceId: string, environmentId: string, projectId?: string): Promise<Dependency[]> {
    const list = await this.listProjects(workspaceId, environmentId);
    const deps = list
      .filter((project) => (projectId ? project.id === projectId : true))
      .flatMap((project) => {
        const direct: Dependency[] = [];
        project.workItems.forEach((workItem) => {
          workItem.dependencyIds.forEach((dependencyId) => {
            direct.push({
              id: dependencyId,
              projectId: project.id,
              sourceWorkItemId: workItem.id,
              targetWorkItemId: dependencyId,
              type: "BLOCKS",
              description: "Dependency tracked from project work item analysis.",
              status: "OPEN",
            });
          });
        });
        return direct;
      });
    return deps;
  }

  async createRisk(workspaceId: string, environmentId: string, risk: Risk): Promise<Risk> {
    const project = await this.getProjectById(workspaceId, environmentId, risk.projectId);
    if (!project) {
      throw new Error(`Project ${risk.projectId} not found in workspace ${workspaceId}`);
    }
    this.store.upsertRisk(risk.projectId, risk);
    return risk;
  }

  async getRiskById(workspaceId: string, environmentId: string, riskId: string): Promise<Risk | null> {
    const projects = await this.listProjects(workspaceId, environmentId);
    for (const project of projects) {
      const found = project.risks.find((risk) => risk.id === riskId);
      if (found) return found;
    }
    return null;
  }

  reset(): void {
    // deterministic local store is reinitialized by factory when needed.
  }
}
