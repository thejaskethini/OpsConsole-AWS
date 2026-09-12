/**
 * POST /api/incidents/[id]/assign
 *
 * Assigns or reassigns an incident owner/commander. Requires incidents:manage.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can, getIdentityRepository } from "@/modules/identity";
import { getIncidentEngine, type IncidentActor } from "@/modules/incidents";

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
    assigneeId: string;
    commanderId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400, "INVALID_JSON");
  }

  if (!body.assigneeId) {
    return apiError("assigneeId is required", 400, "VALIDATION_ERROR");
  }

  const workspaceId = body.workspaceId || DEFAULT_WORKSPACE_ID;
  const environmentId = body.environmentId || DEFAULT_ENVIRONMENT_ID;

  const isAllowed =
    (await can(userId, workspaceId, "incidents:manage")) ||
    (await can(userId, workspaceId, "incidents:write"));

  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to assign incident", 403, "FORBIDDEN");
  }

  const identityRepo = getIdentityRepository();
  const currentUser = await identityRepo.getUserById(userId);
  const actor: IncidentActor = {
    id: userId,
    name: currentUser?.name || "System User",
    email: currentUser?.email || `${userId}@opsconsole.internal`,
    avatarInitials: currentUser?.avatarInitials,
  };

  const targetAssignee = await identityRepo.getUserById(body.assigneeId);
  const assignee: IncidentActor = {
    id: body.assigneeId,
    name: targetAssignee?.name || (body.assigneeId === "usr-thejas" ? "Thejas" : body.assigneeId === "usr-alex" ? "Alex" : "Priya"),
    email: targetAssignee?.email || `${body.assigneeId}@opsconsole.internal`,
    avatarInitials: targetAssignee?.avatarInitials,
  };

  let commander: IncidentActor | undefined;
  if (body.commanderId) {
    const targetCommander = await identityRepo.getUserById(body.commanderId);
    commander = {
      id: body.commanderId,
      name: targetCommander?.name || (body.commanderId === "usr-alex" ? "Alex" : "Thejas"),
      email: targetCommander?.email || `${body.commanderId}@opsconsole.internal`,
      avatarInitials: targetCommander?.avatarInitials,
    };
  }

  try {
    const engine = getIncidentEngine();
    const incident = await engine.assign(
      workspaceId,
      environmentId,
      id,
      actor,
      assignee,
      commander
    );

    return apiSuccess({ incident });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to assign incident";
    return apiError(message, 400, "INCIDENT_ASSIGN_ERROR");
  }
}
