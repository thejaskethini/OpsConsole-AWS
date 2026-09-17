/**
 * GET /api/projects/[id]
 *
 * Fetches a single ASPM project plus explainable operational context.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { DEFAULT_USER_ID, can } from "@/modules/identity";
import { getProjectRepository, DEFAULT_PROJECT_WORKSPACE_ID, DEFAULT_PROJECT_ENVIRONMENT_ID, ProjectHealthEngine, analyzeSchedule, analyzeProjectRisk } from "@/modules/projects";

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

  const { id } = await params;
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || DEFAULT_PROJECT_WORKSPACE_ID;
  const environmentId = searchParams.get("environmentId") || DEFAULT_PROJECT_ENVIRONMENT_ID;

  const isAllowed = await can(userId, workspaceId, "projects:read");
  if (!isAllowed) {
    return apiError("Forbidden: Insufficient permissions to view project", 403, "FORBIDDEN");
  }

  try {
    const repo = getProjectRepository();
    const project = await repo.getProjectById(workspaceId, environmentId, id);

    if (!project) {
      return apiError(`Project ${id} not found`, 404, "NOT_FOUND");
    }

    const health = new ProjectHealthEngine().getProjectHealth(project);
    const schedule = analyzeSchedule(project);
    const risk = analyzeProjectRisk(project);

    return apiSuccess({
      project,
      health,
      schedule,
      risk,
      evidence: [
        { key: "delivery-signal", source: "OBSERVED", detail: `${project.name} is displaying ${project.progress}% completion with ${schedule.overdueWorkItems} overdue work items.` },
        { key: "operational-linkage", source: "CALCULATED", detail: `${project.linkedIncidentIds.length} linked incidents and ${project.linkedOperationalEntities.length} connected operational entities.` },
        { key: "decision-implication", source: "INFERRED", detail: `${risk.criticalRisks} critical risk paths need explicit owner review before the next delivery checkpoint.` },
      ],
      isSimulated: true,
    });
  } catch (err) {
    return apiError("Failed to fetch project detail", 500, "PROJECT_DETAIL_ERROR", String(err));
  }
}
