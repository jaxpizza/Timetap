"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, MapPin, Plus } from "lucide-react";
import { format } from "date-fns";
import { formatHours, getInitials } from "@/lib/utils";
import { DynamicLocationMapView as LocationMapView } from "@/components/dynamic-map";
import { ManualEntrySheet } from "@/components/manual-entry-sheet";
import { addManualEntry } from "@/app/admin/timesheets/actions";

interface ActiveEntry {
  id: string; profile_id: string; clock_in: string; total_break_minutes: number;
  clock_in_on_site: boolean | null; clock_in_latitude: number | null; clock_in_longitude: number | null;
  profiles: { first_name: string | null; last_name: string | null; department_id: string | null; departments: { name: string } | null } | null;
}
interface PayRate { profile_id: string; rate: number; type: string }
interface Location { id: string; name: string; latitude: number | null; longitude: number | null; radius_meters: number | null }
interface ClockIn {
  id: string; profile_id: string; clock_in: string; clock_in_latitude: number | null; clock_in_longitude: number | null; clock_in_on_site: boolean | null;
  profiles: { first_name: string | null; last_name: string | null } | null;
}
interface JobSite { id: string; name: string; latitude: number; longitude: number; radius_meters: number; expires_at: string }

function capitalize(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

const rise = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 25, stiffness: 120 } } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };

function useElapsedAll(entries: ActiveEntry[]) {
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(id); }, []);
  return entries.map((e) => Math.max(0, (Date.now() - new Date(e.clock_in).getTime()) / 1000));
}

interface EmployeeBasic { id: string; first_name: string | null; last_name: string | null; email: string }

export function TimeClockClient({ activeEntries, payRates, locations, recentClockIns, jobSites = [], employees = [], adderName = "Admin", organizationId = "" }: {
  activeEntries: ActiveEntry[]; payRates: PayRate[]; locations: Location[]; recentClockIns: ClockIn[]; jobSites?: JobSite[]; employees?: EmployeeBasic[]; adderName?: string; organizationId?: string;
}) {
  const router = useRouter();
  const elapsed = useElapsedAll(activeEntries);
  const [tab, setTab] = useState<"live" | "map">("live");
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => { const id = setInterval(() => router.refresh(), 15000); return () => clearInterval(id); }, [router]);

  const rateMap = new Map<string, number>();
  for (const pr of payRates) rateMap.set(pr.profile_id, pr.type === "salary" ? Number(pr.rate) / 2080 : Number(pr.rate));

  const permanentLocations = locations.filter((l) => l.latitude && l.longitude).map((l) => ({ lat: Number(l.latitude), lng: Number(l.longitude), name: l.name, radiusMeters: Number(l.radius_meters ?? 402) }));
  const jobSiteLocations = jobSites.map((s) => ({ lat: Number(s.latitude), lng: Number(s.longitude), name: `${s.name} (Job Site)`, radiusMeters: Number(s.radius_meters ?? 91) }));
  const workLocations = [...permanentLocations, ...jobSiteLocations];
  const clockPoints = recentClockIns.filter((c) => c.clock_in_latitude && c.clock_in_longitude).map((c) => ({
    lat: Number(c.clock_in_latitude), lng: Number(c.clock_in_longitude), onSite: c.clock_in_on_site,
    label: `${capitalize(c.profiles?.first_name)} ${capitalize(c.profiles?.last_name)} — ${format(new Date(c.clock_in), "MMM d, h:mm a")}`,
  }));

  const onSiteCount = recentClockIns.filter((c) => c.clock_in_on_site === true).length;
  const offSiteCount = recentClockIns.filter((c) => c.clock_in_on_site === false).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>Time Clock</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Live activity and location tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {activeEntries.length > 0 && (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">{activeEntries.length} active</span>
          )}
          <button onClick={() => setSheetOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-600">
            <Plus size={14} /> Manual Entry
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 rounded-lg p-0.5" style={{ backgroundColor: "var(--tt-elevated-bg)" }}>
        {(["live", "map"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium capitalize transition-all ${tab === t ? "shadow-sm" : ""}`}
            style={{ backgroundColor: tab === t ? "var(--tt-card-bg)" : "transparent", color: tab === t ? "var(--tt-text-primary)" : "var(--tt-text-muted)" }}>
            {t === "live" ? "Live Clock" : "Location History"}
          </button>
        ))}
      </div>

      {tab === "live" && (
        <>
          {activeEntries.length === 0 ? (
            <div className="mt-8 flex flex-col items-center rounded-xl py-16" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
              <Clock size={28} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} />
              <p className="mt-4 text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>No employees currently on the clock</p>
            </div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {activeEntries.map((entry, idx) => {
                const name = `${capitalize(entry.profiles?.first_name)} ${capitalize(entry.profiles?.last_name)}`.trim();
                const dept = entry.profiles?.departments?.name;
                const rate = rateMap.get(entry.profile_id) ?? 0;
                const secs = elapsed[idx] ?? 0;
                const h = Math.floor(secs / 3600); const m = Math.floor((secs % 3600) / 60); const s = Math.floor(secs % 60);
                return (
                  <motion.div key={entry.id} variants={rise} className="rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)", boxShadow: "var(--tt-card-inner-shadow)" }}>
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white ring-2 ring-emerald-400/60">{getInitials(entry.profiles?.first_name ?? undefined, entry.profiles?.last_name ?? undefined)}</div>
                        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 0 2px var(--tt-card-bg)" }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>{name}</p>
                        {dept && <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>{dept}</p>}
                      </div>
                    </div>
                    <div className="mt-3 font-mono text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>
                      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}<span style={{ color: "var(--tt-text-tertiary)" }}>:{String(s).padStart(2, "0")}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-xs" style={{ color: "var(--tt-text-muted)" }}>In: {format(new Date(entry.clock_in), "h:mm a")}</span>
                      {rate > 0 && <span className="font-mono text-xs text-emerald-400">${((secs / 3600) * rate).toFixed(2)}</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      {entry.clock_in_on_site === true && <><MapPin size={12} className="text-emerald-400" /><span className="text-[11px] text-emerald-400">On-site</span></>}
                      {entry.clock_in_on_site === false && <><MapPin size={12} className="text-rose-400" /><span className="text-[11px] text-rose-400">Off-site</span></>}
                      {entry.clock_in_on_site == null && <><MapPin size={12} style={{ color: "var(--tt-text-faint)" }} /><span className="text-[11px]" style={{ color: "var(--tt-text-faint)" }}>Location N/A</span></>}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </>
      )}

      {tab === "map" && (
        <div className="mt-4 space-y-4">
          {/* Summary */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg p-3 text-center" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
              <p className="text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>{recentClockIns.length}</p>
              <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>Total this week</p>
            </div>
            <div className="flex-1 rounded-lg p-3 text-center" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
              <p className="text-2xl font-bold text-emerald-400">{onSiteCount}</p>
              <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>On-site</p>
            </div>
            <div className="flex-1 rounded-lg p-3 text-center" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
              <p className="text-2xl font-bold text-rose-400">{offSiteCount}</p>
              <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>Off-site</p>
            </div>
          </div>

          {/* Map */}
          {clockPoints.length > 0 || workLocations.length > 0 ? (
            <LocationMapView workLocations={workLocations} clockPoints={clockPoints} height={450} />
          ) : (
            <div className="rounded-xl py-16 text-center" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
              <MapPin size={28} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} className="mx-auto" />
              <p className="mt-3 text-sm" style={{ color: "var(--tt-text-muted)" }}>No location data available this week</p>
              <p className="mt-1 text-xs" style={{ color: "var(--tt-text-faint)" }}>Enable location tracking in Settings to start recording</p>
            </div>
          )}
        </div>
      )}

      <ManualEntrySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode="add"
        employees={employees}
        payRates={payRates}
        adderName={adderName}
        onAdd={async (p) => {
          const [y, m, d] = p.date.split("-").map(Number);
          const [ih, im] = p.clockInTime.split(":").map(Number);
          const [oh, om] = p.clockOutTime.split(":").map(Number);
          const inDate = new Date(y, (m ?? 1) - 1, (d ?? 1), ih ?? 0, im ?? 0);
          const outDate = new Date(y, (m ?? 1) - 1, (d ?? 1) + (p.overnight ? 1 : 0), oh ?? 0, om ?? 0);
          const r = await addManualEntry({
            profileId: p.profileId,
            organizationId,
            clockIn: inDate.toISOString(),
            clockOut: outDate.toISOString(),
            breakMinutes: p.breakMinutes,
            notes: p.notes,
          });
          if (r.success) router.refresh();
          return { success: r.success, error: r.error };
        }}
      />
    </motion.div>
  );
}
