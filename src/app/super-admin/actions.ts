"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SUPER_ADMIN_EMAIL = "jacob.wendling29@yahoo.com";

async function verifySuperAdmin() {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== SUPER_ADMIN_EMAIL) throw new Error("Unauthorized");
  return user;
}

export async function getSystemStats() {
  await verifySuperAdmin();
  const admin = createAdminClient();

  const [orgs, profiles, entries, jobSites, notifications] = await Promise.all([
    admin.from("organizations").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("time_entries").select("id", { count: "exact", head: true }),
    admin.from("job_sites").select("id", { count: "exact", head: true }),
    admin.from("notifications").select("id", { count: "exact", head: true }),
  ]);

  return {
    organizations: orgs.count ?? 0,
    users: profiles.count ?? 0,
    timeEntries: entries.count ?? 0,
    jobSites: jobSites.count ?? 0,
    notifications: notifications.count ?? 0,
  };
}

export async function getAllOrganizations() {
  await verifySuperAdmin();
  const admin = createAdminClient();

  const { data: orgs } = await admin
    .from("organizations")
    .select("*, profiles!profiles_organization_id_fkey(id)")
    .order("created_at", { ascending: false });

  return (orgs ?? []).map((o: any) => ({
    id: o.id,
    name: o.name,
    timezone: o.timezone,
    inviteCode: o.invite_code,
    subscriptionTier: o.subscription_tier ?? "free",
    geofenceRequired: o.geofence_required,
    jobSitesEnabled: o.job_sites_enabled,
    createdAt: o.created_at,
    employeeCount: o.profiles?.length ?? 0,
  }));
}

export async function getAllUsers() {
  await verifySuperAdmin();
  const admin = createAdminClient();

  const { data } = await admin
    .from("profiles")
    .select("*, organizations(name)")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getOrganizationDetail(orgId: string) {
  await verifySuperAdmin();
  const admin = createAdminClient();

  const [{ data: org }, { data: employees }, { data: entries }, { data: payPeriods }, { data: departments }] = await Promise.all([
    admin.from("organizations").select("*").eq("id", orgId).single(),
    admin.from("profiles").select("*, departments(name), pay_rates(rate, type, is_primary)").eq("organization_id", orgId).order("first_name"),
    admin.from("time_entries").select("id, profile_id, clock_in, clock_out, total_hours, status").eq("organization_id", orgId).order("clock_in", { ascending: false }).limit(50),
    admin.from("pay_periods").select("*").eq("organization_id", orgId).order("start_date", { ascending: false }),
    admin.from("departments").select("id, name").eq("organization_id", orgId),
  ]);

  return { org, employees: employees ?? [], entries: entries ?? [], payPeriods: payPeriods ?? [], departments: departments ?? [] };
}

export async function superUpdateOrganization(orgId: string, updates: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  await verifySuperAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update(updates).eq("id", orgId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function superUpdateProfile(profileId: string, updates: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  await verifySuperAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update(updates).eq("id", profileId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function superUpdatePayRate(
  profileId: string,
  organizationId: string,
  rate: number,
  type: string
): Promise<{ success: boolean; error?: string }> {
  await verifySuperAdmin();
  const admin = createAdminClient();

  const { data: existing } = await admin.from("pay_rates").select("id").eq("profile_id", profileId).eq("is_primary", true).maybeSingle();
  if (existing) {
    const { error } = await admin.from("pay_rates").update({ rate, type }).eq("id", existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await admin.from("pay_rates").insert({ profile_id: profileId, organization_id: organizationId, rate, type, is_primary: true });
    if (error) return { success: false, error: error.message };
  }
  return { success: true };
}

export async function transferOwnership(
  orgId: string,
  newOwnerId: string,
  oldOwnerId: string
): Promise<{ success: boolean; error?: string }> {
  await verifySuperAdmin();
  const admin = createAdminClient();

  console.log("=== TRANSFER OWNERSHIP START ===", { orgId, newOwnerId, oldOwnerId });

  // Step 1: Update new owner
  const r1 = await admin.from("profiles").update({ role: "owner" }).eq("id", newOwnerId);
  console.log("Step 1 - Set new owner role:", r1.error?.message || "SUCCESS");
  if (r1.error) return { success: false, error: r1.error.message };

  // Step 2: Demote old owner to admin (skip if same person)
  if (oldOwnerId && oldOwnerId !== newOwnerId) {
    const r2 = await admin.from("profiles").update({ role: "admin" }).eq("id", oldOwnerId);
    console.log("Step 2 - Demote old owner:", r2.error?.message || "SUCCESS");
    if (r2.error) return { success: false, error: r2.error.message };
  } else {
    console.log("Step 2 - Skipped (same person or no old owner)");
  }

  // Step 3: Update org owner_id
  const r3 = await admin.from("organizations").update({ owner_id: newOwnerId }).eq("id", orgId);
  console.log("Step 3 - Update org owner_id:", r3.error?.message || "SUCCESS");
  if (r3.error) return { success: false, error: r3.error.message };

  // Verify
  const { data: verify } = await admin.from("profiles").select("role").eq("id", newOwnerId).single();
  console.log("Verification - new owner role is now:", verify?.role);
  console.log("=== TRANSFER OWNERSHIP END ===");

  return { success: true };
}

export async function superDeleteOrganization(orgId: string): Promise<{ success: boolean; error?: string }> {
  await verifySuperAdmin();
  const admin = createAdminClient();
  // Cascade handled by DB foreign keys
  const { error } = await admin.from("organizations").delete().eq("id", orgId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function superDeleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  await verifySuperAdmin();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function clearOldNotifications(): Promise<{ success: boolean; count?: number; error?: string }> {
  await verifySuperAdmin();
  const admin = createAdminClient();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data, error } = await admin.from("notifications").delete().lt("created_at", ninetyDaysAgo).select("id");
  if (error) return { success: false, error: error.message };
  return { success: true, count: data?.length ?? 0 };
}

export async function getRecentActivity() {
  await verifySuperAdmin();
  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [{ data: recentEntries }, { data: recentSignups }] = await Promise.all([
    admin.from("time_entries")
      .select("id, clock_in, total_hours, status, profiles!time_entries_profile_id_fkey(first_name, last_name, organizations(name))")
      .order("clock_in", { ascending: false })
      .limit(15),
    admin.from("profiles")
      .select("id, first_name, last_name, email, created_at, organizations(name)")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return { recentEntries: recentEntries ?? [], recentSignups: recentSignups ?? [] };
}
