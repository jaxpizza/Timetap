"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Server, Database, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSystemStats, clearOldNotifications } from "../actions";

export default function SystemPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => { getSystemStats().then(setStats); }, []);

  async function handleClearNotifications() {
    setLoading("clear");
    const r = await clearOldNotifications();
    setLoading(null);
    if (r.success) { toast.success(`Cleared ${r.count ?? 0} old notifications`); getSystemStats().then(setStats); }
    else toast.error(r.error || "Failed");
  }

  const rows = stats ? [
    { label: "Organizations", value: stats.organizations },
    { label: "Profiles", value: stats.users },
    { label: "Time Entries", value: stats.timeEntries },
    { label: "Job Sites", value: stats.jobSites },
    { label: "Notifications", value: stats.notifications },
  ] : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>System</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Database stats and maintenance</p>

      {/* Stats table */}
      <div className="mt-5 rounded-xl" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
        <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--tt-border-faint)" }}>
          <Database size={14} style={{ color: "var(--tt-text-muted)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>Database Stats</p>
        </div>
        {!stats ? (
          <p className="py-8 text-center text-xs" style={{ color: "var(--tt-text-muted)" }}>Loading...</p>
        ) : (
          rows.map((r, i) => (
            <div key={r.label} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--tt-border-faint)" : undefined }}>
              <p className="text-sm" style={{ color: "var(--tt-text-secondary)" }}>{r.label}</p>
              <p className="font-mono text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{r.value.toLocaleString()}</p>
            </div>
          ))
        )}
      </div>

      {/* Maintenance */}
      <div className="mt-5 rounded-xl p-5" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
        <div className="flex items-center gap-2">
          <Server size={14} style={{ color: "var(--tt-text-muted)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>Maintenance</p>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "var(--tt-text-secondary)" }}>Clear old notifications</p>
              <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>Delete notifications older than 90 days across all orgs</p>
            </div>
            <button onClick={handleClearNotifications} disabled={loading === "clear"}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
              style={{ border: "1px solid rgba(251,113,133,0.2)" }}>
              {loading === "clear" ? <Loader2 className="size-3 animate-spin" /> : <Trash2 size={13} />} Clear
            </button>
          </div>
        </div>
      </div>

      {/* Migrations note */}
      <div className="mt-5 rounded-xl p-5" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Applied Migrations</p>
        <div className="mt-3 space-y-1">
          {["setup-database.sql", "add-invite-code-and-pending.sql", "add-geolocation.sql", "add-job-sites.sql", "add-job-sites-toggle.sql"].map((m) => (
            <p key={m} className="font-mono text-xs" style={{ color: "var(--tt-text-tertiary)" }}>✓ {m}</p>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
