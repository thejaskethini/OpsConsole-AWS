/**
 * /api/notifications/preferences
 *
 * GET - Get user notification preferences
 * PUT - Update user notification preferences
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import {
  getNotificationRepository,
  type NotificationPreference,
} from "@/modules/notifications";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";
const DEFAULT_WORKSPACE_ID = "ws-demo";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;

  const isAllowed = await can(userId, workspaceId, "notifications:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view preferences", 403, "FORBIDDEN");
  }

  try {
    const repo = getNotificationRepository();
    const preferences = await repo.getPreferences(workspaceId, userId);

    return apiSuccess({
      workspaceId,
      userId,
      preferences,
    });
  } catch (err) {
    return apiError("Failed to fetch preferences", 500, "PREFERENCES_FETCH_ERROR", String(err));
  }
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  let body: Partial<NotificationPreference> & { workspaceId?: string };

  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400, "INVALID_JSON");
  }

  const workspaceId = body.workspaceId || DEFAULT_WORKSPACE_ID;

  // Viewers are allowed to update their own personal notification preferences
  const isAllowed = await can(userId, workspaceId, "notifications:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to update preferences", 403, "FORBIDDEN");
  }

  try {
    const repo = getNotificationRepository();
    const updated = await repo.updatePreferences(workspaceId, userId, body);

    return apiSuccess({
      workspaceId,
      userId,
      preferences: updated,
    });
  } catch (err) {
    return apiError("Failed to update preferences", 500, "PREFERENCES_UPDATE_ERROR", String(err));
  }
}
