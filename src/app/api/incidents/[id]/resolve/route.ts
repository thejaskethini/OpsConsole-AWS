/**
 * POST /api/incidents/[id]/resolve
 *
 * Resolves an incident with resolution summary. Requires incidents:manage.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can, getIdentityRepository } from "@/modules/identity";
import { getIncidentEngine } from "@/modules/incidents";

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
    resolutionSummary: string;
  };

  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400, "INVALID_JSON");
  }

  if (!body.resolutionSummary || body.resolutionSummary.trim().length === 0) {
    return apiError("resolutionSummary is required to resolve incident", 400, "VALIDATION_ERROR");
  }

  const workspaceId = body.workspaceId || DEFAULT_WORKSPACE_ID;
  const environmentId = body.environmentId || DEFAULT_ENVIRONMENT_ID;

  const isAllowed =
    (await can(userId, workspaceId, "incidents:manage")) ||
    (await can(userId, workspaceId, "incidents:write"));

  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to resolve incident", 403, "FORBIDDEN");
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
    const incident = await engine.resolve(
      workspaceId,
      environmentId,
      id,
      actor,
      body.resolutionSummary
    );

    return apiSuccess({ incident });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to resolve incident";
    return apiError(message, 400, "INCIDENT_RESOLVE_ERROR");
  }
}
