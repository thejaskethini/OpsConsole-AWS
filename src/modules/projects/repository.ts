import type { Project, Risk, WorkItem, Milestone, Dependency } from "./types";
import { LocalProjectStore } from "./local-store";

export interface ProjectRepository {
  listProjects(workspaceId: string, environmentId: string): Promise<Project[]>;
  getProjectById(workspaceId: string, environmentId: string, id: string): Promise<Project | null>;
  upsertProject(project: Project): Promise<Project>;
  createProject(workspaceId: string, environmentId: string, project: Project): Promise<Project>;
  updateProject(workspaceId: string, environmentId: string, projectId: string, patch: Partial<Project>): Promise<Project | null>;
  listWorkItems(workspaceId: string, environmentId: string, projectId?: string): Promise<WorkItem[]>;
  createWorkItem(workspaceId: string, environmentId: string, projectId: string, workItem: WorkItem): Promise<WorkItem>;
  updateWorkItem(workspaceId: string, environmentId: string, workItemId: string, patch: Partial<WorkItem>): Promise<WorkItem | null>;
  listMilestones(workspaceId: string, environmentId: string, projectId?: string): Promise<Milestone[]>;
  createMilestone(workspaceId: string, environmentId: string, projectId: string, milestone: Milestone): Promise<Milestone>;
  updateMilestone(workspaceId: string, environmentId: string, milestoneId: string, patch: Partial<Milestone>): Promise<Milestone | null>;
  listDependencies(workspaceId: string, environmentId: string, projectId?: string): Promise<Dependency[]>;
  createRisk(workspaceId: string, environmentId: string, risk: Risk): Promise<Risk>;
  updateRisk(workspaceId: string, environmentId: string, riskId: string, patch: Partial<Risk>): Promise<Risk | null>;
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

  async createProject(workspaceId: string, environmentId: string, project: Project): Promise<Project> {
    if (project.workspaceId !== workspaceId || project.environmentId !== environmentId) throw new Error("Project scope does not match request scope");
    if (await this.getProjectById(workspaceId, environmentId, project.id)) throw new Error(`Project ${project.id} already exists`);
    return this.store.saveProject(project);
  }

  async updateProject(workspaceId: string, environmentId: string, projectId: string, patch: Partial<Project>): Promise<Project | null> {
    const project = await this.getProjectById(workspaceId, environmentId, projectId);
    if (!project) return null;
    return this.store.saveProject({ ...project, ...patch, id: project.id, workspaceId, environmentId, updatedAt: new Date().toISOString() });
  }

  async listWorkItems(workspaceId: string, environmentId: string, projectId?: string): Promise<WorkItem[]> {
    const list = await this.listProjects(workspaceId, environmentId);
    return list
      .filter((project) => (projectId ? project.id === projectId : true))
      .flatMap((project) => project.workItems.map((item) => ({ ...item, projectId: project.id })));
  }

  async createWorkItem(workspaceId: string, environmentId: string, projectId: string, workItem: WorkItem): Promise<WorkItem> {
    const project = await this.getProjectById(workspaceId, environmentId, projectId);
    if (!project || workItem.projectId !== projectId) throw new Error("Work item project does not match request scope");
    if (project.workItems.some((item) => item.id === workItem.id)) throw new Error(`Work item ${workItem.id} already exists`);
    project.workItems.push(structuredClone(workItem));
    await this.upsertProject(project);
    return structuredClone(workItem);
  }

  async updateWorkItem(workspaceId: string, environmentId: string, workItemId: string, patch: Partial<WorkItem>): Promise<WorkItem | null> {
    const projects = await this.listProjects(workspaceId, environmentId);
    for (const project of projects) {
      const index = project.workItems.findIndex((item) => item.id === workItemId);
      if (index >= 0) {
        project.workItems[index] = { ...project.workItems[index], ...patch, id: workItemId, projectId: project.id };
        await this.upsertProject(project);
        return structuredClone(project.workItems[index]);
      }
    }
    return null;
  }

  async listMilestones(workspaceId: string, environmentId: string, projectId?: string): Promise<Milestone[]> {
    const list = await this.listProjects(workspaceId, environmentId);
    return list
      .filter((project) => (projectId ? project.id === projectId : true))
      .flatMap((project) => project.milestones.map((item) => ({ ...item, projectId: project.id })));
  }

  async createMilestone(workspaceId: string, environmentId: string, projectId: string, milestone: Milestone): Promise<Milestone> {
    const project = await this.getProjectById(workspaceId, environmentId, projectId);
    if (!project || milestone.projectId !== projectId) throw new Error("Milestone project does not match request scope");
    if (project.milestones.some((item) => item.id === milestone.id)) throw new Error(`Milestone ${milestone.id} already exists`);
    project.milestones.push(structuredClone(milestone));
    await this.upsertProject(project);
    return structuredClone(milestone);
  }

  async updateMilestone(workspaceId: string, environmentId: string, milestoneId: string, patch: Partial<Milestone>): Promise<Milestone | null> {
    const projects = await this.listProjects(workspaceId, environmentId);
    for (const project of projects) {
      const index = project.milestones.findIndex((item) => item.id === milestoneId);
      if (index >= 0) {
        project.milestones[index] = { ...project.milestones[index], ...patch, id: milestoneId, projectId: project.id };
        await this.upsertProject(project);
        return structuredClone(project.milestones[index]);
      }
    }
    return null;
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

  async updateRisk(workspaceId: string, environmentId: string, riskId: string, patch: Partial<Risk>): Promise<Risk | null> {
    const projects = await this.listProjects(workspaceId, environmentId);
    for (const project of projects) {
      const index = project.risks.findIndex((risk) => risk.id === riskId);
      if (index >= 0) {
        const current = project.risks[index];
        project.risks[index] = { ...current, ...patch, id: riskId, projectId: project.id, workspaceId, environmentId };
        await this.upsertProject(project);
        return structuredClone(project.risks[index]);
      }
    }
    return null;
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
