/**
 * /api/notifications/rules/[id]
 *
 * GET    - Get single notification rule
 * PUT    - Update notification rule (requires notifications:manage)
 * DELETE - Delete notification rule (requires notifications:manage)
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import {
  getNotificationRepository,
  type NotificationRule,
} from "@/modules/notifications";

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

  const isAllowed = await can(userId, workspaceId, "notifications:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view notification rule", 403, "FORBIDDEN");
  }

  try {
    const repo = getNotificationRepository();
    const rule = await repo.getRuleById(workspaceId, environmentId, id);
    if (!rule) {
      return apiError(`Notification rule '${id}' not found`, 404, "NOT_FOUND");
    }

    return apiSuccess({ workspaceId, environmentId, rule });
  } catch (err) {
    return apiError("Failed to fetch notification rule", 500, "RULE_FETCH_ERROR", String(err));
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id } = await params;
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;

  let body: Partial<NotificationRule> & { workspaceId?: string; environmentId?: string };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400, "INVALID_JSON");
  }

  const workspaceId = body.workspaceId || DEFAULT_WORKSPACE_ID;
  const environmentId = body.environmentId || DEFAULT_ENVIRONMENT_ID;

  const isAllowed = await can(userId, workspaceId, "notifications:manage");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to update notification rules", 403, "FORBIDDEN");
  }

  try {
    const repo = getNotificationRepository();
    const updated = await repo.updateRule(workspaceId, environmentId, id, body);
    return apiSuccess({ rule: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update notification rule";
    return apiError(msg, 400, "RULE_UPDATE_ERROR");
  }
}

export async function DELETE(
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

  const isAllowed = await can(userId, workspaceId, "notifications:manage");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to delete notification rules", 403, "FORBIDDEN");
  }

  try {
    const repo = getNotificationRepository();
    const deleted = await repo.deleteRule(workspaceId, environmentId, id);
    if (!deleted) {
      return apiError(`Notification rule '${id}' not found`, 404, "NOT_FOUND");
    }
    return apiSuccess({ deleted: true, id });
  } catch (err) {
    return apiError("Failed to delete notification rule", 500, "RULE_DELETE_ERROR", String(err));
  }
}
