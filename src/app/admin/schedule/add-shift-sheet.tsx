"use client";

import { useState, useEffect } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectPremium } from "@/components/ui/select-premium";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createShift, updateShift, deleteShift } from "./actions";

interface Employee { id: string; first_name: string | null; last_name: string | null; department_id: string | null }
interface Department { id: string; name: string; color: string }
interface ShiftData { id: string; profile_id: string; start_time: string; end_time: string; department_id: string | null; notes: string | null }

function capitalize(s?: string | null) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

export function AddShiftSheet({ open, onOpenChange, employees, departments, organizationId, prefillDate, prefillEmployee, editShift, onSuccess }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  employees: Employee[]; departments: Department[]; organizationId: string;
  prefillDate?: string; prefillEmployee?: string; editShift?: ShiftData | null;
  onSuccess: () => void;
}) {
  const isEdit = !!editShift;
  const [profileId, setProfileId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [departmentId, setDepartmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (editShift) {
      setProfileId(editShift.profile_id);
      setDate(format(new Date(editShift.start_time), "yyyy-MM-dd"));
      setStartTime(format(new Date(editShift.start_time), "HH:mm"));
      setEndTime(format(new Date(editShift.end_time), "HH:mm"));
      setDepartmentId(editShift.department_id ?? "");
      setNotes(editShift.notes ?? "");
    } else {
      setProfileId(prefillEmployee ?? "");
      setDate(prefillDate ?? format(new Date(), "yyyy-MM-dd"));
      setStartTime("09:00");
      setEndTime("17:00");
      setDepartmentId("");
      setNotes("");
    }
  }, [editShift, prefillDate, prefillEmployee, open]);

  // Auto-set department when employee changes
  useEffect(() => {
    if (!isEdit && profileId) {
      const emp = employees.find((e) => e.id === profileId);
      if (emp?.department_id) setDepartmentId(emp.department_id);
    }
  }, [profileId, employees, isEdit]);

  const empOptions = employees.map((e) => ({ value: e.id, label: `${capitalize(e.first_name)} ${capitalize(e.last_name)}` }));
  const deptOptions = departments.map((d) => ({ value: d.id, label: d.name }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profileId || !date || !startTime || !endTime) { toast.error("Fill in required fields"); return; }
    setLoading(true);

    const result = isEdit
      ? await updateShift(editShift!.id, { profileId, date, startTime, endTime, departmentId: departmentId || null, notes })
      : await createShift({ organizationId, profileId, date, startTime, endTime, departmentId: departmentId || null, locationId: null, notes });

    setLoading(false);
    if (result.success) {
      toast.success(isEdit ? "Shift updated" : "Shift added");
      onOpenChange(false);
      onSuccess();
    } else {
      toast.error(result.error || "Failed");
    }
  }

  async function handleDelete() {
    if (!editShift) return;
    setDeleting(true);
    const r = await deleteShift(editShift.id);
    setDeleting(false);
    if (r.success) { toast.success("Shift deleted"); onOpenChange(false); onSuccess(); }
    else toast.error(r.error || "Failed");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-[420px]" style={{ backgroundColor: "var(--tt-card-bg)", borderColor: "var(--tt-border)" }}>
        <SheetHeader className="border-b px-6 py-4" style={{ borderColor: "var(--tt-border-subtle)" }}>
          <SheetTitle className="font-heading text-lg font-bold" style={{ color: "var(--tt-text-primary)" }}>{isEdit ? "Edit Shift" : "Add Shift"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Employee</Label>
            <SelectPremium value={profileId} onValueChange={setProfileId} options={empOptions} placeholder="Select employee" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
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
          {deptOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Department</Label>
              <SelectPremium value={departmentId} onValueChange={setDepartmentId} options={deptOptions} placeholder="Select department" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--tt-text-secondary)" }}>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Opening shift" />
          </div>
          <div className="mt-6 space-y-3">
            <Button type="submit" disabled={loading} className="h-11 w-full rounded-lg bg-indigo-500 text-sm font-semibold text-white hover:bg-indigo-600">
              {loading ? <Loader2 className="size-4 animate-spin" /> : isEdit ? "Save Changes" : "Add Shift"}
            </Button>
            {isEdit && (
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10">
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <><Trash2 size={15} /> Delete Shift</>}
              </button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
