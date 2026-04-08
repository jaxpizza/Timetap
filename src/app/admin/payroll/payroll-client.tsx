"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Lock, Play, Download, ChevronDown, ChevronUp, Loader2, Plus, FileText, FileSpreadsheet, Receipt } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, differenceInDays } from "date-fns";
import { formatHours, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPayPeriod, lockPayPeriod, calculatePayroll, approvePayroll, exportPayrollCSV, generatePayrollReport, generatePayStubs } from "./actions";

interface PayPeriod {
  id: string; start_date: string; end_date: string; status: string;
  total_hours: number | null; total_overtime_hours: number | null; total_gross_pay: number | null;
  locked_at: string | null; processed_at: string | null;
}

interface PayrollEntry {
  profileId: string; name: string; department: string;
  regularHours: number; overtimeHours: number; regularRate: number; overtimeRate: number;
  regularPay: number; overtimePay: number; grossPay: number;
  federalTax: number; stateTax: number; ssTax: number; medicareTax: number; totalTax: number; netPay: number;
}

const $ = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: "rgba(52,211,153,0.1)", text: "#34D399", label: "Open" },
  locked: { bg: "rgba(251,191,36,0.1)", text: "#FBBF24", label: "Locked" },
  processing: { bg: "rgba(129,140,248,0.1)", text: "#818CF8", label: "Processing" },
  completed: { bg: "rgba(113,113,122,0.1)", text: "#71717A", label: "Completed" },
};

const rise = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 25, stiffness: 120 } } };

export function PayrollClient({ organizationId, payPeriodType, overtimeThreshold, overtimeMultiplier, payPeriods }: {
  organizationId: string; payPeriodType: string; overtimeThreshold: number; overtimeMultiplier: number; payPeriods: PayPeriod[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [entries, setEntries] = useState<PayrollEntry[] | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const openPeriod = payPeriods.find((p) => p.status === "open" || p.status === "locked");
  const history = payPeriods.filter((p) => p.status === "completed");

  async function handleCreate() {
    if (!startDate || !endDate) { toast.error("Select dates"); return; }
    setLoading("create");
    const r = await createPayPeriod({ organizationId, startDate, endDate });
    setLoading(null);
    if (r.success) { toast.success("Pay period created"); setCreating(false); router.refresh(); }
    else toast.error(r.error || "Failed");
  }

  async function handleLock(id: string) {
    setLoading("lock");
    const r = await lockPayPeriod(id);
    setLoading(null);
    if (r.success) { toast.success("Period locked"); router.refresh(); }
    else toast.error(r.error || "Failed");
  }

  async function handleCalculate(period: PayPeriod) {
    setLoading("calc");
    const r = await calculatePayroll({
      payPeriodId: period.id, organizationId,
      startDate: period.start_date, endDate: period.end_date,
      overtimeThreshold, overtimeMultiplier, payPeriodType,
    });
    setLoading(null);
    if (r.success) setEntries(r.entries ?? []);
    else toast.error(r.error || "Failed");
  }

  async function handleApprove(period: PayPeriod) {
    if (!entries) return;
    setLoading("approve");
    const r = await approvePayroll({ payPeriodId: period.id, organizationId, entries });
    setLoading(null);
    if (r.success) { toast.success("Payroll approved!"); setEntries(null); router.refresh(); }
    else toast.error(r.error || "Failed");
  }

  async function handleExportCSV(periodId: string) {
    setLoading("csv");
    const r = await exportPayrollCSV(periodId);
    setLoading(null);
    if (r.success && r.csv) {
      const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = r.filename ?? `payroll.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } else toast.error(r.error || "Failed");
  }

  async function handlePrintReport(periodId: string) {
    setLoading("report");
    const r = await generatePayrollReport(periodId);
    setLoading(null);
    if (r.success && r.html) {
      const w = window.open("", "_blank");
      if (w) { w.document.write(r.html); w.document.close(); }
    } else toast.error(r.error || "Failed");
  }

  async function handlePrintStubs(periodId: string) {
    setLoading("stubs");
    const r = await generatePayStubs(periodId);
    setLoading(null);
    if (r.success && r.html) {
      const w = window.open("", "_blank");
      if (w) { w.document.write(r.html); w.document.close(); }
    } else toast.error(r.error || "Failed");
  }

  // Auto-calc end date based on pay period type
  function handleStartChange(v: string) {
    setStartDate(v);
    if (!v) return;
    const d = new Date(v + "T12:00:00");
    let end: Date;
    switch (payPeriodType) {
      case "weekly": end = addDays(d, 6); break;
      case "biweekly": end = addDays(d, 13); break;
      case "semimonthly": end = addDays(d, 14); break;
      case "monthly": end = addDays(d, 29); break;
      default: end = addDays(d, 13);
    }
    setEndDate(format(end, "yyyy-MM-dd"));
  }

  const totals = entries ? {
    regHrs: entries.reduce((s, e) => s + e.regularHours, 0),
    otHrs: entries.reduce((s, e) => s + e.overtimeHours, 0),
    gross: entries.reduce((s, e) => s + e.grossPay, 0),
    tax: entries.reduce((s, e) => s + e.totalTax, 0),
    net: entries.reduce((s, e) => s + e.netPay, 0),
  } : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>Payroll</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Process payroll and manage compensation</p>
        </div>
        {!openPeriod && !creating && (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600">
            <Plus size={16} /> New Pay Period
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-xl p-5"
          style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>Create Pay Period</p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--tt-text-muted)" }}>Type: {payPeriodType}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "var(--tt-text-secondary)" }}>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => handleStartChange(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "var(--tt-text-secondary)" }}>End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleCreate} disabled={loading === "create"} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600">
              {loading === "create" ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
            <Button variant="ghost" onClick={() => setCreating(false)} className="text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Cancel</Button>
          </div>
        </motion.div>
      )}

      {/* Active period */}
      {openPeriod && (
        <div className="mt-5 space-y-4">
          {/* Period header */}
          <div className="rounded-xl p-5" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)", boxShadow: "var(--tt-card-inner-shadow)" }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-mono text-base font-semibold" style={{ color: "var(--tt-text-primary)" }}>
                    {format(new Date(openPeriod.start_date + "T12:00:00"), "MMM d")} – {format(new Date(openPeriod.end_date + "T12:00:00"), "MMM d, yyyy")}
                  </p>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: statusColors[openPeriod.status]?.bg, color: statusColors[openPeriod.status]?.text }}>
                    {statusColors[openPeriod.status]?.label}
                  </span>
                </div>
                <p className="mt-1 text-xs" style={{ color: "var(--tt-text-muted)" }}>
                  {differenceInDays(new Date(openPeriod.end_date + "T12:00:00"), new Date())} days remaining
                </p>
              </div>
              <div className="flex items-center gap-2">
                {openPeriod.status === "open" && (
                  <button onClick={() => handleLock(openPeriod.id)} disabled={loading === "lock"}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                    style={{ backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-tertiary)", border: "1px solid var(--tt-border-subtle)" }}>
                    {loading === "lock" ? <Loader2 className="size-3 animate-spin" /> : <Lock size={13} />} Lock Period
                  </button>
                )}
                <button onClick={() => handleCalculate(openPeriod)} disabled={loading === "calc"}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-600">
                  {loading === "calc" ? <Loader2 className="size-3 animate-spin" /> : <Play size={13} />} {entries ? "Recalculate" : "Calculate Payroll"}
                </button>
              </div>
            </div>
          </div>

          {/* Payroll table */}
          {entries && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {entries.length === 0 ? (
                <div className="rounded-xl py-16 text-center" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                  <DollarSign size={28} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} className="mx-auto" />
                  <p className="mt-3 text-sm" style={{ color: "var(--tt-text-muted)" }}>No approved time entries found for this period</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--tt-text-faint)" }}>Approve timesheets first, then calculate payroll</p>
                </div>
              ) : (
                <div className="rounded-xl" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                  {/* Desktop header */}
                  <div className="hidden items-center gap-2 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide md:flex" style={{ borderBottom: "1px solid var(--tt-border-faint)", color: "var(--tt-text-muted)" }}>
                    <div className="w-44">Employee</div>
                    <div className="w-16 text-right">Reg Hrs</div>
                    <div className="w-16 text-right">OT Hrs</div>
                    <div className="w-20 text-right">Gross</div>
                    <div className="w-20 text-right">Tax</div>
                    <div className="w-20 text-right">Net Pay</div>
                    <div className="w-8" />
                  </div>

                  {entries.map((e) => <PayrollRow key={e.profileId} entry={e} />)}

                  {/* Totals */}
                  {totals && (
                    <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--tt-border-faint)" }}>
                      <div className="w-44 text-xs font-bold" style={{ color: "var(--tt-text-primary)" }}>TOTAL</div>
                      <div className="w-16 text-right font-mono text-xs font-bold" style={{ color: "var(--tt-text-primary)" }}>{formatHours(totals.regHrs)}</div>
                      <div className="w-16 text-right font-mono text-xs font-bold text-amber-400">{formatHours(totals.otHrs)}</div>
                      <div className="w-20 text-right font-mono text-xs font-bold text-emerald-400">{$(totals.gross)}</div>
                      <div className="w-20 text-right font-mono text-xs font-bold text-rose-400">{$(totals.tax)}</div>
                      <div className="w-20 text-right font-mono text-xs font-bold" style={{ color: "var(--tt-text-primary)" }}>{$(totals.net)}</div>
                      <div className="w-8" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4" style={{ borderTop: "1px solid var(--tt-border-faint)" }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => handleExportCSV(openPeriod.id)} disabled={loading === "csv"}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                        style={{ border: "1px solid var(--tt-border-subtle)", color: "var(--tt-text-tertiary)" }}>
                        {loading === "csv" ? <Loader2 className="size-3 animate-spin" /> : <FileSpreadsheet size={13} />} Download CSV
                      </button>
                      <button onClick={() => handlePrintReport(openPeriod.id)} disabled={loading === "report"}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                        style={{ border: "1px solid var(--tt-border-subtle)", color: "var(--tt-text-tertiary)" }}>
                        {loading === "report" ? <Loader2 className="size-3 animate-spin" /> : <FileText size={13} />} Print Report
                      </button>
                      <button onClick={() => handlePrintStubs(openPeriod.id)} disabled={loading === "stubs"}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                        style={{ border: "1px solid var(--tt-border-subtle)", color: "var(--tt-text-tertiary)" }}>
                        {loading === "stubs" ? <Loader2 className="size-3 animate-spin" /> : <Receipt size={13} />} Pay Stubs
                      </button>
                    </div>
                    <button onClick={() => handleApprove(openPeriod)} disabled={loading === "approve"}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600">
                      {loading === "approve" ? <Loader2 className="size-4 animate-spin" /> : "Approve Payroll"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>Pay Period History</p>
          <div className="mt-3 space-y-2">
            {history.map((p) => (
              <div key={p.id} className="rounded-xl" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                <button onClick={() => setExpandedHistory(expandedHistory === p.id ? null : p.id)}
                  className="flex w-full items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-sm" style={{ color: "var(--tt-text-primary)" }}>
                      {format(new Date(p.start_date + "T12:00:00"), "MMM d")} – {format(new Date(p.end_date + "T12:00:00"), "MMM d, yyyy")}
                    </p>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "rgba(113,113,122,0.1)", color: "#71717A" }}>Completed</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden text-right sm:block">
                      <p className="font-mono text-xs text-emerald-400">{$(p.total_gross_pay ?? 0)}</p>
                      <p className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{formatHours(p.total_hours ?? 0)} total</p>
                    </div>
                    {expandedHistory === p.id ? <ChevronUp size={14} style={{ color: "var(--tt-text-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--tt-text-muted)" }} />}
                  </div>
                </button>
                {expandedHistory === p.id && (
                  <div className="flex flex-wrap gap-2 px-4 pb-3" style={{ borderTop: "1px solid var(--tt-border-faint)", paddingTop: 12 }}>
                    <button onClick={() => handleExportCSV(p.id)} disabled={loading === "csv"}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                      style={{ border: "1px solid var(--tt-border-subtle)", color: "var(--tt-text-tertiary)" }}>
                      {loading === "csv" ? <Loader2 className="size-3 animate-spin" /> : <FileSpreadsheet size={13} />} Download CSV
                    </button>
                    <button onClick={() => handlePrintReport(p.id)} disabled={loading === "report"}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                      style={{ border: "1px solid var(--tt-border-subtle)", color: "var(--tt-text-tertiary)" }}>
                      {loading === "report" ? <Loader2 className="size-3 animate-spin" /> : <FileText size={13} />} Print Report
                    </button>
                    <button onClick={() => handlePrintStubs(p.id)} disabled={loading === "stubs"}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                      style={{ border: "1px solid var(--tt-border-subtle)", color: "var(--tt-text-tertiary)" }}>
                      {loading === "stubs" ? <Loader2 className="size-3 animate-spin" /> : <Receipt size={13} />} Pay Stubs
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {payPeriods.length === 0 && !creating && (
        <div className="mt-12 flex flex-col items-center rounded-xl py-16" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <DollarSign size={28} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} />
          <p className="mt-4 text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>No pay periods yet</p>
          <p className="mt-1 text-xs" style={{ color: "var(--tt-text-muted)" }}>Create your first pay period to start processing payroll</p>
          <button onClick={() => setCreating(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600">
            <Plus size={16} /> Create Pay Period
          </button>
        </div>
      )}
    </motion.div>
  );
}

/* ── Payroll Row ── */

function PayrollRow({ entry: e }: { entry: PayrollEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--tt-border-faint)" }}>
      {/* Desktop row */}
      <div className="hidden items-center gap-2 px-4 py-3 md:flex">
        <div className="flex w-44 items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">
            {getInitials(e.name.split(" ")[0], e.name.split(" ")[1])}
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--tt-text-primary)" }}>{e.name}</p>
            {e.department && <p className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{e.department}</p>}
          </div>
        </div>
        <div className="w-16 text-right font-mono text-xs" style={{ color: "var(--tt-text-primary)" }}>{formatHours(e.regularHours)}</div>
        <div className="w-16 text-right font-mono text-xs text-amber-400">{e.overtimeHours > 0 ? formatHours(e.overtimeHours) : "—"}</div>
        <div className="w-20 text-right font-mono text-xs text-emerald-400">{$(e.grossPay)}</div>
        <div className="w-20 text-right font-mono text-xs text-rose-400">{$(e.totalTax)}</div>
        <div className="w-20 text-right font-mono text-xs font-semibold" style={{ color: "var(--tt-text-primary)" }}>{$(e.netPay)}</div>
        <button onClick={() => setExpanded(!expanded)} className="flex size-6 items-center justify-center rounded" style={{ color: "var(--tt-text-muted)" }}>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Mobile card */}
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">
            {getInitials(e.name.split(" ")[0], e.name.split(" ")[1])}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>{e.name}</p>
            <p className="font-mono text-xs text-emerald-400">{$(e.netPay)} net</p>
          </div>
        </div>
        <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} style={{ color: "var(--tt-text-muted)" }} />
      </button>

      {/* Expanded tax details */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 pb-3 sm:grid-cols-4" style={{ borderTop: "1px solid var(--tt-border-faint)", paddingTop: 12 }}>
              <TaxLine label="Rate" value={`${$(e.regularRate)}/hr`} />
              <TaxLine label="Regular Pay" value={$(e.regularPay)} color="emerald" />
              <TaxLine label="OT Pay" value={$(e.overtimePay)} color="amber" />
              <TaxLine label="Gross Pay" value={$(e.grossPay)} color="emerald" />
              <TaxLine label="Federal Tax" value={$(e.federalTax)} color="rose" />
              <TaxLine label="State Tax" value={$(e.stateTax)} color="rose" />
              <TaxLine label="Social Security" value={$(e.ssTax)} color="rose" />
              <TaxLine label="Medicare" value={$(e.medicareTax)} color="rose" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaxLine({ label, value, color }: { label: string; value: string; color?: "emerald" | "amber" | "rose" }) {
  const colorMap = { emerald: "#34D399", amber: "#FBBF24", rose: "#FB7185" };
  return (
    <div>
      <p className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>{label}</p>
      <p className="font-mono text-xs font-medium" style={{ color: color ? colorMap[color] : "var(--tt-text-primary)" }}>{value}</p>
    </div>
  );
}
