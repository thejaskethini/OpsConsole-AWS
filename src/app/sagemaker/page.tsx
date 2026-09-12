"use client";
import { useEffect, useState } from "react";
import { BrainCircuit, Loader, AlertCircle, CheckCircle, Cpu, BookOpen } from "lucide-react";
import { useRegion } from "@/components/RegionProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

interface SageMakerEndpoint {
  EndpointName: string;
  EndpointStatus: string;
  CreationTime: string;
  LastModifiedTime: string;
  EndpointConfigName?: string;
}

interface SageMakerNotebook {
  NotebookInstanceName: string;
  NotebookInstanceStatus: string;
  InstanceType: string;
  CreationTime: string;
}

export default function SageMakerPage() {
  const { region } = useRegion();
  const [endpoints, setEndpoints] = useState<SageMakerEndpoint[]>([]);
  const [notebooks, setNotebooks] = useState<SageMakerNotebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sagemaker?region=${region}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else {
          setEndpoints(d.endpoints || []);
          setNotebooks(d.notebooks || []);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [region]);

  const inService = endpoints.filter(e => e.EndpointStatus === "InService").length;
  const notebookRunning = notebooks.filter(n => n.NotebookInstanceStatus === "InService").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={BrainCircuit}
        title="SageMaker AI / ML"
        subtitle={`Machine learning endpoints, model inference hosting, and notebook instances — region: ${region}`}
        iconColor="#a855f7"
        iconBgColor="rgba(168, 85, 247, 0.1)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            AI & Machine Learning
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BrainCircuit}
          label="Total Endpoints"
          value={endpoints.length}
          color="#8b5cf6"
        />
        <StatCard
          icon={CheckCircle}
          label="In Service"
          value={inService}
          color="#10b981"
        />
        <StatCard
          icon={BookOpen}
          label="Notebook Instances"
          value={notebooks.length}
          color="#06b6d4"
        />
        <StatCard
          icon={Cpu}
          label="Notebooks Running"
          value={notebookRunning}
          color="#10b981"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 surface-card rounded-xl">
          <Loader size={16} className="animate-spin text-cyan-400" />
          <span>Loading SageMaker resources…</span>
        </div>
      ) : error ? (
        <div className="surface-card rounded-xl p-6 flex items-center gap-3 text-amber-400 border border-amber-500/20">
          <AlertCircle size={18} />
          <div>
            <p className="font-semibold text-sm">Could not load SageMaker data</p>
            <p className="text-xs text-slate-400 mt-0.5">{error} — check IAM permissions for sagemaker:ListEndpoints</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Inference Endpoints</h2>
            {endpoints.length === 0 ? (
              <div className="surface-card rounded-xl p-8 text-center text-slate-400 text-xs">No endpoints in {region}</div>
            ) : (
              <div className="surface-card rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                      {["Endpoint Name", "Status", "Config", "Created", "Last Modified"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {endpoints.map((e, i) => (
                      <tr key={e.EndpointName} className={`hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                        <td className="px-4 py-3.5 font-medium text-white font-mono text-xs">{e.EndpointName}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 w-fit ${e.EndpointStatus === "InService" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                            {e.EndpointStatus === "InService" && <CheckCircle size={10} />}
                            {e.EndpointStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 font-mono text-xs truncate max-w-[200px]">{e.EndpointConfigName || "—"}</td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs">{new Date(e.CreationTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs">{new Date(e.LastModifiedTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Notebook Instances</h2>
            {notebooks.length === 0 ? (
              <div className="surface-card rounded-xl p-8 text-center text-slate-400 text-xs">No notebook instances in {region}</div>
            ) : (
              <div className="surface-card rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                      {["Notebook Name", "Status", "Instance Type", "Created"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {notebooks.map((n, i) => (
                      <tr key={n.NotebookInstanceName} className={`hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                        <td className="px-4 py-3.5 font-medium text-white font-mono text-xs">{n.NotebookInstanceName}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${n.NotebookInstanceStatus === "InService" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>{n.NotebookInstanceStatus}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-300 font-mono text-xs">{n.InstanceType}</td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs">{new Date(n.CreationTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
