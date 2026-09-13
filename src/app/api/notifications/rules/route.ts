/**
 * /api/notifications/rules
 *
 * GET  - List notification rules scoped to workspace & environment
 * POST - Create a new notification rule (requires notifications:manage)
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import {
  getNotificationRepository,
  type NotificationRule,
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
    return apiError("Forbidden: Insufficient permissions to view notification rules", 403, "FORBIDDEN");
  }

  try {
    const repo = getNotificationRepository();
    const rules = await repo.listRules(workspaceId, environmentId);

    return apiSuccess({
      workspaceId,
      environmentId,
      rules,
      totalCount: rules.length,
    });
  } catch (err) {
    return apiError("Failed to list notification rules", 500, "RULE_LIST_ERROR", String(err));
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  let body: Partial<NotificationRule> & { workspaceId?: string; environmentId?: string };

  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400, "INVALID_JSON");
  }

  const workspaceId = body.workspaceId || DEFAULT_WORKSPACE_ID;
  const environmentId = body.environmentId || DEFAULT_ENVIRONMENT_ID;

  const isAllowed = await can(userId, workspaceId, "notifications:manage");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to create notification rules", 403, "FORBIDDEN");
  }

  if (!body.name || !body.eventTypes || !body.severities || !body.destinations) {
    return apiError(
      "Missing required fields: name, eventTypes, severities, and destinations are required",
      400,
      "VALIDATION_ERROR"
    );
  }

  try {
    const repo = getNotificationRepository();
    const created = await repo.createRule(workspaceId, environmentId, {
      name: body.name.trim(),
      description: body.description?.trim() || "",
      isEnabled: body.isEnabled !== false,
      priority: body.priority || 1,
      eventTypes: body.eventTypes,
      severities: body.severities,
      serviceIds: body.serviceIds || ["*"],
      destinations: body.destinations,
      cooldownMinutes: body.cooldownMinutes ?? 5,
    });

    return apiSuccess({ rule: created }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create notification rule";
    return apiError(msg, 400, "RULE_CREATION_ERROR");
  }
}
