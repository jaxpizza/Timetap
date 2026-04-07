"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Palmtree,
  FileCheck,
  AlertTriangle,
  Calendar,
  UserPlus,
  CheckCircle,
  Clock,
  DollarSign,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/notifications/actions";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const typeConfig: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  pto_request: { icon: Palmtree, color: "#FBBF24" },
  pto_approved: { icon: Palmtree, color: "#34D399" },
  pto_denied: { icon: Palmtree, color: "#FB7185" },
  timesheet_approved: { icon: FileCheck, color: "#34D399" },
  timesheet_pending: { icon: FileCheck, color: "#818CF8" },
  timesheet_flagged: { icon: AlertTriangle, color: "#FBBF24" },
  shift_published: { icon: Calendar, color: "#818CF8" },
  shift_changed: { icon: Calendar, color: "#FBBF24" },
  join_request: { icon: UserPlus, color: "#818CF8" },
  approved: { icon: CheckCircle, color: "#34D399" },
  employee_approved: { icon: CheckCircle, color: "#34D399" },
  clock_reminder: { icon: Clock, color: "#FBBF24" },
  payroll_processed: { icon: DollarSign, color: "#34D399" },
};

function getTimeAgo(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

export function NotificationBell({ initialCount = 0 }: { initialCount?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Keep count in sync if parent re-renders with new initialCount
  useEffect(() => {
    setUnreadCount(initialCount);
  }, [initialCount]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Fetch notifications when dropdown opens
  async function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      setLoading(true);
      const data = await getNotifications(20);
      setNotifications(data as Notification[]);
      // Also sync unread count from fetched data
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
      setLoading(false);
    }
  }

  async function handleMarkRead(notif: Notification) {
    if (!notif.is_read) {
      await markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (notif.link) router.push(notif.link);
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        className="relative flex size-8 items-center justify-center rounded-lg transition-colors"
        style={{ color: "var(--tt-text-tertiary)" }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white animate-[badge-pulse_2s_ease-in-out_infinite]"
            style={{
              height: 18,
              boxShadow: "0 0 8px rgba(244,63,94,0.4)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl shadow-2xl"
            style={{
              zIndex: 9999,
              backgroundColor: "var(--tt-card-bg)",
              border: "1px solid var(--tt-border-subtle)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--tt-border-faint)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>Notifications</p>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-indigo-400 transition-colors hover:text-indigo-300">
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading && notifications.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <div className="size-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                </div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="flex flex-col items-center py-10">
                  <Bell size={24} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} />
                  <p className="mt-3 text-sm" style={{ color: "var(--tt-text-muted)" }}>You&apos;re all caught up</p>
                </div>
              )}

              {notifications.map((notif) => {
                const config = typeConfig[notif.type] ?? { icon: Bell, color: "#71717A" };
                const Icon = config.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleMarkRead(notif)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:brightness-110"
                    style={{
                      backgroundColor: notif.is_read ? "transparent" : "var(--tt-elevated-bg)",
                      borderBottom: "1px solid var(--tt-border-faint)",
                    }}
                  >
                    {/* Unread dot + icon */}
                    <div className="relative mt-0.5 shrink-0">
                      <div
                        className="flex size-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${config.color}15` }}
                      >
                        <Icon size={14} style={{ color: config.color }} />
                      </div>
                      {!notif.is_read && (
                        <span className="absolute -left-1 -top-1 size-2.5 rounded-full bg-indigo-500" style={{ boxShadow: "0 0 4px rgba(99,102,241,0.5)" }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>{notif.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: "var(--tt-text-tertiary)" }}>{notif.message}</p>
                      <p className="mt-1 text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{getTimeAgo(notif.created_at)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
