"use client";
import { useState, useEffect } from "react";
import {
  Shield, RefreshCw, Loader, AlertTriangle, CheckCircle,
  ChevronDown, Users, Lock, Globe, Filter, XCircle, Info, KeyRound, AlertOctagon,
} from "lucide-react";
import { useRegion } from "@/components/RegionProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface SG {
  GroupId: string; GroupName: string; VpcId: string; VpcName: string;
  Description: string; OpenToInternet: boolean; OpenPorts: (number | null)[];
  Severity: "CRITICAL" | "HIGH" | "MEDIUM"; InboundRules: number;
}
interface VPC { VpcId: string; CidrBlock: string; IsDefault: boolean; State: string; Name: string; }
interface PolicyItem { name: string; type: "inline" | "managed" | "group"; severity: "ADMIN" | "POWER" | "ELEVATED"; }
interface IAMUser {
  UserName: string; UserId: string; CreateDate: string;
  PasswordLastUsed: string | null; IsHighPriv: boolean;
  TopSeverity: "ADMIN" | "POWER" | "ELEVATED" | null;
  Policies: PolicyItem[];
}
interface Summary {
  totalSGs: number; riskySGs: number; criticalSGs: number; highSGs: number;
  mediumSGs: number; totalVpcs: number; adminUsers: number; powerUsers: number;
}

/* ── Severity Pill ─────────────────────────────────────────────────────── */
function SeverityBadge({ level }: { level: "CRITICAL" | "HIGH" | "MEDIUM" | "ADMIN" | "POWER" | "ELEVATED" }) {
  const map = {
    CRITICAL: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    HIGH:     "bg-orange-500/15 text-orange-400 border-orange-500/30",
    MEDIUM:   "bg-amber-500/15 text-amber-400 border-amber-500/30",
    ADMIN:    "bg-rose-500/15 text-rose-400 border-rose-500/30",
    POWER:    "bg-orange-500/15 text-orange-400 border-orange-500/30",
    ELEVATED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${map[level]}`}>
      {level === "CRITICAL" || level === "ADMIN" ? <XCircle size={10} /> : <AlertTriangle size={10} />}
      {level}
    </span>
  );
}

/* ── Port Badge ─────────────────────────────────────────────────────────── */
function PortBadge({ port }: { port: number | null }) {
  const label = port === null ? "ALL" : String(port);
  const criticalPorts = [22, 3389, 3306, 5432, 27017, 6379, 2181];
  const highPorts = [80, 443, 8080, 8443];
  const color = port === null || criticalPorts.includes(port ?? -1)
    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
    : highPorts.includes(port ?? -1)
    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
    : "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${color}`}>{label}</span>
  );
}

/* ── Dropdown ───────────────────────────────────────────────────────────── */
function Dropdown<T extends string>({
  value, options, onChange, label,
}: { value: T; options: { label: string; value: T }[]; onChange: (v: T) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-xs text-slate-300 font-medium transition-all"
      >
        <Filter size={12} className="text-slate-400" />
        <span>{label}: <span className="text-cyan-400 font-semibold">{current?.label}</span></span>
        <ChevronDown size={12} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 right-0 w-44 surface-card border border-white/[0.08] rounded-xl shadow-2xl z-50 overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2 text-xs hover:bg-white/[0.04] transition-colors ${opt.value === value ? "text-cyan-400 bg-cyan-500/[0.08] font-semibold" : "text-slate-400"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────── */
type SeverityFilter = "ALL" | "CRITICAL" | "HIGH" | "MEDIUM";
type PrivFilter = "ALL" | "ADMIN" | "POWER" | "ELEVATED";

export default function SecurityPage() {
  const { region } = useRegion();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sgFilter, setSgFilter] = useState<SeverityFilter>("ALL");
  const [privFilter, setPrivFilter] = useState<PrivFilter>("ALL");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/security?region=${region}`);
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [region]);

  const riskyGroups = (data?.riskyGroups as SG[]) || [];
  const allSgs = (data?.securityGroups as SG[]) || [];
  const vpcs = (data?.vpcs as VPC[]) || [];
  const iamSummary = (data?.iamSummary as Record<string, unknown>) || {};
  const summary = (data?.summary as Summary) || {} as Summary;
  const highPrivUsers = (data?.highPrivUsers as IAMUser[]) || [];

  const filteredRisky = sgFilter === "ALL"
    ? riskyGroups
    : riskyGroups.filter((sg) => sg.Severity === sgFilter);

  const filteredPrivUsers = privFilter === "ALL"
    ? highPrivUsers
    : highPrivUsers.filter((u) => u.TopSeverity === privFilter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Shield}
        title="Security & IAM Governance"
        subtitle={`Security groups posture, open internet ingress rules, and high-privilege IAM credentials — region: ${region}`}
        iconColor="#f43f5e"
        iconBgColor="rgba(244, 63, 94, 0.1)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Security Substrate
          </span>
        }
        actions={
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-xs font-semibold text-slate-200 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={Shield} label="Total SGs" value={summary.totalSGs ?? 0} color="#06b6d4" />
        <StatCard icon={AlertTriangle} label="Open to 0.0.0.0/0" value={summary.riskySGs ?? 0} color="#f43f5e" sub="Internet exposed" />
        <StatCard icon={XCircle} label="Critical SGs" value={summary.criticalSGs ?? 0} color="#f43f5e" sub="SSH/DB ports" />
        <StatCard icon={AlertOctagon} label="High SGs" value={summary.highSGs ?? 0} color="#f97316" sub="HTTP/S open" />
        <StatCard icon={Globe} label="VPCs" value={summary.totalVpcs ?? 0} color="#8b5cf6" />
        <StatCard icon={Lock} label="Admin Users" value={summary.adminUsers ?? 0} color="#f43f5e" sub="Full access" />
        <StatCard icon={Users} label="Power Users" value={summary.powerUsers ?? 0} color="#f97316" sub="Elevated access" />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-400 surface-card rounded-xl">
          <Loader size={18} className="animate-spin text-cyan-400" />
          <span className="text-xs">Scanning security posture and ingress permissions…</span>
        </div>
      )}
      {error && (
        <div className="surface-card border border-rose-500/20 text-rose-400 rounded-xl p-4 text-xs flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Risky Security Groups ─────────────────────────────────── */}
          <div className="surface-card rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <AlertTriangle size={14} className="text-rose-400" />
                </div>
                Risky Security Groups
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-semibold">{filteredRisky.length}</span>
              </h2>
              <Dropdown<SeverityFilter>
                value={sgFilter}
                label="Severity"
                onChange={setSgFilter}
                options={[
                  { label: "All", value: "ALL" },
                  { label: "Critical", value: "CRITICAL" },
                  { label: "High", value: "HIGH" },
                  { label: "Medium", value: "MEDIUM" },
                ]}
              />
            </div>

            {filteredRisky.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle size={24} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-emerald-400 text-xs font-semibold">
                  {sgFilter === "ALL" ? "No security groups open to 0.0.0.0/0" : `No ${sgFilter} severity groups`}
                </p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                    {["Severity", "Group Name", "Group ID", "VPC", "Open Ports", "Rules"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-slate-400 font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredRisky.map((sg, i) => (
                    <tr key={i} className={`hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                      <td className="px-4 py-3.5"><SeverityBadge level={sg.Severity} /></td>
                      <td className="px-4 py-3.5 text-xs text-white font-semibold">{sg.GroupName}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">{sg.GroupId}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-300 font-mono">{sg.VpcName || sg.VpcId || "—"}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {(sg.OpenPorts as (number | null)[]).slice(0, 6).map((p, pi) => (
                            <PortBadge key={pi} port={p} />
                          ))}
                          {sg.OpenPorts.length > 6 && (
                            <span className="text-[10px] text-slate-500">+{sg.OpenPorts.length - 6}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-300 font-mono">{sg.InboundRules}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── High Privilege IAM Users ──────────────────────────────── */}
          <div className="surface-card rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Lock size={14} className="text-amber-400" />
                </div>
                High Privilege IAM Users
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold">{filteredPrivUsers.length}</span>
              </h2>
              <Dropdown<PrivFilter>
                value={privFilter}
                label="Access Level"
                onChange={setPrivFilter}
                options={[
                  { label: "All", value: "ALL" },
                  { label: "Admin", value: "ADMIN" },
                  { label: "Power", value: "POWER" },
                  { label: "Elevated", value: "ELEVATED" },
                ]}
              />
            </div>

            {highPrivUsers.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle size={24} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-emerald-400 text-xs font-semibold">No high-privilege users detected</p>
                <p className="text-xs text-slate-400 mt-1">IAM permissions may be restricted — check roles for elevated access.</p>
              </div>
            ) : filteredPrivUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No users matching &quot;{privFilter}&quot; filter.</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {filteredPrivUsers.map((u) => (
                  <div key={u.UserName} className="hover:bg-white/[0.02] transition-colors">
                    <button
                      onClick={() => setExpandedUser(expandedUser === u.UserName ? null : u.UserName)}
                      className="w-full flex items-center gap-4 px-5 py-3.5 text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                        <Users size={14} className={u.TopSeverity === "ADMIN" ? "text-rose-400" : "text-amber-400"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-semibold">{u.UserName}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{u.UserId}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {u.TopSeverity && <SeverityBadge level={u.TopSeverity} />}
                        <span className="text-xs text-slate-400">{u.Policies.length} policies</span>
                        <span className="text-xs text-slate-400">
                          Last: {u.PasswordLastUsed
                            ? new Date(u.PasswordLastUsed).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                            : "Never"}
                        </span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${expandedUser === u.UserName ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {expandedUser === u.UserName && u.Policies.length > 0 && (
                      <div className="px-5 pb-4 ml-12">
                        <div className="grid grid-cols-1 gap-2">
                          {u.Policies.map((p, pi) => (
                            <div key={pi} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] rounded-lg px-3.5 py-2">
                              <SeverityBadge level={p.severity} />
                              <span className="text-xs text-slate-200 font-medium flex-1">{p.name}</span>
                              <span className="text-[10px] text-slate-400 capitalize border border-white/[0.06] px-2 py-0.5 rounded">{p.type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── VPCs ───────────────────────────────────────────────── */}
            <div className="surface-card rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Globe size={14} className="text-purple-400" />
                  </div>
                  VPC Subnets
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-semibold">{vpcs.length}</span>
                </h2>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {vpcs.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-semibold">{v.Name || v.VpcId}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{v.VpcId} · {v.CidrBlock}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {v.IsDefault && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">Default</span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${v.State === "available" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>{v.State}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── IAM Account Summary ────────────────────────────────── */}
            <div className="surface-card rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Users size={14} className="text-cyan-400" />
                  </div>
                  IAM Governance Summary
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-0 divide-x divide-y divide-white/[0.06]">
                {[
                  { label: "Users", value: iamSummary.Users, icon: Users, color: "#06b6d4" },
                  { label: "Groups", value: iamSummary.Groups, icon: Users, color: "#8b5cf6" },
                  { label: "Roles", value: iamSummary.Roles, icon: Shield, color: "#f97316" },
                  { label: "Policies", value: iamSummary.Policies, icon: Info, color: "#10b981" },
                  { label: "MFA Devices", value: iamSummary.MFADevices, icon: Lock, color: "#06b6d4" },
                  { label: "Account MFA", value: iamSummary.AccountMFAEnabled ? "Enabled" : "Disabled", icon: KeyRound, color: iamSummary.AccountMFAEnabled ? "#10b981" : "#f43f5e" },
                ].map((item, i) => (
                  <div key={i} className="p-4 flex flex-col items-center text-center hover:bg-white/[0.02] transition-colors">
                    <p className="text-xl font-bold text-white font-mono">{item.value != null ? String(item.value) : "—"}</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── All Security Groups ─────────────────────────────────────── */}
          <div className="surface-card rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-500/10 flex items-center justify-center">
                  <Shield size={14} className="text-slate-400" />
                </div>
                All Security Groups
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 font-semibold">{allSgs.length}</span>
              </h2>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
              {allSgs.map((sg, i) => (
                <div key={i} className={`flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors ${sg.OpenToInternet ? "bg-rose-500/[0.03]" : ""}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${sg.OpenToInternet ? "bg-rose-400" : "bg-emerald-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium">{sg.GroupName}</p>
                    <p className="text-xs text-slate-400 font-mono">{sg.GroupId} · {sg.VpcName || sg.VpcId}</p>
                  </div>
                  {sg.OpenToInternet && <SeverityBadge level={sg.Severity} />}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
