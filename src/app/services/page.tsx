"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  ArrowUpRight,
  Loader2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { useIdentity } from "@/components/identity/IdentityProvider";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorBudgetBar } from "@/components/sre/ErrorBudgetBar";
import { BurnRateBadge } from "@/components/sre/BurnRateBadge";
import type { ServiceWithReliability } from "@/modules/sre/types";

export default function ServiceCatalogPage() {
  const { workspace, activeEnvironment } = useIdentity();
  const [services, setServices] = useState<ServiceWithReliability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    async function fetchServices() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (workspace?.id) params.set("workspaceId", workspace.id);
        if (activeEnvironment?.id) params.set("environmentId", activeEnvironment.id);

        const res = await fetch(`/api/sre/services?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load services");
        }
        const data = await res.json();
        setServices(data.services || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading service catalog");
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, [workspace?.id, activeEnvironment?.id]);

  // Local deterministic filtering
  const filtered = services.filter((item) => {
    const s = item.service;
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.ownerTeam.toLowerCase().includes(search.toLowerCase());
    const matchesTier = selectedTier === "all" || s.tier.toLowerCase() === selectedTier.toLowerCase();
    const matchesStatus = selectedStatus === "all" || s.status === selectedStatus;
    return matchesSearch && matchesTier && matchesStatus;
  });

  const healthyCount = services.filter((s) => s.service.status === "HEALTHY").length;
  const warningCount = services.filter((s) => s.service.status === "WARNING").length;
  const criticalCount = services.filter((s) => s.service.status === "CRITICAL").length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-white/[0.04]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">Services</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-1">
              <Sparkles size={10} /> Simulated SRE Telemetry Model
            </span>
          </div>
          <p className="text-[12.5px] text-slate-400">
            Application and workload reliability inventory, Golden Signals, and active SLO adherence.
          </p>
        </div>

        {/* Status Counter Badges */}
        <div className="flex items-center gap-2">
          <StatusBadge status={`${healthyCount} Healthy`} variant="healthy" />
          {warningCount > 0 && <StatusBadge status={`${warningCount} Warning`} variant="warning" />}
          {criticalCount > 0 && <StatusBadge status={`${criticalCount} Critical`} variant="critical" />}
        </div>
      </div>

      {/* ── Instant Search & Filter Controls ─────────────────────── */}
      <div className="rounded-2xl bg-[#0f172a] border border-white/[0.06] p-3.5 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search services by name, team, or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white/[0.03] border border-white/[0.06] text-[12px] text-slate-200 rounded-xl focus:outline-none focus:border-cyan-500/40 placeholder:text-slate-600 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Tier filter */}
          <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] p-1 rounded-xl text-[11px]">
            {["all", "tier-1", "tier-2", "tier-3"].map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all duration-150 ${
                  selectedTier === tier
                    ? "bg-cyan-500/20 text-cyan-300 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tier === "all" ? "All Tiers" : tier.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] p-1 rounded-xl text-[11px]">
            {["all", "HEALTHY", "WARNING", "CRITICAL"].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all duration-150 ${
                  selectedStatus === status
                    ? "bg-cyan-500/20 text-cyan-300 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {status === "all" ? "All Status" : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="rounded-2xl bg-[#0f172a]/60 p-12 flex items-center justify-center gap-3 text-slate-400 text-xs border border-white/[0.04]">
          <Loader2 size={16} className="animate-spin text-cyan-400" />
          Loading service catalog…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl p-5 border border-rose-500/20 bg-rose-500/[0.04] text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-rose-400" />
          {error}
        </div>
      )}

      {/* ── Scannable Operational Table ─────────────────────────── */}
      {!loading && !error && (
        <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0f172a] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                  <th className="py-3.5 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Service</th>
                  <th className="py-3.5 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Tier</th>
                  <th className="py-3.5 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Health</th>
                  <th className="py-3.5 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Availability / SLO</th>
                  <th className="py-3.5 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">P95 Latency</th>
                  <th className="py-3.5 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Error Rate</th>
                  <th className="py-3.5 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Error Budget</th>
                  <th className="py-3.5 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Burn Rate</th>
                  <th className="py-3.5 px-4 text-slate-400 font-semibold uppercase text-[10px] tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((item) => {
                  const s = item.service;
                  const sig = item.goldenSignals;
                  const primarySlo = item.slos[0];
                  const minBudget = Math.min(...item.slos.map((x) => x.errorBudget.remainingPercent), 100);
                  const maxBurn = Math.max(...item.slos.map((x) => x.burnRate.value), 0);

                  return (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors duration-150 group">
                      {/* Service Name & Owner Team */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/services/${s.id}`}
                          className="font-bold text-white hover:text-cyan-400 transition-colors duration-150 flex items-center gap-1.5"
                        >
                          {s.name}
                          <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
                        </Link>
                        <p className="text-[10.5px] text-slate-500 mt-0.5">{s.ownerTeam}</p>
                      </td>

                      {/* Tier */}
                      <td className="py-3.5 px-4 font-mono-brand">
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-semibold uppercase bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                          {s.tier}
                        </span>
                      </td>

                      {/* Health Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={s.status} />
                      </td>

                      {/* Availability / Primary SLO */}
                      <td className="py-3.5 px-4">
                        {primarySlo ? (
                          <div>
                            <span
                              className={`font-mono-brand font-bold ${
                                primarySlo.compliancePercent >= primarySlo.target ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {primarySlo.compliancePercent.toFixed(2)}%
                            </span>
                            <span className="text-[9.5px] text-slate-500 block">target {primarySlo.target}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">N/A</span>
                        )}
                      </td>

                      {/* P95 Latency */}
                      <td className="py-3.5 px-4 font-mono-brand text-slate-200">
                        {sig.latency.p95Ms}ms
                        <span className="text-[9.5px] text-slate-500 block font-normal">p50: {sig.latency.p50Ms}ms</span>
                      </td>

                      {/* Error Rate */}
                      <td className="py-3.5 px-4 font-mono-brand">
                        <span
                          className={
                            sig.errorRatePercent >= 1.0
                              ? "text-rose-400 font-bold"
                              : sig.errorRatePercent > 0.1
                              ? "text-amber-400 font-bold"
                              : "text-emerald-400"
                          }
                        >
                          {sig.errorRatePercent.toFixed(2)}%
                        </span>
                      </td>

                      {/* Error Budget Remaining */}
                      <td className="py-3.5 px-4 w-44">
                        <ErrorBudgetBar remainingPercent={minBudget} size="sm" showDetails={false} />
                        <div className="flex items-center justify-between text-[10px] mt-1 text-slate-400 font-mono-brand">
                          <span>{minBudget.toFixed(1)}%</span>
                          <span className="text-slate-500">{minBudget < 10 ? "CRITICAL" : minBudget < 30 ? "WARNING" : "NOMINAL"}</span>
                        </div>
                      </td>

                      {/* Burn Rate */}
                      <td className="py-3.5 px-4">
                        <BurnRateBadge rate={maxBurn} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/services/${s.id}`}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-cyan-500/15 text-slate-300 hover:text-cyan-300 border border-white/[0.06] hover:border-cyan-500/30 transition-all duration-150 text-[11px] font-medium"
                        >
                          Details →
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
