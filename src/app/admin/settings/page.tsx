import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single();
  if (!profile?.organization_id) return null;
  if (profile.role !== "owner" && profile.role !== "admin") {
    const { redirect } = await import("next/navigation");
    redirect("/admin");
  }
  const orgId = profile.organization_id;

  const [{ data: org }, { data: locations }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", orgId).single(),
    supabase.from("locations").select("*").eq("organization_id", orgId).order("created_at"),
  ]);

  return <SettingsClient org={org} locations={locations ?? []} organizationId={orgId} />;
}
