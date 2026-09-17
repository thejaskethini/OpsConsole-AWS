/** POST /api/projects/risks - human-approved incident-to-project risk creation. */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getIncidentRepository } from "@/modules/incidents";
import { createProjectRiskFromIncident, getProjectRepository } from "@/modules/projects";

export const runtime = "nodejs";
const USER_COOKIE = "ops_user_id";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) return apiError("Unauthorized", 401, "UNAUTHORIZED");
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const body = await req.json();
  const workspaceId = body.workspaceId;
  const environmentId = body.environmentId;
  if (!workspaceId || !environmentId) return apiError("workspaceId and environmentId are required", 400, "INVALID_SCOPE");
  if (!(await can(userId, workspaceId, "projects:manage"))) return apiError("Forbidden: Project management permission required", 403, "FORBIDDEN");

  try {
    const projectRepo = getProjectRepository();
    const incidentRepo = getIncidentRepository();
    const project = await projectRepo.getProjectById(workspaceId, environmentId, body.projectId);
    const incident = await incidentRepo.getIncidentById(workspaceId, environmentId, body.incidentId);
    if (!project || !incident) return apiError("Project or incident was not found in the active scope", 404, "NOT_FOUND");

    const risk = createProjectRiskFromIncident({
      project,
      incident,
      riskInput: {
        projectId: project.id,
        workspaceId,
        environmentId,
        owner: body.owner || project.owner,
        description: body.description || `Review delivery impact from incident ${incident.incidentNumber}.`,
        probability: Number(body.probability ?? 0.6),
        impact: Number(body.impact ?? 0.7),
        source: "INCIDENT",
        linkedIncidentId: incident.id,
        mitigation: body.mitigation || "Assign an owner and validate mitigation before the next delivery checkpoint.",
        status: "OPEN",
      },
    });
    const created = await projectRepo.createRisk(workspaceId, environmentId, risk);
    return apiSuccess({ risk: created, requiresApproval: false, isSimulated: true });
  } catch (err) {
    return apiError("Failed to create project risk", 500, "PROJECT_RISK_CREATE_ERROR", String(err));
  }
}