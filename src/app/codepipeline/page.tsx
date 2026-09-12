"use client";
import { useEffect, useState } from "react";
import { GitBranch, Loader, AlertCircle, CheckCircle, XCircle, Clock, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

interface Pipeline {
  Name: string;
  RoleArn: string;
  Created: string;
  Updated: string;
  Status?: string;
  ExecutionId?: string;
  LastExecutionStatus?: string;
  LastExecutionTime?: string;
  LastExecutionRevision?: string;
}

const STATUS_BADGES: Record<string, string> = {
  Succeeded: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
  Failed: "text-rose-400 bg-rose-500/10 border border-rose-500/20",
  InProgress: "text-blue-400 bg-blue-500/10 border border-blue-500/20",
  Stopped: "text-slate-400 bg-slate-500/10 border border-slate-500/20",
  Superseded: "text-amber-400 bg-amber-500/10 border border-amber-500/20",
};

export default function CodePipelinePage() {
  const [data, setData] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/codepipeline`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(Array.isArray(d) ? d : d.pipelines || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const succeeded = data.filter(p => p.LastExecutionStatus === "Succeeded").length;
  const failed = data.filter(p => p.LastExecutionStatus === "Failed").length;
  const inProgress = data.filter(p => p.LastExecutionStatus === "InProgress").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={GitBranch}
        title="CodePipeline"
        subtitle="CI/CD automation pipelines, deployment release stages, and execution telemetry"
        iconColor="#6366f1"
        iconBgColor="rgba(99, 102, 241, 0.1)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Developer Tools
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={GitBranch}
          label="Total Pipelines"
          value={data.length}
          color="#6366f1"
        />
        <StatCard
          icon={CheckCircle}
          label="Last Run: Succeeded"
          value={succeeded}
          color="#10b981"
        />
        <StatCard
          icon={XCircle}
          label="Last Run: Failed"
          value={failed}
          color="#f43f5e"
        />
        <StatCard
          icon={PlayCircle}
          label="In Progress"
          value={inProgress}
          color="#3b82f6"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 surface-card rounded-xl">
          <Loader size={16} className="animate-spin text-cyan-400" />
          <span>Loading pipelines…</span>
        </div>
      ) : error ? (
        <div className="surface-card rounded-xl p-6 flex items-center gap-3 text-amber-400 border border-amber-500/20">
          <AlertCircle size={18} />
          <div>
            <p className="font-semibold text-sm">Could not load CodePipeline data</p>
            <p className="text-xs text-slate-400 mt-0.5">{error} — check IAM permissions for codepipeline:ListPipelines</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="surface-card rounded-xl p-12 text-center text-slate-400">No CodePipelines found</div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map(p => {
            const badgeClass = STATUS_BADGES[p.LastExecutionStatus || ""] || "text-slate-400 bg-slate-500/10 border border-slate-500/20";
            return (
              <div key={p.Name} className="surface-card rounded-xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    {p.LastExecutionStatus === "Succeeded" ? <CheckCircle size={18} className="text-emerald-400" />
                      : p.LastExecutionStatus === "Failed" ? <XCircle size={18} className="text-rose-400" />
                      : <GitBranch size={18} className="text-indigo-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{p.Name}</p>
                    {p.LastExecutionTime && (
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Clock size={12} className="text-slate-500" /> Last run: {new Date(p.LastExecutionTime).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
                {p.LastExecutionStatus && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${badgeClass}`}>{p.LastExecutionStatus}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
