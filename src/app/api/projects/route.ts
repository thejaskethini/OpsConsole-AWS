/**
 * GET /api/projects
 *
 * Lists the local ASPM project portfolio for the current workspace and environment.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getProjectRepository } from "@/modules/projects";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const environmentId = searchParams.get("environmentId");
  if (!workspaceId || !environmentId) return apiError("workspaceId and environmentId are required", 400, "INVALID_SCOPE");

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

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) return apiError("Unauthorized", 401, "UNAUTHORIZED");
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const body = await req.json();
  const { workspaceId, environmentId, ...input } = body;
  if (!workspaceId || !environmentId) return apiError("workspaceId and environmentId are required", 400, "INVALID_SCOPE");
  if (!(await can(userId, workspaceId, "projects:manage"))) return apiError("Forbidden: Project management permission required", 403, "FORBIDDEN");
  if (!input.name || !input.owner || !input.plannedStart || !input.plannedEnd) return apiError("name, owner, plannedStart, and plannedEnd are required", 400, "INVALID_PROJECT");
  try {
    const now = new Date().toISOString();
    const project = {
      id: input.id || `project-${Date.now().toString(36)}`,
      workspaceId,
      environmentId,
      name: input.name,
      description: input.description || "",
      owner: input.owner,
      status: input.status || "PLANNING",
      priority: input.priority || "MEDIUM",
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      actualStart: input.actualStart,
      progress: Number(input.progress || 0),
      milestones: [],
      workItems: [],
      risks: [],
      linkedOperationalEntities: [],
      linkedIncidentIds: [],
      createdAt: now,
      updatedAt: now,
      isSimulated: true,
    };
    const created = await getProjectRepository().createProject(workspaceId, environmentId, project);
    return apiSuccess({ project: created, isSimulated: true }, { status: 201 });
  } catch (err) {
    return apiError("Failed to create project", 500, "PROJECT_CREATE_ERROR", String(err));
  }
}
