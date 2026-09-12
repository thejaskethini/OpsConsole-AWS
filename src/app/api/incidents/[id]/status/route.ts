/**
 * POST /api/incidents/[id]/status
 *
 * Changes incident status. Supports starting investigation, acknowledging, etc.
 * Enforces valid state transition matrix. Requires incidents:manage.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can, getIdentityRepository } from "@/modules/identity";
import { getIncidentEngine, type IncidentStatus } from "@/modules/incidents";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";
const DEFAULT_WORKSPACE_ID = "ws-demo";
const DEFAULT_ENVIRONMENT_ID = "env-prod";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id } = await params;
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;

  let body: {
    workspaceId?: string;
    environmentId?: string;
    status: IncidentStatus;
    reason?: string;
  };

  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400, "INVALID_JSON");
  }

  if (!body.status) {
    return apiError("status is required", 400, "VALIDATION_ERROR");
  }

  const workspaceId = body.workspaceId || DEFAULT_WORKSPACE_ID;
  const environmentId = body.environmentId || DEFAULT_ENVIRONMENT_ID;

  const isAllowed =
    (await can(userId, workspaceId, "incidents:manage")) ||
    (await can(userId, workspaceId, "incidents:write"));

  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to change incident status", 403, "FORBIDDEN");
  }

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
    let incident;

    if (body.status === "INVESTIGATING") {
      incident = await engine.startInvestigation(
        workspaceId,
        environmentId,
        id,
        actor,
        body.reason
      );
    } else {
      incident = await engine.changeStatus(
        workspaceId,
        environmentId,
        id,
        actor,
        body.status,
        body.reason
      );
    }

    return apiSuccess({ incident });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to change incident status";
    return apiError(message, 400, "INCIDENT_STATUS_ERROR");
  }
}
