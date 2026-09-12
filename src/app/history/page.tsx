"use client";
import { useState, useEffect } from "react";
import { Clock, RefreshCw, Loader2, AlertTriangle, Info, Server, Database, Container, Terminal, ShieldAlert, ChevronDown } from "lucide-react";
import { useRegion } from "@/components/RegionProvider";

interface HistoryEvent {
  eventId: string;
  timestamp: string;
  eventName: string;
  resourceId: string;
  resourceType: string;
  username: string;
  sourceIp: string;
  severity: "critical" | "warning" | "info";
  reason: string;
  recoverySteps: string[];
  hasError: boolean;
}

const severityConfig = {
  critical: { icon: ShieldAlert, color: "text-rose-400", border: "border-rose-500/20", badge: "bg-rose-500/10 text-rose-300 border-rose-500/20" },
  warning:  { icon: AlertTriangle, color: "text-amber-400", border: "border-amber-500/20", badge: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  info:     { icon: Info, color: "text-cyan-400", border: "border-cyan-500/15", badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" },
};

const typeIcon = (type: string) => {
  if (type.includes("Instance")) return Server;
  if (type.includes("DB")) return Database;
  if (type.includes("Cluster") || type.includes("Task")) return Container;
  return Terminal;
};

export default function HistoryPage() {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { region } = useRegion();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/history?region=${region}`);
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const d = await res.json();
      setEvents(d.history || []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [region]);

  const filtered = events.filter(e => 
    e.resourceId.toLowerCase().includes(search.toLowerCase()) || 
    e.eventName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-heading">Failure History</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono">
              Audit Timeline
            </span>
          </div>
          <p className="text-sm text-slate-400">AWS CloudTrail audit — downtime incidents and state changes in the last 7 days</p>
        </div>
        <div className="flex gap-3 items-center">
          <input 
            type="text" 
            placeholder="Search resource or event…" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.08] text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/50 w-64 placeholder:text-slate-500 font-mono transition-all"
          />
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

      {error && <div className="surface-card border-rose-500/30 text-rose-300 rounded-xl p-4 text-xs">Error: {error}</div>}

      <div className="flex flex-col gap-3">
        {loading && (
          <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-3 surface-card rounded-xl">
            <Loader2 size={24} className="animate-spin text-cyan-400" />
            <span className="text-xs font-mono">Scanning AWS CloudTrail logs…</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 surface-card rounded-xl flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Clock size={20} className="text-emerald-400" />
            </div>
            <p className="text-white font-semibold text-sm">No Failure Events Detected</p>
            <p className="text-xs text-slate-400">All infrastructure resources in {region} operated normally in the selected period.</p>
          </div>
        )}

        {!loading && filtered.map((ev) => {
          const cfg = severityConfig[ev.severity] || severityConfig.info;
          const SevIcon = cfg.icon;
          const TypeIcon = typeIcon(ev.resourceType);
          const isExpanded = expandedId === ev.eventId;

          return (
            <div 
              key={ev.eventId} 
              className={`surface-card rounded-xl p-4.5 border transition-all ${cfg.border} ${isExpanded ? "bg-[#0e172c]" : ""}`}
            >
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : ev.eventId)}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <SevIcon size={16} className={cfg.color} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-xs font-mono">{ev.eventName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${cfg.badge}`}>
                        {ev.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <TypeIcon size={12} className="text-slate-500" />
                        {ev.resourceId}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[11px] text-slate-500">User: {ev.username}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(ev.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex flex-col gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10.5px] tracking-wider block mb-1">
                      Event Summary & Root Cause
                    </span>
                    <p className="text-slate-200 leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/[0.04] font-mono text-[11.5px]">
                      {ev.reason}
                    </p>
                  </div>

                  {ev.recoverySteps && ev.recoverySteps.length > 0 && (
                    <div>
                      <span className="text-slate-400 font-semibold uppercase text-[10.5px] tracking-wider block mb-1.5">
                        Recommended Recovery Procedures
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {ev.recoverySteps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-slate-300 bg-white/[0.015] px-3 py-1.5 rounded border border-white/[0.04]">
                            <span className="text-cyan-400 font-mono text-[10.5px] font-bold">0{idx + 1}</span>
                            <span className="text-[11.5px]">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
