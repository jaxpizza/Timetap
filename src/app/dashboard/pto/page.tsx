import { createClient } from "@/lib/supabase/server";
import { PTOClient } from "./pto-client";

export default async function PTOPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) return null;
  const orgId = profile.organization_id;

  const [{ data: policies }, { data: balances }, { data: requests }] = await Promise.all([
    supabase.from("pto_policies").select("*").eq("organization_id", orgId).eq("is_active", true),
    supabase.from("pto_balances").select("*").eq("profile_id", user.id),
    supabase.from("pto_requests").select("*, pto_policies(name, color)").eq("profile_id", user.id).order("created_at", { ascending: false }),
  ]);

  return <PTOClient policies={policies ?? []} balances={balances ?? []} requests={requests ?? []} organizationId={orgId} />;
}
