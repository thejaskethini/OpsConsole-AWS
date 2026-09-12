"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Search,
  ArrowUpRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  BarChart2,
} from "lucide-react";
import { useIdentity } from "@/components/identity/IdentityProvider";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StatCard } from "@/components/common/StatCard";
import { ErrorBudgetBar } from "@/components/sre/ErrorBudgetBar";
import { BurnRateBadge } from "@/components/sre/BurnRateBadge";
import type { SLO } from "@/modules/sre/types";

interface EnrichedSLO extends SLO {
  serviceName: string;
  serviceSlug: string;
  serviceTier: string;
}

export default function SlosPage() {
  const { workspace } = useIdentity();
  const [slos, setSlos] = useState<EnrichedSLO[]>([]);
  const [globalCompliance, setGlobalCompliance] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchSlos() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (workspace?.id) params.set("workspaceId", workspace.id);

        const res = await fetch(`/api/sre/slos?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load SLOs");
        }
        const data = await res.json();
        setSlos(data.slos || []);
        setGlobalCompliance(data.globalCompliance ?? 100);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading SLO dashboard");
      } finally {
        setLoading(false);
      }
    }

    fetchSlos();
  }, [workspace?.id]);

  const filtered = slos.filter((slo) => {
    const matchesSearch =
      slo.name.toLowerCase().includes(search.toLowerCase()) ||
      slo.serviceName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || slo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const compliantCount = slos.filter((s) => s.compliancePercent >= s.target).length;
  const breachedCount = slos.filter((s) => s.compliancePercent < s.target).length;
  const atRiskCount = slos.filter((s) => s.status === "CRITICAL" || s.status === "WARNING").length;
  const avgBudget =
    slos.length > 0
      ? Math.round(
          (slos.reduce((acc, s) => acc + s.errorBudget.remainingPercent, 0) / slos.length) * 10
        ) / 10
      : 100;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-white/[0.04]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">Service Level Objectives (SLOs)</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-1">
              <Sparkles size={10} /> Simulated SRE Telemetry Model
            </span>
          </div>
          <p className="text-[12.5px] text-slate-400">
            Target thresholds, measured compliance, flexible error budgets, and real-time burn rates across active services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={`${compliantCount} Compliant`} variant="healthy" />
          {atRiskCount > 0 && <StatusBadge status={`${atRiskCount} At Risk`} variant="warning" />}
        </div>
      </div>

      {/* ── Top Executive KPI Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart2}
          label="Global Compliance"
          value={`${globalCompliance.toFixed(1)}%`}
          sub="Rolling 30-day aggregate"
          color="#06b6d4"
        />
        <StatCard
          icon={CheckCircle2}
          label="Compliant SLOs"
          value={`${compliantCount} / ${slos.length}`}
          sub="Meeting target thresholds"
          color="#10b981"
        />
        <StatCard
          icon={XCircle}
          label="Breached / At Risk"
          value={breachedCount}
          sub={breachedCount > 0 ? "Requires SRE attention" : "All SLOs passing"}
          color={breachedCount > 0 ? "#f43f5e" : "#10b981"}
        />
        <StatCard
          icon={Activity}
          label="Avg Error Budget"
          value={`${avgBudget.toFixed(1)}%`}
          sub="Remaining capacity across SLOs"
          color={avgBudget < 30 ? "#f59e0b" : "#10b981"}
        />
      </div>

      {/* ── Filter and Search Controls ───────────────────────────── */}
      <div className="rounded-2xl bg-[#0a0f1d]/70 backdrop-blur-md border border-white/[0.06] p-3.5 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search SLO or service name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white/[0.03] border border-white/[0.06] text-[12px] text-slate-200 rounded-xl focus:outline-none focus:border-cyan-500/40 placeholder:text-slate-600"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.05] p-1 rounded-xl text-[11px]">
          {["all", "HEALTHY", "WARNING", "CRITICAL"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === status
                  ? "bg-cyan-500/20 text-cyan-300 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {status === "all" ? "All SLOs" : status}
            </button>
          ))}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="rounded-2xl bg-[#0a0f1d]/50 p-12 flex items-center justify-center gap-3 text-slate-400 text-xs border border-white/[0.04]">
          <Loader2 size={16} className="animate-spin text-cyan-400" />
          Evaluating SLO adherence & error budget depletion…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl p-5 border border-rose-500/20 bg-rose-500/[0.04] text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-rose-400" />
          {error}
        </div>
      )}

      {/* ── Scannable SLO Table ────────────────────────────────────── */}
      {!loading && !error && (
        <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0a0f1d]/60 backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                  <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">SLO & Service</th>
                  <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Status</th>
                  <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Target</th>
                  <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Measured</th>
                  <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Compliance</th>
                  <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Error Budget</th>
                  <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Burn Rate</th>
                  <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((slo) => {
                  const budget = slo.errorBudget;
                  const burn = slo.burnRate;
                  const isCompliant = slo.compliancePercent >= slo.target;

                  return (
                    <tr key={slo.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Name & Service Link */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-white text-xs block">{slo.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Link
                            href={`/services/${slo.serviceId}`}
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                          >
                            {slo.serviceName}
                            <ArrowUpRight size={10} />
                          </Link>
                          <span className="text-[9px] text-slate-700">•</span>
                          <span className="text-[9.5px] font-mono-brand uppercase text-slate-500">{slo.serviceTier}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <StatusBadge status={slo.status} />
                      </td>

                      {/* Target */}
                      <td className="py-3 px-4 font-mono-brand text-slate-300">
                        {slo.target}%
                        <span className="text-[9.5px] text-slate-500 block font-normal">{slo.windowDays}d window</span>
                      </td>

                      {/* Measured Value */}
                      <td className="py-3 px-4 font-mono-brand text-slate-200">
                        {slo.currentValue}%
                      </td>

                      {/* Compliance % */}
                      <td className="py-3 px-4 font-mono-brand font-bold">
                        <span className={isCompliant ? "text-emerald-400" : "text-rose-400"}>
                          {slo.compliancePercent.toFixed(2)}%
                        </span>
                      </td>

                      {/* Error Budget Remaining */}
                      <td className="py-3 px-4 w-48">
                        <ErrorBudgetBar
                          remainingPercent={budget.remainingPercent}
                          totalAllowed={budget.totalAllowed}
                          consumed={budget.consumed}
                          unit={budget.unit}
                          size="sm"
                        />
                      </td>

                      {/* Burn Rate */}
                      <td className="py-3 px-4">
                        <BurnRateBadge
                          rate={burn.value}
                          condition={burn.status}
                          timeToExhaustionHours={burn.timeToExhaustionHours}
                          showTime
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/services/${slo.serviceId}`}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-cyan-500/15 text-slate-300 hover:text-cyan-300 border border-white/[0.06] hover:border-cyan-500/30 transition-all text-[11px] font-medium"
                        >
                          View Service →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
