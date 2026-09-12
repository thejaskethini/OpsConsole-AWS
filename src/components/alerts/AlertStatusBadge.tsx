import React from "react";
import type { AlertStatus } from "@/modules/alerting/types";

interface AlertStatusBadgeProps {
  status: AlertStatus;
  className?: string;
}

export function AlertStatusBadge({
  status,
  className = "",
}: AlertStatusBadgeProps) {
  const configs: Record<
    AlertStatus,
    { label: string; dot: string; bg: string; border: string; text: string }
  > = {
    FIRING: {
      label: "FIRING",
      dot: "bg-red-400",
      bg: "bg-red-500/15",
      border: "border-red-500/30",
      text: "text-red-200",
    },
    ACKNOWLEDGED: {
      label: "ACKNOWLEDGED",
      dot: "bg-amber-400",
      bg: "bg-amber-500/15",
      border: "border-amber-500/30",
      text: "text-amber-200",
    },
    RESOLVED: {
      label: "RESOLVED",
      dot: "bg-slate-400",
      bg: "bg-slate-800/60",
      border: "border-slate-700/60",
      text: "text-slate-300",
    },
    NORMAL: {
      label: "NORMAL",
      dot: "bg-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/25",
      text: "text-emerald-300",
    },
  };

  const cfg = configs[status] || configs.NORMAL;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium tracking-wide border font-mono ${cfg.bg} ${cfg.border} ${cfg.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
