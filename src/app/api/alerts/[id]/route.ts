/**
 * GET /api/alerts/[id]
 *
 * Retrieves detailed information about a single alert, including its condition snapshot
 * and chronological event audit timeline.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getAlertRepository, DEFAULT_WORKSPACE_ID } from "@/modules/alerting";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id: alertId } = await params;
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;

  const isAllowed = await can(userId, workspaceId, "alerts:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view alert details", 403, "FORBIDDEN");
  }

  try {
    const alertRepo = getAlertRepository();
    const alert = await alertRepo.getAlertById(alertId, workspaceId);

    if (!alert) {
      return apiError(`Alert '${alertId}' not found`, 404, "ALERT_NOT_FOUND");
    }

    const events = await alertRepo.getAlertEvents(alertId, workspaceId);

    return apiSuccess({
      alert,
      events,
      isSimulated: true,
    });
  } catch (err) {
    return apiError("Failed to fetch alert details", 500, "ALERT_FETCH_ERROR", String(err));
  }
}
