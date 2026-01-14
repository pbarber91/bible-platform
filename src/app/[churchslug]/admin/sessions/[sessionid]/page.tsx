import { redirect } from "next/navigation";
import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { requireWorkspaceCourseEditor } from "@/lib/admin";
import { getAdminSessionById, updateAdminSession } from "@/lib/db/admin_sessions";
import { getAdminCourseById } from "@/lib/db/admin_courses";

async function saveAction(
  args: { churchslug: string; workspaceId: string; sessionId: string; courseId: string; courseSlug: string },
  formData: FormData
) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const status = String(formData.get("status") ?? "draft").trim();

  if (!title) throw new Error("Title is required.");

  await updateAdminSession({
    workspaceId: args.workspaceId,
    sessionId: args.sessionId,
    title,
    summary: summary ? summary : null,
    status,
  });

  redirect(`/${args.churchslug}/admin/sessions/${args.sessionId}`);
}

export default async function AdminEditSessionPage({
  params,
}: {
  params: Promise<{ churchslug: string; sessionid: string }>;
}) {
  const p = await params;

  const tenant = await getTenantBySlugOrThrow(p.churchslug);
  await requireWorkspaceCourseEditor(tenant.id);

  const session = await getAdminSessionById(tenant.id, p.sessionid);
  if (!session) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        Session not found.
      </div>
    );
  }

  const course = await getAdminCourseById(tenant.id, session.course_id);
  const courseTitle = course?.title ?? "Course";
  const courseSlug = course?.slug ?? "";

  const sessionsHref = courseSlug
    ? `/${p.churchslug}/admin/courses/${courseSlug}/sessions`
    : `/${p.churchslug}/admin/courses`;

  const courseEditHref = course ? `/${p.churchslug}/admin/courses/${course.id}` : `/${p.churchslug}/admin/courses`;

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Admin</div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Edit session</h1>
            <div className="mt-1 text-sm text-slate-600">{courseTitle}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={sessionsHref}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Back to sessions
            </a>
            <a
              href={courseEditHref}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
            >
              Back to course
            </a>
          </div>
        </div>

        <p className="mt-2 text-sm text-slate-600">Metadata only for now. Editor comes next.</p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <form
          className="grid gap-4"
          action={saveAction.bind(null, {
            churchslug: p.churchslug,
            workspaceId: tenant.id,
            sessionId: session.id,
            courseId: session.course_id,
            courseSlug,
          })}
        >
          <div>
            <label className="text-sm font-semibold">Title</label>
            <input
              name="title"
              defaultValue={session.title}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Summary</label>
            <textarea
              name="summary"
              rows={4}
              defaultValue={session.summary ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Status</label>
            <select
              name="status"
              defaultValue={(session.status ?? "draft") as string}
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

            {courseSlug ? (
              <a
                href={`/${p.churchslug}/courses/${courseSlug}`}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
              >
                View public course
              </a>
            ) : null}

            <a
              href={sessionsHref}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
            >
              Back to sessions
            </a>
          </div>

          <div className="text-xs text-slate-500">Session ID: {session.id}</div>
        </form>
      </section>
    </div>
  );
}
