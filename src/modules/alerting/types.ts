/**
 * Alerting Domain Types
 *
 * Core models for Alerts, AlertRules, Conditions, Evaluations, and Events.
 * Pure TypeScript types independent of external telemetry providers or storage engines.
 */

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export type AlertStatus = "NORMAL" | "FIRING" | "ACKNOWLEDGED" | "RESOLVED";

export type AlertEventType =
  | "TRIGGERED"
  | "ACKNOWLEDGED"
  | "RESOLVED"
  | "RE_TRIGGERED"
  | "SUPPRESSED";

export type AlertMetricType =
  | "LATENCY_P95"
  | "ERROR_RATE"
  | "TRAFFIC_RPS"
  | "SATURATION_CPU"
  | "SATURATION_MEMORY"
  | "SLO_COMPLIANCE"
  | "ERROR_BUDGET_REMAINING"
  | "BURN_RATE"
  | "SERVICE_HEALTH";

export type AlertOperator = "GT" | "GTE" | "LT" | "LTE" | "EQ" | "NEQ";

export interface AlertCondition {
  metricType: AlertMetricType;
  operator: AlertOperator;
  threshold: number | string; // e.g. 250, 2.0, 5.0, or "CRITICAL"
  windowMinutes: number;      // Evaluation window associated with current signal snapshot
  unit?: string;              // 'ms', '%', 'rps', 'x', 'status'
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  environmentId: string;
  serviceId: string;          // Target service ID or '*' for all services
  condition: AlertCondition;
  severity: AlertSeverity;
  isEnabled: boolean;
  cooldownMinutes: number;    // Duplicate trigger suppression window
  labels: Record<string, string>;
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
}

export interface ConditionSnapshot {
  metricType: AlertMetricType;
  operator: AlertOperator;
  threshold: number | string;
  observedValue: number | string;
  unit?: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  serviceId: string;
  serviceName: string;
  workspaceId: string;
  environmentId: string;
  severity: AlertSeverity;
  status: AlertStatus;
  conditionSnapshot: ConditionSnapshot;
  fingerprint: string;        // `${workspaceId}:${environmentId}:${serviceId}:${ruleId}`
  title: string;
  summary: string;
  triggeredAt: string;        // ISO 8601
  lastEvaluatedAt: string;    // ISO 8601
  acknowledgedAt?: string;    // ISO 8601
  acknowledgedBy?: string;    // User ID / Name
  resolvedAt?: string;        // ISO 8601
  resolvedBy?: string;        // 'SYSTEM_EVALUATION' or User ID
  resolutionNote?: string;
}

export interface AlertEvent {
  id: string;
  alertId: string;
  eventType: AlertEventType;
  previousStatus: AlertStatus;
  newStatus: AlertStatus;
  actor: string;              // 'system:evaluator' or User ID
  timestamp: string;          // ISO 8601
  note?: string;
}

export interface AlertEvaluation {
  ruleId: string;
  serviceId: string;
  conditionMet: boolean;
  observedValue: number | string;
  threshold: number | string;
  evaluatedAt: string;        // ISO 8601
  statusTransition: "NONE" | "TRIGGERED" | "RESOLVED" | "RE_TRIGGERED" | "UNCHANGED" | "SUPPRESSED";
  message: string;
}

export interface AlertFilter {
  status?: AlertStatus;
  severity?: AlertSeverity;
  serviceId?: string;
  search?: string;
}
