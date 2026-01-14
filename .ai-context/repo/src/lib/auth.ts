import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getUser() {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}
