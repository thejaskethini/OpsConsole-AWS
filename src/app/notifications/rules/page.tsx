"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sliders,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCw,
  Sparkles,
  Layers,
  Shield,
  Clock,
  Radio,
  Bell,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import {
  NotificationSeverityBadge,
  ChannelBadge,
  SimulatedDeliveryBanner,
} from "@/components/notifications";
import { useIdentity } from "@/components/identity/IdentityProvider";
import type {
  NotificationRule,
  NotificationSeverity,
  NotificationEventType,
  NotificationChannelType,
  NotificationRouteTarget,
} from "@/modules/notifications/types";

const ALL_SEVERITIES: NotificationSeverity[] = ["SEV1", "SEV2", "SEV3", "SEV4", "INFO"];
const ALL_EVENT_TYPES: NotificationEventType[] = [
  "ALERT_FIRING",
  "ALERT_ACKNOWLEDGED",
  "ALERT_RESOLVED",
  "INCIDENT_CREATED",
  "INCIDENT_ACKNOWLEDGED",
  "INCIDENT_MITIGATED",
  "INCIDENT_RESOLVED",
];

export default function NotificationRulesPage() {
  const { workspace, activeEnvironment, can } = useIdentity();
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(1);
  const [cooldownMinutes, setCooldownMinutes] = useState(5);
  const [selectedSeverities, setSelectedSeverities] = useState<NotificationSeverity[]>(["SEV1"]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<NotificationEventType[]>([
    "ALERT_FIRING",
    "INCIDENT_CREATED",
  ]);
  const [serviceId, setServiceId] = useState("*");
  const [destinations, setDestinations] = useState<NotificationRouteTarget[]>([
    { channelType: "IN_APP", destination: "OpsConsole Live Activity Feed", targetName: "In-App Feed", enabled: true },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = can("notifications:manage");

  const fetchRules = useCallback(async () => {
    if (!workspace || !activeEnvironment) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/notifications/rules?workspaceId=${workspace.id}&environmentId=${activeEnvironment.id}`
      );
      const data = await res.json();
      if (data.success && data.data?.rules) {
        setRules(data.data.rules);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [workspace, activeEnvironment]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleOpenCreateModal = () => {
    setEditingRuleId(null);
    setName("");
    setDescription("");
    setPriority(rules.length + 1);
    setCooldownMinutes(5);
    setSelectedSeverities(["SEV1"]);
    setSelectedEventTypes(["ALERT_FIRING", "INCIDENT_CREATED"]);
    setServiceId("*");
    setDestinations([
      { channelType: "IN_APP", destination: "OpsConsole Live Activity Feed", targetName: "In-App Feed", enabled: true },
      { channelType: "SLACK", destination: "#sre-critical", targetName: "Slack Critical Room", enabled: true },
    ]);
    setShowModal(true);
  };

  const handleOpenEditModal = (rule: NotificationRule) => {
    setEditingRuleId(rule.id);
    setName(rule.name);
    setDescription(rule.description);
    setPriority(rule.priority);
    setCooldownMinutes(rule.cooldownMinutes);
    setSelectedSeverities(rule.severities);
    setSelectedEventTypes(rule.eventTypes);
    setServiceId(rule.serviceIds[0] || "*");
    setDestinations(rule.destinations.map((d) => ({ ...d })));
    setShowModal(true);
  };

  const handleToggleRule = async (rule: NotificationRule) => {
    if (!workspace || !activeEnvironment || !canManage) return;
    try {
      const res = await fetch(`/api/notifications/rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          environmentId: activeEnvironment.id,
          isEnabled: !rule.isEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(`Rule '${rule.name}' is now ${!rule.isEnabled ? "enabled" : "disabled"}`);
        await fetchRules();
      }
    } catch {
      setFeedbackMessage("Failed to toggle rule");
    } finally {
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!workspace || !activeEnvironment || !canManage) return;
    if (!confirm("Are you sure you want to delete this notification rule?")) return;
    try {
      const res = await fetch(
        `/api/notifications/rules/${ruleId}?workspaceId=${workspace.id}&environmentId=${activeEnvironment.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage("Rule deleted successfully");
        await fetchRules();
      }
    } catch {
      setFeedbackMessage("Failed to delete rule");
    } finally {
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !activeEnvironment || !canManage) return;
    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const payload = {
        workspaceId: workspace.id,
        environmentId: activeEnvironment.id,
        name: name.trim(),
        description: description.trim(),
        priority: Number(priority),
        cooldownMinutes: Number(cooldownMinutes),
        severities: selectedSeverities,
        eventTypes: selectedEventTypes,
        serviceIds: [serviceId],
        destinations,
      };

      const url = editingRuleId
        ? `/api/notifications/rules/${editingRuleId}`
        : "/api/notifications/rules";
      const method = editingRuleId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(
          editingRuleId ? "Notification rule updated successfully." : "Notification rule created successfully."
        );
        setShowModal(false);
        await fetchRules();
      } else {
        setFeedbackMessage(data.error?.message || "Failed to save rule.");
      }
    } catch {
      setFeedbackMessage("Network error saving rule.");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const toggleSeverity = (sev: NotificationSeverity) => {
    setSelectedSeverities((prev) =>
      prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev]
    );
  };

  const toggleEventType = (evt: NotificationEventType) => {
    setSelectedEventTypes((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]
    );
  };

  const addDestination = (type: NotificationChannelType) => {
    const defaultDestinations: Record<NotificationChannelType, string> = {
      IN_APP: "OpsConsole Live Activity Feed",
      SLACK: "#sre-alerts",
      TEAMS: "Engineering Operations",
      EMAIL: "sre@opsconsole.internal",
      WEBHOOK: "https://api.internal/webhooks/pager",
    };
    setDestinations((prev) => [
      ...prev,
      { channelType: type, destination: defaultDestinations[type], targetName: `${type} Target`, enabled: true },
    ]);
  };

  const removeDestination = (idx: number) => {
    setDestinations((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      {/* Back Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/notifications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Notifications
        </Link>
        <span className="text-xs text-slate-500 font-mono">
          {rules.length} Rule(s) Configured
        </span>
      </div>

      <PageHeader
        icon={Sliders}
        title="Notification Rules & Routing"
        subtitle="Match severity, event types, and services with deterministic channel destinations and suppression cooldowns"
        iconColor="#06b6d4"
        iconBgColor="rgba(6, 182, 212, 0.1)"
        actions={
          canManage ? (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Rule
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-400 font-mono">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              Viewer: Read-Only
            </div>
          )
        }
      />

      <SimulatedDeliveryBanner />

      {feedbackMessage && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium animate-in fade-in">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          {feedbackMessage}
        </div>
      )}

      {/* Rules Table */}
      <div className="rounded-xl surface-card border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Rule Name & Details</th>
                <th className="py-3 px-4">Severities</th>
                <th className="py-3 px-4">Event Types</th>
                <th className="py-3 px-4">Destinations</th>
                <th className="py-3 px-4">Cooldown</th>
                <th className="py-3 px-4 text-center">Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                      <span>Loading notification rules...</span>
                    </div>
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Sliders className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-slate-400">No routing rules found</p>
                      <p className="text-xs text-slate-500">
                        Create a rule to route incoming alert and incident events to destinations.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-bold text-xs">
                        P{rule.priority}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-sm">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-white">{rule.name}</span>
                        <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">
                          {rule.description}
                        </p>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Target: {rule.serviceIds.includes("*") ? "All Services (*)" : rule.serviceIds.join(", ")}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {rule.severities.map((sev) => (
                          <span
                            key={sev}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/[0.04] text-slate-300 border border-white/[0.06]"
                          >
                            {sev}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {rule.eventTypes.map((evt) => (
                          <span
                            key={evt}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20 truncate"
                            title={evt}
                          >
                            {evt.replace("ALERT_", "").replace("INCIDENT_", "")}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {rule.destinations.map((dest, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20"
                            title={dest.destination}
                          >
                            <span>{dest.channelType}:</span>
                            <span className="truncate max-w-[100px]">{dest.destination}</span>
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{rule.cooldownMinutes}m</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleRule(rule)}
                        disabled={!canManage}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                          rule.isEnabled
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                        } ${canManage ? "cursor-pointer hover:opacity-80" : "cursor-not-allowed opacity-60"}`}
                      >
                        {rule.isEnabled ? "Active" : "Disabled"}
                      </button>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(rule)}
                              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.06] transition-colors"
                              title="Edit Rule"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                              title="Delete Rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit Rule */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl surface-card border border-white/[0.1] shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  {editingRuleId ? "Edit Notification Rule" : "Create Notification Rule"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. SEV1 Critical Immediate Escalation"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-400">
                      Priority (1=High)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-400">
                      Cooldown (Mins)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={cooldownMinutes}
                      onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-400">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describes operational intent and routing paths"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-400">
                  Target Service Scope
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="*">All Services (*)</option>
                  <option value="srv-notif-worker">Notification Worker (srv-notif-worker)</option>
                  <option value="srv-orders-api">Orders API (srv-orders-api)</option>
                  <option value="srv-payment-gw">Payment Gateway (srv-payment-gw)</option>
                  <option value="srv-inventory">Inventory Service (srv-inventory)</option>
                </select>
              </div>

              {/* Severities selector */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-400">
                  Triggering Severities *
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_SEVERITIES.map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => toggleSeverity(sev)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                        selectedSeverities.includes(sev)
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                          : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Types selector */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-400">
                  Triggering Event Types *
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 rounded-lg bg-black/20 border border-white/[0.04]">
                  {ALL_EVENT_TYPES.map((evt) => (
                    <button
                      key={evt}
                      type="button"
                      onClick={() => toggleEventType(evt)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                        selectedEventTypes.includes(evt)
                          ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                          : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white"
                      }`}
                    >
                      {evt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Routes Builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Route Destinations *
                  </label>
                  <div className="flex items-center gap-1">
                    {(["IN_APP", "SLACK", "TEAMS", "EMAIL", "WEBHOOK"] as NotificationChannelType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => addDestination(t)}
                        className="px-2 py-0.5 rounded text-[10px] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.06]"
                      >
                        + {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {destinations.map((dest, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]"
                    >
                      <ChannelBadge type={dest.channelType} />
                      <input
                        type="text"
                        value={dest.destination}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDestinations((prev) =>
                            prev.map((d, i) => (i === idx ? { ...d, destination: val } : d))
                          );
                        }}
                        className="flex-1 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => removeDestination(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || destinations.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {editingRuleId ? "Update Rule" : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
