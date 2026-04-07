"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function updateOrganization(
  orgId: string,
  updates: {
    name?: string;
    timezone?: string;
    pay_period_type?: string;
    overtime_threshold_weekly?: number;
    overtime_multiplier?: number;
    geofence_required?: boolean;
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
  return { success: true };
}

export async function updateLocation(
  locationId: string,
  updates: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("locations").update(updates).eq("id", locationId);
  if (error) return { success: false, error: error.message };
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
