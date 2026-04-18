import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalPayrollClient } from "./portal-payroll-client";

export default async function PortalPayrollPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const params = await searchParams;
  const orgId = params.org;
  if (!orgId) redirect("/payroll-portal");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  const [{ data: profile }, { data: link }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).single(),
    admin.from("payroll_provider_orgs").select("status").eq("provider_id", user.id).eq("organization_id", orgId).maybeSingle(),
  ]);
  if (profile?.role !== "payroll_provider" || link?.status !== "active") redirect("/payroll-portal");

  const [{ data: org }, { data: payPeriods }] = await Promise.all([
    admin.from("organizations").select("name, pay_period_type, overtime_threshold_weekly, overtime_multiplier").eq("id", orgId).single(),
    admin.from("pay_periods").select("*").eq("organization_id", orgId).order("start_date", { ascending: false }),
  ]);

  return (
    <PortalPayrollClient
      orgId={orgId}
      orgName={org?.name ?? ""}
      payPeriodType={org?.pay_period_type ?? "biweekly"}
      overtimeThreshold={org?.overtime_threshold_weekly ?? 40}
      overtimeMultiplier={org?.overtime_multiplier ?? 1.5}
      payPeriods={payPeriods ?? []}
    />
  );
}
