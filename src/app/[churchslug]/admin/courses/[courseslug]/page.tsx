import { redirect } from "next/navigation";
import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { requireWorkspaceAdmin } from "@/lib/admin";
import { getAdminCourseById, updateAdminCourse } from "@/lib/db/admin_courses";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function saveAction(
  args: { churchslug: string; workspaceId: string; courseId: string },
  formData: FormData
) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "draft").trim();

  if (!title) throw new Error("Title is required.");

  const slug = slugify(slugRaw || title);
  if (!slug) throw new Error("Slug is required.");

  await updateAdminCourse({
    workspaceId: args.workspaceId,
    courseId: args.courseId,
    title,
    slug,
    description: description ? description : null,
    status,
  });

  redirect(`/${args.churchslug}/admin/courses/${args.courseId}`);
}

export default async function AdminEditCoursePage({
  params,
}: {
  params: Promise<{ churchslug: string; courseid: string }>;
}) {
  const p = await params;

  const tenant = await getTenantBySlugOrThrow(p.churchslug);
  await requireWorkspaceAdmin(tenant.id);

  const course = await getAdminCourseById(tenant.id, p.courseid);
  if (!course) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        Course not found.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Admin</div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Edit course</h1>

          <div className="flex flex-wrap gap-2">
            <a
              href={`/${p.churchslug}/admin/courses/${course.slug}/sessions`}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Manage sessions
            </a>

            <a
              href={`/${p.churchslug}/admin/courses`}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
            >
              Back to courses
            </a>
          </div>
        </div>

        <p className="mt-2 text-sm text-slate-600">Update course metadata.</p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <form
          className="grid gap-4"
          action={saveAction.bind(null, {
            churchslug: p.churchslug,
            workspaceId: tenant.id,
            courseId: course.id,
          })}
        >
          <div>
            <label className="text-sm font-semibold">Title</label>
            <input
              name="title"
              defaultValue={course.title}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Slug</label>
            <input
              name="slug"
              defaultValue={course.slug}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Description</label>
            <textarea
              name="description"
              rows={4}
              defaultValue={course.description ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Status</label>
            <select
              name="status"
              defaultValue={(course.status ?? "draft") as string}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Save changes
            </button>

            <a
              href={`/${p.churchslug}/courses/${course.slug}`}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
            >
              View public page
            </a>

            <a
              href={`/${p.churchslug}/admin/courses/${course.id}/sessions`}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
            >
              Manage sessions
            </a>
          </div>

          <div className="text-xs text-slate-500">Course ID: {course.id}</div>
        </form>
      </section>
    </div>
  );
}
