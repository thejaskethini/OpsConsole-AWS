"use client";
import { useEffect, useState } from "react";
import { Cpu, Loader, AlertCircle, CheckCircle, Zap } from "lucide-react";
import { useRegion } from "@/components/RegionProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

interface LambdaFn {
  FunctionName: string;
  Runtime: string;
  MemorySize: number;
  Timeout: number;
  LastModified: string;
  CodeSize: number;
  Invocations?: number;
  Errors?: number;
  Duration?: number;
  Throttles?: number;
}

export default function LambdaPage() {
  const { region } = useRegion();
  const [data, setData] = useState<LambdaFn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/lambda?region=${region}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(Array.isArray(d) ? d : d.functions || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [region]);

  const totalFns = data.length;
  const totalInvocations = data.reduce((s, f) => s + (f.Invocations || 0), 0);
  const totalErrors = data.reduce((s, f) => s + (f.Errors || 0), 0);
  const errorRate = totalInvocations > 0 ? ((totalErrors / totalInvocations) * 100).toFixed(2) : "0.00";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Cpu}
        title="Lambda Functions"
        subtitle={`Serverless function execution inventory and invocation health — region: ${region}`}
        iconColor="#f97316"
        iconBgColor="rgba(249, 115, 22, 0.1)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            AWS Substrate
          </span>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Cpu}
          label="Total Functions"
          value={totalFns}
          color="#06b6d4"
        />
        <StatCard
          icon={Zap}
          label="Total Invocations (15d)"
          value={totalInvocations.toLocaleString()}
          color="#10b981"
        />
        <StatCard
          icon={AlertCircle}
          label="Total Errors (15d)"
          value={totalErrors.toLocaleString()}
          color="#f43f5e"
        />
        <StatCard
          icon={CheckCircle}
          label="Error Rate"
          value={`${errorRate}%`}
          color="#f59e0b"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 surface-card rounded-xl">
          <Loader size={16} className="animate-spin text-cyan-400" />
          <span>Loading Lambda functions…</span>
        </div>
      ) : error ? (
        <div className="surface-card rounded-xl p-6 flex items-center gap-3 text-amber-400 border border-amber-500/20">
          <AlertCircle size={18} />
          <div>
            <p className="font-semibold text-sm">Could not load Lambda data</p>
            <p className="text-xs text-slate-400 mt-0.5">{error} — check IAM permissions for lambda:ListFunctions</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="surface-card rounded-xl p-12 text-center text-slate-400">
          No Lambda functions found in <span className="text-cyan-400 font-mono">{region}</span>
        </div>
      ) : (
        <div className="surface-card rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                {["Function Name", "Runtime", "Memory", "Timeout", "Invocations (15d)", "Errors", "Avg Duration", "Status"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {data.map((fn, i) => {
                const hasErrors = (fn.Errors || 0) > 0;
                return (
                  <tr key={fn.FunctionName} className={`hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                    <td className="px-4 py-3.5 font-medium text-white font-mono text-xs">{fn.FunctionName}</td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{fn.Runtime || "—"}</td>
                    <td className="px-4 py-3.5 text-slate-300 font-mono">{fn.MemorySize} MB</td>
                    <td className="px-4 py-3.5 text-slate-300 font-mono">{fn.Timeout}s</td>
                    <td className="px-4 py-3.5 text-slate-200 font-mono">{(fn.Invocations || 0).toLocaleString()}</td>
                    <td className={`px-4 py-3.5 font-semibold font-mono ${hasErrors ? "text-rose-400" : "text-emerald-400"}`}>{fn.Errors || 0}</td>
                    <td className="px-4 py-3.5 text-slate-300 font-mono">{fn.Duration ? `${fn.Duration.toFixed(0)} ms` : "—"}</td>
                    <td className="px-4 py-3.5">
                      {hasErrors
                        ? <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[11px] font-semibold flex items-center gap-1 w-fit border border-rose-500/20"><AlertCircle size={10} />ERRORS</span>
                        : <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold flex items-center gap-1 w-fit border border-emerald-500/20"><CheckCircle size={10} />OK</span>
                      }
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
