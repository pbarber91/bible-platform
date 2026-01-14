import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listPublishedCourses(workspaceId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("courses")
    .select("id, slug, title, description, status, published_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCourseBySlug(workspaceId: string, courseSlug: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("courses")
    .select("id, slug, title, description, status")
    .eq("workspace_id", workspaceId)
    .eq("slug", courseSlug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function listCourseSessions(workspaceId: string, courseId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("course_sessions")
    .select("id, title, summary, sort_order, status")
    .eq("workspace_id", workspaceId)
    .eq("course_id", courseId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCourseSession(workspaceId: string, sessionId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("course_sessions")
    .select("id, course_id, title, summary, sort_order, content, status")
    .eq("workspace_id", workspaceId)
    .eq("id", sessionId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}
