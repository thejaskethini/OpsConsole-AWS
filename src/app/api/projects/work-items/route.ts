import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getProjectRepository } from "@/modules/projects";

export const runtime = "nodejs";
const USER_COOKIE = "ops_user_id";

async function authorize(req: NextRequest, permission: "projects:read" | "projects:manage") {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) return { error: apiError("Unauthorized", 401, "UNAUTHORIZED") };
  const body = req.method === "GET" ? null : await req.clone().json();
  const url = new URL(req.url);
  const workspaceId = body?.workspaceId || url.searchParams.get("workspaceId");
  const environmentId = body?.environmentId || url.searchParams.get("environmentId");
  if (!workspaceId || !environmentId) return { error: apiError("workspaceId and environmentId are required", 400, "INVALID_SCOPE") };
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  if (!(await can(userId, workspaceId, permission))) return { error: apiError("Forbidden: Project management permission required", 403, "FORBIDDEN") };
  return { workspaceId, environmentId, body };
}

export async function GET(req: NextRequest) {
  const auth = await authorize(req, "projects:read");
  if (auth.error) return auth.error;
  const projectId = new URL(req.url).searchParams.get("projectId") || undefined;
  return apiSuccess({ workItems: await getProjectRepository().listWorkItems(auth.workspaceId!, auth.environmentId!, projectId), workspaceId: auth.workspaceId, environmentId: auth.environmentId, isSimulated: true });
}

export async function POST(req: NextRequest) {
  const auth = await authorize(req, "projects:manage");
  if (auth.error) return auth.error;
  const body = auth.body;
  if (!body?.projectId || !body.title || !body.owner) return apiError("projectId, title, and owner are required", 400, "INVALID_WORK_ITEM");
  const workItem = { id: body.id || `work-item-${Date.now().toString(36)}`, projectId: body.projectId, title: body.title, description: body.description || "", owner: body.owner, priority: body.priority || "MEDIUM", status: body.status || "TODO", estimate: Number(body.estimate || 0), dueDate: body.dueDate, milestoneId: body.milestoneId, dependencyIds: body.dependencyIds || [], riskIds: body.riskIds || [], linkedIncidentId: body.linkedIncidentId };
  try { return apiSuccess({ workItem: await getProjectRepository().createWorkItem(auth.workspaceId!, auth.environmentId!, body.projectId, workItem), isSimulated: true }, { status: 201 }); } catch (err) { return apiError("Failed to create work item", 500, "WORK_ITEM_CREATE_ERROR", String(err)); }
}

export async function PATCH(req: NextRequest) {
  const auth = await authorize(req, "projects:manage");
  if (auth.error) return auth.error;
  if (!auth.body?.workItemId) return apiError("workItemId is required", 400, "INVALID_WORK_ITEM");
  const { workspaceId: _workspaceId, environmentId: _environmentId, workItemId, ...patch } = auth.body;
  const workItem = await getProjectRepository().updateWorkItem(auth.workspaceId!, auth.environmentId!, workItemId, patch);
  if (!workItem) return apiError("Work item not found in the active scope", 404, "NOT_FOUND");
  return apiSuccess({ workItem, isSimulated: true });
}