/**
 * /api/notifications/[id]
 *
 * GET - Retrieve notification details with delivery status & attempt audit history
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getNotificationRepository } from "@/modules/notifications";

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
    return apiError("Forbidden: Insufficient permissions to view notification details", 403, "FORBIDDEN");
  }

  try {
    const repo = getNotificationRepository();
    const notification = await repo.getNotificationById(workspaceId, environmentId, id);

    if (!notification) {
      return apiError(`Notification '${id}' not found`, 404, "NOT_FOUND");
    }

    return apiSuccess({
      workspaceId,
      environmentId,
      notification,
    });
  } catch (err) {
    return apiError("Failed to fetch notification", 500, "NOTIFICATION_FETCH_ERROR", String(err));
  }
}
