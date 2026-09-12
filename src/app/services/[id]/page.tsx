"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Shield,
  Activity,
  Zap,
  Clock,
  ArrowLeft,
  AlertTriangle,
  Sparkles,
  Network,
  Cpu,
  Database,
  Container,
  Loader2,
  HardDrive,
  BarChart2,
} from "lucide-react";
import { useIdentity } from "@/components/identity/IdentityProvider";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorBudgetBar } from "@/components/sre/ErrorBudgetBar";
import { BurnRateBadge } from "@/components/sre/BurnRateBadge";
import type {
  Service,
  GoldenSignals,
  SLO,
  ServiceHealthAssessment,
  ServiceStatus,
} from "@/modules/sre/types";

export default function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const serviceId = resolvedParams.id;
  const { workspace } = useIdentity();

  const [data, setData] = useState<{
    service: Service;
    goldenSignals: GoldenSignals;
    slos: SLO[];
    health: ServiceHealthAssessment;
    dependencies: { id: string; name: string; status: ServiceStatus }[];
    dependents: { id: string; name: string; status: ServiceStatus }[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (workspace?.id) params.set("workspaceId", workspace.id);

        const res = await fetch(`/api/sre/services/${serviceId}?${params.toString()}`);
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || "Failed to load service");
        }
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading service detail");
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [serviceId, workspace?.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 size={20} className="animate-spin text-cyan-400" />
        <span className="text-xs">Loading service reliability telemetry…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="rounded-2xl p-6 border border-rose-500/20 bg-rose-500/[0.04] text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-rose-400" />
            <span>{error || "Service not found"}</span>
          </div>
          <Link
            href="/services"
            className="text-xs text-slate-200 bg-white/[0.05] hover:bg-white/[0.1] px-3 py-1.5 rounded-lg transition-colors"
          >
            ← Back to Services
          </Link>
        </div>
      </div>
    );
  }

  const { service, goldenSignals, slos, health, dependencies, dependents } = data;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* ── Breadcrumb Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.04]">
        <Link
          href="/services"
          className="inline-flex items-center gap-2 text-[12px] text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft size={13} /> Back to Services Catalog
        </Link>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-1.5 self-start sm:self-auto">
          <Sparkles size={10} /> Simulated SRE Telemetry Model
        </span>
      </div>

      {/* ── Service Summary Card ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#0a0f1d]/70 backdrop-blur-md border border-white/[0.06] p-5.5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">{service.name}</h1>
            <span className="px-2 py-0.5 rounded text-[9.5px] font-mono-brand uppercase bg-white/[0.04] text-slate-400 border border-white/[0.06]">
              {service.tier}
            </span>
            <StatusBadge status={service.status} />
          </div>
          <p className="text-slate-400 text-xs mt-1.5 max-w-2xl leading-relaxed">{service.description}</p>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-3">
            <span>Owner: <strong className="text-slate-300 font-medium">{service.ownerTeam}</strong></span>
            <span>•</span>
            <span>Slug: <code className="text-slate-400 font-mono-brand">{service.slug}</code></span>
            <span>•</span>
            <span>Reliability Score: <strong className="text-white font-mono-brand">{health.score}/100</strong></span>
          </div>
        </div>
      </div>

      {/* ── Primary Degradation & Observed Signals Banner (if any) ──── */}
      {health.observedSignals.length > 0 && (
        <div className="rounded-2xl p-4.5 border border-amber-500/25 bg-amber-500/[0.04]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-2.5">
            <Activity size={14} /> Observed Reliability Signals
          </h2>
          {health.primaryDegradationFactor && (
            <p className="text-xs font-semibold text-white mb-2 leading-relaxed">
              <span className="text-slate-400 font-normal">Primary degradation factor: </span>
              <span className="text-amber-300">{health.primaryDegradationFactor}</span>
            </p>
          )}
          <ul className="space-y-1.5">
            {health.observedSignals.map((signal, idx) => (
              <li key={idx} className="text-[11.5px] text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {signal}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Google SRE Golden Signals ─────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <BarChart2 size={14} className="text-cyan-400" />
          Google SRE Golden Signals
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Latency */}
          <div className="rounded-2xl bg-[#0a0f1d]/70 backdrop-blur-md border border-white/[0.06] p-4.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider">1. Latency</span>
              <Clock size={14} className="text-cyan-400" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono-brand text-white">
                  {goldenSignals.latency.p95Ms}
                </span>
                <span className="text-[10px] text-slate-500 font-mono-brand">ms (p95)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-white/[0.04] text-[11px]">
                <div>
                  <span className="text-slate-500">p50: </span>
                  <strong className="text-slate-300 font-mono-brand">{goldenSignals.latency.p50Ms}ms</strong>
                </div>
                <div>
                  <span className="text-slate-500">p99: </span>
                  <strong className="text-slate-300 font-mono-brand">{goldenSignals.latency.p99Ms}ms</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Traffic */}
          <div className="rounded-2xl bg-[#0a0f1d]/70 backdrop-blur-md border border-white/[0.06] p-4.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider">2. Traffic</span>
              <Activity size={14} className="text-blue-400" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono-brand text-white">
                  {goldenSignals.trafficReqPerMin.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 font-mono-brand">req/min</span>
              </div>
              <p className="text-[10.5px] text-slate-500 mt-3 pt-2.5 border-t border-white/[0.04]">
                Throughput rate across active instances
              </p>
            </div>
          </div>

          {/* 3. Errors */}
          <div className="rounded-2xl bg-[#0a0f1d]/70 backdrop-blur-md border border-white/[0.06] p-4.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider">3. Errors</span>
              <Shield size={14} className="text-rose-400" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-2xl font-bold font-mono-brand ${
                    goldenSignals.errorRatePercent >= 1.0
                      ? "text-rose-400"
                      : goldenSignals.errorRatePercent > 0.1
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {goldenSignals.errorRatePercent.toFixed(2)}%
                </span>
                <span className="text-[10px] text-slate-500 font-mono-brand">error rate</span>
              </div>
              <p className="text-[10.5px] text-slate-500 mt-3 pt-2.5 border-t border-white/[0.04]">
                5xx errors and HTTP failure ratio
              </p>
            </div>
          </div>

          {/* 4. Saturation */}
          <div className="rounded-2xl bg-[#0a0f1d]/70 backdrop-blur-md border border-white/[0.06] p-4.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider">4. Saturation</span>
              <Cpu size={14} className="text-violet-400" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono-brand text-white">
                  {goldenSignals.saturation.cpuPercent}%
                </span>
                <span className="text-[10px] text-slate-500 font-mono-brand">CPU util</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-white/[0.04] text-[11px]">
                <div>
                  <span className="text-slate-500">Memory: </span>
                  <strong className="text-slate-300 font-mono-brand">
                    {goldenSignals.saturation.memoryPercent}%
                  </strong>
                </div>
                {goldenSignals.saturation.queueFillPercent !== undefined && (
                  <div>
                    <span className="text-slate-500">Queue: </span>
                    <strong className="text-slate-300 font-mono-brand">
                      {goldenSignals.saturation.queueFillPercent}%
                    </strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Service Level Objectives (SLOs) & Error Budgets ───────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Service Level Objectives (SLOs)
          </h2>
          <span className="text-[11px] text-slate-500">Rolling 30-Day Evaluation Window</span>
        </div>

        <div className="space-y-3">
          {slos.map((slo) => {
            const budget = slo.errorBudget;
            const burn = slo.burnRate;

            return (
              <div key={slo.id} className="rounded-2xl bg-[#0a0f1d]/70 backdrop-blur-md border border-white/[0.06] p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{slo.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-mono-brand uppercase bg-white/[0.03] text-slate-400">
                        {slo.windowDays}d Window
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-5 mt-2.5 text-xs">
                      <div>
                        <span className="text-slate-500">Target: </span>
                        <strong className="text-white font-mono-brand">{slo.target}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Measured: </span>
                        <strong className="text-cyan-400 font-mono-brand">{slo.currentValue}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Compliance: </span>
                        <strong
                          className={`font-mono-brand ${
                            slo.compliancePercent >= slo.target ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {slo.compliancePercent.toFixed(2)}%
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Burn Rate & Error Budget Right Column */}
                  <div className="flex flex-wrap items-center gap-6 lg:justify-end">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Burn Rate</p>
                      <BurnRateBadge rate={burn.value} condition={burn.status} timeToExhaustionHours={burn.timeToExhaustionHours} showTime />
                    </div>

                    <div className="w-48">
                      <ErrorBudgetBar
                        remainingPercent={budget.remainingPercent}
                        totalAllowed={budget.totalAllowed}
                        consumed={budget.consumed}
                        unit={budget.unit}
                        size="md"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Dependencies & Cloud Substrate ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Logical Service Dependencies */}
        <div className="rounded-2xl bg-[#0a0f1d]/70 backdrop-blur-md border border-white/[0.06] p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-white font-semibold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3.5">
              <Network size={14} className="text-cyan-400" />
              Service Dependency Topology
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-[10.5px] text-slate-500 uppercase font-semibold mb-2">
                  Upstream Dependencies (Calls To)
                </p>
                {dependencies.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">No external service dependencies (Root service)</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dependencies.map((dep) => (
                      <Link
                        key={dep.id}
                        href={`/services/${dep.id}`}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 text-xs text-slate-200 flex items-center gap-2 transition-all"
                      >
                        <span>{dep.name}</span>
                        <StatusBadge status={dep.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/[0.04]">
                <p className="text-[10.5px] text-slate-500 uppercase font-semibold mb-2">
                  Downstream Dependents (Called By)
                </p>
                {dependents.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">No registered downstream services</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dependents.map((dep) => (
                      <Link
                        key={dep.id}
                        href={`/services/${dep.id}`}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 text-xs text-slate-200 flex items-center gap-2 transition-all"
                      >
                        <span>{dep.name}</span>
                        <StatusBadge status={dep.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Associated Cloud Infrastructure */}
        <div className="rounded-2xl bg-[#0a0f1d]/70 backdrop-blur-md border border-white/[0.06] p-5">
          <h2 className="text-white font-semibold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3.5">
            <HardDrive size={14} className="text-violet-400" />
            Associated Cloud Infrastructure
          </h2>
          <div className="space-y-2">
            {service.cloudResourceLinks.map((link, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center text-slate-400">
                    {link.type.includes("ECS") ? (
                      <Container size={14} />
                    ) : link.type.includes("RDS") ? (
                      <Database size={14} />
                    ) : (
                      <Zap size={14} />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{link.identifier}</p>
                    <p className="text-[10px] text-slate-500">{link.type}</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono-brand">{link.region}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
