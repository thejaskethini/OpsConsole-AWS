/**
 * Burn Rate Domain Calculation & Centralized Thresholds
 *
 * Burn rate represents how fast the error budget is being consumed relative
 * to the sustainable rate over the SLO evaluation window.
 *
 * Sustainable consumption rate = 1.0x (100% budget consumed across full window).
 *
 * Thresholds:
 *   <= 1.0x          -> HEALTHY  (budget will last through window)
 *   > 1.0x and <= 5x -> WARNING  (elevated consumption rate)
 *   > 5.0x           -> CRITICAL (rapid budget depletion)
 */

import type { BurnRate, BurnRateStatus } from "./types";

export const BURN_RATE_THRESHOLDS = {
  HEALTHY_MAX: 1.0,
  WARNING_MAX: 5.0,
} as const;

/**
 * Evaluates the status of a given burn rate value.
 */
export function evaluateBurnRateStatus(rate: number): BurnRateStatus {
  if (rate <= BURN_RATE_THRESHOLDS.HEALTHY_MAX) {
    return "HEALTHY";
  }
  if (rate <= BURN_RATE_THRESHOLDS.WARNING_MAX) {
    return "WARNING";
  }
  return "CRITICAL";
}

/**
 * Calculates time to exhaustion in hours given remaining budget percent
 * and current burn rate over an evaluation window.
 */
export function calculateTimeToExhaustionHours(
  remainingPercent: number,
  burnRate: number,
  windowDays: number = 30
): number | undefined {
  if (burnRate <= 0) return undefined;
  if (remainingPercent <= 0) return 0;
  
  // Total hours in the window
  const totalWindowHours = windowDays * 24;
  // Effective hours remaining = (remaining fraction / burnRate) * totalWindowHours
  const hoursRemaining = (remainingPercent / 100 / burnRate) * totalWindowHours;
  return Math.max(0, Math.round(hoursRemaining * 10) / 10);
}

/**
 * Factory helper to construct a strongly-typed BurnRate object.
 */
export function createBurnRate(
  value: number,
  evaluationWindow: BurnRate["evaluationWindow"] = "1h",
  remainingPercent?: number,
  windowDays: number = 30
): BurnRate {
  const status = evaluateBurnRateStatus(value);
  const timeToExhaustionHours =
    remainingPercent !== undefined
      ? calculateTimeToExhaustionHours(remainingPercent, value, windowDays)
      : undefined;

  return {
    value: Math.round(value * 100) / 100,
    status,
    evaluationWindow,
    timeToExhaustionHours,
  };
}
