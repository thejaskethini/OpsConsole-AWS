"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  RotateCcw,
  Search,
  ExternalLink,
  Sliders,
  Send,
  Radio,
  Clock,
  Sparkles,
  Flame,
  Check,
  X,
  Plus,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import {
  NotificationSeverityBadge,
  NotificationStatusBadge,
  ChannelBadge,
  SimulatedDeliveryBanner,
} from "@/components/notifications";
import { useIdentity } from "@/components/identity/IdentityProvider";
import type {
  Notification,
  NotificationSeverity,
  NotificationStatus,
  NotificationChannelType,
  NotificationStats,
} from "@/modules/notifications/types";

export default function NotificationsPage() {
  const { workspace, activeEnvironment, can } = useIdentity();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<NotificationSeverity | "ALL">("ALL");
  const [channelFilter, setChannelFilter] = useState<NotificationChannelType | "ALL">("ALL");

  // Modal State for Test Dispatch
  const [showTestModal, setShowTestModal] = useState(false);
  const [testSeverity, setTestSeverity] = useState<NotificationSeverity>("SEV1");
  const [testServiceId, setTestServiceId] = useState("srv-notif-worker");
  const [testTitle, setTestTitle] = useState("Critical Service Latency Spike Detected");
  const [testMessage, setTestMessage] = useState("Service latency increased over 500ms in ap-south-1. Automated routing initiated.");
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const canManage = can("notifications:manage");

  const fetchNotifications = useCallback(async () => {
    if (!workspace || !activeEnvironment) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        workspaceId: workspace.id,
        environmentId: activeEnvironment.id,
      });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (severityFilter !== "ALL") params.set("severity", severityFilter);
      if (channelFilter !== "ALL") params.set("channelType", channelFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/notifications?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data?.notifications) {
        setNotifications(data.data.notifications);
        if (data.data.stats) {
          setStats(data.data.stats);
        }
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [workspace, activeEnvironment, statusFilter, severityFilter, channelFilter, searchQuery]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Dispatch Test Notification
  const handleDispatchTest = async () => {
    if (!workspace || !activeEnvironment || !canManage) return;
    setIsSubmittingTest(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          environmentId: activeEnvironment.id,
          severity: testSeverity,
          serviceId: testServiceId,
          title: testTitle,
          message: testMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage("Test notification dispatched across configured routes.");
        setShowTestModal(false);
        await fetchNotifications();
      } else {
        setFeedbackMessage(data.error?.message || "Failed to dispatch test notification");
      }
    } catch {
      setFeedbackMessage("Network error during test dispatch");
    } finally {
      setIsSubmittingTest(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  // Quick Retry for a notification
  const handleQuickRetry = async (notificationId: string) => {
    if (!workspace || !activeEnvironment || !canManage) return;
    try {
      const res = await fetch(`/api/notifications/${notificationId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          environmentId: activeEnvironment.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(`Delivery retried for ${notificationId}`);
        await fetchNotifications();
      }
    } catch {
      setFeedbackMessage("Retry request failed");
    } finally {
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        title="Notification Platform"
        subtitle="Deterministic multi-channel operational routing, deduplication, and delivery auditing"
        iconColor="#06b6d4"
        iconBgColor="rgba(6, 182, 212, 0.1)"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchNotifications()}
              className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition-colors"
              title="Refresh Notifications"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/notifications/rules"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-semibold transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Routing Rules
            </Link>
            {canManage && (
              <button
                onClick={() => setShowTestModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch Test Event
              </button>
            )}
          </div>
        }
      />

      <SimulatedDeliveryBanner />

      {feedbackMessage && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium animate-in fade-in">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          {feedbackMessage}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Bell}
          label="Total Notifications"
          value={stats?.total ?? notifications.length}
          color="#38bdf8"
          sub="Workspace events processed"
        />
        <StatCard
          icon={CheckCircle2}
          label="Delivered"
          value={stats?.delivered ?? notifications.filter((n) => n.status === "DELIVERED").length}
          color="#10b981"
          sub="Dispatched without error"
        />
        <StatCard
          icon={AlertOctagon}
          label="Failed / Partial"
          value={
            (stats?.failed ?? 0) + (stats?.partiallyFailed ?? 0) ||
            notifications.filter((n) => n.status === "FAILED" || n.status === "PARTIALLY_FAILED").length
          }
          color="#f43f5e"
          sub="Target delivery failures"
        />
        <StatCard
          icon={Radio}
          label="Suppressed"
          value={stats?.suppressed ?? notifications.filter((n) => n.status === "SUPPRESSED").length}
          color="#94a3b8"
          sub="Cooldown deduplicated"
        />
        <StatCard
          icon={Flame}
          label="SEV1 Criticals"
          value={stats?.sev1Count ?? notifications.filter((n) => n.severity === "SEV1").length}
          color="#f43f5e"
          sub="Highest priority alerts"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-xl surface-card border border-white/[0.06]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications, service, rule, alert, or incident..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="DELIVERED">Delivered</option>
            <option value="PARTIALLY_FAILED">Partially Failed</option>
            <option value="FAILED">Failed</option>
            <option value="SUPPRESSED">Suppressed</option>
          </select>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="ALL">All Severities</option>
            <option value="SEV1">SEV1 Critical</option>
            <option value="SEV2">SEV2 High</option>
            <option value="SEV3">SEV3 Warning</option>
            <option value="SEV4">SEV4 Low</option>
            <option value="INFO">INFO</option>
          </select>

          {/* Channel filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="ALL">All Channels</option>
            <option value="IN_APP">In-App</option>
            <option value="SLACK">Slack</option>
            <option value="TEAMS">Teams</option>
            <option value="EMAIL">Email</option>
            <option value="WEBHOOK">Webhook</option>
          </select>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="rounded-xl surface-card border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Status / Severity</th>
                <th className="py-3 px-4">Notification & Service</th>
                <th className="py-3 px-4">Correlations</th>
                <th className="py-3 px-4">Delivered Channels</th>
                <th className="py-3 px-4">Dispatched At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                      <span>Loading notification records...</span>
                    </div>
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Bell className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-slate-400">No notifications found</p>
                      <p className="text-xs text-slate-500">
                        Try adjusting your filters or dispatch a test event to verify routing.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                notifications.map((notif) => {
                  const hasFailedDelivery = notif.deliveries.some((d) => d.status === "FAILED");

                  return (
                    <tr
                      key={notif.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5 items-start">
                          <NotificationStatusBadge status={notif.status} />
                          <NotificationSeverityBadge severity={notif.severity} />
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-md">
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/notifications/${notif.id}`}
                            className="font-semibold text-white group-hover:text-cyan-300 transition-colors line-clamp-1"
                          >
                            {notif.title}
                          </Link>
                          <p className="text-slate-400 line-clamp-2 text-[11px] leading-relaxed">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {notif.serviceName && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                                {notif.serviceName}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-slate-500">
                              Source: {notif.source}
                            </span>
                            {notif.ruleName && (
                              <span className="text-[10px] text-cyan-400/80 truncate max-w-[160px]" title={notif.ruleName}>
                                Rule: {notif.ruleName}
                              </span>
                            )}
                          </div>
                          {notif.suppressionReason && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-400/90 mt-1">
                              <Radio className="w-3 h-3 shrink-0" />
                              <span className="truncate">{notif.suppressionReason}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 text-[11px]">
                          {notif.relatedAlertId && (
                            <Link
                              href="/alerts"
                              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-mono"
                            >
                              <Flame className="w-3 h-3 text-amber-400" />
                              {notif.relatedAlertId}
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </Link>
                          )}
                          {notif.relatedIncidentId && (
                            <Link
                              href={`/incidents/${notif.relatedIncidentId}`}
                              className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-mono"
                            >
                              <AlertOctagon className="w-3 h-3 text-rose-400" />
                              {notif.relatedIncidentId}
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </Link>
                          )}
                          {!notif.relatedAlertId && !notif.relatedIncidentId && (
                            <span className="text-slate-500 text-[10px]">Direct Event</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {notif.deliveries.length === 0 ? (
                          <span className="text-[11px] text-slate-500 italic">None (Suppressed)</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {notif.deliveries.map((del) => (
                              <div
                                key={del.id}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                  del.status === "DELIVERED"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : del.status === "FAILED"
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                    : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                }`}
                                title={`${del.channelType}: ${del.destination} (${del.status})`}
                              >
                                <span>{del.channelType}</span>
                                {del.status === "DELIVERED" ? (
                                  <Check className="w-2.5 h-2.5" />
                                ) : del.status === "FAILED" ? (
                                  <X className="w-2.5 h-2.5" />
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col text-[11px] font-mono">
                          <span className="text-slate-300">
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            {new Date(notif.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasFailedDelivery && canManage && (
                            <button
                              onClick={() => handleQuickRetry(notif.id)}
                              className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold transition-colors cursor-pointer"
                              title="Retry failed deliveries"
                            >
                              Retry
                            </button>
                          )}
                          <Link
                            href={`/notifications/${notif.id}`}
                            className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] text-[11px] font-semibold transition-colors"
                          >
                            Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Event Dispatch Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl surface-card border border-white/[0.1] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Dispatch Test Notification</h3>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Severity Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["SEV1", "SEV2", "SEV3", "SEV4"] as NotificationSeverity[]).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setTestSeverity(sev)}
                      className={`py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        testSeverity === sev
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                          : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Target Service
                </label>
                <select
                  value={testServiceId}
                  onChange={(e) => setTestServiceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="srv-notif-worker">Notification Worker (srv-notif-worker)</option>
                  <option value="srv-orders-api">Orders API (srv-orders-api)</option>
                  <option value="srv-payment-gw">Payment Gateway (srv-payment-gw)</option>
                  <option value="srv-inventory">Inventory Service (srv-inventory)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Notification Title
                </label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Operational Message
                </label>
                <textarea
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[11px] text-slate-400 leading-relaxed">
                The NotificationEngine will match rules configured for <strong className="text-cyan-300">{testSeverity}</strong> in this environment, evaluate cooldowns, and dispatch simulated adapters.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchTest}
                disabled={isSubmittingTest}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isSubmittingTest ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Dispatch Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
