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
} from "lucide-react";
import { useIdentity } from "@/components/identity/IdentityProvider";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StatCard } from "@/components/common/StatCard";
import { BurnRateBadge } from "@/components/sre/BurnRateBadge";
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
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-white/[0.04]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">SRE Command Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-1">
              <Sparkles size={10} /> Simulated SRE Telemetry Model
            </span>
          </div>
          <p className="text-[12.5px] text-slate-400">
            Executive reliability command center — system-wide health, SLO adherence, and degradation signals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/services"
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] text-xs font-semibold text-slate-200 border border-white/[0.08] transition-colors flex items-center gap-1.5"
          >
            <ServerCog size={13} className="text-cyan-400" /> Service Catalog
          </Link>
          <Link
            href="/slos"
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-semibold text-cyan-300 border border-cyan-500/25 transition-colors flex items-center gap-1.5"
          >
            <Target size={13} /> SLO Dashboard
          </Link>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl bg-[#0a0f1d]/50 p-14 flex items-center justify-center gap-3 text-slate-400 text-xs border border-white/[0.04]">
          <Loader2 size={18} className="animate-spin text-cyan-400" />
          Calculating system-wide SRE reliability posture…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl p-5 border border-rose-500/20 bg-rose-500/[0.04] text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-rose-400" />
          {error}
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
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                Degraded Workloads Spotlight ({health.degradedServices.length})
              </h2>
              <span className="text-[11px] text-slate-500">Automated Reliability Diagnostics</span>
            </div>

            {health.degradedServices.length === 0 ? (
              <div className="rounded-2xl bg-[#0a0f1d]/70 backdrop-blur-md border border-white/[0.06] p-8 text-center text-slate-400">
                <CheckCircle2 size={28} className="mx-auto text-emerald-400 mb-2" />
                <h3 className="text-sm font-bold text-white">All Monitored Workloads Nominal</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Zero active reliability degradation signals detected across all registered services.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {health.degradedServices.map((svc) => {
                  const isCrit = svc.status === "CRITICAL";
                  return (
                    <div
                      key={svc.serviceId}
                      className={`rounded-2xl p-5 border flex flex-col justify-between gap-4 transition-colors ${
                        isCrit
                          ? "border-rose-500/25 bg-rose-500/[0.04]"
                          : "border-amber-500/25 bg-amber-500/[0.04]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/services/${svc.serviceId}`}
                              className="text-base font-bold text-white hover:text-cyan-400 transition-colors flex items-center gap-1"
                            >
                              {svc.serviceName}
                              <ArrowUpRight size={12} />
                            </Link>
                          </div>
                          <StatusBadge status={svc.status} variant={isCrit ? "critical" : "warning"} />
                        </div>

                        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                          <span className="text-slate-400 font-medium">Primary degradation factor: </span>
                          <span className={isCrit ? "text-rose-300 font-medium" : "text-amber-300 font-medium"}>
                            {svc.primaryDegradationFactor}
                          </span>
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 text-[10.5px]">Burn Rate:</span>
                            <BurnRateBadge rate={svc.burnRate} />
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10.5px]">Error Budget: </span>
                            <span className={`font-mono-brand font-bold ${svc.errorBudgetPercent <= 0 ? "text-rose-400" : "text-amber-400"}`}>
                              {svc.errorBudgetPercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <Link
                          href={`/services/${svc.serviceId}`}
                          className="px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-xs font-semibold text-cyan-300 border border-white/[0.08] transition-colors"
                        >
                          Investigate →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── SRE Reliability Lifecycle Architecture Card ───────── */}
          <div className="rounded-2xl bg-[#0a0f1d]/70 backdrop-blur-md border border-white/[0.06] p-5.5">
            <h2 className="text-white font-semibold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
              <Shield size={14} className="text-cyan-400" />
              SRE Reliability Lifecycle Architecture
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-xs mt-4">
              <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">1. Service</span>
                <span className="text-white font-medium mt-1 block">Workload Domain</span>
              </div>
              <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">2. Golden Signals</span>
                <span className="text-cyan-400 font-medium mt-1 block">Latency/Traffic/Errors</span>
              </div>
              <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">3. SLIs & SLOs</span>
                <span className="text-blue-400 font-medium mt-1 block">Target Compliance</span>
              </div>
              <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">4. Error Budget</span>
                <span className="text-violet-400 font-medium mt-1 block">Remaining & Burn</span>
              </div>
              <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.04] col-span-2 md:col-span-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">5. Service Health</span>
                <span className="text-emerald-400 font-medium mt-1 block">Postured Assessment</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
