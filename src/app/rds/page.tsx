"use client";
import { useEffect, useState } from "react";
import { ResourceCard } from "@/components/ResourceCard";
import { Database, Loader2, RefreshCw } from "lucide-react";
import { useRegion } from "@/components/RegionProvider";

export default function RDSDashboard() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const { region } = useRegion();
  const [costData, setCostData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/rds?region=${region}`).then(res => res.ok ? res.json() : []),
      fetch(`/api/cost`).then(res => res.ok ? res.json() : {})
    ])
      .then(([rdsRes, costRes]: [any, any]) => {
         const rdsInstances = Array.isArray(rdsRes) ? rdsRes : [];
         setData(rdsInstances);
         const rdsMap: Record<string, number> = {};

         if (costRes.rdsBreakdown && costRes.rdsBreakdown.length > 0) {
           for (const item of costRes.rdsBreakdown) {
             const parts = (item.id as string).split(':');
             const lastPart = parts[parts.length - 1];
             const dbPart = parts.length >= 7 ? parts[6] : lastPart;
             rdsMap[dbPart] = (rdsMap[dbPart] || 0) + item.amount;
             rdsMap[lastPart] = (rdsMap[lastPart] || 0) + item.amount;
             rdsMap[item.id] = item.amount;
           }
         }

         if (Object.keys(rdsMap).length === 0 && costRes.services && rdsInstances.length > 0) {
           let rdsTotalCost = 0;
           for (const s of costRes.services) {
             if ((s.service as string)?.includes("Relational Database")) {
               rdsTotalCost += (s.total || s.amount || 0);
             }
           }
           if (rdsTotalCost > 0) {
             const cpuValues = rdsInstances.map((db: any) => Math.max(Number(db.CpuAvg) || 1, 1));
             const totalCpu = cpuValues.reduce((a: number, b: number) => a + b, 0);
             rdsInstances.forEach((db: any, i: number) => {
               const weight = cpuValues[i] / totalCpu;
               rdsMap[String(db.Identifier)] = rdsTotalCost * weight;
             });
           }
         }

         setCostData(rdsMap);
         setLoading(false);
      })
      .catch(e => {
         setError(e.message);
         setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, [region]);

  const uniqueCosts = new Map<string, number>();
  for (const db of data) {
    const id = String(db.Identifier);
    if (costData[id]) uniqueCosts.set(id, costData[id]);
  }
  const totalRdsCost = [...uniqueCosts.values()].reduce((s, v) => s + v, 0);
  const totalCostDisplay = totalRdsCost > 0 ? totalRdsCost.toFixed(2) : "—";

  const over = data.filter(d => d.IsRisky).length;
  const rightSized = data.filter(d => !d.IsRisky).length;

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-heading">RDS Databases</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
              AWS Data Layer · {region}
            </span>
          </div>
          <p className="text-sm text-slate-400">Database cluster health, storage utilization, connection saturation, and cost allocation.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs rounded-lg transition-colors font-medium cursor-pointer"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {loading ? "Scanning…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="surface-card rounded-xl p-4.5">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Instances</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 font-mono text-white">{data.length}</p>
        </div>
        <div className="surface-card rounded-xl p-4.5">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Right-Sized</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 font-mono text-emerald-400">{rightSized}</p>
        </div>
        <div className="surface-card rounded-xl p-4.5">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Over-Provisioned</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 font-mono text-amber-400">{over}</p>
        </div>
        <div className="surface-card rounded-xl p-4.5">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">14-Day Allocated Spend</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 font-mono text-cyan-400">${totalCostDisplay}</p>
        </div>
      </div>

      {loading && (
        <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-3 surface-card rounded-xl">
          <Loader2 size={20} className="animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Scanning RDS database clusters…</span>
        </div>
      )}
      {error && <div className="surface-card border-rose-500/30 text-rose-300 rounded-xl p-4 text-xs text-center">Error: {error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {!loading && !error && data.map(db => {
          const storagePct = db.AllocatedStorageGB ? 
            Math.max(0, 100 - ( (Number(db.FreeStorageBytesMin) / (Number(db.AllocatedStorageGB) * 1024 * 1024 * 1024)) * 100 )) 
            : 0;
          const dbId = String(db.Identifier);
          const dbCost = costData[dbId] ? costData[dbId].toFixed(2) : "0.00";

          return (
            <ResourceCard 
              key={dbId}
              name={dbId}
              cost={dbCost}
              isExact={false}
              provisionStatus={db.IsRisky ? "Right-sized" : "Over-provisioned"} 
              healthStatus={db.Status === 'available' ? 'Healthy' : 'Warning'}
              confidence="Weighted from Cost Explorer service telemetry"
              awsLink={`https://${region}.console.aws.amazon.com/rds/home?region=${region}#database:id=${dbId}`}
              dashboardLink="/rds"
              signals={`CPU avg 24h ${Number(db.CpuAvg).toFixed(1)}% · Storage used ${storagePct.toFixed(1)}% · Conns ${db.ConnectionsMax}`}
              metrics={[
                { label: "CPU Utilization", value: Number(db.CpuAvg), displayValue: `${Number(db.CpuAvg).toFixed(1)}%`, colorClass: Number(db.CpuAvg) > 80 ? "bg-rose-500" : Number(db.CpuAvg) > 50 ? "bg-amber-500" : "bg-cyan-500" },
                { label: "Storage Usage", value: storagePct, displayValue: `${storagePct.toFixed(1)}%`, colorClass: storagePct > 90 ? "bg-rose-500" : storagePct > 70 ? "bg-amber-500" : "bg-cyan-500" },
                { label: "Active Conns", value: Math.min(Number(db.ConnectionsMax), 100), displayValue: String(db.ConnectionsMax), colorClass: "bg-blue-500" }
              ]}
            />
          );
        })}
        {!loading && !error && data.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-16 surface-card rounded-xl">No RDS instances found in the current region.</div>
        )}
      </div>
    </div>
  );
}
