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
  color = "#38bdf8",
  badge,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`relative group rounded-2xl p-5 surface-card overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Top accent glow line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-70 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />

      {/* Subtle ambient radial glow behind icon */}
      <div
        className="absolute -top-10 -left-10 w-28 h-28 rounded-full blur-2xl opacity-15 group-hover:opacity-30 pointer-events-none transition-opacity duration-300"
        style={{ background: color }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-300 group-hover:scale-105 shadow-inner"
            style={{
              background: `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`,
              borderColor: `${color}35`,
              boxShadow: `0 0 15px -3px ${color}25`,
            }}
          >
            <Icon size={20} style={{ color }} className="transition-transform duration-300 group-hover:rotate-3" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
              {label}
            </p>
            <p className="text-2xl sm:text-[28px] font-extrabold text-white font-mono leading-none mt-1.5 tracking-tight">
              {value}
            </p>
            {sub && (
              <p className="text-xs text-slate-400 font-medium mt-1.5 truncate flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                {sub}
              </p>
            )}
          </div>
        </div>
        {badge && <div className="shrink-0 ml-1">{badge}</div>}
      </div>
    </div>
  );
}
