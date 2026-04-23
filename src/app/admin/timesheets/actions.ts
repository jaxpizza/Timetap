"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

export async function approveTimeEntry(
  timeEntryId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createReadOnlyClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();
  const { data: entry, error } = await admin
    .from("time_entries")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", timeEntryId)
    .select("profile_id, organization_id, clock_in")
    .single();

  if (error) return { success: false, error: error.message };

  // Notify the employee
  if (entry) {
    const clockDate = new Date(entry.clock_in).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    createNotification({
      organizationId: entry.organization_id,
      profileId: entry.profile_id,
      type: "timesheet_approved",
      title: "Timesheet Approved",
      message: `Your timesheet for ${clockDate} has been approved`,
      link: "/dashboard/timesheet",
    }).catch(() => {});
  }

  return { success: true };
}

export async function approveAllForEmployee(
  profileId: string,
  organizationId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  const supabase = await createReadOnlyClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("time_entries")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("profile_id", profileId)
    .eq("organization_id", organizationId)
    .eq("status", "completed")
    .select("id");

  if (error) return { success: false, error: error.message };
  return { success: true, count: data?.length ?? 0 };
}

export async function flagTimeEntry(
  timeEntryId: string,
  note: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: entry, error } = await admin
    .from("time_entries")
    .update({ status: "flagged", notes: note })
    .eq("id", timeEntryId)
    .select("profile_id, organization_id, clock_in")
    .single();

  if (error) return { success: false, error: error.message };

  if (entry) {
    const clockDate = new Date(entry.clock_in).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    createNotification({
      organizationId: entry.organization_id,
      profileId: entry.profile_id,
      type: "timesheet_flagged",
      title: "Timesheet Flagged",
      message: `Your timesheet for ${clockDate} was flagged: ${note}`,
      link: "/dashboard/timesheet",
    }).catch(() => {});
  }

  return { success: true };
}

export async function unflagTimeEntry(
  timeEntryId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("time_entries")
    .update({ status: "completed", notes: null })
    .eq("id", timeEntryId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteTimeEntry(
  timeEntryId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("time_entries")
    .delete()
    .eq("id", timeEntryId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function addManualEntry(input: {
  profileId: string;
  organizationId: string;
  clockIn: string;       // ISO timestamptz
  clockOut: string;      // ISO timestamptz
  breakMinutes: number;
  notes: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();

  // Verify caller permissions: must be admin/owner/manager/payroll in the target org
  const { data: caller } = await admin
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!caller || caller.organization_id !== input.organizationId) {
    return { success: false, error: "Not authorized for this organization" };
  }
  const allowedRoles = ["owner", "admin", "manager", "payroll"];
  if (!allowedRoles.includes(caller.role)) {
    return { success: false, error: "Insufficient role to add manual entries" };
  }

  // Verify target employee belongs to this org
  const { data: target } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", input.profileId)
    .single();
  if (target?.organization_id !== input.organizationId) {
    return { success: false, error: "Employee does not belong to this organization" };
  }

  // Sanity validation
  const startMs = new Date(input.clockIn).getTime();
  const endMs = new Date(input.clockOut).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return { success: false, error: "Invalid timestamps" };
  if (endMs <= startMs) return { success: false, error: "Clock out must be after clock in" };
  const shiftMinutes = (endMs - startMs) / 60000;
  if (shiftMinutes > 24 * 60) return { success: false, error: "Shift cannot exceed 24 hours" };
  const breakMin = Math.max(0, Math.floor(input.breakMinutes || 0));
  if (breakMin >= shiftMinutes) return { success: false, error: "Break must be less than total shift duration" };
  if (!input.notes || !input.notes.trim()) return { success: false, error: "Notes are required for manual entries" };

  const { data, error } = await admin
    .from("time_entries")
    .insert({
      profile_id: input.profileId,
      organization_id: input.organizationId,
      clock_in: input.clockIn,
      clock_out: input.clockOut,
      clock_in_method: "manual_admin",
      clock_out_method: "manual_admin",
      total_break_minutes: breakMin,
      status: "completed",
      notes: input.notes.trim(),
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function editTimeEntry(input: {
  entryId: string;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  notes: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();

  // Load entry + caller to verify same org and role
  const { data: entry } = await admin
    .from("time_entries")
    .select("organization_id, profile_id")
    .eq("id", input.entryId)
    .single();
  if (!entry) return { success: false, error: "Entry not found" };

  const { data: caller } = await admin
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();
  if (!caller || caller.organization_id !== entry.organization_id) {
    return { success: false, error: "Not authorized for this organization" };
  }
  const allowedRoles = ["owner", "admin", "manager", "payroll"];
  if (!allowedRoles.includes(caller.role)) {
    return { success: false, error: "Insufficient role to edit time entries" };
  }

  const startMs = new Date(input.clockIn).getTime();
  const endMs = new Date(input.clockOut).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return { success: false, error: "Invalid timestamps" };
  if (endMs <= startMs) return { success: false, error: "Clock out must be after clock in" };
  const shiftMinutes = (endMs - startMs) / 60000;
  if (shiftMinutes > 24 * 60) return { success: false, error: "Shift cannot exceed 24 hours" };
  const breakMin = Math.max(0, Math.floor(input.breakMinutes || 0));
  if (breakMin >= shiftMinutes) return { success: false, error: "Break must be less than total shift duration" };
  if (!input.notes || !input.notes.trim()) return { success: false, error: "Notes are required when editing" };

  const { error } = await admin
    .from("time_entries")
    .update({
      clock_in: input.clockIn,
      clock_out: input.clockOut,
      total_break_minutes: breakMin,
      notes: input.notes.trim(),
      status: "edited",
    })
    .eq("id", input.entryId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function forceClockOut(
  timeEntryId: string,
  clockOutTime?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  // If no clockOutTime specified, get the entry to calculate a reasonable default
  let resolvedTime = clockOutTime;
  if (!resolvedTime) {
    const { data: entry } = await admin
      .from("time_entries")
      .select("clock_in")
      .eq("id", timeEntryId)
      .single();
    if (!entry) return { success: false, error: "Entry not found" };
    // Default: 12 hours after clock-in or end of that day, whichever is earlier
    const clockIn = new Date(entry.clock_in);
    const twelveHoursLater = new Date(clockIn.getTime() + 12 * 3600000);
    const endOfDay = new Date(clockIn);
    endOfDay.setHours(23, 59, 0, 0);
    resolvedTime = (twelveHoursLater < endOfDay ? twelveHoursLater : endOfDay).toISOString();
  }

  const { error } = await admin
    .from("time_entries")
    .update({
      clock_out: resolvedTime,
      clock_out_method: "admin_force",
      status: "completed",
    })
    .eq("id", timeEntryId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
