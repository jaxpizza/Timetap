"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Lock, Play, ChevronDown, ChevronUp, Loader2, Plus, FileText, FileSpreadsheet, Receipt, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { formatHours, getInitials, parseLocalDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PayrollCalendarPicker } from "@/components/payroll-calendar-picker";
import { createPayPeriod, deletePayPeriod, lockPayPeriod, calculatePayroll, approvePayroll, exportPayrollCSV, generatePayrollReport, generatePayStubs } from "./actions";

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

export function PortalPayrollClient({ orgId, orgName, payPeriodType, overtimeThreshold, overtimeMultiplier, payPeriods }: {
  orgId: string; orgName: string; payPeriodType: string; overtimeThreshold: number; overtimeMultiplier: number; payPeriods: PayPeriod[];
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
    const r = await createPayPeriod({ organizationId: orgId, startDate, endDate });
    setLoading(null);
    if (r.success) { toast.success("Pay period created"); setCreating(false); router.refresh(); }
    else toast.error(r.error || "Failed");
  }

  async function handleDelete(id: string) {
    setLoading("delete");
    const r = await deletePayPeriod(id, orgId);
    setLoading(null);
    if (r.success) { toast.success("Pay period discarded"); setEntries(null); router.refresh(); }
    else toast.error(r.error || "Failed");
  }

  async function handleLock(id: string) {
    setLoading("lock");
    const r = await lockPayPeriod(id, orgId);
    setLoading(null);
    if (r.success) { toast.success("Period locked"); router.refresh(); }
    else toast.error(r.error || "Failed");
  }

  async function handleCalculate(period: PayPeriod) {
    setLoading("calc");
    const r = await calculatePayroll({
      payPeriodId: period.id, organizationId: orgId,
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
    const r = await approvePayroll({ payPeriodId: period.id, organizationId: orgId, entries });
    setLoading(null);
    if (r.success) { toast.success("Payroll approved!"); setEntries(null); router.refresh(); }
    else toast.error(r.error || "Failed");
  }

  function fmtDate(dateStr: string) {
    const d = parseLocalDate(dateStr);
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${String(d.getFullYear()).slice(-2)}`;
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function viewHtml(html: string) {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) window.location.href = url;
  }

  function periodFilename(period: PayPeriod, docType: string, ext: string) {
    return `TimeTap_${docType}_${fmtDate(period.start_date)}_to_${fmtDate(period.end_date)}.${ext}`;
  }

  async function handleExportCSV(period: PayPeriod) {
    setLoading("csv");
    const r = await exportPayrollCSV(period.id, orgId);
    setLoading(null);
    if (r.success && r.csv) {
      downloadBlob(new Blob([r.csv], { type: "text/csv;charset=utf-8;" }), periodFilename(period, "Payroll", "csv"));
      toast.success("CSV downloaded");
    } else toast.error(r.error || "Failed");
  }

  async function handleViewReport(period: PayPeriod) {
    setLoading("report");
    const r = await generatePayrollReport(period.id, orgId);
    setLoading(null);
    if (r.success && r.html) viewHtml(r.html);
    else toast.error(r.error || "Failed");
  }

  async function handleDownloadReport(period: PayPeriod) {
    setLoading("report-dl");
    const r = await generatePayrollReport(period.id, orgId);
    setLoading(null);
    if (r.success && r.html) {
      downloadBlob(new Blob([r.html], { type: "text/html" }), periodFilename(period, "Payroll_Report", "html"));
      toast.success("Report downloaded");
    } else toast.error(r.error || "Failed");
  }

  async function handleViewStubs(period: PayPeriod) {
    setLoading("stubs");
    const r = await generatePayStubs(period.id, orgId);
    setLoading(null);
    if (r.success && r.html) viewHtml(r.html);
    else toast.error(r.error || "Failed");
  }

  async function handleDownloadStubs(period: PayPeriod) {
    setLoading("stubs-dl");
    const r = await generatePayStubs(period.id, orgId);
    setLoading(null);
    if (r.success && r.html) {
      downloadBlob(new Blob([r.html], { type: "text/html" }), periodFilename(period, "Pay_Stubs", "html"));
      toast.success("Pay stubs downloaded");
    } else toast.error(r.error || "Failed");
  }

  const totals = entries ? {
    regHrs: entries.reduce((s, e) => s + e.regularHours, 0),
    otHrs: entries.reduce((s, e) => s + e.overtimeHours, 0),
    gross: entries.reduce((s, e) => s + e.grossPay, 0),
    tax: entries.reduce((s, e) => s + e.totalTax, 0),
    net: entries.reduce((s, e) => s + e.netPay, 0),
  } : null;

  const link = (p: string) => `${p}?org=${orgId}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>Payroll</h1>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">Provider</span>
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>{orgName} · Process payroll and export reports</p>
        </div>
        {!openPeriod && !creating && (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
            <Plus size={16} /> New Pay Period
          </button>
        )}
      </div>

      {creating && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--tt-text-primary)" }}>Select Pay Period</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--tt-text-muted)" }}>Pay period type: {payPeriodType}</p>
            </div>
            <Button variant="ghost" onClick={() => setCreating(false)} className="text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Cancel</Button>
          </div>

          <PayrollCalendarPicker
            existingPeriods={payPeriods.map((p) => ({ startDate: p.start_date, endDate: p.end_date, status: p.status }))}
            onSelect={(s, e) => { setStartDate(s); setEndDate(e); }}
            payPeriodType={payPeriodType}
          />

          <Button onClick={handleCreate} disabled={loading === "create" || !startDate || !endDate} className="h-11 w-full rounded-xl bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600">
            {loading === "create" ? <Loader2 className="size-4 animate-spin" /> : `Create Pay Period${startDate && endDate ? ` (${startDate} to ${endDate})` : ""}`}
          </Button>
        </motion.div>
      )}

      {openPeriod && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl p-5" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)", boxShadow: "var(--tt-card-inner-shadow)" }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-mono text-base font-semibold" style={{ color: "var(--tt-text-primary)" }}>
                    {format(parseLocalDate(openPeriod.start_date), "MMM d")} – {format(parseLocalDate(openPeriod.end_date), "MMM d, yyyy")}
                  </p>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: statusColors[openPeriod.status]?.bg, color: statusColors[openPeriod.status]?.text }}>
                    {statusColors[openPeriod.status]?.label}
                  </span>
                </div>
                <p className="mt-1 text-xs" style={{ color: "var(--tt-text-muted)" }}>
                  {differenceInDays(parseLocalDate(openPeriod.end_date), new Date())} days remaining
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDelete(openPeriod.id)} disabled={loading === "delete"}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
                  style={{ border: "1px solid rgba(251,113,133,0.2)" }}>
                  {loading === "delete" ? <Loader2 className="size-3 animate-spin" /> : <Trash2 size={13} />} Discard
                </button>
                {openPeriod.status === "open" && (
                  <button onClick={() => handleLock(openPeriod.id)} disabled={loading === "lock"}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                    style={{ backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-tertiary)", border: "1px solid var(--tt-border-subtle)" }}>
                    {loading === "lock" ? <Loader2 className="size-3 animate-spin" /> : <Lock size={13} />} Lock Period
                  </button>
                )}
                <button onClick={() => handleCalculate(openPeriod)} disabled={loading === "calc"}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white hover:bg-amber-600">
                  {loading === "calc" ? <Loader2 className="size-3 animate-spin" /> : <Play size={13} />} {entries ? "Recalculate" : "Calculate Payroll"}
                </button>
              </div>
            </div>
          </div>

          {entries && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {entries.length === 0 ? (
                <div className="rounded-xl py-12 text-center" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                  <DollarSign size={28} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} className="mx-auto" />
                  <p className="mt-3 text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>No approved time entries found</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs" style={{ color: "var(--tt-text-muted)" }}>
                    Approve employee timesheets first, then come back to calculate payroll.
                  </p>
                  <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                    <Link href={link("/payroll-portal/timesheets")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
                      Go to Timesheets <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-xl" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
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

                    <div className="flex items-center justify-end px-4 py-4" style={{ borderTop: "1px solid var(--tt-border-faint)" }}>
                      <button onClick={() => handleApprove(openPeriod)} disabled={loading === "approve"}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600">
                        {loading === "approve" ? <Loader2 className="size-4 animate-spin" /> : "Approve Payroll"}
                      </button>
                    </div>
                  </div>

                  <ExportSection period={openPeriod} loading={loading}
                    onCSV={() => handleExportCSV(openPeriod)}
                    onViewReport={() => handleViewReport(openPeriod)}
                    onDownloadReport={() => handleDownloadReport(openPeriod)}
                    onViewStubs={() => handleViewStubs(openPeriod)}
                    onDownloadStubs={() => handleDownloadStubs(openPeriod)} />
                </>
              )}
            </motion.div>
          )}
        </div>
      )}

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
                      {format(parseLocalDate(p.start_date), "MMM d")} – {format(parseLocalDate(p.end_date), "MMM d, yyyy")}
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
                  <div style={{ borderTop: "1px solid var(--tt-border-faint)" }}>
                    <ExportSection period={p} loading={loading} compact
                      onCSV={() => handleExportCSV(p)}
                      onViewReport={() => handleViewReport(p)}
                      onDownloadReport={() => handleDownloadReport(p)}
                      onViewStubs={() => handleViewStubs(p)}
                      onDownloadStubs={() => handleDownloadStubs(p)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {payPeriods.length === 0 && !creating && (
        <div className="mt-12 flex flex-col items-center rounded-xl py-16" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
          <DollarSign size={28} strokeWidth={1.5} style={{ color: "var(--tt-text-muted)" }} />
          <p className="mt-4 text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>No pay periods yet</p>
          <p className="mt-1 text-xs" style={{ color: "var(--tt-text-muted)" }}>Create your first pay period to start processing payroll</p>
          <button onClick={() => setCreating(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
            <Plus size={16} /> Create Pay Period
          </button>
        </div>
      )}
    </motion.div>
  );
}

function PayrollRow({ entry: e }: { entry: PayrollEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--tt-border-faint)" }}>
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

function ExportSection({ period, loading, compact, onCSV, onViewReport, onDownloadReport, onViewStubs, onDownloadStubs }: {
  period: PayPeriod; loading: string | null; compact?: boolean;
  onCSV: () => void; onViewReport: () => void; onDownloadReport: () => void; onViewStubs: () => void; onDownloadStubs: () => void;
}) {
  const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50";
  const outline = { border: "1px solid var(--tt-border-subtle)", color: "var(--tt-text-tertiary)" };
  const p = compact ? "p-3" : "p-4";

  return (
    <div className={`space-y-2 ${p}`}>
      {!compact && <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--tt-text-muted)" }}>Export Documents</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ backgroundColor: "var(--tt-elevated-bg)", border: "1px solid var(--tt-border-faint)" }}>
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={14} style={{ color: "var(--tt-text-muted)" }} />
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--tt-text-primary)" }}>CSV</p>
              {!compact && <p className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>Spreadsheet data</p>}
            </div>
          </div>
          <button onClick={onCSV} disabled={!!loading} className={btn} style={outline}>
            {loading === "csv" ? <Loader2 className="size-3 animate-spin" /> : "Download"}
          </button>
        </div>

        <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ backgroundColor: "var(--tt-elevated-bg)", border: "1px solid var(--tt-border-faint)" }}>
          <div className="flex items-center gap-2">
            <FileText size={14} style={{ color: "var(--tt-text-muted)" }} />
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--tt-text-primary)" }}>Report</p>
              {!compact && <p className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>Printable summary</p>}
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={onViewReport} disabled={!!loading} className={btn} style={outline}>
              {loading === "report" ? <Loader2 className="size-3 animate-spin" /> : "View"}
            </button>
            <button onClick={onDownloadReport} disabled={!!loading} className={btn} style={outline}>
              {loading === "report-dl" ? <Loader2 className="size-3 animate-spin" /> : "Save"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ backgroundColor: "var(--tt-elevated-bg)", border: "1px solid var(--tt-border-faint)" }}>
          <div className="flex items-center gap-2">
            <Receipt size={14} style={{ color: "var(--tt-text-muted)" }} />
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--tt-text-primary)" }}>Pay Stubs</p>
              {!compact && <p className="text-[10px]" style={{ color: "var(--tt-text-muted)" }}>Per employee</p>}
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={onViewStubs} disabled={!!loading} className={btn} style={outline}>
              {loading === "stubs" ? <Loader2 className="size-3 animate-spin" /> : "View"}
            </button>
            <button onClick={onDownloadStubs} disabled={!!loading} className={btn} style={outline}>
              {loading === "stubs-dl" ? <Loader2 className="size-3 animate-spin" /> : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
