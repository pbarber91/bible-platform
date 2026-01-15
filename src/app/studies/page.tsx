// src/app/studies/page.tsx
import { redirect } from "next/navigation";
import { getPersonalTenantOrThrow } from "@/lib/tenant_personal";
import { hardDeleteStudy, listStudies } from "@/lib/db/studies";

async function deleteStudyAction(planId: string) {
  "use server";
  const tenant = await getPersonalTenantOrThrow();
  await hardDeleteStudy({ workspaceId: tenant.id, id: planId });
  redirect("/studies");
}

export default async function StudiesPage() {
  const tenant = await getPersonalTenantOrThrow();
  const studies = await listStudies(tenant.id);

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Bible Study • Personal</div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Studies</h1>
          <a
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            href="/studies/new"
          >
            New study
          </a>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Your personal Bible study workspace.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {studies.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            No studies yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {studies.map((s) => (
              <div key={s.id} className="flex items-stretch gap-3">
                <a
                  href={`/studies/${s.id}`}
                  className="flex-1 rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {s.book} • {s.passage}
                  </div>
                  {s.tags ? (
                    <div className="mt-2 text-sm text-slate-700">{s.tags}</div>
                  ) : null}
                </a>

                <form action={deleteStudyAction.bind(null, s.id)}>
                  <button
                    type="submit"
                    className="h-full rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
