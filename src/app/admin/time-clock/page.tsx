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

  const [{ data: activeEntries }, { data: payRates }, { data: locations }, { data: recentClockIns }, { data: jobSites }, { data: employees }, { data: me }] = await Promise.all([
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
    supabase.from("profiles").select("id, first_name, last_name, email").eq("organization_id", orgId).eq("is_active", true).eq("join_status", "active").order("last_name"),
    supabase.from("profiles").select("first_name, last_name").eq("id", user.id).single(),
  ]);

  const adderName = `${(me?.first_name ?? "").trim()} ${(me?.last_name ?? "").trim()}`.trim() || "Admin";

  return (
    <TimeClockClient
      activeEntries={(activeEntries ?? []) as any}
      payRates={payRates ?? []}
      locations={locations ?? []}
      recentClockIns={(recentClockIns ?? []) as any}
      jobSites={(jobSites ?? []) as any}
      employees={employees ?? []}
      adderName={adderName}
      organizationId={orgId}
    />
  );
}
