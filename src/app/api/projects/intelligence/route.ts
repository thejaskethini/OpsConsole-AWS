/**
 * GET /api/projects/intelligence
 *
 * Returns deterministic, tool-backed project intelligence for the active scope.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getProjectIntelligenceToolset } from "@/modules/projects";

export const runtime = "nodejs";
const USER_COOKIE = "ops_user_id";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const environmentId = searchParams.get("environmentId");
  if (!workspaceId || !environmentId) return apiError("workspaceId and environmentId are required", 400, "INVALID_SCOPE");
  const projectId = searchParams.get("projectId");

  if (!(await can(userId, workspaceId, "projects:read")) || !(await can(userId, workspaceId, "intelligence:read"))) {
    return apiError("Forbidden: Insufficient permissions to view project intelligence", 403, "FORBIDDEN");
  }

  try {
    const tools = getProjectIntelligenceToolset();
    const projects = await tools.getProjects(workspaceId, environmentId);
    const selected = projectId ? projects.find((project) => project.id === projectId) : projects[0];
    if (!selected) return apiSuccess({ workspaceId, environmentId, projects, project: null, isSimulated: true });

    const [health, workItems, milestones, dependencies, risks] = await Promise.all([
      tools.getProjectHealth(selected.id, workspaceId, environmentId),
      tools.getWorkItems(workspaceId, environmentId, selected.id),
      tools.getMilestones(workspaceId, environmentId, selected.id),
      tools.getDependencies(workspaceId, environmentId, selected.id),
      tools.getRisks(workspaceId, environmentId, selected.id),
    ]);

    return apiSuccess({
      workspaceId,
      environmentId,
      projects,
      project: selected,
      health,
      workItems,
      milestones,
      dependencies,
      risks,
      evidence: [
        { source: "OBSERVED", detail: `${selected.name} is ${selected.status} at ${selected.progress}% completion.` },
        { source: "CALCULATED", detail: `${health.indicators.map((indicator) => `${indicator.label}: ${indicator.value}`).join("; ")}.` },
        { source: "INFERRED", detail: "Management review should focus on the highest-severity risks, blocked work, and delayed milestones." },
        { source: "UNAVAILABLE", detail: "No runtime LLM is configured; this view uses deterministic project tools and evidence." },
      ],
      isSimulated: true,
    });
  } catch (err) {
    return apiError("Failed to load project intelligence", 500, "PROJECT_INTELLIGENCE_ERROR", String(err));
  }
}