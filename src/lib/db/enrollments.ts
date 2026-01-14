import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getEnrollment(courseId: string) {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("course_enrollments")
    .select("id, user_id, course_id, role, created_at")
    .eq("course_id", courseId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function enrollInCourse(courseId: string) {
  const sb = await createSupabaseServerClient();

  // `user_id` should be filled by client-side session? We explicitly set it server-side for clarity.
  const { data: userRes, error: userErr } = await sb.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  const user = userRes.user;
  if (!user) throw new Error("Not authenticated.");

  const { error } = await sb.from("course_enrollments").insert({
    course_id: courseId,
    user_id: user.id,
    role: "participant",
  });

  if (error) {
    // If you have a unique constraint on (course_id, user_id), duplicate enroll attempts will hit 23505.
    if (error.code === "23505") return;
    throw new Error(error.message);
  }
}
