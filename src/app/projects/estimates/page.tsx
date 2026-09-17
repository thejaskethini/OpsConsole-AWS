"use client";

import { useState } from "react";
import { Calculator, CircleDollarSign, FileChartColumn, Percent } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { calculateCOCOMO, calculateFunctionPoints, calculateNPV, calculateROI } from "@/modules/project-intelligence";

export default function ProjectEstimatesPage() {
  const [ilf, setIlf] = useState(8);
  const [eif, setEif] = useState(4);
  const [ei, setEi] = useState(4);
  const [eo, setEo] = useState(4);
  const [eq, setEq] = useState(4);
  const [scale, setScale] = useState<"small" | "moderate" | "large">("moderate");
  const [investment, setInvestment] = useState(100000);
  const [benefit, setBenefit] = useState(135000);
  const [discountRate, setDiscountRate] = useState(0.1);
  const [cashFlows, setCashFlows] = useState("40000,50000,60000");
  const functionPoints = calculateFunctionPoints({ internalFiles: ilf, externalFiles: eif, externalInputs: ei, externalOutputs: eo, externalInquiries: eq });
  const cocomo = calculateCOCOMO({ functionPoints, projectScale: scale });
  const parsedCashFlows = cashFlows.split(",").map((value) => Number(value.trim())).filter((value) => Number.isFinite(value));
  const npv = investment >= 0 ? calculateNPV({ initialInvestment: investment, cashFlows: parsedCashFlows, discountRate }) : null;
  const netBenefit = benefit - investment;
  const roi = investment > 0 ? calculateROI({ initialInvestment: investment, netProfit: benefit }) : null;
  const discounted = parsedCashFlows.map((cashFlow, index) => ({ period: index + 1, cashFlow, factor: 1 / Math.pow(1 + discountRate, index + 1), presentValue: cashFlow / Math.pow(1 + discountRate, index + 1) }));

  return (
    <div className="space-y-6">
      <PageHeader icon={Calculator} title="Estimation Workspace" subtitle="Editable deterministic estimation and financial analysis for delivery decisions." iconColor="#22d3ee" iconBgColor="rgba(34, 211, 238, 0.12)" tag={<span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-mono text-cyan-200">SIMULATED CALCULATIONS</span>} />
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-xs text-cyan-100">All results are calculated by existing deterministic engines. Function Points uses the repository&apos;s simplified weighted approximation; it does not claim full IFPUG complexity weighting.</div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="rounded-2xl surface-card p-5">
          <SectionTitle icon={FileChartColumn} title="Function Points" />
          <p className="mt-2 text-xs text-slate-400">Simplified formula: ILF × 3.5 + EIF × 4.2 + (EI + EO + EQ) × 4.5 + EIF × 5.1. Complexity levels are not implemented by the existing engine.</p>
          <div className="mt-4 grid grid-cols-2 gap-3"><NumberInput label="Internal Logical Files (ILF)" value={ilf} onChange={setIlf} /><NumberInput label="External Interface Files (EIF)" value={eif} onChange={setEif} /><NumberInput label="External Inputs (EI)" value={ei} onChange={setEi} /><NumberInput label="External Outputs (EO)" value={eo} onChange={setEo} /><NumberInput label="External Inquiries (EQ)" value={eq} onChange={setEq} /></div>
          <Result label="Unadjusted Function Points" value={String(functionPoints)} />
        </section>
        <section className="rounded-2xl surface-card p-5">
          <SectionTitle icon={Calculator} title="COCOMO approximation" />
          <p className="mt-2 text-xs text-slate-400">Existing model: person-months = function points × scale factor × 0.2. This is a simplified approximation, not full COCOMO II.</p>
          <Select label="Project scale" value={scale} options={["small", "moderate", "large"]} onChange={(value) => setScale(value as typeof scale)} />
          <div className="mt-4 grid grid-cols-2 gap-3"><Info label="Equivalent input" value={`${functionPoints} function points`} /><Info label="Effort multiplier" value={String(cocomo.effortMultiplier)} /></div>
          <Result label="Estimated effort" value={`${cocomo.estimatedPersonMonths} person-months`} />
        </section>
        <section className="rounded-2xl surface-card p-5">
          <SectionTitle icon={CircleDollarSign} title="NPV" />
          <p className="mt-2 text-xs text-slate-400">Formula: NPV = Σ cash flow / (1 + discount rate)^period − initial investment.</p>
          <div className="mt-4 grid grid-cols-2 gap-3"><NumberInput label="Initial investment" value={investment} onChange={setInvestment} /><NumberInput label="Discount rate" value={discountRate} onChange={setDiscountRate} step={0.01} /></div>
          <label className="mt-3 block text-[11px] uppercase tracking-wider text-slate-400">Future cash flows<input value={cashFlows} onChange={(event) => setCashFlows(event.target.value)} className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0c1322] px-3 py-2 text-xs text-slate-200" /></label>
          <div className="mt-4 overflow-x-auto"><table className="w-full text-xs text-left"><thead className="text-slate-500"><tr><th className="py-2">Period</th><th>Cash flow</th><th>Discount factor</th><th>Present value</th></tr></thead><tbody>{discounted.map((row) => <tr key={row.period} className="border-t border-white/[0.06] text-slate-300"><td className="py-2">{row.period}</td><td>{row.cashFlow.toLocaleString()}</td><td>{row.factor.toFixed(4)}</td><td>{row.presentValue.toFixed(2)}</td></tr>)}</tbody></table></div>
          <Result label="Calculated NPV" value={npv === null ? "Enter investment >= 0" : `$${npv.toLocaleString()}`} />
        </section>
        <section className="rounded-2xl surface-card p-5">
          <SectionTitle icon={Percent} title="ROI" />
          <p className="mt-2 text-xs text-slate-400">Explicit model: the existing engine treats Net Profit as the benefit input and calculates ((benefit − investment) / investment) × 100. Here it is labeled Total Benefit for clarity.</p>
          <div className="mt-4 grid grid-cols-2 gap-3"><NumberInput label="Initial investment" value={investment} onChange={setInvestment} /><NumberInput label="Total benefit / revenue" value={benefit} onChange={setBenefit} /></div>
          <div className="mt-4 grid grid-cols-2 gap-3"><Info label="Net benefit" value={`$${netBenefit.toLocaleString()}`} /><Info label="Formula" value="(benefit − investment) / investment × 100" /></div>
          <Result label="Calculated ROI" value={roi === null ? "Enter investment > 0" : `${roi}%`} />
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Calculator; title: string }) { return <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300"><Icon size={15} className="text-cyan-400" />{title}</h2>; }
function NumberInput({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (value: number) => void; step?: number }) { return <label className="text-[11px] uppercase tracking-wider text-slate-400">{label}<input type="number" step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0c1322] px-3 py-2 text-xs text-slate-200" /></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="block text-[11px] uppercase tracking-wider text-slate-400">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0c1322] px-3 py-2 text-xs text-slate-200">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-white/[0.03] p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 text-sm font-semibold text-slate-200">{value}</div></div>; }
function Result({ label, value }: { label: string; value: string }) { return <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4"><div className="text-[10px] uppercase tracking-wider text-cyan-200/70">{label}</div><div className="mt-1 text-2xl font-bold text-white">{value}</div></div>; }
