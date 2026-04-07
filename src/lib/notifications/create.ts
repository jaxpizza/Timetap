import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Create a notification for a specific user.
 * Uses the admin client so it can be called from any server action.
 */
export async function createNotification(params: {
  organizationId: string;
  profileId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    organization_id: params.organizationId,
    profile_id: params.profileId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link ?? null,
  });
}

/**
 * Create a notification for the organization owner.
 * Looks up the owner_id from the organizations table.
 */
export async function notifyOrgOwner(params: {
  organizationId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("owner_id")
    .eq("id", params.organizationId)
    .single();
  if (!org?.owner_id) return;

  await admin.from("notifications").insert({
    organization_id: params.organizationId,
    profile_id: org.owner_id,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link ?? null,
  });
}

/**
 * Notify all active employees in an organization.
 */
export async function notifyAllEmployees(params: {
  organizationId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  excludeProfileId?: string;
}) {
  const admin = createAdminClient();
  const { data: employees } = await admin
    .from("profiles")
    .select("id")
    .eq("organization_id", params.organizationId)
    .eq("is_active", true)
    .eq("join_status", "active");

  if (!employees || employees.length === 0) return;

  const rows = employees
    .filter((e) => e.id !== params.excludeProfileId)
    .map((e) => ({
      organization_id: params.organizationId,
      profile_id: e.id,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link ?? null,
    }));

  if (rows.length > 0) {
    await admin.from("notifications").insert(rows);
  }
}
