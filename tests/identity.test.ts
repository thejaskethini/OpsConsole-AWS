/**
 * Identity Foundation Tests
 *
 * Tests covering: user retrieval, workspace retrieval, membership,
 * role resolution, permission resolution, authorization helpers,
 * environment resolution, and deterministic demo data.
 *
 * All tests run completely offline — no external services required.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { LocalIdentityRepository, DEFAULT_USER_ID } from "../src/modules/identity/local-store.ts";
import { hasPermission, getPermissionsForRole, getRoleById, ALL_ROLES, ALL_PERMISSIONS } from "../src/modules/identity/permissions.ts";
import { can, requirePermission, requireMembership, getRoleForMember, AuthorizationError } from "../src/modules/identity/authorization.ts";
import { getIdentityRepository } from "../src/modules/identity/index.ts";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const OWNER_USER_ID   = "usr_thejas_001";
const ADMIN_USER_ID   = "usr_alex_002";
const VIEWER_USER_ID  = "usr_priya_003";
const WORKSPACE_ID    = "ws_demo_001";
const WRONG_WS_ID     = "ws_nonexistent_999";

// ─── LocalIdentityRepository ─────────────────────────────────────────────────

describe("LocalIdentityRepository — User Retrieval", () => {
  const repo = new LocalIdentityRepository();

  it("retrieves default user (Thejas) by ID", async () => {
    const user = await repo.getUserById(OWNER_USER_ID);
    assert.ok(user);
    assert.equal(user.id, OWNER_USER_ID);
    assert.equal(user.name, "Thejas");
    assert.equal(user.email, "thejas@opsconsole.dev");
    assert.equal(user.status, "active");
    assert.ok(user.avatarInitials);
  });

  it("retrieves admin user (Alex) by ID", async () => {
    const user = await repo.getUserById(ADMIN_USER_ID);
    assert.ok(user);
    assert.equal(user.name, "Alex Chen");
  });

  it("retrieves viewer user (Priya) by ID", async () => {
    const user = await repo.getUserById(VIEWER_USER_ID);
    assert.ok(user);
    assert.equal(user.name, "Priya Sharma");
  });

  it("returns null for unknown user ID", async () => {
    const user = await repo.getUserById("usr_unknown_999");
    assert.equal(user, null);
  });

  it("retrieves user by email", async () => {
    const user = await repo.getUserByEmail("alex@opsconsole.dev");
    assert.ok(user);
    assert.equal(user.id, ADMIN_USER_ID);
  });

  it("returns null for unknown email", async () => {
    const user = await repo.getUserByEmail("nobody@example.com");
    assert.equal(user, null);
  });

  it("lists all users", async () => {
    const users = await repo.listAllUsers();
    assert.ok(Array.isArray(users));
    assert.ok(users.length >= 3);
  });

  it("returns deterministic data on repeated calls", async () => {
    const a = await repo.getUserById(OWNER_USER_ID);
    const b = await repo.getUserById(OWNER_USER_ID);
    assert.deepEqual(a, b);
  });
});

describe("LocalIdentityRepository — Workspace Retrieval", () => {
  const repo = new LocalIdentityRepository();

  it("retrieves demo workspace by ID", async () => {
    const ws = await repo.getWorkspaceById(WORKSPACE_ID);
    assert.ok(ws);
    assert.equal(ws.id, WORKSPACE_ID);
    assert.equal(ws.name, "OpsConsole Demo");
    assert.equal(ws.slug, "opsconsole-demo");
    assert.equal(ws.status, "active");
  });

  it("retrieves workspace by slug", async () => {
    const ws = await repo.getWorkspaceBySlug("opsconsole-demo");
    assert.ok(ws);
    assert.equal(ws.id, WORKSPACE_ID);
  });

  it("returns null for unknown workspace ID", async () => {
    const ws = await repo.getWorkspaceById(WRONG_WS_ID);
    assert.equal(ws, null);
  });

  it("lists workspaces for user", async () => {
    const workspaces = await repo.listWorkspacesForUser(OWNER_USER_ID);
    assert.ok(Array.isArray(workspaces));
    assert.ok(workspaces.length >= 1);
    assert.ok(workspaces.some((w) => w.id === WORKSPACE_ID));
  });

  it("returns empty list for user with no memberships", async () => {
    const workspaces = await repo.listWorkspacesForUser("usr_unknown_999");
    assert.deepEqual(workspaces, []);
  });
});

describe("LocalIdentityRepository — Membership Lookup", () => {
  const repo = new LocalIdentityRepository();

  it("retrieves owner membership for Thejas", async () => {
    const m = await repo.getMembership(OWNER_USER_ID, WORKSPACE_ID);
    assert.ok(m);
    assert.equal(m.userId, OWNER_USER_ID);
    assert.equal(m.workspaceId, WORKSPACE_ID);
    assert.equal(m.roleId, "owner");
    assert.equal(m.status, "active");
  });

  it("retrieves admin membership for Alex", async () => {
    const m = await repo.getMembership(ADMIN_USER_ID, WORKSPACE_ID);
    assert.ok(m);
    assert.equal(m.roleId, "admin");
  });

  it("retrieves viewer membership for Priya", async () => {
    const m = await repo.getMembership(VIEWER_USER_ID, WORKSPACE_ID);
    assert.ok(m);
    assert.equal(m.roleId, "viewer");
  });

  it("returns null for non-member user", async () => {
    const m = await repo.getMembership("usr_unknown_999", WORKSPACE_ID);
    assert.equal(m, null);
  });

  it("returns null when workspace does not exist", async () => {
    const m = await repo.getMembership(OWNER_USER_ID, WRONG_WS_ID);
    assert.equal(m, null);
  });

  it("retrieves all members of workspace", async () => {
    const members = await repo.getMembersOfWorkspace(WORKSPACE_ID);
    assert.ok(Array.isArray(members));
    assert.ok(members.length >= 3);
    members.forEach((member) => {
      assert.ok(member.user);
      assert.ok(member.membership);
      assert.ok(member.role);
    });
  });
});

describe("LocalIdentityRepository — Environment Resolution", () => {
  const repo = new LocalIdentityRepository();

  it("retrieves environments for demo workspace", async () => {
    const envs = await repo.getEnvironmentsForWorkspace(WORKSPACE_ID);
    assert.ok(Array.isArray(envs));
    assert.ok(envs.length >= 3);
  });

  it("includes Production, Staging, and Development environments", async () => {
    const envs = await repo.getEnvironmentsForWorkspace(WORKSPACE_ID);
    const types = envs.map((e) => e.type);
    assert.ok(types.includes("production"));
    assert.ok(types.includes("staging"));
    assert.ok(types.includes("development"));
  });

  it("each environment has required fields", async () => {
    const envs = await repo.getEnvironmentsForWorkspace(WORKSPACE_ID);
    envs.forEach((env) => {
      assert.ok(env.id);
      assert.ok(env.name);
      assert.ok(env.slug);
      assert.ok(env.type);
      assert.ok(env.workspaceId);
      assert.equal(env.status, "active");
    });
  });

  it("retrieves environment by ID", async () => {
    const envs = await repo.getEnvironmentsForWorkspace(WORKSPACE_ID);
    const first = envs[0];
    const found = await repo.getEnvironmentById(first.id);
    assert.ok(found);
    assert.equal(found.id, first.id);
  });

  it("returns null for unknown environment ID", async () => {
    const env = await repo.getEnvironmentById("env_unknown_999");
    assert.equal(env, null);
  });
});

// ─── RBAC — Permissions ───────────────────────────────────────────────────────

describe("RBAC — Permission Resolution", () => {
  it("owner has all defined permissions", () => {
    const ownerPerms = getPermissionsForRole("owner");
    ALL_PERMISSIONS.forEach((p) => {
      assert.ok(ownerPerms.includes(p.id), `Owner should have permission: ${p.id}`);
    });
  });

  it("viewer has dashboard:read permission", () => {
    assert.equal(hasPermission("viewer", "dashboard:read"), true);
  });

  it("viewer does NOT have workspace:manage permission", () => {
    assert.equal(hasPermission("viewer", "workspace:manage"), false);
  });

  it("viewer does NOT have members:manage permission", () => {
    assert.equal(hasPermission("viewer", "members:manage"), false);
  });

  it("viewer does NOT have settings:manage permission", () => {
    assert.equal(hasPermission("viewer", "settings:manage"), false);
  });

  it("admin has members:manage permission", () => {
    assert.equal(hasPermission("admin", "members:manage"), true);
  });

  it("admin does NOT have workspace:manage permission", () => {
    assert.equal(hasPermission("admin", "workspace:manage"), false);
  });

  it("operator has incidents:write permission", () => {
    assert.equal(hasPermission("operator", "incidents:write"), true);
  });

  it("operator does NOT have workspace:manage permission", () => {
    assert.equal(hasPermission("operator", "workspace:manage"), false);
  });

  it("ALL_ROLES contains owner, admin, operator, viewer", () => {
    const ids = ALL_ROLES.map((r) => r.id);
    assert.ok(ids.includes("owner"));
    assert.ok(ids.includes("admin"));
    assert.ok(ids.includes("operator"));
    assert.ok(ids.includes("viewer"));
  });

  it("getRoleById returns correct role", () => {
    const role = getRoleById("admin");
    assert.ok(role);
    assert.equal(role.id, "admin");
    assert.ok(role.name);
    assert.ok(role.description);
  });
});

// ─── Authorization — can() / requirePermission() ─────────────────────────────

describe("Authorization — can() helper", () => {
  it("owner can manage workspace", async () => {
    const result = await can(OWNER_USER_ID, WORKSPACE_ID, "workspace:manage");
    assert.equal(result, true);
  });

  it("viewer cannot manage workspace", async () => {
    const result = await can(VIEWER_USER_ID, WORKSPACE_ID, "workspace:manage");
    assert.equal(result, false);
  });

  it("viewer can read dashboard", async () => {
    const result = await can(VIEWER_USER_ID, WORKSPACE_ID, "dashboard:read");
    assert.equal(result, true);
  });

  it("viewer cannot manage members", async () => {
    const result = await can(VIEWER_USER_ID, WORKSPACE_ID, "members:manage");
    assert.equal(result, false);
  });

  it("returns false for non-member user regardless of permission", async () => {
    const result = await can("usr_unknown_999", WORKSPACE_ID, "dashboard:read");
    assert.equal(result, false);
  });

  it("returns false when workspace does not exist", async () => {
    const result = await can(OWNER_USER_ID, WRONG_WS_ID, "dashboard:read");
    assert.equal(result, false);
  });
});

describe("Authorization — requirePermission()", () => {
  it("does not throw when owner requires workspace:manage", async () => {
    await assert.doesNotReject(
      async () => requirePermission(OWNER_USER_ID, WORKSPACE_ID, "workspace:manage")
    );
  });

  it("throws AuthorizationError when viewer requires workspace:manage", async () => {
    await assert.rejects(
      async () => requirePermission(VIEWER_USER_ID, WORKSPACE_ID, "workspace:manage"),
      (err) => {
        assert.ok(err instanceof AuthorizationError);
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "AUTHORIZATION_DENIED");
        return true;
      }
    );
  });

  it("throws AuthorizationError for non-member in any workspace", async () => {
    await assert.rejects(
      async () => requirePermission("usr_unknown_999", WORKSPACE_ID, "dashboard:read"),
      (err) => err instanceof AuthorizationError
    );
  });
});

describe("Authorization — requireMembership()", () => {
  it("does not throw for valid member", async () => {
    await assert.doesNotReject(
      async () => requireMembership(OWNER_USER_ID, WORKSPACE_ID)
    );
  });

  it("throws AuthorizationError for non-member", async () => {
    await assert.rejects(
      async () => requireMembership("usr_unknown_999", WORKSPACE_ID),
      (err) => err instanceof AuthorizationError
    );
  });
});

describe("Authorization — getRoleForMember()", () => {
  it("returns owner role for Thejas", async () => {
    const role = await getRoleForMember(OWNER_USER_ID, WORKSPACE_ID);
    assert.equal(role, "owner");
  });

  it("returns admin role for Alex", async () => {
    const role = await getRoleForMember(ADMIN_USER_ID, WORKSPACE_ID);
    assert.equal(role, "admin");
  });

  it("returns viewer role for Priya", async () => {
    const role = await getRoleForMember(VIEWER_USER_ID, WORKSPACE_ID);
    assert.equal(role, "viewer");
  });

  it("returns null for non-member", async () => {
    const role = await getRoleForMember("usr_unknown_999", WORKSPACE_ID);
    assert.equal(role, null);
  });
});

// ─── Identity Repository Factory ─────────────────────────────────────────────

describe("getIdentityRepository() Factory", () => {
  it("returns a singleton repository instance", () => {
    const r1 = getIdentityRepository();
    const r2 = getIdentityRepository();
    assert.equal(r1, r2); // same instance
  });

  it("factory returns an object implementing required methods", () => {
    const repo = getIdentityRepository();
    assert.equal(typeof repo.getUserById, "function");
    assert.equal(typeof repo.getWorkspaceById, "function");
    assert.equal(typeof repo.getMembership, "function");
    assert.equal(typeof repo.getMembersOfWorkspace, "function");
    assert.equal(typeof repo.getEnvironmentsForWorkspace, "function");
  });
});

// ─── Deterministic Data Assertions ───────────────────────────────────────────

describe("Deterministic Demo Identity Data", () => {
  const repo = new LocalIdentityRepository();

  it("DEFAULT_USER_ID is Thejas", async () => {
    const user = await repo.getUserById(DEFAULT_USER_ID);
    assert.ok(user);
    assert.equal(user.name, "Thejas");
  });

  it("data is identical across multiple instantiations", async () => {
    const repo2 = new LocalIdentityRepository();
    const u1 = await repo.getUserById(OWNER_USER_ID);
    const u2 = await repo2.getUserById(OWNER_USER_ID);
    assert.deepEqual(u1, u2);
  });

  it("no random IDs present — IDs are stable constants", async () => {
    const users = await repo.listAllUsers();
    const UUIDPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}/i;
    users.forEach((u) => {
      // IDs should be our deterministic prefixed strings, not random UUIDs
      assert.ok(!UUIDPattern.test(u.id), `ID should not be random UUID: ${u.id}`);
    });
  });
});
