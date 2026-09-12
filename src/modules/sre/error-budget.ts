/**
 * Error Budget Domain Calculation Engine
 *
 * An Error Budget represents the allowed unreliability over an SLO evaluation window.
 *
 * Supports multiple budget semantics:
 *   - "minutes": Time-based downtime allowed (appropriate for Availability SLOs).
 *   - "events": Count of slow/failed requests allowed (appropriate for Latency / Error Rate SLOs).
 *   - "percentage": Pure unreliability budget percentage.
 *
 * Budget Status Thresholds:
 *   >= 30% remaining -> HEALTHY
 *   >= 10% and < 30% -> WARNING
 *   > 0% and < 10%   -> CRITICAL
 *   <= 0%            -> EXHAUSTED
 */

import type { ErrorBudget, ErrorBudgetStatus, ErrorBudgetUnit, SLOWindowDays } from "./types";

export const ERROR_BUDGET_THRESHOLDS = {
  HEALTHY_MIN_PERCENT: 30,
  WARNING_MIN_PERCENT: 10,
  CRITICAL_MIN_PERCENT: 0,
} as const;

/**
 * Determines error budget status from remaining percentage.
 */
export function evaluateErrorBudgetStatus(remainingPercent: number): ErrorBudgetStatus {
  if (remainingPercent <= 0) {
    return "EXHAUSTED";
  }
  if (remainingPercent < ERROR_BUDGET_THRESHOLDS.WARNING_MIN_PERCENT) {
    return "CRITICAL";
  }
  if (remainingPercent < ERROR_BUDGET_THRESHOLDS.HEALTHY_MIN_PERCENT) {
    return "WARNING";
  }
  return "HEALTHY";
}

/**
 * Calculates a time-based error budget (in minutes) for availability SLOs.
 *
 * Total minutes allowed = Window in minutes * (1 - target / 100)
 * Example: 99.9% target over 30 days = 30 * 24 * 60 * 0.001 = 43.2 minutes.
 */
export function calculateTimeBasedBudget(
  targetPercent: number,
  actualAvailabilityPercent: number,
  windowDays: SLOWindowDays
): ErrorBudget {
  const totalWindowMinutes = windowDays * 24 * 60;
  const allowedUnavailabilityFraction = Math.max(0, 1 - targetPercent / 100);
  const totalAllowedMinutes = totalWindowMinutes * allowedUnavailabilityFraction;

  const actualUnavailabilityFraction = Math.max(0, 1 - actualAvailabilityPercent / 100);
  const consumedMinutes = totalWindowMinutes * actualUnavailabilityFraction;

  const remainingMinutes = Math.max(0, totalAllowedMinutes - consumedMinutes);
  const remainingPercent =
    totalAllowedMinutes > 0
      ? Math.max(0, Math.min(100, (remainingMinutes / totalAllowedMinutes) * 100))
      : 0;

  const status = evaluateErrorBudgetStatus(remainingPercent);

  return {
    unit: "minutes",
    totalAllowed: Math.round(totalAllowedMinutes * 10) / 10,
    consumed: Math.round(consumedMinutes * 10) / 10,
    remaining: Math.round(remainingMinutes * 10) / 10,
    remainingPercent: Math.round(remainingPercent * 10) / 10,
    status,
  };
}

/**
 * Calculates an event/request-based error budget for latency and error-rate SLOs.
 *
 * Total events allowed = Total Estimated Requests * (1 - target / 100)
 * Example: 99.0% target for 1,000,000 requests = 10,000 allowed slow/failed requests.
 */
export function calculateEventBasedBudget(
  targetPercent: number,
  compliancePercent: number,
  estimatedTotalRequests: number = 1_000_000
): ErrorBudget {
  const allowedFailureFraction = Math.max(0, 1 - targetPercent / 100);
  const totalAllowedEvents = Math.round(estimatedTotalRequests * allowedFailureFraction);

  const actualFailureFraction = Math.max(0, 1 - compliancePercent / 100);
  const consumedEvents = Math.round(estimatedTotalRequests * actualFailureFraction);

  const remainingEvents = Math.max(0, totalAllowedEvents - consumedEvents);
  const remainingPercent =
    totalAllowedEvents > 0
      ? Math.max(0, Math.min(100, (remainingEvents / totalAllowedEvents) * 100))
      : 0;

  const status = evaluateErrorBudgetStatus(remainingPercent);

  return {
    unit: "events",
    totalAllowed: totalAllowedEvents,
    consumed: consumedEvents,
    remaining: remainingEvents,
    remainingPercent: Math.round(remainingPercent * 10) / 10,
    status,
  };
}

/**
 * Calculates a generic percentage-based error budget from explicit values.
 */
export function createErrorBudget(
  unit: ErrorBudgetUnit,
  totalAllowed: number,
  consumed: number
): ErrorBudget {
  const remaining = Math.max(0, totalAllowed - consumed);
  const remainingPercent =
    totalAllowed > 0 ? Math.max(0, Math.min(100, (remaining / totalAllowed) * 100)) : 0;
  const status = evaluateErrorBudgetStatus(remainingPercent);

  return {
    unit,
    totalAllowed: Math.round(totalAllowed * 10) / 10,
    consumed: Math.round(consumed * 10) / 10,
    remaining: Math.round(remaining * 10) / 10,
    remainingPercent: Math.round(remainingPercent * 10) / 10,
    status,
  };
}
