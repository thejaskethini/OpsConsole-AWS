/** POST /api/projects/risks - human-approved incident-to-project risk creation. */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getIncidentRepository } from "@/modules/incidents";
import { calculateRiskSeverity, createProjectRiskFromIncident, getProjectRepository } from "@/modules/projects";

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
  if (!(await can(userId, workspaceId, "projects:manage")) || !(await can(userId, workspaceId, "risks:manage"))) return apiError("Forbidden: Project risk management permission required", 403, "FORBIDDEN");

  try {
    const projectRepo = getProjectRepository();
    const incidentRepo = getIncidentRepository();
    const project = await projectRepo.getProjectById(workspaceId, environmentId, body.projectId);
    const incident = body.incidentId
      ? await incidentRepo.getIncidentById(workspaceId, environmentId, body.incidentId)
        || await incidentRepo.getIncidentById("ws-demo", "env-prod", body.incidentId)
      : null;
    if (!project || (body.incidentId && !incident)) return apiError("Project or incident was not found in the active scope", 404, "NOT_FOUND");

    if (!body.incidentId) {
      const probability = Number(body.probability);
      const impact = Number(body.impact);
      if (!Number.isFinite(probability) || !Number.isFinite(impact)) return apiError("probability and impact are required", 400, "INVALID_RISK");
      const risk = {
        id: body.id || `risk-${Date.now().toString(36)}`,
        projectId: project.id,
        workspaceId,
        environmentId,
        description: body.description,
        probability,
        impact,
        severity: calculateRiskSeverity(probability, impact),
        owner: body.owner || project.owner,
        mitigation: body.mitigation || "",
        status: body.status || "OPEN",
        source: body.source || "PROJECT",
        createdAt: new Date().toISOString(),
      } as const;
      return apiSuccess({ risk: await projectRepo.createRisk(workspaceId, environmentId, risk), isSimulated: true }, { status: 201 });
    }

    if (!incident) return apiError("Incident is required for incident-derived risk creation", 400, "INVALID_RISK");
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
        linkedIncidentId: incident!.id,
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

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) return apiError("Unauthorized", 401, "UNAUTHORIZED");
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const body = await req.json();
  const { workspaceId, environmentId, riskId, probability, impact, ...rest } = body;
  if (!workspaceId || !environmentId || !riskId) return apiError("workspaceId, environmentId, and riskId are required", 400, "INVALID_SCOPE");
  if (!(await can(userId, workspaceId, "projects:manage")) || !(await can(userId, workspaceId, "risks:manage"))) return apiError("Forbidden: Project risk management permission required", 403, "FORBIDDEN");
  const patch = { ...rest, ...(probability !== undefined ? { probability: Number(probability) } : {}), ...(impact !== undefined ? { impact: Number(impact) } : {}) };
  if (patch.probability !== undefined || patch.impact !== undefined) {
    const current = await getProjectRepository().getRiskById(workspaceId, environmentId, riskId);
    if (!current) return apiError("Risk not found in the active scope", 404, "NOT_FOUND");
    patch.severity = calculateRiskSeverity(patch.probability ?? current.probability, patch.impact ?? current.impact);
  }
  const risk = await getProjectRepository().updateRisk(workspaceId, environmentId, riskId, patch);
  if (!risk) return apiError("Risk not found in the active scope", 404, "NOT_FOUND");
  return apiSuccess({ risk, isSimulated: true });
}