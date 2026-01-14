import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { listStudies } from "@/lib/db/studies";

export default async function ChurchStudiesPage({
  params,
}: {
  params: Promise<{ churchslug: string }>;
}) {
  const p = await params;
  const tenant = await getTenantBySlugOrThrow(p.churchslug);

  const studies = await listStudies(tenant.id);

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Bible Study • {tenant.name}</div>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Studies</h1>
            <div className="mt-2 text-sm text-slate-600">
              Create and manage studies for this church workspace.
            </div>
          </div>

          <a
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            href={`/${encodeURIComponent(p.churchslug)}/studies/new`}
          >
            New study
          </a>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {studies.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            No studies yet. Click <span className="font-semibold">New study</span>.
          </div>
        ) : (
          <div className="grid gap-3">
            {studies.map((s) => (
              <a
                key={s.id}
                href={`/${encodeURIComponent(p.churchslug)}/studies/${encodeURIComponent(
                  s.id
                )}`}
                className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {s.book} • {s.passage}
                </div>
                {Array.isArray(s.tags) && s.tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {s.tags.slice(0, 6).map((t) => (
                      <span
                        key={t}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
