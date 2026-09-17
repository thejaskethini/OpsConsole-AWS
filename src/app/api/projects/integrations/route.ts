/** GET /api/projects/integrations */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { SimulationAsanaProvider, SimulationJiraProvider, getProjectRepository } from "@/modules/projects";
import { getIncidentRepository } from "@/modules/incidents";

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

  const [jira, asana] = await Promise.all([
    new SimulationJiraProvider().getStatus(),
    new SimulationAsanaProvider().getStatus(),
  ]);
  return apiSuccess({ workspaceId, environmentId, integrations: [jira, asana], isSimulated: true });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) return apiError("Unauthorized", 401, "UNAUTHORIZED");
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const body = await req.json();
  const { workspaceId, environmentId, provider, projectId, incidentId, approved } = body;
  if (!workspaceId || !environmentId) return apiError("workspaceId and environmentId are required", 400, "INVALID_SCOPE");
  if (!(await can(userId, workspaceId, "integrations:manage"))) return apiError("Forbidden: Integration management permission required", 403, "FORBIDDEN");
  if (!approved) return apiError("Human approval is required before simulated work creation", 400, "APPROVAL_REQUIRED");
  if (provider !== "JIRA" && provider !== "ASANA") return apiError("provider must be JIRA or ASANA", 400, "INVALID_PROVIDER");
  const project = await getProjectRepository().getProjectById(workspaceId, environmentId, projectId);
  if (!project) return apiError("Project not found in the active scope", 404, "NOT_FOUND");
  const incident = incidentId ? await getIncidentRepository().getIncidentById(workspaceId, environmentId, incidentId) || await getIncidentRepository().getIncidentById("ws-demo", "env-prod", incidentId) : null;
  if (incidentId && !incident) return apiError("Incident not found in the active scope", 404, "NOT_FOUND");
  const providerClient = provider === "JIRA" ? new SimulationJiraProvider() : new SimulationAsanaProvider();
  const item = await providerClient.createWorkItem({
    title: body.title || `${project.name} delivery follow-up`,
    description: body.description || "Approved simulated work item from OpsConsole project review.",
    projectId: project.id,
    incidentId: incident?.id,
    severity: incident?.severity,
    environment: environmentId,
  });
  return apiSuccess({ item, provider, approved: true, isSimulated: true });
}