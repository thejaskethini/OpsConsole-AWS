/**
 * Incident Repository Interface & Local Implementation
 *
 * Enforces workspace & environment isolation for all Incident queries and mutations.
 */

import type {
  Incident,
  IncidentEvent,
  IncidentEvidence,
  IncidentFilter,
  IncidentStats,
} from "./types";
import { LocalIncidentStore } from "./local-store";

export interface IncidentRepository {
  listIncidents(
    workspaceId: string,
    environmentId: string,
    filter?: IncidentFilter
  ): Promise<Incident[]>;

  getIncidentById(
    workspaceId: string,
    environmentId: string,
    id: string
  ): Promise<Incident | null>;

  getIncidentByAlertId(
    workspaceId: string,
    environmentId: string,
    alertId: string
  ): Promise<Incident | null>;

  createIncident(
    workspaceId: string,
    environmentId: string,
    incident: Incident,
    initialEvent?: IncidentEvent,
    initialEvidence?: IncidentEvidence[]
  ): Promise<Incident>;

  updateIncident(
    workspaceId: string,
    environmentId: string,
    incident: Incident
  ): Promise<Incident>;

  listEvents(
    workspaceId: string,
    environmentId: string,
    incidentId: string
  ): Promise<IncidentEvent[]>;

  addEvent(
    workspaceId: string,
    environmentId: string,
    event: IncidentEvent
  ): Promise<IncidentEvent>;

  listEvidence(
    workspaceId: string,
    environmentId: string,
    incidentId: string
  ): Promise<IncidentEvidence[]>;

  addEvidence(
    workspaceId: string,
    environmentId: string,
    evidence: IncidentEvidence
  ): Promise<IncidentEvidence>;

  getStats(
    workspaceId: string,
    environmentId: string
  ): Promise<IncidentStats>;

  getNextIncidentNumber(): string;
  reset(): void;
}

// ─── Local Implementation ───────────────────────────────────────────────────

export class LocalIncidentRepository implements IncidentRepository {
  private store: LocalIncidentStore;

  constructor(store?: LocalIncidentStore) {
    this.store = store ?? new LocalIncidentStore();
  }

  public getNextIncidentNumber(): string {
    return this.store.getNextIncidentNumber();
  }

  public reset(): void {
    this.store.reset();
  }

  public async listIncidents(
    workspaceId: string,
    environmentId: string,
    filter?: IncidentFilter
  ): Promise<Incident[]> {
    let items = this.store
      .getAllIncidents()
      .filter(
        (inc) =>
          inc.workspaceId === workspaceId && inc.environmentId === environmentId
      );

    if (filter) {
      if (filter.status) {
        const statuses = Array.isArray(filter.status)
          ? filter.status
          : [filter.status];
        items = items.filter((inc) => statuses.includes(inc.status));
      }

      if (filter.severity) {
        const severities = Array.isArray(filter.severity)
          ? filter.severity
          : [filter.severity];
        items = items.filter((inc) => severities.includes(inc.severity));
      }

      if (filter.serviceId) {
        items = items.filter((inc) =>
          inc.affectedServiceIds.includes(filter.serviceId!)
        );
      }

      if (filter.detectionSource) {
        items = items.filter(
          (inc) => inc.detectionSource === filter.detectionSource
        );
      }

      if (filter.search) {
        const query = filter.search.toLowerCase().trim();
        items = items.filter(
          (inc) =>
            inc.incidentNumber.toLowerCase().includes(query) ||
            inc.title.toLowerCase().includes(query) ||
            inc.description.toLowerCase().includes(query) ||
            (inc.summary && inc.summary.toLowerCase().includes(query)) ||
            (inc.assignee && inc.assignee.name.toLowerCase().includes(query))
        );
      }

      // Sort newest startedAt first
      items.sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );

      if (filter.offset !== undefined && filter.offset > 0) {
        items = items.slice(filter.offset);
      }

      if (filter.limit !== undefined && filter.limit > 0) {
        items = items.slice(0, filter.limit);
      }
    } else {
      items.sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
    }

    return items;
  }

  public async getIncidentById(
    workspaceId: string,
    environmentId: string,
    id: string
  ): Promise<Incident | null> {
    const inc = this.store.getIncidentById(id);
    if (
      !inc ||
      inc.workspaceId !== workspaceId ||
      inc.environmentId !== environmentId
    ) {
      return null;
    }
    return inc;
  }

  public async getIncidentByAlertId(
    workspaceId: string,
    environmentId: string,
    alertId: string
  ): Promise<Incident | null> {
    const items = await this.listIncidents(workspaceId, environmentId);
    return (
      items.find(
        (inc) =>
          inc.primaryAlertId === alertId &&
          inc.status !== "RESOLVED"
      ) ||
      items.find((inc) => inc.primaryAlertId === alertId) ||
      null
    );
  }

  public async createIncident(
    workspaceId: string,
    environmentId: string,
    incident: Incident,
    initialEvent?: IncidentEvent,
    initialEvidence?: IncidentEvidence[]
  ): Promise<Incident> {
    const toSave: Incident = {
      ...incident,
      workspaceId,
      environmentId,
      createdAt: incident.createdAt || new Date().toISOString(),
      updatedAt: incident.updatedAt || new Date().toISOString(),
      startedAt: incident.startedAt || new Date().toISOString(),
    };

    const saved = this.store.saveIncident(toSave);

    if (initialEvent) {
      this.store.addEvent({
        ...initialEvent,
        incidentId: saved.id,
      });
    }

    if (initialEvidence && initialEvidence.length > 0) {
      for (const evi of initialEvidence) {
        this.store.addEvidence({
          ...evi,
          incidentId: saved.id,
        });
      }
    }

    return saved;
  }

  public async updateIncident(
    workspaceId: string,
    environmentId: string,
    incident: Incident
  ): Promise<Incident> {
    const existing = await this.getIncidentById(
      workspaceId,
      environmentId,
      incident.id
    );
    if (!existing) {
      throw new Error(`Incident ${incident.id} not found in workspace/environment`);
    }

    const updated: Incident = {
      ...incident,
      workspaceId,
      environmentId,
      updatedAt: new Date().toISOString(),
    };

    return this.store.saveIncident(updated);
  }

  public async listEvents(
    workspaceId: string,
    environmentId: string,
    incidentId: string
  ): Promise<IncidentEvent[]> {
    const inc = await this.getIncidentById(workspaceId, environmentId, incidentId);
    if (!inc) return [];
    return this.store.getEventsByIncidentId(incidentId);
  }

  public async addEvent(
    workspaceId: string,
    environmentId: string,
    event: IncidentEvent
  ): Promise<IncidentEvent> {
    const inc = await this.getIncidentById(
      workspaceId,
      environmentId,
      event.incidentId
    );
    if (!inc) {
      throw new Error(
        `Cannot add event: incident ${event.incidentId} not found in scope`
      );
    }
    return this.store.addEvent(event);
  }

  public async listEvidence(
    workspaceId: string,
    environmentId: string,
    incidentId: string
  ): Promise<IncidentEvidence[]> {
    const inc = await this.getIncidentById(workspaceId, environmentId, incidentId);
    if (!inc) return [];
    return this.store.getEvidenceByIncidentId(incidentId);
  }

  public async addEvidence(
    workspaceId: string,
    environmentId: string,
    evidence: IncidentEvidence
  ): Promise<IncidentEvidence> {
    const inc = await this.getIncidentById(
      workspaceId,
      environmentId,
      evidence.incidentId
    );
    if (!inc) {
      throw new Error(
        `Cannot add evidence: incident ${evidence.incidentId} not found in scope`
      );
    }
    return this.store.addEvidence(evidence);
  }

  public async getStats(
    workspaceId: string,
    environmentId: string
  ): Promise<IncidentStats> {
    const items = await this.listIncidents(workspaceId, environmentId);

    return {
      total: items.length,
      open: items.filter((i) => i.status === "OPEN").length,
      acknowledged: items.filter((i) => i.status === "ACKNOWLEDGED").length,
      investigating: items.filter((i) => i.status === "INVESTIGATING").length,
      mitigated: items.filter((i) => i.status === "MITIGATED").length,
      resolved: items.filter((i) => i.status === "RESOLVED").length,
      sev1Count: items.filter((i) => i.severity === "SEV1").length,
      sev2Count: items.filter((i) => i.severity === "SEV2").length,
      sev3Count: items.filter((i) => i.severity === "SEV3").length,
      sev4Count: items.filter((i) => i.severity === "SEV4").length,
    };
  }
}
