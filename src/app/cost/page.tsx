"use client";
import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, Loader, TrendingUp, TrendingDown,
  ArrowUpRight, ChevronDown, Calendar, Database,
} from "lucide-react";
import { useRegion } from "@/components/RegionProvider";

/* ── Restrained Cost Bar / Line Chart ──────────────────────────────── */
function CostLineChart({ data, avgPerDay }: { data: { date: string; amount: number; cumulative?: number }[]; avgPerDay?: number }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0)
    return <p className="text-slate-500 text-xs text-center py-12 font-mono">No cost telemetry available for this period</p>;

  const maxVal = Math.max(...data.map((d) => d.amount), 0.01);
  const w = 920, h = 220, pad = { t: 20, r: 24, b: 32, l: 60 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;

  const yTicks = [0, 0.33, 0.66, 1].map((f) => {
    const raw = maxVal * f;
    return {
      val: raw >= 1000 ? `$${(raw / 1000).toFixed(1)}k` : `$${Math.round(raw)}`,
      y: pad.t + plotH - f * plotH,
    };
  });

  const getX = (i: number) => pad.l + (i + 0.5) * (plotW / data.length);
  const getY = (v: number) => pad.t + plotH - (v / maxVal) * plotH;
  const barW = Math.max(6, Math.min(22, (plotW / data.length) * 0.6));
  const avgY = avgPerDay && avgPerDay > 0 ? getY(avgPerDay) : null;

  const hoveredItem = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="relative w-full select-none flex justify-center">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full max-h-[250px] overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="costPageBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="costPageBarHoverGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={pad.l}
              y1={t.y}
              x2={w - pad.r}
              y2={t.y}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={1}
              strokeDasharray={i === 0 ? "none" : "3 3"}
            />
            <text
              x={pad.l - 10}
              y={t.y + 3.5}
              textAnchor="end"
              fill="#64748b"
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
              fontWeight={500}
            >
              {t.val}
            </text>
          </g>
        ))}

        {/* Subtle Average Daily Line */}
        {avgY !== null && (
          <g>
            <line
              x1={pad.l}
              y1={avgY}
              x2={w - pad.r}
              y2={avgY}
              stroke="rgba(245, 158, 11, 0.4)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={w - pad.r - 2}
              y={avgY - 4}
              textAnchor="end"
              fill="rgba(245, 158, 11, 0.75)"
              fontSize={9.5}
              fontFamily="JetBrains Mono, monospace"
            >
              avg ${Math.round(avgPerDay || 0)}
            </text>
          </g>
        )}

        {/* Daily Bars */}
        {data.map((d, i) => {
          const cx = getX(i);
          const cy = getY(d.amount);
          const barH = pad.t + plotH - cy;
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={d.date}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
            >
              <rect
                x={cx - plotW / data.length / 2}
                y={pad.t}
                width={plotW / data.length}
                height={plotH}
                fill="transparent"
              />
              {isHovered && (
                <rect
                  x={cx - plotW / data.length / 2 + 1}
                  y={pad.t}
                  width={plotW / data.length - 2}
                  height={plotH}
                  fill="rgba(255, 255, 255, 0.03)"
                  rx={3}
                />
              )}
              <rect
                x={cx - barW / 2}
                y={cy}
                width={barW}
                height={Math.max(2, barH)}
                rx={2}
                fill={isHovered ? "url(#costPageBarHoverGrad)" : "url(#costPageBarGrad)"}
              />
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const step = data.length > 20 ? 4 : data.length > 10 ? 2 : 1;
          const showLabel = i % step === 0 || i === data.length - 1;
          if (!showLabel) return null;

          const cx = getX(i);
          const dateObj = new Date(d.date + "T00:00:00");
          const label = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

          return (
            <text
              key={d.date}
              x={cx}
              y={pad.t + plotH + 18}
              textAnchor="middle"
              fill={hoveredIdx === i ? "#38bdf8" : "#64748b"}
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
              fontWeight={hoveredIdx === i ? 600 : 400}
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredItem && (
        <div
          className="absolute z-20 pointer-events-none transition-all duration-75 transform -translate-x-1/2"
          style={{
            left: `${((getX(hoveredIdx!) / w) * 100).toFixed(1)}%`,
            top: "8px",
          }}
        >
          <div className="bg-[#0c1322] border border-white/[0.12] shadow-xl rounded-lg px-3 py-1.5 text-xs whitespace-nowrap font-mono">
            <p className="text-slate-400 text-[10.5px]">
              {new Date(hoveredItem.date + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="text-cyan-400 font-bold text-xs mt-0.5">
              ${hoveredItem.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Month Dropdown ─────────────────────────────────────────────────── */
function MonthPicker({
  value, options, onChange,
}: { value: string | null; options: { label: string; value: string }[]; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) || { label: "Last 60 Days", value: "__all" };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] hover:border-cyan-500/30 text-xs text-slate-300 font-medium transition-all cursor-pointer"
      >
        <Calendar size={13} className="text-cyan-400" />
        <span>{selected.label}</span>
        <ChevronDown size={12} className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 right-0 w-52 bg-[#0c1322] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/80 z-50 overflow-hidden">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-xs hover:bg-white/[0.04] border-b border-white/[0.04] transition-colors cursor-pointer ${value === null ? "text-cyan-400 bg-cyan-500/[0.08] font-semibold" : "text-slate-300"}`}
          >
            Last 60 Days (All)
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-white/[0.04] transition-colors cursor-pointer ${opt.value === value ? "text-cyan-400 bg-cyan-500/[0.08] font-semibold" : "text-slate-300"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────────────────────────── */
export default function CostDashboard() {
  const { region } = useRegion();
  const [data, setData] = useState<{
    overall: { date: string; amount: number; cumulative: number }[];
    services: { service: string; total: number }[];
    serviceData: { date: string; service: string; amount: number }[];
    rdsBreakdown?: { id: string; amount: number }[];
    stats?: {
      totalSpend: number; days: number; avgPerDay: number;
      last3DayAvg: number; forecast30: number; forecast60: number; forecast90: number;
      currentMonthTotal: number; currentMonthDays: number; currentMonthLabel: string;
      startDate: string; endDate: string;
    };
    availableMonths?: { label: string; value: string }[];
  }>({ overall: [], services: [], serviceData: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const fetchCost = useCallback(async (month: string | null) => {
    setLoading(true); setError(null);
    try {
      const url = month
        ? `/api/cost?month=${month}&region=${region}`
        : `/api/cost?region=${region}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch Cost data");
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [region]);

  useEffect(() => { fetchCost(selectedMonth); }, [fetchCost, selectedMonth]);

  const stats = data.stats;
  const availableMonths = data.availableMonths || [];
  const currentMonthLabel = stats?.currentMonthLabel || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const serviceTotals: Record<string, number> = {};
  (data.services || []).forEach((s) => {
    serviceTotals[s.service] = (serviceTotals[s.service] || 0) + s.total;
  });
  const topServices = Object.entries(serviceTotals)
    .map(([name, cost]) => ({ name, cost }))
    .sort((a, b) => b.cost - a.cost);
  const totalServiceSpend = topServices.reduce((a, b) => a + b.cost, 0);

  const dailyCosts = [...data.overall]
    .map((r, i) => {
      const prev = i > 0 ? data.overall[i - 1].amount : r.amount;
      const change = prev > 0 ? ((r.amount - prev) / prev) * 100 : 0;
      return { date: r.date, amount: r.amount, change };
    })
    .reverse();

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-heading">AWS Cost Intelligence</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
              AWS Cost Explorer
            </span>
          </div>
          <p className="text-sm text-slate-400">
            {selectedMonth ? `Viewing: ${availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth}` : "15-day spend trends, category cost drivers, and forecast models"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker value={selectedMonth} options={availableMonths} onChange={setSelectedMonth} />
        </div>
      </div>

      {loading && (
        <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-3 surface-card rounded-xl">
          <Loader size={20} className="animate-spin text-cyan-400" />
          <span className="text-xs">Querying AWS Cost Explorer telemetry…</span>
        </div>
      )}

      {error && (
        <div className="surface-card border-rose-500/30 text-rose-300 rounded-xl p-4 text-xs text-center">
          Error: {error}
        </div>
      )}

      {!loading && !error && stats && (
        <>
          {/* Cost Overview KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="surface-card rounded-xl p-4.5">
              <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">{currentMonthLabel} MTD</p>
              <p className="text-2xl font-bold text-white font-mono mt-1">
                ${stats.currentMonthTotal.toFixed(2)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {stats.currentMonthDays} days · ${stats.currentMonthDays > 0 ? (stats.currentMonthTotal / stats.currentMonthDays).toFixed(2) : "0.00"}/day
              </p>
            </div>

            <div className="surface-card rounded-xl p-4.5">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Spend</p>
              <p className="text-2xl font-bold text-white font-mono mt-1">${stats.totalSpend.toFixed(2)}</p>
              <p className="text-xs text-slate-400 mt-1">{stats.days} days tracked</p>
            </div>

            <div className="surface-card rounded-xl p-4.5">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Average / Day</p>
              <p className="text-2xl font-bold text-amber-400 font-mono mt-1">${stats.avgPerDay.toFixed(2)}</p>
              <p className="text-xs text-slate-400 mt-1">across active period</p>
            </div>

            <div className="surface-card rounded-xl p-4.5">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">30-Day Forecast</p>
              <p className="text-2xl font-bold text-violet-400 font-mono mt-1">${stats.forecast30.toFixed(2)}</p>
              <p className="text-xs text-slate-400 mt-1">projected run rate</p>
            </div>

            <div className="surface-card rounded-xl p-4.5">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Categories</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">{topServices.length}</p>
              <p className="text-xs text-slate-400 mt-1">cost drivers tracked</p>
            </div>
          </div>

          {/* Daily Spend Trend Chart */}
          <div className="surface-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <DollarSign size={14} className="text-cyan-400" />
                  Daily Spend Trend
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {stats.startDate} → {stats.endDate} · AWS Cost Explorer
                </p>
              </div>
            </div>
            <CostLineChart data={data.overall} avgPerDay={stats.avgPerDay} />
          </div>

          {/* Top Cost Drivers (Ranked List) + Daily Breakdown Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Ranked Cost Drivers (7 cols) */}
            <div className="lg:col-span-7 surface-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <TrendingDown size={14} className="text-cyan-400" />
                  Top Cost Drivers
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {topServices.length} categories
                </span>
              </div>

              <div className="space-y-3.5">
                {topServices.slice(0, 8).map((svc, i) => {
                  const pct = totalServiceSpend > 0 ? (svc.cost / totalServiceSpend) * 100 : 0;
                  const cleanName = svc.name.replace(/^Amazon\s+/i, "").replace(/^AWS\s+/i, "");
                  const rankNum = String(i + 1).padStart(2, "0");

                  return (
                    <div key={svc.name} className="group">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className="text-[11px] font-mono font-semibold text-slate-500 w-5 shrink-0">
                            {rankNum}
                          </span>
                          <span className="text-slate-200 font-medium truncate text-xs" title={svc.name}>
                            {cleanName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 font-mono">
                          <span className="text-slate-400 text-xs">{pct.toFixed(1)}%</span>
                          <span className="text-white font-semibold text-xs">${svc.cost.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-cyan-500 transition-all duration-500 ease-out"
                          style={{ width: `${Math.min(100, Math.max(3, pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Daily Table (5 cols) */}
            <div className="lg:col-span-5 surface-card rounded-xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Calendar size={14} className="text-cyan-400" />
                  Recent Daily Activity
                </h3>
                <span className="text-xs text-slate-400 font-mono">{dailyCosts.length} days</span>
              </div>

              <div className="overflow-y-auto max-h-80 divide-y divide-white/[0.04]">
                {dailyCosts.slice(0, 10).map((d) => (
                  <div key={d.date} className="py-2 flex items-center justify-between text-xs hover:bg-white/[0.02] px-2 rounded transition-colors">
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric",
                      })}
                    </span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-white font-semibold">${d.amount.toFixed(2)}</span>
                      <span className={`text-[10.5px] ${d.change > 0 ? "text-rose-400" : d.change < 0 ? "text-emerald-400" : "text-slate-500"}`}>
                        {d.change !== 0 ? `${d.change > 0 ? "+" : ""}${d.change.toFixed(1)}%` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
