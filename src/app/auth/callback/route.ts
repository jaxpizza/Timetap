import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const next = searchParams.get("next");

  const supabase = await createClient();

  if (code) {
    // PKCE flow — exchange code for session
    await supabase.auth.exchangeCodeForSession(code);
  } else if (token_hash && type) {
    // Magic link / email confirmation / password recovery flow
    await supabase.auth.verifyOtp({ token_hash, type: type as any });
  }

  // Redirect to the specified next page, or default to login with confirmed message
  const redirectUrl = next ? `${origin}${next}` : `${origin}/auth/login?confirmed=true`;
  return NextResponse.redirect(redirectUrl);
}
