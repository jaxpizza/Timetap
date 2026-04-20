"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

const SUPER_ADMIN_EMAIL = "jacob.wendling29@yahoo.com";

async function verifySuperAdmin() {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== SUPER_ADMIN_EMAIL) throw new Error("Unauthorized");
  return user;
}

export async function superApprovePayrollProvider(providerId: string, organizationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const approver = await verifySuperAdmin();
    const admin = createAdminClient();

    const { data: updated, error } = await admin
      .from("payroll_provider_orgs")
      .update({ status: "active", approved_by: approver.id, approved_at: new Date().toISOString() })
      .eq("provider_id", providerId)
      .eq("organization_id", organizationId)
      .select("id");

    if (error) return { success: false, error: error.message };
    if (!updated || updated.length === 0) return { success: false, error: "No matching provider request found" };

    // Notify the provider
    createNotification({
      organizationId,
      profileId: providerId,
      type: "payroll_provider_approved",
      title: "Payroll Provider Request Approved",
      message: "You now have access to manage this company's payroll.",
      link: "/payroll-portal",
    }).catch(() => {});

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed" };
  }
}

export async function superDenyPayrollProvider(providerId: string, organizationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await verifySuperAdmin();
    const admin = createAdminClient();

    const { error } = await admin
      .from("payroll_provider_orgs")
      .update({ status: "revoked" })
      .eq("provider_id", providerId)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed" };
  }
}

export async function superApproveEmployee(profileId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await verifySuperAdmin();
    const admin = createAdminClient();

    const { data: profile, error } = await admin
      .from("profiles")
      .update({ join_status: "active" })
      .eq("id", profileId)
      .select("organization_id, first_name, last_name")
      .single();

    if (error) return { success: false, error: error.message };
    if (profile) {
      createNotification({
        organizationId: profile.organization_id,
        profileId,
        type: "employee_approved",
        title: "Welcome to the team!",
        message: "Your account has been approved. You can start clocking in.",
        link: "/dashboard",
      }).catch(() => {});
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed" };
  }
}

export async function superRejectEmployee(profileId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await verifySuperAdmin();
    const admin = createAdminClient();

    const { error } = await admin
      .from("profiles")
      .update({ join_status: "rejected", organization_id: null })
      .eq("id", profileId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Failed" };
  }
}
