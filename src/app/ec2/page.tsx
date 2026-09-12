"use client";
import { useState, useEffect, Fragment } from "react";
import { Server, RefreshCw, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, Activity, HardDrive, Wifi, Cpu } from "lucide-react";
import { useRegion } from "@/components/RegionProvider";

/* ── Mini sparkline chart ──────────────────────────────────────────── */
function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return <span className="text-xs text-slate-500 font-mono">No data</span>;
  const w = 200;
  const max = Math.max(...data, 0.01);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function formatBytes(b: number): string {
  if (b === 0) return "0 B";
  if (b < 1024) return `${b.toFixed(0)} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
}

interface LiveMetric {
  name: string;
  unit?: string;
  datapoints: { timestamp: string; value: number }[];
  current: number;
  avg: number;
  max: number;
}

export default function EC2Page() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<Record<string, LiveMetric[]>>({});
  const [metricsLoading, setMetricsLoading] = useState<Record<string, boolean>>({});

  const { region } = useRegion();

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/ec2?region=${region}`);
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setData(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { setLiveMetrics({}); setExpandedId(null); fetchData(); }, [region]);

  const fetchLiveMetrics = async (instanceId: string) => {
    if (liveMetrics[instanceId]) return;
    setMetricsLoading(prev => ({ ...prev, [instanceId]: true }));
    try {
      const res = await fetch(`/api/live-metrics?instanceId=${instanceId}&type=ec2&hours=6&region=${region}`);
      const d = await res.json();
      if (d.metrics) setLiveMetrics(prev => ({ ...prev, [instanceId]: d.metrics }));
    } catch { }
    finally { setMetricsLoading(prev => ({ ...prev, [instanceId]: false })); }
  };

  const toggleExpand = (instanceId: string) => {
    if (expandedId === instanceId) {
      setExpandedId(null);
    } else {
      setExpandedId(instanceId);
      fetchLiveMetrics(instanceId);
    }
  };

  const instances = data ? (data.instances as Record<string, unknown>[]) : [];
  const summary = data ? (data.summary as Record<string, unknown>) : {};

  const metricColors: Record<string, string> = {
    "CPU Utilization": "#06b6d4",
    "Network In": "#3b82f6",
    "Network Out": "#8b5cf6",
    "Disk Read Ops": "#06b6d4",
    "Disk Write Ops": "#ec4899",
    "Disk Read Bytes": "#14b8a6",
    "Disk Write Bytes": "#f43f5e",
    "CPU Credit Balance": "#eab308",
    "Status Check Failed": "#ef4444",
  };

  const metricIcons: Record<string, any> = {
    "CPU Utilization": Cpu,
    "Network In": Wifi,
    "Network Out": Wifi,
    "Disk Read Ops": HardDrive,
    "Disk Write Ops": HardDrive,
    "Disk Read Bytes": HardDrive,
    "Disk Write Bytes": HardDrive,
    "CPU Credit Balance": Activity,
    "Status Check Failed": XCircle,
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-heading">EC2 Instances</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
              AWS Compute · {region}
            </span>
          </div>
          <p className="text-sm text-slate-400">Click any running instance to inspect CloudWatch CPU, network, and I/O metrics.</p>
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs rounded-lg transition-colors font-medium cursor-pointer"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Instances", value: Number(summary.total || 0), color: "#06b6d4" },
          { label: "Running", value: Number(summary.running || 0), color: "#10b981" },
          { label: "Stopped", value: Number(summary.stopped || 0), color: "#f43f5e" },
          { label: "Other States", value: Number(summary.other || 0), color: "#eab308" },
        ].map((s) => (
          <div key={s.label} className="surface-card rounded-xl p-4.5">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 font-mono text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-3 surface-card rounded-xl">
          <Loader2 size={20} className="animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Querying EC2 instances…</span>
        </div>
      )}
      {error && <div className="surface-card border-rose-500/30 text-rose-300 rounded-xl p-4 text-xs text-center">Error: {error}</div>}

      {!loading && !error && (
        <div className="surface-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  {["", "Name", "Instance ID", "Type", "State", "Public IP", "Private IP", "AZ"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {instances.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-xs">No EC2 instances found</td></tr>
                )}
                {instances.map((inst) => {
                  const id = String(inst.InstanceId || "");
                  const isRunning = inst.State === "running";
                  const isExpanded = expandedId === id;
                  const metrics = liveMetrics[id] || [];
                  const isLoadingMetrics = metricsLoading[id] || false;

                  return (
                    <Fragment key={id}>
                      <tr
                        className={`transition-colors cursor-pointer hover:bg-white/[0.02] ${isExpanded ? 'bg-white/[0.02]' : ''}`}
                        onClick={() => isRunning && toggleExpand(id)}
                      >
                        <td className="px-4 py-3 w-8">
                          {isRunning && (
                            isExpanded ? <ChevronUp size={14} className="text-cyan-400" /> : <ChevronDown size={14} className="text-slate-500" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white text-xs">{String(inst.Name || "-")}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{id}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-slate-300 font-mono text-[11px]">
                            {String(inst.InstanceType || "-")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1.5 text-xs font-semibold ${isRunning ? "text-emerald-400" : inst.State === "stopped" ? "text-rose-400" : "text-amber-400"}`}>
                            {isRunning ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {String(inst.State || "-")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{String(inst.PublicIp || "-")}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{String(inst.PrivateIp || "-")}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{String(inst.AZ || "-")}</td>
                      </tr>

                      {/* Expanded Live Metrics */}
                      {isExpanded && (
                        <tr key={`${id}-metrics`}>
                          <td colSpan={8} className="px-4 py-5 bg-[#0a0f1d]/40">
                            {isLoadingMetrics && (
                              <div className="flex items-center gap-2 text-slate-400 text-xs py-6 justify-center">
                                <Loader2 size={16} className="animate-spin text-cyan-400" />
                                Fetching CloudWatch metrics for {String(inst.Name || id)}…
                              </div>
                            )}
                            {!isLoadingMetrics && metrics.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {metrics.filter(m => m.datapoints.length > 0).map((m) => {
                                  const Icon = metricIcons[m.name] || Activity;
                                  const color = metricColors[m.name] || "#06b6d4";
                                  const displayVal = m.unit === "bytes" ? formatBytes(m.current) :
                                    m.unit === "%" ? `${m.current.toFixed(1)}%` :
                                    m.current.toFixed(1);
                                  const displayAvg = m.unit === "bytes" ? formatBytes(m.avg) :
                                    m.unit === "%" ? `${m.avg.toFixed(1)}%` :
                                    m.avg.toFixed(1);

                                  return (
                                    <div key={m.name} className="surface-card rounded-xl p-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${color}15` }}>
                                            <Icon size={12} style={{ color }} />
                                          </div>
                                          <span className="text-xs text-slate-300 font-medium">{m.name}</span>
                                        </div>
                                        <span className="text-sm font-bold font-mono text-white">{displayVal}</span>
                                      </div>
                                      <Sparkline data={m.datapoints.map(d => d.value)} color={color} height={35} />
                                      <div className="flex justify-between mt-2.5 text-[10.5px] text-slate-400 font-mono">
                                        <span>Avg: <span className="text-slate-200">{displayAvg}</span></span>
                                        <span>Max: <span className="text-slate-200">{m.unit === "bytes" ? formatBytes(m.max) : m.unit === "%" ? `${m.max.toFixed(1)}%` : m.max.toFixed(1)}</span></span>
                                        <span className="text-slate-500">6h window</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {!isLoadingMetrics && metrics.filter(m => m.datapoints.length > 0).length === 0 && (
                              <p className="text-center text-xs text-slate-400 py-4 font-mono">No CloudWatch data available for this instance</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
