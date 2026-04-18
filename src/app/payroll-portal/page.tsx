import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalCompanyGrid } from "./portal-company-grid";
import { PortalDashboardClient } from "./portal-dashboard-client";

export default async function PortalRootPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const params = await searchParams;
  const orgId = params.org;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  // Verify provider role and fetch linked orgs
  const { data: profile } = await admin
    .from("profiles")
    .select("role, first_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "payroll_provider") redirect("/dashboard");

  const { data: links } = await admin
    .from("payroll_provider_orgs")
    .select("organization_id")
    .eq("provider_id", user.id)
    .eq("status", "active");

  const orgIds = (links ?? []).map((l: any) => l.organization_id).filter(Boolean);

  let orgs: { id: string; name: string }[] = [];
  if (orgIds.length > 0) {
    const { data: orgRows } = await admin
      .from("organizations")
      .select("id, name")
      .in("id", orgIds);
    orgs = (orgRows ?? []).map((o: any) => ({ id: o.id, name: o.name ?? "" }));
  }

  // No org selected → show company grid with employee counts & last payroll
  if (!orgId) {
    const enriched = await Promise.all(
      orgs.map(async (o) => {
        const [{ count: employeeCount }, { data: lastPeriod }] = await Promise.all([
          admin.from("profiles").select("id", { count: "exact", head: true }).eq("organization_id", o.id).eq("is_active", true).eq("join_status", "active"),
          admin.from("pay_periods").select("end_date, total_gross_pay").eq("organization_id", o.id).eq("status", "completed").order("end_date", { ascending: false }).limit(1).maybeSingle(),
        ]);
        return {
          ...o,
          employeeCount: employeeCount ?? 0,
          lastPayrollDate: lastPeriod?.end_date ?? null,
          lastPayrollGross: Number(lastPeriod?.total_gross_pay ?? 0),
        };
      })
    );
    return <PortalCompanyGrid orgs={enriched} />;
  }

  // Verify the orgId is one the provider has access to
  const authorized = orgs.some((o) => o.id === orgId);
  if (!authorized) redirect("/payroll-portal");

  // Fetch dashboard stats
  const [
    { data: openPeriod },
    { data: recentPayPeriods },
    { count: employeeCount },
    { count: pendingTimesheets },
    { data: org },
  ] = await Promise.all([
    admin.from("pay_periods").select("*").eq("organization_id", orgId).in("status", ["open", "locked", "processing"]).order("start_date", { ascending: false }).limit(1).maybeSingle(),
    admin.from("pay_periods").select("*").eq("organization_id", orgId).eq("status", "completed").order("end_date", { ascending: false }).limit(3),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_active", true).eq("join_status", "active"),
    admin.from("time_entries").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "completed"),
    admin.from("organizations").select("overtime_threshold_weekly, name").eq("id", orgId).single(),
  ]);

  let periodHours = 0;
  let periodOvertimeHours = 0;
  let estimatedPayroll = 0;
  let overtimeEmployees: { name: string; hours: number }[] = [];

  if (openPeriod) {
    const { data: entries } = await admin
      .from("time_entries")
      .select("profile_id, total_hours, overtime_hours, profiles!time_entries_profile_id_fkey(first_name, last_name)")
      .eq("organization_id", orgId)
      .in("status", ["completed", "approved"])
      .gte("clock_in", openPeriod.start_date + "T00:00:00")
      .lte("clock_in", openPeriod.end_date + "T23:59:59");

    const { data: rates } = await admin
      .from("pay_rates")
      .select("profile_id, rate, type")
      .eq("organization_id", orgId)
      .eq("is_primary", true);

    const rateMap = new Map<string, number>();
    for (const pr of rates ?? []) rateMap.set(pr.profile_id, pr.type === "salary" ? Number(pr.rate) / 2080 : Number(pr.rate));

    const hoursByEmployee = new Map<string, { name: string; hours: number }>();
    for (const e of entries ?? []) {
      const hrs = Number(e.total_hours ?? 0);
      periodHours += hrs;
      periodOvertimeHours += Number(e.overtime_hours ?? 0);
      const rate = rateMap.get(e.profile_id) ?? 0;
      estimatedPayroll += hrs * rate;
      const prof = e.profiles as any;
      const name = prof ? `${prof.first_name ?? ""} ${prof.last_name ?? ""}`.trim() : "Employee";
      const existing = hoursByEmployee.get(e.profile_id) ?? { name, hours: 0 };
      existing.hours += hrs;
      hoursByEmployee.set(e.profile_id, existing);
    }

    const threshold = org?.overtime_threshold_weekly ?? 40;
    overtimeEmployees = Array.from(hoursByEmployee.values())
      .filter((e) => e.hours >= threshold * 0.9)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8);
  }

  return (
    <PortalDashboardClient
      orgId={orgId}
      orgName={org?.name ?? ""}
      providerFirstName={profile?.first_name ?? ""}
      openPeriod={openPeriod ? { id: openPeriod.id, startDate: openPeriod.start_date, endDate: openPeriod.end_date, status: openPeriod.status } : null}
      periodHours={periodHours}
      periodOvertimeHours={periodOvertimeHours}
      estimatedPayroll={estimatedPayroll}
      pendingTimesheetsCount={pendingTimesheets ?? 0}
      employeeCount={employeeCount ?? 0}
      recentPayPeriods={(recentPayPeriods ?? []).map((p: any) => ({
        id: p.id,
        startDate: p.start_date,
        endDate: p.end_date,
        totalGross: Number(p.total_gross_pay ?? 0),
        totalHours: Number(p.total_hours ?? 0),
      }))}
      overtimeEmployees={overtimeEmployees}
      overtimeThreshold={org?.overtime_threshold_weekly ?? 40}
    />
  );
}
