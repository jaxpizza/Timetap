"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateDistance } from "@/lib/utils";

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
  }).select("id, starts_at").single();

  if (error) return { success: false, error: error.message };

  // Retroactively update clock-ins from the job site's starts_at to now.
  // starts_at defaults to now(), so this normally checks today.
  // If an admin backdates starts_at, it catches those past entries too.
  let retroactiveUpdates = 0;
  const startsAt = data?.starts_at ?? new Date().toISOString();

  const { data: entries } = await admin
    .from("time_entries")
    .select("id, clock_in_latitude, clock_in_longitude, clock_in_on_site, clock_out_latitude, clock_out_longitude, clock_out_on_site")
    .eq("organization_id", input.organizationId)
    .gte("clock_in", startsAt)
    .not("clock_in_latitude", "is", null)
    .or("clock_in_on_site.is.null,clock_in_on_site.eq.false");

  for (const entry of entries ?? []) {
    let updated = false;
    const updates: Record<string, any> = {};

    if (entry.clock_in_latitude && entry.clock_in_longitude && !entry.clock_in_on_site) {
      const dist = calculateDistance(input.latitude, input.longitude, Number(entry.clock_in_latitude), Number(entry.clock_in_longitude));
      if (dist <= input.radiusMeters) {
        updates.clock_in_on_site = true;
        updated = true;
      }
    }

    if (entry.clock_out_latitude && entry.clock_out_longitude && !entry.clock_out_on_site) {
      const dist = calculateDistance(input.latitude, input.longitude, Number(entry.clock_out_latitude), Number(entry.clock_out_longitude));
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
