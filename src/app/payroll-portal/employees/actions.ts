"use server";

import { verifyPayrollProvider } from "@/lib/payroll-provider/verify";

export async function updateEmployeePayInfo(input: {
  organizationId: string;
  profileId: string;
  payType: string;
  payRate: number;
  filingStatus: string;
  federalAllowances: number;
  stateAllowances: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { admin } = await verifyPayrollProvider(input.organizationId);

    // Verify target belongs to this org
    const { data: target } = await admin
      .from("profiles")
      .select("organization_id")
      .eq("id", input.profileId)
      .single();
    if (target?.organization_id !== input.organizationId) {
      return { success: false, error: "Employee does not belong to this organization" };
    }

    // Update tax-related fields only — payroll provider may NOT edit role, name, email, department, status
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        filing_status: input.filingStatus,
        federal_allowances: input.federalAllowances,
        state_allowances: input.stateAllowances,
      })
      .eq("id", input.profileId);

    if (profileError) return { success: false, error: profileError.message };

    // Upsert pay rate
    const { data: existingRate } = await admin
      .from("pay_rates")
      .select("id")
      .eq("profile_id", input.profileId)
      .eq("is_primary", true)
      .maybeSingle();

    if (existingRate) {
      const { error } = await admin
        .from("pay_rates")
        .update({ type: input.payType, rate: input.payRate })
        .eq("id", existingRate.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await admin.from("pay_rates").insert({
        profile_id: input.profileId,
        organization_id: input.organizationId,
        type: input.payType,
        rate: input.payRate,
        is_primary: true,
      });
      if (error) return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Unauthorized" };
  }
}
