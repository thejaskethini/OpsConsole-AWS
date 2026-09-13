/**
 * /api/notifications/[id]/retry
 *
 * POST - Retry delivery for a specific notification / delivery target (requires notifications:manage)
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getNotificationEngine } from "@/modules/notifications";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";
const DEFAULT_WORKSPACE_ID = "ws-demo";
const DEFAULT_ENVIRONMENT_ID = "env-prod";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id } = await params;
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;

  let body: { workspaceId?: string; environmentId?: string; deliveryId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Body optional if workspace/env in query params
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = body.workspaceId || searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;
  const environmentId = body.environmentId || searchParams.get("environmentId") || DEFAULT_ENVIRONMENT_ID;
  const deliveryId = body.deliveryId || searchParams.get("deliveryId") || undefined;

  const isAllowed = await can(userId, workspaceId, "notifications:manage");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to retry notifications", 403, "FORBIDDEN");
  }

  try {
    const engine = getNotificationEngine();
    const updated = await engine.retryDelivery(workspaceId, environmentId, id, deliveryId);

    return apiSuccess({
      workspaceId,
      environmentId,
      notification: updated,
      message: `Retried delivery for notification ${id}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to retry delivery";
    return apiError(msg, 400, "RETRY_ERROR");
  }
}
