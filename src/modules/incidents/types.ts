/**
 * Incident Domain Types
 *
 * Strongly-typed domain models for Incidents, Timeline Events, and Evidence.
 * Local-first, deterministic, platform-level types.
 */

// ─── Severity, Priority, Status, Detection ───────────────────────────────────

export type IncidentSeverity = "SEV1" | "SEV2" | "SEV3" | "SEV4";

export type IncidentPriority = "P1" | "P2" | "P3" | "P4";

export type IncidentStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "INVESTIGATING"
  | "MITIGATED"
  | "RESOLVED";

export type DetectionSource = "ALERT" | "SLO" | "MANUAL" | "SYSTEM";

// ─── Incident Actor ──────────────────────────────────────────────────────────

export interface IncidentActor {
  id: string;
  name: string;
  email: string;
  avatarInitials?: string;
}

// ─── Incident Model ──────────────────────────────────────────────────────────

export interface Incident {
  id: string;
  workspaceId: string;
  environmentId: string;
  incidentNumber: string; // e.g. "INC-0001"
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  priority: IncidentPriority;
  affectedServiceIds: string[];
  primaryAlertId?: string;
  detectionSource: DetectionSource;
  startedAt: string; // ISO 8601
  acknowledgedAt?: string; // ISO 8601
  mitigatedAt?: string; // ISO 8601
  resolvedAt?: string; // ISO 8601
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  assignee?: IncidentActor;
  commander?: IncidentActor;
  summary?: string;
  resolutionSummary?: string;
  isSimulated?: boolean;
}

// ─── Timeline Event ──────────────────────────────────────────────────────────

export type IncidentEventType =
  | "INCIDENT_CREATED"
  | "ALERT_TRIGGERED"
  | "ACKNOWLEDGED"
  | "ASSIGNED"
  | "INVESTIGATION_STARTED"
  | "NOTE_ADDED"
  | "STATUS_CHANGED"
  | "MITIGATION_STARTED"
  | "MITIGATED"
  | "RESOLVED";

export interface IncidentEvent {
  id: string;
  incidentId: string;
  type: IncidentEventType;
  timestamp: string; // ISO 8601
  actor: IncidentActor;
  message: string;
  metadata?: Record<string, unknown>;
}

// ─── Evidence Model ──────────────────────────────────────────────────────────

export type EvidenceType =
  | "ALERT"
  | "SERVICE_HEALTH"
  | "SLO"
  | "ERROR_BUDGET"
  | "BURN_RATE"
  | "METRIC"
  | "AWS_SIGNAL"
  | "FAILURE_EVENT";

export interface IncidentEvidence {
  id: string;
  incidentId: string;
  type: EvidenceType;
  title: string;
  description: string;
  source: string; // e.g. "SRE Health", "Alerting Engine", "CloudWatch"
  sourceUrl?: string; // e.g. "/services/orders-api" or "/alerts/alert-001"
  observedAt: string; // ISO 8601
  data?: Record<string, unknown>;
}

// ─── Filters & Inputs ────────────────────────────────────────────────────────

export interface IncidentFilter {
  status?: IncidentStatus | IncidentStatus[];
  severity?: IncidentSeverity | IncidentSeverity[];
  serviceId?: string;
  detectionSource?: DetectionSource;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateIncidentInput {
  title: string;
  description: string;
  severity: IncidentSeverity;
  priority?: IncidentPriority;
  affectedServiceIds: string[];
  primaryAlertId?: string;
  detectionSource: DetectionSource;
  assigneeId?: string;
  commanderId?: string;
  summary?: string;
  initialNote?: string;
  evidence?: Omit<IncidentEvidence, "id" | "incidentId">[];
}

export interface UpdateIncidentInput {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  priority?: IncidentPriority;
  summary?: string;
}

export interface IncidentStats {
  total: number;
  open: number;
  acknowledged: number;
  investigating: number;
  mitigated: number;
  resolved: number;
  sev1Count: number;
  sev2Count: number;
  sev3Count: number;
  sev4Count: number;
}
