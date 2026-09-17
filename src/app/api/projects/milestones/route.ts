import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getProjectRepository } from "@/modules/projects";

export const runtime = "nodejs";
const USER_COOKIE = "ops_user_id";

async function scope(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) return { error: apiError("Unauthorized", 401, "UNAUTHORIZED") };
  const body = await req.json().catch(() => ({}));
  const url = new URL(req.url);
  const workspaceId = body.workspaceId || url.searchParams.get("workspaceId");
  const environmentId = body.environmentId || url.searchParams.get("environmentId");
  if (!workspaceId || !environmentId) return { error: apiError("workspaceId and environmentId are required", 400, "INVALID_SCOPE") };
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  if (!(await can(userId, workspaceId, req.method === "GET" ? "projects:read" : "projects:manage"))) return { error: apiError("Forbidden: Project management permission required", 403, "FORBIDDEN") };
  return { workspaceId, environmentId, body };
}

export async function GET(req: NextRequest) { const auth = await scope(req); if (auth.error) return auth.error; const projectId = new URL(req.url).searchParams.get("projectId") || undefined; return apiSuccess({ milestones: await getProjectRepository().listMilestones(auth.workspaceId!, auth.environmentId!, projectId), workspaceId: auth.workspaceId, environmentId: auth.environmentId, isSimulated: true }); }
export async function POST(req: NextRequest) { const auth = await scope(req); if (auth.error) return auth.error; const body = auth.body; if (!body.projectId || !body.name || !body.owner || !body.plannedDate) return apiError("projectId, name, owner, and plannedDate are required", 400, "INVALID_MILESTONE"); const milestone = { id: body.id || `milestone-${Date.now().toString(36)}`, projectId: body.projectId, name: body.name, description: body.description || "", status: body.status || "PLANNED", plannedDate: body.plannedDate, actualDate: body.actualDate, owner: body.owner }; try { return apiSuccess({ milestone: await getProjectRepository().createMilestone(auth.workspaceId!, auth.environmentId!, body.projectId, milestone), isSimulated: true }, { status: 201 }); } catch (err) { return apiError("Failed to create milestone", 500, "MILESTONE_CREATE_ERROR", String(err)); } }
export async function PATCH(req: NextRequest) { const auth = await scope(req); if (auth.error) return auth.error; const { milestoneId, workspaceId: _workspaceId, environmentId: _environmentId, ...patch } = auth.body; if (!milestoneId) return apiError("milestoneId is required", 400, "INVALID_MILESTONE"); const milestone = await getProjectRepository().updateMilestone(auth.workspaceId!, auth.environmentId!, milestoneId, patch); if (!milestone) return apiError("Milestone not found in the active scope", 404, "NOT_FOUND"); return apiSuccess({ milestone, isSimulated: true }); }