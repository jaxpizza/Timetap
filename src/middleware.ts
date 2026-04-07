import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

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

  // Root
  if (pathname === "/") {
    if (!user) return redirectTo("/auth/login");
    if (isRejected || !hasOrg) return redirectTo("/onboarding");
    return roleBasedRedirect();
  }

  // Auth pages
  if (pathname.startsWith("/auth")) {
    if (pathname.startsWith("/auth/reset-password")) return response;
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
