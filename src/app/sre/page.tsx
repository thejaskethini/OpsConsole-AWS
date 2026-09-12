"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Shield,
  Target,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Loader2,
  Sparkles,
  ServerCog,
  Flame,
  ArrowRight,
} from "lucide-react";
import { useIdentity } from "@/components/identity/IdentityProvider";
import { StatCard } from "@/components/common/StatCard";
import type { SREExecutiveHealth } from "@/modules/sre/types";

export default function SreHealthPage() {
  const { workspace, activeEnvironment } = useIdentity();
  const [health, setHealth] = useState<SREExecutiveHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSreHealth() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (workspace?.id) params.set("workspaceId", workspace.id);
        if (activeEnvironment?.id) params.set("environmentId", activeEnvironment.id);

        const res = await fetch(`/api/sre/health?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load SRE health");
        }
        const data = await res.json();
        setHealth(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading SRE health command center");
      } finally {
        setLoading(false);
      }
    }

    fetchSreHealth();
  }, [workspace?.id, activeEnvironment?.id]);

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto pb-16">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
              SRE Command Center
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30 flex items-center gap-1.5 shadow-[0_0_12px_rgba(139,92,246,0.2)]">
              <Sparkles size={12} className="text-violet-400 animate-pulse-subtle" /> Simulated SRE Telemetry Model
            </span>
          </div>
          <p className="text-sm text-slate-400 font-medium">
            Executive reliability command center — system-wide health, SLO adherence, and automated degradation diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/services"
            className="group px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-200 border border-white/[0.08] hover:border-white/[0.15] transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            <ServerCog size={14} className="text-cyan-400 group-hover:rotate-6 transition-transform" /> Service Catalog
          </Link>
          <Link
            href="/slos"
            className="group px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-semibold text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
          >
            <Target size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" /> SLO Dashboard
          </Link>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl surface-card p-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
          <Loader2 size={24} className="animate-spin text-cyan-400" />
          <span>Calculating system-wide SRE reliability posture…</span>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl p-5 border border-rose-500/30 bg-rose-500/[0.08] text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle size={18} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && health && (
        <>
          {/* ── Executive KPI Bar ──────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={ServerCog}
              label="Monitored Services"
              value={`${health.healthyCount} / ${health.totalServices}`}
              sub={`${health.criticalCount} critical, ${health.warningCount} warning`}
              color="#06b6d4"
            />
            <StatCard
              icon={Target}
              label="Global SLO Compliance"
              value={`${health.overallCompliancePercent}%`}
              sub="Rolling 30-day window"
              color="#10b981"
            />
            <StatCard
              icon={Activity}
              label="Avg Error Budget"
              value={`${health.averageErrorBudgetPercent}%`}
              sub="Capacity across all services"
              color={health.averageErrorBudgetPercent < 30 ? "#f59e0b" : "#10b981"}
            />
            <StatCard
              icon={Flame}
              label="Peak Burn Rate"
              value={`${health.highestBurnRate.burnRate.toFixed(1)}x`}
              sub={health.highestBurnRate.serviceName || "All nominal"}
              color={health.highestBurnRate.burnRate > 5 ? "#f43f5e" : "#f59e0b"}
            />
          </div>

          {/* ── Degraded Workloads Spotlight Section ───────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-400" />
                Degraded Workloads Spotlight ({health.degradedServices.length})
              </h2>
              <span className="text-xs text-slate-400 font-medium">Automated Reliability Diagnostics</span>
            </div>

            {health.degradedServices.length === 0 ? (
              <div className="rounded-2xl surface-card p-10 text-center text-slate-400 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <CheckCircle2 size={24} className="text-emerald-400" />
                </div>
                <h3 className="text-base font-bold text-white">All Monitored Workloads Nominal</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Zero active reliability degradation signals detected across all registered services.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {health.degradedServices.map((svc) => {
                  const isCrit = svc.status === "CRITICAL";
                  const accentColor = isCrit ? "#f43f5e" : "#f59e0b";
                  return (
                    <div
                      key={svc.serviceId}
                      className="relative group rounded-2xl p-6 surface-card flex flex-col justify-between gap-5 overflow-hidden transition-all duration-300"
                      style={{
                        borderColor: isCrit ? "rgba(244, 63, 94, 0.3)" : "rgba(245, 158, 11, 0.3)",
                      }}
                    >
                      {/* Ambient corner glow */}
                      <div
                        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none group-hover:opacity-35 transition-opacity"
                        style={{ background: accentColor }}
                      />

                      {/* Header */}
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            href={`/services/${svc.serviceId}`}
                            className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5"
                          >
                            {svc.serviceName}
                            <ArrowUpRight size={16} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-cyan-400" />
                          </Link>
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5 border shadow-sm ${
                              isCrit
                                ? "bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                                : "bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full animate-pulse-subtle ${isCrit ? "bg-rose-400" : "bg-amber-400"}`} />
                            {svc.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium mt-2.5 flex items-center gap-2">
                          <span className="text-slate-400">Primary degradation factor:</span>
                          <span className="text-amber-300 font-semibold">{svc.primaryDegradationFactor}</span>
                        </p>
                      </div>

                      {/* Bottom metrics and link */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] text-xs">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-slate-400 text-[11px] uppercase">Burn Rate:</span>
                            <span className={`font-bold ${isCrit ? "text-rose-400" : "text-amber-400"}`}>
                              {svc.burnRate.toFixed(1)}x
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-slate-400 text-[11px] uppercase">Error Budget:</span>
                            <span className={`font-bold ${svc.errorBudgetPercent < 15 ? "text-rose-400" : "text-amber-400"}`}>
                              {svc.errorBudgetPercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <Link
                          href={`/services/${svc.serviceId}`}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-200 border border-white/[0.06] hover:border-cyan-500/40 hover:text-cyan-300 transition-all flex items-center gap-1"
                        >
                          View Service <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── SRE Reliability Lifecycle Architecture ──────────────── */}
          <div className="rounded-2xl surface-card p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-3">
              <Shield size={16} className="text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                SRE Reliability Lifecycle Architecture
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {[
                { step: "1. Service", title: "Workload Domain", desc: "Catalog & ownership mapping", color: "#38bdf8" },
                { step: "2. Golden Signals", title: "Latency/Traffic/Errors", desc: "Real-time telemetry ingestion", color: "#06b6d4" },
                { step: "3. SLIs & SLOs", title: "Target Compliance", desc: "Rolling evaluation windows", color: "#10b981" },
                { step: "4. Error Budget", title: "Remaining & Burn", desc: "Multi-window rate alerting", color: "#a855f7" },
                { step: "5. Service Health", title: "Postured Assessment", desc: "Centralized executive scoring", color: "#f59e0b" },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl p-4 bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all flex flex-col justify-between"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    {item.step}
                  </p>
                  <div className="mt-2">
                    <p className="text-xs font-bold text-white font-heading" style={{ color: item.color }}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
