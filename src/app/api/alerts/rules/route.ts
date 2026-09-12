/**
 * GET /api/alerts/rules — List all alert rules
 * POST /api/alerts/rules — Create a new alert rule
 *
 * Scoped to active workspace and environment.
 * POST strictly requires `alerts:manage` permission.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getAlertRepository, DEFAULT_WORKSPACE_ID, DEFAULT_ENVIRONMENT_ID, type AlertMetricType, type AlertOperator, type AlertSeverity } from "@/modules/alerting";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";

const VALID_METRICS: AlertMetricType[] = [
  "LATENCY_P95",
  "ERROR_RATE",
  "TRAFFIC_RPS",
  "SATURATION_CPU",
  "SATURATION_MEMORY",
  "SLO_COMPLIANCE",
  "ERROR_BUDGET_REMAINING",
  "BURN_RATE",
  "SERVICE_HEALTH",
];

const VALID_OPERATORS: AlertOperator[] = ["GT", "GTE", "LT", "LTE", "EQ", "NEQ"];
const VALID_SEVERITIES: AlertSeverity[] = ["INFO", "WARNING", "CRITICAL"];

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_WORKSPACE_ID;
  const environmentId = searchParams.get("environmentId") || DEFAULT_ENVIRONMENT_ID;

  const isAllowed = await can(userId, workspaceId, "alerts:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view alert rules", 403, "FORBIDDEN");
  }

  try {
    const alertRepo = getAlertRepository();
    const rules = await alertRepo.getRules(workspaceId, environmentId);

    return apiSuccess({
      workspaceId,
      environmentId,
      rules,
      totalCount: rules.length,
      isSimulated: true,
    });
  } catch (err) {
    return apiError("Failed to fetch alert rules", 500, "RULE_FETCH_ERROR", String(err));
  }
}

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
    return apiError("Forbidden: Insufficient permissions to create alert rules. Requires 'alerts:manage'.", 403, "FORBIDDEN");
  }

  try {
    const body = await req.json();
    const { name, description, serviceId, condition, severity, isEnabled, cooldownMinutes, labels } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return apiError("Rule name is required.", 400, "INVALID_INPUT");
    }
    if (!serviceId || typeof serviceId !== "string") {
      return apiError("Target serviceId is required (or '*' for all services).", 400, "INVALID_INPUT");
    }
    if (!condition || !VALID_METRICS.includes(condition.metricType)) {
      return apiError(`Invalid condition metricType. Must be one of: ${VALID_METRICS.join(", ")}`, 400, "INVALID_INPUT");
    }
    if (!VALID_OPERATORS.includes(condition.operator)) {
      return apiError(`Invalid condition operator. Must be one of: ${VALID_OPERATORS.join(", ")}`, 400, "INVALID_INPUT");
    }
    if (condition.threshold === undefined || condition.threshold === null || condition.threshold === "") {
      return apiError("Condition threshold is required.", 400, "INVALID_INPUT");
    }
    if (!VALID_SEVERITIES.includes(severity)) {
      return apiError(`Invalid severity. Must be one of: ${VALID_SEVERITIES.join(", ")}`, 400, "INVALID_INPUT");
    }

    const alertRepo = getAlertRepository();
    const newRule = await alertRepo.createRule({
      name: name.trim(),
      description: description?.trim() || "",
      workspaceId,
      environmentId,
      serviceId: serviceId.trim(),
      condition: {
        metricType: condition.metricType,
        operator: condition.operator,
        threshold: typeof condition.threshold === "number" ? condition.threshold : Number(condition.threshold) || condition.threshold,
        windowMinutes: Number(condition.windowMinutes) || 5,
        unit: condition.unit || undefined,
      },
      severity,
      isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
      cooldownMinutes: Number(cooldownMinutes) || 15,
      labels: labels && typeof labels === "object" ? labels : {},
    });

    return apiSuccess({
      rule: newRule,
      message: `Alert rule '${newRule.name}' created successfully.`,
    }, { status: 201 });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return apiError(errMsg, 400, "RULE_CREATE_ERROR");
  }
}
