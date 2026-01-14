import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Tenant = {
  id: string;
  slug: string | null;
  name: string;
};

export async function getPersonalTenantOrThrow(): Promise<Tenant> {
  const sb = await createSupabaseServerClient();

  const { data: u, error: uErr } = await sb.auth.getUser();
  if (uErr) throw new Error(uErr.message);
  if (!u.user) throw new Error("Not authenticated.");

  // This function ensures the workspace exists and returns its UUID
  const { data: wsId, error: rpcErr } = await sb.rpc("get_or_create_personal_workspace");
  if (rpcErr) throw new Error(rpcErr.message);

  // Fetch workspace row (for display name)
  const { data: ws, error } = await sb
    .from("workspaces")
    .select("id, slug, name")
    .eq("id", wsId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!ws) throw new Error("Personal workspace missing.");

  return ws as Tenant;
}
