/**
 * GET /api/incidents/[id]
 *
 * Retrieves incident details, chronological events, and operational evidence.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getIncidentRepository } from "@/modules/incidents";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";
const DEFAULT_WORKSPACE_ID = "ws-demo";
const DEFAULT_ENVIRONMENT_ID = "env-prod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id } = await params;
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;
  const environmentId = searchParams.get("environmentId") || DEFAULT_ENVIRONMENT_ID;

  const isAllowed = await can(userId, workspaceId, "incidents:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view incident", 403, "FORBIDDEN");
  }

  try {
    const repo = getIncidentRepository();
    const incident = await repo.getIncidentById(workspaceId, environmentId, id);

    if (!incident) {
      return apiError(`Incident ${id} not found`, 404, "NOT_FOUND");
    }

    const events = await repo.listEvents(workspaceId, environmentId, id);
    const evidence = await repo.listEvidence(workspaceId, environmentId, id);

    return apiSuccess({
      incident,
      events,
      evidence,
      isSimulated: true,
    });
  } catch (err) {
    return apiError("Failed to fetch incident", 500, "INCIDENT_FETCH_ERROR", String(err));
  }
}
