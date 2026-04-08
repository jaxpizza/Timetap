"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, Users, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { getAllOrganizations } from "../actions";

const rise = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 25, stiffness: 120 } } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };

const tierBadge: Record<string, { bg: string; text: string }> = {
  free: { bg: "rgba(113,113,122,0.15)", text: "#A1A1AA" },
  pro: { bg: "rgba(129,140,248,0.15)", text: "#818CF8" },
  enterprise: { bg: "rgba(251,191,36,0.15)", text: "#FBBF24" },
};

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllOrganizations().then((d) => { setOrgs(d); setLoading(false); });
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>Organizations</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>All TimeTap clients</p>

      <motion.div variants={container} initial="hidden" animate="show" className="mt-5 space-y-2">
        {loading && <p className="py-8 text-center text-sm" style={{ color: "var(--tt-text-muted)" }}>Loading...</p>}
        {orgs.map((org) => {
          const tier = tierBadge[org.subscriptionTier] ?? tierBadge.free;
          return (
            <motion.div key={org.id} variants={rise}>
              <Link href={`/super-admin/organizations/${org.id}`}
                className="flex items-center justify-between rounded-xl px-4 py-4 transition-colors"
                style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(129,140,248,0.1)" }}>
                    <Building2 size={18} style={{ color: "#818CF8" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{org.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ backgroundColor: tier.bg, color: tier.text }}>{org.subscriptionTier}</span>
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--tt-text-muted)" }}>
                        <Users size={10} /> {org.employeeCount} employees
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--tt-text-faint)" }}>
                        Created {format(new Date(org.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: "var(--tt-text-muted)" }} />
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
