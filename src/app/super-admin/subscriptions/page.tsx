"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Users } from "lucide-react";
import { toast } from "sonner";
import { getAllOrganizations, superUpdateOrganization } from "../actions";

const tierLimits: Record<string, number> = { free: 10, pro: 50, enterprise: 9999 };
const tierBadge: Record<string, { bg: string; text: string }> = {
  free: { bg: "rgba(113,113,122,0.15)", text: "#A1A1AA" },
  pro: { bg: "rgba(129,140,248,0.15)", text: "#818CF8" },
  enterprise: { bg: "rgba(251,191,36,0.15)", text: "#FBBF24" },
};

export default function SubscriptionsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllOrganizations().then((d) => { setOrgs(d); setLoading(false); });
  }, []);

  const counts = { free: 0, pro: 0, enterprise: 0 };
  orgs.forEach((o) => { counts[o.subscriptionTier as keyof typeof counts] = (counts[o.subscriptionTier as keyof typeof counts] ?? 0) + 1; });

  async function handleTierChange(orgId: string, newTier: string) {
    setOrgs((prev) => prev.map((o) => o.id === orgId ? { ...o, subscriptionTier: newTier } : o));
    const r = await superUpdateOrganization(orgId, { subscription_tier: newTier });
    r.success ? toast.success("Updated") : toast.error(r.error || "Failed");
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>Subscriptions</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Manage organization tiers</p>

      {/* Summary */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {(["free", "pro", "enterprise"] as const).map((t) => (
          <div key={t} className="rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider capitalize" style={{ color: "var(--tt-text-muted)" }}>{t}</p>
            <p className="mt-1 font-mono text-2xl font-bold" style={{ color: tierBadge[t].text }}>{counts[t]}</p>
            <p className="text-[10px]" style={{ color: "var(--tt-text-faint)" }}>Limit: {tierLimits[t] === 9999 ? "Unlimited" : tierLimits[t]} employees</p>
          </div>
        ))}
      </div>

      {/* Org list */}
      <div className="mt-6 space-y-2">
        {loading && <p className="py-8 text-center text-sm" style={{ color: "var(--tt-text-muted)" }}>Loading...</p>}
        {orgs.map((org) => {
          const overLimit = org.employeeCount > tierLimits[org.subscriptionTier];
          return (
            <div key={org.id} className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ backgroundColor: "var(--tt-card-bg)", border: `1px solid ${overLimit ? "rgba(251,191,36,0.3)" : "var(--tt-border-subtle)"}` }}>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>{org.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: overLimit ? "#FBBF24" : "var(--tt-text-muted)" }}>
                    <Users size={10} /> {org.employeeCount}/{tierLimits[org.subscriptionTier] === 9999 ? "∞" : tierLimits[org.subscriptionTier]}
                  </span>
                  {overLimit && <span className="text-[10px] font-semibold text-amber-400">Over limit</span>}
                </div>
              </div>
              <select value={org.subscriptionTier} onChange={(e) => handleTierChange(org.id, e.target.value)}
                className="rounded-lg border px-3 py-1.5 text-xs capitalize"
                style={{ backgroundColor: "var(--tt-elevated-bg)", borderColor: "var(--tt-border)", color: "var(--tt-text-primary)" }}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
