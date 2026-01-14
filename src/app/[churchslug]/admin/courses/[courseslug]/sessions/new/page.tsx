import { redirect } from "next/navigation";
import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { requireWorkspaceCourseEditor } from "@/lib/admin";
import { getCourseBySlug } from "@/lib/db/courses";
import { createAdminSession } from "@/lib/db/admin_sessions";

async function createAction(
  args: { churchslug: string; workspaceId: string; courseId: string },
  formData: FormData
) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const status = String(formData.get("status") ?? "draft").trim();

  if (!title) throw new Error("Title is required.");

  const id = await createAdminSession({
    workspaceId: args.workspaceId,
    courseId: args.courseId,
    title,
    summary: summary ? summary : null,
    status,
  });

  redirect(`/${args.churchslug}/admin/sessions/${id}`);
}

export default async function AdminNewSessionPage({
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

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Admin</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New session</h1>
        <p className="mt-2 text-sm text-slate-600">{course.title}</p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <form
          className="grid gap-4"
          action={createAction.bind(null, {
            churchslug: p.churchslug,
            workspaceId: tenant.id,
            courseId: course.id,
          })}
        >
          <div>
            <label className="text-sm font-semibold">Title</label>
            <input
              name="title"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              placeholder="Session 1: Introduction"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Summary</label>
            <textarea
              name="summary"
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              placeholder="Short description shown on the session list."
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Status</label>
            <select
              name="status"
              defaultValue="draft"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Create session
            </button>
            <a
              href={`/${p.churchslug}/admin/courses/${course.slug}/sessions`}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
            >
              Cancel
            </a>
          </div>
        </form>
      </section>
    </div>
  );
}
