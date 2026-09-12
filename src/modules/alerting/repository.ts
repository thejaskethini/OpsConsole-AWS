/**
 * Alerting Repository Abstraction & Local Implementation
 *
 * Provides thread-safe, in-memory management of Alerts, Rules, and Events.
 * Scoped strictly by workspaceId and environmentId.
 */

import type {
  Alert,
  AlertEvaluation,
  AlertEvent,
  AlertFilter,
  AlertRule,
} from "./types";
import {
  SEEDED_ALERTS,
  SEEDED_ALERT_EVENTS,
  SEEDED_ALERT_RULES,
} from "./local-store";
import {
  applyAlertAcknowledgement,
  applyAlertResolution,
  evaluateRuleOnService,
} from "./engine";
import { getSRERepository } from "../sre";

export interface AlertRepository {
  // Alerts
  getAlerts(workspaceId: string, environmentId: string, filter?: AlertFilter): Promise<Alert[]>;
  getAlertById(alertId: string, workspaceId: string): Promise<Alert | null>;
  getAlertEvents(alertId: string, workspaceId: string): Promise<AlertEvent[]>;
  acknowledgeAlert(alertId: string, workspaceId: string, userId: string, userName?: string): Promise<Alert>;
  resolveAlert(alertId: string, workspaceId: string, userId: string, userName?: string, note?: string): Promise<Alert>;

  // Rules
  getRules(workspaceId: string, environmentId: string): Promise<AlertRule[]>;
  getRuleById(ruleId: string, workspaceId: string): Promise<AlertRule | null>;
  createRule(rule: Omit<AlertRule, "id" | "createdAt" | "updatedAt">): Promise<AlertRule>;
  updateRule(ruleId: string, workspaceId: string, updates: Partial<AlertRule>): Promise<AlertRule>;
  deleteRule(ruleId: string, workspaceId: string): Promise<boolean>;

  // Evaluation
  evaluateAll(workspaceId: string, environmentId: string): Promise<AlertEvaluation[]>;
}

export class LocalAlertRepository implements AlertRepository {
  private alerts: Alert[] = [];
  private rules: AlertRule[] = [];
  private events: AlertEvent[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.alerts = JSON.parse(JSON.stringify(SEEDED_ALERTS));
    this.rules = JSON.parse(JSON.stringify(SEEDED_ALERT_RULES));
    this.events = JSON.parse(JSON.stringify(SEEDED_ALERT_EVENTS));
  }

  // ─── Alerts Queries ─────────────────────────────────────────────────────────

  async getAlerts(
    workspaceId: string,
    environmentId: string,
    filter?: AlertFilter
  ): Promise<Alert[]> {
    let list = this.alerts.filter(
      (a) => a.workspaceId === workspaceId && a.environmentId === environmentId
    );

    if (filter) {
      if (filter.status) {
        list = list.filter((a) => a.status === filter.status);
      }
      if (filter.severity) {
        list = list.filter((a) => a.severity === filter.severity);
      }
      if (filter.serviceId) {
        list = list.filter((a) => a.serviceId === filter.serviceId);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        list = list.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.serviceName.toLowerCase().includes(q) ||
            a.summary.toLowerCase().includes(q)
        );
      }
    }

    // Sort by triggeredAt descending
    return list.sort(
      (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    );
  }

  async getAlertById(alertId: string, workspaceId: string): Promise<Alert | null> {
    const alert = this.alerts.find(
      (a) => a.id === alertId && a.workspaceId === workspaceId
    );
    return alert ? { ...alert } : null;
  }

  async getAlertEvents(alertId: string, workspaceId: string): Promise<AlertEvent[]> {
    const alert = await this.getAlertById(alertId, workspaceId);
    if (!alert) return [];

    return this.events
      .filter((e) => e.alertId === alertId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // ─── Alert Mutation / Lifecycle ─────────────────────────────────────────────

  async acknowledgeAlert(
    alertId: string,
    workspaceId: string,
    userId: string,
    userName?: string
  ): Promise<Alert> {
    const index = this.alerts.findIndex(
      (a) => a.id === alertId && a.workspaceId === workspaceId
    );
    if (index === -1) {
      throw new Error(`Alert '${alertId}' not found in workspace '${workspaceId}'.`);
    }

    const { updatedAlert, event } = applyAlertAcknowledgement(
      this.alerts[index],
      userId,
      userName || userId
    );

    this.alerts[index] = updatedAlert;
    this.events.push(event);

    return { ...updatedAlert };
  }

  async resolveAlert(
    alertId: string,
    workspaceId: string,
    userId: string,
    userName?: string,
    note?: string
  ): Promise<Alert> {
    const index = this.alerts.findIndex(
      (a) => a.id === alertId && a.workspaceId === workspaceId
    );
    if (index === -1) {
      throw new Error(`Alert '${alertId}' not found in workspace '${workspaceId}'.`);
    }

    const { updatedAlert, event } = applyAlertResolution(
      this.alerts[index],
      userId,
      userName || userId,
      note
    );

    this.alerts[index] = updatedAlert;
    this.events.push(event);

    return { ...updatedAlert };
  }

  // ─── Rules Management ───────────────────────────────────────────────────────

  async getRules(workspaceId: string, environmentId: string): Promise<AlertRule[]> {
    return this.rules
      .filter((r) => r.workspaceId === workspaceId && r.environmentId === environmentId)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  async getRuleById(ruleId: string, workspaceId: string): Promise<AlertRule | null> {
    const rule = this.rules.find(
      (r) => r.id === ruleId && r.workspaceId === workspaceId
    );
    return rule ? { ...rule } : null;
  }

  async createRule(
    ruleData: Omit<AlertRule, "id" | "createdAt" | "updatedAt">
  ): Promise<AlertRule> {
    if (!ruleData.name || ruleData.name.trim().length === 0) {
      throw new Error("Rule name is required.");
    }
    if (!ruleData.condition || !ruleData.condition.metricType || !ruleData.condition.operator) {
      throw new Error("Valid rule condition is required.");
    }

    const now = new Date().toISOString();
    const newRule: AlertRule = {
      ...ruleData,
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };

    this.rules.unshift(newRule);
    return { ...newRule };
  }

  async updateRule(
    ruleId: string,
    workspaceId: string,
    updates: Partial<AlertRule>
  ): Promise<AlertRule> {
    const index = this.rules.findIndex(
      (r) => r.id === ruleId && r.workspaceId === workspaceId
    );
    if (index === -1) {
      throw new Error(`Rule '${ruleId}' not found in workspace '${workspaceId}'.`);
    }

    const current = this.rules[index];
    const updated: AlertRule = {
      ...current,
      ...updates,
      id: current.id,
      workspaceId: current.workspaceId,
      updatedAt: new Date().toISOString(),
    };

    this.rules[index] = updated;
    return { ...updated };
  }

  async deleteRule(ruleId: string, workspaceId: string): Promise<boolean> {
    const index = this.rules.findIndex(
      (r) => r.id === ruleId && r.workspaceId === workspaceId
    );
    if (index === -1) {
      return false;
    }

    this.rules.splice(index, 1);
    return true;
  }

  // ─── Centralized Evaluation Pass ───────────────────────────────────────────

  async evaluateAll(
    workspaceId: string,
    environmentId: string
  ): Promise<AlertEvaluation[]> {
    const sreRepo = getSRERepository();
    const serviceList = await sreRepo.listServices(workspaceId, environmentId);
    const activeRules = await this.getRules(workspaceId, environmentId);

    // Fetch full reliability model for each service
    const fullServices = await Promise.all(
      serviceList.map(async (s) => (await sreRepo.getServiceWithReliability(s.id)) || s)
    );

    const evaluations: AlertEvaluation[] = [];
    const now = new Date().toISOString();

    for (const rule of activeRules) {
      // Find target services
      const targetServices =
        rule.serviceId === "*"
          ? fullServices
          : fullServices.filter((s: any) => (s.service?.id || s.id) === rule.serviceId);

      for (const target of targetServices) {
        const serviceObj = (target as any).service || target;
        const serviceId = serviceObj.id;

        // Find existing alert for this fingerprint
        const fingerprint = `${workspaceId}:${environmentId}:${serviceId}:${rule.id}`;
        const existingAlertIndex = this.alerts.findIndex(
          (a) => a.fingerprint === fingerprint
        );
        const existingAlert =
          existingAlertIndex !== -1 ? this.alerts[existingAlertIndex] : undefined;

        const { evaluation, nextAlert, event } = evaluateRuleOnService(
          rule,
          target as any,
          existingAlert,
          now
        );

        evaluations.push(evaluation);

        if (nextAlert) {
          if (existingAlertIndex !== -1) {
            this.alerts[existingAlertIndex] = nextAlert;
          } else if (nextAlert.status !== "NORMAL") {
            this.alerts.unshift(nextAlert);
          }
        }

        if (event) {
          this.events.unshift(event);
        }
      }
    }

    return evaluations;
  }
}

// ─── Singleton Factory ────────────────────────────────────────────────────────

let repositoryInstance: LocalAlertRepository | null = null;

export function getAlertRepository(): AlertRepository {
  if (!repositoryInstance) {
    repositoryInstance = new LocalAlertRepository();
  }
  return repositoryInstance;
}
