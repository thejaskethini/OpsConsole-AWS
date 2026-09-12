/**
 * Incident Lifecycle Engine
 *
 * Enforces operational state transitions, audit timeline events,
 * duplicate prevention, and structured evidence attachment.
 */

import type {
  Incident,
  IncidentEvent,
  IncidentEvidence,
  IncidentActor,
  IncidentStatus,
  IncidentPriority,
  CreateIncidentInput,
} from "./types";
import type { IncidentRepository } from "./repository";

// ─── Valid State Transition Matrix ───────────────────────────────────────────

const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  OPEN: ["ACKNOWLEDGED", "INVESTIGATING", "MITIGATED", "RESOLVED"],
  ACKNOWLEDGED: ["INVESTIGATING", "MITIGATED", "RESOLVED", "OPEN"],
  INVESTIGATING: ["MITIGATED", "RESOLVED", "ACKNOWLEDGED"],
  MITIGATED: ["RESOLVED", "INVESTIGATING"],
  RESOLVED: ["OPEN"], // Explicit re-open only
};

export class IncidentEngine {
  constructor(private repo: IncidentRepository) {}

  /**
   * Create a new incident with duplicate prevention for alerts.
   */
  public async createIncident(
    workspaceId: string,
    environmentId: string,
    actor: IncidentActor,
    input: CreateIncidentInput
  ): Promise<Incident> {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error("Incident title is required");
    }
    if (!input.severity) {
      throw new Error("Incident severity is required");
    }
    if (!input.affectedServiceIds || input.affectedServiceIds.length === 0) {
      throw new Error("At least one affected service ID is required");
    }

    // Duplicate prevention: If linked to an alert, ensure no active incident exists
    if (input.primaryAlertId) {
      const existing = await this.repo.getIncidentByAlertId(
        workspaceId,
        environmentId,
        input.primaryAlertId
      );
      if (existing && existing.status !== "RESOLVED") {
        throw new Error(
          `An active incident (${existing.incidentNumber}) is already tracking alert ${input.primaryAlertId}`
        );
      }
    }

    const incidentNumber = this.repo.getNextIncidentNumber();
    const id = `inc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Determine default priority if not provided
    const priority: IncidentPriority =
      input.priority ||
      (input.severity === "SEV1"
        ? "P1"
        : input.severity === "SEV2"
        ? "P2"
        : input.severity === "SEV3"
        ? "P3"
        : "P4");

    const incident: Incident = {
      id,
      workspaceId,
      environmentId,
      incidentNumber,
      title: input.title.trim(),
      description: input.description.trim(),
      severity: input.severity,
      status: "OPEN",
      priority,
      affectedServiceIds: input.affectedServiceIds,
      primaryAlertId: input.primaryAlertId,
      detectionSource: input.detectionSource || "MANUAL",
      startedAt: now,
      createdAt: now,
      updatedAt: now,
      summary: input.summary,
      assignee: input.assigneeId
        ? {
            id: input.assigneeId,
            name: input.assigneeId === "usr-thejas" ? "Thejas" : input.assigneeId === "usr-alex" ? "Alex" : "Priya",
            email: `${input.assigneeId}@opsconsole.internal`,
          }
        : undefined,
      isSimulated: true,
    };

    // Initial Creation Event
    const creationEvent: IncidentEvent = {
      id: `evt-${Date.now().toString(36)}-1`,
      incidentId: id,
      type: "INCIDENT_CREATED",
      timestamp: now,
      actor,
      message: `Incident ${incidentNumber} created by ${actor.name} with severity ${input.severity}`,
      metadata: {
        severity: input.severity,
        detectionSource: input.detectionSource,
        primaryAlertId: input.primaryAlertId,
      },
    };

    // Initial Evidence
    const initialEvidence: IncidentEvidence[] = (input.evidence || []).map(
      (evi, idx) => ({
        ...evi,
        id: `evi-${Date.now().toString(36)}-${idx + 1}`,
        incidentId: id,
        observedAt: evi.observedAt || now,
      })
    );

    const saved = await this.repo.createIncident(
      workspaceId,
      environmentId,
      incident,
      creationEvent,
      initialEvidence
    );

    // If an initial note was provided, add it
    if (input.initialNote && input.initialNote.trim().length > 0) {
      await this.addNote(workspaceId, environmentId, saved.id, actor, input.initialNote.trim());
    }

    return saved;
  }

  /**
   * Acknowledge an incident.
   */
  public async acknowledge(
    workspaceId: string,
    environmentId: string,
    incidentId: string,
    actor: IncidentActor,
    note?: string
  ): Promise<Incident> {
    const inc = await this.repo.getIncidentById(workspaceId, environmentId, incidentId);
    if (!inc) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    if (inc.status !== "OPEN") {
      throw new Error(
        `Cannot acknowledge incident in '${inc.status}' state (must be 'OPEN')`
      );
    }

    const now = new Date().toISOString();
    const updated: Incident = {
      ...inc,
      status: "ACKNOWLEDGED",
      acknowledgedAt: now,
      updatedAt: now,
      assignee: inc.assignee || actor,
    };

    await this.repo.updateIncident(workspaceId, environmentId, updated);

    await this.repo.addEvent(workspaceId, environmentId, {
      id: `evt-${Date.now().toString(36)}-ack`,
      incidentId,
      type: "ACKNOWLEDGED",
      timestamp: now,
      actor,
      message: note
        ? `Incident acknowledged by ${actor.name}: ${note}`
        : `Incident acknowledged by ${actor.name}. Triage initiated.`,
    });

    return updated;
  }

  /**
   * Assign or reassign incident owners / commander.
   */
  public async assign(
    workspaceId: string,
    environmentId: string,
    incidentId: string,
    actor: IncidentActor,
    assignee: IncidentActor,
    commander?: IncidentActor
  ): Promise<Incident> {
    const inc = await this.repo.getIncidentById(workspaceId, environmentId, incidentId);
    if (!inc) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    const now = new Date().toISOString();
    const updated: Incident = {
      ...inc,
      assignee,
      commander: commander || inc.commander,
      updatedAt: now,
    };

    await this.repo.updateIncident(workspaceId, environmentId, updated);

    await this.repo.addEvent(workspaceId, environmentId, {
      id: `evt-${Date.now().toString(36)}-assign`,
      incidentId,
      type: "ASSIGNED",
      timestamp: now,
      actor,
      message: commander
        ? `Incident assigned to ${assignee.name} (Lead) and ${commander.name} (Commander) by ${actor.name}`
        : `Incident assigned to ${assignee.name} by ${actor.name}`,
      metadata: {
        assigneeId: assignee.id,
        commanderId: commander?.id,
      },
    });

    return updated;
  }

  /**
   * Transition to INVESTIGATING.
   */
  public async startInvestigation(
    workspaceId: string,
    environmentId: string,
    incidentId: string,
    actor: IncidentActor,
    note?: string
  ): Promise<Incident> {
    const inc = await this.repo.getIncidentById(workspaceId, environmentId, incidentId);
    if (!inc) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    if (inc.status === "RESOLVED") {
      throw new Error(`Cannot start investigation on a resolved incident without reopening.`);
    }

    const now = new Date().toISOString();
    const updated: Incident = {
      ...inc,
      status: "INVESTIGATING",
      acknowledgedAt: inc.acknowledgedAt || now,
      updatedAt: now,
    };

    await this.repo.updateIncident(workspaceId, environmentId, updated);

    await this.repo.addEvent(workspaceId, environmentId, {
      id: `evt-${Date.now().toString(36)}-investigate`,
      incidentId,
      type: "INVESTIGATION_STARTED",
      timestamp: now,
      actor,
      message: note
        ? `Investigation started by ${actor.name}: ${note}`
        : `Investigation started by ${actor.name}. Analyzing telemetry and logs.`,
    });

    return updated;
  }

  /**
   * Add a note / observation to the incident timeline.
   */
  public async addNote(
    workspaceId: string,
    environmentId: string,
    incidentId: string,
    actor: IncidentActor,
    note: string
  ): Promise<IncidentEvent> {
    if (!note || note.trim().length === 0) {
      throw new Error("Note content cannot be empty");
    }

    const inc = await this.repo.getIncidentById(workspaceId, environmentId, incidentId);
    if (!inc) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    const now = new Date().toISOString();

    const event: IncidentEvent = {
      id: `evt-${Date.now().toString(36)}-note`,
      incidentId,
      type: "NOTE_ADDED",
      timestamp: now,
      actor,
      message: note.trim(),
    };

    await this.repo.addEvent(workspaceId, environmentId, event);

    // Update incident timestamp
    await this.repo.updateIncident(workspaceId, environmentId, {
      ...inc,
      updatedAt: now,
    });

    return event;
  }

  /**
   * Generic status transition with validation.
   */
  public async changeStatus(
    workspaceId: string,
    environmentId: string,
    incidentId: string,
    actor: IncidentActor,
    newStatus: IncidentStatus,
    reason?: string
  ): Promise<Incident> {
    const inc = await this.repo.getIncidentById(workspaceId, environmentId, incidentId);
    if (!inc) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    if (inc.status === newStatus) {
      return inc;
    }

    const allowed = VALID_TRANSITIONS[inc.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from '${inc.status}' to '${newStatus}'. Allowed targets: ${allowed.join(", ")}`
      );
    }

    const now = new Date().toISOString();
    const updated: Incident = {
      ...inc,
      status: newStatus,
      acknowledgedAt:
        newStatus === "ACKNOWLEDGED" || (newStatus === "INVESTIGATING" && !inc.acknowledgedAt)
          ? now
          : inc.acknowledgedAt,
      mitigatedAt: newStatus === "MITIGATED" ? now : inc.mitigatedAt,
      resolvedAt: newStatus === "RESOLVED" ? now : undefined,
      updatedAt: now,
    };

    await this.repo.updateIncident(workspaceId, environmentId, updated);

    await this.repo.addEvent(workspaceId, environmentId, {
      id: `evt-${Date.now().toString(36)}-status`,
      incidentId,
      type: "STATUS_CHANGED",
      timestamp: now,
      actor,
      message: reason
        ? `Status changed from ${inc.status} to ${newStatus} by ${actor.name}: ${reason}`
        : `Status changed from ${inc.status} to ${newStatus} by ${actor.name}`,
      metadata: { from: inc.status, to: newStatus, reason },
    });

    return updated;
  }

  /**
   * Mark an incident as MITIGATED.
   */
  public async mitigate(
    workspaceId: string,
    environmentId: string,
    incidentId: string,
    actor: IncidentActor,
    mitigationSummary: string
  ): Promise<Incident> {
    if (!mitigationSummary || mitigationSummary.trim().length === 0) {
      throw new Error("Mitigation summary is required");
    }

    const inc = await this.repo.getIncidentById(workspaceId, environmentId, incidentId);
    if (!inc) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    if (inc.status === "RESOLVED") {
      throw new Error("Cannot mitigate an already resolved incident");
    }

    const now = new Date().toISOString();
    const updated: Incident = {
      ...inc,
      status: "MITIGATED",
      mitigatedAt: now,
      summary: mitigationSummary.trim(),
      updatedAt: now,
    };

    await this.repo.updateIncident(workspaceId, environmentId, updated);

    await this.repo.addEvent(workspaceId, environmentId, {
      id: `evt-${Date.now().toString(36)}-mitigate`,
      incidentId,
      type: "MITIGATED",
      timestamp: now,
      actor,
      message: `Mitigation applied by ${actor.name}: ${mitigationSummary.trim()}`,
      metadata: { mitigationSummary: mitigationSummary.trim() },
    });

    return updated;
  }

  /**
   * Resolve an incident with resolution summary.
   */
  public async resolve(
    workspaceId: string,
    environmentId: string,
    incidentId: string,
    actor: IncidentActor,
    resolutionSummary: string
  ): Promise<Incident> {
    if (!resolutionSummary || resolutionSummary.trim().length === 0) {
      throw new Error("Resolution summary is required to resolve an incident");
    }

    const inc = await this.repo.getIncidentById(workspaceId, environmentId, incidentId);
    if (!inc) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    const now = new Date().toISOString();
    const updated: Incident = {
      ...inc,
      status: "RESOLVED",
      resolvedAt: now,
      resolutionSummary: resolutionSummary.trim(),
      updatedAt: now,
    };

    await this.repo.updateIncident(workspaceId, environmentId, updated);

    await this.repo.addEvent(workspaceId, environmentId, {
      id: `evt-${Date.now().toString(36)}-resolve`,
      incidentId,
      type: "RESOLVED",
      timestamp: now,
      actor,
      message: `Incident resolved by ${actor.name}: ${resolutionSummary.trim()}`,
      metadata: { resolutionSummary: resolutionSummary.trim() },
    });

    return updated;
  }

  /**
   * Attach operational evidence to the incident.
   */
  public async addEvidence(
    workspaceId: string,
    environmentId: string,
    incidentId: string,
    evidence: Omit<IncidentEvidence, "id" | "incidentId">
  ): Promise<IncidentEvidence> {
    const inc = await this.repo.getIncidentById(workspaceId, environmentId, incidentId);
    if (!inc) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    const fullEvidence: IncidentEvidence = {
      ...evidence,
      id: `evi-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      incidentId,
      observedAt: evidence.observedAt || new Date().toISOString(),
    };

    return this.repo.addEvidence(workspaceId, environmentId, fullEvidence);
  }
}
