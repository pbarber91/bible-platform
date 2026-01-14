import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AccessRequestRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  requested_role: string;
  message: string | null;
  status: string;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
};

export async function listWorkspaceAccessRequests(workspaceId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("workspace_access_requests")
    .select(
      "id, workspace_id, user_id, requested_role, message, status, created_at, decided_at, decided_by"
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AccessRequestRow[];
}

export async function decideAccessRequest(requestId: string, decision: "approved" | "denied") {
  const sb = await createSupabaseServerClient();

  const { error } = await sb.rpc("decide_workspace_access_request", {
    p_request_id: requestId,
    p_decision: decision,
    p_grant_role: "admin",
  });

  if (error) throw new Error(error.message);
}
