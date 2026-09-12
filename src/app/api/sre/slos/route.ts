/**
 * GET /api/sre/slos
 *
 * Lists all SLOs, current performance, compliance percentages,
 * flexible error budgets (time-based / event-based), and burn rates.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { getIdentityRepository, DEFAULT_USER_ID, can } from "@/modules/identity";
import { getSRERepository, DEFAULT_WORKSPACE_ID } from "@/modules/sre";

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
  const serviceId = searchParams.get("serviceId") || undefined;

  // 2. Authorization check
  const isAllowed = await can(userId, workspaceId, "sre:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view SLOs", 403, "FORBIDDEN");
  }

  try {
    const sreRepo = getSRERepository();
    const slos = await sreRepo.listSLOs(serviceId);
    const services = await sreRepo.listServices(workspaceId);

    // Attach service name & tier to each SLO
    const enrichedSlos = slos.map((slo) => {
      const svc = services.find((s) => s.id === slo.serviceId);
      return {
        ...slo,
        serviceName: svc?.name || slo.serviceId,
        serviceSlug: svc?.slug || slo.serviceId,
        serviceTier: svc?.tier || "tier-2",
      };
    });

    const totalCount = enrichedSlos.length;
    const compliantCount = enrichedSlos.filter((s) => s.compliancePercent >= s.target).length;
    const globalCompliance =
      totalCount > 0
        ? Math.round(
            (enrichedSlos.reduce((acc, s) => acc + s.compliancePercent, 0) / totalCount) * 100
          ) / 100
        : 100;

    return apiSuccess({
      slos: enrichedSlos,
      totalCount,
      compliantCount,
      globalCompliance,
      isSimulated: true,
    });
  } catch (err) {
    return apiError("Failed to fetch SLOs", 500, "SRE_SLO_ERROR", String(err));
  }
}
