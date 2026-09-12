/**
 * SRE Core Domain Tests
 *
 * Tests covering:
 *   - Service retrieval and workspace / environment scoping
 *   - Golden Signals (Latency p50/p95/p99, Traffic, Errors, Saturation)
 *   - SLIs and SLO compliance calculations
 *   - Flexible Error Budget calculations (time-based minutes vs event-based requests)
 *   - Burn Rate calculations and standardized centralized thresholds
 *   - Centralized Service Health evaluation (HEALTHY, WARNING, CRITICAL)
 *   - Upstream / Downstream Dependency resolution
 *   - Deterministic seed data stability
 *   - RBAC permissions (sre:read, sre:manage)
 *
 * Runs 100% offline without external services or credentials.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  LocalSRERepository,
  DEFAULT_WORKSPACE_ID,
  DEFAULT_ENVIRONMENT_ID,
} from "../src/modules/sre/local-store";
import {
  calculateTimeBasedBudget,
  calculateEventBasedBudget,
  evaluateErrorBudgetStatus,
  createErrorBudget,
} from "../src/modules/sre/error-budget";
import {
  evaluateBurnRateStatus,
  createBurnRate,
  calculateTimeToExhaustionHours,
} from "../src/modules/sre/burn-rate";
import { evaluateServiceHealth } from "../src/modules/sre/health";
import { getSRERepository } from "../src/modules/sre";
import { getPermissionsForRole } from "../src/modules/identity/permissions";
import { can } from "../src/modules/identity/authorization";

// ─── LocalSRERepository — Service Retrieval & Scoping ─────────────────────────

describe("LocalSRERepository — Service Queries & Scoping", () => {
  const repo = new LocalSRERepository();

  it("lists all seeded services for default workspace and environment", async () => {
    const services = await repo.listServices(DEFAULT_WORKSPACE_ID, DEFAULT_ENVIRONMENT_ID);
    assert.ok(Array.isArray(services));
    assert.equal(services.length, 5);
  });

  it("retrieves a service by its ID", async () => {
    const svc = await repo.getServiceById("svc_payments_001");
    assert.ok(svc);
    assert.equal(svc.name, "Payments API");
    assert.equal(svc.slug, "payments-api");
    assert.equal(svc.tier, "tier-1");
    assert.equal(svc.isSimulated, true);
  });

  it("retrieves a service by its slug", async () => {
    const svc = await repo.getServiceBySlug("orders-api");
    assert.ok(svc);
    assert.equal(svc.id, "svc_orders_002");
  });

  it("returns null for non-existent service ID", async () => {
    const svc = await repo.getServiceById("svc_nonexistent_999");
    assert.equal(svc, null);
  });

  it("returns empty list for unknown workspace ID", async () => {
    const services = await repo.listServices("ws_unknown_999", DEFAULT_ENVIRONMENT_ID);
    assert.equal(services.length, 0);
  });

  it("returns empty list for unknown environment ID", async () => {
    const services = await repo.listServices(DEFAULT_WORKSPACE_ID, "env_unknown_999");
    assert.equal(services.length, 0);
  });
});

// ─── Golden Signals ───────────────────────────────────────────────────────────

describe("SRE Domain — Golden Signals", () => {
  const repo = new LocalSRERepository();

  it("provides complete 4 Golden Signals for monitored services", async () => {
    const signals = await repo.getGoldenSignals("svc_payments_001");
    assert.ok(signals);
    assert.equal(typeof signals.latency.p50Ms, "number");
    assert.equal(typeof signals.latency.p95Ms, "number");
    assert.equal(typeof signals.latency.p99Ms, "number");
    assert.ok(signals.latency.p95Ms >= signals.latency.p50Ms);
    assert.ok(signals.latency.p99Ms >= signals.latency.p95Ms);

    assert.ok(signals.trafficReqPerMin > 0);
    assert.ok(signals.errorRatePercent >= 0);
    assert.ok(signals.saturation.cpuPercent >= 0);
    assert.ok(signals.saturation.memoryPercent >= 0);
    assert.equal(signals.isSimulated, true);
  });

  it("returns deterministic data on repeated invocations", async () => {
    const call1 = await repo.getGoldenSignals("svc_orders_002");
    const call2 = await repo.getGoldenSignals("svc_orders_002");
    assert.deepEqual(call1, call2);
  });
});

// ─── Error Budget Calculations ────────────────────────────────────────────────

describe("SRE Domain — Error Budget Calculations", () => {
  describe("Time-Based Error Budget (Availability SLOs)", () => {
    it("calculates 43.2 minutes allowed downtime for 99.9% target over 30 days", () => {
      const budget = calculateTimeBasedBudget(99.9, 99.97, 30);
      // 30 days * 24h * 60m = 43,200m. 0.1% allowed = 43.2m
      assert.equal(budget.unit, "minutes");
      assert.equal(budget.totalAllowed, 43.2);
      assert.ok(budget.remaining > 0);
      assert.equal(budget.status, "HEALTHY");
    });

    it("evaluates EXHAUSTED status when actual availability is below target", () => {
      const budget = calculateTimeBasedBudget(99.9, 99.80, 30);
      assert.equal(budget.status, "EXHAUSTED");
      assert.equal(budget.remainingPercent, 0);
    });

    it("evaluates WARNING status when remaining budget is between 10% and 30%", () => {
      const status = evaluateErrorBudgetStatus(25);
      assert.equal(status, "WARNING");
    });

    it("evaluates CRITICAL status when remaining budget is between 0% and 10%", () => {
      const status = evaluateErrorBudgetStatus(5);
      assert.equal(status, "CRITICAL");
    });
  });

  describe("Event-Based Error Budget (Latency & Error Rate SLOs)", () => {
    it("calculates request-based budget for 95.0% target over 1M requests", () => {
      const budget = calculateEventBasedBudget(95.0, 98.2, 1_000_000);
      assert.equal(budget.unit, "events");
      assert.equal(budget.totalAllowed, 50_000);
      assert.ok(budget.remaining > 0);
      assert.equal(budget.status, "HEALTHY");
    });

    it("handles zero total allowed gracefully", () => {
      const budget = createErrorBudget("percentage", 0, 0);
      assert.equal(budget.remainingPercent, 0);
      assert.equal(budget.status, "EXHAUSTED");
    });
  });
});

// ─── Burn Rate Calculations & Standardized Thresholds ─────────────────────────

describe("SRE Domain — Burn Rate & Thresholds", () => {
  it("classifies <= 1.0x as HEALTHY", () => {
    assert.equal(evaluateBurnRateStatus(0.5), "HEALTHY");
    assert.equal(evaluateBurnRateStatus(1.0), "HEALTHY");
  });

  it("classifies > 1.0x and <= 5.0x as WARNING", () => {
    assert.equal(evaluateBurnRateStatus(1.1), "WARNING");
    assert.equal(evaluateBurnRateStatus(2.8), "WARNING");
    assert.equal(evaluateBurnRateStatus(5.0), "WARNING");
  });

  it("classifies > 5.0x as CRITICAL (including 10x+)", () => {
    assert.equal(evaluateBurnRateStatus(5.1), "CRITICAL");
    assert.equal(evaluateBurnRateStatus(8.6), "CRITICAL");
    assert.equal(evaluateBurnRateStatus(11.2), "CRITICAL");
  });

  it("calculates time to exhaustion in hours accurately", () => {
    // 50% remaining at 1.0x burn rate over 30d (720h) = 360 hours
    const hours = calculateTimeToExhaustionHours(50, 1.0, 30);
    assert.equal(hours, 360);
  });

  it("constructs a strongly-typed BurnRate object", () => {
    const br = createBurnRate(2.8, "1h", 28, 30);
    assert.equal(br.value, 2.8);
    assert.equal(br.status, "WARNING");
    assert.equal(br.evaluationWindow, "1h");
    assert.ok(typeof br.timeToExhaustionHours === "number");
  });
});

// ─── Centralized Service Health Engine ────────────────────────────────────────

describe("SRE Domain — Centralized Service Health Engine", () => {
  it("evaluates healthy service with nominal signals and compliant SLOs", () => {
    const health = evaluateServiceHealth({
      goldenSignals: {
        latency: { p50Ms: 40, p95Ms: 80, p99Ms: 120 },
        trafficReqPerMin: 1000,
        errorRatePercent: 0.05,
        saturation: { cpuPercent: 30, memoryPercent: 40 },
        isSimulated: true,
      },
      slos: [
        {
          id: "slo_test_1",
          serviceId: "svc_test",
          sliId: "sli_test",
          name: "Availability",
          target: 99.9,
          windowDays: 30,
          currentValue: 99.98,
          compliancePercent: 99.98,
          errorBudget: calculateTimeBasedBudget(99.9, 99.98, 30),
          burnRate: createBurnRate(0.5),
          status: "HEALTHY",
        },
      ],
    });

    assert.equal(health.status, "HEALTHY");
    assert.equal(health.score, 100);
    assert.equal(health.primaryDegradationFactor, undefined);
  });

  it("evaluates warning status when p95 latency is elevated", () => {
    const health = evaluateServiceHealth({
      goldenSignals: {
        latency: { p50Ms: 200, p95Ms: 350, p99Ms: 600 },
        trafficReqPerMin: 1000,
        errorRatePercent: 0.1,
        saturation: { cpuPercent: 40, memoryPercent: 40 },
        isSimulated: true,
      },
      slos: [],
    });

    assert.equal(health.status, "WARNING");
    assert.ok(health.primaryDegradationFactor?.includes("latency"));
  });

  it("evaluates critical status when error rate is severe (>= 2.0%)", () => {
    const health = evaluateServiceHealth({
      goldenSignals: {
        latency: { p50Ms: 200, p95Ms: 250, p99Ms: 300 },
        trafficReqPerMin: 1000,
        errorRatePercent: 2.5,
        saturation: { cpuPercent: 40, memoryPercent: 40 },
        isSimulated: true,
      },
      slos: [],
    });

    assert.equal(health.status, "CRITICAL");
    assert.ok(health.primaryDegradationFactor?.includes("error rate"));
  });

  it("incorporates dependency degradation into health assessment", () => {
    const health = evaluateServiceHealth({
      goldenSignals: {
        latency: { p50Ms: 40, p95Ms: 80, p99Ms: 120 },
        trafficReqPerMin: 1000,
        errorRatePercent: 0.05,
        saturation: { cpuPercent: 30, memoryPercent: 40 },
        isSimulated: true,
      },
      slos: [],
      dependencyStatuses: [
        { serviceId: "svc_upstream", name: "Auth API", status: "CRITICAL" },
      ],
    });

    assert.equal(health.status, "CRITICAL");
    assert.ok(health.observedSignals.some((s) => s.includes("Auth API")));
  });
});

// ─── Service Dependencies & Executive Health ──────────────────────────────────

describe("SRE Domain — Aggregation & Executive Health", () => {
  const repo = new LocalSRERepository();

  it("resolves full service reliability aggregate including dependencies", async () => {
    const detail = await repo.getServiceWithReliability("svc_orders_002");
    assert.ok(detail);
    assert.equal(detail.service.name, "Orders API");
    assert.ok(detail.dependencies.length > 0);
    assert.ok(detail.dependencies.some((d) => d.name === "Payments API"));
  });

  it("calculates executive health across all services in workspace", async () => {
    const exec = await repo.getExecutiveHealth(DEFAULT_WORKSPACE_ID, DEFAULT_ENVIRONMENT_ID);
    assert.ok(exec);
    assert.equal(exec.totalServices, 5);
    assert.ok(exec.healthyCount >= 1);
    assert.ok(exec.warningCount >= 1);
    assert.ok(exec.criticalCount >= 1);
    assert.ok(exec.overallCompliancePercent > 0);
    assert.ok(exec.highestBurnRate.burnRate > 5.0); // Notification Worker
    assert.ok(exec.degradedServices.length >= 2);
  });
});

// ─── RBAC — SRE Permissions ───────────────────────────────────────────────────

describe("SRE Domain — RBAC Permissions", () => {
  it("grants sre:read and sre:manage to owner role", () => {
    const ownerPerms = getPermissionsForRole("owner");
    assert.ok(ownerPerms.includes("sre:read"));
    assert.ok(ownerPerms.includes("sre:manage"));
  });

  it("grants sre:read and sre:manage to admin role", () => {
    const adminPerms = getPermissionsForRole("admin");
    assert.ok(adminPerms.includes("sre:read"));
    assert.ok(adminPerms.includes("sre:manage"));
  });

  it("grants sre:read and sre:manage to operator role", () => {
    const operatorPerms = getPermissionsForRole("operator");
    assert.ok(operatorPerms.includes("sre:read"));
    assert.ok(operatorPerms.includes("sre:manage"));
  });

  it("grants sre:read to viewer role, but NOT sre:manage", () => {
    const viewerPerms = getPermissionsForRole("viewer");
    assert.ok(viewerPerms.includes("sre:read"));
    assert.equal(viewerPerms.includes("sre:manage"), false);
  });

  it("authorizes viewer user for sre:read in demo workspace", async () => {
    const allowed = await can("usr_priya_003", DEFAULT_WORKSPACE_ID, "sre:read");
    assert.equal(allowed, true);
  });

  it("denies viewer user for sre:manage in demo workspace", async () => {
    const allowed = await can("usr_priya_003", DEFAULT_WORKSPACE_ID, "sre:manage");
    assert.equal(allowed, false);
  });

  it("denies non-member user from accessing SRE data", async () => {
    const allowed = await can("usr_unknown_999", DEFAULT_WORKSPACE_ID, "sre:read");
    assert.equal(allowed, false);
  });
});

// ─── Repository Factory ───────────────────────────────────────────────────────

describe("SRE Domain — Factory Singleton", () => {
  it("returns a singleton SRERepository instance", () => {
    const r1 = getSRERepository();
    const r2 = getSRERepository();
    assert.equal(r1, r2);
  });
});
