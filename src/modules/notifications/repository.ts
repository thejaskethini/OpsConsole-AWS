/**
 * Notification Repository Interface & Local Implementation
 *
 * Enforces strict workspaceId and environmentId isolation for all notification
 * queries, rules, channels, deliveries, and preferences.
 */

import type {
  Notification,
  NotificationChannel,
  NotificationFilter,
  NotificationPreference,
  NotificationRule,
  NotificationStats,
} from "./types";
import { LocalNotificationStore } from "./local-store";

export interface NotificationRepository {
  // Notifications
  listNotifications(
    workspaceId: string,
    environmentId: string,
    filter?: NotificationFilter
  ): Promise<Notification[]>;

  getNotificationById(
    workspaceId: string,
    environmentId: string,
    id: string
  ): Promise<Notification | null>;

  createNotification(
    workspaceId: string,
    environmentId: string,
    notification: Notification
  ): Promise<Notification>;

  updateNotification(
    workspaceId: string,
    environmentId: string,
    notification: Notification
  ): Promise<Notification>;

  // Rules
  listRules(
    workspaceId: string,
    environmentId: string
  ): Promise<NotificationRule[]>;

  getRuleById(
    workspaceId: string,
    environmentId: string,
    id: string
  ): Promise<NotificationRule | null>;

  createRule(
    workspaceId: string,
    environmentId: string,
    rule: Omit<NotificationRule, "id" | "workspaceId" | "environmentId" | "createdAt" | "updatedAt">
  ): Promise<NotificationRule>;

  updateRule(
    workspaceId: string,
    environmentId: string,
    id: string,
    updates: Partial<NotificationRule>
  ): Promise<NotificationRule>;

  deleteRule(
    workspaceId: string,
    environmentId: string,
    id: string
  ): Promise<boolean>;

  // Channels
  listChannels(
    workspaceId: string,
    environmentId: string
  ): Promise<NotificationChannel[]>;

  // Preferences
  getPreferences(
    workspaceId: string,
    userId: string
  ): Promise<NotificationPreference | null>;

  updatePreferences(
    workspaceId: string,
    userId: string,
    updates: Partial<NotificationPreference>
  ): Promise<NotificationPreference>;

  // Stats
  getStats(
    workspaceId: string,
    environmentId: string
  ): Promise<NotificationStats>;

  reset(): void;
}

export class LocalNotificationRepository implements NotificationRepository {
  private store: LocalNotificationStore;

  constructor(store?: LocalNotificationStore) {
    this.store = store ?? new LocalNotificationStore();
  }

  public reset(): void {
    this.store.reset();
  }

  // ─── Notifications Queries & Mutations ──────────────────────────────────────

  public async listNotifications(
    workspaceId: string,
    environmentId: string,
    filter?: NotificationFilter
  ): Promise<Notification[]> {
    let list = this.store.notifications.filter(
      (n) => n.workspaceId === workspaceId && n.environmentId === environmentId
    );

    if (filter) {
      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        list = list.filter((n) => statuses.includes(n.status));
      }
      if (filter.severity) {
        const severities = Array.isArray(filter.severity) ? filter.severity : [filter.severity];
        list = list.filter((n) => severities.includes(n.severity));
      }
      if (filter.source) {
        list = list.filter((n) => n.source === filter.source);
      }
      if (filter.serviceId) {
        list = list.filter((n) => n.serviceId === filter.serviceId);
      }
      if (filter.channelType) {
        list = list.filter((n) =>
          n.deliveries.some((d) => d.channelType === filter.channelType)
        );
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        list = list.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.message.toLowerCase().includes(q) ||
            (n.serviceName && n.serviceName.toLowerCase().includes(q)) ||
            (n.ruleName && n.ruleName.toLowerCase().includes(q)) ||
            (n.relatedAlertId && n.relatedAlertId.toLowerCase().includes(q)) ||
            (n.relatedIncidentId && n.relatedIncidentId.toLowerCase().includes(q))
        );
      }
    }

    // Sort by createdAt descending
    const sorted = [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? sorted.length;
    return sorted.slice(offset, offset + limit);
  }

  public async getNotificationById(
    workspaceId: string,
    environmentId: string,
    id: string
  ): Promise<Notification | null> {
    const found = this.store.notifications.find(
      (n) => n.id === id && n.workspaceId === workspaceId && n.environmentId === environmentId
    );
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async createNotification(
    workspaceId: string,
    environmentId: string,
    notification: Notification
  ): Promise<Notification> {
    const scoped: Notification = {
      ...notification,
      workspaceId,
      environmentId,
    };
    this.store.notifications.unshift(scoped);
    return JSON.parse(JSON.stringify(scoped));
  }

  public async updateNotification(
    workspaceId: string,
    environmentId: string,
    notification: Notification
  ): Promise<Notification> {
    const index = this.store.notifications.findIndex(
      (n) =>
        n.id === notification.id &&
        n.workspaceId === workspaceId &&
        n.environmentId === environmentId
    );
    if (index === -1) {
      throw new Error(
        `Notification '${notification.id}' not found in workspace '${workspaceId}' and environment '${environmentId}'.`
      );
    }
    const updated: Notification = {
      ...this.store.notifications[index],
      ...notification,
      workspaceId,
      environmentId,
      updatedAt: new Date().toISOString(),
    };
    this.store.notifications[index] = updated;
    return JSON.parse(JSON.stringify(updated));
  }

  // ─── Rules Management ───────────────────────────────────────────────────────

  public async listRules(
    workspaceId: string,
    environmentId: string
  ): Promise<NotificationRule[]> {
    return this.store.rules
      .filter((r) => r.workspaceId === workspaceId && r.environmentId === environmentId)
      .sort((a, b) => a.priority - b.priority || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r) => JSON.parse(JSON.stringify(r)));
  }

  public async getRuleById(
    workspaceId: string,
    environmentId: string,
    id: string
  ): Promise<NotificationRule | null> {
    const found = this.store.rules.find(
      (r) => r.id === id && r.workspaceId === workspaceId && r.environmentId === environmentId
    );
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  public async createRule(
    workspaceId: string,
    environmentId: string,
    ruleData: Omit<NotificationRule, "id" | "workspaceId" | "environmentId" | "createdAt" | "updatedAt">
  ): Promise<NotificationRule> {
    if (!ruleData.name || ruleData.name.trim().length === 0) {
      throw new Error("Rule name is required.");
    }
    if (!ruleData.eventTypes || ruleData.eventTypes.length === 0) {
      throw new Error("At least one event type is required.");
    }
    if (!ruleData.severities || ruleData.severities.length === 0) {
      throw new Error("At least one severity is required.");
    }
    if (!ruleData.destinations || ruleData.destinations.length === 0) {
      throw new Error("At least one destination route is required.");
    }

    const now = new Date().toISOString();
    const newRule: NotificationRule = {
      ...ruleData,
      id: `rule-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      workspaceId,
      environmentId,
      createdAt: now,
      updatedAt: now,
    };

    this.store.rules.unshift(newRule);
    return JSON.parse(JSON.stringify(newRule));
  }

  public async updateRule(
    workspaceId: string,
    environmentId: string,
    id: string,
    updates: Partial<NotificationRule>
  ): Promise<NotificationRule> {
    const index = this.store.rules.findIndex(
      (r) => r.id === id && r.workspaceId === workspaceId && r.environmentId === environmentId
    );
    if (index === -1) {
      throw new Error(`Rule '${id}' not found in workspace '${workspaceId}'.`);
    }

    const current = this.store.rules[index];
    const updated: NotificationRule = {
      ...current,
      ...updates,
      id: current.id,
      workspaceId,
      environmentId,
      updatedAt: new Date().toISOString(),
    };

    this.store.rules[index] = updated;
    return JSON.parse(JSON.stringify(updated));
  }

  public async deleteRule(
    workspaceId: string,
    environmentId: string,
    id: string
  ): Promise<boolean> {
    const index = this.store.rules.findIndex(
      (r) => r.id === id && r.workspaceId === workspaceId && r.environmentId === environmentId
    );
    if (index === -1) {
      return false;
    }
    this.store.rules.splice(index, 1);
    return true;
  }

  // ─── Channels ───────────────────────────────────────────────────────────────

  public async listChannels(
    workspaceId: string,
    environmentId: string
  ): Promise<NotificationChannel[]> {
    return this.store.channels
      .filter((c) => c.workspaceId === workspaceId && c.environmentId === environmentId)
      .map((c) => JSON.parse(JSON.stringify(c)));
  }

  // ─── Preferences ───────────────────────────────────────────────────────────

  public async getPreferences(
    workspaceId: string,
    userId: string
  ): Promise<NotificationPreference | null> {
    const found = this.store.preferences.find(
      (p) => p.workspaceId === workspaceId && p.userId === userId
    );
    if (found) {
      return JSON.parse(JSON.stringify(found));
    }

    // Return default preferences if not yet configured
    const defaultPref: NotificationPreference = {
      id: `pref-${userId}-${Date.now()}`,
      workspaceId,
      userId,
      isEnabled: true,
      channelPreferences: {
        IN_APP: true,
        SLACK: true,
        WEBHOOK: true,
        EMAIL: true,
        TEAMS: true,
      },
      severityPreferences: {
        SEV1: true,
        SEV2: true,
        SEV3: true,
        SEV4: true,
        INFO: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.preferences.push(defaultPref);
    return JSON.parse(JSON.stringify(defaultPref));
  }

  public async updatePreferences(
    workspaceId: string,
    userId: string,
    updates: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    const pref = await this.getPreferences(workspaceId, userId);
    const index = this.store.preferences.findIndex(
      (p) => p.workspaceId === workspaceId && p.userId === userId
    );

    const now = new Date().toISOString();
    const updated: NotificationPreference = {
      ...pref!,
      ...updates,
      workspaceId,
      userId,
      updatedAt: now,
    };

    if (index !== -1) {
      this.store.preferences[index] = updated;
    } else {
      this.store.preferences.push(updated);
    }

    return JSON.parse(JSON.stringify(updated));
  }

  // ─── Statistics ─────────────────────────────────────────────────────────────

  public async getStats(
    workspaceId: string,
    environmentId: string
  ): Promise<NotificationStats> {
    const list = this.store.notifications.filter(
      (n) => n.workspaceId === workspaceId && n.environmentId === environmentId
    );

    const stats: NotificationStats = {
      total: list.length,
      delivered: list.filter((n) => n.status === "DELIVERED").length,
      failed: list.filter((n) => n.status === "FAILED").length,
      partiallyFailed: list.filter((n) => n.status === "PARTIALLY_FAILED").length,
      suppressed: list.filter((n) => n.status === "SUPPRESSED").length,
      pending: list.filter((n) => n.status === "QUEUED" || n.status === "CREATED").length,
      sev1Count: list.filter((n) => n.severity === "SEV1").length,
      sev2Count: list.filter((n) => n.severity === "SEV2").length,
      sev3Count: list.filter((n) => n.severity === "SEV3").length,
      sev4Count: list.filter((n) => n.severity === "SEV4").length,
      infoCount: list.filter((n) => n.severity === "INFO").length,
    };

    return stats;
  }
}
