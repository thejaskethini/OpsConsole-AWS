/**
 * IdentityRepository Interface
 *
 * Abstracts all identity storage access. Domain and UI code should depend only
 * on this interface. The concrete implementation (LocalIdentityRepository, future
 * PostgresIdentityRepository) is selected by the factory in index.ts.
 */

import type {
  User,
  Workspace,
  Membership,
  Role,
  Environment,
  WorkspaceMember,
} from "./types";

export interface IdentityRepository {
  // ── User ──────────────────────────────────────────────────────────────────
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  listAllUsers(): Promise<User[]>;

  // ── Workspace ─────────────────────────────────────────────────────────────
  getWorkspaceById(id: string): Promise<Workspace | null>;
  getWorkspaceBySlug(slug: string): Promise<Workspace | null>;
  listWorkspacesForUser(userId: string): Promise<Workspace[]>;

  // ── Membership ────────────────────────────────────────────────────────────
  getMembership(userId: string, workspaceId: string): Promise<Membership | null>;
  getMembershipsForUser(userId: string): Promise<Membership[]>;
  getMembersOfWorkspace(workspaceId: string): Promise<WorkspaceMember[]>;

  // ── Role ──────────────────────────────────────────────────────────────────
  getRoleById(id: string): Promise<Role | null>;

  // ── Environment ───────────────────────────────────────────────────────────
  getEnvironmentsForWorkspace(workspaceId: string): Promise<Environment[]>;
  getEnvironmentById(id: string): Promise<Environment | null>;
}
