import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminSessionRow = {
  id: string;
  workspace_id: string;
  course_id: string;
  title: string;
  summary: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function listAdminSessions(workspaceId: string, courseId: string) {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("course_sessions")
    .select("id, workspace_id, course_id, title, summary, status, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminSessionRow[];
}

export async function getAdminSessionById(workspaceId: string, sessionId: string) {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("course_sessions")
    .select("id, workspace_id, course_id, title, summary, status, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("id", sessionId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as AdminSessionRow | null;
}

export async function createAdminSession(args: {
  workspaceId: string;
  courseId: string;
  title: string;
  summary: string | null;
  status: string;
}) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("course_sessions")
    .insert({
      workspace_id: args.workspaceId,
      course_id: args.courseId,
      title: args.title,
      summary: args.summary,
      status: args.status,
      content: {}, // safe default; your session page expects content json
    })
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Failed to create session.");
  return String(data.id);
}

export async function updateAdminSession(args: {
  workspaceId: string;
  sessionId: string;
  title: string;
  summary: string | null;
  status: string;
}) {
  const sb = await createSupabaseServerClient();

  const { error } = await sb
    .from("course_sessions")
    .update({
      title: args.title,
      summary: args.summary,
      status: args.status,
    })
    .eq("workspace_id", args.workspaceId)
    .eq("id", args.sessionId);

  if (error) throw new Error(error.message);
}
