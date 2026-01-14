import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(next: string | null) {
  if (!next) return "/mcc";
  return next.startsWith("/") ? next : "/mcc";
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const next = safeNextPath(url.searchParams.get("next"));

  // PKCE flow:
  const code = url.searchParams.get("code");

  // Magic link / OTP confirmation flow:
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type"); // e.g. "magiclink", "signup", "recovery", etc.

  const sb = await createSupabaseServerClient();

  // 1) PKCE exchange
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
      );
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // 2) Magic link verification
  if (token_hash && type) {
    // verifyOtp expects type + token_hash for magic links / OTPs
    const { error } = await sb.auth.verifyOtp({
      type: type as any,
      token_hash,
    });

    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
      );
    }

    return NextResponse.redirect(new URL(next, url.origin));
  }

  // If neither present, bounce back with debug-friendly info
  return NextResponse.redirect(
    new URL(`/login?error=missing_code`, url.origin)
  );
}
