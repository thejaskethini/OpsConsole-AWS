/**
 * GET /api/sre/services/[id]
 *
 * Returns detailed reliability data for a single service:
 * Golden Signals, SLIs, SLOs, Error Budgets, Burn Rates, Dependencies, and linked Cloud Resources.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { getIdentityRepository, DEFAULT_USER_ID, can } from "@/modules/identity";
import { getSRERepository, DEFAULT_WORKSPACE_ID } from "@/modules/sre";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // 1. Verify session
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id } = await context.params;
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;

  // 2. Verify authorization
  const isAllowed = await can(userId, workspaceId, "sre:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view SRE service", 403, "FORBIDDEN");
  }

  try {
    const sreRepo = getSRERepository();
    const serviceReliability = await sreRepo.getServiceWithReliability(id);

    if (!serviceReliability) {
      return apiError("Service not found", 404, "SERVICE_NOT_FOUND");
    }

    return apiSuccess({
      service: serviceReliability.service,
      goldenSignals: serviceReliability.goldenSignals,
      slos: serviceReliability.slos,
      health: serviceReliability.health,
      dependencies: serviceReliability.dependencies,
      dependents: serviceReliability.dependents,
      isSimulated: true,
    });
  } catch (err) {
    return apiError("Failed to fetch service details", 500, "SRE_SERVICE_ERROR", String(err));
  }
}
