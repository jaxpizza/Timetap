"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, DollarSign, FileCheck, AlertTriangle, Calendar, Download, Play, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, format } from "date-fns";
import { formatHours, parseLocalDate } from "@/lib/utils";
import { clockIn, clockOut, startBreak, endBreak } from "@/app/dashboard/actions";

interface Period { id: string; startDate: string; endDate: string; status: string }
interface CompletedPeriod { id: string; startDate: string; endDate: string; totalGross: number; totalHours: number }

const rise = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 25, stiffness: 120 } } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };

function capitalize(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
const $ = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PayrollDashboardClient({
  greeting, firstName, orgName, openPeriod, periodHours, periodOvertimeHours, estimatedPayroll,
  pendingTimesheetsCount, employeeCount, recentPayPeriods, overtimeEmployees, overtimeThreshold,
  myClockEntry, myClockBreak, myHourlyRate,
}: {
  greeting: string; firstName: string; orgName: string;
  openPeriod: Period | null;
  periodHours: number; periodOvertimeHours: number; estimatedPayroll: number;
  pendingTimesheetsCount: number; employeeCount: number;
  recentPayPeriods: CompletedPeriod[];
  overtimeEmployees: { name: string; hours: number }[];
  overtimeThreshold: number;
  myClockEntry: { id: string; clock_in: string; total_break_minutes: number } | null;
  myClockBreak: { id: string; start_time: string } | null;
  myHourlyRate: number;
}) {
  const router = useRouter();
  const displayName = capitalize(firstName) || "there";
  const daysRemaining = openPeriod ? differenceInDays(parseLocalDate(openPeriod.endDate), new Date()) : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>
              {greeting}, {displayName}
            </h1>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">Payroll</span>
          </div>
          {orgName && <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>{orgName} &middot; Financial Dashboard</p>}
        </div>
      </div>

      {/* Personal Clock */}
      <div className="mt-4">
        <CompactClock entry={myClockEntry} activeBreak={myClockBreak} hourlyRate={myHourlyRate} onRefresh={() => router.refresh()} />
      </div>

      {/* Stats */}
      <motion.div variants={container} initial="hidden" animate="show" className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <motion.div variants={rise} className="rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <div className="flex items-center gap-2">
            <Calendar size={14} style={{ color: "#818CF8" }} />
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Pay Period</p>
          </div>
          {openPeriod ? (
            <>
              <p className="mt-2 font-mono text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>
                {format(parseLocalDate(openPeriod.startDate), "MMM d")} – {format(parseLocalDate(openPeriod.endDate), "MMM d")}
              </p>
              <p className="text-xs" style={{ color: daysRemaining !== null && daysRemaining < 3 ? "#FBBF24" : "var(--tt-text-muted)" }}>
                {daysRemaining === 0 ? "Ends today" : daysRemaining && daysRemaining < 0 ? "Overdue" : `${daysRemaining} days left`}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm" style={{ color: "var(--tt-text-muted)" }}>Not configured</p>
              <Link href="/admin/payroll" className="text-[10px] text-indigo-400 hover:text-indigo-300">Set up →</Link>
            </>
          )}
        </motion.div>

        <motion.div variants={rise} className="rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <div className="flex items-center gap-2">
            <Clock size={14} style={{ color: "#34D399" }} />
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Period Hours</p>
          </div>
          <p className="mt-2 font-mono text-xl font-bold" style={{ color: "var(--tt-text-primary)" }}>{formatHours(periodHours)}</p>
          {periodOvertimeHours > 0 && <p className="text-[10px] text-amber-400">{formatHours(periodOvertimeHours)} OT</p>}
        </motion.div>

        <motion.div variants={rise} className="rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <div className="flex items-center gap-2">
            <DollarSign size={14} style={{ color: "#34D399" }} />
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Est. Payroll</p>
          </div>
          <p className="mt-2 font-mono text-xl font-bold text-emerald-400">{$(estimatedPayroll)}</p>
          <p className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{employeeCount} employees</p>
        </motion.div>

        <motion.div variants={rise} className="rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: `1px solid ${pendingTimesheetsCount > 0 ? "rgba(251,191,36,0.3)" : "var(--tt-border-subtle)"}` }}>
          <div className="flex items-center gap-2">
            <FileCheck size={14} style={{ color: "#FBBF24" }} />
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Pending Timesheets</p>
          </div>
          <p className="mt-2 font-mono text-xl font-bold" style={{ color: pendingTimesheetsCount > 0 ? "#FBBF24" : "var(--tt-text-primary)" }}>{pendingTimesheetsCount}</p>
          {pendingTimesheetsCount > 0 && (
            <Link href="/admin/timesheets" className="text-[10px] text-indigo-400 hover:text-indigo-300">Review →</Link>
          )}
        </motion.div>
      </motion.div>

      {/* Content grid */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-5">
        {/* Action Center */}
        <motion.div variants={rise} initial="hidden" animate="show" className="rounded-xl lg:col-span-2" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <div className="border-b px-4 py-3" style={{ borderColor: "var(--tt-border-faint)" }}>
            <p className="text-xs font-semibold tracking-wide" style={{ color: "var(--tt-text-secondary)" }}>Action Center</p>
          </div>

          <div className="p-3">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Needs Review</p>
            <div className="space-y-1">
              <ActionItem href="/admin/timesheets" icon={FileCheck} label="Timesheet Approvals" count={pendingTimesheetsCount} color="#FBBF24" />
              <ActionItem href="/admin/payroll" icon={AlertTriangle} label="Overtime Alerts" count={overtimeEmployees.filter((e) => e.hours >= overtimeThreshold).length} color="#FB7185" />
            </div>

            <p className="mb-2 mt-4 px-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Quick Actions</p>
            <div className="space-y-1">
              <ActionItem href="/admin/timesheets" icon={FileCheck} label="Review Timesheets" color="#818CF8" />
              <ActionItem href="/admin/payroll" icon={Play} label="Run Payroll" color="#34D399" />
              <ActionItem href="/admin/payroll" icon={Download} label="Export Reports" color="#818CF8" />
            </div>
          </div>
        </motion.div>

        {/* Recent Payroll History */}
        <motion.div variants={rise} initial="hidden" animate="show" className="rounded-xl lg:col-span-3" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--tt-border-faint)" }}>
            <p className="text-xs font-semibold tracking-wide" style={{ color: "var(--tt-text-secondary)" }}>Recent Payroll</p>
            <Link href="/admin/payroll" className="text-[10px] text-indigo-400 hover:text-indigo-300">View all →</Link>
          </div>
          {recentPayPeriods.length === 0 ? (
            <p className="py-8 text-center text-xs" style={{ color: "var(--tt-text-muted)" }}>No completed pay periods yet</p>
          ) : (
            <div>
              {recentPayPeriods.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: i < recentPayPeriods.length - 1 ? "1px solid var(--tt-border-faint)" : undefined }}>
                  <div>
                    <p className="font-mono text-sm" style={{ color: "var(--tt-text-primary)" }}>
                      {format(parseLocalDate(p.startDate), "MMM d")} – {format(parseLocalDate(p.endDate), "MMM d")}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{formatHours(p.totalHours)} total</p>
                  </div>
                  <p className="font-mono text-sm font-semibold text-emerald-400">{$(p.totalGross)}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Overtime Summary */}
      {overtimeEmployees.length > 0 && (
        <motion.div variants={rise} initial="hidden" animate="show" className="mt-3 rounded-xl" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <div className="border-b px-4 py-3" style={{ borderColor: "var(--tt-border-faint)" }}>
            <p className="text-xs font-semibold tracking-wide" style={{ color: "var(--tt-text-secondary)" }}>Overtime Watch</p>
            <p className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>Employees at or near {overtimeThreshold}h this period</p>
          </div>
          <div>
            {overtimeEmployees.map((emp, i) => {
              const over = emp.hours >= overtimeThreshold;
              return (
                <div key={i} className="flex items-center justify-between px-4 py-2"
                  style={{ borderBottom: i < overtimeEmployees.length - 1 ? "1px solid var(--tt-border-faint)" : undefined }}>
                  <p className="text-sm" style={{ color: "var(--tt-text-primary)" }}>{emp.name}</p>
                  <div className="flex items-center gap-3">
                    {over && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold text-amber-400">Over</span>}
                    <p className="font-mono text-sm font-semibold" style={{ color: over ? "#FBBF24" : "var(--tt-text-primary)" }}>
                      {formatHours(emp.hours)}
                    </p>
                    <p className="w-16 text-right font-mono text-[10px]" style={{ color: "var(--tt-text-muted)" }}>
                      {over ? `+${formatHours(emp.hours - overtimeThreshold)} OT` : `${formatHours(overtimeThreshold - emp.hours)} to OT`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function ActionItem({ href, icon: Icon, label, count, color }: { href: string; icon: any; label: string; count?: number; color: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--tt-elevated-bg)]">
      <div className="flex size-7 items-center justify-center rounded-md" style={{ backgroundColor: `${color}15` }}>
        <Icon size={13} style={{ color }} />
      </div>
      <span className="flex-1 text-xs" style={{ color: "var(--tt-text-secondary)" }}>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: `${color}20`, color }}>{count}</span>
      )}
      <ArrowRight size={12} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--tt-text-muted)" }} />
    </Link>
  );
}

function CompactClock({ entry: initialEntry, activeBreak: initialBreak, hourlyRate, onRefresh }: {
  entry: { id: string; clock_in: string; total_break_minutes: number } | null;
  activeBreak: { id: string; start_time: string } | null;
  hourlyRate: number; onRefresh: () => void;
}) {
  const [entry, setEntry] = useState(initialEntry);
  const [onBreak, setOnBreak] = useState(initialBreak);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [breakElapsed, setBreakElapsed] = useState(0);

  useEffect(() => {
    if (!entry) { setElapsed(0); return; }
    const start = new Date(entry.clock_in).getTime();
    let raf = 0;
    function tick() { setElapsed(Math.max(0, (Date.now() - start) / 1000)); raf = requestAnimationFrame(tick); }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [entry]);

  useEffect(() => {
    if (!onBreak) { setBreakElapsed(0); return; }
    const start = new Date(onBreak.start_time).getTime();
    const id = setInterval(() => setBreakElapsed(Math.max(0, (Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [onBreak]);

  const netSec = Math.max(0, elapsed - (entry?.total_break_minutes ?? 0) * 60 - (onBreak ? breakElapsed : 0));
  const h = String(Math.floor(netSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((netSec % 3600) / 60)).padStart(2, "0");
  const s = String(Math.floor(netSec % 60)).padStart(2, "0");
  const earnings = hourlyRate ? (netSec / 3600) * hourlyRate : 0;

  function getGeo(): Promise<{ latitude: number | null; longitude: number | null; accuracy: number | null }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({ latitude: null, longitude: null, accuracy: null });
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => resolve({ latitude: null, longitude: null, accuracy: null }),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  async function handleClockIn() {
    setLoading(true);
    const geo = await getGeo();
    const r = await clockIn(geo);
    setLoading(false);
    if (r.success) {
      setEntry({ id: r.timeEntryId!, clock_in: new Date().toISOString(), total_break_minutes: 0 });
      toast.success("Clocked in!");
      onRefresh();
    } else toast.error(r.error || "Failed");
  }

  async function handleClockOut() {
    if (!entry) return;
    setLoading(true);
    const geo = await getGeo();
    const r = await clockOut(entry.id, geo);
    setLoading(false);
    if (r.success) {
      toast.success(`Clocked out — ${formatHours(r.totalHours ?? netSec / 3600)}`);
      setEntry(null); setOnBreak(null); onRefresh();
    } else toast.error(r.error || "Failed");
  }

  async function handleBreak() {
    if (!entry) return;
    if (onBreak) {
      const r = await endBreak(onBreak.id);
      if (r.success) {
        setEntry((prev) => prev ? { ...prev, total_break_minutes: prev.total_break_minutes + Math.round(breakElapsed / 60) } : prev);
        setOnBreak(null); toast.success("Break ended");
      }
    } else {
      const r = await startBreak(entry.id);
      if (r.success) { setOnBreak({ id: r.breakId!, start_time: new Date().toISOString() }); toast.success("Break started"); }
    }
  }

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {entry ? (
            <>
              <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" /></span>
              <span className="text-sm font-medium" style={{ color: "var(--tt-text-secondary)" }}>Clocked in</span>
              <span className="font-mono text-lg font-bold" style={{ color: "var(--tt-text-primary)" }}>{h}:{m}:{s}</span>
              {hourlyRate > 0 && <span className="font-mono text-xs text-emerald-400">${earnings.toFixed(2)}</span>}
              {onBreak && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">On break</span>}
            </>
          ) : (
            <>
              <Clock size={16} style={{ color: "var(--tt-text-muted)" }} />
              <span className="text-sm" style={{ color: "var(--tt-text-tertiary)" }}>You&apos;re not clocked in</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {entry ? (
            <>
              <button onClick={handleBreak} disabled={loading}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ backgroundColor: onBreak ? "#F59E0B" : "rgba(245,158,11,0.1)", color: onBreak ? "#fff" : "#FBBF24", border: onBreak ? "none" : "1px solid rgba(245,158,11,0.3)" }}>
                {onBreak ? "End Break" : "Break"}
              </button>
              <button onClick={handleClockOut} disabled={loading}
                className="rounded-lg bg-rose-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-rose-600">
                Clock Out
              </button>
            </>
          ) : (
            <button onClick={handleClockIn} disabled={loading}
              className="rounded-lg px-6 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_15px_rgba(52,211,153,0.3)]"
              style={{ background: "linear-gradient(135deg, #34D399, #14B8A6)" }}>
              {loading ? "..." : "Clock In"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
