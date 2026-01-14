import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/mcc";
  const safeNext = next.startsWith("/") ? next : "/mcc";

  const sb = await createSupabaseServerClient();
  await sb.auth.signOut();

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
