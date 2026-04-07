"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requestPTO(input: {
  ptoPolicyId: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  note: string;
  organizationId: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();

  const { error: reqError } = await admin.from("pto_requests").insert({
    profile_id: user.id,
    organization_id: input.organizationId,
    pto_policy_id: input.ptoPolicyId,
    start_date: input.startDate,
    end_date: input.endDate,
    total_hours: input.totalHours,
    note: input.note || null,
    status: "pending",
  });

  if (reqError) return { success: false, error: reqError.message };

  // Update pending hours on balance
  const { data: balance } = await admin
    .from("pto_balances")
    .select("id, pending_hours")
    .eq("profile_id", user.id)
    .eq("pto_policy_id", input.ptoPolicyId)
    .single();

  if (balance) {
    await admin.from("pto_balances").update({
      pending_hours: (balance.pending_hours ?? 0) + input.totalHours,
    }).eq("id", balance.id);
  }

  return { success: true };
}

export async function cancelPTORequest(
  requestId: string,
  ptoPolicyId: string,
  totalHours: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();

  const { error } = await admin
    .from("pto_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId);

  if (error) return { success: false, error: error.message };

  // Reduce pending hours
  const { data: balance } = await admin
    .from("pto_balances")
    .select("id, pending_hours")
    .eq("profile_id", user.id)
    .eq("pto_policy_id", ptoPolicyId)
    .single();

  if (balance) {
    await admin.from("pto_balances").update({
      pending_hours: Math.max(0, (balance.pending_hours ?? 0) - totalHours),
    }).eq("id", balance.id);
  }

  return { success: true };
}
