"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Users, Clock, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { getSystemStats, getRecentActivity } from "./actions";

const rise = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 25, stiffness: 120 } } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

function capitalize(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

export default function SuperAdminOverview() {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);

  useEffect(() => {
    getSystemStats().then(setStats);
    getRecentActivity().then(setActivity);
  }, []);

  const statCards = stats ? [
    { label: "Organizations", value: stats.organizations, icon: Building2, color: "#818CF8" },
    { label: "Total Users", value: stats.users, icon: Users, color: "#34D399" },
    { label: "Time Entries", value: stats.timeEntries.toLocaleString(), icon: Clock, color: "#FBBF24" },
    { label: "Revenue", value: "$0/mo", icon: DollarSign, color: "#FB7185" },
  ] : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>Platform Overview</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>God-mode dashboard for all TimeTap clients</p>

      {/* Stats */}
      <motion.div variants={container} initial="hidden" animate="show" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((s) => (
          <motion.div key={s.label} variants={rise} className="rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
            <div className="flex items-center gap-2">
              <s.icon size={14} style={{ color: s.color }} />
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>{s.label}</p>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Activity */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Entries */}
        <div className="rounded-xl" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <div className="border-b px-4 py-3" style={{ borderColor: "var(--tt-border-faint)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>Recent Time Entries</p>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {activity?.recentEntries?.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--tt-border-faint)" }}>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--tt-text-primary)" }}>
                    {capitalize(e.profiles?.first_name)} {capitalize(e.profiles?.last_name)}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{e.profiles?.organizations?.name ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs" style={{ color: "var(--tt-text-tertiary)" }}>
                    {e.total_hours ? `${Number(e.total_hours).toFixed(1)}h` : "active"}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{format(new Date(e.clock_in), "MMM d, h:mm a")}</p>
                </div>
              </div>
            ))}
            {!activity && <p className="py-8 text-center text-xs" style={{ color: "var(--tt-text-muted)" }}>Loading...</p>}
          </div>
        </div>

        {/* Recent Signups */}
        <div className="rounded-xl" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <div className="border-b px-4 py-3" style={{ borderColor: "var(--tt-border-faint)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>Recent Signups (7 days)</p>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {activity?.recentSignups?.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--tt-border-faint)" }}>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--tt-text-primary)" }}>
                    {capitalize(p.first_name)} {capitalize(p.last_name)}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{p.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{p.organizations?.name ?? "No org"}</p>
                  <p className="text-[10px]" style={{ color: "var(--tt-text-faint)" }}>{format(new Date(p.created_at), "MMM d")}</p>
                </div>
              </div>
            ))}
            {!activity && <p className="py-8 text-center text-xs" style={{ color: "var(--tt-text-muted)" }}>Loading...</p>}
            {activity?.recentSignups?.length === 0 && <p className="py-8 text-center text-xs" style={{ color: "var(--tt-text-muted)" }}>No signups in the last 7 days</p>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
