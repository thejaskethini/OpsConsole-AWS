/**
 * RBAC Permission Constants and Role → Permission Mappings.
 *
 * Roles and permissions are defined statically here.
 * No database required — the mapping is part of the product's domain logic.
 */

import type { Permission, PermissionId, Role, RoleId } from "./types";

// ─── All Permissions ──────────────────────────────────────────────────────────

export const ALL_PERMISSIONS: Permission[] = [
  { id: "dashboard:read",      resource: "dashboard",      action: "read",   description: "View the main dashboard and overview metrics" },
  { id: "infrastructure:read", resource: "infrastructure", action: "read",   description: "View infrastructure topology and resource details" },
  { id: "metrics:read",        resource: "metrics",        action: "read",   description: "View CloudWatch metrics and live metric data" },
  { id: "logs:read",           resource: "logs",           action: "read",   description: "View logs and log streams" },
  { id: "incidents:read",      resource: "incidents",      action: "read",   description: "View incidents and incident history" },
  { id: "incidents:write",     resource: "incidents",      action: "write",  description: "Create and manage incidents" },
  { id: "incidents:manage",    resource: "incidents",      action: "manage", description: "Create, acknowledge, assign, investigate, mitigate, and resolve incidents" },
  { id: "alerts:read",         resource: "alerts",         action: "read",   description: "View alerts and alarm states" },
  { id: "alerts:write",        resource: "alerts",         action: "write",  description: "Create and manage alert rules" },
  { id: "alerts:manage",       resource: "alerts",         action: "manage", description: "Create, edit, acknowledge, resolve, and evaluate alerts and rules" },
  { id: "runbooks:read",       resource: "runbooks",       action: "read",   description: "View runbooks and operational guides" },
  { id: "runbooks:write",      resource: "runbooks",       action: "write",  description: "Create and edit runbooks" },
  { id: "cost:read",           resource: "cost",           action: "read",   description: "View cost monitoring and analysis" },
  { id: "security:read",       resource: "security",       action: "read",   description: "View security posture and IAM analysis" },
  { id: "optimization:read",   resource: "optimization",   action: "read",   description: "View cost optimization findings" },
  { id: "workspace:read",      resource: "workspace",      action: "read",   description: "View workspace details and configuration" },
  { id: "workspace:manage",    resource: "workspace",      action: "manage", description: "Manage workspace settings and configuration" },
  { id: "members:read",        resource: "members",        action: "read",   description: "View workspace members and roles" },
  { id: "members:manage",      resource: "members",        action: "manage", description: "Invite, remove, and update member roles" },
  { id: "settings:manage",     resource: "settings",       action: "manage", description: "Manage workspace settings and integrations" },
  { id: "sre:read",            resource: "sre",            action: "read",   description: "View SRE services, SLOs, golden signals, and reliability health" },
  { id: "sre:manage",          resource: "sre",            action: "manage", description: "Manage SRE services, SLO configurations, and reliability policies" },
  { id: "notifications:read",   resource: "notifications",  action: "read",   description: "View notifications, notification history, rules, and delivery channels" },
  { id: "notifications:manage", resource: "notifications",  action: "manage", description: "Create, edit, toggle, delete notification rules and manage routing preferences" },
];

// ─── All Roles ────────────────────────────────────────────────────────────────

export const ALL_ROLES: Role[] = [
  {
    id: "owner",
    name: "Owner",
    description: "Full control over the workspace including billing and deletion",
  },
  {
    id: "admin",
    name: "Admin",
    description: "Manage members, environments, and all platform resources",
  },
  {
    id: "operator",
    name: "Operator",
    description: "Manage operational workflows: incidents, alerts, and runbooks. Read-only on billing and security",
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access across all dashboard and observability features",
  },
];

// ─── Role → Permission Mapping ────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<RoleId, PermissionId[]> = {
  owner: [
    "dashboard:read",
    "infrastructure:read",
    "metrics:read",
    "logs:read",
    "incidents:read",
    "incidents:write",
    "incidents:manage",
    "alerts:read",
    "alerts:write",
    "alerts:manage",
    "runbooks:read",
    "runbooks:write",
    "cost:read",
    "security:read",
    "optimization:read",
    "workspace:read",
    "workspace:manage",
    "members:read",
    "members:manage",
    "settings:manage",
    "sre:read",
    "sre:manage",
    "notifications:read",
    "notifications:manage",
  ],
  admin: [
    "dashboard:read",
    "infrastructure:read",
    "metrics:read",
    "logs:read",
    "incidents:read",
    "incidents:write",
    "incidents:manage",
    "alerts:read",
    "alerts:write",
    "alerts:manage",
    "runbooks:read",
    "runbooks:write",
    "cost:read",
    "security:read",
    "optimization:read",
    "workspace:read",
    "members:read",
    "members:manage",
    "settings:manage",
    "sre:read",
    "sre:manage",
    "notifications:read",
    "notifications:manage",
  ],
  operator: [
    "dashboard:read",
    "infrastructure:read",
    "metrics:read",
    "logs:read",
    "incidents:read",
    "incidents:write",
    "incidents:manage",
    "alerts:read",
    "alerts:write",
    "alerts:manage",
    "runbooks:read",
    "runbooks:write",
    "cost:read",
    "security:read",
    "optimization:read",
    "workspace:read",
    "members:read",
    "sre:read",
    "sre:manage",
    "notifications:read",
    "notifications:manage",
  ],
  viewer: [
    "dashboard:read",
    "infrastructure:read",
    "metrics:read",
    "logs:read",
    "incidents:read",
    "alerts:read",
    "runbooks:read",
    "cost:read",
    "security:read",
    "optimization:read",
    "workspace:read",
    "members:read",
    "sre:read",
    "notifications:read",
  ],
};

// ─── Public Helpers ───────────────────────────────────────────────────────────

/** Returns all permissions granted to a given role ID. */
export function getPermissionsForRole(roleId: RoleId): PermissionId[] {
  return ROLE_PERMISSIONS[roleId] ?? [];
}

/** Returns true if the given role has the specified permission. */
export function hasPermission(roleId: RoleId, permission: PermissionId): boolean {
  return (ROLE_PERMISSIONS[roleId] ?? []).includes(permission);
}

/** Returns a Role object by its ID. */
export function getRoleById(roleId: RoleId): Role | undefined {
  return ALL_ROLES.find((r) => r.id === roleId);
}

/** Returns a Permission object by its ID. */
export function getPermissionById(permissionId: PermissionId): Permission | undefined {
  return ALL_PERMISSIONS.find((p) => p.id === permissionId);
}
