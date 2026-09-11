"use client";
import React from "react";
import { LucideIcon } from "lucide-react";

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "#06b6d4",
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`glass-card rounded-2xl p-4.5 flex items-center gap-3.5 border border-white/[0.05] hover:border-white/[0.1] transition-all ${className}`}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}14`, border: `1px solid ${color}25` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl font-bold text-white font-mono-brand leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
}
