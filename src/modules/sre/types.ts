/**
 * SRE Reliability Domain Types
 *
 * Models for Services, Golden Signals, SLIs, SLOs, Error Budgets,
 * Burn Rates, and Centralized Service Health.
 *
 * Completely independent of direct cloud provider calls.
 */

// ─── Service ──────────────────────────────────────────────────────────────────

export type ServiceTier = "tier-1" | "tier-2" | "tier-3";
export type ServiceStatus = "HEALTHY" | "WARNING" | "CRITICAL";

export interface CloudResourceLink {
  type: string; // e.g., "ECS Service", "ALB TargetGroup", "RDS Database", "Lambda"
  identifier: string; // e.g., "payments-api-task", "arn:aws:..."
  region: string;
}

export interface Service {
  id: string;
  workspaceId: string;
  environmentId: string;
  name: string;
  slug: string;
  description: string;
  ownerTeam: string;
  tier: ServiceTier;
  status: ServiceStatus;
  dependencies: string[]; // List of service IDs this service depends on
  cloudResourceLinks: CloudResourceLink[];
  isSimulated: boolean; // Flag explicitly indicating deterministic/simulated telemetry
  createdAt: string;
}

// ─── Golden Signals ───────────────────────────────────────────────────────────

export interface LatencySignal {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export interface SaturationSignal {
  cpuPercent: number;
  memoryPercent: number;
  queueFillPercent?: number;
}

export interface GoldenSignals {
  latency: LatencySignal;
  trafficReqPerMin: number;
  errorRatePercent: number;
  saturation: SaturationSignal;
  isSimulated: boolean;
}

// ─── SLI (Service Level Indicator) ────────────────────────────────────────────

export type SLIType = "availability" | "latency" | "error_rate" | "saturation";
export type SLITargetDirection = "gte" | "lte"; // gte: >= target (e.g. availability), lte: <= target (e.g. latency/error rate)

export interface SLI {
  id: string;
  serviceId: string;
  type: SLIType;
  name: string;
  description: string;
  currentValue: number;
  unit: string;
  targetDirection: SLITargetDirection;
}

// ─── Error Budget ─────────────────────────────────────────────────────────────

export type ErrorBudgetUnit = "minutes" | "events" | "percentage";
export type ErrorBudgetStatus = "HEALTHY" | "WARNING" | "CRITICAL" | "EXHAUSTED";

export interface ErrorBudget {
  unit: ErrorBudgetUnit;
  totalAllowed: number;
  consumed: number;
  remaining: number;
  remainingPercent: number;
  status: ErrorBudgetStatus;
}

// ─── Burn Rate ────────────────────────────────────────────────────────────────

export type BurnRateStatus = "HEALTHY" | "WARNING" | "CRITICAL";

export interface BurnRate {
  value: number; // Consumption multiplier: 1.0x = sustainable rate
  status: BurnRateStatus;
  evaluationWindow: "1h" | "6h" | "24h" | "30d";
  timeToExhaustionHours?: number; // Estimated hours remaining at current burn rate
}

// ─── SLO (Service Level Objective) ────────────────────────────────────────────

export type SLOWindowDays = 7 | 30;

export interface SLO {
  id: string;
  serviceId: string;
  sliId: string;
  name: string;
  target: number; // e.g. 99.9 for 99.9% availability or 300 for 300ms p95 latency
  windowDays: SLOWindowDays;
  currentValue: number;
  compliancePercent: number; // Actual compliance percentage over window (0 - 100)
  errorBudget: ErrorBudget;
  burnRate: BurnRate;
  status: ServiceStatus;
}

// ─── Centralized Service Health ───────────────────────────────────────────────

export interface ServiceHealthAssessment {
  status: ServiceStatus;
  score: number; // 0 - 100
  primaryDegradationFactor?: string; // e.g. "Elevated p95 latency (320ms > 200ms target)"
  observedSignals: string[]; // List of notable observation statements
  affectedDependencies: { serviceId: string; name: string; status: ServiceStatus }[];
}

// ─── Aggregated Service Model ─────────────────────────────────────────────────

export interface ServiceWithReliability {
  service: Service;
  goldenSignals: GoldenSignals;
  slos: SLO[];
  health: ServiceHealthAssessment;
  dependencies: { id: string; name: string; status: ServiceStatus }[];
  dependents: { id: string; name: string; status: ServiceStatus }[];
}

// ─── Executive SRE Overview / Health Summary ──────────────────────────────────

export interface SREExecutiveHealth {
  workspaceId: string;
  environmentId: string;
  totalServices: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  overallCompliancePercent: number;
  averageErrorBudgetPercent: number;
  highestBurnRate: { serviceId: string; serviceName: string; burnRate: number };
  degradedServices: {
    serviceId: string;
    serviceName: string;
    status: ServiceStatus;
    primaryDegradationFactor: string;
    errorBudgetPercent: number;
    burnRate: number;
  }[];
  isSimulated: boolean;
}
