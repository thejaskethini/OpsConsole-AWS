/**
 * POST /api/alerts/[id]/resolve
 *
 * Manually resolves an active or acknowledged alert with an optional reason note.
 * Strictly enforces server-side RBAC: requires `alerts:manage` permission.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { getIdentityRepository, DEFAULT_USER_ID, can } from "@/modules/identity";
import { getAlertRepository, DEFAULT_WORKSPACE_ID } from "@/modules/alerting";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";

export async function POST(
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

  // Server-side RBAC enforcement: requires alerts:manage
  const isAllowed = await can(userId, workspaceId, "alerts:manage");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to resolve alerts. Requires 'alerts:manage'.", 403, "FORBIDDEN");
  }

  try {
    const body = await req.json().catch(() => ({}));
    const note = body.note || undefined;

    const identityRepo = getIdentityRepository();
    const user = await identityRepo.getUserById(userId);
    const userName = user?.name || userId;

    const alertRepo = getAlertRepository();
    const updatedAlert = await alertRepo.resolveAlert(
      alertId,
      workspaceId,
      userId,
      userName,
      note
    );

    return apiSuccess({
      alert: updatedAlert,
      message: `Alert '${alertId}' successfully resolved by ${userName}.`,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("not found")) {
      return apiError(errMsg, 404, "ALERT_NOT_FOUND");
    }
    return apiError(errMsg, 400, "ALERT_RESOLVE_ERROR");
  }
}
