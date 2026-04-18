import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalLayoutClient } from "./portal-layout-client";

export default async function PayrollPortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "payroll_provider") redirect("/dashboard");

  // Two-step fetch is more robust than a nested join — supabase-js's join-shape detection
  // can return either an object or an array depending on schema inference.
  const { data: links } = await admin
    .from("payroll_provider_orgs")
    .select("organization_id")
    .eq("provider_id", user.id)
    .eq("status", "active");

  const orgIds = (links ?? []).map((l: any) => l.organization_id).filter(Boolean);

  let orgs: { id: string; name: string }[] = [];
  if (orgIds.length > 0) {
    const { data: orgRows } = await admin
      .from("organizations")
      .select("id, name")
      .in("id", orgIds);
    orgs = (orgRows ?? []).map((o: any) => ({ id: o.id, name: o.name ?? "" }));
  }

  // If no active orgs, middleware routes to /payroll-portal/pending — render without sidebar chrome
  if (orgs.length === 0) return <>{children}</>;

  return (
    <PortalLayoutClient
      orgs={orgs}
      profile={{ firstName: profile?.first_name ?? "", lastName: profile?.last_name ?? "" }}
    >
      {children}
    </PortalLayoutClient>
  );
}
