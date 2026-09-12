"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Database,
  Container,
  Box,
  ArrowRightLeft,
  Server,
  Zap,
  Shield,
  DollarSign,
  Trash2,
  Activity,
  Network,
  TrendingDown,
  Loader,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  Gauge,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Target,
  ServerCog,
  Sparkles,
  Layers,
  Cpu,
  AlertOctagon,
} from "lucide-react";
import { useRegion } from "@/components/RegionProvider";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorBudgetBar } from "@/components/sre/ErrorBudgetBar";
import { BurnRateBadge } from "@/components/sre/BurnRateBadge";
import type { ServiceWithReliability, SREExecutiveHealth } from "@/modules/sre/types";

/* ─── Radial Gauge (SVG) ───────────────────────────────────────────── */
function RadialGauge({
  value,
  label,
  color,
  size = 110,
}: {
  value: number;
  label: string;
  color: string;
  size?: number;
}) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(Math.max(value, 0), 100);
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={7}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={7}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white font-mono">{pct.toFixed(0)}%</span>
        </div>
      </div>
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </div>
  );
}

/* ─── Polished Cost Trend Chart (Daily Spend / Cumulative Toggle) ─── */
function CostTrendChart({
  data,
  avgPerDay,
  viewMode,
}: {
  data: { date: string; amount: number; cumulative: number }[];
  avgPerDay: number;
  viewMode: "daily" | "cumulative";
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-xs font-mono">
        No telemetry available for selected window
      </div>
    );
  }

  const w = 680;
  const h = 210;
  const pad = { t: 16, r: 20, b: 32, l: 56 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;

  const isDaily = viewMode === "daily";
  const maxVal = isDaily
    ? Math.max(...data.map((d) => d.amount), avgPerDay * 1.2, 100)
    : Math.max(...data.map((d) => d.cumulative), 100);

  // Y-axis tick intervals
  const yTicks = [0, 0.33, 0.66, 1].map((f) => {
    const raw = maxVal * f;
    return {
      val: raw >= 1000 ? `$${(raw / 1000).toFixed(1)}k` : `$${Math.round(raw)}`,
      y: pad.t + plotH - f * plotH,
    };
  });

  const getX = (i: number) => pad.l + (i + 0.5) * (plotW / data.length);
  const getY = (v: number) => pad.t + plotH - (v / maxVal) * plotH;
  const barW = Math.max(6, Math.min(20, (plotW / data.length) * 0.55));
  const avgY = getY(avgPerDay);

  // Cumulative line points
  const cumPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.cumulative), ...d }));
  const cumPath = cumPoints
    .map((p, i) => {
      if (i === 0) return `M${p.x},${p.y}`;
      const prev = cumPoints[i - 1];
      const mx = (prev.x + p.x) / 2;
      return `C${mx},${prev.y} ${mx},${p.y} ${p.x},${p.y}`;
    })
    .join(" ");

  const hoveredItem = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto overflow-visible"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="costBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="costBarHoverGradient" x1="0" y1="0" x2="0" y2="1">
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
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
              strokeDasharray={i === 0 ? "none" : "3 3"}
            />
            <text
              x={pad.l - 8}
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

        {/* Subtle Average Daily Spend Reference Line (Daily view only) */}
        {isDaily && avgPerDay > 0 && (
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
              avg ${Math.round(avgPerDay)}
            </text>
          </g>
        )}

        {/* Primary Visualization: DAILY BARS */}
        {isDaily &&
          data.map((d, i) => {
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
                {/* Invisible hit box for easier hover targeting */}
                <rect
                  x={cx - plotW / data.length / 2}
                  y={pad.t}
                  width={plotW / data.length}
                  height={plotH}
                  fill="transparent"
                />
                {/* Active bar background highlight on hover */}
                {isHovered && (
                  <rect
                    x={cx - plotW / data.length / 2 + 1}
                    y={pad.t}
                    width={plotW / data.length - 2}
                    height={plotH}
                    fill="rgba(255,255,255,0.03)"
                    rx={3}
                  />
                )}
                {/* Bar */}
                <rect
                  x={cx - barW / 2}
                  y={cy}
                  width={barW}
                  height={Math.max(2, barH)}
                  rx={2}
                  fill={isHovered ? "url(#costBarHoverGradient)" : "url(#costBarGradient)"}
                />
              </g>
            );
          })}

        {/* Primary Visualization: CUMULATIVE LINE */}
        {!isDaily && (
          <g>
            <path
              d={cumPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {cumPoints.map((p, i) => {
              const isHovered = hoveredIdx === i;
              return (
                <g
                  key={p.date}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(i)}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 4.5 : 3}
                    fill="#0c1220"
                    stroke={isHovered ? "#22d3ee" : "#06b6d4"}
                    strokeWidth={isHovered ? 2 : 1.5}
                  />
                  <rect
                    x={p.x - plotW / data.length / 2}
                    y={pad.t}
                    width={plotW / data.length}
                    height={plotH}
                    fill="transparent"
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* X-axis date labels (clean, uncluttered sampling) */}
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
          <div className="bg-[#0c1322] border border-white/[0.12] shadow-xl rounded-lg px-3 py-1.5 text-xs whitespace-nowrap">
            <p className="text-slate-400 font-mono text-[10.5px]">
              {new Date(hoveredItem.date + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
            <div className="flex items-center gap-2 mt-0.5 font-mono">
              <span className="text-cyan-400 font-bold text-xs">
                ${hoveredItem.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-slate-400 text-[10.5px]">
                (Total: ${Math.round(hoveredItem.cumulative).toLocaleString("en-US")})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Refined Ranked Top Cost Drivers ───────────────────────────────── */
function TopCostDriversCard({
  services,
  rdsBreakdown,
  totalSpend,
}: {
  services: { service: string; total: number }[];
  rdsBreakdown: { id: string; amount: number }[];
  totalSpend: number;
}) {
  if (!services || services.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-xs font-mono">
        No cost driver breakdown available
      </div>
    );
  }

  const topCategories = services.slice(0, 5);
  const maxCategorySpend = Math.max(...topCategories.map((s) => s.total), 1);
  const totalDenom = totalSpend > 0 ? totalSpend : services.reduce((acc, s) => acc + s.total, 0) || 1;

  return (
    <div className="flex flex-col justify-between h-full space-y-4">
      {/* Ranked Category Bars */}
      <div className="space-y-3">
        {topCategories.map((s, i) => {
          const cleanName = s.service
            .replace(/^Amazon\s+/i, "")
            .replace(/^AWS\s+/i, "");
          const pctOfTotal = ((s.total / totalDenom) * 100).toFixed(1);
          const barPct = Math.min(100, Math.max(4, (s.total / maxCategorySpend) * 100));
          const rankNum = String(i + 1).padStart(2, "0");

          return (
            <div key={s.service} className="group">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="text-[11px] font-mono font-semibold text-slate-500 w-5 shrink-0">
                    {rankNum}
                  </span>
                  <span
                    className="text-slate-200 font-medium truncate text-xs"
                    title={s.service}
                  >
                    {cleanName}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 font-mono">
                  <span className="text-slate-400 text-xs">
                    {pctOfTotal}%
                  </span>
                  <span className="text-white font-semibold text-xs">
                    ${s.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all duration-500 ease-out"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* RDS Breakdown Sub-section (if present) */}
      {rdsBreakdown && rdsBreakdown.length > 0 && (
        <div className="pt-3 border-t border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Database size={12} className="text-cyan-400" />
              RDS Instance Allocation
            </span>
            <span className="text-[10.5px] font-mono text-slate-500">
              Top {Math.min(3, rdsBreakdown.length)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rdsBreakdown.slice(0, 2).map((r) => {
              const name = r.id.split(":").pop()?.split("/").pop() || r.id;
              return (
                <div
                  key={r.id}
                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-xs"
                >
                  <span className="text-slate-400 truncate max-w-[120px] font-mono text-[11px]" title={r.id}>
                    {name}
                  </span>
                  <span className="text-slate-200 font-mono font-medium">
                    ${r.amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Dashboard Component ──────────────────────────────────────────── */
export default function Dashboard() {
  type DayData = { date: string; amount: number; cumulative: number };
  const [costData, setCostData] = useState<DayData[]>([]);
  const [costStats, setCostStats] = useState<{
    totalSpend: number;
    days: number;
    avgPerDay: number;
    last3DayAvg: number;
    forecast30: number;
    forecast60: number;
    forecast90: number;
  } | null>(null);
  const [topServices, setTopServices] = useState<{ service: string; total: number }[]>([]);
  const [rdsBreakdown, setRdsBreakdown] = useState<{ id: string; amount: number }[]>([]);
  const [costLoading, setCostLoading] = useState(true);
  const [costViewMode, setCostViewMode] = useState<"daily" | "cumulative">("daily");
  const [metrics, setMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // SRE State
  const [sreHealth, setSreHealth] = useState<SREExecutiveHealth | null>(null);
  const [sreServices, setSreServices] = useState<ServiceWithReliability[]>([]);
  const [sreLoading, setSreLoading] = useState(true);
  const [incidentStats, setIncidentStats] = useState<{
    open: number;
    sev1Count: number;
    sev2Count: number;
    investigating: number;
  } | null>(null);

  const { region } = useRegion();

  useEffect(() => {
    setCostLoading(true);
    setMetricsLoading(true);
    setSreLoading(true);

    fetch("/api/cost")
      .then((r) => r.json())
      .then((d) => {
        if (d.overall) setCostData(d.overall);
        if (d.stats) setCostStats(d.stats);
        if (d.services) setTopServices(d.services);
        if (d.rdsBreakdown) setRdsBreakdown(d.rdsBreakdown);
      })
      .catch(() => {})
      .finally(() => setCostLoading(false));

    fetch(`/api/overview-metrics?region=${region}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setMetrics(d);
      })
      .catch(() => {})
      .finally(() => setMetricsLoading(false));

    // Fetch SRE Health, Services, and Incidents in parallel
    Promise.all([
      fetch("/api/sre/health").then((r) => r.json()),
      fetch("/api/sre/services").then((r) => r.json()),
      fetch("/api/incidents").then((r) => r.json()).catch(() => null),
    ])
      .then(([healthData, servicesData, incidentsData]) => {
        if (!healthData.error) setSreHealth(healthData);
        if (servicesData.services) setSreServices(servicesData.services);
        if (incidentsData?.stats) {
          setIncidentStats({
            open: incidentsData.stats.open || 0,
            sev1Count: incidentsData.stats.sev1Count || 0,
            sev2Count: incidentsData.stats.sev2Count || 0,
            investigating: incidentsData.stats.investigating || 0,
          });
        }
      })
      .catch(() => {})
      .finally(() => setSreLoading(false));
  }, [region]);

  return (
    <div className="flex flex-col gap-8 w-full pb-16">
      {/* ── 1. Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-heading">Overview</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20 flex items-center gap-1.5 font-mono">
              <Sparkles size={12} /> Simulated SRE Telemetry
            </span>
          </div>
          <p className="text-sm text-slate-400">
            System-wide service reliability, Google SRE Golden Signals, SLO error budgets, and cloud infrastructure telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/incidents"
            className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs text-rose-300 font-semibold transition-colors flex items-center gap-1.5"
          >
            <AlertOctagon size={14} className="text-rose-400" />
            <span>Incidents</span>
            {incidentStats && incidentStats.open > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-200 text-[10px] font-mono font-bold">
                {incidentStats.open}
              </span>
            )}
          </Link>
          <Link
            href="/services"
            className="px-3.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-xs text-slate-200 font-medium transition-colors flex items-center gap-1.5"
          >
            <ServerCog size={14} className="text-cyan-400" />
            Services
          </Link>
          <Link
            href="/slos"
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-xs text-cyan-300 font-medium transition-colors flex items-center gap-1.5"
          >
            <Target size={14} />
            SLOs & Error Budgets
          </Link>
          <Link
            href="/sre"
            className="px-3.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-xs text-slate-200 font-medium transition-colors flex items-center gap-1.5"
          >
            <Activity size={14} className="text-cyan-400" />
            SRE Command Center
          </Link>
        </div>
      </div>

      {/* ── 2. SRE Reliability Command Center ─────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity size={15} className="text-cyan-400" />
              Service Reliability Posture
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Aggregate health status, active SLO compliance, and error budget exhaustion rates
            </p>
          </div>
          {sreHealth && (
            <div className="flex items-center gap-2">
              {sreHealth.criticalCount > 0 && (
                <StatusBadge status={`${sreHealth.criticalCount} Critical`} variant="critical" />
              )}
              {sreHealth.warningCount > 0 && (
                <StatusBadge status={`${sreHealth.warningCount} Warning`} variant="warning" />
              )}
              <StatusBadge status={`${sreHealth.healthyCount} Nominal`} variant="healthy" />
            </div>
          )}
        </div>

        {sreLoading && (
          <div className="rounded-xl surface-card p-10 flex items-center justify-center gap-3 text-slate-400 text-xs">
            <Loader size={16} className="animate-spin text-cyan-400" />
            Evaluating reliability posture across workloads…
          </div>
        )}

        {!sreLoading && sreHealth && (
          <>
            {/* Top 4 SRE KPI Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Service Health Ratio */}
              <div className="rounded-xl p-5 surface-card flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Service Health</span>
                  <StatusBadge
                    status={sreHealth.criticalCount > 0 ? "Degraded" : sreHealth.warningCount > 0 ? "Warning" : "Healthy"}
                    variant={sreHealth.criticalCount > 0 ? "critical" : sreHealth.warningCount > 0 ? "warning" : "healthy"}
                  />
                </div>
                <div className="mt-3">
                  <p className="text-2xl sm:text-3xl font-bold font-mono text-white">
                    {sreHealth.healthyCount} <span className="text-slate-400 text-sm font-normal">/ {sreHealth.totalServices} Nominal</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {sreHealth.warningCount} in warning, {sreHealth.criticalCount} in critical
                  </p>
                </div>
              </div>

              {/* Global SLO Compliance */}
              <div className="rounded-xl p-5 surface-card flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">SLO Compliance</span>
                  <Target size={15} className="text-cyan-400" />
                </div>
                <div className="mt-3">
                  <p className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400">
                    {sreHealth.overallCompliancePercent}%
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Rolling 30-day aggregate compliance
                  </p>
                </div>
              </div>

              {/* Error Budget Capacity */}
              <div className="rounded-xl p-5 surface-card flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Avg Error Budget</span>
                  <span
                    className={`text-xs font-semibold ${
                      sreHealth.averageErrorBudgetPercent < 30 ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {sreHealth.averageErrorBudgetPercent < 30 ? "Depleted" : "Healthy"}
                  </span>
                </div>
                <div className="mt-3">
                  <p
                    className={`text-2xl sm:text-3xl font-bold font-mono ${
                      sreHealth.averageErrorBudgetPercent < 30 ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {sreHealth.averageErrorBudgetPercent}%
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Remaining capacity across SLOs
                  </p>
                </div>
              </div>

              {/* Peak Burn Rate */}
              <div className="rounded-xl p-5 surface-card flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Peak Burn Rate</span>
                  <BurnRateBadge rate={sreHealth.highestBurnRate.burnRate} />
                </div>
                <div className="mt-3">
                  <p className="text-2xl sm:text-3xl font-bold font-mono text-white">
                    {sreHealth.highestBurnRate.burnRate.toFixed(1)}x
                  </p>
                  <p className="text-xs text-slate-400 mt-1 truncate" title={sreHealth.highestBurnRate.serviceName}>
                    {sreHealth.highestBurnRate.serviceName || "All nominal"}
                  </p>
                </div>
              </div>
            </div>

            {/* Attention Required: Degraded Workloads */}
            {sreHealth.degradedServices.length > 0 && (
              <div className="flex flex-col gap-3 mt-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Attention Required — Degraded Workloads ({sreHealth.degradedServices.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sreHealth.degradedServices.map((d) => {
                    const isCrit = d.status === "CRITICAL";
                    return (
                      <div
                        key={d.serviceId}
                        className={`rounded-xl p-4.5 border flex flex-col justify-between gap-3 ${
                          isCrit
                            ? "border-rose-500/30 bg-rose-500/[0.04]"
                            : "border-amber-500/30 bg-amber-500/[0.04]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/services/${d.serviceId}`}
                                className="text-sm font-semibold text-white hover:text-cyan-400 transition-colors truncate"
                              >
                                {d.serviceName}
                              </Link>
                              <StatusBadge status={d.status} variant={isCrit ? "critical" : "warning"} />
                            </div>
                            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                              <span className="text-slate-400 font-medium">Primary factor:</span>{" "}
                              <span className={isCrit ? "text-rose-300 font-medium" : "text-amber-300 font-medium"}>
                                {d.primaryDegradationFactor}
                              </span>
                            </p>
                          </div>
                          <Link
                            href={`/services/${d.serviceId}`}
                            className="px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-cyan-300 border border-white/[0.08] transition-colors shrink-0"
                          >
                            View Service →
                          </Link>
                        </div>

                        <div className="flex items-center gap-5 pt-2.5 border-t border-white/[0.06] text-xs">
                          <div>
                            <span className="text-slate-400">Burn Rate: </span>
                            <span className={`font-mono font-bold ${isCrit ? "text-rose-400" : "text-amber-400"}`}>
                              {d.burnRate.toFixed(1)}x
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Error Budget: </span>
                            <span className={`font-mono font-bold ${d.errorBudgetPercent <= 0 ? "text-rose-400" : "text-amber-400"}`}>
                              {d.errorBudgetPercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 3. Service Reliability Matrix ─────────────────────────────── */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ServerCog size={15} className="text-cyan-400" />
              Service Reliability Matrix
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic Google SRE Golden Signals, 30-day SLO compliance, error budget capacity, and active burn rates
            </p>
          </div>
          <Link href="/services" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
            View Service Catalog →
          </Link>
        </div>

        {sreLoading && (
          <div className="rounded-xl surface-card p-10 flex items-center justify-center gap-3 text-slate-400 text-xs">
            <Loader size={16} className="animate-spin text-cyan-400" />
            Loading service telemetry matrix…
          </div>
        )}

        {!sreLoading && sreServices.length > 0 && (
          <div className="rounded-xl overflow-hidden surface-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10.5px] tracking-wider">Service</th>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10.5px] tracking-wider">Health</th>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10.5px] tracking-wider">Availability / SLO</th>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10.5px] tracking-wider">Latency (p95)</th>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10.5px] tracking-wider">Error Rate</th>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10.5px] tracking-wider">Saturation</th>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10.5px] tracking-wider">Error Budget</th>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10.5px] tracking-wider">Burn Rate</th>
                    <th className="py-3 px-4 text-slate-400 font-semibold uppercase text-[10.5px] tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {sreServices.map((item) => {
                    const s = item.service;
                    const sig = item.goldenSignals;
                    const primarySlo = item.slos[0];
                    const minBudget = Math.min(...item.slos.map((x) => x.errorBudget.remainingPercent), 100);
                    const maxBurn = Math.max(...item.slos.map((x) => x.burnRate.value), 0);

                    return (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                        {/* Service & Tier */}
                        <td className="py-3 px-4">
                          <Link
                            href={`/services/${s.id}`}
                            className="font-semibold text-white hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                          >
                            {s.name}
                            <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono uppercase text-slate-400">{s.tier}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[10px] text-slate-400">{s.ownerTeam}</span>
                          </div>
                        </td>

                        {/* Health Status */}
                        <td className="py-3 px-4">
                          <StatusBadge status={s.status} />
                        </td>

                        {/* Availability / Primary SLO */}
                        <td className="py-3 px-4">
                          {primarySlo ? (
                            <div>
                              <span
                                className={`font-mono font-bold ${
                                  primarySlo.compliancePercent >= primarySlo.target ? "text-emerald-400" : "text-rose-400"
                                }`}
                              >
                                {primarySlo.compliancePercent.toFixed(2)}%
                              </span>
                              <span className="text-[10px] text-slate-400 block">target {primarySlo.target}%</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">N/A</span>
                          )}
                        </td>

                        {/* Latency (p95) */}
                        <td className="py-3 px-4 font-mono text-slate-200">
                          {sig.latency.p95Ms}ms
                          <span className="text-[10px] text-slate-400 block font-normal">p50: {sig.latency.p50Ms}ms</span>
                        </td>

                        {/* Errors */}
                        <td className="py-3 px-4 font-mono">
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

                        {/* Saturation */}
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {sig.saturation.cpuPercent}% CPU
                          <span className="text-[10px] text-slate-400 block font-normal">{sig.saturation.memoryPercent}% Mem</span>
                        </td>

                        {/* Error Budget Remaining */}
                        <td className="py-3 px-4 w-40">
                          <ErrorBudgetBar remainingPercent={minBudget} size="sm" showDetails={false} />
                          <div className="flex items-center justify-between text-[10px] mt-1 text-slate-400 font-mono">
                            <span>{minBudget.toFixed(1)}%</span>
                            <span className="text-slate-400">{minBudget < 10 ? "CRITICAL" : minBudget < 30 ? "WARNING" : "NOMINAL"}</span>
                          </div>
                        </td>

                        {/* Burn Rate */}
                        <td className="py-3 px-4">
                          <BurnRateBadge rate={maxBurn} />
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/services/${s.id}`}
                            className="px-2.5 py-1 rounded-md bg-white/[0.03] hover:bg-cyan-500/15 text-slate-300 hover:text-cyan-300 border border-white/[0.06] hover:border-cyan-500/30 transition-all text-xs font-medium"
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

      {/* ── 4. Cloud Infrastructure & Cost Intelligence (AWS Layer) ──── */}
      <div className="flex flex-col gap-6 pt-6 border-t border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <DollarSign size={15} className="text-cyan-400" />
              Cloud Infrastructure Substrate (AWS)
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.04] text-slate-400 border border-white/[0.06]">
              AWS Region: {region}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cloud resource utilization, 15-day spend trends from AWS Cost Explorer, waste detection, and security posture
          </p>
        </div>

        {/* Cost Overview Grid — Balanced Two-Column Operational Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left: Daily Spend Trend / Cost Overview */}
          <div className="lg:col-span-7 surface-card rounded-xl p-6 flex flex-col justify-between">
            <div>
              {/* Card Header & View Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <DollarSign size={14} className="text-cyan-400" />
                    {costViewMode === "daily" ? "Daily AWS Spend" : "Cumulative AWS Spend"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    15 completed days · AWS Cost Explorer telemetry
                  </p>
                </div>

                {/* View Mode Toggle: Daily Spend | Cumulative */}
                <div className="inline-flex p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setCostViewMode("daily")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      costViewMode === "daily"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Daily Spend
                  </button>
                  <button
                    type="button"
                    onClick={() => setCostViewMode("cumulative")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      costViewMode === "cumulative"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Cumulative
                  </button>
                </div>
              </div>

              {/* KPI Summary Strip */}
              {!costLoading && costStats && (
                <div className="grid grid-cols-3 gap-3 p-3.5 mb-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Spend</p>
                    <p className="text-lg font-bold text-cyan-400 font-mono mt-0.5">
                      ${costStats.totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Average / Day</p>
                    <p className="text-lg font-bold text-amber-400 font-mono mt-0.5">
                      ${costStats.avgPerDay.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Latest Completed</p>
                    <p className="text-lg font-bold text-slate-200 font-mono mt-0.5">
                      ${(costData[costData.length - 1]?.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="flex-1 flex flex-col justify-center">
              {costLoading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-slate-500 text-xs">
                  <Loader size={14} className="animate-spin text-cyan-400" /> Loading AWS cost telemetry…
                </div>
              ) : (
                <CostTrendChart
                  data={costData}
                  avgPerDay={costStats?.avgPerDay ?? 0}
                  viewMode={costViewMode}
                />
              )}
            </div>
          </div>

          {/* Right: Top Cost Drivers */}
          <div className="lg:col-span-5 surface-card rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <TrendingDown size={14} className="text-cyan-400" />
                    Top Cost Drivers
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ranked by 15-day aggregate spend
                  </p>
                </div>
                {!costLoading && (
                  <span className="text-xs font-mono text-slate-400 font-medium">
                    {topServices.length} categories
                  </span>
                )}
              </div>
            </div>

            {/* Drivers list */}
            <div className="flex-1 flex flex-col justify-center">
              {costLoading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-slate-500 text-xs">
                  <Loader size={14} className="animate-spin text-cyan-400" /> Loading category breakdown…
                </div>
              ) : (
                <TopCostDriversCard
                  services={topServices}
                  rdsBreakdown={rdsBreakdown}
                  totalSpend={costStats?.totalSpend ?? 0}
                />
              )}
            </div>
          </div>
        </div>

        {/* Utilization Gauges + Cloud Efficiency Score */}
        {!metricsLoading && metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Gauges */}
            <div className="lg:col-span-3 surface-card rounded-xl p-6">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-6">
                <Gauge size={14} className="text-cyan-400" />
                AWS Resource Utilization (24h avg)
              </h3>
              <div className="flex items-center justify-around">
                <div className="relative">
                  <RadialGauge value={metrics.ec2?.avgCpu ?? 0} label="EC2 CPU" color="#06b6d4" />
                </div>
                <div className="relative">
                  <RadialGauge value={metrics.rds?.avgCpu ?? 0} label="RDS CPU" color="#3b82f6" />
                </div>
                <div className="relative">
                  <RadialGauge value={metrics.ecs?.fillRate ?? 100} label="ECS Fill" color="#8b5cf6" />
                </div>
                <div className="relative">
                  <RadialGauge
                    value={(metrics.ec2?.avgCpu + metrics.rds?.avgCpu + metrics.ecs?.fillRate) / 3 || 0}
                    label="Overall"
                    color="#10b981"
                    size={120}
                  />
                </div>
              </div>
            </div>

            {/* Efficiency Score */}
            <div className="lg:col-span-2 surface-card rounded-xl p-6 flex flex-col">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
                <Activity size={14} className="text-emerald-400" />
                Cloud Efficiency Score
              </h3>
              <div className="flex-1 flex items-center justify-center">
                <div className="relative">
                  <RadialGauge
                    value={metrics.efficiency?.overall ?? 0}
                    label=""
                    color={
                      metrics.efficiency?.overall >= 75
                        ? "#10b981"
                        : metrics.efficiency?.overall >= 50
                        ? "#eab308"
                        : "#f43f5e"
                    }
                    size={130}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {[
                  { l: "Utilization", v: metrics.efficiency?.utilization, c: "#06b6d4" },
                  { l: "Cost", v: metrics.efficiency?.costOptimization, c: "#10b981" },
                  { l: "Security", v: metrics.efficiency?.security, c: "#3b82f6" },
                  { l: "Reliability", v: metrics.efficiency?.reliability, c: "#8b5cf6" },
                ].map((i) => (
                  <div key={i.l} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: i.c }} />
                    <span className="text-slate-400">{i.l}</span>
                    <span className="text-white font-mono ml-auto">{i.v ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Waste + Security + Cost Forecast */}
        {!metricsLoading && metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Waste Summary */}
            <div className="surface-card rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
                <Trash2 size={14} className="text-amber-400" />
                Waste Detected
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Idle EC2 Instances</span>
                  <span className="text-white font-mono font-semibold">{metrics.waste?.idleEc2 ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Unattached EBS Volumes</span>
                  <span className="text-white font-mono font-semibold">{metrics.waste?.unattachedEbs ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Unused Elastic IPs</span>
                  <span className="text-white font-mono font-semibold">{metrics.waste?.unusedEips ?? 0}</span>
                </div>
                <div className="h-px bg-white/[0.04] my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Est. Monthly Waste</span>
                  <span className="text-amber-400 font-bold font-mono text-lg">
                    ${metrics.waste?.estimatedWaste ?? 0}
                  </span>
                </div>
              </div>
              <Link
                href="/waste"
                className="mt-4 block text-center text-xs text-cyan-400 hover:text-cyan-300 font-medium tracking-wide transition-colors"
              >
                View Full Waste Report →
              </Link>
            </div>

            {/* Security Summary */}
            <div className="surface-card rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
                <Shield size={14} className="text-rose-400" />
                Security Posture
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Security Groups</span>
                  <span className="text-white font-mono font-semibold">{metrics.security?.totalSGs ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Open to Internet (0.0.0.0/0)</span>
                  <span
                    className={`font-mono font-semibold ${
                      metrics.security?.riskySGs > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {metrics.security?.riskySGs ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Unhealthy ALB Targets</span>
                  <span
                    className={`font-mono font-semibold ${
                      metrics.alb?.unhealthy > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {metrics.alb?.unhealthy ?? 0}
                  </span>
                </div>
                <div className="h-px bg-white/[0.04] my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Security Score</span>
                  <span
                    className={`font-bold font-mono text-lg ${
                      (metrics.efficiency?.security ?? 0) >= 75
                        ? "text-emerald-400"
                        : (metrics.efficiency?.security ?? 0) >= 50
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {metrics.efficiency?.security ?? 0}/100
                  </span>
                </div>
              </div>
              <Link
                href="/security"
                className="mt-4 block text-center text-xs text-cyan-400 hover:text-cyan-300 font-medium tracking-wide transition-colors"
              >
                View Security Details →
              </Link>
            </div>

            {/* Cost Forecast */}
            <div className="surface-card rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-cyan-400" />
                Cost Forecast
              </h3>
              <div className="flex flex-col gap-4">
                {[
                  { d: "30 days", v: metrics.cost?.forecast30 },
                  { d: "60 days", v: metrics.cost?.forecast60 },
                  { d: "90 days", v: metrics.cost?.forecast90 },
                ].map((f) => {
                  const max90 = metrics.cost?.forecast90 || 1;
                  return (
                    <div key={f.d} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{f.d}</span>
                        <span className="text-white font-mono font-bold">
                          ${(f.v ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-cyan-500 transition-all duration-700"
                          style={{ width: `${((f.v ?? 0) / max90) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="h-px bg-white/[0.04] my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Daily Avg</span>
                  <span className="text-cyan-400 font-bold font-mono">${metrics.cost?.avgDaily ?? 0}/day</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-500 pt-4 font-mono">
        Read-only access · AWS connectivity active · SRE telemetry is simulated deterministic model
      </p>
    </div>
  );
}
