import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StudyPlan = {
  id: string;
  workspace_id: string;
  created_by: string;

  title: string;
  book: string;
  passage: string;
  description: string | null;
  tags: string[] | null; // <-- IMPORTANT: treat as array

  created_at: string; // timestamptz
  updated_at: string | null;
  deleted_at: string | null;
};

/**
 * Reads use the view (study_plans).
 * Writes use the base table (study_plans_v2).
 */
function parseTags(raw: string | null | undefined): string[] {
  const s = (raw ?? "").trim();
  if (!s) return [];

  // Accept: comma, bullet, pipe, middle dot, newline, multiple spaces
  const parts = s
    .split(/[,•|·\n]+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  // de-dupe (case-insensitive) while preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }

  return out;
}

export async function listStudies(workspaceId: string): Promise<StudyPlan[]> {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("study_plans") // view
    .select(
      "id, workspace_id, created_by, title, book, passage, description, tags, created_at, updated_at, deleted_at"
    )
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as StudyPlan[];
}

export async function getStudyById(
  workspaceId: string,
  id: string
): Promise<StudyPlan | null> {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("study_plans") // view
    .select(
      "id, workspace_id, created_by, title, book, passage, description, tags, created_at, updated_at, deleted_at"
    )
    .eq("workspace_id", workspaceId)
    .eq("id", id)
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
  description?: string | null;
  tags?: string | string[] | null; // accept string from form OR array
}): Promise<string> {
  const sb = await createSupabaseServerClient();

  const { data: u, error: uErr } = await sb.auth.getUser();
  if (uErr) throw new Error(uErr.message);
  if (!u.user) throw new Error("Not authenticated.");

  const id = crypto.randomUUID();
  const tagsArr = Array.isArray(args.tags) ? args.tags : parseTags(args.tags ?? "");

  const { error } = await sb.from("study_plans_v2").insert({
    id,
    workspace_id: args.workspaceId,
    created_by: u.user.id,
    title: args.title || "Untitled",
    book: args.book || "",
    passage: args.passage || "",
    description: args.description ?? null,
    // IMPORTANT: empty string -> [] (never "")
    tags: tagsArr.length ? tagsArr : [],
  });

  if (error) throw new Error(error.message);
  return id;
}

export async function updateStudy(args: {
  workspaceId: string;
  id: string;
  title: string;
  book: string;
  passage: string;
  description?: string | null;
  tags?: string | string[] | null;
}): Promise<void> {
  const sb = await createSupabaseServerClient();
  const tagsArr = Array.isArray(args.tags) ? args.tags : parseTags(args.tags ?? "");

  const { error } = await sb
    .from("study_plans_v2")
    .update({
      title: args.title,
      book: args.book,
      passage: args.passage,
      description: args.description ?? null,
      tags: tagsArr.length ? tagsArr : [],
    })
    .eq("workspace_id", args.workspaceId)
    .eq("id", args.id);

  if (error) throw new Error(error.message);
}

export async function softDeleteStudy(args: {
  workspaceId: string;
  id: string;
}): Promise<void> {
  const sb = await createSupabaseServerClient();
  const { error } = await sb
    .from("study_plans_v2")
    .update({ deleted_at: new Date().toISOString() })
    .eq("workspace_id", args.workspaceId)
    .eq("id", args.id);

  if (error) throw new Error(error.message);
}

export async function hardDeleteStudy(args: {
  workspaceId: string;
  id: string;
}): Promise<void> {
  const sb = await createSupabaseServerClient();

  // Delete sessions first to avoid FK constraints.
  const { error: sessErr } = await sb
    .from("study_sessions_v2")
    .delete()
    .eq("workspace_id", args.workspaceId)
    .eq("plan_id", args.id);

  if (sessErr) throw new Error(sessErr.message);

  const { error: planErr } = await sb
    .from("study_plans_v2")
    .delete()
    .eq("workspace_id", args.workspaceId)
    .eq("id", args.id);

  if (planErr) throw new Error(planErr.message);
}
