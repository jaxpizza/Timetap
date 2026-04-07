"use server";

import { createReadOnlyClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateProfile(input: {
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({
    first_name: input.firstName,
    last_name: input.lastName,
    phone: input.phone || null,
  }).eq("id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function changePassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createReadOnlyClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
