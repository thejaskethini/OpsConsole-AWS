/** GET /api/projects/integrations */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { SimulationAsanaProvider, SimulationJiraProvider, getProjectRepository, createRealProvider, ProviderError, getSelectedResources } from "@/modules/projects";
import { getIncidentRepository } from "@/modules/incidents";
import { createProposal, approveProposal, executeProposal, providerMode, recentExternalWork } from "@/modules/projects/integration-service";

export const runtime = "nodejs";
const USER_COOKIE = "ops_user_id";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const environmentId = searchParams.get("environmentId");
  if (!workspaceId || !environmentId) return apiError("workspaceId and environmentId are required", 400, "INVALID_SCOPE");
  if (!(await can(userId, workspaceId, "projects:read")) || !(await can(userId, workspaceId, "integrations:read"))) {
    return apiError("Forbidden: Insufficient permissions to view integrations", 403, "FORBIDDEN");
  }

  const scope = { userId, workspaceId, environmentId };
  const provider = (kind: "JIRA" | "ASANA") => providerMode() === "real" ? createRealProvider(kind, scope) : kind === "JIRA" ? new SimulationJiraProvider() : new SimulationAsanaProvider();
  const integrations = await Promise.all([provider("JIRA").getStatus(), provider("ASANA").getStatus()]);
  return apiSuccess({ workspaceId, environmentId, integrations, externalWork: recentExternalWork(scope), mode: providerMode() });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) return apiError("Unauthorized", 401, "UNAUTHORIZED");
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const body = await req.json();
  const { workspaceId, environmentId, provider, projectId, incidentId, action, proposalId } = body;
  if (!workspaceId || !environmentId) return apiError("workspaceId and environmentId are required", 400, "INVALID_SCOPE");
  if (!(await can(userId, workspaceId, "integrations:manage"))) return apiError("Forbidden: Integration management permission required", 403, "FORBIDDEN");
  if (provider !== "JIRA" && provider !== "ASANA") return apiError("provider must be JIRA or ASANA", 400, "INVALID_PROVIDER");
  const scope = { userId, workspaceId, environmentId };
  if (action === "propose") {
    const project = await getProjectRepository().getProjectById(workspaceId, environmentId, projectId);
    if (!project) return apiError("Project not found in the active scope", 404, "NOT_FOUND");
    const incident = incidentId ? await getIncidentRepository().getIncidentById(workspaceId, environmentId, incidentId) : null;
    if (incidentId && !incident) return apiError("Incident not found in the active scope", 404, "NOT_FOUND");
    const selected = providerMode() === "real" ? await getSelectedResources(scope, provider) : {};
    if (providerMode() === "real" && (provider === "JIRA" ? !selected.cloudId || !selected.projectId || !selected.issueTypeId : !selected.workspaceId || !selected.projectId)) return apiError(`Select the required ${provider} resources before proposing external work`, 400, "RESOURCE_SELECTION_REQUIRED");
    const proposal = createProposal(scope, provider, projectId, incidentId, { title: body.title || `${project.name} delivery follow-up`, description: body.description || `${project.description}\n\nOpsConsole project: ${project.name}${incident ? `\nIncident: ${incident.id}` : ""}`, providerProjectId: selected.projectId || body.providerProjectId, workspaceId: selected.workspaceId || body.providerWorkspaceId, issueTypeId: selected.issueTypeId || body.issueTypeId, priorityId: body.priorityId, dueDate: body.dueDate, assigneeId: body.assigneeId });
    return apiSuccess({ proposal }, { status: 201 });
  }
  if (!proposalId) return apiError("proposalId is required", 400, "INVALID_REQUEST");
  try {
    if (action === "approve") { const proposal = approveProposal(scope, proposalId); return proposal ? apiSuccess({ proposal }) : apiError("Proposal not found in the active scope", 404, "NOT_FOUND"); }
    if (action === "execute") { const proposal = await executeProposal(scope, proposalId); return proposal ? apiSuccess({ proposal, item: proposal.external }) : apiError("Proposal not found in the active scope", 404, "NOT_FOUND"); }
    return apiError("action must be propose, approve, or execute", 400, "INVALID_REQUEST");
  } catch (error) { const e = error instanceof ProviderError ? error : undefined; return apiError(e?.message || "External work creation failed", e?.status || 400, e?.code || "EXECUTION_FAILED"); }
}
