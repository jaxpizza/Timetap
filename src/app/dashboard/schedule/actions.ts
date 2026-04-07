"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { toLocalDateString } from "@/lib/utils";

export async function getEmployeeSchedules(
  rangeStart: string,
  rangeEnd: string
) {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("schedules")
    .select("id, start_time, end_time, department_id, notes, departments(name, color)")
    .eq("profile_id", user.id)
    .eq("is_published", true)
    .gte("start_time", rangeStart)
    .lte("start_time", rangeEnd)
    .order("start_time");

  return data ?? [];
}

export async function getEmployeePTO(
  rangeStart: string,
  rangeEnd: string
) {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("pto_requests")
    .select("id, pto_policy_id, start_date, end_date, total_hours, status, pto_policies(name, color)")
    .eq("profile_id", user.id)
    .eq("status", "approved")
    .gte("end_date", toLocalDateString(new Date(rangeStart)))
    .lte("start_date", toLocalDateString(new Date(rangeEnd)));

  return data ?? [];
}
