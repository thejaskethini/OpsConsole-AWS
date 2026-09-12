"use client";
import { useState, useEffect } from "react";
import { Container, Activity, AlertTriangle, Loader, CheckCircle2, Server, Box } from "lucide-react";
import { ExportCSVButton } from "@/components/ExportCSVButton";
import { useRegion } from "@/components/RegionProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

export default function ECSDashboard() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const { region } = useRegion();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/ecs?region=${region}`)
      .then(res => {
         if(!res.ok) throw new Error("Failed to fetch ECS data");
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

  const totalRunning = data.reduce((acc, s) => acc + (Number(s.Running) || 0), 0);
  const totalDesired = data.reduce((acc, s) => acc + (Number(s.Desired) || 0), 0);
  const unhealthyServices = data.filter(s => !!s.Unhealthy).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Container}
        title="ECS Container Clusters"
        subtitle={`Fargate & EC2 task orchestrations, desired task counts, and deployment status — region: ${region}`}
        iconColor="#a855f7"
        iconBgColor="rgba(168, 85, 247, 0.1)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Compute Substrate
          </span>
        }
        actions={!loading && data.length > 0 ? <ExportCSVButton data={data} filename="ecs-health" /> : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Container}
          label="Total Services"
          value={data.length}
          color="#a855f7"
        />
        <StatCard
          icon={Activity}
          label="Running Tasks"
          value={totalRunning}
          color="#10b981"
        />
        <StatCard
          icon={Box}
          label="Desired Tasks"
          value={totalDesired}
          color="#06b6d4"
        />
        <StatCard
          icon={AlertTriangle}
          label="Unhealthy / Scaling"
          value={unhealthyServices}
          color={unhealthyServices > 0 ? "#f43f5e" : "#10b981"}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 surface-card rounded-xl">
          <Loader size={16} className="animate-spin text-cyan-400" />
          <span>Scanning ECS clusters…</span>
        </div>
      )}
      {error && (
        <div className="surface-card rounded-xl p-6 flex items-center gap-3 text-rose-400 border border-rose-500/20">
          <p className="text-xs">Error: {error} (Check AWS credentials in .env.local)</p>
        </div>
      )}

      {/* Table grid */}
      {!loading && !error && (
        <div className="surface-card rounded-xl overflow-hidden">
           <table className="w-full text-left text-xs">
              <thead>
                 <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Cluster</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Service</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Tasks (Running / Desired / Pending)</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Health</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                  {data.map((svc: Record<string, unknown>, i: number) => (
                      <tr key={i} className={`hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                          <td className="px-4 py-3.5 font-medium text-white font-mono text-xs">{String(svc.Cluster)}</td>
                          <td className="px-4 py-3.5 text-slate-300 font-mono text-xs">{String(svc.Service)}</td>
                          <td className="px-4 py-3.5 font-mono">
                             <span className={Number(svc.Running) < Number(svc.Desired) ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>{Number(svc.Running)}</span>
                             <span className="text-slate-500"> / </span>
                             <span className="text-slate-300">{Number(svc.Desired)}</span>
                             <span className="text-slate-500"> / </span>
                             <span className={Number(svc.Pending) > 0 ? "text-amber-400 font-semibold" : "text-slate-500"}>{Number(svc.Pending)}</span>
                          </td>
                          <td className="px-4 py-3.5">
                              <span className="px-2.5 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded-full text-[11px] text-slate-300 font-medium">
                                  {String(svc.Status)}
                              </span>
                          </td>
                          <td className="px-4 py-3.5">
                              {svc.Unhealthy ? (
                                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full w-fit border border-rose-500/20">
                                      <AlertTriangle size={12} /> Failed / Scaling
                                  </span>
                              ) : (
                                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full w-fit border border-emerald-500/20">
                                      <CheckCircle2 size={12} /> Healthy
                                  </span>
                              )}
                          </td>
                      </tr>
                  ))}
                  {data.length === 0 && (
                      <tr>
                           <td colSpan={5} className="px-4 py-12 text-center text-xs text-slate-400">No clusters or services found in this region.</td>
                      </tr>
                  )}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
}
