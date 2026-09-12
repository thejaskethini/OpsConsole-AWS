"use client";
import React from "react";

export type StatusVariant =
  | "healthy"
  | "running"
  | "available"
  | "active"
  | "warning"
  | "degraded"
  | "stopped"
  | "critical"
  | "failed"
  | "pending"
  | "info"
  | "neutral";

export interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<
  StatusVariant,
  { bg: string; text: string; dot: string; border: string }
> = {
  healthy: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    border: "border-emerald-500/20",
  },
  running: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    border: "border-emerald-500/20",
  },
  available: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    border: "border-emerald-500/20",
  },
  active: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    border: "border-emerald-500/20",
  },
  warning: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    dot: "bg-amber-400",
    border: "border-amber-500/20",
  },
  degraded: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    dot: "bg-amber-400",
    border: "border-amber-500/20",
  },
  pending: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    dot: "bg-amber-400",
    border: "border-amber-500/20",
  },
  stopped: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    dot: "bg-slate-400",
    border: "border-slate-500/20",
  },
  critical: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    dot: "bg-rose-400",
    border: "border-rose-500/20",
  },
  failed: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    dot: "bg-rose-400",
    border: "border-rose-500/20",
  },
  info: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    dot: "bg-cyan-400",
    border: "border-cyan-500/20",
  },
  neutral: {
    bg: "bg-slate-800/60",
    text: "text-slate-300",
    dot: "bg-slate-400",
    border: "border-slate-700/50",
  },
};

function inferVariant(status: string): StatusVariant {
  const s = (status || "").toLowerCase().trim();
  if (["running", "healthy", "available", "active", "ok", "succeeded"].includes(s)) {
    return "healthy";
  }
  if (["warning", "degraded", "pending", "in-progress", "rebooting"].includes(s)) {
    return "warning";
  }
  if (["stopped", "stopping", "terminated", "paused", "inactive"].includes(s)) {
    return "stopped";
  }
  if (["critical", "failed", "error", "alarm", "unhealthy"].includes(s)) {
    return "critical";
  }
  return "neutral";
}

export function StatusBadge({ status, variant, pulse = false, className = "" }: StatusBadgeProps) {
  const resolvedVariant = variant || inferVariant(status);
  const style = variantStyles[resolvedVariant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${style.dot}`} />
      </span>
      <span className="capitalize">{status}</span>
    </span>
  );
}
