"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  Bell,
  ArrowLeft,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Radio,
  Clock,
  Sparkles,
  Flame,
  Check,
  X,
  Send,
  Layers,
  Shield,
  Server,
  Activity,
  ChevronRight,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import {
  NotificationSeverityBadge,
  NotificationStatusBadge,
  DeliveryStatusBadge,
  ChannelBadge,
  SimulatedDeliveryBanner,
} from "@/components/notifications";
import { useIdentity } from "@/components/identity/IdentityProvider";
import type { Notification } from "@/modules/notifications/types";

export default function NotificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const { workspace, activeEnvironment, can } = useIdentity();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const canManage = can("notifications:manage");

  const fetchNotification = useCallback(async () => {
    if (!workspace || !activeEnvironment) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/notifications/${id}?workspaceId=${workspace.id}&environmentId=${activeEnvironment.id}`
      );
      const data = await res.json();
      if (data.success && data.data?.notification) {
        setNotification(data.data.notification);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [id, workspace, activeEnvironment]);

  useEffect(() => {
    fetchNotification();
  }, [fetchNotification]);

  const handleRetry = async (deliveryId?: string) => {
    if (!workspace || !activeEnvironment || !canManage) return;
    setRetrying(deliveryId || "all");
    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/notifications/${id}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          environmentId: activeEnvironment.id,
          deliveryId,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.notification) {
        setNotification(data.data.notification);
        setFeedbackMessage(data.data.message || "Delivery attempt completed.");
      } else {
        setFeedbackMessage(data.error?.message || "Retry failed.");
      }
    } catch {
      setFeedbackMessage("Network error during retry dispatch.");
    } finally {
      setRetrying(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RotateCcw className="w-6 h-6 animate-spin text-cyan-400" />
        <p className="text-sm text-slate-400">Loading notification audit detail...</p>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="space-y-6">
        <Link
          href="/notifications"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Notifications
        </Link>
        <div className="p-8 rounded-xl surface-card border border-white/[0.06] text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Notification Not Found</h2>
          <p className="text-xs text-slate-400">
            Notification with ID <code className="text-cyan-300 font-mono">{id}</code> was not found in this workspace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/notifications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Notifications
        </Link>
        <div className="flex items-center gap-2">
          <NotificationStatusBadge status={notification.status} />
          <NotificationSeverityBadge severity={notification.severity} />
        </div>
      </div>

      <PageHeader
        icon={Bell}
        title={notification.title}
        subtitle={`Dispatched by ${notification.source} engine • ID: ${notification.id}`}
        iconColor="#06b6d4"
        iconBgColor="rgba(6, 182, 212, 0.1)"
        actions={
          notification.deliveries.some((d) => d.status === "FAILED") && canManage ? (
            <button
              onClick={() => handleRetry()}
              disabled={Boolean(retrying)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
              Retry Failed Deliveries
            </button>
          ) : undefined
        }
      />

      <SimulatedDeliveryBanner />

      {feedbackMessage && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium animate-in fade-in">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          {feedbackMessage}
        </div>
      )}

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl surface-card border border-white/[0.06] space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Event Type
          </span>
          <p className="text-sm font-bold text-white font-mono">{notification.eventType}</p>
          <p className="text-[10px] text-slate-500">Source: {notification.source}</p>
        </div>

        <div className="p-4 rounded-xl surface-card border border-white/[0.06] space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Target Service
          </span>
          <p className="text-sm font-bold text-white">
            {notification.serviceName || "All Services (*)"}
          </p>
          {notification.serviceId && (
            <Link
              href="/services"
              className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono"
            >
              <Server className="w-2.5 h-2.5" />
              {notification.serviceId}
              <ExternalLink className="w-2 h-2" />
            </Link>
          )}
        </div>

        <div className="p-4 rounded-xl surface-card border border-white/[0.06] space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Matched Rule
          </span>
          <p className="text-sm font-bold text-white truncate" title={notification.ruleName}>
            {notification.ruleName || "None (Default / Suppressed)"}
          </p>
          {notification.ruleId && (
            <Link
              href="/notifications/rules"
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono"
            >
              Rule ID: {notification.ruleId}
            </Link>
          )}
        </div>

        <div className="p-4 rounded-xl surface-card border border-white/[0.06] space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Timestamp
          </span>
          <p className="text-xs font-mono text-white">
            {new Date(notification.createdAt).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500 font-mono truncate" title={notification.fingerprint}>
            FP: {notification.fingerprint}
          </p>
        </div>
      </div>

      {/* Correlated Entities Card */}
      {(notification.relatedAlertId || notification.relatedIncidentId) && (
        <div className="p-4 rounded-xl surface-card border border-white/[0.06] flex flex-wrap items-center gap-6">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Correlated Artifacts:
          </span>
          {notification.relatedAlertId && (
            <Link
              href="/alerts"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:text-amber-200 text-xs font-mono transition-colors"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Alert: {notification.relatedAlertId}
              <ExternalLink className="w-3 h-3 opacity-60 ml-1" />
            </Link>
          )}
          {notification.relatedIncidentId && (
            <Link
              href={`/incidents/${notification.relatedIncidentId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-mono transition-colors"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              Incident: {notification.relatedIncidentId}
              <ExternalLink className="w-3 h-3 opacity-60 ml-1" />
            </Link>
          )}
        </div>
      )}

      {/* Message Content */}
      <div className="p-5 rounded-xl surface-card border border-white/[0.06] space-y-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Notification Payload Message
        </h3>
        <div className="p-4 rounded-lg bg-black/40 border border-white/[0.06] text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap">
          {notification.message}
        </div>
        {notification.suppressionReason && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mt-2">
            <Radio className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Suppressed by Policy:</strong> {notification.suppressionReason}
            </span>
          </div>
        )}
      </div>

      {/* Deliveries & Attempt Audit Trail */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Channel Deliveries & Attempt Audit Trail ({notification.deliveries.length})
          </h3>
        </div>

        {notification.deliveries.length === 0 ? (
          <div className="p-8 rounded-xl surface-card border border-white/[0.06] text-center text-slate-500 text-xs">
            No channel deliveries were triggered (Notification was suppressed).
          </div>
        ) : (
          <div className="space-y-4">
            {notification.deliveries.map((del, idx) => (
              <div
                key={del.id}
                className="p-5 rounded-xl surface-card border border-white/[0.06] space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>
                    <ChannelBadge type={del.channelType} />
                    <span className="text-xs font-bold text-white font-mono">
                      {del.destination}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DeliveryStatusBadge status={del.status} />
                    {del.status === "FAILED" && canManage && (
                      <button
                        onClick={() => handleRetry(del.id)}
                        disabled={retrying === del.id}
                        className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {retrying === del.id ? "Retrying..." : "Retry Channel"}
                      </button>
                    )}
                  </div>
                </div>

                {del.failureReason && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
                    <strong>Error:</strong> {del.failureReason}
                  </div>
                )}

                {/* Attempt History */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Attempt Logs ({del.attempts.length}):
                  </span>
                  <div className="space-y-1.5">
                    {del.attempts.map((att) => (
                      <div
                        key={att.attemptNumber}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs"
                      >
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-500">Attempt #{att.attemptNumber}</span>
                          <span
                            className={
                              att.status === "DELIVERED"
                                ? "text-emerald-400 font-semibold"
                                : "text-rose-400 font-semibold"
                            }
                          >
                            [{att.status}]
                          </span>
                          <span className="text-slate-400">{att.adapter}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 text-[11px] font-mono">
                          <span>{new Date(att.timestamp).toLocaleTimeString()}</span>
                          {att.metadata && (
                            <span className="text-slate-400 truncate max-w-[240px]">
                              {JSON.stringify(att.metadata)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
