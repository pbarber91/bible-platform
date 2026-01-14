import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Tenant = {
  id: string;
  slug: string | null;
  name: string;
};

export async function getTenantBySlugOrThrow(
  churchslug: string | undefined | null
): Promise<Tenant> {
  if (!churchslug || typeof churchslug !== "string") {
    throw new Error(`Missing churchslug route param. Got: ${String(churchslug)}`);
  }

  const sb = await createSupabaseServerClient();
  const slug = churchslug.toLowerCase();

  // 1) Try exact match first (fast path)
  const { data: exact, error: err1 } = await sb
    .from("workspaces")
    .select("id, slug, name")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (err1) throw new Error(err1.message);
  if (exact) return exact as Tenant;

  // 2) Fallback: case-insensitive match
  const { data: ci, error: err2 } = await sb
    .from("workspaces")
    .select("id, slug, name")
    .ilike("slug", slug)
    .limit(1)
    .maybeSingle();

  if (err2) throw new Error(err2.message);
  if (!ci) throw new Error(`Unknown church slug: ${slug}`);

  return ci as Tenant;
}
