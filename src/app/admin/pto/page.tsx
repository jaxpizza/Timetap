import { createClient } from "@/lib/supabase/server";
import { AdminPTOClient } from "./pto-client";

export default async function AdminPTOPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) return null;
  const orgId = profile.organization_id;

  const [{ data: pendingRequests }, { data: policies }, { data: employees }, { data: allBalances }] = await Promise.all([
    supabase.from("pto_requests")
      .select("*, profiles!pto_requests_profile_id_fkey(first_name, last_name), pto_policies(name, color)")
      .eq("organization_id", orgId).eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("pto_policies").select("*").eq("organization_id", orgId).order("created_at"),
    supabase.from("profiles").select("id, first_name, last_name")
      .eq("organization_id", orgId).eq("is_active", true).eq("join_status", "active").order("first_name"),
    supabase.from("pto_balances").select("*").eq("organization_id", orgId),
  ]);

  return (
    <AdminPTOClient
      pendingRequests={pendingRequests ?? []}
      policies={policies ?? []}
      employees={employees ?? []}
      balances={allBalances ?? []}
      organizationId={orgId}
    />
  );
}
