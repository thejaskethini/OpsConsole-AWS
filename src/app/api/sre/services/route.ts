/**
 * GET /api/sre/services
 *
 * Lists all services with aggregated reliability data (golden signals, SLOs, health, dependencies),
 * scoped to the active workspace and environment.
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

  // 2. Resolve user ID and workspace ID
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;
  const environmentId = searchParams.get("environmentId") || DEFAULT_ENVIRONMENT_ID;

  // 3. Verify user has sre:read permission in this workspace
  const isAllowed = await can(userId, workspaceId, "sre:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view SRE services", 403, "FORBIDDEN");
  }

  try {
    const sreRepo = getSRERepository();
    const services = await sreRepo.listServices(workspaceId, environmentId);
    
    // Fetch full reliability model for each service
    const reliabilityDetails = await Promise.all(
      services.map((s) => sreRepo.getServiceWithReliability(s.id))
    );

    const validItems = reliabilityDetails.filter((item) => item !== null);

    return apiSuccess({
      workspaceId,
      environmentId,
      services: validItems,
      totalCount: validItems.length,
      isSimulated: true,
    });
  } catch (err) {
    return apiError("Failed to fetch SRE services", 500, "SRE_FETCH_ERROR", String(err));
  }
}
