"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Users, CreditCard, Server, Shield, LogOut, Sun, Moon, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme-provider";

const nav = [
  { label: "Overview", icon: LayoutDashboard, href: "/super-admin" },
  { label: "Pending Requests", icon: Inbox, href: "/super-admin/pending" },
  { label: "Organizations", icon: Building2, href: "/super-admin/organizations" },
  { label: "All Users", icon: Users, href: "/super-admin/users" },
  { label: "Subscriptions", icon: CreditCard, href: "/super-admin/subscriptions" },
  { label: "System", icon: Server, href: "/super-admin/system" },
];

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--tt-page-bg)" }}>
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col md:flex" style={{ backgroundColor: "var(--tt-sidebar-bg)", borderRight: "1px solid var(--tt-border-subtle)" }}>
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600">
            <Shield size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--tt-text-primary)" }}>TimeTap</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-rose-400">Platform Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {nav.map((item) => {
            const active = item.href === "/super-admin" ? pathname === "/super-admin" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "font-semibold" : ""}`}
                style={{
                  backgroundColor: active ? "rgba(244,63,94,0.08)" : "transparent",
                  color: active ? "#FB7185" : "var(--tt-text-tertiary)",
                  borderLeft: active ? "2px solid #FB7185" : "2px solid transparent",
                }}>
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t px-3 py-3" style={{ borderColor: "var(--tt-border-subtle)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--tt-text-primary)" }}>Jacob Wendling</p>
              <p className="text-[10px] text-rose-400">Platform Owner</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={toggleTheme} className="flex size-7 items-center justify-center rounded-md" style={{ color: "var(--tt-text-muted)" }}>
                {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <button onClick={handleSignOut} className="flex size-7 items-center justify-center rounded-md" style={{ color: "var(--tt-text-muted)" }}>
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ backgroundColor: "var(--tt-page-bg)" }}>
        {/* Mobile header */}
        <div className="mb-4 flex items-center gap-2 md:hidden">
          <Shield size={16} className="text-rose-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Platform Admin</span>
        </div>
        {children}
      </main>
    </div>
  );
}
