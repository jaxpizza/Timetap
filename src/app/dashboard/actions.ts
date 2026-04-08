"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startOfLocalWeek, formatHours } from "@/lib/utils";
import { notifyOrgOwner } from "@/lib/notifications/create";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function checkOnSite(admin: any, orgId: string, lat: number | null, lon: number | null): Promise<boolean | null> {
  if (lat == null || lon == null) return null;

  // Check permanent work locations
  const { data: locations } = await admin.from("locations").select("latitude, longitude, radius_meters").eq("organization_id", orgId).eq("is_active", true);

  // Check active job sites
  const { data: jobSites } = await admin.from("job_sites").select("latitude, longitude, radius_meters").eq("organization_id", orgId).eq("is_active", true).gt("expires_at", new Date().toISOString());

  const allSites = [...(locations ?? []), ...(jobSites ?? [])];
  if (allSites.length === 0) return null;

  for (const loc of allSites) {
    if (loc.latitude == null || loc.longitude == null) continue;
    const dist = haversineDistance(lat, lon, Number(loc.latitude), Number(loc.longitude));
    if (dist <= (loc.radius_meters ?? 402)) return true;
  }
  return false;
}

/**
 * Recalculate weekly overtime for an employee.
 * Walks entries chronologically — once cumulative hours exceed the threshold,
 * remaining hours are marked as overtime.
 */
export async function recalculateWeeklyOvertime(
  profileId: string,
  orgId: string,
  weekStartDate?: Date
): Promise<void> {
  const admin = createAdminClient();
  const ws = weekStartDate ?? startOfLocalWeek(new Date());
  const we = new Date(ws);
  we.setDate(ws.getDate() + 7);

  // Get org overtime settings
  const { data: org } = await admin
    .from("organizations")
    .select("overtime_threshold_weekly")
    .eq("id", orgId)
    .single();
  const threshold = org?.overtime_threshold_weekly ?? 40;

  // Get all completed/approved entries for the week, chronologically
  const { data: entries } = await admin
    .from("time_entries")
    .select("id, total_hours")
    .eq("profile_id", profileId)
    .eq("organization_id", orgId)
    .in("status", ["completed", "approved"])
    .gte("clock_in", ws.toISOString())
    .lt("clock_in", we.toISOString())
    .order("clock_in", { ascending: true });

  if (!entries || entries.length === 0) return;

  let cumulative = 0;
  for (const entry of entries) {
    const hours = Number(entry.total_hours) || 0;
    const prevCumulative = cumulative;
    cumulative += hours;

    if (cumulative > threshold && prevCumulative < threshold) {
      // This entry crosses the threshold — split
      const regularPortion = threshold - prevCumulative;
      const overtimePortion = hours - regularPortion;
      await admin.from("time_entries").update({
        is_overtime: true,
        overtime_hours: Math.round(overtimePortion * 100) / 100,
      }).eq("id", entry.id);
    } else if (prevCumulative >= threshold) {
      // Entirely overtime
      await admin.from("time_entries").update({
        is_overtime: true,
        overtime_hours: Math.round(hours * 100) / 100,
      }).eq("id", entry.id);
    } else {
      // Entirely regular — clear any stale overtime flags
      await admin.from("time_entries").update({
        is_overtime: false,
        overtime_hours: 0,
      }).eq("id", entry.id);
    }
  }
}

export async function clockIn(geo?: {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}): Promise<{ success: boolean; timeEntryId?: string; onSite?: boolean | null; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) return { success: false, error: "No organization" };

  const admin = createAdminClient();

  // Prevent double clock-in
  const { data: existing } = await admin
    .from("time_entries")
    .select("id")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .is("clock_out", null)
    .limit(1);
  if (existing && existing.length > 0) {
    return { success: false, error: "You are already clocked in" };
  }

  const onSite = await checkOnSite(admin, profile.organization_id, geo?.latitude ?? null, geo?.longitude ?? null);

  const { data, error } = await admin.from("time_entries").insert({
    profile_id: user.id,
    organization_id: profile.organization_id,
    clock_in: new Date().toISOString(),
    clock_in_method: "web",
    status: "active",
    clock_in_latitude: geo?.latitude ?? null,
    clock_in_longitude: geo?.longitude ?? null,
    clock_in_accuracy: geo?.accuracy ?? null,
    clock_in_on_site: onSite,
  }).select("id").single();

  if (error) return { success: false, error: error.message };
  return { success: true, timeEntryId: data.id, onSite };
}

export async function clockOut(
  timeEntryId: string,
  geo?: { latitude: number | null; longitude: number | null; accuracy: number | null }
): Promise<{ success: boolean; totalHours?: number; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  const admin = createAdminClient();
  const onSite = profile?.organization_id ? await checkOnSite(admin, profile.organization_id, geo?.latitude ?? null, geo?.longitude ?? null) : null;

  const { data, error } = await admin.from("time_entries").update({
    clock_out: new Date().toISOString(),
    clock_out_method: "web",
    status: "completed",
    clock_out_latitude: geo?.latitude ?? null,
    clock_out_longitude: geo?.longitude ?? null,
    clock_out_accuracy: geo?.accuracy ?? null,
    clock_out_on_site: onSite,
  }).eq("id", timeEntryId).select("total_hours").single();

  if (error) return { success: false, error: error.message };

  // Recalculate weekly overtime after each clock-out
  if (profile?.organization_id) {
    await recalculateWeeklyOvertime(user.id, profile.organization_id).catch(() => {});
    // Notify org owner of completed shift
    const { data: emp } = await admin.from("profiles").select("first_name, last_name").eq("id", user.id).single();
    const empName = emp ? `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() : "An employee";
    notifyOrgOwner({
      organizationId: profile.organization_id,
      type: "timesheet_pending",
      title: "Timesheet Ready",
      message: `${empName} completed a ${formatHours(data.total_hours ?? 0)} shift`,
      link: "/admin/timesheets",
    }).catch(() => {});
  }

  return { success: true, totalHours: data.total_hours };
}

export async function startBreak(
  timeEntryId: string
): Promise<{ success: boolean; breakId?: string; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();
  const { data, error } = await admin.from("breaks").insert({
    time_entry_id: timeEntryId,
    profile_id: user.id,
    start_time: new Date().toISOString(),
  }).select("id").single();

  if (error) return { success: false, error: error.message };
  return { success: true, breakId: data.id };
}

export async function endBreak(
  breakId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("breaks").update({ end_time: new Date().toISOString() }).eq("id", breakId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
