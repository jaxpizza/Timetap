import { createClient } from "@/lib/supabase/server";
import { startOfLocalWeek, calculateDistance } from "@/lib/utils";
import { addDays } from "date-fns";
import { EmployeeProfileClient } from "./employee-profile-client";

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: adminProfile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!adminProfile?.organization_id) return null;
  const orgId = adminProfile.organization_id;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const weekStart = startOfLocalWeek(now);
  const weekEnd = addDays(weekStart, 6);
  weekEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    { data: profile },
    { data: payRate },
    { data: timeEntries },
    { data: ptoBalances },
    { data: schedules },
    { data: locations },
    { data: jobSites },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, departments(name, color)")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single(),
    supabase
      .from("pay_rates")
      .select("rate, type")
      .eq("profile_id", id)
      .eq("organization_id", orgId)
      .eq("is_primary", true)
      .maybeSingle(),
    supabase
      .from("time_entries")
      .select("id, clock_in, clock_out, total_hours, total_break_minutes, status, notes, clock_in_latitude, clock_in_longitude, clock_in_on_site, clock_out_latitude, clock_out_longitude, clock_out_on_site")
      .eq("profile_id", id)
      .eq("organization_id", orgId)
      .gte("clock_in", thirtyDaysAgo.toISOString())
      .in("status", ["completed", "approved", "flagged", "active"])
      .order("clock_in", { ascending: false }),
    supabase
      .from("pto_balances")
      .select("*, pto_policies(name, color, max_balance)")
      .eq("profile_id", id),
    supabase
      .from("schedules")
      .select("id, start_time, end_time, departments(name, color)")
      .eq("profile_id", id)
      .eq("is_published", true)
      .gte("start_time", weekStart.toISOString())
      .lte("start_time", weekEnd.toISOString())
      .order("start_time"),
    supabase
      .from("locations")
      .select("id, name, latitude, longitude, radius_meters")
      .eq("organization_id", orgId)
      .eq("is_active", true),
    supabase
      .from("job_sites")
      .select("id, name, latitude, longitude, radius_meters, starts_at, expires_at")
      .eq("organization_id", orgId),
  ]);

  if (!profile) return null;

  // Calculate nearest location (permanent + active job sites) for each time entry
  const entriesWithLocation = (timeEntries ?? []).map((entry: any) => {
    let nearestLocation: { name: string; distanceMeters: number; onSite: boolean } | null = null;

    if (entry.clock_in_latitude && entry.clock_in_longitude) {
      let minDist = Infinity;
      let minName = "";
      let minRadius = 402;
      const clockInTime = new Date(entry.clock_in).getTime();

      // Check permanent locations
      for (const loc of locations ?? []) {
        if (!loc.latitude || !loc.longitude) continue;
        const dist = calculateDistance(entry.clock_in_latitude, entry.clock_in_longitude, Number(loc.latitude), Number(loc.longitude));
        if (dist < minDist) { minDist = dist; minName = loc.name; minRadius = Number(loc.radius_meters ?? 402); }
      }

      // Check job sites that were active at the time of this clock-in
      for (const site of jobSites ?? []) {
        const startsAt = new Date(site.starts_at).getTime();
        const expiresAt = new Date(site.expires_at).getTime();
        if (clockInTime >= startsAt && clockInTime <= expiresAt) {
          const dist = calculateDistance(entry.clock_in_latitude, entry.clock_in_longitude, Number(site.latitude), Number(site.longitude));
          if (dist < minDist) { minDist = dist; minName = site.name; minRadius = Number(site.radius_meters ?? 122); }
        }
      }

      if (minName) {
        nearestLocation = { name: minName, distanceMeters: Math.round(minDist), onSite: minDist <= minRadius };
      }
    }

    // Also pass which job sites were active for this entry (for the map)
    const clockInTime = new Date(entry.clock_in).getTime();
    const activeJobSites = (jobSites ?? []).filter((s: any) => {
      const startsAt = new Date(s.starts_at).getTime();
      const expiresAt = new Date(s.expires_at).getTime();
      return clockInTime >= startsAt && clockInTime <= expiresAt;
    }).map((s: any) => ({
      lat: Number(s.latitude), lng: Number(s.longitude), name: s.name, radiusMeters: Number(s.radius_meters ?? 122),
    }));

    return { ...entry, nearestLocation, activeJobSites };
  });

  // Compute stats
  const weekEntries = (timeEntries ?? []).filter((e: any) =>
    new Date(e.clock_in) >= weekStart && e.total_hours
  );
  const monthEntries = (timeEntries ?? []).filter((e: any) =>
    new Date(e.clock_in) >= monthStart && e.total_hours
  );
  const weekHours = weekEntries.reduce((s: number, e: any) => s + (e.total_hours ?? 0), 0);
  const monthHours = monthEntries.reduce((s: number, e: any) => s + (e.total_hours ?? 0), 0);
  const workingDays = new Set(monthEntries.map((e: any) => new Date(e.clock_in).toDateString())).size;
  const avgPerDay = workingDays > 0 ? monthHours / workingDays : 0;
  const offSiteCount = (timeEntries ?? []).filter((e: any) => e.clock_in_on_site === false).length;

  const hourlyRate = payRate
    ? payRate.type === "salary" ? Number(payRate.rate) / 2080 : Number(payRate.rate)
    : 0;

  return (
    <EmployeeProfileClient
      profile={profile as any}
      payRate={payRate as any}
      hourlyRate={hourlyRate}
      entries={entriesWithLocation}
      ptoBalances={(ptoBalances ?? []) as any}
      schedules={(schedules ?? []) as any}
      locations={(locations ?? []).map((l: any) => ({
        lat: Number(l.latitude),
        lng: Number(l.longitude),
        name: l.name,
        radiusMeters: l.radius_meters ?? 402,
      }))}
      stats={{ weekHours, monthHours, avgPerDay, offSiteCount }}
    />
  );
}
