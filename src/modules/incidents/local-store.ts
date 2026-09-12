/**
 * In-Memory Incident Store with Deterministic Seed Data
 *
 * Provides workspace & environment isolated storage for Incidents,
 * chronological timeline events, and structured operational evidence.
 */

import type {
  Incident,
  IncidentEvent,
  IncidentEvidence,
} from "./types";

// ─── Default Actors ──────────────────────────────────────────────────────────

export const DEFAULT_INCIDENT_ACTORS = {
  thejas: {
    id: "usr-thejas",
    name: "Thejas",
    email: "thejas@opsconsole.internal",
    avatarInitials: "TK",
  },
  alex: {
    id: "usr-alex",
    name: "Alex",
    email: "alex@opsconsole.internal",
    avatarInitials: "AC",
  },
  priya: {
    id: "usr-priya",
    name: "Priya",
    email: "priya@opsconsole.internal",
    avatarInitials: "PS",
  },
  system: {
    id: "system-sre-engine",
    name: "SRE Automation Engine",
    email: "automation@opsconsole.internal",
    avatarInitials: "SRE",
  },
};

// ─── Seed Incidents ──────────────────────────────────────────────────────────

const SEED_INCIDENTS: Incident[] = [
  {
    id: "inc-0001",
    workspaceId: "ws-demo",
    environmentId: "env-prod",
    incidentNumber: "INC-0001",
    title: "Notification Worker reliability degradation & high error rate",
    description:
      "Notification Worker error rate surged to 2.10%, causing severe SLO budget exhaustion and elevated burn rate.",
    severity: "SEV1",
    status: "INVESTIGATING",
    priority: "P1",
    affectedServiceIds: ["srv-notification-worker"],
    primaryAlertId: "alert-001",
    detectionSource: "ALERT",
    startedAt: "2026-09-12T09:15:00.000Z",
    acknowledgedAt: "2026-09-12T09:18:00.000Z",
    createdAt: "2026-09-12T09:15:30.000Z",
    updatedAt: "2026-09-12T09:25:00.000Z",
    assignee: DEFAULT_INCIDENT_ACTORS.thejas,
    commander: DEFAULT_INCIDENT_ACTORS.alex,
    summary:
      "Observed degradation: Critical service health, 11.2x burn rate, and 0% remaining error budget. SRE telemetry model identified batch processing throughput saturation.",
    isSimulated: true,
  },
  {
    id: "inc-0002",
    workspaceId: "ws-demo",
    environmentId: "env-prod",
    incidentNumber: "INC-0002",
    title: "Orders API elevated p95 latency degradation",
    description:
      "Orders API p95 response latency degraded to 320ms exceeding the 200ms SLO target threshold.",
    severity: "SEV2",
    status: "OPEN",
    priority: "P2",
    affectedServiceIds: ["srv-orders-api"],
    primaryAlertId: "alert-002",
    detectionSource: "SLO",
    startedAt: "2026-09-12T10:40:00.000Z",
    createdAt: "2026-09-12T10:40:15.000Z",
    updatedAt: "2026-09-12T10:40:15.000Z",
    assignee: DEFAULT_INCIDENT_ACTORS.priya,
    summary:
      "Observed degradation: Warning health state with 3.4x burn rate and 15.8% remaining error budget.",
    isSimulated: true,
  },
  {
    id: "inc-0003",
    workspaceId: "ws-demo",
    environmentId: "env-prod",
    incidentNumber: "INC-0003",
    title: "Payment Gateway downstream settlement webhook timeout",
    description:
      "Intermittent 504 timeouts on third-party settlement webhooks during batch reconciliations.",
    severity: "SEV3",
    status: "MITIGATED",
    priority: "P3",
    affectedServiceIds: ["srv-payment-gateway"],
    detectionSource: "ALERT",
    startedAt: "2026-09-11T14:20:00.000Z",
    acknowledgedAt: "2026-09-11T14:25:00.000Z",
    mitigatedAt: "2026-09-11T15:10:00.000Z",
    createdAt: "2026-09-11T14:20:30.000Z",
    updatedAt: "2026-09-11T15:10:00.000Z",
    assignee: DEFAULT_INCIDENT_ACTORS.alex,
    commander: DEFAULT_INCIDENT_ACTORS.thejas,
    summary:
      "Mitigated by enabling exponential backoff on retry queues and temporarily capping reconciliation concurrency.",
    resolutionSummary:
      "Concurrency limits stabilized webhook response latency within acceptable SLO margins.",
    isSimulated: true,
  },
  {
    id: "inc-0004",
    workspaceId: "ws-demo",
    environmentId: "env-prod",
    incidentNumber: "INC-0004",
    title: "Auth Service Redis session cluster connection failover",
    description:
      "Transient connection pool exhaustion during primary Redis node maintenance rotation.",
    severity: "SEV2",
    status: "RESOLVED",
    priority: "P2",
    affectedServiceIds: ["srv-auth-service"],
    detectionSource: "SYSTEM",
    startedAt: "2026-09-10T08:00:00.000Z",
    acknowledgedAt: "2026-09-10T08:03:00.000Z",
    mitigatedAt: "2026-09-10T08:25:00.000Z",
    resolvedAt: "2026-09-10T08:45:00.000Z",
    createdAt: "2026-09-10T08:00:10.000Z",
    updatedAt: "2026-09-10T08:45:00.000Z",
    assignee: DEFAULT_INCIDENT_ACTORS.thejas,
    commander: DEFAULT_INCIDENT_ACTORS.alex,
    summary:
      "Session verification failure rate spiked to 1.8% during failover. Resolved after node read-replica promotion stabilized.",
    resolutionSummary:
      "ElastiCache replica promotion completed; connection pool idle limits reconfigured to prevent reconnect thrashing.",
    isSimulated: true,
  },
];

// ─── Seed Events ─────────────────────────────────────────────────────────────

const SEED_EVENTS: IncidentEvent[] = [
  // Events for INC-0001
  {
    id: "evt-0001-1",
    incidentId: "inc-0001",
    type: "ALERT_TRIGGERED",
    timestamp: "2026-09-12T09:15:00.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.system,
    message: "Alert triggered: Notification Worker High Error Rate (> 1.0%)",
    metadata: { alertId: "alert-001", metricValue: "2.10%" },
  },
  {
    id: "evt-0001-2",
    incidentId: "inc-0001",
    type: "INCIDENT_CREATED",
    timestamp: "2026-09-12T09:15:30.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.system,
    message: "Automated Incident INC-0001 created from alert alert-001 with severity SEV1",
  },
  {
    id: "evt-0001-3",
    incidentId: "inc-0001",
    type: "ACKNOWLEDGED",
    timestamp: "2026-09-12T09:18:00.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.thejas,
    message: "Incident acknowledged by Thejas. Initiating triage.",
  },
  {
    id: "evt-0001-4",
    incidentId: "inc-0001",
    type: "ASSIGNED",
    timestamp: "2026-09-12T09:19:00.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.thejas,
    message: "Incident assigned to Thejas (Lead) and Alex (Commander).",
    metadata: { assigneeId: "usr-thejas", commanderId: "usr-alex" },
  },
  {
    id: "evt-0001-5",
    incidentId: "inc-0001",
    type: "INVESTIGATION_STARTED",
    timestamp: "2026-09-12T09:20:00.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.thejas,
    message: "Investigation started. Analyzing worker batch queue concurrency and database pool sizes.",
  },
  {
    id: "evt-0001-6",
    incidentId: "inc-0001",
    type: "NOTE_ADDED",
    timestamp: "2026-09-12T09:25:00.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.alex,
    message: "Telemetry shows worker threads failing on bulk email dispatch queue due to downstream rate limiting.",
  },

  // Events for INC-0002
  {
    id: "evt-0002-1",
    incidentId: "inc-0002",
    type: "ALERT_TRIGGERED",
    timestamp: "2026-09-12T10:40:00.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.system,
    message: "SLO degradation alert: Orders API p95 Latency (320ms > 200ms)",
    metadata: { alertId: "alert-002", currentValue: "320ms", target: "200ms" },
  },
  {
    id: "evt-0002-2",
    incidentId: "inc-0002",
    type: "INCIDENT_CREATED",
    timestamp: "2026-09-12T10:40:15.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.system,
    message: "Incident INC-0002 created with severity SEV2",
  },
  {
    id: "evt-0002-3",
    incidentId: "inc-0002",
    type: "ASSIGNED",
    timestamp: "2026-09-12T10:41:00.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.system,
    message: "Incident automatically routed and assigned to Priya.",
  },

  // Events for INC-0003
  {
    id: "evt-0003-1",
    incidentId: "inc-0003",
    type: "INCIDENT_CREATED",
    timestamp: "2026-09-11T14:20:30.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.alex,
    message: "Manual incident INC-0003 created for Payment Gateway settlement retries",
  },
  {
    id: "evt-0003-2",
    incidentId: "inc-0003",
    type: "ACKNOWLEDGED",
    timestamp: "2026-09-11T14:25:00.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.alex,
    message: "Incident acknowledged by Alex",
  },
  {
    id: "evt-0003-3",
    incidentId: "inc-0003",
    type: "MITIGATED",
    timestamp: "2026-09-11T15:10:00.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.thejas,
    message: "Applied concurrency throttling on webhook dispatch queues. Settlement latency normalized.",
  },

  // Events for INC-0004
  {
    id: "evt-0004-1",
    incidentId: "inc-0004",
    type: "INCIDENT_CREATED",
    timestamp: "2026-09-10T08:00:10.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.system,
    message: "Incident INC-0004 created during Redis cluster failover event",
  },
  {
    id: "evt-0004-2",
    incidentId: "inc-0004",
    type: "ACKNOWLEDGED",
    timestamp: "2026-09-10T08:03:00.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.thejas,
    message: "Acknowledged and coordinated with cloud infrastructure rotation.",
  },
  {
    id: "evt-0004-3",
    incidentId: "inc-0004",
    type: "MITIGATED",
    timestamp: "2026-09-10T08:25:00.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.alex,
    message: "Read-replica promoted to primary. Connection pool recovering.",
  },
  {
    id: "evt-0004-4",
    incidentId: "inc-0004",
    type: "RESOLVED",
    timestamp: "2026-09-10T08:45:00.000Z",
    actor: DEFAULT_INCIDENT_ACTORS.thejas,
    message: "Failover complete. All session verification checks healthy and nominal.",
  },
];

// ─── Seed Evidence ───────────────────────────────────────────────────────────

const SEED_EVIDENCE: IncidentEvidence[] = [
  // Evidence for INC-0001
  {
    id: "evi-0001-1",
    incidentId: "inc-0001",
    type: "SERVICE_HEALTH",
    title: "Notification Worker Health State: CRITICAL",
    description: "Centralized SRE evaluation flagged critical state due to sustained high error rate.",
    source: "SRE Health Engine",
    sourceUrl: "/services/srv-notification-worker",
    observedAt: "2026-09-12T09:15:00.000Z",
    data: { status: "CRITICAL", errorRate: "2.10%", p95Latency: "480ms" },
  },
  {
    id: "evi-0001-2",
    incidentId: "inc-0001",
    type: "BURN_RATE",
    title: "Peak Burn Rate: 11.2x",
    description: "Rapid budget burn exceeding 5.0x multi-window critical threshold.",
    source: "Reliability Monitor",
    sourceUrl: "/slos",
    observedAt: "2026-09-12T09:15:00.000Z",
    data: { burnRate: 11.2, timeToExhaustionHours: 6.4 },
  },
  {
    id: "evi-0001-3",
    incidentId: "inc-0001",
    type: "ERROR_BUDGET",
    title: "Error Budget Depleted: 0.0% Remaining",
    description: "30-day availability SLO budget fully consumed.",
    source: "SLO Engine",
    sourceUrl: "/slos",
    observedAt: "2026-09-12T09:15:00.000Z",
    data: { remainingBudgetPercent: 0.0, allowedDowntimeMinutes: 43.2 },
  },
  {
    id: "evi-0001-4",
    incidentId: "inc-0001",
    type: "ALERT",
    title: "Triggered Alert: Notification Worker High Error Rate",
    description: "Alarm condition: ErrorRate >= 1.0% for 2 consecutive evaluation periods.",
    source: "Alerting Engine",
    sourceUrl: "/alerts/alert-001",
    observedAt: "2026-09-12T09:15:00.000Z",
    data: { alertId: "alert-001", ruleName: "Worker Error Rate Spike" },
  },

  // Evidence for INC-0002
  {
    id: "evi-0002-1",
    incidentId: "inc-0002",
    type: "SLO",
    title: "Orders API p95 Latency Compliance Violation",
    description: "Observed p95 latency of 320ms exceeds configured target of 200ms.",
    source: "SLO Engine",
    sourceUrl: "/slos",
    observedAt: "2026-09-12T10:40:00.000Z",
    data: { target: "200ms", currentValue: "320ms", compliance: "96.4%" },
  },
  {
    id: "evi-0002-2",
    incidentId: "inc-0002",
    type: "BURN_RATE",
    title: "Orders API Burn Rate: 3.4x",
    description: "Elevated warning burn rate between 1.0x and 5.0x threshold.",
    source: "Reliability Monitor",
    sourceUrl: "/slos",
    observedAt: "2026-09-12T10:40:00.000Z",
    data: { burnRate: 3.4, remainingBudgetPercent: 15.8 },
  },
  {
    id: "evi-0002-3",
    incidentId: "inc-0002",
    type: "ALERT",
    title: "Alert: Orders API Elevated p95 Latency",
    description: "Alarm condition: p95Latency >= 250ms for 3 periods.",
    source: "Alerting Engine",
    sourceUrl: "/alerts/alert-002",
    observedAt: "2026-09-12T10:40:00.000Z",
    data: { alertId: "alert-002" },
  },

  // Evidence for INC-0003
  {
    id: "evi-0003-1",
    incidentId: "inc-0003",
    type: "METRIC",
    title: "Payment Gateway Webhook 504 Timeout Surge",
    description: "Observed 504 Gateway Timeout rate spiked during batch reconciliation window.",
    source: "Telemetry Ingestion",
    sourceUrl: "/services/srv-payment-gateway",
    observedAt: "2026-09-11T14:20:00.000Z",
    data: { timeoutsCount: 42, threshold: 5 },
  },

  // Evidence for INC-0004
  {
    id: "evi-0004-1",
    incidentId: "inc-0004",
    type: "AWS_SIGNAL",
    title: "ElastiCache Redis Primary Node Failover Event",
    description: "Cluster event logged: Node failover initiated on replica auth-redis-002.",
    source: "CloudWatch Infrastructure",
    sourceUrl: "/elasticache",
    observedAt: "2026-09-10T08:00:00.000Z",
    data: { clusterId: "auth-session-redis", event: "NodeFailoverInitiated" },
  },
];

// ─── Clone Helpers ───────────────────────────────────────────────────────────

function deepClone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val));
}

// ─── Local Incident Store Class ──────────────────────────────────────────────

export class LocalIncidentStore {
  private incidents: Map<string, Incident> = new Map();
  private events: Map<string, IncidentEvent[]> = new Map();
  private evidence: Map<string, IncidentEvidence[]> = new Map();
  private nextIncidentNumber: number = 5;

  constructor() {
    this.reset();
  }

  /** Reset store to default seed data */
  public reset(): void {
    this.incidents.clear();
    this.events.clear();
    this.evidence.clear();
    this.nextIncidentNumber = 5;

    for (const inc of SEED_INCIDENTS) {
      this.incidents.set(inc.id, deepClone(inc));
      this.events.set(inc.id, []);
      this.evidence.set(inc.id, []);
    }

    for (const evt of SEED_EVENTS) {
      const list = this.events.get(evt.incidentId) ?? [];
      list.push(deepClone(evt));
      this.events.set(evt.incidentId, list);
    }

    for (const evi of SEED_EVIDENCE) {
      const list = this.evidence.get(evi.incidentId) ?? [];
      list.push(deepClone(evi));
      this.evidence.set(evi.incidentId, list);
    }
  }

  public getNextIncidentNumber(): string {
    const num = this.nextIncidentNumber++;
    return `INC-${String(num).padStart(4, "0")}`;
  }

  // ─── Incident CRUD ─────────────────────────────────────────────────────────

  public getAllIncidents(): Incident[] {
    return Array.from(this.incidents.values()).map(deepClone);
  }

  public getIncidentById(id: string): Incident | null {
    const inc = this.incidents.get(id);
    return inc ? deepClone(inc) : null;
  }

  public saveIncident(incident: Incident): Incident {
    this.incidents.set(incident.id, deepClone(incident));
    if (!this.events.has(incident.id)) {
      this.events.set(incident.id, []);
    }
    if (!this.evidence.has(incident.id)) {
      this.evidence.set(incident.id, []);
    }
    return deepClone(incident);
  }

  // ─── Events & Evidence ─────────────────────────────────────────────────────

  public getEventsByIncidentId(incidentId: string): IncidentEvent[] {
    const evts = this.events.get(incidentId) ?? [];
    return evts.map(deepClone).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  public addEvent(event: IncidentEvent): IncidentEvent {
    const list = this.events.get(event.incidentId) ?? [];
    list.push(deepClone(event));
    this.events.set(event.incidentId, list);
    return deepClone(event);
  }

  public getEvidenceByIncidentId(incidentId: string): IncidentEvidence[] {
    const evis = this.evidence.get(incidentId) ?? [];
    return evis.map(deepClone).sort(
      (a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime()
    );
  }

  public addEvidence(evidence: IncidentEvidence): IncidentEvidence {
    const list = this.evidence.get(evidence.incidentId) ?? [];
    list.push(deepClone(evidence));
    this.evidence.set(evidence.incidentId, list);
    return deepClone(evidence);
  }
}
