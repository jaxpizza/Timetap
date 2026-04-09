"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Clock,
  FileText,
  DollarSign,
  Calendar,
  Palmtree,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Bell,
  Menu,
  LogOut,
  User,
  Search,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme-provider";
import { useSidebarStore } from "@/stores/sidebar-store";
import { getInitials } from "@/lib/utils";
import { NotificationBell } from "@/components/notification-dropdown";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function capitalize(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ── data ── */

interface NavItem {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string }>;
  href: string;
  roles?: string[]; // if set, only these roles see it. If unset, all admin+ roles see it.
}
interface NavSection { label: string; items: NavItem[] }

const navSections: NavSection[] = [
  {
    label: "MAIN",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
      { label: "Clock In", icon: Clock, href: "/admin/clock-in" },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { label: "Employees", icon: Users, href: "/admin/employees" },
      { label: "Time Clock", icon: Clock, href: "/admin/time-clock" },
      { label: "Timesheets", icon: FileText, href: "/admin/timesheets" },
    ],
  },
  {
    label: "FINANCE",
    items: [{ label: "Payroll", icon: DollarSign, href: "/admin/payroll", roles: ["owner", "admin"] }],
  },
  {
    label: "PLANNING",
    items: [
      { label: "Schedule", icon: Calendar, href: "/admin/schedule" },
      { label: "PTO", icon: Palmtree, href: "/admin/pto" },
    ],
  },
  {
    label: "OTHER",
    items: [
      { label: "AI Assistant", icon: Sparkles, href: "/admin/ai", roles: ["owner", "admin"] },
      { label: "Settings", icon: Settings, href: "/admin/settings", roles: ["owner", "admin"] },
    ],
  },
];

/* ── NavLink ── */

function NavLink({
  item,
  collapsed,
  active,
  onClick,
}: {
  item: NavSection["items"][0];
  collapsed: boolean;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onClick}
      className={`relative flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-200 ${
        collapsed ? "mx-1 justify-center px-2 py-2.5" : "mx-2 px-4 py-2.5"
      } ${
        active
          ? "font-semibold text-indigo-300"
          : "text-[var(--tt-text-tertiary)] hover:text-[var(--tt-text-secondary)]"
      }`}
      style={
        active
          ? {
              background:
                "linear-gradient(90deg, rgba(99,102,241,0.12) 0%, transparent 100%)",
            }
          : undefined
      }
      onMouseEnter={(e) => {
        if (!active)
          e.currentTarget.style.backgroundColor = "var(--tt-hover-overlay)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = "";
      }}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-indigo-400"
          style={{ boxShadow: "0 0 8px rgba(129,140,248,0.5)" }}
        />
      )}
      <Icon
        size={18}
        strokeWidth={1.8}
        className={`shrink-0 ${active ? "text-indigo-400" : ""}`}
      />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={<div />}>{link}</TooltipTrigger>
        <TooltipContent
          side="right"
          className="border shadow-xl"
          style={{
            backgroundColor: "var(--tt-dropdown-bg)",
            borderColor: "var(--tt-border)",
            color: "var(--tt-text-secondary)",
          }}
        >
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

/* ── UserAvatar ── */

function UserAvatar({
  firstName,
  lastName,
  size = 38,
}: {
  firstName?: string;
  lastName?: string;
  size?: number;
}) {
  const initials = getInitials(firstName, lastName);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size < 34 ? 11 : 13,
        boxShadow: "0 0 12px rgba(99,102,241,0.25)",
      }}
    >
      {initials}
    </div>
  );
}

/* ── Gradient Divider ── */

function GradientDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-[1px] ${className}`}
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, var(--tt-divider) 50%, transparent 100%)",
      }}
    />
  );
}

/* ── Sidebar ── */

function SidebarContent({
  collapsed,
  profile,
  onSignOut,
  onNavClick,
  isSuperAdmin = false,
}: {
  collapsed: boolean;
  profile: { first_name?: string; last_name?: string; role?: string } | null;
  onSignOut: () => void;
  onNavClick?: () => void;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const { toggle } = useSidebarStore();
  const userRole = profile?.role ?? "employee";

  // Filter nav items by role
  const filteredSections = navSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.roles || item.roles.includes(userRole)),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={`flex items-center ${collapsed ? "justify-center px-3 py-6" : "px-5 py-6"}`}
        style={{
          backgroundColor: "var(--tt-sidebar-logo-bg)",
          borderBottom: "1px solid var(--tt-border-subtle)",
        }}
      >
        {collapsed ? (
          <Clock
            size={22}
            strokeWidth={1.8}
            className="animate-[logo-spin_30s_linear_infinite] text-indigo-400"
          />
        ) : (
          <div className="flex items-center gap-2.5">
            <Clock
              size={20}
              strokeWidth={1.8}
              className="animate-[logo-spin_30s_linear_infinite] text-indigo-400"
            />
            <span className="font-heading text-lg font-bold tracking-tight">
              <span style={{ color: "var(--tt-text-primary)" }}>Time</span>
              <span className="text-indigo-400">Tap</span>
            </span>
          </div>
        )}
      </div>
      <GradientDivider className="mx-3" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        <TooltipProvider>
          {filteredSections.map((section, sIdx) => (
            <div key={section.label}>
              {sIdx > 0 && <GradientDivider className={collapsed ? "mx-3 my-2" : "mx-4 mb-2"} />}
              {!collapsed && (
                <div
                  className={`px-5 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                    sIdx === 0 ? "pt-4" : "pt-4"
                  }`}
                  style={{ color: "var(--tt-text-muted)" }}
                >
                  {section.label}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    onClick={onNavClick}
                    active={
                      item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.href)
                    }
                  />
                ))}
              </div>
            </div>
          ))}
          {isSuperAdmin && (
            <>
              <GradientDivider className={collapsed ? "mx-3 my-2" : "mx-4 mb-2"} />
              <Link
                href="/super-admin"
                className={`flex items-center gap-3 rounded-xl transition-all duration-200 ${
                  collapsed ? "mx-2 justify-center px-2 py-2" : "mx-3 px-3 py-2"
                }`}
                style={{
                  backgroundColor: "rgba(244,63,94,0.06)",
                  border: "1px solid rgba(244,63,94,0.15)",
                  color: "#FB7185",
                }}
              >
                <Shield size={collapsed ? 18 : 16} />
                {!collapsed && <span className="text-xs font-semibold">Platform Admin</span>}
              </Link>
            </>
          )}
        </TooltipProvider>
      </nav>

      {/* Collapse toggle (desktop only) */}
      {!onNavClick && (
        <div className="flex justify-center pb-3">
          <button
            onClick={toggle}
            className="flex size-7 items-center justify-center rounded-full transition-all duration-200 hover:shadow-[0_0_8px_rgba(129,140,248,0.15)]"
            style={{
              backgroundColor: "var(--tt-elevated-bg)",
              border: "1px solid var(--tt-border)",
              color: "var(--tt-text-tertiary)",
            }}
          >
            {collapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronLeft size={14} />
            )}
          </button>
        </div>
      )}

      {/* User section */}
      <GradientDivider className="mx-3" />
      <div className="px-3 pb-4 pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-all duration-200 ${
              collapsed ? "justify-center" : ""
            }`}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "var(--tt-hover-overlay-strong)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "";
            }}
          >
            <UserAvatar
              firstName={profile?.first_name}
              lastName={profile?.last_name}
              size={38}
            />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: "var(--tt-text-primary)" }}
                >
                  {capitalize(profile?.first_name)}{" "}
                  {capitalize(profile?.last_name)}
                </p>
                <p
                  className="truncate text-[11px] capitalize"
                  style={{ color: "var(--tt-text-tertiary)" }}
                >
                  {profile?.role}
                </p>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={collapsed ? "right" : "top"}
            align="start"
            className="w-52 rounded-xl p-1 shadow-2xl shadow-black/50"
            style={{
              backgroundColor: "var(--tt-dropdown-bg)",
              borderColor: "var(--tt-border)",
            }}
          >
            <DropdownMenuItem
              className="gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
              style={{ color: "var(--tt-text-tertiary)" }}
            >
              <User size={15} />
              Your Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
              style={{ color: "var(--tt-text-tertiary)" }}
            >
              <Settings size={15} />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator
              style={{ backgroundColor: "var(--tt-border-subtle)" }}
            />
            <DropdownMenuItem
              onClick={onSignOut}
              className="gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-400 transition-colors focus:bg-rose-500/[0.06] focus:text-rose-300"
            >
              <LogOut size={15} />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ── Main Layout ── */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { collapsed } = useSidebarStore();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<{
    first_name?: string;
    last_name?: string;
    role?: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        if (user.email === "jacob.wendling29@yahoo.com") setIsSuperAdmin(true);
        supabase
          .from("profiles")
          .select("first_name, last_name, role")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
        // Fetch unread notification count
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", user.id)
          .eq("is_read", false)
          .then(({ count }) => {
            setNotifCount(count ?? 0);
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

  const sidebarWidth = collapsed ? 64 : 256;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--tt-page-bg)" }}
    >
      {/* ── Desktop Sidebar ── */}
      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ type: "spring" as const, damping: 25, stiffness: 200 }}
        className="relative hidden shrink-0 overflow-hidden md:block"
        style={{
          backgroundColor: "var(--tt-sidebar-bg)",
          borderRight: "1px solid var(--tt-border)",
        }}
      >
        <SidebarContent
          collapsed={collapsed}
          profile={profile}
          onSignOut={handleSignOut}
          isSuperAdmin={isSuperAdmin}
        />
      </motion.aside>

      {/* ── Mobile Header Bar ── */}
      <div
        className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between px-4 md:hidden"
        style={{
          backgroundColor: "var(--tt-mobile-header-bg)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--tt-border)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex size-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--tt-text-tertiary)" }}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-1.5">
            <Clock size={16} strokeWidth={1.8} className="text-indigo-400" />
            <span
              className="font-heading text-sm font-bold"
              style={{ color: "var(--tt-text-secondary)" }}
            >
              TT
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="flex size-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--tt-text-tertiary)" }}
          >
            {mounted && (theme === "dark" ? <Sun size={15} /> : <Moon size={15} />)}
          </button>
          <NotificationBell initialCount={notifCount} />
          <UserAvatar
            firstName={profile?.first_name}
            lastName={profile?.last_name}
            size={32}
          />
        </div>
      </div>

      {/* ── Mobile Sheet Sidebar ── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[280px] p-0"
          style={{
            backgroundColor: "var(--tt-sidebar-bg)",
            borderColor: "var(--tt-border)",
          }}
        >
          <SidebarContent
            collapsed={false}
            profile={profile}
            onSignOut={handleSignOut}
            onNavClick={() => setMobileOpen(false)}
            isSuperAdmin={isSuperAdmin}
          />
        </SheetContent>
      </Sheet>

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop Header */}
        <header
          className="hidden h-14 shrink-0 items-center justify-end px-5 md:flex"
          style={{
            backgroundColor: "var(--tt-header-bg)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--tt-border-faint)",
          }}
        >
          <div className="flex items-center gap-1">
            <button
              className="flex size-8 items-center justify-center rounded-lg transition-colors duration-200"
              style={{ color: "var(--tt-text-tertiary)" }}
            >
              <Search size={15} />
            </button>

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

            <NotificationBell initialCount={notifCount} />

            <div className="ml-1">
              <UserAvatar
                firstName={profile?.first_name}
                lastName={profile?.last_name}
                size={30}
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <main
          className="flex-1 overflow-y-auto p-4 pt-[calc(3.5rem+1rem)] md:p-6 md:pt-6"
          style={{ backgroundColor: "var(--tt-page-bg)" }}
        >
          {children}
        </main>
      </div>

      <style>{`
        @keyframes badge-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes logo-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
