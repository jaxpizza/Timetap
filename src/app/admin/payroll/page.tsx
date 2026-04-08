import { createClient } from "@/lib/supabase/server";
import { PayrollClient } from "./payroll-client";

export default async function PayrollPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single();
  if (!profile?.organization_id) return null;
  if (profile.role !== "owner" && profile.role !== "admin") {
    const { redirect } = await import("next/navigation");
    redirect("/admin");
  }
  const orgId = profile.organization_id;

  const [{ data: org }, { data: payPeriods }] = await Promise.all([
    supabase.from("organizations").select("pay_period_type, overtime_threshold_weekly, overtime_multiplier").eq("id", orgId).single(),
    supabase.from("pay_periods").select("*").eq("organization_id", orgId).order("start_date", { ascending: false }),
  ]);

  return (
    <PayrollClient
      organizationId={orgId}
      payPeriodType={org?.pay_period_type ?? "biweekly"}
      overtimeThreshold={org?.overtime_threshold_weekly ?? 40}
      overtimeMultiplier={org?.overtime_multiplier ?? 1.5}
      payPeriods={payPeriods ?? []}
    />
  );
}
