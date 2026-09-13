/**
 * /api/notifications/test
 *
 * POST - Dispatch a simulated test notification (requires notifications:manage)
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import {
  getNotificationEngine,
  type NotificationSeverity,
  type NotificationEvent,
} from "@/modules/notifications";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";
const DEFAULT_WORKSPACE_ID = "ws-demo";
const DEFAULT_ENVIRONMENT_ID = "env-prod";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  let body: {
    workspaceId?: string;
    environmentId?: string;
    severity?: NotificationSeverity;
    serviceId?: string;
    title?: string;
    message?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    // Body optional
  }

  const workspaceId = body.workspaceId || DEFAULT_WORKSPACE_ID;
  const environmentId = body.environmentId || DEFAULT_ENVIRONMENT_ID;

  const isAllowed = await can(userId, workspaceId, "notifications:manage");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to dispatch test notifications", 403, "FORBIDDEN");
  }

  const severity = body.severity || "SEV1";
  const serviceId = body.serviceId || "srv-notif-worker";
  const title = body.title || `[Simulated Test] Notification Pipeline Verification (${severity})`;
  const message =
    body.message ||
    `Test notification dispatched by ${userId} to verify multi-channel routing and simulated adapter delivery.`;

  try {
    const engine = getNotificationEngine();
    const event: NotificationEvent = {
      workspaceId,
      environmentId,
      eventType: "TEST_NOTIFICATION",
      source: "TEST",
      sourceId: `test-${Date.now().toString(36)}`,
      serviceId,
      serviceName: serviceId === "srv-notif-worker" ? "Notification Worker" : "Orders API",
      severity,
      title,
      message,
      metadata: { testInitiator: userId, isManualTest: true },
      timestamp: new Date().toISOString(),
    };

    const result = await engine.dispatch(event);

    return apiSuccess({
      ...result,
      message: "Test notification dispatched successfully",
    });
  } catch (err) {
    return apiError("Failed to dispatch test notification", 500, "TEST_DISPATCH_ERROR", String(err));
  }
}
