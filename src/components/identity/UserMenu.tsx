"use client";
import { useState, useRef, useEffect } from "react";
import { LogOut, User, Settings, Users, ChevronDown, Shield } from "lucide-react";
import Link from "next/link";
import { useIdentity } from "./IdentityProvider";

const ROLE_BADGE_COLORS: Record<string, string> = {
  owner:    "bg-violet-500/15 text-violet-300 border-violet-500/20",
  admin:    "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  operator: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  viewer:   "bg-slate-500/15 text-slate-300 border-slate-500/20",
};

export function UserMenu() {
  const { user, roleName, roleId, loading } = useIdentity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.reload();
  };

  if (loading || !user) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div className="w-7 h-7 rounded-lg bg-slate-800 animate-pulse" />
        <div className="w-12 h-3 rounded bg-slate-800 animate-pulse" />
      </div>
    );
  }

  const badgeClass = roleId ? (ROLE_BADGE_COLORS[roleId] ?? ROLE_BADGE_COLORS.viewer) : ROLE_BADGE_COLORS.viewer;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all cursor-pointer group"
        aria-label="User menu"
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/40 to-violet-500/40 flex items-center justify-center border border-white/[0.08] shrink-0">
          <span className="text-[10px] font-bold text-white">{user.avatarInitials}</span>
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-[11.5px] font-semibold text-white leading-none">{user.name}</p>
          {user.title && <p className="text-[9.5px] text-slate-500 mt-0.5">{user.title}</p>}
        </div>
        <ChevronDown size={11} className={`text-slate-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-60 bg-[#0a0f1a] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 z-[200] overflow-hidden">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/40 to-violet-500/40 flex items-center justify-center border border-white/[0.08] shrink-0">
                <span className="text-[12px] font-bold text-white">{user.avatarInitials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            {roleName && (
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold border ${badgeClass}`}>
                  <Shield size={8} />
                  {roleName}
                </span>
              </div>
            )}
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/workspace"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[11.5px] text-slate-400 hover:text-white hover:bg-white/[0.03] transition-colors"
            >
              <User size={13} />
              <span>Workspace</span>
            </Link>
            <Link
              href="/members"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[11.5px] text-slate-400 hover:text-white hover:bg-white/[0.03] transition-colors"
            >
              <Users size={13} />
              <span>Members</span>
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[11.5px] text-slate-400 hover:text-white hover:bg-white/[0.03] transition-colors"
            >
              <Settings size={13} />
              <span>Settings</span>
            </Link>
          </div>

          <div className="border-t border-white/[0.04] py-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11.5px] text-slate-500 hover:text-rose-400 hover:bg-rose-500/[0.06] transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
