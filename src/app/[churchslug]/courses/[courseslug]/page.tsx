import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { getCourseBySlug, listCourseSessions } from "@/lib/db/courses";
import { getEnrollment, enrollInCourse } from "@/lib/db/enrollments";
import { requestWorkspaceAdmin } from "@/lib/db/access_requests";
import { listCourseProgress } from "@/lib/db/progress";

async function enrollAction(courseId: string, next: string) {
  "use server";
  await enrollInCourse(courseId);
  redirect(next);
}

async function requestAdminAction(workspaceId: string, next: string, formData: FormData) {
  "use server";
  const msg = String(formData.get("message") ?? "");
  await requestWorkspaceAdmin(workspaceId, msg);
  redirect(next);
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ churchslug: string; courseslug: string }>;
}) {
  const p = await params;

  const tenant = await getTenantBySlugOrThrow(p.churchslug);
  const course = await getCourseBySlug(tenant.id, p.courseslug);

  if (!course) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        Course not found.
      </div>
    );
  }

  const user = await getUser();
  const nextUrl = `/${p.churchslug}/courses/${p.courseslug}`;

  const enrollment = user ? await getEnrollment(course.id) : null;
  const canViewSessions = Boolean(enrollment);

  const sessions = canViewSessions ? await listCourseSessions(tenant.id, course.id) : [];

  const progressRows = user && canViewSessions ? await listCourseProgress(course.id) : [];

  const completedSet = new Set(
    progressRows.filter((r) => r.completed_at).map((r) => r.session_id)
  );

  const totalSessions = sessions.length;
  const completedCount = sessions.reduce((acc, s) => acc + (completedSet.has(s.id) ? 1 : 0), 0);
  const percent = totalSessions === 0 ? 0 : Math.round((completedCount / totalSessions) * 100);

  // Resume target: last_viewed_at max among progress rows whose session exists in this course
  const sessionIdSet = new Set(sessions.map((s) => s.id));
  const lastViewed = progressRows
    .filter((r) => r.last_viewed_at && sessionIdSet.has(r.session_id))
    .reduce<{ session_id: string; last_viewed_at: string } | null>((best, r) => {
      if (!r.last_viewed_at) return best;
      if (!best) return { session_id: r.session_id, last_viewed_at: r.last_viewed_at };
      return new Date(r.last_viewed_at).getTime() > new Date(best.last_viewed_at).getTime()
        ? { session_id: r.session_id, last_viewed_at: r.last_viewed_at }
        : best;
    }, null);

  const resumeSessionId = lastViewed?.session_id ?? (sessions[0]?.id ?? null);
  const resumeHref =
    resumeSessionId
      ? `/${p.churchslug}/courses/${p.courseslug}/sessions/${resumeSessionId}`
      : null;

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Course</div>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{course.title}</h1>

        {course.description ? (
          <p className="mt-3 text-slate-600">{course.description}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-start gap-2">
          {!user ? (
            <a
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              href={`/login?next=${encodeURIComponent(nextUrl)}`}
            >
              Sign in to enroll
            </a>
          ) : enrollment ? (
            <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
              Enrolled ({enrollment.role})
            </div>
          ) : (
            <form action={enrollAction.bind(null, course.id, nextUrl)}>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Enroll (free)
              </button>
            </form>
          )}

          {user ? (
            <details className="rounded-xl bg-slate-50 px-4 py-2 ring-1 ring-slate-200">
              <summary className="cursor-pointer select-none text-sm font-semibold text-slate-800">
                Request admin access
              </summary>

              <form
                className="mt-3 grid gap-2"
                action={requestAdminAction.bind(null, tenant.id, nextUrl)}
              >
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Optional note (e.g., I'm the course coordinator at MCC)."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
                >
                  Submit request
                </button>
                <div className="text-xs text-slate-500">
                  Your request will be reviewed by a platform or church admin.
                </div>
              </form>
            </details>
          ) : null}
        </div>

        {canViewSessions ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-800">
                Progress: {completedCount}/{totalSessions} ({percent}%)
              </div>

              {resumeHref ? (
                <a
                  href={resumeHref}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Resume
                </a>
              ) : null}
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-slate-900"
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
              />
            </div>

            {lastViewed?.last_viewed_at ? (
              <div className="mt-2 text-xs text-slate-600">
                Last activity: {new Date(lastViewed.last_viewed_at).toLocaleString()}
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-600">No activity yet.</div>
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 text-sm font-semibold">Sessions</div>

        {!canViewSessions ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Enroll to access sessions.
          </div>
        ) : (
          <div className="grid gap-3">
            {sessions.map((s) => (
              <a
                key={s.id}
                href={`/${p.churchslug}/courses/${p.courseslug}/sessions/${s.id}`}
                className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{s.title}</div>
                  {completedSet.has(s.id) ? (
                    <div className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200">
                      ✓ Completed
                    </div>
                  ) : null}
                </div>

                {s.summary ? (
                  <div className="mt-1 text-sm text-slate-600">{s.summary}</div>
                ) : null}
              </a>
            ))}

            {sessions.length === 0 ? (
              <div className="text-sm text-slate-600">No sessions yet.</div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
