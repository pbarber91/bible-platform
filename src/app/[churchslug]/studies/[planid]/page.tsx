// src/app/[churchslug]/studies/[planid]/page.tsx
import { redirect } from "next/navigation";
import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { getStudyById, hardDeleteStudy } from "@/lib/db/studies";
import {
  listSessionsForPlan,
  createSession,
  hardDeleteSession,
} from "@/lib/db/study_sessions";

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

async function deleteStudyAction(args: { churchslug: string; planId: string }) {
  "use server";
  const tenant = await getTenantBySlugOrThrow(args.churchslug);
  await hardDeleteStudy({ workspaceId: tenant.id, id: args.planId });
  redirect(`/${encodeURIComponent(args.churchslug)}/studies`);
}

async function deleteSessionAction(args: {
  churchslug: string;
  planId: string;
  sessionId: string;
}) {
  "use server";
  const tenant = await getTenantBySlugOrThrow(args.churchslug);
  await hardDeleteSession({ workspaceId: tenant.id, sessionId: args.sessionId });
  redirect(
    `/${encodeURIComponent(args.churchslug)}/studies/${encodeURIComponent(
      args.planId
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
      <div className="grid gap-6">
        <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="text-xs text-slate-500">Bible Study</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Study not found.
          </h1>
        </section>
      </div>
    );
  }

  const sessions = await listSessionsForPlan(tenant.id, study.id);

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Bible Study • {tenant.name}</div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{study.title}</h1>
        </div>

        <div className="mt-2 text-sm text-slate-600">
          {study.book} • {study.passage}
        </div>

        {Array.isArray(study.tags) && study.tags.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {study.tags.map((t) => (
              <span
                key={t}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={`/${encodeURIComponent(p.churchslug)}/studies`}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
          >
            Back to studies
          </a>

          <form
            action={deleteStudyAction.bind(null, {
              churchslug: p.churchslug,
              planId: study.id,
            })}
          >
            <button
              type="submit"
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 text-sm font-semibold">New session</div>

        <form
          action={newSessionAction.bind(null, {
            churchslug: p.churchslug,
            planId: study.id,
          })}
          className="grid gap-4"
        >
          <label className="grid gap-1">
            <div className="text-xs font-semibold text-slate-700">
              Passage (optional)
            </div>
            <input
              name="passage"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              placeholder="John 1:1–18"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1">
              <div className="text-xs font-semibold text-slate-700">Track</div>
              <select
                name="track"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                defaultValue="beginner"
              >
                <option value="beginner">beginner</option>
                <option value="intermediate">intermediate</option>
                <option value="advanced">advanced</option>
              </select>
            </label>

            <label className="grid gap-1">
              <div className="text-xs font-semibold text-slate-700">Mode</div>
              <select
                name="mode"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                defaultValue="guided"
              >
                <option value="guided">guided</option>
                <option value="freeform">freeform</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Create session
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 text-sm font-semibold">
          Sessions ({sessions.length})
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            No sessions yet. Create one above.
          </div>
        ) : (
          <div className="grid gap-3">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-stretch gap-3">
                <a
                  href={`/${encodeURIComponent(p.churchslug)}/sessions/${encodeURIComponent(
                    s.id
                  )}`}
                  className="flex-1 rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <div className="text-sm font-semibold">
                    {s.passage ? s.passage : "Session"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {formatDate(s.session_date)}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                    {s.track ? (
                      <span className="rounded-xl bg-slate-100 px-3 py-1">
                        {s.track}
                      </span>
                    ) : null}
                    {s.mode ? (
                      <span className="rounded-xl bg-slate-100 px-3 py-1">
                        {s.mode}
                      </span>
                    ) : null}
                    {s.status ? (
                      <span className="rounded-xl bg-slate-100 px-3 py-1">
                        {s.status}
                      </span>
                    ) : null}
                  </div>
                </a>

                <form
                  action={deleteSessionAction.bind(null, {
                    churchslug: p.churchslug,
                    planId: study.id,
                    sessionId: s.id,
                  })}
                >
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
