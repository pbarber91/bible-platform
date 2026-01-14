import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { listPublishedCourses } from "@/lib/db/courses";

export default async function CoursesPage({
  params,
}: {
  params: Promise<{ churchslug: string }>;
}) {
  const p = await params;

  const tenant = await getTenantBySlugOrThrow(p.churchslug);
  const courses = await listPublishedCourses(tenant.id);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
        <p className="mt-1 text-sm text-slate-600">
          Published courses for {tenant.name}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {courses.map((c) => (
          <a
            key={c.id}
            href={`/${p.churchslug}/courses/${c.slug}`}
            className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
          >
            <div className="text-xs text-slate-500">Course</div>
            <div className="mt-2 text-lg font-semibold group-hover:underline">
              {c.title}
            </div>
            {c.description ? (
              <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                {c.description}
              </p>
            ) : null}
          </a>
        ))}
      </div>

      {courses.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
          No published courses yet.
        </div>
      ) : null}
    </div>
  );
}
