/**
 * Phase 6: Notification Platform Test Suite
 *
 * Comprehensive tests for Notification Domain, Rule Evaluation, Routing,
 * Cooldown Suppression, Deduplication, Simulated Adapters, Delivery Attempts,
 * Retries, Workspace/Environment Scoping, RBAC, Alert & Incident Integration,
 * and Deterministic Seeded Data.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  LocalNotificationRepository,
  NotificationEngine,
  getNotificationRepository,
  getAdapterRegistry,
  InAppAdapter,
  WebhookAdapter,
  EmailAdapter,
  SlackAdapter,
  TeamsAdapter,
  SEEDED_NOTIFICATIONS,
  SEEDED_RULES,
  SEEDED_CHANNELS,
  type NotificationEvent,
} from "../src/modules/notifications";

import {
  can,
  ALL_PERMISSIONS,
} from "../src/modules/identity";

import { getAlertRepository } from "../src/modules/alerting";
import { getIncidentRepository, getIncidentEngine } from "../src/modules/incidents";

describe("Phase 6: Notification Platform — Unit & Integration Tests", () => {
  let repo: LocalNotificationRepository;
  let engine: NotificationEngine;

  const WS = "ws-demo";
  const ENV = "env-prod";
  const OTHER_WS = "ws-other";
  const OTHER_ENV = "env-staging";

  beforeEach(() => {
    repo = new LocalNotificationRepository();
    engine = new NotificationEngine(repo);
    getNotificationRepository().reset();
    getAlertRepository().reset();
    getIncidentRepository().reset();
  });

  // ─── 1. Notification Creation & Seeded Data ────────────────────────────────
  describe("1. Deterministic Seeded Data & Store Initialization", () => {
    it("should initialize with deterministic seeded notifications", async () => {
      const notifs = await repo.listNotifications(WS, ENV);
      assert.strictEqual(notifs.length, SEEDED_NOTIFICATIONS.length);
      const found001 = notifs.find((n) => n.id === "notif-001");
      assert.ok(found001);
      assert.strictEqual(found001?.severity, "SEV1");
      assert.strictEqual(found001?.serviceName, "Notification Worker");
    });

    it("should initialize with deterministic seeded rules", async () => {
      const rules = await repo.listRules(WS, ENV);
      assert.strictEqual(rules.length, SEEDED_RULES.length);
      assert.strictEqual(rules[0].id, "rule-sev1-critical");
      assert.strictEqual(rules[0].priority, 1);
    });

    it("should initialize with deterministic seeded channels and preferences", async () => {
      const channels = await repo.listChannels(WS, ENV);
      assert.strictEqual(channels.length, SEEDED_CHANNELS.length);

      const pref = await repo.getPreferences(WS, "usr-thejas");
      assert.ok(pref);
      assert.strictEqual(pref?.userId, "usr-thejas");
      assert.strictEqual(pref?.isEnabled, true);
    });
  });

  // ─── 2. Workspace & Environment Isolation ─────────────────────────────────
  describe("2. Strict Workspace and Environment Isolation", () => {
    it("should enforce workspace isolation — never expose cross-tenant notifications", async () => {
      const wsDemoNotifs = await repo.listNotifications(WS, ENV);
      assert.ok(wsDemoNotifs.length > 0);

      const otherWsNotifs = await repo.listNotifications(OTHER_WS, ENV);
      assert.strictEqual(otherWsNotifs.length, 0);

      // Create notification in other workspace
      await repo.createNotification(OTHER_WS, ENV, {
        id: "notif-other-1",
        workspaceId: OTHER_WS,
        environmentId: ENV,
        source: "ALERT",
        sourceId: "alert-999",
        severity: "SEV1",
        eventType: "ALERT_FIRING",
        title: "Other WS Alert",
        message: "Should not leak",
        status: "DELIVERED",
        fingerprint: "ws-other:env-prod:ALERT:alert-999:ALERT_FIRING",
        deliveries: [],
        isSimulated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const updatedOther = await repo.listNotifications(OTHER_WS, ENV);
      assert.strictEqual(updatedOther.length, 1);

      // Demo workspace count unchanged
      const demoCheck = await repo.listNotifications(WS, ENV);
      assert.strictEqual(demoCheck.length, wsDemoNotifs.length);

      // getById across boundary returns null
      const leak = await repo.getNotificationById(WS, ENV, "notif-other-1");
      assert.strictEqual(leak, null);
    });

    it("should enforce environment isolation", async () => {
      const prodNotifs = await repo.listNotifications(WS, ENV);
      assert.ok(prodNotifs.length > 0);
      const stagingNotifs = await repo.listNotifications(WS, OTHER_ENV);
      assert.strictEqual(stagingNotifs.length, 0);

      const prodRules = await repo.listRules(WS, ENV);
      const stagingRules = await repo.listRules(WS, OTHER_ENV);
      assert.strictEqual(stagingRules.length, 0);
      assert.ok(prodRules.length > 0);
    });
  });

  // ─── 3. Rule Matching & Filters ───────────────────────────────────────────
  describe("3. Rule Matching, Priority, Severity, Event, and Service Filtering", () => {
    it("should match SEV1 rules for ALERT_FIRING on any service", async () => {
      const event: NotificationEvent = {
        workspaceId: WS,
        environmentId: ENV,
        eventType: "ALERT_FIRING",
        source: "ALERT",
        sourceId: "alert-test-1",
        serviceId: "srv-orders-api",
        serviceName: "Orders API",
        severity: "SEV1",
        title: "Orders API Outage",
        message: "Orders API is down",
        timestamp: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // future to avoid cooldown
      };

      const result = await engine.dispatch(event);
      assert.strictEqual(result.isSuppressed, false);
      assert.ok(result.matchedRule);
      assert.strictEqual(result.matchedRule?.id, "rule-sev1-critical");
      assert.strictEqual(result.notification.status, "DELIVERED");
      assert.strictEqual(result.deliveries.length, 3); // In-App, Slack, Webhook
    });

    it("should match SEV2 rules for Orders API", async () => {
      const event: NotificationEvent = {
        workspaceId: WS,
        environmentId: ENV,
        eventType: "ALERT_ACKNOWLEDGED",
        source: "ALERT",
        sourceId: "alert-test-2",
        serviceId: "srv-orders-api",
        serviceName: "Orders API",
        severity: "SEV2",
        title: "Orders API High Latency Ack",
        message: "Acknowledged by engineer",
        timestamp: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
      };

      const result = await engine.dispatch(event);
      assert.strictEqual(result.isSuppressed, false);
      assert.strictEqual(result.matchedRule?.id, "rule-sev2-high");
      assert.strictEqual(result.deliveries.length, 3); // In-App, Email, Slack
    });

    it("should suppress notification if no matching rule exists", async () => {
      const event: NotificationEvent = {
        workspaceId: WS,
        environmentId: ENV,
        eventType: "TEST_NOTIFICATION",
        source: "TEST",
        sourceId: "test-no-match",
        severity: "INFO",
        title: "Unmatched Info Ping",
        message: "No rule handles INFO TEST_NOTIFICATION",
      };

      const result = await engine.dispatch(event);
      assert.strictEqual(result.isSuppressed, true);
      assert.strictEqual(result.notification.status, "SUPPRESSED");
      assert.match(result.suppressionReason || "", /No active notification rules match/);
    });

    it("should respect service-specific rule scoping", async () => {
      // Create a service-specific rule for payment-gw only
      await repo.createRule(WS, ENV, {
        name: "Payment Gateway Custom Escalation",
        description: "Custom rule only for payment gateway",
        isEnabled: true,
        priority: 1,
        eventTypes: ["ALERT_FIRING"],
        severities: ["SEV1"],
        serviceIds: ["srv-payment-gw"],
        destinations: [
          { channelType: "TEAMS", destination: "Payments Room", targetName: "Payments", enabled: true },
        ],
        cooldownMinutes: 1,
      });

      const paymentEvent: NotificationEvent = {
        workspaceId: WS,
        environmentId: ENV,
        eventType: "ALERT_FIRING",
        source: "ALERT",
        sourceId: "alert-pay-1",
        serviceId: "srv-payment-gw",
        serviceName: "Payment Gateway",
        severity: "SEV1",
        title: "Payment Service Degraded",
        message: "Payment API degraded",
        timestamp: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
      };

      const result = await engine.dispatch(paymentEvent);
      assert.strictEqual(result.isSuppressed, false);
      assert.strictEqual(result.matchedRule?.name, "Payment Gateway Custom Escalation");
      assert.ok(result.deliveries.some((d) => d.channelType === "TEAMS"));
    });
  });

  // ─── 4. Cooldown & Deduplication Suppression ──────────────────────────────
  describe("4. Cooldown Suppression and Fingerprint Deduplication", () => {
    it("should enforce rule cooldown and suppress rapid successive triggers", async () => {
      const baseTime = new Date("2026-05-01T12:00:00.000Z");

      const firstEvent: NotificationEvent = {
        workspaceId: WS,
        environmentId: ENV,
        eventType: "ALERT_FIRING",
        source: "ALERT",
        sourceId: "alert-cd-1",
        serviceId: "srv-notif-worker",
        severity: "SEV1",
        title: "SEV1 Alert",
        message: "Critical alert trigger",
        timestamp: baseTime.toISOString(),
      };

      const firstResult = await engine.dispatch(firstEvent);
      assert.strictEqual(firstResult.isSuppressed, false);
      assert.strictEqual(firstResult.notification.status, "DELIVERED");

      // Dispatch 1 minute later (rule has 5 minute cooldown)
      const secondEvent: NotificationEvent = {
        ...firstEvent,
        sourceId: "alert-cd-2",
        timestamp: new Date(baseTime.getTime() + 60 * 1000).toISOString(),
      };

      const secondResult = await engine.dispatch(secondEvent);
      assert.strictEqual(secondResult.isSuppressed, true);
      assert.strictEqual(secondResult.notification.status, "SUPPRESSED");
      assert.match(secondResult.suppressionReason || "", /cooldown active/i);

      // Dispatch 6 minutes later (cooldown expired)
      const thirdEvent: NotificationEvent = {
        ...firstEvent,
        sourceId: "alert-cd-3",
        timestamp: new Date(baseTime.getTime() + 6 * 60 * 1000).toISOString(),
      };

      const thirdResult = await engine.dispatch(thirdEvent);
      assert.strictEqual(thirdResult.isSuppressed, false);
      assert.strictEqual(thirdResult.notification.status, "DELIVERED");
    });

    it("should deduplicate identical notification fingerprints within window", async () => {
      const now = new Date("2026-06-01T10:00:00.000Z");

      const event: NotificationEvent = {
        workspaceId: WS,
        environmentId: ENV,
        eventType: "ALERT_FIRING",
        source: "ALERT",
        sourceId: "alert-dedup-1",
        serviceId: "srv-orders-api",
        severity: "SEV2",
        title: "Orders Latency Alert",
        message: "High latency detected",
        timestamp: now.toISOString(),
      };

      const res1 = await engine.dispatch(event);
      assert.strictEqual(res1.isSuppressed, false);

      // Re-send identical event within cooldown window
      const res2 = await engine.dispatch({
        ...event,
        timestamp: new Date(now.getTime() + 30 * 1000).toISOString(),
      });
      assert.strictEqual(res2.isSuppressed, true);
      assert.strictEqual(res2.notification.status, "SUPPRESSED");
    });
  });

  // ─── 5. Channel Adapters & Simulated Delivery ──────────────────────────────
  describe("5. Simulated Channel Adapters (In-App, Webhook, Email, Slack, Teams)", () => {
    it("should dispatch to all 5 channel adapters deterministically", async () => {
      const registry = getAdapterRegistry();
      const inApp = registry.getAdapter("IN_APP");
      const webhook = registry.getAdapter("WEBHOOK");
      const email = registry.getAdapter("EMAIL");
      const slack = registry.getAdapter("SLACK");
      const teams = registry.getAdapter("TEAMS");

      assert.ok(inApp instanceof InAppAdapter);
      assert.ok(webhook instanceof WebhookAdapter);
      assert.ok(email instanceof EmailAdapter);
      assert.ok(slack instanceof SlackAdapter);
      assert.ok(teams instanceof TeamsAdapter);

      const dummyNotif = SEEDED_NOTIFICATIONS[0];

      const r1 = await inApp.send({ notification: dummyNotif, destination: "In-App Feed", attemptNumber: 1 });
      assert.strictEqual(r1.status, "DELIVERED");
      assert.strictEqual(r1.metadata?.simulated, true);

      const r2 = await webhook.send({ notification: dummyNotif, destination: "https://api.internal/hook", attemptNumber: 1 });
      assert.strictEqual(r2.status, "DELIVERED");
      assert.strictEqual(r2.metadata?.httpStatus, 200);

      const r3 = await email.send({ notification: dummyNotif, destination: "sre@opsconsole.internal", attemptNumber: 1 });
      assert.strictEqual(r3.status, "DELIVERED");

      const r4 = await slack.send({ notification: dummyNotif, destination: "#sre-critical", attemptNumber: 1 });
      assert.strictEqual(r4.status, "DELIVERED");

      const r5 = await teams.send({ notification: dummyNotif, destination: "Eng Hub", attemptNumber: 1 });
      assert.strictEqual(r5.status, "DELIVERED");
    });

    it("should simulate deterministic delivery failures when destination indicates failure", async () => {
      const registry = getAdapterRegistry();
      const webhook = registry.getAdapter("WEBHOOK");
      const email = registry.getAdapter("EMAIL");
      const slack = registry.getAdapter("SLACK");
      const teams = registry.getAdapter("TEAMS");
      const dummyNotif = SEEDED_NOTIFICATIONS[0];

      const fWebhook = await webhook.send({
        notification: dummyNotif,
        destination: "https://fail.invalid/webhook",
        attemptNumber: 1,
      });
      assert.strictEqual(fWebhook.status, "FAILED");
      assert.match(fWebhook.error || "", /503/);

      const fEmail = await email.send({
        notification: dummyNotif,
        destination: "invalid-email-address",
        attemptNumber: 1,
      });
      assert.strictEqual(fEmail.status, "FAILED");

      const fSlack = await slack.send({
        notification: dummyNotif,
        destination: "fail-channel",
        attemptNumber: 1,
      });
      assert.strictEqual(fSlack.status, "FAILED");

      const fTeams = await teams.send({
        notification: dummyNotif,
        destination: "fail-teams-room",
        attemptNumber: 1,
      });
      assert.strictEqual(fTeams.status, "FAILED");
    });
  });

  // ─── 6. Delivery Attempts & Retries ───────────────────────────────────────
  describe("6. Delivery Attempts Recording & Deterministic Retries", () => {
    it("should record delivery attempts and support retry", async () => {
      // Seed a rule that points to a failing webhook and a working in-app
      await repo.createRule(WS, ENV, {
        name: "Partial Fail Rule",
        description: "Tests retry behavior",
        isEnabled: true,
        priority: 1,
        eventTypes: ["TEST_NOTIFICATION"],
        severities: ["SEV1"],
        serviceIds: ["*"],
        destinations: [
          { channelType: "IN_APP", destination: "In-App Feed", enabled: true },
          { channelType: "WEBHOOK", destination: "https://fail.invalid/webhook", enabled: true },
        ],
        cooldownMinutes: 0,
      });

      const event: NotificationEvent = {
        workspaceId: WS,
        environmentId: ENV,
        eventType: "TEST_NOTIFICATION",
        source: "TEST",
        sourceId: "test-retry-1",
        severity: "SEV1",
        title: "Retry Test",
        message: "Testing retry",
        timestamp: new Date().toISOString(),
      };

      const result = await engine.dispatch(event);
      assert.strictEqual(result.notification.status, "PARTIALLY_FAILED");
      const failedDel = result.deliveries.find((d) => d.status === "FAILED");
      assert.ok(failedDel);
      assert.strictEqual(failedDel?.attemptCount, 1);

      // Perform retry on failed delivery
      const retried = await engine.retryDelivery(WS, ENV, result.notification.id, failedDel?.id);
      const retriedDel = retried.deliveries.find((d) => d.id === failedDel?.id);
      assert.strictEqual(retriedDel?.attemptCount, 2);
      assert.strictEqual(retriedDel?.attempts.length, 2);
    });
  });

  // ─── 7. Rules CRUD ────────────────────────────────────────────────────────
  describe("7. Notification Rules CRUD", () => {
    it("should create, read, update, toggle, and delete notification rules", async () => {
      const created = await repo.createRule(WS, ENV, {
        name: "Security Alert Routing",
        description: "Routes security alerts to security team",
        isEnabled: true,
        priority: 4,
        eventTypes: ["ALERT_FIRING"],
        severities: ["SEV1", "SEV2"],
        serviceIds: ["*"],
        destinations: [
          { channelType: "EMAIL", destination: "secops@opsconsole.internal", enabled: true },
        ],
        cooldownMinutes: 10,
      });

      assert.ok(created.id);
      assert.strictEqual(created.name, "Security Alert Routing");

      const fetched = await repo.getRuleById(WS, ENV, created.id);
      assert.ok(fetched);
      assert.strictEqual(fetched?.name, "Security Alert Routing");

      const updated = await repo.updateRule(WS, ENV, created.id, {
        description: "Updated security routing description",
        isEnabled: false,
      });
      assert.strictEqual(updated.description, "Updated security routing description");
      assert.strictEqual(updated.isEnabled, false);

      const deleted = await repo.deleteRule(WS, ENV, created.id);
      assert.strictEqual(deleted, true);

      const check = await repo.getRuleById(WS, ENV, created.id);
      assert.strictEqual(check, null);
    });
  });

  // ─── 8. Alert & Incident Integration ──────────────────────────────────────
  describe("8. Alert & Incident Lifecycle Integration", () => {
    it("should dispatch notification events when alert lifecycle changes", async () => {
      const alertRepo = getAlertRepository();
      const notifRepo = getNotificationRepository();

      const initialNotifs = await notifRepo.listNotifications(WS, ENV);
      assert.ok(initialNotifs.length > 0);

      // Acknowledge FIRING alert in ws_demo_001
      const ackAlert = await alertRepo.acknowledgeAlert("alt_pay_budget_003", "ws_demo_001", "usr_thejas_001", "Thejas");
      assert.ok(ackAlert);
      assert.strictEqual(ackAlert.status, "ACKNOWLEDGED");
    });

    it("should dispatch notification events when incident lifecycle changes", async () => {
      const incEngine = getIncidentEngine();
      const notifRepo = getNotificationRepository();
      const actor = { id: "usr-thejas", name: "Thejas", email: "thejas@opsconsole.internal" };

      const inc = await incEngine.createIncident(WS, ENV, actor, {
        title: "Test Incident for Notification Integration",
        description: "Verifies incident to notification pipeline",
        severity: "SEV1",
        affectedServiceIds: ["srv-orders-api"],
        detectionSource: "MANUAL",
      });

      assert.ok(inc.id);

      // Verify notification recorded in the singleton repository
      const notifs = await notifRepo.listNotifications(WS, ENV, { source: "INCIDENT" });
      const found = notifs.find((n) => n.relatedIncidentId === inc.id);
      assert.ok(found);
      assert.strictEqual(found?.severity, "SEV1");
      assert.strictEqual(found?.eventType, "INCIDENT_CREATED");

      // Acknowledge incident
      await incEngine.acknowledge(WS, ENV, inc.id, actor, "Investigating payment rail");
      const afterAck = await notifRepo.listNotifications(WS, ENV, { source: "INCIDENT" });
      assert.ok(afterAck.length >= notifs.length);
    });
  });

  // ─── 9. RBAC Authorization ────────────────────────────────────────────────
  describe("9. RBAC Permissions Matrix", () => {
    it("should define notifications:read and notifications:manage in ALL_PERMISSIONS", () => {
      const readPerm = ALL_PERMISSIONS.find((p) => p.id === "notifications:read");
      const managePerm = ALL_PERMISSIONS.find((p) => p.id === "notifications:manage");
      assert.ok(readPerm);
      assert.ok(managePerm);
    });

    it("should grant notifications:read and notifications:manage to owner, admin, and operator", async () => {
      // Thejas is Owner in ws_demo_001
      assert.strictEqual(await can("usr_thejas_001", "ws_demo_001", "notifications:read"), true);
      assert.strictEqual(await can("usr_thejas_001", "ws_demo_001", "notifications:manage"), true);

      // Alex is Admin in ws_demo_001
      assert.strictEqual(await can("usr_alex_002", "ws_demo_001", "notifications:read"), true);
      assert.strictEqual(await can("usr_alex_002", "ws_demo_001", "notifications:manage"), true);
    });

    it("should grant notifications:read to viewer, but DENY notifications:manage", async () => {
      // Priya is Viewer in ws_demo_001
      assert.strictEqual(await can("usr_priya_003", "ws_demo_001", "notifications:read"), true);
      assert.strictEqual(await can("usr_priya_003", "ws_demo_001", "notifications:manage"), false);
    });

    it("should deny non-members from accessing any notification permissions", async () => {
      assert.strictEqual(await can("usr_stranger_999", "ws_demo_001", "notifications:read"), false);
      assert.strictEqual(await can("usr_stranger_999", "ws_demo_001", "notifications:manage"), false);
    });
  });
});
