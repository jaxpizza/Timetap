"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Calendar,
  FileText,
  Palmtree,
  User,
  Bell,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme-provider";
import { getInitials, getGreeting } from "@/lib/utils";

const tabs = [
  { label: "Clock", icon: Clock, href: "/dashboard" },
  { label: "Schedule", icon: Calendar, href: "/dashboard/schedule" },
  { label: "Timesheet", icon: FileText, href: "/dashboard/timesheet" },
  { label: "PTO", icon: Palmtree, href: "/dashboard/pto" },
  { label: "Profile", icon: User, href: "/dashboard/profile" },
];

function capitalize(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<{
    first_name?: string;
    last_name?: string;
    role?: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("first_name, last_name, role")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      }
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  if (!mounted) return null;

  const activeIdx = tabs.findIndex((t) =>
    t.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(t.href)
  );

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--tt-page-bg)" }}
    >
      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden w-[200px] shrink-0 flex-col md:flex"
        style={{
          backgroundColor: "var(--tt-sidebar-bg)",
          borderRight: "1px solid var(--tt-border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 px-5 py-5"
          style={{ borderBottom: "1px solid var(--tt-border-subtle)" }}
        >
          <Clock size={18} strokeWidth={1.8} className="text-indigo-400" />
          <span className="font-heading text-base font-bold tracking-tight">
            <span style={{ color: "var(--tt-text-primary)" }}>Time</span>
            <span className="text-indigo-400">Tap</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active =
              tab.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? "font-semibold text-indigo-300"
                    : "hover:text-[var(--tt-text-secondary)]"
                }`}
                style={
                  active
                    ? {
                        background:
                          "linear-gradient(90deg, rgba(99,102,241,0.12) 0%, transparent 100%)",
                        color: undefined,
                      }
                    : { color: "var(--tt-text-tertiary)" }
                }
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-indigo-400"
                    style={{
                      boxShadow: "0 0 8px rgba(129,140,248,0.5)",
                    }}
                  />
                )}
                <Icon
                  size={18}
                  strokeWidth={1.8}
                  className={active ? "text-indigo-400" : ""}
                />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* User + Sign Out */}
        <div
          className="px-3 pb-4 pt-3"
          style={{ borderTop: "1px solid var(--tt-border-subtle)" }}
        >
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div
              className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white"
              style={{ boxShadow: "0 0 8px rgba(99,102,241,0.2)" }}
            >
              {getInitials(profile?.first_name, profile?.last_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-medium"
                style={{ color: "var(--tt-text-primary)" }}
              >
                {capitalize(profile?.first_name)}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-rose-400 transition-colors hover:bg-rose-500/[0.06]"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Top Header */}
        <header
          className="flex h-14 shrink-0 items-center justify-between px-4 md:hidden"
          style={{
            backgroundColor: "var(--tt-mobile-header-bg)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--tt-border-subtle)",
          }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: "var(--tt-text-primary)" }}
          >
            {getGreeting()},{" "}
            {capitalize(profile?.first_name) || "there"}
          </p>
          <button
            className="relative flex size-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--tt-text-tertiary)" }}
          >
            <Bell size={16} />
          </button>
        </header>

        {/* Desktop Header */}
        <header
          className="hidden h-14 shrink-0 items-center justify-between px-5 md:flex"
          style={{
            backgroundColor: "var(--tt-header-bg)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--tt-border-faint)",
          }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: "var(--tt-text-secondary)" }}
          >
            {getGreeting()}, {capitalize(profile?.first_name) || "there"}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="flex size-8 items-center justify-center rounded-lg transition-colors duration-200"
              style={{ color: "var(--tt-text-tertiary)" }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex"
                >
                  {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                </motion.span>
              </AnimatePresence>
            </button>
            <button
              className="relative flex size-8 items-center justify-center rounded-lg transition-colors"
              style={{ color: "var(--tt-text-tertiary)" }}
            >
              <Bell size={15} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main
          className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6"
          style={{ backgroundColor: "var(--tt-page-bg)" }}
        >
          {children}
        </main>

        {/* ── Mobile Bottom Tab Bar ── */}
        <nav
          className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around md:hidden"
          style={{
            backgroundColor: "var(--tt-sidebar-bg)",
            borderTop: "1px solid var(--tt-border)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {tabs.map((tab, i) => {
            const Icon = tab.icon;
            const active = i === activeIdx;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex flex-col items-center gap-1 px-3 py-2"
              >
                <Icon
                  size={20}
                  strokeWidth={1.8}
                  style={{
                    color: active
                      ? "#818CF8"
                      : "var(--tt-text-muted)",
                  }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{
                    color: active
                      ? "#818CF8"
                      : "var(--tt-text-muted)",
                  }}
                >
                  {tab.label}
                </span>
                {active && (
                  <motion.span
                    layoutId="tab-dot"
                    className="absolute -bottom-0.5 size-1 rounded-full bg-indigo-400"
                    transition={{ type: "spring" as const, damping: 25, stiffness: 200 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
