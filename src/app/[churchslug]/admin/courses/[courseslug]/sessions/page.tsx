import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { requireWorkspaceCourseEditor } from "@/lib/admin";
import { getCourseBySlug } from "@/lib/db/courses";
import { listAdminSessions } from "@/lib/db/admin_sessions";

export default async function AdminSessionsPage({
  params,
}: {
  params: Promise<{ churchslug: string; courseslug: string }>;
}) {
  const p = await params;

  const tenant = await getTenantBySlugOrThrow(p.churchslug);
  await requireWorkspaceCourseEditor(tenant.id);

  const course = await getCourseBySlug(tenant.id, p.courseslug);
  if (!course) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        Course not found.
      </div>
    );
  }

  const sessions = await listAdminSessions(tenant.id, course.id);

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Admin</div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
            <div className="mt-1 text-sm text-slate-600">{course.title}</div>
          </div>

          <div className="flex gap-2">
            <a
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              href={`/${p.churchslug}/admin/courses/${course.slug}/sessions/new`}
            >
              New session
            </a>
            <a
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
              href={`/${p.churchslug}/admin/courses/${course.slug}`}
            >
              Back to course
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            No sessions yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {sessions.map((s) => (
              <a
                key={s.id}
                href={`/${p.churchslug}/admin/sessions/${s.id}`}
                className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{s.title}</div>
                  {s.status ? (
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                      {s.status}
                    </span>
                  ) : null}
                </div>
                {s.summary ? (
                  <div className="mt-2 text-sm text-slate-700">{s.summary}</div>
                ) : null}
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
