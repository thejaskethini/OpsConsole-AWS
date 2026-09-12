/**
 * Unit Test Suite for Phase 4 — Alerting Engine
 *
 * Tests Condition Operators, Evaluation State Machine, Deduplication,
 * Lifecycle Transitions (Trigger, Ack, Resolve, Re-trigger), SRE Signals Integration,
 * LocalAlertRepository, RBAC, and Workspace/Environment Isolation.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  evaluateOperator,
  extractObservedMetric,
  buildAlertFingerprint,
  evaluateRuleOnService,
  applyAlertAcknowledgement,
  applyAlertResolution,
  getAlertRepository,
  LocalAlertRepository,
  DEFAULT_WORKSPACE_ID,
  DEFAULT_ENVIRONMENT_ID,
  type AlertRule,
  type Alert,
} from "../src/modules/alerting";
import type { Service } from "../src/modules/sre/types";
import { can } from "../src/modules/identity";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const mockService: Service = {
  id: "svc_test_001",
  name: "Payment Gateway Service",
  slug: "payment-gateway",
  description: "Processes card transactions",
  ownerTeam: "fintech-team",
  tier: "tier-1",
  workspaceId: DEFAULT_WORKSPACE_ID,
  environmentId: DEFAULT_ENVIRONMENT_ID,
  status: "HEALTHY",
  dependencies: [],
  cloudResourceLinks: [],
  isSimulated: true,
  createdAt: "2026-03-01T00:00:00.000Z",
};

const mockGoldenSignals = {
  latency: { p50Ms: 90, p95Ms: 180, p99Ms: 250 },
  trafficReqPerMin: 27000,
  trafficRps: 450,
  errorRatePercent: 0.12,
  saturation: { cpuPercent: 45, memoryPercent: 55 },
  isSimulated: true,
};

const mockServiceWithRel = {
  service: mockService,
  goldenSignals: mockGoldenSignals,
  slos: [
    {
      id: "slo_test_001",
      serviceId: "svc_test_001",
      sliId: "sli_1",
      name: "Availability SLO",
      target: 99.9,
      currentValue: 99.95,
      compliancePercent: 99.95,
      windowDays: 30 as const,
      errorBudget: {
        unit: "minutes" as const,
        totalAllowed: 43.2,
        consumed: 21.6,
        remaining: 21.6,
        remainingPercent: 50.0,
        status: "HEALTHY" as const,
      },
      burnRate: {
        value: 1.0,
        status: "HEALTHY" as const,
        evaluationWindow: "1h" as const,
      },
      status: "HEALTHY" as const,
    },
    {
      id: "slo_test_002",
      serviceId: "svc_test_001",
      sliId: "sli_2",
      name: "Latency SLO",
      target: 200,
      currentValue: 180,
      compliancePercent: 98.5,
      windowDays: 30 as const,
      errorBudget: {
        unit: "events" as const,
        totalAllowed: 10000,
        consumed: 2000,
        remaining: 8000,
        remainingPercent: 80.0,
        status: "HEALTHY" as const,
      },
      burnRate: {
        value: 1.2,
        status: "WARNING" as const,
        evaluationWindow: "1h" as const,
      },
      status: "HEALTHY" as const,
    },
  ],
  health: {
    status: "HEALTHY" as const,
    score: 95,
    observedSignals: [],
    affectedDependencies: [],
  },
  dependencies: [],
  dependents: [],
};

const baseRule: AlertRule = {
  id: "rule_test_001",
  name: "High Latency Alert",
  description: "Alert when P95 latency is above 200ms",
  workspaceId: DEFAULT_WORKSPACE_ID,
  environmentId: DEFAULT_ENVIRONMENT_ID,
  serviceId: "svc_test_001",
  condition: {
    metricType: "LATENCY_P95",
    operator: "GT",
    threshold: 200,
    windowMinutes: 5,
    unit: "ms",
  },
  severity: "CRITICAL",
  isEnabled: true,
  cooldownMinutes: 15,
  labels: { tier: "1" },
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Alert Condition Operators & Comparisons", () => {
  it("evaluates numeric GT and GTE correctly", () => {
    assert.strictEqual(evaluateOperator(250, "GT", 200), true);
    assert.strictEqual(evaluateOperator(200, "GT", 200), false);
    assert.strictEqual(evaluateOperator(200, "GTE", 200), true);
    assert.strictEqual(evaluateOperator(199, "GTE", 200), false);
  });

  it("evaluates numeric LT and LTE correctly", () => {
    assert.strictEqual(evaluateOperator(15, "LT", 30), true);
    assert.strictEqual(evaluateOperator(30, "LT", 30), false);
    assert.strictEqual(evaluateOperator(30, "LTE", 30), true);
    assert.strictEqual(evaluateOperator(31, "LTE", 30), false);
  });

  it("evaluates numeric EQ and NEQ correctly", () => {
    assert.strictEqual(evaluateOperator(100, "EQ", 100), true);
    assert.strictEqual(evaluateOperator(100, "EQ", 99), false);
    assert.strictEqual(evaluateOperator(100, "NEQ", 99), true);
    assert.strictEqual(evaluateOperator(100, "NEQ", 100), false);
  });

  it("evaluates string and status comparisons (case-insensitive)", () => {
    assert.strictEqual(evaluateOperator("CRITICAL", "EQ", "critical"), true);
    assert.strictEqual(evaluateOperator("HEALTHY", "NEQ", "CRITICAL"), true);
    assert.strictEqual(evaluateOperator("WARNING", "EQ", "WARNING"), true);
    assert.strictEqual(evaluateOperator("WARNING", "EQ", "HEALTHY"), false);
  });
});

describe("SRE Metric Extraction", () => {
  it("extracts Golden Signals accurately", () => {
    const p95 = extractObservedMetric(mockServiceWithRel, "LATENCY_P95");
    assert.strictEqual(p95.value, 180);
    assert.strictEqual(p95.unit, "ms");

    const err = extractObservedMetric(mockServiceWithRel, "ERROR_RATE");
    assert.strictEqual(err.value, 0.12);
    assert.strictEqual(err.unit, "%");

    const traffic = extractObservedMetric(mockServiceWithRel, "TRAFFIC_RPS");
    assert.strictEqual(traffic.value, 450);

    const mem = extractObservedMetric(mockServiceWithRel, "SATURATION_MEMORY");
    assert.strictEqual(mem.value, 55);
  });

  it("extracts SLO and Burn Rate signals reusing SRE logic", () => {
    const budget = extractObservedMetric(mockServiceWithRel, "ERROR_BUDGET_REMAINING");
    assert.ok(typeof budget.value === "number");
    assert.strictEqual(budget.unit, "%");

    const burnRate = extractObservedMetric(mockServiceWithRel, "BURN_RATE");
    assert.ok(typeof burnRate.value === "number");
    assert.strictEqual(burnRate.unit, "x");

    const health = extractObservedMetric(mockServiceWithRel, "SERVICE_HEALTH");
    assert.strictEqual(health.value, "HEALTHY");
  });
});

describe("Alert Evaluation & State Machine", () => {
  it("transitions NORMAL -> FIRING when condition is breached", () => {
    // Latency is 180ms, threshold is 150ms -> condition breached
    const rule: AlertRule = {
      ...baseRule,
      condition: { ...baseRule.condition, threshold: 150 },
    };

    const { evaluation, nextAlert, event } = evaluateRuleOnService(rule, mockServiceWithRel);

    assert.strictEqual(evaluation.conditionMet, true);
    assert.strictEqual(evaluation.statusTransition, "TRIGGERED");
    assert.ok(nextAlert);
    assert.strictEqual(nextAlert.status, "FIRING");
    assert.strictEqual(nextAlert.severity, "CRITICAL");
    assert.strictEqual(nextAlert.conditionSnapshot.observedValue, 180);
    assert.ok(event);
    assert.strictEqual(event.eventType, "TRIGGERED");
    assert.strictEqual(event.newStatus, "FIRING");
  });

  it("deduplicates repeated evaluations while alert is already FIRING", () => {
    const rule: AlertRule = {
      ...baseRule,
      condition: { ...baseRule.condition, threshold: 150 },
    };

    const existingAlert: Alert = {
      id: "alt_existing_001",
      ruleId: rule.id,
      ruleName: rule.name,
      serviceId: mockService.id,
      serviceName: mockService.name,
      workspaceId: DEFAULT_WORKSPACE_ID,
      environmentId: DEFAULT_ENVIRONMENT_ID,
      severity: "CRITICAL",
      status: "FIRING",
      conditionSnapshot: {
        metricType: "LATENCY_P95",
        operator: "GT",
        threshold: 150,
        observedValue: 175,
      },
      fingerprint: buildAlertFingerprint(DEFAULT_WORKSPACE_ID, DEFAULT_ENVIRONMENT_ID, mockService.id, rule.id),
      title: "Title",
      summary: "Summary",
      triggeredAt: "2026-03-01T00:00:00.000Z",
      lastEvaluatedAt: "2026-03-01T00:00:00.000Z",
    };

    const { evaluation, nextAlert, event } = evaluateRuleOnService(rule, mockServiceWithRel, existingAlert);

    assert.strictEqual(evaluation.conditionMet, true);
    assert.strictEqual(evaluation.statusTransition, "UNCHANGED");
    assert.strictEqual(nextAlert?.status, "FIRING");
    assert.strictEqual(nextAlert?.id, "alt_existing_001"); // same alert instance
    assert.strictEqual(event, undefined); // no duplicate event generated
  });

  it("recovers automatically from FIRING -> RESOLVED when condition clears", () => {
    // Latency is 180ms, threshold is 200ms -> condition not breached
    const rule = baseRule; // threshold 200

    const existingAlert: Alert = {
      id: "alt_existing_002",
      ruleId: rule.id,
      ruleName: rule.name,
      serviceId: mockService.id,
      serviceName: mockService.name,
      workspaceId: DEFAULT_WORKSPACE_ID,
      environmentId: DEFAULT_ENVIRONMENT_ID,
      severity: "CRITICAL",
      status: "FIRING",
      conditionSnapshot: {
        metricType: "LATENCY_P95",
        operator: "GT",
        threshold: 200,
        observedValue: 240,
      },
      fingerprint: buildAlertFingerprint(DEFAULT_WORKSPACE_ID, DEFAULT_ENVIRONMENT_ID, mockService.id, rule.id),
      title: "Title",
      summary: "Summary",
      triggeredAt: "2026-03-01T00:00:00.000Z",
      lastEvaluatedAt: "2026-03-01T00:00:00.000Z",
    };

    const { evaluation, nextAlert, event } = evaluateRuleOnService(rule, mockServiceWithRel, existingAlert);

    assert.strictEqual(evaluation.conditionMet, false);
    assert.strictEqual(evaluation.statusTransition, "RESOLVED");
    assert.strictEqual(nextAlert?.status, "RESOLVED");
    assert.ok(nextAlert?.resolvedAt);
    assert.strictEqual(nextAlert?.resolvedBy, "system:evaluator");
    assert.ok(event);
    assert.strictEqual(event.eventType, "RESOLVED");
  });

  it("transitions RESOLVED -> FIRING (RE_TRIGGERED) if condition recurs", () => {
    // Latency is 180ms, threshold is 150ms -> condition breached again
    const rule: AlertRule = {
      ...baseRule,
      condition: { ...baseRule.condition, threshold: 150 },
    };

    const resolvedAlert: Alert = {
      id: "alt_existing_003",
      ruleId: rule.id,
      ruleName: rule.name,
      serviceId: mockService.id,
      serviceName: mockService.name,
      workspaceId: DEFAULT_WORKSPACE_ID,
      environmentId: DEFAULT_ENVIRONMENT_ID,
      severity: "CRITICAL",
      status: "RESOLVED",
      conditionSnapshot: {
        metricType: "LATENCY_P95",
        operator: "GT",
        threshold: 150,
        observedValue: 140,
      },
      fingerprint: buildAlertFingerprint(DEFAULT_WORKSPACE_ID, DEFAULT_ENVIRONMENT_ID, mockService.id, rule.id),
      title: "Title",
      summary: "Summary",
      triggeredAt: "2026-03-01T00:00:00.000Z",
      lastEvaluatedAt: "2026-03-01T01:00:00.000Z",
      resolvedAt: "2026-03-01T01:00:00.000Z",
      resolvedBy: "system:evaluator",
    };

    const { evaluation, nextAlert, event } = evaluateRuleOnService(rule, mockServiceWithRel, resolvedAlert);

    assert.strictEqual(evaluation.conditionMet, true);
    assert.strictEqual(evaluation.statusTransition, "RE_TRIGGERED");
    assert.strictEqual(nextAlert?.status, "FIRING");
    assert.strictEqual(nextAlert?.resolvedAt, undefined);
    assert.ok(event);
    assert.strictEqual(event.eventType, "RE_TRIGGERED");
    assert.strictEqual(event.previousStatus, "RESOLVED");
    assert.strictEqual(event.newStatus, "FIRING");
  });

  it("handles manual acknowledgement and manual resolution correctly", () => {
    const alert: Alert = {
      id: "alt_manual_001",
      ruleId: "r1",
      ruleName: "Rule 1",
      serviceId: "s1",
      serviceName: "S1",
      workspaceId: DEFAULT_WORKSPACE_ID,
      environmentId: DEFAULT_ENVIRONMENT_ID,
      severity: "WARNING",
      status: "FIRING",
      conditionSnapshot: {
        metricType: "ERROR_RATE",
        operator: "GT",
        threshold: 1.0,
        observedValue: 2.5,
      },
      fingerprint: "ws:env:s1:r1",
      title: "Title",
      summary: "Summary",
      triggeredAt: "2026-03-01T00:00:00.000Z",
      lastEvaluatedAt: "2026-03-01T00:00:00.000Z",
    };

    // 1. Acknowledge
    const { updatedAlert: acked, event: ackEvent } = applyAlertAcknowledgement(
      alert,
      "usr_alex_002",
      "Alex Chen"
    );
    assert.strictEqual(acked.status, "ACKNOWLEDGED");
    assert.strictEqual(acked.acknowledgedBy, "Alex Chen");
    assert.strictEqual(ackEvent.eventType, "ACKNOWLEDGED");

    // 2. Resolve
    const { updatedAlert: resolved, event: resEvent } = applyAlertResolution(
      acked,
      "usr_thejas_001",
      "Thejas Kethini",
      "Fixed payment gateway timeout"
    );
    assert.strictEqual(resolved.status, "RESOLVED");
    assert.strictEqual(resolved.resolvedBy, "Thejas Kethini");
    assert.strictEqual(resolved.resolutionNote, "Fixed payment gateway timeout");
    assert.strictEqual(resEvent.eventType, "RESOLVED");
  });
});

describe("LocalAlertRepository & Scoping", () => {
  let repo: LocalAlertRepository;

  beforeEach(() => {
    repo = new LocalAlertRepository();
  });

  it("retrieves seeded alerts for default workspace and environment", async () => {
    const alerts = await repo.getAlerts(DEFAULT_WORKSPACE_ID, DEFAULT_ENVIRONMENT_ID);
    assert.ok(alerts.length >= 3);
    const firing = alerts.filter((a) => a.status === "FIRING");
    assert.ok(firing.length >= 1);
  });

  it("filters alerts by status, severity, and search term", async () => {
    const firingOnly = await repo.getAlerts(DEFAULT_WORKSPACE_ID, DEFAULT_ENVIRONMENT_ID, {
      status: "FIRING",
    });
    assert.ok(firingOnly.every((a) => a.status === "FIRING"));

    const criticalOnly = await repo.getAlerts(DEFAULT_WORKSPACE_ID, DEFAULT_ENVIRONMENT_ID, {
      severity: "CRITICAL",
    });
    assert.ok(criticalOnly.every((a) => a.severity === "CRITICAL"));

    const searchRes = await repo.getAlerts(DEFAULT_WORKSPACE_ID, DEFAULT_ENVIRONMENT_ID, {
      search: "Notification",
    });
    assert.ok(searchRes.length >= 1);
    assert.ok(searchRes.some((a) => a.serviceName.includes("Notification")));
  });

  it("enforces workspace isolation: returns empty list for unknown workspace", async () => {
    const alerts = await repo.getAlerts("ws_unknown_999", DEFAULT_ENVIRONMENT_ID);
    assert.strictEqual(alerts.length, 0);

    const rules = await repo.getRules("ws_unknown_999", DEFAULT_ENVIRONMENT_ID);
    assert.strictEqual(rules.length, 0);

    const alert = await repo.getAlertById("alt_notif_burn_001", "ws_unknown_999");
    assert.strictEqual(alert, null);
  });

  it("creates, updates, and deletes alert rules cleanly", async () => {
    const newRule = await repo.createRule({
      name: "Custom CPU Rule",
      description: "Trigger on CPU > 90%",
      workspaceId: DEFAULT_WORKSPACE_ID,
      environmentId: DEFAULT_ENVIRONMENT_ID,
      serviceId: "svc_orders_002",
      condition: {
        metricType: "SATURATION_CPU",
        operator: "GT",
        threshold: 90,
        windowMinutes: 10,
        unit: "%",
      },
      severity: "WARNING",
      isEnabled: true,
      cooldownMinutes: 15,
      labels: { env: "prod" },
    });

    assert.ok(newRule.id.startsWith("rule_"));
    assert.strictEqual(newRule.name, "Custom CPU Rule");

    // Update
    const updated = await repo.updateRule(newRule.id, DEFAULT_WORKSPACE_ID, {
      severity: "CRITICAL",
      isEnabled: false,
    });
    assert.strictEqual(updated.severity, "CRITICAL");
    assert.strictEqual(updated.isEnabled, false);

    // Delete
    const deleted = await repo.deleteRule(newRule.id, DEFAULT_WORKSPACE_ID);
    assert.strictEqual(deleted, true);

    const found = await repo.getRuleById(newRule.id, DEFAULT_WORKSPACE_ID);
    assert.strictEqual(found, null);
  });

  it("executes evaluateAll and generates evaluations", async () => {
    const evaluations = await repo.evaluateAll(DEFAULT_WORKSPACE_ID, DEFAULT_ENVIRONMENT_ID);
    assert.ok(evaluations.length > 0);
    assert.ok(evaluations.some((e) => typeof e.conditionMet === "boolean"));
  });

  it("singleton factory returns the same repository instance", () => {
    const r1 = getAlertRepository();
    const r2 = getAlertRepository();
    assert.strictEqual(r1, r2);
  });
});

describe("Alerting RBAC Permissions", () => {
  it("grants alerts:read and alerts:manage to owner, admin, and operator roles", async () => {
    assert.strictEqual(await can("usr_thejas_001", DEFAULT_WORKSPACE_ID, "alerts:read"), true);
    assert.strictEqual(await can("usr_thejas_001", DEFAULT_WORKSPACE_ID, "alerts:manage"), true);

    assert.strictEqual(await can("usr_alex_002", DEFAULT_WORKSPACE_ID, "alerts:read"), true);
    assert.strictEqual(await can("usr_alex_002", DEFAULT_WORKSPACE_ID, "alerts:manage"), true);
  });

  it("grants alerts:read to viewer role, but denies alerts:manage", async () => {
    assert.strictEqual(await can("usr_priya_003", DEFAULT_WORKSPACE_ID, "alerts:read"), true);
    assert.strictEqual(await can("usr_priya_003", DEFAULT_WORKSPACE_ID, "alerts:manage"), false);
  });

  it("denies both alerts:read and alerts:manage to non-members", async () => {
    assert.strictEqual(await can("usr_non_member", DEFAULT_WORKSPACE_ID, "alerts:read"), false);
    assert.strictEqual(await can("usr_non_member", DEFAULT_WORKSPACE_ID, "alerts:manage"), false);
  });
});
