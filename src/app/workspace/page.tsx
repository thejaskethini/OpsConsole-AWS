"use client";
import { Building2, Users, Globe, Layers, Shield, CheckCircle2, Clock, Zap, GitBranch, Code2 } from "lucide-react";
import { useIdentity } from "@/components/identity/IdentityProvider";
import type { EnvironmentType } from "@/modules/identity/types";

const ENV_ICONS: Record<EnvironmentType, React.ElementType> = {
  production: Zap,
  staging: GitBranch,
  development: Code2,
  preview: Layers,
};

const ENV_COLORS: Record<EnvironmentType, { text: string; bg: string; border: string; dot: string }> = {
  production: { text: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20",    dot: "bg-rose-400"    },
  staging:    { text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   dot: "bg-amber-400"   },
  development:{ text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  preview:    { text: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20",  dot: "bg-violet-400"  },
};

const ROLE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  owner:    { text: "text-violet-300", bg: "bg-violet-500/15", border: "border-violet-500/20" },
  admin:    { text: "text-cyan-300",   bg: "bg-cyan-500/15",   border: "border-cyan-500/20"   },
  operator: { text: "text-amber-300",  bg: "bg-amber-500/15",  border: "border-amber-500/20"  },
  viewer:   { text: "text-slate-300",  bg: "bg-slate-500/15",  border: "border-slate-500/20"  },
};

export default function WorkspacePage() {
  const { workspace, user, roleId, roleName, environments, loading, error } = useIdentity();

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <div className="text-slate-500 text-sm">Loading workspace…</div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="p-8 text-rose-400 text-sm">
        {error ?? "Failed to load workspace"}
      </div>
    );
  }

  const roleColor = roleId ? (ROLE_COLORS[roleId] ?? ROLE_COLORS.viewer) : ROLE_COLORS.viewer;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center border border-white/[0.06] shadow-lg">
            <Building2 size={22} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">{workspace.name}</h1>
            <p className="text-[11.5px] text-slate-500 mt-0.5 font-mono">/{workspace.slug}</p>
          </div>
        </div>
        {roleId && (
          <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11.5px] font-semibold border ${roleColor.bg} ${roleColor.text} ${roleColor.border}`}>
            <Shield size={12} />
            {roleName ?? roleId}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Users,  label: "Total Members",  value: "3" },
          { icon: Layers, label: "Environments",   value: String(environments.length) },
          { icon: Globe,  label: "Status",          value: workspace.status },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-[#0d1527]/60 border border-white/[0.04] rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Icon size={13} />
              <span className="text-[10.5px] font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-bold text-white capitalize">{value}</p>
          </div>
        ))}
      </div>

      {/* Environments */}
      <div className="bg-[#0d1527]/40 border border-white/[0.04] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.04]">
          <h2 className="text-[13px] font-semibold text-white flex items-center gap-2">
            <Layers size={14} className="text-cyan-400" />
            Environments
          </h2>
        </div>
        <div className="divide-y divide-white/[0.03]">
          {environments.map((env) => {
            const colors = ENV_COLORS[env.type] ?? ENV_COLORS.development;
            const Icon = ENV_ICONS[env.type] ?? Layers;
            return (
              <div key={env.id} className="px-5 py-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg} border ${colors.border}`}>
                    <Icon size={14} className={colors.text} />
                  </div>
                  <div>
                    <p className="text-[12.5px] font-semibold text-white">{env.name}</p>
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">{env.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {env.awsRegion && (
                    <span className="text-[10px] text-slate-500 font-mono px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.04]">
                      {env.awsRegion}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className={`relative flex h-1.5 w-1.5`}>
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.dot} opacity-75`} />
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${colors.dot}`} />
                    </span>
                    <span className={`text-[10px] font-medium ${colors.text} capitalize`}>{env.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workspace metadata */}
      <div className="bg-[#0d1527]/40 border border-white/[0.04] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.04]">
          <h2 className="text-[13px] font-semibold text-white flex items-center gap-2">
            <Building2 size={14} className="text-cyan-400" />
            Workspace Details
          </h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          {[
            { label: "Workspace Name", value: workspace.name },
            { label: "Slug", value: `/${workspace.slug}`, mono: true },
            { label: "Status", value: workspace.status },
            { label: "Your Role", value: roleName ?? roleId ?? "—" },
            { label: "Your Account", value: user?.email ?? "—", mono: true },
          ].map(({ label, value, mono }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
              <span className="text-[11.5px] text-slate-500">{label}</span>
              <span className={`text-[11.5px] font-medium text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Created at */}
      <div className="flex items-center gap-2 text-[10.5px] text-slate-600">
        <Clock size={11} />
        <span>Workspace created {new Date(workspace.createdAt ?? "").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
        {workspace.status === "active" && <CheckCircle2 size={11} className="text-emerald-500 ml-1" />}
      </div>
    </div>
  );
}
