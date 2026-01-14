import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionProgress = {
  id: string;
  workspace_id: string;
  course_id: string;
  session_id: string;
  user_id: string;
  last_viewed_at: string | null;
  completed_at: string | null;
  created_at: string | null;
};

export async function getSessionProgress(sessionId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("course_session_progress")
    .select("id, workspace_id, course_id, session_id, user_id, last_viewed_at, completed_at, created_at")
    .eq("session_id", sessionId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as SessionProgress) ?? null;
}

export async function touchSessionProgress(args: {
  workspaceId: string;
  courseId: string;
  sessionId: string;
}) {
  const sb = await createSupabaseServerClient();

  const { data: userRes, error: userErr } = await sb.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  const user = userRes.user;
  if (!user) throw new Error("Not authenticated.");

  const now = new Date().toISOString();

  const { error } = await sb.from("course_session_progress").upsert(
    {
      workspace_id: args.workspaceId,
      course_id: args.courseId,
      session_id: args.sessionId,
      user_id: user.id,
      last_viewed_at: now,
    },
    { onConflict: "user_id,session_id" }
  );

  if (error) throw new Error(error.message);
}

export async function setSessionCompleted(args: {
  workspaceId: string;
  courseId: string;
  sessionId: string;
  completed: boolean;
}) {
  const sb = await createSupabaseServerClient();

  const { data: userRes, error: userErr } = await sb.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  const user = userRes.user;
  if (!user) throw new Error("Not authenticated.");

  const now = new Date().toISOString();

  const { error } = await sb.from("course_session_progress").upsert(
    {
      workspace_id: args.workspaceId,
      course_id: args.courseId,
      session_id: args.sessionId,
      user_id: user.id,
      last_viewed_at: now,
      completed_at: args.completed ? now : null,
    },
    { onConflict: "user_id,session_id" }
  );

  if (error) throw new Error(error.message);
}

export async function listCourseProgress(courseId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("course_session_progress")
    .select("session_id, completed_at, last_viewed_at")
    .eq("course_id", courseId);

  if (error) throw new Error(error.message);

  return (data ?? []) as Array<{
    session_id: string;
    completed_at: string | null;
    last_viewed_at: string | null;
  }>;
}
