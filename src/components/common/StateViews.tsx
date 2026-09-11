"use client";
import React from "react";
import { Loader2, AlertTriangle, AlertCircle, RefreshCw, FolderX } from "lucide-react";

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading data...", className = "" }: LoadingStateProps) {
  return (
    <div
      className={`min-h-[260px] flex flex-col items-center justify-center gap-3.5 text-slate-400 p-8 rounded-2xl bg-[#0d1527]/40 border border-white/[0.04] ${className}`}
    >
      <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
      <p className="text-xs font-medium tracking-wide text-slate-400">{message}</p>
    </div>
  );
}

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title = "No resources found",
  description = "No items match the current view or no data is currently available.",
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`min-h-[220px] flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-[#0d1527]/30 border border-white/[0.04] ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-400 mb-3">
        <FolderX size={22} />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorBanner({
  title = "Failed to load data",
  message,
  onRetry,
  className = "",
}: ErrorBannerProps) {
  return (
    <div
      className={`p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 flex items-start gap-3.5 ${className}`}
    >
      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-semibold text-rose-300">{title}</h4>
        <p className="text-xs text-rose-400/90 mt-0.5 break-words">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 transition-colors shrink-0"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      )}
    </div>
  );
}

export interface WarningBannerProps {
  title?: string;
  message: string;
  className?: string;
}

export function WarningBanner({
  title = "Notice",
  message,
  className = "",
}: WarningBannerProps) {
  return (
    <div
      className={`p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex items-start gap-3.5 ${className}`}
    >
      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <h4 className="text-xs font-semibold text-amber-300">{title}</h4>}
        <p className="text-xs text-amber-300/90 mt-0.5 break-words">{message}</p>
      </div>
    </div>
  );
}
