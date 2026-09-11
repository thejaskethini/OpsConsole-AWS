"use client";
/**
 * IdentityProvider
 *
 * React context that holds the current user, active workspace,
 * active environment, and derived permissions.
 *
 * Data is fetched from /api/identity/me after authentication.
 * Active environment is managed client-side with localStorage persistence.
 *
 * Architecture:
 *   Session (auth) → /api/identity/me → IdentityContext → UI components
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Environment, PermissionId, RoleId } from "@/modules/identity/types";

// ─── Context Shape ─────────────────────────────────────────────────────────────

interface IdentityUser {
  id: string;
  email: string;
  name: string;
  avatarInitials: string;
  title?: string;
  status: string;
}

interface IdentityWorkspace {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt?: string;
}

export interface IdentityContextValue {
  // Auth state
  loading: boolean;
  error: string | null;

  // Resolved identity
  user: IdentityUser | null;
  workspace: IdentityWorkspace | null;
  workspaces: IdentityWorkspace[];
  roleId: RoleId | null;
  roleName: string | null;
  permissions: PermissionId[];

  // Environment — client-side state, persisted in localStorage
  environments: Environment[];
  activeEnvironment: Environment | null;
  setActiveEnvironment: (env: Environment) => void;

  // Authorization helper (client-side convenience — server routes must re-validate)
  can: (permission: PermissionId) => boolean;

  // Refresh identity from server
  refresh: () => void;
}

const defaultContextValue: IdentityContextValue = {
  loading: true,
  error: null,
  user: null,
  workspace: null,
  workspaces: [],
  roleId: null,
  roleName: null,
  permissions: [],
  environments: [],
  activeEnvironment: null,
  setActiveEnvironment: () => {},
  can: () => false,
  refresh: () => {},
};

const IdentityCtx = createContext<IdentityContextValue>(defaultContextValue);

// ─── Provider ─────────────────────────────────────────────────────────────────

const ENV_STORAGE_KEY = "opsconsole:active_env_id";

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<IdentityUser | null>(null);
  const [workspace, setWorkspace] = useState<IdentityWorkspace | null>(null);
  const [workspaces, setWorkspaces] = useState<IdentityWorkspace[]>([]);
  const [roleId, setRoleId] = useState<RoleId | null>(null);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionId[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvironment, setActiveEnvironmentState] = useState<Environment | null>(null);

  const loadIdentity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/identity/me", { credentials: "same-origin" });
      if (!res.ok) {
        setError("Failed to load identity");
        return;
      }
      const data = await res.json();
      setUser(data.user ?? null);
      setWorkspace(data.workspace ?? null);
      setWorkspaces(data.workspaces ?? []);
      setRoleId(data.membership?.roleId ?? null);
      setRoleName(data.role?.name ?? null);
      setPermissions(data.permissions ?? []);
      const envs: Environment[] = data.environments ?? [];
      setEnvironments(envs);

      // Restore active environment from localStorage, or default to first
      if (envs.length > 0) {
        const stored = typeof window !== "undefined"
          ? localStorage.getItem(ENV_STORAGE_KEY)
          : null;
        const restored = stored ? envs.find((e) => e.id === stored) : null;
        setActiveEnvironmentState(restored ?? envs[0]);
      }
    } catch {
      setError("Network error loading identity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  const setActiveEnvironment = useCallback((env: Environment) => {
    setActiveEnvironmentState(env);
    if (typeof window !== "undefined") {
      localStorage.setItem(ENV_STORAGE_KEY, env.id);
    }
  }, []);

  const can = useCallback(
    (permission: PermissionId) => permissions.includes(permission),
    [permissions]
  );

  return (
    <IdentityCtx.Provider
      value={{
        loading,
        error,
        user,
        workspace,
        workspaces,
        roleId,
        roleName,
        permissions,
        environments,
        activeEnvironment,
        setActiveEnvironment,
        can,
        refresh: loadIdentity,
      }}
    >
      {children}
    </IdentityCtx.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useIdentity() {
  return useContext(IdentityCtx);
}
