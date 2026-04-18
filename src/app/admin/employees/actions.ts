"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toLocalDateString } from "@/lib/utils";

function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const nums = "23456789";
  const special = "!@#$%&*";
  const all = upper + lower + nums + special;
  let pw = "";
  pw += upper[Math.floor(Math.random() * upper.length)];
  pw += lower[Math.floor(Math.random() * lower.length)];
  pw += nums[Math.floor(Math.random() * nums.length)];
  pw += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < 16; i++) pw += all[Math.floor(Math.random() * all.length)];
  return pw
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export async function addEmployee(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  departmentId: string | null;
  payType: string;
  payRate: number;
  filingStatus: string;
  federalAllowances: number;
  stateAllowances: number;
  organizationId: string;
}): Promise<{ success: boolean; userId?: string; error?: string }> {
  const supabase = await createReadOnlyClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: input.email,
      password: generateTempPassword(),
      email_confirm: true,
      user_metadata: {
        first_name: input.firstName,
        last_name: input.lastName,
      },
    });

  if (authError) return { success: false, error: authError.message };

  const userId = authData.user.id;

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      organization_id: input.organizationId,
      role: input.role,
      department_id: input.departmentId,
      phone: input.phone || null,
      filing_status: input.filingStatus,
      federal_allowances: input.federalAllowances,
      state_allowances: input.stateAllowances,
      hire_date: toLocalDateString(new Date()),
      join_status: "active",
    })
    .eq("id", userId);

  if (profileError) return { success: false, error: profileError.message };

  const { error: payError } = await admin.from("pay_rates").insert({
    profile_id: userId,
    organization_id: input.organizationId,
    type: input.payType,
    rate: input.payRate,
    is_primary: true,
  });

  if (payError) return { success: false, error: payError.message };

  return { success: true, userId };
}

export async function createDepartment(
  name: string,
  organizationId: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("departments")
    .insert({ name, organization_id: organizationId })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function updateEmployee(
  profileId: string,
  input: {
    firstName: string;
    lastName: string;
    phone: string;
    role: string;
    departmentId: string | null;
    payType: string;
    payRate: number;
    filingStatus: string;
    federalAllowances: number;
    stateAllowances: number;
    organizationId: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  // Protect the owner role
  const { data: target } = await admin.from("profiles").select("role").eq("id", profileId).single();
  if (target?.role === "owner") {
    // Owner can edit their own profile fields but NOT their role
    const supabase = await createReadOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id !== profileId) return { success: false, error: "Cannot modify the owner account" };
    if (input.role !== "owner") return { success: false, error: "Owner role cannot be changed. Contact platform support." };
  }
  // Prevent non-super-admin from setting anyone to owner
  if (input.role === "owner" && target?.role !== "owner") {
    return { success: false, error: "Owner role can only be set by platform support" };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone || null,
      role: input.role,
      department_id: input.departmentId,
      filing_status: input.filingStatus,
      federal_allowances: input.federalAllowances,
      state_allowances: input.stateAllowances,
    })
    .eq("id", profileId);

  if (profileError) return { success: false, error: profileError.message };

  const { data: existingRate } = await admin
    .from("pay_rates")
    .select("id")
    .eq("profile_id", profileId)
    .eq("is_primary", true)
    .single();

  if (existingRate) {
    const { error } = await admin
      .from("pay_rates")
      .update({ type: input.payType, rate: input.payRate })
      .eq("id", existingRate.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await admin.from("pay_rates").insert({
      profile_id: profileId,
      organization_id: input.organizationId,
      type: input.payType,
      rate: input.payRate,
      is_primary: true,
    });
    if (error) return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deactivateEmployee(
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role").eq("id", profileId).single();
  if (target?.role === "owner") return { success: false, error: "Cannot deactivate the owner account" };
  const { error } = await admin.from("profiles").update({ is_active: false }).eq("id", profileId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function reactivateEmployee(
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ is_active: true }).eq("id", profileId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteEmployee(
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role").eq("id", profileId).single();
  if (target?.role === "owner") return { success: false, error: "Cannot delete the owner account" };
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function approveEmployee(
  profileId: string,
  input: {
    role: string;
    departmentId: string | null;
    payType: string;
    payRate: number;
    filingStatus: string;
    federalAllowances: number;
    stateAllowances: number;
    organizationId: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      join_status: "active",
      role: input.role,
      department_id: input.departmentId,
      filing_status: input.filingStatus,
      federal_allowances: input.federalAllowances,
      state_allowances: input.stateAllowances,
      hire_date: toLocalDateString(new Date()),
    })
    .eq("id", profileId);

  if (profileError) return { success: false, error: profileError.message };

  const { error: payError } = await admin.from("pay_rates").insert({
    profile_id: profileId,
    organization_id: input.organizationId,
    type: input.payType,
    rate: input.payRate,
    is_primary: true,
  });

  if (payError) return { success: false, error: payError.message };

  // Get org name for notification
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", input.organizationId)
    .single();

  await admin.from("notifications").insert({
    organization_id: input.organizationId,
    profile_id: profileId,
    type: "approved",
    title: "Welcome!",
    message: `You've been approved to join ${org?.name ?? "the organization"}!`,
    link: "/dashboard",
  });

  return { success: true };
}

export async function rejectEmployee(
  profileId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ join_status: "rejected", organization_id: null })
    .eq("id", profileId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function approvePayrollProvider(
  providerId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("payroll_provider_orgs")
    .update({ status: "active", approved_by: user.id, approved_at: new Date().toISOString() })
    .eq("provider_id", providerId)
    .eq("organization_id", organizationId);
  if (error) return { success: false, error: error.message };

  // Notify the provider
  const { data: org } = await admin.from("organizations").select("name").eq("id", organizationId).single();
  await admin.from("notifications").insert({
    organization_id: organizationId,
    profile_id: providerId,
    type: "payroll_provider_approved",
    title: "Access granted",
    message: `You've been approved to manage payroll for ${org?.name ?? "the organization"}`,
    link: "/payroll-portal",
  });

  return { success: true };
}

export async function denyPayrollProvider(
  providerId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("payroll_provider_orgs")
    .update({ status: "revoked" })
    .eq("provider_id", providerId)
    .eq("organization_id", organizationId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
