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
      className={`rounded-xl p-5 surface-card flex items-start justify-between ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/[0.04]"
          style={{ background: `${color}15` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider truncate">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold text-white font-mono leading-tight mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1 truncate">{sub}</p>}
        </div>
      </div>
      {badge && <div className="shrink-0 ml-2">{badge}</div>}
    </div>
  );
}
