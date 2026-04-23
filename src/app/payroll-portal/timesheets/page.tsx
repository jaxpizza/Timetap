import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalTimesheetsClient } from "./portal-timesheets-client";

export default async function PortalTimesheetsPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const params = await searchParams;
  const orgId = params.org;
  if (!orgId) redirect("/payroll-portal");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  const [{ data: profile }, { data: link }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).single(),
    admin.from("payroll_provider_orgs").select("status").eq("provider_id", user.id).eq("organization_id", orgId).maybeSingle(),
  ]);
  if (profile?.role !== "payroll_provider" || link?.status !== "active") redirect("/payroll-portal");

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const sel = "id, profile_id, clock_in, clock_out, total_hours, total_break_minutes, status, notes, approved_at, approved_by, clock_in_on_site, clock_out_on_site, profiles!time_entries_profile_id_fkey(first_name, last_name, department_id)";

  const [{ data: pendingEntries }, { data: approvedEntries }, { data: flaggedEntries }, { data: payRates }, { data: departments }, { data: org }, { data: employees }, { data: me }] = await Promise.all([
    admin.from("time_entries").select(sel).eq("organization_id", orgId).eq("status", "completed").order("clock_in", { ascending: false }),
    admin.from("time_entries").select(sel).eq("organization_id", orgId).eq("status", "approved").gte("approved_at", sevenDaysAgo).order("approved_at", { ascending: false }),
    admin.from("time_entries").select(sel).eq("organization_id", orgId).eq("status", "flagged").order("clock_in", { ascending: false }),
    admin.from("pay_rates").select("profile_id, rate, type").eq("organization_id", orgId).eq("is_primary", true),
    admin.from("departments").select("id, name").eq("organization_id", orgId),
    admin.from("organizations").select("name").eq("id", orgId).single(),
    admin.from("profiles").select("id, first_name, last_name, email").eq("organization_id", orgId).eq("is_active", true).eq("join_status", "active").order("last_name"),
    admin.from("profiles").select("first_name, last_name").eq("id", user.id).single(),
  ]);

  const adderName = `${(me?.first_name ?? "").trim()} ${(me?.last_name ?? "").trim()}`.trim() || "Payroll Provider";

  return (
    <PortalTimesheetsClient
      orgId={orgId}
      orgName={org?.name ?? ""}
      pendingEntries={(pendingEntries ?? []) as any}
      approvedEntries={(approvedEntries ?? []) as any}
      flaggedEntries={(flaggedEntries ?? []) as any}
      payRates={payRates ?? []}
      departments={departments ?? []}
      employees={employees ?? []}
      adderName={adderName}
    />
  );
}
