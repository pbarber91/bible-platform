import { redirect } from "next/navigation";
import { getPersonalTenantOrThrow } from "@/lib/tenant_personal";
import { createStudy } from "@/lib/db/studies";

async function createAction(formData: FormData) {
  "use server";

  const tenant = await getPersonalTenantOrThrow();

  const title = String(formData.get("title") ?? "").trim();
  const book = String(formData.get("book") ?? "").trim();
  const passage = String(formData.get("passage") ?? "").trim();
  const tags = String(formData.get("tags") ?? "").trim();

  const id = await createStudy({
    workspaceId: tenant.id,
    title: title || "Untitled",
    book: book || "Unknown",
    passage: passage || "-",
    tags,
  });

  redirect(`/studies/${id}`);
}

export default async function NewStudyPage() {
  const tenant = await getPersonalTenantOrThrow();

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Bible Study • Personal</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New study</h1>
        <p className="mt-2 text-sm text-slate-600">{tenant.name} workspace</p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <form className="grid gap-4" action={createAction}>
          <div>
            <label className="text-sm font-semibold">Title</label>
            <input
              name="title"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              placeholder="Foundations of Bible Study"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Book</label>
              <input
                name="book"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="John"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Passage</label>
              <input
                name="passage"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="1:1–18"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Tags</label>
            <input
              name="tags"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              placeholder="gospel • foundations • reading"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Create
            </button>
            <a
              href="/studies"
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
