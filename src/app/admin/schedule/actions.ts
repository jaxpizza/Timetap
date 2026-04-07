"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toLocalDateString } from "@/lib/utils";

export async function createShift(input: {
  organizationId: string;
  profileId: string;
  date: string;
  startTime: string;
  endTime: string;
  departmentId: string | null;
  locationId: string | null;
  notes: string;
}): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const startIso = new Date(`${input.date}T${input.startTime}`).toISOString();
  const endIso = new Date(`${input.date}T${input.endTime}`).toISOString();

  // Check for overlapping shifts
  const { data: overlaps } = await admin
    .from("schedules")
    .select("id")
    .eq("profile_id", input.profileId)
    .eq("organization_id", input.organizationId)
    .lt("start_time", endIso)
    .gt("end_time", startIso)
    .limit(1);
  if (overlaps && overlaps.length > 0) {
    return { success: false, error: "This employee already has a shift during this time" };
  }

  const { error } = await admin.from("schedules").insert({
    organization_id: input.organizationId,
    profile_id: input.profileId,
    start_time: startIso,
    end_time: endIso,
    department_id: input.departmentId,
    location_id: input.locationId,
    notes: input.notes || null,
    is_published: false,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateShift(
  shiftId: string,
  input: {
    profileId: string;
    date: string;
    startTime: string;
    endTime: string;
    departmentId: string | null;
    notes: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const startIso = new Date(`${input.date}T${input.startTime}`).toISOString();
  const endIso = new Date(`${input.date}T${input.endTime}`).toISOString();

  const { error } = await admin
    .from("schedules")
    .update({
      profile_id: input.profileId,
      start_time: startIso,
      end_time: endIso,
      department_id: input.departmentId,
      notes: input.notes || null,
    })
    .eq("id", shiftId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteShift(
  shiftId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("schedules").delete().eq("id", shiftId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function publishSchedule(
  organizationId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  const supabase = await createReadOnlyClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("schedules")
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("is_published", false)
    .select("id");

  if (error) return { success: false, error: error.message };
  return { success: true, count: data?.length ?? 0 };
}

export async function getWeekSchedules(
  organizationId: string,
  weekStart: string,
  weekEnd: string
) {
  const supabase = await createReadOnlyClient();
  const { data } = await supabase
    .from("schedules")
    .select("id, profile_id, start_time, end_time, is_published, notes, department_id")
    .eq("organization_id", organizationId)
    .gte("start_time", weekStart)
    .lte("start_time", weekEnd)
    .order("start_time");
  return data ?? [];
}

export async function getMonthSchedules(
  organizationId: string,
  monthStart: string,
  monthEnd: string
) {
  const supabase = await createReadOnlyClient();
  const { data } = await supabase
    .from("schedules")
    .select("id, profile_id, start_time, end_time, is_published, notes, department_id")
    .eq("organization_id", organizationId)
    .gte("start_time", monthStart)
    .lte("start_time", monthEnd)
    .order("start_time");
  return data ?? [];
}

export async function getPTOForRange(
  organizationId: string,
  rangeStart: string,
  rangeEnd: string
) {
  const supabase = await createReadOnlyClient();
  const { data } = await supabase
    .from("pto_requests")
    .select("profile_id, start_date, end_date, pto_policies(name)")
    .eq("organization_id", organizationId)
    .eq("status", "approved")
    .lte("start_date", toLocalDateString(new Date(rangeEnd)))
    .gte("end_date", toLocalDateString(new Date(rangeStart)));
  return data ?? [];
}

export async function createRecurringShifts(input: {
  profileId: string;
  organizationId: string;
  selectedDays: number[]; // 0=Sun..6=Sat (matches JS getDay())
  startTime: string;
  endTime: string;
  fromDate: string;
  toDate: string;
  departmentId: string | null;
  notes: string;
  skipPTO: boolean;
}): Promise<{ success: boolean; count?: number; skippedPTO?: number; error?: string }> {
  const admin = createAdminClient();

  // Get PTO dates to skip
  let ptoDates = new Set<string>();
  if (input.skipPTO) {
    const { data: ptoReqs } = await admin
      .from("pto_requests")
      .select("start_date, end_date")
      .eq("profile_id", input.profileId)
      .eq("status", "approved")
      .lte("start_date", input.toDate)
      .gte("end_date", input.fromDate);

    for (const req of ptoReqs ?? []) {
      const start = new Date(req.start_date + "T12:00:00");
      const end = new Date(req.end_date + "T12:00:00");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        ptoDates.add(`${y}-${m}-${day}`);
      }
    }
  }

  // Fetch existing shifts in the date range to check for overlaps
  const { data: existingShifts } = await admin
    .from("schedules")
    .select("start_time, end_time")
    .eq("profile_id", input.profileId)
    .eq("organization_id", input.organizationId)
    .gte("start_time", input.fromDate + "T00:00:00")
    .lte("start_time", input.toDate + "T23:59:59");

  // Generate all dates
  // Parse as noon local to avoid UTC timezone boundary issues
  const from = new Date(input.fromDate + "T12:00:00");
  const to = new Date(input.toDate + "T12:00:00");
  const shifts: any[] = [];
  let skipped = 0;

  // selectedDays now directly matches JS getDay() (0=Sun..6=Sat)
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (!input.selectedDays.includes(d.getDay())) continue;

    // Format as local date string YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${day}`;
    if (ptoDates.has(dateStr)) { skipped++; continue; }

    // Check for overlap with existing shifts
    const newStart = new Date(`${dateStr}T${input.startTime}`).toISOString();
    const newEnd = new Date(`${dateStr}T${input.endTime}`).toISOString();
    const hasOverlap = (existingShifts ?? []).some(
      (s) => s.start_time < newEnd && s.end_time > newStart
    );
    if (hasOverlap) { skipped++; continue; }

    shifts.push({
      organization_id: input.organizationId,
      profile_id: input.profileId,
      start_time: new Date(`${dateStr}T${input.startTime}`).toISOString(),
      end_time: new Date(`${dateStr}T${input.endTime}`).toISOString(),
      department_id: input.departmentId,
      notes: input.notes || null,
      is_published: false,
    });
  }

  if (shifts.length === 0) return { success: true, count: 0, skippedPTO: skipped };

  const { error } = await admin.from("schedules").insert(shifts);
  if (error) return { success: false, error: error.message };
  return { success: true, count: shifts.length, skippedPTO: skipped };
}
