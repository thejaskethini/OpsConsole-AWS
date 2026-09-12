"use client";
import { useEffect, useState } from "react";
import { Wifi, Loader, AlertCircle, Globe, CheckCircle, ShieldCheck } from "lucide-react";
import { useRegion } from "@/components/RegionProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

interface CFDistribution {
  Id: string;
  DomainName: string;
  Status: string;
  PriceClass: string;
  Origins: string[];
  Aliases: string[];
  HttpVersion: string;
  Enabled: boolean;
  Requests?: number;
  BytesDownloaded?: number;
  CacheHitRate?: number;
}

export default function CloudFrontPage() {
  const { region } = useRegion();
  const [data, setData] = useState<CFDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/cloudfront?region=${region}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(Array.isArray(d) ? d : d.distributions || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [region]);

  const deployed = data.filter(d => d.Status === "Deployed").length;
  const enabled = data.filter(d => d.Enabled).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Wifi}
        title="CloudFront CDN"
        subtitle="Global edge distribution networks, SSL certificates, and origin routing status"
        iconColor="#06b6d4"
        iconBgColor="rgba(6, 182, 212, 0.1)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Global Edge Substrate
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Globe}
          label="Total Distributions"
          value={data.length}
          color="#06b6d4"
        />
        <StatCard
          icon={CheckCircle}
          label="Deployed"
          value={deployed}
          color="#10b981"
        />
        <StatCard
          icon={ShieldCheck}
          label="Enabled"
          value={enabled}
          color="#3b82f6"
        />
        <StatCard
          icon={Wifi}
          label="Disabled"
          value={data.length - enabled}
          color="#64748b"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 surface-card rounded-xl">
          <Loader size={16} className="animate-spin text-cyan-400" />
          <span>Loading CloudFront distributions…</span>
        </div>
      ) : error ? (
        <div className="surface-card rounded-xl p-6 flex items-center gap-3 text-amber-400 border border-amber-500/20">
          <AlertCircle size={18} />
          <div>
            <p className="font-semibold text-sm">Could not load CloudFront data</p>
            <p className="text-xs text-slate-400 mt-0.5">{error} — check IAM permissions for cloudfront:ListDistributions</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="surface-card rounded-xl p-12 text-center text-slate-400">
          <Globe size={32} className="mx-auto mb-3 text-slate-600" />
          No CloudFront distributions found in this account
        </div>
      ) : (
        <div className="surface-card rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                {["Distribution ID", "Domain", "Aliases", "Status", "Price Class", "HTTP", "Enabled"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {data.map((d, i) => (
                <tr key={d.Id} className={`hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                  <td className="px-4 py-3.5 font-mono text-xs text-cyan-400 font-medium">{d.Id}</td>
                  <td className="px-4 py-3.5 text-slate-300 font-mono text-xs max-w-[220px] truncate">{d.DomainName}</td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs">{d.Aliases?.join(", ") || "—"}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${d.Status === "Deployed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>{d.Status}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs font-mono">{d.PriceClass?.replace("PriceClass_", "PC") || "—"}</td>
                  <td className="px-4 py-3.5 text-slate-300 font-mono">{d.HttpVersion || "—"}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${d.Enabled ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border border-slate-500/20"}`}>{d.Enabled ? "Enabled" : "Disabled"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
