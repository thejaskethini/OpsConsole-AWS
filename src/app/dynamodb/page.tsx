"use client";
import { useEffect, useState } from "react";
import { Layers, Loader, AlertCircle, Database, HardDrive, Zap } from "lucide-react";
import { useRegion } from "@/components/RegionProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

interface DynamoTable {
  TableName: string;
  Status: string;
  ItemCount: number;
  SizeBytes: number;
  BillingMode: string;
  ReadCapacity?: number;
  WriteCapacity?: number;
  Replicas?: number;
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function DynamoDBPage() {
  const { region } = useRegion();
  const [data, setData] = useState<DynamoTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dynamodb?region=${region}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(Array.isArray(d) ? d : d.tables || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [region]);

  const totalSize = data.reduce((s, t) => s + (t.SizeBytes || 0), 0);
  const totalItems = data.reduce((s, t) => s + (t.ItemCount || 0), 0);
  const onDemand = data.filter(t => t.BillingMode === "PAY_PER_REQUEST").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Layers}
        title="DynamoDB Tables"
        subtitle={`NoSQL schema items, provisioned throughput, and storage capacity — region: ${region}`}
        iconColor="#a855f7"
        iconBgColor="rgba(168, 85, 247, 0.1)"
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            AWS Substrate
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Layers}
          label="Total Tables"
          value={data.length}
          color="#8b5cf6"
        />
        <StatCard
          icon={Database}
          label="Total Items"
          value={totalItems.toLocaleString()}
          color="#06b6d4"
        />
        <StatCard
          icon={HardDrive}
          label="Total Data Size"
          value={fmtBytes(totalSize)}
          color="#10b981"
        />
        <StatCard
          icon={Zap}
          label="On-Demand Tables"
          value={onDemand}
          color="#f59e0b"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 surface-card rounded-xl">
          <Loader size={16} className="animate-spin text-cyan-400" />
          <span>Loading DynamoDB tables…</span>
        </div>
      ) : error ? (
        <div className="surface-card rounded-xl p-6 flex items-center gap-3 text-amber-400 border border-amber-500/20">
          <AlertCircle size={18} />
          <div>
            <p className="font-semibold text-sm">Could not load DynamoDB data</p>
            <p className="text-xs text-slate-400 mt-0.5">{error} — check IAM permissions for dynamodb:ListTables</p>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="surface-card rounded-xl p-12 text-center text-slate-400">
          No DynamoDB tables found in <span className="text-cyan-400 font-mono">{region}</span>
        </div>
      ) : (
        <div className="surface-card rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                {["Table Name", "Status", "Item Count", "Size", "Billing Mode", "Read Cap", "Write Cap"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {data.map((t, i) => (
                <tr key={t.TableName} className={`hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                  <td className="px-4 py-3.5 font-medium text-white font-mono text-xs">{t.TableName}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${t.Status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>{t.Status}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-200 font-mono">{(t.ItemCount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-slate-300 font-mono">{fmtBytes(t.SizeBytes || 0)}</td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs">{t.BillingMode === "PAY_PER_REQUEST" ? "On-Demand" : "Provisioned"}</td>
                  <td className="px-4 py-3.5 text-slate-400 font-mono">{t.ReadCapacity ?? "—"}</td>
                  <td className="px-4 py-3.5 text-slate-400 font-mono">{t.WriteCapacity ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
