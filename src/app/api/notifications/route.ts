/**
 * /api/notifications
 *
 * GET  - List notifications scoped to workspace and environment with filters & stats
 * POST - Ingest/dispatch a notification event (requires notifications:manage)
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import {
  getNotificationRepository,
  getNotificationEngine,
  type NotificationStatus,
  type NotificationSeverity,
  type NotificationSource,
  type NotificationChannelType,
  type NotificationEvent,
} from "@/modules/notifications";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";
const DEFAULT_WORKSPACE_ID = "ws-demo";
const DEFAULT_ENVIRONMENT_ID = "env-prod";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;
  const environmentId = searchParams.get("environmentId") || DEFAULT_ENVIRONMENT_ID;

  const isAllowed = await can(userId, workspaceId, "notifications:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view notifications", 403, "FORBIDDEN");
  }

  const status = searchParams.get("status") as NotificationStatus | undefined;
  const severity = searchParams.get("severity") as NotificationSeverity | undefined;
  const source = searchParams.get("source") as NotificationSource | undefined;
  const serviceId = searchParams.get("serviceId") || undefined;
  const channelType = searchParams.get("channelType") as NotificationChannelType | undefined;
  const search = searchParams.get("search") || undefined;

  try {
    const repo = getNotificationRepository();
    const notifications = await repo.listNotifications(workspaceId, environmentId, {
      status,
      severity,
      source,
      serviceId,
      channelType,
      search,
    });

    const stats = await repo.getStats(workspaceId, environmentId);

    return apiSuccess({
      workspaceId,
      environmentId,
      notifications,
      stats,
      totalCount: notifications.length,
      isSimulated: true,
    });
  } catch (err) {
    return apiError("Failed to list notifications", 500, "NOTIFICATION_LIST_ERROR", String(err));
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  let body: Partial<NotificationEvent> & { workspaceId?: string; environmentId?: string };

  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400, "INVALID_JSON");
  }

  const workspaceId = body.workspaceId || DEFAULT_WORKSPACE_ID;
  const environmentId = body.environmentId || DEFAULT_ENVIRONMENT_ID;

  const isAllowed = await can(userId, workspaceId, "notifications:manage");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to dispatch notifications", 403, "FORBIDDEN");
  }

  if (!body.title || !body.severity || !body.eventType || !body.source) {
    return apiError(
      "Missing required fields: title, severity, eventType, and source are required",
      400,
      "VALIDATION_ERROR"
    );
  }

  try {
    const engine = getNotificationEngine();
    const event: NotificationEvent = {
      workspaceId,
      environmentId,
      eventType: body.eventType,
      source: body.source,
      sourceId: body.sourceId || `src-${Date.now().toString(36)}`,
      serviceId: body.serviceId,
      serviceName: body.serviceName,
      severity: body.severity,
      title: body.title,
      message: body.message || body.title,
      relatedAlertId: body.relatedAlertId,
      relatedIncidentId: body.relatedIncidentId,
      metadata: body.metadata,
      timestamp: body.timestamp || new Date().toISOString(),
    };

    const result = await engine.dispatch(event);
    return apiSuccess(result, { status: 201 });
  } catch (err) {
    return apiError("Failed to dispatch notification event", 500, "NOTIFICATION_DISPATCH_ERROR", String(err));
  }
}
