import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requestWorkspaceAdmin(workspaceId: string, message: string) {
  const sb = await createSupabaseServerClient();

  const { data: userRes, error: userErr } = await sb.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  const user = userRes.user;
  if (!user) throw new Error("Not authenticated.");

  const { error } = await sb.from("workspace_access_requests").insert({
    workspace_id: workspaceId,
    user_id: user.id,
    requested_role: "admin",
    message: message.trim() ? message.trim() : null,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") return; // already pending
    throw new Error(error.message);
  }
}
