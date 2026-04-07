"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, eachDayOfInterval, isWeekend } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectPremium } from "@/components/ui/select-premium";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createRecurringShifts } from "./actions";

interface Employee { id: string; first_name: string | null; last_name: string | null; department_id: string | null }
interface Department { id: string; name: string; color: string }

function capitalize(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Matches JavaScript getDay(): 0=Sun..6=Sat
const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6];

export function RecurringShiftSheet({ open, onOpenChange, employees, departments, organizationId, onSuccess }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  employees: Employee[]; departments: Department[]; organizationId: string;
  onSuccess: () => void;
}) {
  const [profileId, setProfileId] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon=1..Fri=5
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [skipPTO, setSkipPTO] = useState(true);
  const [loading, setLoading] = useState(false);

  // Set default dates
  useEffect(() => {
    if (open && !fromDate) {
      const now = new Date();
      const day = now.getDay();
      const nextMon = addDays(now, day === 0 ? 1 : 8 - day);
      setFromDate(format(nextMon, "yyyy-MM-dd"));
      setToDate(format(addDays(nextMon, 27), "yyyy-MM-dd")); // 4 weeks
    }
  }, [open, fromDate]);

  useEffect(() => {
    if (profileId) {
      const emp = employees.find((e) => e.id === profileId);
      if (emp?.department_id) setDepartmentId(emp.department_id);
    }
  }, [profileId, employees]);

  function toggleDay(d: number) {
    setSelectedDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  }

  const empOptions = employees.map((e) => ({ value: e.id, label: `${capitalize(e.first_name)} ${capitalize(e.last_name)}` }));
  const deptOptions = departments.map((d) => ({ value: d.id, label: d.name }));
  const empName = employees.find((e) => e.id === profileId);
  const empLabel = empName ? `${capitalize(empName.first_name)} ${capitalize(empName.last_name)}` : "";

  // Preview count
  const previewCount = useMemo(() => {
    if (!fromDate || !toDate || selectedDays.length === 0) return 0;
    try {
      const days = eachDayOfInterval({ start: new Date(fromDate + "T12:00:00"), end: new Date(toDate + "T12:00:00") });
      return days.filter((d) => selectedDays.includes(d.getDay())).length;
    } catch { return 0; }
  }, [fromDate, toDate, selectedDays]);

  const weeks = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    try {
      return Math.ceil((new Date(toDate + "T12:00:00").getTime() - new Date(fromDate + "T12:00:00").getTime()) / (7 * 86400000));
    } catch { return 0; }
  }, [fromDate, toDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profileId || selectedDays.length === 0 || !fromDate || !toDate) {
      toast.error("Fill in all required fields");
      return;
    }
    setLoading(true);
    const r = await createRecurringShifts({
      profileId, organizationId, selectedDays, startTime, endTime, fromDate, toDate,
      departmentId: departmentId || null, notes, skipPTO,
    });
    setLoading(false);
    if (r.success) {
      const msg = r.skippedPTO ? `Created ${r.count} shifts (skipped ${r.skippedPTO} PTO days)` : `Created ${r.count} shifts`;
      toast.success(msg);
      onOpenChange(false);
      onSuccess();
    } else {
      toast.error(r.error || "Failed");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-[440px]" style={{ backgroundColor: "var(--tt-card-bg)", borderColor: "var(--tt-border)" }}>
        <SheetHeader className="border-b px-6 py-4" style={{ borderColor: "var(--tt-border-subtle)" }}>
          <SheetTitle className="font-heading text-lg font-bold" style={{ color: "var(--tt-text-primary)" }}>Set Recurring Shifts</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {/* Employee */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Employee</Label>
            <SelectPremium value={profileId} onValueChange={setProfileId} options={empOptions} placeholder="Select employee" />
          </div>

          {/* Days */}
          <div className="space-y-2">
            <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Days</Label>
            <div className="flex gap-1">
              {["Mon-Fri", "Weekends"].map((preset) => (
                <button key={preset} type="button"
                  onClick={() => setSelectedDays(preset === "Mon-Fri" ? [1, 2, 3, 4, 5] : [0, 6])}
                  className="rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
                  style={{ backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-muted)", border: "1px solid var(--tt-border-subtle)" }}>
                  {preset}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, i) => {
                const val = DAY_VALUES[i];
                const active = selectedDays.includes(val);
                return (
                  <button key={val} type="button" onClick={() => toggleDay(val)}
                    className={`flex size-9 items-center justify-center rounded-lg text-xs font-semibold transition-all ${active ? "bg-indigo-500 text-white" : ""}`}
                    style={active ? {} : { backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-muted)", border: "1px solid var(--tt-border-subtle)" }}>
                    {label.charAt(0)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Start time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>End time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>From</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>To</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          {/* Department */}
          {deptOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Department</Label>
              <SelectPremium value={departmentId} onValueChange={setDepartmentId} options={deptOptions} placeholder="Select department" />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Regular shift" />
          </div>

          {/* Skip PTO */}
          <label className="flex cursor-pointer items-center gap-3">
            <Switch checked={skipPTO} onCheckedChange={setSkipPTO} />
            <span className="text-sm" style={{ color: "var(--tt-text-secondary)" }}>Skip days with approved PTO</span>
          </label>

          {/* Preview */}
          {profileId && previewCount > 0 && (
            <div className="rounded-lg p-3" style={{ backgroundColor: "var(--tt-elevated-bg)", border: "1px solid var(--tt-border-subtle)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>
                Create {previewCount} shifts for {empLabel}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--tt-text-muted)" }}>
                {selectedDays.map((d) => DAY_LABELS[d]).join(", ")}, {startTime} – {endTime}
              </p>
              <p className="text-xs" style={{ color: "var(--tt-text-muted)" }}>
                {fromDate && format(new Date(fromDate + "T12:00:00"), "MMM d")} – {toDate && format(new Date(toDate + "T12:00:00"), "MMM d, yyyy")} ({weeks} weeks)
              </p>
            </div>
          )}

          <Button type="submit" disabled={loading || previewCount === 0} className="h-11 w-full rounded-lg bg-indigo-500 text-sm font-semibold text-white hover:bg-indigo-600">
            {loading ? <Loader2 className="size-4 animate-spin" /> : `Create ${previewCount} Shifts`}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
