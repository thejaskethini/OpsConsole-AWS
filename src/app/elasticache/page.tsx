"use client";
import { useState, useEffect } from "react";
import { Zap, RefreshCw, Loader, CheckCircle, Database, Server, Layers } from "lucide-react";
import { useRegion } from "@/components/RegionProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

export default function ElastiCachePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const { region } = useRegion();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/elasticache?region=${region}`);
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setData(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [region]);

  const clusters = data ? (data.clusters as Record<string, unknown>[]) : [];
  const summary = data ? (data.summary as Record<string, unknown>) : {};

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Zap}
        title="ElastiCache In-Memory Datastores"
        subtitle={`Redis and Memcached caching clusters, node types, and cluster availability — region: ${region}`}
        iconColor="#eab308"
        iconBgColor="rgba(234, 179, 8, 0.1)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            Database Substrate
          </span>
        }
        actions={
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-white/[0.06]"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Layers}
          label="Total Clusters"
          value={Number(summary.total || 0)}
          color="#06b6d4"
        />
        <StatCard
          icon={CheckCircle}
          label="Available"
          value={Number(summary.available || 0)}
          color="#10b981"
        />
        <StatCard
          icon={Database}
          label="Redis"
          value={Number(summary.redis || 0)}
          color="#f43f5e"
        />
        <StatCard
          icon={Server}
          label="Memcached"
          value={Number(summary.memcached || 0)}
          color="#eab308"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 surface-card rounded-xl">
          <Loader className="animate-spin text-cyan-400" size={16} />
          <span>Loading ElastiCache data…</span>
        </div>
      )}
      {error && (
        <div className="surface-card rounded-xl p-6 flex items-center gap-3 text-rose-400 border border-rose-500/20">
          <p className="text-xs">Error: {error} (Ensure AWS credentials are configured in .env.local)</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clusters.length === 0 && (
            <div className="surface-card rounded-xl p-12 text-center text-slate-400 col-span-3 text-xs">
              No ElastiCache clusters found in {region}.
            </div>
          )}
          {clusters.map((c, i) => (
            <div key={i} className="surface-card rounded-xl p-5 flex flex-col gap-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-white text-sm font-mono truncate">{String(c.ClusterId)}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold shrink-0 border ${c.Status === "available" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
                  {c.Status === "available" ? <CheckCircle size={10} className="inline mr-1" /> : null}{String(c.Status)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-400 pt-2 border-t border-white/[0.04]">
                <div><span className="text-slate-500">Engine:</span> <span className="text-slate-200 font-medium ml-1">{String(c.Engine)} {String(c.EngineVersion)}</span></div>
                <div><span className="text-slate-500">Node Type:</span> <span className="text-slate-200 font-mono ml-1">{String(c.NodeType)}</span></div>
                <div><span className="text-slate-500">Nodes:</span> <span className="text-slate-200 font-mono ml-1">{String(c.NumNodes)}</span></div>
                {c.Port != null && <div><span className="text-slate-500">Port:</span> <span className="text-slate-200 font-mono ml-1">{String(c.Port)}</span></div>}
                {!!c.Endpoint && <div className="col-span-2"><span className="text-slate-500">Endpoint:</span> <span className="text-cyan-400 font-mono text-xs ml-1 break-all">{String(c.Endpoint)}</span></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
