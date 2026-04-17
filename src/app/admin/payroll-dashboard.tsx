import { createClient } from "@/lib/supabase/server";
import { getGreeting } from "@/lib/utils";
import { PayrollDashboardClient } from "./payroll-dashboard-client";

export async function PayrollDashboard({ userId, orgId, firstName }: { userId: string; orgId: string; firstName: string }) {
  const supabase = await createClient();

  const [
    { data: openPeriod },
    { data: recentPayPeriods },
    { data: employeeCount },
    { data: pendingTimesheets },
    { data: org },
    { data: myEntry },
    { data: myBreak },
    { data: myPayRate },
  ] = await Promise.all([
    supabase.from("pay_periods").select("*").eq("organization_id", orgId).in("status", ["open", "locked", "processing"]).order("start_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("pay_periods").select("*").eq("organization_id", orgId).eq("status", "completed").order("end_date", { ascending: false }).limit(3),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_active", true).eq("join_status", "active"),
    supabase.from("time_entries").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "completed"),
    supabase.from("organizations").select("overtime_threshold_weekly, name").eq("id", orgId).single(),
    supabase.from("time_entries").select("id, clock_in, total_break_minutes").eq("profile_id", userId).eq("status", "active").is("clock_out", null).maybeSingle(),
    supabase.from("breaks").select("id, start_time").eq("profile_id", userId).is("end_time", null).order("start_time", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("pay_rates").select("rate, type").eq("profile_id", userId).eq("is_primary", true).maybeSingle(),
  ]);

  // Calculate period-wide stats if there's an open period
  let periodHours = 0;
  let periodOvertimeHours = 0;
  let estimatedPayroll = 0;
  let overtimeEmployees: { name: string; hours: number }[] = [];

  if (openPeriod) {
    const { data: entries } = await supabase
      .from("time_entries")
      .select("profile_id, total_hours, overtime_hours, profiles!time_entries_profile_id_fkey(first_name, last_name)")
      .eq("organization_id", orgId)
      .in("status", ["completed", "approved"])
      .gte("clock_in", openPeriod.start_date + "T00:00:00")
      .lte("clock_in", openPeriod.end_date + "T23:59:59");

    const { data: rates } = await supabase
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

      const prof = (e.profiles as any);
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

  const myHourlyRate = myPayRate ? (myPayRate.type === "salary" ? Number(myPayRate.rate) / 2080 : Number(myPayRate.rate)) : 0;

  return (
    <PayrollDashboardClient
      greeting={getGreeting()}
      firstName={firstName}
      orgName={org?.name ?? ""}
      openPeriod={openPeriod ? { id: openPeriod.id, startDate: openPeriod.start_date, endDate: openPeriod.end_date, status: openPeriod.status } : null}
      periodHours={periodHours}
      periodOvertimeHours={periodOvertimeHours}
      estimatedPayroll={estimatedPayroll}
      pendingTimesheetsCount={pendingTimesheets?.length ?? 0}
      employeeCount={employeeCount?.length ?? 0}
      recentPayPeriods={(recentPayPeriods ?? []).map((p: any) => ({
        id: p.id, startDate: p.start_date, endDate: p.end_date,
        totalGross: Number(p.total_gross_pay ?? 0), totalHours: Number(p.total_hours ?? 0),
      }))}
      overtimeEmployees={overtimeEmployees}
      overtimeThreshold={org?.overtime_threshold_weekly ?? 40}
      myClockEntry={myEntry ? { id: myEntry.id, clock_in: myEntry.clock_in, total_break_minutes: myEntry.total_break_minutes ?? 0 } : null}
      myClockBreak={myBreak ? { id: myBreak.id, start_time: myBreak.start_time } : null}
      myHourlyRate={myHourlyRate}
    />
  );
}
