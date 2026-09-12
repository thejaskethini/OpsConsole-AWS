"use client";
import { useEffect, useState } from "react";
import { Sparkles, Loader, AlertCircle, CheckCircle, Clock, Globe, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

interface AmplifyApp {
  AppId: string;
  Name: string;
  DefaultDomain: string;
  Repository: string;
  Platform: string;
  CreateTime: string;
  UpdateTime: string;
  ProductionBranch?: string;
  Status?: string;
}

export default function AmplifyPage() {
  const [data, setData] = useState<AmplifyApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/amplify`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(Array.isArray(d) ? d : d.apps || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const webApps = data.filter(a => a.Platform === "WEB" || a.Platform === "WEB_COMPUTE").length;
  const mobileApps = data.filter(a => a.Platform === "MOB").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Sparkles}
        title="AWS Amplify"
        subtitle="Managed full-stack web and mobile application deployments with hosting CI/CD"
        iconColor="#ec4899"
        iconBgColor="rgba(236, 72, 153, 0.1)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20">
            Developer Tools
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Sparkles}
          label="Total Apps"
          value={data.length}
          color="#ec4899"
        />
        <StatCard
          icon={Globe}
          label="Web Apps"
          value={webApps}
          color="#06b6d4"
        />
        <StatCard
          icon={Smartphone}
          label="Mobile Apps"
          value={mobileApps}
          color="#8b5cf6"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 surface-card rounded-xl">
          <Loader size={16} className="animate-spin text-cyan-400" />
          <span>Loading Amplify apps…</span>
        </div>
      ) : error ? (
        <div className="surface-card rounded-xl p-6 flex items-center gap-3 text-amber-400 border border-amber-500/20">
          <AlertCircle size={18} />
          <div>
            <p className="font-semibold text-sm">Could not load Amplify data</p>
            <p className="text-xs text-slate-400 mt-0.5">{error} — check IAM permissions for amplify:ListApps</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="surface-card rounded-xl p-12 text-center text-slate-400">
          No Amplify apps found in this account
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map(app => (
            <div key={app.AppId} className="surface-card rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
                  <Sparkles size={18} className="text-pink-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{app.Name}</p>
                  <p className="text-xs text-cyan-400 font-mono truncate">{app.DefaultDomain}</p>
                  {app.Repository && <p className="text-xs text-slate-400 truncate mt-0.5">{app.Repository}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-semibold">{app.Platform || "WEB"}</span>
                {app.ProductionBranch && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle size={12} /> {app.ProductionBranch}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400 text-xs flex items-center gap-1.5">
                  <Clock size={12} className="text-slate-500" /> {new Date(app.UpdateTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
