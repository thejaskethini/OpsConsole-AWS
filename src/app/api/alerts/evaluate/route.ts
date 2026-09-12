/**
 * POST /api/alerts/evaluate
 *
 * Triggers a centralized evaluation pass of all active rules against SRE service telemetry.
 * Strictly requires `alerts:manage` permission.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getAlertRepository, DEFAULT_WORKSPACE_ID, DEFAULT_ENVIRONMENT_ID } from "@/modules/alerting";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;
  const environmentId = searchParams.get("environmentId") || DEFAULT_ENVIRONMENT_ID;

  const isAllowed = await can(userId, workspaceId, "alerts:manage");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to trigger alert evaluations. Requires 'alerts:manage'.", 403, "FORBIDDEN");
  }

  try {
    const alertRepo = getAlertRepository();
    const evaluations = await alertRepo.evaluateAll(workspaceId, environmentId);

    const triggeredCount = evaluations.filter(
      (e) => e.statusTransition === "TRIGGERED" || e.statusTransition === "RE_TRIGGERED"
    ).length;
    const resolvedCount = evaluations.filter((e) => e.statusTransition === "RESOLVED").length;

    return apiSuccess({
      workspaceId,
      environmentId,
      totalEvaluated: evaluations.length,
      triggeredCount,
      resolvedCount,
      evaluations,
      message: `Evaluation completed: ${evaluations.length} rule-service combinations evaluated (${triggeredCount} triggered, ${resolvedCount} resolved).`,
      isSimulated: true,
    });
  } catch (err) {
    return apiError("Failed to execute alert evaluation pass", 500, "EVALUATION_ERROR", String(err));
  }
}
