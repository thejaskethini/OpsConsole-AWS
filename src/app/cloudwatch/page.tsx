"use client";
import { useEffect, useState } from "react";
import { BarChart2, Loader, AlertCircle, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

interface CWAlarm {
  AlarmName: string;
  AlarmDescription?: string;
  StateValue: string;
  Namespace: string;
  MetricName: string;
  ComparisonOperator: string;
  Threshold: number;
  Period: number;
  EvaluationPeriods: number;
  StateUpdatedTimestamp: string;
}

const STATE_CONFIG: Record<string, { badge: string; icon: typeof AlertCircle }> = {
  ALARM: {
    badge: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    icon: AlertCircle,
  },
  OK: {
    badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    icon: CheckCircle,
  },
  INSUFFICIENT_DATA: {
    badge: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
    icon: HelpCircle,
  },
};

export default function CloudWatchPage() {
  const [data, setData] = useState<CWAlarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/cloudwatch`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(Array.isArray(d) ? d : d.alarms || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const alarmCount = data.filter(a => a.StateValue === "ALARM").length;
  const okCount = data.filter(a => a.StateValue === "OK").length;
  const insufficientCount = data.filter(a => a.StateValue === "INSUFFICIENT_DATA").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={BarChart2}
        title="CloudWatch Alarms"
        subtitle="Infrastructure threshold alerts, metric conditions, and real-time state telemetry"
        iconColor="#06b6d4"
        iconBgColor="rgba(6, 182, 212, 0.1)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            AWS Substrate
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart2}
          label="Total Alarms"
          value={data.length}
          color="#06b6d4"
        />
        <StatCard
          icon={AlertCircle}
          label="In ALARM"
          value={alarmCount}
          color="#f43f5e"
        />
        <StatCard
          icon={CheckCircle}
          label="OK"
          value={okCount}
          color="#10b981"
        />
        <StatCard
          icon={HelpCircle}
          label="Insufficient Data"
          value={insufficientCount}
          color="#64748b"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 surface-card rounded-xl">
          <Loader size={16} className="animate-spin text-cyan-400" />
          <span>Loading CloudWatch alarms…</span>
        </div>
      ) : error ? (
        <div className="surface-card rounded-xl p-6 flex items-center gap-3 text-amber-400 border border-amber-500/20">
          <AlertCircle size={18} />
          <div>
            <p className="font-semibold text-sm">Could not load CloudWatch data</p>
            <p className="text-xs text-slate-400 mt-0.5">{error} — check IAM permissions for cloudwatch:DescribeAlarms</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="surface-card rounded-xl p-12 text-center text-slate-400">No CloudWatch alarms configured</div>
      ) : (
        <div className="surface-card rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                {["Alarm Name", "State", "Namespace", "Metric", "Threshold", "Last Updated"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {data.sort((a, b) => (a.StateValue === "ALARM" ? -1 : 1)).map((alarm, i) => {
                const conf = STATE_CONFIG[alarm.StateValue] || STATE_CONFIG.INSUFFICIENT_DATA;
                const StateIcon = conf.icon;
                return (
                  <tr key={alarm.AlarmName} className={`hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                    <td className="px-4 py-3.5 font-medium text-white text-xs">{alarm.AlarmName}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 w-fit ${conf.badge}`}>
                        <StateIcon size={10} />
                        {alarm.StateValue}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{alarm.Namespace}</td>
                    <td className="px-4 py-3.5 text-slate-300 font-mono text-xs">{alarm.MetricName}</td>
                    <td className="px-4 py-3.5 text-slate-200 font-mono">{alarm.Threshold}</td>
                    <td className="px-4 py-3.5 text-slate-400 text-xs">
                      {alarm.StateUpdatedTimestamp ? new Date(alarm.StateUpdatedTimestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" } as Intl.DateTimeFormatOptions) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
