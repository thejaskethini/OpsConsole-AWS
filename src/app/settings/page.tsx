"use client";
import { useState } from "react";
import { Settings, Users, Layers, Shield, Building2, ChevronRight, Info } from "lucide-react";
import { useIdentity } from "@/components/identity/IdentityProvider";
import { ALL_ROLES, ALL_PERMISSIONS, getPermissionsForRole } from "@/modules/identity/permissions";
import type { RoleId } from "@/modules/identity/types";

type SettingsTab = "general" | "members" | "roles" | "environments";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "general",      label: "General",           icon: Settings },
  { id: "members",      label: "Members & Roles",   icon: Users },
  { id: "roles",        label: "Roles & Permissions",icon: Shield },
  { id: "environments", label: "Environments",       icon: Layers },
];

const ROLE_COLORS: Record<RoleId, { text: string; bg: string; border: string }> = {
  owner:    { text: "text-violet-300", bg: "bg-violet-500/15", border: "border-violet-500/20" },
  admin:    { text: "text-cyan-300",   bg: "bg-cyan-500/15",   border: "border-cyan-500/20"   },
  operator: { text: "text-amber-300",  bg: "bg-amber-500/15",  border: "border-amber-500/20"  },
  viewer:   { text: "text-slate-300",  bg: "bg-slate-500/15",  border: "border-slate-500/20"  },
};

function ComingSoonBanner({ feature }: { feature: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/15 text-cyan-300/80">
      <Info size={15} className="shrink-0 mt-0.5 text-cyan-400" />
      <div>
        <p className="text-[12px] font-semibold text-cyan-300">{feature}</p>
        <p className="text-[11px] text-cyan-400/60 mt-0.5">This feature will be available in a future release.</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("general");
  const { workspace, environments, roleId, can } = useIdentity();

  const canManageSettings = can("settings:manage");
  const canManageWorkspace = can("workspace:manage");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 pb-4 border-b border-white/[0.04]">
        <div className="w-11 h-11 rounded-2xl bg-slate-500/10 flex items-center justify-center border border-slate-500/20 shadow-lg shadow-black/20">
          <Settings size={20} className="text-slate-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-[11.5px] text-slate-400 mt-0.5">Workspace configuration and platform settings</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-44 shrink-0 space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all text-left cursor-pointer ${
                tab === id
                  ? "bg-gradient-to-r from-cyan-500/[0.12] to-transparent text-white border-l-2 border-cyan-400"
                  : "text-slate-500 hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {tab === "general" && (
            <div className="space-y-4">
              <div className="bg-[#0d1527]/40 border border-white/[0.04] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.04]">
                  <h2 className="text-[13px] font-semibold text-white flex items-center gap-2">
                    <Building2 size={14} className="text-cyan-400" />
                    Workspace
                  </h2>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <label className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Workspace Name</label>
                    <div className="px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[12.5px] text-slate-300">
                      {workspace?.name ?? "—"}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Slug</label>
                    <div className="px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[12.5px] text-slate-400 font-mono">
                      /{workspace?.slug ?? "—"}
                    </div>
                  </div>
                  {!canManageWorkspace && (
                    <p className="text-[10.5px] text-slate-600 flex items-center gap-1.5">
                      <Shield size={10} />
                      Workspace settings can only be modified by the Owner.
                    </p>
                  )}
                  {canManageWorkspace && (
                    <ComingSoonBanner feature="Workspace name and slug editing" />
                  )}
                </div>
              </div>
              {!canManageSettings && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                  <Shield size={13} className="text-amber-400 shrink-0" />
                  <p className="text-[11px] text-amber-400/80">Your role ({roleId}) does not have permission to manage settings.</p>
                </div>
              )}
            </div>
          )}

          {tab === "members" && (
            <div className="space-y-4">
              <ComingSoonBanner feature="Email invitations and member management" />
              <div className="bg-[#0d1527]/40 border border-white/[0.04] rounded-2xl p-5">
                <p className="text-[12px] text-slate-400">
                  Members are currently managed through the deterministic local identity store.
                  Visit the <a href="/members" className="text-cyan-400 hover:underline">Members page</a> to view all workspace members.
                </p>
              </div>
            </div>
          )}

          {tab === "roles" && (
            <div className="space-y-4">
              {ALL_ROLES.map((role) => {
                const colors = ROLE_COLORS[role.id];
                const perms = getPermissionsForRole(role.id);
                return (
                  <div key={role.id} className="bg-[#0d1527]/40 border border-white/[0.04] rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
                          {role.name}
                        </span>
                        <p className="text-[11.5px] text-slate-400">{role.description}</p>
                      </div>
                      <span className="text-[10px] text-slate-600">{perms.length} permissions</span>
                    </div>
                    <div className="px-5 py-3 flex flex-wrap gap-1.5">
                      {ALL_PERMISSIONS.map((p) => {
                        const granted = perms.includes(p.id);
                        return (
                          <span
                            key={p.id}
                            className={`px-2 py-0.5 rounded-md text-[9.5px] font-mono border transition-colors ${
                              granted
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-white/[0.02] text-slate-700 border-white/[0.04]"
                            }`}
                            title={granted ? `${p.id} — granted` : `${p.id} — not granted`}
                          >
                            {p.id}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "environments" && (
            <div className="space-y-4">
              <div className="bg-[#0d1527]/40 border border-white/[0.04] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.04]">
                  <h2 className="text-[13px] font-semibold text-white">Configured Environments</h2>
                </div>
                <div className="divide-y divide-white/[0.03]">
                  {environments.map((env) => (
                    <div key={env.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                      <div>
                        <p className="text-[12.5px] font-semibold text-white">{env.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{env.type} · {env.slug}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {env.awsRegion && (
                          <span className="text-[9.5px] text-slate-500 font-mono px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.04]">
                            {env.awsRegion}
                          </span>
                        )}
                        <ChevronRight size={13} className="text-slate-700" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <ComingSoonBanner feature="Environment creation and management" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
