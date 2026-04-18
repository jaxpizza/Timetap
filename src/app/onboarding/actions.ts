"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function generateInviteCode(name: string): string {
  const prefix = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 4)
    .toUpperCase()
    .padEnd(4, "X");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${suffix}`;
}

export async function createOrganization(
  companyName: string,
  timezone: string,
  payPeriodType: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createReadOnlyClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();

  const base = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).substring(2, 6);
  const slug = `${base}-${suffix}`;
  const inviteCode = generateInviteCode(companyName);

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: companyName,
      slug,
      owner_id: user.id,
      timezone,
      pay_period_type: payPeriodType,
      invite_code: inviteCode,
    })
    .select("id")
    .single();

  if (orgError) return { success: false, error: orgError.message };

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      organization_id: org.id,
      role: "owner",
      join_status: "active",
    })
    .eq("id", user.id);

  if (profileError) return { success: false, error: profileError.message };

  return { success: true };
}

export async function joinOrganization(
  inviteCode: string
): Promise<{ success: boolean; orgName?: string; error?: string }> {
  const supabase = await createReadOnlyClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();

  // Check if user already in an org
  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id, first_name, last_name")
    .eq("id", user.id)
    .single();

  if (profile?.organization_id) {
    return { success: false, error: "You already belong to an organization" };
  }

  // Find org by invite code
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, owner_id")
    .ilike("invite_code", inviteCode.trim())
    .single();

  if (!org) return { success: false, error: "Invalid invite code" };

  // Set user as pending member
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      organization_id: org.id,
      role: "employee",
      join_status: "pending",
    })
    .eq("id", user.id);

  if (updateError) return { success: false, error: updateError.message };

  // Notify the org owner
  const empName =
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
    "Someone";
  await admin.from("notifications").insert({
    organization_id: org.id,
    profile_id: org.owner_id,
    type: "join_request",
    title: "New join request",
    message: `${empName} wants to join your organization`,
    link: "/admin/employees?tab=pending",
  });

  return { success: true, orgName: org.name };
}

export async function setupPayrollProvider(
  inviteCode: string
): Promise<{ success: boolean; orgName?: string; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();

  // Get profile for name
  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name, role, organization_id")
    .eq("id", user.id)
    .single();

  // Don't allow if already in an org as an employee/admin/owner
  if (profile?.organization_id && profile.role !== "payroll_provider") {
    return { success: false, error: "You already belong to an organization" };
  }

  // Find org by invite code
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, owner_id")
    .ilike("invite_code", inviteCode.trim())
    .single();
  if (!org) return { success: false, error: "Invalid invite code" };

  // Check if already linked to this org
  const { data: existing } = await admin
    .from("payroll_provider_orgs")
    .select("id, status")
    .eq("provider_id", user.id)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (existing) {
    return { success: false, error: existing.status === "pending" ? "Request already pending for this company" : existing.status === "active" ? "You already manage this company" : "Access was revoked for this company" };
  }

  // Set role to payroll_provider (no organization_id — stays null)
  const { error: roleErr } = await admin
    .from("profiles")
    .update({ role: "payroll_provider" })
    .eq("id", user.id);
  if (roleErr) return { success: false, error: roleErr.message };

  // Insert link as pending
  const { error: linkErr } = await admin.from("payroll_provider_orgs").insert({
    provider_id: user.id,
    organization_id: org.id,
    status: "pending",
  });
  if (linkErr) return { success: false, error: linkErr.message };

  // Notify org owner
  const providerName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "A payroll provider";
  await admin.from("notifications").insert({
    organization_id: org.id,
    profile_id: org.owner_id,
    type: "payroll_provider_request",
    title: "Payroll Provider Request",
    message: `${providerName} wants to manage your payroll`,
    link: "/admin/employees?tab=pending",
  });

  return { success: true, orgName: org.name };
}

export async function joinAdditionalOrg(
  inviteCode: string
): Promise<{ success: boolean; orgName?: string; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "payroll_provider") {
    return { success: false, error: "Only payroll providers can use this" };
  }

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, owner_id")
    .ilike("invite_code", inviteCode.trim())
    .single();
  if (!org) return { success: false, error: "Invalid invite code" };

  const { data: existing } = await admin
    .from("payroll_provider_orgs")
    .select("id, status")
    .eq("provider_id", user.id)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (existing) {
    return { success: false, error: existing.status === "pending" ? "Request already pending" : existing.status === "active" ? "You already manage this company" : "Access was revoked" };
  }

  const { error } = await admin.from("payroll_provider_orgs").insert({
    provider_id: user.id,
    organization_id: org.id,
    status: "pending",
  });
  if (error) return { success: false, error: error.message };

  const providerName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "A payroll provider";
  await admin.from("notifications").insert({
    organization_id: org.id,
    profile_id: org.owner_id,
    type: "payroll_provider_request",
    title: "Payroll Provider Request",
    message: `${providerName} wants to manage your payroll`,
    link: "/admin/employees?tab=pending",
  });

  return { success: true, orgName: org.name };
}
