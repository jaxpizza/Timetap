"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

export async function approvePTORequest(
  requestId: string,
  profileId: string,
  ptoPolicyId: string,
  totalHours: number,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();

  const { error } = await admin.from("pto_requests").update({
    status: "approved",
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }).eq("id", requestId);
  if (error) return { success: false, error: error.message };

  // Update balance: pending → used
  const { data: bal } = await admin.from("pto_balances").select("id, balance_hours, used_hours, pending_hours")
    .eq("profile_id", profileId).eq("pto_policy_id", ptoPolicyId).single();

  if (bal) {
    await admin.from("pto_balances").update({
      balance_hours: Math.max(0, (bal.balance_hours ?? 0) - totalHours),
      used_hours: (bal.used_hours ?? 0) + totalHours,
      pending_hours: Math.max(0, (bal.pending_hours ?? 0) - totalHours),
    }).eq("id", bal.id);
  }

  // Remove conflicting schedules during the PTO period
  if (startDate && endDate) {
    const ptoStart = `${startDate}T00:00:00`;
    const ptoEnd = `${endDate}T23:59:59`;
    await admin
      .from("schedules")
      .delete()
      .eq("profile_id", profileId)
      .gte("start_time", ptoStart)
      .lte("start_time", ptoEnd);
  }

  // Notify the employee
  const { data: policy } = await admin.from("pto_policies").select("name").eq("id", ptoPolicyId).single();
  const { data: org } = await admin.from("organizations").select("id").eq("id", requestId).maybeSingle();
  // Get orgId from the request itself
  const { data: req } = await admin.from("pto_requests").select("organization_id").eq("id", requestId).single();
  if (req) {
    createNotification({
      organizationId: req.organization_id,
      profileId,
      type: "pto_approved",
      title: "PTO Approved",
      message: `Your ${policy?.name ?? "PTO"} request for ${startDate ?? ""}${endDate ? ` – ${endDate}` : ""} has been approved`,
      link: "/dashboard/pto",
    }).catch(() => {});
  }

  return { success: true };
}

export async function denyPTORequest(
  requestId: string,
  profileId: string,
  ptoPolicyId: string,
  totalHours: number,
  reviewNote: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();

  const { error } = await admin.from("pto_requests").update({
    status: "denied",
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    review_note: reviewNote || null,
  }).eq("id", requestId);
  if (error) return { success: false, error: error.message };

  // Remove from pending
  const { data: bal } = await admin.from("pto_balances").select("id, pending_hours")
    .eq("profile_id", profileId).eq("pto_policy_id", ptoPolicyId).single();
  if (bal) {
    await admin.from("pto_balances").update({
      pending_hours: Math.max(0, (bal.pending_hours ?? 0) - totalHours),
    }).eq("id", bal.id);
  }

  // Notify the employee
  const { data: req } = await admin.from("pto_requests").select("organization_id, start_date, end_date, pto_policies(name)").eq("id", requestId).single();
  if (req) {
    createNotification({
      organizationId: (req as any).organization_id,
      profileId,
      type: "pto_denied",
      title: "PTO Denied",
      message: `Your ${(req as any).pto_policies?.name ?? "PTO"} request was denied${reviewNote ? `. Reason: ${reviewNote}` : ""}`,
      link: "/dashboard/pto",
    }).catch(() => {});
  }

  return { success: true };
}

export async function createPTOPolicy(input: {
  name: string; accrualRate: number; maxBalance: number | null; color: string; organizationId: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("pto_policies").insert({
    organization_id: input.organizationId,
    name: input.name,
    accrual_rate: input.accrualRate,
    max_balance: input.maxBalance,
    color: input.color,
  }).select("id").single();
  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function deletePTOPolicy(policyId: string): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("pto_policies").delete().eq("id", policyId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function assignPTOBalance(input: {
  profileId: string; ptoPolicyId: string; balanceHours: number; organizationId: string;
}): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("pto_balances").select("id")
    .eq("profile_id", input.profileId).eq("pto_policy_id", input.ptoPolicyId).single();

  if (existing) {
    const { error } = await admin.from("pto_balances").update({ balance_hours: input.balanceHours }).eq("id", existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await admin.from("pto_balances").insert({
      profile_id: input.profileId,
      pto_policy_id: input.ptoPolicyId,
      organization_id: input.organizationId,
      balance_hours: input.balanceHours,
    });
    if (error) return { success: false, error: error.message };
  }
  return { success: true };
}
