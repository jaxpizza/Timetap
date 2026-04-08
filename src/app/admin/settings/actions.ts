"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { calculateDistance } from "@/lib/utils";

async function retroactiveOnSiteCheck(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  latitude: number,
  longitude: number,
  radiusMeters: number
): Promise<number> {
  // For permanent locations: check ALL historical clock-ins, not just today.
  // Only fetch entries that aren't already marked on-site (skip the rest).
  const { data: entries } = await admin
    .from("time_entries")
    .select("id, clock_in_latitude, clock_in_longitude, clock_in_on_site, clock_out_latitude, clock_out_longitude, clock_out_on_site")
    .eq("organization_id", organizationId)
    .not("clock_in_latitude", "is", null)
    .or("clock_in_on_site.is.null,clock_in_on_site.eq.false");

  let updated = 0;
  for (const entry of entries ?? []) {
    const updates: Record<string, boolean> = {};

    if (entry.clock_in_latitude && entry.clock_in_longitude && !entry.clock_in_on_site) {
      const dist = calculateDistance(Number(entry.clock_in_latitude), Number(entry.clock_in_longitude), latitude, longitude);
      if (dist <= radiusMeters) updates.clock_in_on_site = true;
    }

    if (entry.clock_out_latitude && entry.clock_out_longitude && !entry.clock_out_on_site) {
      const dist = calculateDistance(Number(entry.clock_out_latitude), Number(entry.clock_out_longitude), latitude, longitude);
      if (dist <= radiusMeters) updates.clock_out_on_site = true;
    }

    if (Object.keys(updates).length > 0) {
      await admin.from("time_entries").update(updates).eq("id", entry.id);
      updated++;
    }
  }
  return updated;
}

export async function updateOrganization(
  orgId: string,
  updates: {
    name?: string;
    timezone?: string;
    pay_period_type?: string;
    overtime_threshold_weekly?: number;
    overtime_multiplier?: number;
    geofence_required?: boolean;
    job_sites_enabled?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update(updates).eq("id", orgId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function createLocation(input: {
  organizationId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
}): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("locations").insert({
    organization_id: input.organizationId,
    name: input.name,
    address: input.address,
    city: input.city,
    state: input.state,
    zip: input.zip,
    latitude: input.latitude,
    longitude: input.longitude,
    radius_meters: input.radius_meters,
  });
  if (error) return { success: false, error: error.message };

  // Retroactively update today's clock-ins near this new location
  if (input.latitude && input.longitude) {
    retroactiveOnSiteCheck(admin, input.organizationId, input.latitude, input.longitude, input.radius_meters).catch(() => {});
  }

  return { success: true };
}

export async function updateLocation(
  locationId: string,
  updates: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("locations").update(updates).eq("id", locationId);
  if (error) return { success: false, error: error.message };

  // Retroactively check today's clock-ins against the updated location
  const { data: loc } = await admin.from("locations").select("organization_id, latitude, longitude, radius_meters").eq("id", locationId).single();
  if (loc?.latitude && loc?.longitude) {
    retroactiveOnSiteCheck(admin, loc.organization_id, Number(loc.latitude), Number(loc.longitude), Number(loc.radius_meters ?? 402)).catch(() => {});
  }

  return { success: true };
}

export async function deleteLocation(
  locationId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("locations").delete().eq("id", locationId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function regenerateInviteCode(
  orgId: string,
  orgName: string
): Promise<{ success: boolean; code?: string; error?: string }> {
  const prefix = orgName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase().padEnd(4, "X");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  const code = `${prefix}-${suffix}`;

  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update({ invite_code: code }).eq("id", orgId);
  if (error) return { success: false, error: error.message };
  return { success: true, code };
}
