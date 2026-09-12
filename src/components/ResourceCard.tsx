"use client";
import { ExternalLink, CheckCircle2, AlertTriangle, AlertCircle, ArrowUpRight } from "lucide-react";

export interface ResourceMetric {
  label: string;
  value: number;
  displayValue: string;
  colorClass: string;
}

export interface ResourceCardProps {
  name: string;
  cost: string;
  isExact: boolean;
  provisionStatus: 'Right-sized' | 'Over-provisioned' | 'Under-provisioned';
  healthStatus: 'Healthy' | 'Warning' | 'Critical';
  confidence: string;
  metrics: ResourceMetric[];
  signals: string;
  awsLink?: string;
  dashboardLink?: string;
}

export function ResourceCard({
  name,
  cost,
  isExact,
  provisionStatus,
  healthStatus,
  confidence,
  metrics,
  signals,
  awsLink,
  dashboardLink,
}: ResourceCardProps) {
  return (
    <div className="surface-card rounded-xl p-5 flex flex-col gap-4 transition-colors hover:border-white/[0.12]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 pr-2">
          <h3 className="text-sm font-semibold text-white truncate">{name}</h3>
          <div className="flex items-center gap-3 mt-1.5">
            {awsLink && (
              <a 
                href={awsLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
              >
                AWS Console <ExternalLink size={10} />
              </a>
            )}
            {dashboardLink && (
              <a 
                href={dashboardLink} 
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors font-medium"
              >
                Inspect <ArrowUpRight size={10} />
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            {isExact && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                EXACT
              </span>
            )}
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
              provisionStatus === 'Over-provisioned' ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : 
              provisionStatus === 'Right-sized' ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" :
              "bg-rose-500/10 text-rose-300 border-rose-500/20"
            }`}>
              {provisionStatus}
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded border flex items-center gap-1 text-[10px] font-mono font-semibold ${
            healthStatus === 'Healthy' ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : 
            healthStatus === 'Warning' ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : 
            "bg-rose-500/10 text-rose-300 border-rose-500/20"
          }`}>
            {healthStatus === 'Healthy' && <CheckCircle2 size={10} />}
            {healthStatus === 'Warning' && <AlertTriangle size={10} />}
            {healthStatus === 'Critical' && <AlertCircle size={10} />}
            {healthStatus}
          </span>
        </div>
      </div>

      {/* Cost */}
      <div className="flex flex-col bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
        <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">14-Day Allocated Cost</span>
        <span className="text-xl font-bold text-white font-mono mt-0.5">USD ${cost}</span>
        {confidence && (
          <span className="text-[10.5px] text-slate-500 mt-1">{confidence}</span>
        )}
      </div>

      {/* Metrics */}
      <div className="flex flex-col gap-2.5">
        {metrics.map((m, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-24 truncate">{m.label}</span>
            <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${m.colorClass || "bg-cyan-500"}`}
                style={{ width: `${Math.min(Math.max(m.value, 0), 100)}%` }}
              />
            </div>
            <span className="text-xs font-mono font-semibold text-slate-200 w-12 text-right">{m.displayValue}</span>
          </div>
        ))}
      </div>

      {/* Signals */}
      {signals && (
        <div className="pt-2 border-t border-white/[0.04]">
          <p className="text-[11px] text-slate-400 font-mono leading-relaxed">{signals}</p>
        </div>
      )}
    </div>
  );
}
