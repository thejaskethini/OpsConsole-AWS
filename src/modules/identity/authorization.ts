/**
 * Centralized Authorization Layer
 *
 * Answers the questions:
 *   - Does this user have membership in this workspace?
 *   - Does their role grant this permission?
 *   - Should this operation be allowed?
 *
 * All authorization is server-side. Never trust client-supplied roles.
 * UI components may use the pre-resolved IdentityContext, but server routes
 * must call these functions directly against the repository.
 */

import type { PermissionId, RoleId } from "./types";
import { hasPermission as roleHasPermission, getPermissionsForRole } from "./permissions";
import { getIdentityRepository } from "./index";

// ─── Public Authorization API ─────────────────────────────────────────────────

/**
 * Returns true if the user is a member of the workspace AND their role
 * grants the specified permission.
 *
 * This is the primary authorization check for all server-side operations.
 */
export async function can(
  userId: string,
  workspaceId: string,
  permission: PermissionId
): Promise<boolean> {
  const repo = getIdentityRepository();
  const membership = await repo.getMembership(userId, workspaceId);
  if (!membership) return false;
  return roleHasPermission(membership.roleId, permission);
}

/**
 * Pure, synchronous permission check given a roleId.
 * Use this when you already have the resolved role (e.g. from IdentityContext).
 * Re-exported from permissions.ts for convenience.
 */
export { roleHasPermission as hasPermission };

/**
 * Returns the full list of permission IDs granted to a role.
 * Re-exported for convenience.
 */
export { getPermissionsForRole };

/**
 * Server-side authorization guard.
 * Throws a structured error if the user lacks the required permission.
 * Use in API route handlers before any protected operation.
 *
 * @throws {AuthorizationError} if access is denied
 */
export async function requirePermission(
  userId: string,
  workspaceId: string,
  permission: PermissionId
): Promise<void> {
  const allowed = await can(userId, workspaceId, permission);
  if (!allowed) {
    throw new AuthorizationError(
      `Permission denied: ${permission} is not granted to user ${userId} in workspace ${workspaceId}`
    );
  }
}

/**
 * Returns the roleId for a user in a workspace, or null if not a member.
 */
export async function getRoleForMember(
  userId: string,
  workspaceId: string
): Promise<RoleId | null> {
  const repo = getIdentityRepository();
  const membership = await repo.getMembership(userId, workspaceId);
  return membership?.roleId ?? null;
}

/**
 * Validates that a user is a member of a workspace.
 * Throws AuthorizationError if not.
 */
export async function requireMembership(
  userId: string,
  workspaceId: string
): Promise<void> {
  const repo = getIdentityRepository();
  const membership = await repo.getMembership(userId, workspaceId);
  if (!membership) {
    throw new AuthorizationError(
      `User ${userId} is not a member of workspace ${workspaceId}`
    );
  }
}

// ─── AuthorizationError ───────────────────────────────────────────────────────

export class AuthorizationError extends Error {
  readonly statusCode = 403;
  readonly code = "AUTHORIZATION_DENIED";

  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}
