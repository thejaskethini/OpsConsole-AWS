/**
 * ASPM Project Intelligence domain types.
 * Deterministic project and portfolio structures for local-first OpsConsole workflows.
 */

export type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_TRACK"
  | "AT_RISK"
  | "CRITICAL"
  | "COMPLETED"
  | "CANCELLED";

export type WorkItemStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "CANCELLED";
export type RiskStatus = "OPEN" | "MITIGATING" | "CLOSED" | "REVIEW";
export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ProjectPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type EvidenceSource = "OBSERVED" | "CALCULATED" | "INFERRED" | "UNAVAILABLE";

export interface LinkedOperationalEntity {
  type: "SERVICE" | "INCIDENT" | "ALERT" | "SLO" | "NOTIFICATION";
  id: string;
  label: string;
  workspaceId?: string;
  environmentId?: string;
}

export interface Dependency {
  id: string;
  projectId: string;
  sourceWorkItemId?: string;
  targetWorkItemId?: string;
  type: "BLOCKS" | "RELIES_ON" | "PARALLEL";
  description: string;
  status: "OPEN" | "RESOLVED" | "BLOCKED";
}

export interface Estimate {
  id: string;
  projectId: string;
  technique: "FUNCTION_POINTS" | "COCOMO" | "MANUAL";
  functionPoints?: number;
  estimatedEffortPersonMonths?: number;
  plannedEffortPersonMonths?: number;
  effortVariancePercent?: number;
  durationMonths?: number;
  costUsd?: number;
  createdAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED" | "CANCELLED";
  plannedDate: string;
  actualDate?: string;
  owner: string;
}

export interface WorkItem {
  id: string;
  projectId: string;
  title: string;
  description: string;
  owner: string;
  priority: ProjectPriority;
  status: WorkItemStatus;
  estimate: number;
  dueDate?: string;
  milestoneId?: string;
  dependencyIds: string[];
  riskIds: string[];
  linkedIncidentId?: string;
}

export interface Risk {
  id: string;
  projectId: string;
  workspaceId: string;
  environmentId: string;
  description: string;
  probability: number;
  impact: number;
  severity: RiskSeverity;
  owner: string;
  mitigation: string;
  status: RiskStatus;
  source: "PROJECT" | "INCIDENT" | "OPERATIONS" | "EXTERNAL";
  linkedIncidentId?: string;
  createdAt: string;
}

export interface ProjectMetric {
  key: string;
  label: string;
  value: number;
  unit: string;
  trend?: "up" | "down" | "flat";
}

export interface ProjectEvent {
  id: string;
  projectId: string;
  type: "CREATED" | "UPDATED" | "MILESTONE" | "RISK" | "INCIDENT" | "PROGRESS";
  message: string;
  timestamp: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  environmentId: string;
  name: string;
  description: string;
  owner: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  progress: number;
  milestones: Milestone[];
  workItems: WorkItem[];
  risks: Risk[];
  linkedOperationalEntities: LinkedOperationalEntity[];
  linkedIncidentIds: string[];
  createdAt: string;
  updatedAt: string;
  isSimulated: boolean;
}

export interface ProjectHealthIndicator {
  label: string;
  value: string;
  description: string;
}

export interface ProjectHealthSummary {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  completionPercent: number;
  scheduleVariancePercent: number;
  overdueWorkItems: number;
  delayedMilestones: number;
  openRisks: number;
  criticalRisks: number;
  indicators: ProjectHealthIndicator[];
  summary: string;
}

export interface PortfolioHealthSummary {
  activeProjects: number;
  onTrackProjects: number;
  atRiskProjects: number;
  criticalProjects: number;
  overallCompletion: number;
  portfolioStatus: "ON_TRACK" | "AT_RISK" | "CRITICAL";
  indicators: ProjectHealthIndicator[];
  scheduleSummary: {
    plannedCompletion: number;
    actualCompletion: number;
    scheduleVariance: number;
    overdueWorkItems: number;
    delayedMilestones: number;
    upcomingMilestones: number;
  };
  operationalContext: {
    activeIncidents: number;
    criticalAlerts: number;
    affectedServices: number;
    sloIssues: number;
    notificationFailures: number;
  };
}

export interface ProjectRiskInput {
  projectId: string;
  workspaceId: string;
  environmentId: string;
  owner: string;
  description: string;
  probability: number;
  impact: number;
  source: Risk["source"];
  linkedIncidentId?: string;
  mitigation: string;
  status: RiskStatus;
}

export interface IntegrationStatus {
  provider: "JIRA" | "ASANA";
  name: string;
  status: "CONNECTED" | "SIMULATED" | "DISCONNECTED" | "UNAVAILABLE" | "ERROR";
  lastSyncAt?: string;
  isSimulated: boolean;
  metadata?: Record<string, string>;
}

export interface ExternalWorkItem {
  id: string;
  externalId: string;
  provider: "JIRA" | "ASANA";
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  url?: string;
  isSimulated: boolean;
  createdAt: string;
}

export interface ProjectIntelligenceEvidence {
  key: string;
  source: EvidenceSource;
  detail: string;
}

export interface AffectedDependency {
  serviceId: string;
  name: string;
  impact: string;
}

export interface ProjectContextSnapshot {
  projectId: string;
  projectName: string;
  health: ProjectHealthSummary;
  workItems: WorkItem[];
  milestones: Milestone[];
  risks: Risk[];
  dependencies: Dependency[];
  impactedServices: AffectedDependency[];
}
