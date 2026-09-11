"use client";
import { useState, useRef, useEffect } from "react";
import { Layers, ChevronDown, CheckCircle2, Zap, GitBranch, Code2 } from "lucide-react";
import { useIdentity } from "./IdentityProvider";
import type { Environment, EnvironmentType } from "@/modules/identity/types";

const ENV_ICONS: Record<EnvironmentType, React.ElementType> = {
  production: Zap,
  staging: GitBranch,
  development: Code2,
  preview: Layers,
};

const ENV_COLORS: Record<EnvironmentType, { text: string; bg: string; dot: string }> = {
  production: { text: "text-rose-400", bg: "bg-rose-500/10", dot: "bg-rose-400" },
  staging:    { text: "text-amber-400", bg: "bg-amber-500/10", dot: "bg-amber-400" },
  development:{ text: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-400" },
  preview:    { text: "text-violet-400", bg: "bg-violet-500/10", dot: "bg-violet-400" },
};

function EnvBadge({ type, name, compact = false }: { type: EnvironmentType; name: string; compact?: boolean }) {
  const colors = ENV_COLORS[type] ?? ENV_COLORS.development;
  const Icon = ENV_ICONS[type] ?? Layers;
  return (
    <div className={`flex items-center gap-1.5 ${compact ? "px-2 py-1" : "px-2.5 py-1.5"} rounded-lg ${colors.bg} border border-white/[0.04]`}>
      <Icon size={compact ? 10 : 11} className={colors.text} />
      <span className={`${colors.text} font-medium ${compact ? "text-[10px]" : "text-[11px]"}`}>{name}</span>
    </div>
  );
}

export function EnvironmentSwitcher() {
  const { environments, activeEnvironment, setActiveEnvironment, loading } = useIdentity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (env: Environment) => {
    setActiveEnvironment(env);
    setOpen(false);
  };

  if (loading || !activeEnvironment) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div className="w-2 h-2 rounded-full bg-slate-700 animate-pulse" />
        <div className="w-16 h-3 rounded bg-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity"
        aria-label="Switch environment"
      >
        <EnvBadge type={activeEnvironment.type} name={activeEnvironment.name} compact />
        <ChevronDown size={10} className={`text-slate-600 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 w-56 bg-[#0a0f1a] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 z-[200] overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.04]">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">Environments</p>
          </div>
          <div className="py-1">
            {environments.map((env) => (
              <button
                key={env.id}
                onClick={() => handleSelect(env)}
                className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <EnvBadge type={env.type} name={env.name} />
                {env.id === activeEnvironment.id && (
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
