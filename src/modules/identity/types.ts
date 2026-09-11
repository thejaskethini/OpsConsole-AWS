/**
 * Identity Domain Types
 *
 * Core models for User, Workspace, Membership, Role, Permission, and Environment.
 * These are platform-level types — entirely independent of AWS or cloud provider concepts.
 */

// ─── User ────────────────────────────────────────────────────────────────────

export type UserStatus = "active" | "inactive" | "suspended";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarInitials: string;
  title?: string;
  status: UserStatus;
  createdAt: string; // ISO 8601
}

// ─── Workspace ────────────────────────────────────────────────────────────────

export type WorkspaceStatus = "active" | "suspended" | "archived";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: WorkspaceStatus;
  createdAt: string; // ISO 8601
}

// ─── Role ────────────────────────────────────────────────────────────────────

export type RoleId = "owner" | "admin" | "operator" | "viewer";

export interface Role {
  id: RoleId;
  name: string;
  description: string;
}

// ─── Permission ───────────────────────────────────────────────────────────────

export type PermissionId =
  | "dashboard:read"
  | "infrastructure:read"
  | "metrics:read"
  | "logs:read"
  | "incidents:read"
  | "incidents:write"
  | "alerts:read"
  | "alerts:write"
  | "runbooks:read"
  | "runbooks:write"
  | "cost:read"
  | "security:read"
  | "optimization:read"
  | "workspace:read"
  | "workspace:manage"
  | "members:read"
  | "members:manage"
  | "settings:manage";

export interface Permission {
  id: PermissionId;
  resource: string;
  action: string;
  description: string;
}

// ─── Membership ───────────────────────────────────────────────────────────────

export type MembershipStatus = "active" | "invited" | "suspended";

export interface Membership {
  id: string;
  userId: string;
  workspaceId: string;
  roleId: RoleId;
  status: MembershipStatus;
  createdAt: string; // ISO 8601
}

// ─── Environment ──────────────────────────────────────────────────────────────

export type EnvironmentType = "production" | "staging" | "development" | "preview";
export type EnvironmentStatus = "active" | "archived";

export interface Environment {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  type: EnvironmentType;
  status: EnvironmentStatus;
  awsRegion?: string;
  createdAt: string; // ISO 8601
}

// ─── Resolved / Aggregate Types ───────────────────────────────────────────────

/** Fully resolved member with user details and role for display purposes */
export interface WorkspaceMember {
  user: User;
  membership: Membership;
  role: Role;
}

/** Full identity context for the current session */
export interface IdentityContext {
  user: User;
  workspace: Workspace;
  membership: Membership;
  role: Role;
  permissions: PermissionId[];
  environments: Environment[];
}
