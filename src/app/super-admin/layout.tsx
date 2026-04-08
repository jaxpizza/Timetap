import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SuperAdminShell } from "./shell";

const SUPER_ADMIN_EMAIL = "jacob.wendling29@yahoo.com";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    redirect("/");
  }

  return <SuperAdminShell>{children}</SuperAdminShell>;
}
