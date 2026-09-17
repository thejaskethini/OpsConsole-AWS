import type {
  Project,
  Risk,
  Milestone,
  WorkItem,
  Estimate,
} from "./types";

export const DEFAULT_PROJECT_WORKSPACE_ID = "ws_demo_001";
export const DEFAULT_PROJECT_ENVIRONMENT_ID = "env_prod_001";

const PROJECT_WORKSPACE_ALIASES = new Map([
  ["ws-demo", "ws_demo_001"],
  ["ws-projects", "ws_demo_001"],
  ["ws_demo_001", "ws_demo_001"],
  ["ws-acme", "ws_acme_002"],
  ["ws_acme_002", "ws_acme_002"],
]);

const PROJECT_ENVIRONMENT_ALIASES = new Map([
  ["env-prod", "env_prod_001"],
  ["env-prod-001", "env_prod_001"],
  ["env_prod_001", "env_prod_001"],
  ["env-stag", "env_stag_002"],
  ["env-stag-002", "env_stag_002"],
  ["env_stag_002", "env_stag_002"],
  ["env-dev", "env_dev_003"],
  ["env-dev-003", "env_dev_003"],
  ["env_dev_003", "env_dev_003"],
]);

function normalizeWorkspaceId(workspaceId: string): string {
  return PROJECT_WORKSPACE_ALIASES.get(workspaceId) ?? workspaceId;
}

function normalizeEnvironmentId(environmentId: string): string {
  return PROJECT_ENVIRONMENT_ALIASES.get(environmentId) ?? environmentId;
}

function cloneProjectForWorkspace(project: Project, workspaceId: string, environmentId: string): Project {
  return {
    ...structuredClone(project),
    workspaceId,
    environmentId,
    workItems: project.workItems.map((item) => ({ ...item, projectId: project.id })),
    milestones: project.milestones.map((item) => ({ ...item, projectId: project.id })),
    risks: project.risks.map((risk) => ({ ...risk, projectId: project.id, workspaceId, environmentId })),
  };
}

const baseWorkItems: Record<string, WorkItem[]> = {
  "proj-payments-modernization": [
    { id: "wi-payments-01", projectId: "proj-payments-modernization", title: "API contract review", description: "Approve the payment contract revisions and API compatibility plan.", owner: "platform-lead", priority: "HIGH", status: "IN_PROGRESS", estimate: 12, dueDate: "2026-09-20T00:00:00.000Z", dependencyIds: [], riskIds: ["risk-payments-01"], linkedIncidentId: "inc-001" },
    { id: "wi-payments-02", projectId: "proj-payments-modernization", title: "Payment gateway migration", description: "Complete the gateway migration with phased rollout and rollback checkpoints.", owner: "payments-engineer", priority: "CRITICAL", status: "BLOCKED", estimate: 22, dueDate: "2026-09-25T00:00:00.000Z", milestoneId: "milestone-payments-02", dependencyIds: ["dep-payments-01"], riskIds: ["risk-payments-02"], linkedIncidentId: "inc-001" },
    { id: "wi-payments-03", projectId: "proj-payments-modernization", title: "Regression test suite", description: "Run card processing regression tests and validate failure paths.", owner: "qa-lead", priority: "HIGH", status: "TODO", estimate: 10, dueDate: "2026-09-30T00:00:00.000Z", dependencyIds: ["dep-payments-01"], riskIds: [], linkedIncidentId: undefined },
  ],
  "proj-notification-platform": [
    { id: "wi-notify-01", projectId: "proj-notification-platform", title: "Workflow routing refactor", description: "Refactor routing to support channel policy versioning.", owner: "notification-lead", priority: "MEDIUM", status: "IN_PROGRESS", estimate: 16, dueDate: "2026-09-18T00:00:00.000Z", dependencyIds: [], riskIds: ["risk-notify-01"], linkedIncidentId: "inc-002" },
    { id: "wi-notify-02", projectId: "proj-notification-platform", title: "Deliverability audit", description: "Audit bounce and retry handling across all channels.", owner: "ops-engineer", priority: "MEDIUM", status: "TODO", estimate: 8, dueDate: "2026-09-22T00:00:00.000Z", dependencyIds: [], riskIds: [], linkedIncidentId: undefined },
  ],
  "proj-cost-optimization": [
    { id: "wi-cost-01", projectId: "proj-cost-optimization", title: "Reserved instance review", description: "Review Instance Savings Plans and historical usage patterns.", owner: "finops-analyst", priority: "MEDIUM", status: "COMPLETED", estimate: 7, dueDate: "2026-08-30T00:00:00.000Z", dependencyIds: [], riskIds: [], linkedIncidentId: undefined },
    { id: "wi-cost-02", projectId: "proj-cost-optimization", title: "Storage lifecycle cleanup", description: "Archive low-value S3 objects and performance tune lifecycle policies.", owner: "cloud-engineer", priority: "LOW", status: "IN_PROGRESS", estimate: 9, dueDate: "2026-09-28T00:00:00.000Z", dependencyIds: [], riskIds: [], linkedIncidentId: undefined },
  ],
  "proj-identity-upgrade": [
    { id: "wi-identity-01", projectId: "proj-identity-upgrade", title: "SSO migration validation", description: "Validate SSO migration and role cutoff conditions before release.", owner: "iam-engineer", priority: "HIGH", status: "TODO", estimate: 14, dueDate: "2026-10-02T00:00:00.000Z", dependencyIds: [], riskIds: ["risk-identity-01"], linkedIncidentId: undefined },
  ],
};

const baseMilestones: Record<string, Milestone[]> = {
  "proj-payments-modernization": [
    { id: "milestone-payments-01", projectId: "proj-payments-modernization", name: "Architecture signoff", description: "Complete architecture approval and dependency validation.", status: "COMPLETED", plannedDate: "2026-08-15T00:00:00.000Z", actualDate: "2026-08-12T00:00:00.000Z", owner: "platform-lead" },
    { id: "milestone-payments-02", projectId: "proj-payments-modernization", name: "Cloud migration cutover", description: "Switch production traffic to the new endpoints and verify rollback.", status: "DELAYED", plannedDate: "2026-09-30T00:00:00.000Z", owner: "payments-engineer" },
    { id: "milestone-payments-03", projectId: "proj-payments-modernization", name: "Launch readiness review", description: "Complete executive signoff for the planned launch window.", status: "PLANNED", plannedDate: "2026-10-15T00:00:00.000Z", owner: "director-platform" },
  ],
  "proj-notification-platform": [
    { id: "milestone-notify-01", projectId: "proj-notification-platform", name: "Route policy baseline", description: "Baseline route behavior and policy versioning.", status: "COMPLETED", plannedDate: "2026-08-25T00:00:00.000Z", actualDate: "2026-08-24T00:00:00.000Z", owner: "notification-lead" },
    { id: "milestone-notify-02", projectId: "proj-notification-platform", name: "Production rollout", description: "Gradually enable the new delivery routing path.", status: "IN_PROGRESS", plannedDate: "2026-09-26T00:00:00.000Z", owner: "notification-lead" },
  ],
  "proj-cost-optimization": [
    { id: "milestone-cost-01", projectId: "proj-cost-optimization", name: "Savings opportunity review", description: "Finalize cost-change decision memo and action plan.", status: "COMPLETED", plannedDate: "2026-08-10T00:00:00.000Z", actualDate: "2026-08-10T00:00:00.000Z", owner: "finops-analyst" },
    { id: "milestone-cost-02", projectId: "proj-cost-optimization", name: "Implementation window", description: "Apply rightsizing and lifecycle optimization actions.", status: "PLANNED", plannedDate: "2026-09-29T00:00:00.000Z", owner: "cloud-engineer" },
  ],
  "proj-identity-upgrade": [
    { id: "milestone-identity-01", projectId: "proj-identity-upgrade", name: "Identity state review", description: "Review pending identity states and migration validations.", status: "PLANNED", plannedDate: "2026-10-04T00:00:00.000Z", owner: "iam-engineer" },
  ],
};

const baseRisks: Record<string, Risk[]> = {
  "proj-payments-modernization": [
    { id: "risk-payments-01", projectId: "proj-payments-modernization", workspaceId: DEFAULT_PROJECT_WORKSPACE_ID, environmentId: DEFAULT_PROJECT_ENVIRONMENT_ID, description: "Gateway migration may introduce payment latency spikes during rollback validation.", probability: 0.72, impact: 0.81, severity: "CRITICAL", owner: "director-platform", mitigation: "Use phased canaries and rollback checkpoints before full cutover.", status: "MITIGATING", source: "INCIDENT", linkedIncidentId: "inc-001", createdAt: "2026-09-05T00:00:00.000Z" },
    { id: "risk-payments-02", projectId: "proj-payments-modernization", workspaceId: DEFAULT_PROJECT_WORKSPACE_ID, environmentId: DEFAULT_PROJECT_ENVIRONMENT_ID, description: "Regression coverage may not cover enterprise card routing edge cases.", probability: 0.53, impact: 0.66, severity: "HIGH", owner: "qa-lead", mitigation: "Increase test coverage for cross-region and retry flows.", status: "OPEN", source: "PROJECT", createdAt: "2026-09-09T00:00:00.000Z" },
  ],
  "proj-notification-platform": [
    { id: "risk-notify-01", projectId: "proj-notification-platform", workspaceId: DEFAULT_PROJECT_WORKSPACE_ID, environmentId: DEFAULT_PROJECT_ENVIRONMENT_ID, description: "Channel-level message routing may overload the fallback queue during peak traffic.", probability: 0.42, impact: 0.6, severity: "MEDIUM", owner: "notification-owner", mitigation: "Introduce rate-limited fallback and targeted queue tracing.", status: "OPEN", source: "OPERATIONS", createdAt: "2026-09-10T00:00:00.000Z" },
  ],
  "proj-cost-optimization": [
    { id: "risk-cost-01", projectId: "proj-cost-optimization", workspaceId: DEFAULT_PROJECT_WORKSPACE_ID, environmentId: DEFAULT_PROJECT_ENVIRONMENT_ID, description: "Savings are dependent on delayed workload rescheduling during business hours.", probability: 0.28, impact: 0.4, severity: "LOW", owner: "finops-analyst", mitigation: "Schedule non-production cleanup after maintenance windows.", status: "CLOSED", source: "PROJECT", createdAt: "2026-09-04T00:00:00.000Z" },
  ],
  "proj-identity-upgrade": [
    { id: "risk-identity-01", projectId: "proj-identity-upgrade", workspaceId: DEFAULT_PROJECT_WORKSPACE_ID, environmentId: DEFAULT_PROJECT_ENVIRONMENT_ID, description: "Role mapping drift could block production SSO adoption for some users.", probability: 0.57, impact: 0.7, severity: "HIGH", owner: "identity-owner", mitigation: "Run staged identity validation and user cohort reconciliation.", status: "OPEN", source: "OPERATIONS", createdAt: "2026-09-12T00:00:00.000Z" },
  ],
};

const baseEstimates: Record<string, Estimate> = {
  "proj-payments-modernization": { id: "est-payments-01", projectId: "proj-payments-modernization", technique: "FUNCTION_POINTS", functionPoints: 178, estimatedEffortPersonMonths: 18.4, plannedEffortPersonMonths: 16.1, effortVariancePercent: 14.3, durationMonths: 6.2, costUsd: 345000, createdAt: "2026-09-01T00:00:00.000Z" },
  "proj-notification-platform": { id: "est-notify-01", projectId: "proj-notification-platform", technique: "COCOMO", functionPoints: 96, estimatedEffortPersonMonths: 11.2, plannedEffortPersonMonths: 9.6, effortVariancePercent: 8.4, durationMonths: 4.1, costUsd: 210000, createdAt: "2026-09-03T00:00:00.000Z" },
  "proj-cost-optimization": { id: "est-cost-01", projectId: "proj-cost-optimization", technique: "MANUAL", estimatedEffortPersonMonths: 4.3, plannedEffortPersonMonths: 4.2, effortVariancePercent: 1.3, durationMonths: 2.3, costUsd: 86000, createdAt: "2026-08-31T00:00:00.000Z" },
  "proj-identity-upgrade": { id: "est-identity-01", projectId: "proj-identity-upgrade", technique: "FUNCTION_POINTS", functionPoints: 126, estimatedEffortPersonMonths: 14.1, plannedEffortPersonMonths: 12.5, effortVariancePercent: 12.8, durationMonths: 5.1, costUsd: 281000, createdAt: "2026-09-02T00:00:00.000Z" },
};

export const SEEDED_PROJECTS: Project[] = [
  {
    id: "proj-payments-modernization",
    workspaceId: DEFAULT_PROJECT_WORKSPACE_ID,
    environmentId: DEFAULT_PROJECT_ENVIRONMENT_ID,
    name: "Payments Platform Modernization",
    description: "Modernize the payment orchestration layer while preserving compatibility and regulatory controls.",
    owner: "director-platform",
    status: "AT_RISK",
    priority: "CRITICAL",
    plannedStart: "2026-08-01T00:00:00.000Z",
    plannedEnd: "2026-12-15T00:00:00.000Z",
    actualStart: "2026-08-04T00:00:00.000Z",
    progress: 58,
    milestones: baseMilestones["proj-payments-modernization"],
    workItems: baseWorkItems["proj-payments-modernization"],
    risks: baseRisks["proj-payments-modernization"],
    linkedOperationalEntities: [
      { type: "SERVICE", id: "srv-payment-gateway", label: "Payment Gateway" },
      { type: "INCIDENT", id: "inc-001", label: "Payments degradation incident" },
      { type: "ALERT", id: "alert-001", label: "SEV1 payment latency" },
    ],
    linkedIncidentIds: ["inc-001"],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-09-12T00:00:00.000Z",
    isSimulated: true,
  },
  {
    id: "proj-notification-platform",
    workspaceId: DEFAULT_PROJECT_WORKSPACE_ID,
    environmentId: DEFAULT_PROJECT_ENVIRONMENT_ID,
    name: "Customer Notification Platform",
    description: "Upgrade notification routing, delivery policy evaluation, and channel failover for customer lifecycle events.",
    owner: "notification-owner",
    status: "ON_TRACK",
    priority: "HIGH",
    plannedStart: "2026-08-10T00:00:00.000Z",
    plannedEnd: "2026-11-20T00:00:00.000Z",
    actualStart: "2026-08-12T00:00:00.000Z",
    progress: 73,
    milestones: baseMilestones["proj-notification-platform"],
    workItems: baseWorkItems["proj-notification-platform"],
    risks: baseRisks["proj-notification-platform"],
    linkedOperationalEntities: [
      { type: "SERVICE", id: "srv-notification-worker", label: "Notification Worker" },
      { type: "ALERT", id: "alert-002", label: "Notification throughput alert" },
    ],
    linkedIncidentIds: ["inc-002"],
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-09-11T00:00:00.000Z",
    isSimulated: true,
  },
  {
    id: "proj-cost-optimization",
    workspaceId: DEFAULT_PROJECT_WORKSPACE_ID,
    environmentId: DEFAULT_PROJECT_ENVIRONMENT_ID,
    name: "Cloud Cost Optimization",
    description: "Reduce infrastructure waste and optimize workload placement for lower operating cost without guardrail regressions.",
    owner: "finops-manager",
    status: "ON_TRACK",
    priority: "MEDIUM",
    plannedStart: "2026-07-10T00:00:00.000Z",
    plannedEnd: "2026-10-30T00:00:00.000Z",
    actualStart: "2026-07-12T00:00:00.000Z",
    progress: 86,
    milestones: baseMilestones["proj-cost-optimization"],
    workItems: baseWorkItems["proj-cost-optimization"],
    risks: baseRisks["proj-cost-optimization"],
    linkedOperationalEntities: [
      { type: "SLO", id: "slo-cost", label: "Cost efficiency guardrail" },
    ],
    linkedIncidentIds: [],
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
    isSimulated: true,
  },
  {
    id: "proj-identity-upgrade",
    workspaceId: DEFAULT_PROJECT_WORKSPACE_ID,
    environmentId: DEFAULT_PROJECT_ENVIRONMENT_ID,
    name: "Identity Platform Upgrade",
    description: "Upgrade identity federation and authorization data model to support expanded platform access and policy control.",
    owner: "identity-owner",
    status: "PLANNING",
    priority: "HIGH",
    plannedStart: "2026-09-15T00:00:00.000Z",
    plannedEnd: "2026-12-01T00:00:00.000Z",
    actualStart: undefined,
    progress: 22,
    milestones: baseMilestones["proj-identity-upgrade"],
    workItems: baseWorkItems["proj-identity-upgrade"],
    risks: baseRisks["proj-identity-upgrade"],
    linkedOperationalEntities: [
      { type: "SERVICE", id: "srv-identity", label: "Identity Service" },
    ],
    linkedIncidentIds: [],
    createdAt: "2026-09-15T00:00:00.000Z",
    updatedAt: "2026-09-15T00:00:00.000Z",
    isSimulated: true,
  },
];

export class LocalProjectStore {
  private projects: Project[] = SEEDED_PROJECTS.map((project) => ({
    ...project,
    workItems: project.workItems.map((item) => ({ ...item })),
    milestones: project.milestones.map((item) => ({ ...item })),
    risks: project.risks.map((risk) => ({ ...risk })),
    linkedOperationalEntities: [...project.linkedOperationalEntities],
  }));

  getAllProjects(): Project[] {
    return this.projects.map((project) => structuredClone(project));
  }

  getProjectById(workspaceId: string, environmentId: string, id: string): Project | null {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const normalizedEnvironmentId = normalizeEnvironmentId(environmentId);
    const project = this.projects.find(
      (item) => item.id === id && item.workspaceId === normalizedWorkspaceId && item.environmentId === normalizedEnvironmentId
    );
    return project ? cloneProjectForWorkspace(project, workspaceId, environmentId) : null;
  }

  listProjects(workspaceId: string, environmentId: string): Project[] {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const normalizedEnvironmentId = normalizeEnvironmentId(environmentId);
    return this.projects
      .filter((project) => project.workspaceId === normalizedWorkspaceId && project.environmentId === normalizedEnvironmentId)
      .map((project) => cloneProjectForWorkspace(project, workspaceId, environmentId));
  }

  saveProject(project: Project): Project {
    const existingIndex = this.projects.findIndex((item) => item.id === project.id);
    if (existingIndex >= 0) {
      this.projects[existingIndex] = structuredClone(project);
      return structuredClone(project);
    }
    this.projects.push(structuredClone(project));
    return structuredClone(project);
  }

  upsertRisk(projectId: string, risk: Risk): Risk {
    const index = this.projects.findIndex((p) => p.id === projectId);
    if (index < 0) {
      throw new Error(`Project ${projectId} not found`);
    }
    const project = this.projects[index];
    const existingIndex = project.risks.findIndex((item) => item.id === risk.id);
    if (existingIndex >= 0) {
      project.risks[existingIndex] = { ...risk };
    } else {
      project.risks.push({ ...risk });
    }
    project.updatedAt = new Date().toISOString();
    this.projects[index] = { ...project };
    return { ...risk };
  }

  getEstimatesByProject(projectId: string): Estimate[] {
    return Object.values(baseEstimates)
      .filter((estimate) => estimate.projectId === projectId)
      .map((item) => ({ ...item }));
  }
}
