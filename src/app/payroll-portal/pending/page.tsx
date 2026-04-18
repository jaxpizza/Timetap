"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Calculator, Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PayrollProviderPendingPage() {
  const [orgs, setOrgs] = useState<{ id: string; status: string; org: { name: string } | null }[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/auth/login"; return; }

      const { data } = await supabase
        .from("payroll_provider_orgs")
        .select("id, status, organizations(name)")
        .eq("provider_id", user.id);

      const mapped = (data ?? []).map((d: any) => ({ id: d.id, status: d.status, org: d.organizations }));
      setOrgs(mapped);

      // If any are active, redirect to portal
      if (mapped.some((d) => d.status === "active")) {
        window.location.href = "/payroll-portal";
      }
    }

    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  const pending = orgs.filter((o) => o.status === "pending");
  const revoked = orgs.filter((o) => o.status === "revoked");

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "var(--tt-page-bg)" }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2">
            <Clock className="size-7 text-timetap-primary-400" />
            <span className="font-heading text-3xl font-extrabold tracking-tight">
              <span style={{ color: "var(--tt-text-primary)" }}>Time</span>
              <span className="text-timetap-primary-400">Tap</span>
            </span>
          </div>
        </div>

        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border)" }}>
          <div className="mx-auto flex size-14 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
            <Calculator size={28} className="text-amber-400" />
          </div>

          <h2 className="mt-4 font-heading text-xl font-bold" style={{ color: "var(--tt-text-primary)" }}>
            Waiting for approval
          </h2>

          {pending.length > 0 ? (
            <>
              <p className="mt-2 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
                Your request to manage payroll for{" "}
                <span className="font-semibold" style={{ color: "var(--tt-text-primary)" }}>
                  {pending.map((o) => o.org?.name ?? "a company").join(", ")}
                </span>{" "}
                has been submitted.
              </p>
              <p className="mt-3 text-xs" style={{ color: "var(--tt-text-muted)" }}>
                We&apos;ll notify the organization owner. This page will refresh automatically when they approve.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 text-xs" style={{ color: "var(--tt-text-muted)" }}>
                <Loader2 className="size-3 animate-spin" /> Checking status...
              </div>
            </>
          ) : revoked.length > 0 && orgs.length === revoked.length ? (
            <>
              <p className="mt-2 text-sm text-rose-400">Your access was not approved.</p>
              <p className="mt-3 text-xs" style={{ color: "var(--tt-text-muted)" }}>
                Contact the organization to request access again, or try a different invite code.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
              No pending requests. Add a company to get started.
            </p>
          )}

          <button
            onClick={handleSignOut}
            className="mt-6 inline-flex items-center gap-2 text-xs transition-colors hover:text-rose-400"
            style={{ color: "var(--tt-text-muted)" }}
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </motion.div>
    </div>
  );
}
