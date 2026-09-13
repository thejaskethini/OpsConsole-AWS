"use client";

import React from "react";
import {
  Bell,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  Radio,
  Mail,
  MessageSquare,
  Globe,
  Share2,
} from "lucide-react";
import type {
  NotificationSeverity,
  NotificationStatus,
  NotificationChannelType,
  NotificationDeliveryStatus,
} from "@/modules/notifications/types";

// ─── Severity Badge ───────────────────────────────────────────────────────────

export function NotificationSeverityBadge({ severity }: { severity: NotificationSeverity }) {
  const configs: Record<
    NotificationSeverity,
    { label: string; bg: string; text: string; border: string; icon: React.ElementType }
  > = {
    SEV1: {
      label: "SEV1 CRITICAL",
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      border: "border-rose-500/30",
      icon: AlertOctagon,
    },
    SEV2: {
      label: "SEV2 HIGH",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/30",
      icon: AlertTriangle,
    },
    SEV3: {
      label: "SEV3 WARN",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/30",
      icon: Info,
    },
    SEV4: {
      label: "SEV4 LOW",
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/30",
      icon: Info,
    },
    INFO: {
      label: "INFO",
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      border: "border-slate-500/30",
      icon: Info,
    },
  };

  const c = configs[severity] || configs.INFO;
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

export function NotificationStatusBadge({ status }: { status: NotificationStatus }) {
  const configs: Record<
    NotificationStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ElementType }
  > = {
    DELIVERED: {
      label: "DELIVERED",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      icon: CheckCircle2,
    },
    PARTIALLY_FAILED: {
      label: "PARTIAL FAIL",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/30",
      icon: AlertTriangle,
    },
    FAILED: {
      label: "FAILED",
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      border: "border-rose-500/30",
      icon: AlertOctagon,
    },
    SUPPRESSED: {
      label: "SUPPRESSED",
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      border: "border-slate-500/30",
      icon: Radio,
    },
    QUEUED: {
      label: "QUEUED",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/30",
      icon: Clock,
    },
    CREATED: {
      label: "CREATED",
      bg: "bg-cyan-500/10",
      text: "text-cyan-400",
      border: "border-cyan-500/30",
      icon: Clock,
    },
  };

  const c = configs[status] || configs.CREATED;
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </span>
  );
}

// ─── Channel Badge ────────────────────────────────────────────────────────────

export function ChannelBadge({ type }: { type: NotificationChannelType }) {
  const configs: Record<
    NotificationChannelType,
    { label: string; bg: string; text: string; border: string; icon: React.ElementType }
  > = {
    IN_APP: {
      label: "In-App",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/30",
      icon: Bell,
    },
    SLACK: {
      label: "Slack",
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/30",
      icon: MessageSquare,
    },
    TEAMS: {
      label: "Teams",
      bg: "bg-indigo-500/10",
      text: "text-indigo-400",
      border: "border-indigo-500/30",
      icon: Share2,
    },
    EMAIL: {
      label: "Email",
      bg: "bg-cyan-500/10",
      text: "text-cyan-400",
      border: "border-cyan-500/30",
      icon: Mail,
    },
    WEBHOOK: {
      label: "Webhook",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      icon: Globe,
    },
  };

  const c = configs[type] || configs.IN_APP;
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${c.bg} ${c.text} ${c.border}`}
    >
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

// ─── Delivery Status Badge ────────────────────────────────────────────────────

export function DeliveryStatusBadge({ status }: { status: NotificationDeliveryStatus }) {
  const configs: Record<
    NotificationDeliveryStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ElementType }
  > = {
    DELIVERED: {
      label: "Delivered",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      icon: CheckCircle2,
    },
    FAILED: {
      label: "Failed",
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      border: "border-rose-500/30",
      icon: AlertOctagon,
    },
    SUPPRESSED: {
      label: "Suppressed",
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      border: "border-slate-500/30",
      icon: Radio,
    },
    PENDING: {
      label: "Pending",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/30",
      icon: Clock,
    },
  };

  const c = configs[status] || configs.PENDING;
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}
    >
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

// ─── Simulated Banner ─────────────────────────────────────────────────────────

export function SimulatedDeliveryBanner() {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-cyan-500/[0.06] border border-cyan-500/20 text-xs text-cyan-300/90 mb-6">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>
          <strong className="font-semibold text-cyan-300">Deterministic Local Adapter Engine:</strong>{" "}
          All channel dispatches (In-App, Slack, Teams, Email, Webhook) are simulated locally without external SaaS credentials.
        </span>
      </div>
      <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">
        Phase 6 Active
      </span>
    </div>
  );
}
