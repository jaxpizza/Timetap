import { createClient } from "@/lib/supabase/server";
import { ScheduleClient } from "./schedule-client";
import { addDays } from "date-fns";
import { toLocalDateString, startOfLocalWeek } from "@/lib/utils";

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const weekStart = startOfLocalWeek(new Date());
  const twoWeeksEnd = addDays(weekStart, 13);
  twoWeeksEnd.setHours(23, 59, 59, 999);

  const [{ data: schedules }, { data: ptoRequests }, { data: profile }] = await Promise.all([
    supabase.from("schedules")
      .select("id, start_time, end_time, department_id, notes, departments(name, color)")
      .eq("profile_id", user.id)
      .eq("is_published", true)
      .gte("start_time", weekStart.toISOString())
      .lte("start_time", twoWeeksEnd.toISOString())
      .order("start_time"),
    supabase.from("pto_requests")
      .select("id, pto_policy_id, start_date, end_date, total_hours, status, pto_policies(name, color)")
      .eq("profile_id", user.id)
      .eq("status", "approved")
      .gte("end_date", toLocalDateString(weekStart))
      .lte("start_date", toLocalDateString(twoWeeksEnd)),
    supabase.from("profiles").select("organization_id").eq("id", user.id).single(),
  ]);

  return (
    <ScheduleClient
      schedules={(schedules ?? []) as any}
      ptoRequests={(ptoRequests ?? []) as any}
      weekStartIso={weekStart.toISOString()}
    />
  );
}
