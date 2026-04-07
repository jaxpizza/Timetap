import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: balances }, { data: dept }] = await Promise.all([
    supabase.from("profiles").select("*, organizations(name)").eq("id", user.id).single(),
    supabase.from("pto_balances").select("*, pto_policies(name, color)").eq("profile_id", user.id),
    supabase.from("profiles").select("department_id, departments(name)").eq("id", user.id).single(),
  ]);

  return <ProfileClient profile={profile} balances={balances ?? []} departmentName={(dept as any)?.departments?.name ?? null} />;
}
