"use client";
import React from "react";
import { LucideIcon } from "lucide-react";

export interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  iconColor?: string;
  iconBgColor?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  iconColor = "#06b6d4",
  iconBgColor = "rgba(6, 182, 212, 0.1)",
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.04]">
      <div className="flex items-center gap-3.5">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-white/[0.06] shadow-lg shadow-black/20"
          style={{ background: iconBgColor }}
        >
          <Icon size={20} style={{ color: iconColor }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight leading-tight">{title}</h1>
          <p className="text-[11.5px] text-slate-400 mt-0.5 font-normal">{subtitle}</p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}
