"use client";
import { useState, useEffect } from "react";
import { ArrowRightLeft, ShieldAlert, Loader, Activity, CheckCircle2, AlertTriangle } from "lucide-react";
import { ExportCSVButton } from "@/components/ExportCSVButton";
import { useRegion } from "@/components/RegionProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

export default function ALBDashboard() {
  const [data, setData] = useState<{ albs: Record<string, unknown>[], targetGroups: Record<string, unknown>[] }>({ albs: [], targetGroups: [] });
  const { region } = useRegion();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/alb?region=${region}`)
      .then(res => {
         if(!res.ok) throw new Error("Failed to fetch ALB data");
         return res.json();
      })
      .then(d => {
         setData(d);
         setLoading(false);
      })
      .catch(e => {
         setError(e.message);
         setLoading(false);
      });
  }, [region]);

  const total5xx1h = data.albs.reduce((acc, a) => acc + (Number(a.error5XX_1h) || 0), 0);
  const totalHealthyTargets = data.targetGroups.reduce((acc, tg) => acc + (Number(tg.Healthy) || 0), 0);
  const totalUnhealthyTargets = data.targetGroups.reduce((acc, tg) => acc + (Number(tg.Unhealthy) || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={ArrowRightLeft}
        title="Application Load Balancers"
        subtitle={`Traffic routing, target group health status, and 5XX error telemetry — region: ${region}`}
        iconColor="#14b8a6"
        iconBgColor="rgba(20, 184, 166, 0.1)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
            Networking Substrate
          </span>
        }
        actions={!loading && (
          <div className="flex gap-2">
            <ExportCSVButton data={data.albs} filename="alb-metrics" />
            <ExportCSVButton data={data.targetGroups} filename="target-groups" />
          </div>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ArrowRightLeft}
          label="Active ALBs"
          value={data.albs.length}
          color="#14b8a6"
        />
        <StatCard
          icon={CheckCircle2}
          label="Healthy Targets"
          value={totalHealthyTargets}
          color="#10b981"
        />
        <StatCard
          icon={AlertTriangle}
          label="Unhealthy Targets"
          value={totalUnhealthyTargets}
          color="#f43f5e"
        />
        <StatCard
          icon={Activity}
          label="5XX Errors (1h)"
          value={total5xx1h}
          color="#f59e0b"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 surface-card rounded-xl">
          <Loader size={16} className="animate-spin text-cyan-400" />
          <span>Scanning Load Balancers…</span>
        </div>
      ) : error ? (
        <div className="surface-card rounded-xl p-6 flex items-center gap-3 text-rose-400 border border-rose-500/20">
          <p className="text-xs">Error: {error}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Active ALBs Card Grid */}
          <div className="surface-card rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 border-b border-white/[0.06] pb-3">Active ALBs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.albs.map((alb: Record<string, unknown>, i: number) => (
                <div key={i} className="flex border border-white/[0.06] bg-white/[0.01] rounded-xl p-4 justify-between items-center hover:bg-white/[0.03] transition-colors">
                  <div className="flex flex-col px-1 min-w-0">
                    <span className="text-sm font-semibold text-white truncate">{String(alb.Name)}</span>
                    <span className="text-xs text-slate-400 font-mono mt-0.5">Scheme: {String(alb.Scheme)} | State: {String(alb.State)}</span>
                  </div>
                  <div className="flex gap-4 shrink-0">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">5XX (1h)</span>
                      <span className={`text-base font-mono font-bold ${Number(alb.error5XX_1h) > 0 ? "text-rose-400" : "text-slate-300"}`}>{Number(alb.error5XX_1h)}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">5XX (24h)</span>
                      <span className={`text-base font-mono font-bold ${Number(alb.error5XX_24h) > 10 ? "text-rose-400" : "text-slate-300"}`}>{Number(alb.error5XX_24h)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {data.albs.length === 0 && <div className="text-xs text-slate-400 p-4">No ALBs found in region.</div>}
            </div>
          </div>

          {/* Target Groups Table */}
          <div className="surface-card rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Load Balancer</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Target Group</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Healthy</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Unhealthy</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.targetGroups.map((tg: Record<string, unknown>, i: number) => (
                  <tr key={i} className={`hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                    <td className="px-4 py-3.5 font-medium text-white text-xs">{String(tg.AlbName)}</td>
                    <td className="px-4 py-3.5 text-slate-300 font-mono text-xs">{String(tg.TgName)}</td>
                    <td className="px-4 py-3.5 font-mono text-emerald-400 font-semibold">{Number(tg.Healthy)}</td>
                    <td className={`px-4 py-3.5 font-mono font-semibold ${Number(tg.Unhealthy) > 0 ? "text-rose-400" : "text-slate-400"}`}>{Number(tg.Unhealthy)}</td>
                    <td className="px-4 py-3.5">
                      {tg.ZeroHealthy ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full w-fit border border-rose-500/20">
                          <ShieldAlert size={12} /> 0 Healthy Targets
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 bg-white/[0.04] px-2.5 py-0.5 rounded-full w-fit border border-white/[0.06]">
                          Routing Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {data.targetGroups.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-xs text-slate-400">No Target Groups found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
