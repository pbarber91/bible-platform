import { redirect } from "next/navigation";
import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { requireWorkspaceAdmin } from "@/lib/admin";
import { createAdminCourse } from "@/lib/db/admin_courses";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function createAction(
  args: { churchslug: string; workspaceId: string },
  formData: FormData
) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "draft").trim();

  if (!title) throw new Error("Title is required.");

  const slug = slugRaw ? slugify(slugRaw) : slugify(title);
  if (!slug) throw new Error("Slug is required.");

  const id = await createAdminCourse({
    workspaceId: args.workspaceId,
    title,
    slug,
    description: description ? description : null,
    status,
  });

  redirect(`/${args.churchslug}/admin/courses/${id}`);
}

export default async function AdminNewCoursePage({
  params,
}: {
  params: Promise<{ churchslug: string }>;
}) {
  const p = await params;

  const tenant = await getTenantBySlugOrThrow(p.churchslug);
  await requireWorkspaceAdmin(tenant.id);

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Admin</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New course</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create a course for {tenant.name}. You can add sessions next.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <form className="grid gap-4" action={createAction.bind(null, { churchslug: p.churchslug, workspaceId: tenant.id })}>
          <div>
            <label className="text-sm font-semibold">Title</label>
            <input
              name="title"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              placeholder="Foundations of Bible Study"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Slug</label>
            <input
              name="slug"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              placeholder="foundations-bible-study (optional)"
            />
            <div className="mt-1 text-xs text-slate-500">
              If empty, we’ll generate it from the title.
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Description</label>
            <textarea
              name="description"
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              placeholder="Short description shown on the course page."
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
              Create course
            </button>
            <a
              href={`/${p.churchslug}/admin/courses`}
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
