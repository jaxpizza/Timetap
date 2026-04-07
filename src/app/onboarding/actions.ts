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
