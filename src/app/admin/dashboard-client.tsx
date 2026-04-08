"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  Clock,
  AlertCircle,
  AlertTriangle,
  Calendar,
  UserPlus,
  DollarSign,
  BarChart3,
  FileCheck,
  CalendarCheck,
  PenSquare,
  ChevronRight,
  Wallet,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { forceClockOut } from "./timesheets/actions";
import { extendJobSite, closeJobSite } from "./job-sites/actions";
import { AddJobSiteSheet } from "@/components/add-job-site-sheet";
import { format, addDays, differenceInDays } from "date-fns";
import { useTheme } from "@/components/theme-provider";
import { formatHours, getInitials } from "@/lib/utils";

/* ── types ── */

interface ActiveEmployee {
  profileId: string;
  timeEntryId: string;
  firstName: string;
  lastName: string;
  clockIn: string;
  payRate: number;
  departmentName: string;
  breakMinutes: number;
}

interface ActivityItem {
  type: "clock_in" | "clock_out";
  name: string;
  time: string;
}

interface WeekDay {
  day: string;
  hours: number;
}

interface UpcomingShift {
  id: string;
  startTime: string;
  endTime: string;
  name: string;
}

interface JobSite {
  id: string;
  name: string;
  address: string | null;
  expires_at: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

interface Props {
  greeting: string;
  firstName: string;
  orgName: string;
  totalEmployees: number;
  activeNow: ActiveEmployee[];
  todayHours: number;
  todayLaborCost: number;
  pendingTimesheets: number;
  pendingPto: number;
  pendingEdits: number;
  nextPayPeriod: { endDate: string } | null;
  recentActivity: ActivityItem[];
  weekData: WeekDay[];
  upcomingSchedules?: UpcomingShift[];
  offSiteToday?: number;
  jobSites?: JobSite[];
  organizationId?: string;
}

/* ── helpers ── */

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const section = (delay: number) => ({
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: delay } },
});

const rise = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 25, stiffness: 120 } },
};

/* ── sub-components ── */

function AnimatedGreeting({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>
      {words.map((word, i) => (
        <motion.span key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }} className="inline-block">
          {word}{i < words.length - 1 && "\u00A0"}
        </motion.span>
      ))}
    </h1>
  );
}

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(format(new Date(), "h:mm a"));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  if (!time) return null;
  return <p className="font-mono text-sm" style={{ color: "var(--tt-text-tertiary)" }}>{time}</p>;
}

function PulsingDots() {
  return (
    <span className="ml-1 inline-flex gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span key={i} className="inline-block size-[3px] rounded-full animate-[dot-pulse_1.2s_ease-in-out_infinite]" style={{ backgroundColor: "var(--tt-text-tertiary)", animationDelay: `${i * 0.2}s` }} />
      ))}
    </span>
  );
}

function ForgottenClockOutCard({ emp, h, m, isForgotten }: { emp: ActiveEmployee; h: number; m: number; isForgotten: boolean }) {
  const router = useRouter();
  const [forcing, setForcing] = useState(false);
  async function handleForceOut() {
    setForcing(true);
    const r = await forceClockOut(emp.timeEntryId);
    setForcing(false);
    if (r.success) { toast.success(`Force clocked out ${capitalize(emp.firstName)}`); router.refresh(); }
    else toast.error(r.error || "Failed");
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <div className={`flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white ring-2 ${isForgotten ? "ring-rose-400/60" : "ring-emerald-400/60"}`}
          style={{ boxShadow: isForgotten ? "0 0 8px rgba(251,113,133,0.3)" : "0 0 8px rgba(52,211,153,0.2)" }}>
          {getInitials(emp.firstName, emp.lastName)}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ${isForgotten ? "bg-rose-400" : "bg-emerald-400"}`} style={{ boxShadow: "0 0 0 2px var(--tt-card-bg)" }} />
      </div>
      <p className="text-xs font-medium" style={{ color: "var(--tt-text-primary)" }}>{capitalize(emp.firstName)}</p>
      <p className="font-mono text-[10px]" style={{ color: isForgotten ? "#FB7185" : "var(--tt-text-muted)" }}>{h}h {m}m</p>
      {isForgotten && (
        <button onClick={handleForceOut} disabled={forcing} className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[9px] font-semibold text-rose-400 transition-colors hover:bg-rose-500/20">
          {forcing ? "..." : "Force Out"}
        </button>
      )}
      {!isForgotten && emp.departmentName && <p className="text-[9px]" style={{ color: "var(--tt-text-faint)" }}>{emp.departmentName}</p>}
    </div>
  );
}

function CardHeader({ dotColor, dotGlow, title, right }: { dotColor: string; dotGlow: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 sm:px-5" style={{ borderBottom: "1px solid var(--tt-border-faint)" }}>
      <div className="flex items-center gap-2.5">
        <span className="size-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotGlow}` }} />
        <h2 className="text-sm font-semibold tracking-wide" style={{ color: "var(--tt-text-secondary)" }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

function ActionButton({ icon: Icon, label, href }: { icon: React.ComponentType<any>; label: string; href?: string }) {
  const inner = (
    <>
      <Icon size={15} strokeWidth={1.8} className="transition-colors duration-200 group-hover:text-indigo-400" style={{ color: "var(--tt-text-muted)" }} />
      <span className="text-[13px] transition-colors duration-200 group-hover:text-[var(--tt-text-primary)]" style={{ color: "var(--tt-text-tertiary)" }}>{label}</span>
      <ChevronRight size={13} className="ml-auto transition-all duration-200 group-hover:translate-x-[3px]" style={{ color: "var(--tt-text-faint)" }} />
    </>
  );
  const cls = "group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200";
  const sty: React.CSSProperties = { backgroundColor: "var(--tt-elevated-bg)", borderLeft: "2px solid transparent", borderTop: "1px solid var(--tt-border-faint)", borderRight: "1px solid var(--tt-border-faint)", borderBottom: "1px solid var(--tt-border-faint)" };
  const handlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.backgroundColor = "var(--tt-elevated-hover-bg)"; e.currentTarget.style.borderLeftColor = "rgba(129,140,248,0.6)"; },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.backgroundColor = "var(--tt-elevated-bg)"; e.currentTarget.style.borderLeftColor = "transparent"; },
  };

  if (href) {
    return <Link href={href} className={cls} style={sty} {...handlers}>{inner}</Link>;
  }
  return <button className={cls} style={sty} {...handlers}>{inner}</button>;
}

const cardStyle = { backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)", boxShadow: "var(--tt-card-inner-shadow)" };

/* ══════════════════════
   MAIN COMPONENT
   ══════════════════════ */

export function AdminDashboardClient({
  greeting, firstName, orgName,
  totalEmployees, activeNow, todayHours, todayLaborCost,
  pendingTimesheets, pendingPto, pendingEdits, nextPayPeriod, recentActivity, weekData, upcomingSchedules = [], offSiteToday = 0,
  jobSites = [], organizationId = "",
}: Props) {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const today = format(new Date(), "EEEE, MMMM d, yyyy");
  const displayName = capitalize(firstName) || "there";
  const greetingText = `${greeting}, ${displayName}`;
  const [addJobSiteOpen, setAddJobSiteOpen] = useState(false);

  const pendingTotal = pendingTimesheets + pendingPto + pendingEdits;

  const payPeriodLabel = nextPayPeriod
    ? `in ${differenceInDays(new Date(nextPayPeriod.endDate), new Date())} days`
    : "—";
  const payPeriodSub = nextPayPeriod ? format(new Date(nextPayPeriod.endDate), "MMM d") : "not configured";

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  const stats = [
    {
      label: "Active Now",
      sub: `of ${totalEmployees} total`,
      value: String(activeNow.length),
      icon: Users,
      color: "#34D399", rgb: "52,211,153", live: activeNow.length > 0,
    },
    {
      label: "Hours Today",
      sub: `Est. $${todayLaborCost.toFixed(2)} labor`,
      subMono: true,
      value: formatHours(todayHours),
      icon: Clock,
      color: "#818CF8", rgb: "129,140,248", live: false,
    },
    {
      label: "Needs Attention",
      sub: `${pendingTimesheets} timesheets · ${pendingPto} PTO`,
      value: String(pendingTotal),
      icon: AlertCircle,
      color: "#FBBF24", rgb: "251,191,36", live: false,
    },
    {
      label: "Next Payroll",
      sub: payPeriodSub,
      value: payPeriodLabel,
      extraLink: !nextPayPeriod,
      icon: Wallet,
      color: "#FB7185", rgb: "251,113,133", live: false,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="relative">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0" style={{ backgroundImage: "linear-gradient(var(--tt-grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--tt-grid-color) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, var(--tt-glow-indigo) 0%, transparent 70%)" }} />

      <div className="relative space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <AnimatedGreeting text={greetingText} />
            {orgName && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Here&apos;s what&apos;s happening at {orgName}</motion.p>}
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm" style={{ color: "var(--tt-text-tertiary)" }}>{today}</p>
            <LiveClock />
          </div>
        </div>

        {/* Off-site alert */}
        {offSiteToday > 0 && (
          <Link href="/admin/time-clock" className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-medium transition-colors"
            style={{ backgroundColor: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", color: "#FBBF24" }}>
            <MapPin size={14} /> {offSiteToday} off-site clock-in{offSiteToday > 1 ? "s" : ""} today
            <span className="ml-auto" style={{ color: "var(--tt-text-muted)" }}>View details →</span>
          </Link>
        )}

        {/* Stats */}
        <motion.div variants={section(0.1)} initial="hidden" animate="show" className="grid grid-cols-2 gap-2 pt-1 sm:gap-3 lg:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            const rgb = s.rgb;
            const baseShadow = isDark ? `0 0 15px rgba(${rgb},0.15), inset 0 0 15px rgba(${rgb},0.05)` : `0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(${rgb},0.12)`;
            const hoverShadow = isDark ? `0 0 25px rgba(${rgb},0.25), inset 0 0 20px rgba(${rgb},0.08)` : `0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(${rgb},0.18)`;
            return (
              <motion.div key={s.label} variants={rise} whileHover={{ y: -3, scale: 1.01, boxShadow: hoverShadow, transition: { duration: 0.2 } }}
                className="group relative overflow-hidden rounded-xl p-3 sm:p-4"
                style={{ backgroundColor: "var(--tt-card-bg)", borderLeft: `2px solid ${s.color}`, boxShadow: baseShadow }}>
                <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${s.color} 0%, ${s.color}B3 50%, transparent 100%)` }} />
                <div className="absolute inset-x-0 top-0 h-10 blur-md" style={{ background: `linear-gradient(180deg, rgba(${rgb},var(--tt-stat-bloom-opacity)) 0%, transparent 100%)` }} />
                <div className={`relative flex size-9 items-center justify-center rounded-lg sm:size-10 sm:rounded-xl ${s.live ? "animate-[icon-pulse_2s_ease-in-out_infinite]" : ""}`}
                  style={{ background: `rgba(${rgb},${isDark ? 0.2 : 0.1})`, boxShadow: isDark ? `0 0 12px rgba(${rgb},0.2)` : "none" }}>
                  <Icon size={16} strokeWidth={1.8} style={{ color: s.color }} />
                </div>
                <p className="relative mt-2 font-heading text-2xl font-bold sm:mt-3 sm:text-3xl" style={{ color: "var(--tt-text-primary)" }}>{s.value}</p>
                <div className="relative mt-0.5 flex items-center gap-1.5 sm:mt-1">
                  {s.live && <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-emerald-400" /></span>}
                  <p className={`text-[11px] sm:text-[13px] ${s.subMono ? "font-mono" : ""}`} style={{ color: "var(--tt-text-tertiary)" }}>{s.sub}</p>
                </div>
                {s.extraLink && <p className="relative mt-0.5 text-[10px] text-indigo-400 sm:text-xs">Set up pay period →</p>}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Who's Working */}
        <motion.div variants={section(0.3)} initial="hidden" animate="show">
          <motion.div variants={rise} className="overflow-hidden rounded-xl" style={cardStyle}>
            <CardHeader dotColor="#34D399" dotGlow="rgba(52,211,153,0.4)" title="Who's Working Now"
              right={<span className="font-mono text-xs" style={{ color: "var(--tt-text-tertiary)" }}>{activeNow.length} active</span>} />
            <div className="flex flex-col items-center py-8 sm:py-10">
              {activeNow.length === 0 ? (
                <>
                  <div className="flex -space-x-2">
                    {[1, 0.7, 0.45, 0.25, 0.12].map((opacity, i) => (
                      <div key={i} className={`size-10 rounded-full border-2 border-dashed animate-[avatar-pulse_3s_ease-in-out_infinite] ${i >= 3 ? "hidden sm:block" : ""}`}
                        style={{ borderColor: "var(--tt-border-subtle)", opacity, animationDelay: `${i * 0.4}s` }} />
                    ))}
                  </div>
                  <p className="mt-4 text-sm" style={{ color: "var(--tt-text-muted)" }}>No employees clocked in</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--tt-text-faint)" }}>Employee avatars will appear here in real-time</p>
                </>
              ) : (
                <div className="flex flex-wrap items-start justify-center gap-4">
                  {activeNow.slice(0, 5).map((emp) => {
                    const elapsed = (Date.now() - new Date(emp.clockIn).getTime()) / 1000;
                    const h = Math.floor(elapsed / 3600);
                    const m = Math.floor((elapsed % 3600) / 60);
                    const isForgotten = elapsed > 12 * 3600;
                    return (
                      <ForgottenClockOutCard key={emp.profileId} emp={emp} h={h} m={m} isForgotten={isForgotten} />
                    );
                  })}
                  {activeNow.length > 5 && (
                    <div className="flex size-10 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-tertiary)" }}>
                      +{activeNow.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* Activity + Action Center */}
        <motion.div variants={section(0.5)} initial="hidden" animate="show" className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          {/* Live Activity */}
          <motion.div variants={rise} className="overflow-hidden rounded-xl lg:col-span-3" style={cardStyle}>
            <CardHeader dotColor="#818CF8" dotGlow="rgba(129,140,248,0.4)" title="Live Activity"
              right={<span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-tertiary)" }}>Today</span>} />
            <div className="px-4 py-4 sm:px-6">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center py-10">
                  <div className="relative ml-3 border-l pl-6" style={{ borderColor: "var(--tt-border-faint)", minHeight: 140 }}>
                    {[0.15, 0.45, 0.75].map((pos, i) => (
                      <div key={i} className="absolute left-0 flex -translate-x-1/2 items-center" style={{ top: `${pos * 100}%` }}>
                        <div className="size-2.5 rounded-full" style={{ backgroundColor: "var(--tt-elevated-bg)", border: "1px solid var(--tt-border)" }} />
                        <div className="ml-4 flex items-center gap-3">
                          <div className="h-[1px] w-12 border-t border-dashed" style={{ borderColor: "var(--tt-border-subtle)" }} />
                          <div className="flex flex-col gap-1.5">
                            <div className="h-3 w-28 rounded" style={{ backgroundColor: "var(--tt-skeleton)" }} />
                            <div className="h-2 w-16 rounded" style={{ backgroundColor: "var(--tt-skeleton-subtle)" }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 flex items-center text-xs" style={{ color: "var(--tt-text-muted)" }}>Waiting for activity<PulsingDots /></p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentActivity.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2">
                      <span className="w-14 shrink-0 text-right font-mono text-[11px]" style={{ color: "var(--tt-text-muted)" }}>
                        {format(new Date(a.time), "h:mm a")}
                      </span>
                      <span className={`size-2 shrink-0 rounded-full ${a.type === "clock_in" ? "bg-emerald-400" : "bg-rose-400"}`} />
                      <span className="text-sm" style={{ color: "var(--tt-text-secondary)" }}>
                        <span style={{ color: "var(--tt-text-primary)" }}>{a.name}</span>
                        {a.type === "clock_in" ? " clocked in" : " clocked out"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Action Center */}
          <motion.div variants={rise} className="relative overflow-hidden rounded-xl lg:col-span-2" style={cardStyle}>
            <CardHeader dotColor="#FBBF24" dotGlow="rgba(251,191,36,0.4)" title="Action Center"
              right={<span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-tertiary)" }}>{pendingTotal} pending</span>} />
            <div className="px-4 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>Needs Review</p>
            </div>
            {[
              { icon: FileCheck, label: "Timesheet Approvals", count: pendingTimesheets, href: "/admin/timesheets" },
              { icon: CalendarCheck, label: "PTO Requests", count: pendingPto, href: "/admin/pto" },
              { icon: PenSquare, label: "Edit Requests", count: pendingEdits, href: "/admin/timesheets" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} href={item.href} className="mx-2 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--tt-hover-overlay)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}>
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} strokeWidth={1.8} style={{ color: item.count > 0 ? "var(--tt-text-tertiary)" : "var(--tt-text-muted)" }} />
                    <span className="text-[13px]" style={{ color: item.count > 0 ? "var(--tt-text-primary)" : "var(--tt-text-tertiary)" }}>{item.label}</span>
                  </div>
                  {item.count > 0 ? (
                    <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-bold text-amber-400">{item.count}</span>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--tt-text-muted)" }}>0</span>
                  )}
                </Link>
              );
            })}
            <div className="px-4 pt-3"><p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>Quick Actions</p></div>
            <div className="space-y-1.5 p-2">
              <ActionButton icon={UserPlus} label="Add Employee" href="/admin/employees" />
              <ActionButton icon={Calendar} label="View Schedule" href="/admin/schedule" />
              <ActionButton icon={DollarSign} label="Run Payroll" href="/admin/payroll" />
              <ActionButton icon={BarChart3} label="View Reports" />
            </div>
            <div className="relative h-[1px] w-full overflow-hidden">
              <div className="absolute inset-0 animate-[line-shimmer_4s_linear_infinite]" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(129,140,248,0.3) 50%, transparent 100%)", width: "200%" }} />
            </div>
          </motion.div>
        </motion.div>

        {/* Job Sites */}
        <motion.div variants={section(0.7)} initial="hidden" animate="show">
          <motion.div variants={rise} className="overflow-hidden rounded-xl" style={cardStyle}>
            <div className="flex items-center justify-between px-4 py-3 sm:px-5" style={{ borderBottom: "1px solid var(--tt-border-faint)" }}>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-teal-400" />
                <h2 className="text-sm font-semibold tracking-wide" style={{ color: "var(--tt-text-secondary)" }}>Active Job Sites</h2>
                {jobSites.length > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-teal-500/15 text-[10px] font-bold text-teal-400">{jobSites.length}</span>
                )}
              </div>
              <button
                onClick={() => setAddJobSiteOpen(true)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-teal-400 transition-colors hover:bg-teal-500/10"
                style={{ border: "1px solid rgba(20,184,166,0.2)" }}
              >
                <MapPin size={12} /> Add Site
              </button>
            </div>

            {jobSites.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <MapPin size={24} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} />
                <p className="mt-3 text-sm" style={{ color: "var(--tt-text-muted)" }}>No active job sites</p>
                <p className="mt-1 text-xs" style={{ color: "var(--tt-text-faint)" }}>Add one to track on-site clock-ins for temporary locations</p>
              </div>
            ) : (
              <div>
                {jobSites.slice(0, 5).map((site, i) => (
                  <JobSiteRow key={site.id} site={site} isLast={i === Math.min(jobSites.length, 5) - 1} onRefresh={() => router.refresh()} />
                ))}
                {jobSites.length > 5 && (
                  <p className="py-2 text-center text-xs text-indigo-400">+ {jobSites.length - 5} more</p>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      <AddJobSiteSheet open={addJobSiteOpen} onOpenChange={setAddJobSiteOpen} organizationId={organizationId} />

      <style>{`
        @keyframes icon-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes dot-pulse { 0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
        @keyframes line-shimmer { 0% { transform: translateX(-50%); } 100% { transform: translateX(0%); } }
        @keyframes avatar-pulse { 0%, 100% { opacity: var(--_o, 1); } 50% { opacity: calc(var(--_o, 1) * 0.6); } }
      `}</style>
    </motion.div>
  );
}

function JobSiteRow({ site, isLast, onRefresh }: { site: JobSite; isLast: boolean; onRefresh: () => void }) {
  const [extending, setExtending] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const [closing, setClosing] = useState(false);

  const expiresIn = Math.max(0, Math.ceil((new Date(site.expires_at).getTime() - Date.now()) / 86400000));
  const isExpiringSoon = expiresIn <= 1;

  async function handleExtend(days: number) {
    setExtending(true);
    const r = await extendJobSite(site.id, days);
    setExtending(false);
    setShowExtend(false);
    if (r.success) { toast.success(`Extended by ${days} day${days > 1 ? "s" : ""}`); onRefresh(); }
    else toast.error(r.error || "Failed");
  }

  async function handleClose() {
    setClosing(true);
    const r = await closeJobSite(site.id);
    setClosing(false);
    if (r.success) { toast.success("Job site closed"); onRefresh(); }
    else toast.error(r.error || "Failed");
  }

  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: isLast ? undefined : "1px solid var(--tt-border-faint)" }}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>{site.name}</p>
        <p className="truncate text-xs" style={{ color: "var(--tt-text-muted)" }}>
          {site.address ? `${site.address} · ` : ""}
          <span style={{ color: isExpiringSoon ? "#FBBF24" : "var(--tt-text-muted)" }}>
            {expiresIn === 0 ? "Expires today" : `Expires in ${expiresIn} day${expiresIn > 1 ? "s" : ""}`}
          </span>
        </p>
      </div>
      <div className="relative flex items-center gap-1 pl-2">
        <button onClick={() => setShowExtend(!showExtend)} disabled={extending} className="rounded-md px-2 py-1 text-[11px] font-medium text-teal-400 transition-colors hover:bg-teal-500/10">
          {extending ? "..." : "Extend"}
        </button>
        <button onClick={handleClose} disabled={closing} className="rounded-md px-1.5 py-1 text-[11px] text-rose-400 transition-colors hover:bg-rose-500/10">
          {closing ? "..." : "Close"}
        </button>
        {showExtend && (
          <div className="absolute right-0 top-full z-50 mt-1 rounded-lg p-1 shadow-xl" style={{ backgroundColor: "var(--tt-dropdown-bg)", border: "1px solid var(--tt-border)" }}>
            {[1, 3, 5, 7].map((d) => (
              <button key={d} onClick={() => handleExtend(d)} className="block w-full whitespace-nowrap rounded px-3 py-1.5 text-left text-xs transition-colors hover:bg-teal-500/10" style={{ color: "var(--tt-text-secondary)" }}>
                +{d} day{d > 1 ? "s" : ""}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
