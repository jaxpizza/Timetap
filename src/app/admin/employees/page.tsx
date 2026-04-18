import { createClient } from "@/lib/supabase/server";
import { EmployeesClient } from "./employees-client";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return null;

  const orgId = profile.organization_id;

  const [
    { data: org },
    { data: activeEmployees },
    { data: pendingEmployees },
    { data: payRates },
    { data: departments },
    { data: pendingProviders },
  ] = await Promise.all([
    supabase.from("organizations").select("invite_code").eq("id", orgId).single(),
    supabase
      .from("profiles")
      .select("*")
      .eq("organization_id", orgId)
      .eq("join_status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("*")
      .eq("organization_id", orgId)
      .eq("join_status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("pay_rates")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_primary", true),
    supabase.from("departments").select("*").eq("organization_id", orgId),
    supabase
      .from("payroll_provider_orgs")
      .select("id, provider_id, status, created_at, profiles!payroll_provider_orgs_provider_id_fkey(id, first_name, last_name, email)")
      .eq("organization_id", orgId)
      .eq("status", "pending"),
  ]);

  return (
    <EmployeesClient
      employees={activeEmployees ?? []}
      pendingEmployees={pendingEmployees ?? []}
      payRates={payRates ?? []}
      departments={departments ?? []}
      organizationId={orgId}
      currentUserId={user.id}
      inviteCode={org?.invite_code ?? ""}
      pendingProviders={(pendingProviders ?? []) as any}
    />
  );
}
