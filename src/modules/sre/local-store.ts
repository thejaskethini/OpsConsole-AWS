/**
 * Local SRE In-Memory Store
 *
 * Provides deterministic, realistic simulated telemetry, SLO definitions,
 * and service models for local development and testing without requiring real AWS credentials.
 */

import type {
  Service,
  GoldenSignals,
  SLI,
  SLO,
  ServiceWithReliability,
  SREExecutiveHealth,
} from "./types";
import { calculateTimeBasedBudget, calculateEventBasedBudget } from "./error-budget";
import { createBurnRate } from "./burn-rate";
import { evaluateServiceHealth } from "./health";

export const DEFAULT_WORKSPACE_ID = "ws_demo_001";
export const DEFAULT_ENVIRONMENT_ID = "env_prod_001";

// ─── Deterministic Seed Services ──────────────────────────────────────────────

const SERVICES: Service[] = [
  {
    id: "svc_payments_001",
    workspaceId: DEFAULT_WORKSPACE_ID,
    environmentId: DEFAULT_ENVIRONMENT_ID,
    name: "Payments API",
    slug: "payments-api",
    description: "Core transactional payment processing, authorization, and settlement gateway",
    ownerTeam: "Payments Team",
    tier: "tier-1",
    status: "HEALTHY",
    dependencies: ["svc_auth_002"],
    cloudResourceLinks: [
      { type: "ECS Service", identifier: "payments-api-task", region: "ap-south-1" },
      { type: "ALB TargetGroup", identifier: "tg-payments-api", region: "ap-south-1" },
      { type: "RDS Database", identifier: "payments-db-primary", region: "ap-south-1" },
    ],
    isSimulated: true,
    createdAt: "2026-01-10T00:00:00Z",
  },
  {
    id: "svc_orders_002",
    workspaceId: DEFAULT_WORKSPACE_ID,
    environmentId: DEFAULT_ENVIRONMENT_ID,
    name: "Orders API",
    slug: "orders-api",
    description: "Order lifecycle management, checkout pipeline, and inventory reservations",
    ownerTeam: "Core Commerce",
    tier: "tier-1",
    status: "WARNING",
    dependencies: ["svc_payments_001", "svc_auth_002"],
    cloudResourceLinks: [
      { type: "ECS Service", identifier: "orders-api-task", region: "ap-south-1" },
      { type: "ALB TargetGroup", identifier: "tg-orders-api", region: "ap-south-1" },
      { type: "DynamoDB Table", identifier: "orders-table", region: "ap-south-1" },
    ],
    isSimulated: true,
    createdAt: "2026-01-10T00:00:00Z",
  },
  {
    id: "svc_auth_002",
    workspaceId: DEFAULT_WORKSPACE_ID,
    environmentId: DEFAULT_ENVIRONMENT_ID,
    name: "Auth API",
    slug: "auth-api",
    description: "User authentication, JWT token issuance, and OAuth/SAML identity provider",
    ownerTeam: "Security & Identity",
    tier: "tier-1",
    status: "HEALTHY",
    dependencies: [],
    cloudResourceLinks: [
      { type: "ECS Service", identifier: "auth-api-task", region: "ap-south-1" },
      { type: "ElastiCache Cluster", identifier: "auth-session-redis", region: "ap-south-1" },
    ],
    isSimulated: true,
    createdAt: "2026-01-05T00:00:00Z",
  },
  {
    id: "svc_user_004",
    workspaceId: DEFAULT_WORKSPACE_ID,
    environmentId: DEFAULT_ENVIRONMENT_ID,
    name: "User Profile API",
    slug: "user-profile-api",
    description: "Account profiles, preferences, billing profiles, and member directories",
    ownerTeam: "Platform Team",
    tier: "tier-2",
    status: "HEALTHY",
    dependencies: ["svc_auth_002"],
    cloudResourceLinks: [
      { type: "ECS Service", identifier: "user-profile-task", region: "ap-south-1" },
      { type: "RDS Database", identifier: "users-db-replica", region: "ap-south-1" },
    ],
    isSimulated: true,
    createdAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "svc_notif_005",
    workspaceId: DEFAULT_WORKSPACE_ID,
    environmentId: DEFAULT_ENVIRONMENT_ID,
    name: "Notification Worker",
    slug: "notification-worker",
    description: "Background asynchronous event dispatching: transactional emails, SMS, and webhooks",
    ownerTeam: "Communications Team",
    tier: "tier-3",
    status: "CRITICAL",
    dependencies: ["svc_user_004"],
    cloudResourceLinks: [
      { type: "Lambda Function", identifier: "notification-dispatcher", region: "ap-south-1" },
      { type: "S3 Storage", identifier: "notification-templates-prod", region: "ap-south-1" },
    ],
    isSimulated: true,
    createdAt: "2026-01-20T00:00:00Z",
  },
];

// ─── Golden Signals per Service ───────────────────────────────────────────────

const SERVICE_GOLDEN_SIGNALS: Record<string, GoldenSignals> = {
  svc_payments_001: {
    latency: { p50Ms: 120, p95Ms: 184, p99Ms: 310 },
    trafficReqPerMin: 2400,
    errorRatePercent: 0.12,
    saturation: { cpuPercent: 42, memoryPercent: 58 },
    isSimulated: true,
  },
  svc_orders_002: {
    latency: { p50Ms: 210, p95Ms: 320, p99Ms: 580 },
    trafficReqPerMin: 1850,
    errorRatePercent: 0.45,
    saturation: { cpuPercent: 78, memoryPercent: 72 },
    isSimulated: true,
  },
  svc_auth_002: {
    latency: { p50Ms: 38, p95Ms: 62, p99Ms: 115 },
    trafficReqPerMin: 5200,
    errorRatePercent: 0.02,
    saturation: { cpuPercent: 34, memoryPercent: 45 },
    isSimulated: true,
  },
  svc_user_004: {
    latency: { p50Ms: 75, p95Ms: 110, p99Ms: 190 },
    trafficReqPerMin: 1400,
    errorRatePercent: 0.08,
    saturation: { cpuPercent: 28, memoryPercent: 38 },
    isSimulated: true,
  },
  svc_notif_005: {
    latency: { p50Ms: 420, p95Ms: 850, p99Ms: 1650 },
    trafficReqPerMin: 650,
    errorRatePercent: 2.10,
    saturation: { cpuPercent: 92, memoryPercent: 88, queueFillPercent: 85 },
    isSimulated: true,
  },
};

// ─── SLIs and SLOs ────────────────────────────────────────────────────────────

const SLIS: SLI[] = [
  // Payments API SLIs
  {
    id: "sli_pay_avail",
    serviceId: "svc_payments_001",
    type: "availability",
    name: "Payment Gateway Availability",
    description: "Percentage of successful non-5xx payment transactions over 30d",
    currentValue: 99.97,
    unit: "%",
    targetDirection: "gte",
  },
  {
    id: "sli_pay_lat",
    serviceId: "svc_payments_001",
    type: "latency",
    name: "Payment Processing Latency (p95)",
    description: "Percentage of checkout authorizations responding under 300ms",
    currentValue: 98.2,
    unit: "%",
    targetDirection: "gte",
  },
  // Orders API SLIs
  {
    id: "sli_ord_avail",
    serviceId: "svc_orders_002",
    type: "availability",
    name: "Order Service Availability",
    description: "Percentage of completed checkout order submissions without internal error",
    currentValue: 99.82,
    unit: "%",
    targetDirection: "gte",
  },
  {
    id: "sli_ord_lat",
    serviceId: "svc_orders_002",
    type: "latency",
    name: "Order Creation Latency (p95)",
    description: "Percentage of order mutations completed under 250ms",
    currentValue: 91.5,
    unit: "%",
    targetDirection: "gte",
  },
  // Auth API SLIs
  {
    id: "sli_auth_avail",
    serviceId: "svc_auth_002",
    type: "availability",
    name: "Auth Token Issuer Availability",
    description: "Availability of auth verify and token refresh endpoints",
    currentValue: 99.99,
    unit: "%",
    targetDirection: "gte",
  },
  // User Profile SLIs
  {
    id: "sli_user_avail",
    serviceId: "svc_user_004",
    type: "availability",
    name: "User API Availability",
    description: "Availability of user queries and preference lookups",
    currentValue: 99.94,
    unit: "%",
    targetDirection: "gte",
  },
  // Notification Worker SLIs
  {
    id: "sli_notif_avail",
    serviceId: "svc_notif_005",
    type: "availability",
    name: "Notification Delivery Rate",
    description: "Percentage of notification jobs successfully dispatched without retry failure",
    currentValue: 98.40,
    unit: "%",
    targetDirection: "gte",
  },
  {
    id: "sli_notif_err",
    serviceId: "svc_notif_005",
    type: "error_rate",
    name: "Notification Dispatch Error Rate",
    description: "Rate of unhandled dispatch failures per thousand events",
    currentValue: 2.10,
    unit: "%",
    targetDirection: "lte",
  },
];

export function buildSlosForService(serviceId: string): SLO[] {
  switch (serviceId) {
    case "svc_payments_001":
      return [
        {
          id: "slo_pay_avail_30d",
          serviceId: "svc_payments_001",
          sliId: "sli_pay_avail",
          name: "30-Day Availability Objective",
          target: 99.9,
          windowDays: 30,
          currentValue: 99.97,
          compliancePercent: 99.97,
          errorBudget: calculateTimeBasedBudget(99.9, 99.97, 30),
          burnRate: createBurnRate(0.8, "1h", 72, 30),
          status: "HEALTHY",
        },
        {
          id: "slo_pay_lat_30d",
          serviceId: "svc_payments_001",
          sliId: "sli_pay_lat",
          name: "Payment Latency (p95 < 300ms)",
          target: 95.0,
          windowDays: 30,
          currentValue: 98.2,
          compliancePercent: 98.2,
          errorBudget: calculateEventBasedBudget(95.0, 98.2, 1_000_000),
          burnRate: createBurnRate(0.9, "1h", 64, 30),
          status: "HEALTHY",
        },
      ];

    case "svc_orders_002":
      return [
        {
          id: "slo_ord_avail_30d",
          serviceId: "svc_orders_002",
          sliId: "sli_ord_avail",
          name: "30-Day Availability Objective",
          target: 99.9,
          windowDays: 30,
          currentValue: 99.92,
          compliancePercent: 99.92,
          errorBudget: calculateTimeBasedBudget(99.9, 99.92, 30),
          burnRate: createBurnRate(2.8, "1h", 20, 30),
          status: "WARNING",
        },
        {
          id: "slo_ord_lat_30d",
          serviceId: "svc_orders_002",
          sliId: "sli_ord_lat",
          name: "Order Processing Latency (p95 < 250ms)",
          target: 90.0,
          windowDays: 30,
          currentValue: 91.5,
          compliancePercent: 91.5,
          errorBudget: calculateEventBasedBudget(90.0, 91.5, 800_000),
          burnRate: createBurnRate(3.4, "1h", 15, 30),
          status: "WARNING",
        },
      ];

    case "svc_auth_002":
      return [
        {
          id: "slo_auth_avail_30d",
          serviceId: "svc_auth_002",
          sliId: "sli_auth_avail",
          name: "Token Auth Availability (30d)",
          target: 99.95,
          windowDays: 30,
          currentValue: 99.99,
          compliancePercent: 99.99,
          errorBudget: calculateTimeBasedBudget(99.95, 99.99, 30),
          burnRate: createBurnRate(0.3, "1h", 91, 30),
          status: "HEALTHY",
        },
      ];

    case "svc_user_004":
      return [
        {
          id: "slo_user_avail_30d",
          serviceId: "svc_user_004",
          sliId: "sli_user_avail",
          name: "User Service Availability (30d)",
          target: 99.5,
          windowDays: 30,
          currentValue: 99.94,
          compliancePercent: 99.94,
          errorBudget: calculateTimeBasedBudget(99.5, 99.94, 30),
          burnRate: createBurnRate(0.9, "1h", 80, 30),
          status: "HEALTHY",
        },
      ];

    case "svc_notif_005":
      return [
        {
          id: "slo_notif_avail_30d",
          serviceId: "svc_notif_005",
          sliId: "sli_notif_avail",
          name: "Notification Availability (30d)",
          target: 99.0,
          windowDays: 30,
          currentValue: 98.40,
          compliancePercent: 98.40,
          errorBudget: calculateTimeBasedBudget(99.0, 98.40, 30),
          burnRate: createBurnRate(11.2, "1h", 0, 30),
          status: "CRITICAL",
        },
        {
          id: "slo_notif_err_30d",
          serviceId: "svc_notif_005",
          sliId: "sli_notif_err",
          name: "Notification Error Rate (< 0.5%)",
          target: 99.5, // 0.5% max errors = 99.5% success
          windowDays: 30,
          currentValue: 97.90, // 2.10% error = 97.9% success
          compliancePercent: 97.90,
          errorBudget: calculateEventBasedBudget(99.5, 97.90, 500_000),
          burnRate: createBurnRate(8.6, "1h", 0, 30),
          status: "CRITICAL",
        },
      ];

    default:
      return [];
  }
}

// ─── Local SRE Repository Implementation ──────────────────────────────────────

export class LocalSRERepository {
  async listServices(workspaceId?: string, environmentId?: string): Promise<Service[]> {
    return SERVICES.filter((s) => {
      if (workspaceId && s.workspaceId !== workspaceId) return false;
      if (environmentId && s.environmentId !== environmentId) return false;
      return true;
    });
  }

  async getServiceById(id: string): Promise<Service | null> {
    return SERVICES.find((s) => s.id === id) || null;
  }

  async getServiceBySlug(slug: string): Promise<Service | null> {
    return SERVICES.find((s) => s.slug === slug) || null;
  }

  async getGoldenSignals(serviceId: string): Promise<GoldenSignals | null> {
    return SERVICE_GOLDEN_SIGNALS[serviceId] || null;
  }

  async listSLIs(serviceId?: string): Promise<SLI[]> {
    if (serviceId) {
      return SLIS.filter((s) => s.serviceId === serviceId);
    }
    return SLIS;
  }

  async listSLOs(serviceId?: string): Promise<SLO[]> {
    if (serviceId) {
      return buildSlosForService(serviceId);
    }
    return SERVICES.flatMap((s) => buildSlosForService(s.id));
  }

  async getServiceWithReliability(serviceId: string): Promise<ServiceWithReliability | null> {
    const service = await this.getServiceById(serviceId);
    if (!service) return null;

    const goldenSignals = (await this.getGoldenSignals(serviceId)) || {
      latency: { p50Ms: 0, p95Ms: 0, p99Ms: 0 },
      trafficReqPerMin: 0,
      errorRatePercent: 0,
      saturation: { cpuPercent: 0, memoryPercent: 0 },
      isSimulated: true,
    };

    const slos = await this.listSLOs(serviceId);

    // Resolve dependencies and dependents
    const allServices = await this.listServices(service.workspaceId, service.environmentId);
    const dependencies = service.dependencies
      .map((depId) => {
        const dep = allServices.find((s) => s.id === depId);
        return dep ? { id: dep.id, name: dep.name, status: dep.status } : null;
      })
      .filter((d): d is { id: string; name: string; status: Service["status"] } => d !== null);

    const dependents = allServices
      .filter((s) => s.dependencies.includes(service.id))
      .map((s) => ({ id: s.id, name: s.name, status: s.status }));

    const health = evaluateServiceHealth({
      goldenSignals,
      slos,
      dependencyStatuses: dependencies.map((d) => ({
        serviceId: d.id,
        name: d.name,
        status: d.status,
      })),
    });

    return {
      service: {
        ...service,
        status: health.status,
      },
      goldenSignals,
      slos,
      health,
      dependencies,
      dependents,
    };
  }

  async getExecutiveHealth(
    workspaceId: string = DEFAULT_WORKSPACE_ID,
    environmentId: string = DEFAULT_ENVIRONMENT_ID
  ): Promise<SREExecutiveHealth> {
    const services = await this.listServices(workspaceId, environmentId);
    const serviceDetails = await Promise.all(
      services.map((s) => this.getServiceWithReliability(s.id))
    );
    const validDetails = serviceDetails.filter((d): d is ServiceWithReliability => d !== null);

    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let totalCompliance = 0;
    let totalErrorBudgetPct = 0;
    let sloCount = 0;
    let highestBurnRate = { serviceId: "", serviceName: "", burnRate: 0 };
    const degradedServices: SREExecutiveHealth["degradedServices"] = [];

    for (const item of validDetails) {
      if (item.health.status === "HEALTHY") healthyCount++;
      else if (item.health.status === "WARNING") warningCount++;
      else if (item.health.status === "CRITICAL") criticalCount++;

      if (item.health.status !== "HEALTHY") {
        const primarySlo = item.slos[0];
        const maxBurn = Math.max(...item.slos.map((s) => s.burnRate.value), 0);
        const minBudget = Math.min(...item.slos.map((s) => s.errorBudget.remainingPercent), 100);

        degradedServices.push({
          serviceId: item.service.id,
          serviceName: item.service.name,
          status: item.health.status,
          primaryDegradationFactor:
            item.health.primaryDegradationFactor || "Observed signal degradation",
          errorBudgetPercent: primarySlo ? minBudget : 100,
          burnRate: primarySlo ? maxBurn : 1.0,
        });
      }

      for (const slo of item.slos) {
        totalCompliance += slo.compliancePercent;
        totalErrorBudgetPct += slo.errorBudget.remainingPercent;
        sloCount++;

        if (slo.burnRate.value > highestBurnRate.burnRate) {
          highestBurnRate = {
            serviceId: item.service.id,
            serviceName: item.service.name,
            burnRate: slo.burnRate.value,
          };
        }
      }
    }

    const overallCompliancePercent =
      sloCount > 0 ? Math.round((totalCompliance / sloCount) * 100) / 100 : 100;
    const averageErrorBudgetPercent =
      sloCount > 0 ? Math.round((totalErrorBudgetPct / sloCount) * 10) / 10 : 100;

    return {
      workspaceId,
      environmentId,
      totalServices: validDetails.length,
      healthyCount,
      warningCount,
      criticalCount,
      overallCompliancePercent,
      averageErrorBudgetPercent,
      highestBurnRate,
      degradedServices,
      isSimulated: true,
    };
  }
}
