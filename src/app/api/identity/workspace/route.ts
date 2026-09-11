/**
 * GET /api/identity/workspace
 *
 * Returns the active workspace details, including members and environments.
 * Validates server-side that the requester is a member of the workspace.
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { getIdentityRepository, DEFAULT_USER_ID, getPermissionsForRole } from "@/modules/identity";
import { requireMembership, AuthorizationError } from "@/modules/identity/authorization";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";

export async function GET(req: NextRequest) {
  // 1. Verify session
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;

  // 2. Workspace slug from query param, or resolve from user's first workspace
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  try {
    const repo = getIdentityRepository();

    // 3. Resolve workspace
    let workspace;
    if (slug) {
      workspace = await repo.getWorkspaceBySlug(slug);
      if (!workspace) return apiError("Workspace not found", 404, "NOT_FOUND");
    } else {
      const workspaces = await repo.listWorkspacesForUser(userId);
      workspace = workspaces[0] ?? null;
      if (!workspace) return apiError("No workspace found for user", 404, "NOT_FOUND");
    }

    // 4. Server-side membership validation — never trust client workspace ID
    await requireMembership(userId, workspace.id);

    const membership = await repo.getMembership(userId, workspace.id);
    if (!membership) return apiError("Membership not found", 403, "NO_MEMBERSHIP");

    const role = await repo.getRoleById(membership.roleId);
    const permissions = getPermissionsForRole(membership.roleId);
    const members = await repo.getMembersOfWorkspace(workspace.id);
    const environments = await repo.getEnvironmentsForWorkspace(workspace.id);

    return apiSuccess({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        status: workspace.status,
        createdAt: workspace.createdAt,
      },
      currentMembership: {
        roleId: membership.roleId,
        status: membership.status,
        createdAt: membership.createdAt,
      },
      role: role ? { id: role.id, name: role.name, description: role.description } : null,
      permissions,
      members: members.map(({ user, membership: m, role: r }) => ({
        user: { id: user.id, name: user.name, email: user.email, avatarInitials: user.avatarInitials, title: user.title, status: user.status },
        roleId: m.roleId,
        roleName: r.name,
        status: m.status,
        joinedAt: m.createdAt,
      })),
      environments,
    });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return apiError(err.message, 403, err.code);
    }
    return apiError("Failed to load workspace", 500, "WORKSPACE_ERROR", String(err));
  }
}
