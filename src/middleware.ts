import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  // Intercept auth callback codes that land on any URL (Supabase redirects to Site URL with ?code=)
  const code = request.nextUrl.searchParams.get("code");
  if (code && !request.nextUrl.pathname.startsWith("/auth/callback")) {
    const callbackUrl = new URL("/auth/callback", request.url);
    // Forward all query params (code, type, next, etc.)
    request.nextUrl.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value);
    });
    // If Supabase sent type=recovery but no next param, add it
    if (request.nextUrl.searchParams.get("type") === "recovery" && !request.nextUrl.searchParams.get("next")) {
      callbackUrl.searchParams.set("next", "/auth/reset-password");
    }
    return NextResponse.redirect(callbackUrl);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let organizationId: string | null = null;
  let role: string | null = null;
  let joinStatus: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, role, join_status")
      .eq("id", user.id)
      .single();

    if (profile) {
      organizationId = profile.organization_id;
      role = profile.role;
      joinStatus = profile.join_status ?? "active";
    }
  }

  const hasOrg = !!organizationId;
  const isPending = joinStatus === "pending";
  const isRejected = joinStatus === "rejected";
  const isAdmin = role === "owner" || role === "admin" || role === "manager" || role === "payroll";
  const isEmployee = role === "employee";
  const isPayrollProvider = role === "payroll_provider";

  // Check payroll_provider org links (only when relevant)
  let hasActiveProviderOrg = false;
  let hasAnyProviderOrg = false;
  if (user && isPayrollProvider) {
    const { data: ppos } = await supabase
      .from("payroll_provider_orgs")
      .select("status")
      .eq("provider_id", user.id);
    hasAnyProviderOrg = !!(ppos && ppos.length > 0);
    hasActiveProviderOrg = !!(ppos && ppos.some((p: any) => p.status === "active"));
  }

  function redirectTo(path: string) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    return NextResponse.redirect(url);
  }

  function roleBasedRedirect() {
    if (isPending) return redirectTo("/dashboard/pending");
    if (isPayrollProvider) {
      if (!hasAnyProviderOrg) return redirectTo("/onboarding");
      if (!hasActiveProviderOrg) return redirectTo("/payroll-portal/pending");
      return redirectTo("/payroll-portal");
    }
    if (isAdmin) return redirectTo("/admin");
    if (isEmployee) return redirectTo("/dashboard");
    return redirectTo("/onboarding");
  }

  const SUPER_ADMIN_EMAIL = "jacob.wendling29@yahoo.com";

  // Super admin routes
  if (pathname.startsWith("/super-admin")) {
    if (!user) return redirectTo("/auth/login");
    if (user.email !== SUPER_ADMIN_EMAIL) return redirectTo("/");
    return response;
  }

  // Payroll portal routes
  if (pathname.startsWith("/payroll-portal")) {
    if (!user) return redirectTo("/auth/login");
    if (!isPayrollProvider) return redirectTo("/");
    if (pathname === "/payroll-portal/pending") {
      if (hasActiveProviderOrg) return redirectTo("/payroll-portal");
      return response;
    }
    if (!hasAnyProviderOrg) return redirectTo("/onboarding");
    if (!hasActiveProviderOrg) return redirectTo("/payroll-portal/pending");
    return response;
  }

  // Payroll providers can't access /admin or /dashboard
  if (isPayrollProvider && (pathname.startsWith("/admin") || pathname.startsWith("/dashboard"))) {
    if (!hasAnyProviderOrg) return redirectTo("/onboarding");
    if (!hasActiveProviderOrg) return redirectTo("/payroll-portal/pending");
    return redirectTo("/payroll-portal");
  }

  // Root — show landing page to unauthenticated users
  if (pathname === "/") {
    if (!user) return response; // Let them see the landing page
    if (isPayrollProvider) return roleBasedRedirect();
    if (isRejected || !hasOrg) return redirectTo("/onboarding");
    return roleBasedRedirect();
  }

  // Auth pages
  if (pathname.startsWith("/auth")) {
    if (pathname.startsWith("/auth/reset-password")) return response;
    if (pathname.startsWith("/auth/callback")) return response;
    if (user) {
      if (isPayrollProvider) return roleBasedRedirect();
      if (isRejected || !hasOrg) return redirectTo("/onboarding");
      return roleBasedRedirect();
    }
    return response;
  }

  // Protected routes — must be logged in
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding")
  ) {
    if (!user) return redirectTo("/auth/login");
  }

  // Pending page — only accessible when pending
  if (pathname === "/dashboard/pending") {
    if (!user) return redirectTo("/auth/login");
    if (!isPending) return roleBasedRedirect();
    return response;
  }

  // Onboarding
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding")) {
    if (hasOrg && !isRejected && !isPending) return roleBasedRedirect();
    return response;
  }

  // Pending users can't access admin or dashboard
  if (isPending) {
    if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
      return redirectTo("/dashboard/pending");
    }
  }

  // Rejected users go to onboarding
  if (isRejected) {
    return redirectTo("/onboarding");
  }

  // Admin routes
  if (pathname.startsWith("/admin")) {
    if (isEmployee) return redirectTo("/dashboard");
    if (!hasOrg) return redirectTo("/onboarding");
    // Restrict sensitive admin routes by role
    const isManager = role === "manager";
    const isPayroll = role === "payroll";
    // Managers can't access payroll, settings, or AI
    if (isManager && (pathname.startsWith("/admin/payroll") || pathname.startsWith("/admin/settings") || pathname.startsWith("/admin/ai"))) {
      return redirectTo("/admin");
    }
    // Payroll can't access schedule, PTO, AI, or settings
    if (isPayroll && (pathname.startsWith("/admin/schedule") || pathname.startsWith("/admin/pto") || pathname.startsWith("/admin/ai") || pathname.startsWith("/admin/settings"))) {
      return redirectTo("/admin");
    }
    return response;
  }

  // Dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (isAdmin) return redirectTo("/admin");
    if (!hasOrg) return redirectTo("/onboarding");
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
