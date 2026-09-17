"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, AlertOctagon, AlertTriangle, Info, Clock, ArrowRight, ExternalLink } from "lucide-react";
import type { Notification } from "@/modules/notifications/types";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      if (data.data?.notifications) {
        const list: Notification[] = data.data.notifications;
        setNotifications(list.slice(0, 5));
        const unread = list.filter(n => n.status !== "DELIVERED" && n.status !== "SUPPRESSED").length;
        setUnreadCount(unread || list.length);
      }
    } catch {
      // silent fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case "SEV1":
        return <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case "SEV2":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case "SEV3":
      case "SEV4":
        return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        className="relative p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-bold text-[9px] flex items-center justify-center font-mono animate-pulse-subtle">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl bg-[#0c1322] border border-white/[0.1] shadow-2xl shadow-black/80 z-[100] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-cyan-400" />
              <span className="text-xs font-semibold text-white tracking-wide uppercase">Operational Notifications</span>
            </div>
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors"
            >
              View All <ArrowRight size={11} />
            </Link>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
            {loading && notifications.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400">Loading notifications…</div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">No recent notifications</div>
            )}

            {notifications.map((n) => (
              <Link
                key={n.id}
                href={`/notifications/${n.id}`}
                onClick={() => setIsOpen(false)}
                className="block p-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">{getSeverityIcon(n.severity)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{n.title}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono">
                      <span>{n.serviceName || "Global"}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="px-4 py-2 bg-white/[0.02] border-t border-white/[0.06] text-center">
            <Link
              href="/notifications/rules"
              onClick={() => setIsOpen(false)}
              className="text-[10.5px] text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
            >
              Configure Notification Rules <ExternalLink size={10} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
