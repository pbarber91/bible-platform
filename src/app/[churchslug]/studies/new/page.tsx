import { redirect } from "next/navigation";
import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { createStudy } from "@/lib/db/studies";

async function createAction(
  args: { churchslug: string },
  formData: FormData
) {
  "use server";

  const tenant = await getTenantBySlugOrThrow(args.churchslug);

  const title = String(formData.get("title") ?? "").trim();
  const book = String(formData.get("book") ?? "").trim();
  const passage = String(formData.get("passage") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const tags = String(formData.get("tags") ?? "").trim();

  const id = await createStudy({
    workspaceId: tenant.id,
    title: title || "Untitled",
    book,
    passage,
    description: description ? description : null,
    tags, // studies.ts normalizes this to [] / array
  });

  redirect(`/${encodeURIComponent(args.churchslug)}/studies/${encodeURIComponent(id)}`);
}

export default async function NewChurchStudyPage({
  params,
}: {
  params: Promise<{ churchslug: string }>;
}) {
  const p = await params;
  const tenant = await getTenantBySlugOrThrow(p.churchslug);

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Bible Study • {tenant.name}</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New study</h1>
        <div className="mt-2 text-sm text-slate-600">
          Create the study shell here. Sessions happen inside the study.
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <form
          action={createAction.bind(null, { churchslug: p.churchslug })}
          className="grid gap-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Title</label>
              <input
                name="title"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="Foundations of Bible Study"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Book</label>
              <input
                name="book"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="John"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Passage</label>
              <input
                name="passage"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="John 1:1–18"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Tags (comma/bullets)
              </label>
              <input
                name="tags"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="foundations, gospel • observation"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Description</label>
            <textarea
              name="description"
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              placeholder="Optional..."
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <a
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
              href={`/${encodeURIComponent(p.churchslug)}/studies`}
            >
              Cancel
            </a>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Create
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
