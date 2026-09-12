"use client";
import { useEffect, useState } from "react";
import { Radio, Loader, AlertCircle, CheckCircle, Lock, Globe, FileText } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

interface R53HostedZone {
  Id: string;
  Name: string;
  RecordCount: number;
  PrivateZone: boolean;
  Comment: string;
}

export default function Route53Page() {
  const [data, setData] = useState<R53HostedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/route53`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(Array.isArray(d) ? d : d.zones || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const publicZones = data.filter(z => !z.PrivateZone).length;
  const totalRecords = data.reduce((s, z) => s + (z.RecordCount || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Radio}
        title="Route 53 DNS"
        subtitle="Global domain naming systems, authoritative hosted zones, and routing records"
        iconColor="#3b82f6"
        iconBgColor="rgba(59, 130, 246, 0.1)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Global Networking
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Radio}
          label="Total Zones"
          value={data.length}
          color="#3b82f6"
        />
        <StatCard
          icon={Globe}
          label="Public Zones"
          value={publicZones}
          color="#06b6d4"
        />
        <StatCard
          icon={Lock}
          label="Private Zones"
          value={data.length - publicZones}
          color="#8b5cf6"
        />
        <StatCard
          icon={FileText}
          label="Total DNS Records"
          value={totalRecords}
          color="#10b981"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 surface-card rounded-xl">
          <Loader size={16} className="animate-spin text-cyan-400" />
          <span>Loading Route 53 zones…</span>
        </div>
      ) : error ? (
        <div className="surface-card rounded-xl p-6 flex items-center gap-3 text-amber-400 border border-amber-500/20">
          <AlertCircle size={18} />
          <div>
            <p className="font-semibold text-sm">Could not load Route 53 data</p>
            <p className="text-xs text-slate-400 mt-0.5">{error} — check IAM permissions for route53:ListHostedZones</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="surface-card rounded-xl p-12 text-center text-slate-400">No hosted zones found</div>
      ) : (
        <div className="surface-card rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                {["Zone Name", "Zone ID", "Records", "Type", "Comment"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {data.map((z, i) => (
                <tr key={z.Id} className={`hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                  <td className="px-4 py-3.5 font-medium text-white text-xs">{z.Name}</td>
                  <td className="px-4 py-3.5 text-cyan-400 font-mono text-xs">{z.Id?.split("/").pop()}</td>
                  <td className="px-4 py-3.5 text-slate-200 font-mono">{z.RecordCount}</td>
                  <td className="px-4 py-3.5">
                    {z.PrivateZone
                      ? <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[11px] font-semibold flex items-center gap-1 w-fit border border-purple-500/20"><Lock size={10} />Private</span>
                      : <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[11px] font-semibold flex items-center gap-1 w-fit border border-blue-500/20"><Globe size={10} />Public</span>
                    }
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs">{z.Comment || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
