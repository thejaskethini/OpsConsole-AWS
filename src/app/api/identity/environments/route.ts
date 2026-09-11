/**
 * GET /api/identity/environments
 *
 * Returns all environments for the user's active workspace.
 * Server-side membership validated.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { getIdentityRepository, DEFAULT_USER_ID } from "@/modules/identity";
import { requireMembership, AuthorizationError } from "@/modules/identity/authorization";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;

  try {
    const repo = getIdentityRepository();
    const workspaces = await repo.listWorkspacesForUser(userId);
    const workspace = workspaces[0];
    if (!workspace) return apiError("No workspace found", 404, "NOT_FOUND");

    await requireMembership(userId, workspace.id);

    const environments = await repo.getEnvironmentsForWorkspace(workspace.id);
    return apiSuccess({ environments });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return apiError(err.message, 403, err.code);
    }
    return apiError("Failed to load environments", 500, "ENV_ERROR", String(err));
  }
}
