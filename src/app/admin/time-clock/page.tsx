import { createClient } from "@/lib/supabase/server";
import { TimeClockClient } from "./time-clock-client";

export default async function TimeClockPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) return null;
  const orgId = profile.organization_id;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [{ data: activeEntries }, { data: payRates }, { data: locations }, { data: recentClockIns }, { data: jobSites }, { data: myEntry }, { data: myBreak }] = await Promise.all([
    supabase.from("time_entries")
      .select("id, profile_id, clock_in, total_break_minutes, clock_in_on_site, clock_in_latitude, clock_in_longitude, profiles!time_entries_profile_id_fkey(first_name, last_name, department_id, departments(name))")
      .eq("organization_id", orgId).eq("status", "active").is("clock_out", null).order("clock_in"),
    supabase.from("pay_rates").select("profile_id, rate, type").eq("organization_id", orgId).eq("is_primary", true),
    supabase.from("locations").select("id, name, latitude, longitude, radius_meters").eq("organization_id", orgId).eq("is_active", true),
    supabase.from("time_entries")
      .select("id, profile_id, clock_in, clock_in_latitude, clock_in_longitude, clock_in_on_site, profiles!time_entries_profile_id_fkey(first_name, last_name)")
      .eq("organization_id", orgId).gte("clock_in", weekStart.toISOString())
      .not("clock_in_latitude", "is", null)
      .order("clock_in", { ascending: false }).limit(50),
    supabase.from("job_sites").select("id, name, latitude, longitude, radius_meters, expires_at")
      .eq("organization_id", orgId).eq("is_active", true).gt("expires_at", new Date().toISOString()),
    supabase.from("time_entries").select("id, clock_in, total_break_minutes")
      .eq("profile_id", user.id).eq("status", "active").is("clock_out", null).maybeSingle(),
    supabase.from("breaks").select("id, start_time")
      .eq("profile_id", user.id).is("end_time", null).order("start_time", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const myPayRate = (payRates ?? []).find((r: any) => r.profile_id === user.id);
  const myHourlyRate = myPayRate ? (myPayRate.type === "salary" ? Number(myPayRate.rate) / 2080 : Number(myPayRate.rate)) : 0;

  return (
    <TimeClockClient
      activeEntries={(activeEntries ?? []) as any}
      payRates={payRates ?? []}
      locations={locations ?? []}
      recentClockIns={(recentClockIns ?? []) as any}
      jobSites={(jobSites ?? []) as any}
      myEntry={myEntry ? { id: myEntry.id, clock_in: myEntry.clock_in, total_break_minutes: myEntry.total_break_minutes ?? 0 } : null}
      myBreak={myBreak ? { id: myBreak.id, start_time: myBreak.start_time } : null}
      myHourlyRate={myHourlyRate}
    />
  );
}
