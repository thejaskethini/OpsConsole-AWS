"use client";

import React from "react";

export interface ErrorBudgetBarProps {
  remainingPercent: number;
  totalAllowed?: number;
  consumed?: number;
  unit?: string;
  showDetails?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ErrorBudgetBar({
  remainingPercent,
  totalAllowed,
  consumed,
  unit,
  showDetails = true,
  size = "md",
  className = "",
}: ErrorBudgetBarProps) {
  const clamped = Math.max(0, Math.min(100, remainingPercent));

  // Determine semantic color
  let barColor = "bg-emerald-500";
  let textColor = "text-emerald-400";
  let statusText = "HEALTHY";

  if (clamped < 10) {
    barColor = "bg-rose-500";
    textColor = "text-rose-400";
    statusText = "CRITICAL";
  } else if (clamped < 30) {
    barColor = "bg-amber-500";
    textColor = "text-amber-400";
    statusText = "WARNING";
  }

  const barHeight = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className={`flex flex-col gap-1.5 min-w-[120px] ${className}`}>
      {showDetails && (
        <div className="flex items-center justify-between text-[11px] leading-none">
          <span className="text-slate-400 font-medium">
            {clamped}% <span className="text-slate-500 text-[10px]">rem.</span>
          </span>
          <span className={`text-[10px] font-semibold tracking-wider ${textColor}`}>
            {statusText}
          </span>
        </div>
      )}
      <div className={`w-full bg-white/[0.06] rounded-full overflow-hidden ${barHeight}`}>
        <div
          className={`${barHeight} rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showDetails && totalAllowed !== undefined && consumed !== undefined && (
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>{consumed} {unit ? unit : "used"}</span>
          <span>{totalAllowed} {unit ? `total ${unit}` : "total"}</span>
        </div>
      )}
    </div>
  );
}
