/**
 * Identity Module Entry Point
 *
 * Returns the configured IdentityRepository implementation.
 * Currently uses LocalIdentityRepository for offline/local development.
 * Future: swap to PostgresIdentityRepository without touching domain or UI code.
 */

import type { IdentityRepository } from "./repository";
import { LocalIdentityRepository } from "./local-store";

// Singleton — one instance per server lifecycle
let _repo: IdentityRepository | null = null;

export function getIdentityRepository(): IdentityRepository {
  if (!_repo) {
    _repo = new LocalIdentityRepository();
  }
  return _repo;
}

// Re-export types and key helpers for convenient imports
export type { IdentityRepository } from "./repository";
export type {
  User,
  Workspace,
  Membership,
  Role,
  Permission,
  Environment,
  WorkspaceMember,
  IdentityContext,
  RoleId,
  PermissionId,
  UserStatus,
  WorkspaceStatus,
  MembershipStatus,
  EnvironmentType,
  EnvironmentStatus,
} from "./types";
export { ALL_ROLES, ALL_PERMISSIONS, getPermissionsForRole, hasPermission, getRoleById } from "./permissions";
export { can, requirePermission, requireMembership, getRoleForMember, AuthorizationError } from "./authorization";
export { DEFAULT_USER_ID } from "./local-store";
