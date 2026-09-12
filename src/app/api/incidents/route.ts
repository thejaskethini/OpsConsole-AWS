/**
 * /api/incidents
 *
 * GET  - List incidents scoped to workspace and environment with filters & stats
 * POST - Create a new incident (requires incidents:manage)
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can, getIdentityRepository } from "@/modules/identity";
import {
  getIncidentRepository,
  getIncidentEngine,
  type IncidentStatus,
  type IncidentSeverity,
  type DetectionSource,
  type CreateIncidentInput,
} from "@/modules/incidents";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";
const DEFAULT_WORKSPACE_ID = "ws-demo";
const DEFAULT_ENVIRONMENT_ID = "env-prod";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;
  const environmentId = searchParams.get("environmentId") || DEFAULT_ENVIRONMENT_ID;

  const isAllowed = await can(userId, workspaceId, "incidents:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view incidents", 403, "FORBIDDEN");
  }

  const status = searchParams.get("status") as IncidentStatus | undefined;
  const severity = searchParams.get("severity") as IncidentSeverity | undefined;
  const serviceId = searchParams.get("serviceId") || undefined;
  const detectionSource = searchParams.get("detectionSource") as DetectionSource | undefined;
  const search = searchParams.get("search") || undefined;
  const alertId = searchParams.get("alertId") || undefined;

  try {
    const repo = getIncidentRepository();

    if (alertId) {
      const inc = await repo.getIncidentByAlertId(workspaceId, environmentId, alertId);
      return apiSuccess({
        workspaceId,
        environmentId,
        incident: inc,
      });
    }

    const incidents = await repo.listIncidents(workspaceId, environmentId, {
      status,
      severity,
      serviceId,
      detectionSource,
      search,
    });

    const stats = await repo.getStats(workspaceId, environmentId);

    return apiSuccess({
      workspaceId,
      environmentId,
      incidents,
      stats,
      totalCount: incidents.length,
      isSimulated: true,
    });
  } catch (err) {
    return apiError("Failed to list incidents", 500, "INCIDENT_LIST_ERROR", String(err));
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  let body: Partial<CreateIncidentInput> & {
    workspaceId?: string;
    environmentId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400, "INVALID_JSON");
  }

  const workspaceId = body.workspaceId || DEFAULT_WORKSPACE_ID;
  const environmentId = body.environmentId || DEFAULT_ENVIRONMENT_ID;

  // Authorization check
  const isAllowed =
    (await can(userId, workspaceId, "incidents:manage")) ||
    (await can(userId, workspaceId, "incidents:write"));

  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to create incidents", 403, "FORBIDDEN");
  }

  if (!body.title || !body.severity || !body.affectedServiceIds || body.affectedServiceIds.length === 0) {
    return apiError(
      "Missing required fields: title, severity, and affectedServiceIds are required",
      400,
      "VALIDATION_ERROR"
    );
  }

  // Resolve actor from user identity
  const identityRepo = getIdentityRepository();
  const user = await identityRepo.getUserById(userId);
  const actor = {
    id: userId,
    name: user?.name || "System User",
    email: user?.email || `${userId}@opsconsole.internal`,
    avatarInitials: user?.avatarInitials,
  };

  try {
    const engine = getIncidentEngine();
    const incident = await engine.createIncident(
      workspaceId,
      environmentId,
      actor,
      body as CreateIncidentInput
    );

    return apiSuccess({ incident }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create incident";
    return apiError(message, 400, "INCIDENT_CREATION_ERROR");
  }
}
