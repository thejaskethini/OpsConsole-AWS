"use client";
import { useState } from "react";
import { TrendingDown, RefreshCw, Loader2, AlertTriangle, Info, CheckCircle, DollarSign } from "lucide-react";
import { useRegion } from "@/components/RegionProvider";

interface Finding {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  resource: string;
  resourceType: string;
  finding: string;
  suggestion: string;
  estimatedMonthlySavings?: number;
  data?: Record<string, unknown>;
}

interface Summary {
  total: number;
  critical: number;
  warning: number;
  info: number;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
}

const severityConfig = {
  critical: { icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", badge: "bg-rose-500/10 text-rose-300 border-rose-500/20" },
  warning:  { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", badge: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  info:     { icon: Info, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" },
};

const categoryColors: Record<string, string> = {
  EC2: "text-cyan-400", EBS: "text-rose-400", Networking: "text-blue-400",
  RDS: "text-blue-400", ECS: "text-violet-400", S3: "text-amber-400",
  ALB: "text-cyan-400", ElastiCache: "text-emerald-400",
};

export default function OptimizationPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const { region } = useRegion();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/optimization?region=${region}`);
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const d = await res.json();
      setFindings(d.findings);
      setSummary(d.summary);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoading(false); }
  };

  const filtered = filter === "all" ? findings : findings.filter(f => f.severity === filter);

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-heading">Cost Optimization</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
              AWS Analyzer · {region}
            </span>
          </div>
          <p className="text-sm text-slate-400">Right-sizing recommendations, idle resource remediation, and projected savings opportunities.</p>
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs rounded-lg transition-colors font-medium cursor-pointer"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {loading ? "Scanning AWS…" : "Scan & Analyze"}
        </button>
      </div>

      {/* Empty state */}
      {!loading && !summary && !error && (
        <div className="surface-card rounded-xl p-16 text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <TrendingDown size={24} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-base">Ready to Analyze Cloud Waste & Sizing</h2>
            <p className="text-slate-400 text-xs mt-1 max-w-md">Click &quot;Scan &amp; Analyze&quot; to inspect active EC2, RDS, EBS, ECS, S3, and ALB resources for cost-reduction opportunities.</p>
          </div>
        </div>
      )}

      {error && <div className="surface-card border-rose-500/30 text-rose-300 rounded-xl p-4 text-xs text-center">Error: {error}</div>}

      {/* Summary KPI Strip */}
      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="surface-card rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Findings</p>
              <p className="text-2xl font-bold font-mono text-white mt-1">{summary.total}</p>
            </div>
            <div className="surface-card rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Critical</p>
              <p className="text-2xl font-bold font-mono text-rose-400 mt-1">{summary.critical}</p>
            </div>
            <div className="surface-card rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Warning</p>
              <p className="text-2xl font-bold font-mono text-amber-400 mt-1">{summary.warning}</p>
            </div>
            <div className="surface-card rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Info</p>
              <p className="text-2xl font-bold font-mono text-cyan-400 mt-1">{summary.info}</p>
            </div>
            <div className="surface-card rounded-xl p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Monthly Savings</p>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">${summary.estimatedMonthlySavings}</p>
            </div>
            <div className="surface-card rounded-xl p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Annual Savings</p>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">${summary.estimatedAnnualSavings}</p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 text-xs">
            {(["all", "critical", "warning", "info"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg border font-medium uppercase tracking-wider text-[11px] transition-colors cursor-pointer ${
                  filter === f 
                    ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300 font-semibold" 
                    : "surface-card text-slate-400 hover:text-white"
                }`}
              >
                {f} ({f === "all" ? findings.length : findings.filter(x => x.severity === f).length})
              </button>
            ))}
          </div>

          {/* Findings List */}
          <div className="flex flex-col gap-3">
            {filtered.map(f => {
              const cfg = severityConfig[f.severity] || severityConfig.info;
              const SevIcon = cfg.icon;

              return (
                <div key={f.id} className={`surface-card rounded-xl p-5 border ${cfg.border}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                        <SevIcon size={16} className={cfg.color} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs font-mono font-semibold ${categoryColors[f.category] || "text-slate-300"}`}>
                            {f.category}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs font-mono text-slate-400 truncate max-w-xs">{f.resource}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${cfg.badge}`}>
                            {f.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white">{f.finding}</p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{f.suggestion}</p>
                      </div>
                    </div>

                    {f.estimatedMonthlySavings && f.estimatedMonthlySavings > 0 ? (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Est. Savings</p>
                        <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                          +${f.estimatedMonthlySavings}/mo
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
