/**
 * Centralized Alert Evaluation Engine
 *
 * Pure, deterministic evaluation logic for alert conditions, operators,
 * lifecycle state transitions, deduplication, and event generation.
 * Reuses Phase 3 SRE domain calculations without duplication.
 */

import type {
  Alert,
  AlertEvaluation,
  AlertEvent,
  AlertMetricType,
  AlertOperator,
  AlertRule,
  ConditionSnapshot,
} from "./types";
import type { Service, ServiceWithReliability } from "../sre/types";
import { calculateTimeBasedBudget, calculateEventBasedBudget } from "../sre/error-budget";

/**
 * Evaluates an operator comparison between observed and threshold values.
 */
export function evaluateOperator(
  observed: number | string,
  operator: AlertOperator,
  threshold: number | string
): boolean {
  if (typeof observed === "number" && typeof threshold === "number") {
    switch (operator) {
      case "GT":
        return observed > threshold;
      case "GTE":
        return observed >= threshold;
      case "LT":
        return observed < threshold;
      case "LTE":
        return observed <= threshold;
      case "EQ":
        return observed === threshold;
      case "NEQ":
        return observed !== threshold;
      default:
        return false;
    }
  }

  // String / Status comparisons (case-insensitive)
  const obsStr = String(observed).trim().toUpperCase();
  const thrStr = String(threshold).trim().toUpperCase();

  switch (operator) {
    case "EQ":
      return obsStr === thrStr;
    case "NEQ":
      return obsStr !== thrStr;
    case "GT":
      return obsStr > thrStr;
    case "GTE":
      return obsStr >= thrStr;
    case "LT":
      return obsStr < thrStr;
    case "LTE":
      return obsStr <= thrStr;
    default:
      return false;
  }
}

/**
 * Extracts the current observed value and unit for a given metric type from a service / reliability model.
 */
export function extractObservedMetric(
  target: ServiceWithReliability | any,
  metricType: AlertMetricType
): { value: number | string; unit: string } {
  if (!target) return { value: 0, unit: "" };

  const goldenSignals = target.goldenSignals;
  const slos = target.slos || [];
  const health = target.health;

  switch (metricType) {
    case "LATENCY_P95": {
      const val =
        goldenSignals?.latency?.p95Ms ?? goldenSignals?.latencyP95 ?? 0;
      return { value: val, unit: "ms" };
    }
    case "ERROR_RATE": {
      const val =
        goldenSignals?.errorRatePercent ?? goldenSignals?.errorRate ?? 0;
      return { value: val, unit: "%" };
    }
    case "TRAFFIC_RPS": {
      const val =
        goldenSignals?.trafficRps ??
        (goldenSignals?.trafficReqPerMin
          ? Math.round(goldenSignals.trafficReqPerMin / 60)
          : 0);
      return { value: val, unit: "rps" };
    }
    case "SATURATION_CPU": {
      const val =
        goldenSignals?.saturation?.cpuPercent ??
        goldenSignals?.saturation?.cpu ??
        0;
      return { value: val, unit: "%" };
    }
    case "SATURATION_MEMORY": {
      const val =
        goldenSignals?.saturation?.memoryPercent ??
        goldenSignals?.saturation?.memory ??
        0;
      return { value: val, unit: "%" };
    }
    case "SLO_COMPLIANCE": {
      if (!slos || slos.length === 0) {
        return { value: 100, unit: "%" };
      }
      const minComp = Math.min(
        ...slos.map((s: any) => s.compliancePercent ?? s.actualValue ?? 100)
      );
      return { value: Number(minComp.toFixed(2)), unit: "%" };
    }
    case "ERROR_BUDGET_REMAINING": {
      if (!slos || slos.length === 0) {
        return { value: 100, unit: "%" };
      }
      const minBudget = Math.min(
        ...slos.map((s: any) => {
          if (s.errorBudget?.remainingPercent !== undefined) {
            return s.errorBudget.remainingPercent;
          }
          if (s.type === "AVAILABILITY") {
            return calculateTimeBasedBudget(s.targetValue, s.actualValue, s.windowDays || 30).remainingPercent;
          }
          return calculateEventBasedBudget(s.targetValue, s.actualValue).remainingPercent;
        })
      );
      return { value: Number(minBudget.toFixed(2)), unit: "%" };
    }
    case "BURN_RATE": {
      if (!slos || slos.length === 0) {
        return { value: 1.0, unit: "x" };
      }
      const maxBurn = Math.max(
        ...slos.map((s: any) => {
          if (s.burnRate?.value !== undefined) {
            return s.burnRate.value;
          }
          if (s.burnRate !== undefined && typeof s.burnRate === "number") {
            return s.burnRate;
          }
          return 1.0;
        })
      );
      return { value: Number(maxBurn.toFixed(2)), unit: "x" };
    }
    case "SERVICE_HEALTH": {
      const status =
        health?.status ?? target.service?.status ?? target.status ?? "HEALTHY";
      return { value: status, unit: "status" };
    }
    default:
      return { value: 0, unit: "" };
  }
}

/**
 * Constructs a deterministic fingerprint for an alert instance.
 */
export function buildAlertFingerprint(
  workspaceId: string,
  environmentId: string,
  serviceId: string,
  ruleId: string
): string {
  return `${workspaceId}:${environmentId}:${serviceId}:${ruleId}`;
}

/**
 * Format a human-readable condition string.
 */
export function formatConditionString(
  metricType: AlertMetricType,
  operator: AlertOperator,
  threshold: number | string,
  unit?: string
): string {
  const opMap: Record<AlertOperator, string> = {
    GT: ">",
    GTE: ">=",
    LT: "<",
    LTE: "<=",
    EQ: "==",
    NEQ: "!=",
  };
  const u = unit ? ` ${unit}` : "";
  return `${metricType} ${opMap[operator]} ${threshold}${u}`;
}

/**
 * Evaluates an alert rule against a target service and updates/generates alert instances and events.
 */
export function evaluateRuleOnService(
  rule: AlertRule,
  serviceOrRel: Service | ServiceWithReliability | any,
  existingAlert?: Alert,
  now: string = new Date().toISOString()
): {
  evaluation: AlertEvaluation;
  nextAlert?: Alert;
  event?: AlertEvent;
} {
  const serviceObj = serviceOrRel?.service || serviceOrRel;
  const serviceId = serviceObj?.id || rule.serviceId;
  const serviceName = serviceObj?.name || serviceId;

  const { value: observedValue, unit } = extractObservedMetric(
    serviceOrRel,
    rule.condition.metricType
  );

  const conditionMet = evaluateOperator(
    observedValue,
    rule.condition.operator,
    rule.condition.threshold
  );

  const fingerprint = buildAlertFingerprint(
    rule.workspaceId,
    rule.environmentId,
    serviceId,
    rule.id
  );

  const snapshot: ConditionSnapshot = {
    metricType: rule.condition.metricType,
    operator: rule.condition.operator,
    threshold: rule.condition.threshold,
    observedValue,
    unit: unit || rule.condition.unit,
  };

  const title = `${rule.name} — ${serviceName}`;
  const summary = `Observed ${snapshot.metricType} of ${observedValue}${snapshot.unit || ""} (Threshold: ${rule.condition.operator} ${rule.condition.threshold}${snapshot.unit || ""})`;

  // Case 1: Rule is disabled
  if (!rule.isEnabled) {
    return {
      evaluation: {
        ruleId: rule.id,
        serviceId,
        conditionMet: false,
        observedValue,
        threshold: rule.condition.threshold,
        evaluatedAt: now,
        statusTransition: "UNCHANGED",
        message: `Rule is disabled.`,
      },
      nextAlert: existingAlert,
    };
  }

  // Case 2: Condition is MET
  if (conditionMet) {
    if (!existingAlert || existingAlert.status === "NORMAL") {
      // Transition: NORMAL -> FIRING
      const alertId = existingAlert?.id || `alt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const nextAlert: Alert = {
        id: alertId,
        ruleId: rule.id,
        ruleName: rule.name,
        serviceId,
        serviceName,
        workspaceId: rule.workspaceId,
        environmentId: rule.environmentId,
        severity: rule.severity,
        status: "FIRING",
        conditionSnapshot: snapshot,
        fingerprint,
        title,
        summary,
        triggeredAt: now,
        lastEvaluatedAt: now,
      };

      const event: AlertEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        alertId: nextAlert.id,
        eventType: "TRIGGERED",
        previousStatus: existingAlert?.status || "NORMAL",
        newStatus: "FIRING",
        actor: "system:evaluator",
        timestamp: now,
        note: `Condition breach: ${summary}`,
      };

      return {
        evaluation: {
          ruleId: rule.id,
          serviceId,
          conditionMet: true,
          observedValue,
          threshold: rule.condition.threshold,
          evaluatedAt: now,
          statusTransition: "TRIGGERED",
          message: `Alert triggered: ${summary}`,
        },
        nextAlert,
        event,
      };
    }

    if (existingAlert.status === "RESOLVED") {
      // Re-trigger! Transition: RESOLVED -> FIRING
      const nextAlert: Alert = {
        ...existingAlert,
        status: "FIRING",
        conditionSnapshot: snapshot,
        summary,
        triggeredAt: now,
        lastEvaluatedAt: now,
        resolvedAt: undefined,
        resolvedBy: undefined,
        resolutionNote: undefined,
        acknowledgedAt: undefined,
        acknowledgedBy: undefined,
      };

      const event: AlertEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        alertId: nextAlert.id,
        eventType: "RE_TRIGGERED",
        previousStatus: "RESOLVED",
        newStatus: "FIRING",
        actor: "system:evaluator",
        timestamp: now,
        note: `Alert re-triggered after prior resolution: ${summary}`,
      };

      return {
        evaluation: {
          ruleId: rule.id,
          serviceId,
          conditionMet: true,
          observedValue,
          threshold: rule.condition.threshold,
          evaluatedAt: now,
          statusTransition: "RE_TRIGGERED",
          message: `Alert re-triggered: ${summary}`,
        },
        nextAlert,
        event,
      };
    }

    // Existing alert is already FIRING or ACKNOWLEDGED — Deduplication
    const nextAlert: Alert = {
      ...existingAlert,
      conditionSnapshot: snapshot,
      summary,
      lastEvaluatedAt: now,
    };

    return {
      evaluation: {
        ruleId: rule.id,
        serviceId,
        conditionMet: true,
        observedValue,
        threshold: rule.condition.threshold,
        evaluatedAt: now,
        statusTransition: "UNCHANGED",
        message: `Alert remains ${existingAlert.status} (deduplicated).`,
      },
      nextAlert,
    };
  }

  // Case 3: Condition is NOT MET (Nominal)
  if (existingAlert && (existingAlert.status === "FIRING" || existingAlert.status === "ACKNOWLEDGED")) {
    // Auto-recovery! Transition: FIRING / ACKNOWLEDGED -> RESOLVED
    const nextAlert: Alert = {
      ...existingAlert,
      status: "RESOLVED",
      conditionSnapshot: snapshot,
      lastEvaluatedAt: now,
      resolvedAt: now,
      resolvedBy: "system:evaluator",
      resolutionNote: `Condition auto-recovered (Observed: ${observedValue}${snapshot.unit || ""})`,
    };

    const event: AlertEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      alertId: nextAlert.id,
      eventType: "RESOLVED",
      previousStatus: existingAlert.status,
      newStatus: "RESOLVED",
      actor: "system:evaluator",
      timestamp: now,
      note: `Telemetry condition cleared.`,
    };

    return {
      evaluation: {
        ruleId: rule.id,
        serviceId,
        conditionMet: false,
        observedValue,
        threshold: rule.condition.threshold,
        evaluatedAt: now,
        statusTransition: "RESOLVED",
        message: `Alert resolved: condition cleared.`,
      },
      nextAlert,
      event,
    };
  }

  // Nominal and was already NORMAL or RESOLVED
  const nextAlert: Alert | undefined = existingAlert
    ? { ...existingAlert, lastEvaluatedAt: now }
    : undefined;

  return {
    evaluation: {
      ruleId: rule.id,
      serviceId,
      conditionMet: false,
      observedValue,
      threshold: rule.condition.threshold,
      evaluatedAt: now,
      statusTransition: "UNCHANGED",
      message: `Condition within nominal limits.`,
    },
    nextAlert,
  };
}

/**
 * Manually acknowledges an active alert.
 */
export function applyAlertAcknowledgement(
  alert: Alert,
  userId: string,
  userName: string,
  now: string = new Date().toISOString()
): { updatedAlert: Alert; event: AlertEvent } {
  if (alert.status !== "FIRING") {
    throw new Error(`Cannot acknowledge alert in '${alert.status}' status.`);
  }

  const updatedAlert: Alert = {
    ...alert,
    status: "ACKNOWLEDGED",
    acknowledgedAt: now,
    acknowledgedBy: userName || userId,
  };

  const event: AlertEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    alertId: alert.id,
    eventType: "ACKNOWLEDGED",
    previousStatus: "FIRING",
    newStatus: "ACKNOWLEDGED",
    actor: userId,
    timestamp: now,
    note: `Acknowledged by ${userName || userId}`,
  };

  return { updatedAlert, event };
}

/**
 * Manually resolves an active or acknowledged alert.
 */
export function applyAlertResolution(
  alert: Alert,
  userId: string,
  userName: string,
  note?: string,
  now: string = new Date().toISOString()
): { updatedAlert: Alert; event: AlertEvent } {
  if (alert.status === "RESOLVED") {
    throw new Error(`Alert is already resolved.`);
  }

  const updatedAlert: Alert = {
    ...alert,
    status: "RESOLVED",
    resolvedAt: now,
    resolvedBy: userName || userId,
    resolutionNote: note || "Manually marked as resolved by operator.",
  };

  const event: AlertEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    alertId: alert.id,
    eventType: "RESOLVED",
    previousStatus: alert.status,
    newStatus: "RESOLVED",
    actor: userId,
    timestamp: now,
    note: note || `Resolved by ${userName || userId}`,
  };

  return { updatedAlert, event };
}
