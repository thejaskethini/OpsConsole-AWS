/**
 * GET /api/identity/me
 *
 * Resolves the current user from the authenticated session.
 *
 * Flow: session cookie → userId (ops_user_id cookie or default) → IdentityRepository → User + Workspace + Membership + Role
 *
 * The ops_user_id cookie allows switching between demo users (Thejas/Alex/Priya)
 * without breaking the session authentication. Session proves "authenticated",
 * ops_user_id identifies "which demo user".
 */

import { type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { apiError, apiSuccess } from "@/lib/api";
import { getIdentityRepository, DEFAULT_USER_ID, getPermissionsForRole } from "@/modules/identity";

export const runtime = "nodejs";

const USER_COOKIE = "ops_user_id";

export async function GET(req: NextRequest) {
  // 1. Verify session is valid
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!verifySession(token)) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  // 2. Resolve userId: from ops_user_id cookie (for demo user switching), else default
  const userId = req.cookies.get(USER_COOKIE)?.value || DEFAULT_USER_ID;

  try {
    const repo = getIdentityRepository();

    // 3. Load user
    const user = await repo.getUserById(userId);
    if (!user) {
      return apiError("User not found", 404, "USER_NOT_FOUND");
    }

    // 4. Load workspaces for user
    const workspaces = await repo.listWorkspacesForUser(user.id);
    if (workspaces.length === 0) {
      return apiError("User has no workspace membership", 403, "NO_WORKSPACE");
    }

    // 5. Use first workspace (active workspace selection happens client-side via context)
    const workspace = workspaces[0];
    const membership = await repo.getMembership(user.id, workspace.id);
    if (!membership) {
      return apiError("Membership not found", 403, "NO_MEMBERSHIP");
    }

    const role = await repo.getRoleById(membership.roleId);
    const permissions = getPermissionsForRole(membership.roleId);
    const environments = await repo.getEnvironmentsForWorkspace(workspace.id);

    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarInitials: user.avatarInitials,
        title: user.title,
        status: user.status,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        status: workspace.status,
        createdAt: workspace.createdAt,
      },
      membership: {
        roleId: membership.roleId,
        status: membership.status,
      },
      role: role ? { id: role.id, name: role.name, description: role.description } : null,
      permissions,
      environments,
      workspaces: workspaces.map((w) => ({ id: w.id, name: w.name, slug: w.slug })),
    });
  } catch (err) {
    return apiError("Failed to resolve identity", 500, "IDENTITY_ERROR", String(err));
  }
}
