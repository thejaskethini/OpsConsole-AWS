/**
 * /api/notifications/channels
 *
 * GET - List configured notification channels scoped to workspace & environment
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

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;
  const environmentId = searchParams.get("environmentId") || DEFAULT_ENVIRONMENT_ID;

  const isAllowed = await can(userId, workspaceId, "notifications:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view notification channels", 403, "FORBIDDEN");
  }

  try {
    const repo = getNotificationRepository();
    const channels = await repo.listChannels(workspaceId, environmentId);

    return apiSuccess({
      workspaceId,
      environmentId,
      channels,
      totalCount: channels.length,
      isSimulated: true,
    });
  } catch (err) {
    return apiError("Failed to list notification channels", 500, "CHANNELS_LIST_ERROR", String(err));
  }
}
