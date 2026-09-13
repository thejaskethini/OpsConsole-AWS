/**
 * Notification Domain Types
 *
 * Strongly-typed domain models for Notifications, Rules, Channels, Routing,
 * Deliveries, Preferences, and Events.
 * Local-first, deterministic, platform-level types.
 */

// ─── Enums / Literals ─────────────────────────────────────────────────────────

export type NotificationSeverity = "SEV1" | "SEV2" | "SEV3" | "SEV4" | "INFO";

export type NotificationStatus =
  | "CREATED"
  | "QUEUED"
  | "DELIVERED"
  | "PARTIALLY_FAILED"
  | "FAILED"
  | "SUPPRESSED";

export type NotificationChannelType =
  | "IN_APP"
  | "WEBHOOK"
  | "EMAIL"
  | "SLACK"
  | "TEAMS";

export type NotificationDeliveryStatus =
  | "PENDING"
  | "DELIVERED"
  | "FAILED"
  | "SUPPRESSED";

export type NotificationEventType =
  | "ALERT_FIRING"
  | "ALERT_ACKNOWLEDGED"
  | "ALERT_RESOLVED"
  | "INCIDENT_CREATED"
  | "INCIDENT_ACKNOWLEDGED"
  | "INCIDENT_MITIGATED"
  | "INCIDENT_RESOLVED"
  | "TEST_NOTIFICATION";

export type NotificationSource = "ALERT" | "INCIDENT" | "SYSTEM" | "TEST";

// ─── Delivery & Attempt Models ────────────────────────────────────────────────

export interface NotificationDeliveryAttempt {
  attemptNumber: number;
  status: NotificationDeliveryStatus;
  timestamp: string; // ISO 8601
  adapter: string;
  channelType: NotificationChannelType;
  destination: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channelType: NotificationChannelType;
  destination: string;
  status: NotificationDeliveryStatus;
  attemptCount: number;
  attempts: NotificationDeliveryAttempt[];
  failureReason?: string;
  suppressionReason?: string;
  deliveredAt?: string; // ISO 8601
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ─── Notification Model ───────────────────────────────────────────────────────

export interface Notification {
  id: string;
  workspaceId: string;
  environmentId: string;
  source: NotificationSource;
  sourceId: string;
  serviceId?: string;
  serviceName?: string;
  severity: NotificationSeverity;
  eventType: NotificationEventType;
  title: string;
  message: string;
  status: NotificationStatus;
  fingerprint: string;
  ruleId?: string;
  ruleName?: string;
  relatedAlertId?: string;
  relatedIncidentId?: string;
  deliveries: NotificationDelivery[];
  suppressionReason?: string;
  isSimulated: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ─── Routing & Rules ──────────────────────────────────────────────────────────

export interface NotificationRouteTarget {
  channelType: NotificationChannelType;
  destination: string;
  targetName?: string;
  enabled?: boolean;
}

export interface NotificationRule {
  id: string;
  workspaceId: string;
  environmentId: string;
  name: string;
  description: string;
  isEnabled: boolean;
  priority: number; // 1 = highest priority
  eventTypes: NotificationEventType[];
  severities: NotificationSeverity[];
  serviceIds: string[]; // ["*"] or specific service IDs
  destinations: NotificationRouteTarget[];
  cooldownMinutes: number;
  lastTriggeredAt?: string; // ISO 8601
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ─── Channel Model ───────────────────────────────────────────────────────────

export interface NotificationChannel {
  id: string;
  workspaceId: string;
  environmentId: string;
  type: NotificationChannelType;
  name: string;
  description: string;
  destination: string;
  isEnabled: boolean;
  isSimulated: boolean;
  config?: Record<string, string>;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ─── Preference Model ────────────────────────────────────────────────────────

export interface NotificationPreference {
  id: string;
  workspaceId: string;
  userId: string;
  isEnabled: boolean;
  channelPreferences: Record<NotificationChannelType, boolean>;
  severityPreferences: Record<NotificationSeverity, boolean>;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ─── Event Ingestion Payload ──────────────────────────────────────────────────

export interface NotificationEvent {
  workspaceId: string;
  environmentId: string;
  eventType: NotificationEventType;
  source: NotificationSource;
  sourceId: string;
  serviceId?: string;
  serviceName?: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  relatedAlertId?: string;
  relatedIncidentId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string; // ISO 8601
}

// ─── Filters & Statistics ─────────────────────────────────────────────────────

export interface NotificationFilter {
  status?: NotificationStatus | NotificationStatus[];
  severity?: NotificationSeverity | NotificationSeverity[];
  source?: NotificationSource;
  serviceId?: string;
  channelType?: NotificationChannelType;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationStats {
  total: number;
  delivered: number;
  failed: number;
  partiallyFailed: number;
  suppressed: number;
  pending: number;
  sev1Count: number;
  sev2Count: number;
  sev3Count: number;
  sev4Count: number;
  infoCount: number;
}

// ─── Engine Execution Output ──────────────────────────────────────────────────

export interface EngineDispatchResult {
  notification: Notification;
  matchedRule?: NotificationRule;
  isSuppressed: boolean;
  suppressionReason?: string;
  deliveries: NotificationDelivery[];
}
