/**
 * GET /api/alerts
 *
 * Lists alerts scoped to the active workspace and environment,
 * supporting status, severity, serviceId, and search query filters.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getAlertRepository, DEFAULT_WORKSPACE_ID, DEFAULT_ENVIRONMENT_ID, type AlertStatus, type AlertSeverity } from "@/modules/alerting";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;
  const environmentId = searchParams.get("environmentId") || DEFAULT_ENVIRONMENT_ID;

  const isAllowed = await can(userId, workspaceId, "alerts:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view alerts", 403, "FORBIDDEN");
  }

  const status = (searchParams.get("status") as AlertStatus) || undefined;
  const severity = (searchParams.get("severity") as AlertSeverity) || undefined;
  const serviceId = searchParams.get("serviceId") || undefined;
  const search = searchParams.get("search") || undefined;

  try {
    const alertRepo = getAlertRepository();
    const alerts = await alertRepo.getAlerts(workspaceId, environmentId, {
      status,
      severity,
      serviceId,
      search,
    });

    return apiSuccess({
      workspaceId,
      environmentId,
      alerts,
      totalCount: alerts.length,
      isSimulated: true,
    });
  } catch (err) {
    return apiError("Failed to fetch alerts", 500, "ALERT_FETCH_ERROR", String(err));
  }
}
