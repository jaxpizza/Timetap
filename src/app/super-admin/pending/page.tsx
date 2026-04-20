import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PendingRequestsClient } from "./pending-client";

const SUPER_ADMIN_EMAIL = "jacob.wendling29@yahoo.com";

export default async function SuperAdminPendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  if (user.email !== SUPER_ADMIN_EMAIL) redirect("/");

  const admin = createAdminClient();

  // Pending payroll-provider requests across ALL orgs
  const { data: ppoRows } = await admin
    .from("payroll_provider_orgs")
    .select("id, provider_id, organization_id, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const providerIds = [...new Set((ppoRows ?? []).map((r: any) => r.provider_id))];
  const orgIds = [...new Set((ppoRows ?? []).map((r: any) => r.organization_id))];

  const [{ data: profiles }, { data: orgs }] = await Promise.all([
    providerIds.length
      ? admin.from("profiles").select("id, first_name, last_name, email").in("id", providerIds)
      : Promise.resolve({ data: [] as any[] }),
    orgIds.length
      ? admin.from("organizations").select("id, name").in("id", orgIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const profileMap = new Map<string, any>();
  for (const p of profiles ?? []) profileMap.set(p.id, p);
  const orgMap = new Map<string, any>();
  for (const o of orgs ?? []) orgMap.set(o.id, o);

  const requests = (ppoRows ?? []).map((r: any) => {
    const p = profileMap.get(r.provider_id);
    const o = orgMap.get(r.organization_id);
    return {
      id: r.id,
      providerId: r.provider_id,
      organizationId: r.organization_id,
      createdAt: r.created_at,
      providerFirstName: p?.first_name ?? null,
      providerLastName: p?.last_name ?? null,
      providerEmail: p?.email ?? "",
      orgName: o?.name ?? "(unknown org)",
    };
  });

  // Pending employee (join_status = 'pending') requests across ALL orgs
  const { data: pendingEmps } = await admin
    .from("profiles")
    .select("id, first_name, last_name, email, organization_id, created_at, organizations(name)")
    .eq("join_status", "pending")
    .order("created_at", { ascending: false });

  const employees = (pendingEmps ?? []).map((p: any) => ({
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    email: p.email,
    organizationId: p.organization_id,
    orgName: Array.isArray(p.organizations) ? (p.organizations[0]?.name ?? "") : (p.organizations?.name ?? ""),
    createdAt: p.created_at,
  }));

  return <PendingRequestsClient providerRequests={requests} employeeRequests={employees} />;
}
