import type { NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { apiError } from "@/lib/api";
export async function integrationScope(req: NextRequest, permission: "integrations:read" | "integrations:manage") {
  if (!verifySession(req.cookies.get(COOKIE_NAME)?.value)) return { error: apiError("Unauthorized", 401, "UNAUTHORIZED") };
  const userId = req.cookies.get("ops_user_id")?.value || DEFAULT_USER_ID; const url = new URL(req.url); const workspaceId = url.searchParams.get("workspaceId"); const environmentId = url.searchParams.get("environmentId");
  if (!workspaceId || !environmentId) return { error: apiError("workspaceId and environmentId are required", 400, "INVALID_SCOPE") };
  if (!(await can(userId, workspaceId, permission))) return { error: apiError("Forbidden: Integration permission required", 403, "FORBIDDEN") };
  return { scope: { userId, workspaceId, environmentId } };
}
