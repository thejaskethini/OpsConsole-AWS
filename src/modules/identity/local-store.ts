/**
 * LocalIdentityRepository
 *
 * Deterministic, in-memory identity store for local development.
 * All data is seeded at startup and never changes between calls.
 * No database, no network, no external dependencies.
 *
 * Replace with PostgresIdentityRepository in a future phase
 * without touching domain or UI code.
 */

import type {
  User,
  Workspace,
  Membership,
  Role,
  Environment,
  WorkspaceMember,
} from "./types";
import type { IdentityRepository } from "./repository";
import { ALL_ROLES } from "./permissions";

// ─── Deterministic Seed Data ─────────────────────────────────────────────────

const USERS: User[] = [
  {
    id: "usr_thejas_001",
    email: "thejas@opsconsole.dev",
    name: "Thejas",
    avatarInitials: "TK",
    title: "Cloud Engineer",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "usr_alex_002",
    email: "alex@opsconsole.dev",
    name: "Alex Chen",
    avatarInitials: "AC",
    title: "Platform Admin",
    status: "active",
    createdAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "usr_priya_003",
    email: "priya@opsconsole.dev",
    name: "Priya Sharma",
    avatarInitials: "PS",
    title: "SRE Viewer",
    status: "active",
    createdAt: "2026-02-01T00:00:00Z",
  },
];

const WORKSPACES: Workspace[] = [
  {
    id: "ws_demo_001",
    name: "OpsConsole Demo",
    slug: "opsconsole-demo",
    description: "Default demo workspace for local development",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
  },
];

const MEMBERSHIPS: Membership[] = [
  {
    id: "mem_001",
    userId: "usr_thejas_001",
    workspaceId: "ws_demo_001",
    roleId: "owner",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "mem_002",
    userId: "usr_alex_002",
    workspaceId: "ws_demo_001",
    roleId: "admin",
    status: "active",
    createdAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "mem_003",
    userId: "usr_priya_003",
    workspaceId: "ws_demo_001",
    roleId: "viewer",
    status: "active",
    createdAt: "2026-02-01T00:00:00Z",
  },
];

const ENVIRONMENTS: Environment[] = [
  {
    id: "env_prod_001",
    workspaceId: "ws_demo_001",
    name: "Production",
    slug: "production",
    type: "production",
    status: "active",
    awsRegion: "ap-south-1",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "env_stag_002",
    workspaceId: "ws_demo_001",
    name: "Staging",
    slug: "staging",
    type: "staging",
    status: "active",
    awsRegion: "ap-south-1",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "env_dev_003",
    workspaceId: "ws_demo_001",
    name: "Development",
    slug: "development",
    type: "development",
    status: "active",
    awsRegion: "us-east-1",
    createdAt: "2026-01-01T00:00:00Z",
  },
];

// ─── Default User ID (resolved from session; falls back to demo owner) ────────
/** The userId baked into the demo session. Can be overridden per-request via ops_user_id cookie. */
export const DEFAULT_USER_ID = "usr_thejas_001";

// ─── Implementation ───────────────────────────────────────────────────────────

export class LocalIdentityRepository implements IdentityRepository {
  // ── User ────────────────────────────────────────────────────────────────
  async getUserById(id: string): Promise<User | null> {
    return USERS.find((u) => u.id === id) ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return USERS.find((u) => u.email === email) ?? null;
  }

  async listAllUsers(): Promise<User[]> {
    return [...USERS];
  }

  // ── Workspace ──────────────────────────────────────────────────────────
  async getWorkspaceById(id: string): Promise<Workspace | null> {
    const norm = id === "ws-demo" ? "ws_demo_001" : id === "ws-acme" ? "ws_acme_002" : id;
    return WORKSPACES.find((w) => w.id === norm || w.slug === norm) ?? null;
  }

  async getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
    return WORKSPACES.find((w) => w.slug === slug || w.id === slug) ?? null;
  }

  async listWorkspacesForUser(userId: string): Promise<Workspace[]> {
    const membershipWsIds = MEMBERSHIPS
      .filter((m) => m.userId === userId && m.status === "active")
      .map((m) => m.workspaceId);
    return WORKSPACES.filter((w) => membershipWsIds.includes(w.id));
  }

  // ── Membership ─────────────────────────────────────────────────────────
  async getMembership(userId: string, workspaceId: string): Promise<Membership | null> {
    const norm = workspaceId === "ws-demo" ? "ws_demo_001" : workspaceId === "ws-acme" ? "ws_acme_002" : workspaceId;
    return MEMBERSHIPS.find(
      (m) => m.userId === userId && (m.workspaceId === norm || m.workspaceId === workspaceId) && m.status === "active"
    ) ?? null;
  }

  async getMembershipsForUser(userId: string): Promise<Membership[]> {
    return MEMBERSHIPS.filter((m) => m.userId === userId);
  }

  async getMembersOfWorkspace(workspaceId: string): Promise<WorkspaceMember[]> {
    const norm = workspaceId === "ws-demo" ? "ws_demo_001" : workspaceId;
    const memberships = MEMBERSHIPS.filter(
      (m) => (m.workspaceId === norm || m.workspaceId === workspaceId) && m.status === "active"
    );
    return memberships.flatMap((m) => {
      const user = USERS.find((u) => u.id === m.userId);
      const role = ALL_ROLES.find((r) => r.id === m.roleId);
      if (!user || !role) return [];
      return [{ user, membership: m, role }];
    });
  }

  // ── Role ────────────────────────────────────────────────────────────────
  async getRoleById(id: string): Promise<Role | null> {
    return ALL_ROLES.find((r) => r.id === id) ?? null;
  }

  // ── Environment ─────────────────────────────────────────────────────────
  async getEnvironmentsForWorkspace(workspaceId: string): Promise<Environment[]> {
    const norm = workspaceId === "ws-demo" ? "ws_demo_001" : workspaceId;
    return ENVIRONMENTS.filter(
      (e) => (e.workspaceId === norm || e.workspaceId === workspaceId) && e.status === "active"
    );
  }

  async getEnvironmentById(id: string): Promise<Environment | null> {
    const norm = id === "env-prod" ? "env_prod_001" : id === "env-stag" ? "env_stag_002" : id;
    return ENVIRONMENTS.find((e) => e.id === norm || e.id === id) ?? null;
  }
}
