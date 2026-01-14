import { createSupabaseServerClient } from "@/lib/supabase/server";

export type WorkspaceRole = "owner" | "admin" | "instructor" | "leader" | "participant";

export async function requireWorkspaceRole(workspaceId: string, allowed: WorkspaceRole[]) {
  const sb = await createSupabaseServerClient();

  const { data: userRes, error: userErr } = await sb.auth.getUser();
  if (userErr) throw new Error(userErr.message);

  const user = userRes.user;
  if (!user) throw new Error("Not authenticated.");

  const { data, error } = await sb
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const role = (data?.role ?? null) as WorkspaceRole | null;
  if (!role || !allowed.includes(role)) throw new Error("Not authorized.");

  return { userId: user.id, role };
}

export async function requireWorkspaceAdmin(workspaceId: string) {
  return requireWorkspaceRole(workspaceId, ["admin", "owner"]);
}

export async function requireWorkspaceCourseEditor(workspaceId: string) {
  return requireWorkspaceRole(workspaceId, ["admin", "owner", "instructor"]);
}
