import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Verify the caller is a payroll_provider with an ACTIVE link to the given org.
 * Returns the authenticated user and an admin client on success.
 * Throws an Error on failure (catch in server actions & return { success: false, error }).
 */
export async function verifyPayrollProvider(orgId: string) {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "payroll_provider") throw new Error("Not a payroll provider");

  const { data: link } = await admin
    .from("payroll_provider_orgs")
    .select("status")
    .eq("provider_id", user.id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (link?.status !== "active") throw new Error("Not authorized for this organization");

  return { user, admin };
}
