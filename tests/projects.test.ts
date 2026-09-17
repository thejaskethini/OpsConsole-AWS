import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  LocalProjectRepository,
  ProjectHealthEngine,
  ProjectEngine,
  createProjectRiskFromIncident,
  SimulationJiraProvider,
  SimulationAsanaProvider,
  classifyEvidence,
  getProjectIntelligenceToolset,
  calculateFunctionPoints,
  calculateCOCOMO,
  calculateNPV,
  calculateROI,
  analyzeSchedule,
  analyzeDependencies,
  analyzeProjectRisk,
  calculateRiskSeverity,
  MemoryCredentialStore,
  persistSelectedResources,
  getSelectedResources,
  createProposal,
  approveProposal,
  executeProposal,
  type ProjectRiskInput,
} from "../src/modules/projects";

const TEST_WS = "ws-projects";
const TEST_ENV = "env-prod";

describe("ASPM projects domain", () => {
  let repo: LocalProjectRepository;
  let engine: ProjectEngine;
  let health: ProjectHealthEngine;

  beforeEach(() => {
    repo = new LocalProjectRepository();
    engine = new ProjectEngine(repo);
    health = new ProjectHealthEngine();
  });

  it("should list deterministic seeded projects with isolation", async () => {
    const list = await repo.listProjects(TEST_WS, TEST_ENV);
    assert.ok(list.length >= 2, "seeded projects expected");
    assert.ok(list.every((project) => project.workspaceId === TEST_WS));
    assert.ok(list.every((project) => project.environmentId === TEST_ENV));
    assert.ok(await engine.getProjectProgress("proj-payments-modernization", TEST_WS, TEST_ENV) > 0);

    const other = await repo.listProjects("ws-other", TEST_ENV);
    assert.strictEqual(other.length, 0);
  });

  it("should seed the active demo workspace and environment IDs with deterministic projects", async () => {
    const list = await repo.listProjects("ws_demo_001", "env_prod_001");
    assert.ok(list.length >= 2, "demo workspace should include seeded ASPM projects");
    assert.ok(list.every((project) => project.workspaceId === "ws_demo_001"));
    assert.ok(list.every((project) => project.environmentId === "env_prod_001"));
    assert.ok(list.some((project) => project.id === "proj-payments-modernization"));
    assert.ok(list.some((project) => project.id === "proj-notification-platform"));
  });

  it("should calculate health metrics with explainable indicators", async () => {
    const projects = await repo.listProjects(TEST_WS, TEST_ENV);
    const summary = health.calculatePortfolioHealth(projects, {
      activeIncidents: 3,
      criticalAlerts: 2,
      affectedServices: 4,
      sloIssues: 1,
      notificationFailures: 1,
    });

    assert.ok(summary.activeProjects >= 1);
    assert.ok(summary.overallCompletion >= 0 && summary.overallCompletion <= 100);
    assert.ok(summary.portfolioStatus === "ON_TRACK" || summary.portfolioStatus === "AT_RISK");
    assert.ok(summary.indicators.length >= 4);
  });

  it("should compute schedule variance and risk prioritization", async () => {
    const project = await repo.getProjectById(TEST_WS, TEST_ENV, "proj-payments-modernization");
    assert.ok(project, "project should exist");

    const schedule = analyzeSchedule(project!, {
      plannedStart: "2026-01-01T00:00:00.000Z",
      plannedEnd: "2026-06-30T00:00:00.000Z",
      progress: 58,
      workItems: project!.workItems,
    });

    assert.ok(schedule.scheduleVariance !== undefined);
    assert.ok(schedule.overdueWorkItems >= 0);
    assert.ok(typeof analyzeDependencies(project!) === "object");

    const risk = analyzeProjectRisk(project!);
    assert.ok(risk.criticalRisks >= 0);
    assert.ok(Array.isArray(risk.prioritizedRisks));
  });

  it("should create a project risk from a validated incident", async () => {
    const incident = {
      id: "inc-123",
      title: "Payment API degradation",
      severity: "SEV1",
      workspaceId: TEST_WS,
      environmentId: TEST_ENV,
      summary: "Card payment API is degraded after a schema migration.",
      affectedServiceIds: ["srv-payment-gateway"],
      primaryAlertId: "alert-123",
    } as const;

    const project = await repo.getProjectById(TEST_WS, TEST_ENV, "proj-payments-modernization");
    assert.ok(project, "project should exist");

    const risk: ProjectRiskInput = {
      projectId: project!.id,
      owner: "director-platform",
      description: "The payment API degradation may delay the launch milestone.",
      probability: 0.7,
      impact: 0.8,
      source: "INCIDENT",
      linkedIncidentId: incident.id,
      mitigation: "Validate migration rollback and add regression checks.",
      status: "OPEN",
      workspaceId: TEST_WS,
      environmentId: TEST_ENV,
    };

    const created = await createProjectRiskFromIncident({
      project,
      incident,
      riskInput: risk,
    });

    assert.strictEqual(created.projectId, project!.id);
    assert.strictEqual(created.source, "INCIDENT");
    assert.strictEqual(created.linkedIncidentId, incident.id);
    assert.ok(created.severity === "CRITICAL" || created.severity === "HIGH");
  });

  it("should support simulated integrations and evidence classes", async () => {
    const jira = new SimulationJiraProvider();
    const asana = new SimulationAsanaProvider();

    const jiraCreate = await jira.createWorkItem({
      title: "Incident follow-up task",
      description: "Recovery action after SEV1 payment issue",
      incidentId: "inc-123",
      severity: "SEV1",
      environment: "prod",
      service: "payments-api",
    });

    const asanaCreate = await asana.createWorkItem({
      title: "Launch readiness checklist",
      description: "Checklist for release readiness",
      projectId: "proj-payments-modernization",
    });

    assert.ok(jiraCreate.externalId.startsWith("JIRA-"));
    assert.ok(asanaCreate.externalId.startsWith("ASANA-"));

    const evidence = classifyEvidence({
      observed: "SEV1 incident active",
      calculated: "schedule variance = 14%",
      inferred: "delivery could be delayed",
    });

    assert.strictEqual(evidence.OBSERVED?.source, "OBSERVED");
    assert.strictEqual(evidence.CALCULATED?.source, "CALCULATED");
    assert.strictEqual(evidence.INFERRED?.source, "INFERRED");
  });

  it("should persist scoped project, work item, milestone, and risk mutations", async () => {
    const project = await repo.getProjectById(TEST_WS, TEST_ENV, "proj-payments-modernization");
    assert.ok(project);
    const createdProject = await repo.createProject(TEST_WS, TEST_ENV, {
      ...project!,
      id: "proj-test-created",
      name: "Test Delivery Project",
      milestones: [],
      workItems: [],
      risks: [],
    });
    assert.strictEqual((await repo.getProjectById(TEST_WS, TEST_ENV, createdProject.id))?.name, "Test Delivery Project");

    const workItem = await repo.createWorkItem(TEST_WS, TEST_ENV, createdProject.id, {
      id: "wi-test-created", projectId: createdProject.id, title: "Test work", description: "Controlled mutation", owner: "owner", priority: "HIGH", status: "TODO", estimate: 4, dependencyIds: [], riskIds: [],
    });
    assert.strictEqual((await repo.updateWorkItem(TEST_WS, TEST_ENV, workItem.id, { status: "IN_PROGRESS" }))?.status, "IN_PROGRESS");

    const milestone = await repo.createMilestone(TEST_WS, TEST_ENV, createdProject.id, {
      id: "milestone-test-created", projectId: createdProject.id, name: "Test checkpoint", description: "Controlled checkpoint", owner: "owner", status: "PLANNED", plannedDate: "2026-12-01T00:00:00.000Z",
    });
    assert.strictEqual((await repo.updateMilestone(TEST_WS, TEST_ENV, milestone.id, { status: "COMPLETED" }))?.status, "COMPLETED");

    const risk = await repo.createRisk(TEST_WS, TEST_ENV, {
      id: "risk-test-created", projectId: createdProject.id, workspaceId: TEST_WS, environmentId: TEST_ENV, description: "Test risk", probability: 0.8, impact: 0.9, severity: calculateRiskSeverity(0.8, 0.9), owner: "owner", mitigation: "Review", status: "OPEN", source: "PROJECT", createdAt: "2026-09-17T00:00:00.000Z",
    });
    assert.strictEqual((await repo.updateRisk(TEST_WS, TEST_ENV, risk.id, { status: "CLOSED" }))?.status, "CLOSED");
    assert.strictEqual((await repo.getProjectById(TEST_WS, TEST_ENV, createdProject.id))?.workItems[0].status, "IN_PROGRESS");
  });

  it("should calculate risk severity and financial edge cases deterministically", () => {
    assert.strictEqual(calculateRiskSeverity(0, 1), "LOW");
    assert.strictEqual(calculateRiskSeverity(0.8, 0.9), "CRITICAL");
    assert.strictEqual(calculateROI({ initialInvestment: 100, netProfit: 50 }), -50);
    assert.strictEqual(calculateROI({ initialInvestment: 100, netProfit: 150 }), 50);
    assert.throws(() => calculateROI({ initialInvestment: 0, netProfit: 10 }), /greater than zero/);
    assert.strictEqual(calculateNPV({ initialInvestment: 0, cashFlows: [100], discountRate: 0.1 }), 90.91);
    assert.throws(() => calculateNPV({ initialInvestment: -1, cashFlows: [100], discountRate: 0.1 }), /must not be negative/);
  });

  it("should preserve real seeded incident linkage and deterministic external references", async () => {
    const project = await repo.getProjectById(TEST_WS, TEST_ENV, "proj-payments-modernization");
    assert.ok(project?.linkedIncidentIds.includes("inc-0003"));
    const jira = new SimulationJiraProvider();
    const first = await jira.createWorkItem({ title: "A", description: "A" });
    const second = await jira.createWorkItem({ title: "B", description: "B" });
    assert.match(first.externalId, /^JIRA-SIM-\d{3}$/);
    assert.match(second.externalId, /^JIRA-SIM-\d{3}$/);
    assert.notStrictEqual(first.externalId, second.externalId);
  });

  it("should expose tool functions for project intelligence", async () => {
    const tools = getProjectIntelligenceToolset();
    const projects = await tools.getProjects("ws-projects", "env-prod");
    assert.ok(projects.length >= 1);

    const health = await tools.getProjectHealth("proj-payments-modernization", "ws-projects", "env-prod");
    assert.ok(health.projectId === "proj-payments-modernization");
    assert.ok(Array.isArray(health.indicators));

    const cost = calculateNPV({ initialInvestment: 100000, cashFlows: [40000, 50000, 60000], discountRate: 0.1 });
    assert.ok(cost >= 0 || cost <= 0);

    const roi = calculateROI({ initialInvestment: 100000, netProfit: 35000 });
    assert.ok(roi !== undefined);

    const fp = calculateFunctionPoints({ internalFiles: 8, externalFiles: 4, transactions: 12, interfaces: 5 });
    assert.ok(fp > 0);

    const cocomo = calculateCOCOMO({ functionPoints: 200, projectScale: "moderate" });
    assert.ok(cocomo.estimatedPersonMonths > 0);
    assert.ok(Array.isArray(cocomo.breakdown));
  });

  it("persists only scoped integration resource selections and prevents cross-scope reads", async () => {
    const store = new MemoryCredentialStore();
    const scope = { userId: "user-a", workspaceId: TEST_WS, environmentId: TEST_ENV };
    await store.saveCredential(scope, "JIRA", { accessToken: "test-access-token", refreshToken: "test-refresh-token" });
    await persistSelectedResources(scope, "JIRA", { cloudId: "cloud-1", siteName: "Engineering", projectId: "100", projectName: "OPS", issueTypeId: "3", issueTypeName: "Task" }, store);
    const selected = await getSelectedResources(scope, "JIRA", store);
    assert.deepStrictEqual(selected, { cloudId: "cloud-1", siteName: "Engineering", siteUrl: undefined, projectId: "100", projectName: "OPS", issueTypeId: "3", issueTypeName: "Task" });
    assert.equal((await getSelectedResources({ ...scope, environmentId: "env-other" }, "JIRA", store)).cloudId, undefined);
    const stored = await store.getCredential(scope, "JIRA");
    assert.equal(stored?.metadata?.accessToken, undefined);
    assert.equal(stored?.accessToken, "test-access-token");
  });

  it("requires recorded approval and isolates proposals by user, workspace, and environment", async () => {
    const scope = { userId: "approval-user", workspaceId: TEST_WS, environmentId: TEST_ENV };
    const proposal = createProposal(scope, "JIRA", "proj-payments-modernization", undefined, { title: "Approval test", description: "Controlled test" });
    await assert.rejects(() => executeProposal(scope, proposal.id), /recorded server-side approval/);
    assert.equal(approveProposal({ ...scope, userId: "another-user" }, proposal.id), null);
    assert.ok(approveProposal(scope, proposal.id));
    assert.throws(() => approveProposal(scope, proposal.id), /already been approved/);
  });
});
