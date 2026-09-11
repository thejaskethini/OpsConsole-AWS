"use client";
import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, CheckCircle2 } from "lucide-react";
import { useIdentity } from "./IdentityProvider";

export function WorkspaceSwitcher() {
  const { workspace, workspaces, loading } = useIdentity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (loading || !workspace) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div className="w-2 h-2 rounded-full bg-slate-700 animate-pulse" />
        <div className="w-20 h-3 rounded bg-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/20 hover:bg-white/[0.05] transition-all text-[11px] cursor-pointer group"
        aria-label="Switch workspace"
      >
        <Building2 size={11} className="text-cyan-400 shrink-0" />
        <span className="text-slate-300 font-medium truncate max-w-[120px]">{workspace.name}</span>
        <ChevronDown size={10} className={`text-slate-600 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-[#0a0f1a] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 z-[200] overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.04]">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">Workspaces</p>
          </div>
          <div className="py-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => setOpen(false)}
                className={`w-full text-left px-3 py-2.5 text-[11.5px] flex items-center justify-between hover:bg-cyan-500/[0.06] transition-colors cursor-pointer ${
                  ws.id === workspace.id ? "text-cyan-400" : "text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-cyan-500/30 to-violet-500/30 flex items-center justify-center">
                    <Building2 size={10} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-medium leading-none">{ws.name}</p>
                    <p className="text-[9px] text-slate-600 font-mono mt-0.5">{ws.slug}</p>
                  </div>
                </div>
                {ws.id === workspace.id && (
                  <CheckCircle2 size={12} className="text-cyan-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
