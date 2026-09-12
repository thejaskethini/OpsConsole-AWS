/**
 * GET /api/alerts/rules/[id] — Retrieve single rule
 * PUT /api/alerts/rules/[id] — Update alert rule
 * DELETE /api/alerts/rules/[id] — Delete alert rule
 *
 * PUT and DELETE strictly require `alerts:manage` permission.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getAlertRepository, DEFAULT_WORKSPACE_ID } from "@/modules/alerting";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id: ruleId } = await params;
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;

  const isAllowed = await can(userId, workspaceId, "alerts:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view alert rule", 403, "FORBIDDEN");
  }

  try {
    const alertRepo = getAlertRepository();
    const rule = await alertRepo.getRuleById(ruleId, workspaceId);

    if (!rule) {
      return apiError(`Alert rule '${ruleId}' not found`, 404, "RULE_NOT_FOUND");
    }

    return apiSuccess({ rule, isSimulated: true });
  } catch (err) {
    return apiError("Failed to fetch alert rule", 500, "RULE_FETCH_ERROR", String(err));
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id: ruleId } = await params;
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;

  const isAllowed = await can(userId, workspaceId, "alerts:manage");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to update alert rules. Requires 'alerts:manage'.", 403, "FORBIDDEN");
  }

  try {
    const body = await req.json();
    const alertRepo = getAlertRepository();
    const updatedRule = await alertRepo.updateRule(ruleId, workspaceId, body);

    return apiSuccess({
      rule: updatedRule,
      message: `Alert rule '${updatedRule.name}' updated successfully.`,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("not found")) {
      return apiError(errMsg, 404, "RULE_NOT_FOUND");
    }
    return apiError(errMsg, 400, "RULE_UPDATE_ERROR");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id: ruleId } = await params;
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;

  const isAllowed = await can(userId, workspaceId, "alerts:manage");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to delete alert rules. Requires 'alerts:manage'.", 403, "FORBIDDEN");
  }

  try {
    const alertRepo = getAlertRepository();
    const deleted = await alertRepo.deleteRule(ruleId, workspaceId);

    if (!deleted) {
      return apiError(`Alert rule '${ruleId}' not found`, 404, "RULE_NOT_FOUND");
    }

    return apiSuccess({
      deleted: true,
      message: `Alert rule '${ruleId}' deleted successfully.`,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return apiError(errMsg, 400, "RULE_DELETE_ERROR");
  }
}
