"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Coffee, ChevronDown, Calendar } from "lucide-react";
import { format } from "date-fns";
import { formatHours, getInitials } from "@/lib/utils";
import { DynamicLocationMapView } from "@/components/dynamic-map";

/* ── types ── */

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  hire_date: string | null;
  filing_status: string | null;
  federal_allowances: number | null;
  state_allowances: number | null;
  departments: { name: string; color: string } | null;
}

interface PayRate { rate: number; type: string }

interface NearestLocation { name: string; distanceMeters: number; onSite: boolean }

interface Entry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  total_break_minutes: number | null;
  status: string;
  notes: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_in_on_site: boolean | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  clock_out_on_site: boolean | null;
  nearestLocation: NearestLocation | null;
  activeJobSites: WorkLocation[];
}

interface PTOBalance {
  pto_policy_id: string;
  balance_hours: number;
  used_hours: number;
  pending_hours: number;
  pto_policies: { name: string; color: string; max_balance: number | null } | null;
}

interface Schedule {
  id: string;
  start_time: string;
  end_time: string;
  departments: { name: string; color: string } | null;
}

interface WorkLocation { lat: number; lng: number; name: string; radiusMeters: number }

interface Props {
  profile: Profile;
  payRate: PayRate | null;
  hourlyRate: number;
  entries: Entry[];
  ptoBalances: PTOBalance[];
  schedules: Schedule[];
  locations: WorkLocation[];
  stats: { weekHours: number; monthHours: number; avgPerDay: number; offSiteCount: number };
}

/* ── helpers ── */

function capitalize(s?: string | null) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

const roleBadge: Record<string, { bg: string; text: string }> = {
  owner: { bg: "rgba(251,191,36,0.15)", text: "#FBBF24" },
  admin: { bg: "rgba(129,140,248,0.15)", text: "#818CF8" },
  manager: { bg: "rgba(52,211,153,0.15)", text: "#34D399" },
  employee: { bg: "rgba(113,113,122,0.15)", text: "#A1A1AA" },
};

const statusStyle: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#34D399", bg: "rgba(52,211,153,0.1)" },
  completed: { label: "Pending", color: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
  approved: { label: "Approved", color: "#34D399", bg: "rgba(52,211,153,0.1)" },
  flagged: { label: "Flagged", color: "#FB7185", bg: "rgba(251,113,133,0.1)" },
};

const rise = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 25, stiffness: 120 } } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } } };

/* ── main ── */

export function EmployeeProfileClient({ profile, payRate, hourlyRate, entries, ptoBalances, schedules, locations, stats }: Props) {
  const badge = roleBadge[profile.role] ?? roleBadge.employee;
  const fullName = `${capitalize(profile.first_name)} ${capitalize(profile.last_name)}`.trim();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin/employees" className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors" style={{ color: "var(--tt-text-tertiary)" }}>
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white" style={{ boxShadow: "0 0 16px rgba(99,102,241,0.25)" }}>
            {getInitials(profile.first_name ?? undefined, profile.last_name ?? undefined)}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>{fullName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize" style={{ backgroundColor: badge.bg, color: badge.text }}>{profile.role}</span>
              {profile.departments?.name && (
                <span className="text-xs" style={{ color: "var(--tt-text-tertiary)" }}>{profile.departments.name}</span>
              )}
              <span className="size-1 rounded-full" style={{ backgroundColor: profile.is_active ? "#34D399" : "var(--tt-text-faint)" }} />
              <span className="text-xs" style={{ color: profile.is_active ? "#34D399" : "var(--tt-text-faint)" }}>{profile.is_active ? "Active" : "Inactive"}</span>
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--tt-text-muted)" }}>{profile.email}</p>
            {profile.phone && <p className="text-sm" style={{ color: "var(--tt-text-muted)" }}>{profile.phone}</p>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <motion.div variants={container} initial="hidden" animate="show" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="This Week" value={formatHours(stats.weekHours)} />
        <StatCard label="This Month" value={formatHours(stats.monthHours)} />
        <StatCard label="Avg/Day" value={formatHours(stats.avgPerDay)} />
        <StatCard label="Off-site" value={String(stats.offSiteCount)} danger={stats.offSiteCount > 0} />
      </motion.div>

      {/* Employment Details */}
      <motion.div variants={rise} initial="hidden" animate="show" className="mt-4 rounded-xl p-5" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>Employment Details</p>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {profile.hire_date && <Detail label="Hire Date" value={format(new Date(profile.hire_date + "T12:00:00"), "MMM d, yyyy")} />}
          {payRate && (
            <Detail label="Pay Rate" value={payRate.type === "hourly" ? `$${Number(payRate.rate).toFixed(2)}/hr` : `$${Number(payRate.rate).toLocaleString()}/yr salary`} mono />
          )}
          {profile.filing_status && <Detail label="Filing Status" value={profile.filing_status.replace(/_/g, " ")} />}
        </div>
      </motion.div>

      {/* PTO Balances */}
      {ptoBalances.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>PTO Balances</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ptoBalances.map((b) => {
              const available = b.balance_hours ?? 0;
              const used = b.used_hours ?? 0;
              const max = b.pto_policies?.max_balance ?? available + used;
              const pct = max > 0 ? (used / max) * 100 : 0;
              return (
                <div key={b.pto_policy_id} className="rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: b.pto_policies?.color ?? "#818CF8" }} />
                    <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{b.pto_policies?.name}</p>
                  </div>
                  <p className="mt-2 font-mono text-lg font-bold" style={{ color: "var(--tt-text-primary)" }}>{available}h</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--tt-border-subtle)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: b.pto_policies?.color ?? "#818CF8" }} />
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "var(--tt-text-muted)" }}>{used}h used · {b.pending_hours ?? 0}h pending</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* This Week's Schedule */}
      {schedules.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>This Week&apos;s Schedule</p>
          <div className="mt-2 space-y-1.5">
            {schedules.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg px-4 py-2.5" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                <Calendar size={14} style={{ color: "var(--tt-text-muted)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>{format(new Date(s.start_time), "EEE, MMM d")}</p>
                <p className="font-mono text-sm" style={{ color: "var(--tt-text-secondary)" }}>
                  {format(new Date(s.start_time), "h:mm a")} – {format(new Date(s.end_time), "h:mm a")}
                </p>
                {s.departments?.name && (
                  <span className="ml-auto text-xs" style={{ color: s.departments.color }}>{s.departments.name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shift History */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>Shift History</p>
          <p className="text-xs" style={{ color: "var(--tt-text-faint)" }}>Last 30 days</p>
        </div>
        {entries.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-xl py-12" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
            <Clock size={24} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} />
            <p className="mt-3 text-sm" style={{ color: "var(--tt-text-muted)" }}>No time entries in the last 30 days</p>
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="mt-3 space-y-2">
            {entries.map((entry) => (
              <ShiftHistoryCard key={entry.id} entry={entry} hourlyRate={hourlyRate} locations={locations} />
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ── sub-components ── */

function StatCard({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <motion.div variants={rise} className="rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold ${danger ? "text-rose-400" : ""}`} style={danger ? {} : { color: "var(--tt-text-primary)" }}>{value}</p>
    </motion.div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>{label}</p>
      <p className={`mt-0.5 text-sm ${mono ? "font-mono" : ""}`} style={{ color: "var(--tt-text-primary)" }}>{value}</p>
    </div>
  );
}

function ShiftHistoryCard({ entry, hourlyRate, locations }: { entry: Entry; hourlyRate: number; locations: WorkLocation[] }) {
  const [expanded, setExpanded] = useState(false);
  const hours = entry.total_hours ?? 0;
  const breakMin = entry.total_break_minutes ?? 0;
  const st = statusStyle[entry.status] ?? statusStyle.completed;
  const clockIn = new Date(entry.clock_in);
  const loc = entry.nearestLocation;
  const distMiles = loc ? (loc.distanceMeters / 1609.34).toFixed(1) : null;

  const hasGeo = entry.clock_in_latitude != null && entry.clock_in_longitude != null;

  const clockPoints: { lat: number; lng: number; onSite: boolean | null; label: string }[] = [];
  if (entry.clock_in_latitude && entry.clock_in_longitude) {
    clockPoints.push({ lat: entry.clock_in_latitude, lng: entry.clock_in_longitude, onSite: entry.clock_in_on_site, label: "Clock In" });
  }
  if (entry.clock_out_latitude && entry.clock_out_longitude) {
    clockPoints.push({ lat: entry.clock_out_latitude, lng: entry.clock_out_longitude, onSite: entry.clock_out_on_site, label: "Clock Out" });
  }

  return (
    <motion.div variants={rise} className="overflow-hidden rounded-xl" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-3 px-4 py-3 text-left sm:gap-4">
        <div className="w-24 shrink-0">
          <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{format(clockIn, "EEE, MMM d")}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm" style={{ color: "var(--tt-text-secondary)" }}>
            {format(clockIn, "h:mm a")} → {entry.clock_out ? format(new Date(entry.clock_out), "h:mm a") : "In progress"}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs" style={{ color: "var(--tt-text-primary)" }}>{formatHours(hours)}</span>
            {breakMin > 0 && <span className="text-[11px]" style={{ color: "var(--tt-text-muted)" }}><Coffee size={10} className="mr-0.5 inline" />{breakMin}m break</span>}
            {hourlyRate > 0 && <span className="font-mono text-[11px] text-emerald-400">${(hours * hourlyRate).toFixed(2)}</span>}
          </div>
          {/* Location text */}
          {loc && (
            <p className="mt-1 flex items-center gap-1 text-xs">
              <MapPin size={11} style={{ color: loc.onSite ? "#34D399" : "#FB7185" }} />
              <span style={{ color: loc.onSite ? "#34D399" : "#FB7185" }}>
                {loc.onSite ? `On-site at ${loc.name}` : `Off-site — ${distMiles} mi from ${loc.name}`}
              </span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
          {hasGeo && <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} style={{ color: "var(--tt-text-muted)" }} />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && hasGeo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--tt-border-faint)" }}>
              <div className="mt-3 overflow-hidden rounded-xl">
                <DynamicLocationMapView
                  workLocations={locations}
                  jobSites={entry.activeJobSites}
                  clockPoints={clockPoints}
                  height={220}
                />
              </div>
              {!hasGeo && <p className="mt-2 text-center text-xs" style={{ color: "var(--tt-text-muted)" }}>Location not recorded</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {entry.status === "flagged" && entry.notes && (
        <div className="mx-4 mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
          <p className="text-xs text-amber-400">Flagged: {entry.notes}</p>
        </div>
      )}
    </motion.div>
  );
}
