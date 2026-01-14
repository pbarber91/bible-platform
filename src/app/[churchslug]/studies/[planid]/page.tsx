import { redirect } from "next/navigation";
import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { getStudyById } from "@/lib/db/studies";
import { listSessionsForPlan, createSession } from "@/lib/db/study_sessions";

async function newSessionAction(
  args: { churchslug: string; planId: string },
  formData: FormData
) {
  "use server";

  const tenant = await getTenantBySlugOrThrow(args.churchslug);

  const passage = String(formData.get("passage") ?? "").trim();
  const track = String(formData.get("track") ?? "beginner").trim();
  const mode = String(formData.get("mode") ?? "guided").trim();

  const sessionId = await createSession({
    workspaceId: tenant.id,
    planId: args.planId,
    sessionDate: new Date().toISOString(),
    passage: passage ? passage : null,
    track,
    mode,
    // genre is handled inside the session editor (stored NOT NULL as "Unknown"/etc)
  });

  redirect(
    `/${encodeURIComponent(args.churchslug)}/sessions/${encodeURIComponent(
      sessionId
    )}`
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default async function ChurchStudyDetailPage({
  params,
}: {
  params: Promise<{ churchslug: string; planid: string }>;
}) {
  const p = await params;
  const tenant = await getTenantBySlugOrThrow(p.churchslug);

  const study = await getStudyById(tenant.id, p.planid);
  if (!study) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        Study not found.
      </div>
    );
  }

  const sessions = await listSessionsForPlan(tenant.id, study.id);

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Bible Study • {tenant.name}</div>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{study.title}</h1>
            <div className="mt-2 text-sm text-slate-600">
              {study.book} • {study.passage}
            </div>
            {Array.isArray(study.tags) && study.tags.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {study.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <a
            href={`/${encodeURIComponent(p.churchslug)}/studies`}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
          >
            Back to studies
          </a>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 text-sm font-semibold">New session</div>

        <form
          className="grid gap-3"
          action={newSessionAction.bind(null, {
            churchslug: p.churchslug,
            planId: study.id,
          })}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-600">
                Passage (optional)
              </label>
              <input
                name="passage"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="John 1:1–18"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Track</label>
              <select
                name="track"
                defaultValue="beginner"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              >
                <option value="beginner">beginner</option>
                <option value="intermediate">intermediate</option>
                <option value="advanced">advanced</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Mode</label>
              <select
                name="mode"
                defaultValue="guided"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              >
                <option value="guided">guided</option>
                <option value="freeform">freeform</option>
              </select>
            </div>

            <div className="flex items-end sm:col-span-2">
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Create session
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 text-sm font-semibold">Sessions ({sessions.length})</div>

        {sessions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            No sessions yet. Create one above.
          </div>
        ) : (
          <div className="grid gap-3">
            {sessions.map((s) => (
              <a
                key={s.id}
                href={`/${encodeURIComponent(p.churchslug)}/sessions/${encodeURIComponent(
                  s.id
                )}`}
                className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {s.passage ? s.passage : "Session"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(s.session_date)}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {s.track ? (
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                      {s.track}
                    </span>
                  ) : null}
                  {s.mode ? (
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                      {s.mode}
                    </span>
                  ) : null}
                  {s.status ? (
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                      {s.status}
                    </span>
                  ) : null}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
