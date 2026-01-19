// src/app/studies/page.tsx
import { redirect } from "next/navigation";
import { getPersonalTenantOrThrow } from "@/lib/tenant_personal";
import { hardDeleteStudy, listStudies } from "@/lib/db/studies";
import { ConfirmDangerAction } from "@/components/ConfirmDangerAction";

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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-700">Bible Study • Personal</div>
        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Studies</h1>
          <a
            href="/studies/new"
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            New study
          </a>
        </div>
        <div className="mt-2 text-sm text-slate-600">Your personal Bible study workspace.</div>
      </div>

      <div className="mt-6 space-y-3">
        {studies.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
            No studies yet.
          </div>
        ) : (
          studies.map((s: any) => (
            <div
              key={s.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <a href={`/studies/${encodeURIComponent(s.id)}`} className="text-base font-semibold text-slate-900">
                    {s.title}
                  </a>
                  <div className="mt-1 text-sm text-slate-700">
                    {s.book} • {s.passage} {s.tags ? <span className="text-slate-500">({s.tags})</span> : null}
                  </div>
                </div>

                <ConfirmDangerAction
                  buttonLabel="Delete"
                  title="Delete this study?"
                  message="This will permanently delete the study and all sessions under it."
                  dangerHint="This cannot be undone."
                  action={deleteStudyAction.bind(null, s.id)}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
