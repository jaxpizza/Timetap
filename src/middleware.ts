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
  const isAdmin = role === "owner" || role === "admin" || role === "manager";
  const isEmployee = role === "employee";

  function redirectTo(path: string) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    return NextResponse.redirect(url);
  }

  function roleBasedRedirect() {
    if (isPending) return redirectTo("/dashboard/pending");
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

  // Root — show landing page to unauthenticated users
  if (pathname === "/") {
    if (!user) return response; // Let them see the landing page
    if (isRejected || !hasOrg) return redirectTo("/onboarding");
    return roleBasedRedirect();
  }

  // Auth pages
  if (pathname.startsWith("/auth")) {
    if (pathname.startsWith("/auth/reset-password")) return response;
    if (pathname.startsWith("/auth/callback")) return response;
    if (user) {
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
    // Restrict sensitive admin routes to owner/admin (not manager)
    const isManager = role === "manager";
    if (isManager && (pathname.startsWith("/admin/payroll") || pathname.startsWith("/admin/settings") || pathname.startsWith("/admin/ai"))) {
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
