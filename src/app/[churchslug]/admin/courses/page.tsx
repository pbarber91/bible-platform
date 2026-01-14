import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { requireWorkspaceCourseEditor } from "@/lib/admin";
import { listAdminCourses } from "@/lib/db/admin_courses";

export default async function AdminCoursesPage({
  params,
}: {
  params: Promise<{ churchslug: string }>;
}) {
  const p = await params;

  const tenant = await getTenantBySlugOrThrow(p.churchslug);
  await requireWorkspaceCourseEditor(tenant.id);

  const courses = await listAdminCourses(tenant.id);

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Admin</div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
          <div className="flex gap-2">
            <a
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              href={`/${p.churchslug}/admin/courses/new`}
            >
              New course
            </a>
            <a
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
              href={`/${p.churchslug}/admin`}
            >
              Back to admin
            </a>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Create/edit courses and jump straight into session management.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {courses.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            No courses yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {courses.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold">{c.title}</div>
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                        {c.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Slug: {c.slug}</div>
                    {c.description ? (
                      <div className="mt-2 text-sm text-slate-700">{c.description}</div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/${p.churchslug}/admin/courses/${c.id}`}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Edit
                    </a>
                    <a
                      href={`/${p.churchslug}/admin/courses/${c.slug}/sessions`}
                      className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
                    >
                      Manage sessions
                    </a>
                    <a
                      href={`/${p.churchslug}/courses/${c.slug}`}
                      className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
                    >
                      View public
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
