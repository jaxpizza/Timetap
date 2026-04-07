import { createClient } from "@/lib/supabase/server";
import { getGreeting } from "@/lib/utils";
import { ClockClient } from "./clock-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: activeEntry }, { data: payRate }, { data: lastEntry }, { data: weekEntries }, { data: activeBreak }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("first_name, last_name, organization_id")
        .eq("id", user.id)
        .single(),
      supabase
        .from("time_entries")
        .select("*")
        .eq("profile_id", user.id)
        .eq("status", "active")
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("pay_rates")
        .select("rate, type")
        .eq("profile_id", user.id)
        .eq("is_primary", true)
        .maybeSingle(),
      supabase
        .from("time_entries")
        .select("clock_in, total_hours")
        .eq("profile_id", user.id)
        .eq("status", "completed")
        .order("clock_in", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("time_entries")
        .select("total_hours")
        .eq("profile_id", user.id)
        .in("status", ["completed", "approved"])
        .gte("clock_in", new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase
        .from("breaks")
        .select("id, start_time")
        .eq("profile_id", user.id)
        .is("end_time", null)
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const weekHours =
    weekEntries?.reduce((sum, e) => sum + (e.total_hours ?? 0), 0) ?? 0;

  return (
    <ClockClient
      greeting={getGreeting()}
      firstName={profile?.first_name ?? ""}
      activeEntry={activeEntry}
      activeBreak={activeBreak}
      payRate={payRate?.rate ?? null}
      payType={payRate?.type ?? "hourly"}
      lastShift={
        lastEntry
          ? {
              date: lastEntry.clock_in,
              hours: lastEntry.total_hours ?? 0,
            }
          : null
      }
      weekHours={weekHours}
    />
  );
}
