"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sliders,
  Plus,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  Check,
  ArrowLeft,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { AlertSeverityBadge } from "@/components/alerts";
import { useIdentity } from "@/components/identity/IdentityProvider";
import type {
  AlertRule,
  AlertMetricType,
  AlertOperator,
  AlertSeverity,
} from "@/modules/alerting/types";

const METRIC_OPTIONS: { value: AlertMetricType; label: string; unit: string }[] = [
  { value: "LATENCY_P95", label: "P95 Latency", unit: "ms" },
  { value: "ERROR_RATE", label: "Error Rate (HTTP 5xx)", unit: "%" },
  { value: "TRAFFIC_RPS", label: "Traffic Throughput", unit: "rps" },
  { value: "SATURATION_CPU", label: "CPU Saturation", unit: "%" },
  { value: "SATURATION_MEMORY", label: "Memory Saturation", unit: "%" },
  { value: "SLO_COMPLIANCE", label: "SLO Compliance", unit: "%" },
  { value: "ERROR_BUDGET_REMAINING", label: "Error Budget Remaining", unit: "%" },
  { value: "BURN_RATE", label: "Burn Rate Multiplier", unit: "x" },
  { value: "SERVICE_HEALTH", label: "Service Health Status", unit: "status" },
];

const OPERATOR_OPTIONS: { value: AlertOperator; label: string }[] = [
  { value: "GT", label: "> (Greater than)" },
  { value: "GTE", label: ">= (Greater than or equal)" },
  { value: "LT", label: "< (Less than)" },
  { value: "LTE", label: "<= (Less than or equal)" },
  { value: "EQ", label: "== (Equal to)" },
  { value: "NEQ", label: "!= (Not equal to)" },
];

export default function AlertRulesPage() {
  const { workspace, activeEnvironment, can } = useIdentity();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formServiceId, setFormServiceId] = useState("*");
  const [formMetricType, setFormMetricType] = useState<AlertMetricType>("LATENCY_P95");
  const [formOperator, setFormOperator] = useState<AlertOperator>("GT");
  const [formThreshold, setFormThreshold] = useState("250");
  const [formWindowMinutes, setFormWindowMinutes] = useState("5");
  const [formSeverity, setFormSeverity] = useState<AlertSeverity>("CRITICAL");
  const [formCooldownMinutes, setFormCooldownMinutes] = useState("15");
  const [formIsEnabled, setFormIsEnabled] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const canManage = can("alerts:manage");

  const fetchRulesAndServices = useCallback(async () => {
    if (!workspace || !activeEnvironment) return;
    setLoading(true);
    try {
      const [rulesRes, sreRes] = await Promise.all([
        fetch(
          `/api/alerts/rules?workspaceId=${workspace.id}&environmentId=${activeEnvironment.id}`
        ),
        fetch(
          `/api/sre/services?workspaceId=${workspace.id}&environmentId=${activeEnvironment.id}`
        ),
      ]);

      const rulesData = await rulesRes.json();
      if (rulesData.success && rulesData.data?.rules) {
        setRules(rulesData.data.rules);
      }

      const sreData = await sreRes.json();
      if (sreData.success && sreData.data?.services) {
        setServices(
          sreData.data.services.map((item: any) => ({
            id: item.service.id,
            name: item.service.name,
          }))
        );
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  }, [workspace, activeEnvironment]);

  useEffect(() => {
    fetchRulesAndServices();
  }, [fetchRulesAndServices]);

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormName("");
    setFormDescription("");
    setFormServiceId("*");
    setFormMetricType("LATENCY_P95");
    setFormOperator("GT");
    setFormThreshold("250");
    setFormWindowMinutes("5");
    setFormSeverity("CRITICAL");
    setFormCooldownMinutes("15");
    setFormIsEnabled(true);
    setFormError(null);
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormDescription(rule.description);
    setFormServiceId(rule.serviceId);
    setFormMetricType(rule.condition.metricType);
    setFormOperator(rule.condition.operator);
    setFormThreshold(String(rule.condition.threshold));
    setFormWindowMinutes(String(rule.condition.windowMinutes));
    setFormSeverity(rule.severity);
    setFormCooldownMinutes(String(rule.cooldownMinutes));
    setFormIsEnabled(rule.isEnabled);
    setFormError(null);
    setModalOpen(true);
  };

  // Toggle Enabled
  const handleToggleEnabled = async (rule: AlertRule) => {
    if (!workspace || !canManage) return;
    try {
      const res = await fetch(
        `/api/alerts/rules/${rule.id}?workspaceId=${workspace.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled: !rule.isEnabled }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(
          `Rule '${rule.name}' is now ${!rule.isEnabled ? "enabled" : "disabled"}.`
        );
        await fetchRulesAndServices();
      }
    } catch {
      setFeedbackMessage("Failed to update rule state.");
    } finally {
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // Delete Rule
  const handleDeleteRule = async (ruleId: string, ruleName: string) => {
    if (!workspace || !canManage) return;
    if (!confirm(`Are you sure you want to delete rule '${ruleName}'?`)) return;
    try {
      const res = await fetch(
        `/api/alerts/rules/${ruleId}?workspaceId=${workspace.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(`Rule '${ruleName}' deleted.`);
        await fetchRulesAndServices();
      }
    } catch {
      setFeedbackMessage("Failed to delete rule.");
    } finally {
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !activeEnvironment || !canManage) return;

    if (!formName.trim()) {
      setFormError("Rule name is required.");
      return;
    }

    const selectedMetric = METRIC_OPTIONS.find((m) => m.value === formMetricType);
    const unit = selectedMetric?.unit;

    setSubmitting(true);
    setFormError(null);

    const payload = {
      name: formName.trim(),
      description: formDescription.trim(),
      serviceId: formServiceId,
      condition: {
        metricType: formMetricType,
        operator: formOperator,
        threshold:
          formMetricType === "SERVICE_HEALTH"
            ? formThreshold.toUpperCase()
            : Number(formThreshold) || formThreshold,
        windowMinutes: Number(formWindowMinutes) || 5,
        unit,
      },
      severity: formSeverity,
      isEnabled: formIsEnabled,
      cooldownMinutes: Number(formCooldownMinutes) || 15,
      workspaceId: workspace.id,
      environmentId: activeEnvironment.id,
    };

    try {
      const url = editingRule
        ? `/api/alerts/rules/${editingRule.id}?workspaceId=${workspace.id}`
        : `/api/alerts/rules?workspaceId=${workspace.id}&environmentId=${activeEnvironment.id}`;
      const method = editingRule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(
          editingRule ? `Rule updated successfully.` : `Rule created successfully.`
        );
        setModalOpen(false);
        await fetchRulesAndServices();
      } else {
        setFormError(data.error?.message || "Failed to save rule.");
      }
    } catch {
      setFormError("Request error saving rule.");
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const filteredRules = rules.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.condition.metricType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb & Navigation ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          href="/alerts"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors duration-150"
        >
          <ArrowLeft size={14} />
          <span>Back to Alerts Inbox</span>
        </Link>
      </div>

      {/* ── Page Header ─────────────────────────────────────────── */}
      <PageHeader
        icon={Sliders}
        title="Alert Rule Registry"
        subtitle="Configure evaluation conditions, thresholds, sliding windows, and deduplication cooldowns."
        tag={
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
            {rules.length} Configured Rules
          </span>
        }
        actions={
          canManage && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all duration-150 cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Alert Rule</span>
            </button>
          )
        }
      />

      {/* ── Feedback Notification ──────────────────────────────── */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs flex items-center justify-between">
          <span>{feedbackMessage}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-cyan-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Search & Counter ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 p-3.5 bg-[#0f172a] border border-slate-800 rounded-xl">
        <div className="relative flex-1 sm:w-72">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            placeholder="Search rules by name, metric..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#090e1a] border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {filteredRules.length} of {rules.length} Rules Active
        </span>
      </div>

      {/* ── Operational Rules Table ─────────────────────────────── */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0c1322] text-slate-400 font-semibold tracking-wide uppercase text-[10px]">
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Rule Name & Target</th>
                <th className="px-4 py-3.5">Condition Formula</th>
                <th className="px-4 py-3.5">Severity</th>
                <th className="px-4 py-3.5">Window / Cooldown</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <RotateCcw size={18} className="animate-spin inline mr-2 text-cyan-400" />
                    Loading alert rules...
                  </td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-400/60" />
                    No alert rules matching search query.
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => {
                  const targetServiceName =
                    rule.serviceId === "*"
                      ? "All Services (*)"
                      : services.find((s) => s.id === rule.serviceId)?.name ||
                        rule.serviceId;

                  return (
                    <tr
                      key={rule.id}
                      className="hover:bg-[#16223d]/40 transition-colors duration-150 group"
                    >
                      {/* Status Toggle */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          onClick={() => canManage && handleToggleEnabled(rule)}
                          disabled={!canManage}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium tracking-wide font-mono border transition-all duration-150 ${
                            rule.isEnabled
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                              : "bg-slate-800 border-slate-700 text-slate-500"
                          } ${canManage ? "cursor-pointer hover:border-slate-500" : "cursor-default"}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              rule.isEnabled ? "bg-emerald-400" : "bg-slate-500"
                            }`}
                          />
                          {rule.isEnabled ? "ENABLED" : "DISABLED"}
                        </button>
                      </td>

                      {/* Rule Name & Target */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="font-semibold text-slate-200 group-hover:text-white">
                          {rule.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {rule.description}
                        </p>
                        <div className="text-[10px] font-mono text-cyan-400/90 mt-1">
                          Target: {targetServiceName}
                        </div>
                      </td>

                      {/* Condition Formula */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-300">
                        <span className="text-cyan-300 font-medium">
                          {rule.condition.metricType}
                        </span>{" "}
                        <span className="text-slate-400">{rule.condition.operator}</span>{" "}
                        <span className="text-white font-semibold">
                          {rule.condition.threshold}
                          {rule.condition.unit || ""}
                        </span>
                      </td>

                      {/* Severity */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <AlertSeverityBadge severity={rule.severity} />
                      </td>

                      {/* Window & Cooldown */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        <div>Window: {rule.condition.windowMinutes}m</div>
                        <div className="text-[10px] text-slate-500">
                          Cooldown: {rule.cooldownMinutes}m
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        {canManage ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(rule)}
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors duration-150 cursor-pointer"
                              title="Edit Rule"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id, rule.name)}
                              className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors duration-150 cursor-pointer"
                              title="Delete Rule"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Read-Only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Rule Modal ────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white">
                {editingRule ? "Edit Alert Rule" : "Create Alert Rule"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Critical Burn Rate Multiplier"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#090e1a] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g., Triggers when burn rate exceeds sustainable limit."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#090e1a] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Target Service */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Target Service *
                </label>
                <select
                  value={formServiceId}
                  onChange={(e) => setFormServiceId(e.target.value)}
                  className="w-full bg-[#090e1a] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="*">All Services (*)</option>
                  {services.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.name} ({svc.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Metric */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    Metric Type *
                  </label>
                  <select
                    value={formMetricType}
                    onChange={(e) => setFormMetricType(e.target.value as any)}
                    className="w-full bg-[#090e1a] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    {METRIC_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Operator */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    Operator *
                  </label>
                  <select
                    value={formOperator}
                    onChange={(e) => setFormOperator(e.target.value as any)}
                    className="w-full bg-[#090e1a] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    {OPERATOR_OPTIONS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Threshold & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    Threshold Value *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 250, 2.0, or CRITICAL"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                    className="w-full bg-[#090e1a] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    Severity *
                  </label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as any)}
                    className="w-full bg-[#090e1a] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="WARNING">WARNING</option>
                    <option value="INFO">INFO</option>
                  </select>
                </div>
              </div>

              {/* Window & Cooldown */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    Sliding Window (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={formWindowMinutes}
                    onChange={(e) => setFormWindowMinutes(e.target.value)}
                    className="w-full bg-[#090e1a] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    Cooldown (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={formCooldownMinutes}
                    onChange={(e) => setFormCooldownMinutes(e.target.value)}
                    className="w-full bg-[#090e1a] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* Enabled Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isEnabledCheckbox"
                  checked={formIsEnabled}
                  onChange={(e) => setFormIsEnabled(e.target.checked)}
                  className="rounded bg-[#090e1a] border-slate-700 text-cyan-600 focus:ring-0"
                />
                <label
                  htmlFor="isEnabledCheckbox"
                  className="text-xs text-slate-300 font-medium cursor-pointer"
                >
                  Enable rule for evaluation passes
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer shadow-sm"
                >
                  {submitting ? (
                    <RotateCcw size={13} className="animate-spin" />
                  ) : (
                    <Check size={13} />
                  )}
                  <span>{editingRule ? "Update Rule" : "Create Rule"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
