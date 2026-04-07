"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function approveTimeEntry(
  timeEntryId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createReadOnlyClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("time_entries")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", timeEntryId);

  if (error) return { success: false, error: error.message };
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
  const { error } = await admin
    .from("time_entries")
    .update({ status: "flagged", notes: note })
    .eq("id", timeEntryId);

  if (error) return { success: false, error: error.message };
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
