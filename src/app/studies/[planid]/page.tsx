// src/app/studies/[planid]/page.tsx
import { redirect } from "next/navigation";
import { getPersonalTenantOrThrow } from "@/lib/tenant_personal";
import { getStudyById, hardDeleteStudy } from "@/lib/db/studies";
import { listSessionsForPlan, createSession, hardDeleteSession } from "@/lib/db/study_sessions";
import { ConfirmDangerAction } from "@/components/ConfirmDangerAction";

async function newSessionAction(planId: string, formData: FormData) {
  "use server";
  const tenant = await getPersonalTenantOrThrow();

  const passage = String(formData.get("passage") ?? "").trim();
  const track = String(formData.get("track") ?? "beginner").trim();
  const mode = String(formData.get("mode") ?? "guided").trim();

  const sessionId = await createSession({
    workspaceId: tenant.id,
    planId,
    sessionDate: new Date().toISOString(),
    passage: passage ? passage : null,
    track,
    mode,
  });

  redirect(`/sessions/${encodeURIComponent(sessionId)}`);
}

async function deleteStudyAction(planId: string) {
  "use server";
  const tenant = await getPersonalTenantOrThrow();
  await hardDeleteStudy({ workspaceId: tenant.id, id: planId });
  redirect(`/studies`);
}

async function deleteSessionAction(args: { planId: string; sessionId: string }) {
  "use server";
  const tenant = await getPersonalTenantOrThrow();
  await hardDeleteSession({ workspaceId: tenant.id, sessionId: args.sessionId });
  redirect(`/studies/${encodeURIComponent(args.planId)}`);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export default async function StudyDetailPage({ params }: { params: Promise<{ planid: string }> }) {
  const p = await params;
  const tenant = await getPersonalTenantOrThrow();
  const study = await getStudyById(tenant.id, p.planid);

  if (!study) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-700">Bible Study</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Study not found.</h1>
        </div>
      </div>
    );
  }

  const sessions = await listSessionsForPlan(tenant.id, study.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-700">Bible Study • Personal</div>
        <div className="mt-1 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{study.title}</h1>
            <div className="mt-1 text-sm text-slate-700">
              {study.book} • {study.passage}
            </div>
            {Array.isArray(study.tags) && study.tags.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {study.tags.map((t: string) => (
                  <span key={t} className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/studies"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Back to studies
            </a>

            <ConfirmDangerAction
              buttonLabel="Delete"
              title="Delete this study?"
              message="This will permanently delete the study and all sessions under it."
              dangerHint="This cannot be undone."
              action={deleteStudyAction.bind(null, study.id)}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="text-base font-semibold tracking-tight text-slate-900">New session</div>
        <form action={newSessionAction.bind(null, study.id)} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className="text-xs font-semibold text-slate-600">Passage (optional)</div>
            <input
              name="passage"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
              placeholder="e.g., John 3:16-17"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-600">Track</div>
            <select
              name="track"
              defaultValue="beginner"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
            >
              <option value="beginner">beginner</option>
              <option value="intermediate">intermediate</option>
              <option value="advanced">advanced</option>
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-600">Mode</div>
            <select
              name="mode"
              defaultValue="guided"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-300"
            >
              <option value="guided">guided</option>
              <option value="freeform">freeform</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Create session
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="text-base font-semibold tracking-tight text-slate-900">Sessions ({sessions.length})</div>

        <div className="mt-4 space-y-3">
          {sessions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No sessions yet. Create one above.
            </div>
          ) : (
            sessions.map((s: any) => (
              <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <a href={`/sessions/${encodeURIComponent(s.id)}`} className="text-sm font-semibold text-slate-900">
                    {s.passage ? s.passage : "Session"} <span className="text-slate-500">• {formatDate(s.session_date)}</span>{" "}
                    {s.track ? <span className="text-slate-500">({s.track})</span> : null}{" "}
                    {s.mode ? <span className="text-slate-500">({s.mode})</span> : null}{" "}
                    {s.status ? <span className="text-slate-500">({s.status})</span> : null}
                  </a>

                  <ConfirmDangerAction
                    buttonLabel="Delete"
                    title="Delete this session?"
                    message="This will permanently delete the session and all responses."
                    dangerHint="This cannot be undone."
                    action={deleteSessionAction.bind(null, { planId: study.id, sessionId: s.id })}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
