import React from "react";
import type { AlertSeverity } from "@/modules/alerting/types";

interface AlertSeverityBadgeProps {
  severity: AlertSeverity;
  className?: string;
  showIcon?: boolean;
}

export function AlertSeverityBadge({
  severity,
  className = "",
  showIcon = true,
}: AlertSeverityBadgeProps) {
  const configs: Record<
    AlertSeverity,
    { label: string; dot: string; bg: string; border: string; text: string }
  > = {
    CRITICAL: {
      label: "CRITICAL",
      dot: "bg-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/25",
      text: "text-red-300",
    },
    WARNING: {
      label: "WARNING",
      dot: "bg-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/25",
      text: "text-amber-300",
    },
    INFO: {
      label: "INFO",
      dot: "bg-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/25",
      text: "text-blue-300",
    },
  };

  const cfg = configs[severity] || configs.INFO;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium tracking-wide border font-mono ${cfg.bg} ${cfg.border} ${cfg.text} ${className}`}
    >
      {showIcon && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
      {cfg.label}
    </span>
  );
}
