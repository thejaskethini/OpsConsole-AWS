/**
 * Unit & Integration Test Suite for Phase 5 — Incident Management
 *
 * Tests:
 * 1. Domain Validation & Models
 * 2. In-Memory Repository Scoping & Isolation (Workspace & Environment)
 * 3. Incident Lifecycle Engine (Creation, Ack, Assign, Investigate, Mitigate, Resolve)
 * 4. Invalid State Transitions Enforcement
 * 5. Chronological Timeline Event Generation & Note Logging
 * 6. Structured Operational Evidence Management
 * 7. Alert-to-Incident Correlation & Duplicate Prevention
 * 8. Search & Filtering Mechanics
 * 9. RBAC Permissions (Viewer denial vs Operator/Admin/Owner execution)
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  LocalIncidentRepository,
  IncidentEngine,
  type CreateIncidentInput,
  type IncidentActor,
  type IncidentEvidence,
} from "../src/modules/incidents";
import { can, hasPermission } from "../src/modules/identity";

const TEST_WS = "ws-test-incidents";
const TEST_ENV = "env-test-prod";
const OTHER_WS = "ws-other-tenant";
const OTHER_ENV = "env-test-staging";

const DEMO_WS_ID = "ws_demo_001";
const OWNER_USER_ID = "usr_thejas_001";
const VIEWER_USER_ID = "usr_priya_003";

const testActor: IncidentActor = {
  id: "usr-tester",
  name: "Reliability Engineer",
  email: "tester@opsconsole.internal",
  avatarInitials: "RE",
};

describe("Phase 5: Incident Domain & Repository Isolation", () => {
  let repo: LocalIncidentRepository;
  let engine: IncidentEngine;

  beforeEach(() => {
    repo = new LocalIncidentRepository();
    engine = new IncidentEngine(repo);
  });

  it("should initialize with deterministic seed incidents", async () => {
    const incidents = await repo.listIncidents("ws-demo", "env-prod");
    assert.ok(incidents.length >= 3, "Expected at least 3 seed incidents in default tenant");
    
    const sev1 = incidents.find((i) => i.severity === "SEV1");
    assert.ok(sev1, "Expected at least one SEV1 seed incident");
    assert.strictEqual(sev1.status, "INVESTIGATING");
    assert.ok(sev1.affectedServiceIds.includes("srv-notification-worker"));
  });

  it("should enforce strict workspace isolation", async () => {
    // Create incident in TEST_WS
    const inc = await engine.createIncident(TEST_WS, TEST_ENV, testActor, {
      title: "Isolated Outage",
      description: "Testing workspace boundaries",
      severity: "SEV1",
      affectedServiceIds: ["srv-orders-api"],
      detectionSource: "MANUAL",
    });

    // Query TEST_WS -> Found
    const foundInOwnWs = await repo.getIncidentById(TEST_WS, TEST_ENV, inc.id);
    assert.ok(foundInOwnWs, "Should find incident in its own workspace");
    assert.strictEqual(foundInOwnWs.title, "Isolated Outage");

    // Query OTHER_WS with the same incident ID -> Null (Strict isolation)
    const foundInOtherWs = await repo.getIncidentById(OTHER_WS, TEST_ENV, inc.id);
    assert.strictEqual(foundInOtherWs, null, "Should not expose incident across workspace boundary");

    const otherWsList = await repo.listIncidents(OTHER_WS, TEST_ENV);
    assert.strictEqual(otherWsList.length, 0, "Other workspace list should be empty");
  });

  it("should enforce strict environment isolation", async () => {
    const inc = await engine.createIncident(TEST_WS, TEST_ENV, testActor, {
      title: "Prod Outage",
      description: "Testing env boundaries",
      severity: "SEV2",
      affectedServiceIds: ["srv-payment-gateway"],
      detectionSource: "ALERT",
    });

    // Same workspace, different environment -> Null
    const foundInStaging = await repo.getIncidentById(TEST_WS, OTHER_ENV, inc.id);
    assert.strictEqual(foundInStaging, null, "Should not leak incident into another environment");

    const stagingList = await repo.listIncidents(TEST_WS, OTHER_ENV);
    assert.strictEqual(stagingList.length, 0, "Staging environment list should be empty");
  });
});

describe("Phase 5: Incident Creation & Alert Correlation", () => {
  let repo: LocalIncidentRepository;
  let engine: IncidentEngine;

  beforeEach(() => {
    repo = new LocalIncidentRepository();
    engine = new IncidentEngine(repo);
  });

  it("should create a new incident with automatic INC number and initial event", async () => {
    const input: CreateIncidentInput = {
      title: "Payment Processing Latency Surge",
      description: "p99 latency reached 1400ms on card capture",
      severity: "SEV2",
      affectedServiceIds: ["srv-payment-gateway"],
      detectionSource: "ALERT",
      summary: "Observed p99 threshold breach",
    };

    const incident = await engine.createIncident(TEST_WS, TEST_ENV, testActor, input);

    assert.ok(incident.id.startsWith("inc-"), "Expected standard ID prefix");
    assert.ok(incident.incidentNumber.startsWith("INC-"), "Expected INC-XXXX numbering");
    assert.strictEqual(incident.status, "OPEN");
    assert.strictEqual(incident.severity, "SEV2");
    assert.strictEqual(incident.title, input.title);

    // Verify initial timeline event
    const events = await repo.listEvents(TEST_WS, TEST_ENV, incident.id);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].type, "INCIDENT_CREATED");
    assert.strictEqual(events[0].actor.id, testActor.id);
  });

  it("should reject creation when required fields are missing", async () => {
    await assert.rejects(
      async () => {
        await engine.createIncident(TEST_WS, TEST_ENV, testActor, {
          title: "",
          description: "Missing title",
          severity: "SEV2",
          affectedServiceIds: ["srv-orders-api"],
          detectionSource: "MANUAL",
        });
      },
      /Incident title is required/
    );

    await assert.rejects(
      async () => {
        await engine.createIncident(TEST_WS, TEST_ENV, testActor, {
          title: "Valid Title",
          description: "No services",
          severity: "SEV2",
          affectedServiceIds: [],
          detectionSource: "MANUAL",
        });
      },
      /At least one affected service/
    );
  });

  it("should prevent duplicate incidents for the same firing alert", async () => {
    const alertId = "alert-test-unique-001";

    const inc1 = await engine.createIncident(TEST_WS, TEST_ENV, testActor, {
      title: "First Incident from Alert",
      description: "Alert triggered",
      severity: "SEV1",
      affectedServiceIds: ["srv-orders-api"],
      detectionSource: "ALERT",
      primaryAlertId: alertId,
    });
    assert.ok(inc1.id);

    // Attempting to create another incident for the SAME active alert in the SAME workspace & env must be rejected
    await assert.rejects(
      async () => {
        await engine.createIncident(TEST_WS, TEST_ENV, testActor, {
          title: "Duplicate Incident from Alert",
          description: "Should fail",
          severity: "SEV1",
          affectedServiceIds: ["srv-orders-api"],
          detectionSource: "ALERT",
          primaryAlertId: alertId,
        });
      },
      /already tracking alert/
    );
  });
});

describe("Phase 5: State Machine Transitions & Audit Logs", () => {
  let repo: LocalIncidentRepository;
  let engine: IncidentEngine;

  beforeEach(() => {
    repo = new LocalIncidentRepository();
    engine = new IncidentEngine(repo);
  });

  it("should complete a full valid lifecycle: OPEN -> ACKNOWLEDGED -> INVESTIGATING -> MITIGATED -> RESOLVED", async () => {
    const inc = await engine.createIncident(TEST_WS, TEST_ENV, testActor, {
      title: "Full Lifecycle Test",
      description: "Testing state machine",
      severity: "SEV2",
      affectedServiceIds: ["srv-orders-api"],
      detectionSource: "MANUAL",
    });

    assert.strictEqual(inc.status, "OPEN");

    // 1. Acknowledge
    const acked = await engine.acknowledge(TEST_WS, TEST_ENV, inc.id, testActor);
    assert.strictEqual(acked.status, "ACKNOWLEDGED");
    assert.ok(acked.acknowledgedAt);

    // 2. Start Investigation
    const investigating = await engine.startInvestigation(TEST_WS, TEST_ENV, inc.id, testActor);
    assert.strictEqual(investigating.status, "INVESTIGATING");

    // 3. Add Note
    await engine.addNote(TEST_WS, TEST_ENV, inc.id, testActor, "Identified cache connection pool saturation.");

    // 4. Mitigate
    const mitigated = await engine.mitigate(
      TEST_WS,
      TEST_ENV,
      inc.id,
      testActor,
      "Scaled Redis replica count from 2 to 6."
    );
    assert.strictEqual(mitigated.status, "MITIGATED");

    // 5. Resolve
    const resolved = await engine.resolve(
      TEST_WS,
      TEST_ENV,
      inc.id,
      testActor,
      "Connection pool settings tuned in helm config. Traffic normalized."
    );
    assert.strictEqual(resolved.status, "RESOLVED");
    assert.ok(resolved.resolvedAt);
    assert.strictEqual(
      resolved.resolutionSummary,
      "Connection pool settings tuned in helm config. Traffic normalized."
    );

    // Verify complete chronological timeline
    const events = await repo.listEvents(TEST_WS, TEST_ENV, inc.id);
    assert.strictEqual(events.length, 6);
    assert.strictEqual(events[0].type, "INCIDENT_CREATED");
    assert.strictEqual(events[1].type, "ACKNOWLEDGED");
    assert.strictEqual(events[2].type, "INVESTIGATION_STARTED");
    assert.strictEqual(events[3].type, "NOTE_ADDED");
    assert.strictEqual(events[4].type, "MITIGATED");
    assert.strictEqual(events[5].type, "RESOLVED");
  });

  it("should assign responder and incident commander", async () => {
    const inc = await engine.createIncident(TEST_WS, TEST_ENV, testActor, {
      title: "Commander Assignment Test",
      description: "Testing role assignments",
      severity: "SEV1",
      affectedServiceIds: ["srv-orders-api"],
      detectionSource: "MANUAL",
    });

    const assignee: IncidentActor = {
      id: "usr-responder",
      name: "Primary Responder",
      email: "resp@internal",
    };
    const commander: IncidentActor = {
      id: "usr-commander",
      name: "Incident Commander",
      email: "ic@internal",
    };

    const updated = await engine.assign(TEST_WS, TEST_ENV, inc.id, testActor, assignee, commander);
    assert.strictEqual(updated.assignee?.id, assignee.id);
    assert.strictEqual(updated.commander?.id, commander.id);

    const events = await repo.listEvents(TEST_WS, TEST_ENV, inc.id);
    const assignEvent = events.find((e) => e.type === "ASSIGNED");
    assert.ok(assignEvent);
    assert.ok(assignEvent.message.includes("Primary Responder"));
  });

  it("should reject invalid state transitions", async () => {
    const inc = await engine.createIncident(TEST_WS, TEST_ENV, testActor, {
      title: "Invalid Transition Test",
      description: "Testing state restrictions",
      severity: "SEV3",
      affectedServiceIds: ["srv-orders-api"],
      detectionSource: "MANUAL",
    });

    // Resolve the incident
    await engine.resolve(TEST_WS, TEST_ENV, inc.id, testActor, "Closed");

    // Attempting to move RESOLVED -> INVESTIGATING directly must fail
    await assert.rejects(
      async () => {
        await engine.changeStatus(TEST_WS, TEST_ENV, inc.id, testActor, "INVESTIGATING");
      },
      /Invalid status transition from 'RESOLVED' to 'INVESTIGATING'/
    );

    // Attempting to move RESOLVED -> ACKNOWLEDGED directly must fail
    await assert.rejects(
      async () => {
        await engine.changeStatus(TEST_WS, TEST_ENV, inc.id, testActor, "ACKNOWLEDGED");
      },
      /Invalid status transition from 'RESOLVED' to 'ACKNOWLEDGED'/
    );
  });
});

describe("Phase 5: Structured Operational Evidence", () => {
  let repo: LocalIncidentRepository;
  let engine: IncidentEngine;

  beforeEach(() => {
    repo = new LocalIncidentRepository();
    engine = new IncidentEngine(repo);
  });

  it("should record and query structured evidence items", async () => {
    const inc = await engine.createIncident(TEST_WS, TEST_ENV, testActor, {
      title: "Evidence Attachment Test",
      description: "Validating telemetry evidence",
      severity: "SEV1",
      affectedServiceIds: ["srv-notification-worker"],
      detectionSource: "ALERT",
    });

    const evidence1: IncidentEvidence = {
      id: "evi-001",
      incidentId: inc.id,
      type: "SERVICE_HEALTH",
      title: "Critical Service Degradation",
      description: "Worker health transitioned from HEALTHY to CRITICAL due to exhausted error budget.",
      source: "SRE Health Engine",
      sourceUrl: "/services/srv-notification-worker",
      observedAt: new Date().toISOString(),
      data: {
        burnRate: 11.2,
        errorBudgetPercent: 0,
        observedValue: "2.10%",
      },
    };

    const evidence2: IncidentEvidence = {
      id: "evi-002",
      incidentId: inc.id,
      type: "SLO",
      title: "SLO Exhaustion Alert",
      description: "30-day rolling availability SLO breached target of 99.9%.",
      source: "SLO Engine",
      sourceUrl: "/slos",
      observedAt: new Date().toISOString(),
    };

    await repo.addEvidence(TEST_WS, TEST_ENV, evidence1);
    await repo.addEvidence(TEST_WS, TEST_ENV, evidence2);

    const evidenceList = await repo.listEvidence(TEST_WS, TEST_ENV, inc.id);
    assert.strictEqual(evidenceList.length, 2);
    assert.strictEqual(evidenceList[0].type, "SERVICE_HEALTH");
    assert.strictEqual((evidenceList[0].data as Record<string, unknown>)?.burnRate, 11.2);
    assert.strictEqual(evidenceList[1].type, "SLO");
  });
});

describe("Phase 5: Search, Filtering & Stats", () => {
  let repo: LocalIncidentRepository;

  beforeEach(() => {
    repo = new LocalIncidentRepository();
  });

  it("should accurately filter incidents by status, severity, and search query", async () => {
    const all = await repo.listIncidents("ws-demo", "env-prod");
    assert.ok(all.length >= 3);

    // Filter by status INVESTIGATING
    const investigating = await repo.listIncidents("ws-demo", "env-prod", { status: "INVESTIGATING" });
    assert.ok(investigating.every((i) => i.status === "INVESTIGATING"));

    // Filter by severity SEV1
    const sev1List = await repo.listIncidents("ws-demo", "env-prod", { severity: "SEV1" });
    assert.ok(sev1List.every((i) => i.severity === "SEV1"));

    // Filter by text search
    const searched = await repo.listIncidents("ws-demo", "env-prod", { search: "Notification" });
    assert.ok(searched.length > 0);
    assert.ok(searched[0].title.includes("Notification"));
  });

  it("should compute accurate KPI statistics", async () => {
    const stats = await repo.getStats("ws-demo", "env-prod");
    assert.ok(stats.total >= 3);
    assert.strictEqual(stats.total, stats.open + stats.acknowledged + stats.investigating + stats.mitigated + stats.resolved);
    assert.ok(stats.sev1Count >= 1);
  });
});

describe("Phase 5: RBAC Authorization Matrix", () => {
  it("should verify permission mappings for viewer vs operator/admin/owner", () => {
    assert.strictEqual(hasPermission("viewer", "incidents:read"), true);
    assert.strictEqual(hasPermission("viewer", "incidents:manage"), false);
    assert.strictEqual(hasPermission("operator", "incidents:manage"), true);
    assert.strictEqual(hasPermission("admin", "incidents:manage"), true);
    assert.strictEqual(hasPermission("owner", "incidents:manage"), true);
  });

  it("should check user authorization via can() helper in demo workspace", async () => {
    const viewerCanRead = await can(VIEWER_USER_ID, DEMO_WS_ID, "incidents:read");
    const viewerCanManage = await can(VIEWER_USER_ID, DEMO_WS_ID, "incidents:manage");
    const ownerCanManage = await can(OWNER_USER_ID, DEMO_WS_ID, "incidents:manage");

    assert.strictEqual(viewerCanRead, true, "Priya (Viewer) can read incidents");
    assert.strictEqual(viewerCanManage, false, "Priya (Viewer) cannot manage incidents");
    assert.strictEqual(ownerCanManage, true, "Thejas (Owner) can manage incidents");
  });
});
