import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalEmployeesClient } from "./portal-employees-client";

export default async function PortalEmployeesPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const params = await searchParams;
  const orgId = params.org;
  if (!orgId) redirect("/payroll-portal");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  // Verify provider + active link
  const [{ data: profile }, { data: link }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).single(),
    admin.from("payroll_provider_orgs").select("status").eq("provider_id", user.id).eq("organization_id", orgId).maybeSingle(),
  ]);
  if (profile?.role !== "payroll_provider" || link?.status !== "active") {
    redirect("/payroll-portal");
  }

  const [{ data: employees }, { data: payRates }, { data: departments }, { data: org }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, first_name, last_name, email, phone, role, department_id, is_active, filing_status, federal_allowances, state_allowances, hire_date")
      .eq("organization_id", orgId)
      .eq("join_status", "active")
      .order("last_name"),
    admin.from("pay_rates").select("profile_id, rate, type").eq("organization_id", orgId).eq("is_primary", true),
    admin.from("departments").select("id, name").eq("organization_id", orgId),
    admin.from("organizations").select("name").eq("id", orgId).single(),
  ]);

  return (
    <PortalEmployeesClient
      orgId={orgId}
      orgName={org?.name ?? ""}
      employees={employees ?? []}
      payRates={payRates ?? []}
      departments={departments ?? []}
    />
  );
}
