"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, DollarSign, FileCheck, AlertTriangle, Calendar, Download, Play, ArrowRight, Building2 } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { formatHours, parseLocalDate } from "@/lib/utils";
import { useSelectedOrg } from "./org-context";

interface Period { id: string; startDate: string; endDate: string; status: string }
interface CompletedPeriod { id: string; startDate: string; endDate: string; totalGross: number; totalHours: number }

const rise = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 25, stiffness: 120 } } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };

const $ = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PortalDashboardClient({
  orgId, orgName, providerFirstName, openPeriod,
  periodHours, periodOvertimeHours, estimatedPayroll,
  pendingTimesheetsCount, employeeCount, recentPayPeriods,
  overtimeEmployees, overtimeThreshold,
}: {
  orgId: string;
  orgName: string;
  providerFirstName: string;
  openPeriod: Period | null;
  periodHours: number;
  periodOvertimeHours: number;
  estimatedPayroll: number;
  pendingTimesheetsCount: number;
  employeeCount: number;
  recentPayPeriods: CompletedPeriod[];
  overtimeEmployees: { name: string; hours: number }[];
  overtimeThreshold: number;
}) {
  const { setOrg } = useSelectedOrg();
  const daysRemaining = openPeriod ? differenceInDays(parseLocalDate(openPeriod.endDate), new Date()) : null;

  // Keep context in sync with URL org
  useEffect(() => { setOrg(orgId); }, [orgId, setOrg]);

  const link = (path: string) => `${path}?org=${orgId}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-indigo-400" />
            <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>{orgName}</h1>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">Payroll Dashboard</span>
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>External payroll management · {employeeCount} {employeeCount === 1 ? "employee" : "employees"}</p>
        </div>
        <Link href="/payroll-portal" className="text-xs text-amber-400 hover:text-amber-300">← All companies</Link>
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
                {daysRemaining === 0 ? "Ends today" : daysRemaining !== null && daysRemaining < 0 ? "Overdue" : `${daysRemaining} days left`}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm" style={{ color: "var(--tt-text-muted)" }}>Not configured</p>
              <Link href={link("/payroll-portal/payroll")} className="text-[10px] text-amber-400 hover:text-amber-300">Set up →</Link>
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
          {pendingTimesheetsCount > 0 && <Link href={link("/payroll-portal/timesheets")} className="text-[10px] text-amber-400 hover:text-amber-300">Review →</Link>}
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
              <ActionItem href={link("/payroll-portal/timesheets")} icon={FileCheck} label="Timesheet Approvals" count={pendingTimesheetsCount} color="#FBBF24" />
              <ActionItem href={link("/payroll-portal/payroll")} icon={AlertTriangle} label="Overtime Alerts" count={overtimeEmployees.filter((e) => e.hours >= overtimeThreshold).length} color="#FB7185" />
            </div>

            <p className="mb-2 mt-4 px-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Quick Actions</p>
            <div className="space-y-1">
              <ActionItem href={link("/payroll-portal/timesheets")} icon={FileCheck} label="Review Timesheets" color="#818CF8" />
              <ActionItem href={link("/payroll-portal/payroll")} icon={Play} label="Run Payroll" color="#34D399" />
              <ActionItem href={link("/payroll-portal/payroll")} icon={Download} label="Export Reports" color="#818CF8" />
            </div>
          </div>
        </motion.div>

        {/* Recent Payroll */}
        <motion.div variants={rise} initial="hidden" animate="show" className="rounded-xl lg:col-span-3" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--tt-border-faint)" }}>
            <p className="text-xs font-semibold tracking-wide" style={{ color: "var(--tt-text-secondary)" }}>Recent Payroll</p>
            <Link href={link("/payroll-portal/payroll")} className="text-[10px] text-amber-400 hover:text-amber-300">View all →</Link>
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

      {/* Overtime Watch */}
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
                    <p className="font-mono text-sm font-semibold" style={{ color: over ? "#FBBF24" : "var(--tt-text-primary)" }}>{formatHours(emp.hours)}</p>
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
