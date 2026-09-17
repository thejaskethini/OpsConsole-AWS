import type {
  ExternalWorkItem,
  IntegrationStatus,
  ProjectIntelligenceEvidence,
} from "./types";

export interface IntegrationProvider {
  provider: "JIRA" | "ASANA";
  name: string;
  isSimulated: boolean;
  getStatus(): Promise<IntegrationStatus>;
  createWorkItem(input: {
    title: string;
    description: string;
    projectId?: string;
    incidentId?: string;
    severity?: string;
    environment?: string;
    service?: string;
  }): Promise<ExternalWorkItem>;
}

export interface JiraProvider extends IntegrationProvider {
  provider: "JIRA";
}

export interface AsanaProvider extends IntegrationProvider {
  provider: "ASANA";
}

let simulatedExternalSequence = 0;

function nextSimulatedReference(provider: "JIRA" | "ASANA"): string {
  simulatedExternalSequence += 1;
  return `${provider === "JIRA" ? "JIRA" : "ASANA"}-SIM-${String(simulatedExternalSequence).padStart(3, "0")}`;
}

export class SimulationJiraProvider implements JiraProvider {
  provider = "JIRA" as const;
  name = "SIMULATED Jira";
  isSimulated = true;

  async getStatus(): Promise<IntegrationStatus> {
    return { provider: "JIRA", name: this.name, status: "SIMULATED", isSimulated: true, lastSyncAt: new Date().toISOString() };
  }

  async createWorkItem(input: {
    title: string;
    description: string;
    projectId?: string;
    incidentId?: string;
    severity?: string;
    environment?: string;
    service?: string;
  }): Promise<ExternalWorkItem> {
    return {
      id: `jira-sim-${simulatedExternalSequence + 1}`,
      externalId: nextSimulatedReference("JIRA"),
      provider: "JIRA",
      title: input.title,
      description: input.description,
      status: "OPEN",
      url: "https://simulated.example.com/jira/issue",
      isSimulated: true,
      createdAt: "2026-09-17T00:00:00.000Z",
    };
  }
}

export class SimulationAsanaProvider implements AsanaProvider {
  provider = "ASANA" as const;
  name = "SIMULATED Asana";
  isSimulated = true;

  async getStatus(): Promise<IntegrationStatus> {
    return { provider: "ASANA", name: this.name, status: "SIMULATED", isSimulated: true, lastSyncAt: new Date().toISOString() };
  }

  async createWorkItem(input: {
    title: string;
    description: string;
    projectId?: string;
    incidentId?: string;
    severity?: string;
    environment?: string;
    service?: string;
  }): Promise<ExternalWorkItem> {
    return {
      id: `asana-sim-${simulatedExternalSequence + 1}`,
      externalId: nextSimulatedReference("ASANA"),
      provider: "ASANA",
      title: input.title,
      description: input.description,
      status: "OPEN",
      url: "https://simulated.example.com/asana/task",
      isSimulated: true,
      createdAt: "2026-09-17T00:00:00.000Z",
    };
  }
}

export function classifyEvidence(parts: {
  observed?: string;
  calculated?: string;
  inferred?: string;
  unavailable?: string;
}): Record<string, ProjectIntelligenceEvidence> {
  const result: Record<string, ProjectIntelligenceEvidence> = {};
  const entries = [
    ["OBSERVED", parts.observed],
    ["CALCULATED", parts.calculated],
    ["INFERRED", parts.inferred],
    ["UNAVAILABLE", parts.unavailable],
  ] as const;

  for (const [source, detail] of entries) {
    if (detail && detail.trim().length > 0) {
      result[source] = { key: source.toLowerCase(), source, detail };
    }
  }

  return result;
}

