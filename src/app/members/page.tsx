"use client";
import { useState, useEffect } from "react";
import { Users, Shield, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";

interface MemberRow {
  user: { id: string; name: string; email: string; avatarInitials: string; title?: string; status: string };
  roleId: string;
  roleName: string;
  status: string;
  joinedAt: string;
}

const ROLE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  owner:    { text: "text-violet-300", bg: "bg-violet-500/15", border: "border-violet-500/20" },
  admin:    { text: "text-cyan-300",   bg: "bg-cyan-500/15",   border: "border-cyan-500/20"   },
  operator: { text: "text-amber-300",  bg: "bg-amber-500/15",  border: "border-amber-500/20"  },
  viewer:   { text: "text-slate-300",  bg: "bg-slate-500/15",  border: "border-slate-500/20"  },
};

export default function MembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/identity/workspace", { credentials: "same-origin" })
      .then(r => r.json())
      .then(d => {
        if (d.members) setMembers(d.members);
        else setError("Failed to load members");
      })
      .catch(() => setError("Network error loading members"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 pb-4 border-b border-white/[0.04]">
        <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-lg shadow-black/20">
          <Users size={20} className="text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Members</h1>
          <p className="text-[11.5px] text-slate-400 mt-0.5">Team members and their roles in this workspace</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px] text-slate-500">
          <Loader2 size={22} className="animate-spin text-cyan-400" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      ) : (
        <div className="bg-[#0d1527]/40 border border-white/[0.04] rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_180px_120px_100px] px-5 py-2.5 border-b border-white/[0.04] bg-white/[0.02]">
            {["Member", "Role", "Status", "Joined"].map((h) => (
              <span key={h} className="text-[9.5px] font-bold uppercase tracking-[0.15em] text-slate-600">{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.03]">
            {members.map(({ user, roleId, roleName, status, joinedAt }) => {
              const roleColor = ROLE_COLORS[roleId] ?? ROLE_COLORS.viewer;
              return (
                <div
                  key={user.id}
                  className="grid grid-cols-[1fr_180px_120px_100px] px-5 py-4 items-center hover:bg-white/[0.01] transition-colors"
                >
                  {/* Member info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 flex items-center justify-center border border-white/[0.08] shrink-0">
                      <span className="text-[11px] font-bold text-white">{user.avatarInitials}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                      {user.title && (
                        <p className="text-[9.5px] text-slate-600 truncate">{user.title}</p>
                      )}
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold border ${roleColor.bg} ${roleColor.text} ${roleColor.border}`}>
                      <Shield size={9} />
                      {roleName}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    {status === "active" ? (
                      <span className="inline-flex items-center gap-1.5 text-[10.5px] text-emerald-400 font-medium">
                        <CheckCircle2 size={12} />
                        Active
                      </span>
                    ) : (
                      <span className="text-[10.5px] text-slate-500 capitalize">{status}</span>
                    )}
                  </div>

                  {/* Joined */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Clock size={10} />
                    <span>{new Date(joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/[0.04] bg-white/[0.01]">
            <p className="text-[10px] text-slate-600">
              {members.length} member{members.length !== 1 ? "s" : ""} · Email invitations available in a future release
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
