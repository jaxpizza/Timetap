"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Calculator, Building2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PayrollPortalPage() {
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/auth/login"; return; }

      const { data } = await supabase
        .from("payroll_provider_orgs")
        .select("organization_id, organizations(id, name)")
        .eq("provider_id", user.id)
        .eq("status", "active");

      const mapped = (data ?? []).map((d: any) => ({ id: d.organizations?.id, name: d.organizations?.name ?? "" })).filter((o) => o.id);
      setOrgs(mapped);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <div className="min-h-screen px-4 py-12" style={{ backgroundColor: "var(--tt-page-bg)" }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-3xl"
      >
        <div className="mb-8 flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <Clock className="size-7 text-timetap-primary-400" />
            <span className="font-heading text-2xl font-extrabold tracking-tight">
              <span style={{ color: "var(--tt-text-primary)" }}>Time</span>
              <span className="text-timetap-primary-400">Tap</span>
            </span>
            <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">Payroll Provider</span>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-1 text-xs transition-colors hover:text-rose-400" style={{ color: "var(--tt-text-muted)" }}>
            <LogOut size={12} /> Sign out
          </button>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
            <Calculator size={24} className="text-amber-400" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>Payroll Portal</h1>
            <p className="text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Manage payroll across your client companies</p>
          </div>
        </div>

        {loading && <p className="text-center text-sm" style={{ color: "var(--tt-text-muted)" }}>Loading...</p>}

        {!loading && orgs.length === 0 && (
          <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
            <Building2 size={32} strokeWidth={1.5} className="mx-auto" style={{ color: "var(--tt-text-muted)" }} />
            <p className="mt-3 text-sm" style={{ color: "var(--tt-text-muted)" }}>No active companies yet</p>
          </div>
        )}

        {!loading && orgs.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {orgs.map((org) => (
              <div key={org.id} className="rounded-xl p-5" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(129,140,248,0.1)" }}>
                    <Building2 size={18} style={{ color: "#818CF8" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{org.name}</p>
                    <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>Active client</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
