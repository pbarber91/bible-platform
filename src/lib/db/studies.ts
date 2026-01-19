import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StudyPlan = {
  id: string;
  workspace_id: string;
  title: string;
  book: string;
  passage: string;
  created_at?: string | null;
  deleted_at?: string | null;
};

export async function listStudies(workspaceId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("studies")
    .select("id, workspace_id, title, book, passage, created_at, deleted_at")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as StudyPlan[];
}

export async function getStudyById(workspaceId: string, planId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("studies")
    .select("id, workspace_id, title, book, passage, created_at, deleted_at")
    .eq("workspace_id", workspaceId)
    .eq("id", planId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as StudyPlan | null;
}

export async function createStudy(args: {
  workspaceId: string;
  title: string;
  book: string;
  passage: string;
}) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("studies")
    .insert({
      workspace_id: args.workspaceId,
      title: args.title,
      book: args.book,
      passage: args.passage,
    })
    .select("id, workspace_id, title, book, passage, created_at, deleted_at")
    .single();

  if (error) throw new Error(error.message);
  return data as StudyPlan;
}

export async function hardDeleteStudy(args: { workspaceId: string; id: string }) {
  const sb = await createSupabaseServerClient();

  const { error } = await sb
    .from("studies")
    .delete()
    .eq("workspace_id", args.workspaceId)
    .eq("id", args.id);

  if (error) throw new Error(error.message);
}

export async function softDeleteStudy(args: { workspaceId: string; id: string }) {
  const sb = await createSupabaseServerClient();

  const { error } = await sb
    .from("studies")
    .update({ deleted_at: new Date().toISOString() })
    .eq("workspace_id", args.workspaceId)
    .eq("id", args.id);

  if (error) throw new Error(error.message);
}
