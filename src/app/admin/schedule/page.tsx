import { createClient } from "@/lib/supabase/server";
import { toLocalDateString, startOfLocalWeek } from "@/lib/utils";
import { ScheduleClient } from "./schedule-client";

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single();
  if (!profile?.organization_id) return null;
  if (profile.role === "payroll") {
    const { redirect } = await import("next/navigation");
    redirect("/admin");
  }
  const orgId = profile.organization_id;

  // Current week Sun-Sat
  const weekStart = startOfLocalWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const [{ data: schedules }, { data: employees }, { data: departments }, { data: ptoRequests }] = await Promise.all([
    supabase.from("schedules")
      .select("id, profile_id, start_time, end_time, is_published, notes, department_id")
      .eq("organization_id", orgId)
      .gte("start_time", weekStart.toISOString())
      .lte("start_time", weekEnd.toISOString())
      .order("start_time"),
    supabase.from("profiles")
      .select("id, first_name, last_name, department_id")
      .eq("organization_id", orgId).eq("is_active", true).eq("join_status", "active")
      .order("first_name"),
    supabase.from("departments").select("id, name, color").eq("organization_id", orgId),
    supabase.from("pto_requests")
      .select("profile_id, start_date, end_date, pto_policies(name)")
      .eq("organization_id", orgId).eq("status", "approved")
      .lte("start_date", toLocalDateString(weekEnd))
      .gte("end_date", toLocalDateString(weekStart)),
  ]);

  return (
    <ScheduleClient
      schedules={schedules ?? []}
      employees={employees ?? []}
      departments={departments ?? []}
      ptoRequests={(ptoRequests ?? []) as any}
      organizationId={orgId}
      initialWeekStart={weekStart.toISOString()}
    />
  );
}
