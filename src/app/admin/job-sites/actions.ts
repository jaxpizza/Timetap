"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startOfLocalToday } from "@/lib/utils";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function createJobSite(input: {
  organizationId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  durationDays: number;
}): Promise<{ success: boolean; retroactiveUpdates?: number; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + input.durationDays * 86400000).toISOString();

  const { data, error } = await admin.from("job_sites").insert({
    organization_id: input.organizationId,
    name: input.name,
    address: input.address || null,
    latitude: input.latitude,
    longitude: input.longitude,
    radius_meters: input.radiusMeters,
    expires_at: expiresAt,
    created_by: user.id,
  }).select("id").single();

  if (error) return { success: false, error: error.message };

  // Retroactively update today's clock-ins that are near this job site
  let retroactiveUpdates = 0;
  const todayStart = startOfLocalToday();

  const { data: entries } = await admin
    .from("time_entries")
    .select("id, clock_in_latitude, clock_in_longitude, clock_in_on_site, clock_out_latitude, clock_out_longitude, clock_out_on_site")
    .eq("organization_id", input.organizationId)
    .gte("clock_in", todayStart.toISOString())
    .not("clock_in_latitude", "is", null);

  for (const entry of entries ?? []) {
    let updated = false;
    const updates: Record<string, any> = {};

    if (entry.clock_in_latitude && entry.clock_in_longitude && !entry.clock_in_on_site) {
      const dist = haversineDistance(input.latitude, input.longitude, Number(entry.clock_in_latitude), Number(entry.clock_in_longitude));
      if (dist <= input.radiusMeters) {
        updates.clock_in_on_site = true;
        updated = true;
      }
    }

    if (entry.clock_out_latitude && entry.clock_out_longitude && !entry.clock_out_on_site) {
      const dist = haversineDistance(input.latitude, input.longitude, Number(entry.clock_out_latitude), Number(entry.clock_out_longitude));
      if (dist <= input.radiusMeters) {
        updates.clock_out_on_site = true;
        updated = true;
      }
    }

    if (updated) {
      await admin.from("time_entries").update(updates).eq("id", entry.id);
      retroactiveUpdates++;
    }
  }

  return { success: true, retroactiveUpdates };
}

export async function extendJobSite(
  jobSiteId: string,
  additionalDays: number
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: site } = await admin.from("job_sites").select("expires_at").eq("id", jobSiteId).single();
  if (!site) return { success: false, error: "Job site not found" };

  const currentExpiry = new Date(site.expires_at);
  const newExpiry = new Date(currentExpiry.getTime() + additionalDays * 86400000);

  const { error } = await admin
    .from("job_sites")
    .update({ expires_at: newExpiry.toISOString(), is_active: true })
    .eq("id", jobSiteId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function closeJobSite(
  jobSiteId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("job_sites")
    .update({ is_active: false })
    .eq("id", jobSiteId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getActiveJobSites(organizationId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("job_sites")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  return data ?? [];
}
