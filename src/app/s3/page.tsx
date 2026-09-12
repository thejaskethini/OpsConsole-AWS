"use client";
import { useState, useEffect } from "react";
import { Box, Lock, FileArchive, Tag, Loader, ShieldCheck, HardDrive, Database } from "lucide-react";
import { ExportCSVButton } from "@/components/ExportCSVButton";
import { useRegion } from "@/components/RegionProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

export default function S3Dashboard() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const { region } = useRegion();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/s3?region=${region}`)
      .then(res => {
         if(!res.ok) throw new Error("Failed to fetch S3 data");
         return res.json();
      })
      .then(d => {
         setData(d);
         setLoading(false);
      })
      .catch(e => {
         setError(e.message);
         setLoading(false);
      });
  }, [region]);

  const formatBytes = (bytes: number) => {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalBytes = data.reduce((acc, b) => acc + (Number(b.SizeBytes) || 0), 0);
  const totalObjects = data.reduce((acc, b) => acc + (Number(b.NumObjects) || 0), 0);
  const encryptedBuckets = data.filter(b => b.Encryption === "Enabled").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Box}
        title="S3 Object Storage"
        subtitle={`Object storage buckets, encryption compliance, and lifecycle posture — region: ${region}`}
        iconColor="#eab308"
        iconBgColor="rgba(234, 179, 8, 0.1)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            Storage Substrate
          </span>
        }
        actions={!loading && data.length > 0 ? <ExportCSVButton data={data} filename="s3-inventory" /> : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Box}
          label="Total Buckets"
          value={data.length}
          color="#eab308"
        />
        <StatCard
          icon={HardDrive}
          label="Total Storage"
          value={formatBytes(totalBytes)}
          color="#06b6d4"
        />
        <StatCard
          icon={Database}
          label="Total Objects"
          value={totalObjects.toLocaleString()}
          color="#10b981"
        />
        <StatCard
          icon={ShieldCheck}
          label="Encrypted Buckets"
          value={`${encryptedBuckets} / ${data.length}`}
          color="#8b5cf6"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 surface-card rounded-xl">
          <Loader size={16} className="animate-spin text-cyan-400" />
          <span>Scanning S3 Buckets…</span>
        </div>
      ) : error ? (
        <div className="surface-card rounded-xl p-6 flex items-center gap-3 text-rose-400 border border-rose-500/20">
          <p className="text-xs">Error: {error}</p>
        </div>
      ) : (
        <div className="surface-card rounded-xl overflow-hidden">
           <table className="w-full text-left text-xs">
              <thead>
                 <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Bucket Name</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Region</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Size</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Objects</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Security / Posture</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                  {data.map((b, i) => (
                     <tr key={i} className={`hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                         <td className="px-4 py-3.5 font-medium text-white font-mono text-xs break-all">{String(b.Name)}</td>
                         <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{String(b.Region)}</td>
                         <td className="px-4 py-3.5 font-mono text-cyan-400">{formatBytes(Number(b.SizeBytes))}</td>
                         <td className="px-4 py-3.5 font-mono text-slate-200">{(Number(b.NumObjects) || 0).toLocaleString()}</td>
                         <td className="px-4 py-3.5">
                             <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                                 <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${b.Encryption === "Enabled" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
                                     <Lock size={10} /> {b.Encryption === "Enabled" ? "Encrypted" : "Unencrypted"}
                                 </span>
                                 
                                 <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${b.Versioning === "Enabled" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                                     <FileArchive size={10} /> Ver: {String(b.Versioning).substring(0,6)}
                                 </span>
  
                                 <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${b.Lifecycle === "Configured" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                                     <Tag size={10} /> Life: {String(b.Lifecycle).substring(0,4)}
                                 </span>
                             </div>
                         </td>
                     </tr>
                  ))}
                  {data.length === 0 && (
                      <tr>
                           <td colSpan={5} className="px-4 py-12 text-center text-xs text-slate-400">No S3 Buckets found.</td>
                      </tr>
                  )}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
}
