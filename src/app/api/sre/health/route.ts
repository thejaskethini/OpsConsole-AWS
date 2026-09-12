/**
 * GET /api/sre/health
 *
 * Executive Reliability Summary answering "How healthy is my system right now?",
 * returning service breakdown, overall SLO compliance, error budget averages,
 * highest burn rates, and degraded services with primary degradation factors.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { getIdentityRepository, DEFAULT_USER_ID, can } from "@/modules/identity";
import { getSRERepository, DEFAULT_WORKSPACE_ID, DEFAULT_ENVIRONMENT_ID } from "@/modules/sre";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";

export async function GET(req: NextRequest) {
  // 1. Verify session
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;
  const environmentId = searchParams.get("environmentId") || DEFAULT_ENVIRONMENT_ID;

  // 2. Authorization check
  const isAllowed = await can(userId, workspaceId, "sre:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view SRE health", 403, "FORBIDDEN");
  }

  try {
    const sreRepo = getSRERepository();
    const executiveHealth = await sreRepo.getExecutiveHealth(workspaceId, environmentId);

    return apiSuccess(executiveHealth);
  } catch (err) {
    return apiError("Failed to calculate SRE health", 500, "SRE_HEALTH_ERROR", String(err));
  }
}
