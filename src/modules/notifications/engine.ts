/**
 * Notification Engine
 *
 * Deterministic, local-first rule matching, fingerprint deduplication,
 * cooldown suppression, multi-channel dispatching, and delivery recording.
 */

import type {
  EngineDispatchResult,
  Notification,
  NotificationDelivery,
  NotificationDeliveryAttempt,
  NotificationEvent,
  NotificationRule,
  NotificationStatus,
} from "./types";
import type { NotificationRepository } from "./repository";
import { getAdapterRegistry } from "./adapters";

export class NotificationEngine {
  constructor(private repo: NotificationRepository) {}

  /**
   * Process and dispatch a notification event.
   */
  public async dispatch(event: NotificationEvent): Promise<EngineDispatchResult> {
    const now = event.timestamp || new Date().toISOString();
    const fingerprint = this.generateFingerprint(event);

    // 1. Resolve matching rules sorted by priority (1 = highest)
    const activeRules = await this.repo.listRules(event.workspaceId, event.environmentId);
    const matchingRules = activeRules.filter(
      (rule) =>
        rule.isEnabled &&
        rule.eventTypes.includes(event.eventType) &&
        rule.severities.includes(event.severity) &&
        (rule.serviceIds.includes("*") || (event.serviceId && rule.serviceIds.includes(event.serviceId)))
    );

    const id = `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    // If no rules matched, record as SUPPRESSED
    if (matchingRules.length === 0) {
      const suppressedNotification: Notification = {
        id,
        workspaceId: event.workspaceId,
        environmentId: event.environmentId,
        source: event.source,
        sourceId: event.sourceId,
        serviceId: event.serviceId,
        serviceName: event.serviceName,
        severity: event.severity,
        eventType: event.eventType,
        title: event.title,
        message: event.message,
        status: "SUPPRESSED",
        fingerprint,
        relatedAlertId: event.relatedAlertId,
        relatedIncidentId: event.relatedIncidentId,
        deliveries: [],
        suppressionReason: `No active notification rules match event '${event.eventType}' with severity '${event.severity}'.`,
        isSimulated: true,
        metadata: event.metadata,
        createdAt: now,
        updatedAt: now,
      };

      await this.repo.createNotification(event.workspaceId, event.environmentId, suppressedNotification);
      return {
        notification: suppressedNotification,
        isSuppressed: true,
        suppressionReason: suppressedNotification.suppressionReason,
        deliveries: [],
      };
    }

    // 2. Select primary matched rule
    const primaryRule = matchingRules[0];

    // 3. Evaluate Cooldown & Deduplication
    let isSuppressed = false;
    let suppressionReason: string | undefined;

    if (primaryRule.cooldownMinutes > 0 && primaryRule.lastTriggeredAt) {
      const lastTrigger = new Date(primaryRule.lastTriggeredAt).getTime();
      const current = new Date(now).getTime();
      const elapsedMinutes = (current - lastTrigger) / (60 * 1000);

      if (elapsedMinutes < primaryRule.cooldownMinutes) {
        const remaining = Math.max(1, Math.ceil(primaryRule.cooldownMinutes - elapsedMinutes));
        isSuppressed = true;
        suppressionReason = `Rule cooldown active: ${remaining} minute(s) remaining for '${primaryRule.name}'`;
      }
    }

    // Also verify recent identical notification deduplication
    if (!isSuppressed) {
      const existingRecent = await this.repo.listNotifications(event.workspaceId, event.environmentId, {
        source: event.source,
      });

      const recentMatch = existingRecent.find((n) => {
        if (n.fingerprint !== fingerprint || n.status === "SUPPRESSED") return false;
        const nTime = new Date(n.createdAt).getTime();
        const curTime = new Date(now).getTime();
        const diffMins = (curTime - nTime) / (60 * 1000);
        return diffMins < (primaryRule.cooldownMinutes || 5);
      });

      if (recentMatch) {
        isSuppressed = true;
        suppressionReason = `Deduplicated: identical notification event previously delivered within cooldown window (${recentMatch.id})`;
      }
    }

    // 4. Handle Suppression
    if (isSuppressed) {
      const suppressedNotification: Notification = {
        id,
        workspaceId: event.workspaceId,
        environmentId: event.environmentId,
        source: event.source,
        sourceId: event.sourceId,
        serviceId: event.serviceId,
        serviceName: event.serviceName,
        severity: event.severity,
        eventType: event.eventType,
        title: event.title,
        message: event.message,
        status: "SUPPRESSED",
        fingerprint,
        ruleId: primaryRule.id,
        ruleName: primaryRule.name,
        relatedAlertId: event.relatedAlertId,
        relatedIncidentId: event.relatedIncidentId,
        deliveries: [],
        suppressionReason,
        isSimulated: true,
        metadata: event.metadata,
        createdAt: now,
        updatedAt: now,
      };

      await this.repo.createNotification(event.workspaceId, event.environmentId, suppressedNotification);
      return {
        notification: suppressedNotification,
        matchedRule: primaryRule,
        isSuppressed: true,
        suppressionReason,
        deliveries: [],
      };
    }

    // 5. Update Rule lastTriggeredAt
    await this.repo.updateRule(event.workspaceId, event.environmentId, primaryRule.id, {
      lastTriggeredAt: now,
    });

    // 6. Collect unique destinations from matching rules
    const targetMap = new Map<string, { channelType: NotificationRule["destinations"][0]["channelType"]; destination: string }>();
    for (const rule of matchingRules) {
      for (const dest of rule.destinations) {
        if (dest.enabled !== false) {
          const key = `${dest.channelType}:${dest.destination}`;
          if (!targetMap.has(key)) {
            targetMap.set(key, { channelType: dest.channelType, destination: dest.destination });
          }
        }
      }
    }

    const destinations = Array.from(targetMap.values());

    // Initial base notification
    const baseNotification: Notification = {
      id,
      workspaceId: event.workspaceId,
      environmentId: event.environmentId,
      source: event.source,
      sourceId: event.sourceId,
      serviceId: event.serviceId,
      serviceName: event.serviceName,
      severity: event.severity,
      eventType: event.eventType,
      title: event.title,
      message: event.message,
      status: "QUEUED",
      fingerprint,
      ruleId: primaryRule.id,
      ruleName: primaryRule.name,
      relatedAlertId: event.relatedAlertId,
      relatedIncidentId: event.relatedIncidentId,
      deliveries: [],
      isSimulated: true,
      metadata: event.metadata,
      createdAt: now,
      updatedAt: now,
    };

    // 7. Dispatch Deliveries via Channel Adapters
    const deliveries: NotificationDelivery[] = [];
    const registry = getAdapterRegistry();

    for (let i = 0; i < destinations.length; i++) {
      const target = destinations[i];
      const deliveryId = `del-${id.replace("notif-", "")}-${i + 1}`;
      const adapter = registry.getAdapter(target.channelType);

      const result = await adapter.send({
        notification: baseNotification,
        destination: target.destination,
        attemptNumber: 1,
      });

      const attempt: NotificationDeliveryAttempt = {
        attemptNumber: 1,
        status: result.status,
        timestamp: result.timestamp,
        adapter: result.adapter,
        channelType: result.channelType,
        destination: result.destination,
        error: result.error,
        metadata: result.metadata,
      };

      const delivery: NotificationDelivery = {
        id: deliveryId,
        notificationId: id,
        channelType: target.channelType,
        destination: target.destination,
        status: result.status,
        attemptCount: 1,
        attempts: [attempt],
        failureReason: result.error,
        deliveredAt: result.status === "DELIVERED" ? result.timestamp : undefined,
        createdAt: now,
        updatedAt: result.timestamp,
      };

      deliveries.push(delivery);
    }

    // 8. Determine Overall Status
    const overallStatus = this.computeOverallStatus(deliveries);

    const finalNotification: Notification = {
      ...baseNotification,
      status: overallStatus,
      deliveries,
      updatedAt: new Date().toISOString(),
    };

    await this.repo.createNotification(event.workspaceId, event.environmentId, finalNotification);

    return {
      notification: finalNotification,
      matchedRule: primaryRule,
      isSuppressed: false,
      deliveries,
    };
  }

  /**
   * Retry failed deliveries on an existing notification.
   */
  public async retryDelivery(
    workspaceId: string,
    environmentId: string,
    notificationId: string,
    deliveryId?: string
  ): Promise<Notification> {
    const notif = await this.repo.getNotificationById(workspaceId, environmentId, notificationId);
    if (!notif) {
      throw new Error(`Notification '${notificationId}' not found.`);
    }

    const registry = getAdapterRegistry();
    const updatedDeliveries = [...notif.deliveries];

    for (let i = 0; i < updatedDeliveries.length; i++) {
      const del = updatedDeliveries[i];
      // If deliveryId is specified, only retry that one; otherwise retry all FAILED
      if ((!deliveryId || del.id === deliveryId) && del.status === "FAILED") {
        const nextAttemptNum = del.attemptCount + 1;
        const adapter = registry.getAdapter(del.channelType);

        // Clear failure force flags if user explicitly retried
        const retryNotif: Notification = {
          ...notif,
          metadata: {
            ...notif.metadata,
            forceFailWebhook: false,
            forceFailSlack: false,
            forceFailEmail: false,
            forceFailTeams: false,
            forceFailInApp: false,
          },
        };

        const result = await adapter.send({
          notification: retryNotif,
          destination: del.destination,
          attemptNumber: nextAttemptNum,
        });

        const attempt: NotificationDeliveryAttempt = {
          attemptNumber: nextAttemptNum,
          status: result.status,
          timestamp: result.timestamp,
          adapter: result.adapter,
          channelType: result.channelType,
          destination: result.destination,
          error: result.error,
          metadata: result.metadata,
        };

        updatedDeliveries[i] = {
          ...del,
          status: result.status,
          attemptCount: nextAttemptNum,
          attempts: [...del.attempts, attempt],
          failureReason: result.status === "DELIVERED" ? undefined : result.error,
          deliveredAt: result.status === "DELIVERED" ? result.timestamp : del.deliveredAt,
          updatedAt: result.timestamp,
        };
      }
    }

    const finalStatus = this.computeOverallStatus(updatedDeliveries);
    const updatedNotification: Notification = {
      ...notif,
      status: finalStatus,
      deliveries: updatedDeliveries,
      updatedAt: new Date().toISOString(),
    };

    return this.repo.updateNotification(workspaceId, environmentId, updatedNotification);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private generateFingerprint(event: NotificationEvent): string {
    return `${event.workspaceId}:${event.environmentId}:${event.source}:${event.sourceId}:${event.eventType}`;
  }

  private computeOverallStatus(deliveries: NotificationDelivery[]): NotificationStatus {
    if (deliveries.length === 0) return "DELIVERED";

    const allDelivered = deliveries.every((d) => d.status === "DELIVERED");
    if (allDelivered) return "DELIVERED";

    const allFailed = deliveries.every((d) => d.status === "FAILED");
    if (allFailed) return "FAILED";

    const hasDelivered = deliveries.some((d) => d.status === "DELIVERED");
    if (hasDelivered) return "PARTIALLY_FAILED";

    return "QUEUED";
  }
}
