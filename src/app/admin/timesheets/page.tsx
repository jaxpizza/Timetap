import { createClient } from "@/lib/supabase/server";
import { TimesheetsClient } from "./timesheets-client";

export default async function TimesheetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) return null;

  const orgId = profile.organization_id;
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const sel = "id, profile_id, clock_in, clock_out, total_hours, total_break_minutes, status, notes, approved_at, approved_by, clock_in_on_site, clock_out_on_site, profiles!time_entries_profile_id_fkey(first_name, last_name, department_id)";

  const [{ data: pendingEntries }, { data: approvedEntries }, { data: flaggedEntries }, { data: payRates }, { data: departments }, { data: employees }, { data: me }] = await Promise.all([
    supabase.from("time_entries").select(sel).eq("organization_id", orgId).eq("status", "completed").order("clock_in", { ascending: false }),
    supabase.from("time_entries").select(sel).eq("organization_id", orgId).eq("status", "approved").gte("approved_at", sevenDaysAgo).order("approved_at", { ascending: false }),
    supabase.from("time_entries").select(sel).eq("organization_id", orgId).eq("status", "flagged").order("clock_in", { ascending: false }),
    supabase.from("pay_rates").select("profile_id, rate, type").eq("organization_id", orgId).eq("is_primary", true),
    supabase.from("departments").select("id, name").eq("organization_id", orgId),
    supabase.from("profiles").select("id, first_name, last_name, email").eq("organization_id", orgId).eq("is_active", true).eq("join_status", "active").order("last_name"),
    supabase.from("profiles").select("first_name, last_name").eq("id", user.id).single(),
  ]);

  const adderName = `${(me?.first_name ?? "").trim()} ${(me?.last_name ?? "").trim()}`.trim() || "Admin";

  return (
    <TimesheetsClient
      pendingEntries={(pendingEntries ?? []) as any}
      approvedEntries={(approvedEntries ?? []) as any}
      flaggedEntries={(flaggedEntries ?? []) as any}
      payRates={payRates ?? []}
      departments={departments ?? []}
      employees={employees ?? []}
      adderName={adderName}
      organizationId={orgId}
    />
  );
}
