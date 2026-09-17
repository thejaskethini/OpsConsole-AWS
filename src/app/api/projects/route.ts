/**
 * GET /api/projects
 *
 * Lists the local ASPM project portfolio for the current workspace and environment.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getProjectRepository, DEFAULT_PROJECT_WORKSPACE_ID, DEFAULT_PROJECT_ENVIRONMENT_ID } from "@/modules/projects";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_PROJECT_WORKSPACE_ID;
  const environmentId = searchParams.get("environmentId") || DEFAULT_PROJECT_ENVIRONMENT_ID;

  const isAllowed = await can(userId, workspaceId, "projects:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view projects", 403, "FORBIDDEN");
  }

  try {
    const repo = getProjectRepository();
    const projects = await repo.listProjects(workspaceId, environmentId);

    return apiSuccess({
      workspaceId,
      environmentId,
      projects,
      totalCount: projects.length,
      isSimulated: true,
    });
  } catch (err) {
    return apiError("Failed to load project portfolio", 500, "PROJECT_LIST_ERROR", String(err));
  }
}
