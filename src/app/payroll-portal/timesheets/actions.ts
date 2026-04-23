"use server";

import { verifyPayrollProvider } from "@/lib/payroll-provider/verify";
import { createNotification } from "@/lib/notifications/create";

async function verifyEntryInOrg(admin: any, entryId: string, orgId: string) {
  const { data: entry } = await admin
    .from("time_entries")
    .select("organization_id, profile_id, clock_in")
    .eq("id", entryId)
    .single();
  if (entry?.organization_id !== orgId) throw new Error("Entry does not belong to this organization");
  return entry;
}

export async function approveTimeEntry(orgId: string, timeEntryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, admin } = await verifyPayrollProvider(orgId);
    const entry = await verifyEntryInOrg(admin, timeEntryId, orgId);

    const { error } = await admin
      .from("time_entries")
      .update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() })
      .eq("id", timeEntryId);
    if (error) return { success: false, error: error.message };

    const clockDate = new Date(entry.clock_in).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    createNotification({
      organizationId: orgId,
      profileId: entry.profile_id,
      type: "timesheet_approved",
      title: "Timesheet Approved",
      message: `Your timesheet for ${clockDate} has been approved`,
      link: "/dashboard/timesheet",
    }).catch(() => {});

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Unauthorized" };
  }
}

export async function flagTimeEntry(orgId: string, timeEntryId: string, note: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { admin } = await verifyPayrollProvider(orgId);
    const entry = await verifyEntryInOrg(admin, timeEntryId, orgId);

    const { error } = await admin
      .from("time_entries")
      .update({ status: "flagged", notes: note })
      .eq("id", timeEntryId);
    if (error) return { success: false, error: error.message };

    const clockDate = new Date(entry.clock_in).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    createNotification({
      organizationId: orgId,
      profileId: entry.profile_id,
      type: "timesheet_flagged",
      title: "Timesheet Flagged",
      message: `Your timesheet for ${clockDate} was flagged: ${note}`,
      link: "/dashboard/timesheet",
    }).catch(() => {});

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Unauthorized" };
  }
}

export async function unflagTimeEntry(orgId: string, timeEntryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { admin } = await verifyPayrollProvider(orgId);
    await verifyEntryInOrg(admin, timeEntryId, orgId);

    const { error } = await admin
      .from("time_entries")
      .update({ status: "completed", notes: null })
      .eq("id", timeEntryId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Unauthorized" };
  }
}

export async function addManualEntryAsProvider(input: {
  organizationId: string;
  profileId: string;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  notes: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { admin } = await verifyPayrollProvider(input.organizationId);

    const { data: target } = await admin
      .from("profiles")
      .select("organization_id")
      .eq("id", input.profileId)
      .single();
    if (target?.organization_id !== input.organizationId) {
      return { success: false, error: "Employee does not belong to this organization" };
    }

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
  } catch (e: any) {
    return { success: false, error: e.message ?? "Unauthorized" };
  }
}

export async function editTimeEntryAsProvider(input: {
  organizationId: string;
  entryId: string;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  notes: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { admin } = await verifyPayrollProvider(input.organizationId);
    await verifyEntryInOrg(admin, input.entryId, input.organizationId);

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
  } catch (e: any) {
    return { success: false, error: e.message ?? "Unauthorized" };
  }
}

export async function deleteTimeEntryAsProvider(orgId: string, entryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { admin } = await verifyPayrollProvider(orgId);
    await verifyEntryInOrg(admin, entryId, orgId);

    const { error } = await admin.from("time_entries").delete().eq("id", entryId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Unauthorized" };
  }
}

export async function approveAllForEmployee(orgId: string, profileId: string): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { user, admin } = await verifyPayrollProvider(orgId);

    const { data, error } = await admin
      .from("time_entries")
      .update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() })
      .eq("profile_id", profileId)
      .eq("organization_id", orgId)
      .eq("status", "completed")
      .select("id");
    if (error) return { success: false, error: error.message };
    return { success: true, count: data?.length ?? 0 };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Unauthorized" };
  }
}
