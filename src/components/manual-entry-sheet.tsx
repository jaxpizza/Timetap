"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, DollarSign, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SelectPremium } from "@/components/ui/select-premium";
import { formatHours } from "@/lib/utils";

export interface ManualEntryEmployee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string;
}

export interface ManualEntryPayRate {
  profile_id: string;
  rate: number;
  type: string; // "hourly" | "salary"
}

export interface ManualEntryExisting {
  id: string;
  profile_id: string;
  clock_in: string;
  clock_out: string | null;
  total_break_minutes: number | null;
  notes: string | null;
}

export interface ManualEntryAddPayload {
  profileId: string;
  date: string;           // YYYY-MM-DD (clock-in date)
  clockInTime: string;    // HH:mm (24h)
  clockOutTime: string;   // HH:mm (24h)
  breakMinutes: number;
  notes: string;
  overnight: boolean;
}

export interface ManualEntryEditPayload {
  entryId: string;
  clockIn: string;        // ISO timestamptz
  clockOut: string;       // ISO timestamptz
  breakMinutes: number;
  notes: string;
}

function capitalize(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
const $ = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function pad(n: number) { return String(n).padStart(2, "0"); }
function toLocalDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function toLocalTimeStr(d: Date) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

/**
 * Build a Date from local date YYYY-MM-DD + local time HH:mm.
 * Uses the user's local timezone (which is what they visually entered).
 */
function combineLocal(dateStr: string, timeStr: string, dayOffset = 0): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, (d ?? 1) + dayOffset, h ?? 0, min ?? 0, 0, 0);
}

export function ManualEntrySheet({
  open,
  onOpenChange,
  mode,
  employees,
  payRates = [],
  lockedEmployeeId,
  existing,
  adderName,
  onAdd,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "add" | "edit";
  employees: ManualEntryEmployee[];
  payRates?: ManualEntryPayRate[];
  lockedEmployeeId?: string;
  existing?: ManualEntryExisting | null;
  /** Display name of the current admin/provider — for audit in notes. */
  adderName?: string;
  onAdd?: (payload: ManualEntryAddPayload) => Promise<{ success: boolean; error?: string }>;
  onEdit?: (payload: ManualEntryEditPayload) => Promise<{ success: boolean; error?: string }>;
  onDelete?: (entryId: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const defaultDate = toLocalDateStr(new Date());

  const [profileId, setProfileId] = useState<string>(lockedEmployeeId ?? "");
  const [date, setDate] = useState(defaultDate);
  const [clockInTime, setClockInTime] = useState("09:00");
  const [clockOutTime, setClockOutTime] = useState("17:00");
  const [breakMinutes, setBreakMinutes] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Hydrate when open or existing changes
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && existing) {
      const inD = new Date(existing.clock_in);
      const outD = existing.clock_out ? new Date(existing.clock_out) : null;
      setProfileId(existing.profile_id);
      setDate(toLocalDateStr(inD));
      setClockInTime(toLocalTimeStr(inD));
      setClockOutTime(outD ? toLocalTimeStr(outD) : "17:00");
      setBreakMinutes(String(existing.total_break_minutes ?? 0));
      setNotes(existing.notes ?? "");
    } else {
      setProfileId(lockedEmployeeId ?? "");
      setDate(defaultDate);
      setClockInTime("09:00");
      setClockOutTime("17:00");
      setBreakMinutes("0");
      setNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, existing?.id, lockedEmployeeId]);

  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: `${capitalize(e.first_name)} ${capitalize(e.last_name)}`.trim() || e.email || "Employee",
      })),
    [employees]
  );

  // Live calculation
  const { overnight, totalHours, validationError, estPay } = useMemo(() => {
    if (!date || !clockInTime || !clockOutTime) {
      return { overnight: false, totalHours: 0, validationError: null as string | null, estPay: 0 };
    }
    const start = combineLocal(date, clockInTime);
    let end = combineLocal(date, clockOutTime);
    let isOvernight = false;
    if (end.getTime() <= start.getTime()) {
      end = combineLocal(date, clockOutTime, 1);
      isOvernight = true;
    }
    const breakMin = Math.max(0, Number(breakMinutes) || 0);
    const shiftMinutes = (end.getTime() - start.getTime()) / 60000;
    const netMinutes = shiftMinutes - breakMin;
    const hrs = netMinutes / 60;

    let err: string | null = null;
    if (shiftMinutes <= 0) err = "Clock out must be after clock in";
    else if (shiftMinutes > 24 * 60) err = "Shift cannot be more than 24 hours";
    else if (breakMin >= shiftMinutes) err = "Break must be less than total shift duration";
    else if (hrs <= 0) err = "Total hours must be positive";

    const rate = payRates.find((r) => r.profile_id === profileId);
    const hourlyRate = rate ? (rate.type === "salary" ? Number(rate.rate) / 2080 : Number(rate.rate)) : 0;
    const pay = hrs > 0 ? hrs * hourlyRate : 0;

    return { overnight: isOvernight, totalHours: Math.max(0, hrs), validationError: err, estPay: pay };
  }, [date, clockInTime, clockOutTime, breakMinutes, profileId, payRates]);

  const isEdit = mode === "edit";
  const canSubmit = !!profileId && !!date && !!clockInTime && !!clockOutTime && !validationError && notes.trim().length > 0;

  async function handleSave() {
    if (!canSubmit) {
      if (validationError) toast.error(validationError);
      else if (!notes.trim()) toast.error("Notes are required for manual entries");
      else toast.error("Fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const finalNotes = adderName ? `[${adderName}] ${isEdit ? "edited" : "added manually"}: ${notes.trim()}` : notes.trim();

      if (isEdit && existing && onEdit) {
        const start = combineLocal(date, clockInTime);
        const end = combineLocal(date, clockOutTime, overnight ? 1 : 0);
        const res = await onEdit({
          entryId: existing.id,
          clockIn: start.toISOString(),
          clockOut: end.toISOString(),
          breakMinutes: Number(breakMinutes) || 0,
          notes: finalNotes,
        });
        if (res.success) { toast.success("Entry updated"); onOpenChange(false); }
        else toast.error(res.error || "Failed");
      } else if (!isEdit && onAdd) {
        const res = await onAdd({
          profileId,
          date,
          clockInTime,
          clockOutTime,
          breakMinutes: Number(breakMinutes) || 0,
          notes: finalNotes,
          overnight,
        });
        if (res.success) { toast.success("Entry added"); onOpenChange(false); }
        else toast.error(res.error || "Failed");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing || !onDelete) return;
    if (!confirm("Delete this time entry? This cannot be undone.")) return;
    setDeleting(true);
    const res = await onDelete(existing.id);
    setDeleting(false);
    if (res.success) { toast.success("Entry deleted"); onOpenChange(false); }
    else toast.error(res.error || "Failed");
  }

  const rate = payRates.find((r) => r.profile_id === profileId);
  const hourlyRate = rate ? (rate.type === "salary" ? Number(rate.rate) / 2080 : Number(rate.rate)) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md" style={{ backgroundColor: "var(--tt-card-bg)", borderColor: "var(--tt-border)" }}>
        <SheetHeader>
          <SheetTitle className="font-heading text-lg font-bold" style={{ color: "var(--tt-text-primary)" }}>
            {isEdit ? "Edit Time Entry" : "Add Manual Entry"}
          </SheetTitle>
          <SheetDescription className="text-sm" style={{ color: "var(--tt-text-tertiary)" }}>
            {isEdit
              ? "Adjust the clock-in/out times, break, or notes for this entry."
              : "Create a time entry on behalf of an employee. Include a reason in the notes for audit."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          {/* Employee */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>
              Employee <span className="text-rose-400">*</span>
            </label>
            {lockedEmployeeId || isEdit ? (
              <div className="flex h-11 items-center rounded-lg px-4 text-sm" style={{ backgroundColor: "var(--tt-elevated-bg)", border: "1px solid var(--tt-border-faint)", color: "var(--tt-text-secondary)" }}>
                {employeeOptions.find((o) => o.value === profileId)?.label ?? "—"}
              </div>
            ) : (
              <SelectPremium value={profileId} onValueChange={setProfileId} options={employeeOptions} placeholder="Select an employee..." />
            )}
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>
              Date <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tt-text-muted)" }} />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-9" />
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>
                Clock In <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tt-text-muted)" }} />
                <Input type="time" value={clockInTime} onChange={(e) => setClockInTime(e.target.value)} className="pl-9 font-mono" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>
                Clock Out <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tt-text-muted)" }} />
                <Input type="time" value={clockOutTime} onChange={(e) => setClockOutTime(e.target.value)} className="pl-9 font-mono" />
              </div>
            </div>
          </div>

          {/* Overnight notice */}
          {overnight && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", color: "#FBBF24" }}>
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>
                Overnight shift detected — clock out will be on {format(combineLocal(date, clockOutTime, 1), "MMM d")}.
              </span>
            </div>
          )}

          {/* Break */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Break (minutes)</label>
            <Input type="number" min="0" step="1" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>
              Notes <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={isEdit ? "Why is this being changed?" : "Why is this entry being added? (e.g., forgot to clock in)"}
              className="w-full rounded-lg px-3 py-2 text-sm resize-none"
              style={{
                backgroundColor: "var(--tt-elevated-bg)",
                border: "1px solid var(--tt-border)",
                color: "var(--tt-text-primary)",
              }}
            />
            <p className="mt-1 text-[10px]" style={{ color: "var(--tt-text-muted)" }}>
              Required for audit trail. Your name will be prefixed automatically.
            </p>
          </div>

          {/* Summary */}
          <div className="rounded-lg p-3" style={{ backgroundColor: "var(--tt-elevated-bg)", border: "1px solid var(--tt-border-faint)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>Total Hours</p>
              <p className="font-mono text-sm font-bold" style={{ color: validationError ? "#FB7185" : "var(--tt-text-primary)" }}>
                {validationError ? "—" : formatHours(totalHours)}
              </p>
            </div>
            {hourlyRate > 0 && !validationError && (
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tt-text-muted)" }}>
                  <DollarSign size={10} /> Estimated Pay
                </div>
                <p className="font-mono text-sm font-bold text-emerald-400">{$(estPay)}</p>
              </div>
            )}
            {validationError && (
              <p className="mt-1 text-[11px] text-rose-400">{validationError}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2">
          <Button
            onClick={handleSave}
            disabled={saving || !canSubmit}
            className="h-11 w-full bg-indigo-500 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : isEdit ? "Save Changes" : "Save Entry"}
          </Button>

          {isEdit && onDelete && (
            <Button
              onClick={handleDelete}
              disabled={saving || deleting}
              variant="ghost"
              className="h-10 w-full text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : (<><Trash2 size={13} /> Delete Entry</>)}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
