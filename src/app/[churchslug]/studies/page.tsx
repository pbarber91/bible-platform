// src/app/[churchslug]/studies/page.tsx
import { redirect } from "next/navigation";
import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { hardDeleteStudy, listStudies } from "@/lib/db/studies";
import { ConfirmDangerAction } from "@/components/ConfirmDangerAction";

async function deleteStudyAction(args: { churchslug: string; planId: string }) {
  "use server";
  const tenant = await getTenantBySlugOrThrow(args.churchslug);
  await hardDeleteStudy({ workspaceId: tenant.id, id: args.planId });
  redirect(`/${encodeURIComponent(args.churchslug)}/studies`);
}

export default async function ChurchStudiesPage({ params }: { params: Promise<{ churchslug: string }> }) {
  const p = await params;
  const tenant = await getTenantBySlugOrThrow(p.churchslug);
  const studies = await listStudies(tenant.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-700">Bible Study • {tenant.name}</div>
        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Studies</h1>
          <a
            href={`/${encodeURIComponent(p.churchslug)}/studies/new`}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            New study
          </a>
        </div>
        <div className="mt-2 text-sm text-slate-600">Create and manage studies for this church workspace.</div>
      </div>

      <div className="mt-6 space-y-3">
        {studies.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
            No studies yet. Click New study.
          </div>
        ) : (
          studies.map((s: any) => (
            <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <a
                    href={`/${encodeURIComponent(p.churchslug)}/studies/${encodeURIComponent(s.id)}`}
                    className="text-base font-semibold text-slate-900"
                  >
                    {s.title}
                  </a>
                  <div className="mt-1 text-sm text-slate-700">
                    {s.book} • {s.passage}{" "}
                    {Array.isArray(s.tags) && s.tags.length ? (
                      <span className="text-slate-500">
                        (
                        {s.tags.slice(0, 6).map((t: string) => (
                          <span key={t} className="mr-1 inline-block">
                            {t}
                          </span>
                        ))}
                        )
                      </span>
                    ) : null}
                  </div>
                </div>

                <ConfirmDangerAction
                  buttonLabel="Delete"
                  title="Delete this study?"
                  message="This will permanently delete the study and all sessions under it."
                  dangerHint="This cannot be undone."
                  action={deleteStudyAction.bind(null, { churchslug: p.churchslug, planId: s.id })}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
