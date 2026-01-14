import { getPersonalTenantOrThrow } from "@/lib/tenant_personal";
import { listStudies } from "@/lib/db/studies";

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
        <p className="mt-2 text-sm text-slate-600">
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
              <a
                key={s.id}
                href={`/studies/${s.id}`}
                className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {s.book} • {s.passage}
                </div>
                {s.tags ? <div className="mt-2 text-sm text-slate-700">{s.tags}</div> : null}
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
