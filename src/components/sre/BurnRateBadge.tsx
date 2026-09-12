"use client";

import React from "react";
import { Flame } from "lucide-react";
import type { BurnRateStatus } from "@/modules/sre/types";

export interface BurnRateBadgeProps {
  rate: number;
  condition?: BurnRateStatus;
  timeToExhaustionHours?: number | null;
  showIcon?: boolean;
  showTime?: boolean;
  className?: string;
}

export function BurnRateBadge({
  rate,
  condition,
  timeToExhaustionHours,
  showIcon = true,
  showTime = false,
  className = "",
}: BurnRateBadgeProps) {
  // Infer condition if not provided
  let cond = condition;
  if (!cond) {
    if (rate <= 1.0) cond = "HEALTHY";
    else if (rate <= 5.0) cond = "WARNING";
    else cond = "CRITICAL";
  }

  let style = {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    icon: "text-emerald-400",
  };

  if (cond === "WARNING") {
    style = {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/20",
      icon: "text-amber-400",
    };
  } else if (cond === "CRITICAL") {
    style = {
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      border: "border-rose-500/20",
      icon: "text-rose-400",
    };
  }

  return (
    <div className={`inline-flex flex-col gap-0.5 ${className}`}>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border}`}
      >
        {showIcon && <Flame size={11} className={style.icon} />}
        <span>{rate.toFixed(1)}x</span>
      </span>
      {showTime && timeToExhaustionHours !== undefined && timeToExhaustionHours !== null && (
        <span className="text-[9.5px] text-slate-500 leading-tight">
          {timeToExhaustionHours < 24
            ? `~${Math.round(timeToExhaustionHours)}h rem.`
            : `~${Math.round(timeToExhaustionHours / 24)}d rem.`}
        </span>
      )}
    </div>
  );
}
