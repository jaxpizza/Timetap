import { createClient } from "@/lib/supabase/server";
import { TimesheetClient } from "./timesheet-client";

export default async function TimesheetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();

  const [{ data: entries }, { data: payRate }] = await Promise.all([
    supabase
      .from("time_entries")
      .select("id, clock_in, clock_out, total_hours, total_break_minutes, status, is_overtime, overtime_hours, notes")
      .eq("profile_id", user.id)
      .gte("clock_in", twoWeeksAgo)
      .order("clock_in", { ascending: false }),
    supabase
      .from("pay_rates")
      .select("rate, type")
      .eq("profile_id", user.id)
      .eq("is_primary", true)
      .maybeSingle(),
  ]);

  const hourlyRate = payRate
    ? payRate.type === "salary"
      ? Number(payRate.rate) / 2080
      : Number(payRate.rate)
    : 0;

  return (
    <TimesheetClient
      entries={entries ?? []}
      hourlyRate={hourlyRate}
    />
  );
}
