"use client";
import React from "react";
import { LucideIcon } from "lucide-react";

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  badge?: React.ReactNode;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "#06b6d4",
  badge,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`rounded-2xl p-4.5 bg-[#0a0f1d]/70 backdrop-blur-md flex items-start justify-between border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/[0.04]"
          style={{ background: `${color}12` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider truncate">{label}</p>
          <p className="text-xl font-bold text-white font-mono-brand leading-tight mt-0.5">{value}</p>
          {sub && <p className="text-[11px] text-slate-500 mt-1 truncate">{sub}</p>}
        </div>
      </div>
      {badge && <div className="shrink-0 ml-2">{badge}</div>}
    </div>
  );
}
