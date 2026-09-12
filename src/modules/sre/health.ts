/**
 * Centralized Service Health Engine
 *
 * Unifies Golden Signals, SLO Compliance, Error Budgets, and Burn Rates into a single
 * deterministic reliability evaluation.
 *
 * Statuses:
 *   - HEALTHY:  All signals nominal, SLOs compliant, error budget > 30%, burn rate <= 1.0x
 *   - WARNING:  Elevated latency/error rate, budget 10-30%, or burn rate > 1.0x and <= 5.0x
 *   - CRITICAL: Severe latency/error rate, budget < 10% / exhausted, or burn rate > 5.0x
 *
 * Note: Uses SRE-standard descriptive terms ("Primary degradation factor", "Observed reliability signal",
 * "Affected dependency") without premature Root Cause claims.
 */

import type {
  GoldenSignals,
  SLO,
  ServiceHealthAssessment,
  ServiceStatus,
} from "./types";

export interface HealthEvaluationInput {
  goldenSignals: GoldenSignals;
  slos: SLO[];
  dependencyStatuses?: { serviceId: string; name: string; status: ServiceStatus }[];
}

/**
 * Evaluates the overall health of a service based on its telemetry signals and SLOs.
 */
export function evaluateServiceHealth(input: HealthEvaluationInput): ServiceHealthAssessment {
  const { goldenSignals, slos, dependencyStatuses = [] } = input;
  const observedSignals: string[] = [];
  let primaryDegradationFactor: string | undefined;
  let criticalFactors = 0;
  let warningFactors = 0;

  // 1. Evaluate Golden Signals
  // Error rate check
  if (goldenSignals.errorRatePercent >= 2.0) {
    criticalFactors++;
    observedSignals.push(`Elevated error rate: ${goldenSignals.errorRatePercent.toFixed(2)}% (Critical threshold >= 2.0%)`);
    if (!primaryDegradationFactor) {
      primaryDegradationFactor = `High error rate (${goldenSignals.errorRatePercent.toFixed(2)}%)`;
    }
  } else if (goldenSignals.errorRatePercent >= 0.5) {
    warningFactors++;
    observedSignals.push(`Elevated error rate: ${goldenSignals.errorRatePercent.toFixed(2)}% (Warning threshold >= 0.5%)`);
    if (!primaryDegradationFactor) {
      primaryDegradationFactor = `Elevated error rate (${goldenSignals.errorRatePercent.toFixed(2)}%)`;
    }
  }

  // Latency check (p95)
  if (goldenSignals.latency.p95Ms >= 800) {
    criticalFactors++;
    observedSignals.push(`Severe p95 latency: ${goldenSignals.latency.p95Ms}ms (Critical threshold >= 800ms)`);
    if (!primaryDegradationFactor) {
      primaryDegradationFactor = `High p95 latency (${goldenSignals.latency.p95Ms}ms)`;
    }
  } else if (goldenSignals.latency.p95Ms >= 300) {
    warningFactors++;
    observedSignals.push(`Elevated p95 latency: ${goldenSignals.latency.p95Ms}ms (Warning threshold >= 300ms)`);
    if (!primaryDegradationFactor) {
      primaryDegradationFactor = `Elevated p95 latency (${goldenSignals.latency.p95Ms}ms)`;
    }
  }

  // Saturation check
  if (goldenSignals.saturation.cpuPercent >= 90 || goldenSignals.saturation.memoryPercent >= 90) {
    criticalFactors++;
    observedSignals.push(`High resource saturation: CPU ${goldenSignals.saturation.cpuPercent}%, Memory ${goldenSignals.saturation.memoryPercent}%`);
    if (!primaryDegradationFactor) {
      primaryDegradationFactor = `Resource saturation (CPU ${goldenSignals.saturation.cpuPercent}%, Mem ${goldenSignals.saturation.memoryPercent}%)`;
    }
  } else if (goldenSignals.saturation.cpuPercent >= 75 || goldenSignals.saturation.memoryPercent >= 75) {
    warningFactors++;
    observedSignals.push(`Moderate resource saturation: CPU ${goldenSignals.saturation.cpuPercent}%, Memory ${goldenSignals.saturation.memoryPercent}%`);
    if (!primaryDegradationFactor) {
      primaryDegradationFactor = `Moderate saturation (CPU ${goldenSignals.saturation.cpuPercent}%)`;
    }
  }

  // 2. Evaluate SLOs & Error Budgets & Burn Rates
  for (const slo of slos) {
    if (slo.errorBudget.status === "EXHAUSTED" || slo.errorBudget.status === "CRITICAL") {
      criticalFactors++;
      observedSignals.push(`SLO "${slo.name}" error budget critical (${slo.errorBudget.remainingPercent}% remaining)`);
      if (!primaryDegradationFactor) {
        primaryDegradationFactor = `Depleted error budget for ${slo.name} (${slo.errorBudget.remainingPercent}% left)`;
      }
    } else if (slo.errorBudget.status === "WARNING") {
      warningFactors++;
      observedSignals.push(`SLO "${slo.name}" error budget warning (${slo.errorBudget.remainingPercent}% remaining)`);
      if (!primaryDegradationFactor) {
        primaryDegradationFactor = `Low error budget for ${slo.name} (${slo.errorBudget.remainingPercent}% left)`;
      }
    }

    if (slo.burnRate.status === "CRITICAL") {
      criticalFactors++;
      observedSignals.push(`SLO "${slo.name}" elevated burn rate: ${slo.burnRate.value.toFixed(1)}x`);
      if (!primaryDegradationFactor) {
        primaryDegradationFactor = `High burn rate on ${slo.name} (${slo.burnRate.value.toFixed(1)}x)`;
      }
    } else if (slo.burnRate.status === "WARNING") {
      warningFactors++;
      observedSignals.push(`SLO "${slo.name}" elevated burn rate: ${slo.burnRate.value.toFixed(1)}x`);
    }
  }

  // 3. Evaluate Dependency Health Impacts
  const criticalDeps = dependencyStatuses.filter((d) => d.status === "CRITICAL");
  const warningDeps = dependencyStatuses.filter((d) => d.status === "WARNING");
  if (criticalDeps.length > 0) {
    observedSignals.push(`Impacted by ${criticalDeps.length} critical dependency: ${criticalDeps.map((d) => d.name).join(", ")}`);
    if (!primaryDegradationFactor && criticalFactors === 0) {
      primaryDegradationFactor = `Degraded upstream dependency (${criticalDeps[0].name})`;
    }
  }

  // Determine overall status
  let status: ServiceStatus = "HEALTHY";
  if (criticalFactors > 0 || criticalDeps.length > 0) {
    status = "CRITICAL";
  } else if (warningFactors > 0 || warningDeps.length > 0) {
    status = "WARNING";
  }

  // Calculate composite score (0 to 100)
  let score = 100;
  score -= criticalFactors * 25;
  score -= warningFactors * 10;
  score -= criticalDeps.length * 20;
  score -= warningDeps.length * 5;
  score = Math.max(0, Math.min(100, score));

  return {
    status,
    score,
    primaryDegradationFactor,
    observedSignals,
    affectedDependencies: dependencyStatuses.filter((d) => d.status !== "HEALTHY"),
  };
}
