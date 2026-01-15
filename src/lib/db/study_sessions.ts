import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StudySession = {
  id: string;
  workspace_id: string;
  created_by: string;
  plan_id: string;

  session_date: string; // timestamptz ISO
  passage: string | null;
  track: string | null;
  mode: string | null;
  genre: string; // NOT NULL in DB
  responses: Record<string, any> | null;

  status: string | null;
  completed_at: string | null;

  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

export async function listSessionsForPlan(
  workspaceId: string,
  planId: string
): Promise<StudySession[]> {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("study_sessions")
    .select(
      "id, workspace_id, created_by, plan_id, session_date, passage, track, mode, genre, responses, status, completed_at, created_at, updated_at, deleted_at"
    )
    .eq("workspace_id", workspaceId)
    .eq("plan_id", planId)
    .is("deleted_at", null)
    .order("session_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as StudySession[];
}

export async function getSessionById(
  workspaceId: string,
  sessionId: string
): Promise<StudySession | null> {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("study_sessions")
    .select(
      "id, workspace_id, created_by, plan_id, session_date, passage, track, mode, genre, responses, status, completed_at, created_at, updated_at, deleted_at"
    )
    .eq("workspace_id", workspaceId)
    .eq("id", sessionId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as StudySession | null;
}

export async function createSession(args: {
  workspaceId: string;
  planId: string;
  sessionDate?: string; // ISO
  passage?: string | null;
  track?: string | null;
  mode?: string | null;
  genre?: string | null; // optional from UI, but DB requires NOT NULL
}): Promise<string> {
  const sb = await createSupabaseServerClient();

  const { data: u, error: uErr } = await sb.auth.getUser();
  if (uErr) throw new Error(uErr.message);
  if (!u.user) throw new Error("Not authenticated.");

  const id = crypto.randomUUID();

  const { error } = await sb.from("study_sessions_v2").insert({
    id,
    workspace_id: args.workspaceId,
    created_by: u.user.id,
    plan_id: args.planId,
    session_date: args.sessionDate ?? new Date().toISOString(),
    passage: args.passage ?? null,
    track: args.track ?? "beginner",
    mode: args.mode ?? "guided",
    genre: (args.genre ?? "").trim(), // ✅ never null
    responses: {},
    status: "draft",
    completed_at: null,
  });

  if (error) throw new Error(error.message);
  return id;
}

/**
 * PATCH update: only provide fields you want to change.
 * We fetch the existing row (via view) and merge, then update v2.
 * This keeps completed_at behavior consistent when status changes.
 */
export async function updateSessionMeta(args: {
  workspaceId: string;
  sessionId: string;

  session_date?: string;
  passage?: string | null;
  track?: string | null;
  mode?: string | null;
  genre?: string | null;
  status?: string | null;
}): Promise<void> {
  const sb = await createSupabaseServerClient();

  // Fetch existing so we can safely patch without requiring all fields.
  const existing = await getSessionById(args.workspaceId, args.sessionId);
  if (!existing) throw new Error("Session not found.");

  const nextStatus =
    args.status !== undefined ? args.status : (existing.status ?? null);

  // completed_at auto-management:
  // - if status becomes "complete", set now (unless already set)
  // - otherwise clear it
  const completedAt =
    nextStatus === "complete"
      ? existing.completed_at ?? new Date().toISOString()
      : null;

  const next = {
    session_date: args.session_date ?? existing.session_date,
    passage: args.passage !== undefined ? args.passage : existing.passage,
    track: args.track !== undefined ? args.track : existing.track,
    mode: args.mode !== undefined ? args.mode : existing.mode,
    genre:
      args.genre !== undefined
        ? (args.genre ?? "").trim()
        : (existing.genre ?? "").trim(), // ✅ never null
    status: nextStatus,
    completed_at: completedAt,
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb
    .from("study_sessions_v2")
    .update(next)
    .eq("workspace_id", args.workspaceId)
    .eq("id", args.sessionId);

  if (error) throw new Error(error.message);
}

export async function mergeSessionResponses(args: {
  workspaceId: string;
  sessionId: string;
  patch: Record<string, any>;
}): Promise<void> {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("study_sessions")
    .select("responses")
    .eq("workspace_id", args.workspaceId)
    .eq("id", args.sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const existing = (data?.responses ?? {}) as Record<string, any>;
  const next = { ...existing, ...args.patch };

  const { error: upErr } = await sb
    .from("study_sessions_v2")
    .update({
      responses: next,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", args.workspaceId)
    .eq("id", args.sessionId);

  if (upErr) throw new Error(upErr.message);
}

export async function softDeleteSession(args: {
  workspaceId: string;
  sessionId: string;
}): Promise<void> {
  const sb = await createSupabaseServerClient();
  const { error } = await sb
    .from("study_sessions_v2")
    .update({ deleted_at: new Date().toISOString() })
    .eq("workspace_id", args.workspaceId)
    .eq("id", args.sessionId);

  if (error) throw new Error(error.message);
}

export async function hardDeleteSession(args: {
  workspaceId: string;
  sessionId: string;
}): Promise<void> {
  const sb = await createSupabaseServerClient();
  const { error } = await sb
    .from("study_sessions_v2")
    .delete()
    .eq("workspace_id", args.workspaceId)
    .eq("id", args.sessionId);

  if (error) throw new Error(error.message);
}
