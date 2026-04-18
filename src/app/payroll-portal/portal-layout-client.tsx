"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  Clock,
  Calculator,
  Plus,
  LogOut,
  Menu,
  Sun,
  Moon,
  Bell,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme-provider";
import { getInitials } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrgProvider, PortalOrg, useSelectedOrg } from "./org-context";
import { AddCompanySheet } from "./add-company-sheet";

function capitalize(s?: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

interface NavItem {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string }>;
  href: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/payroll-portal" },
  { label: "Employees", icon: Users, href: "/payroll-portal/employees" },
  { label: "Timesheets", icon: FileText, href: "/payroll-portal/timesheets" },
  { label: "Payroll", icon: DollarSign, href: "/payroll-portal/payroll" },
];

export function PortalLayoutClient({
  orgs,
  profile,
  children,
}: {
  orgs: PortalOrg[];
  profile: { firstName: string; lastName: string };
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const urlOrg = searchParams.get("org");
  const initialOrgId = urlOrg && orgs.some((o) => o.id === urlOrg) ? urlOrg : null;

  return (
    <OrgProvider orgs={orgs} initialOrgId={initialOrgId}>
      <LayoutInner profile={profile}>{children}</LayoutInner>
    </OrgProvider>
  );
}

function LayoutInner({ profile, children }: { profile: { firstName: string; lastName: string }; children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { orgs, selectedOrgId, selectedOrg, setOrg } = useSelectedOrg();

  useEffect(() => { setMounted(true); }, []);

  // Keep URL in sync when context changes (without navigating between pages)
  useEffect(() => {
    if (!selectedOrgId) return;
    const urlOrg = searchParams.get("org");
    if (urlOrg !== selectedOrgId) {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("org", selectedOrgId);
      router.replace(`${pathname}?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgId]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  function hrefWithOrg(href: string) {
    if (!selectedOrgId) return href;
    return `${href}?org=${selectedOrgId}`;
  }

  function handleOrgChange(id: string) {
    setOrg(id);
    const params = new URLSearchParams();
    params.set("org", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--tt-page-bg)" }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden w-64 shrink-0 overflow-hidden md:block"
        style={{ backgroundColor: "var(--tt-sidebar-bg)", borderRight: "1px solid var(--tt-border)" }}
      >
        <SidebarContent
          orgs={orgs}
          selectedOrgId={selectedOrgId}
          onOrgChange={handleOrgChange}
          profile={profile}
          pathname={pathname}
          hrefWithOrg={hrefWithOrg}
          onSignOut={handleSignOut}
          onAddCompany={() => setAddOpen(true)}
        />
      </aside>

      {/* Mobile Header */}
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
          <button onClick={() => setMobileOpen(true)} className="flex size-8 items-center justify-center rounded-lg" style={{ color: "var(--tt-text-tertiary)" }}>
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-1.5">
            <Calculator size={16} className="text-amber-400" />
            <span className="font-heading text-sm font-bold" style={{ color: "var(--tt-text-secondary)" }}>Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={toggleTheme} className="flex size-8 items-center justify-center rounded-lg" style={{ color: "var(--tt-text-tertiary)" }}>
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <UserAvatar firstName={profile.firstName} lastName={profile.lastName} size={32} />
        </div>
      </div>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[280px] p-0"
          style={{ backgroundColor: "var(--tt-sidebar-bg)", borderColor: "var(--tt-border)" }}
        >
          <SidebarContent
            orgs={orgs}
            selectedOrgId={selectedOrgId}
            onOrgChange={(id) => { handleOrgChange(id); setMobileOpen(false); }}
            profile={profile}
            pathname={pathname}
            hrefWithOrg={hrefWithOrg}
            onSignOut={handleSignOut}
            onAddCompany={() => { setAddOpen(true); setMobileOpen(false); }}
            onNavClick={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
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
          <div className="flex items-center gap-2">
            {selectedOrg && (
              <>
                <span className="text-xs" style={{ color: "var(--tt-text-muted)" }}>Managing payroll for</span>
                <span className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{selectedOrg.name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="flex size-8 items-center justify-center rounded-lg" style={{ color: "var(--tt-text-tertiary)" }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={theme} initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.2 }} className="inline-flex">
                  {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                </motion.span>
              </AnimatePresence>
            </button>
            <button className="relative flex size-8 items-center justify-center rounded-lg" style={{ color: "var(--tt-text-tertiary)" }}>
              <Bell size={15} />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-amber-400" />
            </button>
            <UserAvatar firstName={profile.firstName} lastName={profile.lastName} size={30} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pt-[calc(3.5rem+1rem)] md:p-6 md:pt-6" style={{ backgroundColor: "var(--tt-page-bg)" }}>
          {children}
        </main>
      </div>

      <AddCompanySheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function SidebarContent({
  orgs,
  selectedOrgId,
  onOrgChange,
  profile,
  pathname,
  hrefWithOrg,
  onSignOut,
  onAddCompany,
  onNavClick,
}: {
  orgs: PortalOrg[];
  selectedOrgId: string | null;
  onOrgChange: (id: string) => void;
  profile: { firstName: string; lastName: string };
  pathname: string;
  hrefWithOrg: (href: string) => string;
  onSignOut: () => void;
  onAddCompany: () => void;
  onNavClick?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo + badge */}
      <div className="px-5 py-6" style={{ backgroundColor: "var(--tt-sidebar-logo-bg)", borderBottom: "1px solid var(--tt-border-subtle)" }}>
        <div className="flex items-center gap-2">
          <Clock size={20} strokeWidth={1.8} className="animate-[logo-spin_30s_linear_infinite] text-amber-400" />
          <span className="font-heading text-lg font-bold tracking-tight">
            <span style={{ color: "var(--tt-text-primary)" }}>Time</span>
            <span className="text-amber-400">Tap</span>
          </span>
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
          <Calculator size={10} />
          Payroll Portal
        </div>
      </div>

      {/* Org switcher */}
      {orgs.length > 0 && (
        <div className="px-3 pt-4">
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>Company</p>
          <Select value={selectedOrgId ?? ""} onValueChange={(v) => v && onOrgChange(v)}>
            <SelectTrigger
              className="h-10 w-full rounded-lg px-3 text-sm"
              style={{ backgroundColor: "var(--tt-elevated-bg)", borderColor: "var(--tt-border)", color: "var(--tt-text-primary)" }}
            >
              <SelectValue placeholder="Select company">
                {orgs.find((o) => o.id === selectedOrgId)?.name ?? "Select company"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              className="rounded-lg"
              style={{ backgroundColor: "var(--tt-dropdown-bg)", borderColor: "var(--tt-border)" }}
            >
              {orgs.map((o) => (
                <SelectItem key={o.id} value={o.id} className="rounded-md px-3 py-2 text-sm" style={{ color: "var(--tt-text-secondary)" }}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/payroll-portal" ? pathname === "/payroll-portal" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={hrefWithOrg(item.href)}
                onClick={onNavClick}
                className={`relative mx-2 flex items-center gap-3 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                  active ? "font-semibold text-amber-300" : "text-[var(--tt-text-tertiary)] hover:text-[var(--tt-text-secondary)]"
                }`}
                style={active ? { background: "linear-gradient(90deg, rgba(245,158,11,0.12) 0%, transparent 100%)" } : undefined}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "var(--tt-hover-overlay)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = ""; }}
              >
                {active && <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-amber-400" style={{ boxShadow: "0 0 8px rgba(245,158,11,0.5)" }} />}
                <Icon size={18} strokeWidth={1.8} className={`shrink-0 ${active ? "text-amber-400" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Add Company */}
        <div className="mt-6 px-3">
          <button
            onClick={onAddCompany}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs font-medium transition-colors"
            style={{ borderColor: "rgba(245,158,11,0.4)", color: "#FBBF24", backgroundColor: "rgba(245,158,11,0.04)" }}
          >
            <Plus size={13} />
            Add Company
          </button>
        </div>
      </nav>

      {/* User */}
      <div className="border-t px-3 py-3" style={{ borderColor: "var(--tt-border-subtle)" }}>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[var(--tt-hover-overlay-strong)]">
            <UserAvatar firstName={profile.firstName} lastName={profile.lastName} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>
                {capitalize(profile.firstName)} {capitalize(profile.lastName)}
              </p>
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-amber-400">Payroll Provider</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52 rounded-xl p-1 shadow-2xl" style={{ backgroundColor: "var(--tt-dropdown-bg)", borderColor: "var(--tt-border)" }}>
            <DropdownMenuItem className="gap-2.5 rounded-lg px-3 py-2 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator style={{ backgroundColor: "var(--tt-border-subtle)" }} />
            <DropdownMenuItem onClick={onSignOut} className="gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-400 focus:bg-rose-500/[0.06] focus:text-rose-300">
              <LogOut size={15} /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <style>{`@keyframes logo-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function UserAvatar({ firstName, lastName, size = 38 }: { firstName?: string; lastName?: string; size?: number }) {
  const initials = getInitials(firstName, lastName);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 font-bold text-white"
      style={{ width: size, height: size, fontSize: size < 34 ? 11 : 13, boxShadow: "0 0 12px rgba(245,158,11,0.25)" }}
    >
      {initials}
    </div>
  );
}
