"use client";
import React from "react";
import { LucideIcon } from "lucide-react";

export interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tag?: React.ReactNode;
  iconColor?: string;
  iconBgColor?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  tag,
  iconColor = "#06b6d4",
  iconBgColor = "rgba(6, 182, 212, 0.1)",
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/[0.06]"
          style={{ background: iconBgColor }}
        >
          <Icon size={18} style={{ color: iconColor }} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight font-heading">
              {title}
            </h1>
            {tag && <div className="shrink-0">{tag}</div>}
          </div>
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}
