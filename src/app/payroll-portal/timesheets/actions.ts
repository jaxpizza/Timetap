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
