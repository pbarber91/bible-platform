import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminCourseRow = {
  id: string;
  workspace_id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string; // draft | published (or whatever you use)
  created_at?: string;
  updated_at?: string;
};

export async function listAdminCourses(workspaceId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("courses")
    .select("id, workspace_id, slug, title, description, status, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminCourseRow[];
}

export async function getAdminCourseById(workspaceId: string, courseId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("courses")
    .select("id, workspace_id, slug, title, description, status, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("id", courseId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as AdminCourseRow | null;
}

export async function createAdminCourse(args: {
  workspaceId: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
}) {
  const sb = await createSupabaseServerClient();

  const { data: userRes, error: userErr } = await sb.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  const user = userRes.user;
  if (!user) throw new Error("Not authenticated.");

  const { data, error } = await sb
    .from("courses")
    .insert({
      workspace_id: args.workspaceId,
      slug: args.slug,
      title: args.title,
      description: args.description,
      status: args.status,
      created_by: user.id, // ok if column exists; if not, we’ll remove this line
    })
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) {
    // If created_by doesn’t exist, Supabase will return a column error.
    throw new Error(error.message);
  }

  if (!data?.id) throw new Error("Failed to create course.");
  return String(data.id);
}

export async function updateAdminCourse(args: {
  workspaceId: string;
  courseId: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
}) {
  const sb = await createSupabaseServerClient();

  const { error } = await sb
    .from("courses")
    .update({
      slug: args.slug,
      title: args.title,
      description: args.description,
      status: args.status,
    })
    .eq("workspace_id", args.workspaceId)
    .eq("id", args.courseId);

  if (error) throw new Error(error.message);
}
