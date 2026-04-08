import { createClient } from "@/lib/supabase/server";
import { getGreeting, startOfLocalToday, startOfLocalWeek } from "@/lib/utils";
import { AdminDashboardClient } from "./dashboard-client";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return null;

  const orgId = profile.organization_id;

  const todayStart = startOfLocalToday();
  const weekStart = startOfLocalWeek(todayStart);

  const [
    orgResult,
    totalEmpResult,
    activeResult,
    todayResult,
    ptoResult,
    editResult,
    pendingTimesheetsResult,
    weekResult,
    payPeriodResult,
    ratesResult,
    deptResult,
    upcomingResult,
    offSiteResult,
    jobSitesResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, invite_code, job_sites_enabled")
      .eq("id", orgId)
      .single(),
    // Use select with count instead of head:true so we get data back
    supabase
      .from("profiles")
      .select("id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .eq("join_status", "active"),
    supabase
      .from("time_entries")
      .select(
        "id, profile_id, clock_in, total_break_minutes, profiles!time_entries_profile_id_fkey(first_name, last_name, department_id)"
      )
      .eq("organization_id", orgId)
      .eq("status", "active")
      .is("clock_out", null),
    supabase
      .from("time_entries")
      .select(
        "profile_id, clock_in, clock_out, total_hours, status, profiles!time_entries_profile_id_fkey(first_name, last_name)"
      )
      .eq("organization_id", orgId)
      .gte("clock_in", todayStart.toISOString())
      .order("clock_in", { ascending: false }),
    supabase
      .from("pto_requests")
      .select("id")
      .eq("organization_id", orgId)
      .eq("status", "pending"),
    supabase
      .from("edit_requests")
      .select("id")
      .eq("organization_id", orgId)
      .eq("status", "pending"),
    supabase
      .from("time_entries")
      .select("id")
      .eq("organization_id", orgId)
      .eq("status", "completed"),
    supabase
      .from("time_entries")
      .select("clock_in, clock_out, total_hours, status")
      .eq("organization_id", orgId)
      .gte("clock_in", weekStart.toISOString())
      .in("status", ["completed", "approved", "active"]),
    supabase
      .from("pay_periods")
      .select("end_date, status")
      .eq("organization_id", orgId)
      .eq("status", "open")
      .order("end_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("pay_rates")
      .select("profile_id, rate, type")
      .eq("organization_id", orgId)
      .eq("is_primary", true),
    supabase
      .from("departments")
      .select("id, name")
      .eq("organization_id", orgId),
    supabase
      .from("schedules")
      .select("id, profile_id, start_time, end_time, is_published, profiles!schedules_profile_id_fkey(first_name, last_name)")
      .eq("organization_id", orgId)
      .eq("is_published", true)
      .gte("start_time", todayStart.toISOString())
      .lte("start_time", new Date(Date.now() + 3 * 86400000).toISOString())
      .order("start_time")
      .limit(6),
    supabase.from("time_entries").select("id").eq("organization_id", orgId).eq("clock_in_on_site", false).gte("clock_in", todayStart.toISOString()),
    supabase.from("job_sites").select("*").eq("organization_id", orgId).eq("is_active", true).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
  ]);

  const org = orgResult.data;
  const totalEmployees = totalEmpResult.data ?? [];
  const activeEntries = activeResult.data ?? [];
  const todayEntries = todayResult.data ?? [];
  const pendingPto = ptoResult.data ?? [];
  const pendingEdits = editResult.data ?? [];
  const pendingTimesheets = pendingTimesheetsResult.data ?? [];
  const weekEntries = weekResult.data ?? [];
  const nextPayPeriod = payPeriodResult.data;
  const allPayRates = ratesResult.data ?? [];
  const departments = deptResult.data ?? [];
  const upcomingSchedules = (upcomingResult.data ?? []).map((s: any) => {
    const cap = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
    return {
      id: s.id,
      startTime: s.start_time,
      endTime: s.end_time,
      name: `${cap(s.profiles?.first_name ?? "")} ${cap(s.profiles?.last_name ?? "")}`.trim(),
    };
  });

  // Build pay rate map (hourly rate)
  const rateMap: Record<string, number> = {};
  for (const pr of allPayRates) {
    rateMap[pr.profile_id] =
      pr.type === "salary" ? Number(pr.rate) / 2080 : Number(pr.rate);
  }

  // Dept map
  const deptMap: Record<string, string> = {};
  for (const d of departments) {
    deptMap[d.id] = d.name;
  }

  // Active employees (clocked in)
  const activeNow = activeEntries.map((e: any) => ({
    profileId: e.profile_id,
    timeEntryId: e.id,
    firstName: e.profiles?.first_name ?? "",
    lastName: e.profiles?.last_name ?? "",
    clockIn: e.clock_in,
    payRate: rateMap[e.profile_id] ?? 0,
    departmentName: e.profiles?.department_id
      ? deptMap[e.profiles.department_id] ?? ""
      : "",
    breakMinutes: e.total_break_minutes ?? 0,
  }));

  // Today's hours + labor cost
  const nowMs = Date.now();
  let todayHours = 0;
  let todayLaborCost = 0;
  for (const entry of todayEntries as any[]) {
    if (entry.clock_out && entry.total_hours) {
      todayHours += Number(entry.total_hours);
      todayLaborCost +=
        Number(entry.total_hours) * (rateMap[entry.profile_id] ?? 0);
    } else if (!entry.clock_out) {
      const elapsed =
        (nowMs - new Date(entry.clock_in).getTime()) / 3600000;
      todayHours += Math.max(0, elapsed);
      todayLaborCost +=
        Math.max(0, elapsed) * (rateMap[entry.profile_id] ?? 0);
    }
  }

  // Recent activity
  const recentActivity = (todayEntries as any[])
    .slice(0, 10)
    .flatMap((e: any) => {
      const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
      const name =
        `${cap(e.profiles?.first_name ?? "")} ${cap(e.profiles?.last_name ?? "")}`.trim();
      if (e.clock_out) {
        return [
          { type: "clock_out" as const, name, time: e.clock_out },
          { type: "clock_in" as const, name, time: e.clock_in },
        ];
      }
      return [{ type: "clock_in" as const, name, time: e.clock_in }];
    })
    .sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    )
    .slice(0, 10);

  // Week hours by day
  const weekDayHours: Record<string, number> = {};
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const entry of weekEntries as any[]) {
    const d = new Date(entry.clock_in);
    const dayKey = dayNames[d.getDay()];
    const hours = entry.total_hours
      ? Number(entry.total_hours)
      : entry.status === "active"
        ? Math.max(0, (nowMs - d.getTime()) / 3600000)
        : 0;
    weekDayHours[dayKey] = (weekDayHours[dayKey] ?? 0) + hours;
  }
  const weekData = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
    (day) => ({ day, hours: weekDayHours[day] ?? 0 })
  );

  return (
    <AdminDashboardClient
      greeting={getGreeting()}
      firstName={profile.first_name || ""}
      orgName={org?.name ?? ""}
      totalEmployees={totalEmployees.length}
      activeNow={activeNow}
      todayHours={todayHours}
      todayLaborCost={todayLaborCost}
      pendingTimesheets={pendingTimesheets.length}
      pendingPto={pendingPto.length}
      pendingEdits={pendingEdits.length}
      nextPayPeriod={
        nextPayPeriod ? { endDate: nextPayPeriod.end_date } : null
      }
      recentActivity={recentActivity}
      weekData={weekData}
      upcomingSchedules={upcomingSchedules}
      offSiteToday={(offSiteResult.data ?? []).length}
      jobSites={(jobSitesResult.data ?? []) as any}
      organizationId={orgId}
      jobSitesEnabled={org?.job_sites_enabled ?? false}
    />
  );
}
