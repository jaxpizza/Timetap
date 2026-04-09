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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any });
    if (error) {
      return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
    }
  }

  // Determine where to redirect
  // 1. Explicit next param (e.g., /auth/reset-password)
  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // 2. Recovery flow detected via type param
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/auth/reset-password`);
  }

  // 3. Default: signup confirmation
  return NextResponse.redirect(`${origin}/auth/login?confirmed=true`);
}
